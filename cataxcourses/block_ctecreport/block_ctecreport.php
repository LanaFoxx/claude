<?php
// Shows site admins every CTEC completion report that was rejected or has not gone through yet.

defined('MOODLE_INTERNAL') || die();

class block_ctecreport extends block_base {

    const LIMIT = 25;

    public function init() {
        $this->title = get_string('pluginname', 'block_ctecreport');
    }

    public function applicable_formats() {
        return ['my' => true, 'site-index' => true, 'admin' => true];
    }

    public function instance_allow_multiple() {
        return false;
    }

    /** Plain-English reason a report needs attention. */
    public static function explain($rec) {
        $response = (string)$rec->response;
        $id = $rec->ctecidmanual ?: $rec->ctecid;
        if (stripos($response, 'No valid CTEC ID') !== false) {
            return 'No CTEC ID entered, or it is not in the A123456 format';
        }
        if (stripos($response, 'No CTEC record found') !== false) {
            return "CTEC has no preparer with ID $id (probably mistyped)";
        }
        if (stripos($response, 'Invalid CTECID') !== false) {
            return "CTEC says ID $id is not valid";
        }
        if (stripos($response, 'Invalid Username or Password') !== false || stripos($response, 'not authorized') !== false
                || stripos($response, 'Authorization') !== false) {
            return 'CTEC rejected our login: check the username and password in the plugin settings';
        }
        if (stripos($response, 'Completion Date') !== false || stripos($response, 'QE ') !== false) {
            return 'CTEC rejected the dates or scores: ' . $response;
        }
        if ($rec->status === 'pending' || $rec->status === 'retry') {
            return 'Not sent yet (CTEC could not be reached); retrying automatically every 15 minutes';
        }
        return $response !== '' ? $response : 'Unknown problem';
    }

    /** Live reports accepted by CTEC over the last hour, day, week and month. */
    protected function stats_table() {
        global $DB;
        $periods = ['Last hour' => HOURSECS, 'Last 24 hours' => DAYSECS, 'Last 7 days' => WEEKSECS, 'Last 30 days' => 30 * DAYSECS];
        $table = new html_table();
        $table->attributes['class'] = 'generaltable table-sm mb-2';
        $table->head = ['Reported to CTEC', 'Added to roster', 'Already on roster', 'Total'];
        $now = time();
        foreach ($periods as $label => $secs) {
            $params = ['since' => $now - $secs];
            $sent = $DB->count_records_select('local_ctecreport_log',
                "status = 'sent' AND endpoint = 'live' AND timemodified > :since", $params);
            $dupe = $DB->count_records_select('local_ctecreport_log',
                "status = 'duplicate' AND endpoint = 'live' AND timemodified > :since", $params);
            $table->data[] = [$label, $sent, $dupe, html_writer::tag('strong', $sent + $dupe)];
        }
        return html_writer::table($table);
    }

    /**
     * Students still taking a course whose CTEC ID answer is missing a usable ID, so it can be fixed
     * before they complete. Completed students show in the problems list instead.
     */
    protected function bad_ids_list() {
        global $DB, $OUTPUT, $PAGE;
        $perpage = 10;
        $page = optional_param('ctecbadidpage', 0, PARAM_INT);
        $map = \local_ctecreport\reporter::course_map();
        $html = '';
        $bad = [];
        if ($map) {
            list($insql, $params) = $DB->get_in_or_equal(array_keys($map), SQL_PARAMS_NAMED);
            $like = $DB->sql_like('fi.name', ':pattern', false);
            $params['pattern'] = '%CTEC ID%';
            $answers = $DB->get_records_sql("SELECT fv.id, fc.userid, f.course, fv.value, fc.timemodified
                                               FROM {feedback_value} fv
                                               JOIN {feedback_item} fi ON fi.id = fv.item
                                               JOIN {feedback} f ON f.id = fi.feedback
                                               JOIN {feedback_completed} fc ON fc.id = fv.completed
                                              WHERE f.course $insql AND $like
                                           ORDER BY fc.timemodified DESC, fv.id DESC", $params);
            $seen = [];
            foreach ($answers as $a) {
                $key = $a->userid . '-' . $a->course;
                if (isset($seen[$key])) {
                    continue; // Only the student's latest answer in each course counts.
                }
                $seen[$key] = true;
                if (\local_ctecreport\reporter::normalise_ctecid($a->value) !== '') {
                    continue;
                }
                if ($DB->record_exists('local_ctecreport_log', ['userid' => $a->userid, 'courseid' => $a->course])) {
                    continue;
                }
                if (\local_ctecreport\reporter::find_ctecid($a->userid, $a->course) !== '') {
                    continue; // A valid ID given elsewhere will be used.
                }
                $bad[] = $a;
            }
        }
        $total = count($bad);
        $html .= $OUTPUT->heading("CTEC IDs entered incorrectly, course not finished yet ($total)", 5, 'mt-3');
        if (!$total) {
            return $html . html_writer::tag('p', '&#10004; None.', ['class' => 'text-success mb-1']);
        }
        $html .= html_writer::tag('p', 'These students typed something that is not a CTEC ID (A followed by 6 digits). ' .
            'Ask them to correct it, or it will fail when they complete the course.', ['class' => 'small mb-1']);
        $slice = array_slice($bad, $page * $perpage, $perpage);
        $users = $DB->get_records_list('user', 'id', array_unique(array_map(function($a) {
            return $a->userid;
        }, $slice)));
        $courses = $DB->get_records_list('course', 'id', array_unique(array_map(function($a) {
            return $a->course;
        }, $slice)), '', 'id, shortname, fullname');
        $table = new html_table();
        $table->attributes['class'] = 'generaltable table-sm mb-1';
        $table->head = ['Entered', 'Student', 'Course', 'What they typed'];
        foreach ($slice as $a) {
            $u = $users[$a->userid];
            $c = $courses[$a->course];
            $table->data[] = [
                userdate($a->timemodified, get_string('strftimedatefullshort')),
                html_writer::link(new moodle_url('/user/view.php', ['id' => $u->id, 'course' => $c->id]), fullname($u)) .
                    html_writer::empty_tag('br') . html_writer::link('mailto:' . $u->email, s($u->email), ['class' => 'small']),
                html_writer::tag('span', s($c->shortname), ['title' => s($c->fullname)]),
                trim($a->value) === '' ? html_writer::tag('em', '(left blank)') : s($a->value),
            ];
        }
        $html .= html_writer::table($table);
        $html .= $OUTPUT->paging_bar($total, $page, $perpage, new moodle_url($PAGE->url), 'ctecbadidpage');
        return $html;
    }

    /** Everyone reported to the live CTEC roster, newest first, 10 per page. */
    protected function reported_list() {
        global $DB, $OUTPUT, $PAGE;
        $perpage = 10;
        $page = optional_param('ctecreportpage', 0, PARAM_INT);
        $where = "l.status IN ('sent', 'duplicate') AND l.endpoint = 'live'";
        $total = $DB->count_records_sql("SELECT COUNT(1) FROM {local_ctecreport_log} l WHERE $where");
        $html = $OUTPUT->heading("Reported to CTEC ($total)", 5, 'mt-3');
        if (!$total) {
            return $html . html_writer::tag('p', 'No one has been reported yet.', ['class' => 'text-muted']);
        }
        $namefields = get_all_user_name_fields(true, 'u');
        $rows = $DB->get_records_sql("SELECT l.*, $namefields, c.shortname, c.fullname
                                        FROM {local_ctecreport_log} l
                                        JOIN {user} u ON u.id = l.userid
                                        JOIN {course} c ON c.id = l.courseid
                                       WHERE $where
                                    ORDER BY l.timemodified DESC, l.id DESC", [], $page * $perpage, $perpage);
        $table = new html_table();
        $table->attributes['class'] = 'generaltable table-sm mb-1';
        $table->head = ['Reported', 'Student', 'Course', 'CTEC ID', 'Result'];
        foreach ($rows as $r) {
            $table->data[] = [
                userdate($r->timemodified, get_string('strftimedatetimeshort')),
                html_writer::link(new moodle_url('/user/view.php', ['id' => $r->userid, 'course' => $r->courseid]), fullname($r)),
                html_writer::tag('span', s($r->shortname), ['title' => s($r->fullname)]),
                s($r->ctecid),
                $r->status === 'sent' ? 'Added to roster' : 'Already on roster',
            ];
        }
        $html .= html_writer::table($table);
        $html .= $OUTPUT->paging_bar($total, $page, $perpage, new moodle_url($PAGE->url), 'ctecreportpage');
        return $html;
    }

    public function get_content() {
        global $DB, $OUTPUT;
        if ($this->content !== null) {
            return $this->content;
        }
        $this->content = (object)['text' => '', 'footer' => ''];
        // Students and teachers never see this block, even if it sits on a shared page.
        if (!has_capability('moodle/site:config', context_system::instance())) {
            return $this->content;
        }
        $dbman = $DB->get_manager();
        if (!$dbman->table_exists('local_ctecreport_log')) {
            return $this->content;
        }

        $logurl = new moodle_url('/local/ctecreport/index.php');
        $html = '';
        if (get_config('local_ctecreport', 'mode') !== 'live') {
            $html .= $OUTPUT->notification('CTEC reporting is in TEST mode: completions are not being recorded by CTEC.', 'warning');
        }
        if (!get_config('local_ctecreport', 'enabled')) {
            $html .= $OUTPUT->notification('CTEC reporting is switched off.', 'warning');
        }

        $where = "l.status IN ('error', 'retry', 'pending')";
        $total = $DB->count_records_sql("SELECT COUNT(1) FROM {local_ctecreport_log} l WHERE $where");
        $namefields = get_all_user_name_fields(true, 'u');
        $rows = $DB->get_records_sql("SELECT l.*, u.email, $namefields, c.shortname, c.fullname
                                        FROM {local_ctecreport_log} l
                                        JOIN {user} u ON u.id = l.userid
                                        JOIN {course} c ON c.id = l.courseid
                                       WHERE $where
                                    ORDER BY l.timecompleted DESC", [], 0, self::LIMIT);

        $html .= $this->stats_table();
        $html .= $OUTPUT->heading("Completions CTEC could not accept ($total)", 5, 'mt-3');
        if (!$rows) {
            $html .= html_writer::tag('p', '&#10004; None. Every completion has been reported.', ['class' => 'text-success mb-1']);
        } else {
            $html .= html_writer::tag('p', html_writer::tag('strong', "$total completion(s) could not be reported to CTEC.") .
                ' Fix the CTEC ID on the reporting log and click Send.', ['class' => 'mb-2']);
            $table = new html_table();
            $table->attributes['class'] = 'generaltable table-sm';
            $table->head = ['Completed', 'Student', 'Course', 'Problem'];
            foreach ($rows as $r) {
                $student = html_writer::link(new moodle_url('/user/view.php', ['id' => $r->userid, 'course' => $r->courseid]),
                    fullname($r)) . html_writer::empty_tag('br') .
                    html_writer::link('mailto:' . $r->email, s($r->email), ['class' => 'small']);
                $table->data[] = [
                    userdate($r->timecompleted, get_string('strftimedatefullshort')),
                    $student,
                    html_writer::tag('span', s($r->shortname), ['title' => s($r->fullname)]),
                    s(self::explain($r)),
                ];
            }
            $html .= html_writer::table($table);
            if ($total > count($rows)) {
                $html .= html_writer::tag('p', 'Showing the latest ' . count($rows) . " of $total.", ['class' => 'small']);
            }
        }
        $html .= $this->bad_ids_list();
        $html .= $this->reported_list();
        $this->content->text = $html;
        $this->content->footer = html_writer::link($logurl, 'Open the CTEC reporting log to fix and resend');
        return $this->content;
    }
}
