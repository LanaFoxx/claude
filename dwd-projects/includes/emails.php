<?php
/**
 * Branded notification emails.
 *
 * Every notification the site sends to Dream Web Digital (Elementor form notifications for
 * Contact / Onboarding / the homepage, the homepage message form, WordPress notices) is redrawn
 * in the site's look: navy header with the logo, Urbanist headings, the answers as a clean
 * question/answer list, and buttons to reply or open the contact in Client Desk.
 * WooCommerce emails get the same colors through WooCommerce's own email settings.
 */
defined( 'ABSPATH' ) || exit;

const DWDP_EMAIL_LOGO = 'https://dreamwebdigital.com/wp-content/uploads/2025/10/Asset-2-1.png';

/** Addresses that count as "me": only these get the branded notification layout. */
function dwdp_email_is_mine( $to ) {
	foreach ( (array) ( is_array( $to ) ? $to : explode( ',', (string) $to ) ) as $a ) {
		if ( preg_match( '/@dreamwebdigital\.com|mptarr33@gmail\.com/i', (string) $a ) ) {
			return true;
		}
	}
	return false;
}

/**
 * Build the branded email.
 * $o: eyebrow, title, intro, rows (array of [label, value]), meta (array of [label, value]), buttons (array of [label, url]).
 */
function dwdp_email_html( $o ) {
	$font = "font-family:Urbanist,'Helvetica Neue',Helvetica,Arial,sans-serif";
	$rows = '';
	foreach ( (array) ( $o['rows'] ?? array() ) as $i => $r ) {
		$val   = trim( (string) $r[1] );
		$is_em = is_email( $val );
		$is_ph = preg_match( '/^[\d\s().+-]{7,}$/', $val );
		$is_ur = preg_match( '#^https?://\S+$#i', $val );
		if ( $is_em ) {
			$val = '<a href="mailto:' . esc_attr( $val ) . '" style="color:#1B7EC3;text-decoration:none;font-weight:600">' . esc_html( $val ) . '</a>';
		} elseif ( $is_ph ) {
			$val = '<a href="tel:' . esc_attr( preg_replace( '/[^\d+]/', '', $val ) ) . '" style="color:#1B7EC3;text-decoration:none;font-weight:600">' . esc_html( $val ) . '</a>';
		} elseif ( $is_ur ) {
			$val = '<a href="' . esc_url( $val ) . '" style="color:#1B7EC3;text-decoration:none;font-weight:600;word-break:break-all">' . esc_html( $val ) . '</a>';
		} else {
			$val = nl2br( esc_html( $val ) );
		}
		$bg    = $i % 2 ? '#ffffff' : '#F6F9FD';
		$rows .= '<tr><td style="background:' . $bg . ';padding:14px 18px;border-top:1px solid #E4E9F5;' . $font . '">'
			. '<div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;color:#7A86A0;margin:0 0 4px">' . esc_html( $r[0] ) . '</div>'
			. '<div style="font-size:16px;line-height:1.55;color:#0E1526">' . $val . '</div></td></tr>';
	}
	$buttons = '';
	foreach ( (array) ( $o['buttons'] ?? array() ) as $i => $b ) {
		$solid    = 0 === $i;
		$buttons .= '<td style="padding:0 10px 10px 0"><a href="' . esc_url( $b[1] ) . '" style="display:inline-block;padding:14px 26px;border-radius:8px;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;text-decoration:none;' . $font . ';'
			. ( $solid ? 'background:#1B7EC3;color:#ffffff;border:2px solid #1B7EC3' : 'background:#ffffff;color:#1B7EC3;border:2px solid #CFE0F2' ) . '">' . esc_html( $b[0] ) . '</a></td>';
	}
	$meta = array();
	foreach ( (array) ( $o['meta'] ?? array() ) as $m ) {
		if ( '' !== trim( (string) $m[1] ) ) {
			$meta[] = esc_html( $m[0] ) . ': ' . esc_html( $m[1] );
		}
	}
	return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
		. '<link href="https://fonts.googleapis.com/css2?family=Urbanist:wght@400;600;700;900&display=swap" rel="stylesheet"></head>'
		. '<body style="margin:0;padding:0;background:#F4F9FE">'
		. '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F9FE"><tr><td align="center" style="padding:32px 14px">'
		. '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #E4E9F5">'
		. '<tr><td align="center" style="background:#12293E;padding:28px 24px"><a href="' . esc_url( home_url( '/' ) ) . '"><img src="' . esc_url( DWDP_EMAIL_LOGO ) . '" width="160" alt="Dream Web Digital" style="display:block;width:160px;height:auto;border:0"></a></td></tr>'
		. '<tr><td style="padding:36px 36px 8px;' . $font . '">'
		. '<span style="display:inline-block;margin:0 0 14px;padding:6px 14px;border-radius:20px;background:#EAF2FB;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#1B7EC3">' . esc_html( $o['eyebrow'] ?? 'Website' ) . '</span>'
		. '<h1 style="margin:0 0 14px;' . $font . ";font-size:26px;line-height:1.2;font-weight:900;text-transform:uppercase;color:#0E1526\">" . esc_html( $o['title'] ?? '' ) . '</h1>'
		. ( ! empty( $o['intro'] ) ? '<p style="margin:0 0 22px;font-size:16px;line-height:1.7;color:#303B58">' . wp_kses_post( $o['intro'] ) . '</p>' : '' )
		. ( $buttons ? '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 18px"><tr>' . $buttons . '</tr></table>' : '' )
		. '</td></tr>'
		. ( $rows ? '<tr><td style="padding:0 36px 30px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E4E9F5;border-radius:10px;overflow:hidden;border-collapse:separate">' . $rows . '</table></td></tr>' : '' )
		. ( $meta ? '<tr><td style="padding:0 36px 30px;' . $font . ';font-size:13px;line-height:1.7;color:#7A86A0">' . implode( '<br>', $meta ) . '</td></tr>' : '' )
		. '</table>'
		. '<p style="margin:18px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#9AA6BC">Dream Web Digital LLC · Charlotte, NC · (772) 210-1728<br>Sent by your website, <a href="' . esc_url( home_url( '/' ) ) . '" style="color:#9AA6BC">dreamwebdigital.com</a></p>'
		. '</td></tr></table></body></html>';
}

/** Turn a plain "Label: value" notification into rows, meta and loose paragraphs. */
function dwdp_email_parse( $message ) {
	$text = preg_replace( '#<br\s*/?>#i', "\n", (string) $message );
	$text = html_entity_decode( wp_strip_all_tags( $text ), ENT_QUOTES, 'UTF-8' );
	$rows = array();
	$meta = array();
	$para = array();
	$in_meta = false;
	$last    = null;
	foreach ( preg_split( '/\r\n|\r|\n/', $text ) as $line ) {
		$t = trim( $line );
		if ( '---' === $t || preg_match( '/^—\s*Sent from/u', $t ) ) {
			$in_meta = true;
			$last    = null;
			if ( '---' !== $t ) {
				$meta[] = array( 'Sent from', trim( preg_replace( '/^—\s*Sent from the form on/u', '', $t ) ) );
			}
			continue;
		}
		if ( preg_match( '/^([^:\/]{1,70}):(?:\s+(.*))?$/u', $t, $m ) ) {
			$label = trim( $m[1] );
			$value = trim( $m[2] ?? '' );
			if ( $in_meta ) {
				$meta[] = array( $label, $value );
				continue;
			}
			// Drop "(optional)" and similar from the question, and skip empty answers.
			$label = trim( preg_replace( '/\s*\((optional|required)\)\s*$/i', '', $label ) );
			$label = ucfirst( preg_replace( '/^your\s+/i', '', $label ) );
			if ( '' === $value ) {
				$last = null;
				continue;
			}
			$rows[] = array( $label, $value );
			$last   = count( $rows ) - 1;
		} elseif ( '' !== $t ) {
			if ( null !== $last && ! $in_meta ) {
				$rows[ $last ][1] .= "\n" . $t; // a long answer that ran onto more lines
			} else {
				$para[] = $t;
			}
		} elseif ( null !== $last ) {
			$rows[ $last ][1] .= "\n";
		}
	}
	foreach ( $rows as &$r ) {
		$r[1] = trim( preg_replace( "/\n{3,}/", "\n\n", $r[1] ) );
	}
	return array( $rows, $meta, $para );
}

add_filter( 'wp_mail', function ( $args ) {
	if ( empty( $args['message'] ) || ! dwdp_email_is_mine( $args['to'] ?? '' ) || preg_match( '/<(html|table|body)\b/i', $args['message'] ) ) {
		return $args;
	}
	list( $rows, $meta, $para ) = dwdp_email_parse( $args['message'] );
	if ( ! $rows && ! $para ) {
		return $args;
	}
	$subject = (string) ( $args['subject'] ?? '' );
	$find    = function ( $re ) use ( $rows ) {
		foreach ( $rows as $r ) {
			if ( preg_match( $re, $r[0] ) ) {
				return $r[1];
			}
		}
		return '';
	};
	$email = '';
	foreach ( $rows as $r ) {
		if ( is_email( trim( $r[1] ) ) ) {
			$email = trim( $r[1] );
			break;
		}
	}
	$name = $find( '/name/i' );
	if ( stripos( $subject, 'onboard' ) !== false ) {
		$eyebrow = 'Onboarding Form';
		$intro   = ( $name ? '<strong>' . esc_html( $name ) . '</strong> filled out' : 'Someone filled out' ) . ' the onboarding form. Their answers are below and filed in Client Desk.';
	} elseif ( preg_match( '/inquiry|message|contact|interest/i', $subject ) ) {
		$eyebrow = 'New Inquiry';
		$intro   = ( $name ? '<strong>' . esc_html( $name ) . '</strong> sent' : 'You have' ) . ' a new message from the website. It’s been added to Leads in Client Desk.';
	} elseif ( preg_match( '/order|hosting/i', $subject ) ) {
		$eyebrow = 'Hosting';
		$intro   = '';
	} else {
		$eyebrow = 'Website Notice';
		$intro   = '';
	}
	if ( $para ) {
		$intro .= ( $intro ? '<br><br>' : '' ) . implode( '<br>', array_map( 'esc_html', $para ) );
	}
	$buttons = array();
	if ( $email ) {
		$first     = trim( strtok( $name ? $name : '', ' ' ) );
		$buttons[] = array( $first ? 'Reply to ' . $first : 'Reply', 'mailto:' . $email . '?subject=' . rawurlencode( 'Re: ' . $subject ) );
		$buttons[] = array( 'Open in Client Desk', admin_url( 'admin.php?page=client-desk&email=' . rawurlencode( $email ) ) );
	}
	$args['message'] = dwdp_email_html( array(
		'eyebrow' => $eyebrow,
		'title'   => $subject,
		'intro'   => $intro,
		'rows'    => $rows,
		'meta'    => $meta,
		'buttons' => $buttons,
	) );
	$headers = $args['headers'] ?? array();
	$headers = is_array( $headers ) ? $headers : preg_split( '/\r\n|\n/', (string) $headers );
	$headers = array_values( array_filter( $headers, function ( $h ) { return $h && stripos( $h, 'content-type:' ) !== 0; } ) );
	$has_reply = (bool) array_filter( $headers, function ( $h ) { return stripos( $h, 'reply-to:' ) === 0; } );
	$headers[] = 'Content-Type: text/html; charset=UTF-8';
	if ( $email && ! $has_reply ) {
		$headers[] = 'Reply-To: ' . ( $name ? str_replace( array( '<', '>', ',', '"' ), '', $name ) . ' ' : '' ) . '<' . $email . '>';
	}
	$args['headers'] = $headers;
	return $args;
}, 99 );

/* ---------- WooCommerce emails: same colors and font ---------- */

foreach ( array(
	'woocommerce_email_base_color'       => '#1B7EC3',
	'woocommerce_email_background_color' => '#F4F9FE',
	'woocommerce_email_body_background_color' => '#FFFFFF',
	'woocommerce_email_text_color'       => '#303B58',
	'woocommerce_email_header_image'     => DWDP_EMAIL_LOGO,
	'woocommerce_email_footer_text'      => 'Dream Web Digital LLC · Charlotte, NC · (772) 210-1728',
) as $opt => $val ) {
	add_filter( 'pre_option_' . $opt, function () use ( $val ) { return $val; } );
}
add_filter( 'woocommerce_email_styles', function ( $css ) {
	return $css . "
#template_header_image{background:#12293E;padding:26px 24px 22px;border-radius:14px 14px 0 0;text-align:center}
#template_header_image p{margin:0!important}
#template_header_image img{max-width:160px!important;height:auto}
#template_container{border:1px solid #E4E9F5!important;border-radius:0 0 14px 14px!important;box-shadow:none!important}
#template_header{background:#12293E!important;border-radius:0!important}
#template_header h1{font-family:Urbanist,'Helvetica Neue',Helvetica,Arial,sans-serif!important;font-weight:900!important;text-transform:uppercase;font-size:26px!important;text-shadow:none!important;text-align:center}
body,#body_content_inner,td,th{font-family:Urbanist,'Helvetica Neue',Helvetica,Arial,sans-serif!important}
h2,h3{font-family:Urbanist,'Helvetica Neue',Helvetica,Arial,sans-serif!important;font-weight:900!important;text-transform:uppercase;color:#0E1526!important}
a{color:#1B7EC3!important}
";
} );
