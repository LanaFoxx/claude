(function(){
  /* Mobile menu: open/close, focus trap, Escape */
  var panel=document.getElementById('glec-mm');
  var opener=null;
  function focusables(){return panel?[].slice.call(panel.querySelectorAll('a[href],button:not([disabled])')).filter(function(e){return e.offsetParent!==null;}):[];}
  function open(btn){ if(!panel)return; opener=btn; panel.classList.add('is-open'); panel.setAttribute('aria-hidden','false'); document.body.classList.add('glec-mm-open');
    document.querySelectorAll('.glec-burger').forEach(function(b){b.setAttribute('aria-expanded','true');});
    var f=focusables(); if(f[0]) f[0].focus(); }
  function close(){ if(!panel)return; panel.classList.remove('is-open'); panel.setAttribute('aria-hidden','true'); document.body.classList.remove('glec-mm-open');
    document.querySelectorAll('.glec-burger').forEach(function(b){b.setAttribute('aria-expanded','false');}); if(opener) opener.focus(); }
  document.addEventListener('click',function(e){ var b=e.target.closest('.glec-burger'); if(b){e.preventDefault();open(b);return;}
    if(e.target.closest('.glec-mm__close')){e.preventDefault();close();return;}
    if(panel && panel.classList.contains('is-open') && e.target.closest('.glec-mm a[href^="#"], .glec-mm a[href*="/#"]')) close(); });
  document.addEventListener('keydown',function(e){ if(!panel||!panel.classList.contains('is-open'))return;
    if(e.key==='Escape'){close();return;}
    if(e.key==='Tab'){var f=focusables(); if(!f.length)return; var a=f[0],z=f[f.length-1];
      if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus();} else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus();}}});

  /* Stats slider: user-driven only, wraps around */
  document.querySelectorAll('.g-sl').forEach(function(sl){
    var track=sl.querySelector('.g-sl__track'), slides=sl.querySelectorAll('.g-sl__slide'), dots=sl.querySelectorAll('.g-sl__dots button'), live=sl.querySelector('.g-sl__live'), i=0, n=slides.length;
    function go(k){ i=(k+n)%n; track.style.transform='translateX('+(-100*i)+'%)';
      slides.forEach(function(s,j){s.setAttribute('aria-hidden',j===i?'false':'true');});
      dots.forEach(function(d,j){d.setAttribute('aria-current',j===i?'true':'false');});
      if(live) live.textContent='Slide '+(i+1)+' of '+n; }
    sl.querySelector('.g-sl__btn--prev').addEventListener('click',function(){go(i-1);});
    sl.querySelector('.g-sl__btn--next').addEventListener('click',function(){go(i+1);});
    dots.forEach(function(d,j){d.addEventListener('click',function(){go(j);});});
    var x0=null; track.addEventListener('touchstart',function(e){x0=e.touches[0].clientX;},{passive:true});
    track.addEventListener('touchend',function(e){ if(x0===null)return; var dx=e.changedTouches[0].clientX-x0; if(Math.abs(dx)>40) go(dx<0?i+1:i-1); x0=null; });
    go(0);
  });

  /* Cart icon visibility after AJAX add to cart */
  if(window.jQuery){ jQuery(document.body).on('added_to_cart wc_fragments_refreshed wc_fragments_loaded',function(){
    var c=document.querySelector('.glec-cart-count'); var n=c?parseInt(c.getAttribute('data-count')||c.textContent,10):0;
    document.body.classList.toggle('glec-has-cart', n>0); }); }
})();
