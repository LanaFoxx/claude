<?php
/**
 * "Restaurant Staff" role: can log in and update Restaurant Menus and Restaurant Hours only.
 * No access to pages, the gallery, the store, users or settings. Administrators and Editors
 * keep full access (they get the same menus/hours capability).
 */
defined( 'ABSPATH' ) || exit;

const BI_MENUS_CAP  = 'bi_edit_menus';
const BI_STAFF_ROLE = 'bi_restaurant';
const BI_ROLES_VER  = 1;

add_action( 'init', function () {
	if ( (int) get_option( 'bi_roles_ver' ) === BI_ROLES_VER ) {
		return;
	}
	remove_role( BI_STAFF_ROLE );
	add_role( BI_STAFF_ROLE, 'Restaurant Staff', array(
		'read'                 => true,
		'upload_files'         => true, // menu PDFs
		'view_admin_dashboard' => true, // lets WooCommerce allow them into the admin
		BI_MENUS_CAP           => true,
	) );
	foreach ( array( 'administrator', 'editor' ) as $r ) {
		$role = get_role( $r );
		if ( $role ) {
			$role->add_cap( BI_MENUS_CAP );
		}
	}
	update_option( 'bi_roles_ver', BI_ROLES_VER, false );
} );

function bi_is_restaurant_staff() {
	return is_user_logged_in() && ! current_user_can( 'edit_pages' ) && current_user_can( BI_MENUS_CAP );
}

// Straight to the menus after logging in, and instead of the dashboard.
add_filter( 'login_redirect', function ( $to, $requested, $user ) {
	if ( $user instanceof WP_User && ! $user->has_cap( 'edit_pages' ) && $user->has_cap( BI_MENUS_CAP ) ) {
		return admin_url( 'admin.php?page=bi-menus' );
	}
	return $to;
}, 20, 3 );

add_action( 'load-index.php', function () {
	if ( bi_is_restaurant_staff() ) {
		wp_safe_redirect( admin_url( 'admin.php?page=bi-menus' ) );
		exit;
	}
} );

// A short left menu: Bayfield Inn (Menus, Hours) and Profile.
add_action( 'admin_menu', function () {
	if ( ! bi_is_restaurant_staff() ) {
		return;
	}
	global $menu;
	foreach ( (array) $menu as $item ) {
		if ( ! in_array( $item[2] ?? '', array( 'bi-menus', 'profile.php' ), true ) ) {
			remove_menu_page( $item[2] );
		}
	}
}, 9999 );

add_action( 'admin_bar_menu', function ( $bar ) {
	if ( bi_is_restaurant_staff() ) {
		foreach ( array( 'new-content', 'comments', 'updates', 'wp-logo' ) as $id ) {
			$bar->remove_node( $id );
		}
	}
}, 999 );
