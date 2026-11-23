<?php
/**
 * Dashboard tab: the student's current renewal (or 60-Hour course) with progress, the four CTEC
 * requirements and their reporting dates, then study materials, certificates and the PTIN check.
 *
 * @package PTA_Student_Area
 */

defined('ABSPATH') || exit;

require_once __DIR__ . '/parts-icons.php';

$pta_user = wp_get_current_user();
$pta_model = PTA_SA_Account::model();
$pta_profile = PTA_SA_Student::profile($pta_user);
$pta_certs = PTA_SA_Student::certificates($pta_user);
$pta_total_hours = PTA_SA_Catalog::renewal_hours();
$pta_report_days = PTA_SA_Settings::get('report_days');

$pta_year_param = isset($_GET['year']) ? absint($_GET['year']) : 0; // phpcs:ignore WordPress.Security.NonceVerification
$pta_renewal = $pta_model['renewals'][$pta_year_param] ?? (reset($pta_model['renewals']) ?: null);
$pta_status_text = [
    'done' => 'Passed',
    'progress' => 'In progress',
    'todo' => 'Not started',
    'missing' => 'Not in your order',
];

if (!$pta_model['ok']) : ?>
    <div class="pta-sa-alert">We couldn't reach your course right now, so this shows your progress from your last visit. Refresh the page in a minute to see the latest.</div>
<?php endif;

if (!$pta_model['has_courses']) : ?>
    <section class="pta-sa-hero">
        <div>
            <h1 class="pta-sa-h1">Welcome, <?php echo esc_html($pta_profile['first']); ?></h1>
            <p class="pta-sa-sub">You're not enrolled in a course yet. Choose the course you need, and it will show up here right after checkout.</p>
        </div>
    </section>
    <div class="pta-sa-grid-2">
        <a class="pta-sa-card pta-sa-pick" href="<?php echo esc_url(PTA_SA_Settings::url('renewal_url')); ?>">
            <span class="pta-sa-pick-eyebrow">Already a CTEC preparer</span>
            <span class="pta-sa-pick-title">20-Hour CTEC Renewal</span>
            <span class="pta-sa-pick-text">All 20 hours CTEC requires each year, due October 31.</span>
            <span class="pta-sa-link">See the 20-Hour Renewal &rsaquo;</span>
        </a>
        <a class="pta-sa-card pta-sa-pick" href="<?php echo esc_url(PTA_SA_Settings::url('qe_url')); ?>">
            <span class="pta-sa-pick-eyebrow">Becoming a tax preparer</span>
            <span class="pta-sa-pick-title">60-Hour Qualifying Education</span>
            <span class="pta-sa-pick-text">The course California requires before you can register with CTEC.</span>
            <span class="pta-sa-link">See the 60-Hour course &rsaquo;</span>
        </a>
    </div>
<?php else : ?>

    <?php if ($pta_renewal) :
        $pta_next = $pta_renewal['next'];
        $pta_is_current = $pta_renewal['year'] >= PTA_SA_Catalog::current_year();
        ?>
        <section class="pta-sa-hero">
            <div>
                <h1 class="pta-sa-h1">Your <?php echo esc_html($pta_renewal['year']); ?> CTEC renewal</h1>
                <p class="pta-sa-sub">
                    <?php echo esc_html($pta_renewal['met'] . ' of ' . count($pta_renewal['rows']) . ' requirements met'); ?>
                    &middot; <?php echo esc_html($pta_renewal['hours'] . ' of ' . $pta_total_hours . ' hours'); ?>
                    <?php if ($pta_renewal['complete']) : ?>
                        &middot; complete
                    <?php elseif ($pta_is_current) : ?>
                        &middot; due October 31
                    <?php endif; ?>
                </p>
            </div>
            <?php if ($pta_next && $pta_next['course']) : ?>
                <a class="pta-sa-btn pta-sa-btn-primary" href="<?php echo esc_url(PTA_SA_Student::go_url($pta_next['course'], (string) ($pta_next['course']['nexturl'] ?? ''))); ?>">
                    <?php echo $pta_renewal['started'] ? 'Continue course' : 'Start course'; ?> &rsaquo;
                </a>
            <?php endif; ?>
        </section>

        <section class="pta-sa-card pta-sa-steps" aria-label="Renewal progress">
            <ol>
                <?php foreach ($pta_renewal['rows'] as $pta_row) :
                    $pta_step = $pta_row['status'] === 'done' ? 'is-done' : ($pta_row['current'] ? 'is-current' : 'is-upcoming');
                    $pta_step_text = $pta_row['status'] === 'done' ? 'Passed' : ($pta_row['current'] ? ($pta_row['status'] === 'progress' ? 'In progress' : 'Up next') : $pta_status_text[$pta_row['status']]);
                    ?>
                    <li class="pta-sa-step <?php echo esc_attr($pta_step); ?>">
                        <span class="pta-sa-step-dot" aria-hidden="true"></span>
                        <span class="pta-sa-step-name"><?php echo esc_html($pta_row['label']); ?></span>
                        <span class="pta-sa-step-meta"><?php echo esc_html($pta_row['hours'] . ' hrs · ' . $pta_step_text); ?></span>
                    </li>
                <?php endforeach; ?>
            </ol>
        </section>

        <section class="pta-sa-card pta-sa-reqs">
            <header class="pta-sa-card-head">
                <h2 class="pta-sa-h2">Requirements</h2>
                <?php if ($pta_report_days !== '') : ?>
                    <p class="pta-sa-muted">We report your hours to CTEC and the IRS within <?php echo esc_html($pta_report_days); ?> business days of finishing each course.</p>
                <?php endif; ?>
            </header>
            <ul class="pta-sa-req-list">
                <?php foreach ($pta_renewal['rows'] as $pta_row) :
                    $pta_course = $pta_row['course'];
                    $pta_report = $pta_course['report'] ?? [];
                    $pta_done = $pta_row['status'] === 'done';
                    ?>
                    <li class="pta-sa-req is-<?php echo esc_attr($pta_row['status']); ?>">
                        <span class="pta-sa-req-box" aria-hidden="true"><?php echo $pta_done ? pta_sa_check_icon(16) : ''; // phpcs:ignore ?></span>
                        <span class="pta-sa-req-name">
                            <strong><?php echo esc_html($pta_row['label']); ?></strong>
                            <span>CTEC requires <?php echo esc_html($pta_row['hours']); ?> hours<?php echo $pta_row['status'] !== 'done' ? ' · ' . esc_html($pta_status_text[$pta_row['status']]) : ''; ?></span>
                        </span>
                        <span class="pta-sa-req-hours"><strong><?php echo esc_html($pta_done ? $pta_row['hours'] : 0); ?></strong> / <?php echo esc_html($pta_row['hours']); ?> hrs</span>
                        <span class="pta-sa-req-report">
                            <?php if (!empty($pta_report['ctec'])) : ?>
                                <?php echo pta_sa_check_icon(14); // phpcs:ignore ?> CTEC <?php echo esc_html(pta_sa_date($pta_report['ctec'])); ?>
                            <?php else : ?>
                                <span class="pta-sa-muted">CTEC <?php echo $pta_done ? 'reporting soon' : '—'; ?></span>
                            <?php endif; ?>
                        </span>
                        <span class="pta-sa-req-report">
                            <?php if (!$pta_row['irs']) : ?>
                                <span class="pta-sa-muted">IRS not required</span>
                            <?php elseif (!empty($pta_report['irs'])) : ?>
                                <?php echo pta_sa_check_icon(14); // phpcs:ignore ?> IRS <?php echo esc_html(pta_sa_date($pta_report['irs'])); ?>
                            <?php else : ?>
                                <span class="pta-sa-muted">IRS <?php echo $pta_done ? 'reporting soon' : '—'; ?></span>
                            <?php endif; ?>
                        </span>
                        <span class="pta-sa-req-action">
                            <?php if ($pta_row['status'] === 'missing') : ?>
                                <a class="pta-sa-btn pta-sa-btn-outline" href="<?php echo esc_url(PTA_SA_Settings::url('browse_url')); ?>">Add course</a>
                            <?php elseif ($pta_done) : ?>
                                <a class="pta-sa-btn pta-sa-btn-outline" href="<?php echo esc_url(PTA_SA_Student::go_url($pta_course)); ?>">Review</a>
                            <?php else : ?>
                                <a class="pta-sa-btn pta-sa-btn-primary" href="<?php echo esc_url(PTA_SA_Student::go_url($pta_course, (string) ($pta_course['nexturl'] ?? ''))); ?>"><?php echo $pta_row['status'] === 'progress' ? 'Continue' : 'Start'; ?></a>
                            <?php endif; ?>
                        </span>
                    </li>
                <?php endforeach; ?>
            </ul>
        </section>
    <?php endif; ?>

    <?php foreach ($pta_model['qe'] as $pta_qe) :
        $pta_qe_pct = (int) ($pta_qe['percent'] ?? 0); ?>
        <section class="pta-sa-card pta-sa-qe">
            <div class="pta-sa-qe-body">
                <?php if (!$pta_renewal) : ?>
                    <h1 class="pta-sa-h1"><?php echo esc_html($pta_qe['fullname']); ?></h1>
                <?php else : ?>
                    <h2 class="pta-sa-h2"><?php echo esc_html($pta_qe['fullname']); ?></h2>
                <?php endif; ?>
                <p class="pta-sa-sub">60 hours &middot; <?php echo esc_html($pta_status_text[$pta_qe['status']]); ?><?php echo !empty($pta_qe['timecompleted']) ? ' on ' . esc_html(pta_sa_date($pta_qe['timecompleted'])) : ''; ?></p>
                <div class="pta-sa-bar" role="progressbar" aria-label="Course progress" aria-valuenow="<?php echo esc_attr($pta_qe_pct); ?>" aria-valuemin="0" aria-valuemax="100">
                    <span style="width: <?php echo esc_attr($pta_qe_pct); ?>%"></span>
                </div>
                <p class="pta-sa-muted"><?php echo esc_html($pta_qe_pct); ?>% complete</p>
            </div>
            <a class="pta-sa-btn <?php echo $pta_qe['status'] === 'done' ? 'pta-sa-btn-outline' : 'pta-sa-btn-primary'; ?>"
               href="<?php echo esc_url(PTA_SA_Student::go_url($pta_qe, $pta_qe['status'] === 'done' ? '' : (string) ($pta_qe['nexturl'] ?? ''))); ?>">
                <?php echo $pta_qe['status'] === 'done' ? 'Review course' : ($pta_qe['status'] === 'progress' ? 'Continue course' : 'Start course'); ?> &rsaquo;
            </a>
        </section>
    <?php endforeach; ?>

    <div class="pta-sa-grid-3">
        <section class="pta-sa-card pta-sa-mini">
            <h2 class="pta-sa-h3">Study materials</h2>
            <?php
            $pta_material_courses = array_values(array_filter(array_merge(
                $pta_renewal ? array_column($pta_renewal['rows'], 'course') : [],
                $pta_model['qe']
            )));
            if ($pta_material_courses) : ?>
                <ul class="pta-sa-links">
                    <?php foreach (array_slice($pta_material_courses, 0, 4) as $pta_mc) : ?>
                        <li><a href="<?php echo esc_url(PTA_SA_Student::go_url($pta_mc)); ?>">
                            <span><?php echo esc_html(PTA_SA_Catalog::all()[$pta_mc['code']]['label'] ?? $pta_mc['fullname']); ?></span>
                            <span class="pta-sa-muted">Guide &amp; audio</span><span class="pta-sa-arrow" aria-hidden="true">&darr;</span>
                        </a></li>
                    <?php endforeach; ?>
                </ul>
            <?php else : ?>
                <p class="pta-sa-muted">Your study guide and audio edition appear here once you're enrolled.</p>
            <?php endif; ?>
        </section>

        <section class="pta-sa-card pta-sa-mini">
            <h2 class="pta-sa-h3">Certificates</h2>
            <?php if ($pta_certs) : ?>
                <ul class="pta-sa-links">
                    <?php foreach (array_slice($pta_certs, 0, 3) as $pta_cert) : ?>
                        <li><a href="<?php echo esc_url($pta_cert['url'] ?? '#'); ?>">
                            <span><?php echo esc_html($pta_cert['title'] ?? ''); ?></span><span class="pta-sa-arrow" aria-hidden="true">&darr;</span>
                        </a></li>
                    <?php endforeach; ?>
                </ul>
            <?php else : ?>
                <p class="pta-sa-muted">Your certificate appears here as soon as you pass a course.</p>
            <?php endif; ?>
        </section>

        <section class="pta-sa-card pta-sa-mini <?php echo $pta_profile['missing'] ? 'pta-sa-warn' : 'pta-sa-soft'; ?>">
            <?php if ($pta_profile['missing']) : ?>
                <h2 class="pta-sa-h3">Add your PTIN and CTEC ID</h2>
                <p>We need both to report your hours to CTEC and the IRS.</p>
                <a class="pta-sa-link" href="<?php echo esc_url(wc_get_account_endpoint_url('edit-account')); ?>">Add your details &rsaquo;</a>
            <?php else : ?>
                <h2 class="pta-sa-h3">Check your PTIN and CTEC ID</h2>
                <p>Wrong details mean we can't report your hours.</p>
                <p class="pta-sa-muted">PTIN <?php echo esc_html($pta_profile['ptin_masked']); ?> &middot; CTEC <?php echo esc_html($pta_profile['ctec']); ?></p>
                <a class="pta-sa-link" href="<?php echo esc_url(wc_get_account_endpoint_url('edit-account')); ?>">Review details &rsaquo;</a>
            <?php endif; ?>
        </section>
    </div>
<?php endif; ?>
