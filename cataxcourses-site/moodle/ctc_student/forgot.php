<?php
// Simple "forgot password": one email box. Finds the account by email (the most recently used one if several
// accounts share the email) and sends Moodle's normal reset link. ?ajax=1 answers the login-page popup with JSON.
// phpcs:disable moodle.Files.RequireLogin.Missing -- public page for people who cannot log in.
require_once(__DIR__ . '/../../config.php');
require_once($CFG->dirroot . '/login/lib.php');
global $DB, $PAGE, $OUTPUT, $CFG, $SESSION;

$ajax = optional_param('ajax', 0, PARAM_INT);
$PAGE->set_context(context_system::instance());
$PAGE->set_url(new moodle_url('/blocks/ctc_student/forgot.php'));
$PAGE->set_pagelayout('login');
$PAGE->set_title('Reset your password');
if (isloggedin() && !isguestuser() && !$ajax) {
    redirect(new moodle_url('/my/'));
}
$phone = '(888) 229-1994';
$help = 'help@cataxcourses.com';
$hours = max(1, round(($CFG->pwresettime ?? 1800) / 3600, 1));
$hours = $hours == 1 ? '1 hour' : ($hours < 1 ? round(($CFG->pwresettime ?? 1800) / 60) . ' minutes' : $hours . ' hours');

function ctcsd_mask($email) {
    list($a, $d) = array_pad(explode('@', $email, 2), 2, '');
    return core_text::substr($a, 0, 2) . str_repeat('•', max(2, min(6, core_text::strlen($a) - 2))) . '@' . $d;
}

$state = '';
$email = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = core_text::strtolower(trim(optional_param('email', '', PARAM_RAW_TRIMMED)));
    // Light throttle per browser session.
    $SESSION->ctcsd_fp = array_values(array_filter((array) ($SESSION->ctcsd_fp ?? []), function ($t) { return $t > time() - 900; }));
    if (count($SESSION->ctcsd_fp) >= 6) {
        $state = 'slow';
    } else if (!validate_email($email)) {
        $state = 'bademail';
    } else {
        $SESSION->ctcsd_fp[] = time();
        $users = $DB->get_records_select('user', 'deleted = 0 AND mnethostid = ? AND LOWER(email) = ?', [$CFG->mnet_localhost_id, $email],
            'suspended ASC, lastaccess DESC, id DESC', 'id, username, email, suspended, auth, confirmed');
        if (!$users) {
            // Some accounts were created with the email as the username only.
            $users = $DB->get_records_select('user', 'deleted = 0 AND mnethostid = ? AND LOWER(username) = ?', [$CFG->mnet_localhost_id, $email],
                'suspended ASC, lastaccess DESC', 'id, username, email, suspended, auth, confirmed');
        }
        $user = $users ? reset($users) : null;
        if (!$user) {
            $state = 'notfound';
        } else if ($user->suspended) {
            $state = 'suspended';
        } else {
            try {
                list($status) = core_login_process_password_reset($user->username, '');
                $state = $status == PWRESET_STATUS_ALREADYSENT ? 'already' : 'sent';
                $email = $user->email;
            } catch (Throwable $e) {
                $state = 'error';
            }
        }
    }
}

$msgs = [
    'sent' => ['ok', 'Check your email', 'We sent a link to choose a new password to <strong>' . s(ctcsd_mask($email)) . '</strong>. It arrives in a minute or two and the link works for ' . $hours . '.<br><br>Don\'t see it? Check your <strong>spam or junk</strong> folder. The email comes from ' . s($CFG->noreplyaddress) . '.'],
    'already' => ['ok', 'Check your email', 'We already emailed a reset link to <strong>' . s(ctcsd_mask($email)) . '</strong> a few minutes ago. Please use the newest email (check your <strong>spam or junk</strong> folder too). You can ask for another link in ' . $hours . '.'],
    'notfound' => ['bad', 'We couldn\'t find that email', 'No account uses <strong>' . s($email) . '</strong>. Try the email address you used when you bought your course, or call us at ' . $phone . '.'],
    'suspended' => ['bad', 'Please contact us', 'This account is not active. Call us at ' . $phone . ' or email ' . $help . ' and we will help you right away.'],
    'bademail' => ['bad', 'Please check the email address', 'Enter the full email address, for example name@gmail.com.'],
    'slow' => ['bad', 'Too many tries', 'Please wait a few minutes and try again, or call us at ' . $phone . '.'],
    'error' => ['bad', 'Something went wrong', 'We could not send the email just now. Please call us at ' . $phone . ' or email ' . $help . '.'],
];
if ($ajax) {
    header('Content-Type: application/json');
    $m = $msgs[$state] ?? $msgs['error'];
    echo json_encode(['state' => $state, 'ok' => $m[0] === 'ok', 'title' => $m[1], 'html' => $m[2]]);
    die;
}

echo $OUTPUT->header();
echo '<style>.ctcfp{max-width:460px;margin:30px auto;background:#fff;border-radius:16px;padding:32px;box-shadow:0 10px 30px rgba(16,24,40,.12);color:#1d2939;font-size:15px}
.ctcfp h1{font-size:1.6rem;font-weight:700;margin:0 0 8px}.ctcfp p{color:#475467}.ctcfp label{font-weight:700;display:block;margin:16px 0 6px}
.ctcfp input[type=email]{width:100%;border:1px solid #d0d5dd;border-radius:10px;padding:13px 14px;font-size:1.05rem}
.ctcfp button{width:100%;margin-top:16px;background:#0b6bcb;color:#fff;border:0;border-radius:10px;padding:14px;font-size:1.05rem;font-weight:700;cursor:pointer}
.ctcfp .r{border-radius:12px;padding:14px 16px;margin:0 0 16px}.ctcfp .r-ok{background:#e8f6ef;color:#085d3a}.ctcfp .r-bad{background:#fef0ee;color:#912018}
.ctcfp .r strong:first-child{display:block;font-size:1.05rem;margin-bottom:4px}.ctcfp .f{margin-top:18px;font-size:.9rem;text-align:center;color:#667085}
.ctcfp a{font-weight:600}</style><div class="ctcfp">';
if (isset($msgs[$state])) {
    $m = $msgs[$state];
    echo '<div class="r r-' . $m[0] . '"><strong>' . $m[1] . '</strong>' . $m[2] . '</div>';
}
if ($state !== 'sent' && $state !== 'already') {
    echo '<h1>Reset your password</h1><p>Enter your email address and we\'ll email you a link to choose a new password.</p>'
        . '<form method="post" action="' . $PAGE->url->out(false) . '"><label for="ctcfp-email">Email address</label>'
        . '<input id="ctcfp-email" type="email" name="email" value="' . s($email) . '" required autocomplete="email" autofocus placeholder="name@example.com">'
        . '<button type="submit">Email me a reset link</button></form>';
}
echo '<div class="f"><a href="' . (new moodle_url('/login/index.php'))->out(false) . '">← Back to log in</a><br><br>Need help? Call ' . $phone . ' or email <a href="mailto:' . $help . '">' . $help . '</a></div></div>';
echo $OUTPUT->footer();
