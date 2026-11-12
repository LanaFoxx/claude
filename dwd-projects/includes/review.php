<?php
/**
 * Review queue: changes found by scans (Upwork emails, Gmail scans…) wait here until Mike approves
 * them in the dashboard pop-up. Nothing from a scan reaches the CRM without that click.
 *
 * Item: id, kind (new_project | update | completed | note), title, lines (what will change),
 *       source, key (dedupe), created, op.
 * Op:   project (0 = create), data (dwdc_save_contact fields), job (one job to add if missing),
 *       meta (post meta), task (to-do text), map (Upwork client team name → this project).
 */
defined( 'ABSPATH' ) || exit;

function dwdq_all() {
	return array_values( (array) get_option( 'dwdq_pending', array() ) );
}

/** Queue an item unless one with the same key is already waiting. Returns the item id or ''. */
function dwdq_add( $item ) {
	$all = dwdq_all();
	$key = (string) ( $item['key'] ?? '' );
	foreach ( $all as $x ) {
		if ( $key && ( $x['key'] ?? '' ) === $key ) {
			return '';
		}
	}
	$item['id']      = substr( md5( $key . microtime() . wp_rand() ), 0, 12 );
	$item['created'] = current_time( 'mysql' );
	$all[]           = $item;
	update_option( 'dwdq_pending', $all, false );
	return $item['id'];
}

/** Is something for this key already waiting for review? */
function dwdq_has( $key ) {
	foreach ( dwdq_all() as $x ) {
		if ( ( $x['key'] ?? '' ) === $key ) {
			return true;
		}
	}
	return false;
}

function dwdq_apply( $item ) {
	$op  = (array) ( $item['op'] ?? array() );
	$pid = (int) ( $op['project'] ?? 0 );
	if ( $pid && DWDC_CONTACT !== get_post_type( $pid ) ) {
		return new WP_Error( 'dwdq_gone', 'That project no longer exists.' );
	}
	$data = (array) ( $op['data'] ?? array() );
	// Prices are never taken from Upwork (Mike enters them himself, after Upwork's fee).
	if ( false !== stripos( (string) ( $item['source'] ?? '' ), 'upwork' ) ) {
		unset( $data['price'], $data['balance'] );
		if ( ! empty( $op['job'] ) ) {
			$op['job']['price'] = '';
		}
	}
	if ( ! empty( $op['job'] ) ) {
		$jobs = $pid ? (array) get_post_meta( $pid, '_dwdc_jobs', true ) : array();
		$has  = false;
		foreach ( $jobs as $j ) {
			$has = $has || dwds_norm( $j['title'] ?? '' ) === dwds_norm( $op['job']['title'] ?? '' );
		}
		if ( ! $has ) {
			$jobs[]       = $op['job'];
			$data['jobs'] = $jobs;
		}
	}
	if ( $pid || $data ) {
		$pid = dwdc_save_contact( $pid, $data );
	}
	foreach ( (array) ( $op['meta'] ?? array() ) as $k => $v ) {
		update_post_meta( $pid, $k, $v );
	}
	if ( ! empty( $op['client'] ) && is_array( $op['client'] ) ) {
		$cid = (int) get_post_meta( $pid, '_dwdc_client', true );
		if ( $cid ) {
			dwdc_save_client( $cid, $op['client'] );
		}
	}
	if ( ! empty( $op['map'] ) ) {
		$map                        = (array) get_option( 'dwds_upwork_map', array() );
		$map[ (string) $op['map'] ] = $pid;
		update_option( 'dwds_upwork_map', $map, false );
	}
	if ( ! empty( $op['task'] ) ) {
		dwdc_add_task( (string) $op['task'], $pid );
	}
	return $pid;
}

add_action( 'rest_api_init', function () {
	$can = function () { return current_user_can( 'manage_options' ); };
	// Queue a project update found by a scan (admin only). Only simple field changes on an existing project.
	register_rest_route( 'dwd/v1', '/crm/pending/add', array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function ( $r ) {
		$d   = (array) $r->get_json_params();
		$pid = (int) ( $d['project'] ?? 0 );
		if ( DWDC_CONTACT !== get_post_type( $pid ) ) {
			return new WP_Error( 'dwdq_nf', 'Project not found', array( 'status' => 404 ) );
		}
		$data = array_intersect_key( (array) ( $d['data'] ?? array() ), array_flip( array( 'markup', 'email', 'person', 'phone', 'website' ) ) );
		$kind = in_array( $d['kind'] ?? '', array( 'email', 'markup', 'update' ), true ) ? $d['kind'] : 'update';
		$op   = array( 'project' => $pid, 'data' => $data );
		if ( ! empty( $d['client'] ) ) {
			$op['client'] = array_intersect_key( (array) $d['client'], array_flip( array( 'email', 'name', 'phone' ) ) );
		}
		return array( 'id' => dwdq_add( array(
			'kind'   => $kind,
			'title'  => sanitize_text_field( (string) ( $d['title'] ?? '' ) ),
			'lines'  => array_map( 'sanitize_text_field', (array) ( $d['lines'] ?? array() ) ),
			'source' => sanitize_text_field( (string) ( $d['source'] ?? 'Email scan' ) ),
			'key'    => sanitize_text_field( (string) ( $d['key'] ?? '' ) ),
			'pid'    => $pid,
			'op'     => $op,
		) ) );
	} ) );
	register_rest_route( 'dwd/v1', '/crm/pending', array(
		array( 'methods' => 'GET', 'permission_callback' => $can, 'callback' => function () {
			return array( 'items' => array_map( function ( $x ) { unset( $x['op'] ); return $x; }, dwdq_all() ) );
		} ),
		array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function ( $r ) {
			$d       = (array) $r->get_json_params();
			$approve = array_map( 'strval', (array) ( $d['approve'] ?? array() ) );
			$dismiss = array_map( 'strval', (array) ( $d['dismiss'] ?? array() ) );
			$keep    = array();
			$done    = array( 'approved' => 0, 'dismissed' => 0, 'errors' => array() );
			foreach ( dwdq_all() as $x ) {
				if ( in_array( $x['id'], $approve, true ) ) {
					$res = dwdq_apply( $x );
					if ( is_wp_error( $res ) ) {
						$done['errors'][] = $x['title'] . ': ' . $res->get_error_message();
					} else {
						$done['approved']++;
					}
				} elseif ( in_array( $x['id'], $dismiss, true ) ) {
					$done['dismissed']++;
				} else {
					$keep[] = $x;
				}
			}
			update_option( 'dwdq_pending', $keep, false );
			$done['left'] = count( $keep );
			return $done;
		} ),
	) );
} );
