<?php
/**
 * Project Kickoff form (dreamwebdigital.com/kickoff/): the onboarding form for one-off and custom jobs that are not a
 * new website or a redesign (fixes, finishing someone else's build, takeovers, integrations). The Website Onboarding
 * form stays for new builds and redesigns.
 *
 * It is an Elementor form like the Website Onboarding one (steps, uploads, saves as you go), so its answers file into
 * Dream Desk the same way: the form name contains "Onboarding", so it lands on the project, shows under its answers
 * and goes into the AI Instructions zip. The page is made once by cloning the Website Onboarding page (POST
 * /crm/kickoff-setup), which keeps the same email notification and submission settings.
 *
 * Projects also get a type: "build" (new website or redesign) or "custom" (everything else). A custom project skips
 * the website checklist in "Ready to build", and its AI Instructions are written around the work and its phases.
 */
defined( 'ABSPATH' ) || exit;

const DWDKO_FORM = 'Project Kickoff Onboarding';
const DWDKO_SLUG = 'kickoff';

/** The page that holds the Kickoff form (0 if it has not been made yet). */
function dwdko_page_id() {
	$p = get_page_by_path( DWDKO_SLUG );
	return $p ? (int) $p->ID : 0;
}
function dwdko_url() {
	$id = dwdko_page_id();
	return $id ? get_permalink( $id ) : home_url( '/' . DWDKO_SLUG . '/' );
}

/** True for a form entry from the Kickoff form. */
function dwdko_is_kickoff( $form ) {
	return false !== stripos( (string) $form, 'kickoff' );
}

/**
 * The project's type: "custom" or "build". Set by hand in Edit; otherwise a project whose only onboarding form is
 * the Kickoff form is custom, and everything else is a build.
 */
function dwdc_ptype( $pid ) {
	$t = (string) get_post_meta( $pid, '_dwdc_ptype', true );
	if ( 'custom' === $t || 'build' === $t ) {
		return $t;
	}
	$ko = false;
	foreach ( (array) get_post_meta( $pid, '_dwdc_entries', true ) as $e ) {
		$f = is_array( $e ) ? (string) ( $e['form'] ?? '' ) : '';
		if ( false === stripos( $f, 'onboard' ) ) {
			continue;
		}
		if ( ! dwdko_is_kickoff( $f ) ) {
			return 'build';
		}
		$ko = true;
	}
	return $ko ? 'custom' : 'build';
}
add_filter( 'dwdc_contact_full', function ( $c, $pid ) {
	$c['ptype_now'] = dwdc_ptype( $pid );
	return $c;
}, 12, 2 );

/** How to give Michael admin access without sending a password. */
function dwdko_access_html() {
	$s = 'margin:0 0 18px;padding:16px 18px;border-radius:10px;background:#EEF4FF;border:1px solid #C9D8F5;color:#0F2447;font-size:15px;line-height:1.6';
	return '<div class="dwo-must dwo-v2" style="' . $s . '"><strong>Please don’t type any passwords into this form.</strong> Instead, add me as a user. I get my own login, you can remove it any time, and no password ever has to be shared.'
		. '<br><br><strong>WordPress</strong><ol style="margin:6px 0 0 20px;padding:0">'
		. '<li>Log in to your WordPress dashboard (yourwebsite.com/wp-admin).</li>'
		. '<li>Go to <strong>Users → Add New User</strong>.</li>'
		. '<li>Username: <strong>dreamwebdigital</strong> · Email: <strong>mike@dreamwebdigital.com</strong> · First name: Michael · Last name: Tarr.</li>'
		. '<li>Set the Role to <strong>Administrator</strong>.</li>'
		. '<li>Leave “Send the new user an email about their account” ticked and click <strong>Add New User</strong>. WordPress emails me a link to set my own password.</li></ol>'
		. '<br><strong>Shopify, Webflow, Wix, Squarespace and others:</strong> invite <strong>mike@dreamwebdigital.com</strong> as a staff member, collaborator or admin from the site’s settings (usually under Users, Members, Contributors or Permissions).'
		. '<br><br><strong>Hosting, domain, Google and other accounts:</strong> most providers let you invite a user or team member. Invite the same email address. If an account can’t do that, tell me below and we’ll sort it out together on a quick call.</div>';
}

/** The Kickoff form's questions: [ id, type, label, required, placeholder or options or html ]. */
function dwdko_fields() {
	$intro = '<div class="dwo-must dwo-v2" style="margin:0 0 18px;padding:14px 16px;border-radius:10px;background:#EEF4FF;border:1px solid #C9D8F5;color:#0F2447;font-size:15px;line-height:1.55">'
		. '<strong>This form is for projects that aren’t a brand-new website or a full redesign</strong>: fixing or finishing a site, taking over from another developer, adding features, or a custom job. '
		. 'The more detail you give me, the faster I can get started. Questions marked with * are the ones I need. Your answers save as you go, so you can come back and finish later.</div>';
	return array(
		array( 'step_you', 'step', 'You' ),
		array( 'step_you_intro', 'html', '', false, $intro ),
		array( 'full_name', 'text', 'Your full name', true, 'Jane Smith' ),
		array( 'email', 'email', 'Your email address', true, 'jane@company.com' ),
		array( 'phone', 'tel', 'Your phone number', true, '(555) 123-4567' ),
		array( 'company', 'text', 'Company name', true, '' ),
		array( 'approver', 'text', 'Who signs off on the work? (name and email, if it isn’t you)', false, 'Jane Smith, jane@company.com' ),

		array( 'step_project', 'step', 'The project' ),
		array( 'project_type', 'select', 'What kind of project is this?', true, "Fix problems on an existing website\nFinish a website someone else started\nTake over an existing website (ongoing work)\nAdd features or connect other tools\nA custom project\nSomething else" ),
		array( 'existing_url', 'text', 'Link to the live website', true, 'https://' ),
		array( 'staging_url', 'text', 'Link to a staging or test site, if there is one', false, 'https://' ),
		array( 'platform', 'select', 'What is the website built on?', true, "WordPress\nShopify\nWebflow\nWix\nSquarespace\nCustom code\nNot sure" ),
		array( 'scope', 'textarea', 'What needs to be done? Please be as detailed as you can: every fix, change or feature, and where on the site it is', true, "1. The contact form on /contact doesn’t send emails\n2. Add a product filter to the shop page\n3. …" ),
		array( 'phases', 'textarea', 'Are there phases? What comes first, and what can wait?', false, "Phase 1: fixes (needed by the 15th)\nPhase 2: new product integration" ),
		array( 'done_when', 'textarea', 'How will we know it’s finished? What does “done” look like for you?', true, '' ),
		array( 'target_date', 'date', 'When do you need it done?', false, '' ),
		array( 'deadline_type', 'select', 'Is that a firm deadline or a preferred date?', false, "Firm deadline\nPreferred date\nNo deadline" ),

		array( 'step_handoff', 'step', 'Handoff' ),
		array( 'step_handoff_intro', 'html', '', false, '<p style="margin:0 0 14px;color:#4B5563;font-size:15px;line-height:1.55">If someone worked on the site before me, anything they can tell me saves time and money.</p>' ),
		array( 'handoff_notes', 'textarea', 'Handoff notes: what has been done so far, what is half-finished, and any known problems', false, '' ),
		array( 'previous_dev', 'textarea', 'Who worked on the site before? (name, company, email) Can I contact them?', false, '' ),
		array( 'plugins_tools', 'textarea', 'Important plugins, apps, themes or paid licences the site depends on', false, 'Elementor Pro, WooCommerce, Gravity Forms…' ),
		array( 'dont_touch', 'textarea', 'Anything I must not change or break?', false, '' ),

		array( 'step_access', 'step', 'Access' ),
		array( 'access_help', 'html', '', false, dwdko_access_html() ),
		array( 'access_status', 'select', 'Have you added me as an administrator?', true, "Yes, I’ve added mike@dreamwebdigital.com\nI’ll do it in the next day or two\nI need help with this\nSomeone else has to do it (I’ve listed them below)" ),
		array( 'other_access', 'textarea', 'Other accounts I’ll need (hosting, domain, Google Analytics, Search Console, payment, email) and who controls each one', false, 'Hosting: SiteGround, managed by our IT team (see below)' ),

		array( 'step_team', 'step', 'People' ),
		array( 'team_contacts', 'textarea', 'Who else should I know about? IT team, developers, marketing, decision makers: name, role, email and phone for each', false, "Sam Lee, IT manager, sam@company.com, (555) 222-3333\n…" ),
		array( 'best_contact', 'text', 'Best way and time to reach you', false, 'Email, weekdays 9–5 Eastern' ),

		array( 'step_files', 'step', 'Files' ),
		array( 'files_upload', 'upload', 'Upload anything that helps: documents, designs, screenshots, logos, exports (you can pick several files)', false, '' ),
		array( 'shared_folder', 'text', 'Or paste a link to a Google Drive, Dropbox or WeTransfer folder (for anything too big to upload)', false, 'Paste the folder link' ),
		array( 'anything_else', 'textarea', 'Anything else I should know before getting started?', false, '' ),
	);
}

/** Elementor field settings for one question, cloned from a field of the same type on the Website Onboarding form. */
function dwdko_field( $q, $tpl ) {
	list( $id, $type, $label ) = $q;
	$req  = ! empty( $q[3] );
	$x    = $q[4] ?? '';
	$base = $tpl[ $type ] ?? array( 'field_type' => $type );
	foreach ( array( 'field_options', 'placeholder', 'field_html', 'field_value', 'previous_button', 'next_button' ) as $k ) {
		if ( 'step' !== $type || ! in_array( $k, array( 'previous_button', 'next_button' ), true ) ) {
			unset( $base[ $k ] );
		}
	}
	$base['_id']         = substr( md5( 'dwdko-' . $id ), 0, 7 );
	$base['custom_id']   = $id;
	$base['field_type']  = $type;
	$base['field_label'] = $label;
	$base['required']    = $req ? 'true' : '';
	// Side by side only in pairs; every other question takes the full width (no half-empty rows).
	$half = array( 'full_name', 'email', 'phone', 'company', 'existing_url', 'staging_url', 'target_date', 'deadline_type' );
	if ( ! in_array( $type, array( 'step', 'html' ), true ) ) {
		$base['width']        = in_array( $id, $half, true ) ? '50' : '100';
		$base['width_mobile'] = '100';
	}
	if ( in_array( $type, array( 'select', 'checkbox', 'radio' ), true ) ) {
		$base['field_options'] = 'select' === $type ? "Choose one…|\n" . $x : $x; // nothing picked until the client chooses
	} elseif ( 'html' === $type ) {
		$base['field_html'] = $x;
	} elseif ( 'upload' === $type ) {
		$base['allow_multiple_upload'] = 'yes';
		$base['file_types']            = function_exists( 'dwdob_upload_types' ) ? dwdob_upload_types() : '';
	} elseif ( 'step' !== $type ) {
		$base['placeholder'] = $x;
	}
	if ( 'textarea' === $type ) {
		$base['rows'] = $base['rows'] ?? 5;
	}
	return $base;
}

/** Make (or refresh) the Kickoff page from the Website Onboarding page. Returns the page URL. */
function dwdko_setup() {
	$src = (int) ( function_exists( 'dwdob_pages' ) && dwdob_pages() ? dwdob_pages()[0][0] : 2993 );
	foreach ( function_exists( 'dwdob_pages' ) ? dwdob_pages() : array() as $pg ) {
		if ( 'onboarding' === get_post_field( 'post_name', $pg[0] ) ) {
			$src = (int) $pg[0];
		}
	}
	$data = json_decode( (string) get_post_meta( $src, '_elementor_data', true ), true );
	if ( ! is_array( $data ) ) {
		return new WP_Error( 'dwdko', 'The Website Onboarding page could not be read.', array( 'status' => 500 ) );
	}
	$done = false;
	$walk = function ( &$els ) use ( &$walk, &$done ) {
		foreach ( $els as &$el ) {
			if ( 'widget' === ( $el['elType'] ?? '' ) && 'form' === ( $el['widgetType'] ?? '' ) && false !== stripos( (string) ( $el['settings']['form_name'] ?? '' ), 'onboard' ) ) {
				$st  = &$el['settings'];
				$tpl = array();
				foreach ( (array) ( $st['form_fields'] ?? array() ) as $f ) {
					$t = (string) ( $f['field_type'] ?? 'text' );
					if ( ! isset( $tpl[ $t ] ) ) {
						$tpl[ $t ] = $f;
					}
				}
				$st['form_fields'] = array_map( function ( $q ) use ( $tpl ) { return dwdko_field( $q, $tpl ); }, dwdko_fields() );
				$st['form_name']   = DWDKO_FORM;
				$st['button_text'] = 'Submit Project Kickoff form';
				foreach ( array( 'email_subject', 'email_subject_2' ) as $k ) {
					if ( ! empty( $st[ $k ] ) ) {
						$st[ $k ] = 'New Project Kickoff form from [field id="full_name"]';
					}
				}
				$done = true;
				return;
			}
			if ( ! empty( $el['elements'] ) ) {
				$walk( $el['elements'] );
			}
		}
	};
	$walk( $data );
	if ( ! $done ) {
		return new WP_Error( 'dwdko', 'No onboarding form was found on the Website Onboarding page.', array( 'status' => 500 ) );
	}
	$id = dwdko_page_id();
	if ( ! $id ) {
		$id = wp_insert_post( array( 'post_type' => 'page', 'post_status' => 'publish', 'post_title' => 'Project Kickoff', 'post_name' => DWDKO_SLUG, 'post_content' => '' ) );
		if ( is_wp_error( $id ) || ! $id ) {
			return new WP_Error( 'dwdko', 'The Kickoff page could not be created.', array( 'status' => 500 ) );
		}
	}
	foreach ( get_post_meta( $src ) as $k => $v ) {
		if ( ( 0 === strpos( $k, '_elementor' ) || '_wp_page_template' === $k ) && ! in_array( $k, array( '_elementor_data', '_elementor_css', '_elementor_element_cache', '_elementor_page_assets' ), true ) ) {
			update_post_meta( $id, $k, maybe_unserialize( $v[0] ) );
		}
	}
	update_post_meta( $id, '_elementor_data', wp_slash( wp_json_encode( $data ) ) );
	delete_post_meta( $id, '_elementor_css' );
	delete_post_meta( $id, '_elementor_element_cache' );
	if ( class_exists( '\Elementor\Plugin' ) && isset( \Elementor\Plugin::$instance->files_manager ) ) {
		\Elementor\Plugin::$instance->files_manager->clear_cache();
	}
	update_post_meta( $id, '_yoast_wpseo_meta-robots-noindex', '1' ); // a client form, not a page for Google
	return array( 'id' => $id, 'url' => get_permalink( $id ), 'fields' => count( dwdko_fields() ) );
}

add_action( 'rest_api_init', function () {
	register_rest_route( 'dwd/v1', '/crm/kickoff-setup', array( 'methods' => 'POST', 'permission_callback' => function () { return current_user_can( 'manage_options' ); }, 'callback' => function () { return dwdko_setup(); } ) );
} );
