<?php
/**
 * Spam protection for every form on the site (Contact, Onboarding, the homepage message form and
 * the hosting checkout), with nothing for real visitors to click or solve:
 *
 * - a hidden "honeypot" field that people never see but bots fill in;
 * - proof that a person was there: the page's script marks the form once someone types, taps or
 *   clicks, and records how long the form was open (bots submit instantly, or without running scripts).
 *
 * The fields are added by script, so they work on cached pages.
 * The homepage form also now sends its message here (it used to open the visitor's mail app).
 */
defined( 'ABSPATH' ) || exit;

const DWDP_SPAM_MIN_SECONDS = 3;
const DWDP_CONTACT_TO       = 'info@dreamwebdigital.com';

/** True when the posted form passed the checks. */
function dwdp_spam_ok( $src = null ) {
	$src = null === $src ? $_POST : $src; // phpcs:ignore WordPress.Security.NonceVerification
	if ( ! empty( $src['dwdp_hp'] ) ) {
		return false;
	}
	if ( empty( $src['dwdp_h'] ) || '1' !== (string) $src['dwdp_h'] ) {
		return false;
	}
	return isset( $src['dwdp_e'] ) && (float) $src['dwdp_e'] >= DWDP_SPAM_MIN_SECONDS;
}

add_action( 'wp_footer', function () {
	$ajax = esc_url( admin_url( 'admin-ajax.php' ) );
	?>
<script>(function(){
var t0=Date.now(),human=false;
['keydown','pointerdown','touchstart','focusin'].forEach(function(ev){window.addEventListener(ev,function(){human=true;mark();},{passive:true,once:true});});
function sel(){return document.querySelectorAll('form.elementor-form,form.dw-form,form.dwr-form,form.checkout,form.woocommerce-checkout');}
function add(f){if(f.querySelector('[name=dwdp_hp]'))return;
var w=document.createElement('div');w.setAttribute('aria-hidden','true');w.style.cssText='position:absolute!important;left:-9999px!important;top:auto;width:1px;height:1px;overflow:hidden';
w.innerHTML='<label>Leave this empty<input type="text" name="dwdp_hp" tabindex="-1" autocomplete="off" value=""></label>';
f.appendChild(w);['dwdp_h','dwdp_e'].forEach(function(n){var i=document.createElement('input');i.type='hidden';i.name=n;i.value='0';f.appendChild(i);});}
function mark(){sel().forEach(function(f){add(f);var h=f.querySelector('[name=dwdp_h]'),e=f.querySelector('[name=dwdp_e]');if(h)h.value=human?'1':'0';if(e)e.value=((Date.now()-t0)/1000).toFixed(1);});}
sel().forEach(add);
// Keep the timer current right before any of these forms is sent (Elementor and WooCommerce read the fields then).
document.addEventListener('submit',function(){mark();},true);
document.addEventListener('click',function(ev){if(ev.target.closest&&ev.target.closest('button,[type=submit],#place_order'))mark();},true);
if(window.jQuery){jQuery(document.body).on('updated_checkout',function(){sel().forEach(add);mark();});}
// Homepage message form and the redesigned Contact form (dwr-form): send to the site instead of opening the mail app.
document.addEventListener('submit',function(ev){var f=ev.target;if(!f.classList||!(f.classList.contains('dw-form')||f.classList.contains('dwr-form')))return;var rd=f.classList.contains('dwr-form');
ev.preventDefault();ev.stopImmediatePropagation();
if(rd){var bad=f.querySelector('[required]:invalid');if(bad){bad.focus();if(bad.reportValidity)bad.reportValidity();return;}}
mark();var b=f.querySelector('button[type=submit]'),n=f.querySelector(rd?'.dwr-note':'.dw-fnote');
if(rd&&!n){n=document.createElement('p');n.className='dwr-note';n.setAttribute('role','status');(f.querySelector('.dwr-fields')||f).appendChild(n);}
if(b){b.disabled=true;}var d=new FormData(f);d.append('action','dwdp_contact');
fetch('<?php echo $ajax; // phpcs:ignore ?>',{method:'POST',body:d,credentials:'same-origin'}).then(function(r){return r.json();}).then(function(r){
if(r&&r.success){f.reset();try{document.dispatchEvent(new Event('dwd:lead'));}catch(x){}if(rd){n.textContent='';f.setAttribute('data-sent','1');var ok=f.querySelector('.dwr-sent');if(ok){ok.hidden=false;}return;}if(n){n.textContent='Thanks! Your message is on its way. I’ll reply the same day.';n.style.color='#1B7EC3';}}
else{if(n){n.textContent=(r&&r.data)||'Sorry, that didn’t send. Please call (772) 210-1728.';n.style.color='#D63638';}}
}).catch(function(){if(n){n.textContent='Sorry, that didn’t send. Please call (772) 210-1728.';n.style.color='#D63638';}}).then(function(){if(b){b.disabled=false;}});
},true);
})();</script>
	<?php
}, 50 );

/* ---------- Elementor forms (Contact, Onboarding) ---------- */

add_action( 'elementor_pro/forms/validation', function ( $record, $ajax_handler ) {
	if ( dwdp_spam_ok() ) {
		return;
	}
	$fields = array_keys( (array) $record->get( 'fields' ) );
	$ajax_handler->add_error( $fields ? $fields[0] : 'name', 'Please wait a moment and try again.' );
}, 5, 2 );

/* ---------- Hosting checkout ---------- */

add_action( 'woocommerce_after_checkout_validation', function ( $data, $errors ) {
	if ( ! dwdp_spam_ok() ) {
		$errors->add( 'dwdp_spam', 'Sorry, we couldn’t place that order. Please wait a moment and try again, or call (772) 210-1728.' );
	}
}, 10, 2 );

/* ---------- Homepage message form ---------- */

function dwdp_ajax_contact() {
	// No nonce: the homepage is cached for longer than a nonce lives; the spam checks below guard it.
	if ( ! dwdp_spam_ok() ) {
		wp_send_json_error( 'Sorry, that didn’t send. Please wait a moment and try again.' );
	}
	// At most 5 messages from one address in 10 minutes.
	$ip  = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '';
	$key = 'dwdp_contact_' . md5( $ip );
	$n   = (int) get_transient( $key );
	if ( $n >= 5 ) {
		wp_send_json_error( 'Too many messages. Please call (772) 210-1728.' );
	}
	set_transient( $key, $n + 1, 10 * MINUTE_IN_SECONDS );

	$name    = sanitize_text_field( wp_unslash( $_POST['name'] ?? '' ) );
	$email   = sanitize_email( wp_unslash( $_POST['email'] ?? '' ) );
	$message = sanitize_textarea_field( wp_unslash( $_POST['message'] ?? '' ) );
	if ( '' === $name || ! is_email( $email ) || '' === $message ) {
		wp_send_json_error( 'Please fill in your name, a valid email and a message.' );
	}
	// Links-heavy messages are almost always spam.
	if ( preg_match_all( '#https?://#i', $message ) > 2 ) {
		wp_send_json_error( 'Please remove the links and try again.' );
	}
	// The redesigned Contact form also asks for a phone number and the current website.
	$phone = sanitize_text_field( wp_unslash( $_POST['phone'] ?? '' ) );
	$site  = esc_url_raw( wp_unslash( $_POST['website'] ?? '' ) );
	$extra = ( $phone ? "Phone: {$phone}\n" : '' ) . ( $site ? "Website: {$site}\n" : '' );
	$body  = "Name: {$name}\nEmail: {$email}\n{$extra}Message: {$message}\n\n— Sent from the form on " . esc_url_raw( wp_get_referer() ?: home_url( '/' ) );
	$sent = wp_mail( DWDP_CONTACT_TO, 'Website inquiry from ' . $name, $body, array( 'Reply-To: ' . $name . ' <' . $email . '>' ) );
	// File it in Dream Desk like the Elementor forms (contact, entry, "Reply to …" task).
	if ( function_exists( 'dwdc_file_entry' ) ) {
		$fields = array(
			array( 'id' => 'name', 'label' => 'Name', 'value' => $name ),
			array( 'id' => 'email', 'label' => 'Email', 'value' => $email ),
			array( 'id' => 'phone', 'label' => 'Phone', 'value' => $phone ),
			array( 'id' => 'website', 'label' => 'Current website', 'value' => $site ),
			array( 'id' => 'message', 'label' => 'Message', 'value' => $message ),
		);
		$cid = dwdc_file_entry( 'Contact', array_values( array_filter( $fields, function ( $f ) { return '' !== $f['value']; } ) ) );
		if ( $cid ) {
			dwdc_ensure_client( $cid );
			dwdc_add_task( 'Reply to ' . get_the_title( $cid ), $cid, current_time( 'Y-m-d' ) );
		}
	}
	$sent ? wp_send_json_success() : wp_send_json_error( 'Sorry, that didn’t send. Please call (772) 210-1728.' );
}
add_action( 'wp_ajax_dwdp_contact', 'dwdp_ajax_contact' );
add_action( 'wp_ajax_nopriv_dwdp_contact', 'dwdp_ajax_contact' );
