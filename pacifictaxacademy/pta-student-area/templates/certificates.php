<?php
/**
 * Certificates tab: every certificate, newest first.
 *
 * @package PTA_Student_Area
 */

defined('ABSPATH') || exit;

require_once __DIR__ . '/parts-icons.php';

$pta_certs = PTA_SA_Student::certificates(wp_get_current_user());
?>
<h1 class="pta-sa-h1">Certificates</h1>
<p class="pta-sa-sub">Download a certificate any time. We keep them for at least four years.</p>

<section class="pta-sa-card">
    <?php if (!$pta_certs) : ?>
        <div class="pta-sa-empty">
            <p>Your certificate appears here as soon as you pass a course.</p>
        </div>
    <?php else : ?>
        <ul class="pta-sa-cert-list">
            <?php foreach ($pta_certs as $pta_cert) : ?>
                <li class="pta-sa-cert">
                    <span class="pta-sa-cert-main">
                        <strong><?php echo esc_html($pta_cert['title'] ?? ''); ?></strong>
                        <span class="pta-sa-muted">
                            Completed <?php echo esc_html(pta_sa_date($pta_cert['date'] ?? '')); ?>
                            <?php echo !empty($pta_cert['ctec_course']) ? ' · CTEC course ' . esc_html($pta_cert['ctec_course']) : ''; ?>
                        </span>
                    </span>
                    <a class="pta-sa-btn pta-sa-btn-outline" href="<?php echo esc_url($pta_cert['url'] ?? '#'); ?>">Download PDF</a>
                </li>
            <?php endforeach; ?>
        </ul>
    <?php endif; ?>
</section>
