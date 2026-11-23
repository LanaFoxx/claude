<?php
/**
 * My Courses tab: every enrollment, newest year first.
 *
 * @package PTA_Student_Area
 */

defined('ABSPATH') || exit;

require_once __DIR__ . '/parts-icons.php';

$pta_user = wp_get_current_user();
$pta_result = PTA_SA_Student::courses($pta_user);
$pta_reports = PTA_SA_Student::reports($pta_user);
$pta_catalog = PTA_SA_Catalog::all();
$pta_by_year = [];
foreach ($pta_result['courses'] as $pta_c) {
    $pta_p = PTA_SA_Catalog::parse((string) ($pta_c['shortname'] ?? ''));
    $pta_c['code'] = $pta_p['code'];
    $pta_by_year[$pta_p['year']][] = $pta_c;
}
krsort($pta_by_year);
?>
<h1 class="pta-sa-h1">My Courses</h1>
<p class="pta-sa-sub">Every course you've taken with us. Finished courses stay open so you can review them.</p>

<?php if (!$pta_by_year) : ?>
    <section class="pta-sa-card pta-sa-empty">
        <p>You're not enrolled in a course yet.</p>
        <a class="pta-sa-btn pta-sa-btn-primary" href="<?php echo esc_url(PTA_SA_Settings::url('browse_url')); ?>">Browse courses &rsaquo;</a>
    </section>
<?php endif; ?>

<?php foreach ($pta_by_year as $pta_year => $pta_courses) : ?>
    <section class="pta-sa-card pta-sa-course-group">
        <header class="pta-sa-card-head"><h2 class="pta-sa-h2"><?php echo esc_html($pta_year); ?> CE year</h2></header>
        <ul class="pta-sa-course-list">
            <?php foreach ($pta_courses as $pta_c) :
                $pta_pct = (int) ($pta_c['percent'] ?? 0);
                $pta_done = !empty($pta_c['completed']);
                $pta_started = $pta_done || !empty($pta_c['lastaccess']) || $pta_pct > 0;
                $pta_rep = $pta_reports[$pta_c['shortname']] ?? [];
                $pta_item = $pta_catalog[$pta_c['code']] ?? null;
                ?>
                <li class="pta-sa-course">
                    <div class="pta-sa-course-main">
                        <strong><?php echo esc_html($pta_c['fullname']); ?></strong>
                        <span class="pta-sa-muted">
                            <?php echo $pta_item ? esc_html($pta_item['hours'] . ' hours · ') : ''; ?>
                            <?php if ($pta_done) : ?>
                                Passed <?php echo esc_html(pta_sa_date($pta_c['timecompleted'] ?? '')); ?>
                            <?php else : ?>
                                <?php echo $pta_started ? 'In progress' : 'Not started'; ?>
                            <?php endif; ?>
                        </span>
                        <div class="pta-sa-bar" role="progressbar" aria-label="Progress" aria-valuenow="<?php echo esc_attr($pta_pct); ?>" aria-valuemin="0" aria-valuemax="100"><span style="width: <?php echo esc_attr($pta_pct); ?>%"></span></div>
                    </div>
                    <div class="pta-sa-course-reports">
                        <span><?php echo !empty($pta_rep['ctec']) ? pta_sa_check_icon(14) . ' CTEC ' . esc_html(pta_sa_date($pta_rep['ctec'])) : '<span class="pta-sa-muted">CTEC —</span>'; // phpcs:ignore ?></span>
                        <?php if (!$pta_item || $pta_item['irs']) : ?>
                            <span><?php echo !empty($pta_rep['irs']) ? pta_sa_check_icon(14) . ' IRS ' . esc_html(pta_sa_date($pta_rep['irs'])) : '<span class="pta-sa-muted">IRS —</span>'; // phpcs:ignore ?></span>
                        <?php endif; ?>
                    </div>
                    <a class="pta-sa-btn <?php echo $pta_done ? 'pta-sa-btn-outline' : 'pta-sa-btn-primary'; ?>"
                       href="<?php echo esc_url(PTA_SA_Student::go_url($pta_c, $pta_done ? '' : (string) ($pta_c['nexturl'] ?? ''))); ?>">
                        <?php echo $pta_done ? 'Review course' : ($pta_started ? 'Continue course' : 'Start course'); ?> &rsaquo;
                    </a>
                </li>
            <?php endforeach; ?>
        </ul>
    </section>
<?php endforeach; ?>
