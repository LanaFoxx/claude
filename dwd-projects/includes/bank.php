<?php
/**
 * Personal bank data (Bank of America CSV downloads): spending by category, monthly trends,
 * recurring charges / subscriptions. Private option, never autoloaded, admin-only REST.
 */
defined( 'ABSPATH' ) || exit;

function dwdbk_get() {
	$d = get_option( 'dwdbk_data', array() );
	$d = is_array( $d ) ? $d : array();
	return array(
		'tx'    => isset( $d['tx'] ) && is_array( $d['tx'] ) ? $d['tx'] : array(),
		'files' => isset( $d['files'] ) && is_array( $d['files'] ) ? $d['files'] : array(),
		'subs'  => isset( $d['subs'] ) && is_array( $d['subs'] ) ? $d['subs'] : array(), // merchant => keep|cancel|ignore
		'cats'  => isset( $d['cats'] ) && is_array( $d['cats'] ) ? $d['cats'] : array(), // merchant => category override
	);
}
function dwdbk_put( $d ) {
	update_option( 'dwdbk_data', $d, false );
}

/** "AMAZON MKTPL*2K4 AMZN.COM/BILL WA" → "AMAZON MKTPL" */
function dwdbk_merchant( $desc ) {
	$s = strtoupper( (string) $desc );
	$s = preg_replace( '/^(PURCHASE|POS|CHECKCARD|CHECK CARD|DEBIT CARD|RECURRING|PREAUTHORIZED|ONLINE|MOBILE)\s+(PURCHASE\s+)?(\d{4}\s+)?/', '', $s );
	$s = preg_replace( '/\b(DES:|ID:|INDN:|CO ID:|PPD|WEB|CCD).*$/', '', $s );
	$s = preg_replace( '/[*#].*$/', '', $s );
	$s = preg_replace( '/\b\d[\d\-\/]*\b/', ' ', $s );
	$s = preg_replace( '/\b(WWW\.|\.COM|HTTPS?)\b/', ' ', $s );
	$s = preg_replace( '/\s+[A-Z]{2}$/', '', trim( preg_replace( '/[^A-Z&\' ]+/', ' ', $s ) ) );
	$w = array_slice( preg_split( '/\s+/', trim( $s ) ), 0, 3 );
	$m = trim( implode( ' ', $w ) );
	return '' !== $m ? $m : strtoupper( substr( trim( (string) $desc ), 0, 24 ) );
}

function dwdbk_category( $desc, $amount ) {
	$d = strtoupper( (string) $desc );
	if ( $amount > 0 ) {
		if ( preg_match( '/UPWORK|STRIPE|PAYPAL TRANSFER|PAYROLL|DIRECT DEP|DEPOSIT|ZELLE.*FROM|INTEREST|REFUND/', $d ) ) {
			return preg_match( '/REFUND/', $d ) ? 'Refunds' : 'Income';
		}
		return 'Money in';
	}
	$map = array(
		'Transfers'      => 'ZELLE|VENMO|CASH APP|TRANSFER|ONLINE BANKING TRANSFER|PAYMENT - THANK|CRD PMT|CREDIT CARD PAYMENT|AUTOPAY PAYMENT',
		'Subscriptions'  => 'NETFLIX|SPOTIFY|HULU|DISNEY|YOUTUBE|APPLE\.COM|ITUNES|GOOGLE \*|ADOBE|CANVA|CHATGPT|OPENAI|ANTHROPIC|CLAUDE|PATREON|AUDIBLE|PRIME VIDEO|AMAZON PRIME|PARAMOUNT|PEACOCK|MAX\.COM|HBO|DROPBOX|ICLOUD|MICROSOFT|NOTION|ZOOM|CLICKUP|FIGMA|ELEMENTOR|SHUTTERSTOCK|ENVATO|SIRIUS|NYTIMES|MEDIUM',
		'Groceries'      => 'PUBLIX|KROGER|WALMART|WAL-MART|TARGET|ALDI|TRADER JOE|WHOLE FOODS|HARRIS TEETER|FOOD LION|LIDL|COSTCO|SAM\'S|INSTACART|SPROUTS|WEGMANS',
		'Dining'         => 'RESTAURANT|STARBUCKS|DUNKIN|MCDONALD|CHICK-FIL|CHIPOTLE|TACO|BURGER|PIZZA|DOORDASH|UBER EATS|GRUBHUB|CAFE|COFFEE|WENDY|SUBWAY|PANERA|BAR & GRILL|SUSHI|DINER|KITCHEN',
		'Gas & Car'      => 'SHELL|EXXON|CHEVRON|BP |SUNOCO|CIRCLE K|QT |QUIKTRIP|WAWA|MARATHON|SPEEDWAY|7-ELEVEN|RACETRAC|AUTOZONE|JIFFY|CAR WASH|PARKING|TOLL|GEICO|PROGRESSIVE|STATE FARM',
		'Travel'         => 'AIRLINE|DELTA|AMERICAN AIR|SOUTHWEST|FRONTIER|SPIRIT|UNITED|JETBLUE|AIRBNB|HOTEL|MARRIOTT|HILTON|EXPEDIA|BOOKING\.COM|UBER|LYFT|HERTZ|ENTERPRISE|AVIS',
		'Shopping'       => 'AMAZON|AMZN|EBAY|ETSY|BEST BUY|HOME DEPOT|LOWE|IKEA|TJ MAXX|MARSHALLS|ROSS|NIKE|APPLE STORE|SHEIN|TEMU',
		'Bills & Utilities' => 'DUKE ENERGY|POWER|ELECTRIC|WATER|GAS CO|SPECTRUM|COMCAST|XFINITY|AT&T|VERIZON|T-MOBILE|INTERNET|RENT|MORTGAGE|INSURANCE|HOA',
		'Health'         => 'PHARMACY|CVS|WALGREENS|DOCTOR|DENTAL|MEDICAL|HOSPITAL|CLINIC|GYM|FITNESS|PLANET FITNESS|VET|PETCO|PETSMART|CHEWY',
		'Business'       => 'GODADDY|NAMECHEAP|SITEGROUND|HOSTINGER|CLOUDFLARE|GOOGLE WORKSPACE|GSUITE|UPWORK|WIX|SQUARESPACE|WEBFLOW|MAILCHIMP',
		'Fees'           => 'FEE|INTEREST CHARGE|OVERDRAFT|ATM',
		'Cash'           => 'ATM WITHDRAWAL|CASH WITHDRAWAL',
	);
	foreach ( $map as $cat => $re ) {
		if ( preg_match( '/' . $re . '/', $d ) ) {
			return $cat;
		}
	}
	return 'Other';
}

/** Parse a Bank of America CSV (checking/savings or credit card). Returns list of transactions. */
function dwdbk_parse( $csv, $acct ) {
	$rows = array_map( 'str_getcsv', preg_split( '/\r\n|\n|\r/', trim( (string) $csv ) ) );
	$head = -1;
	$cols = array();
	foreach ( $rows as $i => $r ) {
		$low = array_map( function ( $x ) { return strtolower( trim( (string) $x ) ); }, $r );
		$di  = array_search( 'date', $low, true );
		if ( false === $di ) {
			$di = array_search( 'posted date', $low, true );
		}
		$ai = array_search( 'amount', $low, true );
		if ( false !== $di && false !== $ai ) {
			$head = $i;
			$ds   = array_search( 'description', $low, true );
			if ( false === $ds ) {
				$ds = array_search( 'payee', $low, true );
			}
			$cols = array( 'date' => $di, 'desc' => $ds, 'amount' => $ai );
			break;
		}
	}
	if ( $head < 0 || false === $cols['desc'] ) {
		return new WP_Error( 'dwdbk_csv', 'That doesn’t look like a Bank of America transactions file. Download it as “Microsoft Excel (.csv)”.' );
	}
	$out = array();
	foreach ( array_slice( $rows, $head + 1 ) as $r ) {
		$date = trim( (string) ( $r[ $cols['date'] ] ?? '' ) );
		$desc = trim( (string) ( $r[ $cols['desc'] ] ?? '' ) );
		$amt  = str_replace( array( ',', '$', '"' ), '', (string) ( $r[ $cols['amount'] ] ?? '' ) );
		if ( '' === $date || '' === $amt || ! is_numeric( $amt ) || preg_match( '/^beginning balance|^ending balance/i', $desc ) ) {
			continue;
		}
		$ts = strtotime( $date );
		if ( ! $ts ) {
			continue;
		}
		$day   = gmdate( 'Y-m-d', $ts );
		$a     = round( (float) $amt, 2 );
		$out[] = array(
			'id'   => substr( md5( $acct . '|' . $day . '|' . $desc . '|' . $a ), 0, 16 ),
			'date' => $day,
			'desc' => mb_substr( sanitize_text_field( $desc ), 0, 160 ),
			'amt'  => $a,
			'm'    => dwdbk_merchant( $desc ),
			'cat'  => dwdbk_category( $desc, $a ),
			'acct' => $acct,
		);
	}
	return $out;
}

/** Repeating charges: same merchant, regular spacing, similar amounts. */
function dwdbk_recurring( $tx, $flags ) {
	$by = array();
	foreach ( $tx as $t ) {
		if ( $t['amt'] < 0 && 'Transfers' !== $t['cat'] ) {
			$by[ $t['m'] ][] = $t;
		}
	}
	$out = array();
	foreach ( $by as $m => $list ) {
		if ( count( $list ) < 2 ) {
			continue;
		}
		usort( $list, function ( $a, $b ) { return strcmp( $a['date'], $b['date'] ); } );
		$gaps = array();
		for ( $i = 1; $i < count( $list ); $i++ ) {
			$gaps[] = ( strtotime( $list[ $i ]['date'] ) - strtotime( $list[ $i - 1 ]['date'] ) ) / DAY_IN_SECONDS;
		}
		sort( $gaps );
		$med = $gaps[ (int) floor( count( $gaps ) / 2 ) ];
		$cycle = '';
		foreach ( array( 'weekly' => array( 6, 8 ), 'every 2 weeks' => array( 13, 16 ), 'monthly' => array( 26, 35 ), 'every 3 months' => array( 85, 97 ), 'yearly' => array( 355, 375 ) ) as $name => $rng ) {
			if ( $med >= $rng[0] && $med <= $rng[1] ) {
				$cycle = $name;
			}
		}
		if ( ! $cycle || ( count( $list ) < 3 && ! in_array( $cycle, array( 'monthly', 'yearly', 'every 3 months' ), true ) ) ) {
			continue;
		}
		$amts = array_map( function ( $t ) { return -$t['amt']; }, $list );
		$last = end( $list );
		$avg  = array_sum( $amts ) / count( $amts );
		$spread = ( max( $amts ) - min( $amts ) ) / max( 1, $avg );
		if ( $spread > 0.35 && 'Subscriptions' !== $last['cat'] ) {
			continue; // amounts too different to be a subscription (e.g. groceries)
		}
		$prev = count( $amts ) > 1 ? $amts[ count( $amts ) - 2 ] : $amts[0];
		$step = array( 'weekly' => 7, 'every 2 weeks' => 14, 'monthly' => 30, 'every 3 months' => 91, 'yearly' => 365 )[ $cycle ];
		$next = gmdate( 'Y-m-d', strtotime( $last['date'] ) + $step * DAY_IN_SECONDS );
		$per_mo = -$last['amt'] * ( 30.4 / $step );
		$out[] = array(
			'merchant'  => $m,
			'name'      => ucwords( strtolower( $m ) ),
			'cycle'     => $cycle,
			'amount'    => -$last['amt'],
			'monthly'   => round( $per_mo, 2 ),
			'yearly'    => round( $per_mo * 12, 2 ),
			'count'     => count( $list ),
			'first'     => $list[0]['date'],
			'last'      => $last['date'],
			'next'      => $next,
			'stopped'   => strtotime( $next ) < time() - 20 * DAY_IN_SECONDS,
			'raised'    => -$last['amt'] > $prev * 1.02 ? round( -$last['amt'] - $prev, 2 ) : 0,
			'cat'       => $last['cat'],
			'status'    => $flags[ $m ] ?? '',
			'scope'     => (string) ( ( (array) get_option( 'dwdbk_scopes', array() ) )[ $m ] ?? '' ), // business | personal | '' (unlabeled)
			'prev'      => round( $prev, 2 ),
		);
	}
	usort( $out, function ( $a, $b ) { return $b['monthly'] <=> $a['monthly']; } );
	return $out;
}

function dwdbk_summary( $limit_tx = 400 ) {
	$d  = dwdbk_get();
	$tx = $d['tx'];
	foreach ( $tx as &$t ) {
		if ( isset( $d['cats'][ $t['m'] ] ) ) {
			$t['cat'] = $d['cats'][ $t['m'] ];
		}
	}
	unset( $t );
	usort( $tx, function ( $a, $b ) { return strcmp( $b['date'], $a['date'] ); } );
	$months = array();
	foreach ( $tx as $t ) {
		$ym = substr( $t['date'], 0, 7 );
		if ( ! isset( $months[ $ym ] ) ) {
			$months[ $ym ] = array( 'in' => 0, 'out' => 0, 'cats' => array() );
		}
		if ( 'Transfers' === $t['cat'] ) {
			continue;
		}
		if ( $t['amt'] > 0 ) {
			$months[ $ym ]['in'] += $t['amt'];
		} else {
			$months[ $ym ]['out'] += -$t['amt'];
			$months[ $ym ]['cats'][ $t['cat'] ] = round( ( $months[ $ym ]['cats'][ $t['cat'] ] ?? 0 ) - $t['amt'], 2 );
		}
	}
	foreach ( $months as &$mo ) {
		$mo['in']  = round( $mo['in'], 2 );
		$mo['out'] = round( $mo['out'], 2 );
		arsort( $mo['cats'] );
	}
	unset( $mo );
	krsort( $months );
	return array(
		'files'  => array_values( $d['files'] ),
		'months' => $months,
		'subs'   => dwdbk_recurring( $tx, $d['subs'] ),
		'tx'     => array_slice( $tx, 0, $limit_tx ),
		'count'  => count( $tx ),
		'last'   => $tx ? $tx[0]['date'] : '',
	);
}

/** Compact data for the finance chatbot. */
function dwdbk_ai_context() {
	$s   = dwdbk_summary( 250 );
	$pe  = function_exists( 'dwdpe_get' ) ? dwdpe_get() : array( 'money' => array(), 'bills' => array() );
	return array(
		'today'               => current_time( 'Y-m-d' ),
		'bank_months'         => array_slice( $s['months'], 0, 18, true ),
		'recurring_charges'   => array_map( function ( $x ) { return array_intersect_key( $x, array_flip( array( 'name', 'cycle', 'amount', 'monthly', 'yearly', 'last', 'next', 'stopped', 'raised', 'status', 'count' ) ) ); }, $s['subs'] ),
		'recent_transactions' => array_map( function ( $t ) { return array( $t['date'], $t['desc'], $t['amt'], $t['cat'] ); }, array_slice( $s['tx'], 0, 250 ) ),
		'manual_money_log'    => array_slice( $pe['money'], -200 ),
		'bills'               => array_map( function ( $b ) { unset( $b['paid'] ); return $b; }, $pe['bills'] ),
		'bank_files'          => $s['files'],
	);
}

add_action( 'rest_api_init', function () {
	$can = function () { return current_user_can( 'manage_options' ); };
	register_rest_route( 'dwd/v1', '/crm/bank', array(
		array( 'methods' => 'GET', 'permission_callback' => $can, 'callback' => function () {
			$out             = dwdbk_summary();
			$out['balances'] = function_exists( 'dwdpl_balances' ) ? dwdpl_balances() : null;
			$out['adspend']  = dwdbk_adspend();
			return $out;
		} ),
		array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function ( $r ) {
			$p = (array) $r->get_json_params();
			$d = dwdbk_get();
			if ( isset( $p['csv'] ) ) {
				$acct = sanitize_text_field( (string) ( $p['account'] ?? 'Bank of America' ) );
				$acct = '' !== $acct ? $acct : 'Bank of America';
				$rows = dwdbk_parse( (string) $p['csv'], $acct );
				if ( is_wp_error( $rows ) ) {
					return new WP_Error( 'dwdbk_csv', $rows->get_error_message(), array( 'status' => 400 ) );
				}
				$have = array();
				foreach ( $d['tx'] as $t ) {
					$have[ $t['id'] ] = 1;
				}
				$new = 0;
				foreach ( $rows as $t ) {
					if ( ! isset( $have[ $t['id'] ] ) ) {
						$d['tx'][]         = $t;
						$have[ $t['id'] ] = 1;
						$new++;
					}
				}
				$dates     = array_column( $rows, 'date' );
				$d['files'][] = array( 'name' => sanitize_file_name( (string) ( $p['name'] ?? 'bofa.csv' ) ), 'account' => $acct, 'rows' => count( $rows ), 'new' => $new, 'from' => $dates ? min( $dates ) : '', 'to' => $dates ? max( $dates ) : '', 'uploaded' => current_time( 'Y-m-d' ) );
				$d['files'] = array_slice( $d['files'], -50 );
				dwdbk_put( $d );
				$s = dwdbk_summary();
				$s['added'] = $new;
				$s['read']  = count( $rows );
				return $s;
			}
			if ( isset( $p['sub'], $p['scope'] ) ) { // label a subscription Business or Personal (remembered for that merchant)
				$sc = (array) get_option( 'dwdbk_scopes', array() );
				$m2 = sanitize_text_field( (string) $p['sub'] );
				if ( in_array( $p['scope'], array( 'business', 'personal' ), true ) ) {
					$sc[ $m2 ] = $p['scope'];
				} else {
					unset( $sc[ $m2 ] );
				}
				update_option( 'dwdbk_scopes', $sc, false );
				return dwdbk_summary();
			}
			if ( isset( $p['sub'] ) ) {
				$m = sanitize_text_field( (string) $p['sub'] );
				$v = in_array( $p['status'] ?? '', array( 'keep', 'cancel', 'ignore' ), true ) ? $p['status'] : '';
				if ( '' === $v ) {
					unset( $d['subs'][ $m ] );
				} else {
					$d['subs'][ $m ] = $v;
				}
			}
			if ( isset( $p['merchant'], $p['cat'] ) ) {
				$d['cats'][ sanitize_text_field( (string) $p['merchant'] ) ] = sanitize_text_field( (string) $p['cat'] );
			}
			if ( ! empty( $p['clear'] ) ) {
				$d = array( 'tx' => array(), 'files' => array(), 'subs' => $d['subs'], 'cats' => $d['cats'] );
			}
			dwdbk_put( $d );
			return dwdbk_summary();
		} ),
	) );
} );


/** Advertising spend by month (YYYY-MM): Upwork Connects (membership left out) and Google Ads. */
function dwdbk_adspend() {
	$m = array();
	foreach ( (array) get_option( 'dwdc_upwork_costs', array() ) as $x ) {
		$d = substr( (string) ( $x['date'] ?? '' ), 0, 7 );
		if ( 'membership' === ( $x['type'] ?? '' ) || ! preg_match( '/^\d{4}-\d\d$/', $d ) ) {
			continue;
		}
		$m[ $d ]['connects'] = round( ( $m[ $d ]['connects'] ?? 0 ) + (float) ( $x['amount'] ?? 0 ), 2 );
	}
	$g = get_option( 'dwdads_data', array() );
	foreach ( (array) ( $g['days'] ?? array() ) as $day => $x ) {
		$d = substr( (string) $day, 0, 7 );
		$m[ $d ]['google'] = round( ( $m[ $d ]['google'] ?? 0 ) + (float) ( $x['cost'] ?? 0 ), 2 );
	}
	return array( 'months' => $m, 'google_on' => ! empty( $g['at'] ) );
}
