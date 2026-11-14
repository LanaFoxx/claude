<?php
/**
 * Dream Desk as an installable phone app (PWA) at /desk/.
 *
 * /desk/                      → sign-in screen, or the app once signed in
 * /desk/manifest.webmanifest  → app manifest (name, icons, colors)
 * /desk/sw.js                 → service worker (makes it installable, offline shell)
 *
 * @package DWD_Projects
 */

defined( 'ABSPATH' ) || exit;

function dwda_path() {
	$path = (string) wp_parse_url( isset( $_SERVER['REQUEST_URI'] ) ? wp_unslash( $_SERVER['REQUEST_URI'] ) : '', PHP_URL_PATH ); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput
	$base = (string) wp_parse_url( home_url( '/' ), PHP_URL_PATH );
	return '/' . ltrim( substr( $path, strlen( rtrim( $base, '/' ) ) ), '/' );
}

/* /todo-widget/ — a small to-do window (Work / Personal) that installs as its own app. */
add_action( 'init', function () {
	$p = dwda_path();
	if ( ! preg_match( '#^/todo-widget(/|$)#', $p ) ) {
		return;
	}
	if ( ! defined( 'DONOTCACHEPAGE' ) ) {
		define( 'DONOTCACHEPAGE', true );
	}
	if ( '/todo-widget/manifest.webmanifest' === $p ) {
		$u     = DWDP_URL . 'assets/app/';
		$start = wp_parse_url( home_url( '/todo-widget/' ), PHP_URL_PATH );
		header( 'Content-Type: application/manifest+json; charset=utf-8' );
		echo wp_json_encode( array(
			'id' => $start, 'name' => 'Dream Desk To-dos', 'short_name' => 'To-dos', 'description' => 'Your Work and Personal to-do lists.',
			'start_url' => $start, 'scope' => $start, 'display' => 'standalone', 'background_color' => '#0B0D12', 'theme_color' => '#0B0D12',
			'icons' => array(
				array( 'src' => $u . 'icon-192.png?v=3', 'sizes' => '192x192', 'type' => 'image/png', 'purpose' => 'any' ),
				array( 'src' => $u . 'icon-512.png?v=3', 'sizes' => '512x512', 'type' => 'image/png', 'purpose' => 'any' ),
			),
		), JSON_UNESCAPED_SLASHES );
		exit;
	}
	if ( '/todo-widget/sw.js' === $p ) {
		header( 'Content-Type: application/javascript; charset=utf-8' );
		header( 'Service-Worker-Allowed: ' . wp_parse_url( home_url( '/todo-widget/' ), PHP_URL_PATH ) );
		echo "self.addEventListener('install',function(){self.skipWaiting();});self.addEventListener('activate',function(e){e.waitUntil(self.clients.claim());});self.addEventListener('fetch',function(){});";
		exit;
	}
	if ( '/todo-widget/' !== $p ) {
		wp_safe_redirect( home_url( '/todo-widget/' ) );
		exit;
	}
	nocache_headers();
	header( 'X-Robots-Tag: noindex, nofollow' );
	if ( ! is_user_logged_in() || ! current_user_can( 'manage_options' ) ) {
		wp_safe_redirect( home_url( '/desk/' ) ); // sign in there, then reopen the widget
		exit;
	}
	$u = DWDP_URL . 'assets/app/';
	?>
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#0B0D12">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="To-dos">
<title>To-dos · Dream Desk</title>
<link rel="manifest" href="<?php echo esc_url( home_url( '/todo-widget/manifest.webmanifest' ) ); ?>">
<link rel="icon" href="<?php echo esc_url( $u . 'favicon-32.png?v=3' ); ?>" sizes="32x32">
<link rel="apple-touch-icon" href="<?php echo esc_url( $u . 'apple-touch-icon.png?v=3' ); ?>">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap">
<script>(function(){var t="dark";try{t=localStorage.getItem("dreamdesk-theme")||"dark";}catch(e){}document.documentElement.setAttribute("data-theme",t);})();</script>
<link rel="stylesheet" href="<?php echo esc_url( DWDP_URL . 'assets/dd-tokens.css?ver=' . DWDP_VERSION ); ?>">
<link rel="stylesheet" href="<?php echo esc_url( DWDP_URL . 'assets/widget.css?ver=' . DWDP_VERSION ); ?>">
</head>
<body>
<div id="w"><p class="w-load">Loading…</p></div>
<script>var DWDC = <?php echo wp_json_encode( array( 'api' => esc_url_raw( rest_url( 'dwd/v1/crm' ) ), 'nonce' => wp_create_nonce( 'wp_rest' ), 'today' => wp_date( 'Y-m-d', null, new DateTimeZone( 'America/New_York' ) ), 'desk' => home_url( '/desk/' ) ) ); ?>;</script>
<script src="<?php echo esc_url( DWDP_URL . 'assets/widget.js?ver=' . DWDP_VERSION ); ?>"></script>
<script>if ('serviceWorker' in navigator) { navigator.serviceWorker.register('<?php echo esc_js( home_url( '/todo-widget/sw.js' ) ); ?>', { scope: '<?php echo esc_js( wp_parse_url( home_url( '/todo-widget/' ), PHP_URL_PATH ) ); ?>' }).catch(function () {}); }</script>
</body>
</html>
	<?php
	exit;
}, 1 );

add_action( 'init', function () {
	$p = dwda_path();
	if ( ! preg_match( '#^/desk(/|$)#', $p ) ) {
		return;
	}
	if ( ! defined( 'DONOTCACHEPAGE' ) ) {
		define( 'DONOTCACHEPAGE', true );
	}
	if ( '/desk' === $p ) {
		wp_safe_redirect( home_url( '/desk/' ), 301 );
		exit;
	}
	if ( '/desk/manifest.webmanifest' === $p ) {
		dwda_manifest();
	}
	if ( '/desk/sw.js' === $p ) {
		dwda_sw();
	}
	if ( '/desk/' !== $p ) {
		wp_safe_redirect( home_url( '/desk/' ) );
		exit;
	}
	nocache_headers();
	header( 'X-Robots-Tag: noindex, nofollow' );

	$error = '';
	if ( 'POST' === ( $_SERVER['REQUEST_METHOD'] ?? '' ) && isset( $_POST['dwda_login'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification
		if ( ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['_dwda'] ?? '' ) ), 'dwda_login' ) ) {
			$error = 'Your session timed out. Please try again.';
		} else {
			$user = wp_signon( array(
				'user_login'    => sanitize_text_field( wp_unslash( $_POST['log'] ?? '' ) ),
				'user_password' => (string) wp_unslash( $_POST['pwd'] ?? '' ), // phpcs:ignore WordPress.Security.ValidatedSanitizedInput
				'remember'      => ! empty( $_POST['remember'] ),
			), is_ssl() );
			if ( is_wp_error( $user ) ) {
				$error = 'That email or password didn’t work. Try again.';
			} elseif ( ! user_can( $user, 'manage_options' ) ) {
				wp_logout();
				$error = 'This account doesn’t have access to Dream Desk.';
			} else {
				wp_safe_redirect( home_url( '/desk/' ) );
				exit;
			}
		}
	}
	if ( is_user_logged_in() && current_user_can( 'manage_options' ) ) {
		dwda_app();
	}
	dwda_login( $error );
}, 1 );

function dwda_head( $title ) {
	$u = DWDP_URL . 'assets/app/';
	?>
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#0B203D">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Dream Desk">
<title><?php echo esc_html( $title ); ?></title>
<link rel="manifest" href="<?php echo esc_url( home_url( '/desk/manifest.webmanifest' ) ); ?>">
<link rel="icon" href="<?php echo esc_url( $u . 'favicon-32.png?v=3' ); ?>" sizes="32x32">
<link rel="apple-touch-icon" href="<?php echo esc_url( $u . 'apple-touch-icon.png?v=3' ); ?>">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&family=Inter:wght@400;500;600&display=swap">
<script>(function(){var t="dark";try{t=localStorage.getItem("dreamdesk-theme")||"dark";}catch(e){}document.documentElement.setAttribute("data-theme",t);})();</script>
	<?php
}

function dwda_sw_register() {
	?>
<script>if ('serviceWorker' in navigator) { window.addEventListener('load', function () { navigator.serviceWorker.register('<?php echo esc_js( home_url( '/desk/sw.js' ) ); ?>', { scope: '<?php echo esc_js( wp_parse_url( home_url( '/desk/' ), PHP_URL_PATH ) ); ?>' }).catch(function () {}); }); }</script>
	<?php
}

function dwda_app() {
	dwda_head( 'Dream Desk' );
	?>
<link rel="stylesheet" href="<?php echo esc_url( DWDP_URL . 'assets/crm.css?ver=' . DWDP_VERSION ); ?>">
<link rel="stylesheet" href="<?php echo esc_url( DWDP_URL . 'assets/dd-tokens.css?ver=' . DWDP_VERSION ); ?>">
<link rel="stylesheet" href="<?php echo esc_url( DWDP_URL . 'assets/dd.css?ver=' . DWDP_VERSION ); ?>">
<link rel="stylesheet" href="<?php echo esc_url( DWDP_URL . 'assets/dd-cal.css?ver=' . DWDP_VERSION ); ?>">
<link rel="stylesheet" href="<?php echo esc_url( DWDP_URL . 'assets/dd-todos.css?ver=' . DWDP_VERSION ); ?>">
<link rel="stylesheet" href="<?php echo esc_url( DWDP_URL . 'assets/dd-active.css?ver=' . DWDP_VERSION ); ?>">
<link rel="stylesheet" href="<?php echo esc_url( DWDP_URL . 'assets/dd-project.css?ver=' . DWDP_VERSION ); ?>">
<link rel="stylesheet" href="<?php echo esc_url( DWDP_URL . 'assets/dd-bills.css?ver=' . DWDP_VERSION ); ?>">
<style>html,body{margin:0;background:var(--bg)}body{-webkit-tap-highlight-color:transparent}.dwdc{padding-top:env(safe-area-inset-top)}</style>
</head>
<body class="dwdc-standalone">
<div id="dwdc-app" class="dwdc"><div class="dwdc-loading">Loading Dream Desk…</div></div>
<script>var DWDC = <?php echo wp_json_encode( dwdc_vars( 'app' ) ); ?>;</script>
<script src="<?php echo esc_url( DWDP_URL . 'assets/crm.js?ver=' . DWDP_VERSION ); ?>"></script>
	<?php dwda_sw_register(); ?>
</body>
</html>
	<?php
	exit;
}

function dwda_login( $error ) {
	$u = DWDP_URL . 'assets/app/';
	dwda_head( 'Dream Desk' );
	?>
<style>
*{box-sizing:border-box}
html,body{margin:0;min-height:100%;font-family:Poppins,system-ui,-apple-system,sans-serif;color:#0B203D;-webkit-font-smoothing:antialiased}
body{min-height:100vh;min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:max(24px,env(safe-area-inset-top)) 20px max(24px,env(safe-area-inset-bottom));background:#0B203D;background-image:radial-gradient(900px 500px at 15% -10%,rgba(19,166,238,.28),transparent 60%),radial-gradient(700px 500px at 110% 110%,rgba(19,166,238,.16),transparent 60%)}
.wrap{width:100%;max-width:400px}
.brand{display:flex;flex-direction:column;align-items:center;gap:14px;margin-bottom:26px;text-align:center}
.brand img{width:64px;height:64px;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.35)}
.brand h1{margin:0;font-size:24px;font-weight:700;letter-spacing:.02em;color:#fff}
.brand p{margin:0;font-size:14px;color:rgba(255,255,255,.62)}
.card{background:#fff;border-radius:18px;padding:28px 24px 24px;box-shadow:0 24px 60px rgba(3,10,24,.45)}
label{display:block;font-size:12px;font-weight:600;letter-spacing:.04em;color:#5C6B80;margin:0 0 6px}
.f{margin-bottom:16px}
input[type=text],input[type=password]{width:100%;height:50px;border:1px solid #CBD5E1;border-radius:12px;padding:0 14px;font:inherit;font-size:16px;color:#0B203D;background:#fff;outline:none;transition:border-color .15s,box-shadow .15s}
input[type=text]:focus,input[type=password]:focus{border-color:#13A6EE;box-shadow:0 0 0 4px rgba(19,166,238,.15)}
.pw{position:relative}.pw input{padding-right:64px}
.pw button{position:absolute;right:8px;top:8px;height:34px;padding:0 10px;border:0;border-radius:8px;background:transparent;font:inherit;font-size:13px;font-weight:600;color:#0F6EB5;cursor:pointer}
.row{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:2px 0 20px;font-size:13.5px}
.row label{display:flex;align-items:center;gap:8px;margin:0;font-size:13.5px;font-weight:500;letter-spacing:0;color:#0B203D;cursor:pointer}
.row input{width:18px;height:18px;accent-color:#0B203D}
.row a{color:#0F6EB5;text-decoration:none;font-weight:600}
.btn{width:100%;height:52px;border:0;border-radius:12px;background:#0B203D;color:#fff;font:inherit;font-size:16px;font-weight:700;cursor:pointer;transition:background .15s,transform .05s}
.btn:hover{background:#13305A}.btn:active{transform:scale(.99)}
.err{display:flex;gap:10px;align-items:flex-start;padding:12px 14px;margin-bottom:18px;border-radius:12px;background:#FDECEC;color:#B42318;font-size:14px;font-weight:500}
.foot{margin-top:22px;text-align:center;font-size:12.5px;color:rgba(255,255,255,.5)}
</style>
</head>
<body>
<main class="wrap">
	<div class="brand">
		<img src="<?php echo esc_url( $u . 'icon-192.png?v=3' ); ?>" alt="">
		<h1>Dream Desk</h1>
		<p>Sign in to your workspace</p>
	</div>
	<form class="card" method="post" action="<?php echo esc_url( home_url( '/desk/' ) ); ?>" autocomplete="on">
		<?php if ( $error ) : ?><div class="err" role="alert"><?php echo esc_html( $error ); ?></div><?php endif; ?>
		<div class="f"><label for="log">Email or username</label><input type="text" id="log" name="log" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" required value="<?php echo esc_attr( sanitize_text_field( wp_unslash( $_POST['log'] ?? '' ) ) ); // phpcs:ignore WordPress.Security.NonceVerification ?>"></div>
		<div class="f"><label for="pwd">Password</label><div class="pw"><input type="password" id="pwd" name="pwd" autocomplete="current-password" required><button type="button" aria-label="Show password" onclick="var i=document.getElementById('pwd');var s=i.type==='password';i.type=s?'text':'password';this.textContent=s?'Hide':'Show';">Show</button></div></div>
		<div class="row"><label><input type="checkbox" name="remember" value="1" checked> Keep me signed in</label><a href="<?php echo esc_url( wp_lostpassword_url( home_url( '/desk/' ) ) ); ?>">Forgot password?</a></div>
		<?php wp_nonce_field( 'dwda_login', '_dwda' ); ?>
		<input type="hidden" name="dwda_login" value="1">
		<input type="hidden" name="redirect_to" value="<?php echo esc_url( home_url( '/desk/' ) ); ?>">
		<button class="btn" type="submit">Sign in</button>
	</form>
	<p class="foot">Dream Web Digital</p>
</main>
	<?php dwda_sw_register(); ?>
</body>
</html>
	<?php
	exit;
}

function dwda_manifest() {
	$u = DWDP_URL . 'assets/app/';
	header( 'Content-Type: application/manifest+json; charset=utf-8' );
	header( 'Cache-Control: public, max-age=3600' );
	$start = wp_parse_url( home_url( '/desk/' ), PHP_URL_PATH );
	echo wp_json_encode( array(
		'id'               => $start,
		'name'             => 'Dream Desk',
		'short_name'       => 'Dream Desk',
		'description'      => 'Clients, projects, hosting and payments for Dream Web Digital.',
		'start_url'        => $start,
		'scope'            => $start,
		'display'          => 'standalone',
		'orientation'      => 'portrait',
		'background_color' => '#0B1F3A',
		'theme_color'      => '#0B203D',
		'icons'            => array(
			array( 'src' => $u . 'icon-192.png?v=3', 'sizes' => '192x192', 'type' => 'image/png', 'purpose' => 'any' ),
			array( 'src' => $u . 'icon-512.png?v=3', 'sizes' => '512x512', 'type' => 'image/png', 'purpose' => 'any' ),
			array( 'src' => $u . 'icon-maskable-512.png?v=3', 'sizes' => '512x512', 'type' => 'image/png', 'purpose' => 'maskable' ),
		),
	), JSON_UNESCAPED_SLASHES );
	exit;
}

function dwda_sw() {
	header( 'Content-Type: application/javascript; charset=utf-8' );
	header( 'Service-Worker-Allowed: ' . wp_parse_url( home_url( '/desk/' ), PHP_URL_PATH ) );
	header( 'Cache-Control: no-cache' );
	$v = DWDP_VERSION;
	?>
const CACHE = 'dream-desk-<?php echo esc_js( $v ); ?>';
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => {
	e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('dream-desk-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
	const req = e.request;
	if (req.method !== 'GET') { return; }
	const url = new URL(req.url);
	if (url.pathname.indexOf('/wp-json/') !== -1) { return; } // live data always comes from the network
	if (req.mode === 'navigate') {
		// Network first so you always see fresh data; fall back to the last copy when offline.
		e.respondWith(fetch(req).then(res => { const c = res.clone(); caches.open(CACHE).then(x => x.put(req, c)); return res; }).catch(() => caches.match(req)));
		return;
	}
	if (/\.(css|js|png|woff2?)(\?|$)/.test(url.pathname + url.search) || url.host.indexOf('fonts.') === 0) {
		e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => { const c = res.clone(); caches.open(CACHE).then(x => x.put(req, c)); return res; })));
	}
});
	<?php
	exit;
}
