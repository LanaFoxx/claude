<?php
/**
 * Refresh on "Pending in Upwork" runs Mike's Upwork check scheduled task (the one bound to his PC, which opens Upwork
 * in his browser and saves the numbers back with dwdSetUpwork). Dream Desk starts it through the task's API trigger:
 * the Fire URL and token from claude.ai/code/routines (task → Edit → Trigger → API → Generate token).
 * The token stays on the server and is never sent to the browser.
 */
defined( 'ABSPATH' ) || exit;

add_action( 'rest_api_init', function () {
	$can = function () { return current_user_can( 'manage_options' ); };
	register_rest_route( 'dwd/v1', '/crm/upwork-fire', array(
		// Is it set up? (never returns the token)
		array( 'methods' => 'GET', 'permission_callback' => $can, 'callback' => function () {
			return array( 'ready' => (bool) ( get_option( 'dwdup_fire_url' ) && get_option( 'dwdup_fire_token' ) ), 'last' => get_option( 'dwdup_fire_last', '' ) );
		} ),
		// Save the Fire URL + token ({url, token}), or run the check (no body).
		array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function ( $r ) {
			$url = trim( (string) $r->get_param( 'url' ) );
			$tok = trim( (string) $r->get_param( 'token' ) );
			if ( '' !== $url || '' !== $tok ) {
				if ( ! preg_match( '#^https://api\.anthropic\.com/v1/claude_code/routines/trig_[A-Za-z0-9]+/fire$#', $url ) || strlen( $tok ) < 20 ) {
					return new WP_Error( 'dwdup', 'Paste the Fire URL (https://api.anthropic.com/v1/claude_code/routines/trig_…/fire) and the token exactly as Claude shows them.', array( 'status' => 400 ) );
				}
				update_option( 'dwdup_fire_url', $url, false );
				update_option( 'dwdup_fire_token', $tok, false );
			}
			$url = (string) get_option( 'dwdup_fire_url', '' );
			$tok = (string) get_option( 'dwdup_fire_token', '' );
			if ( ! $url || ! $tok ) {
				return array( 'setup' => true );
			}
			$res = wp_remote_post( $url, array(
				'timeout' => 20,
				'headers' => array( 'Authorization' => 'Bearer ' . $tok, 'anthropic-beta' => 'experimental-cc-routine-2026-04-01', 'anthropic-version' => '2023-06-01', 'Content-Type' => 'application/json' ),
				'body'    => wp_json_encode( array( 'text' => 'Run now: Michael clicked refresh on "Pending in Upwork" in Dream Desk.' ) ),
			) );
			if ( is_wp_error( $res ) ) {
				return new WP_Error( 'dwdup', 'Could not reach Claude to start the Upwork check. Try again in a minute.', array( 'status' => 502 ) );
			}
			$code = (int) wp_remote_retrieve_response_code( $res );
			if ( $code >= 300 ) {
				$j = json_decode( wp_remote_retrieve_body( $res ), true );
				return new WP_Error( 'dwdup', 'Claude did not start the Upwork check (' . $code . ( ! empty( $j['error']['message'] ) ? ': ' . $j['error']['message'] : '' ) . '). If the token was regenerated, paste the new one.', array( 'status' => 400, 'setup' => in_array( $code, array( 401, 403, 404 ), true ) ) );
			}
			update_option( 'dwdup_fire_last', current_time( 'mysql' ), false );
			return array( 'started' => true );
		} ),
	) );
} );
