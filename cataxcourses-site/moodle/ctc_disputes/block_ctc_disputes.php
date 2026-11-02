<?php
defined('MOODLE_INTERNAL') || die();
require_once(__DIR__ . '/lib.php');

/** Dashboard block: Stripe disputes from the store, with links to the evidence packet, form answers and Moodle activity. */
class block_ctc_disputes extends block_base {
    public function init() {
        $this->title = get_string('pluginname', 'block_ctc_disputes');
    }
    public function applicable_formats() {
        return ['my' => true, 'site-index' => true];
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
        $rows = '';
        foreach ($feed['disputes'] as $d) {
            $id = $d['dispute_id'];
            $isopen = in_array($d['status'], $open, true);
            $links = [
                html_writer::link(new moodle_url('/blocks/ctc_disputes/view.php', ['dispute' => $id, 'view' => 'packet']), get_string('packet', 'block_ctc_disputes'), ['class' => 'btn btn-primary btn-sm']),
                html_writer::link(new moodle_url('/blocks/ctc_disputes/view.php', ['dispute' => $id, 'view' => 'form']), get_string('form', 'block_ctc_disputes'), ['class' => 'btn btn-secondary btn-sm']),
                html_writer::link(new moodle_url('/blocks/ctc_disputes/activity.php', ['email' => $d['email']]), get_string('activity', 'block_ctc_disputes'), ['class' => 'btn btn-secondary btn-sm']),
                html_writer::link('https://dashboard.stripe.com/disputes/' . $id, 'Stripe', ['class' => 'btn btn-link btn-sm', 'target' => '_blank']),
            ];
            $rows .= html_writer::tag('tr',
                html_writer::tag('td', userdate(strtotime($d['created'] . ' UTC'), '%b %d, %Y')) .
                html_writer::tag('td', html_writer::tag('strong', s($d['customer'])) . '<br><small>' . s($d['email']) . '</small>') .
                html_writer::tag('td', $d['order_id'] ? '#' . (int) $d['order_id'] : '—') .
                html_writer::tag('td', '$' . number_format($d['amount'] / 100, 2)) .
                html_writer::tag('td', s($d['reason_label'])) .
                html_writer::tag('td', html_writer::tag('span', s(str_replace('_', ' ', $d['status'])), ['class' => $isopen ? 'badge badge-danger' : 'badge badge-secondary'])) .
                html_writer::tag('td', $d['due_by'] ? userdate(strtotime($d['due_by'] . ' UTC'), '%b %d, %Y') : '—') .
                html_writer::tag('td', implode(' ', $links)),
                $isopen ? ['class' => 'table-warning'] : []);
        }
        $head = html_writer::tag('tr', implode('', array_map(function ($h) { return html_writer::tag('th', $h); },
            ['Opened', 'Customer', 'Order', 'Amount', 'Reason', 'Status', 'Evidence due', ''])));
        $this->content->text = html_writer::div(html_writer::tag('table', html_writer::tag('thead', $head) . html_writer::tag('tbody', $rows),
            ['class' => 'table table-sm']), 'table-responsive');
        $this->content->footer = 'Checked hourly from the store' . (!empty($feed['last_sync']) ? ' (last: ' . s($feed['last_sync']) . ')' : '') .
            '. Open the evidence packet, save it as PDF, upload it to the dispute in Stripe and paste the form answers.';
        return $this->content;
    }
}
