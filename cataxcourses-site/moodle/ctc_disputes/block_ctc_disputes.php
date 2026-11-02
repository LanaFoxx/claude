<?php
defined('MOODLE_INTERNAL') || die();
require_once(__DIR__ . '/lib.php');

/** Dashboard block: Stripe disputes from the store, with links to the evidence packet, form answers and Moodle activity. */
class block_ctc_disputes extends block_base {
    public function init() {
        $this->title = 'Dispute evidence';
    }
    public function applicable_formats() {
        return ['my' => true, 'site-index' => true, 'admin' => true];
    }
    public function has_config() {
        return true;
    }
    public function get_content() {
        if ($this->content !== null) {
            return $this->content;
        }
        $this->content = (object) ['text' => '', 'footer' => ''];
        if (!has_capability('block/ctc_disputes:view', context_system::instance())) {
            return $this->content;
        }
        if (!get_config('block_ctc_disputes', 'wpurl') || !get_config('block_ctc_disputes', 'token')) {
            $this->content->text = get_string('notconfigured', 'block_ctc_disputes');
            return $this->content;
        }
        $feed = block_ctc_disputes_wp('disputes');
        if ($feed === null) {
            $this->content->text = get_string('fetchfailed', 'block_ctc_disputes');
            return $this->content;
        }
        if (empty($feed['disputes'])) {
            $this->content->text = get_string('nodisputes', 'block_ctc_disputes');
            return $this->content;
        }
        $open = ['needs_response', 'warning_needs_response'];
        $now = time();
        $short = ['fraudulent' => 'Fraudulent', 'product_not_received' => 'Not received', 'product_unacceptable' => 'Unacceptable',
            'subscription_canceled' => 'Subscription canceled', 'duplicate' => 'Duplicate', 'credit_not_processed' => 'Refund not processed',
            'unrecognized' => 'Unrecognized', 'general' => 'General'];
        $pill = function ($text, $kind) { return html_writer::span(s($text), 'ctcd-pill ctcd-' . $kind); };
        $btn = function ($url, $label, $class = '', $confirm = '') {
            $attrs = ['class' => 'ctcd-btn ' . $class];
            if ($confirm) {
                $attrs['onclick'] = 'return confirm(' . json_encode($confirm) . ')';
            }
            return html_writer::link($url, $label, $attrs);
        };
        $act = function ($id, $a) { return new moodle_url('/blocks/ctc_disputes/action.php', ['dispute' => $id, 'act' => $a, 'sesskey' => sesskey()]); };
        $row = function ($d) use ($open, $now, $short, $pill, $btn, $act) {
            $id = $d['dispute_id'];
            $isopen = in_array($d['status'], $open, true);
            $due = $d['due_by'] ? strtotime($d['due_by'] . ' UTC') : 0;
            $days = $due ? (int) floor(($due - $now) / DAYSECS) : null;
            $duecell = $isopen && $due ? $pill(userdate($due, '%b %d'), $days <= 3 ? 'bad' : ($days <= 7 ? 'warn' : 'muted')) .
                html_writer::div($days < 1 ? 'today' : $days . ' days left', 'ctcd-sub') : html_writer::span(s(ucfirst(str_replace('_', ' ', $d['status']))), 'ctcd-sub');
            $ctec = $d['ctec_ok'] ? $pill('Reported', 'ok') : (strpos($d['ctec'], 'Unknown') === 0 ? $pill('Unknown', 'muted') : $pill('Not reported', 'muted'));
            if (preg_match('/CTEC ID ([^)]+)/', $d['ctec'], $m)) {
                $ctec .= html_writer::div('ID ' . s($m[1]), 'ctcd-sub');
            }
            $st = (string) $d['auto_state'];
            $states = ['drafted' => ['Auto-submits', 'info'], 'draft_only' => ['Drafted · review', 'warn'], 'held' => ['Held', 'warn'],
                'submitted' => ['Submitted', 'ok'], 'failed' => ['Failed', 'bad'], 'closed' => ['Closed', 'muted']];
            $ev = isset($states[$st]) ? $pill($states[$st][0], $states[$st][1]) : html_writer::span('—', 'ctcd-sub');
            if ($st === 'drafted' && preg_match('/auto-submits (.+)$/', $d['auto'], $m)) {
                $ev .= html_writer::div(s($m[1]), 'ctcd-sub');
            }
            $acts = [];
            if ($isopen) {
                if ($st === 'drafted') { $acts[] = $btn($act($id, 'hold'), 'Hold'); }
                if (in_array($st, ['held', 'draft_only'], true)) { $acts[] = $btn($act($id, 'resume'), 'Resume auto-submit'); }
                if (in_array($st, ['', 'failed'], true)) { $acts[] = $btn($act($id, 'draft'), 'Draft on Stripe'); }
                if (!in_array($st, ['submitted', 'closed'], true)) { $acts[] = $btn($act($id, 'submit'), 'Submit now', '', 'Submit this evidence to Stripe now? This is final.'); }
            }
            if ($acts) {
                $ev .= html_writer::div(implode('', $acts), 'ctcd-acts');
            }
            if ($d['log']) {
                $ev .= '<details class="ctcd-log"><summary>Log</summary><pre>' . s($d['log']) . '</pre></details>';
            }
            $files = [];
            foreach (['service_documentation' => 'Evidence PDF', 'receipt' => 'Receipt PDF', 'refund_policy' => 'Policies PDF'] as $doc => $label) {
                $files[] = html_writer::link(new moodle_url('/blocks/ctc_disputes/pdf.php', ['dispute' => $id, 'doc' => $doc]), $label, ['target' => '_blank']);
            }
            $files[] = html_writer::link(new moodle_url('/blocks/ctc_disputes/view.php', ['dispute' => $id, 'view' => 'form']), 'Stripe form answers');
            $files[] = html_writer::link(new moodle_url('/blocks/ctc_disputes/activity.php', ['email' => $d['email']]), 'Moodle activity');
            $files[] = html_writer::link('https://dashboard.stripe.com/disputes/' . $id, 'Open in Stripe ↗', ['target' => '_blank']);
            $open_ = $btn(new moodle_url('/blocks/ctc_disputes/view.php', ['dispute' => $id, 'view' => 'packet']), 'Evidence packet', 'ctcd-btn-primary') .
                '<details class="ctcd-more"><summary class="ctcd-btn">Files ▾</summary><div class="ctcd-menu">' . implode('', $files) . '</div></details>';
            return '<tr>' .
                '<td>' . html_writer::span(s($d['customer']), 'ctcd-name') . html_writer::span(s(core_text::strtolower($d['email'])), 'ctcd-sub') . '</td>' .
                '<td>' . ($d['order_id'] ? '#' . (int) $d['order_id'] : html_writer::span('not matched', 'ctcd-bad-text')) . html_writer::div('$' . number_format($d['amount'] / 100, 2), 'ctcd-sub') . '</td>' .
                '<td>' . s($short[$d['reason']] ?? $d['reason_label']) . html_writer::div(userdate(strtotime($d['created'] . ' UTC'), 'Opened %b %d'), 'ctcd-sub') . '</td>' .
                '<td>' . $duecell . '</td><td>' . $ctec . '</td><td>' . $ev . '</td><td class="ctcd-right">' . $open_ . '</td></tr>';
        };
        $opened = array_values(array_filter($feed['disputes'], function ($d) use ($open) { return in_array($d['status'], $open, true); }));
        $closed = array_values(array_filter($feed['disputes'], function ($d) use ($open) { return !in_array($d['status'], $open, true); }));
        $soon = count(array_filter($opened, function ($d) use ($now) { return $d['due_by'] && strtotime($d['due_by'] . ' UTC') - $now < 7 * DAYSECS; }));
        $won = count(array_filter($closed, function ($d) { return $d['status'] === 'won'; }));
        $lost = count(array_filter($closed, function ($d) { return $d['status'] === 'lost'; }));
        $review = count(array_filter($opened, function ($d) { return in_array($d['auto_state'], ['draft_only', 'held', 'failed', ''], true); }));
        $tile = function ($label, $num, $sub) { return '<div class="ctcd-tile"><div class="ctcd-tile-label">' . $label . '</div><div class="ctcd-tile-num">' . $num . '</div><div class="ctcd-sub">' . $sub . '</div></div>'; };
        $head = '<thead><tr><th>Customer</th><th>Order</th><th>Reason</th><th>Evidence due</th><th>CTEC hours</th><th>Evidence</th><th></th></tr></thead>';
        $section = function ($title, $sub, $count, $kind, $rows, $isopen) use ($head, $row) {
            return '<details class="ctcd-card"' . ($isopen ? ' open' : '') . '><summary><span class="ctcd-card-head"><span class="ctcd-card-title">' . $title . '</span>' .
                html_writer::span((string) $count, 'ctcd-pill ctcd-' . $kind) . '<span class="ctcd-sub">' . $sub . '</span></span><span class="ctcd-chevron"></span></summary>' .
                '<div class="ctcd-card-body">' . ($rows ? '<div class="ctcd-table-wrap"><table class="ctcd-table">' . $head . '<tbody>' . implode('', array_map($row, $rows)) . '</tbody></table></div>'
                : '<p class="ctcd-sub" style="padding:12px 0">Nothing here.</p>') . '</div></details>';
        };
        $modes = ['auto' => 'Evidence is drafted on Stripe and submitted automatically after 24 hours unless held.', 'draft' => 'Evidence is drafted on Stripe automatically; someone clicks Submit.', 'off' => 'Automatic evidence is off.'];
        $css = '<style>
[data-blockregion="content"] > .block_ctc_disputes{grid-column:1 / -1}
.block_studenttools .stt-card:has(a[href*="local/stripedispute"]){display:none} /* disputes live in this block now */
.block_ctc_disputes .card-title{text-transform:uppercase}
.ctcd{--ok:#1f7a4d;--ok-bg:#e6f4ec;--info:#1d5fa8;--info-bg:#e7f0fb;--warn:#8a5a00;--warn-bg:#fdf3dc;--bad:#b42318;--bad-bg:#fdecea;--muted:#667085;--muted-bg:#f2f4f7;--line:#e4e7ec;--ink:#1d2939;color:var(--ink);font-size:.9rem}
.ctcd-banner{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 12px;border-radius:8px;margin-bottom:14px;background:var(--info-bg);color:var(--info);font-weight:500}
.ctcd-banner a{color:var(--info)!important;font-weight:600;white-space:nowrap}
.ctcd-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:14px}
.ctcd-tile{background:#fff;border:1px solid var(--line);border-radius:12px;padding:14px 16px}
.ctcd-tile-label{color:var(--muted);font-size:.78rem;text-transform:uppercase;letter-spacing:.04em}
.ctcd-tile-num{font-size:1.9rem;font-weight:700;line-height:1.2;margin:2px 0}
.ctcd-sub{display:block;color:var(--muted);font-size:.78rem}
.ctcd-card{background:#fff;border:1px solid var(--line);border-radius:12px;margin-bottom:12px}
.ctcd-card>summary{list-style:none;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 18px;cursor:pointer}
.ctcd-card>summary::-webkit-details-marker{display:none}.ctcd-card>summary:hover{background:#fafafa;border-radius:12px}
.ctcd-card-head{display:flex;flex-wrap:wrap;align-items:center;gap:10px}.ctcd-card-head .ctcd-sub{display:inline}
.ctcd-card-title{font-weight:600;font-size:1rem}
.ctcd-chevron{width:9px;height:9px;border-right:2px solid var(--muted);border-bottom:2px solid var(--muted);transform:rotate(45deg);transition:transform .15s;flex:none}
.ctcd-card[open] .ctcd-chevron{transform:rotate(225deg)}
.ctcd-card-body{padding:4px 18px 16px;border-top:1px solid var(--line)}
.ctcd-pill{display:inline-block;padding:2px 9px;border-radius:999px;font-size:.75rem;font-weight:600;white-space:nowrap}
.ctcd-ok{background:var(--ok-bg);color:var(--ok)}.ctcd-info{background:var(--info-bg);color:var(--info)}.ctcd-warn{background:var(--warn-bg);color:var(--warn)}
.ctcd-bad{background:var(--bad-bg);color:var(--bad)}.ctcd-muted{background:var(--muted-bg);color:var(--muted)}.ctcd-bad-text{color:var(--bad)}
.ctcd-table-wrap{overflow-x:visible}
.ctcd-table{width:100%;border-collapse:collapse;margin:8px 0 4px}
.ctcd-table th{font-size:.72rem;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);font-weight:600;text-align:left;padding:8px 10px;border-bottom:1px solid var(--line);background:transparent}
.ctcd-table td{padding:12px 10px;border-bottom:1px solid #f0f2f5;vertical-align:top}.ctcd-table tr:last-child td{border-bottom:0}
.ctcd-name{display:block;font-weight:600}.ctcd-right{text-align:right;white-space:nowrap}
.ctcd-btn{display:inline-flex;align-items:center;height:32px;padding:0 12px;border:1px solid var(--line);border-radius:8px;background:#fff;color:var(--ink)!important;font-size:.82rem;font-weight:500;text-decoration:none!important;cursor:pointer;white-space:nowrap;margin:0 0 4px 6px;list-style:none}
.ctcd-btn::-webkit-details-marker{display:none}.ctcd-btn:hover{border-color:#c9a227;background:#fffbea}
.ctcd-btn-primary{background:#d4af37;border-color:#d4af37;color:#fff!important}.ctcd-btn-primary:hover{background:#c09c2c;border-color:#c09c2c}
.ctcd-acts{margin-top:6px}.ctcd-acts .ctcd-btn{margin:0 6px 4px 0;height:28px;font-size:.78rem}
.ctcd-more{display:inline-block;position:relative;vertical-align:top}
.ctcd-menu{position:absolute;right:0;top:36px;z-index:5;background:#fff;border:1px solid var(--line);border-radius:10px;box-shadow:0 8px 24px rgba(16,24,40,.12);padding:6px;min-width:190px;text-align:left}
.ctcd-menu a{display:block;padding:7px 10px;border-radius:6px;color:var(--ink)!important;text-decoration:none!important;font-size:.85rem}.ctcd-menu a:hover{background:#fffbea}
.ctcd-log summary{cursor:pointer;color:var(--muted);font-size:.75rem;margin-top:4px}.ctcd-log pre{white-space:pre-wrap;font-size:.72rem;color:var(--muted);margin:4px 0 0;max-width:340px}
</style>';
        $this->content->text = $css . '<div class="ctcd">' .
            '<div class="ctcd-banner"><span>' . s($modes[$feed['mode'] ?? ''] ?? '') . '</span>' .
            html_writer::link(new moodle_url('/blocks/ctc_disputes/action.php', ['act' => 'sync', 'sesskey' => sesskey()]), 'Check Stripe now') . '</div>' .
            '<div class="ctcd-tiles">' . $tile('Open', count($opened), 'need a response') . $tile('Due within 7 days', $soon, 'evidence deadline') .
            $tile('Waiting for review', $review, 'drafted, not auto-submitting') . $tile('Closed', count($closed), $won . ' won · ' . $lost . ' lost') . '</div>' .
            $section('Needs response', 'Open disputes, nearest deadline first', count($opened), count($opened) ? 'bad' : 'muted',
                (function ($a) { usort($a, function ($x, $y) { return strcmp((string) $x['due_by'], (string) $y['due_by']); }); return $a; })($opened), true) .
            $section('Closed', 'Won, lost and withdrawn', count($closed), 'muted', $closed, false) . '</div>';
        $this->content->footer = '';
        return $this->content;
    }
}
