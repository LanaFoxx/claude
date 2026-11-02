<?php
defined('MOODLE_INTERNAL') || die();
require_once(__DIR__ . '/lib.php');

/** Dashboard block (full admins only): the current 20/60 Hour courses and the yearly "Update" buttons. Closed by default. */
class block_ctc_courseupdate extends block_base {
    public function init() {
        $this->title = 'Course updates';
    }
    public function applicable_formats() {
        return ['my' => true];
    }
    public function has_config() {
        return true;
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
        foreach (BLOCK_CTCCU_TYPES as $type => $def) {
            $st = block_ctccu_state($type);
            $live = $st['live'];
            $draft = $st['draft'];
            $cell = $live ? html_writer::link(new moodle_url('/course/view.php', ['id' => $live->id]), s($live->fullname)) . html_writer::div('Course ' . $live->id . ' · students are enrolled here', 'ctccu-sub') : '<span class="ctccu-sub">none found</span>';
            if ($draft) {
                $done = count(array_filter(['pdf', 'links', 'timestamps', 'quizzes'], function ($s) use ($draft) { return block_ctccu_step($draft->id, $s); }));
                $next = html_writer::link(new moodle_url('/blocks/ctc_courseupdate/update.php', ['id' => $draft->id]), 'Continue ' . $draft->year . ' update', ['class' => 'ctccu-btn ctccu-btn-primary'])
                    . html_writer::div(s($draft->fullname) . ' · hidden · ' . $done . ' of 4 imports done', 'ctccu-sub');
            } else if ($live) {
                $next = html_writer::link(new moodle_url('/blocks/ctc_courseupdate/create.php', ['type' => $type, 'sesskey' => sesskey()]), 'Update ' . $def['label'] . ' → ' . ($live->year + 1),
                    ['class' => 'ctccu-btn ctccu-btn-primary', 'onclick' => 'return confirm(' . json_encode('Create the ' . ($live->year + 1) . ' ' . $def['label'] . ' course? It copies "' . $live->fullname . '" without students and keeps it hidden until you publish it. This takes a minute.') . ')'])
                    . html_writer::div('Copies the course, then you import the new files', 'ctccu-sub');
            } else {
                $next = '';
            }
            $rows .= '<tr><td><strong>' . $def['label'] . '</strong></td><td>' . $cell . '</td><td class="ctccu-right">' . $next . '</td></tr>';
        }
        $css = '<style>[data-blockregion="content"] > .block_ctc_courseupdate{grid-column:1 / -1}
.ctccu{--line:#e4e7ec;--muted:#667085;--ink:#1d2939;color:var(--ink);font-size:.9rem}
.ctccu-card{background:#fff;border:1px solid var(--line);border-radius:12px}
.ctccu-card>summary{list-style:none;display:flex;align-items:center;justify-content:space-between;padding:14px 18px;cursor:pointer;font-weight:600;font-size:1rem}
.ctccu-card>summary::-webkit-details-marker{display:none}.ctccu-card>summary:hover{background:#fafafa;border-radius:12px}
.ctccu-chev{width:9px;height:9px;border-right:2px solid var(--muted);border-bottom:2px solid var(--muted);transform:rotate(45deg);transition:transform .15s}
.ctccu-card[open] .ctccu-chev{transform:rotate(225deg)}
.ctccu-body{padding:4px 18px 16px;border-top:1px solid var(--line)}
.ctccu table{width:100%;border-collapse:collapse}.ctccu td{padding:12px 10px;border-bottom:1px solid #f0f2f5;vertical-align:top}.ctccu tr:last-child td{border-bottom:0}
.ctccu-sub{display:block;color:var(--muted);font-size:.78rem;margin-top:2px}.ctccu-right{text-align:right}
.ctccu-btn{display:inline-flex;align-items:center;height:34px;padding:0 14px;border:1px solid var(--line);border-radius:8px;background:#fff;color:var(--ink)!important;font-weight:500;text-decoration:none!important}
.ctccu-btn-primary{background:#d4af37;border-color:#d4af37;color:#fff!important}.ctccu-btn-primary:hover{background:#c09c2c}</style>';
        $this->content->text = $css . '<div class="ctccu"><details class="ctccu-card"><summary><span>Yearly course update (20 Hour &amp; 60 Hour)</span><span class="ctccu-chev"></span></summary>'
            . '<div class="ctccu-body"><table>' . $rows . '</table><p class="ctccu-sub">Only full administrators see this. The new course stays hidden until you publish it; students on the current course are not affected.</p></div></details></div>';
        return $this->content;
    }
}
