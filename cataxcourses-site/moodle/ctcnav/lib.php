<?php
defined('MOODLE_INTERNAL') || die();

/**
 * Students' left-hand menu:
 *  - Dashboard sections: My courses, Certificates, CTEC reporting, CTEC ID & PTIN (links into the Dashboard)
 *  - My courses lists only this year's courses; "Previous year courses" opens the older ones.
 */
function local_ctcnav_extend_navigation(global_navigation $nav) {
    global $CFG, $USER, $PAGE;
    try {
        require_once($CFG->dirroot . '/blocks/ctc_student/lib.php');
        if (!function_exists('block_ctc_student_is_student') || !block_ctc_student_is_student()) {
            return;
        }
        $data = block_ctc_student_courses($USER->id);
        $my = function ($anchor) { return new moodle_url('/my/', null, $anchor); };
        $before = $nav->find('calendar', navigation_node::TYPE_UNKNOWN) ? 'calendar' : null;
        $items = [
            ['ctcnav_courses', 'My courses', 'ctc-courses', 'i/course'],
            ['ctcnav_certs', 'Certificates', 'ctc-certificates', 'i/badge'],
            ['ctcnav_ctec', 'CTEC reporting', 'ctc-ctec', 'i/completion-auto-pass'],
            ['ctcnav_ids', 'CTEC ID & PTIN', 'ctc-ids', 'i/user'],
        ];
        foreach ($items as $it) {
            $node = navigation_node::create($it[1], $my($it[2]), navigation_node::TYPE_CUSTOM, null, $it[0], new pix_icon($it[3], ''));
            $node->showinflatnavigation = true;
            $nav->add_node($node, $before);
        }

        // My courses: this year's courses, then "Previous year courses" with the older ones under it (closed).
        $mc = $nav->find('mycourses', navigation_node::TYPE_ROOTNODE);
        if (!$mc) {
            return;
        }
        $prev = [];
        foreach ($data['previous'] as $c) {
            $prev[$c->id] = $c;
        }
        foreach ($mc->children as $child) {
            if ($child->type == navigation_node::TYPE_COURSE && isset($prev[$child->key])) {
                $child->remove();
            }
        }
        if ($prev) {
            $mc->add('Previous year courses', $my('ctc-previous'), navigation_node::TYPE_CUSTOM, null, 'ctcprevtoggle', new pix_icon('i/folder', ''));
            foreach ($prev as $c) {
                $mc->add($c->name . ($c->year ? ' (' . $c->year . ')' : ''), new moodle_url('/course/view.php', ['id' => $c->id]),
                    navigation_node::TYPE_CUSTOM, null, 'ctcprev_' . $c->id, new pix_icon('i/course', ''));
            }
            $PAGE->requires->js_init_code(<<<'JS'
(function(){var css=document.createElement('style');
css.textContent='a[data-key^="ctcprev_"]{display:none!important}.ctcprev-open a[data-key^="ctcprev_"]{display:block!important}a[data-key^="ctcprev_"] .media-body{font-size:.92em;opacity:.85}'
+'a[data-key="ctcprevtoggle"] .media-body::after{content:"";display:inline-block;margin-left:8px;width:7px;height:7px;border-right:2px solid currentColor;border-bottom:2px solid currentColor;transform:rotate(45deg) translateY(-3px);transition:transform .15s}'
+'.ctcprev-open a[data-key="ctcprevtoggle"] .media-body::after{transform:rotate(-135deg)}';
document.head.appendChild(css);
document.querySelectorAll('a[data-key="ctcprevtoggle"]').forEach(function(a){a.addEventListener('click',function(e){e.preventDefault();var r=a.closest('nav,.list-group,#nav-drawer')||document.body;r.classList.toggle('ctcprev-open');});});})();
JS
            );
        }
    } catch (Throwable $e) {
        debugging('local_ctcnav: ' . $e->getMessage(), DEBUG_DEVELOPER);
    }
}
