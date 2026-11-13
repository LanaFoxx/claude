<?php
/**
 * Plugin Name: Denninger Resolutions Site
 * Description: Design system, header/footer, page template, forms (inquiry, booking request, payment reference) and SEO for the Denninger Resolutions website.
 * Version: 1.0.3
 * Author: Dream Web Digital
 * Requires at least: 6.2
 * Requires PHP: 7.4
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'DR_SITE_VER', '1.0.3' );
define( 'DR_SITE_DIR', plugin_dir_path( __FILE__ ) );
define( 'DR_SITE_URL', plugin_dir_url( __FILE__ ) );
define( 'DR_TEMPLATE', 'dr-full-width.php' );

/* -------------------------------------------------------------------------
 * Settings
 * ---------------------------------------------------------------------- */

function dr_defaults() {
	return array(
		'notify_email'  => get_option( 'admin_email' ),
		'public_email'  => 'David@DenningerResolutions.com',
		'phone'         => '(828) 555-0142',
		'address'       => '9 SW Pack Square, Suite 210B, Asheville, NC 28801',
		'mediator_name' => 'David H. Denninger',
		'credential'    => 'NCDRC Certified Superior Court Mediator',
		'processor'     => 'LawPay',
		'payment_url'   => '',
		'pass_fee'      => 1,
		'card_fee_pct'  => 3,
		'horizon_days'  => 90,
		'blocked_dates' => '',
	);
}

function dr_opt( $key = null ) {
	$o = wp_parse_args( (array) get_option( 'dr_settings', array() ), dr_defaults() );
	return null === $key ? $o : ( isset( $o[ $key ] ) ? $o[ $key ] : '' );
}

function dr_tel( $phone ) {
	$d = preg_replace( '/\D+/', '', $phone );
	if ( 10 === strlen( $d ) ) {
		$d = '1' . $d;
	}
	return 'tel:+' . $d;
}

add_action( 'admin_menu', function () {
	add_options_page( 'Denninger Site', 'Denninger Site', 'manage_options', 'dr-site', 'dr_settings_page' );
} );

add_action( 'admin_init', function () {
	register_setting( 'dr_settings', 'dr_settings', array(
		'sanitize_callback' => function ( $in ) {
			$d   = dr_defaults();
			$out = array();
			foreach ( $d as $k => $v ) {
				$val = isset( $in[ $k ] ) ? $in[ $k ] : '';
				switch ( $k ) {
					case 'notify_email':
					case 'public_email':
						$out[ $k ] = sanitize_email( $val );
						break;
					case 'payment_url':
						$out[ $k ] = esc_url_raw( $val );
						break;
					case 'pass_fee':
						$out[ $k ] = empty( $val ) ? 0 : 1;
						break;
					case 'card_fee_pct':
						$out[ $k ] = max( 0, min( 5, (float) $val ) );
						break;
					case 'horizon_days':
						$out[ $k ] = max( 14, min( 365, (int) $val ) );
						break;
					case 'blocked_dates':
						$out[ $k ] = sanitize_textarea_field( $val );
						break;
					default:
						$out[ $k ] = sanitize_text_field( $val );
				}
			}
			return $out;
		},
	) );
} );

function dr_settings_page() {
	$o      = dr_opt();
	$fields = array(
		'notify_email'  => array( 'Form notifications go to', 'email', 'Inquiries, booking requests and payment references are emailed here (and saved under Submissions).' ),
		'public_email'  => array( 'Public email', 'email', 'Shown in the header, footer and mediator details.' ),
		'phone'         => array( 'Public phone', 'text', '' ),
		'address'       => array( 'Address', 'text', '' ),
		'mediator_name' => array( 'Name on AOC-CV-812 details', 'text', '' ),
		'credential'    => array( 'Credential line', 'text', 'Exact DRC wording. Clear it to remove the footer credential everywhere.' ),
		'processor'     => array( 'Payment processor name', 'text', 'LawPay or Stripe.' ),
		'payment_url'   => array( 'Hosted payment page URL', 'url', 'LawPay payment page or Stripe Payment Link. Until this is set, the Payments form explains that online payment is being set up.' ),
		'pass_fee'      => array( 'Pass card fee to payer', 'checkbox', 'DRC Advisory Opinion 44. Shown before payment.' ),
		'card_fee_pct'  => array( 'Card fee (%)', 'number', '' ),
		'horizon_days'  => array( 'Booking horizon (days)', 'number', 'How far ahead the Schedule calendar offers dates.' ),
		'blocked_dates' => array( 'Unavailable dates', 'textarea', 'One per line, YYYY-MM-DD. Add " AM" or " PM" to block only that half, e.g. 2026-12-03 PM.' ),
	);
	echo '<div class="wrap"><h1>Denninger Site</h1><form method="post" action="options.php">';
	settings_fields( 'dr_settings' );
	echo '<table class="form-table" role="presentation">';
	foreach ( $fields as $k => $f ) {
		$name = 'dr_settings[' . $k . ']';
		echo '<tr><th scope="row"><label for="dr_' . esc_attr( $k ) . '">' . esc_html( $f[0] ) . '</label></th><td>';
		if ( 'checkbox' === $f[1] ) {
			echo '<input type="checkbox" id="dr_' . esc_attr( $k ) . '" name="' . esc_attr( $name ) . '" value="1" ' . checked( ! empty( $o[ $k ] ), true, false ) . '>';
		} elseif ( 'textarea' === $f[1] ) {
			echo '<textarea id="dr_' . esc_attr( $k ) . '" name="' . esc_attr( $name ) . '" rows="6" class="large-text code">' . esc_textarea( $o[ $k ] ) . '</textarea>';
		} else {
			$step = 'card_fee_pct' === $k ? ' step="0.25"' : '';
			echo '<input type="' . esc_attr( $f[1] ) . '"' . $step . ' id="dr_' . esc_attr( $k ) . '" name="' . esc_attr( $name ) . '" value="' . esc_attr( $o[ $k ] ) . '" class="regular-text">';
		}
		if ( $f[2] ) {
			echo '<p class="description">' . esc_html( $f[2] ) . '</p>';
		}
		echo '</td></tr>';
	}
	echo '</table>';
	submit_button();
	echo '</form></div>';
}

/* -------------------------------------------------------------------------
 * Page template
 * ---------------------------------------------------------------------- */

add_filter( 'theme_page_templates', function ( $t ) {
	$t[ DR_TEMPLATE ] = 'Denninger full width';
	return $t;
} );

function dr_is_site_page() {
	return is_singular( 'page' ) && DR_TEMPLATE === get_page_template_slug( get_queried_object_id() ) || is_404();
}

add_filter( 'template_include', function ( $tpl ) {
	if ( dr_is_site_page() ) {
		return DR_SITE_DIR . 'templates/page.php';
	}
	return $tpl;
}, 99 );

add_action( 'wp_enqueue_scripts', function () {
	if ( ! dr_is_site_page() ) {
		return;
	}
	wp_enqueue_style( 'dr-fonts', 'https://fonts.googleapis.com/css2?family=Literata:opsz,wght@7..72,500;7..72,600&family=IBM+Plex+Sans:wght@400;500;600&display=swap', array(), null );
	wp_enqueue_style( 'dr-site', DR_SITE_URL . 'assets/css/site.css', array(), DR_SITE_VER );
	wp_enqueue_script( 'dr-site', DR_SITE_URL . 'assets/js/site.js', array(), DR_SITE_VER, true );
	$o = dr_opt();
	wp_localize_script( 'dr-site', 'DR', array(
		'details'    => implode( "\n", array_filter( array(
			$o['mediator_name'], 'Denninger Resolutions',
			preg_replace( '/,\s*(Asheville)/', "\n$1", $o['address'] ),
			'Phone: ' . $o['phone'], 'Email: ' . $o['public_email'], $o['credential'],
		) ) ),
		'processor'  => $o['processor'],
		'paymentUrl' => $o['payment_url'],
		'passFee'    => (bool) $o['pass_fee'],
		'feePct'     => (float) $o['card_fee_pct'],
		'horizon'    => (int) $o['horizon_days'],
		'blocked'    => array_values( array_filter( array_map( 'trim', preg_split( '/\r?\n/', $o['blocked_dates'] ) ) ) ),
		'email'      => $o['public_email'],
		'phone'      => $o['phone'],
	) );
}, 20 );

/* The design ships its own complete styling; drop the theme's front-end CSS on these pages. */
add_action( 'wp_enqueue_scripts', function () {
	if ( ! dr_is_site_page() ) {
		return;
	}
	global $wp_styles;
	foreach ( (array) $wp_styles->queue as $h ) {
		$src = isset( $wp_styles->registered[ $h ] ) ? (string) $wp_styles->registered[ $h ]->src : '';
		if ( false !== strpos( $src, '/themes/' ) || 0 === strpos( $h, 'kadence' ) || in_array( $h, array( 'global-styles', 'classic-theme-styles', 'wp-block-library' ), true ) ) {
			wp_dequeue_style( $h );
		}
	}
	global $wp_scripts;
	foreach ( (array) $wp_scripts->queue as $h ) {
		$src = isset( $wp_scripts->registered[ $h ] ) ? (string) $wp_scripts->registered[ $h ]->src : '';
		if ( false !== strpos( $src, '/themes/' ) ) {
			wp_dequeue_script( $h );
		}
	}
}, 999 );

add_filter( 'body_class', function ( $c ) {
	if ( dr_is_site_page() ) {
		$c[] = 'dr-site';
	}
	return $c;
} );

/* Our content is hand-built HTML; never auto-paragraph it. */
add_filter( 'the_content', function ( $content ) {
	if ( dr_is_site_page() && has_filter( 'the_content', 'wpautop' ) && ! has_blocks( $content ) ) {
		remove_filter( 'the_content', 'wpautop' );
	}
	return $content;
}, 1 );

function dr_active_nav() {
	if ( ! is_singular( 'page' ) ) {
		return '';
	}
	$slug = get_post_field( 'post_name', get_queried_object_id() );
	$map  = array( 'schedule' => 'schedule', 'mediation-center' => 'center', 'payments' => 'payments' );
	return isset( $map[ $slug ] ) ? $map[ $slug ] : '';
}

function dr_nav_items() {
	return array(
		array( 'about', 'About', home_url( '/#about' ) ),
		array( 'schedule', 'Schedule', home_url( '/schedule/' ) ),
		array( 'center', 'Mediation Center', home_url( '/mediation-center/' ) ),
		array( 'payments', 'Payments', home_url( '/payments/' ) ),
	);
}

/* -------------------------------------------------------------------------
 * SEO: titles, descriptions, robots, JSON-LD, social
 * ---------------------------------------------------------------------- */

add_action( 'init', function () {
	foreach ( array( '_dr_seo_title' => 'string', '_dr_seo_desc' => 'string', '_dr_noindex' => 'boolean' ) as $k => $type ) {
		register_post_meta( 'page', $k, array(
			'type'          => $type,
			'single'        => true,
			'show_in_rest'  => true,
			'auth_callback' => function () {
				return current_user_can( 'edit_pages' );
			},
		) );
	}
} );

add_filter( 'pre_get_document_title', function ( $title ) {
	if ( is_singular( 'page' ) ) {
		$t = get_post_meta( get_queried_object_id(), '_dr_seo_title', true );
		if ( $t ) {
			return $t;
		}
	}
	if ( is_404() ) {
		return 'Page not found | Denninger Resolutions';
	}
	return $title;
} );

add_filter( 'wp_robots', function ( $r ) {
	if ( ( is_singular( 'page' ) && get_post_meta( get_queried_object_id(), '_dr_noindex', true ) ) || is_404() ) {
		$r['noindex'] = true;
		$r['follow']  = true;
	}
	return $r;
} );

add_action( 'wp_head', function () {
	if ( ! dr_is_site_page() ) {
		return;
	}
	$o    = dr_opt();
	$id   = get_queried_object_id();
	$desc = is_singular( 'page' ) ? get_post_meta( $id, '_dr_seo_desc', true ) : '';
	echo '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' . "\n";
	echo '<meta name="theme-color" content="#24394A">' . "\n";
	if ( $desc ) {
		echo '<meta name="description" content="' . esc_attr( $desc ) . '">' . "\n";
		echo '<meta property="og:description" content="' . esc_attr( $desc ) . '">' . "\n";
	}
	if ( is_singular( 'page' ) ) {
		echo '<meta property="og:type" content="website"><meta property="og:site_name" content="Denninger Resolutions">' . "\n";
		echo '<meta property="og:title" content="' . esc_attr( wp_get_document_title() ) . '">' . "\n";
		echo '<meta property="og:url" content="' . esc_url( get_permalink( $id ) ) . '">' . "\n";
		echo '<meta property="og:image" content="' . esc_url( DR_SITE_URL . 'assets/img/logo-mark.png' ) . '">' . "\n";
	}

	$graph = array();
	$org   = array(
		'@type'     => 'ProfessionalService',
		'@id'       => home_url( '/#org' ),
		'name'      => 'Denninger Resolutions',
		'url'       => home_url( '/' ),
		'telephone' => $o['phone'],
		'email'     => $o['public_email'],
		'logo'      => DR_SITE_URL . 'assets/img/logo-mark.png',
		'address'   => array(
			'@type'           => 'PostalAddress',
			'streetAddress'   => '9 SW Pack Square, Suite 210B',
			'addressLocality' => 'Asheville',
			'addressRegion'   => 'NC',
			'postalCode'      => '28801',
			'addressCountry'  => 'US',
		),
		'areaServed' => 'North Carolina',
		'founder'    => array( '@id' => home_url( '/#david' ) ),
	);
	$person = array(
		'@type'    => 'Person',
		'@id'      => home_url( '/#david' ),
		'name'     => $o['mediator_name'],
		'jobTitle' => $o['credential'] ? $o['credential'] : 'Mediator',
		'worksFor' => array( '@id' => home_url( '/#org' ) ),
	);
	if ( is_front_page() ) {
		$graph[] = $org;
		$graph[] = $person;
		foreach ( array( 'Superior Court mediated settlement conference (in person)', 'Superior Court mediated settlement conference (Zoom)' ) as $svc ) {
			$graph[] = array( '@type' => 'Service', 'name' => $svc, 'provider' => array( '@id' => home_url( '/#org' ) ), 'areaServed' => 'North Carolina' );
		}
	}
	$slug = is_singular( 'page' ) ? get_post_field( 'post_name', $id ) : '';
	if ( 'mediation-center' === $slug ) {
		$feat = array();
		foreach ( array( 'Joint session room', 'Private caucus rooms', 'Quiet room', 'Wi-Fi', 'Display for screen sharing', 'Printing and scanning', 'Coffee and water', 'Elevator and accessible entrance' ) as $a ) {
			$feat[] = array( '@type' => 'LocationFeatureSpecification', 'name' => $a, 'value' => true );
		}
		$graph[] = array( '@type' => 'Place', 'name' => 'Denninger Resolutions mediation center', 'address' => $org['address'], 'amenityFeature' => $feat );
	}
	if ( 'schedule' === $slug ) {
		$content = get_post_field( 'post_content', $id );
		if ( preg_match_all( '#data-dr-faq[^>]*>\s*<span>(.*?)</span>.*?<p id="dr-faq-\d+"[^>]*>(.*?)</p>#s', $content, $m, PREG_SET_ORDER ) ) {
			$qs = array();
			foreach ( $m as $row ) {
				$qs[] = array(
					'@type'          => 'Question',
					'name'           => html_entity_decode( wp_strip_all_tags( $row[1] ), ENT_QUOTES ),
					'acceptedAnswer' => array( '@type' => 'Answer', 'text' => html_entity_decode( wp_strip_all_tags( $row[2] ), ENT_QUOTES ) ),
				);
			}
			$graph[] = array( '@type' => 'FAQPage', 'mainEntity' => $qs );
		}
	}
	if ( is_singular( 'page' ) && ! is_front_page() ) {
		$graph[] = array(
			'@type'           => 'BreadcrumbList',
			'itemListElement' => array(
				array( '@type' => 'ListItem', 'position' => 1, 'name' => 'Home', 'item' => home_url( '/' ) ),
				array( '@type' => 'ListItem', 'position' => 2, 'name' => get_the_title( $id ), 'item' => get_permalink( $id ) ),
			),
		);
	}
	if ( $graph ) {
		echo '<script type="application/ld+json">' . wp_json_encode( array( '@context' => 'https://schema.org', '@graph' => $graph ), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) . '</script>' . "\n";
	}
}, 5 );

/* -------------------------------------------------------------------------
 * Forms: inquiry, booking request, payment reference
 * ---------------------------------------------------------------------- */

add_action( 'init', function () {
	register_post_type( 'dr_submission', array(
		'label'           => 'Submissions',
		'labels'          => array( 'name' => 'Submissions', 'singular_name' => 'Submission' ),
		'public'          => false,
		'show_ui'         => true,
		'show_in_menu'    => true,
		'menu_icon'       => 'dashicons-email-alt',
		'supports'        => array( 'title', 'editor' ),
		'capability_type' => 'post',
		'capabilities'    => array( 'create_posts' => 'do_not_allow' ),
		'map_meta_cap'    => true,
	) );
} );

function dr_field( $key ) {
	if ( ! isset( $_POST[ $key ] ) ) {
		return '';
	}
	$v = wp_unslash( $_POST[ $key ] );
	if ( is_array( $v ) ) {
		return array_map( 'sanitize_text_field', $v );
	}
	return sanitize_textarea_field( $v );
}

function dr_back( $error ) {
	$ref = wp_get_referer();
	$url = $ref ? $ref : home_url( '/' );
	$url = remove_query_arg( 'dr_error', strtok( $url, '#' ) );
	wp_safe_redirect( add_query_arg( 'dr_error', $error, $url ) );
	exit;
}

function dr_store_and_notify( $kind, $title, $rows, $reply_to = '' ) {
	$lines = array();
	foreach ( $rows as $label => $value ) {
		if ( '' === $value || array() === $value ) {
			continue;
		}
		$lines[] = $label . ': ' . ( is_array( $value ) ? implode( '; ', $value ) : $value );
	}
	$body = implode( "\n", $lines );
	$post = wp_insert_post( array(
		'post_type'    => 'dr_submission',
		'post_status'  => 'private',
		'post_title'   => $kind . ' · ' . $title,
		'post_content' => esc_html( $body ),
	) );
	$headers = array();
	if ( $reply_to && is_email( $reply_to ) ) {
		$headers[] = 'Reply-To: ' . $reply_to;
	}
	wp_mail( dr_opt( 'notify_email' ), '[Denninger Resolutions] ' . $kind . ': ' . $title, $body . "\n\nSaved in WordPress → Submissions (#" . (int) $post . ').', $headers );
	return $post;
}

function dr_guard() {
	if ( ! empty( $_POST['dr_website'] ) ) { // honeypot
		wp_safe_redirect( home_url( '/thank-you/' ) );
		exit;
	}
}

function dr_handle_inquiry() {
	dr_guard();
	$name  = dr_field( 'name' );
	$email = sanitize_email( dr_field( 'email' ) );
	if ( '' === $name || ! is_email( $email ) ) {
		dr_back( 'inquiry' );
	}
	$msg = dr_field( 'message' );
	if ( '' === $msg ) {
		$msg = dr_field( 'what_do_you_need' );
	}
	dr_store_and_notify( 'Inquiry', $name, array(
		'Name'    => $name,
		'Firm'    => dr_field( 'firm' ),
		'Email'   => $email,
		'Phone'   => dr_field( 'phone' ),
		'Message' => $msg,
		'From'    => dr_field( 'dr_page' ),
	), $email );
	wp_safe_redirect( home_url( '/thank-you/' ) );
	exit;
}
add_action( 'admin_post_nopriv_dr_inquiry', 'dr_handle_inquiry' );
add_action( 'admin_post_dr_inquiry', 'dr_handle_inquiry' );

function dr_handle_booking() {
	dr_guard();
	$req = array( 'date', 'block', 'case_caption', 'county', 'file_number', 'completion_deadline_in_the_order', 'booking_attorney', 'email' );
	foreach ( $req as $k ) {
		if ( '' === dr_field( $k ) ) {
			dr_back( 'booking' );
		}
	}
	$email = sanitize_email( dr_field( 'email' ) );
	if ( ! is_email( $email ) ) {
		dr_back( 'booking' );
	}
	$counsel = array();
	$names   = (array) dr_field( 'counsel_name' );
	$firms   = (array) dr_field( 'counsel_firm' );
	$emails  = (array) dr_field( 'counsel_email' );
	foreach ( $names as $i => $n ) {
		$row = trim( implode( ', ', array_filter( array( $n, isset( $firms[ $i ] ) ? $firms[ $i ] : '', isset( $emails[ $i ] ) ? $emails[ $i ] : '' ) ) ) );
		if ( $row ) {
			$counsel[] = $row;
		}
	}
	$date = dr_field( 'date' );
	dr_store_and_notify( 'Booking request', $date . ' ' . dr_field( 'block' ) . ' · ' . dr_field( 'case_caption' ), array(
		'Requested date'         => $date,
		'Block'                  => dr_field( 'block' ),
		'Format'                 => dr_field( 'format' ),
		'Case caption'           => dr_field( 'case_caption' ),
		'County'                 => dr_field( 'county' ),
		'File number'            => dr_field( 'file_number' ),
		'Completion deadline'    => dr_field( 'completion_deadline_in_the_order' ),
		'Appointment'            => dr_field( 'appointment' ),
		'Booking attorney'       => dr_field( 'booking_attorney' ),
		'Firm'                   => dr_field( 'firm' ),
		'Email'                  => $email,
		'Phone'                  => dr_field( 'phone' ),
		'Party represented'      => dr_field( 'party_you_represent' ),
		'Other counsel'          => $counsel,
		'Attending'              => dr_field( 'parties_and_insurance_representatives_at' ),
		'Accessibility/interpreter' => dr_field( 'accessibility_or_interpreter_needs' ),
		'Notes'                  => dr_field( 'notes' ),
	), $email );
	wp_safe_redirect( home_url( '/booking-confirmed/' ) );
	exit;
}
add_action( 'admin_post_nopriv_dr_booking', 'dr_handle_booking' );
add_action( 'admin_post_dr_booking', 'dr_handle_booking' );

function dr_handle_payment() {
	dr_guard();
	$o      = dr_opt();
	$amount = (float) preg_replace( '/[^0-9.]/', '', dr_field( 'amount' ) );
	$email  = sanitize_email( dr_field( 'receipt_email' ) );
	if ( $amount <= 0 || '' === dr_field( 'payer_name' ) || '' === dr_field( 'case_caption' ) || ! is_email( $email ) ) {
		dr_back( 'payment' );
	}
	$method = 'ach' === dr_field( 'method' ) ? 'Bank transfer (ACH)' : 'Card';
	$fee    = ( 'Card' === $method && $o['pass_fee'] ) ? round( $amount * $o['card_fee_pct'] ) / 100 : 0;
	dr_store_and_notify( 'Payment started', dr_field( 'case_caption' ) . ' · $' . number_format( $amount + $fee, 2 ), array(
		'Payer'          => dr_field( 'payer_name' ),
		'Firm'           => dr_field( 'firm_or_company' ),
		'Case caption'   => dr_field( 'case_caption' ),
		'County'         => dr_field( 'county' ),
		'File number'    => dr_field( 'file_number' ),
		'Party'          => dr_field( 'party_represented' ),
		'Invoice'        => dr_field( 'invoice_number_if_you_have_one' ),
		'Receipt email'  => $email,
		'Share'          => '$' . number_format( $amount, 2 ),
		'Method'         => $method,
		'Processing fee' => '$' . number_format( $fee, 2 ),
		'Total'          => '$' . number_format( $amount + $fee, 2 ),
		'Note'           => 'Reference only. Confirm the payment in ' . $o['processor'] . '.',
	), $email );
	if ( empty( $o['payment_url'] ) ) {
		dr_back( 'payment_setup' );
	}
	wp_redirect( $o['payment_url'] ); // External processor (LawPay / Stripe), set by the site admin.
	exit;
}
add_action( 'admin_post_nopriv_dr_payment', 'dr_handle_payment' );
add_action( 'admin_post_dr_payment', 'dr_handle_payment' );
