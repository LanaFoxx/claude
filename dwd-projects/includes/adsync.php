<?php
/**
 * Advertising numbers for Dream Desk: Google Ads (sent here by a small Google Ads Script that runs inside the
 * Ads account, so no Google Ads API developer token is needed) and Upwork Connects spending (from the Upwork
 * transactions file).
 *
 * The script posts daily totals for the last ~75 days plus this month's campaigns to /dwd/v1/ads-sync with the
 * X-DWD-Token header. Nothing in Google Ads is ever changed: the script only reads reports.
 */
defined( 'ABSPATH' ) || exit;

function dwdads_token() {
	$t = (string) get_option( 'dwdads_token', '' );
	if ( '' === $t ) {
		$t = wp_generate_password( 40, false );
		update_option( 'dwdads_token', $t, false );
	}
	return $t;
}

/** The Google Ads Script Mike pastes into Google Ads → Tools → Bulk actions → Scripts. */
function dwdads_script() {
	$url = rest_url( 'dwd/v1/ads-sync' );
	$tok = dwdads_token();
	return <<<JS
// Dream Desk · Google Ads report. Read-only: it sends spend, clicks, impressions and conversions
// to Dream Desk and never changes anything in your account. Schedule it to run Hourly.
var DREAM_DESK = '{$url}';
var TOKEN = '{$tok}';

function main() {
  var acct = AdsApp.currentAccount(), tz = acct.getTimeZone();
  var fmt = function (d) { return Utilities.formatDate(d, tz, 'yyyy-MM-dd'); };
  var end = new Date(), start = new Date(end.getTime() - 75 * 864e5);
  var days = [], camps = [], r, it;
  it = AdsApp.search("SELECT segments.date, metrics.cost_micros, metrics.clicks, metrics.impressions, metrics.conversions FROM customer WHERE segments.date BETWEEN '" + fmt(start) + "' AND '" + fmt(end) + "'");
  while (it.hasNext()) { r = it.next(); days.push({ d: r.segments.date, cost: Number(r.metrics.costMicros || 0) / 1e6, clicks: Number(r.metrics.clicks || 0), impr: Number(r.metrics.impressions || 0), conv: Number(r.metrics.conversions || 0) }); }
  it = AdsApp.search("SELECT campaign.name, campaign.status, campaign_budget.amount_micros, metrics.cost_micros, metrics.clicks, metrics.impressions, metrics.conversions FROM campaign WHERE campaign.status != 'REMOVED' AND segments.date DURING THIS_MONTH");
  while (it.hasNext()) { r = it.next(); camps.push({ name: r.campaign.name, status: r.campaign.status, budget: Number((r.campaignBudget && r.campaignBudget.amountMicros) || 0) / 1e6, cost: Number(r.metrics.costMicros || 0) / 1e6, clicks: Number(r.metrics.clicks || 0), impr: Number(r.metrics.impressions || 0), conv: Number(r.metrics.conversions || 0) }); }
  var res = UrlFetchApp.fetch(DREAM_DESK, { method: 'post', contentType: 'application/json', headers: { 'X-DWD-Token': TOKEN }, payload: JSON.stringify({ account: acct.getName(), cid: acct.getCustomerId(), tz: tz, days: days, campaigns: camps }), muteHttpExceptions: true });
  Logger.log(res.getResponseCode() + ' ' + res.getContentText().slice(0, 500));
}
JS;
}

add_action( 'rest_api_init', function () {
	register_rest_route( 'dwd/v1', '/ads-sync', array(
		'methods'             => 'POST',
		'permission_callback' => function ( $r ) {
			$t = (string) $r->get_header( 'x_dwd_token' );
			return '' !== $t && hash_equals( dwdads_token(), $t );
		},
		'callback'            => function ( $r ) {
			$d    = (array) $r->get_json_params();
			$days = array();
			foreach ( array_slice( (array) ( $d['days'] ?? array() ), 0, 400 ) as $x ) {
				$k = substr( sanitize_text_field( (string) ( $x['d'] ?? '' ) ), 0, 10 );
				if ( preg_match( '/^\d{4}-\d\d-\d\d$/', $k ) ) {
					$days[ $k ] = array( 'cost' => round( (float) ( $x['cost'] ?? 0 ), 2 ), 'clicks' => (int) ( $x['clicks'] ?? 0 ), 'impr' => (int) ( $x['impr'] ?? 0 ), 'conv' => round( (float) ( $x['conv'] ?? 0 ), 2 ) );
				}
			}
			$camps = array();
			foreach ( array_slice( (array) ( $d['campaigns'] ?? array() ), 0, 100 ) as $c ) {
				$camps[] = array(
					'name'   => sanitize_text_field( (string) ( $c['name'] ?? '' ) ),
					'status' => sanitize_text_field( (string) ( $c['status'] ?? '' ) ),
					'budget' => round( (float) ( $c['budget'] ?? 0 ), 2 ),
					'cost'   => round( (float) ( $c['cost'] ?? 0 ), 2 ),
					'clicks' => (int) ( $c['clicks'] ?? 0 ),
					'impr'   => (int) ( $c['impr'] ?? 0 ),
					'conv'   => round( (float) ( $c['conv'] ?? 0 ), 2 ),
				);
			}
			// Keep older days from earlier runs too (the script only sends the last 75).
			$old = get_option( 'dwdads_data', array() );
			$all = array_merge( is_array( $old['days'] ?? null ) ? $old['days'] : array(), $days );
			ksort( $all );
			update_option( 'dwdads_data', array(
				'at'        => current_time( 'mysql' ),
				'account'   => sanitize_text_field( (string) ( $d['account'] ?? '' ) ),
				'cid'       => sanitize_text_field( (string) ( $d['cid'] ?? '' ) ),
				'days'      => array_slice( $all, -800, null, true ),
				'campaigns' => $camps,
			), false );
			return array( 'ok' => true, 'days' => count( $days ), 'campaigns' => count( $camps ) );
		},
	) );
	register_rest_route( 'dwd/v1', '/crm/ads-script', array(
		'methods'             => 'GET',
		'permission_callback' => function () { return current_user_can( 'manage_options' ); },
		'callback'            => function () { return array( 'script' => dwdads_script() ); },
	) );
} );

/** Totals for the Advertising box: Google Ads by period, campaigns, ad leads, and Connects by week/month. */
function dwdads_summary() {
	$today = wp_date( 'Y-m-d', null, new DateTimeZone( 'America/New_York' ) ); // Mike's day (the server runs on UTC)
	$ts    = strtotime( $today );
	$wk0   = gmdate( 'Y-m-d', $ts - ( (int) gmdate( 'N', $ts ) - 1 ) * DAY_IN_SECONDS ); // Monday
	$wk1   = gmdate( 'Y-m-d', strtotime( $wk0 ) - 7 * DAY_IN_SECONDS );
	$mo0   = substr( $today, 0, 7 ) . '-01';
	$mo1   = gmdate( 'Y-m-01', strtotime( $mo0 ) - DAY_IN_SECONDS );
	$ranges = array(
		'today'     => array( $today, $today ),
		'week'      => array( $wk0, $today ),
		'lastweek'  => array( $wk1, gmdate( 'Y-m-d', strtotime( $wk0 ) - DAY_IN_SECONDS ) ),
		'month'     => array( $mo0, $today ),
		'lastmonth' => array( $mo1, gmdate( 'Y-m-d', strtotime( $mo0 ) - DAY_IN_SECONDS ) ),
		'last30'    => array( gmdate( 'Y-m-d', $ts - 29 * DAY_IN_SECONDS ), $today ),
	);
	$data = get_option( 'dwdads_data', array() );
	$g    = null;
	if ( ! empty( $data['at'] ) ) {
		$g = array( 'at' => $data['at'], 'account' => $data['account'] ?? '', 'campaigns' => $data['campaigns'] ?? array() );
		foreach ( $ranges as $k => $r ) {
			$t = array( 'cost' => 0, 'clicks' => 0, 'impr' => 0, 'conv' => 0 );
			foreach ( (array) ( $data['days'] ?? array() ) as $d => $x ) {
				if ( $d >= $r[0] && $d <= $r[1] ) {
					foreach ( $t as $f => $v ) {
						$t[ $f ] += (float) ( $x[ $f ] ?? 0 );
					}
				}
			}
			$t['from'] = $r[0];
			$t['to']   = $r[1];
			$g[ $k ]   = $t;
		}
		// Day by day, today and the 6 days before.
		$g['daily'] = array();
		for ( $i = 0; $i < 7; $i++ ) {
			$d             = gmdate( 'Y-m-d', $ts - $i * DAY_IN_SECONDS );
			$x             = (array) ( $data['days'][ $d ] ?? array() );
			$g['daily'][]  = array( 'date' => $d, 'cost' => (float) ( $x['cost'] ?? 0 ), 'clicks' => (float) ( $x['clicks'] ?? 0 ), 'impr' => (float) ( $x['impr'] ?? 0 ), 'conv' => (float) ( $x['conv'] ?? 0 ) );
		}
	}
	// Leads that came from an ad click this month and last (filed by the site's forms).
	$leads = array( 'month' => 0, 'lastmonth' => 0 );
	foreach ( get_posts( array( 'post_type' => DWDC_CONTACT, 'post_status' => 'private', 'posts_per_page' => -1, 'fields' => 'ids', 'meta_key' => '_dwdc_lead_source', 'meta_value' => 'Google Ads' ) ) as $id ) { // phpcs:ignore
		$d = get_post_time( 'Y-m-d', false, $id );
		if ( $d >= $mo0 ) {
			$leads['month']++;
		} elseif ( $d >= $mo1 ) {
			$leads['lastmonth']++;
		}
	}
	// Upwork Connects by week and month (membership fees left out).
	$conn = array( 'week' => 0, 'lastweek' => 0, 'month' => 0, 'lastmonth' => 0, 'qweek' => 0, 'qmonth' => 0, 'last' => '' );
	foreach ( (array) get_option( 'dwdc_upwork_costs', array() ) as $x ) {
		$d = substr( (string) ( $x['date'] ?? '' ), 0, 10 );
		if ( 'membership' === ( $x['type'] ?? '' ) || ! preg_match( '/^\d{4}-\d\d-\d\d$/', $d ) ) {
			continue;
		}
		$a = (float) ( $x['amount'] ?? 0 );
		$q = (int) ( $x['qty'] ?? 0 );
		$conn['last'] = max( $conn['last'], $d );
		foreach ( array( 'week', 'lastweek', 'month', 'lastmonth' ) as $k ) {
			if ( $d >= $ranges[ $k ][0] && $d <= $ranges[ $k ][1] ) {
				$conn[ $k ] += $a;
				if ( 'week' === $k ) {
					$conn['qweek'] += $q;
				} elseif ( 'month' === $k ) {
					$conn['qmonth'] += $q;
				}
			}
		}
	}
	return array( 'google' => $g, 'leads' => $leads, 'connects' => $conn, 'week' => $ranges['week'], 'lastweek' => $ranges['lastweek'] );
}
