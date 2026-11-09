<?php
/**
 * Hours of operation for each restaurant: edited under Bayfield Inn › Hours, shown on each
 * restaurant page by the "Restaurant Hours" widget. Days with the same hours are grouped
 * ("Mon – Thu 11 am – 9 pm"). With no hours entered the page shows "Call for today's hours".
 */
defined( 'ABSPATH' ) || exit;

const BI_DAYS = array( 'mon' => 'Monday', 'tue' => 'Tuesday', 'wed' => 'Wednesday', 'thu' => 'Thursday', 'fri' => 'Friday', 'sat' => 'Saturday', 'sun' => 'Sunday' );
const BI_PHONE = '(715) 779-3363';

/** Restaurants, in the order of Bayfield Inn › Restaurant Menus. */
function bi_hours_restaurants() {
	$out = array();
	foreach ( bi_get_data( 'menus' )['restaurants'] ?? array() as $r ) {
		if ( ! empty( $r['slug'] ) ) {
			$out[ $r['slug'] ] = $r['name'] ?? $r['slug'];
		}
	}
	return $out ?: array( 'the-deck' => 'The Deck', 'lakeside-dining-room' => 'Lakeside Dining Room', 'the-lounge' => 'The Lounge', 'the-creamery' => 'The Creamery' );
}

function bi_hours_for( $slug ) {
	$all = get_option( 'bi_hours', array() );
	$h   = is_array( $all ) && isset( $all[ $slug ] ) && is_array( $all[ $slug ] ) ? $all[ $slug ] : array();
	return wp_parse_args( $h, array( 'days' => array(), 'note' => '' ) );
}

/** [ [ 'Mon – Thu', '11 am – 9 pm' ], ... ] grouping consecutive days with identical hours. */
function bi_hours_groups( $days ) {
	$keys   = array_keys( BI_DAYS );
	$groups = array();
	foreach ( $keys as $i => $k ) {
		$t = trim( (string) ( $days[ $k ] ?? '' ) );
		$t = '' === $t ? 'Closed' : $t;
		$n = count( $groups );
		if ( $n && $groups[ $n - 1 ]['t'] === $t && $groups[ $n - 1 ]['to'] === $i - 1 ) {
			$groups[ $n - 1 ]['to'] = $i;
		} else {
			$groups[] = array( 'from' => $i, 'to' => $i, 't' => $t );
		}
	}
	return array_map( function ( $g ) use ( $keys ) {
		$a = substr( BI_DAYS[ $keys[ $g['from'] ] ], 0, 3 );
		$b = substr( BI_DAYS[ $keys[ $g['to'] ] ], 0, 3 );
		if ( 0 === $g['from'] && 6 === $g['to'] ) {
			$label = 'Every day';
		} else {
			$label = $g['from'] === $g['to'] ? $a : ( $g['to'] - $g['from'] > 1 ? $a . ' – ' . $b : $a . ' & ' . $b );
		}
		return array( $label, $g['t'] );
	}, $groups );
}

/* ------------------------------------------------------------- admin page */
add_action( 'admin_menu', function () {
	add_submenu_page( 'bi-menus', 'Restaurant Hours', 'Hours', BI_MANAGER_CAP, 'bi-hours', 'bi_render_hours' );
}, 20 );

add_action( 'admin_post_bi_save_hours', function () {
	if ( ! current_user_can( BI_MANAGER_CAP ) ) {
		wp_die( 'Not allowed' );
	}
	check_admin_referer( 'bi_save_hours' );
	$in  = (array) ( $_POST['hours'] ?? array() ); // phpcs:ignore -- sanitized below
	$out = array();
	foreach ( bi_hours_restaurants() as $slug => $name ) {
		$r    = (array) ( $in[ $slug ] ?? array() );
		$days = array();
		foreach ( array_keys( BI_DAYS ) as $k ) {
			$days[ $k ] = sanitize_text_field( wp_unslash( $r['days'][ $k ] ?? '' ) );
		}
		$out[ $slug ] = array( 'days' => $days, 'note' => sanitize_text_field( wp_unslash( $r['note'] ?? '' ) ) );
	}
	update_option( 'bi_hours', $out, false );
	if ( class_exists( '\Elementor\Plugin' ) ) {
		\Elementor\Plugin::$instance->files_manager->clear_cache();
	}
	if ( function_exists( 'sg_cachepress_purge_everything' ) ) {
		sg_cachepress_purge_everything();
	}
	wp_safe_redirect( add_query_arg( array( 'page' => 'bi-hours', 'saved' => 1 ), admin_url( 'admin.php' ) ) );
	exit;
} );

function bi_render_hours() {
	$restaurants = bi_hours_restaurants();
	?>
	<div class="wrap bi-hours-admin">
		<h1>Restaurant Hours</h1>
		<?php if ( ! empty( $_GET['saved'] ) ) : // phpcs:ignore ?>
			<div class="notice notice-success is-dismissible"><p>Hours saved. The restaurant pages are updated.</p></div>
		<?php endif; ?>
		<p class="bi-lead">Type the hours for each day, the way you'd say them: <code>11 am – 9 pm</code>, <code>7–11 am, 5–9 pm</code>. Leave a day empty if it's closed. Days with the same hours are grouped on the website automatically. If a restaurant has no hours at all, its page shows "Call for today's hours".</p>
		<p class="bi-jump"><?php foreach ( $restaurants as $slug => $name ) { printf( '<a href="#%s" class="button">%s</a> ', esc_attr( $slug ), esc_html( $name ) ); } ?></p>
		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
			<input type="hidden" name="action" value="bi_save_hours">
			<?php wp_nonce_field( 'bi_save_hours' ); ?>
			<div class="bi-hours-grid">
			<?php foreach ( $restaurants as $slug => $name ) : $h = bi_hours_for( $slug ); ?>
				<section class="bi-hours-card" id="<?php echo esc_attr( $slug ); ?>">
					<h2><?php echo esc_html( $name ); ?> <a class="bi-hours-view" href="<?php echo esc_url( home_url( '/' . $slug . '/' ) ); ?>" target="_blank">View page ↗</a></h2>
					<table class="bi-hours-table">
						<?php foreach ( BI_DAYS as $k => $label ) : ?>
							<tr>
								<th scope="row"><label for="h-<?php echo esc_attr( $slug . '-' . $k ); ?>"><?php echo esc_html( $label ); ?></label></th>
								<td><input type="text" id="h-<?php echo esc_attr( $slug . '-' . $k ); ?>" name="hours[<?php echo esc_attr( $slug ); ?>][days][<?php echo esc_attr( $k ); ?>]" value="<?php echo esc_attr( $h['days'][ $k ] ?? '' ); ?>" placeholder="Closed" data-day="<?php echo esc_attr( $k ); ?>"></td>
							</tr>
						<?php endforeach; ?>
					</table>
					<p><button type="button" class="button-link" data-copy-monday>Copy Monday's hours to every day</button></p>
					<label class="bi-hours-note">Note under the hours (optional)
						<input type="text" name="hours[<?php echo esc_attr( $slug ); ?>][note]" value="<?php echo esc_attr( $h['note'] ); ?>" placeholder="e.g. Open May–October, weather permitting">
					</label>
				</section>
			<?php endforeach; ?>
			</div>
			<div class="bi-hours-save"><?php submit_button( 'Save hours', 'primary', 'submit', false ); ?></div>
		</form>
	</div>
	<style>
	.bi-hours-admin .bi-lead { max-width: 780px; font-size: 14px; color: #50575e; }
	.bi-hours-admin .bi-lead code { font-size: 12px; }
	.bi-jump { display: flex; flex-wrap: wrap; gap: 6px; }
	.bi-hours-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); gap: 16px; max-width: 1400px; margin: 16px 0 90px; }
	.bi-hours-card { background: #fff; border: 1px solid #dcdcde; border-left: 4px solid #17301B; border-radius: 6px; padding: 14px 16px; scroll-margin-top: 50px; }
	.bi-hours-card:target { box-shadow: 0 0 0 2px #17301B; }
	.bi-hours-card h2 { margin: 0 0 10px; font-size: 17px; display: flex; justify-content: space-between; align-items: baseline; }
	.bi-hours-view { font-size: 12px; font-weight: 400; text-decoration: none; }
	.bi-hours-table { width: 100%; border-collapse: collapse; }
	.bi-hours-table th { text-align: left; font-weight: 500; width: 96px; padding: 4px 8px 4px 0; }
	.bi-hours-table td { padding: 3px 0; }
	.bi-hours-table input, .bi-hours-note input { width: 100%; }
	.bi-hours-note { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: #50575e; }
	.bi-hours-save { position: fixed; left: 160px; right: 0; bottom: 0; z-index: 99; padding: 12px 24px; background: #fff; border-top: 1px solid #c3c4c7; box-shadow: 0 -4px 12px rgba(0,0,0,.06); }
	.folded .bi-hours-save { left: 36px; }
	@media (max-width: 960px) { .bi-hours-save { left: 36px; } }
	@media (max-width: 782px) { .bi-hours-save { left: 0; } }
	</style>
	<script>
	document.querySelectorAll('[data-copy-monday]').forEach(function (b) {
		b.addEventListener('click', function () {
			var card = b.closest('.bi-hours-card'), mon = card.querySelector('[data-day=mon]').value;
			card.querySelectorAll('[data-day]').forEach(function (i) { i.value = mon; });
		});
	});
	</script>
	<?php
}

/* -------------------------------------------------------- Elementor widget */
add_action( 'elementor/widgets/register', function ( $manager ) {
	require_once BI_MANAGER_DIR . 'widgets/class-bi-hours-widget.php';
	$manager->register( new BI_Hours_Widget() );
} );
