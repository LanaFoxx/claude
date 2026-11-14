<?php
/**
 * Take a PNG screenshot of a page with Microlink and save it.
 *
 *   php tools/microlink-screenshot.php [url] [output.png]
 *
 * The API key comes from MICROLINK_API_KEY (environment, or the .env file at the repo root)
 * and is only ever sent in the x-api-key header, never in the URL.
 */

$url = $argv[1] ?? 'https://github.com/';
$out = $argv[2] ?? __DIR__ . '/github.png';

function env_key() {
	$key = getenv( 'MICROLINK_API_KEY' );
	if ( $key ) {
		return trim( $key );
	}
	$file = dirname( __DIR__ ) . '/.env';
	if ( is_readable( $file ) ) {
		foreach ( file( $file, FILE_IGNORE_NEW_LINES ) as $line ) {
			if ( preg_match( '/^\s*MICROLINK_API_KEY\s*=\s*"?([^"\s]*)"?\s*$/', $line, $m ) ) {
				return $m[1];
			}
		}
	}
	return '';
}

$key = env_key();
if ( '' === $key ) {
	fwrite( STDERR, "MICROLINK_API_KEY is not set (add it to .env).\n" );
	exit( 1 );
}

$query = http_build_query(
	array(
		'url'             => $url,
		'screenshot.type' => 'png',
		'meta'            => 'false',
	),
	'',
	'&',
	PHP_QUERY_RFC3986
);

$ch = curl_init( 'https://pro.microlink.io/?' . $query );
curl_setopt_array(
	$ch,
	array(
		CURLOPT_RETURNTRANSFER => true,
		CURLOPT_HTTPHEADER     => array( 'x-api-key: ' . $key ),
		CURLOPT_TIMEOUT        => 120,
	)
);
$body = curl_exec( $ch );
$http = curl_getinfo( $ch, CURLINFO_RESPONSE_CODE );
if ( false === $body ) {
	fwrite( STDERR, 'Request failed: ' . curl_error( $ch ) . "\n" );
	exit( 1 );
}
curl_close( $ch );

$res = json_decode( $body, true );
if ( ! is_array( $res ) || 'success' !== ( $res['status'] ?? '' ) ) {
	// Microlink errors carry a code: EAUTH = bad key, ERATE = quota used up, EPRO = needs a Pro key.
	fwrite( STDERR, sprintf( "Microlink error (HTTP %d): %s %s\n", $http, $res['code'] ?? '?', $res['message'] ?? $body ) );
	exit( 1 );
}

$shot = $res['data']['screenshot'] ?? null;
if ( empty( $shot['url'] ) ) {
	fwrite( STDERR, "No screenshot in the response.\n" );
	exit( 1 );
}

$png = file_get_contents( $shot['url'] );
file_put_contents( $out, $png );
printf( "Saved %s (%dx%d, %s bytes)\nAsset URL: %s\n", $out, $shot['width'] ?? 0, $shot['height'] ?? 0, number_format( strlen( $png ) ), $shot['url'] );
