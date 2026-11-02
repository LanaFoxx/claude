<?php
// CTC Course Update – core logic.
//
// Once a year: copy the newest "CTEC 20 Hour Continuing Education | YYYY Updated" (or 60 Hour) course to next year
// (hidden, no students), then import the partner's files into the copy:
//   - course PDF                 -> replaces the "Course PDF" download
//   - YouTube links sheet        -> video of each H5P Interactive Video (and the Federal Tax Law Updates chapter titles)
//   - Timestamps quizzes (.xlsx) -> the multiple-choice questions that pop up in each H5P video
//   - Final quizzes (.xlsx)      -> each quiz gets as many random questions from its pool as it has now
// Rules enforced on every import: pass mark 70% of the quiz total, unlimited attempts, certificate only after every
// quiz is passed. Publish makes the course visible, adds it to CTEC reporting and points the store's product at it.
defined('MOODLE_INTERNAL') || die();

const BLOCK_CTCCU_TYPES = [
    '20' => ['label' => '20 Hour', 'regex' => '/^CTEC 20 Hour Continuing Education\b.*?\b(20\d\d)\b/i', 'title' => 'CTEC 20 Hour Continuing Education | %d Updated', 'short' => 'CTEC20-%d', 'product' => 48],
    '60' => ['label' => '60 Hour', 'regex' => '/^CTEC 60 Hour Qualifying Education Course\b.*?\b(20\d\d)\b/i', 'title' => 'CTEC 60 Hour Qualifying Education Course | %d Updated', 'short' => 'CTEC60-%d', 'product' => 76],
];

/* ------------------------------------------------------------------ courses */

/** Courses of a type with their year, newest first. Skips names marked expired/outdated and copies like "(2)". */
function block_ctccu_courses($type) {
    global $DB;
    $def = BLOCK_CTCCU_TYPES[$type];
    $out = [];
    foreach ($DB->get_records_select('course', 'id <> ?', [SITEID], '', 'id, fullname, shortname, visible, idnumber, category, timecreated') as $c) {
        if (preg_match($def['regex'], $c->fullname, $m) && !preg_match('/expired|outdated|\(\d\)\s*$/i', $c->fullname)) {
            $c->year = (int) $m[1];
            $c->tool = strpos((string) $c->idnumber, 'ctccu-') === 0;
            $out[] = $c;
        }
    }
    usort($out, function ($a, $b) { return [$b->year, $b->visible] <=> [$a->year, $a->visible]; });
    return $out;
}

/** The course students are on now (newest visible), and a newer course being prepared by this tool, if any. */
function block_ctccu_state($type) {
    $live = null;
    $draft = null;
    foreach (block_ctccu_courses($type) as $c) {
        if (!$live && $c->visible) {
            $live = $c;
        }
        if (!$draft && $c->tool && !$c->visible) {
            $draft = $c;
        }
    }
    if ($draft && $live && $draft->year <= $live->year) {
        $draft = null;
    }
    return ['live' => $live, 'draft' => $draft];
}

function block_ctccu_log($courseid, $msg) {
    $log = json_decode((string) get_config('block_ctc_courseupdate', 'log_' . $courseid), true) ?: [];
    $log[] = [time(), $msg];
    set_config('log_' . $courseid, json_encode(array_slice($log, -200)), 'block_ctc_courseupdate');
}
function block_ctccu_get_log($courseid) {
    return json_decode((string) get_config('block_ctc_courseupdate', 'log_' . $courseid), true) ?: [];
}
function block_ctccu_step_done($courseid, $step, $summary = '') {
    set_config('step_' . $courseid . '_' . $step, json_encode([time(), $summary]), 'block_ctc_courseupdate');
}
function block_ctccu_step($courseid, $step) {
    return json_decode((string) get_config('block_ctc_courseupdate', 'step_' . $courseid . '_' . $step), true);
}

/** Replace a 4-digit year in a text (whole-number matches only). */
function block_ctccu_year($text, $from, $to) {
    return preg_replace('/(?<!\d)' . (int) $from . '(?!\d)/', (string) (int) $to, (string) $text);
}

/** Copy the live course to next year: backup (no users) + restore into a new hidden course, then update the year. */
function block_ctccu_create($type) {
    global $CFG, $DB, $USER;
    core_php_time_limit::raise(1800);
    raise_memory_limit(MEMORY_HUGE);
    $def = BLOCK_CTCCU_TYPES[$type];
    $st = block_ctccu_state($type);
    if (!$st['live']) {
        throw new moodle_exception('No current ' . $def['label'] . ' course found.');
    }
    if ($st['draft']) {
        return $st['draft']->id;
    }
    $src = $st['live'];
    $year = $src->year + 1;

    $short = sprintf($def['short'], $year);
    $n = 1;
    while ($DB->record_exists('course', ['shortname' => $short])) {
        $short = sprintf($def['short'], $year) . '-' . (++$n);
    }
    // Moodle's own "duplicate course" (backup + restore, no user data), hidden.
    require_once($CFG->dirroot . '/course/externallib.php');
    $res = core_course_external::duplicate_course($src->id, sprintf($def['title'], $year), $short, $src->category, 0,
        [['name' => 'users', 'value' => 0], ['name' => 'role_assignments', 'value' => 0], ['name' => 'comments', 'value' => 0],
         ['name' => 'userscompletion', 'value' => 0], ['name' => 'logs', 'value' => 0], ['name' => 'grade_histories', 'value' => 0]]);
    $newid = (int) $res['id'];

    // Name, year and hidden state.
    $course = $DB->get_record('course', ['id' => $newid]);
    $course->fullname = sprintf($def['title'], $year);
    $course->shortname = $short;
    $course->idnumber = 'ctccu-' . $type . '-' . $year;
    $course->visible = 0;
    $course->summary = block_ctccu_year($course->summary, $src->year, $year);
    $DB->update_record('course', $course);
    foreach ($DB->get_records('course_sections', ['course' => $newid]) as $s) {
        $DB->update_record('course_sections', (object) ['id' => $s->id, 'name' => block_ctccu_year($s->name, $src->year, $year),
            'summary' => block_ctccu_year($s->summary, $src->year, $year)]);
    }
    // Link activities (PDF links, "Errata for TY2025 Returns Prepared in Early CY2026"): both years move up one.
    foreach ($DB->get_records('url', ['course' => $newid]) as $u) {
        $DB->set_field('url', 'name', block_ctccu_year(block_ctccu_year($u->name, $src->year, $year), $src->year - 1, $src->year), ['id' => $u->id]);
    }
    // Year in the PDF download name and on the certificate.
    foreach ($DB->get_records('resource', ['course' => $newid]) as $r) {
        $DB->set_field('resource', 'name', block_ctccu_year($r->name, $src->year, $year), ['id' => $r->id]);
    }
    if ($DB->get_manager()->table_exists('customcert')) {
        foreach ($DB->get_records('customcert', ['course' => $newid]) as $cc) {
            $DB->set_field('customcert', 'name', block_ctccu_year($cc->name, $src->year, $year), ['id' => $cc->id]);
            $els = $DB->get_records_sql('SELECT e.id, e.data, e.name FROM {customcert_elements} e JOIN {customcert_pages} p ON p.id = e.pageid WHERE p.templateid = ?', [$cc->templateid]);
            foreach ($els as $e) {
                $DB->update_record('customcert_elements', (object) ['id' => $e->id, 'data' => block_ctccu_year($e->data, $src->year, $year),
                    'name' => block_ctccu_year($e->name, $src->year, $year)]);
            }
        }
    }
    rebuild_course_cache($newid, true);
    block_ctccu_log($newid, 'Created from "' . $src->fullname . '" (course ' . $src->id . ') as "' . $course->fullname . '" — hidden from students.');
    set_config('source_' . $newid, $src->id, 'block_ctc_courseupdate');
    block_ctccu_enforce_rules($newid);
    return $newid;
}

/* ------------------------------------------------------------------ course contents */

/** Activities of a module type in course order: [cm_info, ...]. */
function block_ctccu_cms($courseid, $modname) {
    $out = [];
    foreach (get_fast_modinfo($courseid)->get_cms() as $cm) {
        if ($cm->modname === $modname && !$cm->deletioninprogress) {
            $out[] = $cm;
        }
    }
    return $out;
}

/** Plain words of a title for matching ("UtPoIT - Income Explained - 2025 - Proper Format" -> [income, explained]). */
function block_ctccu_words($s) {
    $s = core_text::strtolower(strip_tags((string) $s));
    $s = str_replace(['&', '’', "'"], [' and ', '', ''], $s);
    $s = preg_replace('/\bpart\s*0*(\d+)/', ' part$1 ', $s); // "Part 01" and "(Part 1)" -> part1, so parts are told apart
    $s = preg_replace('/\.xlsx?$|understanding the principles of individual taxation|utpoit|wslides|proper format|click here to watch course webinar|quiz|\bty\s?20\d\d\b|\b20\d\d\b|\bfor cy\b|[^a-z0-9 ]+/', ' ', $s);
    $stop = ['the', 'and', 'of', 'a', 'to', 'for', 'general', 'updates', 'update', 'part', 'hour', 'hours', 'course', 'ctec', 'tlu', 'casa01'];
    return array_values(array_filter(array_unique(preg_split('/\s+/', $s)), function ($w) use ($stop) {
        return $w !== '' && !in_array($w, $stop, true) && !preg_match('/^\d+$/', $w);
    }));
}
function block_ctccu_similarity($a, $b) {
    $wa = block_ctccu_words($a);
    $wb = block_ctccu_words($b);
    if (!$wa || !$wb) {
        return 0;
    }
    $common = count(array_intersect($wa, $wb));
    // Half "the shorter title is contained in the longer", half overlap of both (so "Part 01" alone is not a full match).
    return 0.5 * $common / min(count($wa), count($wb)) + 0.5 * $common / count(array_unique(array_merge($wa, $wb)));
}
/** Leading number of a file name ("05 Dependents.xlsx" -> 5), or null. */
function block_ctccu_leadnum($name) {
    return preg_match('/^\s*(\d{1,2})\b/', basename($name), $m) ? (int) $m[1] : null;
}

/**
 * Match names (sheet rows / files / pools) to activities:
 *   1) by title words, strongest matches first (each activity used once);
 *   2) leftovers by their leading number ("05 …" -> 5th activity) when it is free;
 *   3) remaining leftovers in order to the remaining activities.
 * Returns [index => cmid|0] in the order of $names.
 */
function block_ctccu_match(array $names, array $cms) {
    $pairs = [];
    foreach ($names as $i => $n) {
        foreach ($cms as $k => $cm) {
            $sc = block_ctccu_similarity($n, $cm->name);
            if ($sc >= 0.6) {
                $pairs[] = [$sc, $i, $k];
            }
        }
    }
    // A name that fits two activities (almost) equally well is ambiguous: leave it to its number / position.
    $best = [];
    foreach ($pairs as $pr) {
        $best[$pr[1]][] = $pr[0];
    }
    $pairs = array_values(array_filter($pairs, function ($pr) use ($best) {
        $scores = $best[$pr[1]];
        rsort($scores);
        return count($scores) < 2 || $scores[0] - $scores[1] > 0.05;
    }));
    // Same for an activity that two names fit equally well.
    $bycm = [];
    foreach ($pairs as $pr) {
        $bycm[$pr[2]][] = $pr[0];
    }
    $pairs = array_values(array_filter($pairs, function ($pr) use ($bycm) {
        $scores = $bycm[$pr[2]];
        rsort($scores);
        return count($scores) < 2 || $scores[0] - $scores[1] > 0.05 || $pr[0] < $scores[0];
    }));
    usort($pairs, function ($a, $b) { return $b[0] <=> $a[0]; });
    $out = array_fill_keys(array_keys($names), 0);
    $used = [];
    foreach ($pairs as $pr) {
        if (!$out[$pr[1]] && !isset($used[$pr[2]])) {
            // A tie between two activities for the same row is not a confident match.
            $out[$pr[1]] = $cms[$pr[2]]->id;
            $used[$pr[2]] = true;
        }
    }
    foreach ($names as $i => $n) {
        $num = block_ctccu_leadnum($n);
        if (!$out[$i] && $num && isset($cms[$num - 1]) && !isset($used[$num - 1]) && count($names) === count($cms)) {
            $out[$i] = $cms[$num - 1]->id;
            $used[$num - 1] = true;
        }
    }
    $free = array_values(array_filter(array_keys($cms), function ($k) use ($used) { return !isset($used[$k]); }));
    foreach ($names as $i => $n) {
        if (!$out[$i] && $free && count($names) === count($cms)) {
            $out[$i] = $cms[array_shift($free)]->id;
        }
    }
    return $out;
}

/* ------------------------------------------------------------------ spreadsheets */

/** Rows of every sheet: ['Sheet name' => [[cell, ...], ...]]. */
function block_ctccu_read_xlsx($path) {
    global $CFG;
    require_once($CFG->libdir . '/phpexcel/PHPExcel/IOFactory.php');
    $book = PHPExcel_IOFactory::load($path);
    $out = [];
    foreach ($book->getWorksheetIterator() as $ws) {
        $rows = [];
        foreach ($ws->toArray(null, true, false, false) as $r) {
            if (count(array_filter($r, function ($c) { return $c !== null && trim((string) $c) !== ''; }))) {
                $rows[] = array_map(function ($c) { return $c === null ? '' : trim((string) $c); }, $r);
            }
        }
        $out[$ws->getTitle()] = $rows;
    }
    return $out;
}

/** Uploaded files (single files and the contents of zips) as [original name => temp path], .xlsx/.pdf only. */
function block_ctccu_uploaded($field, $exts = ['xlsx', 'xls']) {
    $files = [];
    if (empty($_FILES[$field])) {
        return $files;
    }
    $f = $_FILES[$field];
    $names = (array) $f['name'];
    $tmps = (array) $f['tmp_name'];
    $dir = make_request_directory();
    foreach ($names as $i => $name) {
        if (empty($tmps[$i]) || !is_uploaded_file($tmps[$i])) {
            continue;
        }
        $ext = core_text::strtolower(pathinfo($name, PATHINFO_EXTENSION));
        if ($ext === 'zip') {
            $zip = new ZipArchive();
            if ($zip->open($tmps[$i]) === true) {
                for ($j = 0; $j < $zip->numFiles; $j++) {
                    $entry = $zip->getNameIndex($j);
                    $base = basename($entry);
                    $e = core_text::strtolower(pathinfo($base, PATHINFO_EXTENSION));
                    if ($base === '' || strpos($entry, '__MACOSX') !== false || strpos($base, '.') === 0 || !in_array($e, $exts, true)) {
                        continue;
                    }
                    $dest = $dir . '/' . md5($entry) . '.' . $e;
                    file_put_contents($dest, $zip->getFromIndex($j));
                    $files[$base] = $dest;
                }
                $zip->close();
            }
        } else if (in_array($ext, $exts, true)) {
            $dest = $dir . '/' . md5($name . $i) . '.' . $ext;
            move_uploaded_file($tmps[$i], $dest);
            $files[$name] = $dest;
        }
    }
    ksort($files, SORT_NATURAL);
    return $files;
}

/** Stash parsed data between the preview and the apply step. */
// (a temp file in moodledata: question pools are too big for a config value)
function block_ctccu_stash($courseid, $key, $data) {
    $dir = make_temp_directory('block_ctc_courseupdate');
    file_put_contents($dir . '/' . (int) $courseid . '_' . clean_param($key, PARAM_ALPHANUMEXT) . '.json', json_encode($data));
}
function block_ctccu_unstash($courseid, $key) {
    $f = make_temp_directory('block_ctc_courseupdate') . '/' . (int) $courseid . '_' . clean_param($key, PARAM_ALPHANUMEXT) . '.json';
    return is_readable($f) ? json_decode(file_get_contents($f), true) : null;
}

/* ------------------------------------------------------------------ 1. course PDF */

function block_ctccu_course_pdf_cm($courseid) {
    foreach (block_ctccu_cms($courseid, 'resource') as $cm) {
        if (preg_match('/pdf/i', $cm->name)) {
            return $cm;
        }
    }
    return null;
}
function block_ctccu_replace_pdf($courseid, $path, $filename) {
    global $DB;
    $cm = block_ctccu_course_pdf_cm($courseid);
    if (!$cm) {
        throw new moodle_exception('No "Course PDF" download found in the course.');
    }
    $ctx = context_module::instance($cm->id);
    $fs = get_file_storage();
    $fs->delete_area_files($ctx->id, 'mod_resource', 'content');
    $fs->create_file_from_pathname(['contextid' => $ctx->id, 'component' => 'mod_resource', 'filearea' => 'content', 'itemid' => 0,
        'filepath' => '/', 'filename' => clean_filename($filename), 'sortorder' => 1], $path);
    $res = $DB->get_record('resource', ['id' => $cm->instance]);
    $DB->update_record('resource', (object) ['id' => $res->id, 'revision' => $res->revision + 1, 'timemodified' => time()]);
    rebuild_course_cache($courseid, true);
    block_ctccu_log($courseid, 'Course PDF replaced with ' . $filename . '.');
    block_ctccu_step_done($courseid, 'pdf', $filename);
}

/* ------------------------------------------------------------------ 2. video links */

/** "https:/youtu.be/ID", "youtube.com/watch?v=ID", "youtu.be/ID?si=…" -> "https://youtu.be/ID" (or '' when no id). */
function block_ctccu_youtube($url) {
    $u = trim((string) $url);
    if (preg_match('~(?:youtu\.be/|youtube\.com/(?:watch\?(?:.*&)?v=|embed/|shorts/|live/))([A-Za-z0-9_-]{11})~', $u, $m)) {
        return 'https://youtu.be/' . $m[1];
    }
    return '';
}

/** Parse the links sheet: [[title, url], ...]. */
function block_ctccu_parse_links($path) {
    $out = [];
    foreach (block_ctccu_read_xlsx($path) as $rows) {
        foreach ($rows as $r) {
            $url = '';
            $title = '';
            foreach ($r as $c) {
                if (!$url && block_ctccu_youtube($c)) {
                    $url = block_ctccu_youtube($c);
                } else if (!$title && $c !== '' && !preg_match('~https?:|youtu~i', $c)) {
                    $title = $c;
                }
            }
            if ($url) {
                $out[] = ['title' => $title, 'url' => $url, 'raw' => implode(' | ', $r)];
            }
        }
        if ($out) {
            break;
        }
    }
    return $out;
}

/** Section name of a cm. */
function block_ctccu_section_name($cm) {
    $s = $cm->get_section_info();
    return get_section_name($cm->course, $s);
}

/** Is this video in the Federal Tax Law Updates section (whose chapter titles change every year)? */
function block_ctccu_is_tlu($cm) {
    return (bool) preg_match('/tax law updates/i', block_ctccu_section_name($cm) . ' ' . $cm->name);
}

/** Proposed new chapter title from the sheet ("Tax Law Updates - HR1 Individual Overview - TY2025" -> "HR1 Individual Overview 2027"). */
function block_ctccu_tlu_title($sheettitle, $year) {
    $t = trim(preg_replace('/\s*-\s*TY\s?20\d\d\b|\bTY\s?20\d\d\b/i', '', $sheettitle));
    $t = trim(preg_replace('/^Tax Law Updates\s*-\s*(?=\S)/i', '', $t));
    if ($t === '' || preg_match('/^tax law updates$/i', $t)) {
        $t = 'Tax Law Updates';
    }
    return trim($t) . ' ' . $year;
}

/** Rename "N. Old title - Click Here …" keeping the number and the suffix. */
function block_ctccu_rename($name, $title) {
    if (preg_match('/^(\d+\.\s*)(.*?)(\s*-\s*(?:Click Here.*|Quiz))$/i', $name, $m)) {
        return $m[1] . $title . ' -' . preg_replace('/^\s*-\s*/', ' ', $m[3]);
    }
    if (preg_match('/^(\d+\.\s*)/', $name, $m)) {
        return $m[1] . $title;
    }
    return $title;
}

/** Apply links: [cmid => ['url' => …, 'title' => new title or '']]. */
function block_ctccu_apply_links($courseid, array $plan) {
    global $DB;
    $n = 0;
    $renamed = [];
    $quizzes = block_ctccu_cms($courseid, 'quiz');
    foreach ($plan as $cmid => $p) {
        $cm = get_fast_modinfo($courseid)->get_cm($cmid);
        $hvp = $DB->get_record('hvp', ['id' => $cm->instance], '*', MUST_EXIST);
        $json = json_decode($hvp->json_content, true);
        if (!isset($json['interactiveVideo']['video'])) {
            continue;
        }
        $json['interactiveVideo']['video']['files'] = [['path' => $p['url'], 'mime' => 'video/YouTube', 'copyright' => ['license' => 'U']]];
        $upd = (object) ['id' => $hvp->id, 'json_content' => json_encode($json, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE), 'filtered' => '', 'timemodified' => time()];
        if (!empty($p['title'])) {
            $upd->name = block_ctccu_rename($hvp->name, $p['title']);
            $renamed[] = $upd->name;
            // The quiz right after this video in the same section gets the same title.
            foreach ($quizzes as $q) {
                if ($q->section == $cm->section && preg_match('/^' . preg_quote(strtok($hvp->name, '.'), '/') . '\./', $q->name)) {
                    $DB->set_field('quiz', 'name', block_ctccu_rename($q->name, $p['title']), ['id' => $q->instance]);
                    $renamed[] = block_ctccu_rename($q->name, $p['title']);
                }
            }
        }
        $DB->update_record('hvp', $upd);
        $n++;
    }
    rebuild_course_cache($courseid, true);
    block_ctccu_log($courseid, "Video links updated in $n videos." . ($renamed ? ' Renamed: ' . implode('; ', $renamed) : ''));
    block_ctccu_step_done($courseid, 'links', "$n videos");
}

/* ------------------------------------------------------------------ 3. H5P video questions */

/** Parse a timestamps sheet: [['t' => seconds, 'q' => …, 'answers' => [[text, feedback, correct], …], 'problem' => ''], …]. */
function block_ctccu_parse_timestamps($path) {
    $out = [];
    foreach (block_ctccu_read_xlsx($path) as $rows) {
        $head = array_map('core_text::strtolower', $rows[0] ?? []);
        $col = function ($name) use ($head) { $i = array_search(core_text::strtolower($name), $head, true); return $i === false ? null : $i; };
        if ($col('Hour') === null || $col('Question') === null) {
            continue;
        }
        foreach (array_slice($rows, 1) as $r) {
            if (!is_numeric($r[$col('Hour')] ?? '') || !is_numeric($r[$col('Minute')] ?? '') || trim($r[$col('Question')] ?? '') === '') {
                continue;
            }
            $answers = [];
            for ($i = 1; $i <= 6; $i++) {
                $a = $col('Answer' . $i);
                if ($a !== null && trim($r[$a] ?? '') !== '') {
                    $e = $col('Explanation' . $i);
                    $answers[] = [trim($r[$a]), $e !== null ? trim($r[$e] ?? '') : '', false];
                }
            }
            $right = $col('AnswerRight') !== null ? trim($r[$col('AnswerRight')] ?? '') : '';
            $problem = '';
            $hit = null;
            foreach ($answers as $i => $a) {
                if ($right !== '' && block_ctccu_same($a[0], $right)) {
                    $hit = $i;
                }
            }
            if ($hit === null) {
                // Fall back to the explanation that starts with "Correct".
                $c = array_keys(array_filter($answers, function ($a) { return preg_match('/^\s*correct\b/i', $a[1]); }));
                if (count($c) === 1) {
                    $hit = $c[0];
                    $problem = $right === '' ? 'Right answer was blank; used the answer whose explanation says "Correct".'
                        : 'Right answer "' . shorten_text($right, 60) . '" matched no answer; used the one whose explanation says "Correct".';
                } else {
                    $problem = 'Could not tell which answer is right — question skipped.';
                }
            }
            if ($hit !== null) {
                $answers[$hit][2] = true;
            }
            $out[] = ['t' => (int) $r[$col('Hour')] * 3600 + (int) $r[$col('Minute')] * 60 + (int) ($r[$col('Second')] ?? 0), 'q' => trim($r[$col('Question')]),
                'answers' => $answers, 'problem' => $problem, 'ok' => $hit !== null];
        }
        if ($out) {
            break;
        }
    }
    return $out;
}
function block_ctccu_same($a, $b) {
    $n = function ($s) { return core_text::strtolower(preg_replace('/\s+/', ' ', trim(html_entity_decode(strip_tags((string) $s)), " \t\n\r\0\x0B\"'."))); };
    return $n($a) === $n($b);
}
function block_ctccu_uuid() {
    $d = random_bytes(16);
    $d[6] = chr(ord($d[6]) & 0x0f | 0x40);
    $d[8] = chr(ord($d[8]) & 0x3f | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($d), 4));
}

/** Replace the multiple-choice pop-ups of one video. Other interactions (labels etc.) stay. */
function block_ctccu_apply_timestamps($courseid, $cmid, array $questions, &$template = null) {
    global $DB;
    $cm = get_fast_modinfo($courseid)->get_cm($cmid);
    $hvp = $DB->get_record('hvp', ['id' => $cm->instance], '*', MUST_EXIST);
    $json = json_decode($hvp->json_content, true);
    $inter = $json['interactiveVideo']['assets']['interactions'] ?? [];
    $keep = [];
    foreach ($inter as $x) {
        if (strpos($x['action']['library'] ?? '', 'H5P.MultiChoice') === 0) {
            if (!$template) {
                $template = $x;
            }
        } else {
            $keep[] = $x;
        }
    }
    if (!$template) {
        throw new moodle_exception('No existing multiple-choice question in "' . $cm->name . '" to copy the look and settings from.');
    }
    $n = 0;
    foreach ($questions as $q) {
        if (!$q['ok']) {
            continue;
        }
        $x = $template;
        $x['duration'] = ['from' => $q['t'], 'to' => $q['t'] + 10];
        $x['action']['subContentId'] = block_ctccu_uuid();
        $x['action']['params']['question'] = '<p>' . s($q['q']) . '</p>';
        $x['action']['params']['answers'] = array_map(function ($a) {
            return ['correct' => $a[2], 'tipsAndFeedback' => ['tip' => '', 'chosenFeedback' => '<div>' . s($a[1]) . '</div>', 'notChosenFeedback' => ''], 'text' => '<div>' . s($a[0]) . '</div>'];
        }, $q['answers']);
        $keep[] = $x;
        $n++;
    }
    usort($keep, function ($a, $b) { return ($a['duration']['from'] ?? 0) <=> ($b['duration']['from'] ?? 0); });
    $json['interactiveVideo']['assets']['interactions'] = $keep;
    $DB->update_record('hvp', (object) ['id' => $hvp->id, 'json_content' => json_encode($json, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE), 'filtered' => '', 'timemodified' => time()]);
    return $n;
}

/* ------------------------------------------------------------------ 4. quiz questions */

/**
 * Parse question pools. Returns [poolname => [['q', 'answers' => [], 'right', 'expl', 'topic', 'problem'], …]].
 * One pool per file (20 Hour: one file per chapter) or one per sheet (60 Hour: Ethics / Federal / California tabs).
 */
function block_ctccu_parse_pools($filename, $path) {
    $sheets = block_ctccu_read_xlsx($path);
    $pools = [];
    foreach ($sheets as $sheet => $rows) {
        $head = array_map(function ($h) { return core_text::strtoupper(preg_replace('/\s+/', '', $h)); }, $rows[0] ?? []);
        $qi = array_search('QUESTION', $head, true);
        if ($qi === false) {
            continue;
        }
        $ai = [];
        foreach ($head as $i => $h) {
            if (preg_match('/^ANSWER(\d)$/', $h)) {
                $ai[] = $i;
            }
        }
        $ri = array_search('RIGHTANSWER', $head, true);
        if ($ri === false) {
            $ri = array_search('CORRECTANSWER', $head, true);
        }
        $ei = array_search('EXPLANATION', $head, true);
        $ti = array_search('COURSELOCATOR', $head, true);
        $list = [];
        foreach (array_slice($rows, 1) as $r) {
            $q = trim($r[$qi] ?? '');
            if ($q === '') {
                continue;
            }
            $answers = array_values(array_filter(array_map(function ($i) use ($r) { return trim($r[$i] ?? ''); }, $ai), 'strlen'));
            $right = $ri !== false ? trim($r[$ri] ?? '') : '';
            $hit = null;
            foreach ($answers as $i => $a) {
                if (block_ctccu_same($a, $right)) {
                    $hit = $i;
                }
            }
            $list[] = ['q' => $q, 'answers' => $answers, 'right' => $hit, 'expl' => $ei !== false ? trim($r[$ei] ?? '') : '',
                'topic' => $ti !== false ? trim($r[$ti] ?? '') : '', 'problem' => $hit === null ? 'Right answer "' . shorten_text($right, 60) . '" matches none of the answers' : (count($answers) < 2 ? 'Fewer than 2 answers' : '')];
        }
        if ($list) {
            $pools[count($sheets) > 1 && $ti !== false ? $sheet : pathinfo($filename, PATHINFO_FILENAME)] = $list;
        }
    }
    return $pools;
}

/** Pick $n questions; spread across topics in proportion to the pool when topics are given. */
function block_ctccu_pick(array $pool, $n) {
    $pool = array_values(array_filter($pool, function ($q) { return $q['problem'] === ''; }));
    if ($n >= count($pool)) {
        shuffle($pool);
        return $pool;
    }
    $groups = [];
    foreach ($pool as $q) {
        $groups[$q['topic'] !== '' ? $q['topic'] : '_'][] = $q;
    }
    if (count($groups) === 1) {
        shuffle($pool);
        return array_slice($pool, 0, $n);
    }
    $total = count($pool);
    $alloc = [];
    $rest = [];
    foreach ($groups as $k => $g) {
        $exact = $n * count($g) / $total;
        $alloc[$k] = (int) floor($exact);
        $rest[$k] = $exact - floor($exact);
    }
    arsort($rest);
    foreach (array_keys($rest) as $k) {
        if (array_sum($alloc) >= $n) {
            break;
        }
        $alloc[$k]++;
    }
    $out = [];
    foreach ($groups as $k => $g) {
        shuffle($g);
        $out = array_merge($out, array_slice($g, 0, $alloc[$k]));
    }
    shuffle($out);
    return $out;
}

/** Moodle XML for multiple-choice questions (imported with Moodle's own XML importer). */
function block_ctccu_xml(array $qs, $prefix) {
    $cd = function ($s) { return '<![CDATA[' . str_replace(']]>', ']]]]><![CDATA[>', $s) . ']]>'; };
    $x = '<?xml version="1.0" encoding="UTF-8"?><quiz>';
    foreach ($qs as $i => $q) {
        $x .= '<question type="multichoice"><name><text>' . s(shorten_text($prefix . ' ' . ($i + 1) . ': ' . $q['q'], 250)) . '</text></name>'
            . '<questiontext format="html"><text>' . $cd('<p>' . s($q['q']) . '</p>') . '</text></questiontext>'
            . '<generalfeedback format="html"><text>' . $cd($q['expl'] !== '' ? '<p>' . s($q['expl']) . '</p>' : '') . '</text></generalfeedback>'
            . '<defaultgrade>1.0000000</defaultgrade><penalty>0.3333333</penalty><hidden>0</hidden><single>true</single><shuffleanswers>true</shuffleanswers><answernumbering>abc</answernumbering>'
            . '<correctfeedback format="html"><text>Your answer is correct.</text></correctfeedback><partiallycorrectfeedback format="html"><text>Your answer is partially correct.</text></partiallycorrectfeedback>'
            . '<incorrectfeedback format="html"><text>Your answer is incorrect.</text></incorrectfeedback><shownumcorrect/>';
        foreach ($q['answers'] as $j => $a) {
            $x .= '<answer fraction="' . ($j === $q['right'] ? 100 : 0) . '" format="html"><text>' . $cd(s($a)) . '</text><feedback format="html"><text></text></feedback></answer>';
        }
        $x .= '</question>';
    }
    return $x . '</quiz>';
}

/** Replace a quiz's questions with $picked (same number of questions, 1 mark each, total kept). */
function block_ctccu_apply_quiz($courseid, $cmid, array $picked, $label) {
    global $CFG, $DB;
    require_once($CFG->dirroot . '/mod/quiz/locallib.php');
    require_once($CFG->dirroot . '/question/format.php');
    require_once($CFG->dirroot . '/question/format/xml/format.php');
    require_once($CFG->libdir . '/questionlib.php');
    $cm = get_coursemodule_from_id('quiz', $cmid, $courseid, false, MUST_EXIST);
    $quiz = $DB->get_record('quiz', ['id' => $cm->instance], '*', MUST_EXIST);
    $course = get_course($courseid);
    $ctx = context_course::instance($courseid);
    $top = question_get_top_category($ctx->id, true);
    $catname = shorten_text($quiz->name, 200) . ' (' . date('Y-m-d H:i') . ')';
    $catid = $DB->insert_record('question_categories', (object) ['name' => $catname, 'contextid' => $ctx->id, 'info' => 'Imported by CTC Course Update',
        'infoformat' => FORMAT_HTML, 'parent' => $top->id, 'sortorder' => 999, 'stamp' => make_unique_id_code()]);
    $category = $DB->get_record('question_categories', ['id' => $catid]);

    $tmp = make_request_directory() . '/questions.xml';
    file_put_contents($tmp, block_ctccu_xml($picked, $label));
    $format = new qformat_xml();
    $format->setCategory($category);
    $format->setContexts([$ctx]);
    $format->setCourse($course);
    $format->setFilename($tmp);
    $format->setRealfilename('questions.xml');
    $format->setMatchgrades('error');
    $format->setCatfromfile(false);
    $format->setContextfromfile(false);
    $format->setStoponerror(true);
    $format->set_display_progress(false);
    ob_start();
    $ok = $format->importpreprocess() && $format->importprocess() && $format->importpostprocess();
    $out = ob_get_clean();
    if (!$ok || empty($format->questionids)) {
        throw new moodle_exception('Question import failed for "' . $quiz->name . '": ' . trim(strip_tags($out)));
    }

    // Swap the quiz's questions; keep its total grade.
    $maxgrade = (float) $quiz->grade;
    $quizobj = \quiz::create($quiz->id);
    $structure = $quizobj->get_structure();
    foreach (array_reverse($structure->get_slots()) as $slot) {
        $structure->remove_slot($slot->slot);
    }
    $quiz = $DB->get_record('quiz', ['id' => $cm->instance]);
    foreach ($format->questionids as $qid) {
        quiz_add_quiz_question($qid, $quiz, 0, 1);
    }
    quiz_update_sumgrades($quiz);
    $quiz = $DB->get_record('quiz', ['id' => $cm->instance]);
    if ($maxgrade > 0 && abs($maxgrade - (float) $quiz->grade) > 0.0001) {
        quiz_set_grade($maxgrade, $quiz);
    }
    return count($format->questionids);
}

/* ------------------------------------------------------------------ rules */

/**
 * Every quiz: pass mark at least 70% of its total, unlimited attempts, completion needs a passing grade.
 * Certificate: only available after every quiz is complete and passed. Returns a list of what was fixed.
 */
function block_ctccu_enforce_rules($courseid) {
    global $CFG, $DB;
    require_once($CFG->libdir . '/gradelib.php');
    $fixed = [];
    $quizcms = block_ctccu_cms($courseid, 'quiz');
    foreach ($quizcms as $cm) {
        $quiz = $DB->get_record('quiz', ['id' => $cm->instance]);
        $gi = grade_item::fetch(['itemtype' => 'mod', 'itemmodule' => 'quiz', 'iteminstance' => $quiz->id, 'courseid' => $courseid]);
        if ($gi) {
            $need = round(0.7 * (float) $gi->grademax, 2);
            if ((float) $gi->gradepass + 0.0001 < $need) {
                $gi->gradepass = $need;
                $gi->update('ctccu');
                $fixed[] = $quiz->name . ': pass mark set to 70% (' . $need . ' of ' . (float) $gi->grademax . ')';
            }
        }
        if ((int) $quiz->attempts !== 0) {
            $DB->set_field('quiz', 'attempts', 0, ['id' => $quiz->id]);
            $fixed[] = $quiz->name . ': attempts set to unlimited';
        }
        if (empty($quiz->completionpass)) {
            $DB->set_field('quiz', 'completionpass', 1, ['id' => $quiz->id]);
            $fixed[] = $quiz->name . ': completion now requires a passing grade';
        }
        if ((int) $cm->completion !== COMPLETION_TRACKING_AUTOMATIC) {
            $DB->set_field('course_modules', 'completion', COMPLETION_TRACKING_AUTOMATIC, ['id' => $cm->id]);
            $DB->set_field('course_modules', 'completiongradeitemnumber', 0, ['id' => $cm->id]);
            $fixed[] = $quiz->name . ': automatic completion turned on';
        }
    }
    // Certificate (or its section) must require every quiz to be passed.
    foreach (block_ctccu_cms($courseid, 'customcert') as $cert) {
        $need = array_map(function ($q) { return $q->id; }, $quizcms);
        $have = array_merge(block_ctccu_pass_conditions($cert->availability), block_ctccu_pass_conditions($cert->get_section_info()->availability));
        $missing = array_diff($need, $have);
        if ($missing) {
            $tree = $cert->availability ? json_decode($cert->availability, true) : null;
            if (!$tree || ($tree['op'] ?? '&') !== '&') {
                $tree = ['op' => '&', 'c' => $tree ? [$tree] : [], 'showc' => $tree ? [false] : []];
            }
            foreach ($missing as $id) {
                $tree['c'][] = ['type' => 'completion', 'cm' => (int) $id, 'e' => COMPLETION_COMPLETE_PASS];
                $tree['showc'][] = false;
            }
            unset($tree['show']);
            $DB->set_field('course_modules', 'availability', json_encode($tree), ['id' => $cert->id]);
            $fixed[] = 'Certificate now requires passing: ' . implode(', ', array_map(function ($id) use ($quizcms) {
                foreach ($quizcms as $q) { if ($q->id == $id) { return $q->name; } } return $id; }, $missing));
        }
    }
    if ($fixed) {
        rebuild_course_cache($courseid, true);
        block_ctccu_log($courseid, 'Rules: ' . implode('; ', $fixed));
    }
    return $fixed;
}
/** cm ids required to be "complete and passed" in an availability JSON (any depth of AND groups). */
function block_ctccu_pass_conditions($json) {
    $out = [];
    $walk = function ($node) use (&$walk, &$out) {
        if (!is_array($node)) {
            return;
        }
        if (($node['type'] ?? '') === 'completion' && (int) ($node['e'] ?? 0) === COMPLETION_COMPLETE_PASS) {
            $out[] = (int) $node['cm'];
        }
        if (($node['op'] ?? '&') === '&' || ($node['op'] ?? '') === '!|') {
            foreach ($node['c'] ?? [] as $c) {
                $walk($c);
            }
        }
    };
    $walk($json ? json_decode($json, true) : null);
    return $out;
}

/** Rule check for display: [['ok' => bool, 'text' => …], …]. */
function block_ctccu_check_rules($courseid) {
    global $CFG, $DB;
    require_once($CFG->libdir . '/gradelib.php');
    $out = [];
    $quizcms = block_ctccu_cms($courseid, 'quiz');
    foreach ($quizcms as $cm) {
        $quiz = $DB->get_record('quiz', ['id' => $cm->instance]);
        $gi = grade_item::fetch(['itemtype' => 'mod', 'itemmodule' => 'quiz', 'iteminstance' => $quiz->id, 'courseid' => $courseid]);
        $slots = $DB->count_records('quiz_slots', ['quizid' => $quiz->id]);
        $pct = $gi && $gi->grademax > 0 ? round(100 * $gi->gradepass / $gi->grademax, 1) : 0;
        $out[] = ['ok' => $pct >= 70 && (int) $quiz->attempts === 0, 'text' => $quiz->name . ': ' . $slots . ' questions, pass ' . $pct . '%, attempts ' . ((int) $quiz->attempts === 0 ? 'unlimited' : $quiz->attempts)];
    }
    foreach (block_ctccu_cms($courseid, 'customcert') as $cert) {
        $have = array_merge(block_ctccu_pass_conditions($cert->availability), block_ctccu_pass_conditions($cert->get_section_info()->availability));
        $missing = array_diff(array_map(function ($q) { return $q->id; }, $quizcms), $have);
        $out[] = ['ok' => !$missing, 'text' => $cert->name . ': ' . ($missing ? count($missing) . ' quiz(zes) not required before the certificate' : 'only after every quiz is passed')];
    }
    return $out;
}

/* ------------------------------------------------------------------ publish */

function block_ctccu_publish($courseid) {
    global $DB;
    $course = $DB->get_record('course', ['id' => $courseid], '*', MUST_EXIST);
    $type = preg_match('/^ctccu-(20|60)-/', $course->idnumber, $m) ? $m[1] : null;
    if (!$type) {
        throw new moodle_exception('Not a course made by this tool.');
    }
    $src = (int) get_config('block_ctc_courseupdate', 'source_' . $courseid);
    block_ctccu_enforce_rules($courseid);
    $DB->set_field('course', 'visible', 1, ['id' => $courseid]);
    $DB->set_field('course', 'visibleold', 1, ['id' => $courseid]);
    $notes = ['Course is visible to students.'];
    // CTEC reporting: same CTEC course number as last year's course.
    $map = (string) get_config('local_ctecreport', 'coursemap');
    if ($map !== '' && $src && preg_match('/^\s*' . $src . '\s*=\s*(\S+)\s*$/m', $map, $mm) && !preg_match('/^\s*' . $courseid . '\s*=/m', $map)) {
        set_config('coursemap', rtrim($map) . "\n" . $courseid . '=' . $mm[1], 'local_ctecreport');
        $notes[] = 'Added to CTEC reporting with course number ' . $mm[1] . '.';
    }
    // Store: new orders of this product enroll here.
    $res = block_ctccu_store_mapping(BLOCK_CTCCU_TYPES[$type]['product'], $courseid);
    $notes[] = $res;
    rebuild_course_cache($courseid, true);
    block_ctccu_log($courseid, 'Published. ' . implode(' ', $notes));
    block_ctccu_step_done($courseid, 'publish', implode(' ', $notes));
    return $notes;
}

/** Ask the store (WordPress, same shared token as the CTC Disputes block) to enroll a product's new orders in $courseid. */
function block_ctccu_store_mapping($productid, $courseid) {
    global $CFG;
    require_once($CFG->libdir . '/filelib.php');
    $url = rtrim((string) get_config('block_ctc_disputes', 'wpurl'), '/');
    $token = (string) get_config('block_ctc_disputes', 'token');
    if ($url === '' || $token === '') {
        return 'Store not connected: update the product\'s course in WordPress (Enroll Course > Courses Mapping) by hand.';
    }
    $curl = new curl(['ignoresecurity' => true]);
    $body = $curl->post($url . '/wp-json/ctc/v1/course-mapping', ['token' => $token, 'product' => $productid, 'course' => $courseid], ['CURLOPT_TIMEOUT' => 60]);
    $j = json_decode($body, true);
    return !empty($j['ok']) ? 'Store product ' . $productid . ' now enrolls new orders in this course.' : 'Store mapping NOT updated (' . s($j['message'] ?? 'no response') . ') — update it in WordPress by hand.';
}

/* ------------------------------------------------------------------ 1b. link activities (60 Hour PDFs, errata) */
function block_ctccu_set_links($courseid, array $urls, array $names) {
    global $DB;
    $n = 0;
    foreach (block_ctccu_cms($courseid, 'url') as $cm) {
        $u = $DB->get_record('url', ['id' => $cm->instance]);
        $new = trim($urls[$cm->id] ?? '');
        $name = trim($names[$cm->id] ?? '');
        $upd = ['id' => $u->id];
        if ($new !== '' && $new !== $u->externalurl) {
            if (!preg_match('~^https?://~i', $new)) {
                throw new moodle_exception('"' . s($new) . '" is not a web address (it must start with https://).');
            }
            $upd['externalurl'] = $new;
        }
        if ($name !== '' && $name !== $u->name) {
            $upd['name'] = $name;
        }
        if (count($upd) > 1) {
            $upd['timemodified'] = time();
            $DB->update_record('url', (object) $upd);
            $n++;
        }
    }
    rebuild_course_cache($courseid, true);
    block_ctccu_log($courseid, "Links updated: $n.");
    if ($n) {
        block_ctccu_step_done($courseid, 'pdf', "$n links updated");
    }
    return $n;
}

/* ================================================================== course textbook (AI) */
// Slide text (read in the browser with pdf.js) -> one Claude call per chapter (adhoc tasks, run by cron) -> TCPDF book
// with a title page and a clickable table of contents. Saved in the block's file area; can replace the course PDF.

function block_ctccu_tb_dir($courseid, $job) {
    return make_temp_directory('block_ctc_courseupdate/tb_' . (int) $courseid . '_' . clean_param($job, PARAM_ALPHANUM));
}
function block_ctccu_tb_job($courseid, $job) {
    $f = block_ctccu_tb_dir($courseid, $job) . '/job.json';
    return is_readable($f) ? json_decode(file_get_contents($f), true) : null;
}
function block_ctccu_tb_save($courseid, $job, $data) {
    file_put_contents(block_ctccu_tb_dir($courseid, $job) . '/job.json', json_encode($data));
}
/** "05 WSlides - UtPoIT - Dependents - General - TY2025.pdf" -> "Dependents". */
function block_ctccu_tb_title($filename) {
    $parts = array_map('trim', explode(' - ', preg_replace('/\.pdf$/i', '', preg_replace('/^\s*\d+\s*/', '', $filename))));
    $parts = array_filter($parts, function ($p) {
        return $p !== '' && !preg_match('/^(w ?slides|utpoit|general|updates|tlu|casa\d+|ctec\d+|ctec60|ctec20|ethics|ca tax)$/i', $p) && !preg_match('/^ty\s?20\d\d/i', $p);
    });
    return implode(' - ', $parts) ?: $filename;
}

/** Start: $chapters = [['title' => …, 'text' => slide text], …]. Queues one task per chapter. */
function block_ctccu_tb_start($courseid, $job, array $titles) {
    $course = get_course($courseid);
    $year = (int) preg_replace('/^ctccu-\d+-/', '', (string) $course->idnumber) ?: (int) date('Y');
    $data = ['course' => $course->fullname, 'year' => $year, 'created' => time(), 'chapters' => []];
    $chapters = $titles;
    foreach (array_values($titles) as $i => $title) {
        $f = block_ctccu_tb_dir($courseid, $job) . "/in_$i.txt";
        if (!is_readable($f) || filesize($f) < 50) {
            throw new moodle_exception('No slide text was read for "' . $title . '". Try again, or check that the PDF is not a scanned image.');
        }
        $data['chapters'][] = ['title' => $title, 'chars' => filesize($f)];
        $t = new \block_ctc_courseupdate\task\textbook_chapter();
        $t->set_custom_data(['courseid' => $courseid, 'job' => $job, 'index' => $i]);
        \core\task\manager::queue_adhoc_task($t);
    }
    block_ctccu_tb_save($courseid, $job, $data);
    set_config('tbjob_' . $courseid, $job, 'block_ctc_courseupdate');
    block_ctccu_log($courseid, 'Textbook: ' . count($chapters) . ' chapters sent to be written.');
}

/** Status of each chapter: queued | done | error (with message). */
function block_ctccu_tb_status($courseid, $job) {
    $dir = block_ctccu_tb_dir($courseid, $job);
    $job = block_ctccu_tb_job($courseid, $job);
    $out = [];
    foreach ($job['chapters'] ?? [] as $i => $c) {
        $st = is_readable("$dir/out_$i.md") ? 'done' : (is_readable("$dir/err_$i.txt") ? 'error' : 'queued');
        $out[] = ['title' => $c['title'], 'status' => $st, 'error' => $st === 'error' ? file_get_contents("$dir/err_$i.txt") : ''];
    }
    return $out;
}

function block_ctccu_claude($system, $user, $maxtokens = 16000) {
    global $CFG;
    require_once($CFG->libdir . '/filelib.php');
    $key = (string) get_config('block_ctc_courseupdate', 'anthropickey');
    if ($key === '') {
        throw new moodle_exception('No Anthropic API key (Site administration > Plugins > Blocks > CTC Course Update).');
    }
    $body = json_encode(['model' => get_config('block_ctc_courseupdate', 'model') ?: 'claude-sonnet-5-5', 'max_tokens' => $maxtokens,
        'system' => $system, 'messages' => [['role' => 'user', 'content' => $user]]]);
    for ($try = 1; $try <= 4; $try++) {
        $curl = new curl(['ignoresecurity' => true]);
        $curl->setHeader(['x-api-key: ' . $key, 'anthropic-version: 2023-06-01', 'content-type: application/json']);
        $res = $curl->post('https://api.anthropic.com/v1/messages', $body, ['CURLOPT_TIMEOUT' => 900, 'CURLOPT_CONNECTTIMEOUT' => 30]);
        $code = (int) ($curl->get_info()['http_code'] ?? 0);
        $j = json_decode($res, true);
        if ($code === 200 && !empty($j['content'])) {
            return implode('', array_map(function ($b) { return $b['type'] === 'text' ? $b['text'] : ''; }, $j['content']));
        }
        if (!in_array($code, [0, 429, 500, 502, 503, 504, 529], true)) {
            throw new moodle_exception('Claude API error ' . $code . ': ' . ($j['error']['message'] ?? substr((string) $res, 0, 300)));
        }
        sleep(20 * $try);
    }
    throw new moodle_exception('Claude API did not answer after 4 tries (last HTTP ' . $code . ').');
}

function block_ctccu_textbook_chapter($courseid, $job, $i) {
    $dir = block_ctccu_tb_dir($courseid, $job);
    $data = block_ctccu_tb_job($courseid, $job);
    if (!$data || is_readable("$dir/out_$i.md")) {
        return;
    }
    @unlink("$dir/err_$i.txt");
    $ch = $data['chapters'][$i];
    $system = "You turn a tax course's webinar slides into one chapter of the printed course textbook for California Tax Courses (CTEC-approved education). "
        . "Use only what the slides say: keep every figure, dollar amount, percentage, threshold, date, form name and line reference exactly; never add facts, examples or numbers that are not in the slides. "
        . "Output Markdown only, in this exact subset: first line '# ' + the chapter title; '## ' section headings; '### ' sub-headings; paragraphs; '- ' bullet lists; '1. ' numbered lists; pipe tables (header row, then '|---|' separator); **bold**. No other syntax, no preface or closing remarks.\n"
        . "Style notes: " . (string) get_config('block_ctc_courseupdate', 'style');
    $user = 'Course: ' . $data['course'] . "\nChapter " . ($i + 1) . ' of ' . count($data['chapters']) . ': ' . $ch['title'] . "\n\nSlides (one block per slide):\n\n" . file_get_contents("$dir/in_$i.txt");
    try {
        $md = block_ctccu_claude($system, $user);
        file_put_contents("$dir/out_$i.md", $md);
    } catch (Throwable $e) {
        file_put_contents("$dir/err_$i.txt", $e->getMessage());
        return;
    }
    // Last chapter written: build the book (once).
    $st = block_ctccu_tb_status($courseid, $job);
    if (!array_filter($st, function ($s) { return $s['status'] !== 'done'; }) && @fopen("$dir/assemble.queued", 'x')) {
        $t = new \block_ctc_courseupdate\task\textbook_assemble();
        $t->set_custom_data(['courseid' => $courseid, 'job' => $job]);
        \core\task\manager::queue_adhoc_task($t);
    }
}
/** Re-queue chapters that failed. */
function block_ctccu_tb_retry($courseid, $job) {
    $dir = block_ctccu_tb_dir($courseid, $job);
    $n = 0;
    foreach (block_ctccu_tb_status($courseid, $job) as $i => $s) {
        if ($s['status'] === 'error') {
            @unlink("$dir/err_$i.txt");
            $t = new \block_ctc_courseupdate\task\textbook_chapter();
            $t->set_custom_data(['courseid' => $courseid, 'job' => $job, 'index' => $i]);
            \core\task\manager::queue_adhoc_task($t);
            $n++;
        }
    }
    @unlink("$dir/assemble.queued");
    return $n;
}

/** Markdown subset -> HTML blocks: [['h1'|'h2'|'h3'|'html', text], …]. */
function block_ctccu_md_blocks($md) {
    $inline = function ($t) { return preg_replace(['/\*\*(.+?)\*\*/', '/(?<!\*)\*(?!\s)(.+?)\*(?!\*)/'], ['<b>$1</b>', '<i>$1</i>'], s($t)); };
    $out = [];
    $html = '';
    $list = '';
    $table = [];
    $flushlist = function () use (&$list, &$html) { if ($list !== '') { $html .= '</' . $list . '>'; $list = ''; } };
    $flushtable = function () use (&$table, &$html, $inline) {
        if (!$table) { return; }
        $h = '<table border="1" cellpadding="4" cellspacing="0" style="border-color:#c9ccd1;font-size:9pt">';
        foreach ($table as $r => $cells) {
            $h .= '<tr' . ($r === 0 ? ' style="background-color:#f2efe6;font-weight:bold"' : '') . '>';
            foreach ($cells as $c) { $h .= '<td>' . $inline($c) . '</td>'; }
            $h .= '</tr>';
        }
        $html .= $h . '</table><br>';
        $table = [];
    };
    $flush = function ($type = null, $text = null) use (&$out, &$html, $flushlist, $flushtable) {
        $flushlist(); $flushtable();
        if ($html !== '') { $out[] = ['html', $html]; $html = ''; }
        if ($type) { $out[] = [$type, $text]; }
    };
    foreach (preg_split('/\r?\n/', (string) $md) as $line) {
        $t = rtrim($line);
        if (preg_match('/^(#{1,3})\s+(.*)$/', $t, $m)) {
            $flush('h' . strlen($m[1]), trim($m[2]));
        } else if (preg_match('/^\s*\|(.+)\|\s*$/', $t, $m)) {
            $flushlist();
            $cells = array_map('trim', explode('|', $m[1]));
            if (!preg_match('/^[\s|:-]+$/', $m[1])) { $table[] = $cells; }
        } else if (preg_match('/^\s*[-*]\s+(.*)$/', $t, $m) || preg_match('/^\s*\d+[.)]\s+(.*)$/', $t, $m2)) {
            $flushtable();
            $type = isset($m2[1]) && !isset($m[1]) ? 'ol' : 'ul';
            if ($list !== $type) { $flushlist(); $html .= '<' . $type . '>'; $list = $type; }
            $html .= '<li>' . $inline($m[1] ?? $m2[1]) . '</li>';
            unset($m2);
        } else if (trim($t) === '') {
            $flushlist(); $flushtable();
        } else {
            $flushlist(); $flushtable();
            $html .= '<p>' . $inline(trim($t)) . '</p>';
        }
        $m = [];
    }
    $flush();
    return $out;
}

function block_ctccu_textbook_assemble($courseid, $job) {
    global $CFG;
    require_once($CFG->libdir . '/pdflib.php');
    core_php_time_limit::raise(1800);
    raise_memory_limit(MEMORY_HUGE);
    $dir = block_ctccu_tb_dir($courseid, $job);
    $data = block_ctccu_tb_job($courseid, $job);
    $course = get_course($courseid);
    $pdf = new pdf('P', 'pt', 'LETTER');
    $pdf->SetTitle($data['course'] . ' — Course Textbook');
    $pdf->SetAuthor('California Tax Courses');
    $pdf->setPrintHeader(false);
    $pdf->setPrintFooter(true);
    $pdf->SetMargins(60, 60, 60);
    $pdf->SetAutoPageBreak(true, 60);
    $pdf->setFooterFont(['helvetica', '', 8]);
    // Title page.
    $pdf->AddPage();
    $pdf->SetFont('helvetica', 'B', 26);
    $pdf->SetY(220);
    $pdf->MultiCell(0, 0, $data['course'], 0, 'C');
    $pdf->Ln(16);
    $pdf->SetFont('helvetica', '', 16);
    $pdf->MultiCell(0, 0, 'Course Textbook · ' . $data['year'] . ' Edition', 0, 'C');
    $pdf->Ln(40);
    $pdf->SetFont('helvetica', '', 11);
    $pdf->MultiCell(0, 0, "California Tax Courses\ncataxcourses.com · help@cataxcourses.com · (888) 229-1994", 0, 'C');
    // Chapters.
    $css = '<style>h2{font-size:15pt;color:#1C2333}h3{font-size:12pt;color:#1C2333}p{font-size:10.5pt;line-height:1.45}li{font-size:10.5pt}</style>';
    foreach ($data['chapters'] as $i => $ch) {
        $blocks = block_ctccu_md_blocks(file_get_contents("$dir/out_$i.md"));
        $title = $ch['title'];
        if ($blocks && $blocks[0][0] === 'h1') {
            $title = array_shift($blocks)[1];
        }
        $pdf->AddPage();
        $pdf->Bookmark(($i + 1) . '. ' . $title, 0, 0);
        $pdf->SetFont('helvetica', 'B', 20);
        $pdf->SetTextColor(184, 144, 31);
        $pdf->MultiCell(0, 0, 'Chapter ' . ($i + 1), 0, 'L');
        $pdf->SetTextColor(28, 35, 51);
        $pdf->MultiCell(0, 0, $title, 0, 'L');
        $pdf->Ln(10);
        $pdf->SetFont('helvetica', '', 10.5);
        foreach ($blocks as $b) {
            if ($b[0] === 'h2' || $b[0] === 'h1') {
                $pdf->Bookmark($b[1], 1, -1);
                $pdf->writeHTML($css . '<h2>' . s($b[1]) . '</h2>', true, false, true, false, '');
            } else if ($b[0] === 'h3') {
                $pdf->writeHTML($css . '<h3>' . s($b[1]) . '</h3>', true, false, true, false, '');
            } else {
                $pdf->writeHTML($css . $b[1], true, false, true, false, '');
            }
        }
    }
    // Table of contents (clickable) on page 2.
    $pdf->addTOCPage();
    $pdf->SetFont('helvetica', 'B', 18);
    $pdf->MultiCell(0, 0, 'Contents', 0, 'L');
    $pdf->Ln(10);
    $pdf->SetFont('helvetica', '', 10.5);
    $pdf->addTOC(2, 'helvetica', '.', 'Contents', 'B', [28, 35, 51]);
    $pdf->endTOCPage();
    $bytes = $pdf->Output('', 'S');

    $fs = get_file_storage();
    $ctx = context_system::instance();
    $name = clean_filename(preg_replace('/\s*\|\s*/', ' ', $data['course']) . ' - Textbook.pdf');
    $fs->delete_area_files($ctx->id, 'block_ctc_courseupdate', 'textbook', $courseid);
    $fs->create_file_from_string(['contextid' => $ctx->id, 'component' => 'block_ctc_courseupdate', 'filearea' => 'textbook', 'itemid' => $courseid,
        'filepath' => '/', 'filename' => $name], $bytes);
    block_ctccu_log($courseid, 'Textbook built: ' . $name . ' (' . $pdf->getNumPages() . ' pages).');
    block_ctccu_step_done($courseid, 'textbook', $pdf->getNumPages() . ' pages');
    block_ctccu_tb_use($courseid);
}

/** Make the built textbook the PDF students download: replace the PDF file, or point the course's PDF link at it. */
function block_ctccu_tb_use($courseid) {
    global $DB;
    $file = block_ctccu_tb_file($courseid);
    if (!$file) {
        return '';
    }
    if (block_ctccu_course_pdf_cm($courseid)) {
        $tmp = make_request_directory() . '/book.pdf';
        $file->copy_content_to($tmp);
        block_ctccu_replace_pdf($courseid, $tmp, $file->get_filename());
        return 'The textbook is now the course PDF students download.';
    }
    foreach (block_ctccu_cms($courseid, 'url') as $cm) {
        if (preg_match('/pdf/i', $cm->name)) {
            $url = moodle_url::make_pluginfile_url($file->get_contextid(), 'block_ctc_courseupdate', 'textbook', $courseid, '/', $file->get_filename())->out(false);
            $DB->set_field('url', 'externalurl', $url, ['id' => $cm->instance]);
            rebuild_course_cache($courseid, true);
            block_ctccu_log($courseid, '"' . $cm->name . '" now opens the new textbook.');
            block_ctccu_step_done($courseid, 'pdf', 'textbook linked');
            return '"' . $cm->name . '" now opens the new textbook.';
        }
    }
    return 'No PDF download or PDF link found in the course: add the textbook to the course by hand.';
}
function block_ctccu_tb_file($courseid) {
    $files = get_file_storage()->get_area_files(context_system::instance()->id, 'block_ctc_courseupdate', 'textbook', $courseid, 'id DESC', false);
    return $files ? reset($files) : null;
}

function block_ctc_courseupdate_pluginfile($course, $birecord, $context, $filearea, $args, $forcedownload, array $options = []) {
    require_login();
    if ($filearea !== 'textbook') {
        return false;
    }
    $itemid = (int) array_shift($args);
    // Admins, and students enrolled in that course (the 60 Hour "PDF Files" link points here).
    $cctx = context_course::instance($itemid, IGNORE_MISSING);
    if (!has_capability('block/ctc_courseupdate:manage', context_system::instance()) && (!$cctx || !is_enrolled($cctx, null, '', true))) {
        return false;
    }
    $file = get_file_storage()->get_file(context_system::instance()->id, 'block_ctc_courseupdate', 'textbook', $itemid, '/', array_pop($args));
    if (!$file) {
        return false;
    }
    send_stored_file($file, 0, 0, $forcedownload, $options);
}

/** Download a share link to a file (Dropbox, Google Drive file, or any direct link). */
function block_ctccu_fetch_link($url, $dest) {
    global $CFG;
    require_once($CFG->libdir . '/filelib.php');
    $u = trim($url);
    if (preg_match('~dropbox\.com/~', $u)) {
        $u = preg_replace('/([?&])dl=0/', '$1dl=1', $u);
        if (strpos($u, 'dl=1') === false) {
            $u .= (strpos($u, '?') === false ? '?' : '&') . 'dl=1';
        }
    } else if (preg_match('~drive\.google\.com/drive/folders/~', $u)) {
        throw new moodle_exception('Google Drive folder links cannot be downloaded directly. In Drive, right-click the folder > Download (it makes a .zip), then upload that zip here — or share the zip file\'s link.');
    } else if (preg_match('~drive\.google\.com/(?:file/d/|open\?id=|uc\?.*id=)([A-Za-z0-9_-]{10,})~', $u, $m)) {
        $u = 'https://drive.usercontent.google.com/download?id=' . $m[1] . '&export=download&confirm=t';
    }
    $curl = new curl(['ignoresecurity' => true]);
    $ok = $curl->download_one($u, null, ['filepath' => $dest, 'timeout' => 600, 'followlocation' => true]);
    if ($ok !== true || !is_readable($dest) || filesize($dest) < 100) {
        throw new moodle_exception('Could not download that link. Make sure anyone with the link can view it.');
    }
    $head = file_get_contents($dest, false, null, 0, 5);
    if (strpos($head, '%PDF') !== 0 && strpos($head, "PK") !== 0) {
        throw new moodle_exception('That link did not give a PDF or .zip file (it may need to be shared as "anyone with the link").');
    }
    return strpos($head, '%PDF') === 0 ? 'pdf' : 'zip';
}
