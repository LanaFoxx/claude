<?php
/**
 * Patterns & Trends: a weekly read of money coming in and new projects,
 * written as short sentences, with an email when something big changes.
 *
 * @package DWD_Projects
 */

defined( 'ABSPATH' ) || exit;

/** Every dated payment (after Upwork fees), as [ 'Y-m' => total ], plus first-payment month per project. */
function dwdt_monthly() {
	$months = array();
	$first  = array();
	$value  = array();
	foreach ( get_posts( array( 'post_type' => DWDC_CONTACT, 'post_status' => 'private', 'posts_per_page' => -1, 'fields' => 'ids' ) ) as $id ) {
		$pays = get_post_meta( $id, '_dwdc_payments', true );
		if ( ! is_array( $pays ) ) {
			continue;
		}
		foreach ( $pays as $p ) {
			$st = strtolower( (string) ( $p['status'] ?? 'paid' ) );
			if ( in_array( $st, array( 'open', 'void', 'draft', 'failed', 'uncollectible', 'held' ), true ) ) {
				continue;
			}
			$d   = (string) ( $p['date'] ?? '' );
			$amt = (float) preg_replace( '/[^\d.]/', '', (string) ( $p['amount'] ?? 0 ) );
			if ( ! preg_match( '/^\d{4}-\d{2}/', $d ) || $amt <= 0 ) {
				continue;
			}
			$ym            = substr( $d, 0, 7 );
			$sign          = 'refunded' === $st ? -1 : 1;
			$months[ $ym ] = ( $months[ $ym ] ?? 0 ) + $sign * $amt;
			if ( $sign > 0 ) {
				$first[ $id ] = isset( $first[ $id ] ) ? min( $first[ $id ], $d ) : $d;
				$value[ $id ] = ( $value[ $id ] ?? 0 ) + $amt;
			} else {
				$value[ $id ] = ( $value[ $id ] ?? 0 ) - $amt;
			}
		}
	}
	ksort( $months );
	return array( $months, $first, $value );
}

function dwdt_pct( $now, $before ) {
	return $before > 0 ? ( $now - $before ) / $before * 100 : null;
}

function dwdt_money( $n ) {
	return '$' . number_format( round( $n ) );
}

/** Build this week's insights. Each: [ tone up|down|flat|info, text, alert bool ]. */
function dwdt_build() {
	list( $m, $first, $value ) = dwdt_monthly();
	$today = current_time( 'Y-m-d' );
	$ts    = strtotime( $today );
	$sum   = function ( $from, $to ) use ( $m ) { // inclusive Y-m range
		$t = 0;
		foreach ( $m as $ym => $v ) {
			if ( $ym >= $from && $ym <= $to ) {
				$t += $v;
			}
		}
		return $t;
	};
	$ym  = function ( $offset ) use ( $ts ) { return gmdate( 'Y-m', strtotime( gmdate( 'Y-m-01', $ts ) . ' ' . $offset . ' months' ) ); };
	$mn  = function ( $key ) { return gmdate( 'F', strtotime( $key . '-01' ) ); };
	$out = array();
	$add = function ( $pct, $text, $alert_at = 20 ) use ( &$out ) {
		$tone  = null === $pct ? 'info' : ( $pct >= 10 ? 'up' : ( $pct <= -10 ? 'down' : 'flat' ) );
		$out[] = array( 'tone' => $tone, 'text' => $text, 'alert' => null !== $pct && abs( $pct ) >= $alert_at );
	};
	$word = function ( $pct ) { return $pct >= 0 ? 'up ' . round( $pct ) . '%' : 'down ' . round( abs( $pct ) ) . '%'; };

	// 1) Last full month vs the month before.
	$l1 = $ym( '-1' );
	$l2 = $ym( '-2' );
	$a  = $sum( $l1, $l1 );
	$b  = $sum( $l2, $l2 );
	$p  = dwdt_pct( $a, $b );
	if ( null !== $p ) {
		// Neutral on purpose: milestone approvals and Upwork's payout hold move money between months.
		$out[] = array( 'tone' => 'info', 'text' => $mn( $l1 ) . ' brought in ' . dwdt_money( $a ) . ' (' . $mn( $l2 ) . ': ' . dwdt_money( $b ) . '). Single months swing with payout timing, so watch the 3-month and 12-month lines instead.', 'alert' => false );
	}

	// 2) This month so far, paced against the same days last month.
	$day     = (int) gmdate( 'j', $ts );
	$mtd     = 0;
	$lastMtd = 0;
	$cur  = gmdate( 'Y-m', $ts );
	$prev = $l1;
	foreach ( get_posts( array( 'post_type' => DWDC_CONTACT, 'post_status' => 'private', 'posts_per_page' => -1, 'fields' => 'ids' ) ) as $id ) {
		foreach ( (array) get_post_meta( $id, '_dwdc_payments', true ) as $pp ) {
			$st = strtolower( (string) ( $pp['status'] ?? 'paid' ) );
			if ( ! is_array( $pp ) || in_array( $st, array( 'open', 'void', 'draft', 'failed', 'uncollectible', 'held' ), true ) ) {
				continue;
			}
			$d   = (string) ( $pp['date'] ?? '' );
			$amt = (float) preg_replace( '/[^\d.]/', '', (string) ( $pp['amount'] ?? 0 ) ) * ( 'refunded' === $st ? -1 : 1 );
			if ( substr( $d, 0, 7 ) === $cur && (int) substr( $d, 8, 2 ) <= $day ) {
				$mtd += $amt;
			} elseif ( substr( $d, 0, 7 ) === $prev && (int) substr( $d, 8, 2 ) <= $day ) {
				$lastMtd += $amt;
			}
		}
	}

	// 3) Last 3 months vs the 3 before.
	$a = $sum( $ym( '-3' ), $ym( '-1' ) );
	$b = $sum( $ym( '-6' ), $ym( '-4' ) );
	$p = dwdt_pct( $a, $b );
	if ( null !== $p ) {
		$add( $p, 'The last 3 months (' . $mn( $ym( '-3' ) ) . '–' . $mn( $ym( '-1' ) ) . ') brought in ' . dwdt_money( $a ) . ', ' . $word( $p ) . ' from the 3 months before (' . dwdt_money( $b ) . ').' );
	}

	// 4) Year to date (full months) vs the same months last year.
	$y   = (int) gmdate( 'Y', $ts );
	$mon = substr( $l1, 5 );
	$a   = substr( $l1, 0, 4 ) === (string) $y ? $sum( $y . '-01', $l1 ) : 0;
	$b   = $sum( ( $y - 1 ) . '-01', ( $y - 1 ) . '-' . $mon );
	$p   = $a ? dwdt_pct( $a, $b ) : null;
	if ( null !== $p ) {
		$add( $p, $y . ' so far: ' . dwdt_money( $a + $mtd ) . '. Through ' . $mn( $l1 ) . ' you are ' . $word( $p ) . ' versus the same months of ' . ( $y - 1 ) . ' (' . dwdt_money( $b ) . ').' );
	}

	// 5) Long-term: last 12 months vs the 12 before.
	$a = $sum( $ym( '-12' ), $ym( '-1' ) );
	$b = $sum( $ym( '-24' ), $ym( '-13' ) );
	$p = dwdt_pct( $a, $b );
	if ( null !== $p ) {
		$out[] = array( 'tone' => $p >= 10 ? 'up' : ( $p <= -10 ? 'down' : 'flat' ), 'text' => 'Long-term: the last 12 months total ' . dwdt_money( $a ) . ', ' . $word( $p ) . ' from the 12 months before (' . dwdt_money( $b ) . ').' . ( $p <= -10 ? ' This is a real downward trend worth acting on.' : '' ), 'alert' => $p <= -10 || $p >= 20 );
	}

	// 6) Slides: income down several months in a row.
	$streak = 0;
	for ( $i = 1; $i <= 6; $i++ ) {
		if ( $sum( $ym( '-' . $i ), $ym( '-' . $i ) ) < $sum( $ym( '-' . ( $i + 1 ) ), $ym( '-' . ( $i + 1 ) ) ) ) {
			$streak++;
		} else {
			break;
		}
	}
	if ( $streak >= 3 ) {
		$out[] = array( 'tone' => 'down', 'text' => 'Heads up: income has dropped ' . $streak . ' months in a row (since ' . $mn( $ym( '-' . ( $streak + 1 ) ) ) . ').', 'alert' => true );
	}

	// 7) New paying clients: last 90 days vs the 90 before.
	$d90  = gmdate( 'Y-m-d', strtotime( '-90 days', $ts ) );
	$d180 = gmdate( 'Y-m-d', strtotime( '-180 days', $ts ) );
	$n1   = 0;
	$n2   = 0;
	foreach ( $first as $d ) {
		if ( $d > $d90 ) {
			$n1++;
		} elseif ( $d > $d180 ) {
			$n2++;
		}
	}
	$p = dwdt_pct( $n1, $n2 );
	// Small counts swing easily, so only call it up or down when the change is big (30%+).
	$out[] = array( 'tone' => null === $p ? 'info' : ( $p >= 30 ? 'up' : ( $p <= -30 ? 'down' : 'flat' ) ), 'text' => 'New paying projects in the last 90 days: ' . $n1 . ( $n2 ? ', versus ' . $n2 . ' in the 90 days before.' : '.' ), 'alert' => null !== $p && $p <= -40 );

	// 8) Average project value: projects that started paying this year vs last year.
	$avg = function ( $yr ) use ( $first, $value ) {
		$t = 0;
		$n = 0;
		foreach ( $first as $id => $d ) {
			if ( (int) substr( $d, 0, 4 ) === $yr && ( $value[ $id ] ?? 0 ) > 0 ) {
				$t += $value[ $id ];
				$n++;
			}
		}
		return $n ? $t / $n : 0;
	};
	$a = $avg( $y );
	$b = $avg( $y - 1 );
	$p = dwdt_pct( $a, $b );
	if ( $a && null !== $p ) {
		$add( $p, 'Average project this year: ' . dwdt_money( $a ) . ', ' . $word( $p ) . ' from ' . dwdt_money( $b ) . ' in ' . ( $y - 1 ) . '.', 25 );
	}

	// 9) Connects return this year vs last.
	$costs = function_exists( 'dwdc_costs_by_year' ) ? dwdc_costs_by_year() : array();
	$money = function_exists( 'dwdc_money_by_year' ) ? dwdc_money_by_year() : array();
	if ( ! empty( $costs[ $y ]['connects'] ) && ! empty( $costs[ $y - 1 ]['connects'] ) ) {
		$r1 = ( $money[ $y ]['Upwork'] ?? 0 ) / $costs[ $y ]['connects'];
		$r2 = ( $money[ $y - 1 ]['Upwork'] ?? 0 ) / $costs[ $y - 1 ]['connects'];
		$p  = dwdt_pct( $r1, $r2 );
		$add( $p, 'Upwork Connects: every $1 spent this year has brought back $' . round( $r1 ) . ' from Upwork, versus $' . round( $r2 ) . ' last year.', 30 );
	}

	return array( 'generated' => current_time( 'Y-m-d' ), 'items' => $out );
}

/** Cached insights; rebuilt when a week old (or on demand). */
function dwdt_get( $force = false ) {
	$t = get_option( 'dwdt_trends' );
	if ( $force || ! is_array( $t ) || empty( $t['generated'] ) || strtotime( $t['generated'] ) < strtotime( '-7 days', strtotime( current_time( 'Y-m-d' ) ) ) ) {
		$t = dwdt_build();
		update_option( 'dwdt_trends', $t, false );
	}
	return $t;
}

/** Weekly check: rebuild, and email Michael when something significant shows up. */
add_action( 'dwdt_weekly', function () {
	$t      = dwdt_get( true );
	$alerts = array_filter( $t['items'], function ( $x ) { return ! empty( $x['alert'] ); } );
	if ( ! $alerts || ! function_exists( 'dwdp_email_html' ) ) {
		return;
	}
	$rows = '';
	foreach ( $t['items'] as $x ) {
		$mark  = 'up' === $x['tone'] ? '<span style="color:#14A800;font-weight:700">▲</span>' : ( 'down' === $x['tone'] ? '<span style="color:#D63638;font-weight:700">▼</span>' : '<span style="color:#8C9AAE">•</span>' );
		$rows .= '<p style="margin:0 0 12px">' . $mark . ' ' . ( ! empty( $x['alert'] ) ? '<strong>' . esc_html( $x['text'] ) . '</strong>' : esc_html( $x['text'] ) ) . '</p>';
	}
	$html = dwdp_email_html( array(
		'eyebrow' => 'Patterns & Trends',
		'title'   => 'Your weekly money check',
		'intro'   => 'Here’s what changed in your income and projects this week. The bold lines are the big moves.<br><br>' . $rows,
		'buttons' => array( array( 'Open Money Stats', admin_url( 'admin.php?page=client-desk#money' ) ) ),
		'footer'  => 'Dream Desk ·',
	) );
	wp_mail( 'mike@dreamwebdigital.com', 'Patterns & Trends: ' . count( $alerts ) . ' thing' . ( count( $alerts ) === 1 ? '' : 's' ) . ' to know this week', $html, array( 'Content-Type: text/html; charset=UTF-8' ) );
} );

add_action( 'init', function () {
	if ( ! wp_next_scheduled( 'dwdt_weekly' ) ) {
		// Mondays, 8:00 site time.
		$next = strtotime( 'next monday 08:00', current_time( 'timestamp' ) ) - ( (int) get_option( 'gmt_offset' ) * HOUR_IN_SECONDS ); // phpcs:ignore WordPress.DateTime.CurrentTimeTimestamp
		wp_schedule_event( $next, 'weekly', 'dwdt_weekly' );
	}
} );

add_action( 'rest_api_init', function () {
	register_rest_route( 'dwd/v1', '/crm/trends', array( 'methods' => 'POST', 'permission_callback' => function () { return current_user_can( 'manage_options' ); }, 'callback' => function () {
		return dwdt_get( true );
	} ) );
} );
