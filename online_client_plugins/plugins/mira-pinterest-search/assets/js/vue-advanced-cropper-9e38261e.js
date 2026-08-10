import { o as openBlock, D as createBlock, y as renderSlot, b6 as resolveComponent, L as createVNode, E as withCtx, F as Fragment, b5 as renderList, H as resolveDynamicComponent, Q as withDirectives, S as vShow, z as mergeProps, bI as withModifiers, I as createCommentVNode } from "./@vue-b2585a38.js";
function p(t, e) {
  var i = Object.keys(t);
  if (Object.getOwnPropertySymbols) {
    var n = Object.getOwnPropertySymbols(t);
    e && (n = n.filter(function(e2) {
      return Object.getOwnPropertyDescriptor(t, e2).enumerable;
    })), i.push.apply(i, n);
  }
  return i;
}
function g(t) {
  for (var e = 1; e < arguments.length; e++) {
    var i = null != arguments[e] ? arguments[e] : {};
    e % 2 ? p(Object(i), true).forEach(function(e2) {
      f(t, e2, i[e2]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(t, Object.getOwnPropertyDescriptors(i)) : p(Object(i)).forEach(function(e2) {
      Object.defineProperty(t, e2, Object.getOwnPropertyDescriptor(i, e2));
    });
  }
  return t;
}
function f(t, e, i) {
  return e in t ? Object.defineProperty(t, e, { value: i, enumerable: true, configurable: true, writable: true }) : t[e] = i, t;
}
function v(t, e) {
  if (null == t)
    return {};
  var i, n, s = function(t2, e2) {
    if (null == t2)
      return {};
    var i2, n2, s2 = {}, o2 = Object.keys(t2);
    for (n2 = 0; n2 < o2.length; n2++)
      i2 = o2[n2], e2.indexOf(i2) >= 0 || (s2[i2] = t2[i2]);
    return s2;
  }(t, e);
  if (Object.getOwnPropertySymbols) {
    var o = Object.getOwnPropertySymbols(t);
    for (n = 0; n < o.length; n++)
      i = o[n], e.indexOf(i) >= 0 || Object.prototype.propertyIsEnumerable.call(t, i) && (s[i] = t[i]);
  }
  return s;
}
function b(t) {
  return function(t2) {
    if (Array.isArray(t2))
      return w(t2);
  }(t) || function(t2) {
    if ("undefined" != typeof Symbol && null != t2[Symbol.iterator] || null != t2["@@iterator"])
      return Array.from(t2);
  }(t) || function(t2, e) {
    if (!t2)
      return;
    if ("string" == typeof t2)
      return w(t2, e);
    var i = Object.prototype.toString.call(t2).slice(8, -1);
    "Object" === i && t2.constructor && (i = t2.constructor.name);
    if ("Map" === i || "Set" === i)
      return Array.from(t2);
    if ("Arguments" === i || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(i))
      return w(t2, e);
  }(t) || function() {
    throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
  }();
}
function w(t, e) {
  (null == e || e > t.length) && (e = t.length);
  for (var i = 0, n = new Array(e); i < e; i++)
    n[i] = t[i];
  return n;
}
var y, z, R, A = (y = function(t) {
  /*!
    Copyright (c) 2018 Jed Watson.
    Licensed under the MIT License (MIT), see
    http://jedwatson.github.io/classnames
  */
  !function() {
    var e = {}.hasOwnProperty;
    function i() {
      for (var t2 = [], n = 0; n < arguments.length; n++) {
        var s = arguments[n];
        if (s) {
          var o = typeof s;
          if ("string" === o || "number" === o)
            t2.push(s);
          else if (Array.isArray(s)) {
            if (s.length) {
              var r = i.apply(null, s);
              r && t2.push(r);
            }
          } else if ("object" === o)
            if (s.toString === Object.prototype.toString)
              for (var a in s)
                e.call(s, a) && s[a] && t2.push(a);
            else
              t2.push(s.toString());
        }
      }
      return t2.join(" ");
    }
    t.exports ? (i.default = i, t.exports = i) : window.classNames = i;
  }();
}, y(R = { path: z, exports: {}, require: function(t, e) {
  return function() {
    throw new Error("Dynamic requires are not currently supported by @rollup/plugin-commonjs");
  }(null == e && R.path);
} }, R.exports), R.exports), M = function(t) {
  return function(e, i) {
    if (!e)
      return t;
    var n;
    "string" == typeof e ? n = e : i = e;
    var s = t;
    return n && (s += "__" + n), s + (i ? Object.keys(i).reduce(function(t2, e2) {
      var n2 = i[e2];
      return n2 && (t2 += " " + ("boolean" == typeof n2 ? s + "--" + e2 : s + "--" + e2 + "_" + n2)), t2;
    }, "") : "");
  };
};
function S(t, e, i) {
  var n, s, o, r, a;
  function h() {
    var c2 = Date.now() - r;
    c2 < e && c2 >= 0 ? n = setTimeout(h, e - c2) : (n = null, i || (a = t.apply(o, s), o = s = null));
  }
  null == e && (e = 100);
  var c = function() {
    o = this, s = arguments, r = Date.now();
    var c2 = i && !n;
    return n || (n = setTimeout(h, e)), c2 && (a = t.apply(o, s), o = s = null), a;
  };
  return c.clear = function() {
    n && (clearTimeout(n), n = null);
  }, c.flush = function() {
    n && (a = t.apply(o, s), o = s = null, clearTimeout(n), n = null);
  }, c;
}
S.debounce = S;
var x = S, C = function() {
  return C = Object.assign || function(t) {
    for (var e, i = 1, n = arguments.length; i < n; i++)
      for (var s in e = arguments[i])
        Object.prototype.hasOwnProperty.call(e, s) && (t[s] = e[s]);
    return t;
  }, C.apply(this, arguments);
};
/*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
function E(t, e) {
  var i, n;
  return t && e ? (i = "" + t + e[0].toUpperCase() + e.slice(1), n = t + "-" + e) : (i = t || e, n = t || e), { name: i, classname: n };
}
function W(t) {
  return /^blob:/.test(t);
}
function T(t) {
  return W(t) || function(t2) {
    return /^data:/.test(t2);
  }(t);
}
function O(t) {
  return !!(t && t.constructor && t.call && t.apply);
}
function D(t) {
  return void 0 === t;
}
function H(t) {
  return "object" == typeof t && null !== t;
}
function j(t, e, i) {
  var n = {};
  return H(t) ? (Object.keys(e).forEach(function(s) {
    D(t[s]) ? n[s] = e[s] : H(e[s]) ? H(t[s]) ? n[s] = j(t[s], e[s], i[s]) : n[s] = t[s] ? e[s] : i[s] : true === e[s] || false === e[s] ? n[s] = Boolean(t[s]) : n[s] = t[s];
  }), n) : t ? e : i;
}
function L(t) {
  var e = Number(t);
  return Number.isNaN(e) ? t : e;
}
function P(t) {
  return typeof ("number" == t || function(t2) {
    return "object" == typeof t2 && null !== t2;
  }(t) && "[object Number]" == toString.call(t)) && !$(t);
}
function $(t) {
  return t != t;
}
function I(t, e) {
  return Math.sqrt(Math.pow(t.x - e.x, 2) + Math.pow(t.y - e.y, 2));
}
var B = function(t, e) {
  void 0 === t && (t = {}), void 0 === e && (e = {}), this.type = "manipulateImage", this.move = t, this.scale = e;
}, X = function(t, e) {
  void 0 === e && (e = {}), this.type = "resize", this.directions = t, this.params = e;
}, Y = function(t) {
  this.type = "move", this.directions = t;
}, k = function() {
  function t(t2, e, i, n, s) {
    this.type = "drag", this.nativeEvent = t2, this.position = i, this.previousPosition = n, this.element = e, this.anchor = s;
  }
  return t.prototype.shift = function() {
    var t2 = this, e = t2.element, i = t2.anchor, n = t2.position;
    if (e) {
      var s = e.getBoundingClientRect(), o = s.left, r = s.top;
      return { left: n.left - o - i.left, top: n.top - r - i.top };
    }
    return { left: 0, top: 0 };
  }, t;
}(), F = { name: "DraggableElement", props: { classname: { type: String } }, beforeMount: function() {
  window.addEventListener("mouseup", this.onMouseUp, { passive: false }), window.addEventListener("mousemove", this.onMouseMove, { passive: false }), window.addEventListener("touchmove", this.onTouchMove, { passive: false }), window.addEventListener("touchend", this.onTouchEnd, { passive: false });
}, beforeUnmount: function() {
  window.removeEventListener("mouseup", this.onMouseUp), window.removeEventListener("mousemove", this.onMouseMove), window.removeEventListener("touchmove", this.onTouchMove), window.removeEventListener("touchend", this.onTouchEnd);
}, mounted: function() {
  if (!this.$refs.draggable)
    throw new Error('You should add ref "draggable" to your root element to use draggable mixin');
  this.touches = [], this.hovered = false;
}, methods: { onMouseOver: function() {
  this.hovered || (this.hovered = true, this.$emit("enter"));
}, onMouseLeave: function() {
  this.hovered && !this.touches.length && (this.hovered = false, this.$emit("leave"));
}, onTouchStart: function(t) {
  t.cancelable && !this.disabled && 1 === t.touches.length && (this.touches = b(t.touches), this.hovered || (this.$emit("enter"), this.hovered = true), t.touches.length && this.initAnchor(this.touches.reduce(function(e, i) {
    return { clientX: e.clientX + i.clientX / t.touches.length, clientY: e.clientY + i.clientY / t.touches.length };
  }, { clientX: 0, clientY: 0 })), t.preventDefault && t.preventDefault(), t.stopPropagation());
}, onTouchEnd: function() {
  this.processEnd();
}, onTouchMove: function(t) {
  this.touches.length && (this.processMove(t, t.touches), t.preventDefault && t.preventDefault(), t.stopPropagation && t.stopPropagation());
}, onMouseDown: function(t) {
  if (!this.disabled) {
    var e = { fake: true, clientX: t.clientX, clientY: t.clientY };
    this.touches = [e], this.initAnchor(e), t.stopPropagation();
  }
}, onMouseMove: function(t) {
  this.touches.length && (this.processMove(t, [{ fake: true, clientX: t.clientX, clientY: t.clientY }]), t.preventDefault && t.preventDefault());
}, onMouseUp: function() {
  this.processEnd();
}, initAnchor: function(t) {
  var e = this.$refs.draggable.getBoundingClientRect(), i = e.left, n = e.right, s = e.bottom, o = e.top;
  this.anchor = { left: t.clientX - i, top: t.clientY - o, bottom: s - t.clientY, right: n - t.clientX };
}, processMove: function(t, e) {
  var i = b(e);
  if (this.touches.length) {
    if (1 === this.touches.length && 1 === i.length) {
      var n = this.$refs.draggable;
      this.$emit("drag", new k(t, n, { left: i[0].clientX, top: i[0].clientY }, { left: this.touches[0].clientX, top: this.touches[0].clientY }, this.anchor));
    }
    this.touches = i;
  }
}, processEnd: function() {
  this.touches.length && this.$emit("drag-end"), this.hovered && (this.$emit("leave"), this.hovered = false), this.touches = [];
} }, emits: ["drag", "drag-end", "leave", "enter"] };
F.render = function(n, s, o, r, a, h) {
  return openBlock(), createBlock("div", { ref: "draggable", class: o.classname, onTouchstart: s[1] || (s[1] = function() {
    return h.onTouchStart && h.onTouchStart.apply(h, arguments);
  }), onMousedown: s[2] || (s[2] = function() {
    return h.onMouseDown && h.onMouseDown.apply(h, arguments);
  }), onMouseover: s[3] || (s[3] = function() {
    return h.onMouseOver && h.onMouseOver.apply(h, arguments);
  }), onMouseleave: s[4] || (s[4] = function() {
    return h.onMouseLeave && h.onMouseLeave.apply(h, arguments);
  }) }, [renderSlot(n.$slots, "default")], 34);
};
var U = M("vue-handler-wrapper"), N = { name: "HandlerWrapper", components: { DraggableElement: F }, props: { horizontalPosition: { type: String }, verticalPosition: { type: String }, disabled: { type: Boolean, default: false } }, computed: { classes: function() {
  var t;
  if (this.horizontalPosition || this.verticalPosition) {
    var e, i = E(this.horizontalPosition, this.verticalPosition);
    t = U((f(e = {}, i.classname, true), f(e, "disabled", this.disabled), e));
  } else
    t = U({ disabled: this.disabled });
  return { root: t, draggable: U("draggable") };
} }, emits: ["leave", "enter", "drag", "drag-end"] };
N.render = function(r, a, h, c, l, u) {
  var d = resolveComponent("DraggableElement");
  return openBlock(), createBlock("div", { class: u.classes.root }, [createVNode(d, { class: u.classes.draggable, onDrag: a[1] || (a[1] = function(t) {
    return r.$emit("drag", t);
  }), onDragEnd: a[2] || (a[2] = function(t) {
    return r.$emit("drag-end");
  }), onLeave: a[3] || (a[3] = function(t) {
    return r.$emit("leave");
  }), onEnter: a[4] || (a[4] = function(t) {
    return r.$emit("enter");
  }) }, { default: withCtx(function() {
    return [renderSlot(r.$slots, "default")];
  }), _: 3 }, 8, ["class"])], 2);
};
var Z = M("vue-line-wrapper"), q = { name: "LineWrapper", components: { DraggableElement: F }, props: { position: { type: String, required: true }, disabled: { type: Boolean, default: false } }, computed: { classname: function() {
  var t;
  return Z((f(t = {}, this.position, true), f(t, "disabled", this.disabled), t));
} }, emits: ["leave", "enter", "drag", "drag-end"] };
q.render = function(s, r, a, h, c, l) {
  var u = resolveComponent("DraggableElement");
  return openBlock(), createBlock(u, { class: l.classname, onDrag: r[1] || (r[1] = function(t) {
    return s.$emit("drag", t);
  }), onDragEnd: r[2] || (r[2] = function(t) {
    return s.$emit("drag-end");
  }), onLeave: r[3] || (r[3] = function(t) {
    return s.$emit("leave");
  }), onEnter: r[4] || (r[4] = function(t) {
    return s.$emit("enter");
  }) }, { default: withCtx(function() {
    return [renderSlot(s.$slots, "default")];
  }), _: 3 }, 8, ["class"]);
};
var V = ["left", "right", "top", "bottom"], _ = ["left", "right"], G = ["top", "bottom"], Q = ["left", "top"], K = ["fill-area", "fit-area", "stencil", "none"], J = { left: 0, top: 0, width: 0, height: 0 };
function tt(t, e, i) {
  return !(i = i || ["width", "height", "left", "top"]).some(function(i2) {
    return t[i2] !== e[i2];
  });
}
function et(t) {
  return { left: t.left, top: t.top, right: t.left + t.width, bottom: t.top + t.height };
}
function it(t, e) {
  return { left: t.left - e.left, top: t.top - e.top };
}
function nt(t) {
  return { left: t.left + t.width / 2, top: t.top + t.height / 2 };
}
function st(t, e) {
  var i = { left: 0, top: 0, right: 0, bottom: 0 };
  return V.forEach(function(n) {
    var s = e[n], o = et(t)[n];
    i[n] = void 0 !== s && void 0 !== o ? "left" === n || "top" === n ? Math.max(0, s - o) : Math.max(0, o - s) : 0;
  }), i;
}
function ot(t, e) {
  return { left: t.left - e.left, top: t.top - e.top, width: t.width + e.left + e.right, height: t.height + e.top + e.bottom };
}
function rt(t) {
  return { left: -t.left, top: -t.top };
}
function at(t, e) {
  return C(C({}, t), { left: t.left + e.left, top: t.top + e.top });
}
function ht(t, e, i, n) {
  if (1 !== e) {
    if (i) {
      var s = nt(t);
      return { width: t.width * e, height: t.height * e, left: t.left + t.width * (1 - e) / 2 + (i.left - s.left) * (n || 1 - e), top: t.top + t.height * (1 - e) / 2 + (i.top - s.top) * (n || 1 - e) };
    }
    return { width: t.width * e, height: t.height * e, left: t.left + t.width * (1 - e) / 2, top: t.top + t.height * (1 - e) / 2 };
  }
  return t;
}
function ct(t) {
  return t.width / t.height;
}
function lt(t, e) {
  return Math.min(void 0 !== e.right && void 0 !== e.left ? (e.right - e.left) / t.width : 1 / 0, void 0 !== e.bottom && void 0 !== e.top ? (e.bottom - e.top) / t.height : 1 / 0);
}
function ut(t, e) {
  var i = { left: 0, top: 0 }, n = st(t, e);
  return n.left && n.left > 0 ? i.left = n.left : n.right && n.right > 0 && (i.left = -n.right), n.top && n.top > 0 ? i.top = n.top : n.bottom && n.bottom > 0 && (i.top = -n.bottom), i;
}
function dt(t, e) {
  var i;
  return e.minimum && t < e.minimum ? i = e.minimum : e.maximum && t > e.maximum && (i = e.maximum), i;
}
function mt(t, e) {
  var i = ct(t), n = ct(e);
  return e.width < 1 / 0 && e.height < 1 / 0 ? i > n ? { width: e.width, height: e.width / i } : { width: e.height * i, height: e.height } : e.width < 1 / 0 ? { width: e.width, height: e.width / i } : e.height < 1 / 0 ? { width: e.height * i, height: e.height } : t;
}
function pt(t, e) {
  var i = e * Math.PI / 180;
  return { width: Math.abs(t.width * Math.cos(i)) + Math.abs(t.height * Math.sin(i)), height: Math.abs(t.width * Math.sin(i)) + Math.abs(t.height * Math.cos(i)) };
}
function gt(t, e) {
  var i = e * Math.PI / 180;
  return { left: t.left * Math.cos(i) - t.top * Math.sin(i), top: t.left * Math.sin(i) + t.top * Math.cos(i) };
}
function ft(t, e) {
  var i = st(vt(t, e), e);
  return i.left + i.right + i.top + i.bottom ? i.left + i.right > i.top + i.bottom ? Math.min((t.width + i.left + i.right) / t.width, lt(t, e)) : Math.min((t.height + i.top + i.bottom) / t.height, lt(t, e)) : 1;
}
function vt(t, e, i) {
  void 0 === i && (i = false);
  var n = ut(t, e);
  return at(t, i ? rt(n) : n);
}
function bt(t) {
  return { width: void 0 !== t.right && void 0 !== t.left ? t.right - t.left : 1 / 0, height: void 0 !== t.bottom && void 0 !== t.top ? t.bottom - t.top : 1 / 0 };
}
function wt(t, e) {
  return C(C({}, t), { minWidth: Math.min(e.width, t.minWidth), minHeight: Math.min(e.height, t.minHeight), maxWidth: Math.min(e.width, t.maxWidth), maxHeight: Math.min(e.height, t.maxHeight) });
}
function yt(t, e, i) {
  void 0 === i && (i = true);
  var n = {};
  return V.forEach(function(s) {
    var o = t[s], r = e[s];
    void 0 !== o && void 0 !== r ? n[s] = "left" === s || "top" === s ? i ? Math.max(o, r) : Math.min(o, r) : i ? Math.min(o, r) : Math.max(o, r) : void 0 !== r ? n[s] = r : void 0 !== o && (n[s] = o);
  }), n;
}
function zt(t, e) {
  return yt(t, e, true);
}
function Rt(t) {
  var e = t.size, i = t.aspectRatio, n = t.ignoreMinimum, s = t.sizeRestrictions;
  return Boolean((e.correctRatio || ct(e) >= i.minimum && ct(e) <= i.maximum) && e.height <= s.maxHeight && e.width <= s.maxWidth && e.width && e.height && (n || e.height >= s.minHeight && e.width >= s.minWidth));
}
function At(t, e) {
  return Math.pow(t.width - e.width, 2) + Math.pow(t.height - e.height, 2);
}
function Mt(t) {
  var e = t.width, i = t.height, n = t.sizeRestrictions, s = { minimum: t.aspectRatio && t.aspectRatio.minimum || 0, maximum: t.aspectRatio && t.aspectRatio.maximum || 1 / 0 }, o = { width: Math.max(n.minWidth, Math.min(n.maxWidth, e)), height: Math.max(n.minHeight, Math.min(n.maxHeight, i)) };
  function r(t2, o2) {
    return void 0 === o2 && (o2 = false), t2.reduce(function(t3, r2) {
      return Rt({ size: r2, aspectRatio: s, sizeRestrictions: n, ignoreMinimum: o2 }) && (!t3 || At(r2, { width: e, height: i }) < At(t3, { width: e, height: i })) ? r2 : t3;
    }, null);
  }
  var a = [];
  s && [s.minimum, s.maximum].forEach(function(t2) {
    t2 && a.push({ width: o.width, height: o.width / t2, correctRatio: true }, { width: o.height * t2, height: o.height, correctRatio: true });
  }), Rt({ size: o, aspectRatio: s, sizeRestrictions: n }) && a.push(o);
  var h = r(a) || r(a, true);
  return h && { width: h.width, height: h.height };
}
function St(t) {
  var e = t.event, i = t.coordinates, n = t.positionRestrictions, s = void 0 === n ? {} : n, o = at(i, e.directions);
  return at(o, ut(o, s));
}
function xt(t) {
  var e = t.coordinates, i = t.transform, n = t.imageSize, s = t.sizeRestrictions, o = t.positionRestrictions, r = t.aspectRatio, a = t.visibleArea, h = function(t2, e2) {
    return St({ coordinates: t2, positionRestrictions: o, event: new Y({ left: e2.left - t2.left, top: e2.top - t2.top }) });
  }, c = C({}, e);
  return (Array.isArray(i) ? i : [i]).forEach(function(t2) {
    var e2 = {};
    D((e2 = "function" == typeof t2 ? t2({ coordinates: c, imageSize: n, visibleArea: a }) : t2).width) && D(e2.height) || (c = function(t3, e3) {
      var i2 = C(C(C({}, t3), Mt({ width: e3.width, height: e3.height, sizeRestrictions: s, aspectRatio: r })), { left: 0, top: 0 });
      return h(i2, { left: t3.left, top: t3.top });
    }(c, C(C({}, c), e2))), D(e2.left) && D(e2.top) || (c = h(c, C(C({}, c), e2)));
  }), c;
}
function Ct(t) {
  t.event;
  var e = t.getAreaRestrictions, i = t.boundaries, n = t.coordinates, s = t.visibleArea;
  t.aspectRatio;
  var o = t.stencilSize, r = t.sizeRestrictions, a = t.positionRestrictions;
  t.stencilReference;
  var h, c, l, u = C({}, n), d = C({}, s), m = C({}, o);
  h = ct(m), c = ct(u), void 0 === l && (l = 1e-3), (0 === h || 0 === c ? Math.abs(c - h) < l : Math.abs(c / h) < 1 + l && Math.abs(c / h) > 1 - l) || (u = C(C({}, u), Mt({ sizeRestrictions: r, width: u.width, height: u.height, aspectRatio: { minimum: ct(m), maximum: ct(m) } })));
  var p2 = ft(d = ht(d, u.width * i.width / (d.width * m.width)), e({ visibleArea: d, type: "resize" }));
  return 1 !== p2 && (d = ht(d, p2), u = ht(u, p2)), d = vt(d = at(d, it(nt(u), nt(d))), e({ visibleArea: d, type: "move" })), { coordinates: u = vt(u, zt(et(d), a)), visibleArea: d };
}
function Et(t) {
  var e = t.event, i = t.getAreaRestrictions, n = t.boundaries, s = t.coordinates, o = t.visibleArea;
  t.aspectRatio, t.stencilSize, t.sizeRestrictions;
  var r = t.positionRestrictions;
  t.stencilReference;
  var a = C({}, s), h = C({}, o);
  if (s && o && "manipulateImage" !== e.type) {
    var c = { width: 0, height: 0 };
    h.width, n.width, ct(n) > ct(a) ? (c.height = 0.8 * n.height, c.width = c.height * ct(a)) : (c.width = 0.8 * n.width, c.height = c.width * ct(a));
    var l = ft(h = ht(h, a.width * n.width / (h.width * c.width)), i({ visibleArea: h, type: "resize" }));
    h = ht(h, l), 1 !== l && (c.height /= l, c.width /= l), h = vt(h = at(h, it(nt(a), nt(h))), i({ visibleArea: h, type: "move" })), a = vt(a, zt(et(h), r));
  }
  return { coordinates: a, visibleArea: h };
}
function Wt(t) {
  var e = t.event, i = t.coordinates, n = t.visibleArea, s = t.getAreaRestrictions, o = C({}, n), r = C({}, i);
  if ("setCoordinates" === e.type) {
    var a = Math.max(0, r.width - o.width), h = Math.max(0, r.height - o.height);
    a > h ? o = ht(o, Math.min(r.width / o.width, lt(o, s({ visibleArea: o, type: "resize" })))) : h > a && (o = ht(o, Math.min(r.height / o.height, lt(o, s({ visibleArea: o, type: "resize" }))))), o = vt(o = at(o, rt(ut(r, et(o)))), s({ visibleArea: o, type: "move" }));
  }
  return { visibleArea: o, coordinates: r };
}
function Tt(t) {
  var e = t.imageSize, i = t.visibleArea, n = t.coordinates, s = i || e;
  return { left: (i ? i.left : 0) + s.width / 2 - n.width / 2, top: (i ? i.top : 0) + s.height / 2 - n.height / 2 };
}
function Ot(t) {
  var e = t.imageSize, i = t.visibleArea, n = t.aspectRatio, s = t.sizeRestrictions, o = i || e, r = Math.min(n.maximum || 1 / 0, Math.max(n.minimum || 0, ct(o))), a = o.width < o.height ? { width: 0.8 * o.width, height: 0.8 * o.width / r } : { height: 0.8 * o.height, width: 0.8 * o.height * r };
  return Mt(C(C({}, a), { aspectRatio: n, sizeRestrictions: s }));
}
function Dt(t) {
  var e, i, n = t.imageSize, s = t.visibleArea, o = t.boundaries, r = t.aspectRatio, a = t.sizeRestrictions, h = t.stencilSize, c = s || n;
  return ct(c) > ct(o) ? i = (e = h.height * c.height / o.height) * ct(h) : e = (i = h.width * c.width / o.width) / ct(h), Mt({ width: i, height: e, aspectRatio: r, sizeRestrictions: a });
}
function Ht(t) {
  var e = t.getAreaRestrictions, i = t.coordinates, n = t.imageSize, s = ct(t.boundaries);
  if (i) {
    var o = { height: Math.max(i.height, n.height), width: Math.max(i.width, n.width) }, r = mt({ width: ct(o) > s ? o.width : o.height * s, height: ct(o) > s ? o.width / s : o.height }, bt(e())), a = { left: i.left + i.width / 2 - r.width / 2, top: i.top + i.height / 2 - r.height / 2, width: r.width, height: r.height }, h = st(i, et(C({ left: 0, top: 0 }, n))), c = {};
    return !h.left && !h.right && a.width <= n.width && (c.left = 0, c.right = n.width), !h.top && !h.bottom && a.height <= n.height && (c.top = 0, c.bottom = n.height), vt(a, c);
  }
  var l = ct(n);
  r = { height: l > s ? n.height : n.width / s, width: l > s ? n.height * s : n.width };
  return { left: n.width / 2 - r.width / 2, top: n.height / 2 - r.height / 2, width: r.width, height: r.height };
}
function jt(t, e) {
  return yt(t, et(e));
}
function Lt(t) {
  var e = t.event, i = t.coordinates, n = t.visibleArea, s = t.sizeRestrictions, o = t.getAreaRestrictions, r = t.positionRestrictions, a = t.adjustStencil, h = e.scale, c = e.move, l = C({}, n), u = C({}, i), d = 1, m = 1, p2 = h.factor && Math.abs(h.factor - 1) > 1e-3;
  l = at(l, { left: c.left || 0, top: c.top || 0 });
  var g2 = { stencil: { minimum: Math.max(s.minWidth ? s.minWidth / u.width : 0, s.minHeight ? s.minHeight / u.height : 0), maximum: Math.min(s.maxWidth ? s.maxWidth / u.width : 1 / 0, s.maxHeight ? s.maxHeight / u.height : 1 / 0, lt(u, r)) }, area: { maximum: lt(l, o({ visibleArea: l, type: "resize" })) } };
  h.factor && p2 && (h.factor < 1 ? (m = Math.max(h.factor, g2.stencil.minimum)) > 1 && (m = 1) : h.factor > 1 && (m = Math.min(h.factor, Math.min(g2.area.maximum, g2.stencil.maximum))) < 1 && (m = 1)), m && (l = ht(l, m, h.center));
  var f2 = i.left - n.left, v2 = n.width + n.left - (i.width + i.left), b2 = i.top - n.top, w2 = n.height + n.top - (i.height + i.top);
  return l = vt(l = at(l, ut(l, { left: void 0 !== r.left ? r.left - f2 * m : void 0, top: void 0 !== r.top ? r.top - b2 * m : void 0, bottom: void 0 !== r.bottom ? r.bottom + w2 * m : void 0, right: void 0 !== r.right ? r.right + v2 * m : void 0 })), o({ visibleArea: l, type: "move" })), u.width = u.width * m, u.height = u.height * m, u.left = l.left + f2 * m, u.top = l.top + b2 * m, u = vt(u, zt(et(l), r)), h.factor && p2 && a && (h.factor > 1 ? d = Math.min(g2.area.maximum, h.factor) / m : h.factor < 1 && (d = Math.max(u.height / l.height, u.width / l.width, h.factor / m)), 1 !== d && (l = at(l = vt(l = ht(l, d, h.factor > 1 ? h.center : nt(u)), o({ visibleArea: l, type: "move" })), rt(ut(u, et(l)))))), { coordinates: u, visibleArea: l };
}
function Pt(t) {
  var e = t.aspectRatio, i = t.getAreaRestrictions, n = t.coordinates, s = t.visibleArea, o = t.sizeRestrictions, r = t.positionRestrictions, a = t.imageSize, h = t.previousImageSize, c = t.angle, l = C({}, n), u = C({}, s), d = gt(nt(C({ left: 0, top: 0 }, h)), c);
  return (l = C(C({}, Mt({ sizeRestrictions: o, aspectRatio: e, width: l.width, height: l.height })), gt(nt(l), c))).left -= d.left - a.width / 2 + l.width / 2, l.top -= d.top - a.height / 2 + l.height / 2, u = ht(u, ft(u, i({ visibleArea: u, type: "resize" }))), { coordinates: l = vt(l, r), visibleArea: u = vt(u = at(u, it(nt(l), nt(n))), i({ visibleArea: u, type: "move" })) };
}
function $t(t) {
  var e = t.flip, i = t.previousFlip, n = t.rotate;
  t.aspectRatio;
  var s = t.getAreaRestrictions, o = t.coordinates, r = t.visibleArea, a = t.imageSize, h = C({}, o), c = C({}, r), l = i.horizontal !== e.horizontal, u = i.vertical !== e.vertical;
  if (l || u) {
    var d = gt({ left: a.width / 2, top: a.height / 2 }, -n), m = gt(nt(h), -n), p2 = gt({ left: l ? d.left - (m.left - d.left) : m.left, top: u ? d.top - (m.top - d.top) : m.top }, n);
    h = at(h, it(p2, nt(h))), m = gt(nt(c), -n), c = vt(c = at(c, it(p2 = gt({ left: l ? d.left - (m.left - d.left) : m.left, top: u ? d.top - (m.top - d.top) : m.top }, n), nt(c))), s({ visibleArea: c, type: "move" }));
  }
  return { coordinates: h, visibleArea: c };
}
function It(t) {
  var e = t.directions, i = t.coordinates, n = t.positionRestrictions, s = void 0 === n ? {} : n, o = t.sizeRestrictions, r = t.preserveRatio, a = t.compensate, h = C({}, e), c = ot(i, h).width, l = ot(i, h).height;
  c < 0 && (h.left < 0 && h.right < 0 ? (h.left = -(i.width - o.minWidth) / (h.left / h.right), h.right = -(i.width - o.minWidth) / (h.right / h.left)) : h.left < 0 ? h.left = -(i.width - o.minWidth) : h.right < 0 && (h.right = -(i.width - o.minWidth))), l < 0 && (h.top < 0 && h.bottom < 0 ? (h.top = -(i.height - o.minHeight) / (h.top / h.bottom), h.bottom = -(i.height - o.minHeight) / (h.bottom / h.top)) : h.top < 0 ? h.top = -(i.height - o.minHeight) : h.bottom < 0 && (h.bottom = -(i.height - o.minHeight)));
  var u = st(ot(i, h), s);
  a && (u.left && u.left > 0 && 0 === u.right ? (h.right += u.left, h.left -= u.left) : u.right && u.right > 0 && 0 === u.left && (h.left += u.right, h.right -= u.right), u.top && u.top > 0 && 0 === u.bottom ? (h.bottom += u.top, h.top -= u.top) : u.bottom && u.bottom > 0 && 0 === u.top && (h.top += u.bottom, h.bottom -= u.bottom), u = st(ot(i, h), s));
  var d = { width: 1 / 0, height: 1 / 0, left: 1 / 0, right: 1 / 0, top: 1 / 0, bottom: 1 / 0 };
  if (V.forEach(function(t2) {
    var e2 = u[t2];
    e2 && h[t2] && (d[t2] = Math.max(0, 1 - e2 / h[t2]));
  }), r) {
    var m = Math.min.apply(null, V.map(function(t2) {
      return d[t2];
    }));
    m !== 1 / 0 && V.forEach(function(t2) {
      h[t2] *= m;
    });
  } else
    V.forEach(function(t2) {
      d[t2] !== 1 / 0 && (h[t2] *= d[t2]);
    });
  if (c = ot(i, h).width, l = ot(i, h).height, h.right + h.left && (c > o.maxWidth ? d.width = (o.maxWidth - i.width) / (h.right + h.left) : c < o.minWidth && (d.width = (o.minWidth - i.width) / (h.right + h.left))), h.bottom + h.top && (l > o.maxHeight ? d.height = (o.maxHeight - i.height) / (h.bottom + h.top) : l < o.minHeight && (d.height = (o.minHeight - i.height) / (h.bottom + h.top))), r) {
    var p2 = Math.min(d.width, d.height);
    p2 !== 1 / 0 && V.forEach(function(t2) {
      h[t2] *= p2;
    });
  } else
    d.width !== 1 / 0 && _.forEach(function(t2) {
      h[t2] *= d.width;
    }), d.height !== 1 / 0 && G.forEach(function(t2) {
      h[t2] *= d.height;
    });
  return h;
}
function Bt(t, e, i) {
  return 0 == e && 0 == i ? t / 2 : 0 == e ? 0 : 0 == i ? t : t * Math.abs(e / (e + i));
}
var Xt = M("vue-simple-handler"), Yt = M("vue-simple-handler-wrapper"), kt = { name: "SimpleHandler", components: { HandlerWrapper: N }, props: { defaultClass: { type: String }, hoverClass: { type: String }, wrapperClass: { type: String }, horizontalPosition: { type: String }, verticalPosition: { type: String }, disabled: { type: Boolean, default: false } }, data: function() {
  return { hover: false };
}, computed: { classes: function() {
  var t, e = (f(t = {}, this.horizontalPosition, Boolean(this.horizontalPosition)), f(t, this.verticalPosition, Boolean(this.verticalPosition)), f(t, "".concat(this.horizontalPosition, "-").concat(this.verticalPosition), Boolean(this.verticalPosition && this.horizontalPosition)), f(t, "hover", this.hover), t);
  return { default: A(Xt(e), this.defaultClass, this.hover && this.hoverClass), wrapper: A(Yt(e), this.wrapperClass) };
} }, methods: { onDrag: function(t) {
  this.$emit("drag", t);
}, onEnter: function() {
  this.hover = true;
}, onLeave: function() {
  this.hover = false;
}, onDragEnd: function() {
  this.$emit("drag-end");
} }, emits: ["drag", "drag-end"] };
kt.render = function(i, r, a, h, c, l) {
  var u = resolveComponent("HandlerWrapper");
  return openBlock(), createBlock(u, { class: l.classes.wrapper, "vertical-position": a.verticalPosition, "horizontal-position": a.horizontalPosition, disabled: a.disabled, onDrag: l.onDrag, onDragEnd: l.onDragEnd, onEnter: l.onEnter, onLeave: l.onLeave }, { default: withCtx(function() {
    return [createVNode("div", { class: l.classes.default }, null, 2)];
  }), _: 1 }, 8, ["class", "vertical-position", "horizontal-position", "disabled", "onDrag", "onDragEnd", "onEnter", "onLeave"]);
};
var Ft = M("vue-simple-line"), Ut = M("vue-simple-line-wrapper"), Nt = { name: "SimpleLine", components: { LineWrapper: q }, props: { defaultClass: { type: String }, hoverClass: { type: String }, wrapperClass: { type: String }, position: { type: String }, disabled: { type: Boolean, default: false } }, data: function() {
  return { hover: false };
}, computed: { classes: function() {
  return { root: A(Ft(f({}, this.position, true)), this.defaultClass, this.hover && this.hoverClass), wrapper: A(Ut(f({}, this.position, true)), this.wrapperClass) };
} }, methods: { onDrag: function(t) {
  this.$emit("drag", t);
}, onEnter: function() {
  this.hover = true;
}, onLeave: function() {
  this.hover = false;
}, onDragEnd: function() {
  this.$emit("drag-end");
} }, emits: ["drag", "drag-end"] };
Nt.render = function(i, r, a, h, c, l) {
  var u = resolveComponent("LineWrapper");
  return openBlock(), createBlock(u, { class: l.classes.wrapper, position: a.position, disabled: a.disabled, onDrag: l.onDrag, onDragEnd: l.onDragEnd, onEnter: l.onEnter, onLeave: l.onLeave }, { default: withCtx(function() {
    return [createVNode("div", { class: l.classes.root }, null, 2)];
  }), _: 1 }, 8, ["class", "position", "disabled", "onDrag", "onDragEnd", "onEnter", "onLeave"]);
};
var Zt = M("vue-bounding-box"), qt = ["east", "west", null], Vt = ["south", "north", null], _t = { name: "BoundingBox", props: { width: { type: Number }, height: { type: Number }, transitions: { type: Object }, handlers: { type: Object, default: function() {
  return { eastNorth: true, north: true, westNorth: true, west: true, westSouth: true, south: true, eastSouth: true, east: true };
} }, handlersComponent: { type: [Object, String], default: function() {
  return kt;
} }, handlersClasses: { type: Object, default: function() {
  return {};
} }, handlersWrappersClasses: { type: Object, default: function() {
  return {};
} }, lines: { type: Object, default: function() {
  return { west: true, north: true, east: true, south: true };
} }, linesComponent: { type: [Object, String], default: function() {
  return Nt;
} }, linesClasses: { type: Object, default: function() {
  return {};
} }, linesWrappersClasses: { type: Object, default: function() {
  return {};
} }, resizable: { type: Boolean, default: true } }, data: function() {
  var t = [];
  return qt.forEach(function(e) {
    Vt.forEach(function(i) {
      if (e !== i) {
        var n = E(e, i), s = n.name, o = n.classname;
        t.push({ name: s, classname: o, verticalDirection: i, horizontalDirection: e });
      }
    });
  }), { points: t };
}, computed: { style: function() {
  var t = {};
  return this.width && this.height && (t.width = "".concat(this.width, "px"), t.height = "".concat(this.height, "px"), this.transitions && this.transitions.enabled && (t.transition = "".concat(this.transitions.time, "ms ").concat(this.transitions.timingFunction))), t;
}, classes: function() {
  var t = this.handlersClasses, e = this.handlersWrappersClasses, i = this.linesClasses, n = this.linesWrappersClasses;
  return { root: Zt(), handlers: t, handlersWrappers: e, lines: i, linesWrappers: n };
}, lineNodes: function() {
  var t = this, e = [];
  return this.points.forEach(function(i) {
    i.horizontalDirection && i.verticalDirection || !t.lines[i.name] || e.push({ name: i.name, component: t.linesComponent, class: A(t.classes.lines.default, t.classes.lines[i.name], !t.resizable && t.classes.lines.disabled), wrapperClass: A(t.classes.linesWrappers.default, t.classes.linesWrappers[i.name], !t.resizable && t.classes.linesWrappers.disabled), hoverClass: t.classes.lines.hover, verticalDirection: i.verticalDirection, horizontalDirection: i.horizontalDirection, disabled: !t.resizable });
  }), e;
}, handlerNodes: function() {
  var t = this, e = [], i = this.width, n = this.height;
  return this.points.forEach(function(s) {
    if (t.handlers[s.name]) {
      var o = { name: s.name, component: t.handlersComponent, class: A(t.classes.handlers.default, t.classes.handlers[s.name]), wrapperClass: A(t.classes.handlersWrappers.default, t.classes.handlersWrappers[s.name]), hoverClass: t.classes.handlers.hover, verticalDirection: s.verticalDirection, horizontalDirection: s.horizontalDirection, disabled: !t.resizable };
      if (i && n) {
        var r = s.horizontalDirection, a = s.verticalDirection, h = "east" === r ? i : "west" === r ? 0 : i / 2, c = "south" === a ? n : "north" === a ? 0 : n / 2;
        o.wrapperClass = Zt("handler"), o.wrapperStyle = { transform: "translate(".concat(h, "px, ").concat(c, "px)") }, t.transitions && t.transitions.enabled && (o.wrapperStyle.transition = "".concat(t.transitions.time, "ms ").concat(t.transitions.timingFunction));
      } else
        o.wrapperClass = Zt("handler", f({}, s.classname, true));
      e.push(o);
    }
  }), e;
} }, beforeMount: function() {
  window.addEventListener("mouseup", this.onMouseUp, { passive: false }), window.addEventListener("mousemove", this.onMouseMove, { passive: false }), window.addEventListener("touchmove", this.onTouchMove, { passive: false }), window.addEventListener("touchend", this.onTouchEnd, { passive: false });
}, beforeUnmount: function() {
  window.removeEventListener("mouseup", this.onMouseUp), window.removeEventListener("mousemove", this.onMouseMove), window.removeEventListener("touchmove", this.onTouchMove), window.removeEventListener("touchend", this.onTouchEnd);
}, mounted: function() {
  this.touches = [];
}, methods: { onEnd: function() {
  this.$emit("resize-end");
}, onHandlerDrag: function(t, e, i) {
  var n, s = t.shift(), o = s.left, r = s.top, a = { left: 0, right: 0, top: 0, bottom: 0 };
  "west" === e ? a.left -= o : "east" === e && (a.right += o), "north" === i ? a.top -= r : "south" === i && (a.bottom += r), !i && e ? n = "width" : i && !e && (n = "height"), this.resizable && this.$emit("resize", new X(a, { allowedDirections: { left: "west" === e || !e, right: "east" === e || !e, bottom: "south" === i || !i, top: "north" === i || !i }, preserveAspectRatio: t.nativeEvent && t.nativeEvent.shiftKey, respectDirection: n }));
} }, emits: ["resize", "resize-end"] };
_t.render = function(n, o, c, l, u, d) {
  return openBlock(), createBlock("div", { ref: "box", class: d.classes.root, style: d.style }, [renderSlot(n.$slots, "default"), createVNode("div", null, [(openBlock(true), createBlock(Fragment, null, renderList(d.lineNodes, function(i) {
    return openBlock(), createBlock(resolveDynamicComponent(i.component), { key: i.name, "default-class": i.class, "hover-class": i.hoverClass, "wrapper-class": i.wrapperClass, position: i.name, disabled: i.disabled, onDrag: function(t) {
      return d.onHandlerDrag(t, i.horizontalDirection, i.verticalDirection);
    }, onDragEnd: o[1] || (o[1] = function(t) {
      return d.onEnd();
    }) }, null, 8, ["default-class", "hover-class", "wrapper-class", "position", "disabled", "onDrag"]);
  }), 128))]), (openBlock(true), createBlock(Fragment, null, renderList(d.handlerNodes, function(i) {
    return openBlock(), createBlock("div", { key: i.name, style: i.wrapperStyle, class: i.wrapperClass }, [(openBlock(), createBlock(resolveDynamicComponent(i.component), { "default-class": i.class, "hover-class": i.hoverClass, "wrapper-class": i.wrapperClass, "horizontal-position": i.horizontalDirection, "vertical-position": i.verticalDirection, disabled: i.disabled, onDrag: function(t) {
      return d.onHandlerDrag(t, i.horizontalDirection, i.verticalDirection);
    }, onDragEnd: o[2] || (o[2] = function(t) {
      return d.onEnd();
    }) }, null, 8, ["default-class", "hover-class", "wrapper-class", "horizontal-position", "vertical-position", "disabled", "onDrag"]))], 6);
  }), 128))], 6);
};
var Gt = M("vue-draggable-area"), Qt = { name: "DraggableArea", props: { movable: { type: Boolean, default: true }, activationDistance: { type: Number, default: 20 } }, computed: { classnames: function() {
  return { default: Gt() };
} }, beforeMount: function() {
  window.addEventListener("mouseup", this.onMouseUp, { passive: false }), window.addEventListener("mousemove", this.onMouseMove, { passive: false }), window.addEventListener("touchmove", this.onTouchMove, { passive: false }), window.addEventListener("touchend", this.onTouchEnd, { passive: false });
}, beforeUnmount: function() {
  window.removeEventListener("mouseup", this.onMouseUp), window.removeEventListener("mousemove", this.onMouseMove), window.removeEventListener("touchmove", this.onTouchMove), window.removeEventListener("touchend", this.onTouchEnd);
}, mounted: function() {
  this.touches = [], this.touchStarted = false;
}, methods: { onTouchStart: function(t) {
  if (t.cancelable) {
    var e = this.movable && 1 === t.touches.length;
    e && (this.touches = b(t.touches)), (this.touchStarted || e) && (t.preventDefault(), t.stopPropagation());
  }
}, onTouchEnd: function() {
  this.touchStarted = false, this.processEnd();
}, onTouchMove: function(t) {
  this.touches.length >= 1 && (this.touchStarted ? (this.processMove(t, t.touches), t.preventDefault(), t.stopPropagation()) : I({ x: this.touches[0].clientX, y: this.touches[0].clientY }, { x: t.touches[0].clientX, y: t.touches[0].clientY }) > this.activationDistance && (this.initAnchor({ clientX: t.touches[0].clientX, clientY: t.touches[0].clientY }), this.touchStarted = true));
}, onMouseDown: function(t) {
  if (this.movable && 0 === t.button) {
    var e = { fake: true, clientX: t.clientX, clientY: t.clientY };
    this.touches = [e], this.initAnchor(e), t.stopPropagation();
  }
}, onMouseMove: function(t) {
  this.touches.length && (this.processMove(t, [{ fake: true, clientX: t.clientX, clientY: t.clientY }]), t.preventDefault && t.cancelable && t.preventDefault(), t.stopPropagation());
}, onMouseUp: function() {
  this.processEnd();
}, initAnchor: function(t) {
  var e = this.$refs.container.getBoundingClientRect(), i = e.left, n = e.top;
  this.anchor = { x: t.clientX - i, y: t.clientY - n };
}, processMove: function(t, e) {
  var i = b(e);
  if (this.touches.length) {
    var n = this.$refs.container.getBoundingClientRect(), s = n.left, o = n.top;
    1 === this.touches.length && 1 === i.length && this.$emit("move", new Y({ left: i[0].clientX - (s + this.anchor.x), top: i[0].clientY - (o + this.anchor.y) }));
  }
}, processEnd: function() {
  this.touches.length && this.$emit("move-end"), this.touches = [];
} }, emits: ["move", "move-end"] };
Qt.render = function(n, s, o, r, a, h) {
  return openBlock(), createBlock("div", { ref: "container", onTouchstart: s[1] || (s[1] = function() {
    return h.onTouchStart && h.onTouchStart.apply(h, arguments);
  }), onMousedown: s[2] || (s[2] = function() {
    return h.onMouseDown && h.onMouseDown.apply(h, arguments);
  }) }, [renderSlot(n.$slots, "default")], 544);
};
function Kt(t) {
  var e, i;
  return { rotate: t.rotate || 0, flip: { horizontal: (null === (e = null == t ? void 0 : t.flip) || void 0 === e ? void 0 : e.horizontal) || false, vertical: (null === (i = null == t ? void 0 : t.flip) || void 0 === i ? void 0 : i.vertical) || false } };
}
function Jt(t) {
  return new Promise(function(e, i) {
    try {
      if (t)
        if (/^data:/i.test(t))
          e(function(t2) {
            t2 = t2.replace(/^data:([^;]+);base64,/gim, "");
            for (var e2 = atob(t2), i2 = e2.length, n2 = new ArrayBuffer(i2), s2 = new Uint8Array(n2), o2 = 0; o2 < i2; o2++)
              s2[o2] = e2.charCodeAt(o2);
            return n2;
          }(t));
        else if (/^blob:/i.test(t)) {
          var n = new FileReader();
          n.onload = function(t2) {
            e(t2.target.result);
          }, o = t, r = function(t2) {
            n.readAsArrayBuffer(t2);
          }, (a = new XMLHttpRequest()).open("GET", o, true), a.responseType = "blob", a.onload = function() {
            200 != this.status && 0 !== this.status || r(this.response);
          }, a.send();
        } else {
          var s = new XMLHttpRequest();
          s.onreadystatechange = function() {
            4 === s.readyState && (200 === s.status || 0 === s.status ? e(s.response) : i("Warning: could not load an image to parse its orientation"), s = null);
          }, s.onprogress = function() {
            "image/jpeg" !== s.getResponseHeader("content-type") && s.abort();
          }, s.withCredentials = false, s.open("GET", t, true), s.responseType = "arraybuffer", s.send(null);
        }
      else
        i("Error: the image is empty");
    } catch (t2) {
      i(t2);
    }
    var o, r, a;
  });
}
function te(t) {
  var e = t.rotate, i = t.flip, n = t.scaleX, s = t.scaleY, o = "";
  return o += " rotate(" + e + "deg) ", o += " scaleX(" + n * (i.horizontal ? -1 : 1) + ") ", o += " scaleY(" + s * (i.vertical ? -1 : 1) + ") ";
}
function ee(t) {
  try {
    var e, i = new DataView(t), n = void 0, s = void 0, o = void 0, r = void 0;
    if (255 === i.getUint8(0) && 216 === i.getUint8(1))
      for (var a = i.byteLength, h = 2; h + 1 < a; ) {
        if (255 === i.getUint8(h) && 225 === i.getUint8(h + 1)) {
          o = h;
          break;
        }
        h++;
      }
    if (o && (n = o + 10, "Exif" === function(t2, e2, i2) {
      var n2, s2 = "";
      for (n2 = e2, i2 += e2; n2 < i2; n2++)
        s2 += String.fromCharCode(t2.getUint8(n2));
      return s2;
    }(i, o + 4, 4))) {
      var c = i.getUint16(n);
      if (((s = 18761 === c) || 19789 === c) && 42 === i.getUint16(n + 2, s)) {
        var l = i.getUint32(n + 4, s);
        l >= 8 && (r = n + l);
      }
    }
    if (r)
      for (var u = i.getUint16(r, s), d = 0; d < u; d++) {
        h = r + 12 * d + 2;
        if (274 === i.getUint16(h, s)) {
          h += 8, e = i.getUint16(h, s), i.setUint16(h, 1, s);
          break;
        }
      }
    return e;
  } catch (t2) {
    return null;
  }
}
function se(t, e) {
  var i = e.getBoundingClientRect(), n = i.left, s = i.top, o = { left: 0, top: 0 }, r = 0;
  return t.forEach(function(e2) {
    o.left += (e2.clientX - n) / t.length, o.top += (e2.clientY - s) / t.length;
  }), t.forEach(function(t2) {
    r += I({ x: o.left, y: o.top }, { x: t2.clientX - n, y: t2.clientY - s });
  }), { centerMass: o, spread: r, count: t.length };
}
var oe = { props: { touchMove: { type: Boolean, required: true }, mouseMove: { type: Boolean, required: true }, touchResize: { type: Boolean, required: true }, wheelResize: { type: [Boolean, Object], required: true }, eventsFilter: { type: Function, required: false } }, beforeMount: function() {
  window.addEventListener("mouseup", this.onMouseUp, { passive: false }), window.addEventListener("mousemove", this.onMouseMove, { passive: false }), window.addEventListener("touchmove", this.onTouchMove, { passive: false }), window.addEventListener("touchend", this.onTouchEnd, { passive: false });
}, beforeUnmount: function() {
  window.removeEventListener("mouseup", this.onMouseUp), window.removeEventListener("mousemove", this.onMouseMove), window.removeEventListener("touchmove", this.onTouchMove), window.removeEventListener("touchend", this.onTouchEnd);
}, created: function() {
  this.transforming = false, this.debouncedProcessEnd = x(this.processEnd), this.touches = [];
}, methods: { processMove: function(t, e) {
  if (this.touches.length) {
    if (1 === this.touches.length && 1 === e.length)
      this.$emit("move", new B({ left: this.touches[0].clientX - e[0].clientX, top: this.touches[0].clientY - e[0].clientY }));
    else if (this.touches.length > 1 && this.touchResize) {
      var i = se(e, this.$refs.container), n = this.oldGeometricProperties;
      n.count === i.count && n.count > 1 && this.$emit("resize", new B({ left: n.centerMass.left - i.centerMass.left, top: n.centerMass.top - i.centerMass.top }, { factor: n.spread / i.spread, center: i.centerMass })), this.oldGeometricProperties = i;
    }
    this.touches = e;
  }
}, processEnd: function() {
  this.transforming && (this.transforming = false, this.$emit("transform-end"));
}, processStart: function() {
  this.transforming = true, this.debouncedProcessEnd.clear();
}, processEvent: function(t) {
  return this.eventsFilter ? false !== this.eventsFilter(t, this.transforming) : (t.preventDefault(), t.stopPropagation(), true);
}, onTouchStart: function(t) {
  if (t.cancelable && (this.touchMove || this.touchResize && t.touches.length > 1) && this.processEvent(t)) {
    var e = this.$refs.container, i = e.getBoundingClientRect(), n = i.left, s = i.top, o = i.bottom, r = i.right;
    this.touches = b(t.touches).filter(function(t2) {
      return t2.clientX > n && t2.clientX < r && t2.clientY > s && t2.clientY < o;
    }), this.oldGeometricProperties = se(this.touches, e);
  }
}, onTouchEnd: function(t) {
  0 === t.touches.length && (this.touches = [], this.processEnd());
}, onTouchMove: function(t) {
  var e = this;
  if (this.touches.length) {
    var i = b(t.touches).filter(function(t2) {
      return !t2.identifier || e.touches.find(function(e2) {
        return e2.identifier === t2.identifier;
      });
    });
    this.processEvent(t) && (this.processMove(t, i), this.processStart());
  }
}, onMouseDown: function(t) {
  if (this.mouseMove && "buttons" in t && 1 === t.buttons && this.processEvent(t)) {
    var e = { fake: true, clientX: t.clientX, clientY: t.clientY };
    this.touches = [e], this.processStart();
  }
}, onMouseMove: function(t) {
  this.touches.length && this.processEvent(t) && this.processMove(t, [{ clientX: t.clientX, clientY: t.clientY }]);
}, onMouseUp: function() {
  this.touches = [], this.processEnd();
}, onWheel: function(t) {
  if (this.wheelResize && this.processEvent(t)) {
    var e = this.$refs.container.getBoundingClientRect(), i = e.left, n = e.top, s = 1 + this.wheelResize.ratio * (r = t.deltaY || t.detail || t.wheelDelta, 0 === (a = +r) || $(a) ? a : a > 0 ? 1 : -1), o = { left: t.clientX - i, top: t.clientY - n };
    this.$emit("resize", new B({}, { factor: s, center: o })), this.touches.length || this.debouncedProcessEnd();
  }
  var r, a;
} }, emits: ["resize", "move", "transform-end"] };
oe.render = function(n, s, o, r, a, h) {
  return openBlock(), createBlock("div", { ref: "container", onTouchstart: s[1] || (s[1] = function() {
    return h.onTouchStart && h.onTouchStart.apply(h, arguments);
  }), onMousedown: s[2] || (s[2] = function() {
    return h.onMouseDown && h.onMouseDown.apply(h, arguments);
  }), onWheel: s[3] || (s[3] = function() {
    return h.onWheel && h.onWheel.apply(h, arguments);
  }) }, [renderSlot(n.$slots, "default")], 544);
};
var re = { components: { TransformableImage: oe }, props: { touchMove: { type: Boolean, required: true }, mouseMove: { type: Boolean, required: true }, touchResize: { type: Boolean, required: true }, wheelResize: { type: [Boolean, Object], required: true } }, emits: ["resize", "move"] };
re.render = function(s, r, a, h, c, l) {
  var u = resolveComponent("transformable-image");
  return openBlock(), createBlock(u, { "touch-move": a.touchMove, "touch-resize": a.touchResize, "mouse-move": a.mouseMove, "wheel-resize": a.wheelResize, onMove: r[1] || (r[1] = function(t) {
    return s.$emit("move", t);
  }), onResize: r[2] || (r[2] = function(t) {
    return s.$emit("resize", t);
  }) }, { default: withCtx(function() {
    return [renderSlot(s.$slots, "default")];
  }), _: 3 }, 8, ["touch-move", "touch-resize", "mouse-move", "wheel-resize"]);
};
var ae = M("vue-preview"), he = { props: { coordinates: { type: Object }, transitions: { type: Object }, image: { type: Object, default: function() {
  return {};
} }, imageClass: { type: String }, width: { type: Number }, height: { type: Number }, fill: { type: Boolean } }, data: function() {
  return { calculatedImageSize: { width: 0, height: 0 }, calculatedSize: { width: 0, height: 0 } };
}, computed: { classes: function() {
  return { root: ae({ fill: this.fill }), wrapper: ae("wrapper"), imageWrapper: ae("image-wrapper"), image: A(ae("image"), this.imageClass) };
}, style: function() {
  if (this.fill)
    return {};
  var t = {};
  return this.width && (t.width = "".concat(this.size.width, "px")), this.height && (t.height = "".concat(this.size.height, "px")), this.transitions && this.transitions.enabled && (t.transition = "".concat(this.transitions.time, "ms ").concat(this.transitions.timingFunction)), t;
}, wrapperStyle: function() {
  var t = { width: "".concat(this.size.width, "px"), height: "".concat(this.size.height, "px"), left: "calc(50% - ".concat(this.size.width / 2, "px)"), top: "calc(50% - ".concat(this.size.height / 2, "px)") };
  return this.transitions && this.transitions.enabled && (t.transition = "".concat(this.transitions.time, "ms ").concat(this.transitions.timingFunction)), t;
}, imageStyle: function() {
  if (this.coordinates && this.image) {
    var t = this.coordinates.width / this.size.width, e = g(g({ rotate: 0, flip: { horizontal: false, vertical: false } }, this.image.transforms), {}, { scaleX: 1 / t, scaleY: 1 / t }), i = this.imageSize.width, n = this.imageSize.height, s = pt({ width: i, height: n }, e.rotate), o = { width: "".concat(i, "px"), height: "".concat(n, "px"), left: "0px", top: "0px" }, r = { rotate: { left: (i - s.width) * e.scaleX / 2, top: (n - s.height) * e.scaleY / 2 }, scale: { left: (1 - e.scaleX) * i / 2, top: (1 - e.scaleY) * n / 2 } };
    return o.transform = "translate(\n				".concat(-this.coordinates.left / t - r.rotate.left - r.scale.left, "px,").concat(-this.coordinates.top / t - r.rotate.top - r.scale.top, "px) ") + te(e), this.transitions && this.transitions.enabled && (o.transition = "".concat(this.transitions.time, "ms ").concat(this.transitions.timingFunction)), o;
  }
  return {};
}, size: function() {
  return { width: this.width || this.calculatedSize.width, height: this.height || this.calculatedSize.height };
}, imageSize: function() {
  return { width: this.image.width || this.calculatedImageSize.width, height: this.image.height || this.calculatedImageSize.height };
} }, watch: { image: function(t) {
  (t.width || t.height) && this.onChangeImage();
} }, mounted: function() {
  var t = this;
  this.onChangeImage(), this.$refs.image.addEventListener("load", function() {
    t.refreshImage();
  }), window.addEventListener("resize", this.refresh), window.addEventListener("orientationchange", this.refresh);
}, unmounted: function() {
  window.removeEventListener("resize", this.refresh), window.removeEventListener("orientationchange", this.refresh);
}, methods: { refreshImage: function() {
  var t = this.$refs.image;
  this.calculatedImageSize.height = t.naturalHeight, this.calculatedImageSize.width = t.naturalWidth;
}, refresh: function() {
  var t = this.$refs.root;
  this.width || (this.calculatedSize.width = t.clientWidth), this.height || (this.calculatedSize.height = t.clientHeight);
}, onChangeImage: function() {
  var t = this.$refs.image;
  t && t.complete && this.refreshImage(), this.refresh();
} } };
he.render = function(i, n, o, r, a, h) {
  return openBlock(), createBlock("div", { ref: "root", class: h.classes.root, style: h.style }, [createVNode("div", { ref: "wrapper", class: h.classes.wrapper, style: h.wrapperStyle }, [withDirectives(createVNode("img", { ref: "image", src: o.image && o.image.src, class: h.classes.image, style: h.imageStyle }, null, 14, ["src"]), [[vShow, o.image && o.image.src]])], 6)], 6);
};
var ce = { components: { Preview: he }, inheritAttrs: false };
ce.render = function(i, s, o, r, a, h) {
  var c = resolveComponent("preview");
  return openBlock(), createBlock(c, mergeProps(i.$attrs, { fill: true }), null, 16);
};
var le = M("vue-rectangle-stencil"), ue = { name: "RectangleStencil", components: { StencilPreview: ce, BoundingBox: _t, DraggableArea: Qt }, props: { image: { type: Object }, coordinates: { type: Object }, stencilCoordinates: { type: Object }, handlers: { type: Object }, handlersComponent: { type: [Object, String], default: function() {
  return kt;
} }, lines: { type: Object }, linesComponent: { type: [Object, String], default: function() {
  return Nt;
} }, aspectRatio: { type: [Number, String] }, minAspectRatio: { type: [Number, String] }, maxAspectRatio: { type: [Number, String] }, movable: { type: Boolean, default: true }, resizable: { type: Boolean, default: true }, transitions: { type: Object }, movingClass: { type: String }, resizingClass: { type: String }, previewClass: { type: String }, boundingBoxClass: { type: String }, linesClasses: { type: Object, default: function() {
  return {};
} }, linesWrappersClasses: { type: Object, default: function() {
  return {};
} }, handlersClasses: { type: Object, default: function() {
  return {};
} }, handlersWrappersClasses: { type: Object, default: function() {
  return {};
} } }, data: function() {
  return { moving: false, resizing: false };
}, computed: { classes: function() {
  return { stencil: A(le({ movable: this.movable, moving: this.moving, resizing: this.resizing }), this.moving && this.movingClass, this.resizing && this.resizingClass), preview: A(le("preview"), this.previewClass), boundingBox: A(le("bounding-box"), this.boundingBoxClass) };
}, style: function() {
  var t = this.stencilCoordinates, e = t.height, i = t.width, n = t.left, s = t.top, o = { width: "".concat(i, "px"), height: "".concat(e, "px"), transform: "translate(".concat(n, "px, ").concat(s, "px)") };
  return this.transitions && this.transitions.enabled && (o.transition = "".concat(this.transitions.time, "ms ").concat(this.transitions.timingFunction)), o;
} }, methods: { onMove: function(t) {
  this.$emit("move", t), this.moving = true;
}, onMoveEnd: function() {
  this.$emit("move-end"), this.moving = false;
}, onResize: function(t) {
  this.$emit("resize", t), this.resizing = true;
}, onResizeEnd: function() {
  this.$emit("resize-end"), this.resizing = false;
}, aspectRatios: function() {
  return { minimum: this.aspectRatio || this.minAspectRatio, maximum: this.aspectRatio || this.maxAspectRatio };
} }, emits: ["resize", "resize-end", "move", "move-end"] };
ue.render = function(i, r, a, h, c, l) {
  var u = resolveComponent("stencil-preview"), d = resolveComponent("draggable-area"), m = resolveComponent("bounding-box");
  return openBlock(), createBlock("div", { class: l.classes.stencil, style: l.style }, [createVNode(m, { width: a.stencilCoordinates.width, height: a.stencilCoordinates.height, transitions: a.transitions, class: l.classes.boundingBox, handlers: a.handlers, "handlers-component": a.handlersComponent, "handlers-classes": a.handlersClasses, "handlers-wrappers-classes": a.handlersWrappersClasses, lines: a.lines, "lines-component": a.linesComponent, "lines-classes": a.linesClasses, "lines-wrappers-classes": a.linesWrappersClasses, resizable: a.resizable, onResize: l.onResize, onResizeEnd: l.onResizeEnd }, { default: withCtx(function() {
    return [createVNode(d, { movable: a.movable, onMove: l.onMove, onMoveEnd: l.onMoveEnd }, { default: withCtx(function() {
      return [createVNode(u, { image: a.image, coordinates: a.coordinates, width: a.stencilCoordinates.width, height: a.stencilCoordinates.height, class: l.classes.preview, transitions: a.transitions }, null, 8, ["image", "coordinates", "width", "height", "class", "transitions"])];
    }), _: 1 }, 8, ["movable", "onMove", "onMoveEnd"])];
  }), _: 1 }, 8, ["width", "height", "transitions", "class", "handlers", "handlers-component", "handlers-classes", "handlers-wrappers-classes", "lines", "lines-component", "lines-classes", "lines-wrappers-classes", "resizable", "onResize", "onResizeEnd"])], 6);
};
var pe = ["transitions"], ge = M("vue-advanced-cropper"), fe = { name: "Cropper", components: { BackgroundWrapper: re }, props: { src: { type: String, default: null }, stencilComponent: { type: [Object, String], default: function() {
  return ue;
} }, backgroundWrapperComponent: { type: [Object, String], default: function() {
  return re;
} }, stencilProps: { type: Object, default: function() {
  return {};
} }, autoZoom: { type: Boolean, default: false }, imageClass: { type: String }, boundariesClass: { type: String }, backgroundClass: { type: String }, foregroundClass: { type: String }, minWidth: { type: [Number, String] }, minHeight: { type: [Number, String] }, maxWidth: { type: [Number, String] }, maxHeight: { type: [Number, String] }, debounce: { type: [Boolean, Number], default: 500 }, transitions: { type: Boolean, default: true }, checkOrientation: { type: Boolean, default: true }, canvas: { type: [Object, Boolean], default: true }, crossOrigin: { type: [Boolean, String], default: void 0 }, transitionTime: { type: Number, default: 300 }, imageRestriction: { type: String, default: "fit-area", validator: function(t) {
  return -1 !== K.indexOf(t);
} }, roundResult: { type: Boolean, default: true }, defaultSize: { type: [Function, Object] }, defaultPosition: { type: [Function, Object] }, defaultVisibleArea: { type: [Function, Object] }, defaultTransforms: { type: [Function, Object] }, defaultBoundaries: { type: [Function, String], validator: function(t) {
  return !("string" == typeof t && "fill" !== t && "fit" !== t);
} }, priority: { type: String, default: "coordinates" }, stencilSize: { type: [Object, Function] }, resizeImage: { type: [Boolean, Object], default: true }, moveImage: { type: [Boolean, Object], default: true }, autoZoomAlgorithm: { type: Function }, resizeAlgorithm: { type: Function, default: function(t) {
  var e = t.event, i = t.coordinates, n = t.aspectRatio, s = t.positionRestrictions, o = t.sizeRestrictions, r = C(C({}, i), { right: i.left + i.width, bottom: i.top + i.height }), a = e.params || {}, h = C({}, e.directions), c = a.allowedDirections || { left: true, right: true, bottom: true, top: true };
  o.widthFrozen && (h.left = 0, h.right = 0), o.heightFrozen && (h.top = 0, h.bottom = 0), V.forEach(function(t2) {
    c[t2] || (h[t2] = 0);
  });
  var l = ot(r, h = It({ coordinates: r, directions: h, sizeRestrictions: o, positionRestrictions: s })).width, u = ot(r, h).height, d = a.preserveRatio ? ct(r) : dt(l / u, n);
  if (d) {
    var m = a.respectDirection;
    if (m || (m = r.width >= r.height || 1 === d ? "width" : "height"), "width" === m) {
      var p2 = l / d - r.height;
      if (c.top && c.bottom) {
        var g2 = h.top, f2 = h.bottom;
        h.bottom = Bt(p2, f2, g2), h.top = Bt(p2, g2, f2);
      } else
        c.bottom ? h.bottom = p2 : c.top ? h.top = p2 : c.right ? h.right = 0 : c.left && (h.left = 0);
    } else if ("height" === m) {
      var v2 = r.width - u * d;
      if (c.left && c.right) {
        var b2 = h.left, w2 = h.right;
        h.left = -Bt(v2, b2, w2), h.right = -Bt(v2, w2, b2);
      } else
        c.left ? h.left = -v2 : c.right ? h.right = -v2 : c.top ? h.top = 0 : c.bottom && (h.bottom = 0);
    }
    h = It({ directions: h, coordinates: r, sizeRestrictions: o, positionRestrictions: s, preserveRatio: true, compensate: a.compensate });
  }
  return l = ot(r, h).width, u = ot(r, h).height, (d = a.preserveRatio ? ct(r) : dt(l / u, n)) && Math.abs(d - l / u) > 1e-3 && V.forEach(function(t2) {
    c[t2] || (h[t2] = 0);
  }), St({ event: new Y({ left: -h.left, top: -h.top }), coordinates: { width: i.width + h.right + h.left, height: i.height + h.top + h.bottom, left: i.left, top: i.top }, positionRestrictions: s });
} }, moveAlgorithm: { type: Function, default: St }, initStretcher: { type: Function, default: function(t) {
  var e = t.stretcher, i = t.imageSize, n = ct(i);
  e.style.width = i.width + "px", e.style.height = e.clientWidth / n + "px", e.style.width = e.clientWidth + "px";
} }, fitCoordinates: { type: Function, default: function(t) {
  var e = t.visibleArea, i = t.coordinates, n = t.aspectRatio, s = t.sizeRestrictions, o = t.positionRestrictions, r = C(C({}, i), Mt({ width: i.width, height: i.height, aspectRatio: n, sizeRestrictions: { maxWidth: e.width, maxHeight: e.height, minHeight: Math.min(e.height, s.minHeight), minWidth: Math.min(e.width, s.minWidth) } }));
  return r = vt(r = at(r, it(nt(i), nt(r))), zt(et(e), o));
} }, fitVisibleArea: { type: Function, default: function(t) {
  var e = t.visibleArea, i = t.boundaries, n = t.getAreaRestrictions, s = t.coordinates, o = C({}, e);
  o.height = o.width / ct(i), o.top += (e.height - o.height) / 2, (s.height - o.height > 0 || s.width - o.width > 0) && (o = ht(o, Math.max(s.height / o.height, s.width / o.width)));
  var r = rt(ut(s, et(o = ht(o, ft(o, n({ visibleArea: o, type: "resize" }))))));
  return o.width < s.width && (r.left = 0), o.height < s.height && (r.top = 0), o = vt(o = at(o, r), n({ visibleArea: o, type: "move" }));
} }, areaRestrictionsAlgorithm: { type: Function, default: function(t) {
  var e = t.visibleArea, i = t.boundaries, n = t.imageSize, s = t.imageRestriction, o = t.type, r = {};
  return "fill-area" === s ? r = { left: 0, top: 0, right: n.width, bottom: n.height } : "fit-area" === s && (ct(i) > ct(n) ? (r = { top: 0, bottom: n.height }, e && "move" === o && (e.width > n.width ? (r.left = -(e.width - n.width) / 2, r.right = n.width - r.left) : (r.left = 0, r.right = n.width))) : (r = { left: 0, right: n.width }, e && "move" === o && (e.height > n.height ? (r.top = -(e.height - n.height) / 2, r.bottom = n.height - r.top) : (r.top = 0, r.bottom = n.height)))), r;
} }, sizeRestrictionsAlgorithm: { type: Function, default: function(t) {
  return { minWidth: t.minWidth, minHeight: t.minHeight, maxWidth: t.maxWidth, maxHeight: t.maxHeight };
} }, positionRestrictionsAlgorithm: { type: Function, default: function(t) {
  var e = t.imageSize, i = {};
  return "none" !== t.imageRestriction && (i = { left: 0, top: 0, right: e.width, bottom: e.height }), i;
} } }, data: function() {
  return { transitionsActive: false, imageLoaded: false, imageAttributes: { width: null, height: null, crossOrigin: null, src: null }, defaultImageTransforms: { rotate: 0, flip: { horizontal: false, vertical: false } }, appliedImageTransforms: { rotate: 0, flip: { horizontal: false, vertical: false } }, boundaries: { width: 0, height: 0 }, visibleArea: null, coordinates: g({}, J) };
}, computed: { image: function() {
  return { src: this.imageAttributes.src, width: this.imageAttributes.width, height: this.imageAttributes.height, transforms: this.imageTransforms };
}, imageTransforms: function() {
  return { rotate: this.appliedImageTransforms.rotate, flip: { horizontal: this.appliedImageTransforms.flip.horizontal, vertical: this.appliedImageTransforms.flip.vertical }, translateX: this.visibleArea ? this.visibleArea.left / this.coefficient : 0, translateY: this.visibleArea ? this.visibleArea.top / this.coefficient : 0, scaleX: 1 / this.coefficient, scaleY: 1 / this.coefficient };
}, imageSize: function() {
  var t = function(t2) {
    return t2 * Math.PI / 180;
  }(this.imageTransforms.rotate);
  return { width: Math.abs(this.imageAttributes.width * Math.cos(t)) + Math.abs(this.imageAttributes.height * Math.sin(t)), height: Math.abs(this.imageAttributes.width * Math.sin(t)) + Math.abs(this.imageAttributes.height * Math.cos(t)) };
}, initialized: function() {
  return Boolean(this.visibleArea && this.imageLoaded);
}, settings: function() {
  var t = j(this.resizeImage, { touch: true, wheel: { ratio: 0.1 }, adjustStencil: true }, { touch: false, wheel: false, adjustStencil: false });
  return { moveImage: j(this.moveImage, { touch: true, mouse: true }, { touch: false, mouse: false }), resizeImage: t };
}, coefficient: function() {
  return this.visibleArea ? this.visibleArea.width / this.boundaries.width : 0;
}, areaRestrictions: function() {
  return this.imageLoaded ? this.areaRestrictionsAlgorithm({ imageSize: this.imageSize, imageRestriction: this.imageRestriction, boundaries: this.boundaries }) : {};
}, transitionsOptions: function() {
  return { enabled: this.transitionsActive, timingFunction: "ease-in-out", time: 350 };
}, sizeRestrictions: function() {
  if (this.boundaries.width && this.boundaries.height && this.imageSize.width && this.imageSize.height) {
    var t = this.sizeRestrictionsAlgorithm({ imageSize: this.imageSize, minWidth: D(this.minWidth) ? 0 : L(this.minWidth), minHeight: D(this.minHeight) ? 0 : L(this.minHeight), maxWidth: D(this.maxWidth) ? 1 / 0 : L(this.maxWidth), maxHeight: D(this.maxHeight) ? 1 / 0 : L(this.maxHeight) });
    if (t = function(t2) {
      var e2 = t2.areaRestrictions, i2 = t2.sizeRestrictions;
      t2.imageSize;
      var n = t2.boundaries, s = t2.positionRestrictions;
      t2.imageRestriction;
      var o = C(C({}, i2), { minWidth: void 0 !== i2.minWidth ? i2.minWidth : 0, minHeight: void 0 !== i2.minHeight ? i2.minHeight : 0, maxWidth: void 0 !== i2.maxWidth ? i2.maxWidth : 1 / 0, maxHeight: void 0 !== i2.maxHeight ? i2.maxHeight : 1 / 0 });
      void 0 !== s.left && void 0 !== s.right && (o.maxWidth = Math.min(o.maxWidth, s.right - s.left)), void 0 !== s.bottom && void 0 !== s.top && (o.maxHeight = Math.min(o.maxHeight, s.bottom - s.top));
      var r = bt(e2), a = mt(n, r);
      return r.width < 1 / 0 && (!o.maxWidth || o.maxWidth > a.width) && (o.maxWidth = Math.min(o.maxWidth, a.width)), r.height < 1 / 0 && (!o.maxHeight || o.maxHeight > a.height) && (o.maxHeight = Math.min(o.maxHeight, a.height)), o.minWidth > o.maxWidth && (o.minWidth = o.maxWidth, o.widthFrozen = true), o.minHeight > o.maxHeight && (o.minHeight = o.maxHeight, o.heightFrozen = true), o;
    }({ sizeRestrictions: t, areaRestrictions: this.getAreaRestrictions({ visibleArea: this.visibleArea, type: "resize" }), imageSize: this.imageSize, boundaries: this.boundaries, positionRestrictions: this.positionRestrictions, imageRestriction: this.imageRestriction, visibleArea: this.visibleArea, stencilSize: this.getStencilSize() }), this.visibleArea && this.stencilSize) {
      var e = this.getStencilSize(), i = bt(this.getAreaRestrictions({ visibleArea: this.visibleArea, type: "resize" }));
      t.maxWidth = Math.min(t.maxWidth, i.width * e.width / this.boundaries.width), t.maxHeight = Math.min(t.maxHeight, i.height * e.height / this.boundaries.height), t.maxWidth < t.minWidth && (t.minWidth = t.maxWidth), t.maxHeight < t.minHeight && (t.minHeight = t.maxHeight);
    }
    return t;
  }
  return { minWidth: 0, minHeight: 0, maxWidth: 0, maxHeight: 0 };
}, positionRestrictions: function() {
  return this.positionRestrictionsAlgorithm({ imageSize: this.imageSize, imageRestriction: this.imageRestriction });
}, classes: function() {
  return { cropper: ge(), image: A(ge("image"), this.imageClass), stencil: ge("stencil"), boundaries: A(ge("boundaries"), this.boundariesClass), stretcher: A(ge("stretcher")), background: A(ge("background"), this.backgroundClass), foreground: A(ge("foreground"), this.foregroundClass), imageWrapper: A(ge("image-wrapper")), cropperWrapper: A(ge("cropper-wrapper")) };
}, stencilCoordinates: function() {
  if (this.initialized) {
    var t = this.coordinates, e = t.width, i = t.height, n = t.left, s = t.top;
    return { width: e / this.coefficient, height: i / this.coefficient, left: (n - this.visibleArea.left) / this.coefficient, top: (s - this.visibleArea.top) / this.coefficient };
  }
  return this.defaultCoordinates();
}, boundariesStyle: function() {
  var t = { width: this.boundaries.width ? "".concat(Math.round(this.boundaries.width), "px") : "auto", height: this.boundaries.height ? "".concat(Math.round(this.boundaries.height), "px") : "auto", transition: "opacity ".concat(this.transitionTime, "ms"), pointerEvents: this.imageLoaded ? "all" : "none" };
  return this.imageLoaded || (t.opacity = "0"), t;
}, imageStyle: function() {
  var t = this.imageAttributes.width > this.imageAttributes.height ? { width: Math.min(1024, this.imageAttributes.width), height: Math.min(1024, this.imageAttributes.width) / (this.imageAttributes.width / this.imageAttributes.height) } : { height: Math.min(1024, this.imageAttributes.height), width: Math.min(1024, this.imageAttributes.height) * (this.imageAttributes.width / this.imageAttributes.height) }, e = { left: (t.width - this.imageSize.width) / (2 * this.coefficient), top: (t.height - this.imageSize.height) / (2 * this.coefficient) }, i = { left: (1 - 1 / this.coefficient) * t.width / 2, top: (1 - 1 / this.coefficient) * t.height / 2 }, n = g(g({}, this.imageTransforms), {}, { scaleX: this.imageTransforms.scaleX * (this.imageAttributes.width / t.width), scaleY: this.imageTransforms.scaleY * (this.imageAttributes.height / t.height) }), s = { width: "".concat(t.width, "px"), height: "".concat(t.height, "px"), left: "0px", top: "0px", transform: "translate(".concat(-e.left - i.left - this.imageTransforms.translateX, "px, ").concat(-e.top - i.top - this.imageTransforms.translateY, "px)") + te(n) };
  return this.transitionsOptions.enabled && (s.transition = "".concat(this.transitionsOptions.time, "ms ").concat(this.transitionsOptions.timingFunction)), s;
} }, watch: { src: function() {
  this.onChangeImage();
}, stencilComponent: function() {
  var t = this;
  this.$nextTick(function() {
    t.resetCoordinates(), t.runAutoZoom("setCoordinates"), t.onChange();
  });
}, minWidth: function() {
  this.onPropsChange();
}, maxWidth: function() {
  this.onPropsChange();
}, minHeight: function() {
  this.onPropsChange();
}, maxHeight: function() {
  this.onPropsChange();
}, imageRestriction: function() {
  this.reset();
}, stencilProps: function(t, e) {
  ["aspectRatio", "minAspectRatio", "maxAspectRatio"].find(function(i) {
    return t[i] !== e[i];
  }) && this.$nextTick(this.onPropsChange);
} }, created: function() {
  this.debouncedUpdate = x(this.update, this.debounce), this.debouncedDisableTransitions = x(this.disableTransitions, this.transitionsOptions.time), this.awaiting = false;
}, mounted: function() {
  this.$refs.image.addEventListener("load", this.onSuccessLoadImage), this.$refs.image.addEventListener("error", this.onFailLoadImage), this.onChangeImage(), window.addEventListener("resize", this.refresh), window.addEventListener("orientationchange", this.refresh);
}, unmounted: function() {
  window.removeEventListener("resize", this.refresh), window.removeEventListener("orientationchange", this.refresh), this.imageAttributes.revoke && this.imageAttributes.src && URL.revokeObjectURL(this.imageAttributes.src), this.debouncedUpdate.clear(), this.debouncedDisableTransitions.clear();
}, methods: { getResult: function() {
  var t = this.initialized ? this.prepareResult(g({}, this.coordinates)) : this.defaultCoordinates(), e = { rotate: this.imageTransforms.rotate % 360, flip: g({}, this.imageTransforms.flip) };
  if (this.src && this.imageLoaded) {
    var i = this;
    return { image: this.image, coordinates: t, visibleArea: this.visibleArea ? g({}, this.visibleArea) : null, imageTransforms: e, get canvas() {
      return i.canvas ? i.getCanvas() : void 0;
    } };
  }
  return { image: this.image, coordinates: t, visibleArea: this.visibleArea ? g({}, this.visibleArea) : null, canvas: void 0, imageTransforms: e };
}, zoom: function(t, e) {
  var i = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : {}, n = i.transitions, s = void 0 === n || n;
  this.onManipulateImage(new B({}, { factor: 1 / t, center: e }), { normalize: false, transitions: s });
}, move: function(t, e) {
  var i = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : {}, n = i.transitions, s = void 0 === n || n;
  this.onManipulateImage(new B({ left: t || 0, top: e || 0 }), { normalize: false, transitions: s });
}, setCoordinates: function(t) {
  var e = this, i = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {}, n = i.autoZoom, s = void 0 === n || n, o = i.transitions, r = void 0 === o || o;
  this.$nextTick(function() {
    e.imageLoaded ? (e.transitionsActive || (r && e.enableTransitions(), e.coordinates = e.applyTransform(t), s && e.runAutoZoom("setCoordinates"), r && e.debouncedDisableTransitions()), e.onChange()) : e.delayedTransforms = t;
  });
}, refresh: function() {
  var t = this, e = this.$refs.image;
  if (this.src && e)
    return this.initialized ? this.updateVisibleArea().then(function() {
      t.onChange();
    }) : this.resetVisibleArea().then(function() {
      t.onChange();
    });
}, reset: function() {
  var t = this;
  return this.resetVisibleArea().then(function() {
    t.onChange(false);
  });
}, awaitRender: function(t) {
  var e = this;
  this.awaiting || (this.awaiting = true, this.$nextTick(function() {
    t(), e.awaiting = false;
  }));
}, prepareResult: function(t) {
  return this.roundResult ? function(t2) {
    var e = t2.coordinates, i = t2.sizeRestrictions, n = t2.positionRestrictions, s = { width: Math.round(e.width), height: Math.round(e.height), left: Math.round(e.left), top: Math.round(e.top) };
    return s.width > i.maxWidth ? s.width = Math.floor(e.width) : s.width < i.minWidth && (s.width = Math.ceil(e.width)), s.height > i.maxHeight ? s.height = Math.floor(e.height) : s.height < i.minHeight && (s.height = Math.ceil(e.height)), vt(s, n);
  }(g(g({}, this.getPublicProperties()), {}, { positionRestrictions: jt(this.positionRestrictions, this.visibleArea), coordinates: t })) : t;
}, processAutoZoom: function(t, e, i, n) {
  var s = this.autoZoomAlgorithm;
  s || (s = this.stencilSize ? Ct : this.autoZoom ? Et : Wt);
  var o = s({ event: { type: t, params: n }, visibleArea: e, coordinates: i, boundaries: this.boundaries, aspectRatio: this.getAspectRatio(), positionRestrictions: this.positionRestrictions, getAreaRestrictions: this.getAreaRestrictions, sizeRestrictions: this.sizeRestrictions, stencilSize: this.getStencilSize() });
  return g(g({}, o), {}, { changed: !tt(o.visibleArea, e) || !tt(o.coordinates, i) });
}, runAutoZoom: function(t) {
  var e = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {}, i = e.transitions, n = void 0 !== i && i, s = v(e, pe), o = this.processAutoZoom(t, this.visibleArea, this.coordinates, s), r = o.visibleArea, a = o.coordinates, h = o.changed;
  n && h && this.enableTransitions(), this.visibleArea = r, this.coordinates = a, n && h && this.debouncedDisableTransitions();
}, normalizeEvent: function(t) {
  return function(t2) {
    var e = t2.event, i = t2.visibleArea, n = t2.coefficient;
    if ("manipulateImage" === e.type)
      return C(C({}, e), { move: { left: e.move && e.move.left ? n * e.move.left : 0, top: e.move && e.move.top ? n * e.move.top : 0 }, scale: { factor: e.scale && e.scale.factor ? e.scale.factor : 1, center: e.scale && e.scale.center ? { left: e.scale.center.left * n + i.left, top: e.scale.center.top * n + i.top } : null } });
    if ("resize" === e.type) {
      var s = C(C({}, e), { directions: C({}, e.directions) });
      return V.forEach(function(t3) {
        s.directions[t3] *= n;
      }), s;
    }
    if ("move" === e.type) {
      var o = C(C({}, e), { directions: C({}, e.directions) });
      return Q.forEach(function(t3) {
        o.directions[t3] *= n;
      }), o;
    }
    return e;
  }(g(g({}, this.getPublicProperties()), {}, { event: t }));
}, getCanvas: function() {
  if (this.$refs.canvas) {
    var t = this.$refs.canvas, e = this.$refs.image, i = 0 !== this.imageTransforms.rotate || this.imageTransforms.flip.horizontal || this.imageTransforms.flip.vertical ? function(t2, e2, i2) {
      var n2 = i2.rotate, s2 = i2.flip, o2 = { width: e2.naturalWidth, height: e2.naturalHeight }, r2 = pt(o2, n2), a = t2.getContext("2d");
      t2.height = r2.height, t2.width = r2.width, a.save();
      var h = gt(nt(C({ left: 0, top: 0 }, o2)), n2);
      return a.translate(-(h.left - r2.width / 2), -(h.top - r2.height / 2)), a.rotate(n2 * Math.PI / 180), a.translate(s2.horizontal ? o2.width : 0, s2.vertical ? o2.height : 0), a.scale(s2.horizontal ? -1 : 1, s2.vertical ? -1 : 1), a.drawImage(e2, 0, 0, o2.width, o2.height), a.restore(), t2;
    }(this.$refs.sourceCanvas, e, this.imageTransforms) : e, n = g({ minWidth: 0, minHeight: 0, maxWidth: 1 / 0, maxHeight: 1 / 0, maxArea: this.maxCanvasSize, imageSmoothingEnabled: true, imageSmoothingQuality: "high", fillColor: "transparent" }, this.canvas), s = function(t2) {
      return t2.find(function(t3) {
        return e2 = t3, !Number.isNaN(parseFloat(e2)) && isFinite(e2);
        var e2;
      });
    }, o = Mt({ sizeRestrictions: { minWidth: s([n.width, n.minWidth]) || 0, minHeight: s([n.height, n.minHeight]) || 0, maxWidth: s([n.width, n.maxWidth]) || 1 / 0, maxHeight: s([n.height, n.maxHeight]) || 1 / 0 }, width: this.coordinates.width, height: this.coordinates.height, aspectRatio: { minimum: this.coordinates.width / this.coordinates.height, maximum: this.coordinates.width / this.coordinates.height } });
    if (n.maxArea && o.width * o.height > n.maxArea) {
      var r = Math.sqrt(n.maxArea / (o.width * o.height));
      o = { width: Math.round(r * o.width), height: Math.round(r * o.height) };
    }
    return function(t2, e2, i2, n2, s2) {
      t2.width = n2 ? n2.width : i2.width, t2.height = n2 ? n2.height : i2.height;
      var o2 = t2.getContext("2d");
      o2.clearRect(0, 0, t2.width, t2.height), s2 && (s2.imageSmoothingEnabled && (o2.imageSmoothingEnabled = s2.imageSmoothingEnabled), s2.imageSmoothingQuality && (o2.imageSmoothingQuality = s2.imageSmoothingQuality), s2.fillColor && (o2.fillStyle = s2.fillColor, o2.fillRect(0, 0, t2.width, t2.height), o2.save()));
      var r2 = i2.left < 0 ? -i2.left : 0, a = i2.top < 0 ? -i2.top : 0;
      o2.drawImage(e2, i2.left + r2, i2.top + a, i2.width, i2.height, r2, a, t2.width, t2.height);
    }(t, i, this.coordinates, o, n), t;
  }
}, update: function() {
  this.$emit("change", this.getResult());
}, applyTransform: function(t) {
  var e = arguments.length > 1 && void 0 !== arguments[1] && arguments[1], i = this.visibleArea && e ? wt(this.sizeRestrictions, this.visibleArea) : this.sizeRestrictions, n = this.visibleArea && e ? jt(this.positionRestrictions, this.visibleArea) : this.positionRestrictions;
  return xt({ transform: t, coordinates: this.coordinates, imageSize: this.imageSize, sizeRestrictions: i, positionRestrictions: n, aspectRatio: this.getAspectRatio(), visibleArea: this.visibleArea });
}, resetCoordinates: function() {
  var t = this;
  if (this.$refs.image) {
    this.$refs.cropper, this.$refs.image;
    var e = this.defaultSize;
    e || (e = this.stencilSize ? Dt : Ot);
    var i = this.sizeRestrictions;
    i.minWidth, i.minHeight, i.maxWidth, i.maxHeight;
    var n = O(e) ? e({ boundaries: this.boundaries, imageSize: this.imageSize, aspectRatio: this.getAspectRatio(), sizeRestrictions: this.sizeRestrictions, stencilSize: this.getStencilSize(), visibleArea: this.visibleArea }) : e, s = this.defaultPosition || Tt, o = [n, function(e2) {
      var i2 = e2.coordinates;
      return g({}, O(s) ? s({ coordinates: i2, imageSize: t.imageSize, visibleArea: t.visibleArea }) : t.defaultPosition);
    }];
    this.delayedTransforms && o.push.apply(o, b(Array.isArray(this.delayedTransforms) ? this.delayedTransforms : [this.delayedTransforms])), this.coordinates = this.applyTransform(o, true), this.delayedTransforms = null;
  }
}, clearImage: function() {
  var t = this;
  this.imageLoaded = false, setTimeout(function() {
    var e = t.$refs.stretcher;
    e && (e.style.height = "auto", e.style.width = "auto"), t.coordinates = t.defaultCoordinates(), t.boundaries = { width: 0, height: 0 };
  }, this.transitionTime);
}, enableTransitions: function() {
  this.transitions && (this.transitionsActive = true);
}, disableTransitions: function() {
  this.transitionsActive = false;
}, updateBoundaries: function() {
  var t = this, e = this.$refs.stretcher, i = this.$refs.cropper;
  return this.initStretcher({ cropper: i, stretcher: e, imageSize: this.imageSize }), this.$nextTick().then(function() {
    var e2 = { cropper: i, imageSize: t.imageSize };
    if (O(t.defaultBoundaries) ? t.boundaries = t.defaultBoundaries(e2) : "fit" === t.defaultBoundaries ? t.boundaries = function(t2) {
      var e3 = t2.cropper, i2 = t2.imageSize, n = e3.clientHeight, s = e3.clientWidth, o = n, r = i2.width * n / i2.height;
      return r > s && (r = s, o = i2.height * s / i2.width), { width: r, height: o };
    }(e2) : t.boundaries = function(t2) {
      var e3 = t2.cropper;
      return { width: e3.clientWidth, height: e3.clientHeight };
    }(e2), !t.boundaries.width || !t.boundaries.height)
      throw new Error("It's impossible to fit the cropper in the current container");
  });
}, resetVisibleArea: function() {
  var t = this;
  return this.appliedImageTransforms = g(g({}, this.defaultImageTransforms), {}, { flip: g({}, this.defaultImageTransforms.flip) }), this.updateBoundaries().then(function() {
    "visible-area" !== t.priority && (t.visibleArea = null, t.resetCoordinates());
    var e, i, n, s, o, r, a = t.defaultVisibleArea || Ht;
    t.visibleArea = O(a) ? a({ imageSize: t.imageSize, boundaries: t.boundaries, coordinates: "visible-area" !== t.priority ? t.coordinates : null, getAreaRestrictions: t.getAreaRestrictions, stencilSize: t.getStencilSize() }) : t.defaultVisibleArea, t.visibleArea = (e = { visibleArea: t.visibleArea, boundaries: t.boundaries, getAreaRestrictions: t.getAreaRestrictions }, i = e.visibleArea, n = e.boundaries, s = e.getAreaRestrictions, o = C({}, i), r = ct(n), o.width / o.height !== r && (o.height = o.width / r), vt(o, s({ visibleArea: o, type: "move" }))), "visible-area" === t.priority ? t.resetCoordinates() : t.coordinates = t.fitCoordinates({ visibleArea: t.visibleArea, coordinates: t.coordinates, aspectRatio: t.getAspectRatio(), positionRestrictions: t.positionRestrictions, sizeRestrictions: t.sizeRestrictions }), t.runAutoZoom("resetVisibleArea");
  }).catch(function() {
    t.visibleArea = null;
  });
}, updateVisibleArea: function() {
  var t = this;
  return this.updateBoundaries().then(function() {
    t.visibleArea = t.fitVisibleArea({ imageSize: t.imageSize, boundaries: t.boundaries, visibleArea: t.visibleArea, coordinates: t.coordinates, getAreaRestrictions: t.getAreaRestrictions }), t.coordinates = t.fitCoordinates({ visibleArea: t.visibleArea, coordinates: t.coordinates, aspectRatio: t.getAspectRatio(), positionRestrictions: t.positionRestrictions, sizeRestrictions: t.sizeRestrictions }), t.runAutoZoom("updateVisibleArea");
  }).catch(function() {
    t.visibleArea = null;
  });
}, onChange: function() {
  var t = !(arguments.length > 0 && void 0 !== arguments[0]) || arguments[0];
  t && this.debounce ? this.debouncedUpdate() : this.update();
}, onChangeImage: function() {
  var t, e = this;
  if (this.imageLoaded = false, this.delayedTransforms = null, this.src) {
    if (function(t2) {
      if (T(t2))
        return false;
      var e2 = window.location, i2 = /(\w+:)?(?:\/\/)([\w.-]+)?(?::(\d+))?\/?/.exec(t2) || [], n2 = { protocol: i2[1] || "", host: i2[2] || "", port: i2[3] || "" }, s = function(t3) {
        return t3.port || ("http" === (t3.protocol || e2.protocol) ? 80 : 433);
      };
      return !(!n2.protocol && !n2.host && !n2.port || Boolean(n2.protocol && n2.protocol == e2.protocol && n2.host && n2.host == e2.host && n2.host && s(n2) == s(e2)));
    }(this.src)) {
      var i = D(this.crossOrigin) ? this.canvas : this.crossOrigin;
      true === i && (i = "anonymous"), this.imageAttributes.crossOrigin = i || null;
    }
    if (this.checkOrientation) {
      var n = (t = this.src, new Promise(function(e2) {
        Jt(t).then(function(i2) {
          var n2 = ee(i2);
          e2(i2 ? { source: t, arrayBuffer: i2, orientation: n2 } : { source: t, arrayBuffer: null, orientation: null });
        }).catch(function(i2) {
          console.warn(i2), e2({ source: t, arrayBuffer: null, orientation: null });
        });
      }));
      setTimeout(function() {
        n.then(e.onParseImage);
      }, this.transitionTime);
    } else
      setTimeout(function() {
        e.onParseImage({ source: e.src });
      }, this.transitionTime);
  } else
    this.clearImage();
}, onFailLoadImage: function() {
  this.imageAttributes.src && (this.clearImage(), this.$emit("error"));
}, onSuccessLoadImage: function() {
  var t = this, e = this.$refs.image;
  e && !this.imageLoaded && (this.imageAttributes.height = e.naturalHeight, this.imageAttributes.width = e.naturalWidth, this.imageLoaded = true, this.resetVisibleArea().then(function() {
    t.$emit("ready"), t.onChange(false);
  }));
}, onParseImage: function(t) {
  var e = this, i = t.source, n = t.arrayBuffer, s = t.orientation;
  this.imageAttributes.revoke && this.imageAttributes.src && URL.revokeObjectURL(this.imageAttributes.src), this.imageAttributes.revoke = false, n && s && s > 1 ? W(i) || !T(i) ? (this.imageAttributes.src = URL.createObjectURL(new Blob([n])), this.imageAttributes.revoke = true) : this.imageAttributes.src = function(t2) {
    for (var e2 = [], i2 = new Uint8Array(t2); i2.length > 0; ) {
      var n2 = i2.subarray(0, 8192);
      e2.push(String.fromCharCode.apply(null, Array.from ? Array.from(n2) : n2.slice())), i2 = i2.subarray(8192);
    }
    return "data:image/jpeg;base64," + btoa(e2.join(""));
  }(n) : this.imageAttributes.src = i, O(this.defaultTransforms) ? this.appliedImageTransforms = Kt(this.defaultTransforms()) : H(this.defaultTransforms) ? this.appliedImageTransforms = Kt(this.defaultTransforms) : this.appliedImageTransforms = function(t2) {
    var e2 = Kt({});
    if (t2)
      switch (t2) {
        case 2:
          e2.flip.horizontal = true;
          break;
        case 3:
          e2.rotate = -180;
          break;
        case 4:
          e2.flip.vertical = true;
          break;
        case 5:
          e2.rotate = 90, e2.flip.vertical = true;
          break;
        case 6:
          e2.rotate = 90;
          break;
        case 7:
          e2.rotate = 90, e2.flip.horizontal = true;
          break;
        case 8:
          e2.rotate = -90;
      }
    return e2;
  }(s), this.defaultImageTransforms = g(g({}, this.appliedImageTransforms), {}, { flip: g({}, this.appliedImageTransforms.flip) }), this.$nextTick(function() {
    var t2 = e.$refs.image;
    t2 && t2.complete && (!function(t3) {
      return Boolean(t3.naturalWidth);
    }(t2) ? e.onFailLoadImage() : e.onSuccessLoadImage());
  });
}, onResizeEnd: function() {
  this.runAutoZoom("resize", { transitions: true });
}, onMoveEnd: function() {
  this.runAutoZoom("move", { transitions: true });
}, onMove: function(t) {
  var e = this;
  this.transitionsOptions.enabled || this.awaitRender(function() {
    e.coordinates = e.moveAlgorithm(g(g({}, e.getPublicProperties()), {}, { positionRestrictions: jt(e.positionRestrictions, e.visibleArea), coordinates: e.coordinates, event: e.normalizeEvent(t) })), e.onChange();
  });
}, onResize: function(t) {
  var e = this;
  this.transitionsOptions.enabled || this.stencilSize && !this.autoZoom || this.awaitRender(function() {
    var i = e.sizeRestrictions, n = Math.min(e.coordinates.width, e.coordinates.height, 20 * e.coefficient);
    e.coordinates = e.resizeAlgorithm(g(g({}, e.getPublicProperties()), {}, { positionRestrictions: jt(e.positionRestrictions, e.visibleArea), sizeRestrictions: { maxWidth: Math.min(i.maxWidth, e.visibleArea.width), maxHeight: Math.min(i.maxHeight, e.visibleArea.height), minWidth: Math.max(i.minWidth, n), minHeight: Math.max(i.minHeight, n) }, event: e.normalizeEvent(t) })), e.onChange(), e.ticking = false;
  });
}, onManipulateImage: function(t) {
  var e = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};
  if (!this.transitionsOptions.enabled) {
    var i = e.transitions, n = void 0 !== i && i, s = e.normalize, o = void 0 === s || s;
    n && this.enableTransitions();
    var r = Lt(g(g({}, this.getPublicProperties()), {}, { event: o ? this.normalizeEvent(t) : t, getAreaRestrictions: this.getAreaRestrictions, imageRestriction: this.imageRestriction, adjustStencil: !this.stencilSize && this.settings.resizeImage.adjustStencil })), a = r.visibleArea, h = r.coordinates;
    this.visibleArea = a, this.coordinates = h, this.runAutoZoom("manipulateImage"), this.onChange(), n && this.debouncedDisableTransitions();
  }
}, onPropsChange: function() {
  this.coordinates = this.applyTransform(this.coordinates, true), this.onChange(false);
}, getAreaRestrictions: function() {
  var t = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {}, e = t.visibleArea, i = t.type, n = void 0 === i ? "move" : i;
  return this.areaRestrictionsAlgorithm({ boundaries: this.boundaries, imageSize: this.imageSize, imageRestriction: this.imageRestriction, visibleArea: e, type: n });
}, getAspectRatio: function(t) {
  var e, i, n = this.stencilProps, s = n.aspectRatio, o = n.minAspectRatio, r = n.maxAspectRatio;
  if (this.$refs.stencil && this.$refs.stencil.aspectRatios) {
    var a = this.$refs.stencil.aspectRatios();
    e = a.minimum, i = a.maximum;
  }
  if (D(e) && (e = D(s) ? o : s), D(i) && (i = D(s) ? r : s), !t && (D(e) || D(i))) {
    var h = this.getStencilSize(), c = h ? ct(h) : null;
    D(e) && (e = P(c) ? c : void 0), D(i) && (i = P(c) ? c : void 0);
  }
  return { minimum: e, maximum: i };
}, getStencilSize: function() {
  if (this.stencilSize)
    return t = { currentStencilSize: { width: this.stencilCoordinates.width, height: this.stencilCoordinates.height }, stencilSize: this.stencilSize, boundaries: this.boundaries, coefficient: this.coefficient, coordinates: this.coordinates, aspectRatio: this.getAspectRatio(true) }, e = t.boundaries, i = t.stencilSize, n = t.aspectRatio, dt(ct(s = O(i) ? i({ boundaries: e, aspectRatio: n }) : i), n) && (s = Mt({ sizeRestrictions: { maxWidth: e.width, maxHeight: e.height, minWidth: 0, minHeight: 0 }, width: s.width, height: s.height, aspectRatio: { minimum: n.minimum, maximum: n.maximum } })), (s.width > e.width || s.height > e.height) && (s = Mt({ sizeRestrictions: { maxWidth: e.width, maxHeight: e.height, minWidth: 0, minHeight: 0 }, width: s.width, height: s.height, aspectRatio: { minimum: ct(s), maximum: ct(s) } })), s;
  var t, e, i, n, s;
}, getPublicProperties: function() {
  return { coefficient: this.coefficient, visibleArea: this.visibleArea, coordinates: this.coordinates, boundaries: this.boundaries, sizeRestrictions: this.sizeRestrictions, positionRestrictions: this.positionRestrictions, aspectRatio: this.getAspectRatio(), imageRestriction: this.imageRestriction };
}, defaultCoordinates: function() {
  return g({}, J);
}, flip: function(t, e) {
  var i = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : {}, n = i.transitions, s = void 0 === n || n;
  if (!this.transitionsActive) {
    s && this.enableTransitions();
    var o = g({}, this.imageTransforms.flip), r = $t({ flip: { horizontal: t ? !o.horizontal : o.horizontal, vertical: e ? !o.vertical : o.vertical }, previousFlip: o, rotate: this.imageTransforms.rotate, visibleArea: this.visibleArea, coordinates: this.coordinates, imageSize: this.imageSize, positionRestrictions: this.positionRestrictions, sizeRestrictions: this.sizeRestrictions, getAreaRestrictions: this.getAreaRestrictions, aspectRatio: this.getAspectRatio() }), a = r.visibleArea, h = r.coordinates;
    t && (this.appliedImageTransforms.flip.horizontal = !this.appliedImageTransforms.flip.horizontal), e && (this.appliedImageTransforms.flip.vertical = !this.appliedImageTransforms.flip.vertical), this.visibleArea = a, this.coordinates = h, this.onChange(), s && this.debouncedDisableTransitions();
  }
}, rotate: function(t) {
  var e = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {}, i = e.transitions, n = void 0 === i || i;
  if (!this.transitionsActive) {
    n && this.enableTransitions();
    var s = g({}, this.imageSize);
    this.appliedImageTransforms.rotate += t;
    var o = Pt({ visibleArea: this.visibleArea, coordinates: this.coordinates, previousImageSize: s, imageSize: this.imageSize, angle: t, positionRestrictions: this.positionRestrictions, sizeRestrictions: this.sizeRestrictions, getAreaRestrictions: this.getAreaRestrictions, aspectRatio: this.getAspectRatio() }), r = o.visibleArea, a = o.coordinates, h = this.processAutoZoom("rotateImage", r, a);
    r = h.visibleArea, a = h.coordinates, this.visibleArea = r, this.coordinates = a, this.onChange(), n && this.debouncedDisableTransitions();
  }
} }, emits: ["change", "error", "ready"] }, ve = { key: 0, ref: "canvas", style: { display: "none" } }, be = { key: 1, ref: "sourceCanvas", style: { display: "none" } };
fe.render = function(i, n, r, a, p2, g2) {
  return openBlock(), createBlock("div", { ref: "cropper", class: g2.classes.cropper }, [createVNode("div", { ref: "stretcher", class: g2.classes.stretcher }, null, 2), createVNode("div", { class: g2.classes.boundaries, style: g2.boundariesStyle }, [(openBlock(), createBlock(resolveDynamicComponent(r.backgroundWrapperComponent), { class: g2.classes.cropperWrapper, "wheel-resize": g2.settings.resizeImage.wheel, "touch-resize": g2.settings.resizeImage.touch, "touch-move": g2.settings.moveImage.touch, "mouse-move": g2.settings.moveImage.mouse, onMove: g2.onManipulateImage, onResize: g2.onManipulateImage }, { default: withCtx(function() {
    return [createVNode("div", { class: g2.classes.background, style: g2.boundariesStyle }, null, 6), createVNode("div", { class: g2.classes.imageWrapper }, [createVNode("img", { ref: "image", crossorigin: p2.imageAttributes.crossOrigin, src: p2.imageAttributes.src, class: g2.classes.image, style: g2.imageStyle, onMousedown: n[1] || (n[1] = withModifiers(function() {
    }, ["prevent"])) }, null, 46, ["crossorigin", "src"])], 2), createVNode("div", { class: g2.classes.foreground, style: g2.boundariesStyle }, null, 6), withDirectives((openBlock(), createBlock(resolveDynamicComponent(r.stencilComponent), mergeProps({ ref: "stencil", image: g2.image, coordinates: p2.coordinates, "stencil-coordinates": g2.stencilCoordinates, transitions: g2.transitionsOptions }, r.stencilProps, { onResize: g2.onResize, onResizeEnd: g2.onResizeEnd, onMove: g2.onMove, onMoveEnd: g2.onMoveEnd }), null, 16, ["image", "coordinates", "stencil-coordinates", "transitions", "onResize", "onResizeEnd", "onMove", "onMoveEnd"])), [[vShow, p2.imageLoaded]]), r.canvas ? (openBlock(), createBlock("canvas", ve, null, 512)) : createCommentVNode("", true), r.canvas ? (openBlock(), createBlock("canvas", be, null, 512)) : createCommentVNode("", true)];
  }), _: 1 }, 8, ["class", "wheel-resize", "touch-resize", "touch-move", "mouse-move", "onMove", "onResize"]))], 6)], 2);
};
const style = "";
export {
  fe as f
};
