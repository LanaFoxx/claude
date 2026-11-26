<?php
defined( 'ABSPATH' ) || exit;

/** Plugin settings with defaults. */
function dwdp_settings() {
	$defaults = array(
		'base_slug'      => 'portfolio',
		'portfolio_url'  => '/portfolio/',
		'microlink_key'  => '',
		'gads_id'        => '',
		'gads_lead'      => '',
		'gads_call'      => '',
		'capture_width'  => 1440,
		'cta_title'      => 'Your project could be next.',
		'cta_text'       => 'Each of these projects began with a brief Zoom call. Tell me what you have in mind, and I’ll show you what’s possible.',
		'cta_button'     => 'Schedule a Zoom',
		'cta_url'        => 'https://calendly.com/dreamwebdigital/dream-web-digital-consultation-call',
		'cta_phone'      => '(772) 210-1728',
		'def_together'   => 'The client was a pleasure to work with, had every asset ready from the start and responded promptly whenever I needed input.',
		'def_platform'   => 'WordPress and Elementor',
		'def_scope'      => 'Full custom website design, no premade themes or templates.',
		'def_responsive' => 'Desktop, tablet, and mobile',
		'def_aftercare'  => 'Security setup, one-on-one training, and 2 months of post-launch support',
		'biz_summary'    => 'Dream Web Digital is a one-on-one web design business run by Michael Tarr, an experienced designer and developer based in Stuart, Florida on the Treasure Coast, who also serves Charlotte, North Carolina and clients nationwide. He personally designs, builds and hosts premium custom WordPress websites, gives every project his full attention, offers unlimited revisions and 2 months of aftercare, and is rated 4.9 stars on Google with 100% Job Success on Upwork.',
		'biz_city'       => 'Stuart',
		'biz_areas'      => "Stuart, FL
Port St. Lucie, FL
Jensen Beach, FL
Palm City, FL
Hobe Sound, FL
Jupiter, FL
Fort Pierce, FL
Vero Beach, FL
Martin County, FL
St. Lucie County, FL
Treasure Coast, FL
Charlotte, NC",
		'biz_industries' => "Attorneys and law firms\nDoctors and medical practices\nConstruction companies\nRoofing companies\nRemodeling contractors\nAccounting firms\nFinancial advisors\nMental health practices\nFitness and training brands\nFlight schools\nRetail stores\nVending services\nMedical records services",
		'biz_services'   => "Custom website design\nWordPress website development\nElementor website design\nWebsite redesign\nSmall business website design\nManaged WordPress hosting\nWebsite maintenance and support\nSEO-ready website builds",
		'biz_promises'   => "One-on-one: you work directly with Michael, never a large agency, rotating team or overseas outsourcing\nFull time and attention on every project\nThe job gets done exactly as the client asks\nUnlimited revisions\nNo surprise charges: the project is finished as agreed, never paused midway to ask for more money\nCustom design, no templates\nFully responsive on desktop, tablet and mobile\nWordPress security setup and 1-on-1 training\n2 months of aftercare after launch, plus a lifetime workmanship warranty\nLong-term client relationships",
	);
	$saved = get_option( 'dwdp_settings', array() );
	return wp_parse_args( is_array( $saved ) ? $saved : array(), $defaults );
}

function dwdp_setting( $key ) {
	$s = dwdp_settings();
	return isset( $s[ $key ] ) ? $s[ $key ] : '';
}

function dwdp_base_slug() {
	$slug = sanitize_title( dwdp_setting( 'base_slug' ) );
	return $slug ? $slug : 'portfolio';
}

/** All project meta fields: key => default. */
function dwdp_fields() {
	return array(
		'url'        => '',
		'builder'    => 'wordpress', // 'wordpress' or 'webflow': which tab of the portfolio toggle the project appears under
		'hide_link'  => '0', // '1' = no live-website button on the project page
		'link_label' => '', // e.g. 'Try the live demo': shows a button to the website address on the project page
		'mobile_screens' => '', // comma-separated attachment IDs: phone screens shown in the tappable phone viewer
		'upwork_url' => '', // link to this project in the Upwork profile portfolio
		'video'      => '', // Loom or YouTube link for the walkthrough video
		'video_cover'=> '', // optional image address shown on the video before it plays
		'industry'   => '',
		'category'   => '', // portfolio filter tag (e.g. Software & SaaS); empty = worked out from the industry
		'summary'    => '',
		'together'   => '',
		'review'     => '',
		'review_by'  => '',
		'platform'   => '',
		'scope'      => '',
		'responsive' => '',
		'aftercare'  => '',
		'on_home'    => '1',
		'pinned'     => '0', // '1' = always first, whatever the order number
		'sections'   => '', // comma-separated attachment IDs, in order
		'cover'      => '', // attachment ID used on portfolio cards + homepage carousel
		'mockup'     => '', // attachment ID of the phone mockup
		'fullshot'   => '', // attachment ID of the full-page capture
		'mobileshot' => '', // attachment ID of the raw mobile capture
		'cuts'       => '', // JSON list of cut positions (px) used for the last split
		'thumb_upwork'   => '', // attachment ID: 1000x750 Upwork thumbnail
		'thumb_linkedin' => '', // attachment ID: 1200x627 LinkedIn image
		'thumb_youtube'  => '', // attachment ID: 1920x1080 YouTube cover (also the video cover on the project page)
	);
}

function dwdp_get( $post_id, $key ) {
	$fields = dwdp_fields();
	$value  = get_post_meta( $post_id, '_dwdp_' . $key, true );
	if ( '' === $value || false === $value ) {
		$value = isset( $fields[ $key ] ) ? $fields[ $key ] : '';
		if ( in_array( $key, array( 'platform', 'scope', 'responsive', 'aftercare' ), true ) ) {
			$value = dwdp_setting( 'def_' . $key );
		}
	}
	return $value;
}

function dwdp_ids( $csv ) {
	return array_values( array_filter( array_map( 'absint', explode( ',', (string) $csv ) ) ) );
}

/** Published projects in display order. */
function dwdp_projects( $only_home = false ) {
	$q = get_posts(
		array(
			'post_type'      => DWDP_CPT,
			'post_status'    => 'publish',
			'posts_per_page' => -1,
			'orderby'        => array( 'menu_order' => 'ASC', 'date' => 'ASC' ),
		)
	);
	// Pinned projects always come first; the rest keep their order.
	$pinned = array_filter( $q, function ( $p ) { return '1' === (string) dwdp_get( $p->ID, 'pinned' ); } );
	$q      = array_merge( array_values( $pinned ), array_values( array_diff_key( $q, $pinned ) ) );
	if ( $only_home ) {
		$q = array_values( array_filter( $q, function ( $p ) { return '1' === (string) dwdp_get( $p->ID, 'on_home' ); } ) );
	}
	return $q;
}

/** Two-digit position of a project in the portfolio (01, 02, ...). */
function dwdp_number( $post_id ) {
	static $order = null;
	if ( null === $order ) {
		$order = wp_list_pluck( dwdp_projects(), 'ID' );
	}
	// Numbered within its own tab (WordPress or Webflow).
	$b    = dwdp_get( $post_id, 'builder' );
	$list = array_values( array_filter( $order, function ( $id ) use ( $b ) { return dwdp_get( $id, 'builder' ) === $b; } ) );
	$i = array_search( (int) $post_id, array_map( 'intval', $list ), true );
	return sprintf( '%02d', false === $i ? 0 : $i + 1 );
}

/** Domain shown in the browser-bar of the homepage carousel. */
function dwdp_domain( $post_id ) {
	$url  = dwdp_get( $post_id, 'url' );
	$host = $url ? wp_parse_url( $url, PHP_URL_HOST ) : '';
	return $host ? preg_replace( '/^www\./', '', $host ) : get_the_title( $post_id );
}

/** Image tag for an attachment, with a sensible alt fallback. */
function dwdp_img( $id, $alt = '', $attrs = array() ) {
	$id = absint( $id );
	if ( ! $id ) {
		return '';
	}
	if ( '' === trim( (string) get_post_meta( $id, '_wp_attachment_image_alt', true ) ) && $alt ) {
		$attrs['alt'] = $alt;
	}
	return wp_get_attachment_image( $id, 'full', false, $attrs );
}

/** Full-resolution file URL (skips WordPress's "-scaled" copy of very large images). */
function dwdp_original_url( $id ) {
	$url = function_exists( 'wp_get_original_image_url' ) ? wp_get_original_image_url( $id ) : '';
	return $url ? $url : wp_get_attachment_url( $id );
}

/**
 * Two-tone heading, as used across the site: the first part thin, the rest heavy in blue.
 * Splits before the last $tail words (default: about half).
 */
function dwdp_two_tone( $title, $color = '#4BA3DC', $tail = 0, $break = false ) {
	$words = preg_split( '/\s+/', trim( (string) $title ) );
	if ( count( $words ) < 2 ) {
		return esc_html( $title );
	}
	$tail = $tail ? min( $tail, count( $words ) - 1 ) : (int) floor( count( $words ) / 2 );
	$head = array_slice( $words, 0, count( $words ) - $tail );
	$rest = array_slice( $words, count( $words ) - $tail );
	return '<span style="font-weight:200">' . esc_html( implode( ' ', $head ) ) . '</span>' . ( $break ? '<br>' : ' ' ) . '<span style="font-weight:900;color:' . esc_attr( $color ) . '">' . esc_html( implode( ' ', $rest ) ) . '</span>';
}

/**
 * Embed address for a walkthrough video link (Loom, YouTube or Vimeo), or '' if it isn't one of those.
 */
function dwdp_video_embed( $url ) {
	$url = trim( (string) $url );
	if ( preg_match( '~loom\.com/(?:share|embed)/([a-f0-9]{20,})~i', $url, $m ) ) {
		return 'https://www.loom.com/embed/' . $m[1] . '?hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true';
	}
	if ( preg_match( '~(?:youtube\.com/(?:watch\?(?:.*&)?v=|embed/|shorts/)|youtu\.be/)([\w-]{11})~i', $url, $m ) ) {
		return 'https://www.youtube-nocookie.com/embed/' . $m[1] . '?rel=0';
	}
	if ( preg_match( '~vimeo\.com/(?:video/)?(\d+)~i', $url, $m ) ) {
		return 'https://player.vimeo.com/video/' . $m[1];
	}
	return '';
}

/** YouTube video ID from a link, or ''. */
function dwdp_youtube_id( $url ) {
	return preg_match( '~(?:youtube\.com/(?:watch\?(?:.*&)?v=|embed/|shorts/)|youtu\.be/|youtube-nocookie\.com/embed/)([\w-]{11})~i', (string) $url, $m ) ? $m[1] : '';
}

/**
 * Width/height ratio of a YouTube video, so the player fits it with no black bars.
 * Measured once from one of YouTube's auto-generated frames (letterboxed to 4:3) and remembered.
 */
function dwdp_youtube_ratio( $yt ) {
	if ( ! $yt ) {
		return 16 / 9;
	}
	$key   = 'dwdp_ytr_' . $yt;
	$ratio = get_transient( $key );
	if ( false !== $ratio ) {
		return (float) $ratio;
	}
	$ratio = 16 / 9;
	$res   = wp_remote_get( 'https://i.ytimg.com/vi/' . $yt . '/sd2.jpg', array( 'timeout' => 8 ) );
	$body  = is_wp_error( $res ) ? '' : wp_remote_retrieve_body( $res );
	$im    = ( $body && function_exists( 'imagecreatefromstring' ) ) ? @imagecreatefromstring( $body ) : false; // phpcs:ignore
	if ( $im ) {
		$w    = imagesx( $im );
		$h    = imagesy( $im );
		$dark = function ( $x0, $x1, $y0, $y1 ) use ( $im ) {
			for ( $y = $y0; $y <= $y1; $y += 3 ) {
				for ( $x = $x0; $x <= $x1; $x += 3 ) {
					$c = imagecolorat( $im, $x, $y );
					if ( ( ( $c >> 16 ) & 255 ) > 30 || ( ( $c >> 8 ) & 255 ) > 30 || ( $c & 255 ) > 30 ) {
						return false;
					}
				}
			}
			return true;
		};
		$t = 0;
		while ( $t < $h / 3 && $dark( (int) ( $w / 4 ), (int) ( $w * 3 / 4 ), $t, $t ) ) {
			$t++;
		}
		$b = 0;
		while ( $b < $h / 3 && $dark( (int) ( $w / 4 ), (int) ( $w * 3 / 4 ), $h - 1 - $b, $h - 1 - $b ) ) {
			$b++;
		}
		$l = 0;
		while ( $l < $w / 3 && $dark( $l, $l, (int) ( $h / 4 ), (int) ( $h * 3 / 4 ) ) ) {
			$l++;
		}
		$r = 0;
		while ( $r < $w / 3 && $dark( $w - 1 - $r, $w - 1 - $r, (int) ( $h / 4 ), (int) ( $h * 3 / 4 ) ) ) {
			$r++;
		}
		$cw = $w - $l - $r;
		$ch = $h - $t - $b;
		if ( $cw > 0 && $ch > 0 ) {
			$ratio = max( 1.2, min( 2.4, $cw / $ch ) );
		}
		imagedestroy( $im );
	}
	set_transient( $key, $ratio, $im ? MONTH_IN_SECONDS : HOUR_IN_SECONDS );
	return $ratio;
}

/** Administrators may upload SVG icons (used by Elementor icon widgets, e.g. the Upwork footer icon). */
add_filter( 'upload_mimes', function ( $mimes ) {
	if ( current_user_can( 'manage_options' ) ) {
		$mimes['svg'] = 'image/svg+xml';
	}
	return $mimes;
} );
add_filter( 'wp_check_filetype_and_ext', function ( $data, $file, $filename ) {
	if ( current_user_can( 'manage_options' ) && preg_match( '/\.svg$/i', $filename ) ) {
		$data['ext']  = 'svg';
		$data['type'] = 'image/svg+xml';
	}
	return $data;
}, 10, 3 );

/** Portfolio categories, in the order the filter tags show (a tag only shows when a project is in it). */
function dwdp_categories() {
	return array( 'Software & SaaS', 'Financial', 'Tax', 'Online Learning', 'Fitness & Health', 'Real Estate', 'Hotels & Hospitality', 'Education', 'Professional Services', 'Local Business' );
}

/** Every category a project shows under: its main one plus any picked under "Also show under". */
function dwdp_cats( $post_id ) {
	$extra = array_filter( array_map( 'trim', explode( ',', (string) get_post_meta( $post_id, '_dwdp_cats_extra', true ) ) ) );
	return array_values( array_unique( array_merge( array( dwdp_category( $post_id ) ), array_intersect( $extra, dwdp_categories() ) ) ) );
}

/** A project's portfolio category: the one picked in the editor, else worked out from its industry label. */
function dwdp_category( $post_id ) {
	$c = (string) get_post_meta( $post_id, '_dwdp_category', true );
	if ( in_array( $c, dwdp_categories(), true ) ) {
		return $c;
	}
	$i = strtolower( (string) dwdp_get( $post_id, 'industry' ) . ' ' . get_the_title( $post_id ) );
	$map = array(
		'Hotels & Hospitality'  => '/hotel|\binn\b|resort|motel|hospitality|lodging|bed and breakfast/',
		'Online Learning'       => '/moodle|online learning|e-?learning|\blms\b|learning platform/',
		'Tax'                   => '/\btax/',
		'Financial'             => '/account|financ|bookkeep|cpa\b|wealth|invest/',
		'Fitness & Health'      => '/fitness|health|gym|wellness|yoga|trainer/',
		'Software & SaaS'       => '/software|saas|\bapp\b|backend|platform|tech/',
		'Real Estate'           => '/real estate|realty|realtor|property|mortgage/',
		'Education'             => '/school|course|education|training|academy|tutor/',
		'Professional Services' => '/consult|legal|law|records|medical|insurance|agency|marketing/',
	);
	foreach ( $map as $cat => $re ) {
		if ( preg_match( $re, $i ) ) {
			return $cat;
		}
	}
	return 'Local Business';
}

/**
 * Sync health: is every automatic feed still running?
 *
 * Each feed already records when it last worked. Anything past its expected gap (or reporting an error) shows as a
 * red "needs attention" pill on Home and a list on Connections, and a short email goes out once a day while
 * something is wrong (again only when the list changes, or every 3 days). Setup gaps (Zoom login, reCAPTCHA keys)
 * are listed too, in amber.
 */

/** A stored local "Y-m-d H:i:s" (site time zone) or an ISO date → Unix time; 0 when unknown. */
function dwdh_time( $v ) {
	$v = (string) $v;
	if ( '' === $v ) {
		return 0;
	}
	if ( preg_match( '/T.*(Z|[+-]\d\d:?\d\d)$/', $v ) ) {
		return (int) strtotime( $v );
	}
	try {
		return ( new DateTime( $v, wp_timezone() ) )->getTimestamp();
	} catch ( Exception $e ) {
		return 0;
	}
}

/** Every feed: [ name, state ok|stale|error|setup, at (ISO), every, note ]. */
function dwdh_items() {
	$out = array();
	$add = function ( $name, $at, $hours, $every, $fix, $err = '' ) use ( &$out ) {
		$t     = dwdh_time( $at );
		$state = '' !== $err ? 'error' : ( ! $t ? 'stale' : ( time() - $t > $hours * HOUR_IN_SECONDS ? 'stale' : 'ok' ) );
		$out[] = array( 'name' => $name, 'state' => $state, 'at' => $t ? gmdate( 'c', $t ) : '', 'every' => $every, 'note' => 'ok' === $state ? '' : ( '' !== $err ? $err : $fix ) );
	};
	if ( get_option( 'dwdmt_token', '' ) ) {
		$add( 'Gmail and Google Calendar', get_option( 'dwdin_last', '' ), 2, 'every 15 minutes', 'The Dream Desk · Inbox script in your work Google account has stopped. Open script.google.com and check its trigger.' );
	}
	$pe = get_option( 'dwdpe_last_sync', null );
	if ( is_array( $pe ) ) {
		$add( 'Personal calendar and Google Tasks', $pe['at'] ?? '', 3, 'every 15 minutes', 'The personal calendar script has stopped. Open script.google.com and check its trigger.' );
	}
	$ads = get_option( 'dwdads_data', array() );
	if ( ! empty( $ads['at'] ) ) {
		$add( 'Google Ads', $ads['at'], 6, 'hourly', 'The script inside Google Ads has stopped sending. Check Tools → Scripts in Google Ads.' );
	}
	if ( function_exists( 'dwdpl_items' ) ) {
		foreach ( dwdpl_items() as $it ) {
			$name = 'Bank: ' . ( $it['institution'] ?? 'account' ) . ( ! empty( $it['accounts'] ) ? ' (' . implode( ', ', array_slice( array_map( function ( $a ) { return is_array( $a ) ? ( $a['name'] ?? '' ) . ( ! empty( $a['mask'] ) ? ' ••' . $a['mask'] : '' ) : (string) $a; }, (array) $it['accounts'] ), 0, 3 ) ) . ')' : '' );
			$add( $name, $it['synced'] ?? '', 36, 'daily', 'Transactions have stopped coming in. Re-link it under Settings → Connections → Bank.', ! empty( $it['error'] ) ? 'Needs re-linking: ' . (string) $it['error'] : '' );
		}
		$bal = get_option( 'dwdpl_balances', array() );
		if ( ! empty( $bal['at'] ) ) {
			$add( 'Bank balances', $bal['at'], 30, 'daily at 5 AM', 'Balances have not updated today. Press refresh next to the bank balance on Home.' );
		}
	}
	$up = get_option( 'dwd_upwork_snap', array() );
	if ( ! empty( $up['checked'] ) ) {
		$add( 'Upwork balances', $up['checked'], 30, 'every morning at 5', 'The Upwork check runs in Chrome on your computer at 5 AM: the computer has to be on and awake with Chrome open. Or press refresh on Home.' );
	}
	if ( get_option( 'dwds_fireflies_key', '' ) ) {
		$add( 'Fireflies meetings', get_option( 'dwdff_last', '' ), 4, 'hourly', 'Fireflies has not answered. Check the API key under Settings → Connections.' );
	}
	if ( get_option( 'dwds_quo_key', '' ) ) {
		$add( 'Quo texts', get_option( 'dwdw_txt_last', '' ), 4, 'hourly', 'The hourly text check has not run. It runs on the site’s scheduler, so a visit to Dream Desk usually starts it again.' );
	}
	// Setup still to finish.
	$z = get_option( 'dwdh_zoom', array() );
	if ( ! empty( $z['error'] ) ) {
		$out[] = array( 'name' => 'Zoom', 'state' => 'setup', 'at' => '', 'every' => '', 'note' => 'New meetings can’t be created: ' . $z['error'] . ' Fix the login under Settings → Connections → Zoom.' );
	}
	if ( '' === trim( (string) get_option( 'elementor_pro_recaptcha_v3_site_key', '' ) ) || '' === trim( (string) get_option( 'elementor_pro_recaptcha_v3_secret_key', '' ) ) ) {
		$out[] = array( 'name' => 'Form spam protection (reCAPTCHA v3)', 'state' => 'setup', 'at' => '', 'every' => '', 'note' => 'Built and waiting for its two keys: Elementor → Settings → Integrations → reCAPTCHA v3.' );
	}
	return $out;
}

function dwdh_summary() {
	$items = dwdh_items();
	$bad   = array_values( array_filter( $items, function ( $x ) { return 'ok' !== $x['state']; } ) );
	return array( 'ok' => ! array_filter( $bad, function ( $x ) { return 'setup' !== $x['state']; } ), 'problems' => count( array_filter( $bad, function ( $x ) { return 'setup' !== $x['state']; } ) ), 'setup' => count( $bad ) - count( array_filter( $bad, function ( $x ) { return 'setup' !== $x['state']; } ) ), 'items' => $items );
}

add_filter( 'dwdc_crm_payload', function ( $p ) {
	$p['health'] = dwdh_summary();
	return $p;
} );

/** Daily: test the Zoom login, then email a short list if a feed has stopped. */
function dwdh_daily() {
	if ( function_exists( 'dwdz_api_ready' ) && dwdz_api_ready() && function_exists( 'dwdz_token' ) ) {
		$t = dwdz_token( true );
		update_option( 'dwdh_zoom', is_wp_error( $t ) ? array( 'error' => $t->get_error_message(), 'at' => current_time( 'mysql' ) ) : array( 'at' => current_time( 'mysql' ) ), false );
	}
	$bad = array_values( array_filter( dwdh_items(), function ( $x ) { return in_array( $x['state'], array( 'stale', 'error' ), true ); } ) );
	if ( ! $bad ) {
		delete_option( 'dwdh_sent' );
		return;
	}
	$key  = md5( wp_json_encode( array_column( $bad, 'name' ) ) );
	$sent = (array) get_option( 'dwdh_sent', array() );
	if ( ( $sent['key'] ?? '' ) === $key && time() - (int) ( $sent['at'] ?? 0 ) < 3 * DAY_IN_SECONDS ) {
		return;
	}
	$rows = '';
	foreach ( $bad as $x ) {
		$rows .= '<li style="margin:0 0 10px"><b>' . esc_html( $x['name'] ) . '</b>' . ( $x['at'] ? ' · last worked ' . esc_html( wp_date( 'M j, g:i A', strtotime( $x['at'] ) ) ) : ' · never ran' ) . '<br>' . esc_html( $x['note'] ) . '</li>';
	}
	$html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#0F2447"><p>' . count( $bad ) . ' Dream Desk connection' . ( 1 === count( $bad ) ? ' has' : 's have' ) . ' stopped updating, so some numbers may be out of date:</p><ul>' . $rows . '</ul><p><a href="' . esc_url( admin_url( 'admin.php?page=client-desk#connections' ) ) . '">Open Connections in Dream Desk</a></p></div>';
	wp_mail( get_option( 'admin_email' ), 'Dream Desk: ' . count( $bad ) . ' connection' . ( 1 === count( $bad ) ? '' : 's' ) . ' need' . ( 1 === count( $bad ) ? 's' : '' ) . ' attention', $html, array( 'Content-Type: text/html; charset=UTF-8', 'X-DWD-Own: 1' ) );
	update_option( 'dwdh_sent', array( 'key' => $key, 'at' => time() ), false );
}
add_action( 'dwdh_daily', 'dwdh_daily' );
add_action( 'init', function () {
	if ( ! wp_next_scheduled( 'dwdh_daily' ) ) {
		$t = new DateTime( 'tomorrow 08:20', wp_timezone() );
		wp_schedule_event( $t->getTimestamp(), 'daily', 'dwdh_daily' );
	}
} );

add_action( 'rest_api_init', function () {
	register_rest_route( 'dwd/v1', '/crm/health', array( 'methods' => 'GET', 'permission_callback' => function () { return current_user_can( 'manage_options' ); }, 'callback' => function ( $r ) {
		if ( $r->get_param( 'zoom' ) && function_exists( 'dwdz_api_ready' ) && dwdz_api_ready() ) {
			$t = dwdz_token( true );
			update_option( 'dwdh_zoom', is_wp_error( $t ) ? array( 'error' => $t->get_error_message(), 'at' => current_time( 'mysql' ) ) : array( 'at' => current_time( 'mysql' ) ), false );
		}
		return dwdh_summary();
	} ) );
} );
