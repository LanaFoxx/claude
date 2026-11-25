<?php
/**
 * "Last login" for each user: saved every time someone logs in, shown as a sortable column on
 * Users and on each person's profile. Logins from before this was added are filled in from
 * WordPress's own saved login sessions where they still exist.
 */
defined( 'ABSPATH' ) || exit;

const BI_LAST_LOGIN = 'bi_last_login';

add_action( 'wp_login', function ( $login, $user ) {
	update_user_meta( $user->ID, BI_LAST_LOGIN, time() );
}, 10, 2 );

/** Unix time of the user's last login, or 0 if unknown. */
function bi_last_login( $user_id ) {
	$t = (int) get_user_meta( $user_id, BI_LAST_LOGIN, true );
	if ( $t ) {
		return $t;
	}
	// Not recorded yet: use the newest login session WordPress still has for them.
	foreach ( (array) WP_Session_Tokens::get_instance( $user_id )->get_all() as $session ) {
		$t = max( $t, (int) ( $session['login'] ?? 0 ) );
	}
	if ( $t ) {
		update_user_meta( $user_id, BI_LAST_LOGIN, $t );
	}
	return $t;
}

function bi_last_login_text( $user_id ) {
	$t = bi_last_login( $user_id );
	if ( ! $t ) {
		return 'Not since ' . wp_date( 'M j, Y', (int) get_option( 'bi_last_login_since', time() ) );
	}
	$ago = human_time_diff( $t ) . ' ago';
	return wp_date( 'M j, Y \a\t g:i a', $t ) . ' (' . $ago . ')';
}

add_action( 'init', function () {
	if ( ! get_option( 'bi_last_login_since' ) ) {
		update_option( 'bi_last_login_since', time(), false );
	}
	// Everyone gets a value (0 = never) so the Users list can sort by it without hiding anyone.
	if ( is_admin() && (int) get_option( 'bi_last_login_seeded' ) < 1 ) {
		foreach ( get_users( array( 'fields' => 'ID' ) ) as $id ) {
			if ( '' === get_user_meta( $id, BI_LAST_LOGIN, true ) ) {
				update_user_meta( $id, BI_LAST_LOGIN, bi_last_login( $id ) );
			}
		}
		update_option( 'bi_last_login_seeded', 1, false );
	}
} );
add_action( 'user_register', function ( $id ) {
	if ( '' === get_user_meta( $id, BI_LAST_LOGIN, true ) ) {
		update_user_meta( $id, BI_LAST_LOGIN, 0 );
	}
} );

/* ------------------------------------------------- Users list column */
add_filter( 'manage_users_columns', function ( $cols ) {
	$cols['bi_last_login'] = 'Last login';
	return $cols;
} );
add_filter( 'manage_users_sortable_columns', function ( $cols ) {
	$cols['bi_last_login'] = 'bi_last_login';
	return $cols;
} );
add_filter( 'manage_users_custom_column', function ( $out, $col, $user_id ) {
	if ( 'bi_last_login' !== $col ) {
		return $out;
	}
	$t = bi_last_login( $user_id );
	if ( ! $t ) {
		return '<span style="color:#646970">Never (since ' . esc_html( wp_date( 'M j', (int) get_option( 'bi_last_login_since', time() ) ) ) . ')</span>';
	}
	return sprintf( '<span title="%s">%s ago</span><br><small style="color:#646970">%s</small>',
		esc_attr( wp_date( 'l, F j, Y \a\t g:i a', $t ) ), esc_html( human_time_diff( $t ) ), esc_html( wp_date( 'M j, Y g:i a', $t ) ) );
}, 10, 3 );
add_action( 'pre_get_users', function ( $q ) {
	if ( is_admin() && 'bi_last_login' === $q->get( 'orderby' ) ) {
		$q->set( 'meta_key', BI_LAST_LOGIN );
		$q->set( 'orderby', 'meta_value_num' );
	}
} );

/* ------------------------------------------------------- profile */
function bi_last_login_field( WP_User $user ) {
	if ( ! current_user_can( 'list_users' ) ) {
		return;
	}
	printf( '<h2>Activity</h2><table class="form-table" role="presentation"><tr><th scope="row">Last login</th><td>%s</td></tr></table>', esc_html( bi_last_login_text( $user->ID ) ) );
}
add_action( 'edit_user_profile', 'bi_last_login_field', 4 );
add_action( 'show_user_profile', 'bi_last_login_field', 4 );
