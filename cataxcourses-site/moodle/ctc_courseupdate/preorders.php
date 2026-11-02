<?php
// 20 Hour pre-orders: everyone who bought the 20 Hour course from January 15 until the new year's 20 Hour course was
// created. Enroll them all in a course you choose, and export the book orders (Excel) for Vervante.
require_once(__DIR__ . '/../../config.php');
require_once(__DIR__ . '/lib.php');
require_login();
$sys = context_system::instance();
require_capability('block/ctc_courseupdate:manage', $sys);
core_php_time_limit::raise(1800);
raise_memory_limit(MEMORY_HUGE);

$win = block_ctccu_preorder_window();
$from = optional_param('from', date('Y-m-d', $win['from']), PARAM_RAW_TRIMMED);
$to = optional_param('to', date('Y-m-d', $win['to']), PARAM_RAW_TRIMMED);
$action = optional_param('action', '', PARAM_ALPHA);
$self = new moodle_url('/blocks/ctc_courseupdate/preorders.php', ['from' => $from, 'to' => $to]);
$courses = block_ctccu_courses('20');
usort($courses, function ($a, $b) { return [$b->year, $b->id] <=> [$a->year, $a->id]; });
$target = optional_param('course', $courses ? $courses[0]->id : 0, PARAM_INT);

$msg = '';
try {
    $orders = block_ctccu_preorders($from, $to);
} catch (Throwable $e) {
    $orders = [];
    $msg = html_writer::div(s($e->getMessage()), 'alert alert-danger');
}
$enrol = array_values(array_filter($orders, function ($o) { return $o['course']; }));
$books = array_values(array_filter($orders, function ($o) { return $o['books']; }));

if ($action === 'export') {
    require_sesskey();
    block_ctccu_export_books($books, $from, $to);
    die;
}
if ($action === 'enroll' && $target) {
    require_sesskey();
    $res = block_ctccu_enroll_preorders($enrol, $target);
    $msg = html_writer::div('Enrolled ' . $res['added'] . ' students in ' . s(get_course($target)->fullname) . ' (' . $res['already'] . ' were already in it'
        . ($res['created'] ? ', ' . $res['created'] . ' new Moodle accounts created through the store enrollment' : '') . ').'
        . ($res['failed'] ? '<br><strong>Not enrolled (' . count($res['failed']) . '):</strong> ' . s(implode(', ', $res['failed'])) : ''), $res['failed'] ? 'alert alert-warning' : 'alert alert-success');
}

$PAGE->set_context($sys);
$PAGE->set_url($self);
$PAGE->set_pagelayout('admin');
$PAGE->set_title('20 Hour pre-orders');
$PAGE->set_heading('20 Hour pre-orders');
echo $OUTPUT->header();
echo $OUTPUT->heading('20 Hour pre-orders');
echo html_writer::div(html_writer::link(new moodle_url('/my/'), '← Dashboard'), 'mb-3');
echo $msg;
echo '<div class="card mb-3"><div class="card-body"><p class="mb-2">' . ($win['open']
        ? '🟢 <strong>Taking pre-orders now</strong> — since ' . userdate($win['from'], '%B %d, %Y') . '. The list closes automatically the day the new 20 Hour course is created.'
        : '🔒 <strong>Pre-orders closed</strong> on ' . userdate($win['to'], '%B %d, %Y') . ', when "' . s($win['course']) . '" was created.') . '</p>'
    . '<form method="get" class="form-inline" style="gap:8px">Orders from <input type="date" class="form-control" name="from" value="' . s($from) . '"> to <input type="date" class="form-control" name="to" value="' . s($to) . '"> <button class="btn btn-secondary">Show</button></form></div></div>';

// Enroll everyone.
$opts = '';
foreach ($courses as $c) {
    $opts .= '<option value="' . $c->id . '"' . ($c->id == $target ? ' selected' : '') . '>' . s($c->fullname) . ($c->visible ? '' : ' (hidden)') . '</option>';
}
echo '<div class="card mb-3"><div class="card-body"><h5>1. Enroll every pre-order in the new course</h5><p class="small text-muted">' . count($enrol) . ' pre-orders of the 20 Hour course. Students already in the course are skipped; anyone without a Moodle account gets one through the store\'s normal enrollment.</p>'
    . '<form method="post" action="' . $self->out(false) . '" onsubmit="return confirm(\'Enroll all ' . count($enrol) . ' pre-orders in the selected course?\')"><input type="hidden" name="sesskey" value="' . sesskey() . '"><input type="hidden" name="action" value="enroll">'
    . '<select name="course" class="custom-select" style="max-width:520px">' . $opts . '</select> <button class="btn btn-primary">Enroll all ' . count($enrol) . ' pre-orders in this course</button></form></div></div>';

// Book export.
echo '<div class="card mb-3"><div class="card-body"><h5>2. Export the book orders for Vervante</h5><p class="small text-muted">' . count($books) . ' orders with the 20 Hour book (Online Course + Book package, or the book on its own). Online-only orders are not included. Name, email, phone and the shipping address (or the billing address when there is no shipping address).</p>'
    . '<form method="post" action="' . $self->out(false) . '"><input type="hidden" name="sesskey" value="' . sesskey() . '"><input type="hidden" name="action" value="export"><button class="btn btn-primary">⬇ Export book orders (Excel)</button></form></div></div>';

// The list.
$in = [];
if ($target) {
    foreach (get_enrolled_users(context_course::instance($target), '', 0, 'u.id, u.email, u.username') as $u) {
        $in[core_text::strtolower($u->email)] = true;
        $in[core_text::strtolower($u->username)] = true;
    }
}
echo '<h5>Pre-orders (' . count($orders) . ' orders)</h5><table class="table table-sm small"><thead><tr><th>Order</th><th>Date</th><th>Student</th><th>Email</th><th>Bought</th><th>In the selected course</th></tr></thead><tbody>';
foreach (array_reverse($orders) as $o) {
    $isin = !empty($in[core_text::strtolower($o['account_email'])]) || !empty($in[core_text::strtolower($o['email'])]) || !empty($in[core_text::strtolower($o['user'])]);
    echo '<tr><td>#' . s($o['order']) . '</td><td>' . s($o['date']) . '</td><td>' . s(trim($o['first'] . ' ' . $o['last'])) . '</td><td>' . s($o['email']) . '</td><td>' . s(implode(', ', $o['items'])) . '</td><td>' . ($o['course'] ? ($isin ? '✅' : '—') : '<span class="text-muted">book only</span>') . '</td></tr>';
}
if (!$orders) {
    echo '<tr><td colspan="6">No 20 Hour orders in these dates.</td></tr>';
}
echo '</tbody></table>';
echo $OUTPUT->footer();
