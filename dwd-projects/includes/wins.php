<?php
/**
 * Jobs won: when each job started, worked out from the evidence Dream Desk has, so Finances can show how
 * many jobs came in per week and per month.
 *
 * Evidence, best first:
 * - the Upwork "hired you" / "contract started" email date (stored on the project's job list);
 * - the first payment of the job: each Upwork contract title is its own job; Stripe, PayPal and other payments
 *   are grouped, and a payment months after the last one starts a new job (deposit + final stay together);
 * - the onboarding form, when nothing earlier exists (it often comes in late);
 * - the date the project was added in Dream Desk, unless it came in with a bulk import.
 * Hosting payments are not jobs.
 */
defined( 'ABSPATH' ) || exit;

function dwdc_wins() {
	$ids = get_posts( array( 'post_type' => DWDC_CONTACT, 'post_status' => 'private', 'posts_per_page' => -1, 'fields' => 'ids' ) );
	// Days on which many projects were created at once are imports, not real start dates.
	$per_day = array();
	foreach ( $ids as $id ) {
		$d             = get_post_time( 'Y-m-d', false, $id );
		$per_day[ $d ] = ( $per_day[ $d ] ?? 0 ) + 1;
	}
	$day   = function ( $s ) { return substr( (string) $s, 0, 10 ); };
	$diff  = function ( $a, $b ) { return (int) round( ( strtotime( $b ) - strtotime( $a ) ) / DAY_IN_SECONDS ); };
	$out   = array();
	$nodate = 0;
	foreach ( $ids as $id ) {
		$list = (string) get_post_meta( $id, '_dwdc_list', true );
		if ( ! in_array( $list, array( 'active', 'hold', 'limbo', 'complete' ), true ) ) {
			continue;
		}
		$name = html_entity_decode( get_the_title( $id ), ENT_QUOTES );
		$jobs = array(); // each: date, how, value, title
		// Payments → jobs.
		$pays = get_post_meta( $id, '_dwdc_payments', true );
		$up   = array();
		$rest = array();
		foreach ( is_array( $pays ) ? $pays : array() as $p ) {
			$st  = strtolower( (string) ( $p['status'] ?? 'paid' ) );
			$amt = (float) preg_replace( '/[^\d.]/', '', (string) ( $p['amount'] ?? 0 ) );
			$d   = $day( $p['date'] ?? '' );
			$txt = (string) ( $p['note'] ?? '' ) . ' ' . (string) ( $p['ref'] ?? '' );
			if ( ! preg_match( '/^\d{4}-\d\d-\d\d$/', $d ) || $amt <= 0 || ( '' !== $st && 'paid' !== $st ) || preg_match( '/hosting|renewal|subscription/i', $txt ) ) {
				continue;
			}
			$src = (string) ( $p['source'] ?? 'Other' );
			if ( 'Upwork' === $src ) {
				$t = trim( preg_replace( '/\s·\s.*$/u', '', (string) ( $p['note'] ?? '' ) ) );
				$k = $t ? strtolower( $t ) : 'upwork';
				if ( ! isset( $up[ $k ] ) || $d < $up[ $k ]['date'] ) {
					$up[ $k ] = array( 'date' => $d, 'how' => 'First Upwork payment', 'value' => ( $up[ $k ]['value'] ?? 0 ) + $amt, 'title' => $t );
				} else {
					$up[ $k ]['value'] += $amt;
				}
			} else {
				$rest[] = array( 'date' => $d, 'amt' => $amt, 'src' => in_array( $src, array( 'Stripe', 'PayPal' ), true ) ? $src : 'payment' );
			}
		}
		$jobs = array_values( $up );
		usort( $rest, function ( $a, $b ) { return strcmp( $a['date'], $b['date'] ); } );
		$cur = null;
		foreach ( $rest as $r ) {
			if ( $cur && ( $diff( $cur['date'], $r['date'] ) <= 120 || $diff( $cur['last'], $r['date'] ) <= 45 ) ) {
				$cur['value'] += $r['amt'];
				$cur['last']   = $r['date'];
				continue;
			}
			if ( $cur ) {
				$jobs[] = $cur;
			}
			$cur = array( 'date' => $r['date'], 'last' => $r['date'], 'how' => 'payment' === $r['src'] ? 'First payment' : 'First ' . $r['src'] . ' payment', 'value' => $r['amt'], 'title' => '' );
		}
		if ( $cur ) {
			$jobs[] = $cur;
		}
		// Upwork hire emails: the real start date of a job.
		foreach ( (array) get_post_meta( $id, '_dwdc_jobs', true ) as $j ) {
			$d = $day( $j['date'] ?? '' );
			if ( ! preg_match( '/^\d{4}-\d\d-\d\d$/', $d ) ) {
				continue;
			}
			$hit = false;
			foreach ( $jobs as &$x ) {
				$same = ! empty( $j['title'] ) && ! empty( $x['title'] ) && strtolower( $j['title'] ) === strtolower( $x['title'] );
				if ( $same || abs( $diff( $d, $x['date'] ) ) <= 45 ) {
					if ( $d <= $x['date'] ) {
						$x['date'] = $d;
						$x['how']  = 'Hired on Upwork';
					}
					$hit = true;
					break;
				}
			}
			unset( $x );
			if ( ! $hit ) {
				$jobs[] = array( 'date' => $d, 'how' => 'Hired on Upwork', 'value' => (float) preg_replace( '/[^\d.]/', '', (string) ( $j['price'] ?? '' ) ), 'title' => (string) ( $j['title'] ?? '' ) );
			}
		}
		// Onboarding form: earlier start for a job it belongs to, or the only sign of a job.
		$entries = get_post_meta( $id, '_dwdc_entries', true );
		foreach ( is_array( $entries ) ? $entries : array() as $e ) {
			if ( false === stripos( (string) ( $e['form'] ?? '' ), 'onboard' ) ) {
				continue;
			}
			$d = $day( $e['date'] ?? '' );
			if ( ! preg_match( '/^\d{4}-\d\d-\d\d$/', $d ) ) {
				continue;
			}
			$hit = false;
			foreach ( $jobs as &$x ) {
				$g = $diff( $x['date'], $d ); // onboarding usually comes after the first payment
				if ( $g >= -30 && $g <= 90 ) {
					if ( $d < $x['date'] ) {
						$x['date'] = $d;
						$x['how']  = 'Onboarding form';
					}
					$hit = true;
					break;
				}
			}
			unset( $x );
			if ( ! $hit ) {
				$jobs[] = array( 'date' => $d, 'how' => 'Onboarding form', 'value' => 0, 'title' => '' );
			}
		}
		if ( ! $jobs ) {
			$made = get_post_time( 'Y-m-d', false, $id );
			if ( ( $per_day[ $made ] ?? 0 ) <= 5 ) {
				$jobs[] = array( 'date' => $made, 'how' => 'Added to Dream Desk', 'value' => 0, 'title' => '' );
			} else {
				$nodate++;
				continue;
			}
		}
		$price = (float) preg_replace( '/[^\d.]/', '', (string) get_post_meta( $id, '_dwdc_price', true ) );
		$job   = (string) get_post_meta( $id, '_dwdc_job', true );
		usort( $jobs, function ( $a, $b ) { return strcmp( $a['date'], $b['date'] ); } );
		$last = count( $jobs ) - 1;
		foreach ( $jobs as $i => $x ) {
			// The project's agreed price is the newest job's value when nothing has been paid on it yet.
			$val   = $x['value'] ? $x['value'] : ( $i === $last ? $price : 0 );
			$out[] = array(
				'id'    => $id,
				'name'  => $name,
				'title' => $x['title'] ? $x['title'] : ( $i === $last ? $job : '' ),
				'date'  => $x['date'],
				'how'   => $x['how'],
				'value' => round( $val, 2 ),
			);
		}
	}
	usort( $out, function ( $a, $b ) { return strcmp( $b['date'], $a['date'] ); } );
	return array( 'list' => $out, 'undated' => $nodate );
}
