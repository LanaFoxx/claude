<?php
// Site admins: send one test question to Claude and show the answer (checks the key and model).
require_once(__DIR__ . '/../../config.php');
require_once(__DIR__ . '/lib.php');
require_login();
if (!is_siteadmin()) throw new moodle_exception('nopermissions', 'error', '', 'site admin');
header('Content-Type: text/plain; charset=utf-8');
$r = local_ctctutor_ask('CTEC 20 Hour Continuing Education',
    [['role' => 'user', 'content' => 'In one or two sentences: what is the difference between a tax credit and a tax deduction?']]);
echo 'key source: ' . (trim((string) get_config('local_ctctutor', 'apikey')) !== '' ? 'TaxPro setting' : (local_ctctutor_key() !== '' ? 'Course update tool key' : 'NONE')) . "\n";
echo 'model: ' . (get_config('local_ctctutor', 'model') ?: 'claude-opus-5-5') . "\n\n";
echo isset($r['answer']) ? "OK\n\n" . $r['answer'] : "ERROR: " . $r['error'] . (isset($r['status']) ? ' (HTTP ' . $r['status'] . ': ' . ($r['detail'] ?? '') . ')' : '');
