<?php

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/security.php';

function start_secure_session(): void
{
    $config = load_config();
    $settings = $config['security'];

    if (session_status() === PHP_SESSION_NONE) {
        session_name($settings['session_name']);
        ini_set('session.use_strict_mode', '1');
        ini_set('session.cookie_httponly', '1');
        ini_set('session.cookie_samesite', 'Lax');
        if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') {
            ini_set('session.cookie_secure', '1');
        }
        session_start();
    }

    if (!isset($_SESSION['last_active'])) {
        $_SESSION['last_active'] = time();
    }

    if (time() - (int)$_SESSION['last_active'] > $settings['session_timeout']) {
        session_unset();
        session_destroy();
        session_start();
    }

    $_SESSION['last_active'] = time();
}

function require_session(): array
{
    start_secure_session();
    if (empty($_SESSION['user_id'])) {
        json_response(false, null, 'Unauthorized', 401);
    }

    $user = get_user_by_id($_SESSION['user_id']);
    if (!$user) {
        json_response(false, null, 'Unauthorized', 401);
    }

    return $user;
}

function require_admin(array $user): void
{
    if (($user['role'] ?? '') !== 'admin') {
        json_response(false, null, 'Admin access required', 403);
    }
}

function get_user_by_id(string $userId): ?array
{
    $stmt = db()->prepare('SELECT id, email, role, first_login, created_at FROM users WHERE id = ?');
    $stmt->execute([$userId]);
    $user = $stmt->fetch();
    if (!$user) {
        return null;
    }
    $user['team_ids'] = get_user_team_ids($userId);
    $user['first_login'] = (bool)$user['first_login'];
    return $user;
}

function get_user_team_ids(string $userId): array
{
    $stmt = db()->prepare('SELECT team_id FROM team_users WHERE user_id = ?');
    $stmt->execute([$userId]);
    return array_map(fn($row) => $row['team_id'], $stmt->fetchAll());
}

function set_user_team_ids(string $userId, array $teamIds): void
{
    $pdo = db();
    $pdo->prepare('DELETE FROM team_users WHERE user_id = ?')->execute([$userId]);

    $stmt = $pdo->prepare('INSERT INTO team_users (team_id, user_id) VALUES (?, ?)');
    foreach ($teamIds as $teamId) {
        $stmt->execute([$teamId, $userId]);
    }
}

function check_csrf(): void
{
    start_secure_session();
    $config = load_config();
    $header = $config['security']['csrf_header'];
    $token = $_SERVER['HTTP_' . strtoupper(str_replace('-', '_', $header))] ?? '';

    if (empty($_SESSION['csrf_token']) || !$token || !hash_equals($_SESSION['csrf_token'], $token)) {
        json_response(false, null, 'Invalid CSRF token', 403);
    }
}

function generate_csrf_token(): string
{
    $token = bin2hex(random_bytes(32));
    $_SESSION['csrf_token'] = $token;
    return $token;
}

function clear_session(): void
{
    start_secure_session();
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
    }
    session_destroy();
}

function get_api_token_auth(): ?array
{
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (!str_starts_with($authHeader, 'Bearer ')) {
        return null;
    }

    $token = substr($authHeader, 7);
    if (!str_starts_with($token, 'costa_')) {
        return null;
    }

    $hash = hash('sha256', $token);
    $stmt = db()->prepare('SELECT id, name, description, permissions, created_by, created_at, last_used FROM api_tokens WHERE token_hash = ?');
    $stmt->execute([$hash]);
    $row = $stmt->fetch();
    if (!$row) {
        return null;
    }

    db()->prepare('UPDATE api_tokens SET last_used = NOW() WHERE id = ?')->execute([$row['id']]);

    $permissions = json_decode($row['permissions'], true);
    $row['permissions'] = is_array($permissions) ? $permissions : [];

    return $row;
}

function require_auth(): array
{
    $apiToken = get_api_token_auth();
    if ($apiToken) {
        return ['type' => 'api_token', 'token' => $apiToken];
    }

    $user = require_session();
    return ['type' => 'session', 'user' => $user];
}

function require_permission_or_session(string $permission): array
{
    $auth = require_auth();
    if ($auth['type'] === 'api_token') {
        $token = $auth['token'];
        if (!in_array($permission, $token['permissions'], true)) {
            json_response(false, null, 'API token lacks permission', 403);
        }
    }

    return $auth;
}
