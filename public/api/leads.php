<?php
/*
 * POST   /api/leads.php            -> visitante envia o formulário (público)
 * GET    /api/leads.php            -> lista os leads (painel, precisa de login)
 * PATCH  /api/leads.php?id=...     -> muda status, valor ou anotações (painel)
 * DELETE /api/leads.php?id=...     -> exclui (painel)
 */
declare(strict_types=1);
require __DIR__ . '/_lib.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

/* ================= formulário público ================= */
if ($method === 'POST') {
    $b = body();
    if (!empty($b['website'])) out(['ok' => true]);            // robô preencheu o campo escondido

    $name = txt($b['name'] ?? null, 120);
    $wa   = txt($b['whatsapp'] ?? null, 25);
    $digits = preg_replace('/\D/', '', (string) $wa);
    if (!$name || mb_strlen($name) < 2) fail('Informe seu nome');
    if (strlen($digits) < 10 || strlen($digits) > 13) fail('WhatsApp inválido');
    if (empty($b['consent'])) fail('É preciso autorizar o contato');
    $email = txt($b['email'] ?? null, 160);
    if ($email && !filter_var($email, FILTER_VALIDATE_EMAIL)) fail('E-mail inválido');
    $interest = in_array($b['interest'] ?? '', INTERESTS, true) ? $b['interest'] : 'gestao';

    $challenge = array_values(array_filter(array_map(function ($c) { return txt($c, 30); },
        is_array($b['challenge'] ?? null) ? array_slice($b['challenge'], 0, 10) : [])));

    $pdo = db();

    // anti-spam: no máximo 5 envios por IP a cada 10 minutos
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    $ipHash = hash('sha256', IP_SALT . $ip);
    $since = gmdate('Y-m-d\TH:i:s\Z', time() - 600);
    $q = $pdo->prepare('SELECT COUNT(*) FROM leads WHERE ip_hash = ? AND created_at > ?');
    $q->execute([$ipHash, $since]);
    if ((int) $q->fetchColumn() >= 5) fail('Muitos envios seguidos. Tente de novo em alguns minutos.', 429);

    $now = now_iso();
    $row = [
        'id' => bin2hex(random_bytes(16)),
        'created_at' => $now, 'updated_at' => $now,
        'name' => $name, 'whatsapp' => $wa, 'email' => $email,
        'company' => txt($b['company'] ?? null, 160), 'segment' => txt($b['segment'] ?? null, 80),
        'city' => txt($b['city'] ?? null, 80),
        'revenue' => txt($b['revenue'] ?? null, 20), 'ads_invest' => txt($b['ads_invest'] ?? null, 20),
        'team' => txt($b['team'] ?? null, 20), 'crm' => txt($b['crm'] ?? null, 20),
        'challenge' => json_encode($challenge, JSON_UNESCAPED_UNICODE),
        'interest' => $interest, 'message' => txt($b['message'] ?? null, 1000),
        'consent' => 1, 'status' => 'novo', 'notes' => '[]',
        'utm_source' => txt($b['utm_source'] ?? null, 120), 'utm_medium' => txt($b['utm_medium'] ?? null, 120),
        'utm_campaign' => txt($b['utm_campaign'] ?? null, 120), 'utm_content' => txt($b['utm_content'] ?? null, 120),
        'utm_term' => txt($b['utm_term'] ?? null, 120),
        'referrer' => txt($b['referrer'] ?? null, 300), 'page' => txt($b['page'] ?? null, 200),
        'device' => in_array($b['device'] ?? '', ['mobile', 'desktop'], true) ? $b['device'] : null,
        'ip_hash' => $ipHash,
    ];
    $cols = array_keys($row);
    $sql = 'INSERT INTO leads (' . implode(',', $cols) . ') VALUES (' . implode(',', array_fill(0, count($cols), '?')) . ')';
    $pdo->prepare($sql)->execute(array_values($row));
    out(['ok' => true], 201);
}

/* ================= painel ================= */
require_admin();
$pdo = db();

if ($method === 'GET') {
    $rows = $pdo->query('SELECT * FROM leads ORDER BY created_at DESC LIMIT 5000')->fetchAll();
    out(array_map('row_out', $rows));
}

require_fetch_header();
$id = (string) ($_GET['id'] ?? '');
if (!preg_match('/^[a-f0-9]{32}$/', $id)) fail('Lead inválido');

if ($method === 'PATCH') {
    $b = body();
    $set = [];
    $args = [];
    if (array_key_exists('status', $b)) {
        if (!in_array($b['status'], STATUSES, true)) fail('Status inválido');
        $set[] = 'status = ?'; $args[] = $b['status'];
    }
    if (array_key_exists('value', $b)) {
        $v = $b['value'];
        if ($v !== null && (!is_numeric($v) || $v < 0 || $v > 9999999999)) fail('Valor inválido');
        $set[] = '`value` = ?'; $args[] = $v === null ? null : round((float) $v, 2);
    }
    if (array_key_exists('notes', $b)) {
        if (!is_array($b['notes']) || count($b['notes']) > 500) fail('Anotações inválidas');
        $notes = [];
        foreach ($b['notes'] as $n) {
            if (!is_array($n)) continue;
            $notes[] = ['at' => txt($n['at'] ?? null, 30) ?? now_iso(), 'text' => txt($n['text'] ?? null, 2000) ?? '', 'auto' => !empty($n['auto'])];
        }
        $set[] = 'notes = ?'; $args[] = json_encode($notes, JSON_UNESCAPED_UNICODE);
    }
    if (!$set) fail('Nada para alterar');
    $set[] = 'updated_at = ?'; $args[] = now_iso();
    $args[] = $id;
    $pdo->prepare('UPDATE leads SET ' . implode(', ', $set) . ' WHERE id = ?')->execute($args);
    out(['ok' => true]);
}

if ($method === 'DELETE') {
    $pdo->prepare('DELETE FROM leads WHERE id = ?')->execute([$id]);
    out(['ok' => true]);
}

fail('Método não permitido', 405);
