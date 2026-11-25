<?php
/**
 * "Store access" checkbox on each user's profile (administrators only can change it).
 * Ticked: that person can see the store boxes on the dashboard (orders & sales, inventory,
 * add a product) and use WooCommerce › Orders and Products. Store settings stay admin-only.
 * Administrators always have store access.
 */
defined( 'ABSPATH' ) || exit;

const BI_STORE_ACCESS_META = 'bi_store_access';

/** Product and order capabilities, taken from WooCommerce's Shop Manager role (no settings). */
function bi_store_caps() {
	$caps = array( 'view_woocommerce_reports' );
	$sm   = get_role( 'shop_manager' );
	foreach ( $sm ? array_keys( array_filter( $sm->capabilities ) ) : array() as $cap ) {
		if ( preg_match( '/(^|_)(product|products|shop_order|shop_orders)(_|$)/', $cap ) ) {
			$caps[] = $cap;
		}
	}
	return array_values( array_unique( $caps ) );
}

function bi_user_store_access( WP_User $user ) {
	return in_array( 'administrator', (array) $user->roles, true ) || (bool) get_user_meta( $user->ID, BI_STORE_ACCESS_META, true );
}

function bi_set_store_access( WP_User $user, $on ) {
	if ( in_array( 'administrator', (array) $user->roles, true ) ) {
		return;
	}
	foreach ( bi_store_caps() as $cap ) {
		if ( $on ) {
			$user->add_cap( $cap );
		} else {
			$user->remove_cap( $cap );
		}
	}
	if ( $on ) {
		update_user_meta( $user->ID, BI_STORE_ACCESS_META, 1 );
	} else {
		delete_user_meta( $user->ID, BI_STORE_ACCESS_META );
	}
}

/* ------------------------------------------------------- profile checkbox */
function bi_store_access_field( WP_User $user ) {
	if ( ! current_user_can( 'promote_users' ) || ! bi_store_on() ) {
		return;
	}
	$admin = in_array( 'administrator', (array) $user->roles, true );
	?>
	<h2>Store</h2>
	<table class="form-table" role="presentation"><tr>
		<th scope="row">Store access</th>
		<td>
			<label><input type="checkbox" name="bi_store_access" value="1" <?php checked( bi_user_store_access( $user ) ); ?> <?php disabled( $admin ); ?>>
				Can see store orders &amp; sales on the dashboard, and manage orders, products and inventory</label>
			<p class="description"><?php echo $admin ? 'Administrators always have store access.' : 'Leave unticked for staff who don\'t need to see sales or orders.'; ?></p>
		</td>
	</tr></table>
	<?php
}
add_action( 'edit_user_profile', 'bi_store_access_field', 5 );
add_action( 'show_user_profile', 'bi_store_access_field', 5 );
add_action( 'user_new_form', function () {
	if ( ! current_user_can( 'promote_users' ) || ! bi_store_on() ) {
		return;
	}
	echo '<table class="form-table" role="presentation"><tr><th scope="row">Store access</th><td><label><input type="checkbox" name="bi_store_access" value="1"> Can see store orders &amp; sales on the dashboard, and manage orders, products and inventory</label></td></tr></table>';
}, 5 );

$bi_save_store_access = function ( $user_id ) {
	if ( ! current_user_can( 'promote_users' ) || ! bi_store_on() ) {
		return;
	}
	$user = get_userdata( $user_id );
	if ( $user ) {
		bi_set_store_access( $user, ! empty( $_POST['bi_store_access'] ) ); // phpcs:ignore -- WordPress checks the profile nonce before these hooks
	}
};
add_action( 'edit_user_profile_update', $bi_save_store_access );
add_action( 'personal_options_update', $bi_save_store_access );
add_action( 'user_register', $bi_save_store_access );

/* ----------------------------------------------- Users list: "Store" column */
add_filter( 'manage_users_columns', function ( $cols ) {
	if ( bi_store_on() ) {
		$cols['bi_store'] = 'Store access';
	}
	return $cols;
} );
add_filter( 'manage_users_custom_column', function ( $out, $col, $user_id ) {
	if ( 'bi_store' !== $col ) {
		return $out;
	}
	$user = get_userdata( $user_id );
	return ( $user && bi_user_store_access( $user ) ) ? '<span class="dashicons dashicons-yes" style="color:#1a7f37" aria-hidden="true"></span><span class="screen-reader-text">Yes</span>' : '—';
}, 10, 3 );

/* ----------------------------- REST: lets the web team set it for a person */
add_action( 'rest_api_init', function () {
	register_rest_route( 'bayfield/v1', '/store-access/(?P<id>\d+)', array(
		'methods'             => 'POST',
		'permission_callback' => function () { return current_user_can( 'promote_users' ); },
		'callback'            => function ( WP_REST_Request $req ) {
			$user = get_userdata( (int) $req['id'] );
			if ( ! $user ) {
				return new WP_Error( 'bi_user', 'No such user', array( 'status' => 404 ) );
			}
			bi_set_store_access( $user, (bool) $req->get_param( 'on' ) );
			$user = get_userdata( $user->ID );
			return array( 'id' => $user->ID, 'store_access' => bi_user_store_access( $user ), 'edit_products' => $user->has_cap( 'edit_products' ), 'edit_shop_orders' => $user->has_cap( 'edit_shop_orders' ) );
		},
	) );
} );
