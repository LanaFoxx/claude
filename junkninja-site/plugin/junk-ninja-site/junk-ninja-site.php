<?php
/**
 * Plugin Name: Junk Ninja Site
 * Description: Speed, SEO and AI-search support for the Junk Ninja Elementor site: lean front-end assets, LCP and font preloads, title/meta/Open Graph, LocalBusiness + Service + FAQ structured data, AI-crawler friendly robots.txt, /llms.txt, and the services hover behaviour. Deactivate to undo everything.
 * Version: 1.0.0
 * Author: Dream Web Digital
 * Requires PHP: 7.4
 */

defined( 'ABSPATH' ) || exit;

/* ------------------------------------------------------------------ data */

function jn_business() {
	return array(
		'name'        => 'Junk Ninja LLC',
		'slogan'      => 'Clutter Removed, Serenity Restored',
		'phone'       => '+1-772-882-5955',
		'phone_human' => '772-882-5955',
		'email'       => 'junkninjallc@gmail.com',
		'facebook'    => 'https://www.facebook.com/profile.php?id=61569525440522',
		'hours'       => '6am–9pm, 7 days a week',
		'title'       => 'Junk Removal Port St. Lucie & Treasure Coast FL | Junk Ninja LLC',
		'description' => 'Licensed and insured junk removal in Port St. Lucie, Stuart, Fort Pierce and the Treasure Coast. Text us photos for a fast estimate. Call 772-882-5955.',
		'about'       => 'Junk Ninja LLC is a licensed and insured junk removal company in Port St. Lucie, Florida, serving homeowners, realtors, property managers and businesses across the Treasure Coast. Customers text photos of what needs to go to 772-882-5955 (or upload them with the online quote form) and get a quote; no photos, and the crew comes to take a look. Open 6am–9pm, 7 days a week.',
		'towns'       => array( 'Port Saint Lucie', 'Palm City', 'Jensen Beach', 'Stuart', 'Fort Pierce', 'Hobe Sound', 'Jupiter', 'Okeechobee' ),
		'services'    => array(
			'Residential Junk Removal'    => 'Unwanted household items and general clutter.',
			'Furniture Removal'           => 'Couches, mattresses, tables, dressers, and more.',
			'Appliance Removal'           => 'Refrigerators, washers, dryers, stoves, and other appliances.',
			'Garage Cleanouts'            => 'Clearing unwanted items from garages.',
			'House & Estate Cleanouts'    => 'Partial or complete home cleanouts, inherited properties and estates.',
			'Realtor & Rental Cleanouts'  => 'Preparing properties for sale, rental, or turnover.',
			'Yard Waste Removal'          => 'Branches, vegetation, and landscaping debris.',
			'Construction Debris Removal' => 'Hauling renovation and remodeling debris.',
			'Storm & Flood Debris'        => 'Storm debris and flood-damaged items.',
			'Hot Tub Removal'             => 'Broken hot tubs and spas taken apart and hauled away.',
		),
		// Must match the FAQ shown on the home page.
		'faq'         => array(
			'How much does it cost?'  => 'Every job is different, so we quote from your photos or a quick visit. Text photos to 772-882-5955 or upload them with our quote form.',
			'What do you remove?'     => 'Household junk, furniture, appliances, yard waste, construction debris, electronics and storm debris. We also do garage, house, estate, rental and storage unit cleanouts.',
			'How soon can you do it?' => "It depends on the job and our schedule. Text photos to 772-882-5955 and we'll let you know when we can get to you.",
		),
	);
}

function jn_attachment_url( $slug, $size = 'full' ) {
	static $cache = array();
	$key = $slug . '|' . $size;
	if ( ! isset( $cache[ $key ] ) ) {
		$posts         = get_posts( array( 'post_type' => 'attachment', 'name' => $slug, 'numberposts' => 1, 'fields' => 'ids' ) );
		$cache[ $key ] = $posts ? wp_get_attachment_image_url( $posts[0], $size ) : '';
	}
	return $cache[ $key ];
}

/* ----------------------------------------------------------- performance */

add_action( 'init', function () {
	// Emoji script and styles.
	remove_action( 'wp_head', 'print_emoji_detection_script', 7 );
	remove_action( 'wp_print_styles', 'print_emoji_styles' );
	remove_action( 'admin_print_scripts', 'print_emoji_detection_script' );
	remove_action( 'admin_print_styles', 'print_emoji_styles' );
	remove_filter( 'the_content_feed', 'wp_staticize_emoji' );
	remove_filter( 'comment_text_rss', 'wp_staticize_emoji' );
	remove_filter( 'wp_mail', 'wp_staticize_emoji_for_email' );
	add_filter( 'emoji_svg_url', '__return_false' );
	// Head clutter.
	remove_action( 'wp_head', 'rsd_link' );
	remove_action( 'wp_head', 'wlwmanifest_link' );
	remove_action( 'wp_head', 'wp_generator' );
	remove_action( 'wp_head', 'wp_shortlink_wp_head' );
	remove_action( 'template_redirect', 'wp_shortlink_header', 11 );
	remove_action( 'wp_head', 'feed_links_extra', 3 );
	remove_action( 'wp_head', 'wp_oembed_add_discovery_links' );
	remove_action( 'wp_head', 'rest_output_link_wp_head' );
	remove_action( 'template_redirect', 'rest_output_link_header', 11 );
} );

// Block-editor styles are unused: every page is built in Elementor.
add_action( 'wp_enqueue_scripts', function () {
	foreach ( array( 'wp-block-library', 'wp-block-library-theme', 'classic-theme-styles', 'global-styles' ) as $h ) {
		wp_dequeue_style( $h );
		wp_deregister_style( $h );
	}
	if ( ! is_user_logged_in() ) {
		wp_dequeue_style( 'dashicons' );
	}
}, 100 );
remove_action( 'wp_enqueue_scripts', 'wp_enqueue_global_styles' );
remove_action( 'wp_body_open', 'wp_global_styles_render_svg_filters' );
remove_action( 'wp_footer', 'wp_enqueue_global_styles', 1 );

// jQuery in the footer without jQuery Migrate, so it no longer blocks rendering.
add_action( 'wp_default_scripts', function ( $scripts ) {
	if ( is_admin() || ( isset( $_GET['elementor-preview'] ) ) || ( defined( 'REST_REQUEST' ) && REST_REQUEST ) ) {
		return;
	}
	if ( isset( $scripts->registered['jquery'] ) ) {
		$scripts->registered['jquery']->deps = array( 'jquery-core' );
	}
	foreach ( array( 'jquery', 'jquery-core' ) as $h ) {
		$scripts->add_data( $h, 'group', 1 );
	}
} );

// Preload the hero photo (LCP on the home page) and the two font files used above the fold.
add_action( 'wp_head', function () {
	if ( is_front_page() ) {
		$hero = jn_attachment_url( 'svc-residential' ) ?: jn_attachment_url( 'job-trailer-load' );
		if ( $hero ) {
			printf( "<link rel=\"preload\" as=\"image\" href=\"%s\" fetchpriority=\"high\">\n", esc_url( $hero ) );
		}
	}
	foreach ( jn_font_preloads() as $url ) {
		printf( "<link rel=\"preload\" as=\"font\" type=\"font/woff2\" href=\"%s\" crossorigin>\n", esc_url( $url ) );
	}
}, 1 );

// Latin, normal-style woff2 files of the locally hosted Google Fonts (written by Elementor).
function jn_font_preloads() {
	$found = get_transient( 'jn_font_preloads' );
	if ( is_array( $found ) ) {
		return $found;
	}
	$found = array();
	$dir   = wp_upload_dir();
	foreach ( array( 'russoone', 'archivo' ) as $family ) {
		$file = trailingslashit( $dir['basedir'] ) . 'elementor/google-fonts/css/' . $family . '.css';
		if ( ! is_readable( $file ) ) {
			continue;
		}
		$css = file_get_contents( $file );
		if ( preg_match_all( '/@font-face\s*{([^}]*)}/', $css, $m ) ) {
			foreach ( $m[1] as $block ) {
				if ( false !== strpos( $block, 'font-style: normal' ) && false !== strpos( $block, 'U+0000-00FF' ) && preg_match( '/url\(([^)]+\.woff2)\)/', $block, $u ) ) {
					$found[] = trim( $u[1], "'\" " );
					break;
				}
			}
		}
	}
	set_transient( 'jn_font_preloads', $found, DAY_IN_SECONDS );
	return $found;
}

// Inline the site's own small stylesheets into <head>: no render-blocking CSS requests on first paint.
// Relative url()s are made absolute. Google Font CSS is trimmed to the Latin, normal-style faces.
function jn_inline_ok() {
	return ! is_admin() && ! isset( $_GET['elementor-preview'] ) && ! ( function_exists( 'is_customize_preview' ) && is_customize_preview() ) && ! wp_doing_ajax();
}
add_filter( 'style_loader_tag', function ( $tag, $handle, $href, $media ) {
	if ( ! jn_inline_ok() || ! $href ) {
		return $tag;
	}
	$url  = strtok( $href, '?' );
	$base = content_url();
	if ( 0 === strpos( $url, $base ) ) {
		$path = WP_CONTENT_DIR . substr( $url, strlen( $base ) );
	} elseif ( 0 === strpos( $url, includes_url() ) ) {
		$path = ABSPATH . WPINC . '/' . substr( $url, strlen( includes_url() ) );
	} else {
		return $tag;
	}
	if ( ! is_readable( $path ) || filesize( $path ) > 120000 ) {
		return $tag;
	}
	$css = file_get_contents( $path );
	if ( false !== strpos( $path, '/google-fonts/css/' ) ) {
		$css = jn_trim_font_css( $css );
	}
	$dir = trailingslashit( dirname( $url ) );
	$css = preg_replace_callback( '/url\(\s*([\'"]?)(?!data:|https?:|\/)([^\'")]+)\1\s*\)/', function ( $m ) use ( $dir ) {
		return 'url(' . $dir . $m[2] . ')';
	}, $css );
	$media = ( $media && 'all' !== $media ) ? ' media="' . esc_attr( $media ) . '"' : '';
	return "<style id=\"{$handle}-css\"{$media}>{$css}</style>\n";
}, 10, 4 );

// Keep only Latin + normal-style faces; collapse a variable font's per-weight faces into one 100–900 face.
function jn_trim_font_css( $css ) {
	if ( ! preg_match_all( '/@font-face\s*{([^}]*)}/', $css, $m ) ) {
		return $css;
	}
	$out = array();
	foreach ( $m[1] as $block ) {
		if ( false === strpos( $block, 'font-style: normal' ) || false === strpos( $block, 'U+0000-00FF' ) ) {
			continue;
		}
		preg_match( '/url\(([^)]+)\)/', $block, $u );
		$file = $u[1] ?? '';
		if ( isset( $out[ $file ] ) ) {
			$out[ $file ]['w'][] = (int) ( preg_match( '/font-weight:\s*(\d+)/', $block, $w ) ? $w[1] : 400 );
			continue;
		}
		$out[ $file ] = array( 'block' => $block, 'w' => array( (int) ( preg_match( '/font-weight:\s*(\d+)/', $block, $w ) ? $w[1] : 400 ) ) );
	}
	$css = '';
	foreach ( $out as $f ) {
		$weights = count( $f['w'] ) > 1 ? min( $f['w'] ) . ' ' . max( $f['w'] ) : $f['w'][0];
		$css    .= '@font-face{' . preg_replace( '/font-weight:\s*\d+/', 'font-weight: ' . $weights, $f['block'] ) . '}';
	}
	return $css;
}

// Images: the header logo and the hero mascot load right away; every other image waits until it is near the viewport.
add_filter( 'elementor/widget/render_content', function ( $content, $widget ) {
	static $count = 0;
	if ( 'image' !== $widget->get_name() || is_admin() || isset( $_GET['elementor-preview'] ) ) {
		return $content;
	}
	$count++;
	if ( $count <= 2 && ( false !== strpos( $content, 'junk-ninja-logo-300' ) || false !== strpos( $content, 'junk-ninja-mascot' ) ) && false === strpos( $content, 'junk-ninja-logo-white' ) ) {
		return $content;
	}
	$content = str_replace( ' fetchpriority="high"', '', $content );
	if ( false === strpos( $content, 'loading=' ) ) {
		$content = str_replace( '<img ', '<img loading="lazy" ', $content );
	}
	return $content;
}, 10, 2 );

// Resized WebP/JPEG copies at quality 72.
add_filter( 'wp_editor_set_quality', function () {
	return 72;
} );

/* ---------------------------------------------------- services behaviour */
// Desktop: hovering a service selects it (Nested Tabs only switch on click).
add_action( 'wp_footer', function () {
	if ( ! is_front_page() ) {
		return;
	}
	echo "<script>document.querySelectorAll('.jn-services .e-n-tab-title').forEach(function(t){t.addEventListener('mouseenter',function(){if(matchMedia('(min-width:761px) and (hover:hover)').matches&&t.getAttribute('aria-selected')!=='true')t.click();});});</script>\n";
}, 99 );

/* ------------------------------------------------------------------- SEO */

add_filter( 'pre_get_document_title', function ( $title ) {
	return is_front_page() ? jn_business()['title'] : $title;
} );

add_action( 'wp_head', function () {
	$b    = jn_business();
	$url  = is_front_page() ? home_url( '/' ) : get_permalink();
	$desc = is_front_page() ? $b['description'] : wp_strip_all_tags( get_the_excerpt() );
	$img  = jn_attachment_url( 'job-trailer-branded' );
	$out  = array();
	if ( $desc ) {
		$out[] = sprintf( '<meta name="description" content="%s">', esc_attr( $desc ) );
	}
	$og = array(
		'og:locale'      => 'en_US',
		'og:type'        => 'website',
		'og:site_name'   => $b['name'],
		'og:title'       => is_front_page() ? $b['title'] : wp_get_document_title(),
		'og:description' => $desc,
		'og:url'         => $url,
		'og:image'       => $img,
	);
	foreach ( array_filter( $og ) as $k => $v ) {
		$out[] = sprintf( '<meta property="%s" content="%s">', $k, esc_attr( $v ) );
	}
	$out[] = '<meta name="twitter:card" content="summary_large_image">';
	$out[] = '<meta name="geo.region" content="US-FL"><meta name="geo.placename" content="Port St. Lucie">';
	echo implode( "\n", $out ) . "\n";
	if ( is_front_page() ) {
		echo '<script type="application/ld+json">' . wp_json_encode( jn_schema(), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) . "</script>\n";
	}
}, 2 );

function jn_schema() {
	$b    = jn_business();
	$home = home_url( '/' );
	$biz  = $home . '#business';
	$area = array_map( function ( $t ) {
		return array( '@type' => 'City', 'name' => $t, 'containedInPlace' => array( '@type' => 'State', 'name' => 'Florida' ) );
	}, $b['towns'] );
	$services = array();
	foreach ( $b['services'] as $name => $desc ) {
		$services[] = array(
			'@type'       => 'Offer',
			'itemOffered' => array( '@type' => 'Service', 'name' => $name, 'description' => $desc, 'serviceType' => 'Junk removal', 'provider' => array( '@id' => $biz ), 'areaServed' => $area ),
		);
	}
	$faq = array();
	foreach ( $b['faq'] as $q => $a ) {
		$faq[] = array( '@type' => 'Question', 'name' => $q, 'acceptedAnswer' => array( '@type' => 'Answer', 'text' => $a ) );
	}
	return array(
		'@context' => 'https://schema.org',
		'@graph'   => array(
			array(
				'@type'                     => array( 'LocalBusiness', 'HomeAndConstructionBusiness' ),
				'@id'                       => $biz,
				'name'                      => $b['name'],
				'slogan'                    => $b['slogan'],
				'description'               => $b['about'],
				'url'                       => $home,
				'telephone'                 => $b['phone'],
				'email'                     => $b['email'],
				'logo'                      => jn_attachment_url( 'junk-ninja-logo' ),
				'image'                     => array_values( array_filter( array( jn_attachment_url( 'job-trailer-branded' ), jn_attachment_url( 'job-trailer-load' ) ) ) ),
				'address'                   => array( '@type' => 'PostalAddress', 'addressLocality' => 'Port St. Lucie', 'addressRegion' => 'FL', 'addressCountry' => 'US' ),
				'areaServed'                => $area,
				'openingHoursSpecification' => array(
					array(
						'@type'     => 'OpeningHoursSpecification',
						'dayOfWeek' => array( 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday' ),
						'opens'     => '06:00',
						'closes'    => '21:00',
					),
				),
				'knowsAbout'                => array_keys( $b['services'] ),
				'hasOfferCatalog'           => array( '@type' => 'OfferCatalog', 'name' => 'Junk removal services', 'itemListElement' => $services ),
				'sameAs'                    => array( $b['facebook'] ),
				'contactPoint'              => array( '@type' => 'ContactPoint', 'telephone' => $b['phone'], 'contactType' => 'customer service', 'areaServed' => 'US-FL', 'availableLanguage' => 'English' ),
			),
			array( '@type' => 'WebSite', '@id' => $home . '#website', 'url' => $home, 'name' => $b['name'], 'publisher' => array( '@id' => $biz ), 'inLanguage' => 'en-US' ),
			array(
				'@type'              => 'WebPage',
				'@id'                => $home . '#webpage',
				'url'                => $home,
				'name'               => $b['title'],
				'description'        => $b['description'],
				'isPartOf'           => array( '@id' => $home . '#website' ),
				'about'              => array( '@id' => $biz ),
				'primaryImageOfPage' => jn_attachment_url( 'job-trailer-load' ),
				'inLanguage'         => 'en-US',
			),
			array( '@type' => 'FAQPage', '@id' => $home . '#faq', 'mainEntity' => $faq ),
		),
	);
}

// robots.txt: welcome search and AI answer engines once the site is public, point to the sitemap and llms.txt.
add_filter( 'robots_txt', function ( $output, $public ) {
	if ( ! $public ) {
		return $output;
	}
	$bots = array( 'Googlebot', 'Bingbot', 'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot', 'Applebot-Extended', 'DuckDuckBot' );
	$add  = '';
	foreach ( $bots as $bot ) {
		$add .= "User-agent: {$bot}\nAllow: /\nDisallow: /wp-admin/\nAllow: /wp-admin/admin-ajax.php\n\n";
	}
	$output = $add . $output;
	if ( false === strpos( $output, 'Sitemap:' ) ) {
		$output .= "\nSitemap: " . home_url( '/wp-sitemap.xml' ) . "\n";
	}
	return $output . '# AI summary: ' . home_url( '/llms.txt' ) . "\n";
}, 20, 2 );

// /llms.txt: a plain-language summary of the business for AI assistants.
add_action( 'parse_request', function () {
	$path = trim( (string) wp_parse_url( $_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH ), '/' );
	if ( 'llms.txt' !== $path ) {
		return;
	}
	$b    = jn_business();
	$home = home_url( '/' );
	$t    = "# {$b['name']}\n\n> {$b['about']}\n\n";
	$t   .= "## Contact\n\n- Phone and text: {$b['phone_human']} (text photos of the junk for a faster quote)\n- Email: {$b['email']}\n- Hours: {$b['hours']}\n- Licensed and insured\n- Website: {$home}\n- Free quote form: {$home}#quote\n- Facebook: {$b['facebook']}\n\n";
	$t   .= "## Services\n\n";
	foreach ( $b['services'] as $name => $desc ) {
		$t .= "- {$name}: {$desc}\n";
	}
	$t .= "\n## Service area (Treasure Coast, Florida)\n\n- " . implode( "\n- ", $b['towns'] ) . "\n\n## How it works\n\n1. Send photos: text them to {$b['phone_human']} or upload them with the quote form.\n2. Get your quote: we look at what needs to go and send you a quote for the job.\n3. We haul it away: we load it up and take it away.\n\n## FAQ\n\n";
	foreach ( $b['faq'] as $q => $a ) {
		$t .= "### {$q}\n\n{$a}\n\n";
	}
	status_header( 200 );
	header( 'Content-Type: text/plain; charset=utf-8' );
	header( 'Cache-Control: public, max-age=86400' );
	echo $t; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	exit;
}, 0 );

// Sitemap: only pages (no users, categories or empty post types).
add_filter( 'wp_sitemaps_add_provider', function ( $provider, $name ) {
	return 'users' === $name ? false : $provider;
}, 10, 2 );
add_filter( 'wp_sitemaps_post_types', function ( $types ) {
	return array_intersect_key( $types, array( 'page' => 1 ) );
} );
add_filter( 'wp_sitemaps_taxonomies', '__return_empty_array' );
