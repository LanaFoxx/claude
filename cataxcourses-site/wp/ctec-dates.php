/**
 * CTC CTEC dates (Code Snippets, scope: global). The yearly CTEC renewal dates and the gold notice bar under the header.
 *
 *  - Renewal deadline: October 31; when it falls on a Saturday or Sunday it moves to the following Monday.
 *  - Late renewal (with the late fee): the day after the deadline through January 15 of the next year.
 *  - Notice: "deadline is ..." from August 15 until the deadline, then "late renewals through January 15", then hidden
 *    until the next August 15. Recomputed every year; nothing to update by hand.
 *
 * Header: [ctc_ctec_notice] (desktop wording) and [ctc_ctec_notice size="short"] (phones).
 */
function ctc_ctec_tz() { return new DateTimeZone( 'America/Los_Angeles' ); }
function ctc_ctec_deadline( $year ) {
	$d = new DateTime( $year . '-10-31', ctc_ctec_tz() );
	$w = (int) $d->format( 'N' ); // 6 = Saturday, 7 = Sunday
	if ( $w >= 6 ) $d->modify( '+' . ( 8 - $w ) . ' days' );
	return $d;
}
function ctc_ctec_late_end( $year ) { return new DateTime( ( $year + 1 ) . '-01-15', ctc_ctec_tz() ); }
/** Current phase: ['phase' => 'upcoming'|'late'|'', 'year' => renewal year, 'deadline' => DateTime, 'late_end' => DateTime]. */
function ctc_ctec_phase( $now = null ) {
	$now  = $now ?: new DateTime( 'now', ctc_ctec_tz() );
	$day  = $now->format( 'Y-m-d' );
	$y    = (int) $now->format( 'Y' );
	if ( $now->format( 'm-d' ) <= '01-15' ) $y--; // January 1-15 belongs to last year's late period
	$dl   = ctc_ctec_deadline( $y );
	$end  = ctc_ctec_late_end( $y );
	$out  = array( 'phase' => '', 'year' => $y, 'deadline' => $dl, 'late_end' => $end );
	if ( $day >= $y . '-08-15' && $day <= $dl->format( 'Y-m-d' ) ) $out['phase'] = 'upcoming';
	elseif ( $day > $dl->format( 'Y-m-d' ) && $day <= $end->format( 'Y-m-d' ) ) $out['phase'] = 'late';
	return $out;
}
add_shortcode( 'ctc_ctec_notice', function ( $atts ) {
	$a   = shortcode_atts( array( 'size' => 'long' ), $atts );
	$p   = ctc_ctec_phase();
	$url = home_url( '/product/ctec-20-hours-renewal-course/' );
	if ( ! $p['phase'] ) return '<style>.ctc-notice{display:none!important}</style>'; // off season: no bar
	$dl     = $p['deadline'];
	$moved  = '10-31' !== $dl->format( 'm-d' );
	$short  = 'short' === $a['size'];
	$end    = $p['late_end'];
	if ( 'upcoming' === $p['phase'] ) {
		$t = $short
			? '<strong>CTEC renewal deadline: ' . $dl->format( 'D, M j, Y' ) . '.</strong> Late renewals through ' . $end->format( 'M j, Y' ) . ' (late fee). <a href="' . esc_url( $url ) . '"><strong>Renew →</strong></a>'
			: '<strong>CTEC renewal deadline' . ( $moved ? ' extended to ' : ' is ' ) . $dl->format( 'l, F j, Y' ) . '</strong>' . ( $moved ? ' (October 31 falls on a ' . ( new DateTime( $p['year'] . '-10-31', ctc_ctec_tz() ) )->format( 'l' ) . ')' : '' ) . '. Late renewals accepted through ' . $end->format( 'F j, Y' ) . ' with the late fee. <a href="' . esc_url( $url ) . '"><strong>Renew now →</strong></a>';
	} else {
		$t = $short
			? '<strong>Late CTEC renewal open until ' . $end->format( 'M j, Y' ) . '</strong> (late fee). <a href="' . esc_url( $url ) . '"><strong>Renew →</strong></a>'
			: '<strong>The CTEC renewal deadline has passed. Late renewals are accepted through ' . $end->format( 'l, F j, Y' ) . '</strong> with the late fee. After that your registration lapses. <a href="' . esc_url( $url ) . '"><strong>Renew now →</strong></a>';
	}
	return '<span class="ctc-ntc">' . $t . '</span>';
} );
