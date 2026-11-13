<?php
// Cabrera Torres lead tracking: installed on cabreratorres.com through the Code Snippets plugin as the snippet
// "CT lead tracking" (front-end + form submissions). Keep this file in sync with the live snippet.
//
// What it does
//  1. Every page: remembers where a visitor came from (utm_* tags, fbclid, gclid) and writes it, with the Meta
//     browser/click IDs and a de-duplication event ID, into the hidden fields of any Elementor form.
//  2. Meta Pixel and Google Analytics 4 (each only once its ID is filled in), loaded after the page has rendered so
//     they do not cost PageSpeed. Phone-number taps count as "Contact" / "click_to_call".
//  3. Thank-you page: fires the conversion (Meta "Lead", GA4 "generate_lead") with the same event ID as the server.
//  4. Form submission (landing-page and contact forms): sends the lead to Meta's Conversions API and to Clio Grow's
//     Lead Inbox, server-side, each only once its token is filled in. Elementor's own email notification still goes out.
//
// The IDs and tokens below are filled in on the LIVE snippet only. Never commit real tokens to the repository.
if ( ! defined( 'CT_META_PIXEL_ID' ) ) {
	define( 'CT_META_PIXEL_ID', '' );        // Meta Events Manager > Data sources > (pixel) > Pixel ID
	define( 'CT_META_CAPI_TOKEN', '' );      // Events Manager > (pixel) > Settings > Conversions API > Generate access token
	define( 'CT_META_TEST_CODE', '' );       // Optional: Events Manager > Test events code, while testing only
	define( 'CT_GA4_ID', '' );               // GA4 > Admin > Data streams > Measurement ID (G-XXXXXXX)
	define( 'CT_CLIO_GROW_TOKEN', '' );      // Clio Grow > Settings > Lead Inbox (Lead Form / API) > inbox lead token
}

// 1-2. Attribution capture + tags.
add_action( 'wp_footer', function () {
	$pixel = CT_META_PIXEL_ID;
	$ga4   = CT_GA4_ID;
	?>
<script id="ct-lead-tracking">
(function(){
var K=['utm_source','utm_medium','utm_campaign','utm_content','utm_term','fbclid','gclid'],q=new URLSearchParams(location.search),s={};
try{s=JSON.parse(localStorage.getItem('ct_attr')||'{}')}catch(e){}
if(K.some(function(k){return q.get(k)})){s={};K.forEach(function(k){s[k]=q.get(k)||''});s.landing_url=location.href.split('#')[0];s.ts=Date.now();try{localStorage.setItem('ct_attr',JSON.stringify(s))}catch(e){}}
if(!s.landing_url)s.landing_url=location.href.split('#')[0];
function ck(n){var m=document.cookie.match('(?:^|; )'+n+'=([^;]*)');return m?decodeURIComponent(m[1]):''}
var eid='lead.'+Date.now().toString(36)+'.'+Math.random().toString(36).slice(2,10);
function fill(){var fbc=ck('_fbc')||(s.fbclid?'fb.1.'+(s.ts||Date.now())+'.'+s.fbclid:'');
document.querySelectorAll('form.elementor-form').forEach(function(f){function set(n,v){var i=f.querySelector('[name="form_fields['+n+']"]');if(i)i.value=v||''}
K.forEach(function(k){set(k,s[k])});set('landing_url',s.landing_url);set('fbp',ck('_fbp'));set('fbc',fbc);set('event_id',eid)})}
fill();document.addEventListener('submit',fill,true);
var P=<?php echo wp_json_encode( $pixel ); ?>,G=<?php echo wp_json_encode( $ga4 ); ?>;
function tags(){
 if(P&&!window.fbq){!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init',P);fbq('track','PageView')}
 if(G&&!window.gtag){var g=document.createElement('script');g.async=1;g.src='https://www.googletagmanager.com/gtag/js?id='+G;document.head.appendChild(g);window.dataLayer=window.dataLayer||[];window.gtag=function(){dataLayer.push(arguments)};gtag('js',new Date());gtag('config',G)}
 var t=new URLSearchParams(location.search);
 if(document.body.classList.contains('ct-thank-you')||/\/thank-you\/?$/.test(location.pathname)){var id=t.get('eid')||'',lp=t.get('lp')||'';
  if(window.fbq)fbq('track','Lead',{content_name:lp},{eventID:id});if(window.gtag)gtag('event','generate_lead',{lp_variant:lp})}
}
if(P||G){var go=function(){setTimeout(tags,1200)};document.readyState==='complete'?go():addEventListener('load',go);
 document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href^="tel:"]');if(!a)return;tags();if(window.fbq)fbq('track','Contact');if(window.gtag)gtag('event','click_to_call',{link_url:a.href})},true)}
})();
</script>
	<?php
}, 99 );

// 4. Server-side: Meta Conversions API + Clio Grow Lead Inbox.
add_action( 'elementor_pro/forms/new_record', function ( $record ) {
	$form = (string) $record->get_form_settings( 'form_name' );
	if ( 0 !== strpos( $form, 'LP Lead' ) && 'Free Case Evaluation' !== $form ) {
		return;
	}
	$f = array();
	foreach ( (array) $record->get( 'fields' ) as $id => $field ) {
		$f[ $id ] = is_array( $field['value'] ) ? implode( ', ', $field['value'] ) : trim( (string) $field['value'] );
	}
	$g = function ( $k ) use ( $f ) {
		return isset( $f[ $k ] ) ? $f[ $k ] : '';
	};
	$ip = isset( $_SERVER['HTTP_X_FORWARDED_FOR'] ) ? trim( explode( ',', $_SERVER['HTTP_X_FORWARDED_FOR'] )[0] ) : ( $_SERVER['REMOTE_ADDR'] ?? '' );

	// Meta Conversions API (same event_id as the browser "Lead", so Meta counts it once).
	if ( CT_META_PIXEL_ID && CT_META_CAPI_TOKEN ) {
		$hash  = function ( $v ) {
			return '' === $v ? null : hash( 'sha256', strtolower( trim( $v ) ) );
		};
		$phone = preg_replace( '/\D/', '', $g( 'phone' ) );
		if ( 10 === strlen( $phone ) ) {
			$phone = '1' . $phone;
		}
		$user = array( 'client_ip_address' => $ip, 'client_user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? '', 'country' => array( $hash( 'us' ) ) );
		foreach ( array( 'em' => $g( 'email' ), 'ph' => $phone, 'fn' => $g( 'first_name' ), 'ln' => $g( 'last_name' ) ) as $k => $v ) {
			if ( '' !== $v ) {
				$user[ $k ] = array( $hash( $v ) );
			}
		}
		foreach ( array( 'fbp', 'fbc' ) as $k ) {
			if ( '' !== $g( $k ) ) {
				$user[ $k ] = $g( $k );
			}
		}
		$body = array( 'data' => array( array(
			'event_name'       => 'Lead',
			'event_time'       => time(),
			'event_id'         => $g( 'event_id' ),
			'action_source'    => 'website',
			'event_source_url' => $g( 'landing_url' ) ?: home_url( '/' ),
			'user_data'        => $user,
			'custom_data'      => array( 'lead_type' => $g( 'accident_type' ), 'lp_variant' => $g( 'lp_variant' ), 'utm_campaign' => $g( 'utm_campaign' ), 'utm_content' => $g( 'utm_content' ) ),
		) ) );
		if ( CT_META_TEST_CODE ) {
			$body['test_event_code'] = CT_META_TEST_CODE;
		}
		$r = wp_remote_post( 'https://graph.facebook.com/v21.0/' . rawurlencode( CT_META_PIXEL_ID ) . '/events?access_token=' . rawurlencode( CT_META_CAPI_TOKEN ), array(
			'timeout' => 6, 'headers' => array( 'Content-Type' => 'application/json' ), 'body' => wp_json_encode( $body ),
		) );
		if ( is_wp_error( $r ) || wp_remote_retrieve_response_code( $r ) >= 300 ) {
			error_log( 'CT CAPI failed: ' . ( is_wp_error( $r ) ? $r->get_error_message() : wp_remote_retrieve_body( $r ) ) );
		}
	}

	// Clio Grow Lead Inbox: the lead lands in Clio Grow with the ad / campaign it came from.
	if ( CT_CLIO_GROW_TOKEN ) {
		$src = trim( $g( 'utm_source' ) . ' / ' . $g( 'utm_medium' ), ' /' );
		$msg = implode( "\n", array_filter( array(
			'Accident type: ' . $g( 'accident_type' ),
			$g( 'message' ) ? 'What happened: ' . $g( 'message' ) : '',
			'SMS consent: ' . ( $g( 'sms_consent' ) ? 'yes' : 'no' ),
			'Form: ' . $form . ( $g( 'lp_variant' ) ? ' (' . $g( 'lp_variant' ) . ')' : '' ),
			$g( 'utm_campaign' ) ? 'Campaign: ' . $g( 'utm_campaign' ) : '',
			$g( 'utm_content' ) ? 'Ad: ' . $g( 'utm_content' ) : '',
			$g( 'utm_term' ) ? 'Ad set / term: ' . $g( 'utm_term' ) : '',
			$g( 'fbclid' ) ? 'fbclid: ' . $g( 'fbclid' ) : '',
			$g( 'gclid' ) ? 'gclid: ' . $g( 'gclid' ) : '',
		) ) );
		$r = wp_remote_post( 'https://grow.clio.com/inbox_leads', array(
			'timeout' => 8, 'headers' => array( 'Content-Type' => 'application/json' ),
			'body'    => wp_json_encode( array(
				'inbox_lead'       => array(
					'from_first'    => $g( 'first_name' ),
					'from_last'     => $g( 'last_name' ),
					'from_email'    => $g( 'email' ),
					'from_phone'    => $g( 'phone' ),
					'from_message'  => $msg,
					'referring_url' => $g( 'landing_url' ) ?: home_url( '/' ),
					'from_source'   => $src ?: 'Website',
				),
				'inbox_lead_token' => CT_CLIO_GROW_TOKEN,
			) ),
		) );
		if ( is_wp_error( $r ) || wp_remote_retrieve_response_code( $r ) >= 300 ) {
			error_log( 'CT Clio Grow failed: ' . ( is_wp_error( $r ) ? $r->get_error_message() : wp_remote_retrieve_body( $r ) ) );
		}
	}
}, 10, 1 );
