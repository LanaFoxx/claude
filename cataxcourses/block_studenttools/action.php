<?php
// Handles the Student tools buttons: add a student, enroll in a course, download or email a certificate.

require_once(__DIR__ . '/../../config.php');
require_once($CFG->dirroot . '/user/lib.php');
require_once($CFG->libdir . '/enrollib.php');

require_login();
require_capability('moodle/site:config', context_system::instance());

$action = required_param('action', PARAM_ALPHA);
$returnurl = new moodle_url('/my/');

/** Back to the dashboard with this student open and a message. */
function block_studenttools_back($userid, $message, $type = 'success') {
    $url = new moodle_url('/my/', $userid ? ['stu' => $userid] : []);
    redirect($url, $message, null, $type === 'success' ? \core\output\notification::NOTIFY_SUCCESS
        : \core\output\notification::NOTIFY_ERROR);
}

/** Enroll a user in a course with its manual enrolment method. Returns '' or an error message. */
function block_studenttools_enrol($userid, $courseid) {
    global $DB;
    $course = $DB->get_record('course', ['id' => $courseid], 'id, fullname', MUST_EXIST);
    $instance = $DB->get_record('enrol', ['courseid' => $courseid, 'enrol' => 'manual'], '*', IGNORE_MULTIPLE);
    $plugin = enrol_get_plugin('manual');
    if (!$instance || !$plugin) {
        return 'This course has no manual enrolment method, so students cannot be added from here.';
    }
    if ($instance->status != ENROL_INSTANCE_ENABLED) {
        return 'Manual enrolments are turned off for this course.';
    }
    $roleid = $instance->roleid ?: $DB->get_field('role', 'id', ['shortname' => 'student']);
    $plugin->enrol_user($instance, $userid, $roleid, time());
    return '';
}

/** The certificate activity and its template for a course module id. */
function block_studenttools_cert($cmid) {
    global $DB;
    $cm = get_coursemodule_from_id('customcert', $cmid, 0, false, MUST_EXIST);
    $customcert = $DB->get_record('customcert', ['id' => $cm->instance], '*', MUST_EXIST);
    $template = $DB->get_record('customcert_templates', ['id' => $customcert->templateid], '*', MUST_EXIST);
    return [$cm, $customcert, new \mod_customcert\template($template)];
}

/**
 * True when the student may get this certificate from here: they completed the course, or a certificate
 * was already issued to them. Nothing is ever issued for an unfinished course.
 */
function block_studenttools_can_have_cert($customcert, $courseid, $userid) {
    global $DB;
    return $DB->record_exists('customcert_issues', ['customcertid' => $customcert->id, 'userid' => $userid])
        || (bool)$DB->get_field('course_completions', 'timecompleted', ['userid' => $userid, 'course' => $courseid]);
}

/** Record the certificate as issued (it holds the certificate code); only called after the check above. */
function block_studenttools_issue($customcert, $userid) {
    global $DB;
    if ($DB->record_exists('customcert_issues', ['customcertid' => $customcert->id, 'userid' => $userid])) {
        return;
    }
    if (method_exists('\mod_customcert\certificate', 'issue_certificate')) {
        \mod_customcert\certificate::issue_certificate($customcert->id, $userid);
        return;
    }
    $DB->insert_record('customcert_issues', (object)[
        'userid' => $userid,
        'customcertid' => $customcert->id,
        'code' => \mod_customcert\certificate::generate_code(),
        'emailed' => 0,
        'timecreated' => time(),
    ]);
}

if ($action === 'download') {
    // GET link: open the student's certificate PDF.
    require_sesskey();
    $cmid = required_param('cmid', PARAM_INT);
    $userid = required_param('userid', PARAM_INT);
    list($cm, $customcert, $template) = block_studenttools_cert($cmid);
    if (!block_studenttools_can_have_cert($customcert, $cm->course, $userid)) {
        block_studenttools_back($userid, 'This student has not completed the course, so there is no certificate to download.', 'error');
    }
    block_studenttools_issue($customcert, $userid);
    $template->generate_pdf(false, $userid);
    exit;
}

require_sesskey();

if ($action === 'create') {
    $firstname = trim(required_param('firstname', PARAM_NOTAGS));
    $lastname = trim(required_param('lastname', PARAM_NOTAGS));
    $email = trim(core_text::strtolower(required_param('email', PARAM_RAW_TRIMMED)));
    $courseid = optional_param('courseid', 0, PARAM_INT);
    $sendlogin = optional_param('sendlogin', 0, PARAM_BOOL);
    if ($firstname === '' || $lastname === '' || !validate_email($email)) {
        block_studenttools_back(0, 'Please enter a first name, last name and a valid email address.', 'error');
    }
    if ($existing = $DB->get_record_select('user', 'LOWER(email) = ? AND deleted = 0', [$email], 'id', IGNORE_MULTIPLE)) {
        block_studenttools_back($existing->id, 'A student with that email already exists. Their details are shown below.', 'error');
    }
    if ($DB->record_exists('user', ['username' => $email, 'mnethostid' => $CFG->mnet_localhost_id])) {
        block_studenttools_back(0, 'That email is already used as a username.', 'error');
    }
    $password = generate_password(10);
    $user = (object)[
        'auth' => 'manual',
        'confirmed' => 1,
        'mnethostid' => $CFG->mnet_localhost_id,
        'username' => $email,
        'email' => $email,
        'firstname' => $firstname,
        'lastname' => $lastname,
        'password' => $password,
    ];
    $user->id = user_create_user($user, true, true);
    $message = fullname($user) . ' was added.';
    if ($courseid) {
        $error = block_studenttools_enrol($user->id, $courseid);
        $message .= $error ? ' Not enrolled: ' . $error : ' Enrolled in ' . format_string(get_course($courseid)->fullname) . '.';
    }
    if ($sendlogin) {
        $user = $DB->get_record('user', ['id' => $user->id]);
        setnew_password_and_mail($user);
        $message .= ' Login details were emailed to ' . $email . '.';
    } else {
        $message .= " Username: $email, temporary password: $password (write it down; it will not be shown again).";
    }
    block_studenttools_back($user->id, $message);
}

if ($action === 'enrol') {
    $userid = required_param('userid', PARAM_INT);
    $courseid = required_param('courseid', PARAM_INT);
    $error = block_studenttools_enrol($userid, $courseid);
    block_studenttools_back($userid, $error ?: 'Enrolled in ' . format_string(get_course($courseid)->fullname) . '.',
        $error ? 'error' : 'success');
}

if ($action === 'emailcert') {
    $cmid = required_param('cmid', PARAM_INT);
    $userid = required_param('userid', PARAM_INT);
    $user = $DB->get_record('user', ['id' => $userid, 'deleted' => 0], '*', MUST_EXIST);
    list($cm, $customcert, $template) = block_studenttools_cert($cmid);
    $course = get_course($cm->course);
    if (!block_studenttools_can_have_cert($customcert, $cm->course, $userid)) {
        block_studenttools_back($userid, 'This student has not completed the course, so no certificate was sent.', 'error');
    }
    block_studenttools_issue($customcert, $userid);
    $pdf = $template->generate_pdf(false, $userid, true);
    $dir = make_temp_directory('block_studenttools');
    $filename = clean_filename('Certificate - ' . format_string($course->fullname) . '.pdf');
    $path = $dir . '/' . $userid . '-' . $cm->id . '-' . time() . '.pdf';
    file_put_contents($path, $pdf);
    $from = core_user::get_support_user();
    $coursename = format_string($course->fullname);
    $subject = "Your certificate of completion: $coursename";
    $text = "Hello {$user->firstname},\n\nAttached is your certificate of completion for $coursename.\n\n" .
        "Thank you,\nCalifornia Tax Courses";
    $html = '<p>Hello ' . s($user->firstname) . ',</p><p>Attached is your certificate of completion for <strong>' .
        s($coursename) . '</strong>.</p><p>Thank you,<br>California Tax Courses</p>';
    $sent = email_to_user($user, $from, $subject, $text, $html, $path, $filename);
    @unlink($path);
    block_studenttools_back($userid, $sent ? "Certificate for $coursename emailed to {$user->email}."
        : 'The email could not be sent. Check the site email settings.', $sent ? 'success' : 'error');
}

block_studenttools_back(0, 'Unknown action.', 'error');
