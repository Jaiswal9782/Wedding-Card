/* Tiny runtime that renders the invitation's template (holes, sc-if, sc-for, on* events)
   with the page's own Component class. Uses morphdom for DOM diffing. */
(function () {
  var handlers = [];
  var comp, tpl, app, pending = false;

  window.DCLogic = function DCLogic(props) { this.props = props || {}; this.state = {}; };
  DCLogic.prototype.setState = function (p) {
    var next = typeof p === 'function' ? p(this.state, this.props) : p;
    Object.assign(this.state, next || {});
    schedule();
  };
  DCLogic.prototype.forceUpdate = function () { schedule(); };

  function schedule() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(function () { pending = false; render(); });
  }

  var HOLE = /\{\{\s*([^}]+?)\s*\}\}/g;
  var WHOLE = /^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/;

  function lookup(path, scope) {
    if (path === 'true') return true;
    if (path === 'false') return false;
    if (path === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(path)) return Number(path);
    var parts = path.split('.');
    var v = scope;
    for (var i = 0; i < parts.length; i++) {
      if (v == null) return undefined;
      v = v[parts[i]];
    }
    return v;
  }
  function raw(str, scope) {
    var m = WHOLE.exec(str || '');
    return m ? lookup(m[1], scope) : str;
  }
  function interp(str, scope) {
    return str.replace(HOLE, function (_, p) {
      var v = lookup(p, scope);
      return v == null ? '' : String(v);
    });
  }

  function walk(src, dst, scope) {
    for (var n = src.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 3) {
        dst.appendChild(document.createTextNode(n.data.indexOf('{{') >= 0 ? interp(n.data, scope) : n.data));
        continue;
      }
      if (n.nodeType !== 1) continue;
      var tag = n.localName;
      if (tag === 'sc-if') {
        if (raw(n.getAttribute('value'), scope)) walk(n, dst, scope);
        continue;
      }
      if (tag === 'sc-for') {
        var list = raw(n.getAttribute('list'), scope) || [];
        var as = n.getAttribute('as') || 'item';
        for (var i = 0; i < list.length; i++) {
          var s = Object.create(scope);
          s[as] = list[i];
          s.$index = i;
          walk(n, dst, s);
        }
        continue;
      }
      var el = n.cloneNode(false);
      var attrs = Array.prototype.slice.call(n.attributes);
      for (var a = 0; a < attrs.length; a++) {
        var name = attrs[a].name, val = attrs[a].value;
        if (/^hint-/.test(name)) { el.removeAttribute(name); continue; }
        if (/^on[a-z]+$/i.test(name)) {
          el.removeAttribute(name);
          var fn = raw(val, scope);
          if (typeof fn === 'function') {
            var evt = name.slice(2).toLowerCase();
            handlers.push(fn);
            el.setAttribute('data-on-' + evt, String(handlers.length - 1));
          }
          continue;
        }
        if (val.indexOf('{{') < 0) continue;
        var w = WHOLE.exec(val);
        if (w) {
          var v = lookup(w[1], scope);
          if (v === false || v == null) {
            if (/^aria-/.test(name)) el.setAttribute(name, String(!!v));
            else el.removeAttribute(name);
          } else if (v === true) {
            el.setAttribute(name, /^aria-/.test(name) ? 'true' : '');
          } else {
            el.setAttribute(name, String(v));
          }
        } else {
          el.setAttribute(name, interp(val, scope));
        }
      }
      walk(n, el, scope);
      dst.appendChild(el);
    }
  }

  function render() {
    handlers = [];
    var vals = comp.renderVals() || {};
    var next = document.createElement('div');
    next.id = 'app';
    walk(tpl.content, next, vals);
    morphdom(app, next, {
      onBeforeElUpdated: function (from, to) {
        if (from.tagName === 'INPUT' && from === document.activeElement && from.type === 'range') {
          from.value = to.getAttribute('value');
        }
        return true;
      }
    });
  }

  function dispatch(type) {
    return function (e) {
      var t = e.target.closest ? e.target.closest('[data-on-' + type + ']') : null;
      if (!t || !app.contains(t)) return;
      var fn = handlers[Number(t.getAttribute('data-on-' + type))];
      if (fn) fn(e);
    };
  }

  window.startInvitation = function () {
    tpl = document.getElementById('tpl');
    app = document.getElementById('app');
    ['click', 'pointerup', 'touchend'].forEach(function (t) { app.addEventListener(t, dispatch(t)); });
    var onChange = dispatch('change');
    app.addEventListener('input', onChange);
    app.addEventListener('change', onChange);
    comp = new window.Component({});
    render();
    if (comp.componentDidMount) comp.componentDidMount();
    window.addEventListener('pagehide', function () { if (comp.componentWillUnmount) comp.componentWillUnmount(); });
  };
})();
