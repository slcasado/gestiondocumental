<?php

function load_config(): array
{
    return require __DIR__ . '/../config/config.php';
}

function apply_security_headers(): void
{
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    header('Permissions-Policy: geolocation=(), microphone=(), camera=()');
    header("Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
}

function configure_error_logging(): void
{
    $logDir = storage_path('logs');
    if (!is_dir($logDir)) {
        mkdir($logDir, 0775, true);
    }
    ini_set('log_errors', '1');
    ini_set('display_errors', '0');
    ini_set('error_log', $logDir . '/error.log');
}

function json_response(bool $ok, $data = null, ?string $error = null, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'ok' => $ok,
        'data' => $data,
        'error' => $error,
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

function read_json_body(): array
{
    $raw = file_get_contents('php://input');
    if (!$raw) {
        return [];
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function sanitize_string(string $value, int $maxLength = 500): string
{
    $value = strip_tags($value);
    $value = preg_replace('/[\x00-\x1F\x7F]/u', '', $value);
    return mb_substr(trim($value), 0, $maxLength);
}

function validate_email(string $email): bool
{
    return (bool)filter_var($email, FILTER_VALIDATE_EMAIL);
}

function validate_uuid(string $value): bool
{
    return (bool)preg_match('/^[a-f0-9\-]{8,}$/i', $value);
}

function validate_external_url(string $url, array $allowedDomains): bool
{
    $parts = parse_url($url);
    if (!$parts || empty($parts['scheme']) || empty($parts['host'])) {
        return false;
    }
    if (!in_array($parts['scheme'], ['http', 'https'], true)) {
        return false;
    }
    return in_array(strtolower($parts['host']), $allowedDomains, true);
}

function validate_file_path(string $filePath, array $allowedDomains, array $allowedPrefixes): bool
{
    $filePath = trim($filePath);
    if ($filePath === '') {
        return false;
    }

    if (str_starts_with($filePath, 'http://') || str_starts_with($filePath, 'https://')) {
        return validate_external_url($filePath, $allowedDomains);
    }

    foreach (['..', '~', '$', '|', '&', ';', '`'] as $pattern) {
        if (str_contains($filePath, $pattern)) {
            return false;
        }
    }

    foreach ($allowedPrefixes as $prefix) {
        if (str_starts_with($filePath, $prefix)) {
            return true;
        }
    }

    return false;
}

function storage_path(string $relative): string
{
    return __DIR__ . '/../storage/' . ltrim($relative, '/');
}

function rate_limit_or_fail(string $key, int $limit, int $windowSeconds): void
{
    $dir = storage_path('ratelimit');
    if (!is_dir($dir)) {
        mkdir($dir, 0775, true);
    }

    $hash = hash('sha256', $key);
    $file = $dir . '/' . $hash . '.json';
    $now = time();

    $data = ['count' => 0, 'reset' => $now + $windowSeconds];
    if (file_exists($file)) {
        $content = json_decode((string)file_get_contents($file), true);
        if (is_array($content)) {
            $data = $content;
        }
    }

    if ($now > (int)$data['reset']) {
        $data = ['count' => 0, 'reset' => $now + $windowSeconds];
    }

    $data['count']++;
    file_put_contents($file, json_encode($data));

    if ($data['count'] > $limit) {
        json_response(false, null, 'Rate limit exceeded', 429);
    }
}

function log_event(string $type, string $message, ?string $ip = null): void
{
    $dir = storage_path('logs');
    if (!is_dir($dir)) {
        mkdir($dir, 0775, true);
    }
    $line = sprintf("%s\t%s\t%s\t%s\n", date('c'), $type, $ip ?? '-', $message);
    file_put_contents($dir . '/audit.log', $line, FILE_APPEND);
}
