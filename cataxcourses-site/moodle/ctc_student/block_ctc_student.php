<?php
// The student dashboard: current course up top, previous courses tucked away, certificates by year,
// CTEC reporting status and the CTEC ID / PTIN box.
defined('MOODLE_INTERNAL') || die();
require_once(__DIR__ . '/lib.php');

class block_ctc_student extends block_base {
    public function init() { $this->title = get_string('pluginname', 'block_ctc_student'); }
    public function applicable_formats() { return ['my' => true]; }
    public function instance_allow_multiple() { return false; }
    public function hide_header() { return true; }
    public function has_config() { return false; }

    public function get_content() {
        global $USER, $DB;
        if ($this->content !== null) {
            return $this->content;
        }
        $this->content = (object) ['text' => '', 'footer' => ''];
        $uid = $USER->id;
        // Site admins can preview a student's dashboard: /my/?ctcpreview=<user id>.
        $preview = optional_param('ctcpreview', 0, PARAM_INT);
        if ($preview && is_siteadmin()) {
            $uid = $preview;
        } else if (!block_ctc_student_is_student()) {
            $this->content->text = '<div class="text-muted small">Student dashboard (students see their courses, certificates and CTEC status here). '
                . 'Preview as a student: add <code>?ctcpreview=USERID</code> to this page address.</div>';
            return $this->content;
        }
        $this->content->text = self::render($uid);
        return $this->content;
    }

    public static function render($uid) {
        global $DB;
        $u = $DB->get_record('user', ['id' => $uid], 'id, firstname, lastname', MUST_EXIST);
        $c = block_ctc_student_courses($uid);
        $certs = block_ctc_student_certificates($uid);
        $reports = block_ctc_student_reports($uid);
        $mapped = block_ctc_student_mapped();
        list(, $ctecid) = block_ctc_student_field($uid, 'CTECID');
        list(, $ptin) = block_ctc_student_field($uid, 'ptin');
        $ctecidok = block_ctc_student_norm_ctecid($ctecid) !== '';
        $ptinok = block_ctc_student_norm_ptin($ptin) !== '';
        $fmt = function ($t) { return userdate($t, '%B %e, %Y'); };
        $h = '';
        $flash = optional_param('ctcmsg', '', PARAM_ALPHA);
        $flashes = ['saved' => ['ok', 'Thank you! Your CTEC ID and PTIN are saved.'], 'savedretry' => ['ok', 'Thank you! Your CTEC ID is saved and we are sending your completed course hours to CTEC again.']];
        if (isset($flashes[$flash])) {
            $h .= '<div class="ctcsd-flash ctcsd-' . $flashes[$flash][0] . '">' . $flashes[$flash][1] . '</div>';
        }
        $h .= '<div class="ctcsd-hello"><h2>Welcome back, ' . s($u->firstname) . '</h2></div>';
        if (!$ctecidok || !$ptinok) {
            $h .= '<a class="ctcsd-action" href="#ctc-ids"><span class="ctcsd-action-i">!</span><span><strong>Action needed:</strong> enter your '
                . (!$ctecidok && !$ptinok ? 'CTEC ID and PTIN' : (!$ctecidok ? 'CTEC ID' : 'PTIN')) . ' so we can report your hours to CTEC.</span><span class="ctcsd-action-go">Enter now →</span></a>';
        }

        $kinds = [];
        foreach ($c['current'] as $co) {
            if (preg_match('/\b20\s*Hour/i', $co->fullname)) { $kinds['20'] = true; }
            if (preg_match('/\b60\s*Hour/i', $co->fullname)) { $kinds['60'] = true; }
        }

        // 1. Deadline strip (20 Hour students only, until the late-renewal cut-off). Regular deadline Mon Nov 2, 2026;
        // late renewal with the late fee through Fri Jan 15, 2027, after which the registration lapses. Pacific time.
        $now = time();
        $regend = 1793692800;  // 2026-11-03 00:00 PST
        $lateend = 1800086400; // 2027-01-16 00:00 PST
        if (!empty($kinds['20']) && $now < $lateend) {
            $late = $now >= $regend;
            $h .= '<div class="ctcsd-strip ctcsd-cd" data-end="' . ($late ? $lateend : $regend) . '"><span class="ctcsd-strip-dot"></span><span class="ctcsd-strip-t">'
                . ($late ? '<strong>CTEC late renewal is open until Jan 15, 2027.</strong> The Nov 2 deadline passed; you can still renew with a late fee. After Jan 15 your registration lapses.'
                    : '<strong>Today is the last day to renew with CTEC without a late fee.</strong> After today you can renew until Jan 15, 2027 with a late fee.')
                . '</span><span class="ctcsd-strip-cd" aria-label="Time left"><span><b data-u="d">–</b> days</span><span><b data-u="h">–</b> h</span><span><b data-u="m">–</b> m</span></span>'
                . '<a href="https://www.ctec.org" target="_blank" rel="noopener">Renew at ctec.org →</a></div>';
        }

        // 2. Current course(s).
        $h .= '<section id="ctc-courses" class="ctcsd-sec">';
        if (!$c['current']) {
            $h .= '<div class="ctcsd-card ctcsd-empty">You are not enrolled in a course yet. <a href="https://cataxcourses.com/" target="_blank" rel="noopener">Browse CTEC courses →</a></div>';
        }
        foreach ($c['current'] as $i => $co) {
            $pct = $co->progress;
            $h .= '<div class="ctcsd-hero' . ($i ? ' ctcsd-hero-sm' : '') . '"><div class="ctcsd-hero-main">'
                . ($co->completed ? '<span class="ctcsd-pill ctcsd-pill-ok">✓ Completed</span>' : '<span class="ctcsd-pill">In progress</span>')
                . '<h3><a href="' . s($co->url) . '">' . s($co->name) . '</a></h3>';
            if ($pct !== null) {
                $h .= '<div class="ctcsd-bar" role="progressbar" aria-valuenow="' . $pct . '" aria-valuemin="0" aria-valuemax="100"><span style="width:' . max(2, $pct) . '%"></span></div>'
                    . '<div class="ctcsd-bar-l">' . ($co->completed ? 'Completed ' . $fmt($co->completed) : $pct . '% complete') . '</div>';
            }
            $h .= '</div><div class="ctcsd-hero-act"><a class="ctcsd-btn" href="' . s($co->url) . '">' . ($co->completed ? 'Open course' : ($pct ? 'Continue course' : 'Start course')) . ' →</a>';
            foreach ($certs as $ce) {
                if ($ce->name === $co->name && $ce->url) {
                    $h .= '<a class="ctcsd-btn ctcsd-btn-2" href="' . s($ce->url) . '">⬇ Certificate</a>';
                    break;
                }
            }
            $h .= '</div></div>';
        }
        $h .= '</section><div class="ctcsd-cols"><div class="ctcsd-colmain">';

        // 3. Records: Certificates | Previous courses (tabs).
        $h .= '<section id="ctc-certificates" class="ctcsd-sec"><div class="ctcsd-card ctcsd-rec"><div class="ctcsd-tabs" role="tablist">'
            . '<button type="button" role="tab" class="ctcsd-tab on" data-tab="certs">Certificates <span class="ctcsd-count">' . count($certs) . '</span></button>'
            . '<button type="button" role="tab" class="ctcsd-tab" data-tab="prev">Previous courses <span class="ctcsd-count">' . count($c['previous']) . '</span></button></div>';
        $h .= '<div class="ctcsd-panel" data-panel="certs">';
        if (!$certs) {
            $h .= '<p class="ctcsd-empty">Your certificate appears here as soon as you pass all of the exams in a course.</p>';
        } else {
            $byyear = [];
            foreach ($certs as $ce) {
                $byyear[$ce->year][] = $ce;
            }
            krsort($byyear);
            foreach ($byyear as $y => $list) {
                $h .= '<div class="ctcsd-yr">' . ($y ?: 'Other') . '</div>';
                foreach ($list as $ce) {
                    $h .= '<div class="ctcsd-li"><div><div class="ctcsd-li-t">' . s($ce->name) . '</div><div class="ctcsd-meta">Issued ' . userdate($ce->issued, '%b %e, %Y') . '</div></div>'
                        . ($ce->url ? '<a href="' . s($ce->url) . '">⬇ Download</a>' : '') . '</div>';
                }
            }
        }
        $h .= '</div><div class="ctcsd-panel" data-panel="prev" id="ctc-previous" hidden>';
        if (!$c['previous']) {
            $h .= '<p class="ctcsd-empty">No courses from previous years.</p>';
        }
        foreach ($c['previous'] as $co) {
            $h .= '<div class="ctcsd-li"><div><div class="ctcsd-li-t">' . s($co->name) . '</div><div class="ctcsd-meta">' . ($co->year ?: '')
                . ($co->completed ? ' · Completed ' . userdate($co->completed, '%b %e, %Y') : '') . '</div></div><a href="' . s($co->url) . '">Open →</a></div>';
        }
        $h .= '</div></div></section></div><div class="ctcsd-colside">';

        // 4. CTEC status: reporting + CTEC ID & PTIN.
        $cur = $c['current'] ? $c['current'][0] : null;
        $curmapped = array_filter($c['current'], function ($co) use ($mapped) { return !empty($mapped[$co->id]); });
        $main = $curmapped ? reset($curmapped) : $cur;
        $rep = $main ? ($reports[$main->id] ?? null) : null;
        $editing = !$ctecidok || !$ptinok;
        $problem = $rep && $rep->state === 'problem';
        if ($rep && $rep->state === 'reported') {
            $st = ['ok', '✓', 'Reported to CTEC', s($rep->course) . ' · ' . userdate($rep->time, '%b %e, %Y') . '. CTEC usually shows new hours within a few business days.'];
        } else if ($problem) {
            $st = ['bad', '!', 'We couldn\'t report your hours yet', 'CTEC did not accept the report, usually because of a missing or mistyped CTEC ID. Check it below and save; we\'ll send your hours again automatically.'];
        } else if ($rep) {
            $st = ['wait', '⏳', 'Sending your hours to CTEC', s($rep->course) . ' · completed ' . userdate($rep->completed, '%b %e, %Y') . '.'];
        } else if ($main && $main->completed) {
            $st = ['wait', '✓', 'Course completed', s($main->name) . ' · ' . userdate($main->completed, '%b %e, %Y') . '. Questions? Call (888) 229-1994.'];
        } else {
            $st = ['todo', '○', 'Not reported yet', 'We report your hours to CTEC automatically when you finish your course.'];
        }
        $h .= '<section id="ctc-ctec" class="ctcsd-sec"><div class="ctcsd-card' . ($editing || $problem ? ' ctcsd-need' : '') . '" id="ctc-ids"><div class="ctcsd-eyebrow">CTEC reporting</div>'
            . '<div class="ctcsd-st ctcsd-st-' . $st[0] . '"><div class="ctcsd-st-i">' . $st[1] . '</div><div><h3>' . $st[2] . '</h3><p>' . $st[3] . '</p></div></div>';
        if (!$editing) {
            $h .= '<div class="ctcsd-kv"><span>CTEC ID</span><strong>' . s(block_ctc_student_norm_ctecid($ctecid)) . '</strong></div>'
                . '<div class="ctcsd-kv"><span>PTIN</span><strong>P••••' . s(substr(block_ctc_student_norm_ptin($ptin), -4)) . '</strong></div>';
            if (!$problem) {
                $h .= '<button type="button" class="ctcsd-link" onclick="this.parentNode.querySelector(\'form\').hidden=false;this.hidden=true">Change CTEC ID or PTIN</button>';
            }
        } else {
            $h .= '<p class="ctcsd-need-t">' . (!$ctecidok && !$ptinok ? 'Please enter your CTEC ID and PTIN.' : 'Please enter your ' . (!$ctecidok ? 'CTEC ID.' : 'PTIN.')) . ' We need them to report your hours to CTEC.</p>';
        }
        $h .= '<form class="ctcsd-ids" method="post" action="' . (new moodle_url('/blocks/ctc_student/save.php'))->out(false) . '"' . ($editing || $problem ? '' : ' hidden') . '>'
            . '<input type="hidden" name="sesskey" value="' . sesskey() . '"><input type="hidden" name="uid" value="' . $uid . '">'
            . '<label>CTEC ID<input name="ctecid" value="' . s($ctecidok ? block_ctc_student_norm_ctecid($ctecid) : '') . '" placeholder="A123456" maxlength="12" autocomplete="off" required pattern="\s*[Aa]?\s*\d{6}\s*"></label>'
            . '<span class="ctcsd-hint">The letter A and 6 digits, e.g. A123456. Don\'t know it? Log in at <a href="https://www.ctec.org" target="_blank" rel="noopener">ctec.org</a>.</span>'
            . '<label>PTIN<input name="ptin" value="" placeholder="' . ($ptinok ? 'P••••' . s(substr(block_ctc_student_norm_ptin($ptin), -4)) . ' (leave blank to keep)' : 'P12345678') . '" maxlength="12" autocomplete="off"' . ($ptinok ? '' : ' required') . ' pattern="\s*[Pp]?\s*\d{8}\s*"></label>'
            . '<span class="ctcsd-hint">The letter P and 8 digits, e.g. P12345678.</span>'
            . '<button class="ctcsd-btn" type="submit">Save</button></form>';
        $older = array_filter($reports, function ($r) use ($main) { return $r->state === 'reported' && (!$main || $r->courseid !== $main->id); });
        if ($older) {
            $h .= '<details class="ctcsd-older"><summary>Earlier CTEC reports (' . count($older) . ')</summary>';
            foreach ($older as $r) {
                $h .= '<div class="ctcsd-kv"><span>✓ ' . s($r->course) . '</span><span>' . userdate($r->time, '%b %e, %Y') . '</span></div>';
            }
            $h .= '</details>';
        }
        $h .= '</div></section>';

        // 5. Next steps checklist (20 Hour: renewal; 60 Hour: registration).
        $reported = $rep && $rep->state === 'reported';
        $item = function ($state, $t, $sub = '') {
            return '<li><span class="ctcsd-ck-b ctcsd-ck-' . $state . '">' . ($state === 'done' ? '✓' : '') . '</span><div>' . $t . ($sub ? '<small>' . $sub . '</small>' : '') . '</div></li>';
        };
        foreach (['20', '60'] as $k) {
            if (empty($kinds[$k])) {
                continue;
            }
            $co = null;
            foreach ($c['current'] as $x) {
                if (preg_match('/\b' . $k . '\s*Hour/i', $x->fullname)) { $co = $x; break; }
            }
            $r = $co ? ($reports[$co->id] ?? null) : null;
            $done = $co && $co->completed;
            $rep2 = $r && $r->state === 'reported';
            $h .= '<section class="ctcsd-sec" id="ctc-next-' . $k . '"><div class="ctcsd-card"><div class="ctcsd-eyebrow">' . ($k === '20' ? 'Your renewal checklist' : 'Your CTEC registration checklist') . '</div><ul class="ctcsd-ck">'
                . $item($done ? 'done' : 'now', 'Finish your ' . $k . ' Hour course', $done ? 'Completed ' . userdate($co->completed, '%b %e, %Y') : (($co && $co->progress !== null ? $co->progress : 0) . '% complete'))
                . $item($rep2 ? 'done' : ($done ? 'now' : 'todo'), 'Hours reported to CTEC', $rep2 ? 'Reported ' . userdate($r->time, '%b %e, %Y') : 'Automatic when you finish');
            if ($k === '20') {
                $h .= $item($rep2 ? 'now' : 'todo', 'Renew &amp; pay your fee at ctec.org', 'Required to complete your renewal')
                    . $item('todo', 'Renew your PTIN with the IRS', 'Every year, for the coming tax season');
            } else {
                $h .= $item('todo', 'Get your PTIN from the IRS')
                    . $item('todo', 'Buy a $5,000 tax preparer bond')
                    . $item($rep2 ? 'now' : 'todo', 'Register with CTEC &amp; pay the fee', 'Within 18 months of finishing the course');
            }
            $h .= '</ul><a class="ctcsd-link" href="https://cataxcourses.com/what-to-do-after-completing-the-' . $k . '-hour-course/" target="_blank" rel="noopener">Full guide: how to '
                . ($k === '20' ? 'renew' : 'register') . ' with CTEC →</a></div></section>';
        }

        // 6. Book.
        $h .= '<a class="ctcsd-book" href="https://cataxcourses.com/book-add-ons/" target="_blank" rel="noopener"><span class="ctcsd-book-i">📘</span><span class="ctcsd-book-t"><strong>Want the printed course book?</strong><span>Take notes as you go and study for your exams</span></span><span class="ctcsd-book-go">Shop →</span></a>';
        $h .= '</div></div>';

        return '<div class="ctcsd">' . self::css() . $h . self::js() . '</div>';
    }

    private static function css() {
        return '<style>
.block_myoverview,.block_lp,.block_recentlyaccessedcourses,.block_completeyourprofile{display:none!important}
body.ctcsd-wide #region-main.has-blocks{flex:0 0 100%!important;max-width:100%!important;width:100%!important}body.ctcsd-wide #block-region-side-pre{display:none!important}body.ctcsd-wide .ctcsd-sidecol{display:none!important}
.block_ctc_student .card-body{padding:0}.block_ctc_student.card{border:0;background:none;box-shadow:none}
.ctcsd{--n:#1d2939;--g:#d4a72c;--gt:#b8901f;--a:#0b6bcb;--ok:#12805c;--okb:#e8f6ef;--bad:#b42318;--badb:#fef0ee;--l:#e4e7ec;--m:#667085;font-size:15px;color:#1d2939;max-width:1120px}
.ctcsd *{box-sizing:border-box}
.ctcsd-hello h2{font-size:1.6rem;font-weight:600;margin:0 0 16px}
.ctcsd-eyebrow{font-size:.72rem;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--m);margin:0 0 10px}
.ctcsd-sec{margin:0 0 20px;scroll-margin-top:90px}
.ctcsd-card{background:#fff;border:1px solid var(--l);border-radius:14px;padding:22px}
.ctcsd-empty{color:var(--m);margin:14px 0 4px}
.ctcsd-flash{border-radius:10px;padding:12px 16px;margin:0 0 14px;font-weight:600}.ctcsd-ok{background:var(--okb);color:var(--ok)}
.ctcsd-action{display:flex;align-items:center;gap:12px;background:#fff6e5;border:1px solid #fedf89;color:#7a2e0e!important;border-radius:12px;padding:12px 16px;margin:0 0 16px;text-decoration:none!important}
.ctcsd-action-i{flex:none;width:24px;height:24px;border-radius:50%;background:#b54708;color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center}
.ctcsd-action-go{margin-left:auto;font-weight:700;white-space:nowrap}
.ctcsd-strip{display:flex;align-items:center;gap:14px;background:#fff6e5;border:1px solid #fedf89;border-radius:12px;padding:12px 16px;margin:0 0 16px;color:#7a2e0e;font-size:.92rem;line-height:1.45}
.ctcsd-strip-dot{width:10px;height:10px;border-radius:50%;background:#f79009;flex:none;box-shadow:0 0 0 4px rgba(247,144,9,.18)}
.ctcsd-strip-t{flex:1}.ctcsd-strip-cd{display:flex;gap:6px;flex:none}.ctcsd-strip-cd>span{background:#fff;border:1px solid #fedf89;border-radius:8px;padding:4px 9px;font-size:.82rem;white-space:nowrap}
.ctcsd-strip-cd b{font-weight:800;font-variant-numeric:tabular-nums}.ctcsd-strip a{color:#7a2e0e!important;font-weight:700;white-space:nowrap}
.ctcsd-hero{display:flex;gap:24px;align-items:center;padding:28px;margin-bottom:12px;background:#1d2939;border-radius:16px;color:#fff}
.ctcsd-hero-main{flex:1;min-width:0}.ctcsd-hero h3{font-size:1.45rem;font-weight:600;margin:10px 0 14px;line-height:1.25}.ctcsd-hero h3 a{color:#fff!important}
.ctcsd-hero-sm{padding:18px 22px;background:#344054}.ctcsd-hero-sm h3{font-size:1.1rem}
.ctcsd-hero-act{display:flex;flex-direction:column;gap:8px;flex:none}
.ctcsd-pill{display:inline-block;font-size:.72rem;font-weight:700;padding:3px 10px;border-radius:99px;background:rgba(255,255,255,.14);color:#fff}.ctcsd-pill-ok{background:var(--ok)}
.ctcsd-bar{height:9px;background:rgba(255,255,255,.2);border-radius:99px;overflow:hidden}.ctcsd-bar span{display:block;height:100%;background:var(--g);border-radius:99px}
.ctcsd-bar-l{font-size:.85rem;color:#d0d5dd;margin-top:6px}
.ctcsd-btn{display:inline-block;background:var(--g);color:#fff!important;border:0;border-radius:10px;padding:13px 24px;font-weight:700;text-align:center;text-decoration:none!important;cursor:pointer;font-size:1rem;white-space:nowrap}
.ctcsd-btn:hover{filter:brightness(.93)}.ctcsd-btn-2{background:transparent;border:1px solid rgba(255,255,255,.5)}
.ctcsd-cols{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(0,1fr);gap:20px;align-items:start;margin-top:8px}
.ctcsd-rec{padding-top:6px}
.ctcsd-tabs{display:flex;gap:4px;border-bottom:1px solid var(--l);margin:0 -22px 4px;padding:0 22px}
.ctcsd-tab{background:none;border:0;border-bottom:2px solid transparent;margin-bottom:-1px;padding:12px 14px;font-weight:600;color:var(--m);cursor:pointer;font-size:.95rem}
.ctcsd-tab.on{color:var(--n);border-color:var(--g)}
.ctcsd-count{font-size:.7rem;background:#f2f4f7;border-radius:99px;padding:1px 7px;margin-left:4px;color:var(--m);font-weight:700}
.ctcsd-yr{font-size:.72rem;font-weight:700;color:var(--m);letter-spacing:.06em;padding:14px 0 2px}
.ctcsd-li{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid #f2f4f7}.ctcsd-li:last-child{border:0}
.ctcsd-li-t{font-weight:500}.ctcsd-meta{color:var(--m);font-size:.82rem}.ctcsd-li a{color:var(--gt);font-weight:600;font-size:.88rem;white-space:nowrap;text-decoration:none}
.ctcsd-st{display:flex;gap:14px;align-items:flex-start;padding-bottom:14px;border-bottom:1px solid #f2f4f7}
.ctcsd-st-i{width:46px;height:46px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;font-weight:800;color:#fff;background:#d0d5dd;font-size:1.25rem}
.ctcsd-st h3{margin:2px 0 2px;font-size:1.02rem;font-weight:600}.ctcsd-st p{margin:0;color:var(--m);font-size:.84rem;line-height:1.45}
.ctcsd-st-ok .ctcsd-st-i{background:var(--ok)}.ctcsd-st-ok h3{color:var(--ok)}.ctcsd-st-bad .ctcsd-st-i{background:var(--bad)}.ctcsd-st-bad h3{color:var(--bad)}.ctcsd-st-wait .ctcsd-st-i{background:var(--a);font-size:1.05rem}
.ctcsd-kv{display:flex;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid #f2f4f7;font-size:.9rem}.ctcsd-kv span{color:var(--m)}.ctcsd-kv strong{font-weight:600}
.ctcsd-link{display:inline-block;background:none;border:0;padding:12px 0 0;color:var(--a)!important;font-weight:600;font-size:.88rem;cursor:pointer;text-decoration:none!important}
.ctcsd-need{border:2px solid #fdb022;background:#fffcf5}.ctcsd-need-t{font-weight:600;margin:12px 0 0;font-size:.9rem}
.ctcsd-ids{display:flex;flex-direction:column;gap:4px;margin-top:4px}.ctcsd-ids[hidden]{display:none}.ctcsd-ids label{display:flex;flex-direction:column;font-weight:600;font-size:.86rem;margin:10px 0 0;gap:4px}
.ctcsd-ids input{border:1px solid #d0d5dd;border-radius:10px;padding:10px 12px;font-size:1rem;font-weight:400;text-transform:uppercase}.ctcsd-ids input::placeholder{text-transform:none}
.ctcsd-ids .ctcsd-btn{margin-top:12px;align-self:flex-start;padding:10px 22px}
.ctcsd-hint{font-size:.78rem;color:var(--m)}
.ctcsd-older{margin-top:12px;font-size:.86rem}.ctcsd-older summary{cursor:pointer;color:var(--m);font-weight:600}
.ctcsd-ck{list-style:none;margin:0;padding:0}.ctcsd-ck li{display:flex;gap:12px;padding:9px 0;align-items:flex-start;font-size:.92rem;line-height:1.35}
.ctcsd-ck small{display:block;color:var(--m);font-size:.8rem;margin-top:2px}
.ctcsd-ck-b{width:22px;height:22px;border-radius:50%;border:2px solid #d0d5dd;flex:none;display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:800;color:#fff}
.ctcsd-ck-done{background:var(--ok);border-color:var(--ok)}.ctcsd-ck-now{border-color:var(--g);box-shadow:0 0 0 3px rgba(212,167,44,.18)}
.ctcsd-book{display:flex;gap:14px;align-items:center;background:#fffbea;border:1px solid #f3e3a6;border-radius:14px;padding:16px 18px;color:var(--n)!important;text-decoration:none!important}
.ctcsd-book:hover{border-color:var(--g)}.ctcsd-book-i{font-size:1.8rem;flex:none}.ctcsd-book-t{flex:1}.ctcsd-book-t strong{display:block;font-weight:600}.ctcsd-book-t span{color:var(--m);font-size:.82rem}
.ctcsd-book-go{color:var(--gt);font-weight:700;white-space:nowrap}
@media (max-width:820px){.ctcsd-cols{grid-template-columns:1fr}.ctcsd-hero{flex-direction:column;align-items:stretch;padding:20px}.ctcsd-hero-act .ctcsd-btn{width:100%}
.ctcsd-strip{flex-wrap:wrap}.ctcsd-strip-t{flex-basis:calc(100% - 30px)}.ctcsd-strip-cd{margin-left:24px}.ctcsd-action{flex-wrap:wrap}.ctcsd-action-go{margin-left:36px}}
</style>';
    }

    private static function js() {
        // Opening /my/#ctc-previous (or #ctc-certificates) from the left-hand menu opens that section.
        return '<script>(function(){function wide(){var r=document.getElementById("block-region-side-pre");if(!r)return;var vis=[].some.call(r.querySelectorAll(".block"),function(b){return b.offsetParent!==null;});if(!vis){document.body.classList.add("ctcsd-wide");var c=r.closest("section");if(c)c.classList.add("ctcsd-sidecol");}}document.addEventListener("DOMContentLoaded",wide);window.addEventListener("load",wide);})();'
            . '(function(){var c=document.querySelector(".ctcsd-cd");if(!c)return;var end=+c.getAttribute("data-end")*1000;function t(){var d=Math.max(0,end-Date.now());if(d<=0){try{if(!sessionStorage.getItem("ctccd"+end)){sessionStorage.setItem("ctccd"+end,1);location.reload();}}catch(e){}}var v={d:Math.floor(d/864e5),h:Math.floor(d/36e5)%24,m:Math.floor(d/6e4)%60,s:Math.floor(d/1e3)%60};'
            . 'for(var k in v){var e=c.querySelector("[data-u="+k+"]");if(e)e.textContent=(k==="d"?v[k]:("0"+v[k]).slice(-2));}}t();setInterval(t,1000);})();'
            . '(function(){var r=document.querySelector(".ctcsd-rec");if(!r)return;function sel(n){r.querySelectorAll(".ctcsd-tab").forEach(function(b){var on=b.getAttribute("data-tab")===n;b.classList.toggle("on",on);b.setAttribute("aria-selected",on);});'
            . 'r.querySelectorAll(".ctcsd-panel").forEach(function(p){p.hidden=p.getAttribute("data-panel")!==n;});}window.ctcsdTab=sel;r.querySelectorAll(".ctcsd-tab").forEach(function(b){b.addEventListener("click",function(){sel(b.getAttribute("data-tab"));});});})();'
            . '(function(){function go(){var h=location.hash;if(!/^#ctc-/.test(h))return;if(h==="#ctc-previous"&&window.ctcsdTab){window.ctcsdTab("prev");h="#ctc-certificates";}var s=document.querySelector(h);if(!s)return;var d=s.querySelector("details");if(d)d.open=true;if(h==="#ctc-ids"){var f=s.querySelector("form");if(f&&f.hidden){f.hidden=false;var b=s.querySelector(".ctcsd-link");if(b)b.hidden=true;}}s.scrollIntoView({behavior:"smooth",block:"start"});}'
            . 'window.addEventListener("hashchange",go);if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",go);else go();})();</script>';
    }
}
