<?php
// Builds template data for the GLEC course page and the video playlist from Moodle's own
// course structure and completion records. Read-only: it never changes course content or completion.
namespace theme_glec\output;

defined('MOODLE_INTERNAL') || die();

class course_data {

    /** Activities that count as "lessons" in the playlist. */
    const LESSON_MODS = ['videofile', 'page', 'url', 'resource', 'quiz', 'scorm', 'h5pactivity', 'lesson', 'book'];
    /** Activities treated as the certificate. */
    const CERT_MODS = ['simplecertificate', 'certificate', 'customcert'];

    public static function build(\stdClass $course, ?int $currentcmid = null): array {
        global $USER, $DB, $CFG;
        require_once($CFG->libdir . '/completionlib.php');

        $modinfo = get_fast_modinfo($course);
        $completion = new \completion_info($course);
        $sections = [];
        $flat = [];
        $index = 0;
        $tracked = 0;
        $done = 0;
        $cert = null;

        foreach ($modinfo->get_section_info_all() as $section) {
            if (!$section->uservisible && !$section->visible) {
                continue;
            }
            $items = [];
            $notes = [];
            foreach ($modinfo->sections[$section->section] ?? [] as $cmid) {
                $cm = $modinfo->cms[$cmid];
                if (!$cm->is_visible_on_course_page()) {
                    continue;
                }
                if ($cm->modname === 'label') {
                    $notes[] = ['html' => $cm->get_formatted_content(['overflowdiv' => false, 'noclean' => false])];
                    continue;
                }
                $istracked = $completion->is_enabled($cm) != COMPLETION_TRACKING_NONE;
                $iscomplete = false;
                if ($istracked) {
                    $data = $completion->get_data($cm, false, $USER->id);
                    $iscomplete = in_array($data->completionstate, [COMPLETION_COMPLETE, COMPLETION_COMPLETE_PASS]);
                }
                $iscert = in_array($cm->modname, self::CERT_MODS);
                $islesson = !$iscert && in_array($cm->modname, self::LESSON_MODS);
                if ($islesson) {
                    $index++;
                }
                if ($istracked && !$iscert) {
                    $tracked++;
                    if ($iscomplete) {
                        $done++;
                    }
                }
                $item = [
                    'cmid' => (int) $cm->id,
                    'name' => $cm->get_formatted_name(),
                    'url' => $cm->url ? $cm->url->out(false) : '',
                    'modname' => $cm->modname,
                    'islesson' => $islesson,
                    'iscert' => $iscert,
                    'isforum' => $cm->modname === 'forum',
                    'number' => $islesson ? $index : null,
                    'tracked' => $istracked,
                    'complete' => $iscomplete,
                    'notstarted' => $istracked && !$iscomplete && !$iscert,
                    'ready' => $iscert && $cm->uservisible && !$iscomplete,
                    'locked' => !$cm->uservisible,
                    'lockinfo' => (!$cm->uservisible && $cm->availableinfo) ? strip_tags(\core_availability\info::format_info($cm->availableinfo, $course)) : '',
                    'current' => $currentcmid && (int) $cm->id === (int) $currentcmid,
                ];
                if ($iscert) {
                    $cert = $item;
                }
                $items[] = $item;
                if ($cm->url && $cm->modname !== 'forum') {
                    $flat[] = $item;
                }
            }
            if (!$items && !$notes && !trim(strip_tags((string) $section->summary))) {
                continue;
            }
            $all = array_values(array_filter($items, function($i) { return $i['islesson']; }));
            $lessons = array_values(array_filter($all, function($i) { return $i['tracked']; }));
            $ldone = count(array_filter($lessons, function($i) { return $i['complete']; }));
            $sections[] = [
                'id' => (int) $section->id,
                'number' => (int) $section->section,
                'name' => trim(strip_tags(get_section_name($course, $section))) !== '' ? get_section_name($course, $section) : 'Section ' . $section->section,
                'summary' => format_text(file_rewrite_pluginfile_urls($section->summary, 'pluginfile.php', \context_course::instance($course->id)->id, 'course', 'section', $section->id), $section->summaryformat, ['noclean' => false, 'context' => \context_course::instance($course->id)]),
                'hassummary' => trim(strip_tags((string) $section->summary)) !== '',
                'items' => $items,
                'notes' => $notes,
                'lessoncount' => count($lessons),
                'untrackedcount' => count($all) - count($lessons),
                'lessonword' => count($lessons) === 1 ? 'lesson' : 'lessons',
                'hasplaylistitems' => (bool) array_filter($items, function($i) { return $i['modname'] !== 'forum'; }),
                'lessondone' => $ldone,
                'allcomplete' => $lessons && $ldone === count($lessons),
                'hascurrent' => (bool) array_filter($items, function($i) { return $i['current']; }),
            ];
        }

        // Next lesson to continue with: first tracked, incomplete, available lesson.
        $next = null;
        foreach ($sections as $s) {
            foreach ($s['items'] as $i) {
                if ($i['islesson'] && $i['tracked'] && !$i['complete'] && !$i['locked'] && $i['url']) {
                    $next = $i;
                    break 2;
                }
            }
        }
        // Open section: the one holding the next lesson (or the current one in the player, or the last when complete).
        $opensectionid = null;
        foreach ($sections as $s) {
            if ($currentcmid && $s['hascurrent']) { $opensectionid = $s['id']; }
        }
        if (!$opensectionid && $next) {
            foreach ($sections as $s) {
                foreach ($s['items'] as $i) { if ($i['cmid'] === $next['cmid']) { $opensectionid = $s['id']; } }
            }
        }
        if (!$opensectionid && $sections) { $opensectionid = end($sections)['id']; }
        foreach ($sections as &$s) { $s['open'] = $s['id'] === $opensectionid; }
        unset($s);

        $percent = $tracked ? (int) round($done / $tracked * 100) : 0;
        $certunlocked = $cert && !$cert['locked'];
        $cta = null;
        if ($tracked && $done >= $tracked && $cert && $certunlocked) {
            $cta = ['label' => get_string('printcertificate', 'theme_glec'), 'url' => $cert['url']];
        } else if ($next) {
            $cta = ['label' => $done ? get_string('continuelesson', 'theme_glec', $next['name']) : get_string('startclass', 'theme_glec'), 'url' => $next['url']];
        }

        // Access end date from the user's enrolment(s).
        $timeend = $DB->get_field_sql('SELECT MAX(ue.timeend) FROM {user_enrolments} ue JOIN {enrol} e ON e.id = ue.enrolid
                                       WHERE e.courseid = ? AND ue.userid = ?', [$course->id, $USER->id]);

        $code = trim(preg_split('/[\s(]/', trim($course->shortname), 2)[0]);
        $isceu = stripos($course->shortname . ' ' . $course->fullname, 'CEU') !== false;

        // Previous / next in the playlist (all lesson + certificate items with a URL, in course order).
        $playlist = array_values(array_filter($flat, function($i) { return ($i['islesson'] || $i['iscert']) && $i['url']; }));
        $prev = $nextitem = $currentitem = null;
        foreach ($playlist as $k => $i) {
            if ($i['current']) {
                $currentitem = $i;
                $prev = $playlist[$k - 1] ?? null;
                $nextitem = $playlist[$k + 1] ?? null;
            }
        }

        return [
            'courseid' => (int) $course->id,
            'courseurl' => (new \moodle_url('/course/view.php', ['id' => $course->id]))->out(false),
            'fullname' => format_string($course->fullname, true, ['context' => \context_course::instance($course->id)]),
            'code' => $code,
            'isceu' => $isceu,
            'typelabel' => $isceu ? 'Board-approved CEU class' : 'License class',
            'unit' => 'lessons',
            'sections' => $sections,
            'tracked' => $tracked,
            'done' => $done,
            'remaining' => max(0, $tracked - $done),
            'percent' => $percent,
            'iscomplete' => $tracked && $done >= $tracked,
            'cta' => $cta,
            'hascta' => (bool) $cta,
            'next' => $next,
            'cert' => $cert,
            'hascert' => (bool) $cert,
            'certunlocked' => $certunlocked,
            'accessend' => $timeend ? userdate($timeend, '%b %e, %Y') : '',
            'legalname' => fullname($USER),
            'editprofileurl' => (new \moodle_url('/user/edit.php'))->out(false),
            'mycoursesurl' => (new \moodle_url('/my/'))->out(false),
            'prev' => $prev,
            'nextitem' => $nextitem,
            'currentitem' => $currentitem,
            'position' => $currentitem && $currentitem['number'] ? $currentitem['number'] : null,
            'lessontotal' => $index,
        ];
    }
}
