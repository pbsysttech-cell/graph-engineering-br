<?php
/* Funções comuns da API de leads. Não é acessado diretamente (bloqueado no .htaccess). */
declare(strict_types=1);

require __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

const INTERESTS = ['gestao', 'consultoria', 'mentoria', 'parceria'];
const STATUSES  = ['novo', 'contato', 'reuniao', 'proposta', 'ganho', 'perdido'];

function out($data, int $code = 200): void {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function fail(string $msg, int $code = 400): void { out(['error' => $msg], $code); }

function body(): array {
    $raw = file_get_contents('php://input') ?: '';
    if (strlen($raw) > 20000) fail('Requisição grande demais', 413);
    $j = json_decode($raw, true);
    return is_array($j) ? $j : [];
}

function now_iso(): string { return gmdate('Y-m-d\TH:i:s\Z'); }

/* Texto opcional: corta espaços, limita tamanho, vazio vira null. */
function txt($v, int $max): ?string {
    if ($v === null || is_array($v)) return null;
    $v = trim((string) $v);
    if ($v === '') return null;
    return mb_substr($v, 0, $max);
}

function db(): PDO {
    static $pdo = null;
    if ($pdo) return $pdo;
    // LEADS_DSN só existe em teste local (SQLite); na Hostinger usa o MySQL do config.php.
    $dsn = getenv('LEADS_DSN');
    try {
        if ($dsn) {
            $pdo = new PDO($dsn);
        } else {
            if (DB_NAME === '' || DB_USER === '') fail('Banco de dados não configurado em api/config.php', 500);
            $pdo = new PDO('mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4', DB_USER, DB_PASS);
        }
    } catch (Throwable $e) {
        fail('Não foi possível conectar ao banco de dados', 500);
    }
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    $mysql = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql';
    // Cria a tabela na primeira vez (não precisa rodar SQL na mão).
    $pdo->exec('CREATE TABLE IF NOT EXISTS leads (
        id VARCHAR(32) NOT NULL PRIMARY KEY,
        created_at VARCHAR(25) NOT NULL,
        updated_at VARCHAR(25) NOT NULL,
        name VARCHAR(120) NOT NULL,
        whatsapp VARCHAR(25) NOT NULL,
        email VARCHAR(160) NULL,
        company VARCHAR(160) NULL,
        segment VARCHAR(80) NULL,
        city VARCHAR(80) NULL,
        revenue VARCHAR(20) NULL,
        ads_invest VARCHAR(20) NULL,
        team VARCHAR(20) NULL,
        crm VARCHAR(20) NULL,
        challenge TEXT NULL,
        interest VARCHAR(20) NOT NULL,
        message TEXT NULL,
        consent TINYINT NOT NULL DEFAULT 0,
        status VARCHAR(20) NOT NULL DEFAULT \'novo\',
        `value` DECIMAL(12,2) NULL,
        notes TEXT NULL,
        utm_source VARCHAR(120) NULL,
        utm_medium VARCHAR(120) NULL,
        utm_campaign VARCHAR(120) NULL,
        utm_content VARCHAR(120) NULL,
        utm_term VARCHAR(120) NULL,
        referrer VARCHAR(300) NULL,
        page VARCHAR(200) NULL,
        device VARCHAR(20) NULL,
        ip_hash VARCHAR(64) NULL
    )' . ($mysql ? ' DEFAULT CHARSET=utf8mb4' : ''));
    return $pdo;
}

/* ---------- sessão do painel ---------- */
function start_session(): void {
    if (session_status() === PHP_SESSION_ACTIVE) return;
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    session_name('mo_painel');
    session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => $https, 'httponly' => true, 'samesite' => 'Strict']);
    session_start();
}

function is_admin(): bool {
    start_session();
    return !empty($_SESSION['admin']) && ($_SESSION['exp'] ?? 0) > time();
}

function require_admin(): void {
    if (!is_admin()) fail('Não autorizado', 401);
    $_SESSION['exp'] = time() + 8 * 3600;   // renova a sessão a cada uso (8 h)
}

/* Pedidos do painel precisam deste cabeçalho: um formulário de outro site não consegue enviá-lo. */
function require_fetch_header(): void {
    if (($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') !== 'fetch') fail('Requisição inválida', 403);
}

/* Converte a linha do banco no formato que o painel usa. */
function row_out(array $r): array {
    unset($r['ip_hash']);
    $r['challenge'] = json_decode((string) ($r['challenge'] ?? '[]'), true) ?: [];
    $r['notes'] = json_decode((string) ($r['notes'] ?? '[]'), true) ?: [];
    $r['consent'] = (bool) $r['consent'];
    $r['value'] = $r['value'] === null ? null : (float) $r['value'];
    return $r;
}
