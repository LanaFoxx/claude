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

/** The same bank linked twice through Plaid stores every transaction twice: how many copies to expect. */
function dwdbk_copies() {
	if ( ! function_exists( 'dwdpl_items' ) ) {
		return 1;
	}
	$seen = array();
	$max  = 1;
	foreach ( (array) dwdpl_items() as $it ) {
		$a = array_map( 'strval', (array) ( $it['accounts'] ?? array() ) );
		sort( $a );
		$k          = strtolower( (string) ( $it['institution'] ?? '' ) ) . '|' . implode( ',', $a );
		$seen[ $k ] = ( $seen[ $k ] ?? 0 ) + 1;
		$max        = max( $max, $seen[ $k ] );
	}
	return $max;
}

/** Count each real transaction once when a bank is linked more than once (nothing is deleted). */
function dwdbk_dedupe( $tx ) {
	$k = dwdbk_copies();
	if ( $k < 2 ) {
		return $tx;
	}
	$n   = array();
	$out = array();
	foreach ( $tx as $t ) {
		if ( 'p' !== substr( (string) $t['id'], 0, 1 ) ) { // uploaded file rows are never doubled
			$out[] = $t;
			continue;
		}
		$key       = $t['date'] . '|' . $t['desc'] . '|' . $t['amt'] . '|' . $t['acct'];
		$n[ $key ] = ( $n[ $key ] ?? 0 ) + 1;
		if ( 1 === $n[ $key ] % $k ) {
			$out[] = $t;
		}
	}
	return $out;
}

/** Business or personal: the label you gave that merchant wins, otherwise the account it was paid from. */
function dwdbk_is_biz( $t ) {
	static $sc = null;
	if ( null === $sc ) {
		$sc = (array) get_option( 'dwdbk_scopes', array() );
	}
	$l = (string) ( $sc[ (string) ( $t['m'] ?? '' ) ] ?? '' );
	if ( 'business' === $l || 'personal' === $l ) {
		return 'business' === $l;
	}
	return false !== stripos( (string) ( $t['acct'] ?? '' ), 'business' );
}

/**
 * Money → Suggestions: spending patterns over the last 12 months, people paid by Zelle, where to save.
 * $side: personal | business | '' (everything). $want: return the transactions behind one number instead
 * (spent, income, people, habits, saved, habit:KEY, cat:NAME, person:KEY, merchant:KEY).
 */
function dwdbk_insights( $side = '', $want = '' ) {
	$d  = dwdbk_get();
	$tx = dwdbk_dedupe( $d['tx'] );
	if ( ! $tx ) {
		return array( 'count' => 0 );
	}
	$hits = array();
	$hit  = function ( $tag, $t ) use ( &$hits, $want ) {
		if ( '' !== $want && $want === $tag ) {
			$hits[] = $t;
		}
	};
	foreach ( $tx as &$t ) {
		if ( isset( $d['cats'][ $t['m'] ] ) ) {
			$t['cat'] = $d['cats'][ $t['m'] ];
		}
	}
	unset( $t );
	$dates = array_column( $tx, 'date' );
	$to    = max( $dates );
	$first = min( $dates );
	$from  = max( $first, gmdate( 'Y-m-d', strtotime( $to . ' -1 year +1 day' ) ) );
	$days  = max( 1, (int) round( ( strtotime( $to ) - strtotime( $from ) ) / DAY_IN_SECONDS ) + 1 );
	if ( '' !== $side ) { // same 12 months for both sides
		$tx = array_values( array_filter( $tx, function ( $t ) use ( $side ) { return dwdbk_is_biz( $t ) === ( 'business' === $side ); } ) );
	}
	$yr    = 365 / $days;
	$mth   = 30.44 / $days;
	$usd   = function ( $n ) { return '$' . number_format( round( (float) $n ) ); };
	$nice  = function ( $s ) {
		$s = trim( (string) preg_replace( '/\s+/', ' ', (string) preg_replace( '/\s+(DES:|ID:|INDN:|CO ID:).*$/i', '', (string) $s ) ) );
		return mb_substr( $s === strtoupper( $s ) ? ucwords( strtolower( $s ) ) : $s, 0, 44 );
	};
	$own   = '/KEEP ?THE ?CHANGE|ONLINE BANKING TRANSFER|TRANSFER (TO|FROM) (CHK|SAV|ACCT|CHECKING|SAVINGS)|OVERDRAFT PROTECTION|SCHEDULED? TRANSFER|ACCTVERIFY/';
	$inv   = '/FIDELITY|ACORNS|VANGUARD|SCHWAB|ROBINHOOD|BETTERMENT|WEALTHFRONT/';
	$card  = '/ONLINE BANKING PAYMENT TO CRD|CREDIT CARD PAYMENT|CRD PMT|PAYMENT - THANK YOU|BANK OF AMERICA CREDIT CARD|CREDIT CARD BILL PAYMENT/';
	// First match wins. label, words to look for, or a category.
	$defs = array(
		'fees'     => array( 'Bank fees and interest', '/OVERDRAFT|LATE FEE|INTEREST CHARGE|MAINTENANCE FEE|\bNSF\b|ATM FEE|FOREIGN TRANSACTION|SERVICE FEE|MONTHLY FEE/', 'Fees' ),
		'delivery' => array( 'Food delivery (DoorDash, Uber Eats, Grubhub)', '/DOORDASH|UBER\s*EATS|GRUBHUB|POSTMATES|GOPUFF|CAVIAR/', '' ),
		'coffee'   => array( 'Coffee shops', '/STARBUCKS|DUNKIN|DUTCH BROS|COFFEE|CARIBOU|7 BREW|BLACK RIFLE/', '' ),
		'ride'     => array( 'Uber and Lyft rides', '/\bUBER\b|\bLYFT\b/', '' ),
		'amazon'   => array( 'Amazon', '/AMAZON|AMZN/', '' ),
		'betting'  => array( 'Betting and lottery', '/DRAFTKINGS|FANDUEL|BETMGM|LOTTERY|CASINO|PRIZEPICKS/', '' ),
		'drinks'   => array( 'Bars, breweries and liquor stores', '/ABC STORE|LIQUOR|TOTAL WINE|WINE & SPIRITS|BREWERY|BREWING|TAPROOM|\bPUB\b|\bBAR\b/', '' ),
		'subs'     => array( 'Subscriptions', '', 'Subscriptions' ),
		'dining'   => array( 'Restaurants and eating out', '', 'Dining' ),
		'fun'      => array( 'Entertainment and fun', '', 'Fun' ),
		'shopping' => array( 'Other shopping', '', 'Shopping' ),
	);
	$hab = array();
	foreach ( $defs as $k => $x ) {
		$hab[ $k ] = array( 'key' => $k, 'label' => $x[0], 'total' => 0, 'count' => 0, 'm' => array() );
	}
	$people = array();
	$cats   = array();
	$merch  = array();
	$months = array();
	$accts  = array();
	$big    = array();
	$dow    = array_fill( 0, 7, 0 );
	$spent  = 0;
	$income = 0;
	$keep   = 0;
	$invest = 0;
	$cardp  = 0;
	foreach ( $tx as $t ) {
		$u   = strtoupper( (string) $t['desc'] );
		$amt = (float) $t['amt'];
		$win = $t['date'] >= $from;
		if ( preg_match( $own, $u ) ) {
			if ( $win && $amt < 0 && preg_match( '/KEEP ?THE ?CHANGE/', $u ) ) {
				$keep += -$amt;
				$hit( 'saved', $t );
			}
			continue;
		}
		if ( preg_match( $inv, $u ) ) { // money put away is not money spent
			if ( $win && $amt < 0 ) {
				$invest += -$amt;
				$hit( 'saved', $t );
			}
			continue;
		}
		$who = '';
		if ( preg_match( '/ZELLE\b.*?\b(TO|FROM)\s+(.+)$/i', (string) $t['desc'], $m ) ) {
			$who  = trim( (string) preg_replace( '/\s*(;|CONF\s*#|\bCONF\b|\bFOR\s+["\'\x{201C}]).*$/iu', '', $m[2] ) );
			$memo = preg_match( '/\bFOR\s+["\'\x{201C}](.+?)["\'\x{201D}]/iu', $m[2], $mm ) ? trim( $mm[1] ) : '';
			if ( '' !== $who ) {
				$pk = strtoupper( (string) preg_replace( '/\s+/', ' ', $who ) );
				if ( ! isset( $people[ $pk ] ) ) {
					$people[ $pk ] = array( 'key' => $pk, 'name' => $nice( $who ), 'year' => 0, 'count' => 0, 'all' => 0, 'count_all' => 0, 'back' => 0, 'first' => $t['date'], 'last' => '', 'years' => array(), 'memos' => array() );
				}
				$p = &$people[ $pk ];
				$hit( 'person:' . $pk, $t );
				if ( $amt < 0 ) {
					$p['all'] += -$amt;
					$p['count_all']++;
					$p['first'] = min( $p['first'], $t['date'] );
					$p['last']  = max( $p['last'], $t['date'] );
					$y          = substr( $t['date'], 0, 4 );
					$p['years'][ $y ] = ( $p['years'][ $y ] ?? 0 ) - $amt;
					if ( $win ) {
						$p['year'] += -$amt;
						$p['count']++;
					}
					if ( '' !== $memo ) {
						$p['memos'][ strtolower( $memo ) ] = ( $p['memos'][ strtolower( $memo ) ] ?? 0 ) + 1;
					}
				} else {
					$p['back'] += $amt;
				}
				unset( $p );
			}
		}
		if ( ! $win ) {
			continue;
		}
		if ( $amt > 0 ) {
			$income += $amt;
			$hit( 'income', $t );
			continue;
		}
		$out   = -$amt;
		$is_cd = (bool) preg_match( $card, $u );
		$cat   = '' !== $who ? 'Sent to people (Zelle)' : ( $is_cd ? 'Credit card payments' : ( false !== strpos( $u, 'GUSTO' ) ? 'Payroll (Gusto)' : ( 'Transfers' === $t['cat'] ? 'Other transfers' : (string) $t['cat'] ) ) );
		$spent += $out;
		$hit( 'spent', $t );
		$hit( 'cat:' . $cat, $t );
		if ( '' !== $who ) {
			$hit( 'people', $t );
		}
		$ym     = substr( $t['date'], 0, 7 );
		$months[ $ym ]['out']          = ( $months[ $ym ]['out'] ?? 0 ) + $out;
		$months[ $ym ]['cats'][ $cat ] = ( $months[ $ym ]['cats'][ $cat ] ?? 0 ) + $out;
		$accts[ (string) $t['acct'] ]  = ( $accts[ (string) $t['acct'] ] ?? 0 ) + $out;
		if ( ! isset( $cats[ $cat ] ) ) {
			$cats[ $cat ] = array( 'name' => $cat, 'total' => 0, 'count' => 0, 'm' => array() );
		}
		$cats[ $cat ]['total'] += $out;
		$cats[ $cat ]['count']++;
		if ( $is_cd ) {
			$cardp += $out;
		}
		if ( '' !== $who || $is_cd ) {
			continue;
		}
		$mk = (string) $t['m'];
		$cats[ $cat ]['m'][ $mk ] = ( $cats[ $cat ]['m'][ $mk ] ?? 0 ) + $out;
		if ( ! isset( $merch[ $mk ] ) ) {
			$merch[ $mk ] = array( 'key' => $mk, 'name' => $nice( $t['desc'] ), 'total' => 0, 'count' => 0, 'cat' => $cat );
		}
		$merch[ $mk ]['total'] += $out;
		$hit( 'merchant:' . $mk, $t );
		$merch[ $mk ]['count']++;
		$big[] = array( 'date' => $t['date'], 'name' => $nice( $t['desc'] ), 'amt' => round( $out, 2 ), 'cat' => $cat );
		foreach ( $defs as $k => $x ) {
			if ( ( '' !== $x[1] && preg_match( $x[1], $u ) ) || ( '' !== $x[2] && $x[2] === $t['cat'] ) ) {
				$hab[ $k ]['total'] += $out;
				$hit( 'habit:' . $k, $t );
				$hit( 'habits', $t );
				$hab[ $k ]['count']++;
				$hab[ $k ]['m'][ $mk ] = ( $hab[ $k ]['m'][ $mk ] ?? 0 ) + $out;
				break;
			}
		}
		if ( in_array( $t['cat'], array( 'Dining', 'Fun', 'Shopping' ), true ) ) {
			$dow[ (int) gmdate( 'w', strtotime( $t['date'] . ' 12:00:00' ) ) ] += $out;
		}
	}
	if ( '' !== $want ) { // the transactions behind one number
		usort( $hits, function ( $a, $b ) { return strcmp( $b['date'], $a['date'] ); } );
		$sum = 0;
		foreach ( $hits as $t ) {
			$sum += abs( (float) $t['amt'] );
		}
		return array(
			'count' => count( $hits ),
			'total' => round( $sum, 2 ),
			'from'  => $from,
			'to'    => $to,
			'tx'    => array_map( function ( $t ) use ( $nice ) { return array( 'date' => $t['date'], 'name' => $nice( $t['desc'] ), 'amt' => (float) $t['amt'], 'cat' => (string) $t['cat'], 'acct' => (string) $t['acct'] ); }, array_slice( $hits, 0, 800 ) ),
		);
	}
	$top = function ( $map, $n ) use ( $merch ) {
		arsort( $map );
		$o = array();
		foreach ( array_slice( $map, 0, $n, true ) as $mk => $v ) {
			$o[] = array( 'name' => $merch[ $mk ]['name'] ?? $mk, 'total' => round( $v ) );
		}
		return $o;
	};
	$habits = array();
	foreach ( $hab as $h ) {
		if ( $h['total'] <= 0 ) {
			continue;
		}
		$habits[] = array( 'key' => $h['key'], 'label' => $h['label'], 'total' => round( $h['total'] ), 'count' => $h['count'], 'monthly' => round( $h['total'] * $mth ), 'yearly' => round( $h['total'] * $yr ), 'top' => $top( $h['m'], 3 ) );
	}
	usort( $habits, function ( $a, $b ) { return $b['yearly'] <=> $a['yearly']; } );
	$plist = array();
	foreach ( $people as $p ) {
		if ( $p['all'] <= 0 ) {
			continue;
		}
		arsort( $p['memos'] );
		ksort( $p['years'] );
		$plist[] = array( 'key' => $p['key'], 'name' => $p['name'], 'year' => round( $p['year'] ), 'count' => $p['count'], 'all' => round( $p['all'] ), 'count_all' => $p['count_all'], 'avg' => round( $p['all'] / max( 1, $p['count_all'] ) ), 'back' => round( $p['back'] ), 'first' => $p['first'], 'last' => $p['last'], 'years' => array_map( 'round', $p['years'] ), 'memo' => (string) ( array_keys( $p['memos'] )[0] ?? '' ) );
	}
	usort( $plist, function ( $a, $b ) { return ( $b['year'] <=> $a['year'] ) ?: ( $b['all'] <=> $a['all'] ); } );
	$clist = array();
	foreach ( $cats as $c ) {
		$clist[] = array( 'name' => $c['name'], 'total' => round( $c['total'] ), 'count' => $c['count'], 'yearly' => round( $c['total'] * $yr ), 'top' => $top( $c['m'], 3 ) );
	}
	usort( $clist, function ( $a, $b ) { return $b['total'] <=> $a['total']; } );
	$mlist = array_values( $merch );
	usort( $mlist, function ( $a, $b ) { return $b['total'] <=> $a['total']; } );
	$small = array_values( array_filter( $mlist, function ( $x ) { return $x['count'] >= 10 && $x['total'] / $x['count'] <= 25 && ! in_array( $x['cat'], array( 'Subscriptions', 'Bills & Utilities', 'Fees' ), true ); } ) );
	$fix   = function ( $x ) use ( $yr ) { return array( 'key' => $x['key'], 'name' => $x['name'], 'total' => round( $x['total'] ), 'count' => $x['count'], 'avg' => round( $x['total'] / max( 1, $x['count'] ), 2 ), 'cat' => $x['cat'], 'yearly' => round( $x['total'] * $yr ) ); };
	usort( $big, function ( $a, $b ) { return $b['amt'] <=> $a['amt']; } );
	$subs = array_values( array_filter( dwdbk_recurring( $tx, $d['subs'] ), function ( $s ) use ( $side ) { return empty( $s['stopped'] ) && 'ignore' !== $s['status'] && ( '' === $side || ( 'business' === $side ) === ( '' !== $s['scope'] ? 'business' === $s['scope'] : false !== stripos( $s['acct'], 'business' ) ) ); } ) );
	$suby = array_sum( array_column( $subs, 'yearly' ) );
	ksort( $months );
	$mrows = array();
	foreach ( $months as $ym => $x ) {
		arsort( $x['cats'] );
		$mrows[] = array( 'ym' => $ym, 'out' => round( $x['out'] ), 'top' => (string) array_keys( $x['cats'] )[0], 'top_amt' => round( (float) reset( $x['cats'] ) ) );
	}
	// Whole months only for month-to-month comparisons.
	$full = $mrows;
	if ( $full && '01' !== substr( $from, 8, 2 ) ) {
		array_shift( $full );
	}
	if ( $full && gmdate( 'Y-m-t', strtotime( $to ) ) !== $to ) {
		array_pop( $full );
	}
	$label = function ( $ym ) { return gmdate( 'F Y', strtotime( $ym . '-15' ) ); };
	$pat   = array();
	if ( count( $full ) >= 3 ) {
		$outs = array_column( $full, 'out' );
		$avg  = array_sum( $outs ) / count( $outs );
		$hi   = $full[ array_search( max( $outs ), $outs, true ) ];
		$lo   = $full[ array_search( min( $outs ), $outs, true ) ];
		$pat[] = array( 't' => 'Most expensive month:', 'x' => $label( $hi['ym'] ) . ' at ' . $usd( $hi['out'] ) . ', against a typical ' . $usd( $avg ) . '. The biggest part was ' . $hi['top'] . ' (' . $usd( $hi['top_amt'] ) . '). Your lightest month was ' . $label( $lo['ym'] ) . ' at ' . $usd( $lo['out'] ) . '.' );
	}
	if ( count( $full ) >= 6 ) {
		$a = array_sum( array_column( array_slice( $full, -3 ), 'out' ) ) / 3;
		$b = array_sum( array_column( array_slice( $full, -6, 3 ), 'out' ) ) / 3;
		if ( $b > 0 ) {
			$ch    = ( $a - $b ) / $b * 100;
			$pat[] = array( 't' => 'Direction:', 'x' => 'The last 3 full months averaged ' . $usd( $a ) . ' a month, ' . ( abs( $ch ) < 3 ? 'about the same as' : ( round( abs( $ch ) ) . '% ' . ( $ch > 0 ? 'more' : 'less' ) . ' than' ) ) . ' the 3 months before (' . $usd( $b ) . ').' );
		}
	}
	$ptot = array_sum( array_column( $plist, 'year' ) );
	if ( $ptot > 0 && $spent > 0 ) {
		$pat[] = array( 't' => 'Zelle:', 'x' => $usd( $ptot ) . ' went to people by Zelle, ' . round( $ptot / $spent * 100 ) . '% of everything that left your accounts.' );
	}
	if ( $cardp > 0 ) {
		$pat[] = array( 't' => 'Credit cards:', 'x' => $usd( $cardp ) . ' went to credit card payments. What was bought on those cards is not in the bank feed, so your real totals for restaurants, shopping and the rest are higher than shown here.' );
	}
	if ( $suby > 0 ) {
		$pat[] = array( 't' => 'Repeating charges:', 'x' => count( $subs ) . ' charges repeat on a schedule and add up to about ' . $usd( $suby ) . ' a year.' );
	}
	if ( $keep + $invest > 0 ) {
		$pat[] = array( 't' => 'Already saving:', 'x' => $usd( $keep + $invest ) . ' was put away' . ( $invest > 0 ? ': ' . $usd( $invest ) . ' into investing accounts (Fidelity, Acorns and the like)' . ( $keep > 0 ? ' and ' . $usd( $keep ) . ' through Keep the Change' : '' ) : ' through Keep the Change' ) . '. That is not counted as spending on this page.' );
	}
	arsort( $accts );
	$alist = array();
	foreach ( $accts as $a => $v ) {
		$alist[] = array( 'name' => $a, 'total' => round( $v ) );
	}
	return array(
		'count'        => count( $tx ),
		'side'         => $side,
		'copies'       => dwdbk_copies(),
		'from'         => $from,
		'to'           => $to,
		'first'        => $first,
		'days'         => $days,
		'spent'        => round( $spent ),
		'spent_month'  => round( $spent * $mth ),
		'income'       => round( $income ),
		'people_total' => round( $ptot ),
		'people_count' => count( array_filter( $plist, function ( $p ) { return $p['year'] > 0; } ) ),
		'habits'       => $habits,
		'people'       => $plist,
		'cats'         => $clist,
		'merchants'    => array_map( $fix, array_slice( $mlist, 0, 15 ) ),
		'small'        => array_map( $fix, array_slice( $small, 0, 10 ) ),
		'subs'         => array( 'yearly' => round( $suby ), 'list' => array_map( function ( $s ) { return array( 'name' => $s['name'], 'cycle' => $s['cycle'], 'amount' => $s['amount'], 'yearly' => round( $s['yearly'] ) ); }, array_slice( $subs, 0, 12 ) ) ),
		'big'          => array_slice( $big, 0, 10 ),
		'months'       => $mrows,
		'patterns'     => $pat,
		'accounts'     => $alist,
	);
}

/** Repeating charges: same merchant, regular spacing, similar amounts. */
function dwdbk_recurring( $tx, $flags ) {
	// Money moved between your own accounts or onto your own credit cards is not a charge.
	$own   = '/KEEP ?THE ?CHANGE|ONLINE BANKING TRANSFER|TRANSFER (TO|FROM) (CHK|SAV|ACCT|CHECKING|SAVINGS)|OVERDRAFT PROTECTION|SCHEDULED? TRANSFER|ACCTVERIFY|ONLINE BANKING PAYMENT TO CRD|CREDIT CARD PAYMENT|CRD PMT|PAYMENT - THANK YOU|BANK OF AMERICA CREDIT CARD|CREDIT CARD BILL PAYMENT/';
	$kinds = (array) get_option( 'dwdbk_kinds', array() );
	$mycat = (array) get_option( 'dwdbk_subcats', array() );
	$scope = (array) get_option( 'dwdbk_scopes', array() );
	$by    = array();
	$names = array();
	foreach ( $tx as $t ) {
		if ( $t['amt'] >= 0 ) {
			continue;
		}
		$key = (string) $t['m'];
		if ( preg_match( $own, strtoupper( (string) $t['desc'] ) ) ) {
			continue;
		}
		// Zelle to a person (rent, a sitter): one line per person, not one for all of Zelle.
		if ( preg_match( '/ZELLE\b.*?\bTO\s+(.+)$/i', (string) $t['desc'], $mm ) ) {
			$who = trim( (string) preg_replace( '/\s*(;|CONF\s*#|\bCONF\b|\bFOR\s+["\'\x{201C}]).*$/iu', '', $mm[1] ) );
			if ( '' === $who ) {
				continue;
			}
			$key           = 'ZELLE ' . strtoupper( (string) preg_replace( '/\s+/', ' ', $who ) );
			$names[ $key ] = ucwords( strtolower( $who ) ) . ' (Zelle)';
		}
		$by[ $key ][] = $t;
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
		$last = end( $list );
		$amts = array_map( function ( $t ) { return -$t['amt']; }, $list );
		// What each month added up to (rent paid in two parts, two phone lines, a bill with no steady day).
		$ms = array();
		foreach ( $list as $t ) {
			$ms[ substr( $t['date'], 0, 7 ) ] = ( $ms[ substr( $t['date'], 0, 7 ) ] ?? 0 ) - $t['amt'];
		}
		$span    = ( (int) substr( $last['date'], 0, 4 ) - (int) substr( $list[0]['date'], 0, 4 ) ) * 12 + (int) substr( $last['date'], 5, 2 ) - (int) substr( $list[0]['date'], 5, 2 ) + 1;
		$monthly = count( $ms ) >= 3 && count( $ms ) >= 0.75 * $span;
		if ( count( $ms ) > 3 && gmdate( 'Y-m' ) === substr( $last['date'], 0, 7 ) ) {
			array_pop( $ms ); // the month still in progress
		}
		// How far the amounts stray from normal; with 6 or more, the odd high and low ones (a part payment, a one-off) are set aside.
		$wide  = function ( $a ) {
			sort( $a );
			$cut = count( $a ) >= 6 ? (int) floor( count( $a ) * 0.2 ) : 0;
			$a   = array_slice( $a, $cut, count( $a ) - 2 * $cut );
			return ( max( $a ) - min( $a ) ) / max( 1, array_sum( $a ) / count( $a ) );
		};
		$zelle = 0 === strpos( (string) $m, 'ZELLE ' );
		// Bills (phone, power, insurance, services) move around more than a subscription does.
		$loose = in_array( $last['cat'], array( 'Bills & Utilities', 'Services', 'Business', 'Taxes & Gov' ), true ) && ! $zelle;
		$limit = 'Subscriptions' === $last['cat'] ? 99 : ( $loose ? 1.5 : 0.35 );
		$daily = in_array( $last['cat'], array( 'Groceries', 'Dining', 'Shopping', 'Fun', 'Travel', 'Gas & Car' ), true );
		if ( $monthly && ! $daily && ( ! $cycle || ( 'monthly' === $cycle && $wide( $amts ) > $limit ) ) ) {
			$cycle = 'monthly';
			$amts  = array_values( $ms );
			$limit = $zelle ? 0.6 : $limit;
		}
		if ( ! $cycle || ( count( $list ) < 3 && ! in_array( $cycle, array( 'monthly', 'yearly', 'every 3 months' ), true ) ) ) {
			continue;
		}
		$now = end( $amts );
		if ( $zelle && count( $amts ) >= 3 ) { // the usual amount, not a part payment
			$l3 = array_slice( $amts, -3 );
			sort( $l3 );
			$now = $l3[1];
		}
		if ( $wide( $amts ) > $limit ) {
			continue; // amounts too different to be a repeating charge (e.g. groceries)
		}
		$prev = count( $amts ) > 1 ? $amts[ count( $amts ) - 2 ] : $amts[0];
		$step = array( 'weekly' => 7, 'every 2 weeks' => 14, 'monthly' => 30, 'every 3 months' => 91, 'yearly' => 365 )[ $cycle ];
		$next = gmdate( 'Y-m-d', strtotime( $last['date'] ) + $step * DAY_IN_SECONDS );
		$per_mo = 'monthly' === $cycle ? $now : $now * ( 30.4 / $step );
		$out[] = array(
			'merchant'  => $m,
			'name'      => $names[ $m ] ?? ucwords( strtolower( $m ) ),
			'cycle'     => $cycle,
			'amount'    => round( $now, 2 ),
			'monthly'   => round( $per_mo, 2 ),
			'yearly'    => round( $per_mo * 12, 2 ),
			'count'     => count( $list ),
			'first'     => $list[0]['date'],
			'last'      => $last['date'],
			'next'      => $next,
			'stopped'   => strtotime( $next ) < time() - 20 * DAY_IN_SECONDS,
			'raised'    => $now > $prev * 1.02 && ! $loose ? round( $now - $prev, 2 ) : 0,
			'cat'       => $last['cat'],
			'status'    => $flags[ $m ] ?? '',
			'scope'     => (string) ( $scope[ $m ] ?? '' ), // business | personal | '' (unlabeled)
			'kind'      => in_array( $kinds[ $m ] ?? '', array( 'bill', 'subscription' ), true ) ? $kinds[ $m ] : ( 'Subscriptions' === $last['cat'] ? 'subscription' : 'bill' ),
			'acct'      => (string) ( $last['acct'] ?? '' ),
			'category'  => '' !== (string) ( $mycat[ $m ] ?? '' ) ? (string) $mycat[ $m ] : (string) $last['cat'], // yours if you picked one, else the bank's
			'prev'      => round( $prev, 2 ),
		);
	}
	usort( $out, function ( $a, $b ) { return $b['monthly'] <=> $a['monthly']; } );
	return $out;
}

function dwdbk_summary( $limit_tx = 900 ) {
	$d  = dwdbk_get();
	$tx = dwdbk_dedupe( $d['tx'] ); // a bank linked twice is counted once
	foreach ( $tx as &$t ) {
		if ( isset( $d['cats'][ $t['m'] ] ) ) {
			$t['cat'] = $d['cats'][ $t['m'] ];
		}
		$t['biz'] = dwdbk_is_biz( $t );
	}
	unset( $t );
	usort( $tx, function ( $a, $b ) { return strcmp( $b['date'], $a['date'] ); } );
	$months = array();
	foreach ( $tx as $t ) {
		$ym = substr( $t['date'], 0, 7 );
		if ( ! isset( $months[ $ym ] ) ) {
			$months[ $ym ] = array( 'in' => 0, 'out' => 0, 'cats' => array(), 'p' => array( 'out' => 0, 'cats' => array() ), 'b' => array( 'out' => 0, 'cats' => array() ) );
		}
		if ( 'Transfers' === $t['cat'] ) {
			continue;
		}
		if ( $t['amt'] > 0 ) {
			$months[ $ym ]['in'] += $t['amt'];
		} else {
			$months[ $ym ]['out'] += -$t['amt'];
			$months[ $ym ]['cats'][ $t['cat'] ] = round( ( $months[ $ym ]['cats'][ $t['cat'] ] ?? 0 ) - $t['amt'], 2 );
			$sd = $t['biz'] ? 'b' : 'p';
			$months[ $ym ][ $sd ]['out']                = round( $months[ $ym ][ $sd ]['out'] - $t['amt'], 2 );
			$months[ $ym ][ $sd ]['cats'][ $t['cat'] ] = round( ( $months[ $ym ][ $sd ]['cats'][ $t['cat'] ] ?? 0 ) - $t['amt'], 2 );
		}
	}
	foreach ( $months as &$mo ) {
		$mo['in']  = round( $mo['in'], 2 );
		$mo['out'] = round( $mo['out'], 2 );
		arsort( $mo['cats'] );
		arsort( $mo['p']['cats'] );
		arsort( $mo['b']['cats'] );
	}
	unset( $mo );
	krsort( $months );
	$subs    = dwdbk_recurring( $tx, $d['subs'] );
	$subcats = array_values( array_unique( array_filter( array_merge( array( 'Bills & Utilities', 'Business', 'Insurance', 'Loans & Debt', 'Rent & Housing', 'Services', 'Software', 'Subscriptions', 'Taxes & Gov' ), array_column( $subs, 'category' ), array_values( (array) get_option( 'dwdbk_subcats', array() ) ) ) ) ) );
	natcasesort( $subcats );
	return array(
		'files'  => array_values( $d['files'] ),
		'months' => $months,
		'subs'   => $subs,
		'subcats' => array_values( $subcats ),
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
	register_rest_route( 'dwd/v1', '/crm/bank/insights', array( 'methods' => 'GET', 'permission_callback' => $can, 'callback' => function ( $r ) {
		$w  = sanitize_text_field( (string) $r->get_param( 'want' ) );
		$sd = in_array( $r->get_param( 'side' ), array( 'personal', 'business' ), true ) ? (string) $r->get_param( 'side' ) : '';
		if ( '' !== $w ) {
			return dwdbk_insights( $sd, $w );
		}
		return array( 'count' => count( dwdbk_get()['tx'] ), 'personal' => dwdbk_insights( 'personal' ), 'business' => dwdbk_insights( 'business' ) );
	} ) );
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
			if ( isset( $p['sub'], $p['category'] ) ) { // your own category for a repeating charge (empty = back to the bank's)
				$mc = (array) get_option( 'dwdbk_subcats', array() );
				$m4 = sanitize_text_field( (string) $p['sub'] );
				$cv = mb_substr( trim( sanitize_text_field( (string) $p['category'] ) ), 0, 40 );
				if ( '' !== $cv ) {
					$mc[ $m4 ] = $cv;
				} else {
					unset( $mc[ $m4 ] );
				}
				update_option( 'dwdbk_subcats', $mc, false );
				return dwdbk_summary();
			}
			if ( isset( $p['sub'], $p['kind'] ) ) { // file a repeating charge as a bill or a subscription (remembered for that merchant)
				$kn = (array) get_option( 'dwdbk_kinds', array() );
				$m3 = sanitize_text_field( (string) $p['sub'] );
				if ( in_array( $p['kind'], array( 'bill', 'subscription' ), true ) ) {
					$kn[ $m3 ] = $p['kind'];
				} else {
					unset( $kn[ $m3 ] );
				}
				update_option( 'dwdbk_kinds', $kn, false );
				return dwdbk_summary();
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
