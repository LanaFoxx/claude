<?php
/**
 * Reads the client's live site when screenshots are captured and suggests the project name,
 * industry label and short description. The editor only fills fields that are still empty.
 */
defined( 'ABSPATH' ) || exit;

add_action( 'wp_ajax_dwdp_site_info', function () {
	dwdp_check_request();
	$url = esc_url_raw( isset( $_POST['url'] ) ? wp_unslash( $_POST['url'] ) : '' ); // phpcs:ignore
	if ( ! $url ) {
		wp_send_json_error( array( 'message' => 'No website address.' ) );
	}
	$res = wp_remote_get(
		$url,
		array(
			'timeout'             => 20,
			'redirection'         => 5,
			'limit_response_size' => 1500000,
			'user-agent'          => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
		)
	);
	if ( is_wp_error( $res ) || 200 !== (int) wp_remote_retrieve_response_code( $res ) ) {
		wp_send_json_error( array( 'message' => 'Could not read the site.' ) );
	}
	wp_send_json_success( dwdp_site_info( wp_remote_retrieve_body( $res ) ) );
} );

/** Pull the name, industry and a one-to-two sentence description out of a page's HTML. */
function dwdp_site_info( $html ) {
	$meta = function ( $attr, $name ) use ( $html ) {
		if ( preg_match( '/<meta[^>]+' . $attr . '=["\']' . preg_quote( $name, '/' ) . '["\'][^>]*>/i', $html, $m ) && preg_match( '/content=["\']([^"\']*)["\']/i', $m[0], $c ) ) {
			return dwdp_clean_text( $c[1] );
		}
		return '';
	};
	$title = preg_match( '/<title[^>]*>(.*?)<\/title>/is', $html, $m ) ? dwdp_clean_text( $m[1] ) : '';
	$desc  = $meta( 'name', 'description' );
	if ( ! $desc ) {
		$desc = $meta( 'property', 'og:description' );
	}

	// Schema.org types and names from JSON-LD (Yoast, Rank Math and most SEO plugins add these).
	$types = array();
	$name  = $meta( 'property', 'og:site_name' );
	if ( preg_match_all( '/<script[^>]+application\/ld\+json[^>]*>(.*?)<\/script>/is', $html, $blocks ) ) {
		foreach ( $blocks[1] as $json ) {
			$data = json_decode( trim( $json ), true );
			array_walk_recursive(
				$data,
				function ( $v, $k ) use ( &$types ) {
					if ( '@type' === $k && is_string( $v ) ) {
						$types[] = $v;
					}
				}
			);
			if ( ! $name && is_array( $data ) ) {
				$graph = isset( $data['@graph'] ) ? $data['@graph'] : array( $data );
				foreach ( (array) $graph as $node ) {
					if ( isset( $node['@type'], $node['name'] ) && in_array( 'WebSite', (array) $node['@type'], true ) ) {
						$name = dwdp_clean_text( $node['name'] );
					}
				}
			}
		}
	}
	if ( ! $name && $title ) {
		$parts = preg_split( '/\s+[|\-–—:•·]\s+/u', $title );
		$name  = trim( end( $parts ) );
		if ( strlen( $name ) > 40 ) {
			$name = trim( $parts[0] );
		}
	}

	// Visible text: headings count more than body copy.
	$body  = preg_replace( '/<(script|style|noscript|svg|nav|footer)[^>]*>.*?<\/\1>/is', ' ', $html );
	$heads = preg_match_all( '/<h[12][^>]*>(.*?)<\/h[12]>/is', $body, $hm ) ? dwdp_clean_text( implode( ' . ', $hm[1] ) ) : '';
	$text  = dwdp_clean_text( wp_strip_all_tags( $body ) );

	$industry = dwdp_guess_industry( $types, $title . ' ' . $desc, $heads, $text );

	if ( ! $desc ) {
		// No meta description: use the first paragraph that reads like a sentence.
		if ( preg_match_all( '/<p[^>]*>(.*?)<\/p>/is', $body, $pm ) ) {
			foreach ( $pm[1] as $p ) {
				$p = dwdp_clean_text( $p );
				if ( strlen( $p ) > 60 && preg_match( '/[a-z]{3,}.*[.!]$/', $p ) ) {
					$desc = $p;
					break;
				}
			}
		}
	}
	$summary = dwdp_short_summary( $desc );
	if ( ! $summary && $industry ) {
		$summary = 'Custom website for a ' . strtolower( $industry ) . ', built to turn visitors into customers.';
	}

	return array(
		'name'     => $name,
		'industry' => $industry,
		'summary'  => $summary,
	);
}

function dwdp_clean_text( $s ) {
	$s = html_entity_decode( wp_strip_all_tags( (string) $s ), ENT_QUOTES | ENT_HTML5, 'UTF-8' );
	return trim( preg_replace( '/\s+/u', ' ', $s ) );
}

/** First one or two sentences, at most about 220 characters. */
function dwdp_short_summary( $desc ) {
	$desc = trim( $desc );
	if ( '' === $desc ) {
		return '';
	}
	$sentences = preg_split( '/(?<=[.!?])\s+/', $desc );
	$out       = '';
	foreach ( $sentences as $s ) {
		if ( '' !== $out && strlen( $out . ' ' . $s ) > 220 ) {
			break;
		}
		$out = trim( $out . ' ' . $s );
	}
	if ( strlen( $out ) > 240 ) {
		$out = rtrim( wp_html_excerpt( $out, 220 ), " ,;:-" ) . '…';
	}
	return $out;
}

/** Score each industry by schema type and keyword hits; return the best label or ''. */
function dwdp_guess_industry( $types, $meta_text, $heads, $text ) {
	$map = array(
		'Law firm'                => array( array( 'LegalService', 'Attorney', 'LawFirm' ), '/\b(attorneys?|law firm|lawyers?|legal services?|injury law|litigation)\b/i' ),
		'Dental practice'         => array( array( 'Dentist' ), '/\b(dentist|dental|orthodont\w*)\b/i' ),
		'Mental health practice'  => array( array(), '/\b(mental health|therapy|therapist|counseling|psychiatr\w*|psycholog\w*)\b/i' ),
		'Medical records services' => array( array(), '/\b(medical records?|records? retrieval|record requests?)\b/i' ),
		'Medical practice'        => array( array( 'MedicalBusiness', 'Physician', 'MedicalClinic', 'MedicalOrganization' ), '/\b(doctors?|physicians?|medical|clinic|patients?|healthcare)\b/i' ),
		'Roofing company'         => array( array( 'RoofingContractor' ), '/\b(roof\w*)\b/i' ),
		'Remodeling contractor'   => array( array(), '/\b(remodel\w*|renovation\w*|kitchen and bath)\b/i' ),
		'Construction company'    => array( array( 'GeneralContractor', 'HomeAndConstructionBusiness' ), '/\b(construction|general contractor|builders?|contractors?)\b/i' ),
		'Home services'           => array( array( 'Plumber', 'Electrician', 'HVACBusiness', 'HousePainter', 'Locksmith' ), '/\b(plumb\w*|hvac|electrician|pest control|landscap\w*|pressure washing|pool service)\b/i' ),
		'Accounting firm'         => array( array( 'AccountingService' ), '/\b(accounting|bookkeeping|cpa|tax preparation|payroll)\b/i' ),
		'Financial advisor'       => array( array( 'FinancialService' ), '/\b(retirement|financial (advisor|planning|planner)|wealth management|investments?)\b/i' ),
		'Insurance agency'        => array( array( 'InsuranceAgency' ), '/\b(insurance)\b/i' ),
		'Real estate'             => array( array( 'RealEstateAgent' ), '/\b(real estate|realtors?|homes for sale|property management)\b/i' ),
		'Restaurant'              => array( array( 'Restaurant', 'FoodEstablishment', 'CafeOrCoffeeShop', 'BarOrPub' ), '/\b(restaurant|menu|dine|dining|cafe|catering)\b/i' ),
		'Fitness brand'           => array( array( 'ExerciseGym', 'SportsActivityLocation' ), '/\b(fitness|gym|workouts?|personal train\w*|strength training|pilates|yoga)\b/i' ),
		'Salon & spa'             => array( array( 'BeautySalon', 'HairSalon', 'DaySpa', 'HealthAndBeautyBusiness' ), '/\b(salon|spa|barber\w*|nails|med ?spa|aesthetic\w*)\b/i' ),
		'Flight school'           => array( array(), '/\b(flight school|flight training|pilot training|paraglid\w*|aviation)\b/i' ),
		'Vending services'        => array( array(), '/\b(vending|micro markets?|snack and drink)\b/i' ),
		'Auto services'           => array( array( 'AutomotiveBusiness', 'AutoRepair', 'AutoDealer' ), '/\b(auto repair|auto body|car dealer\w*|detailing|automotive)\b/i' ),
		'Marketing agency'        => array( array(), '/\b(marketing agency|digital marketing|branding agency|seo services)\b/i' ),
		'Nonprofit'               => array( array( 'NGO' ), '/\b(nonprofit|non-profit|501\(c\)|donate|charity)\b/i' ),
		'Church'                  => array( array( 'Church' ), '/\b(church|ministry|worship)\b/i' ),
		'Education'               => array( array( 'EducationalOrganization', 'School' ), '/\b(school|academy|tutoring|courses|students)\b/i' ),
		'Retail store'            => array( array( 'Store', 'ClothingStore' ), '/\b(shop now|store locator|our stores?|boutique|retail|thrift)\b/i' ),
		'Consulting company'      => array( array( 'ProfessionalService' ), '/\b(consult\w*|advisory)\b/i' ),
	);
	// Broad labels only win when nothing more specific stands out.
	$broad = array( 'Medical practice', 'Education', 'Nonprofit', 'Consulting company', 'Construction company', 'Retail store' );
	$best  = '';
	$score = 0;
	foreach ( $map as $label => $rule ) {
		$s = 4 * count( array_intersect( $rule[0], $types ) );
		$s += 3 * preg_match_all( $rule[1], $meta_text );
		$s += 2 * preg_match_all( $rule[1], $heads );
		$s += min( 6, preg_match_all( $rule[1], $text ) );
		if ( in_array( $label, $broad, true ) ) {
			$s *= 0.6;
		}
		if ( $s > $score ) {
			$best  = $label;
			$score = $s;
		}
	}
	return $score >= 3 ? $best : '';
}
