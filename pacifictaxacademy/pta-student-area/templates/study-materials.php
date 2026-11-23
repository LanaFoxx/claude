<?php
/**
 * Study Materials tab: the study guide and audio edition for each course.
 *
 * @package PTA_Student_Area
 */

defined('ABSPATH') || exit;

$pta_result = PTA_SA_Student::courses(wp_get_current_user());
$pta_catalog = PTA_SA_Catalog::all();
$pta_current = array_filter($pta_result['courses'], static function ($c) {
    return PTA_SA_Catalog::parse((string) ($c['shortname'] ?? ''))['year'] >= PTA_SA_Catalog::current_year() - 1;
});
?>
<h1 class="pta-sa-h1">Study Materials</h1>
<p class="pta-sa-sub">Every course includes a study guide and an audio edition. They're supplemental material and don't count toward your CE hours.</p>

<section class="pta-sa-card">
    <?php if (!$pta_current) : ?>
        <div class="pta-sa-empty"><p>Your study guide and audio edition appear here once you're enrolled.</p></div>
    <?php else : ?>
        <ul class="pta-sa-cert-list">
            <?php foreach ($pta_current as $pta_c) :
                $pta_code = PTA_SA_Catalog::parse((string) $pta_c['shortname'])['code']; ?>
                <li class="pta-sa-cert">
                    <span class="pta-sa-cert-main">
                        <strong><?php echo esc_html($pta_c['fullname']); ?></strong>
                        <span class="pta-sa-muted">Study guide (PDF) and audio edition (MP3), inside your course</span>
                    </span>
                    <a class="pta-sa-btn pta-sa-btn-outline" href="<?php echo esc_url(PTA_SA_Student::go_url($pta_c)); ?>">Open materials &rsaquo;</a>
                </li>
            <?php endforeach; ?>
        </ul>
    <?php endif; ?>
</section>
