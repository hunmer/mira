import { r as require$$0 } from "./vue-9128ba93.js";
var commonjsGlobal = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : {};
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
function getAugmentedNamespace(n) {
  if (n.__esModule)
    return n;
  var f = n.default;
  if (typeof f == "function") {
    var a = function a2() {
      if (this instanceof a2) {
        return Reflect.construct(f, arguments, this.constructor);
      }
      return f.apply(this, arguments);
    };
    a.prototype = f.prototype;
  } else
    a = {};
  Object.defineProperty(a, "__esModule", { value: true });
  Object.keys(n).forEach(function(k) {
    var d = Object.getOwnPropertyDescriptor(n, k);
    Object.defineProperty(a, k, d.get ? d : {
      enumerable: true,
      get: function() {
        return n[k];
      }
    });
  });
  return a;
}
var vue3ContextMenu_umd_min = { exports: {} };
(function(module, exports) {
  (function(e, t) {
    module.exports = t(require$$0);
  })("undefined" !== typeof self ? self : commonjsGlobal, (e) => (() => {
    var t = { 9662: (e2, t2, n2) => {
      var o2 = n2(614), r2 = n2(6330), i = TypeError;
      e2.exports = function(e3) {
        if (o2(e3))
          return e3;
        throw i(r2(e3) + " is not a function");
      };
    }, 6077: (e2, t2, n2) => {
      var o2 = n2(614), r2 = String, i = TypeError;
      e2.exports = function(e3) {
        if ("object" == typeof e3 || o2(e3))
          return e3;
        throw i("Can't set " + r2(e3) + " as a prototype");
      };
    }, 1223: (e2, t2, n2) => {
      var o2 = n2(5112), r2 = n2(30), i = n2(3070).f, u = o2("unscopables"), l = Array.prototype;
      void 0 == l[u] && i(l, u, { configurable: true, value: r2(null) }), e2.exports = function(e3) {
        l[u][e3] = true;
      };
    }, 9670: (e2, t2, n2) => {
      var o2 = n2(111), r2 = String, i = TypeError;
      e2.exports = function(e3) {
        if (o2(e3))
          return e3;
        throw i(r2(e3) + " is not an object");
      };
    }, 8533: (e2, t2, n2) => {
      var o2 = n2(2092).forEach, r2 = n2(9341), i = r2("forEach");
      e2.exports = i ? [].forEach : function(e3) {
        return o2(this, e3, arguments.length > 1 ? arguments[1] : void 0);
      };
    }, 1318: (e2, t2, n2) => {
      var o2 = n2(5656), r2 = n2(1400), i = n2(6244), u = function(e3) {
        return function(t3, n3, u2) {
          var l, a = o2(t3), c = i(a), s = r2(u2, c);
          if (e3 && n3 != n3) {
            while (c > s)
              if (l = a[s++], l != l)
                return true;
          } else
            for (; c > s; s++)
              if ((e3 || s in a) && a[s] === n3)
                return e3 || s || 0;
          return !e3 && -1;
        };
      };
      e2.exports = { includes: u(true), indexOf: u(false) };
    }, 2092: (e2, t2, n2) => {
      var o2 = n2(9974), r2 = n2(1702), i = n2(8361), u = n2(7908), l = n2(6244), a = n2(5417), c = r2([].push), s = function(e3) {
        var t3 = 1 == e3, n3 = 2 == e3, r3 = 3 == e3, s2 = 4 == e3, d = 6 == e3, f = 7 == e3, v = 5 == e3 || d;
        return function(p, m, h, g) {
          for (var b, y, x = u(p), C = i(x), S = o2(m, h), k = l(C), M = 0, w = g || a, O = t3 ? w(p, k) : n3 || f ? w(p, 0) : void 0; k > M; M++)
            if ((v || M in C) && (b = C[M], y = S(b, M, x), e3))
              if (t3)
                O[M] = y;
              else if (y)
                switch (e3) {
                  case 3:
                    return true;
                  case 5:
                    return b;
                  case 6:
                    return M;
                  case 2:
                    c(O, b);
                }
              else
                switch (e3) {
                  case 4:
                    return false;
                  case 7:
                    c(O, b);
                }
          return d ? -1 : r3 || s2 ? s2 : O;
        };
      };
      e2.exports = { forEach: s(0), map: s(1), filter: s(2), some: s(3), every: s(4), find: s(5), findIndex: s(6), filterReject: s(7) };
    }, 1194: (e2, t2, n2) => {
      var o2 = n2(7293), r2 = n2(5112), i = n2(7392), u = r2("species");
      e2.exports = function(e3) {
        return i >= 51 || !o2(function() {
          var t3 = [], n3 = t3.constructor = {};
          return n3[u] = function() {
            return { foo: 1 };
          }, 1 !== t3[e3](Boolean).foo;
        });
      };
    }, 9341: (e2, t2, n2) => {
      var o2 = n2(7293);
      e2.exports = function(e3, t3) {
        var n3 = [][e3];
        return !!n3 && o2(function() {
          n3.call(null, t3 || function() {
            return 1;
          }, 1);
        });
      };
    }, 3658: (e2, t2, n2) => {
      var o2 = n2(9781), r2 = n2(3157), i = TypeError, u = Object.getOwnPropertyDescriptor, l = o2 && !function() {
        if (void 0 !== this)
          return true;
        try {
          Object.defineProperty([], "length", { writable: false }).length = 1;
        } catch (e3) {
          return e3 instanceof TypeError;
        }
      }();
      e2.exports = l ? function(e3, t3) {
        if (r2(e3) && !u(e3, "length").writable)
          throw i("Cannot set read only .length");
        return e3.length = t3;
      } : function(e3, t3) {
        return e3.length = t3;
      };
    }, 206: (e2, t2, n2) => {
      var o2 = n2(1702);
      e2.exports = o2([].slice);
    }, 7475: (e2, t2, n2) => {
      var o2 = n2(3157), r2 = n2(4411), i = n2(111), u = n2(5112), l = u("species"), a = Array;
      e2.exports = function(e3) {
        var t3;
        return o2(e3) && (t3 = e3.constructor, r2(t3) && (t3 === a || o2(t3.prototype)) ? t3 = void 0 : i(t3) && (t3 = t3[l], null === t3 && (t3 = void 0))), void 0 === t3 ? a : t3;
      };
    }, 5417: (e2, t2, n2) => {
      var o2 = n2(7475);
      e2.exports = function(e3, t3) {
        return new (o2(e3))(0 === t3 ? 0 : t3);
      };
    }, 4326: (e2, t2, n2) => {
      var o2 = n2(1702), r2 = o2({}.toString), i = o2("".slice);
      e2.exports = function(e3) {
        return i(r2(e3), 8, -1);
      };
    }, 648: (e2, t2, n2) => {
      var o2 = n2(1694), r2 = n2(614), i = n2(4326), u = n2(5112), l = u("toStringTag"), a = Object, c = "Arguments" == i(function() {
        return arguments;
      }()), s = function(e3, t3) {
        try {
          return e3[t3];
        } catch (n3) {
        }
      };
      e2.exports = o2 ? i : function(e3) {
        var t3, n3, o3;
        return void 0 === e3 ? "Undefined" : null === e3 ? "Null" : "string" == typeof (n3 = s(t3 = a(e3), l)) ? n3 : c ? i(t3) : "Object" == (o3 = i(t3)) && r2(t3.callee) ? "Arguments" : o3;
      };
    }, 9920: (e2, t2, n2) => {
      var o2 = n2(2597), r2 = n2(3887), i = n2(1236), u = n2(3070);
      e2.exports = function(e3, t3, n3) {
        for (var l = r2(t3), a = u.f, c = i.f, s = 0; s < l.length; s++) {
          var d = l[s];
          o2(e3, d) || n3 && o2(n3, d) || a(e3, d, c(t3, d));
        }
      };
    }, 4964: (e2, t2, n2) => {
      var o2 = n2(5112), r2 = o2("match");
      e2.exports = function(e3) {
        var t3 = /./;
        try {
          "/./"[e3](t3);
        } catch (n3) {
          try {
            return t3[r2] = false, "/./"[e3](t3);
          } catch (o3) {
          }
        }
        return false;
      };
    }, 8880: (e2, t2, n2) => {
      var o2 = n2(9781), r2 = n2(3070), i = n2(9114);
      e2.exports = o2 ? function(e3, t3, n3) {
        return r2.f(e3, t3, i(1, n3));
      } : function(e3, t3, n3) {
        return e3[t3] = n3, e3;
      };
    }, 9114: (e2) => {
      e2.exports = function(e3, t2) {
        return { enumerable: !(1 & e3), configurable: !(2 & e3), writable: !(4 & e3), value: t2 };
      };
    }, 6135: (e2, t2, n2) => {
      var o2 = n2(4948), r2 = n2(3070), i = n2(9114);
      e2.exports = function(e3, t3, n3) {
        var u = o2(t3);
        u in e3 ? r2.f(e3, u, i(0, n3)) : e3[u] = n3;
      };
    }, 8052: (e2, t2, n2) => {
      var o2 = n2(614), r2 = n2(3070), i = n2(6339), u = n2(3072);
      e2.exports = function(e3, t3, n3, l) {
        l || (l = {});
        var a = l.enumerable, c = void 0 !== l.name ? l.name : t3;
        if (o2(n3) && i(n3, c, l), l.global)
          a ? e3[t3] = n3 : u(t3, n3);
        else {
          try {
            l.unsafe ? e3[t3] && (a = true) : delete e3[t3];
          } catch (s) {
          }
          a ? e3[t3] = n3 : r2.f(e3, t3, { value: n3, enumerable: false, configurable: !l.nonConfigurable, writable: !l.nonWritable });
        }
        return e3;
      };
    }, 3072: (e2, t2, n2) => {
      var o2 = n2(7854), r2 = Object.defineProperty;
      e2.exports = function(e3, t3) {
        try {
          r2(o2, e3, { value: t3, configurable: true, writable: true });
        } catch (n3) {
          o2[e3] = t3;
        }
        return t3;
      };
    }, 5117: (e2, t2, n2) => {
      var o2 = n2(6330), r2 = TypeError;
      e2.exports = function(e3, t3) {
        if (!delete e3[t3])
          throw r2("Cannot delete property " + o2(t3) + " of " + o2(e3));
      };
    }, 9781: (e2, t2, n2) => {
      var o2 = n2(7293);
      e2.exports = !o2(function() {
        return 7 != Object.defineProperty({}, 1, { get: function() {
          return 7;
        } })[1];
      });
    }, 317: (e2, t2, n2) => {
      var o2 = n2(7854), r2 = n2(111), i = o2.document, u = r2(i) && r2(i.createElement);
      e2.exports = function(e3) {
        return u ? i.createElement(e3) : {};
      };
    }, 7207: (e2) => {
      var t2 = TypeError, n2 = 9007199254740991;
      e2.exports = function(e3) {
        if (e3 > n2)
          throw t2("Maximum allowed index exceeded");
        return e3;
      };
    }, 8113: (e2, t2, n2) => {
      var o2 = n2(5005);
      e2.exports = o2("navigator", "userAgent") || "";
    }, 7392: (e2, t2, n2) => {
      var o2, r2, i = n2(7854), u = n2(8113), l = i.process, a = i.Deno, c = l && l.versions || a && a.version, s = c && c.v8;
      s && (o2 = s.split("."), r2 = o2[0] > 0 && o2[0] < 4 ? 1 : +(o2[0] + o2[1])), !r2 && u && (o2 = u.match(/Edge\/(\d+)/), (!o2 || o2[1] >= 74) && (o2 = u.match(/Chrome\/(\d+)/), o2 && (r2 = +o2[1]))), e2.exports = r2;
    }, 748: (e2) => {
      e2.exports = ["constructor", "hasOwnProperty", "isPrototypeOf", "propertyIsEnumerable", "toLocaleString", "toString", "valueOf"];
    }, 7762: (e2, t2, n2) => {
      var o2 = n2(9781), r2 = n2(7293), i = n2(9670), u = n2(30), l = n2(6277), a = Error.prototype.toString, c = r2(function() {
        if (o2) {
          var e3 = u(Object.defineProperty({}, "name", { get: function() {
            return this === e3;
          } }));
          if ("true" !== a.call(e3))
            return true;
        }
        return "2: 1" !== a.call({ message: 1, name: 2 }) || "Error" !== a.call({});
      });
      e2.exports = c ? function() {
        var e3 = i(this), t3 = l(e3.name, "Error"), n3 = l(e3.message);
        return t3 ? n3 ? t3 + ": " + n3 : t3 : n3;
      } : a;
    }, 2109: (e2, t2, n2) => {
      var o2 = n2(7854), r2 = n2(1236).f, i = n2(8880), u = n2(8052), l = n2(3072), a = n2(9920), c = n2(4705);
      e2.exports = function(e3, t3) {
        var n3, s, d, f, v, p, m = e3.target, h = e3.global, g = e3.stat;
        if (s = h ? o2 : g ? o2[m] || l(m, {}) : (o2[m] || {}).prototype, s)
          for (d in t3) {
            if (v = t3[d], e3.dontCallGetSet ? (p = r2(s, d), f = p && p.value) : f = s[d], n3 = c(h ? d : m + (g ? "." : "#") + d, e3.forced), !n3 && void 0 !== f) {
              if (typeof v == typeof f)
                continue;
              a(v, f);
            }
            (e3.sham || f && f.sham) && i(v, "sham", true), u(s, d, v, e3);
          }
      };
    }, 7293: (e2) => {
      e2.exports = function(e3) {
        try {
          return !!e3();
        } catch (t2) {
          return true;
        }
      };
    }, 2104: (e2, t2, n2) => {
      var o2 = n2(4374), r2 = Function.prototype, i = r2.apply, u = r2.call;
      e2.exports = "object" == typeof Reflect && Reflect.apply || (o2 ? u.bind(i) : function() {
        return u.apply(i, arguments);
      });
    }, 9974: (e2, t2, n2) => {
      var o2 = n2(1702), r2 = n2(9662), i = n2(4374), u = o2(o2.bind);
      e2.exports = function(e3, t3) {
        return r2(e3), void 0 === t3 ? e3 : i ? u(e3, t3) : function() {
          return e3.apply(t3, arguments);
        };
      };
    }, 4374: (e2, t2, n2) => {
      var o2 = n2(7293);
      e2.exports = !o2(function() {
        var e3 = (function() {
        }).bind();
        return "function" != typeof e3 || e3.hasOwnProperty("prototype");
      });
    }, 6916: (e2, t2, n2) => {
      var o2 = n2(4374), r2 = Function.prototype.call;
      e2.exports = o2 ? r2.bind(r2) : function() {
        return r2.apply(r2, arguments);
      };
    }, 6530: (e2, t2, n2) => {
      var o2 = n2(9781), r2 = n2(2597), i = Function.prototype, u = o2 && Object.getOwnPropertyDescriptor, l = r2(i, "name"), a = l && "something" === (function() {
      }).name, c = l && (!o2 || o2 && u(i, "name").configurable);
      e2.exports = { EXISTS: l, PROPER: a, CONFIGURABLE: c };
    }, 1702: (e2, t2, n2) => {
      var o2 = n2(4374), r2 = Function.prototype, i = r2.bind, u = r2.call, l = o2 && i.bind(u, u);
      e2.exports = o2 ? function(e3) {
        return e3 && l(e3);
      } : function(e3) {
        return e3 && function() {
          return u.apply(e3, arguments);
        };
      };
    }, 5005: (e2, t2, n2) => {
      var o2 = n2(7854), r2 = n2(614), i = function(e3) {
        return r2(e3) ? e3 : void 0;
      };
      e2.exports = function(e3, t3) {
        return arguments.length < 2 ? i(o2[e3]) : o2[e3] && o2[e3][t3];
      };
    }, 8173: (e2, t2, n2) => {
      var o2 = n2(9662), r2 = n2(8554);
      e2.exports = function(e3, t3) {
        var n3 = e3[t3];
        return r2(n3) ? void 0 : o2(n3);
      };
    }, 7854: (e2, t2, n2) => {
      var o2 = function(e3) {
        return e3 && e3.Math == Math && e3;
      };
      e2.exports = o2("object" == typeof globalThis && globalThis) || o2("object" == typeof window && window) || o2("object" == typeof self && self) || o2("object" == typeof n2.g && n2.g) || function() {
        return this;
      }() || Function("return this")();
    }, 2597: (e2, t2, n2) => {
      var o2 = n2(1702), r2 = n2(7908), i = o2({}.hasOwnProperty);
      e2.exports = Object.hasOwn || function(e3, t3) {
        return i(r2(e3), t3);
      };
    }, 3501: (e2) => {
      e2.exports = {};
    }, 490: (e2, t2, n2) => {
      var o2 = n2(5005);
      e2.exports = o2("document", "documentElement");
    }, 4664: (e2, t2, n2) => {
      var o2 = n2(9781), r2 = n2(7293), i = n2(317);
      e2.exports = !o2 && !r2(function() {
        return 7 != Object.defineProperty(i("div"), "a", { get: function() {
          return 7;
        } }).a;
      });
    }, 8361: (e2, t2, n2) => {
      var o2 = n2(1702), r2 = n2(7293), i = n2(4326), u = Object, l = o2("".split);
      e2.exports = r2(function() {
        return !u("z").propertyIsEnumerable(0);
      }) ? function(e3) {
        return "String" == i(e3) ? l(e3, "") : u(e3);
      } : u;
    }, 9587: (e2, t2, n2) => {
      var o2 = n2(614), r2 = n2(111), i = n2(7674);
      e2.exports = function(e3, t3, n3) {
        var u, l;
        return i && o2(u = t3.constructor) && u !== n3 && r2(l = u.prototype) && l !== n3.prototype && i(e3, l), e3;
      };
    }, 2788: (e2, t2, n2) => {
      var o2 = n2(1702), r2 = n2(614), i = n2(5465), u = o2(Function.toString);
      r2(i.inspectSource) || (i.inspectSource = function(e3) {
        return u(e3);
      }), e2.exports = i.inspectSource;
    }, 9909: (e2, t2, n2) => {
      var o2, r2, i, u = n2(4811), l = n2(7854), a = n2(1702), c = n2(111), s = n2(8880), d = n2(2597), f = n2(5465), v = n2(6200), p = n2(3501), m = "Object already initialized", h = l.TypeError, g = l.WeakMap, b = function(e3) {
        return i(e3) ? r2(e3) : o2(e3, {});
      }, y = function(e3) {
        return function(t3) {
          var n3;
          if (!c(t3) || (n3 = r2(t3)).type !== e3)
            throw h("Incompatible receiver, " + e3 + " required");
          return n3;
        };
      };
      if (u || f.state) {
        var x = f.state || (f.state = new g()), C = a(x.get), S = a(x.has), k = a(x.set);
        o2 = function(e3, t3) {
          if (S(x, e3))
            throw h(m);
          return t3.facade = e3, k(x, e3, t3), t3;
        }, r2 = function(e3) {
          return C(x, e3) || {};
        }, i = function(e3) {
          return S(x, e3);
        };
      } else {
        var M = v("state");
        p[M] = true, o2 = function(e3, t3) {
          if (d(e3, M))
            throw h(m);
          return t3.facade = e3, s(e3, M, t3), t3;
        }, r2 = function(e3) {
          return d(e3, M) ? e3[M] : {};
        }, i = function(e3) {
          return d(e3, M);
        };
      }
      e2.exports = { set: o2, get: r2, has: i, enforce: b, getterFor: y };
    }, 3157: (e2, t2, n2) => {
      var o2 = n2(4326);
      e2.exports = Array.isArray || function(e3) {
        return "Array" == o2(e3);
      };
    }, 614: (e2) => {
      e2.exports = function(e3) {
        return "function" == typeof e3;
      };
    }, 4411: (e2, t2, n2) => {
      var o2 = n2(1702), r2 = n2(7293), i = n2(614), u = n2(648), l = n2(5005), a = n2(2788), c = function() {
      }, s = [], d = l("Reflect", "construct"), f = /^\s*(?:class|function)\b/, v = o2(f.exec), p = !f.exec(c), m = function(e3) {
        if (!i(e3))
          return false;
        try {
          return d(c, s, e3), true;
        } catch (t3) {
          return false;
        }
      }, h = function(e3) {
        if (!i(e3))
          return false;
        switch (u(e3)) {
          case "AsyncFunction":
          case "GeneratorFunction":
          case "AsyncGeneratorFunction":
            return false;
        }
        try {
          return p || !!v(f, a(e3));
        } catch (t3) {
          return true;
        }
      };
      h.sham = true, e2.exports = !d || r2(function() {
        var e3;
        return m(m.call) || !m(Object) || !m(function() {
          e3 = true;
        }) || e3;
      }) ? h : m;
    }, 4705: (e2, t2, n2) => {
      var o2 = n2(7293), r2 = n2(614), i = /#|\.prototype\./, u = function(e3, t3) {
        var n3 = a[l(e3)];
        return n3 == s || n3 != c && (r2(t3) ? o2(t3) : !!t3);
      }, l = u.normalize = function(e3) {
        return String(e3).replace(i, ".").toLowerCase();
      }, a = u.data = {}, c = u.NATIVE = "N", s = u.POLYFILL = "P";
      e2.exports = u;
    }, 8554: (e2) => {
      e2.exports = function(e3) {
        return null === e3 || void 0 === e3;
      };
    }, 111: (e2, t2, n2) => {
      var o2 = n2(614), r2 = "object" == typeof document && document.all, i = "undefined" == typeof r2 && void 0 !== r2;
      e2.exports = i ? function(e3) {
        return "object" == typeof e3 ? null !== e3 : o2(e3) || e3 === r2;
      } : function(e3) {
        return "object" == typeof e3 ? null !== e3 : o2(e3);
      };
    }, 1913: (e2) => {
      e2.exports = false;
    }, 7850: (e2, t2, n2) => {
      var o2 = n2(111), r2 = n2(4326), i = n2(5112), u = i("match");
      e2.exports = function(e3) {
        var t3;
        return o2(e3) && (void 0 !== (t3 = e3[u]) ? !!t3 : "RegExp" == r2(e3));
      };
    }, 2190: (e2, t2, n2) => {
      var o2 = n2(5005), r2 = n2(614), i = n2(7976), u = n2(3307), l = Object;
      e2.exports = u ? function(e3) {
        return "symbol" == typeof e3;
      } : function(e3) {
        var t3 = o2("Symbol");
        return r2(t3) && i(t3.prototype, l(e3));
      };
    }, 6244: (e2, t2, n2) => {
      var o2 = n2(7466);
      e2.exports = function(e3) {
        return o2(e3.length);
      };
    }, 6339: (e2, t2, n2) => {
      var o2 = n2(7293), r2 = n2(614), i = n2(2597), u = n2(9781), l = n2(6530).CONFIGURABLE, a = n2(2788), c = n2(9909), s = c.enforce, d = c.get, f = Object.defineProperty, v = u && !o2(function() {
        return 8 !== f(function() {
        }, "length", { value: 8 }).length;
      }), p = String(String).split("String"), m = e2.exports = function(e3, t3, n3) {
        "Symbol(" === String(t3).slice(0, 7) && (t3 = "[" + String(t3).replace(/^Symbol\(([^)]*)\)/, "$1") + "]"), n3 && n3.getter && (t3 = "get " + t3), n3 && n3.setter && (t3 = "set " + t3), (!i(e3, "name") || l && e3.name !== t3) && (u ? f(e3, "name", { value: t3, configurable: true }) : e3.name = t3), v && n3 && i(n3, "arity") && e3.length !== n3.arity && f(e3, "length", { value: n3.arity });
        try {
          n3 && i(n3, "constructor") && n3.constructor ? u && f(e3, "prototype", { writable: false }) : e3.prototype && (e3.prototype = void 0);
        } catch (r3) {
        }
        var o3 = s(e3);
        return i(o3, "source") || (o3.source = p.join("string" == typeof t3 ? t3 : "")), e3;
      };
      Function.prototype.toString = m(function() {
        return r2(this) && d(this).source || a(this);
      }, "toString");
    }, 4758: (e2) => {
      var t2 = Math.ceil, n2 = Math.floor;
      e2.exports = Math.trunc || function(e3) {
        var o2 = +e3;
        return (o2 > 0 ? n2 : t2)(o2);
      };
    }, 6277: (e2, t2, n2) => {
      var o2 = n2(1340);
      e2.exports = function(e3, t3) {
        return void 0 === e3 ? arguments.length < 2 ? "" : t3 : o2(e3);
      };
    }, 3929: (e2, t2, n2) => {
      var o2 = n2(7850), r2 = TypeError;
      e2.exports = function(e3) {
        if (o2(e3))
          throw r2("The method doesn't accept regular expressions");
        return e3;
      };
    }, 30: (e2, t2, n2) => {
      var o2, r2 = n2(9670), i = n2(6048), u = n2(748), l = n2(3501), a = n2(490), c = n2(317), s = n2(6200), d = ">", f = "<", v = "prototype", p = "script", m = s("IE_PROTO"), h = function() {
      }, g = function(e3) {
        return f + p + d + e3 + f + "/" + p + d;
      }, b = function(e3) {
        e3.write(g("")), e3.close();
        var t3 = e3.parentWindow.Object;
        return e3 = null, t3;
      }, y = function() {
        var e3, t3 = c("iframe"), n3 = "java" + p + ":";
        return t3.style.display = "none", a.appendChild(t3), t3.src = String(n3), e3 = t3.contentWindow.document, e3.open(), e3.write(g("document.F=Object")), e3.close(), e3.F;
      }, x = function() {
        try {
          o2 = new ActiveXObject("htmlfile");
        } catch (t3) {
        }
        x = "undefined" != typeof document ? document.domain && o2 ? b(o2) : y() : b(o2);
        var e3 = u.length;
        while (e3--)
          delete x[v][u[e3]];
        return x();
      };
      l[m] = true, e2.exports = Object.create || function(e3, t3) {
        var n3;
        return null !== e3 ? (h[v] = r2(e3), n3 = new h(), h[v] = null, n3[m] = e3) : n3 = x(), void 0 === t3 ? n3 : i.f(n3, t3);
      };
    }, 6048: (e2, t2, n2) => {
      var o2 = n2(9781), r2 = n2(3353), i = n2(3070), u = n2(9670), l = n2(5656), a = n2(1956);
      t2.f = o2 && !r2 ? Object.defineProperties : function(e3, t3) {
        u(e3);
        var n3, o3 = l(t3), r3 = a(t3), c = r3.length, s = 0;
        while (c > s)
          i.f(e3, n3 = r3[s++], o3[n3]);
        return e3;
      };
    }, 3070: (e2, t2, n2) => {
      var o2 = n2(9781), r2 = n2(4664), i = n2(3353), u = n2(9670), l = n2(4948), a = TypeError, c = Object.defineProperty, s = Object.getOwnPropertyDescriptor, d = "enumerable", f = "configurable", v = "writable";
      t2.f = o2 ? i ? function(e3, t3, n3) {
        if (u(e3), t3 = l(t3), u(n3), "function" === typeof e3 && "prototype" === t3 && "value" in n3 && v in n3 && !n3[v]) {
          var o3 = s(e3, t3);
          o3 && o3[v] && (e3[t3] = n3.value, n3 = { configurable: f in n3 ? n3[f] : o3[f], enumerable: d in n3 ? n3[d] : o3[d], writable: false });
        }
        return c(e3, t3, n3);
      } : c : function(e3, t3, n3) {
        if (u(e3), t3 = l(t3), u(n3), r2)
          try {
            return c(e3, t3, n3);
          } catch (o3) {
          }
        if ("get" in n3 || "set" in n3)
          throw a("Accessors not supported");
        return "value" in n3 && (e3[t3] = n3.value), e3;
      };
    }, 1236: (e2, t2, n2) => {
      var o2 = n2(9781), r2 = n2(6916), i = n2(5296), u = n2(9114), l = n2(5656), a = n2(4948), c = n2(2597), s = n2(4664), d = Object.getOwnPropertyDescriptor;
      t2.f = o2 ? d : function(e3, t3) {
        if (e3 = l(e3), t3 = a(t3), s)
          try {
            return d(e3, t3);
          } catch (n3) {
          }
        if (c(e3, t3))
          return u(!r2(i.f, e3, t3), e3[t3]);
      };
    }, 8006: (e2, t2, n2) => {
      var o2 = n2(6324), r2 = n2(748), i = r2.concat("length", "prototype");
      t2.f = Object.getOwnPropertyNames || function(e3) {
        return o2(e3, i);
      };
    }, 5181: (e2, t2) => {
      t2.f = Object.getOwnPropertySymbols;
    }, 7976: (e2, t2, n2) => {
      var o2 = n2(1702);
      e2.exports = o2({}.isPrototypeOf);
    }, 6324: (e2, t2, n2) => {
      var o2 = n2(1702), r2 = n2(2597), i = n2(5656), u = n2(1318).indexOf, l = n2(3501), a = o2([].push);
      e2.exports = function(e3, t3) {
        var n3, o3 = i(e3), c = 0, s = [];
        for (n3 in o3)
          !r2(l, n3) && r2(o3, n3) && a(s, n3);
        while (t3.length > c)
          r2(o3, n3 = t3[c++]) && (~u(s, n3) || a(s, n3));
        return s;
      };
    }, 1956: (e2, t2, n2) => {
      var o2 = n2(6324), r2 = n2(748);
      e2.exports = Object.keys || function(e3) {
        return o2(e3, r2);
      };
    }, 5296: (e2, t2) => {
      var n2 = {}.propertyIsEnumerable, o2 = Object.getOwnPropertyDescriptor, r2 = o2 && !n2.call({ 1: 2 }, 1);
      t2.f = r2 ? function(e3) {
        var t3 = o2(this, e3);
        return !!t3 && t3.enumerable;
      } : n2;
    }, 7674: (e2, t2, n2) => {
      var o2 = n2(1702), r2 = n2(9670), i = n2(6077);
      e2.exports = Object.setPrototypeOf || ("__proto__" in {} ? function() {
        var e3, t3 = false, n3 = {};
        try {
          e3 = o2(Object.getOwnPropertyDescriptor(Object.prototype, "__proto__").set), e3(n3, []), t3 = n3 instanceof Array;
        } catch (u) {
        }
        return function(n4, o3) {
          return r2(n4), i(o3), t3 ? e3(n4, o3) : n4.__proto__ = o3, n4;
        };
      }() : void 0);
    }, 288: (e2, t2, n2) => {
      var o2 = n2(1694), r2 = n2(648);
      e2.exports = o2 ? {}.toString : function() {
        return "[object " + r2(this) + "]";
      };
    }, 2140: (e2, t2, n2) => {
      var o2 = n2(6916), r2 = n2(614), i = n2(111), u = TypeError;
      e2.exports = function(e3, t3) {
        var n3, l;
        if ("string" === t3 && r2(n3 = e3.toString) && !i(l = o2(n3, e3)))
          return l;
        if (r2(n3 = e3.valueOf) && !i(l = o2(n3, e3)))
          return l;
        if ("string" !== t3 && r2(n3 = e3.toString) && !i(l = o2(n3, e3)))
          return l;
        throw u("Can't convert object to primitive value");
      };
    }, 3887: (e2, t2, n2) => {
      var o2 = n2(5005), r2 = n2(1702), i = n2(8006), u = n2(5181), l = n2(9670), a = r2([].concat);
      e2.exports = o2("Reflect", "ownKeys") || function(e3) {
        var t3 = i.f(l(e3)), n3 = u.f;
        return n3 ? a(t3, n3(e3)) : t3;
      };
    }, 7066: (e2, t2, n2) => {
      var o2 = n2(9670);
      e2.exports = function() {
        var e3 = o2(this), t3 = "";
        return e3.hasIndices && (t3 += "d"), e3.global && (t3 += "g"), e3.ignoreCase && (t3 += "i"), e3.multiline && (t3 += "m"), e3.dotAll && (t3 += "s"), e3.unicode && (t3 += "u"), e3.unicodeSets && (t3 += "v"), e3.sticky && (t3 += "y"), t3;
      };
    }, 4706: (e2, t2, n2) => {
      var o2 = n2(6916), r2 = n2(2597), i = n2(7976), u = n2(7066), l = RegExp.prototype;
      e2.exports = function(e3) {
        var t3 = e3.flags;
        return void 0 !== t3 || "flags" in l || r2(e3, "flags") || !i(l, e3) ? t3 : o2(u, e3);
      };
    }, 4488: (e2, t2, n2) => {
      var o2 = n2(8554), r2 = TypeError;
      e2.exports = function(e3) {
        if (o2(e3))
          throw r2("Can't call method on " + e3);
        return e3;
      };
    }, 7152: (e2, t2, n2) => {
      var o2 = n2(7854), r2 = n2(2104), i = n2(614), u = n2(8113), l = n2(206), a = n2(8053), c = /MSIE .\./.test(u), s = o2.Function, d = function(e3) {
        return c ? function(t3, n3) {
          var o3 = a(arguments.length, 1) > 2, u2 = i(t3) ? t3 : s(t3), c2 = o3 ? l(arguments, 2) : void 0;
          return e3(o3 ? function() {
            r2(u2, this, c2);
          } : u2, n3);
        } : e3;
      };
      e2.exports = { setTimeout: d(o2.setTimeout), setInterval: d(o2.setInterval) };
    }, 6200: (e2, t2, n2) => {
      var o2 = n2(2309), r2 = n2(9711), i = o2("keys");
      e2.exports = function(e3) {
        return i[e3] || (i[e3] = r2(e3));
      };
    }, 5465: (e2, t2, n2) => {
      var o2 = n2(7854), r2 = n2(3072), i = "__core-js_shared__", u = o2[i] || r2(i, {});
      e2.exports = u;
    }, 2309: (e2, t2, n2) => {
      var o2 = n2(1913), r2 = n2(5465);
      (e2.exports = function(e3, t3) {
        return r2[e3] || (r2[e3] = void 0 !== t3 ? t3 : {});
      })("versions", []).push({ version: "3.25.0", mode: o2 ? "pure" : "global", copyright: "© 2014-2022 Denis Pushkarev (zloirock.ru)", license: "https://github.com/zloirock/core-js/blob/v3.25.0/LICENSE", source: "https://github.com/zloirock/core-js" });
    }, 3111: (e2, t2, n2) => {
      var o2 = n2(1702), r2 = n2(4488), i = n2(1340), u = n2(1361), l = o2("".replace), a = "[" + u + "]", c = RegExp("^" + a + a + "*"), s = RegExp(a + a + "*$"), d = function(e3) {
        return function(t3) {
          var n3 = i(r2(t3));
          return 1 & e3 && (n3 = l(n3, c, "")), 2 & e3 && (n3 = l(n3, s, "")), n3;
        };
      };
      e2.exports = { start: d(1), end: d(2), trim: d(3) };
    }, 6293: (e2, t2, n2) => {
      var o2 = n2(7392), r2 = n2(7293);
      e2.exports = !!Object.getOwnPropertySymbols && !r2(function() {
        var e3 = Symbol();
        return !String(e3) || !(Object(e3) instanceof Symbol) || !Symbol.sham && o2 && o2 < 41;
      });
    }, 863: (e2, t2, n2) => {
      var o2 = n2(1702);
      e2.exports = o2(1 .valueOf);
    }, 1400: (e2, t2, n2) => {
      var o2 = n2(9303), r2 = Math.max, i = Math.min;
      e2.exports = function(e3, t3) {
        var n3 = o2(e3);
        return n3 < 0 ? r2(n3 + t3, 0) : i(n3, t3);
      };
    }, 5656: (e2, t2, n2) => {
      var o2 = n2(8361), r2 = n2(4488);
      e2.exports = function(e3) {
        return o2(r2(e3));
      };
    }, 9303: (e2, t2, n2) => {
      var o2 = n2(4758);
      e2.exports = function(e3) {
        var t3 = +e3;
        return t3 !== t3 || 0 === t3 ? 0 : o2(t3);
      };
    }, 7466: (e2, t2, n2) => {
      var o2 = n2(9303), r2 = Math.min;
      e2.exports = function(e3) {
        return e3 > 0 ? r2(o2(e3), 9007199254740991) : 0;
      };
    }, 7908: (e2, t2, n2) => {
      var o2 = n2(4488), r2 = Object;
      e2.exports = function(e3) {
        return r2(o2(e3));
      };
    }, 7593: (e2, t2, n2) => {
      var o2 = n2(6916), r2 = n2(111), i = n2(2190), u = n2(8173), l = n2(2140), a = n2(5112), c = TypeError, s = a("toPrimitive");
      e2.exports = function(e3, t3) {
        if (!r2(e3) || i(e3))
          return e3;
        var n3, a2 = u(e3, s);
        if (a2) {
          if (void 0 === t3 && (t3 = "default"), n3 = o2(a2, e3, t3), !r2(n3) || i(n3))
            return n3;
          throw c("Can't convert object to primitive value");
        }
        return void 0 === t3 && (t3 = "number"), l(e3, t3);
      };
    }, 4948: (e2, t2, n2) => {
      var o2 = n2(7593), r2 = n2(2190);
      e2.exports = function(e3) {
        var t3 = o2(e3, "string");
        return r2(t3) ? t3 : t3 + "";
      };
    }, 1694: (e2, t2, n2) => {
      var o2 = n2(5112), r2 = o2("toStringTag"), i = {};
      i[r2] = "z", e2.exports = "[object z]" === String(i);
    }, 1340: (e2, t2, n2) => {
      var o2 = n2(648), r2 = String;
      e2.exports = function(e3) {
        if ("Symbol" === o2(e3))
          throw TypeError("Cannot convert a Symbol value to a string");
        return r2(e3);
      };
    }, 6330: (e2) => {
      var t2 = String;
      e2.exports = function(e3) {
        try {
          return t2(e3);
        } catch (n2) {
          return "Object";
        }
      };
    }, 9711: (e2, t2, n2) => {
      var o2 = n2(1702), r2 = 0, i = Math.random(), u = o2(1 .toString);
      e2.exports = function(e3) {
        return "Symbol(" + (void 0 === e3 ? "" : e3) + ")_" + u(++r2 + i, 36);
      };
    }, 3307: (e2, t2, n2) => {
      var o2 = n2(6293);
      e2.exports = o2 && !Symbol.sham && "symbol" == typeof Symbol.iterator;
    }, 3353: (e2, t2, n2) => {
      var o2 = n2(9781), r2 = n2(7293);
      e2.exports = o2 && r2(function() {
        return 42 != Object.defineProperty(function() {
        }, "prototype", { value: 42, writable: false }).prototype;
      });
    }, 8053: (e2) => {
      var t2 = TypeError;
      e2.exports = function(e3, n2) {
        if (e3 < n2)
          throw t2("Not enough arguments");
        return e3;
      };
    }, 4811: (e2, t2, n2) => {
      var o2 = n2(7854), r2 = n2(614), i = o2.WeakMap;
      e2.exports = r2(i) && /native code/.test(String(i));
    }, 5112: (e2, t2, n2) => {
      var o2 = n2(7854), r2 = n2(2309), i = n2(2597), u = n2(9711), l = n2(6293), a = n2(3307), c = r2("wks"), s = o2.Symbol, d = s && s["for"], f = a ? s : s && s.withoutSetter || u;
      e2.exports = function(e3) {
        if (!i(c, e3) || !l && "string" != typeof c[e3]) {
          var t3 = "Symbol." + e3;
          l && i(s, e3) ? c[e3] = s[e3] : c[e3] = a && d ? d(t3) : f(t3);
        }
        return c[e3];
      };
    }, 1361: (e2) => {
      e2.exports = "	\n\v\f\r                　\u2028\u2029\uFEFF";
    }, 9554: (e2, t2, n2) => {
      var o2 = n2(2109), r2 = n2(8533);
      o2({ target: "Array", proto: true, forced: [].forEach != r2 }, { forEach: r2 });
    }, 6699: (e2, t2, n2) => {
      var o2 = n2(2109), r2 = n2(1318).includes, i = n2(7293), u = n2(1223), l = i(function() {
        return !Array(1).includes();
      });
      o2({ target: "Array", proto: true, forced: l }, { includes: function(e3) {
        return r2(this, e3, arguments.length > 1 ? arguments[1] : void 0);
      } }), u("includes");
    }, 2772: (e2, t2, n2) => {
      var o2 = n2(2109), r2 = n2(1702), i = n2(1318).indexOf, u = n2(9341), l = r2([].indexOf), a = !!l && 1 / l([1], 1, -0) < 0, c = u("indexOf");
      o2({ target: "Array", proto: true, forced: a || !c }, { indexOf: function(e3) {
        var t3 = arguments.length > 1 ? arguments[1] : void 0;
        return a ? l(this, e3, t3) || 0 : i(this, e3, t3);
      } });
    }, 561: (e2, t2, n2) => {
      var o2 = n2(2109), r2 = n2(7908), i = n2(1400), u = n2(9303), l = n2(6244), a = n2(3658), c = n2(7207), s = n2(5417), d = n2(6135), f = n2(5117), v = n2(1194), p = v("splice"), m = Math.max, h = Math.min;
      o2({ target: "Array", proto: true, forced: !p }, { splice: function(e3, t3) {
        var n3, o3, v2, p2, g, b, y = r2(this), x = l(y), C = i(e3, x), S = arguments.length;
        for (0 === S ? n3 = o3 = 0 : 1 === S ? (n3 = 0, o3 = x - C) : (n3 = S - 2, o3 = h(m(u(t3), 0), x - C)), c(x + n3 - o3), v2 = s(y, o3), p2 = 0; p2 < o3; p2++)
          g = C + p2, g in y && d(v2, p2, y[g]);
        if (v2.length = o3, n3 < o3) {
          for (p2 = C; p2 < x - o3; p2++)
            g = p2 + o3, b = p2 + n3, g in y ? y[b] = y[g] : f(y, b);
          for (p2 = x; p2 > x - o3 + n3; p2--)
            f(y, p2 - 1);
        } else if (n3 > o3)
          for (p2 = x - o3; p2 > C; p2--)
            g = p2 + o3 - 1, b = p2 + n3 - 1, g in y ? y[b] = y[g] : f(y, b);
        for (p2 = 0; p2 < n3; p2++)
          y[p2 + C] = arguments[p2 + 2];
        return a(y, x - o3 + n3), v2;
      } });
    }, 3710: (e2, t2, n2) => {
      var o2 = n2(1702), r2 = n2(8052), i = Date.prototype, u = "Invalid Date", l = "toString", a = o2(i[l]), c = o2(i.getTime);
      String(/* @__PURE__ */ new Date(NaN)) != u && r2(i, l, function() {
        var e3 = c(this);
        return e3 === e3 ? a(this) : u;
      });
    }, 6647: (e2, t2, n2) => {
      var o2 = n2(8052), r2 = n2(7762), i = Error.prototype;
      i.toString !== r2 && o2(i, "toString", r2);
    }, 9653: (e2, t2, n2) => {
      var o2 = n2(9781), r2 = n2(7854), i = n2(1702), u = n2(4705), l = n2(8052), a = n2(2597), c = n2(9587), s = n2(7976), d = n2(2190), f = n2(7593), v = n2(7293), p = n2(8006).f, m = n2(1236).f, h = n2(3070).f, g = n2(863), b = n2(3111).trim, y = "Number", x = r2[y], C = x.prototype, S = r2.TypeError, k = i("".slice), M = i("".charCodeAt), w = function(e3) {
        var t3 = f(e3, "number");
        return "bigint" == typeof t3 ? t3 : O(t3);
      }, O = function(e3) {
        var t3, n3, o3, r3, i2, u2, l2, a2, c2 = f(e3, "number");
        if (d(c2))
          throw S("Cannot convert a Symbol value to a number");
        if ("string" == typeof c2 && c2.length > 2) {
          if (c2 = b(c2), t3 = M(c2, 0), 43 === t3 || 45 === t3) {
            if (n3 = M(c2, 2), 88 === n3 || 120 === n3)
              return NaN;
          } else if (48 === t3) {
            switch (M(c2, 1)) {
              case 66:
              case 98:
                o3 = 2, r3 = 49;
                break;
              case 79:
              case 111:
                o3 = 8, r3 = 55;
                break;
              default:
                return +c2;
            }
            for (i2 = k(c2, 2), u2 = i2.length, l2 = 0; l2 < u2; l2++)
              if (a2 = M(i2, l2), a2 < 48 || a2 > r3)
                return NaN;
            return parseInt(i2, o3);
          }
        }
        return +c2;
      };
      if (u(y, !x(" 0o1") || !x("0b1") || x("+0x1"))) {
        for (var I, j = function(e3) {
          var t3 = arguments.length < 1 ? 0 : x(w(e3)), n3 = this;
          return s(C, n3) && v(function() {
            g(n3);
          }) ? c(Object(t3), n3, j) : t3;
        }, E = o2 ? p(x) : "MAX_VALUE,MIN_VALUE,NaN,NEGATIVE_INFINITY,POSITIVE_INFINITY,EPSILON,MAX_SAFE_INTEGER,MIN_SAFE_INTEGER,isFinite,isInteger,isNaN,isSafeInteger,parseFloat,parseInt,fromString,range".split(","), B = 0; E.length > B; B++)
          a(x, I = E[B]) && !a(j, I) && h(j, I, m(x, I));
        j.prototype = C, C.constructor = j, l(r2, y, j, { constructor: true });
      }
    }, 1539: (e2, t2, n2) => {
      var o2 = n2(1694), r2 = n2(8052), i = n2(288);
      o2 || r2(Object.prototype, "toString", i, { unsafe: true });
    }, 9714: (e2, t2, n2) => {
      var o2 = n2(6530).PROPER, r2 = n2(8052), i = n2(9670), u = n2(1340), l = n2(7293), a = n2(4706), c = "toString", s = RegExp.prototype, d = s[c], f = l(function() {
        return "/a/b" != d.call({ source: "a", flags: "b" });
      }), v = o2 && d.name != c;
      (f || v) && r2(RegExp.prototype, c, function() {
        var e3 = i(this), t3 = u(e3.source), n3 = u(a(e3));
        return "/" + t3 + "/" + n3;
      }, { unsafe: true });
    }, 2023: (e2, t2, n2) => {
      var o2 = n2(2109), r2 = n2(1702), i = n2(3929), u = n2(4488), l = n2(1340), a = n2(4964), c = r2("".indexOf);
      o2({ target: "String", proto: true, forced: !a("includes") }, { includes: function(e3) {
        return !!~c(l(u(this)), l(i(e3)), arguments.length > 1 ? arguments[1] : void 0);
      } });
    }, 6815: (e2, t2, n2) => {
      var o2 = n2(2109), r2 = n2(7854), i = n2(7152).setInterval;
      o2({ global: true, bind: true, forced: r2.setInterval !== i }, { setInterval: i });
    }, 8417: (e2, t2, n2) => {
      var o2 = n2(2109), r2 = n2(7854), i = n2(7152).setTimeout;
      o2({ global: true, bind: true, forced: r2.setTimeout !== i }, { setTimeout: i });
    }, 2564: (e2, t2, n2) => {
      n2(6815), n2(8417);
    }, 3744: (e2, t2) => {
      t2.Z = (e3, t3) => {
        const n2 = e3.__vccOpts || e3;
        for (const [o2, r2] of t3)
          n2[o2] = r2;
        return n2;
      };
    }, 7203: (t2) => {
      t2.exports = e;
    } }, n = {};
    function o(e2) {
      var r2 = n[e2];
      if (void 0 !== r2)
        return r2.exports;
      var i = n[e2] = { exports: {} };
      return t[e2](i, i.exports, o), i.exports;
    }
    (() => {
      o.d = (e2, t2) => {
        for (var n2 in t2)
          o.o(t2, n2) && !o.o(e2, n2) && Object.defineProperty(e2, n2, { enumerable: true, get: t2[n2] });
      };
    })(), (() => {
      o.g = function() {
        if ("object" === typeof globalThis)
          return globalThis;
        try {
          return this || new Function("return this")();
        } catch (e2) {
          if ("object" === typeof window)
            return window;
        }
      }();
    })(), (() => {
      o.o = (e2, t2) => Object.prototype.hasOwnProperty.call(e2, t2);
    })(), (() => {
      o.r = (e2) => {
        "undefined" !== typeof Symbol && Symbol.toStringTag && Object.defineProperty(e2, Symbol.toStringTag, { value: "Module" }), Object.defineProperty(e2, "__esModule", { value: true });
      };
    })(), (() => {
      o.p = "";
    })();
    var r = {};
    return (() => {
      if (o.r(r), o.d(r, { ContextMenu: () => ae, ContextMenuGroup: () => fe, ContextMenuItem: () => U, ContextMenuSeparator: () => Q, MenuBar: () => Pe, default: () => Ne }), "undefined" !== typeof window) {
        var e2 = window.document.currentScript, t2 = e2 && e2.src.match(/(.+\/)[^/]+\.js(\?.*)?$/);
        t2 && (o.p = t2[1]);
      }
      var n2 = o(7203), i = null;
      function u(e3) {
        i && a(), i = e3;
      }
      function l(e3) {
        e3 === i && (i = null);
      }
      function a() {
        i && (i.closeMenu(), i = null);
      }
      o(6647), o(3710), o(1539), o(9714);
      var c = { defaultDirection: "br", defaultMinWidth: 100, defaultMaxWidth: 600, defaultZindex: 100, defaultAdjustPadding: { x: 0, y: 10 } };
      function s(e3, t3) {
        var n3 = e3.offsetTop;
        return null != e3.offsetParent && e3.offsetParent != t3 && (n3 -= e3.offsetParent.scrollTop, n3 += s(e3.offsetParent, t3)), n3;
      }
      function d(e3, t3) {
        var n3 = e3.offsetLeft;
        return null != e3.offsetParent && e3.offsetParent != t3 && (n3 -= e3.offsetParent.scrollLeft, n3 += d(e3.offsetParent, t3)), n3;
      }
      function f(e3, t3, n3, o2) {
        return { x: d(e3, o2) + t3, y: s(e3, o2) + n3 };
      }
      var v = "mx-menu-default-container", p = "mx-menu-container-", m = 0;
      function h(e3) {
        var t3 = e3.getContainer, n3 = e3.zIndex;
        if (t3) {
          var o2 = "function" === typeof t3 ? t3() : t3;
          if (o2) {
            var r2 = o2.getAttribute("id");
            return r2 || (r2 = p + m++, o2.setAttribute("id", r2)), o2.style.zIndex = (null === n3 || void 0 === n3 ? void 0 : n3.toString()) || c.defaultZindex.toString(), { eleId: r2, container: o2, isNew: false };
          }
        }
        var i2 = document.getElementById(v);
        return i2 || (i2 = document.createElement("div"), i2.setAttribute("id", v), i2.setAttribute("class", "mx-menu-ghost-host fullscreen"), document.body.appendChild(i2)), i2.style.zIndex = (null === n3 || void 0 === n3 ? void 0 : n3.toString()) || c.defaultZindex.toString(), { eleId: v, container: i2, isNew: true };
      }
      function g(e3) {
        return "number" === typeof e3 ? "".concat(e3, "px") : e3;
      }
      var b = (0, n2.defineComponent)({ props: { vnode: { type: [Object, Function], default: null }, data: { type: Object, default: null } }, setup: function(e3) {
        var t3 = (0, n2.toRefs)(e3), o2 = t3.vnode, r2 = t3.data;
        return function() {
          return "function" === typeof o2.value ? o2.value(r2.value) : o2.value;
        };
      } });
      function y(e3, t3, n3) {
        return t3 in e3 ? Object.defineProperty(e3, t3, { value: n3, enumerable: true, configurable: true, writable: true }) : e3[t3] = n3, e3;
      }
      function x(e3, t3) {
        var n3 = Object.keys(e3);
        if (Object.getOwnPropertySymbols) {
          var o2 = Object.getOwnPropertySymbols(e3);
          t3 && (o2 = o2.filter(function(t4) {
            return Object.getOwnPropertyDescriptor(e3, t4).enumerable;
          })), n3.push.apply(n3, o2);
        }
        return n3;
      }
      function C(e3) {
        for (var t3 = 1; t3 < arguments.length; t3++) {
          var n3 = null != arguments[t3] ? arguments[t3] : {};
          t3 % 2 ? x(Object(n3), true).forEach(function(t4) {
            y(e3, t4, n3[t4]);
          }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e3, Object.getOwnPropertyDescriptors(n3)) : x(Object(n3)).forEach(function(t4) {
            Object.defineProperty(e3, t4, Object.getOwnPropertyDescriptor(n3, t4));
          });
        }
        return e3;
      }
      o(2564);
      var S = { class: "mx-context-menu-scroll", ref: "scroll" };
      function k(e3, t3, o2, r2, i2, u2) {
        var l2 = (0, n2.resolveComponent)("ContextMenuSeparator"), a2 = (0, n2.resolveComponent)("ContextSubMenu", true), c2 = (0, n2.resolveComponent)("ContextMenuItem"), s2 = (0, n2.resolveComponent)("ContextMenuIconRight");
        return (0, n2.openBlock)(), (0, n2.createElementBlock)("div", { class: (0, n2.normalizeClass)("mx-context-menu " + (e3.options.customClass ? e3.options.customClass : "") + " " + e3.globalTheme), style: (0, n2.normalizeStyle)({ maxWidth: e3.maxWidth ? e3.solveNumberOrStringSize(e3.maxWidth) : "".concat(e3.constOptions.defaultMaxWidth, "px"), minWidth: e3.minWidth ? e3.solveNumberOrStringSize(e3.minWidth) : "".concat(e3.constOptions.defaultMinWidth, "px"), maxHeight: e3.overflow && e3.maxHeight > 0 ? "".concat(e3.maxHeight, "px") : void 0, zIndex: e3.zIndex, left: "".concat(e3.position.x, "px"), top: "".concat(e3.position.y, "px") }), "data-type": "ContextSubMenu", onClick: t3[2] || (t3[2] = function() {
          return e3.onSubMenuBodyClick && e3.onSubMenuBodyClick.apply(e3, arguments);
        }) }, [(0, n2.createElementVNode)("div", { class: "mx-context-menu-items", ref: "menu", style: (0, n2.normalizeStyle)({ top: "".concat(e3.scrollValue, "px") }) }, [(0, n2.renderSlot)(e3.$slots, "default", {}, function() {
          return [((0, n2.openBlock)(true), (0, n2.createElementBlock)(n2.Fragment, null, (0, n2.renderList)(e3.items, function(t4, o3) {
            return (0, n2.openBlock)(), (0, n2.createElementBlock)(n2.Fragment, { key: o3 }, [true !== t4.hidden && "up" === t4.divided ? ((0, n2.openBlock)(), (0, n2.createBlock)(l2, { key: 0 })) : (0, n2.createCommentVNode)("", true), true !== t4.hidden && "self" === t4.divided ? ((0, n2.openBlock)(), (0, n2.createBlock)(l2, { key: 1 })) : ((0, n2.openBlock)(), (0, n2.createBlock)(c2, { key: 2, clickHandler: t4.onClick ? function(e4) {
              return t4.onClick(e4);
            } : void 0, disabled: t4.disabled, hidden: t4.hidden, icon: t4.icon, iconFontClass: t4.iconFontClass, svgIcon: t4.svgIcon, svgProps: t4.svgProps, label: t4.label, customRender: t4.customRender, customClass: t4.customClass, checked: t4.checked, shortcut: t4.shortcut, clickClose: t4.clickClose, clickableWhenHasChildren: t4.clickableWhenHasChildren, preserveIconWidth: void 0 !== t4.preserveIconWidth ? t4.preserveIconWidth : e3.options.preserveIconWidth, showRightArrow: t4.children && t4.children.length > 0, hasChildren: t4.children && t4.children.length > 0, rawMenuItem: t4, onSubMenuOpen: t4.onSubMenuOpen, onSubMenuClose: t4.onSubMenuClose }, (0, n2.createSlots)({ _: 2 }, [t4.children && t4.children.length > 0 ? { name: "submenu", fn: (0, n2.withCtx)(function() {
              return [(0, n2.createVNode)(a2, { items: t4.children, maxWidth: t4.maxWidth, minWidth: t4.minWidth, adjustPosition: void 0 !== t4.adjustSubMenuPosition ? t4.adjustSubMenuPosition : e3.options.adjustPosition, direction: void 0 !== t4.direction ? t4.direction : e3.options.direction }, null, 8, ["items", "maxWidth", "minWidth", "adjustPosition", "direction"])];
            }), key: "0" } : void 0]), 1032, ["clickHandler", "disabled", "hidden", "icon", "iconFontClass", "svgIcon", "svgProps", "label", "customRender", "customClass", "checked", "shortcut", "clickClose", "clickableWhenHasChildren", "preserveIconWidth", "showRightArrow", "hasChildren", "rawMenuItem", "onSubMenuOpen", "onSubMenuClose"])), true === t4.hidden || "down" !== t4.divided && true !== t4.divided ? (0, n2.createCommentVNode)("", true) : ((0, n2.openBlock)(), (0, n2.createBlock)(l2, { key: 3 }))], 64);
          }), 128))];
        })], 4), (0, n2.createElementVNode)("div", S, [(0, n2.withDirectives)((0, n2.createElementVNode)("div", { class: "mx-context-menu-updown mx-context-no-clickable up", onClick: t3[0] || (t3[0] = function(t4) {
          return e3.onScroll(false);
        }) }, [(0, n2.createVNode)(s2)], 512), [[n2.vShow, e3.overflow && e3.scrollValue < 0]]), (0, n2.withDirectives)((0, n2.createElementVNode)("div", { class: "mx-context-menu-updown mx-context-no-clickable down", onClick: t3[1] || (t3[1] = function(t4) {
          return e3.onScroll(true);
        }) }, [(0, n2.createVNode)(s2)], 512), [[n2.vShow, e3.overflow && e3.scrollValue > -e3.scrollHeight]])], 512)], 6);
      }
      o(9653), o(2772), o(9554), o(561), o(6699), o(2023);
      var M = { key: 0, class: "mx-context-menu-item-wrapper", ref: "menuItemRef", "data-type": "ContextMenuItem" }, w = { class: "mx-item-row" }, O = ["xlink:href"], I = { key: 1, class: "label" }, j = { class: "mx-item-row" }, E = { class: "mx-shortcut" };
      function B(e3, t3, o2, r2, i2, u2) {
        var l2 = (0, n2.resolveComponent)("VNodeRender"), a2 = (0, n2.resolveComponent)("ContextMenuIconCheck"), c2 = (0, n2.resolveComponent)("ContextMenuIconRight");
        return e3.hidden ? (0, n2.createCommentVNode)("", true) : ((0, n2.openBlock)(), (0, n2.createElementBlock)("div", M, [e3.globalHasSlot("itemRender") ? ((0, n2.openBlock)(), (0, n2.createBlock)(l2, { key: 0, vnode: function() {
          return e3.globalRenderSlot("itemRender", e3.getItemDataForChildren());
        } }, null, 8, ["vnode"])) : e3.customRender ? ((0, n2.openBlock)(), (0, n2.createBlock)(l2, { key: 1, vnode: e3.customRender, data: e3.getItemDataForChildren() }, null, 8, ["vnode", "data"])) : ((0, n2.openBlock)(), (0, n2.createElementBlock)("div", { key: 2, class: (0, n2.normalizeClass)(["mx-context-menu-item", e3.disabled ? "disabled" : "", e3.keyBoardFocusMenu ? "keyboard-focus" : "", e3.customClass ? " " + e3.customClass : "", e3.showSubMenu ? "open" : ""]), onClick: t3[0] || (t3[0] = function() {
          return e3.onClick && e3.onClick.apply(e3, arguments);
        }), onMouseenter: t3[1] || (t3[1] = function() {
          return e3.onMouseEnter && e3.onMouseEnter.apply(e3, arguments);
        }) }, [(0, n2.renderSlot)(e3.$slots, "default", {}, function() {
          return [(0, n2.createElementVNode)("div", w, [(0, n2.createElementVNode)("div", { class: (0, n2.normalizeClass)(["mx-icon-placeholder", e3.preserveIconWidth ? "preserve-width" : ""]) }, [(0, n2.renderSlot)(e3.$slots, "icon", {}, function() {
            return [e3.globalHasSlot("itemIconRender") ? ((0, n2.openBlock)(), (0, n2.createBlock)(l2, { key: 0, vnode: function() {
              return e3.globalRenderSlot("itemIconRender", e3.getItemDataForChildren());
            } }, null, 8, ["vnode"])) : "string" === typeof e3.svgIcon && e3.svgIcon ? ((0, n2.openBlock)(), (0, n2.createElementBlock)("svg", (0, n2.mergeProps)({ key: 1, class: "icon svg" }, e3.svgProps), [(0, n2.createElementVNode)("use", { "xlink:href": e3.svgIcon }, null, 8, O)], 16)) : "string" !== typeof e3.icon ? ((0, n2.openBlock)(), (0, n2.createBlock)(l2, { key: 2, vnode: e3.icon, data: e3.icon }, null, 8, ["vnode", "data"])) : "string" === typeof e3.icon && "" !== e3.icon ? ((0, n2.openBlock)(), (0, n2.createElementBlock)("i", { key: 3, class: (0, n2.normalizeClass)(e3.icon + " icon " + e3.iconFontClass + " " + e3.globalIconFontClass) }, null, 2)) : (0, n2.createCommentVNode)("", true)];
          }), e3.checked ? (0, n2.renderSlot)(e3.$slots, "check", { key: 0 }, function() {
            return [e3.globalHasSlot("itemCheckRender") ? ((0, n2.openBlock)(), (0, n2.createBlock)(l2, { key: 0, vnode: function() {
              return e3.globalRenderSlot("itemCheckRender", e3.getItemDataForChildren());
            } }, null, 8, ["vnode"])) : (0, n2.createCommentVNode)("", true), (0, n2.createVNode)(a2)];
          }) : (0, n2.createCommentVNode)("", true)], 2), (0, n2.renderSlot)(e3.$slots, "label", {}, function() {
            return [e3.globalHasSlot("itemLabelRender") ? ((0, n2.openBlock)(), (0, n2.createBlock)(l2, { key: 0, vnode: function() {
              return e3.globalRenderSlot("itemLabelRender", e3.getItemDataForChildren());
            } }, null, 8, ["vnode"])) : "string" === typeof e3.label ? ((0, n2.openBlock)(), (0, n2.createElementBlock)("span", I, (0, n2.toDisplayString)(e3.label), 1)) : ((0, n2.openBlock)(), (0, n2.createBlock)(l2, { key: 2, vnode: e3.label, data: e3.label }, null, 8, ["vnode", "data"]))];
          })]), (0, n2.createElementVNode)("div", j, [e3.shortcut ? (0, n2.renderSlot)(e3.$slots, "shortcut", { key: 0 }, function() {
            return [e3.globalHasSlot("itemShortcutRender") ? ((0, n2.openBlock)(), (0, n2.createBlock)(l2, { key: 0, vnode: function() {
              return e3.globalRenderSlot("itemShortcutRender", e3.getItemDataForChildren());
            } }, null, 8, ["vnode"])) : (0, n2.createCommentVNode)("", true), (0, n2.createElementVNode)("span", E, (0, n2.toDisplayString)(e3.shortcut), 1)];
          }) : (0, n2.createCommentVNode)("", true), e3.showRightArrow ? (0, n2.renderSlot)(e3.$slots, "rightArrow", { key: 1 }, function() {
            return [e3.globalHasSlot("itemRightArrowRender") ? ((0, n2.openBlock)(), (0, n2.createBlock)(l2, { key: 0, vnode: function() {
              return e3.globalRenderSlot("itemRightArrowRender", e3.getItemDataForChildren());
            } }, null, 8, ["vnode"])) : (0, n2.createCommentVNode)("", true), (0, n2.createVNode)(c2)];
          }) : (0, n2.createCommentVNode)("", true)])];
        })], 34)), e3.showSubMenu ? (0, n2.renderSlot)(e3.$slots, "submenu", { key: 3 }) : (0, n2.createCommentVNode)("", true)], 512));
      }
      var P = { class: "mx-checked-mark", "aria-hidden": "true", viewBox: "0 0 1024 1024" }, R = (0, n2.createElementVNode)("path", { d: "M129.3,428.6L52,512l345,372.5l575-620.8l-69.5-75L400.4,718.2L129.3,428.6z" }, null, -1), N = [R];
      function F(e3, t3) {
        return (0, n2.openBlock)(), (0, n2.createElementBlock)("svg", P, N);
      }
      var A = o(3744);
      const T = {}, W = (0, A.Z)(T, [["render", F]]), H = W;
      var L = { class: "mx-right-arrow", "aria-hidden": "true", viewBox: "0 0 1024 1024" }, V = (0, n2.createElementVNode)("path", { d: "M307.018 49.445c11.517 0 23.032 4.394 31.819 13.18L756.404 480.18c8.439 8.438 13.181 19.885 13.181 31.82s-4.741 23.38-13.181 31.82L338.838 961.376c-17.574 17.573-46.065 17.573-63.64-0.001-17.573-17.573-17.573-46.065 0.001-63.64L660.944 512 275.198 126.265c-17.574-17.573-17.574-46.066-0.001-63.64C283.985 53.839 295.501 49.445 307.018 49.445z" }, null, -1), D = [V];
      function z(e3, t3) {
        return (0, n2.openBlock)(), (0, n2.createElementBlock)("svg", L, D);
      }
      const _ = {}, $ = (0, A.Z)(_, [["render", z]]), Z = $, G = (0, n2.defineComponent)({ name: "ContextMenuItem", components: { VNodeRender: b, ContextMenuIconCheck: H, ContextMenuIconRight: Z }, props: { disabled: { type: Boolean, default: false }, hidden: { type: Boolean, default: false }, customRender: { type: Function, default: null }, customClass: { type: String, default: "" }, clickHandler: { type: Function, default: null }, label: { type: [String, Object, Function], default: "" }, icon: { type: [String, Object, Function], default: "" }, iconFontClass: { type: String, default: "iconfont" }, checked: { type: Boolean, default: false }, shortcut: { type: String, default: "" }, svgIcon: { type: String, default: "" }, svgProps: { type: Object, default: null }, preserveIconWidth: { type: Boolean, default: true }, showRightArrow: { type: Boolean, default: false }, hasChildren: { type: Boolean, default: false }, clickClose: { type: Boolean, default: true }, clickableWhenHasChildren: { type: Boolean, default: false }, rawMenuItem: { type: Object, default: void 0 } }, emits: ["click", "subMenuOpen", "subMenuClose"], setup: function(e3, t3) {
        var o2 = (0, n2.toRefs)(e3), r2 = o2.clickHandler, i2 = o2.clickClose, u2 = o2.clickableWhenHasChildren, l2 = o2.disabled, a2 = o2.hidden, c2 = o2.label, s2 = o2.icon, d2 = o2.iconFontClass, f2 = o2.showRightArrow, v2 = o2.shortcut, p2 = o2.hasChildren, m2 = (0, n2.ref)(false), h2 = (0, n2.ref)(false), g2 = (0, n2.ref)(), b2 = (0, n2.inject)("globalHasSlot"), y2 = (0, n2.inject)("globalRenderSlot"), x2 = (0, n2.inject)("globalTheme"), C2 = (0, n2.inject)("globalIconFontClass"), S2 = (0, n2.inject)("globalClickCloseClassName"), k2 = (0, n2.inject)("globalIgnoreClickClassName"), M2 = (0, n2.inject)("globalCloseMenu"), w2 = (0, n2.inject)("menuContext"), O2 = { showSubMenu: function() {
          return m2.value ? (w2.markActiveMenuItem(O2, true), true) : !!p2.value && (j2(), true);
        }, isDisabledOrHidden: function() {
          return l2.value || a2.value;
        }, getElement: function() {
          return g2.value;
        }, focus: function() {
          return h2.value = true;
        }, blur: function() {
          return h2.value = false;
        }, click: I2 };
        function I2(n3) {
          if (!l2.value) {
            if (n3) {
              var o3 = n3.target;
              if (o3.classList.contains("mx-context-no-clickable"))
                return;
              if (k2 && o3.classList.contains(k2))
                return;
              if (S2 && o3.classList.contains(S2))
                return n3.stopPropagation(), void M2(e3.rawMenuItem);
            }
            p2.value ? u2.value ? ("function" === typeof r2.value && r2.value(n3), t3.emit("click", n3)) : m2.value || j2() : ("function" === typeof r2.value && r2.value(n3), t3.emit("click", n3), i2.value && M2(e3.rawMenuItem));
          }
        }
        function j2(e4) {
          h2.value = false, w2.checkCloseOtherSubMenuTimeOut() || w2.closeOtherSubMenu(), l2.value || (w2.markActiveMenuItem(O2), p2.value && (e4 || w2.markThisOpenedByKeyBoard(), w2.addOpenedSubMenu(function() {
            h2.value = false, m2.value = false, t3.emit("subMenuClose");
          }), m2.value = true, t3.emit("subMenuOpen")));
        }
        return (0, n2.onMounted)(function() {
          w2.isMenuItemDataCollectedFlag() ? (0, n2.nextTick)(function() {
            var e4 = 0, t4 = w2.getElement();
            if (t4)
              for (var n3 = 0, o3 = 0; o3 < t4.children.length; o3++) {
                var r3 = t4.children[o3];
                if ("ContextMenuItem" === r3.getAttribute("data-type")) {
                  if (r3 === g2.value) {
                    e4 = n3;
                    break;
                  }
                  n3++;
                }
              }
            w2.addChildMenuItem(O2, e4);
          }) : w2.addChildMenuItem(O2);
        }), (0, n2.onBeforeUnmount)(function() {
          w2.removeChildMenuItem(O2);
        }), { getItemDataForChildren: function() {
          return { disabled: l2.value, label: c2.value, icon: s2.value, iconFontClass: d2.value, showRightArrow: f2.value, clickClose: i2.value, clickableWhenHasChildren: u2.value, shortcut: v2.value, theme: x2, isOpen: m2, hasChildren: p2, onClick: I2, onMouseEnter: j2, closeMenu: M2 };
        }, showSubMenu: m2, keyBoardFocusMenu: h2, menuItemRef: g2, globalHasSlot: b2, globalRenderSlot: y2, globalIconFontClass: C2, onMouseEnter: j2, onClick: I2 };
      } }), K = (0, A.Z)(G, [["render", B]]), U = K;
      var X = { key: 1, class: "mx-context-menu-item-sperator mx-context-no-clickable" };
      function Y(e3, t3, o2, r2, i2, u2) {
        var l2 = (0, n2.resolveComponent)("VNodeRender");
        return e3.globalHasSlot("separatorRender") ? ((0, n2.openBlock)(), (0, n2.createBlock)(l2, { key: 0, vnode: function() {
          return e3.globalRenderSlot("separatorRender", {});
        } }, null, 8, ["vnode"])) : ((0, n2.openBlock)(), (0, n2.createElementBlock)("div", X));
      }
      const q = (0, n2.defineComponent)({ name: "ContextMenuSperator", components: { VNodeRender: b }, setup: function() {
        var e3 = (0, n2.inject)("globalHasSlot"), t3 = (0, n2.inject)("globalRenderSlot");
        return { globalHasSlot: e3, globalRenderSlot: t3 };
      } }), J = (0, A.Z)(q, [["render", Y]]), Q = J, ee = (0, n2.defineComponent)({ name: "ContextSubMenu", components: { ContextMenuItem: U, ContextMenuSeparator: Q, ContextMenuIconRight: Z }, props: { items: { type: Object, default: null }, maxWidth: { type: [String, Number], default: 0 }, minWidth: { type: [String, Number], default: 0 }, adjustPosition: { type: Boolean, default: true }, direction: { type: String, default: "br" } }, setup: function(e3) {
        var t3 = (0, n2.inject)("menuContext"), o2 = (0, n2.inject)("globalOptions"), r2 = (0, n2.inject)("globalHasSlot"), i2 = (0, n2.inject)("globalRenderSlot"), u2 = (0, n2.inject)("globalTheme"), l2 = t3.zIndex, a2 = t3.getParentWidth, f2 = t3.getParentHeight, v2 = (0, n2.toRefs)(e3), p2 = v2.adjustPosition, m2 = (0, n2.ref)(), h2 = (0, n2.ref)(), b2 = [], y2 = (0, n2.inject)("globalSetCurrentSubMenu"), x2 = [], C2 = null, S2 = 0;
        function k2() {
          C2 && C2.blur();
        }
        function M2(e4, t4) {
          if (e4) {
            for (var n3 = void 0 !== t4 ? t4 : 0; n3 < x2.length; n3++)
              if (!x2[n3].isDisabledOrHidden()) {
                w2(n3);
                break;
              }
          } else
            for (var o3 = void 0 !== t4 ? t4 : x2.length - 1; o3 >= 0; o3--)
              if (!x2[o3].isDisabledOrHidden()) {
                w2(o3);
                break;
              }
        }
        function w2(e4) {
          if (C2 && k2(), void 0 !== e4 && (C2 = x2[Math.max(0, Math.min(e4, x2.length - 1))]), C2 && (C2.focus(), F2.value)) {
            var t4 = C2.getElement();
            t4 && (P2.value = Math.min(Math.max(-R2.value, -t4.offsetTop - t4.offsetHeight + T2.value), 0));
          }
        }
        function O2() {
          y2(I2);
        }
        var I2 = { isTopLevel: function() {
          return null === t3.getParentContext();
        }, closeSelfAndActiveParent: function() {
          var e4 = B2.getParentContext();
          if (e4) {
            e4.closeOtherSubMenu();
            var t4 = e4.getSubMenuInstanceContext();
            if (t4)
              return t4.focusCurrentItem(), true;
          }
          return false;
        }, closeCurrentSubMenu: function() {
          var e4;
          return null === (e4 = B2.getParentContext()) || void 0 === e4 ? void 0 : e4.closeOtherSubMenu();
        }, moveCurrentItemFirst: function() {
          return M2(true);
        }, moveCurrentItemLast: function() {
          return M2(false);
        }, moveCurrentItemDown: function() {
          return M2(true, C2 ? x2.indexOf(C2) + 1 : 0);
        }, moveCurrentItemUp: function() {
          return M2(false, C2 ? x2.indexOf(C2) - 1 : 0);
        }, focusCurrentItem: function() {
          return w2();
        }, openCurrentItemSubMenu: function() {
          var e4;
          return !!C2 && (null === (e4 = C2) || void 0 === e4 ? void 0 : e4.showSubMenu());
        }, triggerCurrentItemClick: function(e4) {
          var t4;
          return null === (t4 = C2) || void 0 === t4 ? void 0 : t4.click(e4);
        } }, j2 = false, E2 = false, B2 = { zIndex: l2 + 1, container: t3.container, adjustPadding: o2.adjustPadding || c.defaultAdjustPadding, getParentWidth: function() {
          var e4;
          return (null === (e4 = m2.value) || void 0 === e4 ? void 0 : e4.offsetWidth) || 0;
        }, getParentHeight: function() {
          var e4;
          return (null === (e4 = m2.value) || void 0 === e4 ? void 0 : e4.offsetHeight) || 0;
        }, getParentX: function() {
          return A2.value.x;
        }, getParentY: function() {
          return A2.value.y;
        }, getParentAbsX: function() {
          return m2.value ? d(m2.value, t3.container) : 0;
        }, getParentAbsY: function() {
          return m2.value ? s(m2.value, t3.container) : 0;
        }, getPositon: function() {
          return [0, 0];
        }, addOpenedSubMenu: function(e4) {
          b2.push(e4);
        }, closeOtherSubMenu: function() {
          b2.forEach(function(e4) {
            return e4();
          }), b2.splice(0, b2.length), y2(I2);
        }, checkCloseOtherSubMenuTimeOut: function() {
          return !!S2 && (clearTimeout(S2), S2 = 0, true);
        }, closeOtherSubMenuWithTimeOut: function() {
          var e4 = this;
          S2 = setTimeout(function() {
            S2 = 0, e4.closeOtherSubMenu();
          }, 200);
        }, addChildMenuItem: function(e4, t4) {
          void 0 === t4 ? x2.push(e4) : x2.splice(t4, 0, e4);
        }, removeChildMenuItem: function(e4) {
          x2.splice(x2.indexOf(e4), 1);
        }, markActiveMenuItem: function(e4) {
          var t4 = arguments.length > 1 && void 0 !== arguments[1] && arguments[1];
          k2(), C2 = e4, t4 && w2();
        }, markThisOpenedByKeyBoard: function() {
          j2 = true;
        }, isOpenedByKeyBoardFlag: function() {
          return !!j2 && (j2 = false, true);
        }, isMenuItemDataCollectedFlag: function() {
          return E2;
        }, getElement: function() {
          return m2.value || null;
        }, getParentContext: function() {
          return t3;
        }, getSubMenuInstanceContext: function() {
          return I2;
        } };
        (0, n2.provide)("menuContext", B2);
        var P2 = (0, n2.ref)(0), R2 = (0, n2.ref)(0);
        function N2(e4) {
          P2.value = e4 ? Math.max(P2.value - 50, -R2.value) : Math.min(P2.value + 50, 0);
        }
        var F2 = (0, n2.ref)(false), A2 = (0, n2.ref)({ x: 0, y: 0 }), T2 = (0, n2.ref)(0);
        return (0, n2.onMounted)(function() {
          var r3, i3, u3, l3, c2 = t3.getPositon();
          A2.value = { x: null !== (r3 = null !== (i3 = c2[0]) && void 0 !== i3 ? i3 : o2.xOffset) && void 0 !== r3 ? r3 : 0, y: null !== (u3 = null !== (l3 = c2[1]) && void 0 !== l3 ? l3 : o2.yOffset) && void 0 !== u3 ? u3 : 0 }, y2(I2), (0, n2.nextTick)(function() {
            var o3 = m2.value;
            if (o3 && h2.value) {
              var r4, i4, u4, l4, c3, v3, g2 = t3.container, b3 = null !== (r4 = null === a2 || void 0 === a2 ? void 0 : a2()) && void 0 !== r4 ? r4 : 0, y3 = null !== (i4 = null === f2 || void 0 === f2 ? void 0 : f2()) && void 0 !== i4 ? i4 : 0, x3 = "number" === typeof t3.adjustPadding ? t3.adjustPadding : null !== (u4 = null === (l4 = t3.adjustPadding) || void 0 === l4 ? void 0 : l4.x) && void 0 !== u4 ? u4 : 0, C3 = "number" === typeof t3.adjustPadding ? t3.adjustPadding : null !== (c3 = null === (v3 = t3.adjustPadding) || void 0 === v3 ? void 0 : v3.y) && void 0 !== c3 ? c3 : 0, S3 = y3 > 0 ? C3 : 0, k3 = document.documentElement.scrollHeight, w3 = document.documentElement.scrollWidth, O3 = Math.min(w3, g2.offsetWidth), I3 = Math.min(k3, g2.offsetHeight), j3 = d(o3, g2), B3 = s(o3, g2);
              e3.direction.includes("l") ? A2.value.x -= o3.offsetWidth + x3 : e3.direction.includes("r") ? A2.value.x += b3 + x3 : (A2.value.x += b3 / 2, A2.value.x -= (o3.offsetWidth + x3) / 2), e3.direction.includes("t") ? A2.value.y -= o3.offsetHeight + 2 * C3 : e3.direction.includes("b") ? A2.value.y -= C3 : A2.value.y -= (o3.offsetHeight + C3) / 2, p2.value && (0, n2.nextTick)(function() {
                j3 = d(o3, g2), B3 = s(o3, g2);
                var e4 = j3 + o3.offsetWidth - O3, t4 = B3 + o3.offsetHeight - I3;
                if (R2.value = o3.offsetHeight - I3 - 2 * S3, F2.value = t4 > 0, e4 > 0) {
                  var n3 = b3 + o3.offsetWidth - x3, r5 = j3;
                  A2.value.x -= n3 > r5 ? r5 : n3;
                }
                if (F2.value) {
                  var i5 = t4, u5 = B3;
                  A2.value.y -= i5 > u5 ? u5 - S3 : i5 - 2 * S3, T2.value = I3 - 2 * S3;
                } else
                  T2.value = 0;
              });
            }
            null === o3 || void 0 === o3 || o3.focus({ preventScroll: true }), t3.isOpenedByKeyBoardFlag() && M2(true), E2 = true;
          });
        }), { menu: m2, scroll: h2, options: o2, zIndex: l2, constOptions: c, scrollValue: P2, overflow: F2, position: A2, scrollHeight: R2, maxHeight: T2, globalHasSlot: r2, globalRenderSlot: i2, globalTheme: u2, onScroll: N2, onSubMenuBodyClick: O2, solveNumberOrStringSize: g };
      } }), te = (0, A.Z)(ee, [["render", k]]), ne = te, oe = (0, n2.defineComponent)({ name: "ContextMenu", emits: ["update:show", "close"], props: { options: { type: Object, default: null }, show: { type: Boolean, default: false }, container: { type: Object, default: null }, isFullScreenContainer: { type: Boolean, default: true } }, setup: function(e3, t3) {
        var o2, r2, i2, a2, s2 = (0, n2.toRefs)(e3), d2 = s2.options, f2 = s2.show, v2 = s2.container;
        (0, n2.onMounted)(function() {
          f2 && m2();
        }), (0, n2.onBeforeUnmount)(function() {
          b2();
        }), (0, n2.watch)(f2, function(e4) {
          e4 ? m2() : b2();
        });
        var p2 = { closeMenu: h2 };
        function m2() {
          g2(), u(p2);
        }
        function h2(e4) {
          t3.emit("update:show", false), t3.emit("close", e4), l(p2);
        }
        function g2() {
          setTimeout(function() {
            document.addEventListener("click", k2, true), document.addEventListener("contextmenu", k2, true), document.addEventListener("scroll", S2, true), !e3.isFullScreenContainer && v2.value && v2.value.addEventListener("scroll", S2, true), false !== d2.value.keyboardControl && document.addEventListener("keydown", x2);
          }, 50);
        }
        function b2() {
          document.removeEventListener("contextmenu", k2, true), document.removeEventListener("click", k2, true), document.removeEventListener("scroll", S2, true), !e3.isFullScreenContainer && v2.value && v2.value.removeEventListener("scroll", S2, true), false !== d2.value.keyboardControl && document.removeEventListener("keydown", x2);
        }
        t3.expose({ closeMenu: h2 });
        var y2 = (0, n2.ref)();
        function x2(e4) {
          var t4, n3, o3, r3, i3, u2, l2, a3, c2 = true;
          switch (e4.key) {
            case "Escape":
              var s3, f3;
              if (false === (null === (s3 = y2.value) || void 0 === s3 ? void 0 : s3.isTopLevel()))
                null === (f3 = y2.value) || void 0 === f3 || f3.closeCurrentSubMenu();
              else
                h2();
              break;
            case "ArrowDown":
              null === (t4 = y2.value) || void 0 === t4 || t4.moveCurrentItemDown();
              break;
            case "ArrowUp":
              null === (n3 = y2.value) || void 0 === n3 || n3.moveCurrentItemUp();
              break;
            case "Home":
              null === (o3 = y2.value) || void 0 === o3 || o3.moveCurrentItemFirst();
              break;
            case "End":
              null === (r3 = y2.value) || void 0 === r3 || r3.moveCurrentItemLast();
              break;
            case "ArrowLeft":
              var v3, p3, m3;
              null !== (v3 = y2.value) && void 0 !== v3 && v3.closeSelfAndActiveParent() || null === (p3 = (m3 = d2.value).onKeyFocusMoveLeft) || void 0 === p3 || p3.call(m3);
              break;
            case "ArrowRight":
              null !== (i3 = y2.value) && void 0 !== i3 && i3.openCurrentItemSubMenu() || null === (u2 = (l2 = d2.value).onKeyFocusMoveRight) || void 0 === u2 || u2.call(l2);
              break;
            case "Enter":
              null === (a3 = y2.value) || void 0 === a3 || a3.triggerCurrentItemClick(e4);
              break;
            default:
              c2 = false;
              break;
          }
          c2 && y2.value && (e4.stopPropagation(), e4.preventDefault());
        }
        function S2() {
          false !== d2.value.closeWhenScroll && h2();
        }
        function k2(e4) {
          M2(e4.target);
        }
        function M2(e4) {
          while (e4) {
            if (e4.classList && e4.classList.contains("mx-menu-host"))
              return;
            e4 = e4.parentNode;
          }
          b2(), h2();
        }
        return (0, n2.provide)("globalSetCurrentSubMenu", function(e4) {
          return y2.value = e4;
        }), (0, n2.provide)("globalOptions", d2.value), (0, n2.provide)("globalCloseMenu", h2), (0, n2.provide)("globalTheme", (null === (o2 = d2.value) || void 0 === o2 ? void 0 : o2.theme) || "light"), (0, n2.provide)("globalIsFullScreenContainer", e3.isFullScreenContainer), (0, n2.provide)("globalClickCloseClassName", null === (r2 = d2.value) || void 0 === r2 ? void 0 : r2.clickCloseClassName), (0, n2.provide)("globalIgnoreClickClassName", null === (i2 = d2.value) || void 0 === i2 ? void 0 : i2.ignoreClickClassName), (0, n2.provide)("globalIconFontClass", (null === (a2 = d2.value) || void 0 === a2 ? void 0 : a2.iconFontClass) || "iconfont"), (0, n2.provide)("globalHasSlot", function(e4) {
          return void 0 !== t3.slots[e4];
        }), (0, n2.provide)("globalRenderSlot", function(e4, o3) {
          return (0, n2.renderSlot)(t3.slots, e4, C({}, o3), function() {
            return [(0, n2.h)("span", "Render slot failed")];
          }, false);
        }), (0, n2.provide)("menuContext", { zIndex: d2.value.zIndex || c.defaultZindex, container: v2.value, adjustPadding: { x: 0, y: 0 }, getParentAbsY: function() {
          return d2.value.x;
        }, getParentAbsX: function() {
          return d2.value.y;
        }, getParentX: function() {
          return 0;
        }, getParentY: function() {
          return 0;
        }, getParentWidth: function() {
          return 0;
        }, getParentHeight: function() {
          return 0;
        }, getPositon: function() {
          return [d2.value.x, d2.value.y];
        }, closeOtherSubMenuWithTimeOut: function() {
        }, checkCloseOtherSubMenuTimeOut: function() {
          return false;
        }, addOpenedSubMenu: function() {
        }, closeOtherSubMenu: function() {
        }, getParentContext: function() {
          return null;
        }, getSubMenuInstanceContext: function() {
          return null;
        }, getElement: function() {
          return null;
        }, addChildMenuItem: function() {
        }, removeChildMenuItem: function() {
        }, markActiveMenuItem: function() {
        }, markThisOpenedByKeyBoard: function() {
        }, isOpenedByKeyBoardFlag: function() {
          return false;
        }, isMenuItemDataCollectedFlag: function() {
          return false;
        } }), function() {
          var e4, o3;
          return f2.value ? [(0, n2.h)("div", { class: "mx-menu-ghost-host" }, [(0, n2.h)(ne, { class: "mx-menu-host", items: null === (e4 = d2.value) || void 0 === e4 ? void 0 : e4.items, adjustPosition: null === (o3 = d2.value) || void 0 === o3 ? void 0 : o3.adjustPosition, maxWidth: d2.value.maxWidth || c.defaultMaxWidth, minWidth: d2.value.minWidth || c.defaultMinWidth, direction: d2.value.direction || c.defaultDirection }, { default: t3.slots["default"] })])] : [];
        };
      } }), re = oe, ie = re, ue = (0, n2.defineComponent)({ name: "ContextMenu", emits: ["update:show", "close"], props: { options: { type: Object, default: null }, show: { type: Boolean, default: false } }, setup: function(e3, t3) {
        var o2 = (0, n2.toRefs)(e3), r2 = o2.options, i2 = o2.show;
        return t3.expose({ closeMenu: function() {
          return t3.emit("update:show", false);
        } }), function() {
          var e4 = h(r2.value), o3 = e4.isNew, u2 = e4.container, l2 = e4.eleId, a2 = i2.value ? [(0, n2.h)(ie, { options: r2, show: true, container: u2, isFullScreenContainer: !o3, "onUpdate:show": function(e5) {
            return t3.emit("update:show", e5);
          }, onClose: function(e5) {
            var n3, o4;
            t3.emit("update:show", false), t3.emit("close"), null === (n3 = (o4 = r2.value).onClose) || void 0 === n3 || n3.call(o4, e5);
          } }, t3.slots)] : [];
          return [(0, n2.h)(n2.Teleport, { to: "#".concat(l2) }, a2)];
        };
      } }), le = ue, ae = le;
      function ce(e3) {
        return ce = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(e4) {
          return typeof e4;
        } : function(e4) {
          return e4 && "function" == typeof Symbol && e4.constructor === Symbol && e4 !== Symbol.prototype ? "symbol" : typeof e4;
        }, ce(e3);
      }
      const se = (0, n2.defineComponent)({ name: "ContextMenuGroup", props: { disabled: { type: Boolean, default: false }, hidden: { type: Boolean, default: false }, clickHandler: { type: Function, default: null }, label: { type: String, default: "" }, icon: { type: String, default: "" }, iconFontClass: { type: String, default: "iconfont" }, checked: { type: Boolean, default: false }, shortcut: { type: String, default: "" }, svgIcon: { type: String, default: "" }, svgProps: { type: Object, default: null }, preserveIconWidth: { type: Boolean, default: true }, showRightArrow: { type: Boolean, default: false }, clickClose: { type: Boolean, default: true }, adjustSubMenuPosition: { type: Boolean, default: void 0 }, maxWidth: { type: [String, Number], default: 0 }, minWidth: { type: [String, Number], default: 0 } }, setup: function(e3, t3) {
        var o2 = (0, n2.inject)("globalOptions"), r2 = (0, n2.toRefs)(e3), i2 = r2.adjustSubMenuPosition, u2 = r2.maxWidth, l2 = r2.minWidth, a2 = "undefined" !== typeof i2.value ? i2.value : o2.adjustPosition;
        return function() {
          return (0, n2.h)(U, C(C({}, e3), {}, { showRightArrow: true, maxWidth: void 0, minWidth: void 0, adjustSubMenuPosition: void 0, hasChildren: void 0 !== ce(t3.slots["default"]) }), t3.slots["default"] ? { submenu: function() {
            return (0, n2.h)(ne, { maxWidth: u2.value, minWidth: l2.value, adjustPosition: a2 }, { default: t3.slots["default"] });
          } } : void 0);
        };
      } }), de = se, fe = de;
      function ve(e3, t3, o2, r2) {
        var i2 = (0, n2.h)(ie, { options: e3, show: true, container: t3, isFullScreenContainer: !o2, onClose: function(o3) {
          var r3;
          (0, n2.render)(null, t3), null === (r3 = e3.onClose) || void 0 === r3 || r3.call(e3, o3);
        } }, r2);
        return (0, n2.render)(i2, t3), i2.component;
      }
      function pe(e3, t3) {
        var n3 = h(e3), o2 = ve(e3, n3.container, n3.isNew, t3);
        return o2.exposed;
      }
      const me = { install: function(e3) {
        e3.config.globalProperties.$contextmenu = pe, e3.component("ContextMenu", ae), e3.component("ContextMenuItem", U), e3.component("ContextMenuGroup", fe), e3.component("ContextMenuSperator", Q), e3.component("ContextMenuSeparator", Q), e3.component("ContextSubMenu", ne);
      }, showContextMenu: function(e3, t3) {
        return pe(e3, t3);
      }, closeContextMenu: a, transformMenuPosition: f };
      var he = { key: 0, ref: "menuBarContent", class: "mx-menu-bar-content" }, ge = { key: 1, ref: "menuBarContent", class: "mx-menu-bar-content" }, be = ["onClick", "onMouseenter"];
      function ye(e3, t3, o2, r2, i2, u2) {
        var l2, a2 = (0, n2.resolveComponent)("MenuBarIconMenu");
        return (0, n2.openBlock)(), (0, n2.createElementBlock)("div", { class: (0, n2.normalizeClass)(["mx-menu-bar", null !== (l2 = e3.options.theme) && void 0 !== l2 ? l2 : "", e3.options.mini ? "mini" : ""]), onFocus: t3[1] || (t3[1] = function() {
          return e3.onFocus && e3.onFocus.apply(e3, arguments);
        }), onBlur: t3[2] || (t3[2] = function() {
          return e3.onBlur && e3.onBlur.apply(e3, arguments);
        }) }, [(0, n2.renderSlot)(e3.$slots, "prefix"), e3.options.mini ? ((0, n2.openBlock)(), (0, n2.createElementBlock)("div", he, [(0, n2.createElementVNode)("div", { class: "mx-menu-bar-item", onClick: t3[0] || (t3[0] = function(t4) {
          return e3.onItemClick(0, null);
        }) }, [(0, n2.createVNode)(a2)])], 512)) : ((0, n2.openBlock)(), (0, n2.createElementBlock)("div", ge, [((0, n2.openBlock)(true), (0, n2.createElementBlock)(n2.Fragment, null, (0, n2.renderList)(e3.menuItems, function(t4, o3) {
          return (0, n2.openBlock)(), (0, n2.createElementBlock)("div", { key: o3, class: (0, n2.normalizeClass)(["mx-menu-bar-item", t4 == e3.menuActive ? "active" : ""]), onClick: function(n3) {
            return e3.onItemClick(o3, t4);
          }, onMouseenter: function(n3) {
            return e3.onItemEnter(o3, t4);
          } }, (0, n2.toDisplayString)(t4.label), 43, be);
        }), 128))], 512)), (0, n2.renderSlot)(e3.$slots, "suffix")], 34);
      }
      var xe = { class: "mx-menu-bar-icon-menu", viewBox: "0 0 1024 1024", version: "1.1", xmlns: "http://www.w3.org/2000/svg", width: "200", height: "200" }, Ce = (0, n2.createElementVNode)("path", { d: "M133.310936 296.552327l757.206115 0c19.781623 0 35.950949-16.169326 35.950949-35.950949 0-19.781623-15.997312-35.950949-35.950949-35.950949L133.310936 224.650428c-19.781623 0-35.950949 16.169326-35.950949 35.950949C97.359987 280.383 113.529313 296.552327 133.310936 296.552327z" }, null, -1), Se = (0, n2.createElementVNode)("path", { d: "M890.51705 476.135058 133.310936 476.135058c-19.781623 0-35.950949 16.169326-35.950949 35.950949 0 19.781623 16.169326 35.950949 35.950949 35.950949l757.206115 0c19.781623 0 35.950949-16.169326 35.950949-35.950949C926.467999 492.304384 910.298673 476.135058 890.51705 476.135058z" }, null, -1), ke = (0, n2.createElementVNode)("path", { d: "M890.51705 727.447673 133.310936 727.447673c-19.781623 0-35.950949 15.997312-35.950949 35.950949s16.169326 35.950949 35.950949 35.950949l757.206115 0c19.781623 0 35.950949-15.997312 35.950949-35.950949S910.298673 727.447673 890.51705 727.447673z" }, null, -1), Me = [Ce, Se, ke];
      function we(e3, t3) {
        return (0, n2.openBlock)(), (0, n2.createElementBlock)("svg", xe, Me);
      }
      const Oe = {}, Ie = (0, A.Z)(Oe, [["render", we]]), je = Ie, Ee = (0, n2.defineComponent)({ name: "MenuBar", emits: [], props: { options: { type: Object, default: null } }, components: { MenuBarIconMenu: je }, setup: function(e3) {
        var t3 = (0, n2.ref)(), o2 = (0, n2.ref)(false), r2 = (0, n2.ref)([]), i2 = (0, n2.ref)(null);
        function u2() {
          o2.value = true;
        }
        function l2() {
          o2.value = false;
        }
        (0, n2.onMounted)(function() {
          r2.value = e3.options.items || [];
        }), (0, n2.watch)(function() {
          return e3.options;
        }, function() {
          r2.value = e3.options.items || [];
        });
        var a2 = null, c2 = -1;
        function f2() {
          c2 < r2.value.length - 1 ? c2++ : c2 = 0, p2(c2, r2.value[c2]);
        }
        function v2() {
          c2 > 0 ? c2-- : c2 = r2.value.length - 1, p2(c2, r2.value[c2]);
        }
        function p2(n3, r3) {
          var u3;
          if (c2 = n3, r3.children) {
            a2 && (a2.closeMenu(), a2 = null, o2.value = true), i2.value = r3;
            var l3 = null === (u3 = t3.value) || void 0 === u3 ? void 0 : u3.children[n3];
            l3 && (a2 = me.showContextMenu(C(C({}, e3.options), {}, { items: r3.children, x: d(l3), y: s(l3) + l3.offsetHeight, onKeyFocusMoveLeft: function() {
              v2();
            }, onKeyFocusMoveRight: function() {
              f2();
            }, onClose: function() {
              i2.value == r3 && (o2.value = false, i2.value = null);
            } })));
          }
        }
        function m2() {
          c2 = 0;
          var n3 = t3.value;
          n3 && (a2 = me.showContextMenu(C(C({}, e3.options), {}, { x: d(n3), y: s(n3) + n3.offsetHeight })));
        }
        function h2(e4, t4) {
          t4 ? (o2.value = true, p2(e4, t4), t4.onClick && (true === t4.clickableWhenHasChildren && t4.children && t4.children.length > 0 || !t4.children || 0 === t4.children.length) && t4.onClick()) : m2();
        }
        function g2(e4, t4) {
          o2.value && p2(e4, t4);
        }
        return { menuItems: r2, menuActive: i2, menuBarContent: t3, menuBarActive: o2, onFocus: u2, onBlur: l2, onItemClick: h2, onItemEnter: g2 };
      } }), Be = (0, A.Z)(Ee, [["render", ye]]), Pe = Be, Re = me, Ne = Re;
    })(), r;
  })());
})(vue3ContextMenu_umd_min);
const vue3ContextMenu = "";
export {
  getAugmentedNamespace as a,
  getDefaultExportFromCjs as g
};
