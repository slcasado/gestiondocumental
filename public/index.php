<?php

require_once __DIR__ . '/../app/security.php';
apply_security_headers();
configure_error_logging();

$path = $_SERVER['PATH_INFO'] ?? null;
if ($path === null) {
    $path = $_GET['path'] ?? '/';
}

if (str_starts_with($path, '/api')) {
    $_GET['path'] = substr($path, 4) ?: '/';
    require __DIR__ . '/../app/api.php';
    exit;
}

if (str_starts_with($path, '/assets/')) {
    $file = __DIR__ . $path;
    if (!file_exists($file)) {
        http_response_code(404);
        echo 'Not found';
        exit;
    }

    $ext = pathinfo($file, PATHINFO_EXTENSION);
    $types = [
        'js' => 'application/javascript',
        'css' => 'text/css',
        'png' => 'image/png',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'svg' => 'image/svg+xml',
    ];
    header('Content-Type: ' . ($types[$ext] ?? 'application/octet-stream'));
    readfile($file);
    exit;
}

if ($path !== '/' && $path !== '') {
    http_response_code(404);
    echo 'Not found';
    exit;
}

header('Content-Type: text/html; charset=utf-8');
readfile(__DIR__ . '/assets/index.html');
