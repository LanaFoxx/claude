/* DWD Projects: loaded by the screenshot service before capture. Forces lazy-loaded images and
   backgrounds (WP Rocket, SiteGround, native lazy loading, Elementor) to load, scrolls the page,
   and keeps watching for images that sliders or scripts add later, until the screenshot is taken. */
(function () {
	var d = document;
	function each(sel, fn) { [].forEach.call(d.querySelectorAll(sel), fn); }
	function fix() {
		if (!d.documentElement) { return; }
		each('img,source,iframe', function (e) {
			var s = e.getAttribute('data-lazy-src') || e.getAttribute('data-src') || e.getAttribute('data-original');
			var ss = e.getAttribute('data-lazy-srcset') || e.getAttribute('data-srcset');
			var sz = e.getAttribute('data-lazy-sizes') || e.getAttribute('data-sizes');
			if (s && e.getAttribute('src') !== s) { e.setAttribute('src', s); }
			if (ss && e.getAttribute('srcset') !== ss) { e.setAttribute('srcset', ss); }
			if (sz && sz !== 'auto') { e.setAttribute('sizes', sz); }
			if (e.loading === 'lazy') { e.loading = 'eager'; }
			if (e.classList) { e.classList.remove('lazyload', 'rocket-lazyload'); e.classList.add('lazyloaded'); }
		});
		each('[data-bg],[data-lazy-background],[data-background-image],[data-bg-image]', function (e) {
			var b = e.getAttribute('data-bg') || e.getAttribute('data-lazy-background') || e.getAttribute('data-background-image') || e.getAttribute('data-bg-image');
			if (b) { e.style.backgroundImage = /^url/.test(b) ? b : 'url("' + b + '")'; }
		});
		each('.e-con,.elementor-section,.elementor-element', function (e) { e.classList.add('e-lazyloaded'); });
	}
	function scrollThrough() {
		var y = 0;
		var t = setInterval(function () {
			y += 600;
			window.scrollTo(0, y);
			fix();
			if (y > d.documentElement.scrollHeight) { clearInterval(t); window.scrollTo(0, 0); fix(); }
		}, 80);
	}
	// Phone captures only show the first screen: never scroll (it hides the header), and make the
	// hero fill the screen so the next section doesn't peek in at the bottom.
	// At document start a phone browser reports a 980px layout until the page's viewport tag is read,
	// so check the device screen too.
	function isMobile() { return Math.min(window.innerWidth, (window.screen && window.screen.width) || 9999) < 768; }
	var mobile = isMobile();
	function fillScreen() {
		if (!d.body) { return; }
		var q = '[data-elementor-type="wp-page"] > .e-con, [data-elementor-type="wp-page"] > .elementor-section, [data-elementor-type="wp-page"] .elementor-section-wrap > .elementor-section';
		// The hero is the first real section; skip thin strips (dividers, colour bars) above it.
		var hero = [].filter.call(d.querySelectorAll(q), function (e) {
			return e.style.minHeight || e.getBoundingClientRect().height > 150;
		})[0];
		if (!hero) {
			var main = d.querySelector('main') || d.body;
			hero = [].filter.call(main.children, function (e) { return e.getBoundingClientRect().height > 150; })[0];
		}
		if (!hero) { return; }
		var top = hero.getBoundingClientRect().top + window.scrollY;
		var need = Math.ceil(window.innerHeight - top);
		if (need > 0 && hero.getBoundingClientRect().height < need) {
			hero.style.setProperty('min-height', need + 'px', 'important');
		}
	}
	function step() {
		try {
			mobile = isMobile();
			fix();
			if (mobile) { window.scrollTo(0, 0); fillScreen(); }
		} catch (e) { /* keep going: the page may still be loading */ }
	}
	step();
	if (d.readyState === 'loading') {
		d.addEventListener('DOMContentLoaded', function () { step(); if (!mobile) { scrollThrough(); } });
	} else if (!mobile) {
		scrollThrough();
	}
	window.addEventListener('load', function () { step(); if (!mobile) { scrollThrough(); } });
	// Catch images added or reset later by sliders and lazy-load scripts.
	var start = Date.now();
	var keep = setInterval(function () { step(); if (Date.now() - start > 12000) { clearInterval(keep); } }, 250);
	function watch() {
		if (!window.MutationObserver || !d.documentElement) { return false; }
		var queued = false;
		new MutationObserver(function () {
			if (queued) { return; }
			queued = true;
			setTimeout(function () { queued = false; step(); }, 150);
		}).observe(d.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'class'] });
		return true;
	}
	if (!watch()) { d.addEventListener('DOMContentLoaded', watch); }
})();
