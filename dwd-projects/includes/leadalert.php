<?php
/**
 * New-lead alarm. Every quote/contact form lead is flagged; Dream Desk pops up a window for it (on every page load
 * and every minute while open) until Mike clicks "I've reviewed this quote and contacted the customer".
 * Also records why an email failed to send (wp_mail_failed), so a missing lead email can be explained.
 */
defined( 'ABSPATH' ) || exit;

function dwdla_flag( $cid, $mailed = null ) {
	$cid = (int) $cid;
	if ( ! $cid || get_post_meta( $cid, '_dwdc_lead_ack', true ) ) {
		return;
	}
	update_post_meta( $cid, '_dwdc_lead_new', current_time( 'mysql' ) );
	if ( null !== $mailed ) {
		update_post_meta( $cid, '_dwdc_lead_mail', $mailed ? 'sent' : 'failed' );
	}
}

/** Leads waiting for Mike's confirmation, newest first, with what they sent. */
function dwdla_list() {
	$out = array();
	foreach ( get_posts( array( 'post_type' => DWDC_CONTACT, 'post_status' => 'any', 'numberposts' => 20, 'fields' => 'ids', 'meta_key' => '_dwdc_lead_new', 'orderby' => 'date', 'order' => 'DESC' ) ) as $id ) {
		if ( get_post_meta( $id, '_dwdc_lead_ack', true ) || 'trash' === get_post_status( $id ) ) {
			continue;
		}
		$entries = (array) get_post_meta( $id, '_dwdc_entries', true );
		$last    = $entries ? end( $entries ) : array();
		$answers = array();
		foreach ( (array) ( $last['fields'] ?? array() ) as $f ) {
			if ( is_array( $f ) && '' !== trim( (string) ( $f['value'] ?? '' ) ) ) {
				$answers[] = array( (string) ( $f['label'] ?? $f['id'] ?? '' ), mb_substr( (string) $f['value'], 0, 800 ) );
			}
		}
		$out[] = array(
			'id'      => (int) $id,
			'name'    => html_entity_decode( get_the_title( $id ), ENT_QUOTES, 'UTF-8' ),
			'company' => (string) get_post_meta( $id, '_dwdc_company', true ),
			'email'   => (string) get_post_meta( $id, '_dwdc_email', true ),
			'phone'   => (string) get_post_meta( $id, '_dwdc_phone', true ),
			'website' => (string) get_post_meta( $id, '_dwdc_website', true ),
			'source'  => (string) get_post_meta( $id, '_dwdc_source', true ),
			'form'    => (string) ( $last['form'] ?? '' ),
			'when'    => ! empty( $last['date'] ) ? get_date_from_gmt( (string) $last['date'] ) : (string) get_post_meta( $id, '_dwdc_lead_new', true ), // when they sent the form (site time)
			'mail'    => (string) get_post_meta( $id, '_dwdc_lead_mail', true ),
			'answers' => $answers,
		);
	}
	return $out;
}

// Why an email failed (kept: the last 20).
add_action( 'wp_mail_failed', function ( $err ) {
	$log   = (array) get_option( 'dwdla_mail_errors', array() );
	$data  = is_wp_error( $err ) ? (array) $err->get_error_data() : array();
	$log[] = array( 'at' => current_time( 'mysql' ), 'error' => is_wp_error( $err ) ? $err->get_error_message() : 'unknown', 'to' => implode( ', ', (array) ( $data['to'] ?? array() ) ), 'subject' => (string) ( $data['subject'] ?? '' ) );
	update_option( 'dwdla_mail_errors', array_slice( $log, -20 ), false );
} );

add_action( 'rest_api_init', function () {
	$can = function () { return current_user_can( 'manage_options' ); };
	register_rest_route( 'dwd/v1', '/crm/new-leads', array( 'methods' => 'GET', 'permission_callback' => $can, 'callback' => function () {
		return array( 'leads' => dwdla_list(), 'mail_errors' => array_slice( (array) get_option( 'dwdla_mail_errors', array() ), -5 ) );
	} ) );
	// Mike confirms he reviewed the quote and contacted the customer.
	register_rest_route( 'dwd/v1', '/crm/new-leads/(?P<id>\d+)/ack', array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function ( $r ) {
		$id = (int) $r['id'];
		update_post_meta( $id, '_dwdc_lead_ack', current_time( 'mysql' ) );
		$notes   = (array) get_post_meta( $id, '_dwdc_notes', true );
		$notes[] = array( 'date' => current_time( 'mysql', true ), 'text' => 'Quote reviewed and customer contacted (confirmed in Dream Desk).' );
		update_post_meta( $id, '_dwdc_notes', array_values( array_filter( $notes ) ) );
		return array( 'leads' => dwdla_list() );
	} ) );
} );

// Once: website-form leads from the last 3 days that came in before this alarm existed (e.g. Susan Stafford, Nov 22).
add_action( 'init', function () {
	if ( get_option( 'dwdla_seeded' ) ) {
		return;
	}
	update_option( 'dwdla_seeded', 1, false );
	$since = gmdate( 'Y-m-d H:i:s', time() - 3 * DAY_IN_SECONDS );
	foreach ( get_posts( array( 'post_type' => DWDC_CONTACT, 'post_status' => 'private', 'numberposts' => 50, 'fields' => 'ids', 'meta_key' => '_dwdc_list', 'meta_value' => 'leads', 'date_query' => array( array( 'after' => $since, 'column' => 'post_date_gmt' ) ) ) ) as $id ) { // phpcs:ignore
		$entries = (array) get_post_meta( $id, '_dwdc_entries', true );
		$last    = $entries ? end( $entries ) : array();
		if ( preg_match( '/quote|contact/i', (string) ( $last['form'] ?? '' ) ) ) {
			dwdla_flag( $id );
		}
	}
}, 40 );
