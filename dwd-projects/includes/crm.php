<?php
/**
 * Client Desk: a small CRM in the WordPress admin, in the style of Mojo's Flight Desk.
 *
 * - Each client sits in one stage: Leads, Active jobs, In limbo, Completed, Archive. "Onboarding" lists
 *   everyone who has sent the onboarding form, whatever their stage.
 *   Hosting is separate: anyone with a yearly hosting fee shows under Hosting clients, whatever their stage.
 * - Every website form (Elementor) creates or updates the contact by email and files the answers
 *   on the contact; hosting orders (WooCommerce) set their hosting fee and renewal date.
 * - Each record keeps a price, balance due and deadline for the current job, plus a history of past jobs.
 * - Notes and to-dos per contact, plus one to-do list across everything.
 *
 * Data: contacts are private `dwd_contact` posts, to-dos are private `dwd_task` posts.
 * The screen itself is a small app (assets/crm.js) talking to the REST routes below.
 */
defined( 'ABSPATH' ) || exit;

const DWDC_CONTACT = 'dwd_contact';
const DWDC_TASK    = 'dwd_task';
const DWDC_CLIENT  = 'dwd_client';

add_action( 'init', function () {
	foreach ( array( DWDC_CONTACT => 'Projects', DWDC_TASK => 'To-dos', DWDC_CLIENT => 'Clients' ) as $type => $label ) {
		register_post_type( $type, array( 'label' => $label, 'public' => false, 'show_ui' => false, 'supports' => array( 'title' ) ) );
	}
} );

// Contacts and to-dos are private posts: keep "Private:" out of their titles in emails and to-dos.
add_filter( 'private_title_format', function ( $format, $post ) {
	return $post && in_array( get_post_type( $post ), array( DWDC_CONTACT, DWDC_TASK, DWDC_CLIENT ), true ) ? '%s' : $format;
}, 10, 2 );

/** The lists, in order. Saved so they can be renamed or added to later. */
function dwdc_lists() {
	$default = array(
		array( 'id' => 'leads', 'name' => 'Leads', 'color' => '#F0874A' ),
		array( 'id' => 'active', 'name' => 'Active jobs', 'color' => '#1B7EC3' ),
		array( 'id' => 'hold', 'name' => 'On hold', 'color' => '#C98A0B' ),
		array( 'id' => 'limbo', 'name' => 'In limbo', 'color' => '#9B6BDF' ),
		array( 'id' => 'complete', 'name' => 'Completed', 'color' => '#2EA36B' ),
		array( 'id' => 'archive', 'name' => 'Archive', 'color' => '#A7B1C2' ),
	);
	$saved = get_option( 'dwdc_lists' );
	return is_array( $saved ) && $saved ? $saved : $default;
}

/** Contact fields kept on every contact. */
function dwdc_fields() {
	return array( 'job', 'manual', 'followup', 'markup', 'markup_sent', 'lead_source', 'pay_method', 'stage', 'completed', 'billed', 'stripe', 'paypal', 'person', 'email', 'phone', 'company', 'website', 'list', 'price', 'balance', 'deadline', 'hosting', 'renewal', 'source', 'next', 'pending', 'paymark', 'owedopen' );
}

function dwdc_contact( $post, $full = false ) {
	$p = get_post( $post );
	if ( ! $p || DWDC_CONTACT !== $p->post_type ) {
		return null;
	}
	$c = array( 'id' => $p->ID, 'name' => $p->post_title, 'created' => get_post_time( 'c', true, $p ), 'updated' => get_post_modified_time( 'c', true, $p ) );
	foreach ( dwdc_fields() as $f ) {
		$c[ $f ] = (string) get_post_meta( $p->ID, '_dwdc_' . $f, true );
	}
	$entries          = get_post_meta( $p->ID, '_dwdc_entries', true );
	$entries          = is_array( $entries ) ? $entries : array();
	$c['entry_count'] = count( $entries );
	$c['client']      = (int) get_post_meta( $p->ID, '_dwdc_client', true );
	$c['last_entry']  = $entries ? end( $entries )['form'] : '';
	$c['last_entry_date'] = $entries ? end( $entries )['date'] : '';
	$c['onboarded']   = '';
	foreach ( $entries as $e ) {
		if ( false !== stripos( (string) $e['form'], 'onboard' ) ) {
			$c['onboarded'] = $e['date'];
		}
	}
	$c['autopay'] = '1' === get_post_meta( $p->ID, '_dwdc_autopay', true );
	// Date of their most recent paid payment (Stripe, PayPal…), used to sort completed work.
	$pays           = get_post_meta( $p->ID, '_dwdc_payments', true );
	$c['last_paid'] = '';
	$c['last_pay']  = null;
	foreach ( is_array( $pays ) ? $pays : array() as $x ) {
		if ( 'paid' === ( $x['status'] ?? '' ) && (string) ( $x['date'] ?? '' ) > $c['last_paid'] ) {
			$c['last_paid'] = (string) $x['date'];
			$c['last_pay']  = array( 'date' => (string) $x['date'], 'amount' => (string) ( $x['amount'] ?? '' ), 'source' => (string) ( $x['source'] ?? '' ), 'note' => (string) ( $x['note'] ?? '' ) );
		}
	}
	$c['sub']     = (float) preg_replace( '/[^\d.]/', '', (string) get_post_meta( $p->ID, '_dwdc_hosting', true ) ) > 0 ? dwdc_subscription_for( $p->ID, $c['email'] ) : null;
	if ( $full ) {
		$c['paylink'] = dwdc_paylink( $p->ID );
	}
	$jobs        = get_post_meta( $p->ID, '_dwdc_jobs', true );
	$c['jobs']   = is_array( $jobs ) ? $jobs : array();
	$ppl         = get_post_meta( $p->ID, '_dwdc_contacts', true );
	$c['contacts'] = is_array( $ppl ) ? array_values( $ppl ) : array();
	if ( $full ) {
		$notes      = get_post_meta( $p->ID, '_dwdc_notes', true );
		$c['notes'] = is_array( $notes ) ? array_reverse( $notes ) : array();
		$pays          = get_post_meta( $p->ID, '_dwdc_payments', true );
		$c['payments'] = is_array( $pays ) ? $pays : array();
		$c['files'] = array_reverse( $entries );
	}
	return $c;
}

function dwdc_task( $post ) {
	$p = get_post( $post );
	if ( ! $p || DWDC_TASK !== $p->post_type ) {
		return null;
	}
	return array(
		'id'      => $p->ID,
		'text'    => $p->post_title,
		'contact' => (int) get_post_meta( $p->ID, '_dwdc_contact', true ),
		'due'     => (string) get_post_meta( $p->ID, '_dwdc_due', true ),
		'done'    => '1' === get_post_meta( $p->ID, '_dwdc_done', true ),
		'done_at' => (string) get_post_meta( $p->ID, '_dwdc_done_at', true ),
		'order'   => (int) $p->menu_order,
		'created' => get_post_time( 'c', true, $p ),
	);
}

function dwdc_find_by_email( $email ) {
	$email = strtolower( trim( $email ) );
	if ( ! $email ) {
		return 0;
	}
	$ids = get_posts( array( 'post_type' => DWDC_CONTACT, 'post_status' => 'private', 'posts_per_page' => 1, 'fields' => 'ids', 'meta_key' => '_dwdc_email', 'meta_value' => $email ) ); // phpcs:ignore
	return $ids ? (int) $ids[0] : 0;
}

/** The Markup review email: first draft is up, leave notes right on the site in Markup. */
function dwdc_markup_email_html( $first, $project, $link ) {
	$html = dwdp_email_html( array(
		'eyebrow' => 'First draft',
		'title'   => 'Your first draft is ready',
		'intro'   => 'Hi ' . esc_html( $first ?: 'there' ) . ',<br><br>'
			. 'Good news: the first draft of <strong>' . esc_html( $project ) . '</strong> is up and ready for you to look through.<br><br>'
			. 'I’ve set it up in Markup, so you can review the actual site and leave notes right on it. Just click any spot on the page and type what you’d like changed. Each note is pinned to that exact spot, and I see them in real time, so I can start on your changes right away.<br><br>'
			. '<strong>Please keep all your notes and revisions in Markup.</strong> That way nothing gets lost in email threads, and we get your site launched sooner.',
		'buttons' => array( array( 'View your draft & leave notes', $link ) ),
		'outro'   => 'Questions? Just reply to this email.<br>Michael Tarr, Dream Web Digital',
		'footer'  => 'Dream Web Digital ·',
	) );
	return str_replace( 'padding:14px 26px;border-radius:8px;font-size:13px', 'padding:20px 44px;border-radius:10px;font-size:16px', $html ); // a bigger, bolder button
}
add_action( 'rest_api_init', function () {
	// Preview of the Markup email exactly as the client gets it (admin only).
	register_rest_route( 'dwd/v1', '/crm/markup-email/preview', array( 'methods' => 'GET', 'permission_callback' => function () { return current_user_can( 'manage_options' ); }, 'callback' => function ( $r ) {
		$id = (int) $r->get_param( 'id' );
		$cid = $id ? (int) get_post_meta( $id, '_dwdc_client', true ) : 0;
		$who = $id ? ( ( $cid ? get_post_field( 'post_title', $cid ) : '' ) ?: get_post_meta( $id, '_dwdc_person', true ) ) : 'Nick Ponte';
		header( 'Content-Type: text/html; charset=UTF-8' );
		echo dwdc_markup_email_html( trim( strtok( (string) $who, ' ' ) ), $id ? get_post_field( 'post_title', $id ) : 'Nick Ponte Realty', $id && get_post_meta( $id, '_dwdc_markup', true ) ? get_post_meta( $id, '_dwdc_markup', true ) : 'https://app.markup.io/' ); // phpcs:ignore
		exit;
	} ) );
} );

function dwdc_save_contact( $id, $data ) {
	$is_new = ! $id;
	if ( ! $id ) {
		$id = wp_insert_post( array( 'post_type' => DWDC_CONTACT, 'post_status' => 'private', 'post_title' => $data['name'] ?? 'New contact' ) );
		if ( empty( $data['list'] ) ) {
			$data['list'] = 'leads';
		}
	} elseif ( isset( $data['name'] ) ) {
		wp_update_post( array( 'ID' => $id, 'post_title' => $data['name'] ) );
	}
	// Starting the job on a lead: nothing's been paid yet, so the whole price is owed (not shown as "Paid").
	if ( isset( $data['list'] ) && 'active' === $data['list'] && 'leads' === get_post_meta( $id, '_dwdc_list', true ) && ! isset( $data['balance'] ) ) {
		$price = (float) preg_replace( '/[^\d.]/', '', (string) ( $data['price'] ?? get_post_meta( $id, '_dwdc_price', true ) ) );
		$paid  = 0;
		foreach ( array( 'billed', 'stripe', 'paypal', 'manual' ) as $f ) {
			$paid += (float) preg_replace( '/[^\d.]/', '', (string) get_post_meta( $id, '_dwdc_' . $f, true ) );
		}
		if ( $price > 0 && '' === (string) get_post_meta( $id, '_dwdc_balance', true ) ) {
			$data['balance'] = (string) max( 0, round( $price - $paid, 2 ) );
		}
	}
	// Moving a project to Completed stamps today's date so the Completed list sorts newest first.
	if ( isset( $data['list'] ) && 'complete' === $data['list'] && empty( $data['completed'] ) && 'complete' !== get_post_meta( $id, '_dwdc_list', true ) ) {
		$data['completed'] = current_time( 'Y-m-d' );
	}
	foreach ( dwdc_fields() as $f ) {
		if ( isset( $data[ $f ] ) ) {
			$v = 'email' === $f ? strtolower( sanitize_email( $data[ $f ] ) ) : sanitize_text_field( $data[ $f ] );
			update_post_meta( $id, '_dwdc_' . $f, $v );
		}
	}
	// A completed project you set an amount owed on (after finishing) shows in Owed until it's paid.
	if ( isset( $data['balance'] ) ) {
		$owe = (float) preg_replace( '/[^\d.]/', '', (string) $data['balance'] );
		update_post_meta( $id, '_dwdc_owedopen', $owe > 0 && 'complete' === get_post_meta( $id, '_dwdc_list', true ) ? '1' : '' );
	}
	// Remove a source's payments entirely (e.g. when they were filed on the wrong project).
	if ( ! empty( $data['payments_clear'] ) && is_array( $data['payments_clear'] ) ) {
		$old = get_post_meta( $id, '_dwdc_payments', true );
		$clr = array_map( 'strval', $data['payments_clear'] );
		update_post_meta( $id, '_dwdc_payments', array_values( array_filter( is_array( $old ) ? $old : array(), function ( $x ) use ( $clr ) { return ! in_array( (string) ( $x['source'] ?? '' ), $clr, true ); } ) ) );
	}
	// Payment history (Stripe invoices, PayPal…): a new batch replaces older entries from the same source.
	if ( isset( $data['payments'] ) && is_array( $data['payments'] ) ) {
		$old  = get_post_meta( $id, '_dwdc_payments', true );
		$old  = is_array( $old ) ? $old : array();
		$srcs = array_unique( array_map( function ( $x ) { return (string) ( $x['source'] ?? '' ); }, $data['payments'] ) );
		$keep = array_values( array_filter( $old, function ( $x ) use ( $srcs ) { return ! in_array( (string) ( $x['source'] ?? '' ), $srcs, true ); } ) );
		foreach ( $data['payments'] as $x ) {
			$keep[] = array_map( 'sanitize_text_field', array_intersect_key( (array) $x, array_flip( array( 'date', 'amount', 'source', 'ref', 'status', 'note' ) ) ) );
		}
		usort( $keep, function ( $a, $b ) { return strcmp( (string) ( $b['date'] ?? '' ), (string) ( $a['date'] ?? '' ) ); } );
		update_post_meta( $id, '_dwdc_payments', $keep );
	}
	if ( isset( $data['jobs'] ) && is_array( $data['jobs'] ) ) {
		$jobs = array();
		foreach ( $data['jobs'] as $j ) {
			if ( ! empty( $j['title'] ) ) {
				$jobs[] = array( 'title' => sanitize_text_field( $j['title'] ), 'price' => sanitize_text_field( $j['price'] ?? '' ), 'date' => sanitize_text_field( $j['date'] ?? '' ) );
			}
		}
		update_post_meta( $id, '_dwdc_jobs', $jobs );
	}
	if ( isset( $data['contacts'] ) && is_array( $data['contacts'] ) ) {
		$ppl  = array();
		$seen = array();
		foreach ( $data['contacts'] as $x ) {
			$n = sanitize_text_field( $x['name'] ?? '' );
			$e = sanitize_email( $x['email'] ?? '' );
			if ( '' === $n && '' === $e ) {
				continue;
			}
			$key = strtolower( $e ? $e : $n );
			if ( isset( $seen[ $key ] ) ) {
				continue;
			}
			$seen[ $key ] = 1;
			$ppl[]        = array( 'name' => $n, 'email' => $e, 'phone' => sanitize_text_field( $x['phone'] ?? '' ), 'role' => sanitize_text_field( $x['role'] ?? '' ) );
		}
		update_post_meta( $id, '_dwdc_contacts', $ppl );
	}
	if ( isset( $data['client'] ) && 0 === (int) $data['client'] && ! $is_new ) {
		delete_post_meta( $id, '_dwdc_client' ); // project kept, no client attached
	} elseif ( isset( $data['client'] ) && DWDC_CLIENT === get_post_type( (int) $data['client'] ) ) {
		update_post_meta( $id, '_dwdc_client', (int) $data['client'] );
	} elseif ( $is_new ) {
		dwdc_ensure_client( $id );
	}
	return (int) $id;
}

/* ---------------------------------------------------------------- clients (people) and their projects */

function dwdc_client( $post ) {
	$p = get_post( $post );
	if ( ! $p || DWDC_CLIENT !== $p->post_type ) {
		return null;
	}
	$c = array( 'id' => $p->ID, 'name' => $p->post_title, 'created' => get_post_time( 'c', true, $p ) );
	foreach ( array( 'email', 'phone', 'company', 'notes' ) as $f ) {
		$c[ $f ] = (string) get_post_meta( $p->ID, '_dwdcl_' . $f, true );
	}
	$c['review_sent'] = (string) get_post_meta( $p->ID, '_dwdcl_review_sent', true );
	return $c;
}
function dwdc_save_client( $id, $d ) {
	if ( ! $id ) {
		$id = wp_insert_post( array( 'post_type' => DWDC_CLIENT, 'post_status' => 'private', 'post_title' => sanitize_text_field( $d['name'] ?? 'New client' ) ) );
	} elseif ( isset( $d['name'] ) && '' !== trim( $d['name'] ) ) {
		wp_update_post( array( 'ID' => $id, 'post_title' => sanitize_text_field( $d['name'] ) ) );
	}
	foreach ( array( 'email', 'phone', 'company', 'notes' ) as $f ) {
		if ( isset( $d[ $f ] ) ) {
			update_post_meta( $id, '_dwdcl_' . $f, 'email' === $f ? strtolower( sanitize_email( $d[ $f ] ) ) : ( 'notes' === $f ? sanitize_textarea_field( $d[ $f ] ) : sanitize_text_field( $d[ $f ] ) ) );
		}
	}
	return (int) $id;
}
/** Find a client by email, else by exact name. */
function dwdc_find_client( $email, $name ) {
	$email = strtolower( trim( (string) $email ) );
	if ( $email ) {
		$ids = get_posts( array( 'post_type' => DWDC_CLIENT, 'post_status' => 'private', 'posts_per_page' => 1, 'fields' => 'ids', 'meta_key' => '_dwdcl_email', 'meta_value' => $email ) ); // phpcs:ignore
		if ( $ids ) {
			return (int) $ids[0];
		}
	}
	$name = strtolower( trim( (string) $name ) );
	if ( $name ) {
		foreach ( get_posts( array( 'post_type' => DWDC_CLIENT, 'post_status' => 'private', 'posts_per_page' => -1 ) ) as $p ) {
			if ( strtolower( $p->post_title ) === $name ) {
				return $p->ID;
			}
		}
	}
	return 0;
}
/** Make sure a project belongs to a client: matched by email or contact name, else a new client. */
function dwdc_ensure_client( $pid ) {
	$have = (int) get_post_meta( $pid, '_dwdc_client', true );
	if ( $have && DWDC_CLIENT === get_post_type( $have ) ) {
		return $have;
	}
	$email  = (string) get_post_meta( $pid, '_dwdc_email', true );
	$person = trim( (string) get_post_meta( $pid, '_dwdc_person', true ) );
	$name   = $person ? $person : get_post_field( 'post_title', $pid );
	$cid    = dwdc_find_client( $email, $name );
	if ( ! $cid ) {
		$cid = dwdc_save_client( 0, array( 'name' => $name, 'email' => $email, 'phone' => (string) get_post_meta( $pid, '_dwdc_phone', true ), 'company' => (string) get_post_meta( $pid, '_dwdc_company', true ) ) );
	} else {
		foreach ( array( 'email', 'phone' ) as $f ) {
			$v = (string) get_post_meta( $pid, '_dwdc_' . $f, true );
			if ( $v && ! get_post_meta( $cid, '_dwdcl_' . $f, true ) ) {
				update_post_meta( $cid, '_dwdcl_' . $f, $v );
			}
		}
	}
	update_post_meta( $pid, '_dwdc_client', $cid );
	return $cid;
}

function dwdc_domain( $url ) {
	return strtolower( preg_replace( '#^(https?://)?(www\.)?([^/]+).*$#i', '$3', trim( (string) $url ) ) );
}

/** Find a record by email, then by name / company / any alias (case-insensitive). */
function dwdc_find( $email, $names ) {
	$id = dwdc_find_by_email( $email );
	if ( $id ) {
		return $id;
	}
	$names = array_filter( array_map( function ( $n ) { return strtolower( trim( (string) $n ) ); }, (array) $names ) );
	if ( ! $names ) {
		return 0;
	}
	foreach ( get_posts( array( 'post_type' => DWDC_CONTACT, 'post_status' => 'private', 'posts_per_page' => -1 ) ) as $p ) {
		$have = array( strtolower( $p->post_title ), strtolower( (string) get_post_meta( $p->ID, '_dwdc_company', true ) ), strtolower( (string) get_post_meta( $p->ID, '_dwdc_person', true ) ), dwdc_domain( get_post_meta( $p->ID, '_dwdc_website', true ) ) );
		if ( array_intersect( $names, array_filter( $have ) ) ) {
			return $p->ID;
		}
	}
	return 0;
}

function dwdc_add_task( $text, $contact = 0, $due = '' ) {
	$id = wp_insert_post( array( 'post_type' => DWDC_TASK, 'post_status' => 'private', 'post_title' => $text ) );
	update_post_meta( $id, '_dwdc_contact', (int) $contact );
	update_post_meta( $id, '_dwdc_due', $due );
	update_post_meta( $id, '_dwdc_done', '0' );
	return $id;
}

/* ---------------------------------------------------------------- forms → contacts */

/**
 * The one open project (active, on hold, limbo) or lead whose project name matches the business,
 * or whose person / client matches the name. 0 when none or more than one match.
 */
function dwdc_find_open_project( $business, $person ) {
	$norm = function ( $s ) { return preg_replace( '/[^a-z0-9]/', '', strtolower( html_entity_decode( (string) $s, ENT_QUOTES ) ) ); };
	$b    = $norm( $business );
	$n    = $norm( $person );
	if ( strlen( $b ) < 4 && strlen( $n ) < 4 ) {
		return 0;
	}
	$by_biz = array();
	$by_per = array();
	foreach ( get_posts( array( 'post_type' => DWDC_CONTACT, 'post_status' => 'private', 'posts_per_page' => -1, 'fields' => 'ids', 'meta_query' => array( array( 'key' => '_dwdc_list', 'value' => array( 'active', 'hold', 'limbo', 'leads' ), 'compare' => 'IN' ) ) ) ) as $pid ) { // phpcs:ignore
		if ( strlen( $b ) >= 4 && $norm( get_the_title( $pid ) ) === $b ) {
			$by_biz[] = $pid;
		}
		$cid = (int) get_post_meta( $pid, '_dwdc_client', true );
		if ( strlen( $n ) >= 4 && ( $norm( get_post_meta( $pid, '_dwdc_person', true ) ) === $n || ( $cid && $norm( get_the_title( $cid ) ) === $n ) ) ) {
			$by_per[] = $pid;
		}
	}
	if ( 1 === count( $by_biz ) ) {
		return (int) $by_biz[0];
	}
	$both = array_values( array_intersect( $by_biz, $by_per ) );
	if ( 1 === count( $both ) ) {
		return (int) $both[0];
	}
	return ! $by_biz && 1 === count( $by_per ) ? (int) $by_per[0] : 0;
}

/**
 * File a form entry on the matching contact (created if new).
 * $fields: list of array( 'id', 'label', 'value' ).
 */
function dwdc_file_entry( $form, $fields, $date = '', $source = 'Website form', $match = array() ) {
	$get = function ( $keys ) use ( $fields ) {
		foreach ( $fields as $f ) {
			if ( in_array( $f['id'], $keys, true ) && '' !== trim( (string) $f['value'] ) ) {
				return trim( (string) $f['value'] );
			}
		}
		return '';
	};
	$email = $get( array( 'email' ) );
	if ( ! $email ) {
		return 0;
	}
	$id         = $match ? dwdc_find( $email, $match ) : dwdc_find_by_email( $email );
	$onboarding = false !== stripos( $form, 'onboard' );
	// Someone invited by phone: match their waiting lead by phone number.
	$digits = preg_replace( '/\D/', '', $get( array( 'phone' ) ) );
	if ( ! $id && $onboarding && strlen( $digits ) >= 7 ) {
		foreach ( get_posts( array( 'post_type' => DWDC_CONTACT, 'post_status' => 'private', 'posts_per_page' => -1, 'fields' => 'ids', 'meta_key' => '_dwdc_list', 'meta_value' => 'leads' ) ) as $lid ) { // phpcs:ignore
			if ( substr( preg_replace( '/\D/', '', (string) get_post_meta( $lid, '_dwdc_phone', true ) ), -10 ) === substr( $digits, -10 ) ) {
				$id = $lid;
				break;
			}
		}
	}
	$person     = $get( array( 'full_name', 'name' ) );
	$business   = $get( array( 'company', 'business_name', 'business' ) );
	$client     = 0;
	// No email match: a project added by hand (e.g. from Upwork) often has no email yet. Match an open
	// project or lead by business name or the person's name, so the form lands on it instead of a duplicate lead.
	if ( ! $id && $onboarding ) {
		$id = dwdc_find_open_project( $business, $person );
	}
	// Onboarding from someone whose earlier project is finished = a new project for the same client.
	// (An active / on-hold / limbo project is the one they're onboarding for, so it's filed there.)
	if ( $onboarding && $id && 'complete' === get_post_meta( $id, '_dwdc_list', true ) ) {
		$client = (int) get_post_meta( $id, '_dwdc_client', true );
		$id     = 0;
	}
	if ( $onboarding && ! $client && $id ) {
		$client = (int) get_post_meta( $id, '_dwdc_client', true );
	}
	if ( $onboarding && ! $client ) {
		// Onboarding always files under a client: matched by email, else a new one with their details.
		$client = dwdc_find_client( $email, '' ) ?: dwdc_save_client( 0, array( 'name' => $person ?: $email, 'email' => $email, 'phone' => $get( array( 'phone' ) ), 'company' => $business ) );
	}
	$new        = ! $id;
	$data       = array(
		// Projects are named after the business (the website); the client is the person.
		'name'  => $onboarding && $business ? $business : ( $person ?: $email ),
		'email' => $email,
	);
	if ( $person ) {
		$data['person'] = $person;
	}
	if ( $client ) {
		$data['client'] = $client;
	}
	foreach ( array( 'phone' => array( 'phone' ), 'company' => array( 'company' ), 'website' => array( 'existing_url', 'website' ) ) as $k => $keys ) {
		$v = $get( $keys );
		if ( $v && ( $new || '' === get_post_meta( $id, '_dwdc_' . $k, true ) ) ) {
			$data[ $k ] = $v;
		}
	}
	if ( $new ) {
		$data['list']   = 'leads';
		$data['stage']  = $onboarding ? 'onboarding' : 'new';
		$data['source'] = $source . ': ' . $form;
		// Came from a Google ad (the site remembers the click for 90 days)? Record that, and which campaign.
		if ( function_exists( 'dwdp_ad_click' ) && ( $ad = dwdp_ad_click() ) ) {
			$data['lead_source'] = 'Google Ads';
			$data['source']      = 'Google Ads' . ( $ad['c'] ? ' · ' . $ad['c'] : '' ) . ( $ad['t'] ? ' · “' . $ad['t'] . '”' : '' ) . ': ' . $form;
		}
	} else {
		// Invited leads start with a placeholder name (their email or phone); the form fills in the real one.
		if ( get_post_meta( $id, '_dwdc_invited', true ) ) {
			delete_post_meta( $id, '_dwdc_invited' );
		} else {
			unset( $data['name'] );
		}
		if ( $onboarding && in_array( get_post_meta( $id, '_dwdc_list', true ), array( 'leads', 'archive', 'onboarding' ), true ) ) {
			$data['stage'] = 'onboarding';
			if ( in_array( get_post_meta( $id, '_dwdc_list', true ), array( 'archive', 'onboarding' ), true ) ) {
				$data['list'] = 'leads';
			}
		}
	}
	$id      = dwdc_save_contact( $id, $data );
	if ( $client ) {
		if ( $person && get_post_meta( $client, '_dwdcl_invited', true ) ) {
			wp_update_post( array( 'ID' => $client, 'post_title' => $person ) );
			delete_post_meta( $client, '_dwdcl_invited' );
		}
		foreach ( array( 'email' => $email, 'phone' => $get( array( 'phone' ) ), 'company' => $business ) as $k => $v ) {
			if ( $v && ! get_post_meta( $client, '_dwdcl_' . $k, true ) ) {
				update_post_meta( $client, '_dwdcl_' . $k, 'email' === $k ? strtolower( $v ) : $v );
			}
		}
	}
	$entries = get_post_meta( $id, '_dwdc_entries', true );
	$entries = is_array( $entries ) ? $entries : array();
	$entries[] = array(
		'form'   => $form,
		'date'   => $date ? $date : current_time( 'mysql', true ),
		'fields' => array_values( array_filter( $fields, function ( $f ) { return '' !== trim( (string) $f['value'] ); } ) ),
	);
	update_post_meta( $id, '_dwdc_entries', $entries );
	wp_update_post( array( 'ID' => $id ) ); // bump "last updated"
	return $id;
}

add_action( 'elementor_pro/forms/new_record', function ( $record ) {
	$form   = (string) $record->get_form_settings( 'form_name' );
	$fields = array();
	foreach ( (array) $record->get( 'fields' ) as $id => $f ) {
		if ( in_array( $f['type'] ?? '', array( 'step', 'html', 'hidden' ), true ) || 0 === strpos( $id, 'dwdp_' ) ) {
			continue;
		}
		$fields[] = array( 'id' => $id, 'label' => $f['title'] ? $f['title'] : ucfirst( str_replace( '_', ' ', $id ) ), 'value' => is_array( $f['value'] ) ? implode( ', ', $f['value'] ) : (string) $f['value'] );
	}
	$cid = dwdc_file_entry( $form, $fields );
	if ( $cid ) {
		dwdc_ensure_client( $cid );
		$name = get_the_title( $cid );
		dwdc_add_task( ( false !== stripos( $form, 'onboard' ) ? 'Review onboarding form from ' : 'Reply to ' ) . $name, $cid, current_time( 'Y-m-d' ) );
	}
}, 20 );

// Hosting orders (first payment and every yearly auto-renewal from the subscription): the buyer is
// matched to their client record by email, then name or website, so an existing hosting client who
// starts paying online keeps one record. Each paid order sets the fee and moves the renewal date a year on.
function dwdc_from_order( $order_id ) {
	$o = function_exists( 'wc_get_order' ) ? wc_get_order( $order_id ) : null;
	if ( ! $o || $o->get_meta( '_dwdc_filed' ) ) {
		return;
	}
	// Paid through a client's own renewal link: make sure the email lands on that client.
	$linked = (int) $o->get_meta( '_dwdc_contact' );
	if ( ! $linked && $o->get_parent_id() ) {
		$parent = wc_get_order( $o->get_parent_id() );
		$linked = $parent ? (int) $parent->get_meta( '_dwdc_contact' ) : 0;
	}
	if ( $linked && DWDC_CONTACT === get_post_type( $linked ) && ! get_post_meta( $linked, '_dwdc_email', true ) && $o->get_billing_email() ) {
		update_post_meta( $linked, '_dwdc_email', strtolower( sanitize_email( $o->get_billing_email() ) ) );
	}
	$name    = trim( $o->get_billing_first_name() . ' ' . $o->get_billing_last_name() );
	$site    = (string) $o->get_meta( '_billing_website' );
	$renewal = (bool) $o->get_meta( '_wps_sfw_renewal_order' ) || (bool) $o->get_meta( 'wps_sfw_renewal_order' ) || $o->get_parent_id();
	$fields  = array(
		array( 'id' => 'name', 'label' => 'Name', 'value' => $name ),
		array( 'id' => 'email', 'label' => 'Email', 'value' => $o->get_billing_email() ),
		array( 'id' => 'phone', 'label' => 'Phone', 'value' => $o->get_billing_phone() ),
		array( 'id' => 'company', 'label' => 'Company', 'value' => $o->get_billing_company() ),
		array( 'id' => 'website', 'label' => 'Website', 'value' => $site ),
		array( 'id' => 'order', 'label' => 'Order', 'value' => '#' . $o->get_order_number() . ' · $' . $o->get_total() ),
	);
	$match = array_filter( array( $name, $o->get_billing_company(), $site ? dwdc_domain( $site ) : '' ) );
	$had   = dwdc_find( $o->get_billing_email(), $match );
	$auto  = $had && '1' === get_post_meta( $had, '_dwdc_autopay', true );
	$cid   = dwdc_file_entry( $auto || $renewal ? 'Hosting renewal paid' : 'Hosting order', $fields, $o->get_date_created() ? $o->get_date_created()->date( 'Y-m-d H:i:s' ) : '', 'Store', $match );
	if ( $cid ) {
		dwdc_ensure_client( $cid );
		$start = $o->get_date_paid() ? $o->get_date_paid() : $o->get_date_created();
		$data  = array( 'hosting' => $o->get_total(), 'renewal' => $start ? gmdate( 'Y-m-d', strtotime( '+1 year', $start->getTimestamp() ) ) : '' );
		if ( ! $had ) {
			$data['list'] = 'complete'; // a hosting-only client, not a lead
		}
		dwdc_save_contact( $cid, $data );
		update_post_meta( $cid, '_dwdc_autopay', '1' );
		if ( ! $auto && ! $renewal ) {
			dwdc_add_task( 'Set up hosting for ' . get_the_title( $cid ), $cid, current_time( 'Y-m-d' ) );
		}
		$o->update_meta_data( '_dwdc_filed', 1 );
		$o->update_meta_data( '_dwdc_contact', $cid );
		$o->save();
	}
}
add_action( 'woocommerce_order_status_processing', 'dwdc_from_order' );
add_action( 'woocommerce_order_status_completed', 'dwdc_from_order' );

// The follow-up reminder email (sent to Michael).
add_action( 'dwdc_followup', function ( $id ) {
	if ( DWDC_CONTACT !== get_post_type( $id ) || 'leads' !== get_post_meta( $id, '_dwdc_list', true ) ) {
		return; // already a client, or archived
	}
	$name  = get_post_meta( $id, '_dwdc_person', true ) ?: get_post_field( 'post_title', $id );
	$email = (string) get_post_meta( $id, '_dwdc_email', true );
	$phone = (string) get_post_meta( $id, '_dwdc_phone', true );
	$rows  = array_filter( array( array( 'Lead', get_post_field( 'post_title', $id ) ), array( 'Email', $email ), array( 'Phone', $phone ), array( 'Came in', get_post_time( 'M j, Y', false, $id ) ) ), function ( $x ) { return '' !== $x[1]; } );
	$html  = dwdp_email_html( array(
		'eyebrow' => 'Follow Up',
		'title'   => 'Time to follow up with ' . $name,
		'intro'   => 'You asked for a reminder a week ago. Here are their details so you can reach out.',
		'rows'    => array_values( $rows ),
		'buttons' => array_filter( array( $email ? array( 'Email ' . trim( strtok( $name, ' ' ) ), 'mailto:' . $email ) : null, array( 'Open in Dream Desk', admin_url( 'admin.php?page=client-desk#client/' . $id ) ) ) ),
	) );
	wp_mail( 'mike@dreamwebdigital.com', 'Follow up with ' . $name, $html, array( 'Content-Type: text/html; charset=UTF-8' ) );
} );

/* ---------------------------------------------------------------- hosting subscriptions */

/** Secret key in each client's renewal link, so nobody can guess another client's link. */
function dwdc_paykey( $id ) {
	return substr( hash_hmac( 'sha256', 'dwdc-pay-' . (int) $id, wp_salt( 'auth' ) ), 0, 20 );
}
function dwdc_paylink( $id ) {
	return add_query_arg( array( 'dwd-order' => 'hosting', 'dwc' => (int) $id, 'dwk' => dwdc_paykey( $id ) ), home_url( '/checkout/' ) );
}

/**
 * Yearly hosting subscriptions (Subscriptions for WooCommerce), keyed by contact id and by email.
 * Each: status (active, on-hold, cancelled, pending…), amount, method (Stripe, PayPal…), next charge date.
 */
function dwdc_subscriptions() {
	static $map = null;
	if ( null !== $map ) {
		return $map;
	}
	$map = array( 'email' => array(), 'contact' => array() );
	if ( ! function_exists( 'wc_get_orders' ) ) {
		return $map;
	}
	try {
		$subs = wc_get_orders( array( 'type' => 'wps_subscriptions', 'limit' => -1, 'status' => 'any' ) );
	} catch ( \Throwable $e ) {
		$subs = array();
	}
	foreach ( (array) $subs as $sub ) {
		if ( ! is_object( $sub ) || ! method_exists( $sub, 'get_meta' ) ) {
			continue;
		}
		$parent = (int) $sub->get_meta( 'wps_parent_order' );
		$po     = $parent ? wc_get_order( $parent ) : null;
		$email  = strtolower( (string) ( $sub->get_billing_email() ?: ( $po ? $po->get_billing_email() : '' ) ) );
		$next   = $sub->get_meta( 'wps_next_payment_date' );
		$info   = array(
			'id'     => $sub->get_id(),
			'status' => (string) ( $sub->get_meta( 'wps_subscription_status' ) ?: $sub->get_status() ),
			'amount' => (string) $sub->get_total(),
			'method' => (string) ( $sub->get_payment_method_title() ?: ( $po ? $po->get_payment_method_title() : '' ) ),
			'next'   => $next ? ( is_numeric( $next ) ? gmdate( 'Y-m-d', (int) $next ) : gmdate( 'Y-m-d', strtotime( $next ) ) ) : '',
		);
		$rank = function ( $i ) { return 'active' === $i['status'] ? 2 : ( 'cancelled' === $i['status'] ? 0 : 1 ); };
		$cid  = $po ? (int) $po->get_meta( '_dwdc_contact' ) : 0;
		foreach ( array( 'email' => $email, 'contact' => $cid ) as $k => $v ) {
			if ( $v && ( empty( $map[ $k ][ $v ] ) || $rank( $info ) >= $rank( $map[ $k ][ $v ] ) ) ) {
				$map[ $k ][ $v ] = $info;
			}
		}
	}
	return $map;
}
function dwdc_subscription_for( $id, $email ) {
	$m = dwdc_subscriptions();
	return $m['contact'][ $id ] ?? ( $email ? ( $m['email'][ strtolower( $email ) ] ?? null ) : null );
}

/** One time: file every form entry already saved by Elementor. */
function dwdc_backfill() {
	global $wpdb;
	$s = $wpdb->prefix . 'e_submissions';
	$v = $wpdb->prefix . 'e_submissions_values';
	if ( $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $s ) ) !== $s ) {
		return 0;
	}
	$rows = $wpdb->get_results( "SELECT id, form_name, created_at_gmt, status FROM {$s} WHERE status NOT LIKE '%trash%' ORDER BY id ASC" ); // phpcs:ignore
	$n    = 0;
	foreach ( $rows as $r ) {
		$vals   = $wpdb->get_results( $wpdb->prepare( "SELECT `key`, `value` FROM {$v} WHERE submission_id = %d ORDER BY id ASC", $r->id ) ); // phpcs:ignore
		$fields = array();
		foreach ( $vals as $x ) {
			if ( 0 === strpos( $x->key, 'step_' ) || 0 === strpos( $x->key, 'dwdp_' ) ) {
				continue;
			}
			$fields[] = array( 'id' => $x->key, 'label' => ucfirst( str_replace( '_', ' ', $x->key ) ), 'value' => (string) $x->value );
		}
		if ( dwdc_file_entry( $r->form_name, $fields, $r->created_at_gmt ) ) {
			$n++;
		}
	}
	return $n;
}

/**
 * Delete a lead completely: the lead, its to-dos, its client record (when that client has nothing else),
 * the website-form submissions Elementor kept for that email, and any unfinished-checkout record.
 */
function dwdc_purge_lead( $id ) {
	global $wpdb;
	$id = (int) $id;
	if ( DWDC_CONTACT !== get_post_type( $id ) ) {
		return new WP_Error( 'dwdc_none', 'That lead no longer exists.', array( 'status' => 404 ) );
	}
	$email  = strtolower( (string) get_post_meta( $id, '_dwdc_email', true ) );
	$client = (int) get_post_meta( $id, '_dwdc_client', true );
	$out    = array( 'tasks' => 0, 'client' => false, 'submissions' => 0, 'checkout' => 0 );
	foreach ( get_posts( array( 'post_type' => DWDC_TASK, 'post_status' => 'any', 'posts_per_page' => -1, 'fields' => 'ids', 'meta_key' => '_dwdc_contact', 'meta_value' => $id ) ) as $t ) { // phpcs:ignore
		wp_delete_post( $t, true );
		$out['tasks']++;
	}
	wp_delete_post( $id, true );
	if ( $client && DWDC_CLIENT === get_post_type( $client ) ) {
		$others = get_posts( array( 'post_type' => DWDC_CONTACT, 'post_status' => 'any', 'posts_per_page' => 1, 'fields' => 'ids', 'meta_key' => '_dwdc_client', 'meta_value' => $client ) ); // phpcs:ignore
		if ( ! $others ) {
			wp_delete_post( $client, true );
			$out['client'] = true;
		}
	}
	if ( $email ) {
		$s = $wpdb->prefix . 'e_submissions';
		$v = $wpdb->prefix . 'e_submissions_values';
		if ( $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $s ) ) === $s ) {
			$ids = $wpdb->get_col( $wpdb->prepare( "SELECT DISTINCT submission_id FROM {$v} WHERE LOWER(`value`) = %s", $email ) ); // phpcs:ignore
			foreach ( array_map( 'intval', $ids ) as $sid ) {
				$wpdb->delete( $v, array( 'submission_id' => $sid ) );
				$wpdb->delete( $s, array( 'id' => $sid ) );
				$log = $wpdb->prefix . 'e_submissions_actions_log';
				if ( $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $log ) ) === $log ) {
					$wpdb->delete( $log, array( 'submission_id' => $sid ) );
				}
				$out['submissions']++;
			}
		}
		if ( defined( 'DWDP_LEADS' ) ) {
			$l = get_option( DWDP_LEADS, array() );
			if ( is_array( $l ) ) {
				$keep = array_filter( $l, function ( $x, $k ) use ( $email ) { return strtolower( (string) ( is_array( $x ) ? ( $x['email'] ?? $k ) : $k ) ) !== $email; }, ARRAY_FILTER_USE_BOTH );
				$out['checkout'] = count( $l ) - count( $keep );
				if ( $out['checkout'] ) {
					update_option( DWDP_LEADS, $keep, false );
				}
			}
		}
	}
	return $out;
}

/* ---------------------------------------------------------------- REST */

add_action( 'rest_api_init', function () {
	$can = function () { return current_user_can( 'manage_options' ); };
	$ns  = 'dwd/v1';

	register_rest_route( $ns, '/crm', array( 'methods' => 'GET', 'permission_callback' => $can, 'callback' => function () {
		$contacts = array_map( 'dwdc_contact', get_posts( array( 'post_type' => DWDC_CONTACT, 'post_status' => 'private', 'posts_per_page' => -1, 'orderby' => 'modified', 'order' => 'DESC' ) ) );
		$tasks    = array_map( 'dwdc_task', get_posts( array( 'post_type' => DWDC_TASK, 'post_status' => 'private', 'posts_per_page' => -1, 'orderby' => array( 'menu_order' => 'ASC', 'date' => 'DESC' ) ) ) );
		$clients  = array_map( 'dwdc_client', get_posts( array( 'post_type' => DWDC_CLIENT, 'post_status' => 'private', 'posts_per_page' => -1, 'orderby' => 'title', 'order' => 'ASC' ) ) );
		return array( 'lists' => dwdc_lists(), 'contacts' => $contacts, 'tasks' => $tasks, 'clients' => $clients, 'money' => dwdc_money_by_year(), 'costs' => dwdc_costs_by_year(), 'trends' => function_exists( 'dwdt_get' ) ? dwdt_get() : null, 'wins' => function_exists( 'dwdc_wins' ) ? dwdc_wins() : null, 'ads' => function_exists( 'dwdads_summary' ) ? dwdads_summary() : null, 'meetings' => function_exists( 'dwdmt_summary' ) ? dwdmt_summary() : null, 'order' => (object) get_option( 'dwdc_home_order', array() ) );
	} ) );

	// Upwork costs (Connects and membership), uploaded from the transaction history.
	register_rest_route( $ns, '/crm/costs', array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function ( $r ) {
		$rows = array();
		foreach ( (array) $r->get_param( 'rows' ) as $x ) {
			$x = (array) $x;
			if ( empty( $x['date'] ) ) {
				continue;
			}
			$rows[] = array(
				'date'   => sanitize_text_field( $x['date'] ),
				'amount' => round( (float) ( $x['amount'] ?? 0 ), 2 ),
				'type'   => 'membership' === ( $x['type'] ?? '' ) ? 'membership' : 'connects',
				'qty'    => absint( $x['qty'] ?? 0 ),
				'ref'    => sanitize_text_field( $x['ref'] ?? '' ),
			);
		}
		update_option( 'dwdc_upwork_costs', $rows, false );
		return array( 'saved' => count( $rows ) );
	} ) );
	// Preview of the review-request email, exactly as clients see it.
	register_rest_route( $ns, '/crm/reviews/preview', array( 'methods' => 'GET', 'permission_callback' => $can, 'callback' => function () {
		header( 'Content-Type: text/html; charset=utf-8' );
		echo dwdc_review_html( 'Sarah' ); // phpcs:ignore WordPress.Security.EscapeOutput
		exit;
	} ) );
	// Review requests: a branded email asking past clients for a Google review.
	register_rest_route( $ns, '/crm/reviews', array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function ( $r ) {
		$ids  = array_slice( array_filter( array_map( 'absint', (array) $r->get_param( 'ids' ) ) ), 0, 20 );
		$sent = array();
		$fail = array();
		foreach ( $ids as $cid ) {
			if ( DWDC_CLIENT !== get_post_type( $cid ) ) {
				continue;
			}
			$email = (string) get_post_meta( $cid, '_dwdcl_email', true );
			if ( ! is_email( $email ) ) {
				foreach ( get_posts( array( 'post_type' => DWDC_CONTACT, 'post_status' => 'private', 'posts_per_page' => -1, 'fields' => 'ids', 'meta_key' => '_dwdc_client', 'meta_value' => $cid ) ) as $pid ) { // phpcs:ignore
					$e = (string) get_post_meta( $pid, '_dwdc_email', true );
					if ( is_email( $e ) ) {
						$email = $e;
						break;
					}
				}
			}
			if ( ! is_email( $email ) ) {
				$fail[] = array( 'id' => $cid, 'why' => 'no email' );
				continue;
			}
			if ( dwdc_send_review_request( $cid, $email ) ) {
				update_post_meta( $cid, '_dwdcl_review_sent', current_time( 'Y-m-d' ) );
				$sent[] = $cid;
			} else {
				$fail[] = array( 'id' => $cid, 'why' => 'did not send' );
			}
		}
		return array( 'sent' => $sent, 'failed' => $fail );
	} ) );

	register_rest_route( $ns, '/crm/contact/(?P<id>\d+)', array(
		array( 'methods' => 'GET', 'permission_callback' => $can, 'callback' => function ( $r ) { return dwdc_contact( (int) $r['id'], true ); } ),
		array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function ( $r ) {
			$id = (int) $r['id'];
			dwdc_save_contact( $id, (array) $r->get_json_params() );
			return dwdc_contact( $id, true );
		} ),
		array( 'methods' => 'DELETE', 'permission_callback' => $can, 'callback' => function ( $r ) {
			wp_trash_post( (int) $r['id'] );
			return array( 'ok' => true );
		} ),
	) );

	register_rest_route( $ns, '/crm/lead/(?P<id>\d+)', array( 'methods' => 'DELETE', 'permission_callback' => $can, 'callback' => function ( $r ) {
		return dwdc_purge_lead( (int) $r['id'] );
	} ) );
	register_rest_route( $ns, '/crm/contact', array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function ( $r ) {
		$d = (array) $r->get_json_params();
		if ( ! empty( $d['email'] ) && dwdc_find_by_email( $d['email'] ) ) {
			return new WP_Error( 'dwdc_exists', 'A contact with that email already exists.', array( 'status' => 400 ) );
		}
		return dwdc_contact( dwdc_save_contact( 0, $d ), true );
	} ) );

	register_rest_route( $ns, '/crm/contact/(?P<id>\d+)/note', array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function ( $r ) {
		$id    = (int) $r['id'];
		$notes = get_post_meta( $id, '_dwdc_notes', true );
		$notes = is_array( $notes ) ? $notes : array();
		$notes[] = array( 'date' => current_time( 'mysql', true ), 'text' => sanitize_textarea_field( (string) $r->get_param( 'text' ) ) );
		update_post_meta( $id, '_dwdc_notes', $notes );
		wp_update_post( array( 'ID' => $id ) );
		return dwdc_contact( $id, true );
	} ) );

	// New project for a client (existing, or new from the form). Past projects stay as their own records.
	register_rest_route( $ns, '/crm/job', array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function ( $r ) {
		$d   = (array) $r->get_json_params();
		$cid = (int) ( $d['client'] ?? 0 );
		if ( ! $cid || DWDC_CLIENT !== get_post_type( $cid ) ) {
			if ( empty( $d['client_name'] ) ) {
				return new WP_Error( 'dwdc_client', 'Pick a client or add a new one.', array( 'status' => 400 ) );
			}
			$cid = dwdc_find_client( $d['email'] ?? '', '' ) ?: dwdc_save_client( 0, array( 'name' => $d['client_name'], 'email' => $d['email'] ?? '', 'phone' => $d['phone'] ?? '' ) );
		}
		$cl  = dwdc_client( $cid );
		$id  = dwdc_save_contact( 0, array(
			'name' => trim( (string) ( $d['name'] ?? '' ) ) ?: $cl['name'], 'client' => $cid, 'list' => 'active',
			'job' => $d['title'] ?? '', 'price' => $d['price'] ?? '', 'balance' => $d['balance'] ?? '', 'deadline' => $d['deadline'] ?? '', 'next' => $d['next'] ?? '',
			'person' => $cl['name'], 'email' => $cl['email'], 'phone' => $cl['phone'], 'website' => $d['website'] ?? '', 'source' => 'Added in Client Desk',
		) );
		return dwdc_contact( $id, true );
	} ) );

	// Clients: create / update / delete (only when no projects), link a project to a client, one-time grouping.
	register_rest_route( $ns, '/crm/client', array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function ( $r ) {
		$d = (array) $r->get_json_params();
		if ( empty( $d['name'] ) ) {
			return new WP_Error( 'dwdc_name', 'Add the client’s name.', array( 'status' => 400 ) );
		}
		return dwdc_client( dwdc_save_client( 0, $d ) );
	} ) );
	register_rest_route( $ns, '/crm/client/(?P<id>\d+)', array(
		array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function ( $r ) {
			$id = (int) $r['id'];
			$d  = (array) $r->get_json_params();
			dwdc_save_client( $id, $d );
			// Keep the contact details on their projects in step.
			foreach ( get_posts( array( 'post_type' => DWDC_CONTACT, 'post_status' => 'private', 'posts_per_page' => -1, 'fields' => 'ids', 'meta_key' => '_dwdc_client', 'meta_value' => $id ) ) as $pid ) { // phpcs:ignore
				foreach ( array( 'email' => 'email', 'phone' => 'phone', 'name' => 'person' ) as $k => $f ) {
					if ( isset( $d[ $k ] ) && '' !== trim( (string) $d[ $k ] ) ) {
						update_post_meta( $pid, '_dwdc_' . $f, 'email' === $k ? strtolower( sanitize_email( $d[ $k ] ) ) : sanitize_text_field( $d[ $k ] ) );
					}
				}
			}
			return dwdc_client( $id );
		} ),
		array( 'methods' => 'DELETE', 'permission_callback' => $can, 'callback' => function ( $r ) {
			$id = (int) $r['id'];
			if ( get_posts( array( 'post_type' => DWDC_CONTACT, 'post_status' => 'private', 'posts_per_page' => 1, 'fields' => 'ids', 'meta_key' => '_dwdc_client', 'meta_value' => $id ) ) ) { // phpcs:ignore
				return new WP_Error( 'dwdc_has', 'Move or delete this client’s projects first.', array( 'status' => 400 ) );
			}
			wp_trash_post( $id );
			return array( 'ok' => true );
		} ),
	) );
	register_rest_route( $ns, '/crm/contact/(?P<id>\d+)/client', array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function ( $r ) {
		$pid = (int) $r['id'];
		$cid = (int) $r->get_param( 'client' );
		if ( ! $cid && $r->get_param( 'name' ) ) {
			$cid = dwdc_save_client( 0, array( 'name' => $r->get_param( 'name' ), 'email' => (string) get_post_meta( $pid, '_dwdc_email', true ) ) );
		}
		if ( DWDC_CLIENT !== get_post_type( $cid ) ) {
			return new WP_Error( 'dwdc_nf', 'Client not found', array( 'status' => 404 ) );
		}
		$old = (int) get_post_meta( $pid, '_dwdc_client', true );
		update_post_meta( $pid, '_dwdc_client', $cid );
		update_post_meta( $pid, '_dwdc_person', get_post_field( 'post_title', $cid ) );
		// An old client left with no projects goes away.
		if ( $old && $old !== $cid && ! get_posts( array( 'post_type' => DWDC_CONTACT, 'post_status' => 'private', 'posts_per_page' => 1, 'fields' => 'ids', 'meta_key' => '_dwdc_client', 'meta_value' => $old ) ) ) { // phpcs:ignore
			wp_trash_post( $old );
		}
		return array( 'project' => dwdc_contact( $pid, true ), 'client' => dwdc_client( $cid ) );
	} ) );
	register_rest_route( $ns, '/crm/clients/build', array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function () {
		$n = 0;
		foreach ( get_posts( array( 'post_type' => DWDC_CONTACT, 'post_status' => 'private', 'posts_per_page' => -1, 'fields' => 'ids', 'orderby' => 'ID', 'order' => 'ASC' ) ) as $pid ) {
			if ( ! get_post_meta( $pid, '_dwdc_client', true ) ) {
				dwdc_ensure_client( $pid );
				$n++;
			}
		}
		return array( 'linked' => $n, 'clients' => count( get_posts( array( 'post_type' => DWDC_CLIENT, 'post_status' => 'private', 'posts_per_page' => -1, 'fields' => 'ids' ) ) ) );
	} ) );

	// Bulk import (e.g. from ClickUp): each row is merged into an existing record when the email,
	// name, company or one of its `match` aliases is already known; otherwise a new record is made.
	register_rest_route( $ns, '/crm/import', array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function ( $r ) {
		$out = array( 'created' => 0, 'merged' => 0 );
		foreach ( (array) $r->get_param( 'rows' ) as $row ) {
			$row = (array) $row;
			$id  = dwdc_find( $row['email'] ?? '', array_merge( array( $row['name'] ?? '', $row['company'] ?? '' ), (array) ( $row['match'] ?? array() ) ) );
			$new = ! $id;
			if ( ! $new ) {
				// Keep what's already there (e.g. a name from a form) unless the import has something better.
				unset( $row['name'] );
				foreach ( dwdc_fields() as $f ) {
					if ( isset( $row[ $f ] ) && '' === (string) $row[ $f ] ) {
						unset( $row[ $f ] );
					}
				}
				if ( ! empty( $row['jobs'] ) ) {
					$old         = get_post_meta( $id, '_dwdc_jobs', true );
					$row['jobs'] = array_merge( is_array( $old ) ? $old : array(), $row['jobs'] );
				}
			}
			$id = dwdc_save_contact( $id, $row );
			if ( ! empty( $row['note'] ) ) {
				$notes   = get_post_meta( $id, '_dwdc_notes', true );
				$notes   = is_array( $notes ) ? $notes : array();
				$notes[] = array( 'date' => current_time( 'mysql', true ), 'text' => sanitize_textarea_field( $row['note'] ) );
				update_post_meta( $id, '_dwdc_notes', $notes );
			}
			$out[ $new ? 'created' : 'merged' ]++;
		}
		return $out;
	} ) );

	// Email a client their hosting renewal link (their own price; it sets up yearly auto-renew).
	register_rest_route( $ns, '/crm/contact/(?P<id>\d+)/paylink', array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function ( $r ) {
		$id    = (int) $r['id'];
		$email = sanitize_email( (string) $r->get_param( 'email' ) );
		if ( $email ) {
			update_post_meta( $id, '_dwdc_email', strtolower( $email ) );
		}
		$email = (string) get_post_meta( $id, '_dwdc_email', true );
		if ( ! is_email( $email ) ) {
			return new WP_Error( 'dwdc_email', 'Add the client’s email first.', array( 'status' => 400 ) );
		}
		$fee   = (float) preg_replace( '/[^\d.]/', '', (string) get_post_meta( $id, '_dwdc_hosting', true ) );
		$who   = get_post_meta( $id, '_dwdc_person', true ) ?: get_the_title( $id );
		$first = trim( strtok( $who, ' ' ) );
		$site  = preg_replace( '#^https?://(www\.)?#', '', (string) get_post_meta( $id, '_dwdc_website', true ) );
		$html  = dwdp_email_html( array(
			'eyebrow' => 'Website Hosting',
			'title'   => 'Renew your hosting',
			'intro'   => 'Hi ' . esc_html( $first ) . ',<br><br>It’s time to renew hosting' . ( $site ? ' for <strong>' . esc_html( rtrim( $site, '/' ) ) . '</strong>' : '' ) . '. Use the button below to pay <strong>$' . esc_html( number_format( $fee, $fee == (int) $fee ? 0 : 2 ) ) . ' for the year</strong>. It renews automatically each year after that, so you won’t need to think about it again. Cancel anytime.<br><br>Questions? Just reply to this email.<br><br>Michael Tarr<br>Dream Web Digital',
			'buttons' => array( array( 'Renew hosting', dwdc_paylink( $id ) ) ),
		) );
		$sent = wp_mail( $email, 'Renew your website hosting', $html, array( 'Content-Type: text/html; charset=UTF-8', 'Reply-To: Michael Tarr <mike@dreamwebdigital.com>' ) );
		if ( ! $sent ) {
			return new WP_Error( 'dwdc_mail', 'The email didn’t send. Copy the link and send it yourself.', array( 'status' => 500 ) );
		}
		$notes   = get_post_meta( $id, '_dwdc_notes', true );
		$notes   = is_array( $notes ) ? $notes : array();
		$notes[] = array( 'date' => current_time( 'mysql', true ), 'text' => 'Hosting renewal link emailed to ' . $email . '.' );
		update_post_meta( $id, '_dwdc_notes', $notes );
		wp_update_post( array( 'ID' => $id ) );
		return dwdc_contact( $id, true );
	} ) );

	// Merge duplicate contacts into one: details fill gaps, totals add up, everything else moves over.
	register_rest_route( $ns, '/crm/merge', array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function ( $r ) {
		$into = (int) $r->get_param( 'into' );
		if ( DWDC_CONTACT !== get_post_type( $into ) ) {
			return new WP_Error( 'dwdc_nf', 'Contact not found', array( 'status' => 404 ) );
		}
		foreach ( array_map( 'absint', (array) $r->get_param( 'from' ) ) as $from ) {
			if ( ! $from || $from === $into || DWDC_CONTACT !== get_post_type( $from ) ) {
				continue;
			}
			foreach ( dwdc_fields() as $f ) {
				$a = (string) get_post_meta( $into, '_dwdc_' . $f, true );
				$b = (string) get_post_meta( $from, '_dwdc_' . $f, true );
				if ( in_array( $f, array( 'billed', 'stripe', 'paypal' ), true ) ) {
					$sum = (float) $a + (float) $b;
					update_post_meta( $into, '_dwdc_' . $f, $sum ? (string) round( $sum, 2 ) : '' );
				} elseif ( '' === $a && '' !== $b && 'list' !== $f ) {
					update_post_meta( $into, '_dwdc_' . $f, $b );
				}
			}
			if ( '' === (string) get_post_meta( $into, '_dwdc_person', true ) && get_the_title( $from ) !== get_the_title( $into ) ) {
				update_post_meta( $into, '_dwdc_person', get_the_title( $from ) );
			}
			foreach ( array( '_dwdc_jobs', '_dwdc_notes', '_dwdc_entries', '_dwdc_payments', '_dwdc_contacts' ) as $k ) {
				$a = get_post_meta( $into, $k, true );
				$b = get_post_meta( $from, $k, true );
				if ( is_array( $b ) && $b ) {
					update_post_meta( $into, $k, array_merge( is_array( $a ) ? $a : array(), $b ) );
				}
			}
			foreach ( get_posts( array( 'post_type' => DWDC_TASK, 'post_status' => 'any', 'posts_per_page' => -1, 'fields' => 'ids', 'meta_key' => '_dwdc_contact', 'meta_value' => $from ) ) as $t ) { // phpcs:ignore
				update_post_meta( $t, '_dwdc_contact', $into );
			}
			wp_trash_post( $from );
		}
		wp_update_post( array( 'ID' => $into ) );
		return dwdc_contact( $into, true );
	} ) );

	// Follow up with a lead: emails Michael a reminder in N days (and adds a to-do for that day).
	register_rest_route( $ns, '/crm/contact/(?P<id>\d+)/followup', array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function ( $r ) {
		$id   = (int) $r['id'];
		$days = max( 1, min( 60, (int) ( $r->get_param( 'days' ) ?: 7 ) ) );
		$when = strtotime( '+' . $days . ' days', current_time( 'timestamp' ) );
		update_post_meta( $id, '_dwdc_followup', gmdate( 'Y-m-d', $when ) );
		wp_clear_scheduled_hook( 'dwdc_followup', array( $id ) );
		wp_schedule_single_event( time() + $days * DAY_IN_SECONDS, 'dwdc_followup', array( $id ) );
		dwdc_add_task( 'Follow up with ' . get_post_field( 'post_title', $id ), $id, gmdate( 'Y-m-d', $when ) );
		return dwdc_contact( $id, true );
	} ) );

	// Invite a new client: a waiting lead + client are created, and the onboarding form link is emailed
	// (or, for a phone number, returned so it can be texted). Their answers fill both in automatically.
	register_rest_route( $ns, '/crm/invite', array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function ( $r ) {
		$to    = trim( (string) $r->get_param( 'to' ) );
		$email = is_email( $to ) ? strtolower( sanitize_email( $to ) ) : '';
		$phone = $email ? '' : ( strlen( preg_replace( '/\D/', '', $to ) ) >= 7 ? sanitize_text_field( $to ) : '' );
		if ( ! $email && ! $phone ) {
			return new WP_Error( 'dwdc_to', 'Enter an email address or phone number.', array( 'status' => 400 ) );
		}
		$link = get_permalink( 2993 ) ?: home_url( '/onboarding/' );
		$pid  = $email ? dwdc_find_by_email( $email ) : 0;
		// Sent from a lead's own page: that lead gets the form (and the email / phone if it had none).
		$lead = (int) $r->get_param( 'project' );
		if ( $lead && DWDC_CONTACT === get_post_type( $lead ) ) {
			$pid = $lead;
			foreach ( array( 'email' => $email, 'phone' => $phone ) as $k => $v ) {
				if ( $v && '' === (string) get_post_meta( $pid, '_dwdc_' . $k, true ) ) {
					update_post_meta( $pid, '_dwdc_' . $k, $v );
				}
			}
			$cid = (int) get_post_meta( $pid, '_dwdc_client', true );
			if ( $cid && $email && ! get_post_meta( $cid, '_dwdcl_email', true ) ) {
				update_post_meta( $cid, '_dwdcl_email', $email );
			}
			if ( '' === (string) get_post_meta( $pid, '_dwdc_next', true ) || 'leads' === get_post_meta( $pid, '_dwdc_list', true ) ) {
				update_post_meta( $pid, '_dwdc_next', 'Waiting on their onboarding form' );
			}
		}
		if ( ! $pid ) {
			$cid = $email ? dwdc_find_client( $email, '' ) : 0;
			if ( ! $cid ) {
				$cid = dwdc_save_client( 0, array( 'name' => $to, 'email' => $email, 'phone' => $phone ) );
				update_post_meta( $cid, '_dwdcl_invited', 1 );
			}
			$pid = dwdc_save_contact( 0, array( 'name' => $to, 'email' => $email, 'phone' => $phone, 'list' => 'leads', 'stage' => 'contacted', 'source' => 'Invited to onboarding', 'client' => $cid, 'next' => 'Waiting on their onboarding form' ) );
			update_post_meta( $pid, '_dwdc_invited', 1 );
		}
		$notes   = get_post_meta( $pid, '_dwdc_notes', true );
		$notes   = is_array( $notes ) ? $notes : array();
		$sent    = false;
		if ( $email ) {
			$html = dwdp_email_html( array(
				'eyebrow' => 'Welcome',
				'title'   => 'Let’s get your website started',
				'intro'   => 'Hi there,<br><br>Thank you for choosing Dream Web Digital. The first step is a short onboarding form that tells me everything I need to plan your website: your business, your goals, the pages you need, and the look you have in mind.<br><br>'
					. 'It takes about 10 to 15 minutes, and your answers save automatically as you go, so you can come back to finish. Please answer every question; if one doesn’t apply, just write N/A.',
				'buttons' => array( array( 'Start my onboarding form', $link ) ),
				'outro'   => 'Questions? Just reply to this email.<br>Michael Tarr, Dream Web Digital',
				'footer'  => 'Dream Web Digital ·',
			) );
			$html = str_replace( 'padding:14px 26px;border-radius:8px;font-size:13px', 'padding:20px 44px;border-radius:10px;font-size:16px', $html );
			$sent = wp_mail( $email, 'Your onboarding form from Dream Web Digital', $html, array( 'Content-Type: text/html; charset=UTF-8', 'Reply-To: Michael Tarr <mike@dreamwebdigital.com>' ) );
		}
		$notes[] = array( 'date' => current_time( 'mysql', true ), 'text' => $email ? ( $sent ? 'Onboarding form emailed to ' . $email . '.' : 'Tried to email the onboarding form to ' . $email . ', but it didn’t send.' ) : 'Onboarding form link shared by text with ' . $phone . '.' );
		update_post_meta( $pid, '_dwdc_notes', $notes );
		return array(
			'project' => dwdc_contact( $pid, true ),
			'sent'    => $sent,
			'link'    => $link,
			'text'    => 'Hi! This is Michael from Dream Web Digital. Here’s your onboarding form to get your website started. It takes about 10–15 minutes and saves as you go: ' . $link,
		);
	} ) );

	// Log a payment on a project: adds it to the payment history, counts it in the right total, lowers what's owed.
	register_rest_route( $ns, '/crm/contact/(?P<id>\d+)/payment', array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function ( $r ) {
		$id  = (int) $r['id'];
		$amt = round( (float) preg_replace( '/[^\d.]/', '', (string) $r->get_param( 'amount' ) ), 2 );
		if ( $amt <= 0 || DWDC_CONTACT !== get_post_type( $id ) ) {
			return new WP_Error( 'dwdc_amt', 'Enter the amount paid.', array( 'status' => 400 ) );
		}
		$method = sanitize_text_field( (string) $r->get_param( 'method' ) ) ?: 'Other';
		$date   = sanitize_text_field( (string) $r->get_param( 'date' ) ) ?: current_time( 'Y-m-d' );
		$note   = sanitize_text_field( (string) $r->get_param( 'note' ) );
		$pays   = get_post_meta( $id, '_dwdc_payments', true );
		$pays   = is_array( $pays ) ? $pays : array();
		$pays[] = array( 'date' => $date, 'amount' => (string) $amt, 'source' => $method, 'ref' => 'Logged in Dream Desk', 'status' => 'paid', 'note' => $note );
		usort( $pays, function ( $a, $b ) { return strcmp( (string) ( $b['date'] ?? '' ), (string) ( $a['date'] ?? '' ) ); } );
		update_post_meta( $id, '_dwdc_payments', $pays );
		$field = array( 'Stripe' => 'stripe', 'PayPal' => 'paypal', 'Upwork' => 'billed' )[ $method ] ?? 'manual';
		update_post_meta( $id, '_dwdc_' . $field, (string) round( (float) get_post_meta( $id, '_dwdc_' . $field, true ) + $amt, 2 ) );
		$bal = (float) preg_replace( '/[^\d.]/', '', (string) get_post_meta( $id, '_dwdc_balance', true ) );
		if ( $bal > 0 ) {
			update_post_meta( $id, '_dwdc_balance', (string) max( 0, round( $bal - $amt, 2 ) ) );
		}
		if ( $bal - $amt <= 0 ) {
			update_post_meta( $id, '_dwdc_pending', '' ); // fully paid: no longer pending
		}
		// A hosting renewal moves the renewal date a year on (from the old date, or the payment date if that's later).
		if ( $r->get_param( 'renew' ) ) {
			$cur  = (string) get_post_meta( $id, '_dwdc_renewal', true );
			$base = $cur && $cur > $date ? $cur : $date;
			update_post_meta( $id, '_dwdc_renewal', gmdate( 'Y-m-d', strtotime( '+1 year', strtotime( $base ) ) ) );
		}
		if ( ! get_post_meta( $id, '_dwdc_pay_method', true ) ) {
			update_post_meta( $id, '_dwdc_pay_method', $method );
		}
		$notes   = get_post_meta( $id, '_dwdc_notes', true );
		$notes   = is_array( $notes ) ? $notes : array();
		$notes[] = array( 'date' => current_time( 'mysql', true ), 'text' => 'Payment of $' . number_format( $amt, $amt == (int) $amt ? 0 : 2 ) . ' logged (' . $method . ( $note ? ', ' . $note : '' ) . ').' );
		update_post_meta( $id, '_dwdc_notes', $notes );
		wp_update_post( array( 'ID' => $id ) );
		return dwdc_contact( $id, true );
	} ) );

	// Remove one logged payment (by its position in the list): it comes off the paid totals and goes back into what's owed.
	register_rest_route( $ns, '/crm/contact/(?P<id>\d+)/payment/(?P<i>\d+)', array( 'methods' => 'DELETE', 'permission_callback' => $can, 'callback' => function ( $r ) {
		$id   = (int) $r['id'];
		$i    = (int) $r['i'];
		$pays = get_post_meta( $id, '_dwdc_payments', true );
		if ( DWDC_CONTACT !== get_post_type( $id ) || ! is_array( $pays ) || ! isset( $pays[ $i ] ) ) {
			return new WP_Error( 'dwdc_nf', 'Payment not found.', array( 'status' => 404 ) );
		}
		$p   = $pays[ $i ];
		$amt = (float) preg_replace( '/[^\d.]/', '', (string) ( $p['amount'] ?? 0 ) );
		array_splice( $pays, $i, 1 );
		update_post_meta( $id, '_dwdc_payments', $pays );
		$field = array( 'Stripe' => 'stripe', 'PayPal' => 'paypal', 'Upwork' => 'billed' )[ (string) ( $p['source'] ?? '' ) ] ?? 'manual';
		$cur   = (float) get_post_meta( $id, '_dwdc_' . $field, true );
		update_post_meta( $id, '_dwdc_' . $field, $cur - $amt > 0 ? (string) round( $cur - $amt, 2 ) : '' );
		$price = (float) preg_replace( '/[^\d.]/', '', (string) get_post_meta( $id, '_dwdc_price', true ) );
		$bal   = (float) preg_replace( '/[^\d.]/', '', (string) get_post_meta( $id, '_dwdc_balance', true ) );
		if ( $price > 0 && ( $p['status'] ?? 'paid' ) === 'paid' ) {
			update_post_meta( $id, '_dwdc_balance', (string) min( $price, round( $bal + $amt, 2 ) ) );
		}
		$notes   = (array) get_post_meta( $id, '_dwdc_notes', true );
		$notes[] = array( 'date' => current_time( 'mysql', true ), 'text' => 'Payment of $' . number_format( $amt, $amt == (int) $amt ? 0 : 2 ) . ' (' . ( $p['source'] ?? '' ) . ', ' . ( $p['date'] ?? '' ) . ') removed.' );
		update_post_meta( $id, '_dwdc_notes', array_values( array_filter( $notes ) ) );
		wp_update_post( array( 'ID' => $id ) );
		return dwdc_contact( $id, true );
	} ) );

	// Email the client their Markup review link, in the site's branded email.
	// Markup.io API: save the workspace API key, and create a review markup from a staging URL.
	register_rest_route( $ns, '/crm/markup-key', array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function ( $r ) {
		$key = trim( (string) $r->get_param( 'key' ) );
		if ( strlen( $key ) < 20 || preg_match( '/\s/', $key ) ) {
			return new WP_Error( 'dwdc_key', 'That doesn’t look like a Markup API key.', array( 'status' => 400 ) );
		}
		update_option( 'dwdc_markup_key', $key, false );
		return array( 'ok' => true );
	} ) );
	register_rest_route( $ns, '/crm/contact/(?P<id>\d+)/markup-create', array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function ( $r ) {
		$id  = (int) $r['id'];
		$key = (string) get_option( 'dwdc_markup_key', '' );
		if ( ! $key ) {
			return new WP_Error( 'dwdc_nokey', 'Add your Markup API key first.', array( 'status' => 400, 'needs_key' => true ) );
		}
		$site = esc_url_raw( trim( (string) $r->get_param( 'url' ) ) );
		if ( ! $site || ! preg_match( '#^https?://#i', $site ) ) {
			return new WP_Error( 'dwdc_url', 'Paste the full staging URL (starting with https://).', array( 'status' => 400 ) );
		}
		$call = function ( $method, $path, $body = null ) use ( $key ) {
			$res = wp_remote_request( 'https://api.markup.io/api/v2' . $path, array(
				'method'  => $method,
				'timeout' => 45,
				'headers' => array( 'Authorization' => 'Bearer ' . $key, 'Markup-API-Version' => '2023-02-22', 'Content-Type' => 'application/json' ),
				'body'    => null === $body ? null : wp_json_encode( $body ),
			) );
			if ( is_wp_error( $res ) ) {
				return new WP_Error( 'dwdc_mk', 'Couldn’t reach Markup: ' . $res->get_error_message(), array( 'status' => 502 ) );
			}
			$code = wp_remote_retrieve_response_code( $res );
			$json = json_decode( wp_remote_retrieve_body( $res ), true );
			if ( 401 === $code || 403 === $code ) {
				return new WP_Error( 'dwdc_mk', 'Markup rejected the API key. Paste a new one.', array( 'status' => 400, 'needs_key' => true ) );
			}
			if ( $code < 200 || $code >= 300 ) {
				$msg = is_array( $json ) ? ( $json['message'] ?? ( $json['error']['message'] ?? '' ) ) : '';
				return new WP_Error( 'dwdc_mk', 'Markup error (' . $code . ')' . ( $msg ? ': ' . ( is_string( $msg ) ? $msg : wp_json_encode( $msg ) ) : '' ), array( 'status' => 502 ) );
			}
			return is_array( $json ) ? ( $json['data'] ?? $json ) : array();
		};
		$mk = $call( 'POST', '/markups/url', array( 'url' => $site, 'name' => get_post_field( 'post_title', $id ) ) );
		if ( is_wp_error( $mk ) ) {
			return $mk;
		}
		$share = ! empty( $mk['id'] ) ? $call( 'GET', '/markups/' . rawurlencode( $mk['id'] ) . '/share-link' ) : null;
		$link  = ( is_array( $share ) && ! empty( $share['url'] ) ) ? $share['url'] : (string) ( $mk['markupUrl'] ?? '' );
		if ( ! $link ) {
			return new WP_Error( 'dwdc_mk', 'Markup created it but didn’t return a link. Open Markup to copy it.', array( 'status' => 502 ) );
		}
		update_post_meta( $id, '_dwdc_markup', esc_url_raw( $link ) );
		update_post_meta( $id, '_dwdc_markup_app', esc_url_raw( (string) ( $mk['markupUrl'] ?? '' ) ) );
		update_post_meta( $id, '_dwdc_markup_sent', '' );
		$notes   = get_post_meta( $id, '_dwdc_notes', true );
		$notes   = is_array( $notes ) ? $notes : array();
		$notes[] = array( 'date' => current_time( 'mysql', true ), 'text' => 'Markup review created for ' . $site . '.' );
		update_post_meta( $id, '_dwdc_notes', $notes );
		wp_update_post( array( 'ID' => $id ) );
		return dwdc_contact( $id, true );
	} ) );
	register_rest_route( $ns, '/crm/contact/(?P<id>\d+)/markup-email', array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function ( $r ) {
		$id   = (int) $r['id'];
		$link = esc_url_raw( trim( (string) ( $r->get_param( 'markup' ) ?: get_post_meta( $id, '_dwdc_markup', true ) ) ) );
		if ( ! $link ) {
			return new WP_Error( 'dwdc_link', 'Add the client’s Markup link first.', array( 'status' => 400 ) );
		}
		update_post_meta( $id, '_dwdc_markup', $link );
		$cid   = (int) get_post_meta( $id, '_dwdc_client', true );
		$email = sanitize_email( (string) $r->get_param( 'email' ) ) ?: (string) get_post_meta( $id, '_dwdc_email', true ) ?: ( $cid ? (string) get_post_meta( $cid, '_dwdcl_email', true ) : '' );
		if ( ! is_email( $email ) ) {
			return new WP_Error( 'dwdc_email', 'Add the client’s email first.', array( 'status' => 400 ) );
		}
		if ( ! get_post_meta( $id, '_dwdc_email', true ) ) {
			update_post_meta( $id, '_dwdc_email', strtolower( $email ) );
		}
		$who     = ( $cid ? get_post_field( 'post_title', $cid ) : '' ) ?: ( get_post_meta( $id, '_dwdc_person', true ) ?: get_post_field( 'post_title', $id ) );
		$first   = trim( strtok( (string) $who, ' ' ) );
		$project = get_post_field( 'post_title', $id );
		$html    = dwdc_markup_email_html( $first, $project, $link );
		$sent = wp_mail( $email, 'The first draft of ' . $project . ' is ready for you', $html, array( 'Content-Type: text/html; charset=UTF-8', 'Reply-To: Michael Tarr <mike@dreamwebdigital.com>' ) );
		if ( ! $sent ) {
			return new WP_Error( 'dwdc_mail', 'The email didn’t send. Copy the link and send it yourself.', array( 'status' => 500 ) );
		}
		update_post_meta( $id, '_dwdc_markup_sent', current_time( 'Y-m-d' ) );
		$notes   = get_post_meta( $id, '_dwdc_notes', true );
		$notes   = is_array( $notes ) ? $notes : array();
		$notes[] = array( 'date' => current_time( 'mysql', true ), 'text' => 'Markup review link emailed to ' . $email . '.' );
		update_post_meta( $id, '_dwdc_notes', $notes );
		wp_update_post( array( 'ID' => $id ) );
		return dwdc_contact( $id, true );
	} ) );

	register_rest_route( $ns, '/crm/task', array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function ( $r ) {
		$id = dwdc_add_task( sanitize_text_field( (string) $r->get_param( 'text' ) ), (int) $r->get_param( 'contact' ), sanitize_text_field( (string) $r->get_param( 'due' ) ) );
		return dwdc_task( $id );
	} ) );

	register_rest_route( $ns, '/crm/task/(?P<id>\d+)', array(
		array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function ( $r ) {
			$id = (int) $r['id'];
			$d  = (array) $r->get_json_params();
			if ( isset( $d['text'] ) ) {
				wp_update_post( array( 'ID' => $id, 'post_title' => sanitize_text_field( $d['text'] ) ) );
			}
			if ( isset( $d['done'] ) ) {
				update_post_meta( $id, '_dwdc_done', $d['done'] ? '1' : '0' );
				update_post_meta( $id, '_dwdc_done_at', $d['done'] ? current_time( 'mysql' ) : '' );
			}
			if ( isset( $d['due'] ) ) {
				update_post_meta( $id, '_dwdc_due', sanitize_text_field( $d['due'] ) );
			}
			if ( isset( $d['contact'] ) ) {
				update_post_meta( $id, '_dwdc_contact', (int) $d['contact'] );
			}
			return dwdc_task( $id );
		} ),
		array( 'methods' => 'DELETE', 'permission_callback' => $can, 'callback' => function ( $r ) {
			wp_delete_post( (int) $r['id'], true );
			return array( 'ok' => true );
		} ),
	) );

	// Home page lists (Leads, active Projects) in the order Mike dragged them into.
	register_rest_route( $ns, '/crm/home-order', array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function ( $r ) {
		$key = (string) $r->get_param( 'key' );
		if ( ! in_array( $key, array( 'leads', 'active', 'todos' ), true ) ) {
			return new WP_Error( 'dwdc_key', 'Unknown list.', array( 'status' => 400 ) );
		}
		$all         = (array) get_option( 'dwdc_home_order', array() );
		$all[ $key ] = array_values( array_filter( array_map( 'absint', (array) $r->get_param( 'ids' ) ) ) );
		update_option( 'dwdc_home_order', $all, false );
		return array( 'ok' => true );
	} ) );
	register_rest_route( $ns, '/crm/task-order', array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function ( $r ) {
		foreach ( array_map( 'absint', (array) $r->get_param( 'ids' ) ) as $i => $id ) {
			wp_update_post( array( 'ID' => $id, 'menu_order' => $i ) );
		}
		return array( 'ok' => true );
	} ) );
} );

/* ---------------------------------------------------------------- admin screen */

add_action( 'admin_menu', function () {
	add_menu_page( 'Dream Desk', 'Business', 'manage_options', 'client-desk', 'dwdc_page', 'dashicons-portfolio', 2 );
} );

add_action( 'admin_init', function () {
	if ( current_user_can( 'manage_options' ) && ! get_option( 'dwdc_backfilled' ) ) {
		update_option( 'dwdc_backfilled', array( 'time' => time(), 'count' => dwdc_backfill() ), false );
	}
} );

/**
 * Settings handed to the Dream Desk app (admin screen and the /desk/ phone app).
 *
 * @param string $mode 'admin' or 'app'.
 */
function dwdc_vars( $mode = 'admin' ) {
	$v = array(
		'api'   => esc_url_raw( rest_url( 'dwd/v1/crm' ) ),
		'nonce' => wp_create_nonce( 'wp_rest' ),
		'logo'  => content_url( '/uploads/2026/11/dreamweb-white-blue-transparent.png' ),
		'today' => current_time( 'Y-m-d' ),
		'orders' => admin_url( class_exists( '\\Automattic\\WooCommerce\\Utilities\\OrderUtil' ) && \Automattic\WooCommerce\Utilities\OrderUtil::custom_orders_table_usage_is_enabled() ? 'admin.php?page=wc-orders&s=' : 'edit.php?post_type=shop_order&s=' ),
		'pay'   => home_url( '/checkout/?dwd-order=hosting' ),
		'markupHome' => 'https://app.markup.io/w/o7nvlGWC',
		'mark'       => DWDP_URL . 'assets/db-mark.png',
		'logout' => html_entity_decode( wp_logout_url( admin_url( 'admin.php?page=client-desk' ) ) ),
		'wp'     => admin_url(),
		'user'   => wp_get_current_user()->display_name,
	);
	$v['app']     = home_url( '/desk/' );
	$v['appIcon'] = DWDP_URL . 'assets/app/icon-192.png';
	$v['appQr']   = DWDP_URL . 'assets/app/qr-desk.png';
	$v['mode']    = $mode;
	$v['ver']     = DWDP_VERSION;
	$v['aiReady'] = function_exists( 'dwdc_ai_key' ) && '' !== dwdc_ai_key();
	$v['mkReady'] = '' !== (string) get_option( 'dwdc_markup_key', '' );
	$v['upLast']  = '';
	if ( function_exists( 'dwds_files' ) ) {
		foreach ( dwds_files() as $f ) {
			$v['upLast'] = max( $v['upLast'], (string) ( $f['uploaded'] ?? '' ) );
		}
	}
	if ( 'app' === $mode ) {
		$v['logout'] = html_entity_decode( wp_logout_url( home_url( '/desk/' ) ) );
	}
	return $v;
}

/**
 * Money actually received per year, from payments that carry a real date
 * (Stripe, PayPal and payments logged by hand). Upwork totals have no dates yet.
 */
function dwdc_money_by_year() {
	$out = array();
	foreach ( get_posts( array( 'post_type' => DWDC_CONTACT, 'post_status' => 'private', 'posts_per_page' => -1, 'fields' => 'ids' ) ) as $id ) {
		$pays = get_post_meta( $id, '_dwdc_payments', true );
		if ( ! is_array( $pays ) ) {
			continue;
		}
		foreach ( $pays as $p ) {
			$st = strtolower( (string) ( $p['status'] ?? 'paid' ) );
			if ( in_array( $st, array( 'open', 'void', 'draft', 'failed', 'uncollectible' ), true ) ) {
				continue;
			}
			$sign = 'refunded' === $st ? -1 : 1; // money sent back to a client comes off that year
			$y   = substr( (string) ( $p['date'] ?? '' ), 0, 4 );
			$amt = (float) preg_replace( '/[^\d.]/', '', (string) ( $p['amount'] ?? 0 ) );
			if ( ! preg_match( '/^\d{4}$/', $y ) || $amt <= 0 ) {
				continue;
			}
			$src = (string) ( $p['source'] ?? 'Other' );
			$src = in_array( $src, array( 'Stripe', 'PayPal', 'Upwork' ), true ) ? $src : 'Other';
			if ( ! isset( $out[ $y ] ) ) {
				$out[ $y ] = array( 'Stripe' => 0, 'PayPal' => 0, 'Upwork' => 0, 'Other' => 0, 'm' => array_fill( 0, 12, 0 ) );
			}
			$out[ $y ][ $src ] += $sign * $amt;
			$mo = (int) substr( (string) $p['date'], 5, 2 );
			if ( $mo >= 1 && $mo <= 12 ) {
				$out[ $y ]['m'][ $mo - 1 ] += $sign * $amt;
			}
		}
	}
	krsort( $out );
	return $out;
}

/** The Google review link clients are sent to. */
define( 'DWDC_REVIEW_URL', 'https://g.page/r/CTqmN38PVOg7EBM/review' );

function dwdc_review_html( $first ) {
	$html = dwdp_email_html( array(
		'eyebrow' => 'A quick favor',
		'title'   => 'Would you leave me a review?',
		'intro'   => 'Hi ' . esc_html( $first ) . ',<br><br>'
			. 'Thank you again for trusting me with your website. It was a pleasure working with you.<br><br>'
			. 'I have a small favor to ask. Would you take a minute to leave me a review on Google? Building websites is my full-time career, and reviews help me more than anything else. Every new review builds trust and gives the next business owner the confidence to hire me.<br><br>'
			. 'If you were happy with your experience, a <strong>5-star review</strong> with a few kind words about working together would mean the world to me. It only takes a minute.',
		'buttons' => array( array( 'Click here to leave a review', DWDC_REVIEW_URL ) ),
		'outro'   => 'If you’ve already left a review, thank you so much, and please disregard this email.<br><br>With gratitude,<br>Michael Tarr<br>Dream Web Digital',
		'footer'  => 'Dream Web Digital ·',
	) );
	$html = str_replace( 'padding:14px 26px;border-radius:8px;font-size:13px', 'padding:20px 44px;border-radius:10px;font-size:16px', $html ); // a bigger, bolder button
	return $html;
}

/**
 * Send one branded "please leave a review" email.
 *
 * @param int    $cid   Client ID.
 * @param string $email Where to send it.
 */
function dwdc_send_review_request( $cid, $email ) {
	$first = trim( strtok( (string) get_post_field( 'post_title', $cid ), ' ' ) );
	$first = $first && ! preg_match( '/[.@]/', $first ) ? $first : 'there';
	$html  = dwdc_review_html( $first );
	return wp_mail( $email, 'A quick favor: would you leave me a review?', $html, array( 'Content-Type: text/html; charset=UTF-8', 'Reply-To: Michael Tarr <mike@dreamwebdigital.com>' ) );
}

/** Upwork Connects and membership spending per year and month. */
function dwdc_costs_by_year() {
	$out = array();
	foreach ( (array) get_option( 'dwdc_upwork_costs', array() ) as $x ) {
		$y  = substr( (string) ( $x['date'] ?? '' ), 0, 4 );
		$mo = (int) substr( (string) ( $x['date'] ?? '' ), 5, 2 );
		if ( ! preg_match( '/^\d{4}$/', $y ) || $mo < 1 || $mo > 12 ) {
			continue;
		}
		if ( ! isset( $out[ $y ] ) ) {
			$out[ $y ] = array( 'connects' => 0, 'qty' => 0, 'buys' => 0, 'membership' => 0, 'm' => array_fill( 0, 12, 0 ), 'mq' => array_fill( 0, 12, 0 ) );
		}
		$a = (float) ( $x['amount'] ?? 0 );
		if ( 'membership' === ( $x['type'] ?? '' ) ) {
			$out[ $y ]['membership'] += $a;
		} else {
			$out[ $y ]['connects']        += $a;
			$out[ $y ]['qty']             += (int) ( $x['qty'] ?? 0 );
			$out[ $y ]['buys']            += 1;
			$out[ $y ]['m'][ $mo - 1 ]    += $a;
			$out[ $y ]['mq'][ $mo - 1 ]   += (int) ( $x['qty'] ?? 0 );
		}
	}
	krsort( $out );
	return $out;
}

function dwdc_page() {
	echo '<div id="dwdc-app" class="dwdc"><div class="dwdc-loading">Loading Client Desk…</div></div>';
}

add_action( 'admin_enqueue_scripts', function ( $hook ) {
	if ( 'toplevel_page_client-desk' !== $hook ) {
		return;
	}
	wp_enqueue_style( 'dwdc-fonts', 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap', array(), null );
	wp_enqueue_style( 'dwdc', DWDP_URL . 'assets/crm.css', array(), DWDP_VERSION );
	wp_enqueue_script( 'dwdc', DWDP_URL . 'assets/crm.js', array(), DWDP_VERSION, true );
	wp_localize_script( 'dwdc', 'DWDC', dwdc_vars() );
} );

// Full-screen app: no admin bar gap above it.
add_action( 'admin_head', function () {
	$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
	if ( $screen && 'toplevel_page_client-desk' === $screen->id ) {
		echo '<style>#wpfooter{display:none!important}</style>';
	}
} );

add_filter( 'admin_body_class', function ( $c ) {
	$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
	return $screen && 'toplevel_page_client-desk' === $screen->id ? $c . ' dwdc-screen' : $c;
} );

/** Browser tab just says "Dream Desk" (not "Dream Desk ‹ Dream Web Digital — WordPress"). */
add_filter( 'admin_title', function ( $title ) {
	return ( isset( $_GET['page'] ) && 'client-desk' === $_GET['page'] ) ? 'Dream Desk' : $title; // phpcs:ignore WordPress.Security.NonceVerification
}, 99 );

/** Current Dream Desk version, so an app left open in the background can refresh itself after an update. */
add_action( 'rest_api_init', function () {
	register_rest_route( 'dwd/v1', '/crm/version', array( 'methods' => 'GET', 'permission_callback' => function () { return current_user_can( 'manage_options' ); }, 'callback' => function () { return array( 'ver' => DWDP_VERSION ); } ) );
} );
