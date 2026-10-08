( function () {
	// Mobile menu.
	var toggle = document.querySelector( '.mpc-menu-toggle' );
	var menu = document.getElementById( 'mpc-mobile-nav' );
	if ( toggle && menu ) {
		toggle.addEventListener( 'click', function () {
			var open = menu.hasAttribute( 'hidden' );
			menu.toggleAttribute( 'hidden', ! open );
			toggle.setAttribute( 'aria-expanded', open ? 'true' : 'false' );
			toggle.textContent = open ? 'Close' : 'Menu';
		} );
	}

	// Past Projects category filter.
	var filters = document.querySelectorAll( '.mpc-filter' );
	var projects = document.querySelectorAll( '.mpc-project' );
	filters.forEach( function ( button ) {
		button.addEventListener( 'click', function () {
			var cat = button.getAttribute( 'data-filter' );
			filters.forEach( function ( b ) {
				var on = b === button;
				b.style.background = on ? 'rgb(40, 58, 51)' : 'transparent';
				b.style.color = on ? 'rgb(244, 242, 234)' : 'rgb(40, 58, 51)';
				b.setAttribute( 'aria-pressed', on ? 'true' : 'false' );
			} );
			projects.forEach( function ( p ) {
				p.hidden = cat !== 'All' && p.getAttribute( 'data-category' ) !== cat;
			} );
		} );
	} );
} )();
