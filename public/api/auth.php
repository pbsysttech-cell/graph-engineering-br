<?php
/*
 * GET  /api/auth.php                          -> { logged: true|false }
 * POST /api/auth.php {action:"login", user, password}
 * POST /api/auth.php {action:"logout"}
 */
declare(strict_types=1);
require __DIR__ . '/_lib.php';

start_session();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') out(['logged' => is_admin()]);
if ($method !== 'POST') fail('Método não permitido', 405);
require_fetch_header();

$b = body();
$action = $b['action'] ?? '';

if ($action === 'logout') {
    $_SESSION = [];
    session_destroy();
    out(['ok' => true]);
}

if ($action === 'login') {
    if (strlen(ADMIN_PASSWORD) < 10) fail('Defina ADMIN_PASSWORD (mínimo 10 caracteres) em api/config.php', 500);

    // trava simples contra tentativa e erro: 5 erros seguidos bloqueiam por 10 minutos nesta sessão
    if (($_SESSION['fails'] ?? 0) >= 5 && ($_SESSION['fail_at'] ?? 0) > time() - 600) {
        fail('Muitas tentativas. Aguarde 10 minutos.', 429);
    }
    $ok = hash_equals(ADMIN_USER, (string) ($b['user'] ?? '')) & hash_equals(ADMIN_PASSWORD, (string) ($b['password'] ?? ''));
    if (!$ok) {
        $_SESSION['fails'] = ($_SESSION['fails'] ?? 0) + 1;
        $_SESSION['fail_at'] = time();
        usleep(800000);
        fail('Usuário ou senha incorretos', 401);
    }
    session_regenerate_id(true);
    $_SESSION = ['admin' => true, 'exp' => time() + 8 * 3600];
    out(['ok' => true]);
}

fail('Ação inválida');
