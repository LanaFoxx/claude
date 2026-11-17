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

/**
 * Ready to build: before the AI Instructions export, the project page shows what is in hand and what is still
 * missing from the client (read from the onboarding answers, the files uploaded in Dream Desk and the client's
 * Google Drive folder), plus open questions Claude finds in everything said so far. One button turns the
 * gaps into an email to the client (you review it before it goes).
 *
 * Also the house rules: how Michael builds, edited once under Settings → Connections and written into every
 * AI Instructions export (CLAUDE.md and the design brief).
 */

function dwdrb_rules_default() {
	return implode( "\n", array(
		'- WordPress with Elementor Pro on the free Hello Elementor theme (a light blank canvas), built by hand in Elementor, unless the brief says otherwise.',
		'- Fast pages: compressed images, no heavy plugins, nothing that hurts page speed.',
		'- On-page SEO on every page: one H1, sensible heading order, title and meta description, image alt text.',
		'- Mobile first. Check every section at phone width.',
		'- In side-by-side layouts, headings must wrap to the same number of lines on both sides (never 2 lines next to 1).',
		'- Use the client\'s real words, photos and logo. Mark anything invented as a placeholder.',
		'- The client will manage the site themselves afterwards, so keep it simple to edit.',
	) );
}

/** The house rules as saved (or the defaults). */
function dwdrb_rules() {
	$r = trim( (string) get_option( 'dwdrb_rules', '' ) );
	return '' !== $r ? $r : dwdrb_rules_default();
}

/** The checklist: what each item means, what to ask the client for, and the form questions it is read from. */
function dwdrb_items() {
	return array(
		'logo'     => array( 'Logo', 'Your logo files (a PNG or SVG is ideal)', '/\blogo\b/i' ),
		'brand'    => array( 'Brand colors & fonts', 'Your brand colors and fonts, if you have them', '/brand|colou?rs|fonts/i' ),
		'pages'    => array( 'Page list', 'The list of pages you want on the site', '/which pages|pages do you need/i' ),
		'text'     => array( 'Website text', 'The text for each page (or let me know if you would like me to write it)', '/text ready|website text|copy/i' ),
		'photos'   => array( 'Photos', 'The photos you would like to use', '/photos|images|videos/i' ),
		'insp'     => array( 'Websites they like', 'Two or three websites you like, and what you like about each', '/websites you like|inspiration/i' ),
		'domain'   => array( 'Domain & hosting', 'Your domain name and who it is registered with, plus your hosting provider', '/domain|hosting/i' ),
		'deadline' => array( 'Launch date', 'Your ideal launch date', '/when would you like|deadline|launch|timeline/i' ),
	);
}

/** Onboarding answers as label => value (latest onboarding form), lower-cased labels. */
function dwdrb_answers( $pid ) {
	$entries = (array) get_post_meta( $pid, '_dwdc_entries', true );
	$ob      = array_values( array_filter( $entries, function ( $e ) { return is_array( $e ) && false !== stripos( (string) ( $e['form'] ?? '' ), 'onboard' ) && false === stripos( (string) ( $e['form'] ?? '' ), 'kickoff' ); } ) ); // the website checklist reads the Website Onboarding form only
	if ( ! $ob ) {
		return null;
	}
	$out = array();
	foreach ( (array) ( end( $ob )['fields'] ?? array() ) as $f ) {
		$l = trim( (string) ( $f['label'] ?? $f['id'] ?? '' ) );
		if ( '' !== $l ) {
			$out[ $l ] = trim( (string) ( $f['value'] ?? '' ) );
		}
	}
	return $out;
}

/** First answer whose question matches. */
function dwdrb_ans( $answers, $re, $skip = '' ) {
	foreach ( $answers as $l => $v ) {
		if ( preg_match( $re, $l ) && ( '' === $skip || ! preg_match( $skip, $l ) ) ) {
			return $v;
		}
	}
	return '';
}

function dwdrb_no( $v ) {
	return (bool) preg_match( '/^\s*(no\b|none|not (yet|ready)|n\/a|i need|need help|don\'?t)/i', (string) $v );
}
function dwdrb_yes( $v ) {
	return (bool) preg_match( '/^\s*(yes|some|ready|partially|i have|attached|uploaded|see|in the|they are|http)/i', (string) $v ) || ( '' !== trim( (string) $v ) && ! dwdrb_no( $v ) );
}

/**
 * The checklist for a project: [ { key, label, ask, state: ok | missing | you, note } ], or null before onboarding.
 * "you" = nothing to get from the client (e.g. they asked you to design the logo).
 */
function dwdrb_check( $pid ) {
	if ( function_exists( 'dwdc_ptype' ) && 'custom' === dwdc_ptype( $pid ) ) {
		return null; // custom jobs: no website checklist (logo, page list…)
	}
	$a = dwdrb_answers( $pid );
	if ( null === $a ) {
		return null;
	}
	$files = array();
	foreach ( function_exists( 'dwda_list' ) ? dwda_list( $pid ) : array() as $x ) {
		$files[] = array( 'name' => (string) $x['name'], 'img' => 0 === strpos( (string) $x['mime'], 'image/' ) );
	}
	$dc = get_post_meta( $pid, '_dwdc_drive_files', true );
	foreach ( is_array( $dc ) ? (array) ( $dc['files'] ?? array() ) : array() as $x ) {
		$files[] = array( 'name' => (string) $x['name'], 'img' => ! empty( $x['thumb'] ) || preg_match( '/\.(jpe?g|png|webp|heic|gif)$/i', (string) $x['name'] ) );
	}
	$upl  = function ( $re ) use ( $a ) { // "Upload your logo" style fields carry file links
		foreach ( $a as $l => $v ) {
			if ( preg_match( '/upload/i', $l ) && preg_match( $re, $l ) && preg_match( '#https?://#', $v ) ) {
				return true;
			}
		}
		return false;
	};
	$logoF = (bool) array_filter( $files, function ( $f ) { return (bool) preg_match( '/logo/i', $f['name'] ); } );
	$imgs  = count( array_filter( $files, function ( $f ) { return $f['img'] && ! preg_match( '/logo/i', $f['name'] ); } ) );
	$ai    = get_post_meta( $pid, '_dwdc_ai_summary', true );
	$ticks = (array) get_post_meta( $pid, '_dwdrb_ticks', true );
	$out   = array();
	foreach ( dwdrb_items() as $k => $it ) {
		$state = 'missing';
		$note  = '';
		switch ( $k ) {
			case 'logo':
				$v = dwdrb_ans( $a, '/do you have a logo/i' );
				if ( $logoF || $upl( '/logo/i' ) ) {
					$state = 'ok';
					$note  = 'Logo file received';
				} elseif ( preg_match( '/need help|create|design/i', $v ) || dwdrb_no( $v ) ) {
					$state = 'you';
					$note  = 'They need a logo made';
				} elseif ( dwdrb_yes( $v ) ) {
					$note = 'They have one, no file yet';
				}
				break;
			case 'brand':
				$v = dwdrb_ans( $a, '/brand guidelines|colou?rs, or fonts/i', '/avoid/i' );
				if ( $upl( '/brand|colou?r|font/i' ) || preg_match( '/^\s*yes/i', $v ) || preg_match( '/#[0-9a-f]{6}\b/i', implode( ' ', $a ) ) ) {
					$state = 'ok';
				} elseif ( dwdrb_no( $v ) ) {
					$state = 'you';
					$note  = 'No brand yet: you choose';
				} elseif ( '' !== $v ) {
					$state = 'ok';
					$note  = 'They said: ' . mb_substr( $v, 0, 40 );
				}
				break;
			case 'pages':
				$v = dwdrb_ans( $a, $it[2] );
				$state = '' !== $v && ! dwdrb_no( $v ) ? 'ok' : 'missing';
				break;
			case 'text':
				$v = dwdrb_ans( $a, '/text ready/i' );
				if ( preg_match( '/^\s*ready|^\s*yes/i', $v ) ) {
					$state = 'ok';
				} elseif ( preg_match( '/partial/i', $v ) ) {
					$note = 'Partly ready';
				} elseif ( dwdrb_no( $v ) ) {
					$note = 'Not ready: get it, or write it';
				}
				break;
			case 'photos':
				$v = dwdrb_ans( $a, '/photos or videos/i' );
				if ( $imgs >= 3 || $upl( '/photo|image/i' ) ) {
					$state = 'ok';
					$note  = $imgs ? $imgs . ' photos received' : 'Photos uploaded';
				} elseif ( dwdrb_no( $v ) ) {
					$state = 'you';
					$note  = 'None: use stock photos';
				} elseif ( dwdrb_yes( $v ) ) {
					$note = 'They have some, ' . ( $imgs ? 'only ' . $imgs . ' received' : 'none received yet' );
				}
				break;
			case 'insp':
				$v = dwdrb_ans( $a, $it[2] );
				$state = ( is_array( $ai ) && ! empty( $ai['sites'] ) ) || ( '' !== $v && ! dwdrb_no( $v ) ) ? 'ok' : 'missing';
				break;
			case 'domain':
				$own  = dwdrb_ans( $a, '/own a domain/i' );
				$name = dwdrb_ans( $a, '/domain name/i' );
				if ( dwdrb_no( $own ) ) {
					$state = 'you';
					$note  = 'No domain yet: you register one';
				} elseif ( '' !== $name ) {
					$state = 'ok';
					$note  = mb_substr( $name, 0, 50 );
				} elseif ( preg_match( '/^\s*yes/i', $own ) ) {
					$note = 'They own one: name and registrar not given';
				}
				break;
			case 'deadline':
				$v = dwdrb_ans( $a, $it[2] );
				$d = (string) get_post_meta( $pid, '_dwdc_deadline', true );
				$state = '' !== $d || ( '' !== $v && ! dwdrb_no( $v ) ) ? 'ok' : 'missing';
				$note  = '' !== $d ? 'Due ' . $d : mb_substr( $v, 0, 40 );
				break;
		}
		if ( 'ok' !== $state && ! empty( $ticks[ $k ] ) ) {
			$state = 'ok';
			$note  = 'Checked by hand';
		}
		$out[] = array( 'key' => $k, 'label' => $it[0], 'ask' => $it[1], 'state' => $state, 'note' => $note );
	}
	return $out;
}

/** Open questions Claude found (kept on the project): array( at, list ) or null. */
function dwdrb_questions( $pid ) {
	$q = get_post_meta( $pid, '_dwdrb_q', true );
	return is_array( $q ) ? $q : null;
}

/** Ask Claude what is unclear or still undecided, from the answers, calls, emails, texts and notes. */
function dwdrb_find_questions( $pid ) {
	if ( ! function_exists( 'dwdc_ai_key' ) || ! dwdc_ai_key() ) {
		return new WP_Error( 'dwdrb_key', 'Add your Claude API key first (open Ask AI and paste it).', array( 'status' => 400 ) );
	}
	$pack = '';
	$a    = dwdrb_answers( $pid );
	foreach ( (array) $a as $l => $v ) {
		if ( '' !== $v ) {
			$pack .= $l . ': ' . mb_substr( $v, 0, 1500 ) . "\n";
		}
	}
	$pack = "ONBOARDING ANSWERS\n" . $pack;
	foreach ( function_exists( 'dwdff_for' ) ? dwdff_for( $pid ) : array() as $m ) {
		$pack .= "\nCALL " . substr( (string) $m['date'], 0, 10 ) . ': ' . $m['title'] . "\nSummary: " . $m['summary'] . "\nAction items: " . $m['actions'] . "\n";
	}
	$mail = function_exists( 'dwdcm_for' ) ? (array) ( dwdcm_for( $pid, true )['list'] ?? array() ) : array();
	$pack .= "\nEMAILS (newest first)\n";
	foreach ( array_slice( $mail, 0, 20 ) as $x ) {
		$pack .= '--- ' . substr( (string) ( $x['date'] ?? '' ), 0, 10 ) . ( ! empty( $x['in'] ) ? ' from client' : ' from Michael' ) . ': ' . ( $x['subject'] ?? '' ) . "\n" . mb_substr( (string) ( $x['body'] ?? '' ), 0, 2500 ) . "\n";
	}
	$notes = (array) get_post_meta( $pid, '_dwdc_notes', true );
	$pack .= "\nMICHAEL'S NOTES\n";
	foreach ( array_slice( $notes, -25 ) as $n ) {
		$pack .= '- ' . mb_substr( (string) ( $n['text'] ?? '' ), 0, 600 ) . "\n";
	}
	$have = array();
	foreach ( (array) dwdrb_check( $pid ) as $it ) {
		$have[] = $it['label'] . ': ' . ( 'ok' === $it['state'] ? 'in hand' : ( 'you' === $it['state'] ? 'Michael handles it' : 'still missing' ) ) . ( $it['note'] ? ' (' . $it['note'] . ')' : '' );
	}
	$pack .= "\nCHECKLIST ALREADY TRACKED (do not repeat these as questions)\n" . implode( "\n", $have );
	$res  = wp_remote_post( 'https://api.anthropic.com/v1/messages', array(
		'timeout' => 90,
		'headers' => array( 'x-api-key' => dwdc_ai_key(), 'anthropic-version' => '2026-10-21', 'content-type' => 'application/json' ),
		'body'    => wp_json_encode( array(
			'model'         => 'claude-opus-5-5',
			'max_tokens'    => 2000,
			'output_config' => array( 'effort' => 'low' ),
			'system'        => 'You help Michael Tarr, a freelance web designer, get everything settled before he designs a client\'s website, so the build starts without back and forth. '
				. 'From the material, list the open questions he should ask the client before designing: things that are unclear, contradictory, undecided or missing and that would change the design or build '
				. '(pages, features, integrations, content, what visitors should do, style choices, who approves). Skip anything already answered, anything in the checklist already tracked, and small details that can wait. '
				. 'Write each question so it can be pasted straight into an email to the client: friendly, plain English, one sentence, no jargon. At most 8, most important first. '
				. 'Reply with JSON only: {"questions": ["...", "..."]}. If nothing important is open, reply {"questions": []}.',
			'messages'      => array( array( 'role' => 'user', 'content' => 'Project: ' . html_entity_decode( get_the_title( $pid ), ENT_QUOTES ) . "\n\n" . mb_substr( $pack, 0, 120000 ) ) ),
		) ),
	) );
	if ( is_wp_error( $res ) ) {
		return new WP_Error( 'dwdrb_ai', 'Claude could not be reached. Try again in a minute.', array( 'status' => 502 ) );
	}
	$body = json_decode( wp_remote_retrieve_body( $res ), true );
	if ( 200 !== (int) wp_remote_retrieve_response_code( $res ) ) {
		return new WP_Error( 'dwdrb_ai', (string) ( $body['error']['message'] ?? 'Claude returned an error.' ), array( 'status' => 502 ) );
	}
	$text = '';
	foreach ( (array) ( $body['content'] ?? array() ) as $b ) {
		if ( 'text' === ( $b['type'] ?? '' ) ) {
			$text .= $b['text'];
		}
	}
	$j = preg_match( '/\{[\s\S]*\}/', $text, $m ) ? json_decode( $m[0], true ) : null;
	if ( ! is_array( $j ) || ! isset( $j['questions'] ) ) {
		return new WP_Error( 'dwdrb_ai', 'Claude’s answer could not be read. Try again.', array( 'status' => 502 ) );
	}
	$list = array_values( array_filter( array_map( function ( $q ) { return sanitize_text_field( (string) $q ); }, (array) $j['questions'] ) ) );
	$out  = array( 'at' => current_time( 'mysql' ), 'list' => array_slice( $list, 0, 8 ) );
	update_post_meta( $pid, '_dwdrb_q', $out );
	return $out;
}

/** What is still missing, for CLAUDE.md and the design brief. */
function dwdrb_export_status( $pid ) {
	$ck = dwdrb_check( $pid );
	$q  = dwdrb_questions( $pid );
	$miss = array();
	$mine = array();
	foreach ( (array) $ck as $it ) {
		if ( 'missing' === $it['state'] ) {
			$miss[] = '- ' . $it['label'] . ( $it['note'] ? ' (' . $it['note'] . ')' : '' );
		} elseif ( 'you' === $it['state'] ) {
			$mine[] = '- ' . $it['label'] . ': ' . $it['note'];
		}
	}
	$out = '';
	if ( $miss ) {
		$out .= "## Still missing from the client\n\nUse clearly marked placeholders for these and list them in your plan:\n\n" . implode( "\n", $miss ) . "\n\n";
	}
	if ( $mine ) {
		$out .= "## Michael is providing these himself\n\n" . implode( "\n", $mine ) . "\n\n";
	}
	if ( $q && ! empty( $q['list'] ) ) {
		$out .= "## Open questions (asked or to ask the client)\n\n- " . implode( "\n- ", $q['list'] ) . "\n\n";
	}
	return $out;
}

add_filter( 'dwdc_contact_full', function ( $c, $pid ) {
	$c['ready'] = array( 'items' => dwdrb_check( $pid ), 'questions' => dwdrb_questions( $pid ) );
	return $c;
}, 13, 2 );

add_action( 'rest_api_init', function () {
	$can = function () { return current_user_can( 'manage_options' ); };
	register_rest_route( 'dwd/v1', '/crm/contact/(?P<id>\d+)/ready', array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function ( $r ) {
		$pid = (int) $r['id'];
		if ( DWDC_CONTACT !== get_post_type( $pid ) ) {
			return new WP_Error( 'dwdrb', 'Project not found.', array( 'status' => 404 ) );
		}
		$p = (array) $r->get_json_params();
		if ( 'questions' === ( $p['act'] ?? '' ) ) {
			if ( function_exists( 'dwddr_files' ) ) {
				dwddr_files( $pid ); // fresh Drive list first, so new uploads count
			}
			$q = dwdrb_find_questions( $pid );
			if ( is_wp_error( $q ) ) {
				return $q;
			}
		} elseif ( 'tick' === ( $p['act'] ?? '' ) && isset( dwdrb_items()[ (string) ( $p['key'] ?? '' ) ] ) ) {
			$t = (array) get_post_meta( $pid, '_dwdrb_ticks', true );
			if ( ! empty( $p['on'] ) ) {
				$t[ (string) $p['key'] ] = 1;
			} else {
				unset( $t[ (string) $p['key'] ] );
			}
			update_post_meta( $pid, '_dwdrb_ticks', $t );
		} elseif ( 'dropq' === ( $p['act'] ?? '' ) ) {
			$q = dwdrb_questions( $pid );
			if ( $q ) {
				$q['list'] = array_values( array_diff( (array) $q['list'], array( (string) ( $p['q'] ?? '' ) ) ) );
				update_post_meta( $pid, '_dwdrb_q', $q );
			}
		}
		return array( 'items' => dwdrb_check( $pid ), 'questions' => dwdrb_questions( $pid ) );
	} ) );
	register_rest_route( 'dwd/v1', '/crm/house-rules', array(
		array( 'methods' => 'GET', 'permission_callback' => $can, 'callback' => function () { return array( 'rules' => dwdrb_rules(), 'custom' => '' !== trim( (string) get_option( 'dwdrb_rules', '' ) ), 'default' => dwdrb_rules_default() ); } ),
		array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function ( $r ) {
			$t = trim( sanitize_textarea_field( (string) $r->get_param( 'rules' ) ) );
			update_option( 'dwdrb_rules', $t === dwdrb_rules_default() ? '' : mb_substr( $t, 0, 6000 ), false );
			return array( 'rules' => dwdrb_rules(), 'custom' => '' !== trim( (string) get_option( 'dwdrb_rules', '' ) ), 'default' => dwdrb_rules_default() );
		} ),
	) );
} );
