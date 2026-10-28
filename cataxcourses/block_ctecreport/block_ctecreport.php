<?php
// Admin dashboard panel for CTEC reporting: totals, problems, bad CTEC IDs and everyone reported.

defined('MOODLE_INTERNAL') || die();

class block_ctecreport extends block_base {

    const PERPAGE = 10;

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
            return 'Could not connect to CTEC yet; retrying automatically every 15 minutes';
        }
        return $response !== '' ? $response : 'Unknown problem';
    }

    /** Small rounded label. $tone: ok, info, warn, bad, muted. */
    protected static function pill($text, $tone) {
        return html_writer::tag('span', $text, ['class' => "ctecr-pill ctecr-$tone"]);
    }

    /** Course short label with the full name on hover. */
    protected static function course_label($c) {
        return html_writer::tag('span', s($c->shortname), ['title' => s($c->fullname)]);
    }

    /** Student name (linked) with email underneath. */
    protected static function student_cell($user, $courseid) {
        return html_writer::link(new moodle_url('/user/view.php', ['id' => $user->id, 'course' => $courseid]),
                fullname($user), ['class' => 'ctecr-name']) .
            html_writer::link('mailto:' . $user->email, s($user->email), ['class' => 'ctecr-email']);
    }

    /** A titled, collapsible card. */
    protected static function card($id, $title, $count, $tone, $body, $open, $subtitle = '') {
        $badge = self::pill($count, $count ? $tone : 'muted');
        $summary = html_writer::div(
                html_writer::tag('span', $title, ['class' => 'ctecr-card-title']) . $badge .
                ($subtitle ? html_writer::tag('span', $subtitle, ['class' => 'ctecr-card-sub']) : ''),
                'ctecr-card-head') .
            html_writer::tag('span', '', ['class' => 'ctecr-chevron', 'aria-hidden' => 'true']);
        $attrs = ['class' => 'ctecr-card', 'id' => $id];
        if ($open) {
            $attrs['open'] = 'open';
        }
        return html_writer::tag('details', html_writer::tag('summary', $summary) .
            html_writer::div($body, 'ctecr-card-body'), $attrs);
    }

    protected static function table(array $head, array $rows) {
        $t = new html_table();
        $t->attributes['class'] = 'ctecr-table';
        $t->head = $head;
        $t->data = $rows;
        return html_writer::div(html_writer::table($t), 'ctecr-table-wrap');
    }

    /** Live reports accepted by CTEC: [label => [added, already]]. */
    protected function stats() {
        global $DB;
        $periods = ['Last hour' => HOURSECS, 'Last 24 hours' => DAYSECS, 'Last 7 days' => WEEKSECS, 'Last 30 days' => 30 * DAYSECS];
        $out = [];
        foreach ($periods as $label => $secs) {
            $params = ['since' => time() - $secs];
            $out[$label] = [
                $DB->count_records_select('local_ctecreport_log', "status = 'sent' AND endpoint = 'live' AND timemodified > :since", $params),
                $DB->count_records_select('local_ctecreport_log', "status = 'duplicate' AND endpoint = 'live' AND timemodified > :since", $params),
            ];
        }
        return $out;
    }

    /**
     * Students still taking a course whose latest CTEC ID answer is not usable (and no valid ID elsewhere).
     * Completed students appear in the problems card instead.
     */
    protected function bad_ids() {
        global $DB;
        $map = \local_ctecreport\reporter::course_map();
        if (!$map) {
            return [];
        }
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
        $bad = [];
        foreach ($answers as $a) {
            $key = $a->userid . '-' . $a->course;
            if (isset($seen[$key])) {
                continue; // Only the student's latest answer in each course counts.
            }
            $seen[$key] = true;
            if (\local_ctecreport\reporter::normalise_ctecid($a->value) !== ''
                    || $DB->record_exists('local_ctecreport_log', ['userid' => $a->userid, 'courseid' => $a->course])
                    || \local_ctecreport\reporter::find_ctecid($a->userid, $a->course) !== '') {
                continue;
            }
            $bad[] = $a;
        }
        return $bad;
    }

    public function get_content() {
        global $DB, $OUTPUT, $PAGE;
        if ($this->content !== null) {
            return $this->content;
        }
        $this->content = (object)['text' => '', 'footer' => ''];
        if (!has_capability('moodle/site:config', context_system::instance())
                || !$DB->get_manager()->table_exists('local_ctecreport_log')) {
            return $this->content;
        }
        $namefields = get_all_user_name_fields(true, 'u');
        $html = self::styles();

        // Mode banner.
        if (!get_config('local_ctecreport', 'enabled')) {
            $html .= html_writer::div('CTEC reporting is switched off. Completions are not being sent.', 'ctecr-banner ctecr-banner-bad');
        } else if (get_config('local_ctecreport', 'mode') !== 'live') {
            $html .= html_writer::div('TEST mode: completions are checked by CTEC but not recorded.', 'ctecr-banner ctecr-banner-warn');
        } else {
            $html .= html_writer::div(html_writer::tag('span', '', ['class' => 'ctecr-dot']) .
                'Live: completions are reported to CTEC automatically.', 'ctecr-banner ctecr-banner-ok');
        }

        // Stat tiles.
        $tiles = '';
        foreach ($this->stats() as $label => list($added, $already)) {
            $tiles .= html_writer::div(
                html_writer::div($label, 'ctecr-tile-label') .
                html_writer::div($added + $already, 'ctecr-tile-num') .
                html_writer::div("$added added &middot; $already already on roster", 'ctecr-tile-sub'), 'ctecr-tile');
        }
        $html .= html_writer::div($tiles, 'ctecr-tiles');

        // Problems with completed students.
        $where = "l.status IN ('error', 'retry', 'pending')";
        $problems = $DB->get_records_sql("SELECT l.*, u.email, $namefields, c.shortname, c.fullname
                                            FROM {local_ctecreport_log} l
                                            JOIN {user} u ON u.id = l.userid
                                            JOIN {course} c ON c.id = l.courseid
                                           WHERE $where
                                        ORDER BY l.timecompleted DESC");
        $rows = [];
        foreach ($problems as $r) {
            $u = (object)(['id' => $r->userid] + (array)$r);
            $tone = $r->status === 'error' ? 'bad' : 'warn';
            $rows[] = [
                userdate($r->timecompleted, get_string('strftimedatefullshort')),
                self::student_cell($u, $r->courseid),
                self::course_label($r),
                self::pill($r->status === 'error' ? 'Needs fixing' : 'Retrying', $tone) .
                    html_writer::div(s(self::explain($r)), 'ctecr-problem'),
            ];
        }
        $body = $rows ? self::table(['Completed', 'Student', 'Course', 'Problem'], $rows) .
                html_writer::tag('p', 'To fix one, open the reporting log, type the correct CTEC ID next to the student and click Send.',
                    ['class' => 'ctecr-help'])
            : html_writer::div('&#10004; Nothing to fix. Every completion has been reported.', 'ctecr-empty');
        $cards = [['ctecr-problems', 'Needs attention', count($problems), 'bad', $body, (bool)$problems,
            'Completed, but CTEC has not accepted the report']];

        // Bad CTEC IDs from students still taking a course (paged, collapsed by default).
        $bad = $this->bad_ids();
        $page = optional_param('ctecbadidpage', 0, PARAM_INT);
        $rows = [];
        if ($bad) {
            $slice = array_slice($bad, $page * self::PERPAGE, self::PERPAGE);
            $users = $DB->get_records_list('user', 'id', array_unique(array_column($slice, 'userid')));
            $courses = $DB->get_records_list('course', 'id', array_unique(array_column($slice, 'course')), '', 'id, shortname, fullname');
            foreach ($slice as $a) {
                $typed = trim($a->value) === '' ? html_writer::tag('em', 'left blank') : html_writer::tag('code', s($a->value));
                $rows[] = [
                    userdate($a->timemodified, get_string('strftimedatefullshort')),
                    self::student_cell($users[$a->userid], $a->course),
                    self::course_label($courses[$a->course]),
                    $typed,
                ];
            }
        }
        $body = $bad ? html_writer::tag('p', 'These students typed something that is not a CTEC ID (A followed by 6 digits). ' .
                'Ask them to correct it before they finish, or the report will fail.', ['class' => 'ctecr-help']) .
                self::table(['Entered', 'Student', 'Course', 'What they typed'], $rows) .
                $OUTPUT->paging_bar(count($bad), $page, self::PERPAGE, new moodle_url($PAGE->url, ['ctecopen' => 'badids']), 'ctecbadidpage')
            : html_writer::div('&#10004; None.', 'ctecr-empty');
        $cards[] = ['ctecr-badids', 'Incorrect CTEC IDs', count($bad), 'warn', $body, true,
            'Course not finished yet: fix before they complete'];

        // Everyone reported (paged).
        $where = "l.status IN ('sent', 'duplicate') AND l.endpoint = 'live'";
        $total = $DB->count_records_sql("SELECT COUNT(1) FROM {local_ctecreport_log} l WHERE $where");
        $page = optional_param('ctecreportpage', 0, PARAM_INT);
        $reported = $DB->get_records_sql("SELECT l.*, u.email, $namefields, c.shortname, c.fullname
                                            FROM {local_ctecreport_log} l
                                            JOIN {user} u ON u.id = l.userid
                                            JOIN {course} c ON c.id = l.courseid
                                           WHERE $where
                                        ORDER BY l.timemodified DESC, l.id DESC", [], $page * self::PERPAGE, self::PERPAGE);
        $rows = [];
        foreach ($reported as $r) {
            $u = (object)(['id' => $r->userid] + (array)$r);
            $rows[] = [
                userdate($r->timemodified, get_string('strftimedatetimeshort')),
                self::student_cell($u, $r->courseid),
                self::course_label($r),
                html_writer::tag('code', s($r->ctecid)),
                $r->status === 'sent' ? self::pill('Added to roster', 'ok') : self::pill('Already on roster', 'info'),
            ];
        }
        $body = $total ? self::table(['Reported', 'Student', 'Course', 'CTEC ID', 'Result'], $rows) .
                $OUTPUT->paging_bar($total, $page, self::PERPAGE, new moodle_url($PAGE->url, ['ctecopen' => 'reported']), 'ctecreportpage')
            : html_writer::div('No one has been reported yet.', 'ctecr-empty');
        $cards[] = ['ctecr-reported', 'Reported to CTEC', $total, 'ok', $body,
            optional_param('ctecopen', '', PARAM_ALPHA) === 'reported' || !$problems, 'Newest first'];

        // Jump links.
        $nav = '';
        foreach ($cards as $c) {
            $nav .= html_writer::link('#' . $c[0], $c[1] . ' ' . self::pill($c[2], $c[2] ? $c[3] : 'muted'),
                ['class' => 'ctecr-jump', 'data-target' => $c[0]]);
        }
        $nav .= html_writer::link(new moodle_url('/local/ctecreport/index.php'), 'Open full reporting log &rarr;',
            ['class' => 'ctecr-jump ctecr-jump-log']);
        $html .= html_writer::div($nav, 'ctecr-nav');

        foreach ($cards as $c) {
            $html .= self::card($c[0], $c[1], $c[2], $c[3], $c[4], $c[5], $c[6]);
        }
        // Jump links open the card they point to.
        $html .= html_writer::script("document.querySelectorAll('.ctecr-jump[data-target]').forEach(function(a){" .
            "a.addEventListener('click',function(){var d=document.getElementById(a.getAttribute('data-target'));if(d){d.open=true;}});});");

        $this->content->text = html_writer::div($html, 'ctecr');
        return $this->content;
    }

    protected static function styles() {
        return '<style>
.ctecr{--ok:#1f7a4d;--ok-bg:#e6f4ec;--info:#1d5fa8;--info-bg:#e7f0fb;--warn:#8a5a00;--warn-bg:#fdf3dc;
  --bad:#b42318;--bad-bg:#fdecea;--muted:#667085;--muted-bg:#f2f4f7;--line:#e4e7ec;--card:#fff;--ink:#1d2939}
.ctecr{color:var(--ink);font-size:.9rem}
.ctecr-banner{display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:8px;margin-bottom:14px;font-weight:500}
.ctecr-banner-ok{background:var(--ok-bg);color:var(--ok)}
.ctecr-banner-warn{background:var(--warn-bg);color:var(--warn)}
.ctecr-banner-bad{background:var(--bad-bg);color:var(--bad)}
.ctecr-dot{width:8px;height:8px;border-radius:50%;background:var(--ok);box-shadow:0 0 0 3px rgba(31,122,77,.18)}
.ctecr-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:14px}
.ctecr-tile{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px}
.ctecr-tile-label{color:var(--muted);font-size:.78rem;text-transform:uppercase;letter-spacing:.04em}
.ctecr-tile-num{font-size:1.9rem;font-weight:700;line-height:1.2;margin:2px 0}
.ctecr-tile-sub{color:var(--muted);font-size:.78rem}
.ctecr-nav{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px}
.ctecr-jump{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border:1px solid var(--line);border-radius:999px;
  background:var(--card);color:var(--ink)!important;text-decoration:none!important;font-weight:500}
.ctecr-jump:hover{border-color:#c9a227}
.ctecr-jump-log{margin-left:auto;color:#8a6d00!important}
.ctecr-card{background:var(--card);border:1px solid var(--line);border-radius:12px;margin-bottom:12px;overflow:hidden}
.ctecr-card>summary{list-style:none;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 18px;cursor:pointer}
.ctecr-card>summary::-webkit-details-marker{display:none}
.ctecr-card>summary:hover{background:#fafafa}
.ctecr-card-head{display:flex;flex-wrap:wrap;align-items:center;gap:10px}
.ctecr-card-title{font-weight:600;font-size:1rem}
.ctecr-card-sub{color:var(--muted);font-size:.8rem}
.ctecr-chevron{width:9px;height:9px;border-right:2px solid var(--muted);border-bottom:2px solid var(--muted);transform:rotate(45deg);transition:transform .15s;flex:none}
.ctecr-card[open] .ctecr-chevron{transform:rotate(225deg)}
.ctecr-card-body{padding:4px 18px 16px;border-top:1px solid var(--line)}
.ctecr-pill{display:inline-block;padding:2px 9px;border-radius:999px;font-size:.75rem;font-weight:600;white-space:nowrap}
.ctecr-ok{background:var(--ok-bg);color:var(--ok)}.ctecr-info{background:var(--info-bg);color:var(--info)}
.ctecr-warn{background:var(--warn-bg);color:var(--warn)}.ctecr-bad{background:var(--bad-bg);color:var(--bad)}
.ctecr-muted{background:var(--muted-bg);color:var(--muted)}
.ctecr-table-wrap{overflow-x:auto}
.ctecr-table{width:100%;border-collapse:collapse;margin:8px 0 4px}
.ctecr-table th{font-size:.72rem;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);font-weight:600;
  text-align:left;padding:8px 10px;border-bottom:1px solid var(--line);background:transparent}
.ctecr-table td{padding:10px;border-bottom:1px solid #f0f2f5;vertical-align:top}
.ctecr-table tr:last-child td{border-bottom:0}
.ctecr-table tbody tr:hover td{background:#fcfcfd}
.ctecr-name{display:block;font-weight:500;color:var(--ink)!important}
.ctecr-email{display:block;font-size:.78rem;color:var(--muted)!important}
.ctecr-problem{color:var(--muted);font-size:.8rem;margin-top:4px}
.ctecr code{background:var(--muted-bg);color:var(--ink);padding:1px 6px;border-radius:4px;font-size:.8rem}
.ctecr-help{color:var(--muted);font-size:.82rem;margin:10px 0 0}
.ctecr-empty{color:var(--ok);padding:12px 0 2px;font-weight:500}
.ctecr .paging{margin:8px 0 0}
</style>';
    }
}
