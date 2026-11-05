<?php
/**
 * Client Desk: a small CRM in the WordPress admin, in the style of Mojo's Flight Desk.
 *
 * - Each client/job sits in one stage: Leads, Onboarding, Active jobs, In limbo, Completed, Archive.
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

add_action( 'init', function () {
	foreach ( array( DWDC_CONTACT => 'Contacts', DWDC_TASK => 'To-dos' ) as $type => $label ) {
		register_post_type( $type, array( 'label' => $label, 'public' => false, 'show_ui' => false, 'supports' => array( 'title' ) ) );
	}
} );

/** The lists, in order. Saved so they can be renamed or added to later. */
function dwdc_lists() {
	$default = array(
		array( 'id' => 'leads', 'name' => 'Leads', 'color' => '#F0874A' ),
		array( 'id' => 'onboarding', 'name' => 'Onboarding', 'color' => '#E2A93B' ),
		array( 'id' => 'active', 'name' => 'Active jobs', 'color' => '#1B7EC3' ),
		array( 'id' => 'limbo', 'name' => 'In limbo', 'color' => '#9B6BDF' ),
		array( 'id' => 'complete', 'name' => 'Completed', 'color' => '#2EA36B' ),
		array( 'id' => 'archive', 'name' => 'Archive', 'color' => '#A7B1C2' ),
	);
	$saved = get_option( 'dwdc_lists' );
	return is_array( $saved ) && $saved ? $saved : $default;
}

/** Contact fields kept on every contact. */
function dwdc_fields() {
	return array( 'person', 'email', 'phone', 'company', 'website', 'list', 'price', 'balance', 'deadline', 'hosting', 'renewal', 'source', 'next' );
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
	$c['last_entry']  = $entries ? end( $entries )['form'] : '';
	$jobs        = get_post_meta( $p->ID, '_dwdc_jobs', true );
	$c['jobs']   = is_array( $jobs ) ? $jobs : array();
	if ( $full ) {
		$notes      = get_post_meta( $p->ID, '_dwdc_notes', true );
		$c['notes'] = is_array( $notes ) ? array_reverse( $notes ) : array();
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
		'order'   => (int) $p->menu_order,
		'created' => get_post_time( 'c', true, $p ),
	);
}

function dwdc_find_by_email( $email ) {
	$email = strtolower( trim( $email ) );
	if ( ! $email ) {
		return 0;
	}
	$ids = get_posts( array( 'post_type' => DWDC_CONTACT, 'post_status' => 'any', 'posts_per_page' => 1, 'fields' => 'ids', 'meta_key' => '_dwdc_email', 'meta_value' => $email ) ); // phpcs:ignore
	return $ids ? (int) $ids[0] : 0;
}

function dwdc_save_contact( $id, $data ) {
	if ( ! $id ) {
		$id = wp_insert_post( array( 'post_type' => DWDC_CONTACT, 'post_status' => 'private', 'post_title' => $data['name'] ?? 'New contact' ) );
		if ( empty( $data['list'] ) ) {
			$data['list'] = 'leads';
		}
	} elseif ( isset( $data['name'] ) ) {
		wp_update_post( array( 'ID' => $id, 'post_title' => $data['name'] ) );
	}
	foreach ( dwdc_fields() as $f ) {
		if ( isset( $data[ $f ] ) ) {
			$v = 'email' === $f ? strtolower( sanitize_email( $data[ $f ] ) ) : sanitize_text_field( $data[ $f ] );
			update_post_meta( $id, '_dwdc_' . $f, $v );
		}
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
	return (int) $id;
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
		$have = array( strtolower( $p->post_title ), strtolower( (string) get_post_meta( $p->ID, '_dwdc_company', true ) ), strtolower( (string) get_post_meta( $p->ID, '_dwdc_person', true ) ) );
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
 * File a form entry on the matching contact (created if new).
 * $fields: list of array( 'id', 'label', 'value' ).
 */
function dwdc_file_entry( $form, $fields, $date = '', $source = 'Website form' ) {
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
	$id         = dwdc_find_by_email( $email );
	$onboarding = false !== stripos( $form, 'onboard' );
	$new        = ! $id;
	$data       = array(
		'name'  => $get( array( 'full_name', 'name' ) ) ?: $email,
		'email' => $email,
	);
	foreach ( array( 'phone' => array( 'phone' ), 'company' => array( 'company' ), 'website' => array( 'existing_url', 'website' ) ) as $k => $keys ) {
		$v = $get( $keys );
		if ( $v && ( $new || '' === get_post_meta( $id, '_dwdc_' . $k, true ) ) ) {
			$data[ $k ] = $v;
		}
	}
	if ( $new ) {
		$data['list']   = $onboarding ? 'onboarding' : 'leads';
		$data['source'] = $source . ': ' . $form;
	} else {
		unset( $data['name'] );
		if ( $onboarding && in_array( get_post_meta( $id, '_dwdc_list', true ), array( 'leads', 'archive' ), true ) ) {
			$data['list'] = 'onboarding';
		}
	}
	$id      = dwdc_save_contact( $id, $data );
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
		$name = get_the_title( $cid );
		dwdc_add_task( ( false !== stripos( $form, 'onboard' ) ? 'Review onboarding form from ' : 'Reply to ' ) . $name, $cid, current_time( 'Y-m-d' ) );
	}
}, 20 );

// Hosting orders: the buyer goes on Hosting clients with a renewal date a year out.
function dwdc_from_order( $order_id ) {
	$o = function_exists( 'wc_get_order' ) ? wc_get_order( $order_id ) : null;
	if ( ! $o || $o->get_meta( '_dwdc_filed' ) ) {
		return;
	}
	$fields = array(
		array( 'id' => 'name', 'label' => 'Name', 'value' => trim( $o->get_billing_first_name() . ' ' . $o->get_billing_last_name() ) ),
		array( 'id' => 'email', 'label' => 'Email', 'value' => $o->get_billing_email() ),
		array( 'id' => 'phone', 'label' => 'Phone', 'value' => $o->get_billing_phone() ),
		array( 'id' => 'website', 'label' => 'Website', 'value' => (string) $o->get_meta( '_billing_website' ) ),
		array( 'id' => 'order', 'label' => 'Order', 'value' => '#' . $o->get_order_number() . ' · $' . $o->get_total() ),
	);
	$cid = dwdc_file_entry( 'Hosting order', $fields, $o->get_date_created() ? $o->get_date_created()->date( 'Y-m-d H:i:s' ) : '', 'Store' );
	if ( $cid ) {
		$start = $o->get_date_paid() ? $o->get_date_paid() : $o->get_date_created();
		dwdc_save_contact( $cid, array( 'hosting' => $o->get_total(), 'renewal' => $start ? gmdate( 'Y-m-d', strtotime( '+1 year', $start->getTimestamp() ) ) : '' ) );
		dwdc_add_task( 'Set up hosting for ' . get_the_title( $cid ), $cid, current_time( 'Y-m-d' ) );
		$o->update_meta_data( '_dwdc_filed', 1 );
		$o->save();
	}
}
add_action( 'woocommerce_order_status_processing', 'dwdc_from_order' );
add_action( 'woocommerce_order_status_completed', 'dwdc_from_order' );

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

/* ---------------------------------------------------------------- REST */

add_action( 'rest_api_init', function () {
	$can = function () { return current_user_can( 'manage_options' ); };
	$ns  = 'dwd/v1';

	register_rest_route( $ns, '/crm', array( 'methods' => 'GET', 'permission_callback' => $can, 'callback' => function () {
		$contacts = array_map( 'dwdc_contact', get_posts( array( 'post_type' => DWDC_CONTACT, 'post_status' => 'private', 'posts_per_page' => -1, 'orderby' => 'modified', 'order' => 'DESC' ) ) );
		$tasks    = array_map( 'dwdc_task', get_posts( array( 'post_type' => DWDC_TASK, 'post_status' => 'private', 'posts_per_page' => -1, 'orderby' => array( 'menu_order' => 'ASC', 'date' => 'DESC' ) ) ) );
		return array( 'lists' => dwdc_lists(), 'contacts' => $contacts, 'tasks' => $tasks );
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

	register_rest_route( $ns, '/crm/task-order', array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function ( $r ) {
		foreach ( array_map( 'absint', (array) $r->get_param( 'ids' ) ) as $i => $id ) {
			wp_update_post( array( 'ID' => $id, 'menu_order' => $i ) );
		}
		return array( 'ok' => true );
	} ) );
} );

/* ---------------------------------------------------------------- admin screen */

add_action( 'admin_menu', function () {
	add_menu_page( 'Client Desk', 'Client Desk', 'manage_options', 'client-desk', 'dwdc_page', 'dashicons-groups', 2 );
} );

add_action( 'admin_init', function () {
	if ( current_user_can( 'manage_options' ) && ! get_option( 'dwdc_backfilled' ) ) {
		update_option( 'dwdc_backfilled', array( 'time' => time(), 'count' => dwdc_backfill() ), false );
	}
} );

function dwdc_page() {
	echo '<div id="dwdc-app" class="dwdc"><div class="dwdc-loading">Loading Client Desk…</div></div>';
}

add_action( 'admin_enqueue_scripts', function ( $hook ) {
	if ( 'toplevel_page_client-desk' !== $hook ) {
		return;
	}
	wp_enqueue_style( 'dwdc-fonts', 'https://fonts.googleapis.com/css2?family=Urbanist:wght@300;400;500;600;700;800;900&display=swap', array(), null );
	wp_enqueue_style( 'dwdc', DWDP_URL . 'assets/crm.css', array(), DWDP_VERSION );
	wp_enqueue_script( 'dwdc', DWDP_URL . 'assets/crm.js', array(), DWDP_VERSION, true );
	wp_localize_script( 'dwdc', 'DWDC', array(
		'api'   => esc_url_raw( rest_url( 'dwd/v1/crm' ) ),
		'nonce' => wp_create_nonce( 'wp_rest' ),
		'logo'  => content_url( '/uploads/2025/10/Asset-2-1.png' ),
		'today' => current_time( 'Y-m-d' ),
	) );
} );

add_filter( 'admin_body_class', function ( $c ) {
	$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
	return $screen && 'toplevel_page_client-desk' === $screen->id ? $c . ' dwdc-screen folded' : $c;
} );
