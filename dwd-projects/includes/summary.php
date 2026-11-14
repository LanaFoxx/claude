<?php
/**
 * AI project summary: a short read of what the client wants, from their onboarding form
 * (or, before onboarding, from their quote / contact form). Made with the same Claude key as Ask AI,
 * saved on the project, and redone when a new form comes in or when Mike asks.
 */
defined( 'ABSPATH' ) || exit;

/** The form answers the summary is based on: onboarding first, else the latest other form. */
function dwdsum_source( $pid ) {
	$entries = (array) get_post_meta( $pid, '_dwdc_entries', true );
	$ob      = array_values( array_filter( $entries, function ( $e ) { return is_array( $e ) && false !== stripos( (string) ( $e['form'] ?? '' ), 'onboard' ); } ) );
	$use     = $ob ? $ob : array_values( array_filter( $entries, 'is_array' ) );
	if ( ! $use ) {
		return null;
	}
	$e     = end( $use );
	$lines = array();
	foreach ( (array) ( $e['fields'] ?? array() ) as $f ) {
		$v = trim( (string) ( $f['value'] ?? '' ) );
		if ( '' !== $v ) {
			$lines[] = ( $f['label'] ?? $f['id'] ?? '' ) . ': ' . mb_substr( $v, 0, 1500 );
		}
	}
	return $lines ? array( 'form' => (string) ( $e['form'] ?? 'Form' ), 'date' => (string) ( $e['date'] ?? '' ), 'text' => implode( "\n", $lines ), 'onboarding' => (bool) $ob ) : null;
}

function dwdsum_make( $pid ) {
	if ( ! function_exists( 'dwdc_ai_key' ) || ! dwdc_ai_key() ) {
		return new WP_Error( 'dwdsum_key', 'Add your Claude API key first (open Ask AI and paste it).' );
	}
	$src = dwdsum_source( $pid );
	if ( ! $src ) {
		return new WP_Error( 'dwdsum_none', 'No onboarding or form answers on this project yet.' );
	}
	$name = html_entity_decode( get_the_title( $pid ), ENT_QUOTES );
	$req  = array(
		'model'      => 'claude-opus-5-5',
		'max_tokens'    => 6000,
		'output_config' => array( 'effort' => 'low' ),
		'system'     => 'You summarise a web design client\'s form answers for Michael Tarr, a freelance web designer. Write for Michael, in plain English, no headings. '
			. 'Start with one sentence: whether this is a brand-new website or a redesign of an existing one (name the current site if given), and what the business does. '
			. 'Then 3 to 5 short bullet points ("• ") covering what the client wants to improve or achieve, must-have pages or features, look and feel, and any deadline, budget or special requests. '
			. 'Use only what the answers say; if something is unclear or missing, leave it out. Keep it under 110 words. '
			. 'Then, on a new line, write exactly "INSPIRATION:" followed by one line per website the client said they like or want to be inspired by or to match, as "url | why they like it" '
			. '(use the client\'s own reason in a few words; if they gave no reason write "no notes"). Give full URLs (add https:// if missing). If a site is named without a URL but its URL appears elsewhere in the answers, use that URL. '
			. 'Do not list competitors unless the client says they like them. If they named no inspiration sites, write "INSPIRATION: none".',
		'messages'   => array( array( 'role' => 'user', 'content' => 'Project: ' . $name . "\nForm: " . $src['form'] . "\n\n" . $src['text'] ) ),
	);
	$res = wp_remote_post( 'https://api.anthropic.com/v1/messages', array(
		'timeout' => 60,
		'headers' => array( 'x-api-key' => dwdc_ai_key(), 'anthropic-version' => '2026-10-21', 'content-type' => 'application/json' ),
		'body'    => wp_json_encode( $req ),
	) );
	if ( is_wp_error( $res ) ) {
		return $res;
	}
	$body = json_decode( wp_remote_retrieve_body( $res ), true );
	if ( 200 !== wp_remote_retrieve_response_code( $res ) ) {
		return new WP_Error( 'dwdsum_api', $body['error']['message'] ?? 'Claude returned an error.' );
	}
	$text = '';
	foreach ( (array) ( $body['content'] ?? array() ) as $b ) {
		if ( 'text' === ( $b['type'] ?? '' ) ) {
			$text .= $b['text'];
		}
	}
	$text  = trim( $text );
	$sites = array();
	if ( false !== ( $p = stripos( $text, 'INSPIRATION:' ) ) ) {
		$tail = trim( substr( $text, $p + 12 ) );
		$text = trim( substr( $text, 0, $p ) );
		foreach ( preg_split( '/\r?\n/', $tail ) as $line ) {
			$line = trim( preg_replace( '/^[\s•\-*\d.)]+/u', '', $line ) );
			if ( '' === $line || preg_match( '/^none\b/i', $line ) ) {
				continue;
			}
			$parts = array_map( 'trim', explode( '|', $line, 2 ) );
			if ( ! preg_match( '#(https?://)?([a-z0-9-]+\.)+[a-z]{2,}(/\S*)?#i', $parts[0], $u ) ) {
				continue;
			}
			$url     = preg_match( '#^https?://#i', $u[0] ) ? $u[0] : 'https://' . $u[0];
			$note    = isset( $parts[1] ) && ! preg_match( '/^no notes?$/i', $parts[1] ) ? $parts[1] : '';
			$sites[] = array( 'url' => esc_url_raw( rtrim( $url, '.,;)' ) ), 'note' => sanitize_text_field( $note ) );
		}
	}
	if ( '' === $text ) {
		return new WP_Error( 'dwdsum_empty', 'Claude didn’t return a summary.' );
	}
	// No sites listed: keep what they wrote in the inspiration question (e.g. "Provided in chat already").
	$insp_note = '';
	if ( ! $sites && preg_match( '/^(?:List 3.{1,3}4 websites you like[^:]*|Inspiration[^:]*|Websites you like[^:]*):\s*(.+)$/mi', $src['text'], $im ) ) {
		$insp_note = sanitize_text_field( mb_substr( trim( $im[1] ), 0, 200 ) );
	}
	$out = array( 'text' => $text, 'sites' => array_slice( $sites, 0, 8 ), 'insp_note' => $insp_note, 'at' => current_time( 'mysql' ), 'form' => $src['form'], 'date' => $src['date'], 'onboarding' => $src['onboarding'] );
	update_post_meta( $pid, '_dwdc_ai_summary', $out );
	return $out;
}

/* New onboarding (or first form) on a project → make a fresh summary in the background. */
add_action( 'dwdc_entry_filed', function ( $pid, $form ) {
	if ( $pid ) {
		wp_schedule_single_event( time() + 10, 'dwdsum_auto', array( (int) $pid ) );
	}
}, 20, 2 );
add_action( 'dwdsum_auto', function ( $pid ) { dwdsum_make( $pid ); } );

/* Include the saved summary with the full project record. */
add_filter( 'dwdc_contact_full', function ( $c, $id ) {
	$s = get_post_meta( $id, '_dwdc_ai_summary', true );
	$c['ai_summary'] = is_array( $s ) ? $s : null;
	$c['has_form']   = (bool) dwdsum_source( $id );
	return $c;
}, 10, 2 );

add_action( 'rest_api_init', function () {
	register_rest_route( 'dwd/v1', '/crm/contact/(?P<id>\d+)/summary', array( 'methods' => 'POST', 'permission_callback' => function () { return current_user_can( 'edit_posts' ); }, 'callback' => function ( $r ) {
		$s = dwdsum_make( (int) $r['id'] );
		return is_wp_error( $s ) ? new WP_Error( 'dwdsum', $s->get_error_message(), array( 'status' => 400 ) ) : $s;
	} ) );
} );
