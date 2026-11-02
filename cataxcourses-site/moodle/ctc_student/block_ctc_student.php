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

        // 1. Current course(s).
        $h .= '<section id="ctc-courses" class="ctcsd-sec"><div class="ctcsd-eyebrow">' . ($c['year'] ? $c['year'] . ' · ' : '') . 'My courses</div>';
        if (!$c['current']) {
            $h .= '<div class="ctcsd-card ctcsd-empty">You are not enrolled in a course yet. <a href="https://cataxcourses.com/">Browse CTEC courses →</a></div>';
        }
        foreach ($c['current'] as $i => $co) {
            $pct = $co->progress;
            $rep = $reports[$co->id] ?? null;
            $h .= '<div class="ctcsd-card ctcsd-hero' . ($i ? ' ctcsd-hero-sm' : '') . '"><div class="ctcsd-hero-main">'
                . '<div class="ctcsd-hero-tag">' . ($co->completed ? '<span class="ctcsd-pill ctcsd-pill-ok">✓ Completed</span>' : '<span class="ctcsd-pill">In progress</span>') . '</div>'
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
        $h .= '</section>';

        // 2. Previous year courses (collapsed).
        if ($c['previous']) {
            $h .= '<section id="ctc-previous" class="ctcsd-sec"><details class="ctcsd-card ctcsd-details"><summary>Previous year courses <span class="ctcsd-count">' . count($c['previous']) . '</span></summary><ul class="ctcsd-list">';
            foreach ($c['previous'] as $co) {
                $h .= '<li><a href="' . s($co->url) . '">' . s($co->name) . '</a><span class="ctcsd-meta">' . ($co->year ? $co->year : '') . ($co->completed ? ' · Completed ' . userdate($co->completed, '%b %e, %Y') : '') . '</span></li>';
            }
            $h .= '</ul></details></section>';
        }

        // 3. CTEC reporting.
        $h .= '<div class="ctcsd-grid"><section id="ctc-ctec" class="ctcsd-sec"><div class="ctcsd-eyebrow">CTEC reporting</div>';
        $cur = $c['current'] ? $c['current'][0] : null;
        $curmapped = array_filter($c['current'], function ($co) use ($mapped) { return !empty($mapped[$co->id]); });
        $main = $curmapped ? reset($curmapped) : $cur;
        $rep = $main ? ($reports[$main->id] ?? null) : null;
        if ($rep && $rep->state === 'reported') {
            $h .= '<div class="ctcsd-card ctcsd-ctec ctcsd-ctec-ok"><div class="ctcsd-big">✓</div><div><h3>Your hours have been reported to CTEC</h3>'
                . '<p><strong>' . s($rep->course) . '</strong><br>Reported ' . $fmt($rep->time) . '</p>'
                . '<p class="ctcsd-small">CTEC usually shows new hours on your CTEC account within a few business days.</p></div></div>';
        } else if ($rep && $rep->state === 'problem') {
            $h .= '<div class="ctcsd-card ctcsd-ctec ctcsd-ctec-bad"><div class="ctcsd-big">!</div><div><h3>We couldn\'t report your hours yet</h3>'
                . '<p><strong>' . s($rep->course) . '</strong></p><p>CTEC did not accept the report. This is almost always a missing or mistyped CTEC ID. '
                . '<a href="#ctc-ids">Check your CTEC ID below</a> and save it, and we will send your hours again automatically.</p></div></div>';
        } else if ($rep) {
            $h .= '<div class="ctcsd-card ctcsd-ctec ctcsd-ctec-wait"><div class="ctcsd-big">⏳</div><div><h3>Sending your hours to CTEC</h3>'
                . '<p><strong>' . s($rep->course) . '</strong> — completed ' . $fmt($rep->completed) . '. Your report is on its way to CTEC.</p></div></div>';
        } else if ($main && $main->completed) {
            $h .= '<div class="ctcsd-card ctcsd-ctec ctcsd-ctec-wait"><div class="ctcsd-big">✓</div><div><h3>Course completed</h3><p><strong>' . s($main->name) . '</strong> — completed ' . $fmt($main->completed)
                . '.</p><p class="ctcsd-small">Questions about your CTEC report? Call (888) 229-1994 or email <a href="mailto:help@cataxcourses.com">help@cataxcourses.com</a>.</p></div></div>';
        } else if ($main) {
            $h .= '<div class="ctcsd-card ctcsd-ctec ctcsd-ctec-todo"><div class="ctcsd-big">○</div><div><h3>Not reported yet</h3><p><strong>' . s($main->name) . '</strong></p>'
                . '<p>When you finish the course, we report your hours to CTEC automatically. ' . ($ctecidok ? '' : 'Make sure your CTEC ID is entered so the report goes through.') . '</p></div></div>';
        } else {
            $h .= '<div class="ctcsd-card ctcsd-ctec ctcsd-ctec-todo"><div class="ctcsd-big">○</div><div><h3>Nothing reported yet</h3><p>Your hours are reported to CTEC automatically when you finish a course.</p></div></div>';
        }
        $older = array_filter($reports, function ($r) use ($main) { return $r->state === 'reported' && (!$main || $r->courseid !== $main->id); });
        if ($older) {
            $h .= '<details class="ctcsd-card ctcsd-details ctcsd-mt"><summary>Earlier CTEC reports <span class="ctcsd-count">' . count($older) . '</span></summary><ul class="ctcsd-list">';
            foreach ($older as $r) {
                $h .= '<li><span>✓ ' . s($r->course) . '</span><span class="ctcsd-meta">Reported ' . userdate($r->time, '%b %e, %Y') . '</span></li>';
            }
            $h .= '</ul></details>';
        }
        $h .= '</section>';

        // 4. CTEC ID & PTIN.
        $h .= '<section id="ctc-ids" class="ctcsd-sec"><div class="ctcsd-eyebrow">CTEC ID &amp; PTIN</div><div class="ctcsd-card ctcsd-ids' . ($ctecidok && $ptinok ? '' : ' ctcsd-need') . '">';
        $editing = !$ctecidok || !$ptinok;
        if (!$editing) {
            $h .= '<div class="ctcsd-idrow"><span>CTEC ID</span><strong>' . s(block_ctc_student_norm_ctecid($ctecid)) . '</strong></div>'
                . '<div class="ctcsd-idrow"><span>PTIN</span><strong>P••••' . s(substr(block_ctc_student_norm_ptin($ptin), -4)) . '</strong></div>'
                . '<button type="button" class="ctcsd-link" onclick="this.parentNode.querySelector(\'form\').hidden=false;this.hidden=true">Change</button>';
        } else {
            $h .= '<p class="ctcsd-need-t">' . (!$ctecidok && !$ptinok ? 'Please enter your CTEC ID and PTIN.' : 'Please enter your ' . (!$ctecidok ? 'CTEC ID.' : 'PTIN.'))
                . ' We need them to report your hours to CTEC.</p>';
        }
        $h .= '<form method="post" action="' . (new moodle_url('/blocks/ctc_student/save.php'))->out(false) . '"' . ($editing ? '' : ' hidden') . '>'
            . '<input type="hidden" name="sesskey" value="' . sesskey() . '"><input type="hidden" name="uid" value="' . $uid . '">'
            . '<label>CTEC ID<input name="ctecid" value="' . s($ctecidok ? block_ctc_student_norm_ctecid($ctecid) : '') . '" placeholder="A123456" maxlength="12" autocomplete="off" required pattern="\s*[Aa]?\s*\d{6}\s*"></label>'
            . '<span class="ctcsd-hint">The letter A followed by 6 digits, for example A123456. Don\'t know it? Log in at <a href="https://www.ctec.org" target="_blank" rel="noopener">ctec.org</a>.</span>'
            . '<label>PTIN<input name="ptin" value="" placeholder="' . ($ptinok ? 'P••••' . s(substr(block_ctc_student_norm_ptin($ptin), -4)) . ' (leave blank to keep)' : 'P12345678') . '" maxlength="12" autocomplete="off"' . ($ptinok ? '' : ' required') . ' pattern="\s*[Pp]?\s*\d{8}\s*"></label>'
            . '<span class="ctcsd-hint">The letter P followed by 8 digits, for example P12345678.</span>'
            . '<button class="ctcsd-btn" type="submit">Save</button></form></div></section></div>';

        // 5. Certificates by year.
        $h .= '<section id="ctc-certificates" class="ctcsd-sec"><div class="ctcsd-eyebrow">Certificates of completion</div>';
        if (!$certs) {
            $h .= '<div class="ctcsd-card ctcsd-empty">Your certificate appears here as soon as you pass all of the exams in a course.</div>';
        } else {
            $byyear = [];
            foreach ($certs as $ce) {
                $byyear[$ce->year][] = $ce;
            }
            krsort($byyear);
            $first = true;
            foreach ($byyear as $y => $list) {
                $h .= '<details class="ctcsd-card ctcsd-details ctcsd-mt"' . ($first ? ' open' : '') . '><summary>' . ($y ?: 'Other') . ($first && $y == $c['year'] ? ' · this year' : '') . ' <span class="ctcsd-count">' . count($list) . '</span></summary><ul class="ctcsd-list">';
                foreach ($list as $ce) {
                    $h .= '<li><span>🎓 ' . s($ce->name) . '</span><span class="ctcsd-meta">Issued ' . userdate($ce->issued, '%b %e, %Y')
                        . ($ce->url ? ' · <a href="' . s($ce->url) . '">Download</a>' : '') . '</span></li>';
                }
                $h .= '</ul></details>';
                $first = false;
            }
        }
        $h .= '</section>';
        return '<div class="ctcsd">' . self::css() . $h . self::js() . '</div>';
    }

    private static function css() {
        return '<style>
.block_myoverview,.block_lp,.block_recentlyaccessedcourses{display:none!important}
.block_ctc_student .card-body{padding:0}.block_ctc_student.card{border:0;background:none;box-shadow:none}
.ctcsd{--n:#1d2939;--a:#0b6bcb;--ok:#12805c;--okb:#e8f6ef;--bad:#b42318;--badb:#fef0ee;--w:#b54708;--wb:#fff6e5;--l:#e4e7ec;--m:#667085;font-size:15px;color:#1d2939;max-width:1100px}
.ctcsd *{box-sizing:border-box}
.ctcsd-hello h2{font-size:1.6rem;font-weight:700;margin:0 0 14px}
.ctcsd-eyebrow{font-size:.75rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--m);margin:0 0 8px}
.ctcsd-sec{margin:0 0 22px;scroll-margin-top:90px}
.ctcsd-card{background:#fff;border:1px solid var(--l);border-radius:14px;padding:20px;box-shadow:0 1px 2px rgba(16,24,40,.05)}
.ctcsd-mt{margin-top:10px}
.ctcsd-empty{color:var(--m)}
.ctcsd-flash{border-radius:10px;padding:12px 16px;margin:0 0 14px;font-weight:600}.ctcsd-ok{background:var(--okb);color:var(--ok)}
.ctcsd-action{display:flex;align-items:center;gap:12px;background:var(--wb);border:1px solid #fedf89;color:#7a2e0e!important;border-radius:12px;padding:12px 16px;margin:0 0 18px;text-decoration:none!important}
.ctcsd-action-i{flex:none;width:26px;height:26px;border-radius:50%;background:var(--w);color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center}
.ctcsd-action-go{margin-left:auto;font-weight:700;white-space:nowrap}
.ctcsd-hero{display:flex;gap:24px;align-items:center;padding:28px;border-left:6px solid var(--a);margin-bottom:12px}
.ctcsd-hero-main{flex:1;min-width:0}.ctcsd-hero h3{font-size:1.45rem;font-weight:700;margin:8px 0 14px;line-height:1.25}.ctcsd-hero h3 a{color:var(--n)}
.ctcsd-hero-sm{padding:18px 22px;border-left-color:#98a2b3}.ctcsd-hero-sm h3{font-size:1.1rem}
.ctcsd-hero-act{display:flex;flex-direction:column;gap:8px;flex:none}
.ctcsd-pill{display:inline-block;font-size:.75rem;font-weight:700;padding:3px 10px;border-radius:99px;background:#eef4ff;color:#3538cd}.ctcsd-pill-ok{background:var(--okb);color:var(--ok)}
.ctcsd-bar{height:10px;background:#eaecf0;border-radius:99px;overflow:hidden}.ctcsd-bar span{display:block;height:100%;background:var(--a);border-radius:99px}
.ctcsd-bar-l{font-size:.85rem;color:var(--m);margin-top:6px}
.ctcsd-btn{display:inline-block;background:var(--a);color:#fff!important;border:0;border-radius:10px;padding:12px 22px;font-weight:700;text-align:center;text-decoration:none!important;cursor:pointer;font-size:1rem}
.ctcsd-btn:hover{filter:brightness(.92)}.ctcsd-btn-2{background:#fff;color:var(--n)!important;border:1px solid var(--l)}
.ctcsd-details{padding:0}.ctcsd-details summary{cursor:pointer;padding:14px 20px;font-weight:700;list-style:none;display:flex;align-items:center;gap:8px}
.ctcsd-details summary::-webkit-details-marker{display:none}.ctcsd-details summary::after{content:"";margin-left:auto;width:8px;height:8px;border-right:2px solid var(--m);border-bottom:2px solid var(--m);transform:rotate(45deg);transition:transform .15s}
.ctcsd-details[open] summary::after{transform:rotate(-135deg)}
.ctcsd-count{font-size:.75rem;background:#f2f4f7;color:var(--m);border-radius:99px;padding:1px 8px;font-weight:700}
.ctcsd-list{list-style:none;margin:0;padding:0 20px 10px}.ctcsd-list li{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-top:1px solid #f2f4f7;flex-wrap:wrap}
.ctcsd-meta{color:var(--m);font-size:.85rem}
.ctcsd-grid{display:grid;grid-template-columns:1.2fr 1fr;gap:0 20px}
.ctcsd-ctec{display:flex;gap:18px;align-items:flex-start}.ctcsd-ctec h3{font-size:1.15rem;font-weight:700;margin:4px 0 6px}.ctcsd-ctec p{margin:0 0 6px}
.ctcsd-big{flex:none;width:64px;height:64px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:2rem;font-weight:800;color:#fff;background:#98a2b3}
.ctcsd-ctec-ok{background:var(--okb);border-color:#abefc6}.ctcsd-ctec-ok .ctcsd-big{background:var(--ok)}
.ctcsd-ctec-bad{background:var(--badb);border-color:#fecdca}.ctcsd-ctec-bad .ctcsd-big{background:var(--bad)}
.ctcsd-ctec-wait .ctcsd-big{background:#0b6bcb;font-size:1.6rem}.ctcsd-ctec-todo .ctcsd-big{background:#d0d5dd}
.ctcsd-small{font-size:.85rem;color:var(--m)}
.ctcsd-ids form{display:flex;flex-direction:column;gap:4px}.ctcsd-ids label{display:flex;flex-direction:column;font-weight:700;font-size:.9rem;margin:8px 0 0;gap:4px}
.ctcsd-ids input{border:1px solid #d0d5dd;border-radius:10px;padding:11px 12px;font-size:1rem;font-weight:400;text-transform:uppercase}
.ctcsd-ids input::placeholder{text-transform:none}
.ctcsd-ids .ctcsd-btn{margin-top:12px;align-self:flex-start}
.ctcsd-hint{font-size:.8rem;color:var(--m)}
.ctcsd-need{border:2px solid #fdb022;background:#fffcf5}.ctcsd-need-t{font-weight:600;margin:0 0 4px}
.ctcsd-idrow{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f2f4f7}.ctcsd-idrow span{color:var(--m)}
.ctcsd-link{background:none;border:0;color:var(--a);font-weight:700;padding:10px 0 0;cursor:pointer}
@media (max-width:820px){.ctcsd-grid{grid-template-columns:1fr}.ctcsd-hero{flex-direction:column;align-items:stretch;padding:20px}.ctcsd-hero-act .ctcsd-btn{width:100%}.ctcsd-action{flex-wrap:wrap}.ctcsd-action-go{margin-left:38px}}
</style>';
    }

    private static function js() {
        // Opening /my/#ctc-previous (or #ctc-certificates) from the left-hand menu opens that section.
        return '<script>(function(){function go(){var h=location.hash;if(!/^#ctc-/.test(h))return;var s=document.querySelector(h);if(!s)return;var d=s.querySelector("details");if(d)d.open=true;s.scrollIntoView({behavior:"smooth",block:"start"});}'
            . 'window.addEventListener("hashchange",go);if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",go);else go();})();</script>';
    }
}
