<?php
// Admin dashboard: find a student, add a new one, enroll them, and download or email their certificates.

defined('MOODLE_INTERNAL') || die();

class block_studenttools extends block_base {

    /** Set once the selected student has been shown inside the search results. */
    protected $shownstudent = false;

    public function init() {
        $this->title = get_string('pluginname', 'block_studenttools');
    }

    public function applicable_formats() {
        return ['my' => true, 'site-index' => true];
    }

    public function instance_allow_multiple() {
        return false;
    }

    /** Courses offered in the course pickers: the admin menu's active list when available. */
    protected static function course_options() {
        global $CFG, $DB;
        $options = [];
        if (file_exists($CFG->dirroot . '/local/activecourses/lib.php')) {
            require_once($CFG->dirroot . '/local/activecourses/lib.php');
            foreach (local_activecourses_list() as $c) {
                $options[$c->id] = format_string($c->fullname);
            }
        }
        if (!$options) {
            foreach ($DB->get_records_select('course', 'id <> ? AND visible = 1', [SITEID], 'fullname', 'id, fullname') as $c) {
                $options[$c->id] = format_string($c->fullname);
            }
        }
        return $options;
    }

    protected static function select($name, array $options, $placeholder) {
        $html = html_writer::tag('option', s($placeholder), ['value' => '']);
        foreach ($options as $value => $label) {
            $html .= html_writer::tag('option', s($label), ['value' => $value]);
        }
        return html_writer::tag('select', $html, ['name' => $name, 'class' => 'stt-input']);
    }

    protected static function form($action, $fields, $button, $class = '', $buttonclass = 'stt-btn stt-btn-primary') {
        return html_writer::tag('form',
            html_writer::empty_tag('input', ['type' => 'hidden', 'name' => 'sesskey', 'value' => sesskey()]) .
            html_writer::empty_tag('input', ['type' => 'hidden', 'name' => 'action', 'value' => $action]) .
            $fields . html_writer::tag('button', $button, ['type' => 'submit', 'class' => $buttonclass]),
            ['method' => 'post', 'action' => (new moodle_url('/blocks/studenttools/action.php'))->out(false),
             'class' => 'stt-form ' . $class]);
    }

    protected static function input($name, $placeholder, $type = 'text', $value = '') {
        return html_writer::empty_tag('input', ['type' => $type, 'name' => $name, 'placeholder' => $placeholder,
            'value' => $value, 'class' => 'stt-input', 'required' => 'required']);
    }

    /** Search box and matching students. */
    protected function search_panel() {
        global $DB;
        $q = trim(optional_param('stq', '', PARAM_NOTAGS));
        $form = html_writer::tag('form',
            html_writer::empty_tag('input', ['type' => 'search', 'name' => 'stq', 'value' => $q, 'class' => 'stt-input stt-grow',
                'placeholder' => 'Search by name or email…', 'aria-label' => 'Search students']) .
            html_writer::tag('button', 'Search', ['type' => 'submit', 'class' => 'stt-btn stt-btn-primary']),
            ['method' => 'get', 'action' => (new moodle_url('/my/'))->out(false), 'class' => 'stt-form']);
        $html = html_writer::tag('h4', 'Find a student', ['class' => 'stt-h']) . $form;
        if ($q === '') {
            return $html;
        }
        $conds = [];
        $params = [];
        foreach (['firstname', 'lastname', 'email'] as $field) {
            $conds[] = $DB->sql_like('u.' . $field, ':' . $field, false);
            $params[$field] = '%' . $DB->sql_like_escape($q) . '%';
        }
        $conds[] = $DB->sql_like($DB->sql_concat('u.firstname', "' '", 'u.lastname'), ':fullname', false);
        $params['fullname'] = '%' . $DB->sql_like_escape($q) . '%';
        $users = $DB->get_records_sql('SELECT u.id, u.email, u.lastaccess, ' . get_all_user_name_fields(true, 'u') . '
                                         FROM {user} u
                                        WHERE u.deleted = 0 AND u.id > 2 AND (' . implode(' OR ', $conds) . ')
                                     ORDER BY u.lastaccess DESC', $params, 0, 10);
        if (!$users) {
            return $html . html_writer::div('No students match “' . s($q) . '”. Add them as a new student below.', 'stt-muted');
        }
        $stu = optional_param('stu', 0, PARAM_INT);
        $list = '';
        foreach ($users as $u) {
            $selected = (int)$u->id === $stu;
            // Clicking the open student again closes their details.
            $url = new moodle_url('/my/', $selected ? ['stq' => $q] : ['stu' => $u->id, 'stq' => $q]);
            $url->set_anchor($selected ? 'stt-search' : 'stt-sel');
            $list .= html_writer::link($url,
                html_writer::tag('span', fullname($u), ['class' => 'stt-name']) .
                html_writer::tag('span', s($u->email), ['class' => 'stt-email']),
                ['class' => 'stt-result' . ($selected ? ' stt-result-open' : ''), 'id' => $selected ? 'stt-sel' : null]);
            if ($selected) {
                // The student's details open right under their name.
                $list .= html_writer::div($this->student_panel($u->id), 'stt-inline-panel');
                $this->shownstudent = true;
            }
        }
        return $html . html_writer::div($list, 'stt-results');
    }

    /** The selected student's courses, completion, certificate buttons and an enroll form. */
    protected function student_panel($userid) {
        global $DB;
        $user = $DB->get_record('user', ['id' => $userid, 'deleted' => 0]);
        if (!$user) {
            return '';
        }
        $html = html_writer::tag('h4', fullname($user), ['class' => 'stt-h mb-1']) .
            html_writer::div(s($user->email), 'stt-detail') .
            html_writer::div('Last seen ' . ($user->lastaccess ? userdate($user->lastaccess, get_string('strftimedatefullshort')) : 'never'),
                'stt-detail') .
            html_writer::div(
                html_writer::link(new moodle_url('/user/profile.php', ['id' => $user->id]), 'Profile', ['class' => 'stt-btn']) .
                html_writer::link(new moodle_url('/my/', ($q = optional_param('stq', '', PARAM_NOTAGS)) !== '' ? ['stq' => $q] : []),
                    'Close', ['class' => 'stt-btn']), 'stt-actions stt-actions-top');

        $courses = enrol_get_all_users_courses($user->id, false, 'id, fullname, shortname');
        $rows = '';
        foreach ($courses as $c) {
            $completed = $DB->get_field('course_completions', 'timecompleted', ['userid' => $user->id, 'course' => $c->id]);
            $status = $completed ? html_writer::tag('span', 'Completed ' . userdate($completed, get_string('strftimedatefullshort')), ['class' => 'stt-pill stt-ok'])
                : html_writer::tag('span', 'In progress', ['class' => 'stt-pill stt-muted-pill']);
            $certs = '';
            foreach (get_coursemodules_in_course('customcert', $c->id) as $cm) {
                $issued = $DB->record_exists('customcert_issues', ['customcertid' => $cm->instance, 'userid' => $user->id]);
                if (!$completed && !$issued) {
                    continue; // Never offer (or issue) a certificate for an unfinished course.
                }
                $download = new moodle_url('/blocks/studenttools/action.php', ['action' => 'download', 'cmid' => $cm->id,
                    'userid' => $user->id, 'sesskey' => sesskey()]);
                $certs .= html_writer::link($download, 'Download certificate', ['class' => 'stt-btn', 'target' => '_blank']) .
                    self::form('emailcert',
                        html_writer::empty_tag('input', ['type' => 'hidden', 'name' => 'cmid', 'value' => $cm->id]) .
                        html_writer::empty_tag('input', ['type' => 'hidden', 'name' => 'userid', 'value' => $user->id]),
                        'Email certificate', 'stt-inline', 'stt-btn');
            }
            if ($certs && !$completed) {
                $certs .= html_writer::div('Certificate already issued, but no completion date on record, so its date will be blank.', 'stt-warn-text');
            }
            if (!$certs && !$completed) {
                $certs = html_writer::tag('span', 'Available once the course is completed', ['class' => 'stt-muted']);
            }
            $rows .= html_writer::div(
                html_writer::link(new moodle_url('/course/view.php', ['id' => $c->id]), format_string($c->fullname), ['class' => 'stt-course-name']) .
                html_writer::div($status, 'stt-course-status') .
                html_writer::div($certs ?: html_writer::tag('span', 'No certificate in this course', ['class' => 'stt-muted']), 'stt-actions'),
                'stt-course');
        }
        $html .= html_writer::tag('h5', 'Courses', ['class' => 'stt-h stt-h-sm']) .
            ($rows ?: html_writer::div('Not enrolled in any courses yet.', 'stt-muted'));

        $options = array_diff_key(self::course_options(), $courses);
        if ($options) {
            $html .= html_writer::tag('h5', 'Enroll in a course', ['class' => 'stt-h stt-h-sm']) .
                self::form('enrol', html_writer::empty_tag('input', ['type' => 'hidden', 'name' => 'userid', 'value' => $user->id]) .
                    self::select('courseid', $options, 'Select a course…'), 'Enroll');
        }
        return html_writer::div($html, 'stt-student');
    }

    /** Latest Stripe disputes with a restore button (needs local_stripedispute). */
    protected function disputes_panel() {
        global $DB, $PAGE;
        if (!$DB->get_manager()->table_exists('local_stripedispute')) {
            return '';
        }
        $labels = ['suspended' => ['Access removed', 'stt-bad'], 'restored' => ['Access restored', 'stt-ok'],
            'nomatch' => ['No matching account', 'stt-warnp'], 'multiple' => ['Several accounts match', 'stt-warnp'],
            'admin' => ['Admin skipped', 'stt-muted-pill'], 'alreadysuspended' => ['Already suspended', 'stt-bad'],
            'dryrun' => ['Not suspended', 'stt-muted-pill'], 'error' => ['Needs review', 'stt-warnp'], 'pending' => ['Processing', 'stt-muted-pill']];
        $stripe = ['needs_response' => 'Needs response', 'under_review' => 'Under review', 'warning_needs_response' => 'Needs response',
            'warning_under_review' => 'Under review', 'won' => 'Won', 'lost' => 'Lost', 'warning_closed' => 'Closed'];
        $render = function($r) use ($labels, $stripe, $PAGE) {
            list($label, $tone) = $labels[$r->outcome] ?? [$r->outcome, 'stt-muted-pill'];
            $btn = '';
            if ($r->userid && in_array($r->outcome, ['suspended', 'alreadysuspended'])) {
                $url = new moodle_url('/local/stripedispute/index.php', ['action' => 'restore', 'id' => $r->id, 'sesskey' => sesskey(),
                    'returnurl' => (new moodle_url($PAGE->url))->out_as_local_url(false)]);
                $btn = html_writer::link($url, 'Restore access', ['class' => 'stt-btn',
                    'onclick' => "return confirm('Restore this student\\'s access to the site?');"]);
            } else if ($r->userid && in_array($r->outcome, ['restored', 'dryrun'])) {
                $url = new moodle_url('/local/stripedispute/index.php', ['action' => 'suspend', 'id' => $r->id, 'sesskey' => sesskey(),
                    'returnurl' => (new moodle_url($PAGE->url))->out_as_local_url(false)]);
                $btn = html_writer::link($url, 'Remove access', ['class' => 'stt-btn',
                    'onclick' => "return confirm('Remove this student\\'s access to the site?');"]);
            }
            $who = trim($r->name . ' ' . ($r->email ? '(' . $r->email . ')' : '')) ?: 'Unknown buyer';
            return html_writer::div(
                html_writer::div(s($who), 'stt-course-name') .
                html_writer::div(userdate($r->timecreated, get_string('strftimedatefullshort')) .
                    ($r->amount !== null ? ' &middot; ' . format_float($r->amount / 100, 2) . ' ' . core_text::strtoupper((string)$r->currency) : '') .
                    ($r->orderid ? ' &middot; order #' . s($r->orderid) : '') .
                    (isset($stripe[$r->status]) ? ' &middot; ' . $stripe[$r->status] : ''), 'stt-detail') .
                html_writer::div(html_writer::tag('span', $label, ['class' => "stt-pill $tone"]) . ' ' . $btn, 'stt-actions'),
                'stt-course stt-dispute');
        };
        $recent = $DB->get_records('local_stripedispute', null, 'timecreated DESC', '*', 0, 5);
        $html = $recent ? implode('', array_map($render, $recent))
            : html_writer::div('No Stripe disputes. If one comes in, the student\'s access is removed automatically.', 'stt-muted mb-2');
        $html .= html_writer::link(new moodle_url('/local/stripedispute/index.php'), 'View all disputes &rarr;',
            ['class' => 'stt-btn stt-btn-primary mt-2']);
        // Closed until clicked, like "Add a new student"; the heading shows how many are still open in Stripe.
        $open = $DB->count_records_select('local_stripedispute',
            "status IN ('needs_response', 'under_review', 'warning_needs_response', 'warning_under_review')");
        $badge = $open ? ' ' . html_writer::tag('span', $open . ' open', ['class' => 'stt-pill stt-bad']) : '';
        return html_writer::tag('details',
            html_writer::tag('summary', html_writer::tag('span', 'Payment disputes' . $badge, ['class' => 'stt-h']) .
                html_writer::tag('span', '', ['class' => 'stt-chevron'])) .
            html_writer::div($html, 'mt-3'),
            ['class' => 'stt-add']);
    }

    /** New student form. */
    protected function add_panel() {
        $fields = html_writer::div(
                self::input('firstname', 'First name') . self::input('lastname', 'Last name') .
                self::input('email', 'Email address', 'email'), 'stt-grid') .
            html_writer::div(
                self::select('courseid', self::course_options(), 'Enroll in a course (optional)…') .
                html_writer::tag('label', html_writer::empty_tag('input', ['type' => 'checkbox', 'name' => 'sendlogin', 'value' => 1,
                    'checked' => 'checked']) . ' Email them their login details', ['class' => 'stt-check']), 'stt-row');
        return html_writer::tag('details',
            html_writer::tag('summary', html_writer::tag('span', 'Add a new student', ['class' => 'stt-h']) .
                html_writer::tag('span', '', ['class' => 'stt-chevron'])) .
            self::form('create', $fields, 'Add student', 'stt-stack'),
            ['class' => 'stt-add']);
    }

    public function get_content() {
        if ($this->content !== null) {
            return $this->content;
        }
        $this->content = (object)['text' => '', 'footer' => ''];
        if (!has_capability('moodle/site:config', context_system::instance())) {
            return $this->content;
        }
        $html = self::styles() . html_writer::div($this->search_panel(), 'stt-card', ['id' => 'stt-search']);
        $stu = optional_param('stu', 0, PARAM_INT);
        if ($stu && !$this->shownstudent) {
            // Opened without a search (e.g. just added or enrolled): show the details on their own.
            $html .= html_writer::div($this->student_panel($stu), 'stt-card');
        }
        $html .= html_writer::div($this->add_panel(), 'stt-card');
        if ($disputes = $this->disputes_panel()) {
            $html .= html_writer::div($disputes, 'stt-card');
        }
        $this->content->text = html_writer::div($html, 'stt');
        return $this->content;
    }

    protected static function styles() {
        return '<style>
@media (min-width: 1100px) {
  [data-blockregion="content"]:has(.block_studenttools):has(.block_ctecreport),
  #block-region-content:has(.block_studenttools):has(.block_ctecreport) {
    display: grid; grid-template-columns: minmax(0, 3fr) minmax(0, 7fr); gap: 16px; align-items: start;
  }
}
.stt{--line:#e4e7ec;--muted:#667085;--ink:#1d2939;--gold:#c9a227;--ok:#1f7a4d;--ok-bg:#e6f4ec;color:var(--ink);font-size:.9rem}
.stt-card{background:#fff;border:1px solid var(--line);border-radius:12px;padding:16px 18px;margin-bottom:12px}
.stt-h{font-size:1rem;font-weight:600;margin:0 0 10px}
.stt-h-sm{font-size:.9rem;margin-top:16px}
.stt-form{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0}
.stt-stack{display:block;margin-top:12px}
.stt-inline{display:inline-flex;margin:0}
.stt-input{height:38px;padding:6px 10px;border:1px solid var(--line);border-radius:8px;background:#fff;font-size:.9rem;min-width:0}
.stt-input:focus{outline:none;border-color:var(--gold);box-shadow:0 0 0 3px rgba(201,162,39,.2)}
.stt-grow{flex:1 1 260px}
.stt-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;margin-bottom:8px}
.stt-row{display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin-bottom:10px}
.stt-row select{flex:1 1 280px}
.stt-check{margin:0;display:flex;gap:6px;align-items:center;color:var(--ink)}
.stt-btn{display:inline-flex;align-items:center;height:34px;padding:0 12px;border:1px solid var(--line);border-radius:8px;
  background:#fff;color:var(--ink)!important;font-size:.85rem;font-weight:500;text-decoration:none!important;cursor:pointer;white-space:nowrap}
.stt-btn:hover{border-color:var(--gold);background:#fffbea}
.stt-btn-primary{background:#d4af37;border-color:#d4af37;color:#fff!important;height:38px}
.stt-btn-primary:hover{background:#c09c2c;border-color:#c09c2c}
.stt-results{display:flex;flex-direction:column;gap:8px;margin-top:12px}
.stt-result{display:block;padding:10px 12px;border:1px solid var(--line);border-radius:8px;text-decoration:none!important}
.stt-result:hover{border-color:var(--gold);background:#fffbea}
.stt-result-open{border-color:var(--gold);background:#fffbea;border-bottom-left-radius:0;border-bottom-right-radius:0}
.stt-inline-panel{border:1px solid var(--gold);border-top:0;border-radius:0 0 8px 8px;padding:12px;margin-top:-8px;background:#fff}
#stt-sel{scroll-margin-top:90px}
.stt-inline-panel .stt-student>h4:first-child,.stt-inline-panel .stt-student>h4:first-child+.stt-detail{display:none}
.stt-inline-panel .stt-actions-top{margin-top:0}
.stt-name{display:block;font-weight:600;color:var(--ink)}
.stt-email{display:block;font-size:.8rem;color:var(--muted)}
.stt-muted{color:var(--muted);font-size:.85rem;margin-top:8px}
.stt-student-head{display:flex;align-items:center;gap:8px;margin-bottom:12px}
.stt-student-head>div{flex:1}
.stt-table-wrap{overflow-x:auto}
.stt-table{width:100%;border-collapse:collapse}
.stt-table th{font-size:.72rem;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);font-weight:600;text-align:left;padding:8px 10px;border-bottom:1px solid var(--line)}
.stt-table td{padding:10px;border-bottom:1px solid #f0f2f5;vertical-align:middle}
.stt-table tr:last-child td{border-bottom:0}
.stt-pill{display:inline-block;padding:2px 9px;border-radius:999px;font-size:.75rem;font-weight:600;white-space:nowrap}
.stt-ok{background:var(--ok-bg);color:var(--ok)}
.stt-bad{background:#fdecea;color:#b42318}
.stt-warnp{background:#fdf3dc;color:#8a5a00}
.stt-muted-pill{background:#f2f4f7;color:var(--muted)}
.stt-detail{color:var(--muted);font-size:.82rem;overflow-wrap:anywhere}
.stt-actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.stt-actions-top{margin:10px 0 4px}
.stt-course{border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin-bottom:8px}
.stt-course-name{display:block;font-weight:600;color:var(--ink)!important;line-height:1.3}
.stt-course-status{margin-top:6px}
.stt-form select,.stt-form .stt-input{flex:1 1 160px}
.stt-warn-text{color:#8a5a00;font-size:.78rem;margin-top:6px}
.stt-add>summary{list-style:none;display:flex;justify-content:space-between;align-items:center;cursor:pointer}
.stt-add>summary::-webkit-details-marker{display:none}
.stt-add>summary .stt-h{margin:0}
.stt-chevron{width:9px;height:9px;border-right:2px solid var(--muted);border-bottom:2px solid var(--muted);transform:rotate(45deg);transition:transform .15s}
.stt-add[open] .stt-chevron{transform:rotate(225deg)}
.stt-dispute{padding:8px 10px;margin-bottom:6px}
.stt-dispute .stt-course-name{font-size:.85rem}
.stt-dispute .stt-detail{font-size:.75rem;white-space:normal;overflow-wrap:anywhere}
.stt-dispute .stt-actions{margin-top:4px;gap:4px;align-items:center}
.stt-dispute .stt-pill{font-size:.68rem;padding:1px 7px}
.stt-dispute .stt-btn{height:22px;padding:0 8px;font-size:.7rem;border-radius:6px}
.stt-past{border-top:1px solid var(--line);padding-top:12px;margin-top:4px}
</style>';
    }
}
