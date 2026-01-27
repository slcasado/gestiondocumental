<?php

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/security.php';
require_once __DIR__ . '/auth.php';

apply_security_headers();
configure_error_logging();

$config = load_config();
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$path = $_GET['path'] ?? '/';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

$rateSettings = $config['security']['rate_limit_api'];
rate_limit_or_fail("api:{$method}:{$path}:{$ip}", $rateSettings['limit'], $rateSettings['window']);

if ($path === '/auth/login' && $method === 'POST') {
    $limit = $config['security']['rate_limit_login'];
    rate_limit_or_fail("login:{$ip}", $limit['limit'], $limit['window']);

    $payload = read_json_body();
    $email = sanitize_string(strtolower($payload['email'] ?? ''), 100);
    $password = (string)($payload['password'] ?? '');

    if (!$email || !$password) {
        json_response(false, null, 'Missing credentials', 400);
    }

    $stmt = db()->prepare('SELECT id, email, password_hash, role, first_login, created_at FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        log_event('AUTH_ATTEMPT', "FAILED_LOGIN user={$email}", $ip);
        json_response(false, null, 'Invalid credentials', 401);
    }

    start_secure_session();
    session_regenerate_id(true);
    $_SESSION['user_id'] = $user['id'];

    $csrf = generate_csrf_token();
    log_event('AUTH_ATTEMPT', "SUCCESS_LOGIN user={$email}", $ip);

    $userData = get_user_by_id($user['id']);
    json_response(true, ['user' => $userData, 'csrf_token' => $csrf]);
}

if ($path === '/auth/logout' && $method === 'POST') {
    start_secure_session();
    check_csrf();
    clear_session();
    json_response(true, ['message' => 'Logged out']);
}

if ($path === '/auth/me' && $method === 'GET') {
    $user = require_session();
    json_response(true, $user);
}

if ($path === '/auth/change-password' && $method === 'POST') {
    $user = require_session();
    check_csrf();

    $payload = read_json_body();
    $old = (string)($payload['old_password'] ?? '');
    $new = (string)($payload['new_password'] ?? '');

    if (strlen($new) < 8) {
        json_response(false, null, 'Password must be at least 8 characters', 400);
    }

    $stmt = db()->prepare('SELECT password_hash FROM users WHERE id = ?');
    $stmt->execute([$user['id']]);
    $row = $stmt->fetch();
    if (!$row || !password_verify($old, $row['password_hash'])) {
        json_response(false, null, 'Invalid old password', 400);
    }

    $hash = password_hash($new, PASSWORD_DEFAULT);
    $update = db()->prepare('UPDATE users SET password_hash = ?, first_login = 0 WHERE id = ?');
    $update->execute([$hash, $user['id']]);

    json_response(true, ['message' => 'Password changed']);
}

if ($path === '/users' && $method === 'GET') {
    $user = require_session();
    require_admin($user);

    $stmt = db()->query('SELECT id, email, role, first_login, created_at FROM users ORDER BY created_at DESC');
    $users = $stmt->fetchAll();
    foreach ($users as &$row) {
        $row['team_ids'] = get_user_team_ids($row['id']);
        $row['first_login'] = (bool)$row['first_login'];
    }
    json_response(true, $users);
}

if ($path === '/users' && $method === 'POST') {
    $user = require_session();
    require_admin($user);
    check_csrf();

    $payload = read_json_body();
    $email = sanitize_string(strtolower($payload['email'] ?? ''), 100);
    $password = (string)($payload['password'] ?? '');
    $role = $payload['role'] ?? 'user';
    $teamIds = $payload['team_ids'] ?? [];

    if (!$email || !$password || !validate_email($email)) {
        json_response(false, null, 'Invalid email or password', 400);
    }
    if (strlen($password) < 8) {
        json_response(false, null, 'Password must be at least 8 characters', 400);
    }
    if (!in_array($role, ['admin', 'user'], true)) {
        json_response(false, null, 'Invalid role', 400);
    }

    $stmt = db()->prepare('SELECT id FROM users WHERE email = ?');
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        json_response(false, null, 'Email already exists', 400);
    }

    $id = bin2hex(random_bytes(16));
    $hash = password_hash($password, PASSWORD_DEFAULT);
    $insert = db()->prepare('INSERT INTO users (id, email, password_hash, role, first_login, created_at) VALUES (?, ?, ?, ?, 1, NOW())');
    $insert->execute([$id, $email, $hash, $role]);

    if (is_array($teamIds)) {
        set_user_team_ids($id, $teamIds);
    }

    $created = get_user_by_id($id);
    log_event('ADMIN_ACTION', "CREATE_USER {$email}", $ip);
    json_response(true, $created, null, 201);
}

if (preg_match('#^/users/([a-zA-Z0-9\-]+)$#', $path, $matches)) {
    $user = require_session();
    require_admin($user);

    $userId = $matches[1];
    if ($method === 'PUT') {
        check_csrf();
        $payload = read_json_body();
        $email = isset($payload['email']) ? sanitize_string(strtolower($payload['email']), 100) : null;
        $role = $payload['role'] ?? null;
        $teamIds = $payload['team_ids'] ?? null;

        $updates = [];
        $values = [];

        if ($email !== null) {
            if (!validate_email($email)) {
                json_response(false, null, 'Invalid email', 400);
            }
            $updates[] = 'email = ?';
            $values[] = $email;
        }
        if ($role !== null) {
            if (!in_array($role, ['admin', 'user'], true)) {
                json_response(false, null, 'Invalid role', 400);
            }
            $updates[] = 'role = ?';
            $values[] = $role;
        }

        if ($updates) {
            $values[] = $userId;
            $stmt = db()->prepare('UPDATE users SET ' . implode(', ', $updates) . ' WHERE id = ?');
            $stmt->execute($values);
        }

        if (is_array($teamIds)) {
            set_user_team_ids($userId, $teamIds);
        }

        $updated = get_user_by_id($userId);
        if (!$updated) {
            json_response(false, null, 'User not found', 404);
        }

        json_response(true, $updated);
    }

    if ($method === 'DELETE') {
        check_csrf();
        if ($userId === $user['id']) {
            json_response(false, null, 'Cannot delete yourself', 400);
        }
        db()->prepare('DELETE FROM users WHERE id = ?')->execute([$userId]);
        db()->prepare('DELETE FROM team_users WHERE user_id = ?')->execute([$userId]);
        json_response(true, ['message' => 'User deleted']);
    }
}

if ($path === '/teams' && $method === 'GET') {
    $user = require_session();
    $stmt = db()->query('SELECT id, name, description, created_at FROM teams ORDER BY created_at DESC');
    $teams = $stmt->fetchAll();

    foreach ($teams as &$team) {
        $usersStmt = db()->prepare('SELECT user_id FROM team_users WHERE team_id = ?');
        $usersStmt->execute([$team['id']]);
        $team['user_ids'] = array_map(fn($row) => $row['user_id'], $usersStmt->fetchAll());
    }

    json_response(true, $teams);
}

if ($path === '/teams' && $method === 'POST') {
    $user = require_session();
    require_admin($user);
    check_csrf();

    $payload = read_json_body();
    $name = sanitize_string($payload['name'] ?? '', 200);
    $description = sanitize_string($payload['description'] ?? '', 2000);
    $userIds = $payload['user_ids'] ?? [];

    if ($name === '') {
        json_response(false, null, 'Name required', 400);
    }

    $teamId = bin2hex(random_bytes(16));
    $insert = db()->prepare('INSERT INTO teams (id, name, description, created_at) VALUES (?, ?, ?, NOW())');
    $insert->execute([$teamId, $name, $description]);

    if (is_array($userIds)) {
        $stmt = db()->prepare('INSERT INTO team_users (team_id, user_id) VALUES (?, ?)');
        foreach ($userIds as $uid) {
            $stmt->execute([$teamId, $uid]);
        }
    }

    $team = [
        'id' => $teamId,
        'name' => $name,
        'description' => $description ?: null,
        'user_ids' => $userIds,
        'created_at' => date('c'),
    ];

    json_response(true, $team, null, 201);
}

if (preg_match('#^/teams/([a-zA-Z0-9\-]+)$#', $path, $matches)) {
    $user = require_session();
    require_admin($user);
    $teamId = $matches[1];

    if ($method === 'PUT') {
        check_csrf();
        $payload = read_json_body();
        $name = isset($payload['name']) ? sanitize_string($payload['name'], 200) : null;
        $description = isset($payload['description']) ? sanitize_string($payload['description'], 2000) : null;
        $userIds = $payload['user_ids'] ?? null;

        $updates = [];
        $values = [];
        if ($name !== null) {
            $updates[] = 'name = ?';
            $values[] = $name;
        }
        if ($description !== null) {
            $updates[] = 'description = ?';
            $values[] = $description;
        }

        if ($updates) {
            $values[] = $teamId;
            $stmt = db()->prepare('UPDATE teams SET ' . implode(', ', $updates) . ' WHERE id = ?');
            $stmt->execute($values);
        }

        if (is_array($userIds)) {
            $stmt = db()->prepare('DELETE FROM team_users WHERE team_id = ?');
            $stmt->execute([$teamId]);
            $stmt = db()->prepare('INSERT INTO team_users (team_id, user_id) VALUES (?, ?)');
            foreach ($userIds as $uid) {
                $stmt->execute([$teamId, $uid]);
            }
        }

        $result = db()->prepare('SELECT id, name, description, created_at FROM teams WHERE id = ?');
        $result->execute([$teamId]);
        $team = $result->fetch();
        if (!$team) {
            json_response(false, null, 'Team not found', 404);
        }

        $usersStmt = db()->prepare('SELECT user_id FROM team_users WHERE team_id = ?');
        $usersStmt->execute([$teamId]);
        $team['user_ids'] = array_map(fn($row) => $row['user_id'], $usersStmt->fetchAll());

        json_response(true, $team);
    }

    if ($method === 'DELETE') {
        check_csrf();
        db()->prepare('DELETE FROM team_users WHERE team_id = ?')->execute([$teamId]);
        db()->prepare('DELETE FROM workspace_teams WHERE team_id = ?')->execute([$teamId]);
        db()->prepare('DELETE FROM teams WHERE id = ?')->execute([$teamId]);
        json_response(true, ['message' => 'Team deleted']);
    }
}

if ($path === '/metadata' && $method === 'GET') {
    $auth = require_permission_or_session('metadata:read');
    $stmt = db()->query('SELECT id, name, field_type, visible, options, created_at FROM metadata_definitions ORDER BY created_at DESC');
    $rows = $stmt->fetchAll();
    foreach ($rows as &$row) {
        $row['visible'] = (bool)$row['visible'];
        $row['options'] = $row['options'] ? json_decode($row['options'], true) : null;
    }
    json_response(true, $rows);
}

if ($path === '/metadata' && $method === 'POST') {
    $user = require_session();
    require_admin($user);
    check_csrf();

    $payload = read_json_body();
    $name = sanitize_string($payload['name'] ?? '', 200);
    $fieldType = $payload['field_type'] ?? 'text';
    $visible = (bool)($payload['visible'] ?? true);
    $options = $payload['options'] ?? null;

    if (!in_array($fieldType, ['text', 'number', 'date', 'select'], true)) {
        json_response(false, null, 'Invalid field_type', 400);
    }

    $metaId = bin2hex(random_bytes(16));
    $insert = db()->prepare('INSERT INTO metadata_definitions (id, name, field_type, visible, options, created_at) VALUES (?, ?, ?, ?, ?, NOW())');
    $insert->execute([
        $metaId,
        $name,
        $fieldType,
        $visible ? 1 : 0,
        $options ? json_encode($options) : null,
    ]);

    json_response(true, [
        'id' => $metaId,
        'name' => $name,
        'field_type' => $fieldType,
        'visible' => $visible,
        'options' => $options,
        'created_at' => date('c'),
    ], null, 201);
}

if (preg_match('#^/metadata/([a-zA-Z0-9\-]+)$#', $path, $matches)) {
    $user = require_session();
    require_admin($user);
    $metaId = $matches[1];

    if ($method === 'PUT') {
        check_csrf();
        $payload = read_json_body();
        $updates = [];
        $values = [];

        if (isset($payload['name'])) {
            $updates[] = 'name = ?';
            $values[] = sanitize_string($payload['name'], 200);
        }
        if (isset($payload['field_type'])) {
            $fieldType = $payload['field_type'];
            if (!in_array($fieldType, ['text', 'number', 'date', 'select'], true)) {
                json_response(false, null, 'Invalid field_type', 400);
            }
            $updates[] = 'field_type = ?';
            $values[] = $fieldType;
        }
        if (array_key_exists('visible', $payload)) {
            $updates[] = 'visible = ?';
            $values[] = $payload['visible'] ? 1 : 0;
        }
        if (array_key_exists('options', $payload)) {
            $updates[] = 'options = ?';
            $values[] = $payload['options'] ? json_encode($payload['options']) : null;
        }

        if (!$updates) {
            json_response(false, null, 'No fields to update', 400);
        }

        $values[] = $metaId;
        db()->prepare('UPDATE metadata_definitions SET ' . implode(', ', $updates) . ' WHERE id = ?')->execute($values);

        $stmt = db()->prepare('SELECT id, name, field_type, visible, options, created_at FROM metadata_definitions WHERE id = ?');
        $stmt->execute([$metaId]);
        $row = $stmt->fetch();
        if (!$row) {
            json_response(false, null, 'Metadata not found', 404);
        }
        $row['visible'] = (bool)$row['visible'];
        $row['options'] = $row['options'] ? json_decode($row['options'], true) : null;
        json_response(true, $row);
    }

    if ($method === 'DELETE') {
        check_csrf();
        db()->prepare('DELETE FROM workspace_metadata WHERE metadata_id = ?')->execute([$metaId]);
        db()->prepare('DELETE FROM metadata_definitions WHERE id = ?')->execute([$metaId]);
        json_response(true, ['message' => 'Metadata deleted']);
    }
}

if ($path === '/workspaces' && $method === 'GET') {
    $auth = require_permission_or_session('workspaces:read');
    $workspaces = [];

    if ($auth['type'] === 'api_token' || ($auth['user']['role'] ?? '') === 'admin') {
        $stmt = db()->query('SELECT id, name, description, created_at FROM workspaces ORDER BY created_at DESC');
        $workspaces = $stmt->fetchAll();
    } else {
        $teamIds = $auth['user']['team_ids'] ?? [];
        if ($teamIds) {
            $in = implode(',', array_fill(0, count($teamIds), '?'));
            $stmt = db()->prepare(
                'SELECT DISTINCT w.id, w.name, w.description, w.created_at '
                . 'FROM workspaces w '
                . 'JOIN workspace_teams wt ON wt.workspace_id = w.id '
                . "WHERE wt.team_id IN ({$in}) ORDER BY w.created_at DESC"
            );
            $stmt->execute($teamIds);
            $workspaces = $stmt->fetchAll();
        }
    }

    foreach ($workspaces as &$workspace) {
        $workspace['metadata_ids'] = get_workspace_metadata_ids($workspace['id']);
        $workspace['team_ids'] = get_workspace_team_ids($workspace['id']);
    }

    json_response(true, $workspaces);
}

if ($path === '/workspaces' && $method === 'POST') {
    $user = require_session();
    require_admin($user);
    check_csrf();

    $payload = read_json_body();
    $name = sanitize_string($payload['name'] ?? '', 200);
    $description = sanitize_string($payload['description'] ?? '', 2000);
    $metadataIds = $payload['metadata_ids'] ?? [];
    $teamIds = $payload['team_ids'] ?? [];

    if ($name === '') {
        json_response(false, null, 'Name required', 400);
    }

    $workspaceId = bin2hex(random_bytes(16));
    db()->prepare('INSERT INTO workspaces (id, name, description, created_at) VALUES (?, ?, ?, NOW())')
        ->execute([$workspaceId, $name, $description]);

    set_workspace_metadata_ids($workspaceId, is_array($metadataIds) ? $metadataIds : []);
    set_workspace_team_ids($workspaceId, is_array($teamIds) ? $teamIds : []);

    json_response(true, [
        'id' => $workspaceId,
        'name' => $name,
        'description' => $description ?: null,
        'metadata_ids' => is_array($metadataIds) ? $metadataIds : [],
        'team_ids' => is_array($teamIds) ? $teamIds : [],
        'created_at' => date('c'),
    ], null, 201);
}

if (preg_match('#^/workspaces/([a-zA-Z0-9\-]+)$#', $path, $matches)) {
    $user = require_session();
    require_admin($user);
    $workspaceId = $matches[1];

    if ($method === 'PUT') {
        check_csrf();
        $payload = read_json_body();
        $updates = [];
        $values = [];

        if (isset($payload['name'])) {
            $updates[] = 'name = ?';
            $values[] = sanitize_string($payload['name'], 200);
        }
        if (isset($payload['description'])) {
            $updates[] = 'description = ?';
            $values[] = sanitize_string($payload['description'], 2000);
        }

        if ($updates) {
            $values[] = $workspaceId;
            db()->prepare('UPDATE workspaces SET ' . implode(', ', $updates) . ' WHERE id = ?')->execute($values);
        }

        if (array_key_exists('metadata_ids', $payload)) {
            set_workspace_metadata_ids($workspaceId, is_array($payload['metadata_ids']) ? $payload['metadata_ids'] : []);
        }
        if (array_key_exists('team_ids', $payload)) {
            set_workspace_team_ids($workspaceId, is_array($payload['team_ids']) ? $payload['team_ids'] : []);
        }

        $stmt = db()->prepare('SELECT id, name, description, created_at FROM workspaces WHERE id = ?');
        $stmt->execute([$workspaceId]);
        $row = $stmt->fetch();
        if (!$row) {
            json_response(false, null, 'Workspace not found', 404);
        }
        $row['metadata_ids'] = get_workspace_metadata_ids($workspaceId);
        $row['team_ids'] = get_workspace_team_ids($workspaceId);
        json_response(true, $row);
    }

    if ($method === 'DELETE') {
        check_csrf();
        db()->prepare('DELETE FROM documents WHERE workspace_id = ?')->execute([$workspaceId]);
        db()->prepare('DELETE FROM workspace_metadata WHERE workspace_id = ?')->execute([$workspaceId]);
        db()->prepare('DELETE FROM workspace_teams WHERE workspace_id = ?')->execute([$workspaceId]);
        db()->prepare('DELETE FROM workspaces WHERE id = ?')->execute([$workspaceId]);
        json_response(true, ['message' => 'Workspace deleted']);
    }
}

if (preg_match('#^/workspaces/([a-zA-Z0-9\-]+)/documents$#', $path, $matches)) {
    $workspaceId = $matches[1];

    if ($method === 'GET') {
        $auth = require_permission_or_session('documents:read');
        ensure_workspace_access($auth, $workspaceId);
        $stmt = db()->prepare('SELECT id, workspace_id, file_path, file_name, public_url, created_at, updated_at FROM documents WHERE workspace_id = ? ORDER BY created_at DESC');
        $stmt->execute([$workspaceId]);
        $docs = $stmt->fetchAll();
        foreach ($docs as &$doc) {
            $doc['metadata'] = get_document_metadata($doc['id']);
        }
        json_response(true, $docs);
    }

    if ($method === 'POST') {
        $auth = require_permission_or_session('documents:create');
        if ($auth['type'] === 'session') {
            check_csrf();
        }
        ensure_workspace_access($auth, $workspaceId);

        $payload = read_json_body();
        $filePath = sanitize_string($payload['file_path'] ?? '', 500);
        $fileName = sanitize_string($payload['file_name'] ?? '', 255);
        $metadata = $payload['metadata'] ?? [];

        if (!validate_file_path($filePath, $config['uploads']['allowed_external_domains'], $config['uploads']['allowed_local_prefixes'])) {
            log_event('SECURITY_EVENT', "INVALID_FILE_PATH {$filePath}", $ip);
            json_response(false, null, 'Invalid file path', 400);
        }

        $docId = bin2hex(random_bytes(16));
        $publicUrl = bin2hex(random_bytes(16));

        db()->prepare('INSERT INTO documents (id, workspace_id, file_path, file_name, public_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())')
            ->execute([$docId, $workspaceId, $filePath, $fileName, $publicUrl]);

        if (is_array($metadata)) {
            set_document_metadata($docId, $metadata);
        }

        log_event('DOCUMENT_ACCESS', "CREATE document={$docId}", $ip);

        json_response(true, [
            'id' => $docId,
            'workspace_id' => $workspaceId,
            'file_path' => $filePath,
            'file_name' => $fileName,
            'public_url' => $publicUrl,
            'metadata' => is_array($metadata) ? $metadata : [],
            'created_at' => date('c'),
            'updated_at' => date('c'),
        ], null, 201);
    }
}

if (preg_match('#^/documents/([a-zA-Z0-9\-]+)$#', $path, $matches)) {
    $docId = $matches[1];

    if ($method === 'PUT') {
        $auth = require_permission_or_session('documents:update');
        if ($auth['type'] === 'session') {
            check_csrf();
        }

        $payload = read_json_body();
        $updates = [];
        $values = [];

        if (isset($payload['file_path'])) {
            $filePath = sanitize_string($payload['file_path'], 500);
            if (!validate_file_path($filePath, $config['uploads']['allowed_external_domains'], $config['uploads']['allowed_local_prefixes'])) {
                json_response(false, null, 'Invalid file path', 400);
            }
            $updates[] = 'file_path = ?';
            $values[] = $filePath;
        }
        if (isset($payload['file_name'])) {
            $updates[] = 'file_name = ?';
            $values[] = sanitize_string($payload['file_name'], 255);
        }

        if ($updates) {
            $updates[] = 'updated_at = NOW()';
            $values[] = $docId;
            db()->prepare('UPDATE documents SET ' . implode(', ', $updates) . ' WHERE id = ?')->execute($values);
        }

        if (array_key_exists('metadata', $payload) && is_array($payload['metadata'])) {
            set_document_metadata($docId, $payload['metadata']);
        }

        $stmt = db()->prepare('SELECT id, workspace_id, file_path, file_name, public_url, created_at, updated_at FROM documents WHERE id = ?');
        $stmt->execute([$docId]);
        $doc = $stmt->fetch();
        if (!$doc) {
            json_response(false, null, 'Document not found', 404);
        }
        $doc['metadata'] = get_document_metadata($docId);
        json_response(true, $doc);
    }

    if ($method === 'DELETE') {
        $auth = require_permission_or_session('documents:delete');
        if ($auth['type'] === 'session') {
            check_csrf();
        }
        db()->prepare('DELETE FROM document_metadata WHERE document_id = ?')->execute([$docId]);
        db()->prepare('DELETE FROM documents WHERE id = ?')->execute([$docId]);
        json_response(true, ['message' => 'Document deleted']);
    }
}

if ($path === '/documents/search' && $method === 'GET') {
    $auth = require_permission_or_session('documents:search');
    $query = sanitize_string($_GET['q'] ?? '', 200);
    if (strlen($query) < 2) {
        json_response(true, []);
    }

    $workspaceIds = get_accessible_workspace_ids($auth);
    if (!$workspaceIds) {
        json_response(true, []);
    }

    $like = '%' . $query . '%';
    $in = implode(',', array_fill(0, count($workspaceIds), '?'));
    $stmt = db()->prepare(
        'SELECT id, workspace_id, file_path, file_name, public_url, created_at, updated_at '
        . "FROM documents WHERE workspace_id IN ({$in}) AND file_name LIKE ? ORDER BY created_at DESC LIMIT 100"
    );
    $params = $workspaceIds;
    $params[] = $like;
    $stmt->execute($params);
    $docs = $stmt->fetchAll();
    foreach ($docs as &$doc) {
        $doc['metadata'] = get_document_metadata($doc['id']);
    }
    json_response(true, $docs);
}

if (preg_match('#^/documents/([a-zA-Z0-9\-]+)/view$#', $path, $matches)) {
    $auth = require_permission_or_session('documents:read');
    $docId = $matches[1];
    $stmt = db()->prepare('SELECT id, file_path, file_name FROM documents WHERE id = ?');
    $stmt->execute([$docId]);
    $doc = $stmt->fetch();
    if (!$doc) {
        json_response(false, null, 'Document not found', 404);
    }

    log_event('DOCUMENT_ACCESS', "VIEW document={$docId}", $ip);
    serve_document($doc['file_path'], $doc['file_name']);
}

if (preg_match('#^/public/documents/([a-zA-Z0-9\-]+)$#', $path, $matches)) {
    $publicUrl = $matches[1];
    $stmt = db()->prepare('SELECT file_path, file_name FROM documents WHERE public_url = ?');
    $stmt->execute([$publicUrl]);
    $doc = $stmt->fetch();
    if (!$doc) {
        json_response(false, null, 'Document not found', 404);
    }
    serve_document($doc['file_path'], $doc['file_name']);
}

if ($path === '/admin/api-tokens' && $method === 'GET') {
    $user = require_session();
    require_admin($user);

    $stmt = db()->query('SELECT id, name, description, permissions, created_by, created_at, last_used, token_preview FROM api_tokens ORDER BY created_at DESC');
    $tokens = $stmt->fetchAll();
    foreach ($tokens as &$token) {
        $token['permissions'] = $token['permissions'] ? json_decode($token['permissions'], true) : [];
    }
    json_response(true, $tokens);
}

if ($path === '/admin/api-tokens' && $method === 'POST') {
    $user = require_session();
    require_admin($user);
    check_csrf();

    $payload = read_json_body();
    $name = sanitize_string($payload['name'] ?? '', 100);
    $description = sanitize_string($payload['description'] ?? '', 500);
    $permissions = $payload['permissions'] ?? [];

    if (strlen($name) < 3) {
        json_response(false, null, 'Token name must be at least 3 characters', 400);
    }

    $stmt = db()->prepare('SELECT id FROM api_tokens WHERE name = ?');
    $stmt->execute([$name]);
    if ($stmt->fetch()) {
        json_response(false, null, 'Token name already exists', 400);
    }

    $raw = 'costa_' . bin2hex(random_bytes(32));
    $hash = hash('sha256', $raw);
    $preview = '****' . substr($raw, -8);

    $tokenId = bin2hex(random_bytes(16));
    db()->prepare('INSERT INTO api_tokens (id, name, description, token_hash, token_preview, permissions, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())')
        ->execute([$tokenId, $name, $description ?: null, $hash, $preview, json_encode($permissions), $user['id']]);

    json_response(true, [
        'id' => $tokenId,
        'name' => $name,
        'description' => $description ?: null,
        'permissions' => $permissions,
        'token' => $raw,
        'created_at' => date('c'),
    ], null, 201);
}

if (preg_match('#^/admin/api-tokens/([a-zA-Z0-9\-]+)$#', $path, $matches)) {
    $user = require_session();
    require_admin($user);
    $tokenId = $matches[1];

    if ($method === 'PUT') {
        check_csrf();
        $payload = read_json_body();
        $updates = [];
        $values = [];

        if (isset($payload['name'])) {
            $name = sanitize_string($payload['name'], 100);
            if (strlen($name) < 3) {
                json_response(false, null, 'Token name must be at least 3 characters', 400);
            }
            $updates[] = 'name = ?';
            $values[] = $name;
        }
        if (isset($payload['description'])) {
            $updates[] = 'description = ?';
            $values[] = sanitize_string($payload['description'], 500);
        }
        if (isset($payload['permissions'])) {
            $updates[] = 'permissions = ?';
            $values[] = json_encode($payload['permissions']);
        }

        if (!$updates) {
            json_response(false, null, 'No fields to update', 400);
        }

        $values[] = $tokenId;
        db()->prepare('UPDATE api_tokens SET ' . implode(', ', $updates) . ' WHERE id = ?')->execute($values);

        $stmt = db()->prepare('SELECT id, name, description, permissions, created_by, created_at, last_used, token_preview FROM api_tokens WHERE id = ?');
        $stmt->execute([$tokenId]);
        $token = $stmt->fetch();
        if (!$token) {
            json_response(false, null, 'API token not found', 404);
        }
        $token['permissions'] = $token['permissions'] ? json_decode($token['permissions'], true) : [];
        json_response(true, $token);
    }

    if ($method === 'DELETE') {
        check_csrf();
        db()->prepare('DELETE FROM api_tokens WHERE id = ?')->execute([$tokenId]);
        json_response(true, ['message' => 'API token revoked']);
    }
}

if ($path === '/admin/api-tokens/permissions' && $method === 'GET') {
    $user = require_session();
    require_admin($user);
    json_response(true, [
        'permissions' => [
            ['value' => 'documents:read', 'label' => 'Leer Documentos'],
            ['value' => 'documents:create', 'label' => 'Crear Documentos'],
            ['value' => 'documents:update', 'label' => 'Actualizar Documentos'],
            ['value' => 'documents:delete', 'label' => 'Eliminar Documentos'],
            ['value' => 'documents:search', 'label' => 'Buscar Documentos'],
            ['value' => 'workspaces:read', 'label' => 'Leer Espacios de Trabajo'],
            ['value' => 'metadata:read', 'label' => 'Leer Metadatos'],
        ],
    ]);
}

json_response(false, null, 'Not found', 404);

function ensure_workspace_access(array $auth, string $workspaceId): void
{
    if ($auth['type'] === 'api_token') {
        return;
    }

    $user = $auth['user'];
    if (($user['role'] ?? '') === 'admin') {
        return;
    }

    $teams = get_workspace_team_ids($workspaceId);
    $userTeams = $user['team_ids'] ?? [];
    foreach ($teams as $teamId) {
        if (in_array($teamId, $userTeams, true)) {
            return;
        }
    }

    json_response(false, null, 'Access denied', 403);
}

function get_workspace_team_ids(string $workspaceId): array
{
    $stmt = db()->prepare('SELECT team_id FROM workspace_teams WHERE workspace_id = ?');
    $stmt->execute([$workspaceId]);
    return array_map(fn($row) => $row['team_id'], $stmt->fetchAll());
}

function set_workspace_team_ids(string $workspaceId, array $teamIds): void
{
    db()->prepare('DELETE FROM workspace_teams WHERE workspace_id = ?')->execute([$workspaceId]);
    $stmt = db()->prepare('INSERT INTO workspace_teams (workspace_id, team_id) VALUES (?, ?)');
    foreach ($teamIds as $teamId) {
        $stmt->execute([$workspaceId, $teamId]);
    }
}

function get_workspace_metadata_ids(string $workspaceId): array
{
    $stmt = db()->prepare('SELECT metadata_id FROM workspace_metadata WHERE workspace_id = ?');
    $stmt->execute([$workspaceId]);
    return array_map(fn($row) => $row['metadata_id'], $stmt->fetchAll());
}

function set_workspace_metadata_ids(string $workspaceId, array $metadataIds): void
{
    db()->prepare('DELETE FROM workspace_metadata WHERE workspace_id = ?')->execute([$workspaceId]);
    $stmt = db()->prepare('INSERT INTO workspace_metadata (workspace_id, metadata_id) VALUES (?, ?)');
    foreach ($metadataIds as $metaId) {
        $stmt->execute([$workspaceId, $metaId]);
    }
}

function set_document_metadata(string $docId, array $metadata): void
{
    db()->prepare('DELETE FROM document_metadata WHERE document_id = ?')->execute([$docId]);
    $stmt = db()->prepare('INSERT INTO document_metadata (document_id, meta_key, meta_value) VALUES (?, ?, ?)');
    foreach ($metadata as $key => $value) {
        $metaKey = sanitize_string((string)$key, 100);
        $metaValue = is_scalar($value) ? sanitize_string((string)$value, 2000) : sanitize_string(json_encode($value), 2000);
        $stmt->execute([$docId, $metaKey, $metaValue]);
    }
}

function get_document_metadata(string $docId): array
{
    $stmt = db()->prepare('SELECT meta_key, meta_value FROM document_metadata WHERE document_id = ?');
    $stmt->execute([$docId]);
    $metadata = [];
    foreach ($stmt->fetchAll() as $row) {
        $metadata[$row['meta_key']] = $row['meta_value'];
    }
    return $metadata;
}

function get_accessible_workspace_ids(array $auth): array
{
    if ($auth['type'] === 'api_token' || ($auth['user']['role'] ?? '') === 'admin') {
        $stmt = db()->query('SELECT id FROM workspaces');
        return array_map(fn($row) => $row['id'], $stmt->fetchAll());
    }

    $teamIds = $auth['user']['team_ids'] ?? [];
    if (!$teamIds) {
        return [];
    }

    $in = implode(',', array_fill(0, count($teamIds), '?'));
    $stmt = db()->prepare("SELECT DISTINCT workspace_id FROM workspace_teams WHERE team_id IN ({$in})");
    $stmt->execute($teamIds);
    return array_map(fn($row) => $row['workspace_id'], $stmt->fetchAll());
}

function serve_document(string $filePath, string $fileName): void
{
    $config = load_config();
    $allowedDomains = $config['uploads']['allowed_external_domains'];
    $allowedPrefixes = $config['uploads']['allowed_local_prefixes'];

    if (str_starts_with($filePath, 'http://') || str_starts_with($filePath, 'https://')) {
        if (!validate_external_url($filePath, $allowedDomains)) {
            json_response(false, null, 'External URL not allowed', 403);
        }
        header('Location: ' . $filePath, true, 302);
        exit;
    }

    $baseDir = realpath($config['uploads']['base_dir']);
    $relative = normalize_local_path($filePath, $allowedPrefixes);
    $fullPath = $relative ? realpath($config['uploads']['base_dir'] . '/' . $relative) : false;

    if (!$baseDir || !$fullPath || !str_starts_with($fullPath, $baseDir)) {
        json_response(false, null, 'Invalid file path', 400);
    }

    if (!file_exists($fullPath)) {
        json_response(false, null, 'File not found', 404);
    }

    header('Content-Type: application/pdf');
    header('Content-Disposition: inline; filename="' . basename($fileName) . '"');
    header('X-Content-Type-Options: nosniff');
    readfile($fullPath);
    exit;
}

function normalize_local_path(string $filePath, array $allowedPrefixes): ?string
{
    $filePath = '/' . ltrim($filePath, '/');
    foreach ($allowedPrefixes as $prefix) {
        $prefix = '/' . trim($prefix, '/');
        if (str_starts_with($filePath, $prefix . '/')) {
            return ltrim(substr($filePath, strlen($prefix)), '/');
        }
        if ($filePath === $prefix) {
            return '';
        }
    }
    return null;
}
