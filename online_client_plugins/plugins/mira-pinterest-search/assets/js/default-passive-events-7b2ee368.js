var e, t = ["scroll", "wheel", "touchstart", "touchmove", "touchenter", "touchend", "touchleave", "mouseout", "mouseleave", "mouseup", "mousedown", "mousemove", "mouseenter", "mousewheel", "mouseover"];
if (function() {
  var e2 = false;
  try {
    var t2 = Object.defineProperty({}, "passive", { get: function() {
      e2 = true;
    } });
    window.addEventListener("test", null, t2), window.removeEventListener("test", null, t2);
  } catch (e3) {
  }
  return e2;
}()) {
  var o = EventTarget.prototype.addEventListener;
  e = o, EventTarget.prototype.addEventListener = function(o2, r, n) {
    var s, a = "object" == typeof n && null !== n, i = a ? n.capture : n;
    (n = a ? function(e2) {
      var t2 = Object.getOwnPropertyDescriptor(e2, "passive");
      return t2 && true !== t2.writable && void 0 === t2.set ? Object.assign({}, e2) : e2;
    }(n) : {}).passive = void 0 !== (s = n.passive) ? s : -1 !== t.indexOf(o2) && true, n.capture = void 0 !== i && i, e.call(this, o2, r, n);
  }, EventTarget.prototype.addEventListener._original = e;
}
