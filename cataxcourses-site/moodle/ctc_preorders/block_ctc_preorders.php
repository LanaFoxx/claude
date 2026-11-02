<?php
defined('MOODLE_INTERNAL') || die();
require_once($CFG->dirroot . '/blocks/ctc_courseupdate/lib.php');

/** Dashboard block (full admins only): 20 Hour pre-order lists, newest first. Closed by default. */
class block_ctc_preorders extends block_base {
    public function init() {
        $this->title = 'Pre-orders';
    }
    public function applicable_formats() {
        return ['my' => true];
    }
    public function get_content() {
        if ($this->content !== null) {
            return $this->content;
        }
        $this->content = (object) ['text' => '', 'footer' => ''];
        if (!has_capability('block/ctc_courseupdate:manage', context_system::instance())) {
            return $this->content;
        }
        $rows = '';
        $summary = '';
        foreach (block_ctccu_preorder_seasons() as $k => $se) {
            $notes = block_ctccu_season_notes($se['year']);
            $status = $se['open'] ? '<span class="ctcpo-pill ctcpo-open">Open</span>' : ($se['none'] ? '<span class="ctcpo-pill">No pre-orders</span>' : '<span class="ctcpo-pill">Closed</span>');
            $dates = $se['none'] ? 'Course was available before Jan 15' : userdate($se['from'], '%b %d, %Y') . ' – ' . ($se['open'] ? 'now' : userdate($se['to'], '%b %d, %Y'));
            $sub = $se['open'] ? 'Closes the day the ' . $se['year'] . ' 20 Hour course is created' : ($se['course'] ? s($se['course']) : '');
            $done = [];
            if (!empty($notes['exported'])) {
                $done[] = '✅ Book orders exported ' . userdate($notes['exported']['at'], '%b %d, %Y') . ' (' . (int) $notes['exported']['orders'] . ')';
            }
            if (!empty($notes['enrolled'])) {
                $done[] = '✅ Enrolled in ' . s($notes['enrolled']['course']) . ' on ' . userdate($notes['enrolled']['at'], '%b %d, %Y') . ' (' . (int) $notes['enrolled']['added'] . ' added)';
            }
            $btn = $se['none'] ? '' : html_writer::link(new moodle_url('/blocks/ctc_courseupdate/preorders.php', ['season' => $se['year']]), $k === 0 ? 'Open list · enroll · export' : 'View list', ['class' => 'ctcpo-btn' . ($k === 0 ? ' ctcpo-btn-primary' : '')]);
            $row = '<tr><td><strong>' . $se['year'] . '</strong></td><td>' . $status . '</td><td>' . $dates . '<span class="ctcpo-sub">' . $sub . '</span>' . ($done ? '<span class="ctcpo-sub">' . implode('<br>', $done) . '</span>' : '') . '</td><td class="ctcpo-right">' . $btn . '</td></tr>';
            if ($k === 0) {
                $summary = $se['year'] . ': ' . strip_tags($status) . ($se['open'] ? ' since ' . userdate($se['from'], '%b %d') : '');
                $rows .= $row . (count(block_ctccu_preorder_seasons()) > 1 ? '<tr><td colspan="4" class="ctcpo-head">Previous pre-order lists</td></tr>'
                    : '<tr><td colspan="4" class="ctcpo-sub">Previous years\' lists will appear here, newest first.</td></tr>');
            } else {
                $rows .= $row;
            }
        }
        $css = '<style>[data-blockregion="content"] > .block_ctc_preorders{grid-column:1 / -1}
.ctcpo{--line:#e4e7ec;--muted:#667085;--ink:#1d2939;color:var(--ink);font-size:.9rem}
.ctcpo-card{background:#fff;border:1px solid var(--line);border-radius:12px}
.ctcpo-card>summary{list-style:none;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 18px;cursor:pointer;font-weight:600;font-size:1rem}
.ctcpo-card>summary::-webkit-details-marker{display:none}.ctcpo-card>summary:hover{background:#fafafa;border-radius:12px}
.ctcpo-sumsub{color:var(--muted);font-weight:400;font-size:.8rem;margin-left:10px}
.ctcpo-chev{width:9px;height:9px;border-right:2px solid var(--muted);border-bottom:2px solid var(--muted);transform:rotate(45deg);transition:transform .15s;flex:none}
.ctcpo-card[open] .ctcpo-chev{transform:rotate(225deg)}
.ctcpo-body{padding:4px 18px 16px;border-top:1px solid var(--line)}
.ctcpo table{width:100%;border-collapse:collapse}.ctcpo td{padding:12px 10px;border-bottom:1px solid #f0f2f5;vertical-align:top}
.ctcpo-head{font-size:.72rem;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);font-weight:600;padding-top:18px!important}
.ctcpo-sub{display:block;color:var(--muted);font-size:.78rem;margin-top:2px}.ctcpo-right{text-align:right}
.ctcpo-pill{display:inline-block;padding:2px 9px;border-radius:999px;font-size:.75rem;font-weight:600;background:#f2f4f7;color:#667085}.ctcpo-open{background:#e6f4ec;color:#1f7a4d}
.ctcpo-btn{display:inline-flex;align-items:center;height:34px;padding:0 14px;border:1px solid var(--line);border-radius:8px;background:#fff;color:var(--ink)!important;font-weight:500;text-decoration:none!important;white-space:nowrap}
.ctcpo-btn-primary{background:#d4af37;border-color:#d4af37;color:#fff!important}</style>';
        $this->content->text = $css . '<div class="ctcpo"><details class="ctcpo-card"><summary><span>20 Hour pre-orders<span class="ctcpo-sumsub">' . s($summary) . '</span></span><span class="ctcpo-chev"></span></summary>'
            . '<div class="ctcpo-body"><table>' . $rows . '</table><p class="ctcpo-sub">Pre-orders open every January 15 and close the day the new 20 Hour course is created. Only full administrators see this.</p></div></details></div>';
        return $this->content;
    }
}
