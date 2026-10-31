/* Premium layer: reveal animations, nav, lightbox, sliders, particles.
   Vanilla JS, no dependencies. Works on top of the DC runtime (morphdom keeps pv-* classes). */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.classList.add('pv-js');

  function $all(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }
  function el(tag, attrs, html) {
    var n = doc.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (html != null) n.innerHTML = html;
    return n;
  }
  var ICON = {
    close: '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    prev: '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>',
    next: '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>'
  };

  /* ---------------- Scroll reveal (IntersectionObserver, both directions) ---------------- */
  var revealIO = null, sectionIO = null;
  function classify(node, i, secIdx) {
    if (node.classList.contains('pv-r') || node.classList.contains('fx-noreveal')) return;
    var tag = node.tagName, cls;
    if (node.classList.contains('fx-shimmer') || node.querySelector && node.querySelector(':scope > .fx-shimmer')) cls = 'pv-name';
    else if (node.hasAttribute('data-pv-slider')) cls = 'pv-up';
    else if (tag === 'IMG' || tag === 'FIGURE' || node.classList.contains('pv-zoom') || (node.querySelector && node.querySelector(':scope > img'))) cls = 'pv-zoom-in';
    else if (tag === 'svg' || tag === 'SVG') cls = 'pv-down';
    else if (tag === 'P' || /^H[1-6]$/.test(tag)) cls = 'pv-up';
    else cls = ((i + secIdx) % 2 === 0) ? 'pv-left' : 'pv-right';
    node.classList.add('pv-r', cls, 'pv-d' + (Math.min(i, 5) + 1));
  }
  function setupReveal() {
    if (!('IntersectionObserver' in window)) return;
    if (!revealIO) {
      revealIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          // re-trigger in both directions; keep visible when it is on screen
          if (e.isIntersecting) e.target.classList.add('pv-in');
          else if (e.boundingClientRect.top > 0 || e.boundingClientRect.bottom < 0) e.target.classList.remove('pv-in');
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
      sectionIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { e.target.classList.toggle('pv-sec-in', e.isIntersecting); });
      }, { threshold: 0.12 });
    }
    $all('section').forEach(function (sec, s) {
      if (!sec.__pvSec) { sec.__pvSec = 1; sectionIO.observe(sec); }
      var kids = Array.prototype.slice.call(sec.children);
      // cards inside list/grid wrappers alternate sides too
      kids.forEach(function (k, i) {
        var wrap = k.children.length > 1 && !k.hasAttribute('data-pv-slider') && /^(DIV|UL|OL)$/.test(k.tagName) &&
          getComputedStyle(k).display.indexOf('grid') > -1;
        if (wrap) {
          Array.prototype.slice.call(k.children).forEach(function (c, j) { classify(c, j, s); observe(c); });
        } else { classify(k, i, s); observe(k); }
      });
    });
  }
  function observe(n) { if (n.__pvObs || !n.classList.contains('pv-r')) return; n.__pvObs = 1; revealIO.observe(n); }
  // safety net: never permanently invisible
  function failsafe() {
    $all('.pv-r:not(.pv-in)').forEach(function (n) {
      var r = n.getBoundingClientRect();
      if (r.bottom > 0 && r.top < innerHeight) n.classList.add('pv-in');
    });
  }

  /* ---------------- Section navigation ---------------- */
  var nav = null, navIO = null;
  function buildNav() {
    var secs = $all('section[data-pv-nav][id]');
    if (!secs.length) return;
    var key = secs.map(function (s) { return s.id; }).join('|');
    if (nav && nav.__key === key) return;
    if (nav) nav.remove();
    nav = el('nav', { 'class': 'pv-nav', 'aria-label': 'Sections' });
    nav.__key = key;
    var ul = el('ul');
    secs.forEach(function (s) {
      var li = el('li'), a = el('a', { href: '#' + s.id }, '');
      a.textContent = s.getAttribute('data-pv-nav');
      li.appendChild(a); ul.appendChild(li);
    });
    nav.appendChild(ul);
    doc.body.appendChild(nav);
    nav.addEventListener('click', function (e) {
      var a = e.target.closest('a'); if (!a) return;
      var t = doc.getElementById(a.getAttribute('href').slice(1)); if (!t) return;
      e.preventDefault();
      t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      if (history.replaceState) history.replaceState(null, '', '#' + t.id);
    });
    if (navIO) navIO.disconnect();
    if ('IntersectionObserver' in window) {
      navIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) setActive(e.target.id); });
      }, { rootMargin: '-45% 0px -50% 0px' });
      secs.forEach(function (s) { navIO.observe(s); });
    }
  }
  function setActive(id) {
    if (!nav) return;
    $all('a', nav).forEach(function (a) {
      var on = a.getAttribute('href') === '#' + id;
      if (on) { a.setAttribute('aria-current', 'true'); var ul = a.closest('ul'); if (ul) ul.scrollTo({ left: a.offsetLeft - ul.clientWidth / 2 + a.offsetWidth / 2, behavior: reduce ? 'auto' : 'smooth' }); }
      else a.removeAttribute('aria-current');
    });
  }

  /* ---------------- Scroll: parallax var + nav visibility ---------------- */
  var ticking = false;
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var y = window.scrollY || 0;
      if (!reduce) root.style.setProperty('--pv-sy', Math.min(y, 1600).toFixed(0));
      if (nav) nav.classList.toggle('pv-show', y > innerHeight * 0.6);
    });
  }

  /* ---------------- Golden particles ---------------- */
  function particles() {
    if (reduce || doc.querySelector('.pv-particles')) return;
    var box = el('div', { 'class': 'pv-particles', 'aria-hidden': 'true' });
    var n = innerWidth < 600 ? 14 : 24;
    for (var i = 0; i < n; i++) {
      var b = doc.createElement('b');
      b.style.left = (Math.random() * 100).toFixed(1) + '%';
      b.style.animationDuration = (9 + Math.random() * 10).toFixed(1) + 's';
      b.style.animationDelay = (-Math.random() * 18).toFixed(1) + 's';
      b.style.setProperty('--dx', ((Math.random() - 0.5) * 120).toFixed(0) + 'px');
      var s = (2 + Math.random() * 4).toFixed(1) + 'px'; b.style.width = s; b.style.height = s;
      box.appendChild(b);
    }
    doc.body.appendChild(box);
  }

  /* ---------------- Reusable lightbox ---------------- */
  var Lightbox = (function () {
    var box, img, cap, count, items = [], idx = 0, opener = null, sx = null;
    function ensure() {
      if (box) return;
      box = el('div', { 'class': 'pv-lb', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Photo viewer', 'aria-hidden': 'true' });
      box.innerHTML = '<p class="pv-count" aria-live="polite"></p><figure><img alt=""><figcaption></figcaption></figure>' +
        '<button type="button" class="pv-lb-prev" aria-label="पिछली फ़ोटो">' + ICON.prev + '</button>' +
        '<button type="button" class="pv-lb-next" aria-label="अगली फ़ोटो">' + ICON.next + '</button>' +
        '<button type="button" class="pv-lb-close" aria-label="बंद करें">' + ICON.close + '</button>';
      doc.body.appendChild(box);
      img = box.querySelector('img'); cap = box.querySelector('figcaption'); count = box.querySelector('.pv-count');
      img.addEventListener('load', function () { img.classList.add('pv-loaded'); });
      box.addEventListener('click', function (e) {
        if (e.target.closest('.pv-lb-close')) return close();
        if (e.target.closest('.pv-lb-prev')) return go(-1);
        if (e.target.closest('.pv-lb-next')) return go(1);
        if (e.target === box || e.target.tagName === 'FIGURE') close(); // click outside the photo
      });
      box.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
      box.addEventListener('touchend', function (e) {
        if (sx == null) return; var dx = e.changedTouches[0].clientX - sx; sx = null;
        if (Math.abs(dx) > 45) go(dx < 0 ? 1 : -1);
      });
    }
    function show() {
      var it = items[idx];
      img.classList.remove('pv-loaded');
      img.alt = it.alt || it.caption || '';
      img.src = it.src;
      if (img.complete && img.naturalWidth) img.classList.add('pv-loaded');
      cap.textContent = it.caption || '';
      count.textContent = (idx + 1) + ' / ' + items.length;
      box.classList.toggle('pv-single', items.length < 2);
    }
    function open(group, start, from) {
      ensure();
      items = group; idx = start; opener = from || null;
      show();
      box.classList.add('pv-open'); box.setAttribute('aria-hidden', 'false');
      doc.body.classList.add('pv-locked');
      doc.addEventListener('keydown', onKey, true);
      setTimeout(function () { box.querySelector('.pv-lb-close').focus({ preventScroll: true }); }, 30);
    }
    function close() {
      if (!box || !box.classList.contains('pv-open')) return;
      box.classList.remove('pv-open'); box.setAttribute('aria-hidden', 'true');
      doc.body.classList.remove('pv-locked');
      doc.removeEventListener('keydown', onKey, true);
      if (opener && doc.contains(opener)) opener.focus({ preventScroll: true });
    }
    function go(d) { if (items.length < 2) return; idx = (idx + d + items.length) % items.length; show(); }
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
      else if (e.key === 'Tab') { // keep focus inside
        var f = $all('button', box), i = f.indexOf(doc.activeElement);
        e.preventDefault(); f[(i + (e.shiftKey ? f.length - 1 : 1)) % f.length].focus();
      }
    }
    return { open: open, close: close };
  })();

  doc.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-pv-lightbox]');
    if (!t) return;
    e.preventDefault();
    var name = t.getAttribute('data-pv-lightbox');
    var nodes = $all('[data-pv-lightbox]').filter(function (n) { return n.getAttribute('data-pv-lightbox') === name; });
    var seen = {}, group = [], start = 0;
    nodes.forEach(function (n) {
      var im = n.tagName === 'IMG' ? n : n.querySelector('img');
      var src = n.getAttribute('data-full') || (im && im.getAttribute('src'));
      if (!src || seen[src] != null) { if (n === t) start = seen[src] || 0; return; }
      seen[src] = group.length;
      if (n === t) start = group.length;
      group.push({ src: src, caption: n.getAttribute('data-caption') || (n.tagName === 'IMG' ? n.alt : ''), alt: im ? im.alt : '' });
    });
    if (group.length) Lightbox.open(group, start, t);
  });

  /* ---------------- Independent sliders ---------------- */
  function Slider(rootEl) {
    var vp = rootEl.querySelector('.pv-viewport');
    var slides = $all('.pv-slide', rootEl);
    var dotsBox = rootEl.querySelector('.pv-dots');
    var interval = parseInt(rootEl.getAttribute('data-interval'), 10) || 5000;
    var cur = 0, timer = null, idleT = null, paused = false, raf = 0;
    if (!vp || !slides.length) return null;
    if (dotsBox) {
      dotsBox.innerHTML = '';
      slides.forEach(function (_, i) {
        var b = el('button', { type: 'button', 'aria-label': 'फ़ोटो ' + (i + 1) });
        b.addEventListener('click', function () { to(i); hold(); });
        dotsBox.appendChild(b);
      });
    }
    function to(i) {
      cur = (i + slides.length) % slides.length;
      var s = slides[cur];
      vp.scrollTo({ left: s.offsetLeft - (vp.clientWidth - s.offsetWidth) / 2, behavior: reduce ? 'auto' : 'smooth' });
      mark(cur);
    }
    function mark(i) {
      slides.forEach(function (s, j) { s.classList.toggle('pv-active', j === i); s.setAttribute('aria-hidden', j === i ? 'false' : 'true'); });
      if (dotsBox) $all('button', dotsBox).forEach(function (d, j) { if (j === i) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current'); });
    }
    function nearest() {
      var c = vp.scrollLeft + vp.clientWidth / 2, best = 0, bd = Infinity;
      slides.forEach(function (s, j) { var d = Math.abs(s.offsetLeft + s.offsetWidth / 2 - c); if (d < bd) { bd = d; best = j; } });
      return best;
    }
    vp.addEventListener('scroll', function () {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(function () { var n = nearest(); if (n !== cur) { cur = n; mark(n); } });
    }, { passive: true });
    var prev = rootEl.querySelector('.pv-prev'), next = rootEl.querySelector('.pv-next');
    if (prev) prev.addEventListener('click', function () { to(cur - 1); hold(); });
    if (next) next.addEventListener('click', function () { to(cur + 1); hold(); });
    vp.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); to(cur + 1); hold(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); to(cur - 1); hold(); }
    });
    // pause on interaction, resume after idle
    function hold() { paused = true; clearTimeout(idleT); idleT = setTimeout(function () { paused = false; }, interval * 2); }
    ['pointerdown', 'touchstart', 'wheel'].forEach(function (ev) { vp.addEventListener(ev, hold, { passive: true }); });
    rootEl.addEventListener('mouseenter', function () { paused = true; clearTimeout(idleT); });
    rootEl.addEventListener('mouseleave', function () { hold(); });
    rootEl.addEventListener('focusin', function () { paused = true; clearTimeout(idleT); });
    rootEl.addEventListener('focusout', function () { hold(); });
    var visible = false;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }, { threshold: 0.3 }).observe(rootEl);
    } else visible = true;
    function start() {
      if (reduce || timer) return;
      timer = setInterval(function () {
        if (paused || !visible || doc.hidden || doc.body.classList.contains('pv-locked')) return;
        to(cur + 1);
      }, interval);
    }
    rootEl.classList.add('pv-ready');
    // centre first slide without animation
    var s0 = slides[0]; vp.scrollLeft = s0.offsetLeft - (vp.clientWidth - s0.offsetWidth) / 2; mark(0);
    start();
    return { destroy: function () { clearInterval(timer); clearTimeout(idleT); } };
  }
  var sliders = [];
  function setupSliders() {
    $all('[data-pv-slider]').forEach(function (r) {
      if (r.__pvSlider) return;
      r.__pvSlider = Slider(r) || 1;
      if (r.__pvSlider !== 1) sliders.push(r.__pvSlider);
    });
  }

  /* ---------------- Lazy images ---------------- */
  function lazy() {
    $all('#app img:not([loading])').forEach(function (im, i) {
      var r = im.getBoundingClientRect();
      if (r.top > innerHeight * 1.5) im.setAttribute('loading', 'lazy');
      im.setAttribute('decoding', 'async');
    });
  }

  /* ---------------- Init & re-apply after re-renders ---------------- */
  function apply() {
    try { buildNav(); setupReveal(); setupSliders(); lazy(); failsafe(); }
    catch (err) { root.classList.remove('pv-js'); if (window.console) console.warn('premium layer disabled', err); }
  }
  var moT = 0;
  function init() {
    var app = doc.getElementById('app') || doc.body;
    apply(); particles(); onScroll();
    if ('MutationObserver' in window) {
      new MutationObserver(function (muts) {
        // only structural changes matter (countdown text updates are ignored)
        for (var i = 0; i < muts.length; i++) {
          if (muts[i].addedNodes.length) { clearTimeout(moT); moT = setTimeout(apply, 120); return; }
        }
      }).observe(app, { childList: true, subtree: true });
    }
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll, { passive: true });
    setTimeout(failsafe, 1500);
    if (location.hash) { var t = doc.getElementById(location.hash.slice(1)); if (t) setTimeout(function () { t.scrollIntoView(); }, 200); }
  }
  addEventListener('pagehide', function () { sliders.forEach(function (s) { s.destroy(); }); });
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', function () { setTimeout(init, 60); });
  else setTimeout(init, 60);
})();
