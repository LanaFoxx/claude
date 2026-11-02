<?php
// Site admin, one time: fix the store enrollment password reset, switch on the simple forgot-password box,
// and put the student dashboard block on every student's Dashboard.
require_once(__DIR__ . '/../../config.php');
require_login();
if (!is_siteadmin()) { throw new moodle_exception('nopermissions', 'error', '', 'site admin'); }
header('Content-Type: text/plain; charset=utf-8');
global $DB, $CFG;
$do = optional_param('do', '', PARAM_ALPHA);
if ($do !== '') { require_sesskey(); }
$ORIG = '56e0bfd2ed8af90152f48ef0f2cc4056cc7e89f3';

// 1. Enrollment script: stop resetting returning students' passwords.
$f = $CFG->dirroot . '/local/mdl_course_enroll/enrollcourse.php';
$new = file_get_contents(__DIR__ . '/patches/enrollcourse.php.txt');
$cur = sha1_file($f);
echo "enrollcourse.php: " . ($cur === sha1($new) ? 'patched' : ($cur === $ORIG ? 'original' : 'CHANGED (' . $cur . ')')) . "\n";
if ($do === 'enroll' || $do === 'all') {
    if ($cur === $ORIG) {
        copy($f, $f . '.ctc-backup-20261102');
        file_put_contents($f, $new);
        echo "  -> patched (backup: enrollcourse.php.ctc-backup-20261102), now " . (sha1_file($f) === sha1($new) ? 'OK' : 'FAILED') . "\n";
    }
}
if ($do === 'unenroll') {
    if (file_exists($f . '.ctc-backup-20261102')) { copy($f . '.ctc-backup-20261102', $f); echo "  -> restored original\n"; }
}

// 2. Forgot password.
$url = $CFG->wwwroot . '/blocks/ctc_student/forgot.php';
$snippet = file_get_contents(__DIR__ . '/patches/login.html');
$footer = (string) get_config('core', 'additionalhtmlfooter');
$has = strpos($footer, '<!-- CTC forgot-password box') !== false;
echo "forgottenpasswordurl=" . ($CFG->forgottenpasswordurl ?? '') . " pwresettime=" . ($CFG->pwresettime ?? '') . " login box=" . ($has ? 'yes' : 'no') . "\n";
if ($do === 'forgot' || $do === 'all') {
    set_config('forgottenpasswordurl', $url);
    set_config('pwresettime', 14400); // reset links work for 4 hours (was 30 minutes)
    $footer = preg_replace('#\s*<!-- CTC forgot-password box.*?<!-- /CTC forgot-password box -->#s', '', $footer);
    set_config('additionalhtmlfooter', rtrim($footer) . "\n\n" . $snippet);
    purge_all_caches();
    echo "  -> forgot-password box on, reset links last 4 hours\n";
}

// 2b. Left menu always open on computer screens.
if ($do === 'sidebar' || $do === 'all') {
    $sb = file_get_contents(__DIR__ . '/patches/sidebar.html');
    $footer = (string) get_config('core', 'additionalhtmlfooter');
    $footer = preg_replace('#\s*<!-- CTC sidebar always open.*?<!-- /CTC sidebar always open -->#s', '', $footer);
    set_config('additionalhtmlfooter', rtrim($footer) . "\n\n" . $sb);
    purge_all_caches();
    echo "  -> sidebar always open on screens 1200px and wider\n";
}

// 3. Dashboard block for students (default dashboard + students' own customised dashboards).
$staff = function ($userid) {
    return is_siteadmin($userid) || has_capability('moodle/course:update', context_system::instance(), $userid);
};
$pages = $DB->get_records_select('my_pages', "name = '__default' AND private = 1");
$added = 0;
foreach ($pages as $p) {
    if ($p->userid && $staff($p->userid)) { continue; }
    if ($DB->record_exists('block_instances', ['blockname' => 'ctc_student', 'pagetypepattern' => 'my-index', 'subpagepattern' => $p->id])) { continue; }
    if ($do === 'dash' || $do === 'all') {
        $ctx = $p->userid ? context_user::instance($p->userid) : context_system::instance();
        $bi = (object) ['blockname' => 'ctc_student', 'parentcontextid' => $ctx->id, 'showinsubcontexts' => 0, 'requiredbytheme' => 0,
            'pagetypepattern' => 'my-index', 'subpagepattern' => $p->id, 'defaultregion' => 'content', 'defaultweight' => -10,
            'configdata' => '', 'timecreated' => time(), 'timemodified' => time()];
        $bi->id = $DB->insert_record('block_instances', $bi);
        context_block::instance($bi->id);
    }
    $added++;
}
echo "dashboards " . (($do === 'dash' || $do === 'all') ? 'given' : 'needing') . " the block: $added\n";
