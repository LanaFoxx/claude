<?php
namespace local_enrolexpiry;

defined('MOODLE_INTERNAL') || die();

/**
 * One year after enrolling in a 60 Hour course, the student's exams close (per-user quiz overrides).
 * Reminders go out 30, 14 and 3 days before, and a notice on the day, to students who have not completed.
 */
class manager {

    const YEAR = 365 * DAYSECS;

    /** Reminder kinds and how many days before the deadline each is sent. */
    const REMINDERS = ['d30' => 30, 'd14' => 14, 'd3' => 3];

    /** Enrolments on or after this time are covered (start of the configured day, site time). */
    public static function start_time() {
        $date = trim((string)get_config('local_enrolexpiry', 'startdate')) ?: '2026-10-29';
        list($y, $m, $d) = array_map('intval', explode('-', $date) + [0, 1, 1]);
        return make_timestamp($y ?: 2026, $m ?: 10, $d ?: 29);
    }

    /** Courses the rule covers: every course whose name contains the configured text. */
    public static function courses() {
        global $DB;
        $match = trim((string)get_config('local_enrolexpiry', 'coursematch')) ?: '60 Hour';
        $like = $DB->sql_like('fullname', ':match', false);
        return $DB->get_records_select('course', "id <> :site AND $like",
            ['site' => SITEID, 'match' => '%' . $DB->sql_like_escape($match) . '%'], 'id', 'id, fullname, shortname');
    }

    /** The deadline for an enrolment: one year after it started. */
    public static function deadline($enrolment) {
        $start = $enrolment->timestart ?: $enrolment->timecreated;
        return $start + self::YEAR;
    }

    /**
     * Which email is due now for a deadline, or null. Each kind is sent once; a late run still sends
     * only the most recent reminder that applies rather than all of them at once.
     */
    public static function due_kind($deadline, $now, array $alreadysent) {
        if ($now >= $deadline) {
            return in_array('expired', $alreadysent) ? null : 'expired';
        }
        $daysleft = ($deadline - $now) / DAYSECS;
        $due = null;
        foreach (self::REMINDERS as $kind => $days) {
            if ($daysleft <= $days) {
                $due = $kind; // REMINDERS run from 30 down to 3, so the last match is the closest one.
            }
        }
        if ($due === null || in_array($due, $alreadysent)) {
            return null;
        }
        return $due;
    }

    /** Covered enrolments: student, course, start, for courses the rule applies to. */
    public static function enrolments() {
        global $DB;
        $courses = self::courses();
        if (!$courses) {
            return [];
        }
        list($insql, $params) = $DB->get_in_or_equal(array_keys($courses), SQL_PARAMS_NAMED);
        $params['since'] = self::start_time();
        return $DB->get_records_sql("SELECT ue.id, ue.userid, e.courseid, ue.timestart, ue.timecreated
                                       FROM {user_enrolments} ue
                                       JOIN {enrol} e ON e.id = ue.enrolid
                                       JOIN {user} u ON u.id = ue.userid AND u.deleted = 0
                                      WHERE e.courseid $insql
                                        AND (CASE WHEN ue.timestart > 0 THEN ue.timestart ELSE ue.timecreated END) >= :since",
            $params);
    }

    /** Give the student a personal closing date on every exam in the course (never replaces an existing override). */
    public static function close_exams($userid, $courseid, $deadline) {
        global $CFG, $DB;
        require_once($CFG->dirroot . '/mod/quiz/locallib.php');
        $added = 0;
        foreach ($DB->get_records('quiz', ['course' => $courseid]) as $quiz) {
            if ($DB->record_exists('quiz_overrides', ['quiz' => $quiz->id, 'userid' => $userid])) {
                continue;
            }
            $override = (object)['quiz' => $quiz->id, 'userid' => $userid, 'timeclose' => $deadline];
            $override->id = $DB->insert_record('quiz_overrides', $override);
            $cm = get_coursemodule_from_instance('quiz', $quiz->id, $courseid);
            if ($cm) {
                $quiz->cmid = $cm->id;
                quiz_update_events($quiz, $override);
            }
            $added++;
        }
        return $added;
    }

    public static function completed($userid, $courseid) {
        global $DB;
        return (bool)$DB->get_field('course_completions', 'timecompleted', ['userid' => $userid, 'course' => $courseid]);
    }

    /** The email for a kind, as [subject, plain text, html]. */
    public static function message($kind, $user, $course, $deadline) {
        $coursename = format_string($course->fullname);
        $date = userdate($deadline, get_string('strftimedate'), \core_date::get_user_timezone($user));
        $url = (string)get_config('local_enrolexpiry', 'purchaseurl') ?: 'https://cataxcourses.com/';
        $login = (new \moodle_url('/course/view.php', ['id' => $course->id]))->out(false);
        if ($kind === 'expired') {
            $subject = "Your one-year access to $coursename has ended";
            $lines = [
                "Hello {$user->firstname},",
                "It has been one year since you enrolled in $coursename. Your enrolment included one year to complete the course, " .
                    "so the course exams are now closed and you can no longer continue the course.",
                "To finish your Qualifying Education, please purchase the current 60 Hour course: $url",
                "Thank you,\nCalifornia Tax Courses",
            ];
        } else {
            $days = self::REMINDERS[$kind];
            $subject = "$days days left to finish $coursename";
            $lines = [
                "Hello {$user->firstname},",
                "This is a reminder that your enrolment in $coursename includes one year to complete the course. " .
                    "On $date the course exams will close and you will no longer be able to continue the course.",
                "If you have not finished by then, you will need to purchase the new course to complete your Qualifying Education.",
                "Continue your course here: $login",
                "Thank you,\nCalifornia Tax Courses",
            ];
        }
        $text = implode("\n\n", $lines);
        $html = '';
        foreach ($lines as $line) {
            $html .= '<p>' . nl2br(s($line)) . '</p>';
        }
        $html = preg_replace('~(https?://[^\s<]+)~', '<a href="$1">$1</a>', $html);
        return [$subject, $text, $html];
    }

    /**
     * Apply the rule to every covered enrolment. Returns counts. With $dryrun nothing is changed or sent;
     * the would-be actions are returned in 'preview'.
     */
    public static function run($dryrun = false, $now = null) {
        global $DB;
        $now = $now ?: time();
        $counts = ['enrolments' => 0, 'overrides' => 0, 'emails' => 0, 'preview' => []];
        if (!get_config('local_enrolexpiry', 'enabled')) {
            return $counts;
        }
        $courses = self::courses();
        $from = \core_user::get_support_user();
        foreach (self::enrolments() as $e) {
            $counts['enrolments']++;
            $deadline = self::deadline($e);
            if (!$dryrun) {
                $counts['overrides'] += self::close_exams($e->userid, $e->courseid, $deadline);
            }
            if (self::completed($e->userid, $e->courseid)) {
                continue; // Finished students get no reminders.
            }
            $sent = $DB->get_fieldset_select('local_enrolexpiry_sent', 'kind', 'userid = ? AND courseid = ?', [$e->userid, $e->courseid]);
            $kind = self::due_kind($deadline, $now, $sent);
            if (!$kind) {
                continue;
            }
            $user = $DB->get_record('user', ['id' => $e->userid, 'deleted' => 0, 'suspended' => 0]);
            if (!$user) {
                continue;
            }
            if ($dryrun) {
                $counts['preview'][] = [$user, $courses[$e->courseid], $kind, $deadline];
                continue;
            }
            list($subject, $text, $html) = self::message($kind, $user, $courses[$e->courseid], $deadline);
            if (email_to_user($user, $from, $subject, $text, $html)) {
                // Record the earlier reminders too, so a late start never sends them afterwards.
                $kinds = $kind === 'expired' ? array_merge(array_keys(self::REMINDERS), ['expired']) : [$kind];
                foreach (array_keys(self::REMINDERS) as $k) {
                    if ($kind !== 'expired' && self::REMINDERS[$k] > self::REMINDERS[$kind]) {
                        $kinds[] = $k;
                    }
                }
                foreach (array_unique($kinds) as $k) {
                    if (!in_array($k, $sent)) {
                        $DB->insert_record('local_enrolexpiry_sent', (object)['userid' => $e->userid,
                            'courseid' => $e->courseid, 'kind' => $k, 'timesent' => $now]);
                    }
                }
                $counts['emails']++;
            }
        }
        return $counts;
    }
}
