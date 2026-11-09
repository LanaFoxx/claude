(function(){
var started=0,ready=0,queued=[],ev=["keydown","mousedown","mousemove","touchstart","pointerdown","scroll","wheel"];
function seq(type,done){
 var s=[].slice.call(document.querySelectorAll('script[type="'+type+'"]')),h=0;
 (function n(){
  if(type==="fws/lazy"&&!h&&window.jQuery&&jQuery.holdReady){jQuery.holdReady(true);h=1;}
  var o=s.shift();
  if(!o){if(h)jQuery.holdReady(false);if(done)done();return;}
  var c=document.createElement("script");
  for(var i=0;i<o.attributes.length;i++){var a=o.attributes[i];if(a.name!=="type"&&a.name!=="data-src")c.setAttribute(a.name,a.value);}
  if(o.dataset.src){c.src=o.dataset.src;c.onload=c.onerror=n;o.parentNode.replaceChild(c,o);}
  else{c.text=o.textContent;o.parentNode.replaceChild(c,o);n();}
 })();
}
function start(e){
 if(started)return;
 if(e&&e.type==="mousemove"&&!e.movementX&&!e.movementY)return;
 started=1;
 [].forEach.call(document.querySelectorAll('script[type="fws/lazy"][data-src],script[type="fws/delay"][data-src]'),function(o){var l=document.createElement("link");l.rel="preload";l.as="script";l.href=o.dataset.src;document.head.appendChild(l);});
 ev.forEach(function(e){removeEventListener(e,start,{passive:true});});
 seq("fws/lazy",function(){
  var f=function(){setTimeout(function(){
   ready=1;document.removeEventListener("click",cap,true);
   var q=queued;queued=[];q.forEach(function(t){t.click();});
   seq("fws/delay");
  },60);};
  if(window.jQuery)jQuery(f);else f();
 });
}
function cap(e){
 if(ready)return;
 var t=e.target&&e.target.closest&&e.target.closest("a,button,[role=button],.elementor-menu-toggle,.swiper-button-next,.swiper-button-prev");
 if(!t)return;
 var a=t.closest("a[href]");
 if(a&&!t.matches(".elementor-menu-toggle,[role=button]")){var h=a.getAttribute("href")||"";if(!/^(#?$|#elementor-action|javascript:)/i.test(h))return;}
 e.preventDefault();e.stopPropagation();
 if(queued.indexOf(t)<0)queued.push(t);
 start(null);
}
document.addEventListener("click",cap,true);
ev.forEach(function(e){addEventListener(e,start,{passive:true});});
})();
