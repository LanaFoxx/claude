<?php
/**
 * Website Onboarding form (Elementor): admin tool to read the form's fields and make them required,
 * with an intro note at the top. Changes the page's saved Elementor data; a backup copy is kept.
 */
defined( 'ABSPATH' ) || exit;

/** Find the page(s) holding the onboarding form. Returns [ [post_id, data(array)] ]. */
function dwdob_pages() {
	global $wpdb;
	$ids = $wpdb->get_col( "SELECT post_id FROM {$wpdb->postmeta} WHERE meta_key = '_elementor_data' AND meta_value LIKE '%Onboarding%' AND meta_value LIKE '%form_fields%'" ); // phpcs:ignore
	$out = array();
	foreach ( $ids as $id ) {
		if ( 'revision' === get_post_type( $id ) ) {
			continue;
		}
		$data = json_decode( (string) get_post_meta( $id, '_elementor_data', true ), true );
		if ( is_array( $data ) ) {
			$out[] = array( (int) $id, $data );
		}
	}
	return $out;
}
/** Walk the Elementor tree; $fn gets each form widget's settings by reference. */
function dwdob_walk( &$els, $fn ) {
	foreach ( $els as &$el ) {
		if ( 'widget' === ( $el['elType'] ?? '' ) && 'form' === ( $el['widgetType'] ?? '' ) && false !== stripos( (string) ( $el['settings']['form_name'] ?? '' ), 'onboard' ) ) {
			$fn( $el['settings'] );
		}
		if ( ! empty( $el['elements'] ) ) {
			dwdob_walk( $el['elements'], $fn );
		}
	}
}
/** File types every onboarding upload box accepts (also checked in the browser by assets/onboarding.js). */
function dwdob_upload_types() {
	return 'jpg,jpeg,png,gif,webp,heic,svg,ai,eps,psd,pdf,doc,docx,txt,rtf,pages,odt,xls,xlsx,csv,ppt,pptx,key,ttf,otf,woff,woff2,zip,mp4,mov,webm,m4v';
}
/** Make every answer field required (uploads stay optional), add the intro note, and sharpen the inspiration question. */
function dwdob_apply() {
	$intro = '<div class="dwo-must dwo-v2" style="margin:0 0 18px;padding:14px 16px;border-radius:10px;background:#EEF4FF;border:1px solid #C9D8F5;color:#0F2447;font-size:15px;line-height:1.55">'
		. '<strong>Take your time with this.</strong> Questions marked with * are the ones I need to get started. Anything else is optional: skip it if it doesn’t apply. '
		. 'Your answers save as you go, so you can come back and finish later.<br><br>'
		. '<strong>Most important:</strong> the websites you like for inspiration (in step 4). Please paste the links and tell me what you like about each one.</div>';
	// Answers that are nice to have but never block a build.
	$optional = array( 'social_links', 'competitors', 'differentiators', 'existing_url', 'redesign_feedback', 'preserve_content', 'integrations', 'avoid', 'shared_folder', 'social_proof', 'domain_details', 'hosting_provider', 'email_service', 'deadline_event', 'anything_else', 'features_other', 'visitor_action_other', 'accounts_access' );
	$labels   = array(
		'approver'       => array( 'Who will give feedback and approve the website? (name and email)', 'Jane Smith, jane@company.com' ),
		'pages_needed'   => array( 'List every page you need, with one line on what each page should say or do', "Home – who we are and a button to book\nServices – our three services with prices\nAbout – our story and team\nContact – form, phone and map" ),
		'integrations'   => array( 'Tools you already use that the website should connect to (booking, CRM, email marketing, payments)', 'Calendly, Mailchimp, Stripe… or leave blank' ),
		'deadline_event' => array( 'Is there an event or launch tied to that date? If so, what is it and on what date?', 'Grand opening on March 14' ),
		'existing_url'   => array( 'Your current website address', 'https://' ),
		'shared_folder'  => array( 'Link to a Google Drive, Dropbox or WeTransfer folder with your files (optional, for anything too big to upload above)', 'Paste the folder link' ),
	);
	$changed = array();
	foreach ( dwdob_pages() as $pg ) {
		list( $id, $data ) = $pg;
		$orig = get_post_meta( $id, '_elementor_data', true );
		dwdob_walk( $data, function ( &$st ) use ( $intro, &$changed ) {
			foreach ( $st['form_fields'] as &$x ) {
				$t   = $x['field_type'] ?? 'text';
				$cid = $x['custom_id'] ?? '';
				if ( 'step_contact_intro' === $cid && false === strpos( (string) $x['field_html'], 'dwo-v2' ) ) {
					$x['field_html'] = $intro . preg_replace( '#<div class="dwo-must".*?</div>#s', '', (string) $x['field_html'] );
					$changed[]       = 'intro';
				}
				if ( 'site_login_note' === $cid && false === strpos( (string) $x['field_html'], 'dwo-safe' ) ) {
					$x['field_html'] = '<p class="dwo-safe" style="margin:0;font-size:14px;line-height:1.55"><strong>Access to your current website:</strong> please don’t type passwords into this form. After you send it, I’ll email you a safe way to share your login, or you can add me as an admin user on your site.</p>';
					$changed[]       = 'login_note';
				}
				// Upload boxes: one broad list of file types for every box (a logo pack often comes as a zip),
				// bigger size limits. Files too big for the form go in the shared-folder link instead.
				if ( 'upload' === $t ) {
					$types = dwdob_upload_types();
					$size  = 'media_upload' === $cid ? '100' : '50';
					if ( ( $x['file_types'] ?? '' ) !== $types || (string) ( $x['file_sizes'] ?? '' ) !== $size ) {
						$x['file_types'] = $types;
						$x['file_sizes'] = $size;
						$changed[]       = $cid . ':types';
					}
					continue;
				}
				if ( in_array( $t, array( 'step', 'html', 'upload', 'hidden', 'recaptcha', 'recaptcha_v3', 'honeypot' ), true ) ) {
					continue;
				}
				if ( 'url' === $t ) { // allow "N/A" for people without a site / folder
					$x['field_type']  = 'text';
					$x['placeholder'] = 'Paste the link';
					$changed[]        = $cid . ':text';
				}
				$want = in_array( $cid, $optional, true ) ? '' : 'true';
				if ( $want !== (string) ( $x['required'] ?? '' ) ) {
					$x['required'] = $want;
					$changed[]     = $cid . ( $want ? ':required' : ':optional' );
				}
				if ( isset( $labels[ $cid ] ) && ( $x['field_label'] ?? '' ) !== $labels[ $cid ][0] ) {
					$x['field_label'] = $labels[ $cid ][0];
					$x['placeholder'] = $labels[ $cid ][1];
					$changed[]        = $cid . ':label';
				}
				if ( 'inspiration' === $cid ) {
					$x['field_label'] = 'List 3–4 websites you like (paste the links) and what you like about each one';
					$x['placeholder'] = "https://example.com – I like the clean layout and big photos
https://example2.com – I like how easy it is to book
(Please list them here even if you’ve sent them before.)";
					$changed[]        = 'inspiration:label';
				}
			}
			unset( $x );
			$ff   = array_values( array_filter( (array) $st['form_fields'], function ( $f ) { return ! in_array( $f['custom_id'] ?? '', array( 'site_login_user', 'site_login_pass', 'page_count' ), true ); } ) );
			if ( count( $ff ) !== count( $st['form_fields'] ) ) {
				$changed[] = 'removed:login+page_count';
			}
			$find = function ( $id ) use ( &$ff ) {
				foreach ( $ff as $i => $f ) {
					if ( ( $f['custom_id'] ?? '' ) === $id ) {
						return $i;
					}
				}
				return -1;
			};
			$add  = function ( $after, $like, $id, $label, $ph, $req, $opts = '' ) use ( &$ff, &$changed, $find ) {
				if ( $find( $id ) > -1 || $find( $after ) < 0 || $find( $like ) < 0 ) {
					return;
				}
				$n                = $ff[ $find( $like ) ];
				$n['custom_id']   = $id;
				$n['_id']         = substr( md5( 'dwdob' . $id ), 0, 7 );
				$n['field_label'] = $label;
				$n['placeholder'] = $ph;
				$n['required']    = $req ? 'true' : '';
				$n['width']       = '100';
				if ( '' !== $opts ) {
					$n['field_options'] = $opts;
				}
				array_splice( $ff, $find( $after ) + 1, 0, array( $n ) );
				$changed[] = 'added:' . $id;
			};
			$add( 'visitor_action', 'approver', 'visitor_action_other', 'If you ticked Other above, what should visitors do?', '', false );
			$add( 'features', 'approver', 'features_other', 'If you ticked Other above, which features do you mean?', '', false );
			$add( 'social_proof', 'has_logo', 'site_updates', 'Who will update the website after it launches?', '', true, "Choose one…\nI will\nSomeone on my team\nI’d like you to handle updates\nNot sure yet" );
			$add( 'email_service', 'integrations', 'accounts_access', 'Do you have a Google Business Profile or Google Analytics? If yes, which email address owns them?', 'Yes, both under name@company.com… or leave blank', false );
			$add( 'hosting_provider', 'has_logo', 'needs_hosting', 'Would you like me to host your website? (fast managed hosting with backups, security and updates included)', '', true, "Choose one…\nYes, please host it for me\nNo, I’ll keep my own hosting\nNot sure, tell me more" );
			$st['form_fields'] = $ff;
		} );
		if ( $changed ) {
			if ( ! get_post_meta( $id, '_dwdob_backup', true ) ) {
				update_post_meta( $id, '_dwdob_backup', wp_slash( $orig ) );
			}
			update_post_meta( $id, '_elementor_data', wp_slash( wp_json_encode( $data ) ) );
			delete_post_meta( $id, '_elementor_element_cache' );
			if ( class_exists( '\\Elementor\\Plugin' ) ) {
				\Elementor\Plugin::$instance->files_manager->clear_cache();
			}
		}
	}
	return array_values( array_unique( $changed ) );
}

add_action( 'rest_api_init', function () {
	register_rest_route( 'dwd/v1', '/crm/onboard-form', array( 'methods' => 'POST', 'permission_callback' => function () { return current_user_can( 'manage_options' ); }, 'callback' => function () { return array( 'changed' => dwdob_apply() ); } ) );
	register_rest_route( 'dwd/v1', '/crm/onboard-form', array( 'methods' => 'GET', 'permission_callback' => function () { return current_user_can( 'manage_options' ); }, 'callback' => function () {
		$res = array();
		foreach ( dwdob_pages() as $pg ) {
			list( $id, $data ) = $pg;
			dwdob_walk( $data, function ( &$st ) use ( &$res, $id ) {
				$f = array();
				foreach ( (array) ( $st['form_fields'] ?? array() ) as $x ) {
					$f[] = array( 'id' => $x['custom_id'] ?? '', 'type' => $x['field_type'] ?? 'text', 'label' => $x['field_label'] ?? '', 'required' => ( $x['required'] ?? '' ) === 'true', 'file_types' => $x['file_types'] ?? '', 'file_sizes' => $x['file_sizes'] ?? '', 'multi' => $x['allow_multiple_upload'] ?? '', 'html' => mb_substr( (string) ( $x['field_html'] ?? '' ), 0, 300 ) );
				}
				$res[] = array( 'page' => $id, 'title' => get_the_title( $id ), 'url' => get_permalink( $id ), 'form' => $st['form_name'] ?? '', 'fields' => $f );
			} );
		}
		$res[] = array( 'php' => array( 'upload_max_filesize' => ini_get( 'upload_max_filesize' ), 'post_max_size' => ini_get( 'post_max_size' ), 'max_file_uploads' => ini_get( 'max_file_uploads' ), 'max_execution_time' => ini_get( 'max_execution_time' ), 'memory_limit' => ini_get( 'memory_limit' ) ) );
		return $res;
	} ) );
} );
