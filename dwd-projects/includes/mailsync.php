<?php
/**
 * Upwork emails → Dream Desk.
 *
 * A small Google Apps Script in Mike's Gmail runs twice a week and posts new Upwork emails here.
 * - "… hired you for: …"   → new active project (or, if it's a returning client, the existing project
 *                            reopened with the new job) — never a duplicate.
 * - "… offer for …"        → remembered, so the price is known when the hire email arrives.
 * - "Your contract has ended" → the matching project moves to Completed.
 * Money still comes from the Upwork CSV (emails carry no fees or payment dates).
 */
defined( 'ABSPATH' ) || exit;

function dwdm_token() {
	$t = (string) get_option( 'dwdm_token', '' );
	if ( '' === $t ) {
		$t = wp_generate_password( 40, false );
		update_option( 'dwdm_token', $t, false );
	}
	return $t;
}

function dwdm_money( $s ) {
	return (float) str_replace( array( '$', ',' ), '', (string) $s );
}

/** Read one Upwork email. Returns array( 'type' => …, … ) or null when it isn't one we use. */
function dwdm_parse( $subject, $body ) {
	$subject = trim( (string) $subject );
	$body    = str_replace( "\r", '', (string) $body );
	$flat    = preg_replace( '/\s+/', ' ', $body );
	if ( preg_match( '/hired you for:?\s*(.+)$/i', $subject, $sm ) ) {
		$r = array( 'type' => 'hired', 'title' => trim( $sm[1] ), 'person' => '', 'company' => '', 'contract' => '' );
		if ( preg_match( '/Hi [^,]+,\s*(.+?) has hired you for the position\s*(.+?):?\s*https?:\/\/www\.upwork\.com\/[^\s]*?\/workroom\/(\d+)/i', $flat, $m ) ) {
			$who = trim( $m[1] );
			if ( preg_match( '/^(.+?) of (.+)$/', $who, $w ) ) {
				$r['person']  = trim( $w[1] );
				$r['company'] = trim( $w[2] );
			} else {
				$r['person'] = $who;
			}
			$r['title']    = trim( $m[2] );
			$r['contract'] = $m[3];
		}
		return $r;
	}
	if ( preg_match( '/offer/i', $subject ) && preg_match( '/Contract title\s*\n+\s*(.+)/i', $body, $t ) ) {
		$r = array( 'type' => 'offer', 'title' => trim( $t[1] ), 'person' => '', 'company' => '', 'amount' => 0, 'hourly' => false );
		if ( preg_match( '/\nClient\s*\n+\s*(.+)/', $body, $c ) ) {
			$who = trim( $c[1] );
			if ( preg_match( '/^(.+?)\s*\((.+)\)$/', $who, $w ) ) {
				$r['person']  = trim( $w[1] );
				$r['company'] = trim( $w[2] );
			} else {
				$r['person'] = $who;
			}
		}
		if ( preg_match( '/(Estimated budget|Total amount|Fixed price|Budget)\s*\n+\s*\$([\d,\.]+)/i', $body, $a ) ) {
			$r['amount'] = dwdm_money( $a[2] );
		} elseif ( preg_match( '/Hourly rate\s*\n+\s*\$([\d,\.]+)/i', $body, $a ) ) {
			$r['amount'] = dwdm_money( $a[1] );
			$r['hourly'] = true;
		}
		return $r;
	}
	if ( preg_match( '/Your contract for (.+?):?\s*https?:\/\/www\.upwork\.com\/[^\s]*?\/workroom\/(\d+)[^\s]*\s+ended on ([A-Za-z]{3,9} \d{1,2}, \d{4})/i', $flat, $m ) ) {
		$r = array( 'type' => 'ended', 'title' => trim( $m[1] ), 'contract' => $m[2], 'date' => gmdate( 'Y-m-d', strtotime( $m[3] ) ), 'paid' => 0, 'agreed' => 0 );
		if ( preg_match( '/Amount Paid\s*\n+\s*\$([\d,\.]+)/i', $body, $a ) ) {
			$r['paid'] = dwdm_money( $a[1] );
		}
		if ( preg_match( '/Amount Agreed\s*\n+\s*\$([\d,\.]+)/i', $body, $a ) ) {
			$r['agreed'] = dwdm_money( $a[1] );
		}
		return $r;
	}
	return null;
}

/** Project already tied to this Upwork contract. */
function dwdm_by_contract( $contract ) {
	if ( ! $contract ) {
		return 0;
	}
	$ids = get_posts( array( 'post_type' => DWDC_CONTACT, 'post_status' => 'private', 'posts_per_page' => 1, 'fields' => 'ids', 'meta_key' => '_dwdc_upwork_contract', 'meta_value' => (string) $contract ) ); // phpcs:ignore
	return $ids ? (int) $ids[0] : 0;
}

/** Project whose Upwork payments or jobs carry this contract title (only when exactly one does). */
function dwdm_by_title( $title ) {
	$n = dwds_norm( $title );
	if ( strlen( $n ) < 6 ) {
		return 0;
	}
	$hits = array();
	foreach ( get_posts( array( 'post_type' => DWDC_CONTACT, 'post_status' => 'private', 'posts_per_page' => -1, 'fields' => 'ids' ) ) as $id ) {
		$texts = array();
		foreach ( (array) get_post_meta( $id, '_dwdc_payments', true ) as $p ) {
			$texts[] = preg_replace( '/\s·\s.*$/u', '', (string) ( $p['note'] ?? '' ) );
		}
		foreach ( (array) get_post_meta( $id, '_dwdc_jobs', true ) as $j ) {
			$texts[] = (string) ( $j['title'] ?? '' );
		}
		$texts[] = (string) get_post_meta( $id, '_dwdc_job', true );
		foreach ( $texts as $t ) {
			if ( $t && dwds_norm( $t ) === $n ) {
				$hits[ $id ] = 1;
			}
		}
	}
	return 1 === count( $hits ) ? (int) array_keys( $hits )[0] : 0;
}

/** "Snow B." → a project whose person/client is Snow B…, only when exactly one matches. */
function dwdm_by_person( $person ) {
	if ( ! preg_match( '/^([A-Za-z\'’\-]+)\s+([A-Za-z])/u', trim( (string) $person ), $m ) ) {
		return 0;
	}
	$first = strtolower( $m[1] );
	$ini   = strtolower( $m[2] );
	$hits  = array();
	foreach ( get_posts( array( 'post_type' => DWDC_CONTACT, 'post_status' => 'private', 'posts_per_page' => -1, 'fields' => 'ids' ) ) as $id ) {
		$cid = (int) get_post_meta( $id, '_dwdc_client', true );
		foreach ( array( get_post_meta( $id, '_dwdc_person', true ), $cid ? get_the_title( $cid ) : '' ) as $x ) {
			$x = strtolower( trim( (string) $x ) );
			if ( preg_match( '/^([a-z\'’\-]+)\s+([a-z])/u', $x, $p ) && $p[1] === $first && $p[2] === $ini ) {
				$hits[ $id ] = 1;
			}
		}
	}
	return 1 === count( $hits ) ? (int) array_keys( $hits )[0] : 0;
}

/**
 * Apply a batch of emails. $dry = true reports what would happen without changing anything.
 * Each message: array( 'id', 'date', 'subject', 'body' ).
 */
function dwdm_apply( $messages, $dry = false ) {
	$seen   = (array) get_option( 'dwdm_seen', array() );
	$offers = (array) get_option( 'dwdm_offers', array() );
	$out    = array( 'created' => array(), 'reopened' => array(), 'skipped' => array(), 'completed' => array(), 'check' => array(), 'ignored' => 0, 'already' => 0 );
	usort( $messages, function ( $a, $b ) { return strcmp( (string) ( $a['date'] ?? '' ), (string) ( $b['date'] ?? '' ) ); } );
	$done_contracts = array();
	// Contracts that already ended in this same batch: record them, but don't reopen or create to-dos.
	$ended = array();
	foreach ( $messages as $msg ) {
		$x = dwdm_parse( $msg['subject'] ?? '', $msg['body'] ?? '' );
		if ( $x && 'ended' === $x['type'] && $x['contract'] ) {
			$ended[ $x['contract'] ] = $x['date'];
		}
	}
	foreach ( $messages as $msg ) {
		$mid = sanitize_text_field( (string) ( $msg['id'] ?? '' ) );
		if ( $mid && isset( $seen[ $mid ] ) ) {
			$out['already']++;
			continue;
		}
		$e    = dwdm_parse( $msg['subject'] ?? '', $msg['body'] ?? '' );
		$date = substr( sanitize_text_field( (string) ( $msg['date'] ?? '' ) ), 0, 10 );
		$date = $date ? $date : current_time( 'Y-m-d' );
		if ( ! $e ) {
			$out['ignored']++;
		} elseif ( 'offer' === $e['type'] ) {
			$offers[ dwds_norm( $e['title'] ) ] = $e;
		} elseif ( 'hired' === $e['type'] ) {
			$key = $e['contract'] ? $e['contract'] : dwds_norm( $e['title'] );
			if ( isset( $done_contracts[ $key ] ) ) {
				// Upwork sends "hired you" and "contract started" together; one is enough.
			} else {
				$done_contracts[ $key ] = 1;
				$offer  = $offers[ dwds_norm( $e['title'] ) ] ?? array();
				$price  = ! empty( $offer['amount'] ) && empty( $offer['hourly'] ) ? $offer['amount'] : '';
				$person = $e['person'] ? $e['person'] : ( $offer['person'] ?? '' );
				$comp   = $e['company'] ? $e['company'] : ( $offer['company'] ?? '' );
				$label  = ( $comp ? $comp : $person ) . ' — ' . $e['title'] . ( $price ? ' ($' . number_format( $price ) . ')' : '' );
				$pid    = dwdm_by_contract( $e['contract'] );
				$how    = 'contract';
				if ( ! $pid ) {
					$pid = $comp ? dwds_upwork_project( $comp ) : 0;
					$how = 'Upwork client name';
				}
				if ( ! $pid ) {
					$pid = dwdm_by_title( $e['title'] );
					$how = 'job title';
				}
				if ( ! $pid && $person ) {
					$pid = dwdm_by_person( $person );
					$how = 'client name';
				}
				if ( $pid && 'contract' === $how ) {
					$out['skipped'][] = array( 'project' => html_entity_decode( get_the_title( $pid ), ENT_QUOTES ), 'id' => $pid, 'email' => $label, 'why' => 'Already added from this Upwork contract' );
				} elseif ( $pid ) {
					$list = (string) get_post_meta( $pid, '_dwdc_list', true );
					$jobs = (array) get_post_meta( $pid, '_dwdc_jobs', true );
					$has  = false;
					foreach ( $jobs as $j ) {
						$has = $has || dwds_norm( $j['title'] ?? '' ) === dwds_norm( $e['title'] );
					}
					$open     = in_array( $list, array( 'active', 'hold', 'limbo' ), true );
					$finished = $e['contract'] && isset( $ended[ $e['contract'] ] );
					if ( $finished && ! $open ) {
						$out['skipped'][] = array( 'project' => html_entity_decode( get_the_title( $pid ), ENT_QUOTES ), 'id' => $pid, 'email' => $label, 'why' => 'Returning client (matched by ' . $how . '); this contract has already ended, so it stays Completed' );
						$open             = true; // nothing to reopen
					} elseif ( $open ) {
						$out['skipped'][] = array( 'project' => html_entity_decode( get_the_title( $pid ), ENT_QUOTES ), 'id' => $pid, 'email' => $label, 'why' => 'Already an active project (matched by ' . $how . ')' );
					} else {
						$out['reopened'][] = array( 'project' => html_entity_decode( get_the_title( $pid ), ENT_QUOTES ), 'id' => $pid, 'email' => $label, 'why' => 'Returning client (matched by ' . $how . ') — moved back to Active with the new job' );
					}
					if ( ! $dry ) {
						update_post_meta( $pid, '_dwdc_upwork_contract', $e['contract'] );
						$data = array();
						if ( ! $has ) {
							$jobs[]       = array( 'title' => $e['title'], 'price' => $price, 'date' => $date );
							$data['jobs'] = $jobs;
						}
						if ( ! $open ) {
							$data['list']  = 'active';
							$data['price'] = $price;
							dwdc_add_task( 'Re-hired on Upwork: ' . $e['title'] . ' — check the price and details', $pid );
						}
						if ( $data ) {
							dwdc_save_contact( $pid, $data );
						}
					}
				} else {
					$name              = $comp ? $comp : ( $person ? $person : $e['title'] );
					$finished          = $e['contract'] && isset( $ended[ $e['contract'] ] );
					$out['created'][]  = array( 'project' => $name, 'email' => $label, 'why' => $finished ? 'New Upwork contract that has already ended — added as Completed' : 'New Upwork contract, no matching project' );
					if ( ! $dry ) {
						$pid = dwdc_save_contact( 0, array( 'name' => $name, 'person' => $person, 'company' => $comp, 'list' => $finished ? 'complete' : 'active', 'price' => $price, 'lead_source' => 'Upwork', 'pay_method' => 'Upwork', 'source' => 'Upwork email', 'jobs' => array( array( 'title' => $e['title'], 'price' => $price, 'date' => $date ) ) ) );
						update_post_meta( $pid, '_dwdc_upwork_contract', $e['contract'] );
						if ( $comp ) {
							$map          = (array) get_option( 'dwds_upwork_map', array() );
							$map[ $comp ] = $pid;
							update_option( 'dwds_upwork_map', $map, false );
						}
						dwdc_add_task( 'New Upwork project from email: ' . $name . ' — add the client’s email and details', $pid );
						$out['created'][ count( $out['created'] ) - 1 ]['id'] = $pid;
					}
				}
			}
		} elseif ( 'ended' === $e['type'] ) {
			$pid = dwdm_by_contract( $e['contract'] );
			if ( ! $pid ) {
				$pid = dwdm_by_title( $e['title'] );
			}
			$label = $e['title'] . ' (paid $' . number_format( $e['paid'] ) . ( $e['agreed'] ? ' of $' . number_format( $e['agreed'] ) : '' ) . ')';
			if ( ! $pid ) {
				$out['check'][] = array( 'email' => $label, 'why' => 'Contract ended, but no project matches it' );
				if ( ! $dry ) {
					dwdc_add_task( 'Upwork contract ended: ' . $e['title'] . ' — which project is this?' );
				}
			} else {
				$list = (string) get_post_meta( $pid, '_dwdc_list', true );
				if ( 'complete' === $list ) {
					$out['skipped'][] = array( 'project' => html_entity_decode( get_the_title( $pid ), ENT_QUOTES ), 'id' => $pid, 'email' => $label, 'why' => 'Contract ended — already Completed' );
				} else {
					$out['completed'][] = array( 'project' => html_entity_decode( get_the_title( $pid ), ENT_QUOTES ), 'id' => $pid, 'email' => $label, 'why' => 'Contract ended — moved to Completed' );
					if ( ! $dry ) {
						dwdc_save_contact( $pid, array( 'list' => 'complete', 'completed' => $e['date'] ) );
					}
				}
				if ( ! $dry && $e['contract'] && ! get_post_meta( $pid, '_dwdc_upwork_contract', true ) ) {
					update_post_meta( $pid, '_dwdc_upwork_contract', $e['contract'] );
				}
			}
		}
		if ( ! $dry && $mid ) {
			$seen[ $mid ] = $date;
		}
	}
	if ( ! $dry ) {
		$cut = gmdate( 'Y-m-d', time() - 120 * DAY_IN_SECONDS );
		update_option( 'dwdm_seen', array_filter( $seen, function ( $d ) use ( $cut ) { return $d >= $cut; } ), false );
		update_option( 'dwdm_offers', array_slice( $offers, -200, null, true ), false );
		update_option( 'dwdm_last', array( 'at' => current_time( 'mysql' ), 'emails' => count( $messages ), 'created' => count( $out['created'] ), 'reopened' => count( $out['reopened'] ), 'completed' => count( $out['completed'] ), 'check' => count( $out['check'] ) ), false );
	}
	return $out;
}

/** The Apps Script Mike pastes into script.google.com (token and link filled in). */
function dwdm_script() {
	$url = rest_url( 'dwd/v1/upwork-mail' );
	$tok = dwdm_token();
	return <<<JS
// Dream Desk · Upwork email sync. Runs Mondays and Thursdays and sends new Upwork
// hire / offer / contract-ended emails to Dream Desk. It only reads mail.
var DREAM_DESK = '{$url}';
var TOKEN = '{$tok}';

function syncUpwork() {
  var q = 'from:upwork.com newer_than:10d (subject:"hired you" OR subject:offer OR subject:"contract has ended" OR subject:"contract ended")';
  var out = [];
  GmailApp.search(q, 0, 100).forEach(function (t) {
    t.getMessages().forEach(function (m) {
      out.push({ id: m.getId(), date: Utilities.formatDate(m.getDate(), 'UTC', "yyyy-MM-dd'T'HH:mm:ss'Z'"), subject: m.getSubject(), body: m.getPlainBody().slice(0, 20000) });
    });
  });
  var r = UrlFetchApp.fetch(DREAM_DESK, { method: 'post', contentType: 'application/json', headers: { 'X-DWD-Token': TOKEN }, payload: JSON.stringify({ messages: out }), muteHttpExceptions: true });
  Logger.log(r.getResponseCode() + ' ' + r.getContentText().slice(0, 2000));
}

// Run this once: it schedules syncUpwork for Monday and Thursday mornings.
function setup() {
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('syncUpwork').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(7).create();
  ScriptApp.newTrigger('syncUpwork').timeBased().onWeekDay(ScriptApp.WeekDay.THURSDAY).atHour(7).create();
  syncUpwork();
}
JS;
}

add_action( 'rest_api_init', function () {
	register_rest_route( 'dwd/v1', '/upwork-mail', array(
		'methods'             => 'POST',
		'permission_callback' => function ( $r ) {
			$t = (string) $r->get_header( 'x_dwd_token' );
			return '' !== $t && hash_equals( dwdm_token(), $t );
		},
		'callback'            => function ( $r ) {
			$d    = (array) $r->get_json_params();
			$msgs = array_slice( (array) ( $d['messages'] ?? array() ), 0, 300 );
			return dwdm_apply( $msgs, ! empty( $d['dry_run'] ) );
		},
	) );
	register_rest_route( 'dwd/v1', '/crm/upwork-mail', array(
		'methods'             => 'GET',
		'permission_callback' => function () { return current_user_can( 'manage_options' ); },
		'callback'            => function () {
			return array( 'script' => dwdm_script(), 'last' => get_option( 'dwdm_last', null ) );
		},
	) );
} );
