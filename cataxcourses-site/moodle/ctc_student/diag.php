<?php
// Site-admin diagnostics for password resets and the dashboard (counts only, no personal data shown).
require_once(__DIR__ . '/../../config.php');
require_login();
if (!is_siteadmin()) { throw new moodle_exception('nopermissions', 'error', '', 'site admin'); }
header('Content-Type: text/plain; charset=utf-8');
global $DB, $CFG;
echo "auth plugins enabled: {$CFG->auth}\n";
foreach ($DB->get_records_sql("SELECT auth, COUNT(1) n, SUM(CASE WHEN suspended=1 THEN 1 ELSE 0 END) susp, SUM(CASE WHEN confirmed=0 THEN 1 ELSE 0 END) unconf,
        SUM(CASE WHEN email='' THEN 1 ELSE 0 END) noemail FROM {user} WHERE deleted=0 GROUP BY auth") as $r) {
    echo "users auth={$r->auth}: {$r->n} (suspended {$r->susp}, unconfirmed {$r->unconf}, no email {$r->noemail})\n";
}
echo "duplicate emails (accounts sharing an email): " . $DB->count_records_sql("SELECT COUNT(1) FROM (SELECT LOWER(email) e FROM {user} WHERE deleted=0 AND email<>'' GROUP BY LOWER(email) HAVING COUNT(1)>1) x") . "\n";
echo "emails with uppercase letters: " . $DB->count_records_sql("SELECT COUNT(1) FROM {user} WHERE deleted=0 AND email<>LOWER(email)") . "\n";
echo "emails with spaces: " . $DB->count_records_sql("SELECT COUNT(1) FROM {user} WHERE deleted=0 AND (email LIKE '% %' OR email LIKE ' %')") . "\n";
echo "users with emailstop=1: " . $DB->count_records('user', ['deleted' => 0, 'emailstop' => 1]) . "\n";
echo "users with bounces>0: " . $DB->count_records_sql("SELECT COUNT(1) FROM {user_preferences} WHERE name='email_bounce_count' AND value>0") . "\n";
echo "forced password change pending: " . $DB->count_records('user_preferences', ['name' => 'auth_forcepasswordchange', 'value' => '1']) . "\n";
$now = time();
foreach ([1, 7, 30] as $d) {
    echo "reset requests last {$d}d: " . $DB->count_records_select('user_password_resets', 'timerequested > ?', [$now - $d * 86400]) . "\n";
}
echo "reset requests total stored: " . $DB->count_records('user_password_resets') . "\n";
$rs = $DB->get_records_sql("SELECT r.id, r.timerequested, r.timererequested, u.auth, u.suspended, u.confirmed, u.lastlogin, u.currentlogin, u.timemodified
    FROM {user_password_resets} r JOIN {user} u ON u.id=r.userid ORDER BY r.timerequested DESC", [], 0, 40);
foreach ($rs as $r) {
    echo date('Y-m-d H:i', $r->timerequested) . ($r->timererequested ? ' (re-requested ' . date('m-d H:i', $r->timererequested) . ')' : '') . " auth={$r->auth} susp={$r->suspended} conf={$r->confirmed} lastlogin=" . ($r->lastlogin ? date('Y-m-d', $r->lastlogin) : 'never') . " pwchanged=" . date('Y-m-d H:i', $r->timemodified) . "\n";
}
echo "\nlog events (password reset related) last 30d:\n";
foreach ($DB->get_records_sql("SELECT eventname, COUNT(1) n FROM {logstore_standard_log} WHERE timecreated > ? AND (eventname LIKE '%password%' OR eventname LIKE '%loginfailed%') GROUP BY eventname", [$now - 30 * 86400]) as $r) {
    echo "  {$r->eventname}: {$r->n}\n";
}
echo "\nprofile fields:\n";
foreach ($DB->get_records('user_info_field', null, 'sortorder') as $f) {
    echo "  {$f->id} {$f->shortname} '{$f->name}' {$f->datatype} required={$f->required} locked={$f->locked} visible={$f->visible} signup={$f->signup} filled=" . $DB->count_records_select('user_info_data', "fieldid=? AND data<>''", [$f->id]) . "\n";
}
echo "\ncertificate modules: ";
foreach (['customcert', 'certificate', 'simplecertificate'] as $m) {
    if ($DB->get_manager()->table_exists($m)) echo "$m(" . $DB->count_records($m) . " acts, " . $DB->count_records($m . '_issues') . " issues) ";
}
echo "\n\ndefault dashboard blocks:\n";
$sys = $DB->get_record('my_pages', ['userid' => null, 'name' => '__default', 'private' => 1]);
if ($sys) foreach ($DB->get_records('block_instances', ['subpagepattern' => $sys->id, 'pagetypepattern' => 'my-index']) as $b) echo "  {$b->blockname} {$b->defaultregion} {$b->defaultweight}\n";
echo "personal dashboards: " . $DB->count_records_select('my_pages', 'userid IS NOT NULL AND private=1') . "\n";
foreach ($DB->get_records_sql("SELECT bi.blockname, COUNT(1) n FROM {block_instances} bi JOIN {my_pages} p ON p.id=bi.subpagepattern AND bi.pagetypepattern='my-index' WHERE p.userid IS NOT NULL GROUP BY bi.blockname") as $r) echo "  {$r->blockname}: {$r->n}\n";
echo "\nctecreport log statuses: ";
foreach ($DB->get_records_sql("SELECT status, COUNT(1) n FROM {local_ctecreport_log} GROUP BY status") as $r) echo "{$r->status}={$r->n} ";
echo "\ncfg: " . json_encode(['defaulthomepage' => $CFG->defaulthomepage ?? '', 'theme' => $CFG->theme, 'forgottenpasswordurl' => $CFG->forgottenpasswordurl ?? '', 'pwresettime' => $CFG->pwresettime ?? '', 'additionalhtmlhead' => strlen($CFG->additionalhtmlhead ?? ''), 'additionalhtmlfooter' => strlen($CFG->additionalhtmlfooter ?? ''), 'additionalhtmltopofbody' => strlen($CFG->additionalhtmltopofbody ?? ''), 'loginhttps'=>$CFG->wwwroot]) . "\n";
echo "\nbounce cfg: handlebounces=" . ($CFG->handlebounces ?? '') . " minbounces=" . ($CFG->minbounces ?? '(10)') . " bounceratio=" . ($CFG->bounceratio ?? '(.2)') . "\n";
echo "users over bounce threshold (Moodle silently stops emailing them): ";
$n = 0; $ids = $DB->get_fieldset_sql("SELECT userid FROM {user_preferences} WHERE name='email_bounce_count' AND value>0");
foreach (array_chunk($ids, 500) as $ch) { foreach ($DB->get_records_list('user', 'id', $ch, '', 'id, email') as $u) { if (over_bounce_threshold($u)) $n++; } }
echo "$n\n";
$sup = $DB->get_record('user', ['username' => 'adminsupport'], 'id, email, auth');
echo "adminsupport: " . json_encode($sup) . "\n";
if (optional_param('html', 0, PARAM_INT)) { echo "\n--- head\n{$CFG->additionalhtmlhead}\n--- top\n{$CFG->additionalhtmltopofbody}\n--- footer\n{$CFG->additionalhtmlfooter}\n"; }
echo "\npassword_updated by origin (30d):\n";
foreach ($DB->get_records_sql("SELECT " . $DB->sql_concat('origin', "'|'", "CASE WHEN userid=relateduserid THEN 'self' ELSE 'other' END", "'|'", 'COALESCE(other,\'\')') . " k, COUNT(1) n FROM {logstore_standard_log} WHERE timecreated > ? AND eventname = ? GROUP BY origin, CASE WHEN userid=relateduserid THEN 'self' ELSE 'other' END, other", [$now - 30 * 86400, '\\core\\event\\user_password_updated']) as $r) echo "  {$r->k}: {$r->n}\n";
echo "who changed others' passwords: ";
foreach ($DB->get_records_sql("SELECT l.userid, u.username, COUNT(1) n FROM {logstore_standard_log} l LEFT JOIN {user} u ON u.id=l.userid WHERE l.timecreated > ? AND l.eventname = ? AND l.userid<>l.relateduserid GROUP BY l.userid, u.username", [$now - 30 * 86400, '\\core\\event\\user_password_updated']) as $r) echo "{$r->username}({$r->userid})={$r->n} ";
echo "\nuser_updated by origin 30d: ";
foreach ($DB->get_records_sql("SELECT origin, COUNT(1) n FROM {logstore_standard_log} WHERE timecreated > ? AND eventname = ? GROUP BY origin", [$now - 30 * 86400, '\\core\\event\\user_updated']) as $r) echo "{$r->origin}={$r->n} ";
echo "\nloginfailed 7d: " . $DB->count_records_select('logstore_standard_log', 'timecreated > ? AND eventname = ?', [$now - 7 * 86400, '\\core\\event\\user_login_failed']) . "  loggedin 7d: " . $DB->count_records_select('logstore_standard_log', 'timecreated > ? AND eventname = ?', [$now - 7 * 86400, '\\core\\event\\user_loggedin']) . "\n";
echo "forgot_password page views 30d: " . $DB->count_records_select('logstore_standard_log', "timecreated > ? AND eventname LIKE ?", [$now - 30 * 86400, '%password_reset%']) . "\n";
echo "webservice functions used by tokens: ";

foreach ($DB->get_records_sql("SELECT ef.id, s.name, ef.functionname FROM {external_services_functions} ef JOIN {external_services} s ON s.id=ef.externalserviceid WHERE s.enabled=1 AND ef.functionname LIKE '%user%'") as $r) echo "{$r->name}:{$r->functionname} ";
echo "\n";
echo "\ncourses:\n";
foreach ($DB->get_records_sql("SELECT c.id, c.fullname, c.visible, (SELECT COUNT(1) FROM {user_enrolments} ue JOIN {enrol} e ON e.id=ue.enrolid WHERE e.courseid=c.id) n FROM {course} c WHERE c.id>1 ORDER BY c.id") as $c) echo "  {$c->id} v{$c->visible} n={$c->n} {$c->fullname}\n";
echo "users with the temporary password still set: " . $DB->count_records_select('user', 'deleted=0 AND password=?', [md5('orange123')]) . "\n";
echo "  of those, with forced change flag: " . $DB->count_records_sql("SELECT COUNT(1) FROM {user} u JOIN {user_preferences} p ON p.userid=u.id AND p.name='auth_forcepasswordchange' AND p.value='1' WHERE u.deleted=0 AND u.password=?", [md5('orange123')]) . "\n";
echo "  of those, logged in before (had their own password once): " . $DB->count_records_select('user', 'deleted=0 AND password=? AND lastlogin>0', [md5('orange123')]) . "\n";
