<?php
/**
 * Google Ads: remember ad clicks so Dream Desk can mark leads "Google Ads" (with the campaign and
 * search term), and report conversions to Google Ads (form leads, bookings, phone taps) once the
 * tag ID and labels are set in Portfolio → Settings → Google Ads tracking.
 */
defined( 'ABSPATH' ) || exit;

/** The remembered ad click for this visitor, or null. Array( c => campaign, t => term, d => date ). */
function dwdp_ad_click() {
	if ( empty( $_COOKIE['dwd_ad'] ) ) {
		return null;
	}
	$a = json_decode( wp_unslash( (string) $_COOKIE['dwd_ad'] ), true ); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput
	if ( ! is_array( $a ) ) {
		return null;
	}
	return array(
		'c' => mb_substr( sanitize_text_field( (string) ( $a['c'] ?? '' ) ), 0, 80 ),
		't' => mb_substr( sanitize_text_field( (string) ( $a['t'] ?? '' ) ), 0, 80 ),
		'd' => sanitize_text_field( (string) ( $a['d'] ?? '' ) ),
	);
}

add_action( 'wp_head', function () {
	if ( is_admin() ) {
		return;
	}
	$id   = preg_replace( '/[^A-Za-z0-9\-]/', '', (string) dwdp_setting( 'gads_id' ) );
	$lead = preg_replace( '/[^A-Za-z0-9_\-]/', '', (string) dwdp_setting( 'gads_lead' ) );
	$call = preg_replace( '/[^A-Za-z0-9_\-]/', '', (string) dwdp_setting( 'gads_call' ) );
	if ( $id && 0 !== stripos( $id, 'AW-' ) ) {
		$id = 'AW-' . $id;
	}
	?>
<script>
(function(){
	// Remember a click from a Google ad for 90 days (gclid, or utm tags with cpc/ppc).
	try {
		var q = new URLSearchParams(location.search), g = q.get('gclid') || q.get('gbraid') || q.get('wbraid'), m = (q.get('utm_medium') || '').toLowerCase();
		if (g || /^(cpc|ppc|paid|paidsearch)$/.test(m)) {
			var v = JSON.stringify({ c: q.get('utm_campaign') || q.get('campaign') || '', t: q.get('utm_term') || '', d: new Date().toISOString().slice(0, 10) });
			document.cookie = 'dwd_ad=' + encodeURIComponent(v) + ';path=/;max-age=7776000;SameSite=Lax' + (location.protocol === 'https:' ? ';Secure' : '');
		}
	} catch (e) {}
})();
</script>
	<?php if ( $id ) : ?>
<script>
// Speed: the Google Ads tag loads on the visitor's first scroll, tap, click or keypress (right away for ad clicks).
// Everything below queues in dataLayer until then, so no conversion is lost.
(function () {
	var done = false, ev = ['scroll', 'pointerdown', 'touchstart', 'keydown', 'mousemove', 'wheel'];
	function load() {
		if (done) { return; } done = true;
		ev.forEach(function (n) { removeEventListener(n, load, { passive: true }); });
		var s = document.createElement('script'); s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=<?php echo esc_js( $id ); ?>'; document.head.appendChild(s);
	}
	if (/[?&](gclid|gbraid|wbraid)=/.test(location.search)) { load(); return; }
	ev.forEach(function (n) { addEventListener(n, load, { passive: true, once: true }); });
})();
</script>
<script>
window.dataLayer = window.dataLayer || []; function gtag(){ dataLayer.push(arguments); }
gtag('js', new Date()); gtag('config', '<?php echo esc_js( $id ); ?>');
(function(){
	var ID = '<?php echo esc_js( $id ); ?>', LEAD = '<?php echo esc_js( $lead ); ?>', CALL = '<?php echo esc_js( $call ); ?>', sent = {};
	function conv(label, key) { if (!label || sent[key]) { return; } sent[key] = 1; gtag('event', 'conversion', { send_to: ID + '/' + label }); }
	// Phone taps
	document.addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('a[href^="tel:"]'); if (a) { conv(CALL, 'call'); } }, true);
	// Elementor forms (contact form)
	document.addEventListener('submit_success', function () { conv(LEAD, 'lead'); });
	if (window.jQuery) { jQuery(document).on('submit_success', function () { conv(LEAD, 'lead'); }); }
	// Dream Web Digital forms (contact/onboarding) announce success with this event
	document.addEventListener('dwd:lead', function () { conv(LEAD, 'lead'); });
	// Calendly bookings
	window.addEventListener('message', function (e) { if (e.data && e.data.event === 'calendly.event_scheduled') { conv(LEAD, 'lead'); } });
})();
</script>
	<?php
	endif;
}, 3 );
