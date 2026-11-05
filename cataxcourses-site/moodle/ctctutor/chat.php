<?php
// TaxPro chat endpoint: POST JSON {sesskey, course, messages:[{role, content}]} -> {answer} or {error}.
define('AJAX_SCRIPT', true);
require_once(__DIR__ . '/../../config.php');
require_once(__DIR__ . '/lib.php');
header('Content-Type: application/json; charset=utf-8');
$in = json_decode(file_get_contents('php://input'), true) ?: [];
$fail = function ($msg, $code = 200) { http_response_code($code); echo json_encode(['error' => $msg]); die; };
if (!isloggedin() || isguestuser()) $fail('Please log in to use TaxPro.');
if (empty($in['sesskey']) || !confirm_sesskey($in['sesskey'])) $fail('Your session expired. Please refresh the page.');
if (!get_config('local_ctctutor', 'enabled')) $fail('TaxPro is turned off right now.');
global $DB, $USER;
$courseid = (int) ($in['course'] ?? 0);
$course = $courseid > 1 ? $DB->get_record('course', ['id' => $courseid]) : null;
if (!$course) $fail('Course not found.');
$ctx = context_course::instance($course->id);
if (!is_enrolled($ctx, $USER, '', true) && !has_capability('moodle/course:update', $ctx)) $fail('TaxPro is available to students enrolled in this course.');
// Paused while the student is taking an exam (an open attempt worked on in the last 2 hours; old abandoned attempts don't count).
if ($DB->record_exists_sql("SELECT 1 FROM {quiz_attempts} qa JOIN {quiz} q ON q.id = qa.quiz WHERE qa.userid = ? AND qa.state = 'inprogress' AND q.course = ? AND qa.timemodified > ?", [$USER->id, $course->id, time() - 2 * HOURSECS])) {
    $fail('TaxPro is paused while you have an exam open. Finish or submit your exam, then come back.');
}
// Conversation: alternating turns ending with the student's question, trimmed to the last 12.
$msgs = [];
foreach (array_slice((array) ($in['messages'] ?? []), -12) as $m) {
    $role = ($m['role'] ?? '') === 'assistant' ? 'assistant' : 'user';
    $text = trim(core_text::substr(clean_param((string) ($m['content'] ?? ''), PARAM_NOTAGS), 0, $role === 'user' ? 1500 : 4000));
    if ($text === '') continue;
    if ($msgs && end($msgs)['role'] === $role) { $msgs[count($msgs) - 1]['content'] .= "\n\n" . $text; continue; }
    $msgs[] = ['role' => $role, 'content' => $text];
}
while ($msgs && $msgs[0]['role'] !== 'user') array_shift($msgs);
if (!$msgs || end($msgs)['role'] !== 'user') $fail('Please type a question.');
if (!local_ctctutor_take_quota($USER->id)) $fail("You've reached today's TaxPro question limit. It resets tomorrow.");
\core\session\manager::write_close(); // don't hold the session lock while Claude answers
$r = local_ctctutor_ask(format_string($course->fullname), $msgs);
unset($r['detail'], $r['status']);
echo json_encode($r);
