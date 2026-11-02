<?php
// Yearly update of one new (hidden) 20/60 Hour course: upload files, check the preview, apply. Then publish.
require_once(__DIR__ . '/../../config.php');
require_once(__DIR__ . '/lib.php');
require_login();
$sys = context_system::instance();
require_capability('block/ctc_courseupdate:manage', $sys);
core_php_time_limit::raise(900);
raise_memory_limit(MEMORY_HUGE);

$id = required_param('id', PARAM_INT);
$action = optional_param('action', '', PARAM_ALPHAEXT);
$course = get_course($id);
if (strpos((string) $course->idnumber, 'ctccu-') !== 0) {
    throw new moodle_exception('This page only works on courses created by the Course Update tool.');
}
$self = new moodle_url('/blocks/ctc_courseupdate/update.php', ['id' => $id]);
$PAGE->set_context($sys);
$PAGE->set_url($self);
$PAGE->set_pagelayout('admin');
$PAGE->set_title('Update ' . $course->fullname);
$PAGE->set_heading('Course update');
$year = (int) preg_replace('/^ctccu-\d+-/', '', $course->idnumber);

$msg = '';
$preview = '';
$hvps = block_ctccu_cms($id, 'hvp');
$quizzes = block_ctccu_cms($id, 'quiz');
$select = function ($name, array $cms, $selected) {
    $o = '<select name="' . s($name) . '" class="custom-select"><option value="0">— skip —</option>';
    foreach ($cms as $cm) {
        $o .= '<option value="' . $cm->id . '"' . ((int) $selected === (int) $cm->id ? ' selected' : '') . '>' . s($cm->name) . '</option>';
    }
    return $o . '</select>';
};
$form = function ($act, $inner, $button, $multipart = false, $confirm = '') use ($self) {
    return '<form method="post" action="' . $self->out(false) . '"' . ($multipart ? ' enctype="multipart/form-data"' : '') . ($confirm ? ' onsubmit="return confirm(' . s(json_encode($confirm)) . ')"' : '') . '>'
        . '<input type="hidden" name="sesskey" value="' . sesskey() . '"><input type="hidden" name="action" value="' . $act . '">' . $inner
        . ' <button class="btn btn-primary">' . $button . '</button></form>';
};
$ok = function ($t) { return html_writer::div($t, 'alert alert-success'); };
$bad = function ($t) { return html_writer::div($t, 'alert alert-danger'); };

try {
    if ($action !== '') {
        require_sesskey();
    }
    switch ($action) {
        /* ---------------- course PDF */

        case 'urls':
            $n = block_ctccu_set_links($id, optional_param_array('url', [], PARAM_RAW_TRIMMED), optional_param_array('urlname', [], PARAM_TEXT));
            $msg = $ok($n . ' link(s) updated.');
            break;

        /* ---------------- video links */
        case 'links_preview':
            $files = block_ctccu_uploaded('links');
            if (!$files) {
                throw new moodle_exception('Choose the YouTube links .xlsx file.');
            }
            $rows = block_ctccu_parse_links(reset($files));
            if (!$rows) {
                throw new moodle_exception('No YouTube links found in that file.');
            }
            block_ctccu_stash($id, 'links', $rows);
            $guesses = block_ctccu_match(array_column($rows, 'title'), $hvps);
            $t = '<table class="table table-sm"><thead><tr><th>#</th><th>From the sheet</th><th>New video</th><th>Goes into</th><th>New chapter title (Tax Law Updates only)</th></tr></thead><tbody>';
            foreach ($rows as $i => $r) {
                $guess = $guesses[$i];
                $cm = $guess ? get_fast_modinfo($id)->get_cm($guess) : null;
                $warn = $cm && !block_ctccu_is_tlu($cm) && block_ctccu_similarity($r['title'], $cm->name) < 0.5 ? ' <span class="badge badge-warning">check</span>' : '';
                $title = $cm && block_ctccu_is_tlu($cm) ? '<input type="text" class="form-control" name="title[' . $i . ']" value="' . s(block_ctccu_tlu_title($r['title'], $year)) . '">' : '<span class="text-muted">stays the same</span>';
                $t .= '<tr><td>' . ($i + 1) . '</td><td>' . s($r['title']) . (strpos($r['raw'], $r['url']) === false ? '<div class="small text-muted">link fixed: ' . s($r['raw']) . '</div>' : '') . '</td><td><a href="' . s($r['url']) . '" target="_blank">' . s($r['url']) . '</a></td><td>' . $select('map[' . $i . ']', $hvps, $guess) . $warn . '</td><td>' . $title . '</td></tr>';
            }
            $t .= '</tbody></table>';
            $preview = '<h4>Check the video links</h4><p>' . count($rows) . ' links in the sheet, ' . count($hvps) . ' videos in the course, matched by title. Rows marked "check" were matched by position — make sure they are right.</p>' . $form('links_apply', $t, 'Apply video links');
            break;
        case 'links_apply':
            $rows = block_ctccu_unstash($id, 'links') ?: [];
            $map = optional_param_array('map', [], PARAM_INT);
            $titles = optional_param_array('title', [], PARAM_TEXT);
            $plan = [];
            foreach ($map as $i => $cmid) {
                if ($cmid && isset($rows[$i])) {
                    $plan[$cmid] = ['url' => $rows[$i]['url'], 'title' => trim($titles[$i] ?? '')];
                }
            }
            block_ctccu_apply_links($id, $plan);
            $msg = $ok(count($plan) . ' videos updated.');
            break;

        /* ---------------- H5P video questions */
        case 'ts_preview':
            $files = block_ctccu_uploaded('ts');
            if (!$files) {
                throw new moodle_exception('Choose the timestamp quiz files (.xlsx or a .zip of them).');
            }
            $parsed = [];
            foreach ($files as $name => $path) {
                $parsed[$name] = block_ctccu_parse_timestamps($path);
            }
            block_ctccu_stash($id, 'ts', $parsed);
            $guess = array_combine(array_keys($parsed), block_ctccu_match(array_keys($parsed), $hvps));
            $t = '<table class="table table-sm"><thead><tr><th>File</th><th>Questions</th><th>Times</th><th>Goes into video</th><th>Notes</th></tr></thead><tbody>';
            $i = 0;
            foreach ($parsed as $name => $qs) {
                $notes = array_filter(array_map(function ($q) { return $q['problem'] ? gmdate('G:i:s', $q['t']) . ' — ' . $q['problem'] : ''; }, $qs));
                $t .= '<tr><td>' . s($name) . '<input type="hidden" name="file[' . $i . ']" value="' . s($name) . '"></td><td>' . count(array_filter($qs, function ($q) { return $q['ok']; })) . ' of ' . count($qs) . '</td>'
                    . '<td class="small">' . s(implode(', ', array_map(function ($q) { return gmdate('G:i:s', $q['t']); }, $qs))) . '</td><td>' . $select('map[' . $i . ']', $hvps, $guess[$name] ?? 0) . (empty($guess[$name]) ? ' <span class="badge badge-warning">pick one</span>' : '') . '</td>'
                    . '<td class="small">' . ($notes ? '<span class="text-warning">' . implode('<br>', array_map('s', $notes)) . '</span>' : '—') . '</td></tr>';
                $i++;
            }
            $t .= '</tbody></table>';
            $preview = '<h4>Check the video questions</h4><p>Each video\'s pop-up questions are replaced with the ones in its file, at the file\'s times. Labels and other items in the video stay.</p>' . $form('ts_apply', $t, 'Apply video questions');
            break;
        case 'ts_apply':
            $parsed = block_ctccu_unstash($id, 'ts') ?: [];
            $map = optional_param_array('map', [], PARAM_INT);
            $fnames = optional_param_array('file', [], PARAM_RAW);
            $done = [];
            $template = null;
            foreach ($map as $i => $cmid) {
                $name = $fnames[$i] ?? '';
                if ($cmid && isset($parsed[$name])) {
                    $n = block_ctccu_apply_timestamps($id, $cmid, $parsed[$name], $template);
                    $done[] = get_fast_modinfo($id)->get_cm($cmid)->name . ': ' . $n;
                }
            }
            rebuild_course_cache($id, true);
            block_ctccu_log($id, 'Video questions replaced — ' . implode('; ', $done));
            block_ctccu_step_done($id, 'timestamps', count($done) . ' videos');
            $msg = $ok('Video questions replaced in ' . count($done) . ' videos.');
            break;

        /* ---------------- quiz questions */
        case 'quiz_preview':
            $files = block_ctccu_uploaded('quiz');
            if (!$files) {
                throw new moodle_exception('Choose the quiz question files (.xlsx or a .zip of them).');
            }
            $pools = [];
            foreach ($files as $name => $path) {
                $pools = array_merge($pools, block_ctccu_parse_pools($name, $path));
            }
            block_ctccu_stash($id, 'pools', $pools);
            $guess = array_combine(array_keys($pools), block_ctccu_match(array_keys($pools), $quizzes));
            $t = '<table class="table table-sm"><thead><tr><th>Question pool</th><th>Usable questions</th><th>Goes into quiz</th><th>Notes</th></tr></thead><tbody>';
            $i = 0;
            foreach ($pools as $name => $qs) {
                $good = count(array_filter($qs, function ($q) { return $q['problem'] === ''; }));
                $badq = array_filter($qs, function ($q) { return $q['problem'] !== ''; });
                $topics = count(array_unique(array_filter(array_column($qs, 'topic'))));
                $t .= '<tr><td>' . s($name) . '<input type="hidden" name="pool[' . $i . ']" value="' . s($name) . '"></td><td>' . $good . ($topics > 1 ? '<div class="small text-muted">' . $topics . ' topics — picked in proportion</div>' : '') . '</td>'
                    . '<td>' . $select('map[' . $i . ']', $quizzes, $guess[$name] ?? 0) . (empty($guess[$name]) ? ' <span class="badge badge-warning">pick one</span>' : '') . '</td>'
                    . '<td class="small">' . ($badq ? '<span class="text-warning">' . count($badq) . ' skipped: ' . s(implode('; ', array_slice(array_map(function ($q) { return shorten_text($q['q'], 50) . ' (' . $q['problem'] . ')'; }, $badq), 0, 3))) . (count($badq) > 3 ? '…' : '') . '</span>' : '—') . '</td></tr>';
                $i++;
            }
            $t .= '</tbody></table><p class="small text-muted">Each quiz keeps its number of questions: that many are picked at random from its pool. Pass mark 70%, unlimited attempts.</p>';
            $counts = implode(', ', array_map(function ($q) { global $DB; return s($q->name) . ': ' . $DB->count_records('quiz_slots', ['quizid' => $q->instance]); }, $quizzes));
            $preview = '<h4>Check the quiz questions</h4><p class="small">Questions per quiz now — ' . $counts . '</p>' . $form('quiz_apply', $t, 'Replace quiz questions', false, 'Replace the questions in the selected quizzes?');
            break;
        case 'quiz_apply':
            $pools = block_ctccu_unstash($id, 'pools') ?: [];
            $map = optional_param_array('map', [], PARAM_INT);
            $pnames = optional_param_array('pool', [], PARAM_RAW);
            $done = [];
            $warn = [];
            foreach ($map as $i => $cmid) {
                $name = $pnames[$i] ?? '';
                if (!$cmid || !isset($pools[$name])) {
                    continue;
                }
                $cm = get_fast_modinfo($id)->get_cm($cmid);
                $n = $DB->count_records('quiz_slots', ['quizid' => $cm->instance]);
                $picked = block_ctccu_pick($pools[$name], $n);
                if (count($picked) < $n) {
                    $warn[] = $cm->name . ' had ' . $n . ' questions but the pool only has ' . count($picked) . ' usable ones';
                }
                $added = block_ctccu_apply_quiz($id, $cmid, $picked, $cm->name);
                $done[] = $cm->name . ': ' . $added;
            }
            $fixed = block_ctccu_enforce_rules($id);
            block_ctccu_log($id, 'Quiz questions replaced — ' . implode('; ', $done) . ($warn ? '. Warning: ' . implode('; ', $warn) : ''));
            block_ctccu_step_done($id, 'quizzes', count($done) . ' quizzes');
            $msg = $ok('Questions replaced in ' . count($done) . ' quizzes.' . ($fixed ? ' Rules fixed: ' . s(implode('; ', $fixed)) : '')) . ($warn ? $bad(s(implode('; ', $warn))) : '');
            break;

        /* ---------------- rules + publish */
        case 'rules':
            $fixed = block_ctccu_enforce_rules($id);
            $msg = $ok($fixed ? 'Fixed: ' . s(implode('; ', $fixed)) : 'Everything already follows the rules.');
            break;
        case 'publish':
            $notes = block_ctccu_publish($id);
            $msg = $ok('Published. ' . s(implode(' ', $notes)));
            break;
    }
} catch (Throwable $e) {
    $msg = $bad(s($e->getMessage()));
}

/* ---------------- page */
$course = get_course($id);
$src = (int) get_config('block_ctc_courseupdate', 'source_' . $id);
$step = function ($key, $title, $help, $body) use ($id) {
    $d = block_ctccu_step($id, $key);
    return '<div class="card mb-3"><div class="card-body"><h5 class="card-title">' . ($d ? '<span class="badge badge-success">Done</span> ' : '') . $title . '</h5>'
        . '<p class="text-muted small">' . $help . ($d ? ' Last done ' . userdate($d[0]) . ($d[1] ? ' (' . s($d[1]) . ')' : '') . '.' : '') . '</p>' . $body . '</div></div>';
};
echo $OUTPUT->header();
echo $OUTPUT->heading(s($course->fullname));
echo html_writer::div(($course->visible ? '<span class="badge badge-success">Visible to students</span>' : '<span class="badge badge-secondary">Hidden — students cannot see it yet</span>') . ' &nbsp; '
    . html_writer::link(new moodle_url('/course/view.php', ['id' => $id]), 'Open the course') . ($src ? ' · copied from ' . html_writer::link(new moodle_url('/course/view.php', ['id' => $src]), 'course ' . $src) : '') . ' · '
    . html_writer::link(new moodle_url('/my/'), 'Dashboard'), 'mb-3');
echo $msg . $preview;
if ($preview === '') {
    $urlcms = block_ctccu_cms($id, 'url');
    echo $step('textbook', '1. Course PDF (textbook)', 'Upload this year\'s webinar slides. Claude updates last year\'s course PDF (already in Moodle) with the new slides and the new year, and the result automatically becomes the PDF students download. You can download it there to send to Vervante.',
        html_writer::link(new moodle_url('/blocks/ctc_courseupdate/textbook.php', ['id' => $id]), 'Open the textbook builder', ['class' => 'btn btn-primary']));
    echo $step('links', '2. YouTube video links', 'The "Course YouTube Links" sheet. Every video gets its new link; the Federal Tax Law Updates chapters also get their new titles (you can edit them in the preview).', $form('links_preview', '<input type="file" name="links" accept=".xlsx,.xls" required>', 'Preview', true));
    echo $step('timestamps', '3. Video questions (H5P timestamps)', 'The "Timestamps Quizzes" files — select them all or upload the .zip. Do this after step 2 so the new chapter titles match.', $form('ts_preview', '<input type="file" name="ts[]" accept=".xlsx,.xls,.zip" multiple required>', 'Preview', true));
    echo $step('quizzes', '4. Quiz / exam questions', 'The "Final Quizzes" files (20 Hour) or the "Final Examination Questions and Answers" workbook (60 Hour). Select them all or upload the .zip.', $form('quiz_preview', '<input type="file" name="quiz[]" accept=".xlsx,.xls,.zip" multiple required>', 'Preview', true));
    $rules = block_ctccu_check_rules($id);
    echo $step('rules', '5. Rules check', 'Pass mark 70% or higher, unlimited attempts, certificate only after every exam is passed. Checked and fixed automatically after every import.',
        '<ul class="small">' . implode('', array_map(function ($r) { return '<li>' . ($r['ok'] ? '✅ ' : '❌ ') . s($r['text']) . '</li>'; }, $rules)) . '</ul>' . $form('rules', '', 'Fix anything that is off'));
    echo $step('publish', '6. Publish', 'Makes the course visible, adds it to CTEC reporting with last year\'s CTEC course number, and points the store\'s product at it so new orders enroll here. Students already on last year\'s course stay there.',
        $course->visible ? '<p>Already published.</p>' : $form('publish', '', 'Publish ' . s($course->fullname), false, 'Publish now? New orders will enroll in this course.'));
    if ($urlcms) {
        $rowsu = '';
        foreach ($urlcms as $cm) {
            $u = $DB->get_record('url', ['id' => $cm->instance]);
            $rowsu .= '<tr><td><input type="text" class="form-control" name="urlname[' . $cm->id . ']" value="' . s($u->name) . '"></td><td><input type="url" class="form-control" name="url[' . $cm->id . ']" value="' . s($u->externalurl) . '"></td></tr>';
        }
        echo $step('urls', 'Other links in the course', 'Optional: links such as the errata. The PDF link is set automatically by step 1.',
            $form('urls', '<table class="table table-sm"><thead><tr><th>Name students see</th><th>Link</th></tr></thead><tbody>' . $rowsu . '</tbody></table>', 'Save links'));
    }
    $log = block_ctccu_get_log($id);
    if ($log) {
        echo '<h5>History</h5><ul class="small text-muted">' . implode('', array_map(function ($l) { return '<li>' . userdate($l[0], '%b %d, %Y %I:%M %p') . ' — ' . s($l[1]) . '</li>'; }, array_reverse($log))) . '</ul>';
    }
} else {
    echo html_writer::link($self, '← Back without applying', ['class' => 'btn btn-link']);
}
echo $OUTPUT->footer();
