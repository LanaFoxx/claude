(function(){
  var desktop = window.matchMedia('(min-width:1181px)');
  var nav = document.querySelector('.gm');
  if (nav) {
    var panel = nav.querySelector('.gm__panel'), inner = nav.querySelector('.gm__inner'), backdrop = nav.querySelector('.gm__backdrop');
    var triggers = [].slice.call(nav.querySelectorAll('.gm__trigger'));
    var current = null, openT = null, closeT = null, byHover = false;
    function setTop(){ var h = nav.closest('.elementor-location-header') || nav.closest('header') || document.body; var r = h.getBoundingClientRect(); document.documentElement.style.setProperty('--gm-top', Math.max(0, Math.round(r.bottom)) + 'px'); }
    function pane(id){ return document.getElementById(id); }
    function show(id){
      setTop();
      var next = pane(id); if (!next) return;
      triggers.forEach(function(t){ t.setAttribute('aria-expanded', t.dataset.gm === id ? 'true' : 'false'); });
      if (current && current !== next) { current.classList.remove('is-active'); current.hidden = true; }
      next.hidden = false;
      nav.classList.add('is-open');
      panel.style.height = inner.offsetHeight + 'px';
      requestAnimationFrame(function(){ next.classList.add('is-active'); });
      current = next;
    }
    function hide(focusBack){
      clearTimeout(openT);
      var was = current;
      triggers.forEach(function(t){ t.setAttribute('aria-expanded','false'); });
      nav.classList.remove('is-open'); panel.style.height = '0px';
      if (current) { current.classList.remove('is-active'); var c = current; setTimeout(function(){ if (c !== current || !nav.classList.contains('is-open')) c.hidden = true; }, 340); }
      current = null; byHover = false;
      if (focusBack && was) { var t = nav.querySelector('[data-gm="' + was.id + '"]'); if (t) t.focus(); }
    }
    triggers.forEach(function(t){
      t.addEventListener('mouseenter', function(){ if (!desktop.matches) return; clearTimeout(closeT); clearTimeout(openT);
        openT = setTimeout(function(){ if (!nav.classList.contains('is-open')) byHover = true; show(t.dataset.gm); }, nav.classList.contains('is-open') ? 0 : 90); });
      t.addEventListener('mouseleave', function(){ clearTimeout(openT); });
      t.addEventListener('click', function(e){ var kb = e.detail === 0; if (current && current.id === t.dataset.gm && (kb || !byHover)) hide(); else { if (kb || !current) byHover = !kb && byHover; if (kb) byHover = false; show(t.dataset.gm); } });
      t.addEventListener('keydown', function(e){ if (e.key === 'ArrowDown') { e.preventDefault(); byHover = false; show(t.dataset.gm); var f = current && current.querySelector('a'); if (f) f.focus(); } });
    });
    nav.querySelectorAll('a.gm__top').forEach(function(a){ a.addEventListener('mouseenter', function(){ if (!desktop.matches || !byHover) return; closeT = setTimeout(hide, 120); }); });
    nav.addEventListener('mouseleave', function(){ clearTimeout(openT); if (byHover) closeT = setTimeout(hide, 220); });
    nav.addEventListener('mouseenter', function(){ clearTimeout(closeT); });
    panel.addEventListener('mouseenter', function(){ clearTimeout(closeT); });
    backdrop.addEventListener('click', function(){ hide(); });
    backdrop.addEventListener('mouseenter', function(){ if (byHover) closeT = setTimeout(hide, 120); });
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && nav.classList.contains('is-open')) hide(true); });
    nav.addEventListener('focusout', function(e){ if (!nav.contains(e.relatedTarget)) hide(); });
    panel.addEventListener('click', function(e){ if (e.target.closest('a')) hide(); });
    window.addEventListener('resize', function(){ if (!desktop.matches) hide(); else if (current) { setTop(); panel.style.height = inner.offsetHeight + 'px'; } });
    window.addEventListener('scroll', function(){ if (current) setTop(); }, {passive:true});
  }

  /* Mobile drill-down */
  var mm = document.getElementById('glec-mm');
  if (mm) {
    var activeSub = null, opener = null;
    function back(){ if (!activeSub) return; var s = activeSub; mm.classList.remove('is-drilled'); s.classList.remove('is-active');
      if (opener) { opener.setAttribute('aria-expanded','false'); opener.focus(); }
      setTimeout(function(){ s.hidden = true; }, 320); activeSub = null; }
    mm.addEventListener('click', function(e){
      var d = e.target.closest('.glec-mm__drill');
      if (d) { var s = document.getElementById(d.dataset.gmm); if (!s) return; opener = d; d.setAttribute('aria-expanded','true');
        s.hidden = false; mm.classList.add('is-drilled'); requestAnimationFrame(function(){ s.classList.add('is-active'); }); activeSub = s;
        setTimeout(function(){ var b = s.querySelector('.glec-mm__back'); if (b) b.focus(); }, 60); return; }
      if (e.target.closest('.glec-mm__back')) { back(); return; }
      if (e.target.closest('.glec-mm__sub a')) { var c = mm.querySelector('.glec-mm__close'); if (c) c.click(); }
    });
    mm.addEventListener('keydown', function(e){ if (e.key === 'Escape' && activeSub) { e.stopImmediatePropagation(); back(); } }, true);
    new MutationObserver(function(){ if (!mm.classList.contains('is-open') && activeSub) { activeSub.classList.remove('is-active'); activeSub.hidden = true; mm.classList.remove('is-drilled'); activeSub = null; } }).observe(mm, {attributes:true, attributeFilter:['class']});
  }
})();
