<?php
namespace theme_glec\output;
defined('MOODLE_INTERNAL') || die();

class core_renderer extends \theme_boost\output\core_renderer {
    /**
     * The site's "Additional HTML" (footer) contains a jQuery script that disables right-click on course pages.
     * The previous theme (Adaptable) loaded jQuery globally; Boost does not, so we load it here to keep that protection working.
     */
    public function standard_head_html() {
        $this->page->requires->jquery();
        return parent::standard_head_html();
    }
    /** Staff see Moodle's full navigation (drawer, user menu); students see the clean GLEC header. */
    public function glec_is_staff() {
        global $PAGE;
        return is_siteadmin() || has_capability('moodle/course:update', $PAGE->context) || has_capability('moodle/site:config', \context_system::instance());
    }
    public function glec_logo_url() { return (new \moodle_url('/theme/glec/pix/glec-logo.png'))->out(false); }
    public function glec_site_url() { return 'https://georgialicenseexam.com/'; }
    public function glec_mycourses_url() { return (new \moodle_url('/my/'))->out(false); }
    public function glec_logout_url() { return (new \moodle_url('/login/logout.php', ['sesskey' => sesskey()]))->out(false); }
    public function glec_login_url() { return (new \moodle_url('/login/index.php'))->out(false); }
    public function glec_is_mycourses() { global $PAGE; return strpos($PAGE->pagetype, 'my-index') === 0 || strpos($PAGE->pagetype, 'course-view') === 0; }
    public function glec_isloggedin() { return isloggedin() && !isguestuser(); }
}
