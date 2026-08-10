import { g as getDefaultExportFromCjs, c as commonjsGlobal } from "./@imengyu-b2fb178e.js";
var interact_min = { exports: {} };
interact_min.exports;
(function(module, exports) {
  !function(t, e) {
    module.exports = e();
  }(commonjsGlobal, function() {
    function t(t2, e2) {
      var n2 = Object.keys(t2);
      if (Object.getOwnPropertySymbols) {
        var r2 = Object.getOwnPropertySymbols(t2);
        e2 && (r2 = r2.filter(function(e3) {
          return Object.getOwnPropertyDescriptor(t2, e3).enumerable;
        })), n2.push.apply(n2, r2);
      }
      return n2;
    }
    function e(e2) {
      for (var n2 = 1; n2 < arguments.length; n2++) {
        var r2 = null != arguments[n2] ? arguments[n2] : {};
        n2 % 2 ? t(Object(r2), true).forEach(function(t2) {
          a(e2, t2, r2[t2]);
        }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e2, Object.getOwnPropertyDescriptors(r2)) : t(Object(r2)).forEach(function(t2) {
          Object.defineProperty(e2, t2, Object.getOwnPropertyDescriptor(r2, t2));
        });
      }
      return e2;
    }
    function n(t2) {
      return n = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(t3) {
        return typeof t3;
      } : function(t3) {
        return t3 && "function" == typeof Symbol && t3.constructor === Symbol && t3 !== Symbol.prototype ? "symbol" : typeof t3;
      }, n(t2);
    }
    function r(t2, e2) {
      if (!(t2 instanceof e2))
        throw new TypeError("Cannot call a class as a function");
    }
    function i(t2, e2) {
      for (var n2 = 0; n2 < e2.length; n2++) {
        var r2 = e2[n2];
        r2.enumerable = r2.enumerable || false, r2.configurable = true, "value" in r2 && (r2.writable = true), Object.defineProperty(t2, d(r2.key), r2);
      }
    }
    function o(t2, e2, n2) {
      return e2 && i(t2.prototype, e2), n2 && i(t2, n2), Object.defineProperty(t2, "prototype", { writable: false }), t2;
    }
    function a(t2, e2, n2) {
      return (e2 = d(e2)) in t2 ? Object.defineProperty(t2, e2, { value: n2, enumerable: true, configurable: true, writable: true }) : t2[e2] = n2, t2;
    }
    function s(t2, e2) {
      if ("function" != typeof e2 && null !== e2)
        throw new TypeError("Super expression must either be null or a function");
      t2.prototype = Object.create(e2 && e2.prototype, { constructor: { value: t2, writable: true, configurable: true } }), Object.defineProperty(t2, "prototype", { writable: false }), e2 && l(t2, e2);
    }
    function c(t2) {
      return c = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function(t3) {
        return t3.__proto__ || Object.getPrototypeOf(t3);
      }, c(t2);
    }
    function l(t2, e2) {
      return l = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function(t3, e3) {
        return t3.__proto__ = e3, t3;
      }, l(t2, e2);
    }
    function u(t2) {
      if (void 0 === t2)
        throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
      return t2;
    }
    function p(t2) {
      var e2 = function() {
        if ("undefined" == typeof Reflect || !Reflect.construct)
          return false;
        if (Reflect.construct.sham)
          return false;
        if ("function" == typeof Proxy)
          return true;
        try {
          return Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function() {
          })), true;
        } catch (t3) {
          return false;
        }
      }();
      return function() {
        var n2, r2 = c(t2);
        if (e2) {
          var i2 = c(this).constructor;
          n2 = Reflect.construct(r2, arguments, i2);
        } else
          n2 = r2.apply(this, arguments);
        return function(t3, e3) {
          if (e3 && ("object" == typeof e3 || "function" == typeof e3))
            return e3;
          if (void 0 !== e3)
            throw new TypeError("Derived constructors may only return object or undefined");
          return u(t3);
        }(this, n2);
      };
    }
    function f() {
      return f = "undefined" != typeof Reflect && Reflect.get ? Reflect.get.bind() : function(t2, e2, n2) {
        var r2 = function(t3, e3) {
          for (; !Object.prototype.hasOwnProperty.call(t3, e3) && null !== (t3 = c(t3)); )
            ;
          return t3;
        }(t2, e2);
        if (r2) {
          var i2 = Object.getOwnPropertyDescriptor(r2, e2);
          return i2.get ? i2.get.call(arguments.length < 3 ? t2 : n2) : i2.value;
        }
      }, f.apply(this, arguments);
    }
    function d(t2) {
      var e2 = function(t3, e3) {
        if ("object" != typeof t3 || null === t3)
          return t3;
        var n2 = t3[Symbol.toPrimitive];
        if (void 0 !== n2) {
          var r2 = n2.call(t3, e3 || "default");
          if ("object" != typeof r2)
            return r2;
          throw new TypeError("@@toPrimitive must return a primitive value.");
        }
        return ("string" === e3 ? String : Number)(t3);
      }(t2, "string");
      return "symbol" == typeof e2 ? e2 : e2 + "";
    }
    var h = function(t2) {
      return !(!t2 || !t2.Window) && t2 instanceof t2.Window;
    }, v = void 0, g = void 0;
    function m(t2) {
      v = t2;
      var e2 = t2.document.createTextNode("");
      e2.ownerDocument !== t2.document && "function" == typeof t2.wrap && t2.wrap(e2) === e2 && (t2 = t2.wrap(t2)), g = t2;
    }
    function y(t2) {
      return h(t2) ? t2 : (t2.ownerDocument || t2).defaultView || g.window;
    }
    "undefined" != typeof window && window && m(window);
    var b = function(t2) {
      return !!t2 && "object" === n(t2);
    }, x = function(t2) {
      return "function" == typeof t2;
    }, w = { window: function(t2) {
      return t2 === g || h(t2);
    }, docFrag: function(t2) {
      return b(t2) && 11 === t2.nodeType;
    }, object: b, func: x, number: function(t2) {
      return "number" == typeof t2;
    }, bool: function(t2) {
      return "boolean" == typeof t2;
    }, string: function(t2) {
      return "string" == typeof t2;
    }, element: function(t2) {
      if (!t2 || "object" !== n(t2))
        return false;
      var e2 = y(t2) || g;
      return /object|function/.test("undefined" == typeof Element ? "undefined" : n(Element)) ? t2 instanceof Element || t2 instanceof e2.Element : 1 === t2.nodeType && "string" == typeof t2.nodeName;
    }, plainObject: function(t2) {
      return b(t2) && !!t2.constructor && /function Object\b/.test(t2.constructor.toString());
    }, array: function(t2) {
      return b(t2) && void 0 !== t2.length && x(t2.splice);
    } };
    function E(t2) {
      var e2 = t2.interaction;
      if ("drag" === e2.prepared.name) {
        var n2 = e2.prepared.axis;
        "x" === n2 ? (e2.coords.cur.page.y = e2.coords.start.page.y, e2.coords.cur.client.y = e2.coords.start.client.y, e2.coords.velocity.client.y = 0, e2.coords.velocity.page.y = 0) : "y" === n2 && (e2.coords.cur.page.x = e2.coords.start.page.x, e2.coords.cur.client.x = e2.coords.start.client.x, e2.coords.velocity.client.x = 0, e2.coords.velocity.page.x = 0);
      }
    }
    function T(t2) {
      var e2 = t2.iEvent, n2 = t2.interaction;
      if ("drag" === n2.prepared.name) {
        var r2 = n2.prepared.axis;
        if ("x" === r2 || "y" === r2) {
          var i2 = "x" === r2 ? "y" : "x";
          e2.page[i2] = n2.coords.start.page[i2], e2.client[i2] = n2.coords.start.client[i2], e2.delta[i2] = 0;
        }
      }
    }
    var S = { id: "actions/drag", install: function(t2) {
      var e2 = t2.actions, n2 = t2.Interactable, r2 = t2.defaults;
      n2.prototype.draggable = S.draggable, e2.map.drag = S, e2.methodDict.drag = "draggable", r2.actions.drag = S.defaults;
    }, listeners: { "interactions:before-action-move": E, "interactions:action-resume": E, "interactions:action-move": T, "auto-start:check": function(t2) {
      var e2 = t2.interaction, n2 = t2.interactable, r2 = t2.buttons, i2 = n2.options.drag;
      if (i2 && i2.enabled && (!e2.pointerIsDown || !/mouse|pointer/.test(e2.pointerType) || 0 != (r2 & n2.options.drag.mouseButtons)))
        return t2.action = { name: "drag", axis: "start" === i2.lockAxis ? i2.startAxis : i2.lockAxis }, false;
    } }, draggable: function(t2) {
      return w.object(t2) ? (this.options.drag.enabled = false !== t2.enabled, this.setPerAction("drag", t2), this.setOnEvents("drag", t2), /^(xy|x|y|start)$/.test(t2.lockAxis) && (this.options.drag.lockAxis = t2.lockAxis), /^(xy|x|y)$/.test(t2.startAxis) && (this.options.drag.startAxis = t2.startAxis), this) : w.bool(t2) ? (this.options.drag.enabled = t2, this) : this.options.drag;
    }, beforeMove: E, move: T, defaults: { startAxis: "xy", lockAxis: "xy" }, getCursor: function() {
      return "move";
    }, filterEventType: function(t2) {
      return 0 === t2.search("drag");
    } }, _ = S, P = { init: function(t2) {
      var e2 = t2;
      P.document = e2.document, P.DocumentFragment = e2.DocumentFragment || O, P.SVGElement = e2.SVGElement || O, P.SVGSVGElement = e2.SVGSVGElement || O, P.SVGElementInstance = e2.SVGElementInstance || O, P.Element = e2.Element || O, P.HTMLElement = e2.HTMLElement || P.Element, P.Event = e2.Event, P.Touch = e2.Touch || O, P.PointerEvent = e2.PointerEvent || e2.MSPointerEvent;
    }, document: null, DocumentFragment: null, SVGElement: null, SVGSVGElement: null, SVGElementInstance: null, Element: null, HTMLElement: null, Event: null, Touch: null, PointerEvent: null };
    function O() {
    }
    var k = P;
    var D = { init: function(t2) {
      var e2 = k.Element, n2 = t2.navigator || {};
      D.supportsTouch = "ontouchstart" in t2 || w.func(t2.DocumentTouch) && k.document instanceof t2.DocumentTouch, D.supportsPointerEvent = false !== n2.pointerEnabled && !!k.PointerEvent, D.isIOS = /iP(hone|od|ad)/.test(n2.platform), D.isIOS7 = /iP(hone|od|ad)/.test(n2.platform) && /OS 7[^\d]/.test(n2.appVersion), D.isIe9 = /MSIE 9/.test(n2.userAgent), D.isOperaMobile = "Opera" === n2.appName && D.supportsTouch && /Presto/.test(n2.userAgent), D.prefixedMatchesSelector = "matches" in e2.prototype ? "matches" : "webkitMatchesSelector" in e2.prototype ? "webkitMatchesSelector" : "mozMatchesSelector" in e2.prototype ? "mozMatchesSelector" : "oMatchesSelector" in e2.prototype ? "oMatchesSelector" : "msMatchesSelector", D.pEventTypes = D.supportsPointerEvent ? k.PointerEvent === t2.MSPointerEvent ? { up: "MSPointerUp", down: "MSPointerDown", over: "mouseover", out: "mouseout", move: "MSPointerMove", cancel: "MSPointerCancel" } : { up: "pointerup", down: "pointerdown", over: "pointerover", out: "pointerout", move: "pointermove", cancel: "pointercancel" } : null, D.wheelEvent = k.document && "onmousewheel" in k.document ? "mousewheel" : "wheel";
    }, supportsTouch: null, supportsPointerEvent: null, isIOS7: null, isIOS: null, isIe9: null, isOperaMobile: null, prefixedMatchesSelector: null, pEventTypes: null, wheelEvent: null };
    var I = D;
    function M(t2, e2) {
      if (t2.contains)
        return t2.contains(e2);
      for (; e2; ) {
        if (e2 === t2)
          return true;
        e2 = e2.parentNode;
      }
      return false;
    }
    function z(t2, e2) {
      for (; w.element(t2); ) {
        if (R(t2, e2))
          return t2;
        t2 = A(t2);
      }
      return null;
    }
    function A(t2) {
      var e2 = t2.parentNode;
      if (w.docFrag(e2)) {
        for (; (e2 = e2.host) && w.docFrag(e2); )
          ;
        return e2;
      }
      return e2;
    }
    function R(t2, e2) {
      return g !== v && (e2 = e2.replace(/\/deep\//g, " ")), t2[I.prefixedMatchesSelector](e2);
    }
    var C = function(t2) {
      return t2.parentNode || t2.host;
    };
    function j(t2, e2) {
      for (var n2, r2 = [], i2 = t2; (n2 = C(i2)) && i2 !== e2 && n2 !== i2.ownerDocument; )
        r2.unshift(i2), i2 = n2;
      return r2;
    }
    function F(t2, e2, n2) {
      for (; w.element(t2); ) {
        if (R(t2, e2))
          return true;
        if ((t2 = A(t2)) === n2)
          return R(t2, e2);
      }
      return false;
    }
    function X(t2) {
      return t2.correspondingUseElement || t2;
    }
    function Y(t2) {
      var e2 = t2 instanceof k.SVGElement ? t2.getBoundingClientRect() : t2.getClientRects()[0];
      return e2 && { left: e2.left, right: e2.right, top: e2.top, bottom: e2.bottom, width: e2.width || e2.right - e2.left, height: e2.height || e2.bottom - e2.top };
    }
    function L(t2) {
      var e2, n2 = Y(t2);
      if (!I.isIOS7 && n2) {
        var r2 = { x: (e2 = (e2 = y(t2)) || g).scrollX || e2.document.documentElement.scrollLeft, y: e2.scrollY || e2.document.documentElement.scrollTop };
        n2.left += r2.x, n2.right += r2.x, n2.top += r2.y, n2.bottom += r2.y;
      }
      return n2;
    }
    function q(t2) {
      for (var e2 = []; t2; )
        e2.push(t2), t2 = A(t2);
      return e2;
    }
    function B(t2) {
      return !!w.string(t2) && (k.document.querySelector(t2), true);
    }
    function V(t2, e2) {
      for (var n2 in e2)
        t2[n2] = e2[n2];
      return t2;
    }
    function W(t2, e2, n2) {
      return "parent" === t2 ? A(n2) : "self" === t2 ? e2.getRect(n2) : z(n2, t2);
    }
    function G(t2, e2, n2, r2) {
      var i2 = t2;
      return w.string(i2) ? i2 = W(i2, e2, n2) : w.func(i2) && (i2 = i2.apply(void 0, r2)), w.element(i2) && (i2 = L(i2)), i2;
    }
    function N(t2) {
      return t2 && { x: "x" in t2 ? t2.x : t2.left, y: "y" in t2 ? t2.y : t2.top };
    }
    function U(t2) {
      return !t2 || "x" in t2 && "y" in t2 || ((t2 = V({}, t2)).x = t2.left || 0, t2.y = t2.top || 0, t2.width = t2.width || (t2.right || 0) - t2.x, t2.height = t2.height || (t2.bottom || 0) - t2.y), t2;
    }
    function H(t2, e2, n2) {
      t2.left && (e2.left += n2.x), t2.right && (e2.right += n2.x), t2.top && (e2.top += n2.y), t2.bottom && (e2.bottom += n2.y), e2.width = e2.right - e2.left, e2.height = e2.bottom - e2.top;
    }
    function K(t2, e2, n2) {
      var r2 = n2 && t2.options[n2];
      return N(G(r2 && r2.origin || t2.options.origin, t2, e2, [t2 && e2])) || { x: 0, y: 0 };
    }
    function $(t2, e2) {
      var n2 = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : function(t3) {
        return true;
      }, r2 = arguments.length > 3 ? arguments[3] : void 0;
      if (r2 = r2 || {}, w.string(t2) && -1 !== t2.search(" ") && (t2 = J(t2)), w.array(t2))
        return t2.forEach(function(t3) {
          return $(t3, e2, n2, r2);
        }), r2;
      if (w.object(t2) && (e2 = t2, t2 = ""), w.func(e2) && n2(t2))
        r2[t2] = r2[t2] || [], r2[t2].push(e2);
      else if (w.array(e2))
        for (var i2 = 0, o2 = e2; i2 < o2.length; i2++) {
          var a2 = o2[i2];
          $(t2, a2, n2, r2);
        }
      else if (w.object(e2))
        for (var s2 in e2) {
          $(J(s2).map(function(e3) {
            return "".concat(t2).concat(e3);
          }), e2[s2], n2, r2);
        }
      return r2;
    }
    function J(t2) {
      return t2.trim().split(/ +/);
    }
    var Q = function(t2, e2) {
      return Math.sqrt(t2 * t2 + e2 * e2);
    }, Z = ["webkit", "moz"];
    function tt(t2, e2) {
      t2.__set || (t2.__set = {});
      var n2 = function(n3) {
        if (Z.some(function(t3) {
          return 0 === n3.indexOf(t3);
        }))
          return 1;
        "function" != typeof t2[n3] && "__set" !== n3 && Object.defineProperty(t2, n3, { get: function() {
          return n3 in t2.__set ? t2.__set[n3] : t2.__set[n3] = e2[n3];
        }, set: function(e3) {
          t2.__set[n3] = e3;
        }, configurable: true });
      };
      for (var r2 in e2)
        n2(r2);
      return t2;
    }
    function et(t2, e2) {
      t2.page = t2.page || {}, t2.page.x = e2.page.x, t2.page.y = e2.page.y, t2.client = t2.client || {}, t2.client.x = e2.client.x, t2.client.y = e2.client.y, t2.timeStamp = e2.timeStamp;
    }
    function nt(t2) {
      t2.page.x = 0, t2.page.y = 0, t2.client.x = 0, t2.client.y = 0;
    }
    function rt(t2) {
      return t2 instanceof k.Event || t2 instanceof k.Touch;
    }
    function it(t2, e2, n2) {
      return t2 = t2 || "page", (n2 = n2 || {}).x = e2[t2 + "X"], n2.y = e2[t2 + "Y"], n2;
    }
    function ot(t2, e2) {
      return e2 = e2 || { x: 0, y: 0 }, I.isOperaMobile && rt(t2) ? (it("screen", t2, e2), e2.x += window.scrollX, e2.y += window.scrollY) : it("page", t2, e2), e2;
    }
    function at(t2) {
      return w.number(t2.pointerId) ? t2.pointerId : t2.identifier;
    }
    function st(t2, e2, n2) {
      var r2 = e2.length > 1 ? lt(e2) : e2[0];
      ot(r2, t2.page), function(t3, e3) {
        e3 = e3 || {}, I.isOperaMobile && rt(t3) ? it("screen", t3, e3) : it("client", t3, e3);
      }(r2, t2.client), t2.timeStamp = n2;
    }
    function ct(t2) {
      var e2 = [];
      return w.array(t2) ? (e2[0] = t2[0], e2[1] = t2[1]) : "touchend" === t2.type ? 1 === t2.touches.length ? (e2[0] = t2.touches[0], e2[1] = t2.changedTouches[0]) : 0 === t2.touches.length && (e2[0] = t2.changedTouches[0], e2[1] = t2.changedTouches[1]) : (e2[0] = t2.touches[0], e2[1] = t2.touches[1]), e2;
    }
    function lt(t2) {
      for (var e2 = { pageX: 0, pageY: 0, clientX: 0, clientY: 0, screenX: 0, screenY: 0 }, n2 = 0; n2 < t2.length; n2++) {
        var r2 = t2[n2];
        for (var i2 in e2)
          e2[i2] += r2[i2];
      }
      for (var o2 in e2)
        e2[o2] /= t2.length;
      return e2;
    }
    function ut(t2) {
      if (!t2.length)
        return null;
      var e2 = ct(t2), n2 = Math.min(e2[0].pageX, e2[1].pageX), r2 = Math.min(e2[0].pageY, e2[1].pageY), i2 = Math.max(e2[0].pageX, e2[1].pageX), o2 = Math.max(e2[0].pageY, e2[1].pageY);
      return { x: n2, y: r2, left: n2, top: r2, right: i2, bottom: o2, width: i2 - n2, height: o2 - r2 };
    }
    function pt(t2, e2) {
      var n2 = e2 + "X", r2 = e2 + "Y", i2 = ct(t2), o2 = i2[0][n2] - i2[1][n2], a2 = i2[0][r2] - i2[1][r2];
      return Q(o2, a2);
    }
    function ft(t2, e2) {
      var n2 = e2 + "X", r2 = e2 + "Y", i2 = ct(t2), o2 = i2[1][n2] - i2[0][n2], a2 = i2[1][r2] - i2[0][r2];
      return 180 * Math.atan2(a2, o2) / Math.PI;
    }
    function dt(t2) {
      return w.string(t2.pointerType) ? t2.pointerType : w.number(t2.pointerType) ? [void 0, void 0, "touch", "pen", "mouse"][t2.pointerType] : /touch/.test(t2.type || "") || t2 instanceof k.Touch ? "touch" : "mouse";
    }
    function ht(t2) {
      var e2 = w.func(t2.composedPath) ? t2.composedPath() : t2.path;
      return [X(e2 ? e2[0] : t2.target), X(t2.currentTarget)];
    }
    var vt = function() {
      function t2(e2) {
        r(this, t2), this.immediatePropagationStopped = false, this.propagationStopped = false, this._interaction = e2;
      }
      return o(t2, [{ key: "preventDefault", value: function() {
      } }, { key: "stopPropagation", value: function() {
        this.propagationStopped = true;
      } }, { key: "stopImmediatePropagation", value: function() {
        this.immediatePropagationStopped = this.propagationStopped = true;
      } }]), t2;
    }();
    Object.defineProperty(vt.prototype, "interaction", { get: function() {
      return this._interaction._proxy;
    }, set: function() {
    } });
    var gt = function(t2, e2) {
      for (var n2 = 0; n2 < e2.length; n2++) {
        var r2 = e2[n2];
        t2.push(r2);
      }
      return t2;
    }, mt = function(t2) {
      return gt([], t2);
    }, yt = function(t2, e2) {
      for (var n2 = 0; n2 < t2.length; n2++)
        if (e2(t2[n2], n2, t2))
          return n2;
      return -1;
    }, bt = function(t2, e2) {
      return t2[yt(t2, e2)];
    }, xt = function(t2) {
      s(n2, t2);
      var e2 = p(n2);
      function n2(t3, i2, o2) {
        var a2;
        r(this, n2), (a2 = e2.call(this, i2._interaction)).dropzone = void 0, a2.dragEvent = void 0, a2.relatedTarget = void 0, a2.draggable = void 0, a2.propagationStopped = false, a2.immediatePropagationStopped = false;
        var s2 = "dragleave" === o2 ? t3.prev : t3.cur, c2 = s2.element, l2 = s2.dropzone;
        return a2.type = o2, a2.target = c2, a2.currentTarget = c2, a2.dropzone = l2, a2.dragEvent = i2, a2.relatedTarget = i2.target, a2.draggable = i2.interactable, a2.timeStamp = i2.timeStamp, a2;
      }
      return o(n2, [{ key: "reject", value: function() {
        var t3 = this, e3 = this._interaction.dropState;
        if ("dropactivate" === this.type || this.dropzone && e3.cur.dropzone === this.dropzone && e3.cur.element === this.target)
          if (e3.prev.dropzone = this.dropzone, e3.prev.element = this.target, e3.rejected = true, e3.events.enter = null, this.stopImmediatePropagation(), "dropactivate" === this.type) {
            var r2 = e3.activeDrops, i2 = yt(r2, function(e4) {
              var n3 = e4.dropzone, r3 = e4.element;
              return n3 === t3.dropzone && r3 === t3.target;
            });
            e3.activeDrops.splice(i2, 1);
            var o2 = new n2(e3, this.dragEvent, "dropdeactivate");
            o2.dropzone = this.dropzone, o2.target = this.target, this.dropzone.fire(o2);
          } else
            this.dropzone.fire(new n2(e3, this.dragEvent, "dragleave"));
      } }, { key: "preventDefault", value: function() {
      } }, { key: "stopPropagation", value: function() {
        this.propagationStopped = true;
      } }, { key: "stopImmediatePropagation", value: function() {
        this.immediatePropagationStopped = this.propagationStopped = true;
      } }]), n2;
    }(vt);
    function wt(t2, e2) {
      for (var n2 = 0, r2 = t2.slice(); n2 < r2.length; n2++) {
        var i2 = r2[n2], o2 = i2.dropzone, a2 = i2.element;
        e2.dropzone = o2, e2.target = a2, o2.fire(e2), e2.propagationStopped = e2.immediatePropagationStopped = false;
      }
    }
    function Et(t2, e2) {
      for (var n2 = function(t3, e3) {
        for (var n3 = [], r3 = 0, i3 = t3.interactables.list; r3 < i3.length; r3++) {
          var o2 = i3[r3];
          if (o2.options.drop.enabled) {
            var a2 = o2.options.drop.accept;
            if (!(w.element(a2) && a2 !== e3 || w.string(a2) && !R(e3, a2) || w.func(a2) && !a2({ dropzone: o2, draggableElement: e3 })))
              for (var s2 = 0, c2 = o2.getAllElements(); s2 < c2.length; s2++) {
                var l2 = c2[s2];
                l2 !== e3 && n3.push({ dropzone: o2, element: l2, rect: o2.getRect(l2) });
              }
          }
        }
        return n3;
      }(t2, e2), r2 = 0; r2 < n2.length; r2++) {
        var i2 = n2[r2];
        i2.rect = i2.dropzone.getRect(i2.element);
      }
      return n2;
    }
    function Tt(t2, e2, n2) {
      for (var r2 = t2.dropState, i2 = t2.interactable, o2 = t2.element, a2 = [], s2 = 0, c2 = r2.activeDrops; s2 < c2.length; s2++) {
        var l2 = c2[s2], u2 = l2.dropzone, p2 = l2.element, f2 = l2.rect, d2 = u2.dropCheck(e2, n2, i2, o2, p2, f2);
        a2.push(d2 ? p2 : null);
      }
      var h2 = function(t3) {
        for (var e3, n3, r3, i3 = [], o3 = 0; o3 < t3.length; o3++) {
          var a3 = t3[o3], s3 = t3[e3];
          if (a3 && o3 !== e3)
            if (s3) {
              var c3 = C(a3), l3 = C(s3);
              if (c3 !== a3.ownerDocument)
                if (l3 !== a3.ownerDocument)
                  if (c3 !== l3) {
                    i3 = i3.length ? i3 : j(s3);
                    var u3 = void 0;
                    if (s3 instanceof k.HTMLElement && a3 instanceof k.SVGElement && !(a3 instanceof k.SVGSVGElement)) {
                      if (a3 === l3)
                        continue;
                      u3 = a3.ownerSVGElement;
                    } else
                      u3 = a3;
                    for (var p3 = j(u3, s3.ownerDocument), f3 = 0; p3[f3] && p3[f3] === i3[f3]; )
                      f3++;
                    var d3 = [p3[f3 - 1], p3[f3], i3[f3]];
                    if (d3[0])
                      for (var h3 = d3[0].lastChild; h3; ) {
                        if (h3 === d3[1]) {
                          e3 = o3, i3 = p3;
                          break;
                        }
                        if (h3 === d3[2])
                          break;
                        h3 = h3.previousSibling;
                      }
                  } else
                    r3 = s3, (parseInt(y(n3 = a3).getComputedStyle(n3).zIndex, 10) || 0) >= (parseInt(y(r3).getComputedStyle(r3).zIndex, 10) || 0) && (e3 = o3);
                else
                  e3 = o3;
            } else
              e3 = o3;
        }
        return e3;
      }(a2);
      return r2.activeDrops[h2] || null;
    }
    function St(t2, e2, n2) {
      var r2 = t2.dropState, i2 = { enter: null, leave: null, activate: null, deactivate: null, move: null, drop: null };
      return "dragstart" === n2.type && (i2.activate = new xt(r2, n2, "dropactivate"), i2.activate.target = null, i2.activate.dropzone = null), "dragend" === n2.type && (i2.deactivate = new xt(r2, n2, "dropdeactivate"), i2.deactivate.target = null, i2.deactivate.dropzone = null), r2.rejected || (r2.cur.element !== r2.prev.element && (r2.prev.dropzone && (i2.leave = new xt(r2, n2, "dragleave"), n2.dragLeave = i2.leave.target = r2.prev.element, n2.prevDropzone = i2.leave.dropzone = r2.prev.dropzone), r2.cur.dropzone && (i2.enter = new xt(r2, n2, "dragenter"), n2.dragEnter = r2.cur.element, n2.dropzone = r2.cur.dropzone)), "dragend" === n2.type && r2.cur.dropzone && (i2.drop = new xt(r2, n2, "drop"), n2.dropzone = r2.cur.dropzone, n2.relatedTarget = r2.cur.element), "dragmove" === n2.type && r2.cur.dropzone && (i2.move = new xt(r2, n2, "dropmove"), n2.dropzone = r2.cur.dropzone)), i2;
    }
    function _t(t2, e2) {
      var n2 = t2.dropState, r2 = n2.activeDrops, i2 = n2.cur, o2 = n2.prev;
      e2.leave && o2.dropzone.fire(e2.leave), e2.enter && i2.dropzone.fire(e2.enter), e2.move && i2.dropzone.fire(e2.move), e2.drop && i2.dropzone.fire(e2.drop), e2.deactivate && wt(r2, e2.deactivate), n2.prev.dropzone = i2.dropzone, n2.prev.element = i2.element;
    }
    function Pt(t2, e2) {
      var n2 = t2.interaction, r2 = t2.iEvent, i2 = t2.event;
      if ("dragmove" === r2.type || "dragend" === r2.type) {
        var o2 = n2.dropState;
        e2.dynamicDrop && (o2.activeDrops = Et(e2, n2.element));
        var a2 = r2, s2 = Tt(n2, a2, i2);
        o2.rejected = o2.rejected && !!s2 && s2.dropzone === o2.cur.dropzone && s2.element === o2.cur.element, o2.cur.dropzone = s2 && s2.dropzone, o2.cur.element = s2 && s2.element, o2.events = St(n2, 0, a2);
      }
    }
    var Ot = { id: "actions/drop", install: function(t2) {
      var e2 = t2.actions, n2 = t2.interactStatic, r2 = t2.Interactable, i2 = t2.defaults;
      t2.usePlugin(_), r2.prototype.dropzone = function(t3) {
        return function(t4, e3) {
          if (w.object(e3)) {
            if (t4.options.drop.enabled = false !== e3.enabled, e3.listeners) {
              var n3 = $(e3.listeners), r3 = Object.keys(n3).reduce(function(t5, e4) {
                return t5[/^(enter|leave)/.test(e4) ? "drag".concat(e4) : /^(activate|deactivate|move)/.test(e4) ? "drop".concat(e4) : e4] = n3[e4], t5;
              }, {}), i3 = t4.options.drop.listeners;
              i3 && t4.off(i3), t4.on(r3), t4.options.drop.listeners = r3;
            }
            return w.func(e3.ondrop) && t4.on("drop", e3.ondrop), w.func(e3.ondropactivate) && t4.on("dropactivate", e3.ondropactivate), w.func(e3.ondropdeactivate) && t4.on("dropdeactivate", e3.ondropdeactivate), w.func(e3.ondragenter) && t4.on("dragenter", e3.ondragenter), w.func(e3.ondragleave) && t4.on("dragleave", e3.ondragleave), w.func(e3.ondropmove) && t4.on("dropmove", e3.ondropmove), /^(pointer|center)$/.test(e3.overlap) ? t4.options.drop.overlap = e3.overlap : w.number(e3.overlap) && (t4.options.drop.overlap = Math.max(Math.min(1, e3.overlap), 0)), "accept" in e3 && (t4.options.drop.accept = e3.accept), "checker" in e3 && (t4.options.drop.checker = e3.checker), t4;
          }
          if (w.bool(e3))
            return t4.options.drop.enabled = e3, t4;
          return t4.options.drop;
        }(this, t3);
      }, r2.prototype.dropCheck = function(t3, e3, n3, r3, i3, o2) {
        return function(t4, e4, n4, r4, i4, o3, a2) {
          var s2 = false;
          if (!(a2 = a2 || t4.getRect(o3)))
            return !!t4.options.drop.checker && t4.options.drop.checker(e4, n4, s2, t4, o3, r4, i4);
          var c2 = t4.options.drop.overlap;
          if ("pointer" === c2) {
            var l2 = K(r4, i4, "drag"), u2 = ot(e4);
            u2.x += l2.x, u2.y += l2.y;
            var p2 = u2.x > a2.left && u2.x < a2.right, f2 = u2.y > a2.top && u2.y < a2.bottom;
            s2 = p2 && f2;
          }
          var d2 = r4.getRect(i4);
          if (d2 && "center" === c2) {
            var h2 = d2.left + d2.width / 2, v2 = d2.top + d2.height / 2;
            s2 = h2 >= a2.left && h2 <= a2.right && v2 >= a2.top && v2 <= a2.bottom;
          }
          if (d2 && w.number(c2)) {
            s2 = Math.max(0, Math.min(a2.right, d2.right) - Math.max(a2.left, d2.left)) * Math.max(0, Math.min(a2.bottom, d2.bottom) - Math.max(a2.top, d2.top)) / (d2.width * d2.height) >= c2;
          }
          t4.options.drop.checker && (s2 = t4.options.drop.checker(e4, n4, s2, t4, o3, r4, i4));
          return s2;
        }(this, t3, e3, n3, r3, i3, o2);
      }, n2.dynamicDrop = function(e3) {
        return w.bool(e3) ? (t2.dynamicDrop = e3, n2) : t2.dynamicDrop;
      }, V(e2.phaselessTypes, { dragenter: true, dragleave: true, dropactivate: true, dropdeactivate: true, dropmove: true, drop: true }), e2.methodDict.drop = "dropzone", t2.dynamicDrop = false, i2.actions.drop = Ot.defaults;
    }, listeners: { "interactions:before-action-start": function(t2) {
      var e2 = t2.interaction;
      "drag" === e2.prepared.name && (e2.dropState = { cur: { dropzone: null, element: null }, prev: { dropzone: null, element: null }, rejected: null, events: null, activeDrops: [] });
    }, "interactions:after-action-start": function(t2, e2) {
      var n2 = t2.interaction, r2 = (t2.event, t2.iEvent);
      if ("drag" === n2.prepared.name) {
        var i2 = n2.dropState;
        i2.activeDrops = [], i2.events = {}, i2.activeDrops = Et(e2, n2.element), i2.events = St(n2, 0, r2), i2.events.activate && (wt(i2.activeDrops, i2.events.activate), e2.fire("actions/drop:start", { interaction: n2, dragEvent: r2 }));
      }
    }, "interactions:action-move": Pt, "interactions:after-action-move": function(t2, e2) {
      var n2 = t2.interaction, r2 = t2.iEvent;
      if ("drag" === n2.prepared.name) {
        var i2 = n2.dropState;
        _t(n2, i2.events), e2.fire("actions/drop:move", { interaction: n2, dragEvent: r2 }), i2.events = {};
      }
    }, "interactions:action-end": function(t2, e2) {
      if ("drag" === t2.interaction.prepared.name) {
        var n2 = t2.interaction, r2 = t2.iEvent;
        Pt(t2, e2), _t(n2, n2.dropState.events), e2.fire("actions/drop:end", { interaction: n2, dragEvent: r2 });
      }
    }, "interactions:stop": function(t2) {
      var e2 = t2.interaction;
      if ("drag" === e2.prepared.name) {
        var n2 = e2.dropState;
        n2 && (n2.activeDrops = null, n2.events = null, n2.cur.dropzone = null, n2.cur.element = null, n2.prev.dropzone = null, n2.prev.element = null, n2.rejected = false);
      }
    } }, getActiveDrops: Et, getDrop: Tt, getDropEvents: St, fireDropEvents: _t, filterEventType: function(t2) {
      return 0 === t2.search("drag") || 0 === t2.search("drop");
    }, defaults: { enabled: false, accept: null, overlap: "pointer" } }, kt = Ot;
    function Dt(t2) {
      var e2 = t2.interaction, n2 = t2.iEvent, r2 = t2.phase;
      if ("gesture" === e2.prepared.name) {
        var i2 = e2.pointers.map(function(t3) {
          return t3.pointer;
        }), o2 = "start" === r2, a2 = "end" === r2, s2 = e2.interactable.options.deltaSource;
        if (n2.touches = [i2[0], i2[1]], o2)
          n2.distance = pt(i2, s2), n2.box = ut(i2), n2.scale = 1, n2.ds = 0, n2.angle = ft(i2, s2), n2.da = 0, e2.gesture.startDistance = n2.distance, e2.gesture.startAngle = n2.angle;
        else if (a2 || e2.pointers.length < 2) {
          var c2 = e2.prevEvent;
          n2.distance = c2.distance, n2.box = c2.box, n2.scale = c2.scale, n2.ds = 0, n2.angle = c2.angle, n2.da = 0;
        } else
          n2.distance = pt(i2, s2), n2.box = ut(i2), n2.scale = n2.distance / e2.gesture.startDistance, n2.angle = ft(i2, s2), n2.ds = n2.scale - e2.gesture.scale, n2.da = n2.angle - e2.gesture.angle;
        e2.gesture.distance = n2.distance, e2.gesture.angle = n2.angle, w.number(n2.scale) && n2.scale !== 1 / 0 && !isNaN(n2.scale) && (e2.gesture.scale = n2.scale);
      }
    }
    var It = { id: "actions/gesture", before: ["actions/drag", "actions/resize"], install: function(t2) {
      var e2 = t2.actions, n2 = t2.Interactable, r2 = t2.defaults;
      n2.prototype.gesturable = function(t3) {
        return w.object(t3) ? (this.options.gesture.enabled = false !== t3.enabled, this.setPerAction("gesture", t3), this.setOnEvents("gesture", t3), this) : w.bool(t3) ? (this.options.gesture.enabled = t3, this) : this.options.gesture;
      }, e2.map.gesture = It, e2.methodDict.gesture = "gesturable", r2.actions.gesture = It.defaults;
    }, listeners: { "interactions:action-start": Dt, "interactions:action-move": Dt, "interactions:action-end": Dt, "interactions:new": function(t2) {
      t2.interaction.gesture = { angle: 0, distance: 0, scale: 1, startAngle: 0, startDistance: 0 };
    }, "auto-start:check": function(t2) {
      if (!(t2.interaction.pointers.length < 2)) {
        var e2 = t2.interactable.options.gesture;
        if (e2 && e2.enabled)
          return t2.action = { name: "gesture" }, false;
      }
    } }, defaults: {}, getCursor: function() {
      return "";
    }, filterEventType: function(t2) {
      return 0 === t2.search("gesture");
    } }, Mt = It;
    function zt(t2, e2, n2, r2, i2, o2, a2) {
      if (!e2)
        return false;
      if (true === e2) {
        var s2 = w.number(o2.width) ? o2.width : o2.right - o2.left, c2 = w.number(o2.height) ? o2.height : o2.bottom - o2.top;
        if (a2 = Math.min(a2, Math.abs(("left" === t2 || "right" === t2 ? s2 : c2) / 2)), s2 < 0 && ("left" === t2 ? t2 = "right" : "right" === t2 && (t2 = "left")), c2 < 0 && ("top" === t2 ? t2 = "bottom" : "bottom" === t2 && (t2 = "top")), "left" === t2) {
          var l2 = s2 >= 0 ? o2.left : o2.right;
          return n2.x < l2 + a2;
        }
        if ("top" === t2) {
          var u2 = c2 >= 0 ? o2.top : o2.bottom;
          return n2.y < u2 + a2;
        }
        if ("right" === t2)
          return n2.x > (s2 >= 0 ? o2.right : o2.left) - a2;
        if ("bottom" === t2)
          return n2.y > (c2 >= 0 ? o2.bottom : o2.top) - a2;
      }
      return !!w.element(r2) && (w.element(e2) ? e2 === r2 : F(r2, e2, i2));
    }
    function At(t2) {
      var e2 = t2.iEvent, n2 = t2.interaction;
      if ("resize" === n2.prepared.name && n2.resizeAxes) {
        var r2 = e2;
        n2.interactable.options.resize.square ? ("y" === n2.resizeAxes ? r2.delta.x = r2.delta.y : r2.delta.y = r2.delta.x, r2.axes = "xy") : (r2.axes = n2.resizeAxes, "x" === n2.resizeAxes ? r2.delta.y = 0 : "y" === n2.resizeAxes && (r2.delta.x = 0));
      }
    }
    var Rt, Ct, jt = { id: "actions/resize", before: ["actions/drag"], install: function(t2) {
      var e2 = t2.actions, n2 = t2.browser, r2 = t2.Interactable, i2 = t2.defaults;
      jt.cursors = function(t3) {
        return t3.isIe9 ? { x: "e-resize", y: "s-resize", xy: "se-resize", top: "n-resize", left: "w-resize", bottom: "s-resize", right: "e-resize", topleft: "se-resize", bottomright: "se-resize", topright: "ne-resize", bottomleft: "ne-resize" } : { x: "ew-resize", y: "ns-resize", xy: "nwse-resize", top: "ns-resize", left: "ew-resize", bottom: "ns-resize", right: "ew-resize", topleft: "nwse-resize", bottomright: "nwse-resize", topright: "nesw-resize", bottomleft: "nesw-resize" };
      }(n2), jt.defaultMargin = n2.supportsTouch || n2.supportsPointerEvent ? 20 : 10, r2.prototype.resizable = function(e3) {
        return function(t3, e4, n3) {
          if (w.object(e4))
            return t3.options.resize.enabled = false !== e4.enabled, t3.setPerAction("resize", e4), t3.setOnEvents("resize", e4), w.string(e4.axis) && /^x$|^y$|^xy$/.test(e4.axis) ? t3.options.resize.axis = e4.axis : null === e4.axis && (t3.options.resize.axis = n3.defaults.actions.resize.axis), w.bool(e4.preserveAspectRatio) ? t3.options.resize.preserveAspectRatio = e4.preserveAspectRatio : w.bool(e4.square) && (t3.options.resize.square = e4.square), t3;
          if (w.bool(e4))
            return t3.options.resize.enabled = e4, t3;
          return t3.options.resize;
        }(this, e3, t2);
      }, e2.map.resize = jt, e2.methodDict.resize = "resizable", i2.actions.resize = jt.defaults;
    }, listeners: { "interactions:new": function(t2) {
      t2.interaction.resizeAxes = "xy";
    }, "interactions:action-start": function(t2) {
      !function(t3) {
        var e2 = t3.iEvent, n2 = t3.interaction;
        if ("resize" === n2.prepared.name && n2.prepared.edges) {
          var r2 = e2, i2 = n2.rect;
          n2._rects = { start: V({}, i2), corrected: V({}, i2), previous: V({}, i2), delta: { left: 0, right: 0, width: 0, top: 0, bottom: 0, height: 0 } }, r2.edges = n2.prepared.edges, r2.rect = n2._rects.corrected, r2.deltaRect = n2._rects.delta;
        }
      }(t2), At(t2);
    }, "interactions:action-move": function(t2) {
      !function(t3) {
        var e2 = t3.iEvent, n2 = t3.interaction;
        if ("resize" === n2.prepared.name && n2.prepared.edges) {
          var r2 = e2, i2 = n2.interactable.options.resize.invert, o2 = "reposition" === i2 || "negate" === i2, a2 = n2.rect, s2 = n2._rects, c2 = s2.start, l2 = s2.corrected, u2 = s2.delta, p2 = s2.previous;
          if (V(p2, l2), o2) {
            if (V(l2, a2), "reposition" === i2) {
              if (l2.top > l2.bottom) {
                var f2 = l2.top;
                l2.top = l2.bottom, l2.bottom = f2;
              }
              if (l2.left > l2.right) {
                var d2 = l2.left;
                l2.left = l2.right, l2.right = d2;
              }
            }
          } else
            l2.top = Math.min(a2.top, c2.bottom), l2.bottom = Math.max(a2.bottom, c2.top), l2.left = Math.min(a2.left, c2.right), l2.right = Math.max(a2.right, c2.left);
          for (var h2 in l2.width = l2.right - l2.left, l2.height = l2.bottom - l2.top, l2)
            u2[h2] = l2[h2] - p2[h2];
          r2.edges = n2.prepared.edges, r2.rect = l2, r2.deltaRect = u2;
        }
      }(t2), At(t2);
    }, "interactions:action-end": function(t2) {
      var e2 = t2.iEvent, n2 = t2.interaction;
      if ("resize" === n2.prepared.name && n2.prepared.edges) {
        var r2 = e2;
        r2.edges = n2.prepared.edges, r2.rect = n2._rects.corrected, r2.deltaRect = n2._rects.delta;
      }
    }, "auto-start:check": function(t2) {
      var e2 = t2.interaction, n2 = t2.interactable, r2 = t2.element, i2 = t2.rect, o2 = t2.buttons;
      if (i2) {
        var a2 = V({}, e2.coords.cur.page), s2 = n2.options.resize;
        if (s2 && s2.enabled && (!e2.pointerIsDown || !/mouse|pointer/.test(e2.pointerType) || 0 != (o2 & s2.mouseButtons))) {
          if (w.object(s2.edges)) {
            var c2 = { left: false, right: false, top: false, bottom: false };
            for (var l2 in c2)
              c2[l2] = zt(l2, s2.edges[l2], a2, e2._latestPointer.eventTarget, r2, i2, s2.margin || jt.defaultMargin);
            c2.left = c2.left && !c2.right, c2.top = c2.top && !c2.bottom, (c2.left || c2.right || c2.top || c2.bottom) && (t2.action = { name: "resize", edges: c2 });
          } else {
            var u2 = "y" !== s2.axis && a2.x > i2.right - jt.defaultMargin, p2 = "x" !== s2.axis && a2.y > i2.bottom - jt.defaultMargin;
            (u2 || p2) && (t2.action = { name: "resize", axes: (u2 ? "x" : "") + (p2 ? "y" : "") });
          }
          return !t2.action && void 0;
        }
      }
    } }, defaults: { square: false, preserveAspectRatio: false, axis: "xy", margin: NaN, edges: null, invert: "none" }, cursors: null, getCursor: function(t2) {
      var e2 = t2.edges, n2 = t2.axis, r2 = t2.name, i2 = jt.cursors, o2 = null;
      if (n2)
        o2 = i2[r2 + n2];
      else if (e2) {
        for (var a2 = "", s2 = 0, c2 = ["top", "bottom", "left", "right"]; s2 < c2.length; s2++) {
          var l2 = c2[s2];
          e2[l2] && (a2 += l2);
        }
        o2 = i2[a2];
      }
      return o2;
    }, filterEventType: function(t2) {
      return 0 === t2.search("resize");
    }, defaultMargin: null }, Ft = jt, Xt = { id: "actions", install: function(t2) {
      t2.usePlugin(Mt), t2.usePlugin(Ft), t2.usePlugin(_), t2.usePlugin(kt);
    } }, Yt = 0;
    var Lt = { request: function(t2) {
      return Rt(t2);
    }, cancel: function(t2) {
      return Ct(t2);
    }, init: function(t2) {
      if (Rt = t2.requestAnimationFrame, Ct = t2.cancelAnimationFrame, !Rt)
        for (var e2 = ["ms", "moz", "webkit", "o"], n2 = 0; n2 < e2.length; n2++) {
          var r2 = e2[n2];
          Rt = t2["".concat(r2, "RequestAnimationFrame")], Ct = t2["".concat(r2, "CancelAnimationFrame")] || t2["".concat(r2, "CancelRequestAnimationFrame")];
        }
      Rt = Rt && Rt.bind(t2), Ct = Ct && Ct.bind(t2), Rt || (Rt = function(e3) {
        var n3 = Date.now(), r3 = Math.max(0, 16 - (n3 - Yt)), i2 = t2.setTimeout(function() {
          e3(n3 + r3);
        }, r3);
        return Yt = n3 + r3, i2;
      }, Ct = function(t3) {
        return clearTimeout(t3);
      });
    } };
    var qt = { defaults: { enabled: false, margin: 60, container: null, speed: 300 }, now: Date.now, interaction: null, i: 0, x: 0, y: 0, isScrolling: false, prevTime: 0, margin: 0, speed: 0, start: function(t2) {
      qt.isScrolling = true, Lt.cancel(qt.i), t2.autoScroll = qt, qt.interaction = t2, qt.prevTime = qt.now(), qt.i = Lt.request(qt.scroll);
    }, stop: function() {
      qt.isScrolling = false, qt.interaction && (qt.interaction.autoScroll = null), Lt.cancel(qt.i);
    }, scroll: function() {
      var t2 = qt.interaction, e2 = t2.interactable, n2 = t2.element, r2 = t2.prepared.name, i2 = e2.options[r2].autoScroll, o2 = Bt(i2.container, e2, n2), a2 = qt.now(), s2 = (a2 - qt.prevTime) / 1e3, c2 = i2.speed * s2;
      if (c2 >= 1) {
        var l2 = { x: qt.x * c2, y: qt.y * c2 };
        if (l2.x || l2.y) {
          var u2 = Vt(o2);
          w.window(o2) ? o2.scrollBy(l2.x, l2.y) : o2 && (o2.scrollLeft += l2.x, o2.scrollTop += l2.y);
          var p2 = Vt(o2), f2 = { x: p2.x - u2.x, y: p2.y - u2.y };
          (f2.x || f2.y) && e2.fire({ type: "autoscroll", target: n2, interactable: e2, delta: f2, interaction: t2, container: o2 });
        }
        qt.prevTime = a2;
      }
      qt.isScrolling && (Lt.cancel(qt.i), qt.i = Lt.request(qt.scroll));
    }, check: function(t2, e2) {
      var n2;
      return null == (n2 = t2.options[e2].autoScroll) ? void 0 : n2.enabled;
    }, onInteractionMove: function(t2) {
      var e2 = t2.interaction, n2 = t2.pointer;
      if (e2.interacting() && qt.check(e2.interactable, e2.prepared.name))
        if (e2.simulation)
          qt.x = qt.y = 0;
        else {
          var r2, i2, o2, a2, s2 = e2.interactable, c2 = e2.element, l2 = e2.prepared.name, u2 = s2.options[l2].autoScroll, p2 = Bt(u2.container, s2, c2);
          if (w.window(p2))
            a2 = n2.clientX < qt.margin, r2 = n2.clientY < qt.margin, i2 = n2.clientX > p2.innerWidth - qt.margin, o2 = n2.clientY > p2.innerHeight - qt.margin;
          else {
            var f2 = Y(p2);
            a2 = n2.clientX < f2.left + qt.margin, r2 = n2.clientY < f2.top + qt.margin, i2 = n2.clientX > f2.right - qt.margin, o2 = n2.clientY > f2.bottom - qt.margin;
          }
          qt.x = i2 ? 1 : a2 ? -1 : 0, qt.y = o2 ? 1 : r2 ? -1 : 0, qt.isScrolling || (qt.margin = u2.margin, qt.speed = u2.speed, qt.start(e2));
        }
    } };
    function Bt(t2, e2, n2) {
      return (w.string(t2) ? W(t2, e2, n2) : t2) || y(n2);
    }
    function Vt(t2) {
      return w.window(t2) && (t2 = window.document.body), { x: t2.scrollLeft, y: t2.scrollTop };
    }
    var Wt = { id: "auto-scroll", install: function(t2) {
      var e2 = t2.defaults, n2 = t2.actions;
      t2.autoScroll = qt, qt.now = function() {
        return t2.now();
      }, n2.phaselessTypes.autoscroll = true, e2.perAction.autoScroll = qt.defaults;
    }, listeners: { "interactions:new": function(t2) {
      t2.interaction.autoScroll = null;
    }, "interactions:destroy": function(t2) {
      t2.interaction.autoScroll = null, qt.stop(), qt.interaction && (qt.interaction = null);
    }, "interactions:stop": qt.stop, "interactions:action-move": function(t2) {
      return qt.onInteractionMove(t2);
    } } }, Gt = Wt;
    function Nt(t2, e2) {
      var n2 = false;
      return function() {
        return n2 || (g.console.warn(e2), n2 = true), t2.apply(this, arguments);
      };
    }
    function Ut(t2, e2) {
      return t2.name = e2.name, t2.axis = e2.axis, t2.edges = e2.edges, t2;
    }
    function Ht(t2) {
      return w.bool(t2) ? (this.options.styleCursor = t2, this) : null === t2 ? (delete this.options.styleCursor, this) : this.options.styleCursor;
    }
    function Kt(t2) {
      return w.func(t2) ? (this.options.actionChecker = t2, this) : null === t2 ? (delete this.options.actionChecker, this) : this.options.actionChecker;
    }
    var $t = { id: "auto-start/interactableMethods", install: function(t2) {
      var e2 = t2.Interactable;
      e2.prototype.getAction = function(e3, n2, r2, i2) {
        var o2 = function(t3, e4, n3, r3, i3) {
          var o3 = t3.getRect(r3), a2 = e4.buttons || { 0: 1, 1: 4, 3: 8, 4: 16 }[e4.button], s2 = { action: null, interactable: t3, interaction: n3, element: r3, rect: o3, buttons: a2 };
          return i3.fire("auto-start:check", s2), s2.action;
        }(this, n2, r2, i2, t2);
        return this.options.actionChecker ? this.options.actionChecker(e3, n2, o2, this, i2, r2) : o2;
      }, e2.prototype.ignoreFrom = Nt(function(t3) {
        return this._backCompatOption("ignoreFrom", t3);
      }, "Interactable.ignoreFrom() has been deprecated. Use Interactble.draggable({ignoreFrom: newValue})."), e2.prototype.allowFrom = Nt(function(t3) {
        return this._backCompatOption("allowFrom", t3);
      }, "Interactable.allowFrom() has been deprecated. Use Interactble.draggable({allowFrom: newValue})."), e2.prototype.actionChecker = Kt, e2.prototype.styleCursor = Ht;
    } };
    function Jt(t2, e2, n2, r2, i2) {
      return e2.testIgnoreAllow(e2.options[t2.name], n2, r2) && e2.options[t2.name].enabled && ee(e2, n2, t2, i2) ? t2 : null;
    }
    function Qt(t2, e2, n2, r2, i2, o2, a2) {
      for (var s2 = 0, c2 = r2.length; s2 < c2; s2++) {
        var l2 = r2[s2], u2 = i2[s2], p2 = l2.getAction(e2, n2, t2, u2);
        if (p2) {
          var f2 = Jt(p2, l2, u2, o2, a2);
          if (f2)
            return { action: f2, interactable: l2, element: u2 };
        }
      }
      return { action: null, interactable: null, element: null };
    }
    function Zt(t2, e2, n2, r2, i2) {
      var o2 = [], a2 = [], s2 = r2;
      function c2(t3) {
        o2.push(t3), a2.push(s2);
      }
      for (; w.element(s2); ) {
        o2 = [], a2 = [], i2.interactables.forEachMatch(s2, c2);
        var l2 = Qt(t2, e2, n2, o2, a2, r2, i2);
        if (l2.action && !l2.interactable.options[l2.action.name].manualStart)
          return l2;
        s2 = A(s2);
      }
      return { action: null, interactable: null, element: null };
    }
    function te(t2, e2, n2) {
      var r2 = e2.action, i2 = e2.interactable, o2 = e2.element;
      r2 = r2 || { name: null }, t2.interactable = i2, t2.element = o2, Ut(t2.prepared, r2), t2.rect = i2 && r2.name ? i2.getRect(o2) : null, ie(t2, n2), n2.fire("autoStart:prepared", { interaction: t2 });
    }
    function ee(t2, e2, n2, r2) {
      var i2 = t2.options, o2 = i2[n2.name].max, a2 = i2[n2.name].maxPerElement, s2 = r2.autoStart.maxInteractions, c2 = 0, l2 = 0, u2 = 0;
      if (!(o2 && a2 && s2))
        return false;
      for (var p2 = 0, f2 = r2.interactions.list; p2 < f2.length; p2++) {
        var d2 = f2[p2], h2 = d2.prepared.name;
        if (d2.interacting()) {
          if (++c2 >= s2)
            return false;
          if (d2.interactable === t2) {
            if ((l2 += h2 === n2.name ? 1 : 0) >= o2)
              return false;
            if (d2.element === e2 && (u2++, h2 === n2.name && u2 >= a2))
              return false;
          }
        }
      }
      return s2 > 0;
    }
    function ne(t2, e2) {
      return w.number(t2) ? (e2.autoStart.maxInteractions = t2, this) : e2.autoStart.maxInteractions;
    }
    function re(t2, e2, n2) {
      var r2 = n2.autoStart.cursorElement;
      r2 && r2 !== t2 && (r2.style.cursor = ""), t2.ownerDocument.documentElement.style.cursor = e2, t2.style.cursor = e2, n2.autoStart.cursorElement = e2 ? t2 : null;
    }
    function ie(t2, e2) {
      var n2 = t2.interactable, r2 = t2.element, i2 = t2.prepared;
      if ("mouse" === t2.pointerType && n2 && n2.options.styleCursor) {
        var o2 = "";
        if (i2.name) {
          var a2 = n2.options[i2.name].cursorChecker;
          o2 = w.func(a2) ? a2(i2, n2, r2, t2._interacting) : e2.actions.map[i2.name].getCursor(i2);
        }
        re(t2.element, o2 || "", e2);
      } else
        e2.autoStart.cursorElement && re(e2.autoStart.cursorElement, "", e2);
    }
    var oe = { id: "auto-start/base", before: ["actions"], install: function(t2) {
      var e2 = t2.interactStatic, n2 = t2.defaults;
      t2.usePlugin($t), n2.base.actionChecker = null, n2.base.styleCursor = true, V(n2.perAction, { manualStart: false, max: 1 / 0, maxPerElement: 1, allowFrom: null, ignoreFrom: null, mouseButtons: 1 }), e2.maxInteractions = function(e3) {
        return ne(e3, t2);
      }, t2.autoStart = { maxInteractions: 1 / 0, withinInteractionLimit: ee, cursorElement: null };
    }, listeners: { "interactions:down": function(t2, e2) {
      var n2 = t2.interaction, r2 = t2.pointer, i2 = t2.event, o2 = t2.eventTarget;
      n2.interacting() || te(n2, Zt(n2, r2, i2, o2, e2), e2);
    }, "interactions:move": function(t2, e2) {
      !function(t3, e3) {
        var n2 = t3.interaction, r2 = t3.pointer, i2 = t3.event, o2 = t3.eventTarget;
        "mouse" !== n2.pointerType || n2.pointerIsDown || n2.interacting() || te(n2, Zt(n2, r2, i2, o2, e3), e3);
      }(t2, e2), function(t3, e3) {
        var n2 = t3.interaction;
        if (n2.pointerIsDown && !n2.interacting() && n2.pointerWasMoved && n2.prepared.name) {
          e3.fire("autoStart:before-start", t3);
          var r2 = n2.interactable, i2 = n2.prepared.name;
          i2 && r2 && (r2.options[i2].manualStart || !ee(r2, n2.element, n2.prepared, e3) ? n2.stop() : (n2.start(n2.prepared, r2, n2.element), ie(n2, e3)));
        }
      }(t2, e2);
    }, "interactions:stop": function(t2, e2) {
      var n2 = t2.interaction, r2 = n2.interactable;
      r2 && r2.options.styleCursor && re(n2.element, "", e2);
    } }, maxInteractions: ne, withinInteractionLimit: ee, validateAction: Jt }, ae = oe;
    var se = { id: "auto-start/dragAxis", listeners: { "autoStart:before-start": function(t2, e2) {
      var n2 = t2.interaction, r2 = t2.eventTarget, i2 = t2.dx, o2 = t2.dy;
      if ("drag" === n2.prepared.name) {
        var a2 = Math.abs(i2), s2 = Math.abs(o2), c2 = n2.interactable.options.drag, l2 = c2.startAxis, u2 = a2 > s2 ? "x" : a2 < s2 ? "y" : "xy";
        if (n2.prepared.axis = "start" === c2.lockAxis ? u2[0] : c2.lockAxis, "xy" !== u2 && "xy" !== l2 && l2 !== u2) {
          n2.prepared.name = null;
          for (var p2 = r2, f2 = function(t3) {
            if (t3 !== n2.interactable) {
              var i3 = n2.interactable.options.drag;
              if (!i3.manualStart && t3.testIgnoreAllow(i3, p2, r2)) {
                var o3 = t3.getAction(n2.downPointer, n2.downEvent, n2, p2);
                if (o3 && "drag" === o3.name && function(t4, e3) {
                  if (!e3)
                    return false;
                  var n3 = e3.options.drag.startAxis;
                  return "xy" === t4 || "xy" === n3 || n3 === t4;
                }(u2, t3) && ae.validateAction(o3, t3, p2, r2, e2))
                  return t3;
              }
            }
          }; w.element(p2); ) {
            var d2 = e2.interactables.forEachMatch(p2, f2);
            if (d2) {
              n2.prepared.name = "drag", n2.interactable = d2, n2.element = p2;
              break;
            }
            p2 = A(p2);
          }
        }
      }
    } } };
    function ce(t2) {
      var e2 = t2.prepared && t2.prepared.name;
      if (!e2)
        return null;
      var n2 = t2.interactable.options;
      return n2[e2].hold || n2[e2].delay;
    }
    var le = { id: "auto-start/hold", install: function(t2) {
      var e2 = t2.defaults;
      t2.usePlugin(ae), e2.perAction.hold = 0, e2.perAction.delay = 0;
    }, listeners: { "interactions:new": function(t2) {
      t2.interaction.autoStartHoldTimer = null;
    }, "autoStart:prepared": function(t2) {
      var e2 = t2.interaction, n2 = ce(e2);
      n2 > 0 && (e2.autoStartHoldTimer = setTimeout(function() {
        e2.start(e2.prepared, e2.interactable, e2.element);
      }, n2));
    }, "interactions:move": function(t2) {
      var e2 = t2.interaction, n2 = t2.duplicate;
      e2.autoStartHoldTimer && e2.pointerWasMoved && !n2 && (clearTimeout(e2.autoStartHoldTimer), e2.autoStartHoldTimer = null);
    }, "autoStart:before-start": function(t2) {
      var e2 = t2.interaction;
      ce(e2) > 0 && (e2.prepared.name = null);
    } }, getHoldDuration: ce }, ue = le, pe = { id: "auto-start", install: function(t2) {
      t2.usePlugin(ae), t2.usePlugin(ue), t2.usePlugin(se);
    } }, fe = function(t2) {
      return /^(always|never|auto)$/.test(t2) ? (this.options.preventDefault = t2, this) : w.bool(t2) ? (this.options.preventDefault = t2 ? "always" : "never", this) : this.options.preventDefault;
    };
    function de(t2) {
      var e2 = t2.interaction, n2 = t2.event;
      e2.interactable && e2.interactable.checkAndPreventDefault(n2);
    }
    var he = { id: "core/interactablePreventDefault", install: function(t2) {
      var e2 = t2.Interactable;
      e2.prototype.preventDefault = fe, e2.prototype.checkAndPreventDefault = function(e3) {
        return function(t3, e4, n2) {
          var r2 = t3.options.preventDefault;
          if ("never" !== r2)
            if ("always" !== r2) {
              if (e4.events.supportsPassive && /^touch(start|move)$/.test(n2.type)) {
                var i2 = y(n2.target).document, o2 = e4.getDocOptions(i2);
                if (!o2 || !o2.events || false !== o2.events.passive)
                  return;
              }
              /^(mouse|pointer|touch)*(down|start)/i.test(n2.type) || w.element(n2.target) && R(n2.target, "input,select,textarea,[contenteditable=true],[contenteditable=true] *") || n2.preventDefault();
            } else
              n2.preventDefault();
        }(this, t2, e3);
      }, t2.interactions.docEvents.push({ type: "dragstart", listener: function(e3) {
        for (var n2 = 0, r2 = t2.interactions.list; n2 < r2.length; n2++) {
          var i2 = r2[n2];
          if (i2.element && (i2.element === e3.target || M(i2.element, e3.target)))
            return void i2.interactable.checkAndPreventDefault(e3);
        }
      } });
    }, listeners: ["down", "move", "up", "cancel"].reduce(function(t2, e2) {
      return t2["interactions:".concat(e2)] = de, t2;
    }, {}) };
    function ve(t2, e2) {
      if (e2.phaselessTypes[t2])
        return true;
      for (var n2 in e2.map)
        if (0 === t2.indexOf(n2) && t2.substr(n2.length) in e2.phases)
          return true;
      return false;
    }
    function ge(t2) {
      var e2 = {};
      for (var n2 in t2) {
        var r2 = t2[n2];
        w.plainObject(r2) ? e2[n2] = ge(r2) : w.array(r2) ? e2[n2] = mt(r2) : e2[n2] = r2;
      }
      return e2;
    }
    var me = function() {
      function t2(e2) {
        r(this, t2), this.states = [], this.startOffset = { left: 0, right: 0, top: 0, bottom: 0 }, this.startDelta = void 0, this.result = void 0, this.endResult = void 0, this.startEdges = void 0, this.edges = void 0, this.interaction = void 0, this.interaction = e2, this.result = ye(), this.edges = { left: false, right: false, top: false, bottom: false };
      }
      return o(t2, [{ key: "start", value: function(t3, e2) {
        var n2, r2, i2 = t3.phase, o2 = this.interaction, a2 = function(t4) {
          var e3 = t4.interactable.options[t4.prepared.name], n3 = e3.modifiers;
          if (n3 && n3.length)
            return n3;
          return ["snap", "snapSize", "snapEdges", "restrict", "restrictEdges", "restrictSize"].map(function(t5) {
            var n4 = e3[t5];
            return n4 && n4.enabled && { options: n4, methods: n4._methods };
          }).filter(function(t5) {
            return !!t5;
          });
        }(o2);
        this.prepareStates(a2), this.startEdges = V({}, o2.edges), this.edges = V({}, this.startEdges), this.startOffset = (n2 = o2.rect, r2 = e2, n2 ? { left: r2.x - n2.left, top: r2.y - n2.top, right: n2.right - r2.x, bottom: n2.bottom - r2.y } : { left: 0, top: 0, right: 0, bottom: 0 }), this.startDelta = { x: 0, y: 0 };
        var s2 = this.fillArg({ phase: i2, pageCoords: e2, preEnd: false });
        return this.result = ye(), this.startAll(s2), this.result = this.setAll(s2);
      } }, { key: "fillArg", value: function(t3) {
        var e2 = this.interaction;
        return t3.interaction = e2, t3.interactable = e2.interactable, t3.element = e2.element, t3.rect || (t3.rect = e2.rect), t3.edges || (t3.edges = this.startEdges), t3.startOffset = this.startOffset, t3;
      } }, { key: "startAll", value: function(t3) {
        for (var e2 = 0, n2 = this.states; e2 < n2.length; e2++) {
          var r2 = n2[e2];
          r2.methods.start && (t3.state = r2, r2.methods.start(t3));
        }
      } }, { key: "setAll", value: function(t3) {
        var e2 = t3.phase, n2 = t3.preEnd, r2 = t3.skipModifiers, i2 = t3.rect, o2 = t3.edges;
        t3.coords = V({}, t3.pageCoords), t3.rect = V({}, i2), t3.edges = V({}, o2);
        for (var a2 = r2 ? this.states.slice(r2) : this.states, s2 = ye(t3.coords, t3.rect), c2 = 0; c2 < a2.length; c2++) {
          var l2, u2 = a2[c2], p2 = u2.options, f2 = V({}, t3.coords), d2 = null;
          null != (l2 = u2.methods) && l2.set && this.shouldDo(p2, n2, e2) && (t3.state = u2, d2 = u2.methods.set(t3), H(t3.edges, t3.rect, { x: t3.coords.x - f2.x, y: t3.coords.y - f2.y })), s2.eventProps.push(d2);
        }
        V(this.edges, t3.edges), s2.delta.x = t3.coords.x - t3.pageCoords.x, s2.delta.y = t3.coords.y - t3.pageCoords.y, s2.rectDelta.left = t3.rect.left - i2.left, s2.rectDelta.right = t3.rect.right - i2.right, s2.rectDelta.top = t3.rect.top - i2.top, s2.rectDelta.bottom = t3.rect.bottom - i2.bottom;
        var h2 = this.result.coords, v2 = this.result.rect;
        if (h2 && v2) {
          var g2 = s2.rect.left !== v2.left || s2.rect.right !== v2.right || s2.rect.top !== v2.top || s2.rect.bottom !== v2.bottom;
          s2.changed = g2 || h2.x !== s2.coords.x || h2.y !== s2.coords.y;
        }
        return s2;
      } }, { key: "applyToInteraction", value: function(t3) {
        var e2 = this.interaction, n2 = t3.phase, r2 = e2.coords.cur, i2 = e2.coords.start, o2 = this.result, a2 = this.startDelta, s2 = o2.delta;
        "start" === n2 && V(this.startDelta, o2.delta);
        for (var c2 = 0, l2 = [[i2, a2], [r2, s2]]; c2 < l2.length; c2++) {
          var u2 = l2[c2], p2 = u2[0], f2 = u2[1];
          p2.page.x += f2.x, p2.page.y += f2.y, p2.client.x += f2.x, p2.client.y += f2.y;
        }
        var d2 = this.result.rectDelta, h2 = t3.rect || e2.rect;
        h2.left += d2.left, h2.right += d2.right, h2.top += d2.top, h2.bottom += d2.bottom, h2.width = h2.right - h2.left, h2.height = h2.bottom - h2.top;
      } }, { key: "setAndApply", value: function(t3) {
        var e2 = this.interaction, n2 = t3.phase, r2 = t3.preEnd, i2 = t3.skipModifiers, o2 = this.setAll(this.fillArg({ preEnd: r2, phase: n2, pageCoords: t3.modifiedCoords || e2.coords.cur.page }));
        if (this.result = o2, !o2.changed && (!i2 || i2 < this.states.length) && e2.interacting())
          return false;
        if (t3.modifiedCoords) {
          var a2 = e2.coords.cur.page, s2 = { x: t3.modifiedCoords.x - a2.x, y: t3.modifiedCoords.y - a2.y };
          o2.coords.x += s2.x, o2.coords.y += s2.y, o2.delta.x += s2.x, o2.delta.y += s2.y;
        }
        this.applyToInteraction(t3);
      } }, { key: "beforeEnd", value: function(t3) {
        var e2 = t3.interaction, n2 = t3.event, r2 = this.states;
        if (r2 && r2.length) {
          for (var i2 = false, o2 = 0; o2 < r2.length; o2++) {
            var a2 = r2[o2];
            t3.state = a2;
            var s2 = a2.options, c2 = a2.methods, l2 = c2.beforeEnd && c2.beforeEnd(t3);
            if (l2)
              return this.endResult = l2, false;
            i2 = i2 || !i2 && this.shouldDo(s2, true, t3.phase, true);
          }
          i2 && e2.move({ event: n2, preEnd: true });
        }
      } }, { key: "stop", value: function(t3) {
        var e2 = t3.interaction;
        if (this.states && this.states.length) {
          var n2 = V({ states: this.states, interactable: e2.interactable, element: e2.element, rect: null }, t3);
          this.fillArg(n2);
          for (var r2 = 0, i2 = this.states; r2 < i2.length; r2++) {
            var o2 = i2[r2];
            n2.state = o2, o2.methods.stop && o2.methods.stop(n2);
          }
          this.states = null, this.endResult = null;
        }
      } }, { key: "prepareStates", value: function(t3) {
        this.states = [];
        for (var e2 = 0; e2 < t3.length; e2++) {
          var n2 = t3[e2], r2 = n2.options, i2 = n2.methods, o2 = n2.name;
          this.states.push({ options: r2, methods: i2, index: e2, name: o2 });
        }
        return this.states;
      } }, { key: "restoreInteractionCoords", value: function(t3) {
        var e2 = t3.interaction, n2 = e2.coords, r2 = e2.rect, i2 = e2.modification;
        if (i2.result) {
          for (var o2 = i2.startDelta, a2 = i2.result, s2 = a2.delta, c2 = a2.rectDelta, l2 = 0, u2 = [[n2.start, o2], [n2.cur, s2]]; l2 < u2.length; l2++) {
            var p2 = u2[l2], f2 = p2[0], d2 = p2[1];
            f2.page.x -= d2.x, f2.page.y -= d2.y, f2.client.x -= d2.x, f2.client.y -= d2.y;
          }
          r2.left -= c2.left, r2.right -= c2.right, r2.top -= c2.top, r2.bottom -= c2.bottom;
        }
      } }, { key: "shouldDo", value: function(t3, e2, n2, r2) {
        return !(!t3 || false === t3.enabled || r2 && !t3.endOnly || t3.endOnly && !e2 || "start" === n2 && !t3.setStart);
      } }, { key: "copyFrom", value: function(t3) {
        this.startOffset = t3.startOffset, this.startDelta = t3.startDelta, this.startEdges = t3.startEdges, this.edges = t3.edges, this.states = t3.states.map(function(t4) {
          return ge(t4);
        }), this.result = ye(V({}, t3.result.coords), V({}, t3.result.rect));
      } }, { key: "destroy", value: function() {
        for (var t3 in this)
          this[t3] = null;
      } }]), t2;
    }();
    function ye(t2, e2) {
      return { rect: e2, coords: t2, delta: { x: 0, y: 0 }, rectDelta: { left: 0, right: 0, top: 0, bottom: 0 }, eventProps: [], changed: true };
    }
    function be(t2, e2) {
      var n2 = t2.defaults, r2 = { start: t2.start, set: t2.set, beforeEnd: t2.beforeEnd, stop: t2.stop }, i2 = function(t3) {
        var i3 = t3 || {};
        for (var o2 in i3.enabled = false !== i3.enabled, n2)
          o2 in i3 || (i3[o2] = n2[o2]);
        var a2 = { options: i3, methods: r2, name: e2, enable: function() {
          return i3.enabled = true, a2;
        }, disable: function() {
          return i3.enabled = false, a2;
        } };
        return a2;
      };
      return e2 && "string" == typeof e2 && (i2._defaults = n2, i2._methods = r2), i2;
    }
    function xe(t2) {
      var e2 = t2.iEvent, n2 = t2.interaction.modification.result;
      n2 && (e2.modifiers = n2.eventProps);
    }
    var we = { id: "modifiers/base", before: ["actions"], install: function(t2) {
      t2.defaults.perAction.modifiers = [];
    }, listeners: { "interactions:new": function(t2) {
      var e2 = t2.interaction;
      e2.modification = new me(e2);
    }, "interactions:before-action-start": function(t2) {
      var e2 = t2.interaction, n2 = t2.interaction.modification;
      n2.start(t2, e2.coords.start.page), e2.edges = n2.edges, n2.applyToInteraction(t2);
    }, "interactions:before-action-move": function(t2) {
      var e2 = t2.interaction, n2 = e2.modification, r2 = n2.setAndApply(t2);
      return e2.edges = n2.edges, r2;
    }, "interactions:before-action-end": function(t2) {
      var e2 = t2.interaction, n2 = e2.modification, r2 = n2.beforeEnd(t2);
      return e2.edges = n2.startEdges, r2;
    }, "interactions:action-start": xe, "interactions:action-move": xe, "interactions:action-end": xe, "interactions:after-action-start": function(t2) {
      return t2.interaction.modification.restoreInteractionCoords(t2);
    }, "interactions:after-action-move": function(t2) {
      return t2.interaction.modification.restoreInteractionCoords(t2);
    }, "interactions:stop": function(t2) {
      return t2.interaction.modification.stop(t2);
    } } }, Ee = we, Te = { base: { preventDefault: "auto", deltaSource: "page" }, perAction: { enabled: false, origin: { x: 0, y: 0 } }, actions: {} }, Se = function(t2) {
      s(n2, t2);
      var e2 = p(n2);
      function n2(t3, i2, o2, a2, s2, c2, l2) {
        var p2;
        r(this, n2), (p2 = e2.call(this, t3)).relatedTarget = null, p2.screenX = void 0, p2.screenY = void 0, p2.button = void 0, p2.buttons = void 0, p2.ctrlKey = void 0, p2.shiftKey = void 0, p2.altKey = void 0, p2.metaKey = void 0, p2.page = void 0, p2.client = void 0, p2.delta = void 0, p2.rect = void 0, p2.x0 = void 0, p2.y0 = void 0, p2.t0 = void 0, p2.dt = void 0, p2.duration = void 0, p2.clientX0 = void 0, p2.clientY0 = void 0, p2.velocity = void 0, p2.speed = void 0, p2.swipe = void 0, p2.axes = void 0, p2.preEnd = void 0, s2 = s2 || t3.element;
        var f2 = t3.interactable, d2 = (f2 && f2.options || Te).deltaSource, h2 = K(f2, s2, o2), v2 = "start" === a2, g2 = "end" === a2, m2 = v2 ? u(p2) : t3.prevEvent, y2 = v2 ? t3.coords.start : g2 ? { page: m2.page, client: m2.client, timeStamp: t3.coords.cur.timeStamp } : t3.coords.cur;
        return p2.page = V({}, y2.page), p2.client = V({}, y2.client), p2.rect = V({}, t3.rect), p2.timeStamp = y2.timeStamp, g2 || (p2.page.x -= h2.x, p2.page.y -= h2.y, p2.client.x -= h2.x, p2.client.y -= h2.y), p2.ctrlKey = i2.ctrlKey, p2.altKey = i2.altKey, p2.shiftKey = i2.shiftKey, p2.metaKey = i2.metaKey, p2.button = i2.button, p2.buttons = i2.buttons, p2.target = s2, p2.currentTarget = s2, p2.preEnd = c2, p2.type = l2 || o2 + (a2 || ""), p2.interactable = f2, p2.t0 = v2 ? t3.pointers[t3.pointers.length - 1].downTime : m2.t0, p2.x0 = t3.coords.start.page.x - h2.x, p2.y0 = t3.coords.start.page.y - h2.y, p2.clientX0 = t3.coords.start.client.x - h2.x, p2.clientY0 = t3.coords.start.client.y - h2.y, p2.delta = v2 || g2 ? { x: 0, y: 0 } : { x: p2[d2].x - m2[d2].x, y: p2[d2].y - m2[d2].y }, p2.dt = t3.coords.delta.timeStamp, p2.duration = p2.timeStamp - p2.t0, p2.velocity = V({}, t3.coords.velocity[d2]), p2.speed = Q(p2.velocity.x, p2.velocity.y), p2.swipe = g2 || "inertiastart" === a2 ? p2.getSwipe() : null, p2;
      }
      return o(n2, [{ key: "getSwipe", value: function() {
        var t3 = this._interaction;
        if (t3.prevEvent.speed < 600 || this.timeStamp - t3.prevEvent.timeStamp > 150)
          return null;
        var e3 = 180 * Math.atan2(t3.prevEvent.velocityY, t3.prevEvent.velocityX) / Math.PI;
        e3 < 0 && (e3 += 360);
        var n3 = 112.5 <= e3 && e3 < 247.5, r2 = 202.5 <= e3 && e3 < 337.5;
        return { up: r2, down: !r2 && 22.5 <= e3 && e3 < 157.5, left: n3, right: !n3 && (292.5 <= e3 || e3 < 67.5), angle: e3, speed: t3.prevEvent.speed, velocity: { x: t3.prevEvent.velocityX, y: t3.prevEvent.velocityY } };
      } }, { key: "preventDefault", value: function() {
      } }, { key: "stopImmediatePropagation", value: function() {
        this.immediatePropagationStopped = this.propagationStopped = true;
      } }, { key: "stopPropagation", value: function() {
        this.propagationStopped = true;
      } }]), n2;
    }(vt);
    Object.defineProperties(Se.prototype, { pageX: { get: function() {
      return this.page.x;
    }, set: function(t2) {
      this.page.x = t2;
    } }, pageY: { get: function() {
      return this.page.y;
    }, set: function(t2) {
      this.page.y = t2;
    } }, clientX: { get: function() {
      return this.client.x;
    }, set: function(t2) {
      this.client.x = t2;
    } }, clientY: { get: function() {
      return this.client.y;
    }, set: function(t2) {
      this.client.y = t2;
    } }, dx: { get: function() {
      return this.delta.x;
    }, set: function(t2) {
      this.delta.x = t2;
    } }, dy: { get: function() {
      return this.delta.y;
    }, set: function(t2) {
      this.delta.y = t2;
    } }, velocityX: { get: function() {
      return this.velocity.x;
    }, set: function(t2) {
      this.velocity.x = t2;
    } }, velocityY: { get: function() {
      return this.velocity.y;
    }, set: function(t2) {
      this.velocity.y = t2;
    } } });
    var _e = o(function t2(e2, n2, i2, o2, a2) {
      r(this, t2), this.id = void 0, this.pointer = void 0, this.event = void 0, this.downTime = void 0, this.downTarget = void 0, this.id = e2, this.pointer = n2, this.event = i2, this.downTime = o2, this.downTarget = a2;
    }), Pe = function(t2) {
      return t2.interactable = "", t2.element = "", t2.prepared = "", t2.pointerIsDown = "", t2.pointerWasMoved = "", t2._proxy = "", t2;
    }({}), Oe = function(t2) {
      return t2.start = "", t2.move = "", t2.end = "", t2.stop = "", t2.interacting = "", t2;
    }({}), ke = 0, De = function() {
      function t2(e2) {
        var n2 = this, i2 = e2.pointerType, o2 = e2.scopeFire;
        r(this, t2), this.interactable = null, this.element = null, this.rect = null, this._rects = void 0, this.edges = null, this._scopeFire = void 0, this.prepared = { name: null, axis: null, edges: null }, this.pointerType = void 0, this.pointers = [], this.downEvent = null, this.downPointer = {}, this._latestPointer = { pointer: null, event: null, eventTarget: null }, this.prevEvent = null, this.pointerIsDown = false, this.pointerWasMoved = false, this._interacting = false, this._ending = false, this._stopped = true, this._proxy = void 0, this.simulation = null, this.doMove = Nt(function(t3) {
          this.move(t3);
        }, "The interaction.doMove() method has been renamed to interaction.move()"), this.coords = { start: { page: { x: 0, y: 0 }, client: { x: 0, y: 0 }, timeStamp: 0 }, prev: { page: { x: 0, y: 0 }, client: { x: 0, y: 0 }, timeStamp: 0 }, cur: { page: { x: 0, y: 0 }, client: { x: 0, y: 0 }, timeStamp: 0 }, delta: { page: { x: 0, y: 0 }, client: { x: 0, y: 0 }, timeStamp: 0 }, velocity: { page: { x: 0, y: 0 }, client: { x: 0, y: 0 }, timeStamp: 0 } }, this._id = ke++, this._scopeFire = o2, this.pointerType = i2;
        var a2 = this;
        this._proxy = {};
        var s2 = function(t3) {
          Object.defineProperty(n2._proxy, t3, { get: function() {
            return a2[t3];
          } });
        };
        for (var c2 in Pe)
          s2(c2);
        var l2 = function(t3) {
          Object.defineProperty(n2._proxy, t3, { value: function() {
            return a2[t3].apply(a2, arguments);
          } });
        };
        for (var u2 in Oe)
          l2(u2);
        this._scopeFire("interactions:new", { interaction: this });
      }
      return o(t2, [{ key: "pointerMoveTolerance", get: function() {
        return 1;
      } }, { key: "pointerDown", value: function(t3, e2, n2) {
        var r2 = this.updatePointer(t3, e2, n2, true), i2 = this.pointers[r2];
        this._scopeFire("interactions:down", { pointer: t3, event: e2, eventTarget: n2, pointerIndex: r2, pointerInfo: i2, type: "down", interaction: this });
      } }, { key: "start", value: function(t3, e2, n2) {
        return !(this.interacting() || !this.pointerIsDown || this.pointers.length < ("gesture" === t3.name ? 2 : 1) || !e2.options[t3.name].enabled) && (Ut(this.prepared, t3), this.interactable = e2, this.element = n2, this.rect = e2.getRect(n2), this.edges = this.prepared.edges ? V({}, this.prepared.edges) : { left: true, right: true, top: true, bottom: true }, this._stopped = false, this._interacting = this._doPhase({ interaction: this, event: this.downEvent, phase: "start" }) && !this._stopped, this._interacting);
      } }, { key: "pointerMove", value: function(t3, e2, n2) {
        this.simulation || this.modification && this.modification.endResult || this.updatePointer(t3, e2, n2, false);
        var r2, i2, o2 = this.coords.cur.page.x === this.coords.prev.page.x && this.coords.cur.page.y === this.coords.prev.page.y && this.coords.cur.client.x === this.coords.prev.client.x && this.coords.cur.client.y === this.coords.prev.client.y;
        this.pointerIsDown && !this.pointerWasMoved && (r2 = this.coords.cur.client.x - this.coords.start.client.x, i2 = this.coords.cur.client.y - this.coords.start.client.y, this.pointerWasMoved = Q(r2, i2) > this.pointerMoveTolerance);
        var a2, s2, c2, l2 = this.getPointerIndex(t3), u2 = { pointer: t3, pointerIndex: l2, pointerInfo: this.pointers[l2], event: e2, type: "move", eventTarget: n2, dx: r2, dy: i2, duplicate: o2, interaction: this };
        o2 || (a2 = this.coords.velocity, s2 = this.coords.delta, c2 = Math.max(s2.timeStamp / 1e3, 1e-3), a2.page.x = s2.page.x / c2, a2.page.y = s2.page.y / c2, a2.client.x = s2.client.x / c2, a2.client.y = s2.client.y / c2, a2.timeStamp = c2), this._scopeFire("interactions:move", u2), o2 || this.simulation || (this.interacting() && (u2.type = null, this.move(u2)), this.pointerWasMoved && et(this.coords.prev, this.coords.cur));
      } }, { key: "move", value: function(t3) {
        t3 && t3.event || nt(this.coords.delta), (t3 = V({ pointer: this._latestPointer.pointer, event: this._latestPointer.event, eventTarget: this._latestPointer.eventTarget, interaction: this }, t3 || {})).phase = "move", this._doPhase(t3);
      } }, { key: "pointerUp", value: function(t3, e2, n2, r2) {
        var i2 = this.getPointerIndex(t3);
        -1 === i2 && (i2 = this.updatePointer(t3, e2, n2, false));
        var o2 = /cancel$/i.test(e2.type) ? "cancel" : "up";
        this._scopeFire("interactions:".concat(o2), { pointer: t3, pointerIndex: i2, pointerInfo: this.pointers[i2], event: e2, eventTarget: n2, type: o2, curEventTarget: r2, interaction: this }), this.simulation || this.end(e2), this.removePointer(t3, e2);
      } }, { key: "documentBlur", value: function(t3) {
        this.end(t3), this._scopeFire("interactions:blur", { event: t3, type: "blur", interaction: this });
      } }, { key: "end", value: function(t3) {
        var e2;
        this._ending = true, t3 = t3 || this._latestPointer.event, this.interacting() && (e2 = this._doPhase({ event: t3, interaction: this, phase: "end" })), this._ending = false, true === e2 && this.stop();
      } }, { key: "currentAction", value: function() {
        return this._interacting ? this.prepared.name : null;
      } }, { key: "interacting", value: function() {
        return this._interacting;
      } }, { key: "stop", value: function() {
        this._scopeFire("interactions:stop", { interaction: this }), this.interactable = this.element = null, this._interacting = false, this._stopped = true, this.prepared.name = this.prevEvent = null;
      } }, { key: "getPointerIndex", value: function(t3) {
        var e2 = at(t3);
        return "mouse" === this.pointerType || "pen" === this.pointerType ? this.pointers.length - 1 : yt(this.pointers, function(t4) {
          return t4.id === e2;
        });
      } }, { key: "getPointerInfo", value: function(t3) {
        return this.pointers[this.getPointerIndex(t3)];
      } }, { key: "updatePointer", value: function(t3, e2, n2, r2) {
        var i2, o2, a2, s2 = at(t3), c2 = this.getPointerIndex(t3), l2 = this.pointers[c2];
        return r2 = false !== r2 && (r2 || /(down|start)$/i.test(e2.type)), l2 ? l2.pointer = t3 : (l2 = new _e(s2, t3, e2, null, null), c2 = this.pointers.length, this.pointers.push(l2)), st(this.coords.cur, this.pointers.map(function(t4) {
          return t4.pointer;
        }), this._now()), i2 = this.coords.delta, o2 = this.coords.prev, a2 = this.coords.cur, i2.page.x = a2.page.x - o2.page.x, i2.page.y = a2.page.y - o2.page.y, i2.client.x = a2.client.x - o2.client.x, i2.client.y = a2.client.y - o2.client.y, i2.timeStamp = a2.timeStamp - o2.timeStamp, r2 && (this.pointerIsDown = true, l2.downTime = this.coords.cur.timeStamp, l2.downTarget = n2, tt(this.downPointer, t3), this.interacting() || (et(this.coords.start, this.coords.cur), et(this.coords.prev, this.coords.cur), this.downEvent = e2, this.pointerWasMoved = false)), this._updateLatestPointer(t3, e2, n2), this._scopeFire("interactions:update-pointer", { pointer: t3, event: e2, eventTarget: n2, down: r2, pointerInfo: l2, pointerIndex: c2, interaction: this }), c2;
      } }, { key: "removePointer", value: function(t3, e2) {
        var n2 = this.getPointerIndex(t3);
        if (-1 !== n2) {
          var r2 = this.pointers[n2];
          this._scopeFire("interactions:remove-pointer", { pointer: t3, event: e2, eventTarget: null, pointerIndex: n2, pointerInfo: r2, interaction: this }), this.pointers.splice(n2, 1), this.pointerIsDown = false;
        }
      } }, { key: "_updateLatestPointer", value: function(t3, e2, n2) {
        this._latestPointer.pointer = t3, this._latestPointer.event = e2, this._latestPointer.eventTarget = n2;
      } }, { key: "destroy", value: function() {
        this._latestPointer.pointer = null, this._latestPointer.event = null, this._latestPointer.eventTarget = null;
      } }, { key: "_createPreparedEvent", value: function(t3, e2, n2, r2) {
        return new Se(this, t3, this.prepared.name, e2, this.element, n2, r2);
      } }, { key: "_fireEvent", value: function(t3) {
        var e2;
        null == (e2 = this.interactable) || e2.fire(t3), (!this.prevEvent || t3.timeStamp >= this.prevEvent.timeStamp) && (this.prevEvent = t3);
      } }, { key: "_doPhase", value: function(t3) {
        var e2 = t3.event, n2 = t3.phase, r2 = t3.preEnd, i2 = t3.type, o2 = this.rect;
        if (o2 && "move" === n2 && (H(this.edges, o2, this.coords.delta[this.interactable.options.deltaSource]), o2.width = o2.right - o2.left, o2.height = o2.bottom - o2.top), false === this._scopeFire("interactions:before-action-".concat(n2), t3))
          return false;
        var a2 = t3.iEvent = this._createPreparedEvent(e2, n2, r2, i2);
        return this._scopeFire("interactions:action-".concat(n2), t3), "start" === n2 && (this.prevEvent = a2), this._fireEvent(a2), this._scopeFire("interactions:after-action-".concat(n2), t3), true;
      } }, { key: "_now", value: function() {
        return Date.now();
      } }]), t2;
    }();
    function Ie(t2) {
      Me(t2.interaction);
    }
    function Me(t2) {
      if (!function(t3) {
        return !(!t3.offset.pending.x && !t3.offset.pending.y);
      }(t2))
        return false;
      var e2 = t2.offset.pending;
      return Ae(t2.coords.cur, e2), Ae(t2.coords.delta, e2), H(t2.edges, t2.rect, e2), e2.x = 0, e2.y = 0, true;
    }
    function ze(t2) {
      var e2 = t2.x, n2 = t2.y;
      this.offset.pending.x += e2, this.offset.pending.y += n2, this.offset.total.x += e2, this.offset.total.y += n2;
    }
    function Ae(t2, e2) {
      var n2 = t2.page, r2 = t2.client, i2 = e2.x, o2 = e2.y;
      n2.x += i2, n2.y += o2, r2.x += i2, r2.y += o2;
    }
    Oe.offsetBy = "";
    var Re = { id: "offset", before: ["modifiers", "pointer-events", "actions", "inertia"], install: function(t2) {
      t2.Interaction.prototype.offsetBy = ze;
    }, listeners: { "interactions:new": function(t2) {
      t2.interaction.offset = { total: { x: 0, y: 0 }, pending: { x: 0, y: 0 } };
    }, "interactions:update-pointer": function(t2) {
      return function(t3) {
        t3.pointerIsDown && (Ae(t3.coords.cur, t3.offset.total), t3.offset.pending.x = 0, t3.offset.pending.y = 0);
      }(t2.interaction);
    }, "interactions:before-action-start": Ie, "interactions:before-action-move": Ie, "interactions:before-action-end": function(t2) {
      var e2 = t2.interaction;
      if (Me(e2))
        return e2.move({ offset: true }), e2.end(), false;
    }, "interactions:stop": function(t2) {
      var e2 = t2.interaction;
      e2.offset.total.x = 0, e2.offset.total.y = 0, e2.offset.pending.x = 0, e2.offset.pending.y = 0;
    } } }, Ce = Re;
    var je = function() {
      function t2(e2) {
        r(this, t2), this.active = false, this.isModified = false, this.smoothEnd = false, this.allowResume = false, this.modification = void 0, this.modifierCount = 0, this.modifierArg = void 0, this.startCoords = void 0, this.t0 = 0, this.v0 = 0, this.te = 0, this.targetOffset = void 0, this.modifiedOffset = void 0, this.currentOffset = void 0, this.lambda_v0 = 0, this.one_ve_v0 = 0, this.timeout = void 0, this.interaction = void 0, this.interaction = e2;
      }
      return o(t2, [{ key: "start", value: function(t3) {
        var e2 = this.interaction, n2 = Fe(e2);
        if (!n2 || !n2.enabled)
          return false;
        var r2 = e2.coords.velocity.client, i2 = Q(r2.x, r2.y), o2 = this.modification || (this.modification = new me(e2));
        if (o2.copyFrom(e2.modification), this.t0 = e2._now(), this.allowResume = n2.allowResume, this.v0 = i2, this.currentOffset = { x: 0, y: 0 }, this.startCoords = e2.coords.cur.page, this.modifierArg = o2.fillArg({ pageCoords: this.startCoords, preEnd: true, phase: "inertiastart" }), this.t0 - e2.coords.cur.timeStamp < 50 && i2 > n2.minSpeed && i2 > n2.endSpeed)
          this.startInertia();
        else {
          if (o2.result = o2.setAll(this.modifierArg), !o2.result.changed)
            return false;
          this.startSmoothEnd();
        }
        return e2.modification.result.rect = null, e2.offsetBy(this.targetOffset), e2._doPhase({ interaction: e2, event: t3, phase: "inertiastart" }), e2.offsetBy({ x: -this.targetOffset.x, y: -this.targetOffset.y }), e2.modification.result.rect = null, this.active = true, e2.simulation = this, true;
      } }, { key: "startInertia", value: function() {
        var t3 = this, e2 = this.interaction.coords.velocity.client, n2 = Fe(this.interaction), r2 = n2.resistance, i2 = -Math.log(n2.endSpeed / this.v0) / r2;
        this.targetOffset = { x: (e2.x - i2) / r2, y: (e2.y - i2) / r2 }, this.te = i2, this.lambda_v0 = r2 / this.v0, this.one_ve_v0 = 1 - n2.endSpeed / this.v0;
        var o2 = this.modification, a2 = this.modifierArg;
        a2.pageCoords = { x: this.startCoords.x + this.targetOffset.x, y: this.startCoords.y + this.targetOffset.y }, o2.result = o2.setAll(a2), o2.result.changed && (this.isModified = true, this.modifiedOffset = { x: this.targetOffset.x + o2.result.delta.x, y: this.targetOffset.y + o2.result.delta.y }), this.onNextFrame(function() {
          return t3.inertiaTick();
        });
      } }, { key: "startSmoothEnd", value: function() {
        var t3 = this;
        this.smoothEnd = true, this.isModified = true, this.targetOffset = { x: this.modification.result.delta.x, y: this.modification.result.delta.y }, this.onNextFrame(function() {
          return t3.smoothEndTick();
        });
      } }, { key: "onNextFrame", value: function(t3) {
        var e2 = this;
        this.timeout = Lt.request(function() {
          e2.active && t3();
        });
      } }, { key: "inertiaTick", value: function() {
        var t3, e2, n2, r2, i2, o2, a2, s2 = this, c2 = this.interaction, l2 = Fe(c2).resistance, u2 = (c2._now() - this.t0) / 1e3;
        if (u2 < this.te) {
          var p2, f2 = 1 - (Math.exp(-l2 * u2) - this.lambda_v0) / this.one_ve_v0;
          this.isModified ? (t3 = 0, e2 = 0, n2 = this.targetOffset.x, r2 = this.targetOffset.y, i2 = this.modifiedOffset.x, o2 = this.modifiedOffset.y, p2 = { x: Ye(a2 = f2, t3, n2, i2), y: Ye(a2, e2, r2, o2) }) : p2 = { x: this.targetOffset.x * f2, y: this.targetOffset.y * f2 };
          var d2 = { x: p2.x - this.currentOffset.x, y: p2.y - this.currentOffset.y };
          this.currentOffset.x += d2.x, this.currentOffset.y += d2.y, c2.offsetBy(d2), c2.move(), this.onNextFrame(function() {
            return s2.inertiaTick();
          });
        } else
          c2.offsetBy({ x: this.modifiedOffset.x - this.currentOffset.x, y: this.modifiedOffset.y - this.currentOffset.y }), this.end();
      } }, { key: "smoothEndTick", value: function() {
        var t3 = this, e2 = this.interaction, n2 = e2._now() - this.t0, r2 = Fe(e2).smoothEndDuration;
        if (n2 < r2) {
          var i2 = { x: Le(n2, 0, this.targetOffset.x, r2), y: Le(n2, 0, this.targetOffset.y, r2) }, o2 = { x: i2.x - this.currentOffset.x, y: i2.y - this.currentOffset.y };
          this.currentOffset.x += o2.x, this.currentOffset.y += o2.y, e2.offsetBy(o2), e2.move({ skipModifiers: this.modifierCount }), this.onNextFrame(function() {
            return t3.smoothEndTick();
          });
        } else
          e2.offsetBy({ x: this.targetOffset.x - this.currentOffset.x, y: this.targetOffset.y - this.currentOffset.y }), this.end();
      } }, { key: "resume", value: function(t3) {
        var e2 = t3.pointer, n2 = t3.event, r2 = t3.eventTarget, i2 = this.interaction;
        i2.offsetBy({ x: -this.currentOffset.x, y: -this.currentOffset.y }), i2.updatePointer(e2, n2, r2, true), i2._doPhase({ interaction: i2, event: n2, phase: "resume" }), et(i2.coords.prev, i2.coords.cur), this.stop();
      } }, { key: "end", value: function() {
        this.interaction.move(), this.interaction.end(), this.stop();
      } }, { key: "stop", value: function() {
        this.active = this.smoothEnd = false, this.interaction.simulation = null, Lt.cancel(this.timeout);
      } }]), t2;
    }();
    function Fe(t2) {
      var e2 = t2.interactable, n2 = t2.prepared;
      return e2 && e2.options && n2.name && e2.options[n2.name].inertia;
    }
    var Xe = { id: "inertia", before: ["modifiers", "actions"], install: function(t2) {
      var e2 = t2.defaults;
      t2.usePlugin(Ce), t2.usePlugin(Ee), t2.actions.phases.inertiastart = true, t2.actions.phases.resume = true, e2.perAction.inertia = { enabled: false, resistance: 10, minSpeed: 100, endSpeed: 10, allowResume: true, smoothEndDuration: 300 };
    }, listeners: { "interactions:new": function(t2) {
      var e2 = t2.interaction;
      e2.inertia = new je(e2);
    }, "interactions:before-action-end": function(t2) {
      var e2 = t2.interaction, n2 = t2.event;
      return (!e2._interacting || e2.simulation || !e2.inertia.start(n2)) && null;
    }, "interactions:down": function(t2) {
      var e2 = t2.interaction, n2 = t2.eventTarget, r2 = e2.inertia;
      if (r2.active)
        for (var i2 = n2; w.element(i2); ) {
          if (i2 === e2.element) {
            r2.resume(t2);
            break;
          }
          i2 = A(i2);
        }
    }, "interactions:stop": function(t2) {
      var e2 = t2.interaction.inertia;
      e2.active && e2.stop();
    }, "interactions:before-action-resume": function(t2) {
      var e2 = t2.interaction.modification;
      e2.stop(t2), e2.start(t2, t2.interaction.coords.cur.page), e2.applyToInteraction(t2);
    }, "interactions:before-action-inertiastart": function(t2) {
      return t2.interaction.modification.setAndApply(t2);
    }, "interactions:action-resume": xe, "interactions:action-inertiastart": xe, "interactions:after-action-inertiastart": function(t2) {
      return t2.interaction.modification.restoreInteractionCoords(t2);
    }, "interactions:after-action-resume": function(t2) {
      return t2.interaction.modification.restoreInteractionCoords(t2);
    } } };
    function Ye(t2, e2, n2, r2) {
      var i2 = 1 - t2;
      return i2 * i2 * e2 + 2 * i2 * t2 * n2 + t2 * t2 * r2;
    }
    function Le(t2, e2, n2, r2) {
      return -n2 * (t2 /= r2) * (t2 - 2) + e2;
    }
    var qe = Xe;
    function Be(t2, e2) {
      for (var n2 = 0; n2 < e2.length; n2++) {
        var r2 = e2[n2];
        if (t2.immediatePropagationStopped)
          break;
        r2(t2);
      }
    }
    var Ve = function() {
      function t2(e2) {
        r(this, t2), this.options = void 0, this.types = {}, this.propagationStopped = false, this.immediatePropagationStopped = false, this.global = void 0, this.options = V({}, e2 || {});
      }
      return o(t2, [{ key: "fire", value: function(t3) {
        var e2, n2 = this.global;
        (e2 = this.types[t3.type]) && Be(t3, e2), !t3.propagationStopped && n2 && (e2 = n2[t3.type]) && Be(t3, e2);
      } }, { key: "on", value: function(t3, e2) {
        var n2 = $(t3, e2);
        for (t3 in n2)
          this.types[t3] = gt(this.types[t3] || [], n2[t3]);
      } }, { key: "off", value: function(t3, e2) {
        var n2 = $(t3, e2);
        for (t3 in n2) {
          var r2 = this.types[t3];
          if (r2 && r2.length)
            for (var i2 = 0, o2 = n2[t3]; i2 < o2.length; i2++) {
              var a2 = o2[i2], s2 = r2.indexOf(a2);
              -1 !== s2 && r2.splice(s2, 1);
            }
        }
      } }, { key: "getRect", value: function(t3) {
        return null;
      } }]), t2;
    }();
    var We = function() {
      function t2(e2) {
        r(this, t2), this.currentTarget = void 0, this.originalEvent = void 0, this.type = void 0, this.originalEvent = e2, tt(this, e2);
      }
      return o(t2, [{ key: "preventOriginalDefault", value: function() {
        this.originalEvent.preventDefault();
      } }, { key: "stopPropagation", value: function() {
        this.originalEvent.stopPropagation();
      } }, { key: "stopImmediatePropagation", value: function() {
        this.originalEvent.stopImmediatePropagation();
      } }]), t2;
    }();
    function Ge(t2) {
      return w.object(t2) ? { capture: !!t2.capture, passive: !!t2.passive } : { capture: !!t2, passive: false };
    }
    function Ne(t2, e2) {
      return t2 === e2 || ("boolean" == typeof t2 ? !!e2.capture === t2 && false == !!e2.passive : !!t2.capture == !!e2.capture && !!t2.passive == !!e2.passive);
    }
    var Ue = { id: "events", install: function(t2) {
      var e2, n2 = [], r2 = {}, i2 = [], o2 = { add: a2, remove: s2, addDelegate: function(t3, e3, n3, o3, s3) {
        var u2 = Ge(s3);
        if (!r2[n3]) {
          r2[n3] = [];
          for (var p2 = 0; p2 < i2.length; p2++) {
            var f2 = i2[p2];
            a2(f2, n3, c2), a2(f2, n3, l2, true);
          }
        }
        var d2 = r2[n3], h2 = bt(d2, function(n4) {
          return n4.selector === t3 && n4.context === e3;
        });
        h2 || (h2 = { selector: t3, context: e3, listeners: [] }, d2.push(h2));
        h2.listeners.push({ func: o3, options: u2 });
      }, removeDelegate: function(t3, e3, n3, i3, o3) {
        var a3, u2 = Ge(o3), p2 = r2[n3], f2 = false;
        if (!p2)
          return;
        for (a3 = p2.length - 1; a3 >= 0; a3--) {
          var d2 = p2[a3];
          if (d2.selector === t3 && d2.context === e3) {
            for (var h2 = d2.listeners, v2 = h2.length - 1; v2 >= 0; v2--) {
              var g2 = h2[v2];
              if (g2.func === i3 && Ne(g2.options, u2)) {
                h2.splice(v2, 1), h2.length || (p2.splice(a3, 1), s2(e3, n3, c2), s2(e3, n3, l2, true)), f2 = true;
                break;
              }
            }
            if (f2)
              break;
          }
        }
      }, delegateListener: c2, delegateUseCapture: l2, delegatedEvents: r2, documents: i2, targets: n2, supportsOptions: false, supportsPassive: false };
      function a2(t3, e3, r3, i3) {
        if (t3.addEventListener) {
          var a3 = Ge(i3), s3 = bt(n2, function(e4) {
            return e4.eventTarget === t3;
          });
          s3 || (s3 = { eventTarget: t3, events: {} }, n2.push(s3)), s3.events[e3] || (s3.events[e3] = []), bt(s3.events[e3], function(t4) {
            return t4.func === r3 && Ne(t4.options, a3);
          }) || (t3.addEventListener(e3, r3, o2.supportsOptions ? a3 : a3.capture), s3.events[e3].push({ func: r3, options: a3 }));
        }
      }
      function s2(t3, e3, r3, i3) {
        if (t3.addEventListener && t3.removeEventListener) {
          var a3 = yt(n2, function(e4) {
            return e4.eventTarget === t3;
          }), c3 = n2[a3];
          if (c3 && c3.events)
            if ("all" !== e3) {
              var l3 = false, u2 = c3.events[e3];
              if (u2) {
                if ("all" === r3) {
                  for (var p2 = u2.length - 1; p2 >= 0; p2--) {
                    var f2 = u2[p2];
                    s2(t3, e3, f2.func, f2.options);
                  }
                  return;
                }
                for (var d2 = Ge(i3), h2 = 0; h2 < u2.length; h2++) {
                  var v2 = u2[h2];
                  if (v2.func === r3 && Ne(v2.options, d2)) {
                    t3.removeEventListener(e3, r3, o2.supportsOptions ? d2 : d2.capture), u2.splice(h2, 1), 0 === u2.length && (delete c3.events[e3], l3 = true);
                    break;
                  }
                }
              }
              l3 && !Object.keys(c3.events).length && n2.splice(a3, 1);
            } else
              for (e3 in c3.events)
                c3.events.hasOwnProperty(e3) && s2(t3, e3, "all");
        }
      }
      function c2(t3, e3) {
        for (var n3 = Ge(e3), i3 = new We(t3), o3 = r2[t3.type], a3 = ht(t3)[0], s3 = a3; w.element(s3); ) {
          for (var c3 = 0; c3 < o3.length; c3++) {
            var l3 = o3[c3], u2 = l3.selector, p2 = l3.context;
            if (R(s3, u2) && M(p2, a3) && M(p2, s3)) {
              var f2 = l3.listeners;
              i3.currentTarget = s3;
              for (var d2 = 0; d2 < f2.length; d2++) {
                var h2 = f2[d2];
                Ne(h2.options, n3) && h2.func(i3);
              }
            }
          }
          s3 = A(s3);
        }
      }
      function l2(t3) {
        return c2(t3, true);
      }
      return null == (e2 = t2.document) || e2.createElement("div").addEventListener("test", null, { get capture() {
        return o2.supportsOptions = true;
      }, get passive() {
        return o2.supportsPassive = true;
      } }), t2.events = o2, o2;
    } }, He = { methodOrder: ["simulationResume", "mouseOrPen", "hasPointer", "idle"], search: function(t2) {
      for (var e2 = 0, n2 = He.methodOrder; e2 < n2.length; e2++) {
        var r2 = n2[e2], i2 = He[r2](t2);
        if (i2)
          return i2;
      }
      return null;
    }, simulationResume: function(t2) {
      var e2 = t2.pointerType, n2 = t2.eventType, r2 = t2.eventTarget, i2 = t2.scope;
      if (!/down|start/i.test(n2))
        return null;
      for (var o2 = 0, a2 = i2.interactions.list; o2 < a2.length; o2++) {
        var s2 = a2[o2], c2 = r2;
        if (s2.simulation && s2.simulation.allowResume && s2.pointerType === e2)
          for (; c2; ) {
            if (c2 === s2.element)
              return s2;
            c2 = A(c2);
          }
      }
      return null;
    }, mouseOrPen: function(t2) {
      var e2, n2 = t2.pointerId, r2 = t2.pointerType, i2 = t2.eventType, o2 = t2.scope;
      if ("mouse" !== r2 && "pen" !== r2)
        return null;
      for (var a2 = 0, s2 = o2.interactions.list; a2 < s2.length; a2++) {
        var c2 = s2[a2];
        if (c2.pointerType === r2) {
          if (c2.simulation && !Ke(c2, n2))
            continue;
          if (c2.interacting())
            return c2;
          e2 || (e2 = c2);
        }
      }
      if (e2)
        return e2;
      for (var l2 = 0, u2 = o2.interactions.list; l2 < u2.length; l2++) {
        var p2 = u2[l2];
        if (!(p2.pointerType !== r2 || /down/i.test(i2) && p2.simulation))
          return p2;
      }
      return null;
    }, hasPointer: function(t2) {
      for (var e2 = t2.pointerId, n2 = 0, r2 = t2.scope.interactions.list; n2 < r2.length; n2++) {
        var i2 = r2[n2];
        if (Ke(i2, e2))
          return i2;
      }
      return null;
    }, idle: function(t2) {
      for (var e2 = t2.pointerType, n2 = 0, r2 = t2.scope.interactions.list; n2 < r2.length; n2++) {
        var i2 = r2[n2];
        if (1 === i2.pointers.length) {
          var o2 = i2.interactable;
          if (o2 && (!o2.options.gesture || !o2.options.gesture.enabled))
            continue;
        } else if (i2.pointers.length >= 2)
          continue;
        if (!i2.interacting() && e2 === i2.pointerType)
          return i2;
      }
      return null;
    } };
    function Ke(t2, e2) {
      return t2.pointers.some(function(t3) {
        return t3.id === e2;
      });
    }
    var $e = He, Je = ["pointerDown", "pointerMove", "pointerUp", "updatePointer", "removePointer", "windowBlur"];
    function Qe(t2, e2) {
      return function(n2) {
        var r2 = e2.interactions.list, i2 = dt(n2), o2 = ht(n2), a2 = o2[0], s2 = o2[1], c2 = [];
        if (/^touch/.test(n2.type)) {
          e2.prevTouchTime = e2.now();
          for (var l2 = 0, u2 = n2.changedTouches; l2 < u2.length; l2++) {
            var p2 = u2[l2], f2 = { pointer: p2, pointerId: at(p2), pointerType: i2, eventType: n2.type, eventTarget: a2, curEventTarget: s2, scope: e2 }, d2 = Ze(f2);
            c2.push([f2.pointer, f2.eventTarget, f2.curEventTarget, d2]);
          }
        } else {
          var h2 = false;
          if (!I.supportsPointerEvent && /mouse/.test(n2.type)) {
            for (var v2 = 0; v2 < r2.length && !h2; v2++)
              h2 = "mouse" !== r2[v2].pointerType && r2[v2].pointerIsDown;
            h2 = h2 || e2.now() - e2.prevTouchTime < 500 || 0 === n2.timeStamp;
          }
          if (!h2) {
            var g2 = { pointer: n2, pointerId: at(n2), pointerType: i2, eventType: n2.type, curEventTarget: s2, eventTarget: a2, scope: e2 }, m2 = Ze(g2);
            c2.push([g2.pointer, g2.eventTarget, g2.curEventTarget, m2]);
          }
        }
        for (var y2 = 0; y2 < c2.length; y2++) {
          var b2 = c2[y2], x2 = b2[0], w2 = b2[1], E2 = b2[2];
          b2[3][t2](x2, n2, w2, E2);
        }
      };
    }
    function Ze(t2) {
      var e2 = t2.pointerType, n2 = t2.scope, r2 = { interaction: $e.search(t2), searchDetails: t2 };
      return n2.fire("interactions:find", r2), r2.interaction || n2.interactions.new({ pointerType: e2 });
    }
    function tn(t2, e2) {
      var n2 = t2.doc, r2 = t2.scope, i2 = t2.options, o2 = r2.interactions.docEvents, a2 = r2.events, s2 = a2[e2];
      for (var c2 in r2.browser.isIOS && !i2.events && (i2.events = { passive: false }), a2.delegatedEvents)
        s2(n2, c2, a2.delegateListener), s2(n2, c2, a2.delegateUseCapture, true);
      for (var l2 = i2 && i2.events, u2 = 0; u2 < o2.length; u2++) {
        var p2 = o2[u2];
        s2(n2, p2.type, p2.listener, l2);
      }
    }
    var en = { id: "core/interactions", install: function(t2) {
      for (var e2 = {}, n2 = 0; n2 < Je.length; n2++) {
        var i2 = Je[n2];
        e2[i2] = Qe(i2, t2);
      }
      var a2, c2 = I.pEventTypes;
      function l2() {
        for (var e3 = 0, n3 = t2.interactions.list; e3 < n3.length; e3++) {
          var r2 = n3[e3];
          if (r2.pointerIsDown && "touch" === r2.pointerType && !r2._interacting)
            for (var i3 = function() {
              var e4 = a3[o2];
              t2.documents.some(function(t3) {
                return M(t3.doc, e4.downTarget);
              }) || r2.removePointer(e4.pointer, e4.event);
            }, o2 = 0, a3 = r2.pointers; o2 < a3.length; o2++)
              i3();
        }
      }
      (a2 = k.PointerEvent ? [{ type: c2.down, listener: l2 }, { type: c2.down, listener: e2.pointerDown }, { type: c2.move, listener: e2.pointerMove }, { type: c2.up, listener: e2.pointerUp }, { type: c2.cancel, listener: e2.pointerUp }] : [{ type: "mousedown", listener: e2.pointerDown }, { type: "mousemove", listener: e2.pointerMove }, { type: "mouseup", listener: e2.pointerUp }, { type: "touchstart", listener: l2 }, { type: "touchstart", listener: e2.pointerDown }, { type: "touchmove", listener: e2.pointerMove }, { type: "touchend", listener: e2.pointerUp }, { type: "touchcancel", listener: e2.pointerUp }]).push({ type: "blur", listener: function(e3) {
        for (var n3 = 0, r2 = t2.interactions.list; n3 < r2.length; n3++) {
          r2[n3].documentBlur(e3);
        }
      } }), t2.prevTouchTime = 0, t2.Interaction = function(e3) {
        s(i3, e3);
        var n3 = p(i3);
        function i3() {
          return r(this, i3), n3.apply(this, arguments);
        }
        return o(i3, [{ key: "pointerMoveTolerance", get: function() {
          return t2.interactions.pointerMoveTolerance;
        }, set: function(e4) {
          t2.interactions.pointerMoveTolerance = e4;
        } }, { key: "_now", value: function() {
          return t2.now();
        } }]), i3;
      }(De), t2.interactions = { list: [], new: function(e3) {
        e3.scopeFire = function(e4, n4) {
          return t2.fire(e4, n4);
        };
        var n3 = new t2.Interaction(e3);
        return t2.interactions.list.push(n3), n3;
      }, listeners: e2, docEvents: a2, pointerMoveTolerance: 1 }, t2.usePlugin(he);
    }, listeners: { "scope:add-document": function(t2) {
      return tn(t2, "add");
    }, "scope:remove-document": function(t2) {
      return tn(t2, "remove");
    }, "interactable:unset": function(t2, e2) {
      for (var n2 = t2.interactable, r2 = e2.interactions.list.length - 1; r2 >= 0; r2--) {
        var i2 = e2.interactions.list[r2];
        i2.interactable === n2 && (i2.stop(), e2.fire("interactions:destroy", { interaction: i2 }), i2.destroy(), e2.interactions.list.length > 2 && e2.interactions.list.splice(r2, 1));
      }
    } }, onDocSignal: tn, doOnInteractions: Qe, methodNames: Je }, nn = en, rn = function(t2) {
      return t2[t2.On = 0] = "On", t2[t2.Off = 1] = "Off", t2;
    }(rn || {}), on = function() {
      function t2(e2, n2, i2, o2) {
        r(this, t2), this.target = void 0, this.options = void 0, this._actions = void 0, this.events = new Ve(), this._context = void 0, this._win = void 0, this._doc = void 0, this._scopeEvents = void 0, this._actions = n2.actions, this.target = e2, this._context = n2.context || i2, this._win = y(B(e2) ? this._context : e2), this._doc = this._win.document, this._scopeEvents = o2, this.set(n2);
      }
      return o(t2, [{ key: "_defaults", get: function() {
        return { base: {}, perAction: {}, actions: {} };
      } }, { key: "setOnEvents", value: function(t3, e2) {
        return w.func(e2.onstart) && this.on("".concat(t3, "start"), e2.onstart), w.func(e2.onmove) && this.on("".concat(t3, "move"), e2.onmove), w.func(e2.onend) && this.on("".concat(t3, "end"), e2.onend), w.func(e2.oninertiastart) && this.on("".concat(t3, "inertiastart"), e2.oninertiastart), this;
      } }, { key: "updatePerActionListeners", value: function(t3, e2, n2) {
        var r2, i2 = this, o2 = null == (r2 = this._actions.map[t3]) ? void 0 : r2.filterEventType, a2 = function(t4) {
          return (null == o2 || o2(t4)) && ve(t4, i2._actions);
        };
        (w.array(e2) || w.object(e2)) && this._onOff(rn.Off, t3, e2, void 0, a2), (w.array(n2) || w.object(n2)) && this._onOff(rn.On, t3, n2, void 0, a2);
      } }, { key: "setPerAction", value: function(t3, e2) {
        var n2 = this._defaults;
        for (var r2 in e2) {
          var i2 = r2, o2 = this.options[t3], a2 = e2[i2];
          "listeners" === i2 && this.updatePerActionListeners(t3, o2.listeners, a2), w.array(a2) ? o2[i2] = mt(a2) : w.plainObject(a2) ? (o2[i2] = V(o2[i2] || {}, ge(a2)), w.object(n2.perAction[i2]) && "enabled" in n2.perAction[i2] && (o2[i2].enabled = false !== a2.enabled)) : w.bool(a2) && w.object(n2.perAction[i2]) ? o2[i2].enabled = a2 : o2[i2] = a2;
        }
      } }, { key: "getRect", value: function(t3) {
        return t3 = t3 || (w.element(this.target) ? this.target : null), w.string(this.target) && (t3 = t3 || this._context.querySelector(this.target)), L(t3);
      } }, { key: "rectChecker", value: function(t3) {
        var e2 = this;
        return w.func(t3) ? (this.getRect = function(n2) {
          var r2 = V({}, t3.apply(e2, n2));
          return "width" in r2 || (r2.width = r2.right - r2.left, r2.height = r2.bottom - r2.top), r2;
        }, this) : null === t3 ? (delete this.getRect, this) : this.getRect;
      } }, { key: "_backCompatOption", value: function(t3, e2) {
        if (B(e2) || w.object(e2)) {
          for (var n2 in this.options[t3] = e2, this._actions.map)
            this.options[n2][t3] = e2;
          return this;
        }
        return this.options[t3];
      } }, { key: "origin", value: function(t3) {
        return this._backCompatOption("origin", t3);
      } }, { key: "deltaSource", value: function(t3) {
        return "page" === t3 || "client" === t3 ? (this.options.deltaSource = t3, this) : this.options.deltaSource;
      } }, { key: "getAllElements", value: function() {
        var t3 = this.target;
        return w.string(t3) ? Array.from(this._context.querySelectorAll(t3)) : w.func(t3) && t3.getAllElements ? t3.getAllElements() : w.element(t3) ? [t3] : [];
      } }, { key: "context", value: function() {
        return this._context;
      } }, { key: "inContext", value: function(t3) {
        return this._context === t3.ownerDocument || M(this._context, t3);
      } }, { key: "testIgnoreAllow", value: function(t3, e2, n2) {
        return !this.testIgnore(t3.ignoreFrom, e2, n2) && this.testAllow(t3.allowFrom, e2, n2);
      } }, { key: "testAllow", value: function(t3, e2, n2) {
        return !t3 || !!w.element(n2) && (w.string(t3) ? F(n2, t3, e2) : !!w.element(t3) && M(t3, n2));
      } }, { key: "testIgnore", value: function(t3, e2, n2) {
        return !(!t3 || !w.element(n2)) && (w.string(t3) ? F(n2, t3, e2) : !!w.element(t3) && M(t3, n2));
      } }, { key: "fire", value: function(t3) {
        return this.events.fire(t3), this;
      } }, { key: "_onOff", value: function(t3, e2, n2, r2, i2) {
        w.object(e2) && !w.array(e2) && (r2 = n2, n2 = null);
        var o2 = $(e2, n2, i2);
        for (var a2 in o2) {
          "wheel" === a2 && (a2 = I.wheelEvent);
          for (var s2 = 0, c2 = o2[a2]; s2 < c2.length; s2++) {
            var l2 = c2[s2];
            ve(a2, this._actions) ? this.events[t3 === rn.On ? "on" : "off"](a2, l2) : w.string(this.target) ? this._scopeEvents[t3 === rn.On ? "addDelegate" : "removeDelegate"](this.target, this._context, a2, l2, r2) : this._scopeEvents[t3 === rn.On ? "add" : "remove"](this.target, a2, l2, r2);
          }
        }
        return this;
      } }, { key: "on", value: function(t3, e2, n2) {
        return this._onOff(rn.On, t3, e2, n2);
      } }, { key: "off", value: function(t3, e2, n2) {
        return this._onOff(rn.Off, t3, e2, n2);
      } }, { key: "set", value: function(t3) {
        var e2 = this._defaults;
        for (var n2 in w.object(t3) || (t3 = {}), this.options = ge(e2.base), this._actions.methodDict) {
          var r2 = n2, i2 = this._actions.methodDict[r2];
          this.options[r2] = {}, this.setPerAction(r2, V(V({}, e2.perAction), e2.actions[r2])), this[i2](t3[r2]);
        }
        for (var o2 in t3)
          "getRect" !== o2 ? w.func(this[o2]) && this[o2](t3[o2]) : this.rectChecker(t3.getRect);
        return this;
      } }, { key: "unset", value: function() {
        if (w.string(this.target))
          for (var t3 in this._scopeEvents.delegatedEvents)
            for (var e2 = this._scopeEvents.delegatedEvents[t3], n2 = e2.length - 1; n2 >= 0; n2--) {
              var r2 = e2[n2], i2 = r2.selector, o2 = r2.context, a2 = r2.listeners;
              i2 === this.target && o2 === this._context && e2.splice(n2, 1);
              for (var s2 = a2.length - 1; s2 >= 0; s2--)
                this._scopeEvents.removeDelegate(this.target, this._context, t3, a2[s2][0], a2[s2][1]);
            }
        else
          this._scopeEvents.remove(this.target, "all");
      } }]), t2;
    }(), an = function() {
      function t2(e2) {
        var n2 = this;
        r(this, t2), this.list = [], this.selectorMap = {}, this.scope = void 0, this.scope = e2, e2.addListeners({ "interactable:unset": function(t3) {
          var e3 = t3.interactable, r2 = e3.target, i2 = w.string(r2) ? n2.selectorMap[r2] : r2[n2.scope.id], o2 = yt(i2, function(t4) {
            return t4 === e3;
          });
          i2.splice(o2, 1);
        } });
      }
      return o(t2, [{ key: "new", value: function(t3, e2) {
        e2 = V(e2 || {}, { actions: this.scope.actions });
        var n2 = new this.scope.Interactable(t3, e2, this.scope.document, this.scope.events);
        return this.scope.addDocument(n2._doc), this.list.push(n2), w.string(t3) ? (this.selectorMap[t3] || (this.selectorMap[t3] = []), this.selectorMap[t3].push(n2)) : (n2.target[this.scope.id] || Object.defineProperty(t3, this.scope.id, { value: [], configurable: true }), t3[this.scope.id].push(n2)), this.scope.fire("interactable:new", { target: t3, options: e2, interactable: n2, win: this.scope._win }), n2;
      } }, { key: "getExisting", value: function(t3, e2) {
        var n2 = e2 && e2.context || this.scope.document, r2 = w.string(t3), i2 = r2 ? this.selectorMap[t3] : t3[this.scope.id];
        if (i2)
          return bt(i2, function(e3) {
            return e3._context === n2 && (r2 || e3.inContext(t3));
          });
      } }, { key: "forEachMatch", value: function(t3, e2) {
        for (var n2 = 0, r2 = this.list; n2 < r2.length; n2++) {
          var i2 = r2[n2], o2 = void 0;
          if ((w.string(i2.target) ? w.element(t3) && R(t3, i2.target) : t3 === i2.target) && i2.inContext(t3) && (o2 = e2(i2)), void 0 !== o2)
            return o2;
        }
      } }]), t2;
    }();
    var sn = function() {
      function t2() {
        var e2 = this;
        r(this, t2), this.id = "__interact_scope_".concat(Math.floor(100 * Math.random())), this.isInitialized = false, this.listenerMaps = [], this.browser = I, this.defaults = ge(Te), this.Eventable = Ve, this.actions = { map: {}, phases: { start: true, move: true, end: true }, methodDict: {}, phaselessTypes: {} }, this.interactStatic = function(t3) {
          var e3 = function e4(n3, r2) {
            var i2 = t3.interactables.getExisting(n3, r2);
            return i2 || ((i2 = t3.interactables.new(n3, r2)).events.global = e4.globalEvents), i2;
          };
          return e3.getPointerAverage = lt, e3.getTouchBBox = ut, e3.getTouchDistance = pt, e3.getTouchAngle = ft, e3.getElementRect = L, e3.getElementClientRect = Y, e3.matchesSelector = R, e3.closest = z, e3.globalEvents = {}, e3.version = "1.10.27", e3.scope = t3, e3.use = function(t4, e4) {
            return this.scope.usePlugin(t4, e4), this;
          }, e3.isSet = function(t4, e4) {
            return !!this.scope.interactables.get(t4, e4 && e4.context);
          }, e3.on = Nt(function(t4, e4, n3) {
            if (w.string(t4) && -1 !== t4.search(" ") && (t4 = t4.trim().split(/ +/)), w.array(t4)) {
              for (var r2 = 0, i2 = t4; r2 < i2.length; r2++) {
                var o2 = i2[r2];
                this.on(o2, e4, n3);
              }
              return this;
            }
            if (w.object(t4)) {
              for (var a2 in t4)
                this.on(a2, t4[a2], e4);
              return this;
            }
            return ve(t4, this.scope.actions) ? this.globalEvents[t4] ? this.globalEvents[t4].push(e4) : this.globalEvents[t4] = [e4] : this.scope.events.add(this.scope.document, t4, e4, { options: n3 }), this;
          }, "The interact.on() method is being deprecated"), e3.off = Nt(function(t4, e4, n3) {
            if (w.string(t4) && -1 !== t4.search(" ") && (t4 = t4.trim().split(/ +/)), w.array(t4)) {
              for (var r2 = 0, i2 = t4; r2 < i2.length; r2++) {
                var o2 = i2[r2];
                this.off(o2, e4, n3);
              }
              return this;
            }
            if (w.object(t4)) {
              for (var a2 in t4)
                this.off(a2, t4[a2], e4);
              return this;
            }
            var s2;
            return ve(t4, this.scope.actions) ? t4 in this.globalEvents && -1 !== (s2 = this.globalEvents[t4].indexOf(e4)) && this.globalEvents[t4].splice(s2, 1) : this.scope.events.remove(this.scope.document, t4, e4, n3), this;
          }, "The interact.off() method is being deprecated"), e3.debug = function() {
            return this.scope;
          }, e3.supportsTouch = function() {
            return I.supportsTouch;
          }, e3.supportsPointerEvent = function() {
            return I.supportsPointerEvent;
          }, e3.stop = function() {
            for (var t4 = 0, e4 = this.scope.interactions.list; t4 < e4.length; t4++)
              e4[t4].stop();
            return this;
          }, e3.pointerMoveTolerance = function(t4) {
            return w.number(t4) ? (this.scope.interactions.pointerMoveTolerance = t4, this) : this.scope.interactions.pointerMoveTolerance;
          }, e3.addDocument = function(t4, e4) {
            this.scope.addDocument(t4, e4);
          }, e3.removeDocument = function(t4) {
            this.scope.removeDocument(t4);
          }, e3;
        }(this), this.InteractEvent = Se, this.Interactable = void 0, this.interactables = new an(this), this._win = void 0, this.document = void 0, this.window = void 0, this.documents = [], this._plugins = { list: [], map: {} }, this.onWindowUnload = function(t3) {
          return e2.removeDocument(t3.target);
        };
        var n2 = this;
        this.Interactable = function(t3) {
          s(i2, t3);
          var e3 = p(i2);
          function i2() {
            return r(this, i2), e3.apply(this, arguments);
          }
          return o(i2, [{ key: "_defaults", get: function() {
            return n2.defaults;
          } }, { key: "set", value: function(t4) {
            return f(c(i2.prototype), "set", this).call(this, t4), n2.fire("interactable:set", { options: t4, interactable: this }), this;
          } }, { key: "unset", value: function() {
            f(c(i2.prototype), "unset", this).call(this);
            var t4 = n2.interactables.list.indexOf(this);
            t4 < 0 || (n2.interactables.list.splice(t4, 1), n2.fire("interactable:unset", { interactable: this }));
          } }]), i2;
        }(on);
      }
      return o(t2, [{ key: "addListeners", value: function(t3, e2) {
        this.listenerMaps.push({ id: e2, map: t3 });
      } }, { key: "fire", value: function(t3, e2) {
        for (var n2 = 0, r2 = this.listenerMaps; n2 < r2.length; n2++) {
          var i2 = r2[n2].map[t3];
          if (i2 && false === i2(e2, this, t3))
            return false;
        }
      } }, { key: "init", value: function(t3) {
        return this.isInitialized ? this : function(t4, e2) {
          t4.isInitialized = true, w.window(e2) && m(e2);
          return k.init(e2), I.init(e2), Lt.init(e2), t4.window = e2, t4.document = e2.document, t4.usePlugin(nn), t4.usePlugin(Ue), t4;
        }(this, t3);
      } }, { key: "pluginIsInstalled", value: function(t3) {
        var e2 = t3.id;
        return e2 ? !!this._plugins.map[e2] : -1 !== this._plugins.list.indexOf(t3);
      } }, { key: "usePlugin", value: function(t3, e2) {
        if (!this.isInitialized)
          return this;
        if (this.pluginIsInstalled(t3))
          return this;
        if (t3.id && (this._plugins.map[t3.id] = t3), this._plugins.list.push(t3), t3.install && t3.install(this, e2), t3.listeners && t3.before) {
          for (var n2 = 0, r2 = this.listenerMaps.length, i2 = t3.before.reduce(function(t4, e3) {
            return t4[e3] = true, t4[cn(e3)] = true, t4;
          }, {}); n2 < r2; n2++) {
            var o2 = this.listenerMaps[n2].id;
            if (o2 && (i2[o2] || i2[cn(o2)]))
              break;
          }
          this.listenerMaps.splice(n2, 0, { id: t3.id, map: t3.listeners });
        } else
          t3.listeners && this.listenerMaps.push({ id: t3.id, map: t3.listeners });
        return this;
      } }, { key: "addDocument", value: function(t3, e2) {
        if (-1 !== this.getDocIndex(t3))
          return false;
        var n2 = y(t3);
        e2 = e2 ? V({}, e2) : {}, this.documents.push({ doc: t3, options: e2 }), this.events.documents.push(t3), t3 !== this.document && this.events.add(n2, "unload", this.onWindowUnload), this.fire("scope:add-document", { doc: t3, window: n2, scope: this, options: e2 });
      } }, { key: "removeDocument", value: function(t3) {
        var e2 = this.getDocIndex(t3), n2 = y(t3), r2 = this.documents[e2].options;
        this.events.remove(n2, "unload", this.onWindowUnload), this.documents.splice(e2, 1), this.events.documents.splice(e2, 1), this.fire("scope:remove-document", { doc: t3, window: n2, scope: this, options: r2 });
      } }, { key: "getDocIndex", value: function(t3) {
        for (var e2 = 0; e2 < this.documents.length; e2++)
          if (this.documents[e2].doc === t3)
            return e2;
        return -1;
      } }, { key: "getDocOptions", value: function(t3) {
        var e2 = this.getDocIndex(t3);
        return -1 === e2 ? null : this.documents[e2].options;
      } }, { key: "now", value: function() {
        return (this.window.Date || Date).now();
      } }]), t2;
    }();
    function cn(t2) {
      return t2 && t2.replace(/\/.*$/, "");
    }
    var ln = new sn(), un = ln.interactStatic, pn = "undefined" != typeof globalThis ? globalThis : window;
    ln.init(pn);
    var fn = Object.freeze({ __proto__: null, edgeTarget: function() {
    }, elements: function() {
    }, grid: function(t2) {
      var e2 = [["x", "y"], ["left", "top"], ["right", "bottom"], ["width", "height"]].filter(function(e3) {
        var n3 = e3[0], r2 = e3[1];
        return n3 in t2 || r2 in t2;
      }), n2 = function(n3, r2) {
        for (var i2 = t2.range, o2 = t2.limits, a2 = void 0 === o2 ? { left: -1 / 0, right: 1 / 0, top: -1 / 0, bottom: 1 / 0 } : o2, s2 = t2.offset, c2 = void 0 === s2 ? { x: 0, y: 0 } : s2, l2 = { range: i2, grid: t2, x: null, y: null }, u2 = 0; u2 < e2.length; u2++) {
          var p2 = e2[u2], f2 = p2[0], d2 = p2[1], h2 = Math.round((n3 - c2.x) / t2[f2]), v2 = Math.round((r2 - c2.y) / t2[d2]);
          l2[f2] = Math.max(a2.left, Math.min(a2.right, h2 * t2[f2] + c2.x)), l2[d2] = Math.max(a2.top, Math.min(a2.bottom, v2 * t2[d2] + c2.y));
        }
        return l2;
      };
      return n2.grid = t2, n2.coordFields = e2, n2;
    } }), dn = { id: "snappers", install: function(t2) {
      var e2 = t2.interactStatic;
      e2.snappers = V(e2.snappers || {}, fn), e2.createSnapGrid = e2.snappers.grid;
    } }, hn = dn, vn = { start: function(t2) {
      var n2 = t2.state, r2 = t2.rect, i2 = t2.edges, o2 = t2.pageCoords, a2 = n2.options, s2 = a2.ratio, c2 = a2.enabled, l2 = n2.options, u2 = l2.equalDelta, p2 = l2.modifiers;
      "preserve" === s2 && (s2 = r2.width / r2.height), n2.startCoords = V({}, o2), n2.startRect = V({}, r2), n2.ratio = s2, n2.equalDelta = u2;
      var f2 = n2.linkedEdges = { top: i2.top || i2.left && !i2.bottom, left: i2.left || i2.top && !i2.right, bottom: i2.bottom || i2.right && !i2.top, right: i2.right || i2.bottom && !i2.left };
      if (n2.xIsPrimaryAxis = !(!i2.left && !i2.right), n2.equalDelta) {
        var d2 = (f2.left ? 1 : -1) * (f2.top ? 1 : -1);
        n2.edgeSign = { x: d2, y: d2 };
      } else
        n2.edgeSign = { x: f2.left ? -1 : 1, y: f2.top ? -1 : 1 };
      if (false !== c2 && V(i2, f2), null != p2 && p2.length) {
        var h2 = new me(t2.interaction);
        h2.copyFrom(t2.interaction.modification), h2.prepareStates(p2), n2.subModification = h2, h2.startAll(e({}, t2));
      }
    }, set: function(t2) {
      var n2 = t2.state, r2 = t2.rect, i2 = t2.coords, o2 = n2.linkedEdges, a2 = V({}, i2), s2 = n2.equalDelta ? gn : mn;
      if (V(t2.edges, o2), s2(n2, n2.xIsPrimaryAxis, i2, r2), !n2.subModification)
        return null;
      var c2 = V({}, r2);
      H(o2, c2, { x: i2.x - a2.x, y: i2.y - a2.y });
      var l2 = n2.subModification.setAll(e(e({}, t2), {}, { rect: c2, edges: o2, pageCoords: i2, prevCoords: i2, prevRect: c2 })), u2 = l2.delta;
      l2.changed && (s2(n2, Math.abs(u2.x) > Math.abs(u2.y), l2.coords, l2.rect), V(i2, l2.coords));
      return l2.eventProps;
    }, defaults: { ratio: "preserve", equalDelta: false, modifiers: [], enabled: false } };
    function gn(t2, e2, n2) {
      var r2 = t2.startCoords, i2 = t2.edgeSign;
      e2 ? n2.y = r2.y + (n2.x - r2.x) * i2.y : n2.x = r2.x + (n2.y - r2.y) * i2.x;
    }
    function mn(t2, e2, n2, r2) {
      var i2 = t2.startRect, o2 = t2.startCoords, a2 = t2.ratio, s2 = t2.edgeSign;
      if (e2) {
        var c2 = r2.width / a2;
        n2.y = o2.y + (c2 - i2.height) * s2.y;
      } else {
        var l2 = r2.height * a2;
        n2.x = o2.x + (l2 - i2.width) * s2.x;
      }
    }
    var yn = be(vn, "aspectRatio"), bn = function() {
    };
    bn._defaults = {};
    var xn = bn;
    function wn(t2, e2, n2) {
      return w.func(t2) ? G(t2, e2.interactable, e2.element, [n2.x, n2.y, e2]) : G(t2, e2.interactable, e2.element);
    }
    var En = { start: function(t2) {
      var e2 = t2.rect, n2 = t2.startOffset, r2 = t2.state, i2 = t2.interaction, o2 = t2.pageCoords, a2 = r2.options, s2 = a2.elementRect, c2 = V({ left: 0, top: 0, right: 0, bottom: 0 }, a2.offset || {});
      if (e2 && s2) {
        var l2 = wn(a2.restriction, i2, o2);
        if (l2) {
          var u2 = l2.right - l2.left - e2.width, p2 = l2.bottom - l2.top - e2.height;
          u2 < 0 && (c2.left += u2, c2.right += u2), p2 < 0 && (c2.top += p2, c2.bottom += p2);
        }
        c2.left += n2.left - e2.width * s2.left, c2.top += n2.top - e2.height * s2.top, c2.right += n2.right - e2.width * (1 - s2.right), c2.bottom += n2.bottom - e2.height * (1 - s2.bottom);
      }
      r2.offset = c2;
    }, set: function(t2) {
      var e2 = t2.coords, n2 = t2.interaction, r2 = t2.state, i2 = r2.options, o2 = r2.offset, a2 = wn(i2.restriction, n2, e2);
      if (a2) {
        var s2 = function(t3) {
          return !t3 || "left" in t3 && "top" in t3 || ((t3 = V({}, t3)).left = t3.x || 0, t3.top = t3.y || 0, t3.right = t3.right || t3.left + t3.width, t3.bottom = t3.bottom || t3.top + t3.height), t3;
        }(a2);
        e2.x = Math.max(Math.min(s2.right - o2.right, e2.x), s2.left + o2.left), e2.y = Math.max(Math.min(s2.bottom - o2.bottom, e2.y), s2.top + o2.top);
      }
    }, defaults: { restriction: null, elementRect: null, offset: null, endOnly: false, enabled: false } }, Tn = be(En, "restrict"), Sn = { top: 1 / 0, left: 1 / 0, bottom: -1 / 0, right: -1 / 0 }, _n = { top: -1 / 0, left: -1 / 0, bottom: 1 / 0, right: 1 / 0 };
    function Pn(t2, e2) {
      for (var n2 = 0, r2 = ["top", "left", "bottom", "right"]; n2 < r2.length; n2++) {
        var i2 = r2[n2];
        i2 in t2 || (t2[i2] = e2[i2]);
      }
      return t2;
    }
    var On = { noInner: Sn, noOuter: _n, start: function(t2) {
      var e2, n2 = t2.interaction, r2 = t2.startOffset, i2 = t2.state, o2 = i2.options;
      o2 && (e2 = N(wn(o2.offset, n2, n2.coords.start.page))), e2 = e2 || { x: 0, y: 0 }, i2.offset = { top: e2.y + r2.top, left: e2.x + r2.left, bottom: e2.y - r2.bottom, right: e2.x - r2.right };
    }, set: function(t2) {
      var e2 = t2.coords, n2 = t2.edges, r2 = t2.interaction, i2 = t2.state, o2 = i2.offset, a2 = i2.options;
      if (n2) {
        var s2 = V({}, e2), c2 = wn(a2.inner, r2, s2) || {}, l2 = wn(a2.outer, r2, s2) || {};
        Pn(c2, Sn), Pn(l2, _n), n2.top ? e2.y = Math.min(Math.max(l2.top + o2.top, s2.y), c2.top + o2.top) : n2.bottom && (e2.y = Math.max(Math.min(l2.bottom + o2.bottom, s2.y), c2.bottom + o2.bottom)), n2.left ? e2.x = Math.min(Math.max(l2.left + o2.left, s2.x), c2.left + o2.left) : n2.right && (e2.x = Math.max(Math.min(l2.right + o2.right, s2.x), c2.right + o2.right));
      }
    }, defaults: { inner: null, outer: null, offset: null, endOnly: false, enabled: false } }, kn = be(On, "restrictEdges"), Dn = V({ get elementRect() {
      return { top: 0, left: 0, bottom: 1, right: 1 };
    }, set elementRect(t2) {
    } }, En.defaults), In = be({ start: En.start, set: En.set, defaults: Dn }, "restrictRect"), Mn = { width: -1 / 0, height: -1 / 0 }, zn = { width: 1 / 0, height: 1 / 0 };
    var An = be({ start: function(t2) {
      return On.start(t2);
    }, set: function(t2) {
      var e2 = t2.interaction, n2 = t2.state, r2 = t2.rect, i2 = t2.edges, o2 = n2.options;
      if (i2) {
        var a2 = U(wn(o2.min, e2, t2.coords)) || Mn, s2 = U(wn(o2.max, e2, t2.coords)) || zn;
        n2.options = { endOnly: o2.endOnly, inner: V({}, On.noInner), outer: V({}, On.noOuter) }, i2.top ? (n2.options.inner.top = r2.bottom - a2.height, n2.options.outer.top = r2.bottom - s2.height) : i2.bottom && (n2.options.inner.bottom = r2.top + a2.height, n2.options.outer.bottom = r2.top + s2.height), i2.left ? (n2.options.inner.left = r2.right - a2.width, n2.options.outer.left = r2.right - s2.width) : i2.right && (n2.options.inner.right = r2.left + a2.width, n2.options.outer.right = r2.left + s2.width), On.set(t2), n2.options = o2;
      }
    }, defaults: { min: null, max: null, endOnly: false, enabled: false } }, "restrictSize");
    var Rn = { start: function(t2) {
      var e2, n2 = t2.interaction, r2 = t2.interactable, i2 = t2.element, o2 = t2.rect, a2 = t2.state, s2 = t2.startOffset, c2 = a2.options, l2 = c2.offsetWithOrigin ? function(t3) {
        var e3 = t3.interaction.element, n3 = N(G(t3.state.options.origin, null, null, [e3])), r3 = n3 || K(t3.interactable, e3, t3.interaction.prepared.name);
        return r3;
      }(t2) : { x: 0, y: 0 };
      if ("startCoords" === c2.offset)
        e2 = { x: n2.coords.start.page.x, y: n2.coords.start.page.y };
      else {
        var u2 = G(c2.offset, r2, i2, [n2]);
        (e2 = N(u2) || { x: 0, y: 0 }).x += l2.x, e2.y += l2.y;
      }
      var p2 = c2.relativePoints;
      a2.offsets = o2 && p2 && p2.length ? p2.map(function(t3, n3) {
        return { index: n3, relativePoint: t3, x: s2.left - o2.width * t3.x + e2.x, y: s2.top - o2.height * t3.y + e2.y };
      }) : [{ index: 0, relativePoint: null, x: e2.x, y: e2.y }];
    }, set: function(t2) {
      var e2 = t2.interaction, n2 = t2.coords, r2 = t2.state, i2 = r2.options, o2 = r2.offsets, a2 = K(e2.interactable, e2.element, e2.prepared.name), s2 = V({}, n2), c2 = [];
      i2.offsetWithOrigin || (s2.x -= a2.x, s2.y -= a2.y);
      for (var l2 = 0, u2 = o2; l2 < u2.length; l2++)
        for (var p2 = u2[l2], f2 = s2.x - p2.x, d2 = s2.y - p2.y, h2 = 0, v2 = i2.targets.length; h2 < v2; h2++) {
          var g2 = i2.targets[h2], m2 = void 0;
          (m2 = w.func(g2) ? g2(f2, d2, e2._proxy, p2, h2) : g2) && c2.push({ x: (w.number(m2.x) ? m2.x : f2) + p2.x, y: (w.number(m2.y) ? m2.y : d2) + p2.y, range: w.number(m2.range) ? m2.range : i2.range, source: g2, index: h2, offset: p2 });
        }
      for (var y2 = { target: null, inRange: false, distance: 0, range: 0, delta: { x: 0, y: 0 } }, b2 = 0; b2 < c2.length; b2++) {
        var x2 = c2[b2], E2 = x2.range, T2 = x2.x - s2.x, S2 = x2.y - s2.y, _2 = Q(T2, S2), P2 = _2 <= E2;
        E2 === 1 / 0 && y2.inRange && y2.range !== 1 / 0 && (P2 = false), y2.target && !(P2 ? y2.inRange && E2 !== 1 / 0 ? _2 / E2 < y2.distance / y2.range : E2 === 1 / 0 && y2.range !== 1 / 0 || _2 < y2.distance : !y2.inRange && _2 < y2.distance) || (y2.target = x2, y2.distance = _2, y2.range = E2, y2.inRange = P2, y2.delta.x = T2, y2.delta.y = S2);
      }
      return y2.inRange && (n2.x = y2.target.x, n2.y = y2.target.y), r2.closest = y2, y2;
    }, defaults: { range: 1 / 0, targets: null, offset: null, offsetWithOrigin: true, origin: null, relativePoints: null, endOnly: false, enabled: false } }, Cn = be(Rn, "snap");
    var jn = { start: function(t2) {
      var e2 = t2.state, n2 = t2.edges, r2 = e2.options;
      if (!n2)
        return null;
      t2.state = { options: { targets: null, relativePoints: [{ x: n2.left ? 0 : 1, y: n2.top ? 0 : 1 }], offset: r2.offset || "self", origin: { x: 0, y: 0 }, range: r2.range } }, e2.targetFields = e2.targetFields || [["width", "height"], ["x", "y"]], Rn.start(t2), e2.offsets = t2.state.offsets, t2.state = e2;
    }, set: function(t2) {
      var e2 = t2.interaction, n2 = t2.state, r2 = t2.coords, i2 = n2.options, o2 = n2.offsets, a2 = { x: r2.x - o2[0].x, y: r2.y - o2[0].y };
      n2.options = V({}, i2), n2.options.targets = [];
      for (var s2 = 0, c2 = i2.targets || []; s2 < c2.length; s2++) {
        var l2 = c2[s2], u2 = void 0;
        if (u2 = w.func(l2) ? l2(a2.x, a2.y, e2) : l2) {
          for (var p2 = 0, f2 = n2.targetFields; p2 < f2.length; p2++) {
            var d2 = f2[p2], h2 = d2[0], v2 = d2[1];
            if (h2 in u2 || v2 in u2) {
              u2.x = u2[h2], u2.y = u2[v2];
              break;
            }
          }
          n2.options.targets.push(u2);
        }
      }
      var g2 = Rn.set(t2);
      return n2.options = i2, g2;
    }, defaults: { range: 1 / 0, targets: null, offset: null, endOnly: false, enabled: false } }, Fn = be(jn, "snapSize");
    var Xn = { aspectRatio: yn, restrictEdges: kn, restrict: Tn, restrictRect: In, restrictSize: An, snapEdges: be({ start: function(t2) {
      var e2 = t2.edges;
      return e2 ? (t2.state.targetFields = t2.state.targetFields || [[e2.left ? "left" : "right", e2.top ? "top" : "bottom"]], jn.start(t2)) : null;
    }, set: jn.set, defaults: V(ge(jn.defaults), { targets: void 0, range: void 0, offset: { x: 0, y: 0 } }) }, "snapEdges"), snap: Cn, snapSize: Fn, spring: xn, avoid: xn, transform: xn, rubberband: xn }, Yn = { id: "modifiers", install: function(t2) {
      var e2 = t2.interactStatic;
      for (var n2 in t2.usePlugin(Ee), t2.usePlugin(hn), e2.modifiers = Xn, Xn) {
        var r2 = Xn[n2], i2 = r2._defaults, o2 = r2._methods;
        i2._methods = o2, t2.defaults.perAction[n2] = i2;
      }
    } }, Ln = Yn, qn = function(t2) {
      s(n2, t2);
      var e2 = p(n2);
      function n2(t3, i2, o2, a2, s2, c2) {
        var l2;
        if (r(this, n2), tt(u(l2 = e2.call(this, s2)), o2), o2 !== i2 && tt(u(l2), i2), l2.timeStamp = c2, l2.originalEvent = o2, l2.type = t3, l2.pointerId = at(i2), l2.pointerType = dt(i2), l2.target = a2, l2.currentTarget = null, "tap" === t3) {
          var p2 = s2.getPointerIndex(i2);
          l2.dt = l2.timeStamp - s2.pointers[p2].downTime;
          var f2 = l2.timeStamp - s2.tapTime;
          l2.double = !!s2.prevTap && "doubletap" !== s2.prevTap.type && s2.prevTap.target === l2.target && f2 < 500;
        } else
          "doubletap" === t3 && (l2.dt = i2.timeStamp - s2.tapTime, l2.double = true);
        return l2;
      }
      return o(n2, [{ key: "_subtractOrigin", value: function(t3) {
        var e3 = t3.x, n3 = t3.y;
        return this.pageX -= e3, this.pageY -= n3, this.clientX -= e3, this.clientY -= n3, this;
      } }, { key: "_addOrigin", value: function(t3) {
        var e3 = t3.x, n3 = t3.y;
        return this.pageX += e3, this.pageY += n3, this.clientX += e3, this.clientY += n3, this;
      } }, { key: "preventDefault", value: function() {
        this.originalEvent.preventDefault();
      } }]), n2;
    }(vt), Bn = { id: "pointer-events/base", before: ["inertia", "modifiers", "auto-start", "actions"], install: function(t2) {
      t2.pointerEvents = Bn, t2.defaults.actions.pointerEvents = Bn.defaults, V(t2.actions.phaselessTypes, Bn.types);
    }, listeners: { "interactions:new": function(t2) {
      var e2 = t2.interaction;
      e2.prevTap = null, e2.tapTime = 0;
    }, "interactions:update-pointer": function(t2) {
      var e2 = t2.down, n2 = t2.pointerInfo;
      if (!e2 && n2.hold)
        return;
      n2.hold = { duration: 1 / 0, timeout: null };
    }, "interactions:move": function(t2, e2) {
      var n2 = t2.interaction, r2 = t2.pointer, i2 = t2.event, o2 = t2.eventTarget;
      t2.duplicate || n2.pointerIsDown && !n2.pointerWasMoved || (n2.pointerIsDown && Gn(t2), Vn({ interaction: n2, pointer: r2, event: i2, eventTarget: o2, type: "move" }, e2));
    }, "interactions:down": function(t2, e2) {
      !function(t3, e3) {
        for (var n2 = t3.interaction, r2 = t3.pointer, i2 = t3.event, o2 = t3.eventTarget, a2 = t3.pointerIndex, s2 = n2.pointers[a2].hold, c2 = q(o2), l2 = { interaction: n2, pointer: r2, event: i2, eventTarget: o2, type: "hold", targets: [], path: c2, node: null }, u2 = 0; u2 < c2.length; u2++) {
          var p2 = c2[u2];
          l2.node = p2, e3.fire("pointerEvents:collect-targets", l2);
        }
        if (!l2.targets.length)
          return;
        for (var f2 = 1 / 0, d2 = 0, h2 = l2.targets; d2 < h2.length; d2++) {
          var v2 = h2[d2].eventable.options.holdDuration;
          v2 < f2 && (f2 = v2);
        }
        s2.duration = f2, s2.timeout = setTimeout(function() {
          Vn({ interaction: n2, eventTarget: o2, pointer: r2, event: i2, type: "hold" }, e3);
        }, f2);
      }(t2, e2), Vn(t2, e2);
    }, "interactions:up": function(t2, e2) {
      Gn(t2), Vn(t2, e2), function(t3, e3) {
        var n2 = t3.interaction, r2 = t3.pointer, i2 = t3.event, o2 = t3.eventTarget;
        n2.pointerWasMoved || Vn({ interaction: n2, eventTarget: o2, pointer: r2, event: i2, type: "tap" }, e3);
      }(t2, e2);
    }, "interactions:cancel": function(t2, e2) {
      Gn(t2), Vn(t2, e2);
    } }, PointerEvent: qn, fire: Vn, collectEventTargets: Wn, defaults: { holdDuration: 600, ignoreFrom: null, allowFrom: null, origin: { x: 0, y: 0 } }, types: { down: true, move: true, up: true, cancel: true, tap: true, doubletap: true, hold: true } };
    function Vn(t2, e2) {
      var n2 = t2.interaction, r2 = t2.pointer, i2 = t2.event, o2 = t2.eventTarget, a2 = t2.type, s2 = t2.targets, c2 = void 0 === s2 ? Wn(t2, e2) : s2, l2 = new qn(a2, r2, i2, o2, n2, e2.now());
      e2.fire("pointerEvents:new", { pointerEvent: l2 });
      for (var u2 = { interaction: n2, pointer: r2, event: i2, eventTarget: o2, targets: c2, type: a2, pointerEvent: l2 }, p2 = 0; p2 < c2.length; p2++) {
        var f2 = c2[p2];
        for (var d2 in f2.props || {})
          l2[d2] = f2.props[d2];
        var h2 = K(f2.eventable, f2.node);
        if (l2._subtractOrigin(h2), l2.eventable = f2.eventable, l2.currentTarget = f2.node, f2.eventable.fire(l2), l2._addOrigin(h2), l2.immediatePropagationStopped || l2.propagationStopped && p2 + 1 < c2.length && c2[p2 + 1].node !== l2.currentTarget)
          break;
      }
      if (e2.fire("pointerEvents:fired", u2), "tap" === a2) {
        var v2 = l2.double ? Vn({ interaction: n2, pointer: r2, event: i2, eventTarget: o2, type: "doubletap" }, e2) : l2;
        n2.prevTap = v2, n2.tapTime = v2.timeStamp;
      }
      return l2;
    }
    function Wn(t2, e2) {
      var n2 = t2.interaction, r2 = t2.pointer, i2 = t2.event, o2 = t2.eventTarget, a2 = t2.type, s2 = n2.getPointerIndex(r2), c2 = n2.pointers[s2];
      if ("tap" === a2 && (n2.pointerWasMoved || !c2 || c2.downTarget !== o2))
        return [];
      for (var l2 = q(o2), u2 = { interaction: n2, pointer: r2, event: i2, eventTarget: o2, type: a2, path: l2, targets: [], node: null }, p2 = 0; p2 < l2.length; p2++) {
        var f2 = l2[p2];
        u2.node = f2, e2.fire("pointerEvents:collect-targets", u2);
      }
      return "hold" === a2 && (u2.targets = u2.targets.filter(function(t3) {
        var e3, r3;
        return t3.eventable.options.holdDuration === (null == (e3 = n2.pointers[s2]) || null == (r3 = e3.hold) ? void 0 : r3.duration);
      })), u2.targets;
    }
    function Gn(t2) {
      var e2 = t2.interaction, n2 = t2.pointerIndex, r2 = e2.pointers[n2].hold;
      r2 && r2.timeout && (clearTimeout(r2.timeout), r2.timeout = null);
    }
    var Nn = Object.freeze({ __proto__: null, default: Bn });
    function Un(t2) {
      var e2 = t2.interaction;
      e2.holdIntervalHandle && (clearInterval(e2.holdIntervalHandle), e2.holdIntervalHandle = null);
    }
    var Hn = { id: "pointer-events/holdRepeat", install: function(t2) {
      t2.usePlugin(Bn);
      var e2 = t2.pointerEvents;
      e2.defaults.holdRepeatInterval = 0, e2.types.holdrepeat = t2.actions.phaselessTypes.holdrepeat = true;
    }, listeners: ["move", "up", "cancel", "endall"].reduce(function(t2, e2) {
      return t2["pointerEvents:".concat(e2)] = Un, t2;
    }, { "pointerEvents:new": function(t2) {
      var e2 = t2.pointerEvent;
      "hold" === e2.type && (e2.count = (e2.count || 0) + 1);
    }, "pointerEvents:fired": function(t2, e2) {
      var n2 = t2.interaction, r2 = t2.pointerEvent, i2 = t2.eventTarget, o2 = t2.targets;
      if ("hold" === r2.type && o2.length) {
        var a2 = o2[0].eventable.options.holdRepeatInterval;
        a2 <= 0 || (n2.holdIntervalHandle = setTimeout(function() {
          e2.pointerEvents.fire({ interaction: n2, eventTarget: i2, type: "hold", pointer: r2, event: r2 }, e2);
        }, a2));
      }
    } }) }, Kn = Hn;
    var $n = { id: "pointer-events/interactableTargets", install: function(t2) {
      var e2 = t2.Interactable;
      e2.prototype.pointerEvents = function(t3) {
        return V(this.events.options, t3), this;
      };
      var n2 = e2.prototype._backCompatOption;
      e2.prototype._backCompatOption = function(t3, e3) {
        var r2 = n2.call(this, t3, e3);
        return r2 === this && (this.events.options[t3] = e3), r2;
      };
    }, listeners: { "pointerEvents:collect-targets": function(t2, e2) {
      var n2 = t2.targets, r2 = t2.node, i2 = t2.type, o2 = t2.eventTarget;
      e2.interactables.forEachMatch(r2, function(t3) {
        var e3 = t3.events, a2 = e3.options;
        e3.types[i2] && e3.types[i2].length && t3.testIgnoreAllow(a2, r2, o2) && n2.push({ node: r2, eventable: e3, props: { interactable: t3 } });
      });
    }, "interactable:new": function(t2) {
      var e2 = t2.interactable;
      e2.events.getRect = function(t3) {
        return e2.getRect(t3);
      };
    }, "interactable:set": function(t2, e2) {
      var n2 = t2.interactable, r2 = t2.options;
      V(n2.events.options, e2.pointerEvents.defaults), V(n2.events.options, r2.pointerEvents || {});
    } } }, Jn = $n, Qn = { id: "pointer-events", install: function(t2) {
      t2.usePlugin(Nn), t2.usePlugin(Kn), t2.usePlugin(Jn);
    } }, Zn = Qn;
    var tr = { id: "reflow", install: function(t2) {
      var e2 = t2.Interactable;
      t2.actions.phases.reflow = true, e2.prototype.reflow = function(e3) {
        return function(t3, e4, n2) {
          for (var r2 = t3.getAllElements(), i2 = n2.window.Promise, o2 = i2 ? [] : null, a2 = function() {
            var a3 = r2[s2], c2 = t3.getRect(a3);
            if (!c2)
              return 1;
            var l2, u2 = bt(n2.interactions.list, function(n3) {
              return n3.interacting() && n3.interactable === t3 && n3.element === a3 && n3.prepared.name === e4.name;
            });
            if (u2)
              u2.move(), o2 && (l2 = u2._reflowPromise || new i2(function(t4) {
                u2._reflowResolve = t4;
              }));
            else {
              var p2 = U(c2), f2 = function(t4) {
                return { coords: t4, get page() {
                  return this.coords.page;
                }, get client() {
                  return this.coords.client;
                }, get timeStamp() {
                  return this.coords.timeStamp;
                }, get pageX() {
                  return this.coords.page.x;
                }, get pageY() {
                  return this.coords.page.y;
                }, get clientX() {
                  return this.coords.client.x;
                }, get clientY() {
                  return this.coords.client.y;
                }, get pointerId() {
                  return this.coords.pointerId;
                }, get target() {
                  return this.coords.target;
                }, get type() {
                  return this.coords.type;
                }, get pointerType() {
                  return this.coords.pointerType;
                }, get buttons() {
                  return this.coords.buttons;
                }, preventDefault: function() {
                } };
              }({ page: { x: p2.x, y: p2.y }, client: { x: p2.x, y: p2.y }, timeStamp: n2.now() });
              l2 = function(t4, e5, n3, r3, i3) {
                var o3 = t4.interactions.new({ pointerType: "reflow" }), a4 = { interaction: o3, event: i3, pointer: i3, eventTarget: n3, phase: "reflow" };
                o3.interactable = e5, o3.element = n3, o3.prevEvent = i3, o3.updatePointer(i3, i3, n3, true), nt(o3.coords.delta), Ut(o3.prepared, r3), o3._doPhase(a4);
                var s3 = t4.window, c3 = s3.Promise, l3 = c3 ? new c3(function(t5) {
                  o3._reflowResolve = t5;
                }) : void 0;
                o3._reflowPromise = l3, o3.start(r3, e5, n3), o3._interacting ? (o3.move(a4), o3.end(i3)) : (o3.stop(), o3._reflowResolve());
                return o3.removePointer(i3, i3), l3;
              }(n2, t3, a3, e4, f2);
            }
            o2 && o2.push(l2);
          }, s2 = 0; s2 < r2.length && !a2(); s2++)
            ;
          return o2 && i2.all(o2).then(function() {
            return t3;
          });
        }(this, e3, t2);
      };
    }, listeners: { "interactions:stop": function(t2, e2) {
      var n2 = t2.interaction;
      "reflow" === n2.pointerType && (n2._reflowResolve && n2._reflowResolve(), function(t3, e3) {
        t3.splice(t3.indexOf(e3), 1);
      }(e2.interactions.list, n2));
    } } }, er = tr;
    if (un.use(he), un.use(Ce), un.use(Zn), un.use(qe), un.use(Ln), un.use(pe), un.use(Xt), un.use(Gt), un.use(er), un.default = un, "object" === n(module) && module)
      try {
        module.exports = un;
      } catch (t2) {
      }
    return un.default = un, un;
  });
})(interact_min, interact_min.exports);
var interact_minExports = interact_min.exports;
const interact = /* @__PURE__ */ getDefaultExportFromCjs(interact_minExports);
export {
  interact as i
};
