<?php

return [
    'db' => [
        'host' => 'localhost',
        'name' => 'costa_doc',
        'user' => 'root',
        'pass' => '',
        'charset' => 'utf8mb4',
    ],
    'security' => [
        'session_name' => 'costa_doc_session',
        'session_timeout' => 1800,
        'csrf_header' => 'X-CSRF-Token',
        'rate_limit_login' => ['limit' => 5, 'window' => 60],
        'rate_limit_api' => ['limit' => 100, 'window' => 60],
    ],
    'uploads' => [
        'base_dir' => __DIR__ . '/../storage/uploads',
        'allowed_local_prefixes' => [
            '/uploads',
            '/storage/uploads',
            '/app/backend/uploads',
        ],
        'allowed_external_domains' => [
            'hcostadealmeria.net',
            'www.hcostadealmeria.net',
        ],
    ],
    'app' => [
        'base_url' => '',
    ],
];
