<?php
/**
 * Pages that look like the homepage.
 *
 * - City pages for Google Ads and local search (Stuart, Port St. Lucie, Jupiter, Palm City, Vero Beach, Fort Pierce):
 *   the homepage itself with the city in the headline, page title and description, plus a short local section.
 * - Interior pages (Process, Hosting, Portfolio, Contact, Quote): the homepage's hero (Process, Hosting, Portfolio)
 *   and its shared sections after the page's own content: Google/Upwork stats, the reviews slider, About me and the
 *   pricing band.
 *
 * The sections are read from the homepage as it renders, so a change to the homepage shows on these pages too.
 */
defined( 'ABSPATH' ) || exit;

/** The city pages: slug => [ city, nearby areas ]. Each gets a WordPress page (see dwdhl_ensure_pages). */
function dwdhl_cities() {
	return array(
		'stuart-web-design'        => array( 'Stuart', array( 'Palm City', 'Jensen Beach', 'Port Salerno', 'Hobe Sound', 'Sewall’s Point', 'Hutchinson Island' ) ),
		'port-st-lucie-web-design' => array( 'Port St. Lucie', array( 'Tradition', 'St. Lucie West', 'Fort Pierce', 'Jensen Beach', 'Stuart' ) ),
		'jupiter-web-design'       => array( 'Jupiter', array( 'Tequesta', 'Juno Beach', 'Palm Beach Gardens', 'Hobe Sound', 'Stuart' ) ),
		'palm-city-web-design'     => array( 'Palm City', array( 'Stuart', 'Martin Downs', 'Jensen Beach', 'Port St. Lucie' ) ),
		'vero-beach-web-design'    => array( 'Vero Beach', array( 'Sebastian', 'Indian River Shores', 'Fellsmere', 'Fort Pierce' ) ),
		'fort-pierce-web-design'   => array( 'Fort Pierce', array( 'Port St. Lucie', 'Hutchinson Island', 'Vero Beach', 'Stuart' ) ),
		'west-palm-beach-web-design' => array( 'West Palm Beach', array( 'Palm Beach', 'Riviera Beach', 'Lake Worth Beach', 'Palm Beach Gardens', 'Wellington', 'Jupiter' ) ),
		// The whole region: for "near me" and general Treasure Coast searches.
		'treasure-coast-web-design' => array( 'Treasure Coast', array( 'Stuart', 'Port St. Lucie', 'Jensen Beach', 'Palm City', 'Hobe Sound', 'Fort Pierce', 'Vero Beach', 'Sebastian', 'Jupiter' ) ),
	);
}

/** "in Stuart" for a city, "on the Treasure Coast" for the region. */
function dwdhl_in( $city, $html = true ) {
	$n = $html ? '<span style="white-space:nowrap">' . esc_html( $city ) . '</span>' : $city;
	return 'Treasure Coast' === $city ? 'on the ' . $n : 'in ' . $n;
}

/** The city page being viewed: [ slug, city, nearby ] or null. */
function dwdhl_city_now() {
	if ( ! is_page() ) {
		return null;
	}
	$slug = (string) get_post_field( 'post_name', get_queried_object_id() );
	$all  = dwdhl_cities();
	return isset( $all[ $slug ] ) ? array( $slug, $all[ $slug ][0], $all[ $slug ][1] ) : null;
}

/** Create any missing city page (published, with its SEO title and description). Runs once per version. */
add_action( 'init', function () {
	if ( get_option( 'dwdhl_pages_v' ) === DWDP_VERSION ) {
		return;
	}
	foreach ( dwdhl_cities() as $slug => $c ) {
		$p  = get_page_by_path( $slug, OBJECT, 'page' );
		if ( $p && 'publish' !== $p->post_status ) {
			wp_update_post( array( 'ID' => $p->ID, 'post_status' => 'publish' ) ); // an older draft with this address
		}
		$id = $p ? (int) $p->ID : (int) wp_insert_post( array( 'post_type' => 'page', 'post_status' => 'publish', 'post_title' => $c[0] . ' Web Design', 'post_name' => $slug, 'post_content' => '' ) );
		if ( $id ) {
			update_post_meta( $id, '_yoast_wpseo_title', $c[0] . ' Web Design | Custom Websites | Dream Web Digital' );
			delete_post_meta( $id, '_yoast_wpseo_meta-robots-noindex' ); // findable on Google
			update_post_meta( $id, '_yoast_wpseo_metadesc', 'Treasure Coast' === $c[0]
				? 'Web designer on Florida’s Treasure Coast (Stuart, Port St. Lucie, Jensen Beach, Vero Beach) building custom websites for local businesses. 5.0★ on Google, 500+ sites built. Free quote, same-day replies.'
				: $c[0] . ', FL web designer building custom websites for local businesses. 5.0★ on Google, 100% Job Success on Upwork, 500+ sites built. Free quote, same-day replies.' );
		}
	}
	update_option( 'dwdhl_pages_v', DWDP_VERSION, false );
}, 30 );

/** The homepage as it renders (hero slider, intro video, reviews), built once per request. */
function dwdhl_home() {
	static $h = null;
	if ( null === $h ) {
		$h = dwdr_render( 'home' );
		$h = dwdr_intro_video( $h );
		$h = str_replace( '%SHOTPLANE%', dwdr_shotplane(), $h );
		$h = dwdr_hero_track( $h );
	}
	return $h;
}

/** [ start, end ] of the whole <section> that contains $marker in $html, or null. */
function dwdhl_section_at( $html, $marker ) {
	$m = strpos( $html, $marker );
	if ( false === $m ) {
		return null;
	}
	$a = strrpos( substr( $html, 0, $m + strlen( $marker ) ), '<section' ); // the marker may itself start the tag
	if ( false === $a ) {
		return null;
	}
	$d = 0;
	$k = $a;
	while ( true ) {
		$o  = strpos( $html, '<section', $k + 1 );
		$cl = strpos( $html, '</section>', $k + 1 );
		if ( false === $cl ) {
			return null;
		}
		if ( false !== $o && $o < $cl ) {
			$d++;
			$k = $o;
		} elseif ( 0 === $d ) {
			return array( $a, $cl + 10 );
		} else {
			$d--;
			$k = $cl;
		}
	}
}

/** One homepage section: top (hero), reviews (stats), quotes, about, skills, pricing. */
function dwdhl_part( $key ) {
	$marks = array(
		'top'     => '<section id="top"',
		'reviews' => 'id="reviews"',
		'quotes'  => 'class="dwr-qband"',
		'about'   => 'id="about"',
		'skills'  => 'id="skills"',
		'pricing' => 'class="dwr-band dwr-band-dark"',
	);
	$h = dwdhl_home();
	$r = isset( $marks[ $key ] ) ? dwdhl_section_at( $h, $marks[ $key ] ) : null;
	return $r ? substr( $h, $r[0], $r[1] - $r[0] ) : '';
}

/** Replace the inner HTML of the $n-th (1-based) <p> after $from in $html. */
function dwdhl_set_p( $html, $from, $n, $inner ) {
	$i = strpos( $html, $from );
	if ( false === $i ) {
		return $html;
	}
	for ( $k = 0; $k < $n; $k++ ) {
		$i = strpos( $html, '<p', $i + ( $k ? 2 : 0 ) );
		if ( false === $i ) {
			return $html;
		}
	}
	$o = strpos( $html, '>', $i ) + 1;
	$c = strpos( $html, '</p>', $o );
	return substr( $html, 0, $o ) . $inner . substr( $html, $c );
}

/**
 * The homepage hero with other words: $l1 (the thin first line), $l2 (the blue second line), the two lines of text
 * under it, and the strip of website screenshots at the bottom ($media) or not.
 */
function dwdhl_hero( $l1, $l2, $lead, $sub, $media = true ) {
	$h  = dwdhl_part( 'top' );
	$a  = strpos( $h, '<h1' );
	$b  = strpos( $h, '</h1>', (int) $a );
	if ( false !== $a && false !== $b ) {
		$a  = strpos( $h, '>', $a ) + 1;
		$h1 = "\n    " . '<span style="display:block;overflow:hidden;padding-bottom:.08em;margin-bottom:-.08em"><span data-dw-line="1" data-dw-slide="left" data-dw-fit=".74" style="font-size:.74em;font-weight:300;white-space:nowrap">' . $l1 . '</span></span>'
			. "\n    " . '<span style="display:block;overflow:hidden;padding-bottom:.08em;margin-bottom:-.08em"><span data-dw-line="1" data-dw-slide="right" data-dw-fit="1" style="color:#13A6EE;transition-delay:.12s;white-space:nowrap">' . $l2 . '</span></span>' . "\n  ";
		$h  = substr( $h, 0, $a ) . $h1 . substr( $h, $b );
	}
	$h = dwdhl_set_p( $h, '<div id="dw-hero-row"', 1, $lead );
	$h = dwdhl_set_p( $h, '<div id="dw-hero-row"', 2, $sub );

	if ( ! $media ) {
		$m = strpos( $h, '<div id="dw-hero-media"' );
		if ( false !== $m ) {
			$h = substr( $h, 0, $m ) . substr( $h, dwdr_div_end( $h, $m ) );
		}
	}
	return $h;
}

/** Each headline line marked data-dw-fit stays on one line: the font shrinks until it fits the width (never wraps). */
function dwdhl_fit_js() {
	return '<script>(function(){function fit(){document.querySelectorAll("[data-dw-fit]").forEach(function(s){var h=s.closest("h1");if(!h)return;s.style.fontSize=s.getAttribute("data-dw-fit")+"em";var c=h.parentElement,cs=getComputedStyle(c),w=c.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight),sw=Math.max(s.getBoundingClientRect().width,s.scrollWidth,(s.firstElementChild&&s.firstElementChild.scrollWidth)||0);if(sw>w&&w>0){s.style.fontSize=(parseFloat(getComputedStyle(s).fontSize)*w/sw*0.97)+"px";}});}fit();window.addEventListener("resize",fit);window.addEventListener("load",fit);if(document.fonts&&document.fonts.ready){document.fonts.ready.then(fit);}})();</script>';
}

/** The homepage sections shown after an interior page's own content. */
function dwdhl_tail( $keys ) {
	return implode( '', array_map( 'dwdhl_part', $keys ) );
}

/** Interior pages: homepage hero and sections. Called from dwdr_body() with the page's rendered HTML. */
function dwdhl_apply( $page, $html ) {
	$cfg = array(
		'process'   => array( 'How your website', 'gets built.', 'My web design process, step by step.', 'Here is what to expect, from our first conversation through launch day and beyond. Six steps, one person handling all of them.', true, array( 'reviews', 'quotes', 'about', 'pricing' ) ),
		'hosting'   => array( 'Managed WordPress', 'hosting.', 'Fast, secure hosting for the websites I build.', 'I set up, secure and monitor your hosting personally. There is no ticket system: if something needs attention, you call or text me, and I take care of it. One flat annual rate with no long-term contract. Cancel anytime.', true, array( 'reviews', 'quotes', 'about' ) ),
		'portfolio' => array( 'Websites built', 'for real businesses.', 'Custom websites, built by hand.', 'In the past 12 years, I’ve built over 500 websites. Below is a selection of recent favorites. Every one is live; click any project to view the full site.', false, array( 'reviews', 'quotes', 'about', 'pricing' ) ),
		'contact'   => array( '', '', '', '', false, array( 'reviews', 'quotes', 'about', 'pricing' ) ),
		'quote'     => array( '', '', '', '', false, array( 'reviews', 'quotes', 'about' ) ),
	);
	if ( ! isset( $cfg[ $page ] ) ) {
		return $html;
	}
	list( $l1, $l2, $lead, $sub, $media, $tail ) = $cfg[ $page ];
	// The page's own hero becomes the homepage hero (Contact and Quote keep theirs: the form is in it).
	if ( '' !== $l1 ) {
		$r = dwdhl_section_at( $html, '<section' );
		if ( $r ) {
			$hero = dwdhl_hero( $l1, $l2, $lead, $sub, $media );
			// Portfolio: its All / WordPress / Webflow / category filter moves to the bottom of the new hero.
			$f = strpos( $html, '<div id="pf-filter"' );
			if ( false !== $f && $f < $r[1] ) {
				$filter = substr( $html, $f, dwdr_div_end( $html, $f ) - $f );
				$filter = str_replace( 'justify-content:flex-end', 'justify-content:center', $filter );
				// Light pills: they sit in the white area, right above the projects.
				$filter = str_replace( array( 'border:1px solid #3A3A3A;background:transparent;color:#fff', 'border:1px solid #13A6EE;background:#13A6EE;color:#fff' ), array( 'border:1px solid #D6D6D6;background:transparent;color:#121212', 'border:1px solid #13A6EE;background:#13A6EE;color:#fff' ), $filter );
			}
			$html = substr( $html, 0, $r[0] ) . $hero . substr( $html, $r[1] ); // the old hero (and the pills in it) goes
			$g    = isset( $filter ) ? strpos( $html, '<div id="pf-grid"' ) : false;
			if ( false !== $g ) {
				$html = substr_replace( $html, '<div class="dwr-pfwrap dwr-pflight" style="margin:0 0 clamp(40px,5vw,72px)">' . $filter . '</div>', $g, 0 );
			}
		}
	}
	// The homepage sections go before the page's closing call to action band, or at the end.
	$add = dwdhl_tail( $tail ) . dwdr_quotes_js() . dwdhl_fit_js();
	$j   = strrpos( $html, '<section data-theme="light" class="dwr-band dwr-band-light' );
	return false !== $j ? substr_replace( $html, $add, $j, 0 ) : $html . $add;
}

/** A city page: the homepage with the city in the headline and text, and a local section. */
function dwdhl_city_page() {
	$c = dwdhl_city_now();
	if ( ! $c ) {
		return '';
	}
	list( $slug, $city, $near ) = $c;
	$e    = '<span style="white-space:nowrap">' . esc_html( $city ) . '</span>'; // the city name never breaks across two lines
	$html = dwdhl_home() . dwdr_quotes_js() . dwdhl_fit_js();
	$r    = dwdhl_section_at( $html, '<section id="top"' );
	if ( $r ) {
		$region = 'Treasure Coast' === $city;
		$hero = dwdhl_hero( '<span style="white-space:nowrap">Web design ' . esc_html( dwdhl_in( $city, false ) ) . '.</span>', 'Built by hand.', 'Custom Website Designer &amp; Developer ' . ( $region ? 'on Florida’s ' . $e : 'in ' . $e . ', FL' ) . '.', 'I personally design, build and optimize every website for ' . $e . ' businesses, from the first call to launch day and beyond. Based in Stuart on the Treasure Coast, with 500+ websites, 12+ years and a 100% Job Success Score on Upwork.', true );
		$html = substr( $html, 0, $r[0] ) . $hero . substr( $html, $r[1] );
	}
	$chips = implode( '', array_map( function ( $n ) { return '<li>' . esc_html( $n ) . '</li>'; }, array_merge( array( $city ), $near ) ) );
	$local = '<section data-theme="light" data-nocta="1" class="dwr-local" style="background:#fff;color:#121212;padding:clamp(72px,9vw,140px) clamp(20px,4vw,56px)">'
		. '<div class="dwr-local-in" data-dw-reveal="1"><span class="dwr-eyebrow"><i></i>Local to the Treasure Coast</span>'
		. '<h2 class="dwr-band-h">Websites for ' . $e . ' <span>businesses.</span></h2>'
		. '<p class="dwr-band-p">You work with me directly, from the first call to launch day and every update after. No account managers, no outsourcing, no templates: a custom website designed around your business and built to bring in calls and quote requests from ' . $e . ' and beyond.</p>'
		. '<p class="dwr-local-k">Serving ' . $e . ' and nearby</p><ul class="dwr-local-l">' . $chips . '</ul></div></section>';
	$s = strpos( $html, '<section data-nocta="1" id="services"' );
	$html = false !== $s ? substr_replace( $html, $local, $s, 0 ) : $html . $local;
	$ct = strpos( $html, '<section id="contact"' );
	$faq = dwdhl_city_extra( $slug, $city );
	$html = false !== $ct ? substr_replace( $html, $faq, $ct, 0 ) : $html . $faq;
	// Search engines: this page is a web design service for this city.
	$ld = array(
		'@context'   => 'https://schema.org',
		'@type'      => 'Service',
		'name'       => $city . ' Web Design',
		'serviceType' => 'Website design and development',
		'url'        => get_permalink(),
		'areaServed' => array_map( function ( $n ) { return 'Treasure Coast' === $n ? array( '@type' => 'Place', 'name' => 'Treasure Coast, Florida' ) : array( '@type' => 'City', 'name' => $n . ', FL' ); }, array_merge( array( $city ), $near ) ),
		'description' => 'Custom website design and development for ' . $city . ', FL businesses by Michael Tarr of Dream Web Digital: unlimited revisions, no templates, on-page SEO, 2 months of support and a lifetime workmanship warranty.',
		'offers'     => array( '@type' => 'Offer', 'priceCurrency' => 'USD', 'priceSpecification' => array( '@type' => 'PriceSpecification', 'minPrice' => 1500, 'maxPrice' => 7000, 'priceCurrency' => 'USD' ) ),
		'provider'   => array( '@type' => 'ProfessionalService', 'name' => 'Dream Web Digital', 'founder' => array( '@type' => 'Person', 'name' => 'Michael Tarr' ), 'sameAs' => array( dwdhl_greviews_url(), 'https://www.upwork.com/freelancers/dreamwebdigital' ), 'url' => home_url( '/' ), 'telephone' => '+1-772-210-1728', 'address' => array( '@type' => 'PostalAddress', 'streetAddress' => '789 SW Federal Hwy, Suite 201', 'addressLocality' => 'Stuart', 'addressRegion' => 'FL', 'postalCode' => '34994', 'addressCountry' => 'US' ) ),
	);
	return $html . '<script type="application/ld+json">' . wp_json_encode( $ld ) . '</script>';
}

/** Your Google reviews (Google Business Profile). */
function dwdhl_greviews_url() {
	return 'https://maps.app.goo.gl/z4HfYnTZaqccWhhy9';
}

/**
 * Every mention of the Google reviews on a page links to them: the hero rating bar, the stats, the project scores,
 * the review cards, the About photo caption and the bio. Applied to each page as it renders (layout.php).
 */
function dwdhl_google_links( $html ) {
	$g = esc_url( dwdhl_greviews_url() );
	$a = '<a href="' . $g . '" target="_blank" rel="noopener" title="Read my Google reviews"';
	$rules = array(
		// hero rating bar: "★★★★★ 4.9 on Google"
		'#<div class="dwr-tstat">((?:(?!</div>).)*?on Google)</div>#s' => $a . ' class="dwr-tstat dwr-glink">$1</a>',
		// stats: "4.9 · average rating on Google"
		'#<div>(<b>4\.9</b>(?:(?!</div>).)*?(?:A|a)verage rating on Google</span>)</div>#s' => $a . ' class="dwr-glink">$1</a>',
		// project scores: "★ 5.0 · Google review" / "Stars on Google"
		'#<span>(<b><i>★</i>5\.0</b><small>(?:Google review|Stars on Google)</small>)</span>#' => '<span>' . $a . ' class="dwr-glink" style="display:contents;color:inherit;text-decoration:none">$1</a></span>',
		// review cards: the Google logo label, and "· Google review" after the name
		'#<span class="dwr-qsrc">(<svg[^>]*viewBox="0 0 48 48"(?:(?!</span>).)*?Google)</span>#s' => $a . ' class="dwr-qsrc dwr-glink">$1</a>',
		'#, Google review(?=\s*<)#' => ', ' . $a . ' class="dwr-glink">Google review</a>', // project page quote: "— The Goods Vending, Google review"
		'# · Google review</span>#' => ' · ' . $a . ' class="dwr-glink">Google review</a></span>',
		// About photo caption and the bio
		'#(<span style="color:\#F5B301">★</span> 5\.0 on Google)#' => $a . ' class="dwr-glink">$1</a>',
		'#5 stars on Google#' => $a . ' class="dwr-glink">5 stars on Google</a>',
	);
	foreach ( $rules as $re => $to ) {
		$html = preg_replace( $re, $to, $html );
	}
	return $html;
}

/** Questions people (and AI search) ask about web design in a city: shown on the page and marked up as an FAQ. */
function dwdhl_city_faq( $city ) {
	return array(
		'How much does a website cost ' . dwdhl_in( $city, false ) . '?' => 'Most websites run $1,500 to $7,000, depending on the pages and features you need. You get one flat quote up front, so the price never creeps.',
		'Do you work with ' . $city . ' businesses?'      => 'Yes. I’m based in Stuart on the Treasure Coast and work with ' . $city . ' businesses by Zoom and phone. You work with me directly, and you can call or text me at (772) 210-1728.',
		'What’s included with every website?'            => 'Unlimited revisions, a custom design with no templates, a fully responsive build for every device, on-page SEO, WordPress security setup, 1-on-1 training, 2 months of support after launch and a lifetime workmanship warranty.',
		'Will my website show up on Google and in AI search?' => 'Every page is built for search: one clear headline, a title and description, image alt text, structured data, and fast load times, with a 95+ Google PageSpeed score on every site I build.',
		'Do you offer website hosting?'                   => 'Yes. Managed WordPress hosting for the sites I build, at one flat annual rate with no long-term contract. You can also launch on your existing host.',
	);
}

/** The FAQ section and the links to the other city pages, for a city page. */
function dwdhl_city_extra( $slug, $city ) {
	$e   = esc_html( $city );
	$faq = dwdhl_city_faq( $city );
	$qa  = '';
	foreach ( $faq as $q => $an ) {
		$qa .= '<details class="dwr-faq-i"><summary>' . esc_html( $q ) . '</summary><p>' . esc_html( $an ) . '</p></details>';
	}
	$others = '';
	foreach ( dwdhl_cities() as $s => $c ) {
		if ( $s !== $slug ) {
			$others .= '<li><a href="' . esc_url( home_url( '/' . $s . '/' ) ) . '">' . esc_html( $c[0] ) . ' web design</a></li>';
		}
	}
	$html = '<section data-theme="light" data-nocta="1" class="dwr-faq" style="background:#F6F7F9;color:#121212;padding:clamp(72px,9vw,140px) clamp(20px,4vw,56px)">'
		. '<div class="dwr-faq-in" data-dw-reveal="1"><span class="dwr-eyebrow"><i></i>Questions</span><h2 class="dwr-band-h">' . $e . ' web design <span>questions.</span></h2>'
		. '<div class="dwr-faq-l">' . $qa . '</div>'
		. '<p class="dwr-local-k">Also serving the Treasure Coast</p><ul class="dwr-local-l dwr-cities">' . $others . '</ul></div></section>';
	$ld = array(
		'@context'   => 'https://schema.org',
		'@type'      => 'FAQPage',
		'mainEntity' => array_map( function ( $q, $an ) { return array( '@type' => 'Question', 'name' => $q, 'acceptedAnswer' => array( '@type' => 'Answer', 'text' => $an ) ); }, array_keys( $faq ), array_values( $faq ) ),
	);
	return $html . '<script type="application/ld+json">' . wp_json_encode( $ld ) . '</script>';
}
