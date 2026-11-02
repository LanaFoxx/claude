<?php
// One-time setup (site admins): the "Admin Support" role + user. Manager rights at site level, but no course editing.
require_once(__DIR__ . '/../../config.php');
require_login();
if (!is_siteadmin()) { throw new required_capability_exception(context_system::instance(), 'moodle/site:config', 'nopermissions', ''); }
require_sesskey();
require_once($CFG->dirroot . '/user/lib.php');
$sys = context_system::instance();
$out = [];
$role = $DB->get_record('role', ['shortname' => 'adminsupport']);
if (!$role) {
    $rid = create_role('Admin Support', 'adminsupport', 'Site-wide manager without course editing. Sees Student Tools, CTEC reporting and Dispute evidence.', 'manager');
    set_role_contextlevels($rid, [CONTEXT_SYSTEM]);
    foreach (get_default_role_archetype_allows('assign', 'manager') as $a) { if ($a) { core_role_set_assign_allowed($rid, $a); } }
    foreach (get_default_role_archetype_allows('override', 'manager') as $a) { if ($a) { core_role_set_override_allowed($rid, $a); } }
    foreach (get_default_role_archetype_allows('switch', 'manager') as $a) { if ($a) { core_role_set_switch_allowed($rid, $a); } }
    $out[] = 'Role created';
} else {
    $rid = $role->id;
    $out[] = 'Role exists';
}
reset_role_capabilities($rid); // = manager archetype defaults
$prohibit = ['moodle/course:create', 'moodle/course:update', 'moodle/course:delete', 'moodle/course:manageactivities', 'moodle/course:activityvisibility',
    'moodle/course:sectionvisibility', 'moodle/course:movesections', 'moodle/course:setcurrentsection', 'moodle/course:changefullname', 'moodle/course:changeshortname',
    'moodle/course:changeidnumber', 'moodle/course:changecategory', 'moodle/course:changesummary', 'moodle/course:visibility', 'moodle/course:reset', 'moodle/course:import',
    'moodle/course:managefiles', 'moodle/course:renameroles', 'moodle/course:overridecompletion', 'moodle/course:tag', 'moodle/restore:restorecourse', 'moodle/restore:restoreactivity',
    'moodle/restore:restoresection', 'moodle/restore:restoretargetimport', 'moodle/backup:backuptargetimport', 'moodle/course:configurecustomfields', 'moodle/course:editcoursewelcomemessage',
    'moodle/question:add', 'moodle/question:editall', 'moodle/question:editmine', 'moodle/question:moveall', 'moodle/question:movemine', 'moodle/question:managecategory',
    'moodle/question:config', 'moodle/question:flag', 'mod/quiz:manage', 'mod/quiz:addinstance', 'mod/hvp:addinstance', 'mod/hvp:updatelibraries', 'mod/customcert:manage',
    'mod/customcert:addinstance', 'mod/lesson:edit', 'mod/lesson:addinstance', 'mod/feedback:edititems', 'mod/feedback:addinstance', 'mod/resource:addinstance',
    'mod/page:addinstance', 'mod/url:addinstance', 'moodle/site:manageblocks', 'block/ctc_disputes:courseupdate',
    'block/ctc_courseupdate:manage', 'block/ctc_courseupdate:myaddinstance', 'block/ctc_preorders:myaddinstance']; // course updates + pre-orders: main admin only
$n = 0;
foreach ($prohibit as $cap) {
    if (get_capability_info($cap)) { assign_capability($cap, CAP_PROHIBIT, $rid, $sys->id, true); $n++; }
}
assign_capability('block/ctc_disputes:view', CAP_ALLOW, $rid, $sys->id, true);
// Student Tools, CTEC reporting and the disputes admin pages check moodle/site:config. Course editing stays prohibited
// (a prohibit wins over any allow; only true site admins bypass it).
assign_capability('moodle/site:config', CAP_ALLOW, $rid, $sys->id, true);
assign_capability('moodle/my:manageblocks', CAP_ALLOW, $rid, $sys->id, true);
$out[] = "$n course-editing permissions prohibited";
// Let the role see the other dashboard blocks' content too (whatever "view" capabilities they define).
foreach ($DB->get_fieldset_select('capabilities', 'name', "name LIKE 'block/studenttools:%' OR name LIKE 'block/ctecreport:%' OR name LIKE 'local/ctecreport:%' OR name LIKE 'local/stripedispute:%'") as $cap) {
    if (!preg_match('/addinstance$/', $cap)) { assign_capability($cap, CAP_ALLOW, $rid, $sys->id, true); $out[] = "allowed $cap"; }
}
$user = $DB->get_record('user', ['username' => 'adminsupport', 'deleted' => 0]);
if (!$user) {
    $u = (object) ['username' => 'adminsupport', 'auth' => 'manual', 'confirmed' => 1, 'mnethostid' => $CFG->mnet_localhost_id,
        'firstname' => 'Admin', 'lastname' => 'Support', 'email' => required_param('email', PARAM_EMAIL), 'password' => required_param('pw', PARAM_RAW)];
    $uid = user_create_user($u, true, false);
    $out[] = 'User adminsupport created';
} else {
    $uid = $user->id;
    $out[] = 'User adminsupport exists';
}
role_assign($rid, $uid, $sys->id);
$out[] = 'Role assigned at site level';
// Their dashboard: Student Tools, CTEC reporting data and Dispute evidence in the main area.
require_once($CFG->dirroot . '/my/lib.php');
$mypage = my_copy_page($uid, MY_PAGE_PRIVATE);
$have = $DB->get_fieldset_select('block_instances', 'blockname', 'parentcontextid = ? AND pagetypepattern = ? AND subpagepattern = ?',
    [context_user::instance($uid)->id, 'my-index', (string) $mypage->id]);
$w = 0;
foreach (['studenttools', 'ctecreport', 'ctc_disputes'] as $bn) {
    if (!in_array($bn, $have, true) && $DB->record_exists('block', ['name' => $bn])) {
        $DB->insert_record('block_instances', (object) ['blockname' => $bn, 'parentcontextid' => context_user::instance($uid)->id, 'showinsubcontexts' => 0,
            'requiredbytheme' => 0, 'pagetypepattern' => 'my-index', 'subpagepattern' => (string) $mypage->id, 'defaultregion' => 'content', 'defaultweight' => $w,
            'configdata' => '', 'timecreated' => time(), 'timemodified' => time()]);
        $bi = $DB->get_record_sql('SELECT id FROM {block_instances} WHERE blockname = ? AND parentcontextid = ? ORDER BY id DESC', [$bn, context_user::instance($uid)->id], IGNORE_MULTIPLE);
        context_block::instance($bi->id);
        $out[] = "Added $bn to their dashboard";
    }
    $w++;
}
// Same as the main admin's dashboard: only those three panels.
foreach ($DB->get_records_select('block_instances', 'parentcontextid = ? AND pagetypepattern = ? AND subpagepattern = ?', [context_user::instance($uid)->id, 'my-index', (string) $mypage->id]) as $bi) {
    if (!in_array($bi->blockname, ['studenttools', 'ctecreport', 'ctc_disputes'], true)) { blocks_delete_instance($bi); $out[] = 'Removed ' . $bi->blockname; }
}
header('Content-Type: text/plain');
echo implode("\n", $out);
