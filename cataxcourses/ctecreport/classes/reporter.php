<?php
namespace local_ctecreport;

defined('MOODLE_INTERNAL') || die();

/**
 * Builds the CTEC roster record for a course completion and posts it to the CTEC Education API.
 */
class reporter {

    const ENDPOINT_LIVE = 'https://provider.ctec.org/api/CTECEducation';
    const ENDPOINT_TEST = 'https://provider.ctec.org/api/CTECEducationTest';
    const MAX_ATTEMPTS = 20;
    const TIMEZONE = 'America/Los_Angeles';
    // QE start date and scores become required for completions on or after this date.
    const QE_REQUIRED_FROM = '2027-01-01';

    /**
     * Moodle course id => CTEC course number, from the plugin settings.
     * @return array
     */
    public static function course_map() {
        $map = [];
        $raw = (string)get_config('local_ctecreport', 'coursemap');
        foreach (preg_split('/\R/', $raw) as $line) {
            if (preg_match('/^\s*(\d+)\s*=\s*([A-Za-z0-9-]+)\s*$/', $line, $m)) {
                $map[(int)$m[1]] = strtoupper($m[2]);
            }
        }
        return $map;
    }

    /**
     * Record a completion for reporting. Returns null if the course is not mapped or already recorded.
     */
    public static function queue($userid, $courseid, $timecompleted) {
        global $DB;
        $map = self::course_map();
        if (empty($map[$courseid])) {
            return null;
        }
        if ($DB->record_exists('local_ctecreport_log', ['userid' => $userid, 'courseid' => $courseid])) {
            return null;
        }
        $now = time();
        $rec = (object)[
            'userid' => $userid,
            'courseid' => $courseid,
            'coursenumber' => $map[$courseid],
            'timecompleted' => $timecompleted,
            'status' => 'pending',
            'attempts' => 0,
            'timecreated' => $now,
            'timemodified' => $now,
        ];
        $rec->id = $DB->insert_record('local_ctecreport_log', $rec);
        return $rec;
    }

    /** Uppercase and strip spaces/dashes; returns '' unless it looks like a CTEC ID (A123456). */
    public static function normalise_ctecid($value) {
        $id = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', (string)$value));
        return preg_match('/^[A-Z]\d{6}$/', $id) ? $id : '';
    }

    /**
     * Find the student's CTEC ID: a 'ctecid' profile field if the site has one, otherwise their latest
     * answer to a "CTEC ID" question in a feedback form in this course, then in any course.
     */
    public static function find_ctecid($userid, $courseid, $allowlookup = true) {
        global $DB;
        $sql = "SELECT d.data
                  FROM {user_info_data} d
                  JOIN {user_info_field} f ON f.id = d.fieldid
                 WHERE d.userid = :userid AND f.shortname = 'ctecid'";
        if ($value = $DB->get_field_sql($sql, ['userid' => $userid], IGNORE_MULTIPLE)) {
            if ($id = self::normalise_ctecid($value)) {
                return $id;
            }
        }
        $like = $DB->sql_like('fi.name', ':pattern', false);
        $base = "SELECT fv.id, fv.value, f.course
                   FROM {feedback_value} fv
                   JOIN {feedback_item} fi ON fi.id = fv.item
                   JOIN {feedback} f ON f.id = fi.feedback
                   JOIN {feedback_completed} fc ON fc.id = fv.completed
                  WHERE fc.userid = :userid AND $like
               ORDER BY fc.timemodified DESC, fv.id DESC";
        $rows = $DB->get_records_sql($base, ['userid' => $userid, 'pattern' => '%CTEC ID%']);
        // Prefer an answer given in this course.
        foreach ([true, false] as $samecourse) {
            foreach ($rows as $row) {
                if ($samecourse && (int)$row->course !== (int)$courseid) {
                    continue;
                }
                if ($id = self::normalise_ctecid($row->value)) {
                    return $id;
                }
            }
        }
        // No valid answer: try repairing one typed without the leading A, if CTEC confirms it is this student.
        foreach ([true, false] as $samecourse) {
            foreach ($rows as $row) {
                if ($samecourse && (int)$row->course !== (int)$courseid) {
                    continue;
                }
                if ($id = self::repair_ctecid($userid, $row->value, $allowlookup)) {
                    return $id;
                }
            }
        }
        return '';
    }

    /** "A" + the digits when the answer is just 6 digits (e.g. 353408 or 353-408), otherwise ''. */
    public static function add_missing_a($value) {
        $plain = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', (string)$value));
        return preg_match('/^\d{6}$/', $plain) ? 'A' . $plain : '';
    }

    /**
     * Look a CTEC ID up with CTEC's public API, cached. Returns ['status' => found|notfound|error, 'name' => ...].
     * With $allowlookup false only the cache is used (status 'unknown' when not cached).
     */
    public static function lookup($ctecid, $allowlookup = true) {
        global $DB, $CFG;
        $cached = $DB->get_record('local_ctecreport_idcheck', ['ctecid' => $ctecid]);
        if ($cached && $cached->timechecked > time() - 30 * DAYSECS) {
            return ['status' => $cached->status, 'name' => (string)$cached->name];
        }
        if (!$allowlookup) {
            return ['status' => 'unknown', 'name' => ''];
        }
        require_once($CFG->libdir . '/filelib.php');
        $curl = new \curl(['ignoresecurity' => true]);
        $body = (string)$curl->get('https://provider.ctec.org/api/CTECIDLookup/' . rawurlencode($ctecid), [],
            ['CURLOPT_TIMEOUT' => 15, 'CURLOPT_CONNECTTIMEOUT' => 10]);
        $info = $curl->get_info();
        if (!$curl->get_errno() && !empty($info['http_code']) && $info['http_code'] == 200
                && preg_match('/Name associated with CTECID [A-Z0-9]+:\s*(.+)/i', $body, $m)) {
            $result = ['status' => 'found', 'name' => trim($m[1], " \t\n\r\"}")];
        } else if (preg_match('/No CTEC record found|Invalid CTECID/i', $body)) {
            $result = ['status' => 'notfound', 'name' => ''];
        } else {
            return ['status' => 'error', 'name' => ''];
        }
        $rec = (object)['ctecid' => $ctecid, 'status' => $result['status'], 'name' => $result['name'], 'timechecked' => time()];
        if ($cached) {
            $rec->id = $cached->id;
            $DB->update_record('local_ctecreport_idcheck', $rec);
        } else {
            $DB->insert_record('local_ctecreport_idcheck', $rec);
        }
        return $result;
    }

    /** Uppercase letter words of a name, accents and punctuation removed. */
    protected static function name_words($name) {
        $name = \core_text::strtoupper(\core_text::specialtoascii((string)$name));
        return array_values(array_filter(preg_split('/[^A-Z]+/', $name), function($w) {
            return strlen($w) >= 2;
        }));
    }

    /** True when CTEC's preparer name shares the student's first name and one of their last-name words. */
    public static function name_matches($user, $ctecname) {
        $ctec = self::name_words($ctecname);
        $first = self::name_words($user->firstname);
        $last = self::name_words($user->lastname);
        if (!$ctec || !$first || !$last) {
            return false;
        }
        return in_array($first[0], $ctec) && (bool)array_intersect($last, $ctec);
    }

    /** The repaired ID for an answer typed without its leading A, only if CTEC says it belongs to this student. */
    public static function repair_ctecid($userid, $value, $allowlookup = true) {
        global $DB;
        $candidate = self::add_missing_a($value);
        if ($candidate === '') {
            return '';
        }
        $result = self::lookup($candidate, $allowlookup);
        if ($result['status'] !== 'found') {
            return '';
        }
        $user = $DB->get_record('user', ['id' => $userid], 'id, firstname, lastname');
        return $user && self::name_matches($user, $result['name']) ? $candidate : '';
    }

    /** Best grade on each exam, as a whole-number percentage, keyed state/federal/ethics. */
    public static function exam_scores($userid, $courseid) {
        global $DB;
        $sql = "SELECT q.id, q.name, q.grade AS maxgrade, qg.grade
                  FROM {quiz} q
                  JOIN {quiz_grades} qg ON qg.quiz = q.id AND qg.userid = :userid
                 WHERE q.course = :courseid";
        $grades = $DB->get_records_sql($sql, ['userid' => $userid, 'courseid' => $courseid]);
        $scores = ['state' => null, 'federal' => null, 'ethics' => null];
        foreach ($scores as $key => $unused) {
            $pattern = trim((string)get_config('local_ctecreport', $key . 'quiz'));
            if ($pattern === '') {
                continue;
            }
            foreach ($grades as $g) {
                if ($g->maxgrade > 0 && stripos($g->name, $pattern) !== false) {
                    $pct = (int)round($g->grade / $g->maxgrade * 100);
                    $scores[$key] = max((int)$scores[$key], $pct);
                }
            }
        }
        return $scores;
    }

    /** Earliest enrolment date in the course (CTEC "course start or purchased date"). */
    public static function start_time($userid, $courseid) {
        global $DB;
        $sql = "SELECT MIN(CASE WHEN ue.timestart > 0 THEN ue.timestart ELSE ue.timecreated END)
                  FROM {user_enrolments} ue
                  JOIN {enrol} e ON e.id = ue.enrolid
                 WHERE e.courseid = :courseid AND ue.userid = :userid";
        return (int)$DB->get_field_sql($sql, ['userid' => $userid, 'courseid' => $courseid]);
    }

    public static function format_date($timestamp) {
        return userdate($timestamp, '%Y-%m-%d', self::TIMEZONE, false);
    }

    /**
     * Build the JSON body for CTEC. Returns [payload array, problem string or ''].
     */
    public static function build_payload($rec) {
        $ctecid = !empty($rec->ctecidmanual) ? self::normalise_ctecid($rec->ctecidmanual)
            : self::find_ctecid($rec->userid, $rec->courseid);
        if ($ctecid === '') {
            return [null, 'No valid CTEC ID found for this student. Enter it below and click Send.'];
        }
        $completiondate = self::format_date($rec->timecompleted);
        $payload = [
            'ctecid' => $ctecid,
            'coursenumber' => $rec->coursenumber,
            'completiondate' => $completiondate,
        ];
        if (strpos($rec->coursenumber, '-QE-') !== false) {
            $start = self::start_time($rec->userid, $rec->courseid);
            $startdate = $start ? self::format_date($start) : null;
            $scores = self::exam_scores($rec->userid, $rec->courseid);
            $qe = [
                'qestartdate' => $startdate,
                'qestatescore' => $scores['state'],
                'qefederalscore' => $scores['federal'],
                'qeethicsscore' => $scores['ethics'],
            ];
            $valid = $startdate && $startdate < $completiondate;
            foreach ($scores as $score) {
                $valid = $valid && $score !== null && $score >= 70 && $score <= 100;
            }
            // Before CTEC requires the QE fields, leave them out rather than send values CTEC would reject.
            if ($valid || $completiondate >= self::QE_REQUIRED_FROM) {
                $payload += $qe;
            }
        }
        return [$payload, ''];
    }

    /** True when the plugin is set to report to CTEC's live roster. */
    public static function is_live() {
        return get_config('local_ctecreport', 'mode') === 'live';
    }

    /**
     * POST a body to CTEC. Returns [http code, response body, curl error string].
     */
    public static function post(array $payload, $live) {
        global $CFG;
        require_once($CFG->libdir . '/filelib.php');
        $username = (string)get_config('local_ctecreport', 'username');
        $password = (string)get_config('local_ctecreport', 'password');
        $curl = new \curl(['ignoresecurity' => true]);
        $curl->setHeader([
            'Content-Type: application/json',
            'Accept: application/json',
            'Authorization: Basic ' . base64_encode($username . ':' . $password),
        ]);
        $body = $curl->post($live ? self::ENDPOINT_LIVE : self::ENDPOINT_TEST, json_encode($payload),
            ['CURLOPT_TIMEOUT' => 30, 'CURLOPT_CONNECTTIMEOUT' => 15]);
        $info = $curl->get_info();
        $code = isset($info['http_code']) ? (int)$info['http_code'] : 0;
        $error = $curl->get_errno() ? $curl->error : '';
        return [$code, (string)$body, $error];
    }

    /**
     * Classify a CTEC reply: 'sent', 'duplicate', 'retry' (temporary) or 'error' (needs an admin).
     */
    public static function classify($code, $body, $error) {
        $json = json_decode($body, true);
        $message = is_array($json) && isset($json['message']) ? (string)$json['message'] : '';
        $err = is_array($json) && isset($json['error']) ? (string)$json['error'] : '';
        if ($code == 200 && stripos($message, 'added successfully') !== false) {
            return 'sent';
        }
        if (stripos($err, 'already exists') !== false) {
            return 'duplicate';
        }
        if ($error !== '' || $code == 0 || $code >= 500 || $code == 401 || $code == 429) {
            return 'retry';
        }
        return 'error';
    }

    /**
     * Build and send one log row, saving the outcome. Returns the updated row.
     */
    public static function process($rec) {
        global $DB;
        $rec->attempts++;
        $rec->timemodified = time();
        list($payload, $problem) = self::build_payload($rec);
        if (!$payload) {
            $rec->status = 'error';
            $rec->response = $problem;
            $rec->httpcode = null;
            $DB->update_record('local_ctecreport_log', $rec);
            return $rec;
        }
        $live = self::is_live();
        list($code, $body, $error) = self::post($payload, $live);
        $status = self::classify($code, $body, $error);
        if ($status === 'sent' && !$live) {
            $status = 'test_ok';
        }
        if ($status === 'retry' && $rec->attempts >= self::MAX_ATTEMPTS) {
            $status = 'error';
        }
        $rec->ctecid = $payload['ctecid'];
        $rec->payload = json_encode($payload);
        $rec->endpoint = $live ? 'live' : 'test';
        $rec->httpcode = $code;
        $rec->response = $error !== '' ? $error : $body;
        $rec->status = $status;
        $DB->update_record('local_ctecreport_log', $rec);
        return $rec;
    }
}
