<?php
// Lists visible courses that are not marked outdated/expired, grouped by the year in their name, newest first.

defined('MOODLE_INTERNAL') || die();

class block_activecourses extends block_base {

    // Course names containing these words are treated as retired.
    const RETIRED_WORDS = '/outdated|expired/i';
    // Categories whose name contains this are left out.
    const TEST_CATEGORY = '/test/i';

    public function init() {
        $this->title = get_string('pluginname', 'block_activecourses');
    }

    public function applicable_formats() {
        return ['my' => true, 'site-index' => true];
    }

    public function instance_allow_multiple() {
        return false;
    }

    /** Latest four-digit year (20xx) in a course name, or 0 if none. */
    public static function course_year($name) {
        preg_match_all('/\b(20\d\d)\b/', $name, $m);
        return $m[1] ? max(array_map('intval', $m[1])) : 0;
    }

    public function get_content() {
        global $DB;
        if ($this->content !== null) {
            return $this->content;
        }
        $this->content = (object)['text' => '', 'footer' => ''];
        if (!has_capability('moodle/site:config', context_system::instance())) {
            return $this->content;
        }

        $sql = "SELECT c.id, c.fullname, c.shortname, cat.name AS category,
                       (SELECT COUNT(DISTINCT ue.userid)
                          FROM {user_enrolments} ue
                          JOIN {enrol} e ON e.id = ue.enrolid
                         WHERE e.courseid = c.id AND ue.status = 0 AND e.status = 0) AS enrolled
                  FROM {course} c
                  JOIN {course_categories} cat ON cat.id = c.category
                 WHERE c.id <> :siteid AND c.visible = 1 AND cat.visible = 1";
        $courses = $DB->get_records_sql($sql, ['siteid' => SITEID]);

        $groups = [];
        foreach ($courses as $c) {
            if (preg_match(self::RETIRED_WORDS, $c->fullname) || preg_match(self::TEST_CATEGORY, $c->category)) {
                continue;
            }
            $c->name = format_string($c->fullname, true, ['context' => context_course::instance($c->id)]);
            $groups[self::course_year($c->fullname)][] = $c;
        }
        krsort($groups);

        $html = '';
        foreach ($groups as $year => $list) {
            usort($list, function($a, $b) {
                return strcasecmp($a->name, $b->name);
            });
            $html .= html_writer::tag('h6', $year ? $year : 'No year in name', ['class' => 'mt-2 mb-1 font-weight-bold']);
            $items = '';
            foreach ($list as $c) {
                $items .= html_writer::tag('li',
                    html_writer::link(new moodle_url('/course/view.php', ['id' => $c->id]), $c->name) .
                    html_writer::tag('span', " ({$c->enrolled})", ['class' => 'text-muted small',
                        'title' => 'Enrolled users']),
                    ['class' => 'mb-1']);
            }
            $html .= html_writer::tag('ul', $items, ['class' => 'list-unstyled ml-0 mb-2']);
        }
        $this->content->text = $html ?: 'No active courses.';
        $this->content->footer = html_writer::link(new moodle_url('/course/management.php'), 'Manage courses');
        return $this->content;
    }
}
