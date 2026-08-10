var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
import { r as ref, m as watchEffect, o as openBlock, c as createElementBlock, a as createBaseVNode, P as normalizeStyle, u as unref, y as renderSlot, q as computed, D as createBlock, E as withCtx, L as createVNode, al as createTextVNode, O as toDisplayString, s as isRef, l as onMounted, aZ as onUnmounted, bI as withModifiers, G as normalizeClass, p as inject, J as reactive, n as onBeforeUnmount, b6 as resolveComponent, Q as withDirectives, S as vShow, aP as mergeModels, bt as useModel, b7 as resolveDirective, I as createCommentVNode, H as resolveDynamicComponent, k as watch, aR as onActivated, aU as onDeactivated, B as nextTick, b5 as renderList, F as Fragment, A as provide, b as readonly, bA as vModelText, aN as markRaw, af as createApp } from "./@vue-b2585a38.js";
import { E as ElButton, a as ElDialog, b as ElEmpty } from "./element-plus-7849e293.js";
import { C as ContextMenu } from "./@imengyu-b2fb178e.js";
import { i as interact } from "./interactjs-ef497c0a.js";
import "./default-passive-events-7b2ee368.js";
import { f as fe } from "./vue-advanced-cropper-9e38261e.js";
import { S as SlickItem, a as SlickList } from "./vue-slicksort-5757d818.js";
import { q as queue } from "./async-883073ae.js";
import { V as VueTippy } from "./vue-tippy-d6b9a0a4.js";
import { V as VueMousetrapPlugin } from "./vue-mousetrap-c79c0947.js";
import "./@element-plus-66022a55.js";
import "./@ctrl-ab5a38b7.js";
import "./@vueuse-0417a617.js";
import "./lodash-es-90affd7f.js";
import "./vue-7c9cf182.js";
import "./mousetrap-71492e72.js";
(function polyfill() {
  const relList = document.createElement("link").relList;
  if (relList && relList.supports && relList.supports("modulepreload")) {
    return;
  }
  for (const link of document.querySelectorAll('link[rel="modulepreload"]')) {
    processPreload(link);
  }
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") {
        continue;
      }
      for (const node of mutation.addedNodes) {
        if (node.tagName === "LINK" && node.rel === "modulepreload")
          processPreload(node);
      }
    }
  }).observe(document, { childList: true, subtree: true });
  function getFetchOpts(link) {
    const fetchOpts = {};
    if (link.integrity)
      fetchOpts.integrity = link.integrity;
    if (link.referrerPolicy)
      fetchOpts.referrerPolicy = link.referrerPolicy;
    if (link.crossOrigin === "use-credentials")
      fetchOpts.credentials = "include";
    else if (link.crossOrigin === "anonymous")
      fetchOpts.credentials = "omit";
    else
      fetchOpts.credentials = "same-origin";
    return fetchOpts;
  }
  function processPreload(link) {
    if (link.ep)
      return;
    link.ep = true;
    const fetchOpts = getFetchOpts(link);
    fetch(link.href, fetchOpts);
  }
})();
const ImageVue_vue_vue_type_style_index_0_lang = "";
const _hoisted_1$f = { class: "image-vue" };
const _hoisted_2$7 = ["src", "alt"];
const _sfc_main$i = {
  __name: "ImageVue",
  props: {
    width: {
      type: Number,
      required: true
    },
    height: {
      type: Number,
      required: true
    },
    src: {
      type: String,
      required: true
    },
    darkSrc: {
      type: String,
      required: false
    }
  },
  setup(__props) {
    const props = __props;
    const base_path = "./images/";
    const THEME_SUPPORT2 = {
      Auto: !eagle.app.isDarkColors(),
      LIGHT: true,
      LIGHTGRAY: true,
      GRAY: false,
      DARK: false,
      BLUE: false,
      PURPLE: false
    };
    const uri = ref("");
    watchEffect(() => {
      uri.value = THEME_SUPPORT2[eagle.app.theme] ? props.src : props.darkSrc ?? props.src;
    });
    eagle.onThemeChanged((theme) => {
      uri.value = THEME_SUPPORT2[theme] ? props.src : props.darkSrc ?? props.src;
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1$f, [
        createBaseVNode("img", {
          style: normalizeStyle({
            width: props.width + "px",
            height: props.height + "px"
          }),
          src: base_path + unref(uri),
          alt: unref(uri),
          loading: "lazy"
        }, null, 12, _hoisted_2$7),
        renderSlot(_ctx.$slots, "default")
      ]);
    };
  }
};
const WarningDialogVue_vue_vue_type_style_index_0_lang = "";
const _hoisted_1$e = { class: "dialog-container" };
const _hoisted_2$6 = { class: "main" };
const _hoisted_3$4 = ["innerHTML"];
const _hoisted_4$4 = ["innerHTML"];
const _hoisted_5$2 = { class: "action" };
const _sfc_main$h = {
  __name: "WarningDialogVue",
  props: {
    modelValue: {
      type: Boolean,
      default: false,
      required: true
    },
    text: {
      type: Object,
      default: () => ({
        title: "title",
        description: "description",
        cancel: "cancel",
        ok: "ok"
      })
    },
    closeOnClickModal: {
      type: Boolean,
      default: true
    }
  },
  emits: ["ok", "cancel", "update:modelValue"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const ok = () => {
      emit("ok");
      visible.value = false;
    };
    const cancel = () => {
      emit("cancel");
      visible.value = false;
    };
    const visible = computed({
      get: () => props.modelValue,
      set: (value) => {
        emit("update:modelValue", value);
      }
    });
    return (_ctx, _cache) => {
      const _component_ImageVue = _sfc_main$i;
      const _component_el_button = ElButton;
      const _component_el_dialog = ElDialog;
      return openBlock(), createBlock(_component_el_dialog, {
        class: "dialog-vue",
        modelValue: unref(visible),
        "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => isRef(visible) ? visible.value = $event : null),
        "show-close": false,
        "append-to-body": "",
        "align-center": "",
        onClose: cancel,
        "close-on-click-modal": props.closeOnClickModal
      }, {
        default: withCtx(() => [
          createBaseVNode("div", _hoisted_1$e, [
            createVNode(_component_ImageVue, {
              class: "icon-warning",
              width: "36",
              height: "36",
              src: "light/base/dialog-warning.png",
              darkSrc: "dark/base/dialog-warning.png"
            }),
            createBaseVNode("div", _hoisted_2$6, [
              createBaseVNode("div", {
                class: "title",
                innerHTML: props.text.title
              }, null, 8, _hoisted_3$4),
              createBaseVNode("div", {
                class: "description",
                innerHTML: props.text.description
              }, null, 8, _hoisted_4$4),
              createBaseVNode("div", _hoisted_5$2, [
                createVNode(_component_el_button, {
                  class: "cancel",
                  type: "",
                  onClick: cancel
                }, {
                  default: withCtx(() => [
                    createTextVNode(toDisplayString(props.text.cancel), 1)
                  ]),
                  _: 1
                }),
                createVNode(_component_el_button, {
                  class: "ok",
                  type: "primary",
                  onClick: ok
                }, {
                  default: withCtx(() => [
                    createTextVNode(toDisplayString(props.text.ok), 1)
                  ]),
                  _: 1
                })
              ])
            ])
          ])
        ]),
        _: 1
      }, 8, ["modelValue", "close-on-click-modal"]);
    };
  }
};
const BodyVue_vue_vue_type_style_index_0_lang = "";
const _export_sfc = (sfc, props) => {
  const target = sfc.__vccOpts || sfc;
  for (const [key, val] of props) {
    target[key] = val;
  }
  return target;
};
const _sfc_main$g = {};
const _hoisted_1$d = { class: "body-vue" };
function _sfc_render(_ctx, _cache) {
  return openBlock(), createElementBlock("div", _hoisted_1$d, [
    renderSlot(_ctx.$slots, "default")
  ]);
}
const __unplugin_components_8 = /* @__PURE__ */ _export_sfc(_sfc_main$g, [["render", _sfc_render]]);
const t = (s) => s == null ? '' : s;
const DropZoneVue_vue_vue_type_style_index_0_lang = "";
const _hoisted_1$c = { class: "tip" };
const _sfc_main$f = {
  __name: "DropZoneVue",
  props: {
    style: {
      type: Boolean,
      default: true
    }
  },
  emits: ["drop"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const active = ref(false);
    const onDrop = (e) => {
      setInactive();
      const files = [...e.dataTransfer.files];
      emit("drop", files);
    };
    function setActive() {
      active.value = true;
    }
    function setInactive() {
      active.value = false;
    }
    const events = ["dragenter", "dragover", "dragleave", "drop"];
    function preventDefaults(e) {
      e.preventDefault();
    }
    onMounted(() => {
      events.forEach((eventName) => {
        document.body.addEventListener(eventName, preventDefaults);
      });
    });
    onUnmounted(() => {
      events.forEach((eventName) => {
        document.body.removeEventListener(eventName, preventDefaults);
      });
    });
    return (_ctx, _cache) => {
      const _component_ImageVue = _sfc_main$i;
      return openBlock(), createElementBlock("div", {
        class: normalizeClass(["drop-zone-vue", {
          dropping: unref(active),
          "no-style": !props.style
        }]),
        onDragenter: withModifiers(setActive, ["prevent", "stop"])
      }, [
        renderSlot(_ctx.$slots, "default"),
        createBaseVNode("div", {
          class: "overlay",
          onDragleave: withModifiers(setInactive, ["prevent", "stop"]),
          onDrop: withModifiers(onDrop, ["prevent", "stop"])
        }, [
          createBaseVNode("div", _hoisted_1$c, [
            createVNode(_component_ImageVue, {
              width: "16",
              height: "16",
              src: "normal/base/ic-drop-zone-download.svg"
            }),
            createTextVNode(" " + toDisplayString(unref(t)("component.dropZone.tip")), 1)
          ])
        ], 32)
      ], 34);
    };
  }
};
function useContextMenu(items) {
  ContextMenu.showContextMenu({
    x: event.x,
    y: event.y,
    items
  });
}
const keyboard = (s) => {
  const data = [
    ["Ctrl", "⌘"],
    ["Alt", "⌥"],
    ["Shift", "⇧"]
  ];
  const symbols = [
    ["Right", "→"],
    ["Left", "←"],
    ["Up", "↑"],
    ["Down", "↓"]
  ];
  if (eagle.app.isMac) {
    for (let i of data) {
      s = s.replace(i[0], i[1]);
    }
  } else {
    for (let i of data) {
      s = s.replace(i[1], i[0]);
    }
  }
  for (let i of symbols) {
    s = s.replace(i[0], i[1]);
  }
  return s;
};
const ImageSearchResultWaitingVue_vue_vue_type_style_index_0_lang = "";
const _hoisted_1$b = { class: "waiting-img" };
const _sfc_main$e = {
  __name: "ImageSearchResultWaitingVue",
  setup(__props) {
    return (_ctx, _cache) => {
      const _component_ImageVue = _sfc_main$i;
      const _component_el_empty = ElEmpty;
      return openBlock(), createBlock(_component_el_empty, {
        class: "image-search-result-waiting-vue",
        description: unref(t)("main.search.title"),
        "image-size": 256
      }, {
        image: withCtx(() => [
          createBaseVNode("div", _hoisted_1$b, [
            createVNode(_component_ImageVue, {
              width: "256",
              height: "144",
              src: "light/state-waiting.png",
              darkSrc: "dark/state-waiting.png"
            }),
            createVNode(_component_ImageVue, {
              class: "loading",
              width: "16",
              height: "16",
              src: "light/state-waiting-loading.svg",
              darkSrc: "dark/state-waiting-loading.svg"
            })
          ])
        ]),
        default: withCtx(() => [
          createTextVNode(" " + toDisplayString(unref(t)("main.search.content")), 1)
        ]),
        _: 1
      }, 8, ["description"]);
    };
  }
};
const _hoisted_1$a = { style: { "margin-top": "8px" } };
const _sfc_main$d = {
  __name: "ImageSearchResultErrorVue",
  setup(__props) {
    const main2 = inject("main");
    const current = computed(() => main2.taskQueue.dataMap[main2.currentId]);
    const retry = async (task) => {
      try {
        eagle.log.info(`start searching #${task.id}: ${task.name}.${task.ext}`);
        await task.processing();
        let url = task.image.large.url;
        if (task.ext !== "jpg" || task.ext !== "jpeg") {
          url = await main2.convertPngToJpeg(url);
        }
        const result = await main2.search(url);
        result.forEach((item) => {
          item.saved = false;
        });
        await task.success(result);
      } catch (error) {
        eagle.log.error(`#${task.id} search error : ${error}`);
        await task.failed(error);
        throw error;
      } finally {
        eagle.log.info(`end searching #${task.id}`);
      }
    };
    return (_ctx, _cache) => {
      const _component_ImageVue = _sfc_main$i;
      const _component_el_button = ElButton;
      const _component_el_empty = ElEmpty;
      return unref(current).result.message.message === "Failed to fetch" ? (openBlock(), createBlock(_component_el_empty, {
        key: 0,
        description: unref(t)("main.connectError.title"),
        "image-size": 256
      }, {
        image: withCtx(() => [
          createVNode(_component_ImageVue, {
            width: "256",
            height: "144",
            src: "light/state-not-found.png",
            darkSrc: "dark/state-not-found.png"
          })
        ]),
        default: withCtx(() => [
          createTextVNode(" " + toDisplayString(unref(t)("main.connectError.content")) + " ", 1),
          createBaseVNode("div", _hoisted_1$a, [
            createVNode(_component_el_button, {
              onClick: _cache[0] || (_cache[0] = ($event) => retry(unref(current)))
            }, {
              default: withCtx(() => [
                createTextVNode(toDisplayString(unref(t)("main.connectError.retry")), 1)
              ]),
              _: 1
            })
          ])
        ]),
        _: 1
      }, 8, ["description"])) : (openBlock(), createBlock(_component_el_empty, {
        key: 1,
        description: unref(t)("main.noResult.title"),
        "image-size": 90
      }, {
        image: withCtx(() => [
          createVNode(_component_ImageVue, {
            width: "90",
            height: "86",
            src: "light/state-no-result.png",
            darkSrc: "dark/state-no-result.png"
          })
        ]),
        default: withCtx(() => [
          createTextVNode(" " + toDisplayString(unref(t)("main.noResult.content")), 1)
        ]),
        _: 1
      }, 8, ["description"]));
    };
  }
};
(() => {
  function styleInject(css2, ref2) {
    if (ref2 === void 0)
      ref2 = {};
    var insertAt = ref2.insertAt;
    if (!css2 || typeof document === "undefined")
      return;
    var head = document.head || document.getElementsByTagName("head")[0];
    var style = document.createElement("style");
    style.type = "text/css";
    if (insertAt === "top") {
      if (head.firstChild) {
        head.insertBefore(style, head.firstChild);
      } else {
        head.appendChild(style);
      }
    } else {
      head.appendChild(style);
    }
    if (style.styleSheet) {
      style.styleSheet.cssText = css2;
    } else {
      style.appendChild(document.createTextNode(css2));
    }
  }
  var css = "pinch-zoom {\ndisplay: block;overflow: hidden;\ntouch-action: none;\n--scale: 1;\n  --x: 0;\n  --y: 0;\n}\npinch-zoom > * {\n  transform: translate(var(--x), var(--y)) scale(var(--scale));\n  transform-origin: 0 0;\n  will-change: transform;\n}\n";
  styleInject(css);
  function getAbsoluteValue(value, max) {
    if (typeof value === "number")
      return value;
    if (value.trimRight().endsWith("%"))
      return max * parseFloat(value) / 100;
    return parseFloat(value);
  }
  let cachedSvg;
  function getSVG() {
    return cachedSvg || (cachedSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg"));
  }
  function createMatrix() {
    return getSVG().createSVGMatrix();
  }
  function createPoint() {
    return getSVG().createSVGPoint();
  }
  const containerAttr = "container";
  const minScaleAttr = "min-scale";
  const maxScaleAttr = "max-scale";
  const dragMoveAttr = "drag-move";
  const MIN_SCALE = 0.05;
  const MAX_SCALE = 8;
  class PinchZoom extends HTMLElement {
    constructor() {
      super();
      this._transform = createMatrix();
      new MutationObserver(() => {
        this._stageElChange();
      }).observe(this, {
        childList: true
      });
    }
    static get observedAttributes() {
      return [containerAttr, minScaleAttr, maxScaleAttr, dragMoveAttr];
    }
    attributeChangedCallback(name, oldValue, newValue) {
      if (name === containerAttr) {
        this.container.addEventListener("wheel", this._onWheel.bind(this), {
          passive: false
        });
      }
      if (name === minScaleAttr && this.scale < this.minScale) {
        this.setTransform({ scale: this.minScale });
      }
      if (name === maxScaleAttr && this.scale > this.maxScale) {
        this.setTransform({ scale: this.maxScale });
      }
    }
    set container(value) {
      this.setAttribute(containerAttr, value);
    }
    get container() {
      return document.querySelector(this.getAttribute(containerAttr)) || this;
    }
    set minScale(value) {
      this.setAttribute(minScaleAttr, String(value));
    }
    get minScale() {
      const attrValue = this.getAttribute(minScaleAttr);
      if (!attrValue)
        return MIN_SCALE;
      const value = parseFloat(attrValue);
      if (Number.isFinite(value))
        return Math.max(MIN_SCALE, value);
      return MIN_SCALE;
    }
    set maxScale(value) {
      this.setAttribute(maxScaleAttr, String(value));
    }
    get maxScale() {
      const attrValue = this.getAttribute(maxScaleAttr);
      if (!attrValue)
        return MAX_SCALE;
      const value = parseFloat(attrValue);
      if (Number.isFinite(value))
        return Math.min(MAX_SCALE, value);
      return MIN_SCALE;
    }
    set dragMove(value) {
      this.setAttribute(dragMoveAttr, String(value));
    }
    get dragMove() {
      const attrValue = this.getAttribute(dragMoveAttr);
      if (!attrValue)
        return false;
      return JSON.parse(attrValue);
    }
    connectedCallback() {
      this._stageElChange();
    }
    get x() {
      return this._transform.e;
    }
    get y() {
      return this._transform.f;
    }
    get scale() {
      return this._transform.a;
    }
    scaleTo(scale, opts = {}) {
      let { originX = 0, originY = 0 } = opts;
      const { relativeTo = "content", allowChangeEvent = false } = opts;
      const relativeToEl = relativeTo === "content" ? this._positioningEl : this;
      if (!relativeToEl || !this._positioningEl) {
        this.setTransform({ scale, allowChangeEvent });
        return;
      }
      const rect = relativeToEl.getBoundingClientRect();
      originX = getAbsoluteValue(originX, rect.width);
      originY = getAbsoluteValue(originY, rect.height);
      if (relativeTo === "content") {
        originX += this.x;
        originY += this.y;
      } else {
        const currentRect = this._positioningEl.getBoundingClientRect();
        originX -= currentRect.left;
        originY -= currentRect.top;
      }
      this._applyChange({
        allowChangeEvent,
        originX,
        originY,
        scaleDiff: scale / this.scale
      });
    }
    setTransform(opts = {}) {
      const { scale = this.scale, allowChangeEvent = false } = opts;
      let { x = this.x, y = this.y } = opts;
      if (!this._positioningEl) {
        this._updateTransform(scale, x, y, allowChangeEvent);
        return;
      }
      const thisBounds = this.getBoundingClientRect();
      const positioningElBounds = this._positioningEl.getBoundingClientRect();
      if (!thisBounds.width || !thisBounds.height) {
        this._updateTransform(scale, x, y, allowChangeEvent);
        return;
      }
      let topLeft = createPoint();
      topLeft.x = positioningElBounds.left - thisBounds.left;
      topLeft.y = positioningElBounds.top - thisBounds.top;
      let bottomRight = createPoint();
      bottomRight.x = positioningElBounds.width + topLeft.x;
      bottomRight.y = positioningElBounds.height + topLeft.y;
      const matrix = createMatrix().translate(x, y).scale(scale).multiply(this._transform.inverse());
      topLeft = topLeft.matrixTransform(matrix);
      bottomRight = bottomRight.matrixTransform(matrix);
      if (topLeft.x > thisBounds.width) {
        x += thisBounds.width - topLeft.x;
      } else if (bottomRight.x < 0) {
        x += -bottomRight.x;
      }
      if (topLeft.y > thisBounds.height) {
        y += thisBounds.height - topLeft.y;
      } else if (bottomRight.y < 0) {
        y += -bottomRight.y;
      }
      this._updateTransform(scale, x, y, allowChangeEvent);
    }
    _updateTransform(scale, x, y, allowChangeEvent) {
      if (scale > this.maxScale)
        return;
      if (scale < this.minScale)
        return;
      if (scale === this.scale && (event == null ? void 0 : event.metaKey))
        return;
      this._transform.e = x;
      this._transform.f = y;
      this._transform.d = this._transform.a = scale;
      this.style.setProperty("--x", this.x + "px");
      this.style.setProperty("--y", this.y + "px");
      this.style.setProperty("--scale", this.scale + "");
      if (allowChangeEvent) {
        const event2 = new Event("change", { bubbles: true });
        this.dispatchEvent(event2);
      }
    }
    _stageElChange() {
      this._positioningEl = void 0;
      if (this.children.length === 0)
        return;
      this._positioningEl = this.children[0];
      if (this.children.length > 1) {
        console.warn("<pinch-zoom> must not have more than one child.");
      }
      this.setTransform({ allowChangeEvent: true });
    }
    _onWheel(event2) {
      if (event2.metaKey || event2.ctrlKey || this.dragMove) {
        if (!this._positioningEl)
          return;
        const currentRect = this._positioningEl.getBoundingClientRect();
        const { deltaY } = event2;
        const divisor = 100;
        const scaleDiff = 1 - (deltaY > 0 ? 1 : -1) * Math.min(divisor / 2, Math.abs(deltaY)) / divisor;
        this._applyChange({
          scaleDiff,
          originX: event2.clientX - currentRect.left,
          originY: event2.clientY - currentRect.top,
          allowChangeEvent: true
        });
      }
    }
    _applyChange(opts = {}) {
      const {
        panX = 0,
        panY = 0,
        originX = 0,
        originY = 0,
        scaleDiff = 1,
        allowChangeEvent = false
      } = opts;
      const matrix = createMatrix().translate(panX, panY).translate(originX, originY).translate(this.x, this.y).scale(scaleDiff).translate(-originX, -originY).scale(this.scale);
      this.setTransform({
        allowChangeEvent,
        scale: Math.min(this.maxScale, Math.max(matrix.a, this.minScale)),
        x: matrix.e,
        y: matrix.f
      });
    }
  }
  customElements.define("pinch-zoom", PinchZoom);
})();
const PinchZoomVue_vue_vue_type_style_index_0_lang = "";
const _hoisted_1$9 = { class: "pinch-zoom-vue" };
const _hoisted_2$5 = { class: "pinch-zoom-container" };
const boundary = 100;
const _sfc_main$c = {
  __name: "PinchZoomVue",
  props: {
    container: {
      type: String,
      default: ".pinch-zoom-container"
    },
    fit: {
      type: Boolean,
      default: false
    },
    autoFit: {
      type: Boolean,
      default: false
    },
    dragMove: {
      type: Boolean,
      default: false
    }
  },
  setup(__props, { expose: __expose }) {
    const utils2 = window.__miraPinterestUtils;
    const props = __props;
    const pinchZoomEl = ref(null);
    const scaleStep = [0.05, 0.1, 0.25, 0.5, 1, 1.25, 1.5, 2, 3, 4, 8];
    const isReady = ref(false);
    const isTrust = ref(false);
    const offset = reactive({
      x: 0,
      y: 0,
      ratio: 1
    });
    const container = reactive({
      width: 0,
      height: 0
    });
    const child = reactive({
      width: 0,
      height: 0
    });
    const fit = () => {
      offset.ratio = Math.min(container.width / child.width, container.height / child.height);
      center();
      updateTransform();
    };
    const scale = async (ratio) => {
      offset.ratio = ratio;
      center();
      updateTransform();
    };
    const updateTransform = () => {
      pinchZoomEl.value.setTransform({
        x: offset.x,
        y: offset.y,
        scale: offset.ratio
      });
    };
    const getOffset = () => {
      offset.x = pinchZoomEl.value.x;
      offset.y = pinchZoomEl.value.y;
      offset.ratio = pinchZoomEl.value.scale;
    };
    const setOffset = (x, y, ratio) => {
      offset.x = x;
      offset.y = y;
      offset.ratio = ratio;
      updateTransform();
    };
    const resize = async () => {
      if (!pinchZoomEl.value)
        return;
      await utils2.time.imgLoad(pinchZoomEl.value.children);
      container.width = pinchZoomEl.value.clientWidth;
      container.height = pinchZoomEl.value.clientHeight;
      child.width = pinchZoomEl.value.firstElementChild.clientWidth;
      child.height = pinchZoomEl.value.firstElementChild.clientHeight;
      if (props.fit) {
        fit();
      } else if (props.autoFit) {
        if (child.width >= container.width || child.height >= container.height) {
          fit();
        } else {
          center();
          updateTransform();
        }
      } else {
        center();
        updateTransform();
      }
    };
    const center = () => {
      offset.x = (container.width - child.width * offset.ratio) / 2;
      offset.y = (container.height - child.height * offset.ratio) / 2;
    };
    const wheelEventHandle = async (event2) => {
      if (event2.metaKey || event2.ctrlKey || props.dragMove)
        getOffset();
      if (props.dragMove) {
        move(0, 0);
      } else {
        const divisor = 2;
        const deltaX = -1 * event2.deltaX / divisor;
        const deltaY = -1 * event2.deltaY / divisor;
        move(deltaX, deltaY);
      }
      await utils2.time.sleep(1);
      updateTransform();
    };
    const mousedownEventHandle = (event2) => {
      if (props.dragMove)
        document.querySelector(props.container).style.cursor = "grabbing";
      isTrust.value = true;
    };
    const mousemoveEventHandle = (event2) => {
      if (isTrust.value) {
        const deltaX = event2.movementX;
        const deltaY = event2.movementY;
        move(deltaX, deltaY);
      }
    };
    const mouseupEventHandle = (event2) => {
      if (props.dragMove)
        document.querySelector(props.container).style.cursor = "grab";
      isTrust.value = false;
    };
    const move = (x, y) => {
      offset.x += x;
      offset.y += y;
      if (container.width >= child.width * offset.ratio) {
        offset.x = Math.max(offset.x, 0);
        offset.x = Math.min(offset.x, container.width - child.width * offset.ratio);
      } else {
        offset.x = Math.min(offset.x, boundary);
        offset.x = Math.max(offset.x, container.width - child.width * offset.ratio - boundary);
      }
      if (container.height >= child.height * offset.ratio) {
        offset.y = Math.max(offset.y, 0);
        offset.y = Math.min(offset.y, container.height - child.height * offset.ratio);
      } else {
        offset.y = Math.min(offset.y, boundary);
        offset.y = Math.max(offset.y, container.height - child.height * offset.ratio - boundary);
      }
      updateTransform();
    };
    const scaleIn = () => {
      const ratio = scaleStep.find((e) => e > offset.ratio);
      if (!ratio)
        return;
      offset.ratio = ratio;
      center();
      updateTransform();
    };
    const scaleOut = () => {
      const ratio = scaleStep.findLast((e) => e < offset.ratio);
      if (!ratio)
        return;
      offset.ratio = ratio;
      center();
      updateTransform();
    };
    const view = async (x, y, width, height) => {
      const left = -1 * offset.x <= x * offset.ratio;
      const right = (x + width) * offset.ratio <= -1 * offset.x + container.width;
      const top = -1 * offset.y <= y * offset.ratio;
      const bottom = (y + height) * offset.ratio <= -1 * offset.y + container.height;
      if (top && right && bottom && left)
        return;
      offset.x = -1 * (x + width / 2) * offset.ratio + container.width / 2;
      offset.y = -1 * (y + height / 2) * offset.ratio + container.height / 2;
      offset.ratio = Math.min(
        container.width / width,
        container.height / height,
        scaleStep[scaleStep.length - 1]
      ) / 1.5;
      updateTransform();
    };
    const resizeObserver = new ResizeObserver(resize);
    const mutationObserver = new MutationObserver(resize);
    onMounted(async () => {
      interact("#scrollbar-vertical-thumb").styleCursor(false).draggable({
        lockAxis: "y",
        listeners: {
          move: (event2) => {
            const ratio = container.height / (child.height * offset.ratio);
            offset.y -= event2.dy / ratio;
            offset.y = Math.min(offset.y, boundary);
            offset.y = Math.max(
              offset.y,
              container.height - child.height * offset.ratio - boundary
            );
            updateTransform();
          }
        }
      });
      interact("#scrollbar-horizontal-thumb").styleCursor(false).draggable({
        lockAxis: "x",
        listeners: {
          move: (event2) => {
            const ratio = container.width / (child.width * offset.ratio);
            offset.x -= event2.dx / ratio;
            offset.x = Math.min(offset.x, boundary);
            offset.x = Math.max(
              offset.x,
              container.width - child.width * offset.ratio - boundary
            );
            updateTransform();
          }
        }
      });
      const containerEl = document.querySelector(props.container);
      containerEl.style.overflow = "hidden";
      if (props.dragMove)
        containerEl.style.cursor = "grab";
      containerEl.addEventListener("wheel", wheelEventHandle, { passive: true });
      if (props.dragMove) {
        containerEl.addEventListener("mousedown", mousedownEventHandle);
        window.addEventListener("mousemove", mousemoveEventHandle);
        window.addEventListener("mouseup", mouseupEventHandle);
      }
      const containerChildEl = containerEl.firstElementChild;
      const className = `pinchZoom-trigger-${utils2.string.generateRandomString(5)}`;
      containerChildEl.classList.add(className);
      pinchZoomEl.value.setAttribute("container", `.${className}`);
      pinchZoomEl.value.setAttribute("min-scale", scaleStep[0]);
      pinchZoomEl.value.setAttribute("max-scale", scaleStep[scaleStep.length - 1]);
      pinchZoomEl.value.setAttribute("drag-move", props.dragMove);
      await utils2.time.imgLoad(pinchZoomEl.value.children);
      resizeObserver.observe(containerEl);
      if (pinchZoomEl.value) {
        mutationObserver.observe(pinchZoomEl.value.firstElementChild, {
          attributes: true
        });
      }
      isReady.value = true;
    });
    onBeforeUnmount(() => {
      const containerEl = document.querySelector(props.container);
      containerEl.style.overflow = "";
      containerEl.removeEventListener("wheel", wheelEventHandle);
      if (props.dragMove) {
        containerEl.removeEventListener("mousedown", mousedownEventHandle);
        window.removeEventListener("mousemove", mousemoveEventHandle);
        window.removeEventListener("mouseup", mouseupEventHandle);
      }
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    });
    __expose({
      offset,
      scaleStep,
      fit,
      scale,
      scaleIn,
      scaleOut,
      width: () => child.width,
      height: () => child.height,
      view,
      setOffset,
      element: () => pinchZoomEl.value
    });
    return (_ctx, _cache) => {
      const _component_pinch_zoom = resolveComponent("pinch-zoom");
      return openBlock(), createElementBlock("div", _hoisted_1$9, [
        withDirectives(createBaseVNode("div", _hoisted_2$5, [
          createVNode(_component_pinch_zoom, {
            class: "pinch-zoom",
            ref_key: "pinchZoomEl",
            ref: pinchZoomEl
          }, {
            default: withCtx(() => [
              renderSlot(_ctx.$slots, "default")
            ]),
            _: 3
          }, 512),
          withDirectives(createBaseVNode("div", {
            class: "scrollbar scrollbar-vertical",
            onMousedown: _cache[1] || (_cache[1] = withModifiers(
              ($event) => {
                _ctx.percent = $event.offsetY / $event.target.clientHeight;
                unref(offset).y = -1 * unref(child).height * unref(offset).ratio * _ctx.percent;
                unref(offset).y += $event.target.clientHeight / 2;
                updateTransform();
              },
              ["self", "prevent", "stop"]
            ))
          }, [
            createBaseVNode("div", {
              id: "scrollbar-vertical-thumb",
              class: "scrollbar-thumb",
              style: normalizeStyle({
                top: `${-1 * unref(offset).y / (unref(child).height * unref(offset).ratio) * 100}%`,
                height: `${unref(container).height / (unref(child).height * unref(offset).ratio) * 100}%`
              }),
              onMousedown: _cache[0] || (_cache[0] = withModifiers(() => {
              }, ["stop"]))
            }, null, 36)
          ], 544), [
            [vShow, Math.floor(unref(child).height * unref(offset).ratio) > unref(container).height]
          ]),
          withDirectives(createBaseVNode("div", {
            class: "scrollbar scrollbar-horizontal",
            onMousedown: _cache[3] || (_cache[3] = withModifiers(
              ($event) => {
                _ctx.percent = $event.offsetX / $event.target.clientWidth;
                unref(offset).x = -1 * unref(child).width * unref(offset).ratio * _ctx.percent;
                unref(offset).x += $event.target.clientWidth / 2;
                updateTransform();
              },
              ["prevent", "stop"]
            ))
          }, [
            createBaseVNode("div", {
              id: "scrollbar-horizontal-thumb",
              class: "scrollbar-thumb",
              style: normalizeStyle({
                left: `${-1 * unref(offset).x / (unref(child).width * unref(offset).ratio) * 100}%`,
                width: `${unref(container).width / (unref(child).width * unref(offset).ratio) * 100}%`
              }),
              onMousedown: _cache[2] || (_cache[2] = withModifiers(() => {
              }, ["stop"]))
            }, null, 36)
          ], 544), [
            [vShow, Math.floor(unref(child).width * unref(offset).ratio) > unref(container).width]
          ])
        ], 512), [
          [vShow, unref(isReady)]
        ])
      ]);
    };
  }
};
const ItemPreviewVue_vue_vue_type_style_index_0_lang = "";
const _hoisted_1$8 = {
  key: 0,
  class: "item-preview-vue"
};
const _hoisted_2$4 = ["src", "alt"];
const _hoisted_3$3 = ["src", "alt"];
const _hoisted_4$3 = { class: "feature" };
const _hoisted_5$1 = /* @__PURE__ */ createBaseVNode("div", { class: "dash" }, null, -1);
const _hoisted_6$1 = /* @__PURE__ */ createBaseVNode("div", { class: "dash" }, null, -1);
const _sfc_main$b = {
  __name: "ItemPreviewVue",
  props: /* @__PURE__ */ mergeModels({
    item: {
      type: Object,
      default: () => ({})
    },
    total: {
      type: Number,
      default: 0
    }
  }, {
    "modelValue": {},
    "modelModifiers": {}
  }),
  emits: /* @__PURE__ */ mergeModels(["changed", "closed"], ["update:modelValue"]),
  setup(__props, { expose: __expose, emit: __emit }) {
    const main2 = inject("main");
    const mousetrap = inject("mousetrap");
    const index = useModel(__props, "modelValue");
    const props = __props;
    const emits = __emit;
    const src = ref("");
    const originalSrc = ref("");
    onMounted(() => {
      mousetrap.bind("left", async (event2) => {
        if (!main2.isDetailMode)
          return;
        prev();
        event2.preventDefault();
      });
      mousetrap.bind("right", async (event2) => {
        if (!main2.isDetailMode)
          return;
        next();
        event2.preventDefault();
      });
      mousetrap.bind(["esc"], async (event2) => {
        if (!main2.isDetailMode)
          return;
        close();
        event2.preventDefault();
      });
      mousetrap.bind("o", async (event2) => {
        if (!main2.isDetailMode)
          return;
        openLink();
        event2.preventDefault();
      });
    });
    onUnmounted(() => {
      mousetrap.unbind("left");
      mousetrap.unbind("right");
      mousetrap.unbind("esc");
    });
    let watchEffectTimeout;
    watchEffect(() => {
      src.value = props.item.image_medium_url;
      originalSrc.value = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAQSURBVHgBAQUA+v8AAAAAAAAFAAFkeJU4AAAAAElFTkSuQmCC";
      clearTimeout(watchEffectTimeout);
      watchEffectTimeout = setTimeout(() => {
        originalSrc.value = props.item.image_large_url;
      }, 50);
    });
    const show = () => {
      main2.isDetailMode = true;
    };
    const prev = () => {
      if (index.value > 0) {
        index.value--;
        emits("changed");
      }
    };
    const next = () => {
      if (index.value < props.total - 1) {
        index.value++;
        emits("changed");
      }
    };
    const close = () => {
      main2.isDetailMode = false;
      emits("closed");
    };
    const openLink = () => {
      eagle.shell.openExternal(`https://www.pinterest.com/pin/${props.item.id}`);
    };
    __expose({
      show,
      close
    });
    return (_ctx, _cache) => {
      const _component_PinchZoomVue = _sfc_main$c;
      const _component_ImageVue = _sfc_main$i;
      const _component_el_button = ElButton;
      const _directive_tippy = resolveDirective("tippy");
      return unref(main2).isDetailMode ? (openBlock(), createElementBlock("div", _hoisted_1$8, [
        createVNode(_component_PinchZoomVue, {
          class: "main",
          autoFit: true,
          dragMove: true,
          onDblclick: close
        }, {
          default: withCtx(() => [
            createBaseVNode("div", {
              style: normalizeStyle({
                width: props.item.image_large_size_pixels.width + "px",
                height: props.item.image_large_size_pixels.height + "px"
              })
            }, [
              createBaseVNode("img", {
                style: {
                  zIndex: 1,
                  width: "100%",
                  height: "100%"
                },
                src: unref(src),
                alt: unref(src)
              }, null, 8, _hoisted_2$4),
              createBaseVNode("img", {
                style: {
                  zIndex: 2,
                  width: "100%",
                  height: "100%"
                },
                src: unref(originalSrc),
                alt: unref(src)
              }, null, 8, _hoisted_3$3)
            ], 4)
          ]),
          _: 1
        }),
        createBaseVNode("div", _hoisted_4$3, [
          withDirectives((openBlock(), createBlock(_component_el_button, {
            onClick: _cache[0] || (_cache[0] = () => {
              unref(main2).saveImage(props.item);
              __props.item.saved = true;
            })
          }, {
            default: withCtx(() => [
              !props.item.saved ? (openBlock(), createBlock(_component_ImageVue, {
                key: 0,
                width: "14",
                height: "12",
                src: "light/base/ic-toolbar-save.svg",
                darkSrc: "dark/base/ic-toolbar-save.svg"
              })) : createCommentVNode("", true),
              props.item.saved ? (openBlock(), createBlock(_component_ImageVue, {
                key: 1,
                width: "16",
                height: "16",
                src: "light/base/ic-toolbar-saved.svg",
                darkSrc: "dark/base/ic-toolbar-saved.svg"
              })) : createCommentVNode("", true)
            ]),
            _: 1
          })), [
            [_directive_tippy, {
              allowHTML: true,
              content: unref(t)(props.item.saved ? "main.image.saved" : "main.image.save") + `<key>${unref(keyboard)("S")}</key>`,
              delay: [150, 0],
              duration: [50, 0]
            }]
          ]),
          withDirectives((openBlock(), createBlock(_component_el_button, {
            onClick: _cache[1] || (_cache[1] = ($event) => {
              unref(main2).reSearch({
                id: props.item.id,
                name: props.item.title,
                width: props.item.image_medium_size_pixels.width,
                height: props.item.image_medium_size_pixels.height,
                ext: "jpg",
                largeURL: props.item.image_large_url,
                mediumURL: props.item.image_medium_url,
                squareURL: props.item.image_square_url
              });
            })
          }, {
            default: withCtx(() => [
              createVNode(_component_ImageVue, {
                width: "16",
                height: "16",
                src: "light/base/ic-toolbar-reverse-search.svg",
                darkSrc: "dark/base/ic-toolbar-reverse-search.svg"
              })
            ]),
            _: 1
          })), [
            [_directive_tippy, {
              allowHTML: true,
              content: unref(t)("main.image.research") + `<key>${unref(keyboard)("F")}</key>`,
              delay: [150, 0],
              duration: [50, 0]
            }]
          ]),
          withDirectives((openBlock(), createBlock(_component_el_button, { onClick: openLink }, {
            default: withCtx(() => [
              createVNode(_component_ImageVue, {
                width: "16",
                height: "16",
                src: "light/base/ic-toolbar-open-in-browser.svg",
                darkSrc: "dark/base/ic-toolbar-open-in-browser.svg"
              })
            ]),
            _: 1
          })), [
            [_directive_tippy, {
              allowHTML: true,
              content: unref(t)("main.preview.openOnPinterest") + `<key>${unref(keyboard)("O")}</key>`,
              delay: [150, 0],
              duration: [50, 0]
            }]
          ]),
          _hoisted_5$1,
          withDirectives((openBlock(), createBlock(_component_el_button, { onClick: prev }, {
            default: withCtx(() => [
              createVNode(_component_ImageVue, {
                width: "24",
                height: "24",
                src: "light/base/ic-toolbar-prev.svg",
                darkSrc: "dark/base/ic-toolbar-prev.svg"
              })
            ]),
            _: 1
          })), [
            [_directive_tippy, {
              allowHTML: true,
              content: unref(t)("main.preview.prev") + `<key>${unref(keyboard)("Left")}</key>`,
              delay: [150, 0],
              duration: [50, 0]
            }]
          ]),
          withDirectives((openBlock(), createBlock(_component_el_button, { onClick: next }, {
            default: withCtx(() => [
              createVNode(_component_ImageVue, {
                width: "24",
                height: "24",
                src: "light/base/ic-toolbar-next.svg",
                darkSrc: "dark/base/ic-toolbar-next.svg"
              })
            ]),
            _: 1
          })), [
            [_directive_tippy, {
              allowHTML: true,
              content: unref(t)("main.preview.next") + `<key>${unref(keyboard)("Right")}</key>`,
              delay: [150, 0],
              duration: [50, 0]
            }]
          ]),
          _hoisted_6$1,
          withDirectives((openBlock(), createBlock(_component_el_button, { onClick: close }, {
            default: withCtx(() => [
              createVNode(_component_ImageVue, {
                width: "24",
                height: "24",
                src: "light/base/ic-header-close.svg",
                darkSrc: "dark/base/ic-header-close.svg"
              })
            ]),
            _: 1
          })), [
            [_directive_tippy, {
              allowHTML: true,
              content: unref(t)("main.preview.close") + `<key>${unref(keyboard)("Esc")}</key>/<key>${unref(keyboard)("Space")}</key>`,
              delay: [150, 0],
              duration: [50, 0]
            }]
          ])
        ])
      ])) : createCommentVNode("", true);
    };
  }
};
const ItemVue_vue_vue_type_style_index_0_lang = "";
const _hoisted_1$7 = ["data-selected", "data-index"];
const _hoisted_2$3 = ["src", "alt"];
const _sfc_main$a = {
  __name: "ItemVue",
  props: {
    index: {
      type: Number,
      required: true
    },
    item: {
      type: Object,
      required: true
    }
  },
  setup(__props) {
    const main2 = inject("main");
    const preview = inject("preview");
    const isHover = ref(false);
    const props = __props;
    const getPreview = (key) => {
      return document.querySelector(`.preview-${key}`);
    };
    const getResearch = (key) => {
      return document.querySelector(`.research-${key}`);
    };
    const getSave = (key) => {
      return document.querySelector(`.save-${key}`);
    };
    return (_ctx, _cache) => {
      const _component_ImageVue = _sfc_main$i;
      const _directive_tippy = resolveDirective("tippy");
      return openBlock(), createElementBlock("div", {
        class: "img-container item-vue",
        "data-selected": unref(isHover),
        "data-index": props.index
      }, [
        createBaseVNode("div", {
          class: "img-wrap",
          onMouseenter: _cache[5] || (_cache[5] = ($event) => isHover.value = true),
          onMouseleave: _cache[6] || (_cache[6] = ($event) => isHover.value = false)
        }, [
          createBaseVNode("img", {
            class: "img-border",
            loading: "'lazy'",
            src: unref(main2).scale.value >= 400 ? props.item.image_large_url : props.item.image_medium_url,
            alt: props.item.image_medium_url,
            style: normalizeStyle({
              aspectRatio: props.item.image_medium_size_pixels.width / props.item.image_medium_size_pixels.height
            })
          }, null, 12, _hoisted_2$3),
          createBaseVNode("div", {
            class: normalizeClass(["img-overlay", { saved: props.item.saved }]),
            onContextmenu: _cache[3] || (_cache[3] = withModifiers(
              () => {
                unref(main2).saveImage(props.item);
                __props.item.saved = true;
              },
              ["right"]
            )),
            onMouseup: _cache[4] || (_cache[4] = withModifiers(($event) => unref(main2).reSearch({
              id: props.item.id,
              name: props.item.title,
              width: props.item.image_medium_size_pixels.width,
              height: props.item.image_medium_size_pixels.height,
              ext: "jpg",
              largeURL: props.item.image_large_url,
              mediumURL: props.item.image_medium_url,
              squareURL: props.item.image_square_url
            }), ["middle"]))
          }, [
            withDirectives(createBaseVNode("div", {
              class: normalizeClass(["preview", ["preview-" + props.item.key]]),
              onClick: _cache[0] || (_cache[0] = ($event) => unref(preview)(props.index))
            }, null, 2), [
              [_directive_tippy, {
                allowHTML: true,
                content: unref(t)("main.image.preview") + `<key>${unref(keyboard)("Space")}</key>`,
                triggerTarget: getPreview(props.item.key),
                delay: [150, 0],
                duration: [50, 0],
                offset: [0, -48],
                placement: "bottom"
              }]
            ]),
            withDirectives((openBlock(), createElementBlock("div", {
              class: normalizeClass(["save", ["save-" + props.item.key]]),
              onClick: _cache[1] || (_cache[1] = () => {
                unref(main2).saveImage(props.item);
                __props.item.saved = true;
              })
            }, [
              createVNode(_component_ImageVue, {
                width: "32",
                height: "32",
                src: props.item.saved ? `normal/ic-saved.svg` : `normal/ic-save.svg`
              }, null, 8, ["src"])
            ], 2)), [
              [_directive_tippy, {
                allowHTML: true,
                content: unref(t)(props.item.saved ? "main.image.saved" : "main.image.save") + `<key>${unref(keyboard)("S")}</key>`,
                triggerTarget: getSave(props.item.key),
                delay: [150, 0],
                duration: [50, 0]
              }]
            ]),
            withDirectives((openBlock(), createElementBlock("div", {
              class: normalizeClass(["research", ["research-" + props.item.key]]),
              onClick: _cache[2] || (_cache[2] = ($event) => unref(main2).reSearch({
                id: props.item.id,
                name: props.item.title,
                width: props.item.image_medium_size_pixels.width,
                height: props.item.image_medium_size_pixels.height,
                ext: "jpg",
                largeURL: props.item.image_large_url,
                mediumURL: props.item.image_medium_url,
                squareURL: props.item.image_square_url
              }))
            }, [
              createVNode(_component_ImageVue, {
                width: "32",
                height: "32",
                src: "normal/ic-reverse-search.svg"
              })
            ], 2)), [
              [_directive_tippy, {
                allowHTML: true,
                content: unref(t)("main.image.research") + `<key>${unref(keyboard)("F")}</key>`,
                triggerTarget: getResearch(props.item.key),
                delay: [150, 0],
                duration: [50, 0]
              }]
            ])
          ], 34)
        ], 32)
      ], 8, _hoisted_1$7);
    };
  }
};
const _hoisted_1$6 = { key: 0 };
const _sfc_main$9 = {
  __name: "WaterfallVirtualListItemVue",
  props: {
    index: [Number, String],
    uniqueKey: String,
    tag: { type: String, required: true },
    source: Object,
    component: [Object, Function],
    slotComponent: Function,
    extraProps: Object,
    scopedSlots: Object,
    columnGap: Number,
    rowGap: Number
  },
  setup(__props) {
    const props = __props;
    const elRef = ref(null);
    return (_ctx, _cache) => {
      return openBlock(), createBlock(resolveDynamicComponent(__props.tag ? __props.tag : "div"), {
        key: __props.uniqueKey,
        "data-key": "uniqueKey",
        ref_key: "elRef",
        ref: elRef,
        role: "listitem"
      }, {
        default: withCtx(() => [
          __props.slotComponent ? (openBlock(), createElementBlock("div", _hoisted_1$6, [
            (openBlock(), createBlock(resolveDynamicComponent(__props.slotComponent), {
              item: __props.source,
              index: __props.index,
              scope: props
            }, null, 8, ["item", "index", "scope"]))
          ])) : (openBlock(), createBlock(resolveDynamicComponent(__props.component), {
            key: 1,
            item: __props.source,
            index: __props.index,
            style: normalizeStyle({
              paddingLeft: __props.columnGap ? __props.columnGap / 2 + "px" : "0px",
              paddingRight: __props.columnGap ? __props.columnGap / 2 + "px" : "0px",
              paddingBottom: __props.rowGap + "px",
              boxSizing: "border-box"
            })
          }, null, 8, ["item", "index", "style"]))
        ]),
        _: 1
      });
    };
  }
};
const _sfc_main$8 = {
  __name: "WaterfallVirtualListVue",
  props: {
    trigger: {
      type: String,
      required: true
    },
    dataKey: {
      type: [String, Function],
      required: true,
      default: new Array()
    },
    columnGap: {
      type: Number,
      default: 16
    },
    rowGap: {
      type: Number,
      default: 16
    },
    dataSource: {
      type: Array,
      required: true
    },
    widthKey: {
      type: String,
      default: "width",
      required: true
    },
    heightKey: {
      type: String,
      default: "height",
      required: true
    },
    columnWidth: {
      type: Number,
      required: true
    },
    columnPadding: {
      type: Number,
      default: 0
    },
    dataComponent: {
      type: [Object, Function]
    },
    rootTag: {
      type: String,
      default: "div"
    },
    wrapTag: {
      type: String,
      default: "div"
    },
    wrapClass: {
      type: String,
      default: ""
    },
    wrapStyle: {
      type: Object
    },
    itemTag: {
      type: String,
      default: "div"
    },
    itemClass: {
      type: String,
      default: ""
    },
    itemClassAdd: {
      type: Function
    },
    itemStyle: {
      type: Object
    },
    upThreshold: {
      type: Number,
      default: 200
    },
    downThreshold: {
      type: Number,
      default: 200
    },
    bottomThreshold: {
      type: Number,
      default: 0
    },
    footerTag: {
      type: String,
      default: "div"
    },
    footerClass: {
      type: String,
      default: "footer"
    },
    footerStyle: {
      type: Object
    }
  },
  emits: ["tobottom", "onloading", "onloaded"],
  setup(__props, { expose: __expose, emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const triggerDom = computed(() => document.querySelector(props.trigger) ?? window.document);
    let containerWidth = 0;
    const columnCount = ref(0);
    let columnHeightArr = [];
    let itemList = [];
    const range = ref([]);
    const domRef = ref(null);
    const boxWidth = ref(0);
    const updateBoxWidth = () => {
      containerWidth = document.querySelector(props.trigger).clientWidth;
      if (containerWidth < props.columnWidth) {
        boxWidth.value = containerWidth - props.columnPadding * 2;
      } else {
        const columns = Math.floor(containerWidth / props.columnWidth);
        boxWidth.value = (containerWidth - 2 * props.columnPadding) / columns;
      }
    };
    watch(
      () => props.columnWidth,
      () => {
        updateBoxWidth();
        calColumnNum();
        calPosition();
        getVisibleRange();
      }
    );
    watch(
      () => props.dataSource,
      async () => {
        updateBoxWidth();
        calColumnNum();
        calPosition();
        getVisibleRange();
        await nextTick();
        emit("onloaded");
      },
      { deep: true }
    );
    const getMin = (arr) => Math.min.apply(null, arr);
    const getMax = (arr) => Math.max.apply(null, arr);
    const calColumnNum = () => {
      if (!props.dataSource || props.dataSource.length === 0)
        return;
      containerWidth = document.querySelector(props.trigger).clientWidth;
      const newValue = Math.max(1, parseInt((containerWidth - props.columnPadding) / boxWidth.value));
      columnCount.value = newValue;
      calPosition();
      getVisibleRange();
    };
    const getVisibleRange = () => {
      if (!(domRef == null ? void 0 : domRef.value)) {
        range.value = Array.from({ length: 20 }, (_, index) => index++);
        return;
      }
      let top = Math.floor(triggerDom.value.scrollTop - domRef.value.offsetTop - props.upThreshold);
      let bottom = Math.floor(
        triggerDom.value.scrollTop + triggerDom.value.clientHeight - domRef.value.offsetTop + props.downThreshold
      );
      top = top - triggerDom.value.clientHeight / 2;
      bottom = bottom + triggerDom.value.clientHeight / 2;
      const indexs = [];
      itemList.forEach((item, index) => {
        if (!(item["top"] >= bottom) && !(item["bottom"] <= top)) {
          indexs.push(index);
        }
      });
      range.value = indexs;
    };
    const calPosition = () => {
      if (!props.dataSource || props.dataSource.length === 0)
        return;
      itemList = [];
      columnHeightArr = Array(columnCount.value).fill(0);
      for (let i = 0; i < props.dataSource.length; i++) {
        const item = props.dataSource[i];
        const ratio = item[props.heightKey] / item[props.widthKey];
        const height = Math.floor(ratio * (boxWidth.value - props.columnGap)) + props.rowGap;
        const min = getMin(columnHeightArr);
        const index = columnHeightArr.indexOf(min);
        columnHeightArr[index] += height;
        itemList[i] = {
          height,
          colIndex: index,
          top: columnHeightArr[index] - height,
          bottom: columnHeightArr[index]
        };
      }
    };
    const scrollToIndex = async (index) => {
      const item = itemList[index];
      if (item.top < triggerDom.value.scrollTop || item.bottom > triggerDom.value.scrollTop + triggerDom.value.clientHeight) {
        triggerDom.value.scrollTop = item.top;
      }
    };
    const onScroll = () => {
      getVisibleRange();
      const scrollTop = triggerDom.value.scrollTop;
      const clientHeight = triggerDom.value.clientHeight || document.body.clientHeight;
      const scrollHeight = triggerDom.value.scrollHeight || document.body.scrollHeight;
      const { bottomThreshold } = props;
      if (scrollTop + clientHeight + 1 + bottomThreshold >= scrollHeight * (3 / 4)) {
        emit("tobottom");
      }
    };
    let resizeTimeout = null;
    const onResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        updateBoxWidth();
        calColumnNum();
        calPosition();
        getVisibleRange();
        nextTick();
      }, 16);
    };
    const getKey = (item) => {
      return typeof props.dataKey === "function" ? props.dataKey(item) : item[props.dataKey];
    };
    onMounted(async () => {
      document.querySelector(props.trigger).addEventListener("scroll", onScroll, {
        passive: false
      });
      window.addEventListener("resize", onResize, {
        passive: false
      });
      onResize();
    });
    onUnmounted(() => {
      document.querySelector(props.trigger).removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    });
    onActivated(() => {
      document.querySelector(props.trigger).addEventListener("scroll", onScroll, {
        passive: false
      });
      window.addEventListener("resize", onResize, {
        passive: false
      });
    });
    onDeactivated(() => {
      document.querySelector(props.trigger).removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    });
    __expose({
      scrollToIndex
    });
    return (_ctx, _cache) => {
      return openBlock(), createBlock(resolveDynamicComponent(__props.rootTag), { style: { "display": "flex", "justify-content": "center" } }, {
        default: withCtx(() => [
          (openBlock(), createBlock(resolveDynamicComponent(__props.wrapTag), {
            ref_key: "domRef",
            ref: domRef,
            style: normalizeStyle({
              position: "relative",
              width: unref(boxWidth) * unref(columnCount) + "px",
              height: getMax(unref(columnHeightArr)) + "px",
              ...__props.wrapStyle
            }),
            class: normalizeClass(__props.wrapClass),
            role: "list"
          }, {
            default: withCtx(() => [
              (openBlock(true), createElementBlock(Fragment, null, renderList(unref(range), (index) => {
                return openBlock(), createBlock(resolveDynamicComponent(_sfc_main$9), {
                  key: getKey(__props.dataSource[index]),
                  index,
                  uniqueKey: getKey(__props.dataSource[index]),
                  component: __props.dataComponent,
                  columnGap: __props.columnGap,
                  rowGap: __props.rowGap,
                  source: __props.dataSource[index],
                  tag: __props.itemTag,
                  style: normalizeStyle({
                    position: "absolute",
                    left: "0px",
                    top: "0px",
                    width: unref(boxWidth) + "px",
                    height: unref(itemList)[index].height + "px",
                    transform: `translateX(${unref(boxWidth) * unref(itemList)[index].colIndex}px) translateY(${unref(itemList)[index].top}px)`
                  }),
                  class: normalizeClass(`${__props.itemClass}${__props.itemClassAdd ? " " + __props.itemClassAdd(index) : ""}`)
                }, null, 8, ["index", "uniqueKey", "component", "columnGap", "rowGap", "source", "tag", "style", "class"]);
              }), 128))
            ]),
            _: 1
          }, 8, ["style", "class"])),
          _ctx.$slots.footer ? (openBlock(), createBlock(resolveDynamicComponent(__props.footerTag), {
            key: 0,
            class: normalizeClass(__props.footerClass),
            style: normalizeStyle(__props.footerStyle)
          }, {
            default: withCtx(() => [
              renderSlot(_ctx.$slots, "footer")
            ]),
            _: 3
          }, 8, ["class", "style"])) : createCommentVNode("", true)
        ]),
        _: 3
      });
    };
  }
};
const _sfc_main$7 = {
  __name: "ImageSearchResultSuccessVue",
  setup(__props) {
    const main2 = inject("main");
    const mousetrap = inject("mousetrap");
    const current = computed(() => main2.taskQueue.dataMap[main2.currentId]);
    const waterfallVirtialListEl = ref(null);
    const isSearching = ref(false);
    const onReachBottom = async () => {
      if (isSearching.value)
        return;
      isSearching.value = true;
      current.value.searchIndex++;
      const item = current.value.result.data[current.value.searchIndex];
      const url = (item == null ? void 0 : item.image_large_url) ?? (item == null ? void 0 : item.image_medium_url) ?? (item == null ? void 0 : item.image_square_url);
      const results = await main2.search(url, true);
      current.value.result.data.push(...results);
      isSearching.value = false;
    };
    const onLoaded = () => {
      document.querySelector(".image-search-result-vue").scroll(0, current.value.scroll);
    };
    const previewEl = ref(null);
    const previewIndex = ref(0);
    const preview = (index) => {
      previewIndex.value = index;
      previewEl.value.show();
    };
    onMounted(() => {
      mousetrap.bind("space", async (event2) => {
        if (main2.isDetailMode) {
          previewEl.value.close();
        } else {
          const selectedItemEls = document.querySelectorAll(".item-vue[data-selected=true]");
          if (!selectedItemEls.length)
            return;
          const itemEl = selectedItemEls[0];
          const index = itemEl.dataset.index;
          preview(index);
        }
        event2.preventDefault();
      });
      mousetrap.bind("s", async (event2) => {
        if (main2.isDetailMode) {
          const item = current.value.result.data[previewIndex.value];
          main2.saveImage(item);
          item.saved = true;
        } else {
          const selectedItemEls = document.querySelectorAll(".item-vue[data-selected=true]");
          if (!selectedItemEls.length)
            return;
          const itemEl = selectedItemEls[0];
          const index = itemEl.dataset.index;
          main2.saveImage(current.value.result.data[index]);
          current.value.result.data[index].saved = true;
          event2.preventDefault();
        }
      });
      mousetrap.bind("f", async (event2) => {
        if (main2.isDetailMode) {
          const item = current.value.result.data[previewIndex.value];
          main2.reSearch({
            id: item.id,
            name: item.title,
            width: item.image_medium_size_pixels.width,
            height: item.image_medium_size_pixels.height,
            ext: "jpg",
            largeURL: item.image_large_url,
            mediumURL: item.image_medium_url,
            squareURL: item.image_square_url
          });
        } else {
          const selectedItemEls = document.querySelectorAll(".item-vue[data-selected=true]");
          if (!selectedItemEls.length)
            return;
          const itemEl = selectedItemEls[0];
          const index = itemEl.dataset.index;
          const item = current.value.result.data[index];
          main2.reSearch({
            id: item.id,
            name: item.title,
            width: item.image_medium_size_pixels.width,
            height: item.image_medium_size_pixels.height,
            ext: "jpg",
            largeURL: item.image_large_url,
            mediumURL: item.image_medium_url,
            squareURL: item.image_square_url
          });
          event2.preventDefault();
        }
      });
    });
    provide("preview", readonly(preview));
    return (_ctx, _cache) => {
      const _component_ItemPreviewVue = _sfc_main$b;
      return openBlock(), createElementBlock(Fragment, null, [
        createVNode(_sfc_main$8, {
          ref_key: "waterfallVirtialListEl",
          ref: waterfallVirtialListEl,
          trigger: ".image-search-result-vue",
          "data-key": "key",
          columnWidth: unref(main2).scale.value,
          columnPadding: 24,
          "data-source": unref(current).result.data,
          "data-component": _sfc_main$a,
          "width-key": "width",
          "height-key": "height",
          columnGap: 24,
          rowGap: 24,
          onTobottom: onReachBottom,
          onOnloading: _ctx.onLoading,
          onOnloaded: onLoaded
        }, null, 8, ["columnWidth", "data-source", "onOnloading"]),
        createVNode(_component_ItemPreviewVue, {
          ref_key: "previewEl",
          ref: previewEl,
          modelValue: unref(previewIndex),
          "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => isRef(previewIndex) ? previewIndex.value = $event : null),
          item: unref(current).result.data[unref(previewIndex)],
          total: unref(current).result.data.length,
          onChanged: _cache[1] || (_cache[1] = ($event) => {
            var _a;
            return (_a = unref(waterfallVirtialListEl)) == null ? void 0 : _a.scrollToIndex(unref(previewIndex));
          }),
          onClosed: _cache[2] || (_cache[2] = ($event) => {
            var _a;
            return (_a = unref(waterfallVirtialListEl)) == null ? void 0 : _a.scrollToIndex(unref(previewIndex));
          })
        }, null, 8, ["modelValue", "item", "total"])
      ], 64);
    };
  }
};
const imageSearchResultVue_vue_vue_type_style_index_0_lang = "";
const _sfc_main$6 = {
  __name: "imageSearchResultVue",
  setup(__props) {
    const main2 = inject("main");
    const imageSearchResultEl = ref(null);
    const current = computed({
      get() {
        return main2.taskQueue.dataMap[main2.currentId];
      },
      set(value) {
        main2.taskQueue.dataMap[main2.currentId] = value;
      }
    });
    const onWheel = async () => {
      if (!current || !current.value.isSuccess())
        return;
      current.value.scroll = imageSearchResultEl.value.scrollTop;
    };
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        class: "image-search-result-vue",
        onWheel,
        ref_key: "imageSearchResultEl",
        ref: imageSearchResultEl
      }, [
        (openBlock(), createBlock(resolveDynamicComponent(
          {
            waiting: _sfc_main$e,
            processing: _sfc_main$e,
            failed: _sfc_main$d,
            success: _sfc_main$7
          }[unref(current).result.state]
        )))
      ], 544);
    };
  }
};
const ImagePreviewVue_vue_vue_type_style_index_0_lang = "";
const _hoisted_1$5 = { class: "image-preview-vue" };
const _hoisted_2$2 = {
  key: 0,
  class: "img-container"
};
const _hoisted_3$2 = { class: "img-info" };
const _hoisted_4$2 = { class: "size" };
const _sfc_main$5 = {
  __name: "ImagePreviewVue",
  setup(__props) {
    const utils2 = window.__miraPinterestUtils;
    const main2 = inject("main");
    const current = computed(() => main2.taskQueue.dataMap[main2.currentId]);
    const cropperData = reactive({
      image: null,
      top: null,
      left: null,
      width: null,
      height: null
    });
    const onCropperImageChange = async ({ coordinates, image, canvas }) => {
      const isNull = (value) => {
        return value === null;
      };
      const isEqualImage = (image1, image2) => {
        return image1.src === image2.src;
      };
      const isEqualSize = (size1, size2) => {
        return size1.top === size2.top && size1.left === size2.left && size1.width === size2.width && size1.height === size2.height;
      };
      const checkCanSearch = () => {
        if (isNull(cropperData.image))
          return false;
        if (isEqualImage(cropperData.image, image)) {
          if (isEqualSize(cropperData, coordinates))
            return false;
        } else {
          return false;
        }
        return true;
      };
      if (checkCanSearch()) {
        const url = canvas.toDataURL("image/jpeg", 1);
        main2.cropperSearch(url);
      }
      cropperData.image = image;
      cropperData.top = coordinates.top;
      cropperData.left = coordinates.left;
      cropperData.width = coordinates.width;
      cropperData.height = coordinates.height;
    };
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1$5, [
        unref(current) ? (openBlock(), createElementBlock("div", _hoisted_2$2, [
          createVNode(unref(fe), {
            src: unref(current).image.large.url,
            defaultSize: ({ visibleArea, imageSize }) => {
              return {
                width: (visibleArea || imageSize).width,
                height: (visibleArea || imageSize).height
              };
            },
            defaultBoundaries: "fit",
            resizeImage: false,
            moveImage: false,
            debounce: "1000",
            transitionTime: "0",
            onChange: onCropperImageChange
          }, null, 8, ["src", "defaultSize"]),
          createBaseVNode("div", _hoisted_3$2, [
            createBaseVNode("div", {
              class: "name",
              style: normalizeStyle({
                color: unref(current).name == "" ? "var(--color-text-tertiary)" : "var(--color-text-primary)"
              })
            }, toDisplayString(unref(current).name == "" ? unref(t)("main.image.title.noTitle") : unref(current).name), 5),
            createBaseVNode("div", _hoisted_4$2, toDisplayString(unref(utils2).string.format(unref(current).width)) + " × " + toDisplayString(unref(utils2).string.format(unref(current).height)), 1)
          ])
        ])) : createCommentVNode("", true)
      ]);
    };
  }
};
const ImageListVue_vue_vue_type_style_index_0_lang = "";
const _hoisted_1$4 = ["src", "alt", "onClick"];
const _sfc_main$4 = {
  __name: "ImageListVue",
  setup(__props) {
    const main2 = inject("main");
    return (_ctx, _cache) => {
      const _component_ImageVue = _sfc_main$i;
      const _directive_tippy = resolveDirective("tippy");
      return openBlock(), createBlock(unref(SlickList), {
        axis: "y",
        list: unref(main2).taskQueue.data,
        "onUpdate:list": _cache[0] || (_cache[0] = ($event) => unref(main2).taskQueue.data = $event),
        class: "image-list-vue",
        appendTo: ".image-list-vue",
        distance: "5",
        helperClass: "dragging"
      }, {
        default: withCtx(() => [
          (openBlock(true), createElementBlock(Fragment, null, renderList(unref(main2).taskQueue.data, (task, index) => {
            return withDirectives((openBlock(), createBlock(unref(SlickItem), {
              key: task.id,
              index,
              class: normalizeClass(["image-wrap", {
                active: unref(main2).currentId == task.id
              }]),
              "data-id": task.id,
              onMouseup: withModifiers(($event) => unref(main2).closeTask(index), ["middle", "prevent"]),
              onContextmenu: withModifiers(($event) => unref(useContextMenu)([
                {
                  label: unref(t)("main.sidebar.contentMenu.close"),
                  onClick: () => unref(main2).closeTask(index)
                },
                {
                  label: unref(t)("main.sidebar.contentMenu.close_other"),
                  onClick: () => unref(main2).closeOtherTask(index)
                },
                {
                  label: unref(t)("main.sidebar.contentMenu.close_other_down"),
                  onClick: () => unref(main2).closeOtherDownTask(index)
                }
              ]), ["right", "prevent"])
            }, {
              default: withCtx(() => [
                createBaseVNode("img", {
                  class: "img-border",
                  src: task.image.medium.url,
                  alt: task.name ? unref(t)("main.image.title.noTitle") : task.name,
                  onClick: ($event) => unref(main2).currentId = task.id
                }, null, 8, _hoisted_1$4),
                createVNode(_component_ImageVue, {
                  class: "close-btn",
                  width: "14",
                  height: "14",
                  src: "light/close-btn.svg",
                  darkSrc: "dark/close-btn.svg",
                  onClick: ($event) => unref(main2).closeTask(index)
                }, null, 8, ["onClick"])
              ]),
              _: 2
            }, 1032, ["index", "class", "data-id", "onMouseup", "onContextmenu"])), [
              [_directive_tippy, {
                content: task.name == "" ? unref(t)("main.image.title.noTitle") : task.name,
                placement: "right",
                duration: [200, 0]
              }]
            ]);
          }), 128))
        ]),
        _: 1
      }, 8, ["list"]);
    };
  }
};
const _hoisted_1$3 = { style: { "margin-right": "2px" } };
const _sfc_main$3 = {
  __name: "ThumbtackVue",
  setup(__props) {
    const mousetrap = inject("mousetrap");
    const isAlwaysOnTop = ref(false);
    const toggleAlwaysOnTop = async () => {
      isAlwaysOnTop.value = !isAlwaysOnTop.value;
      await eagle.window.setAlwaysOnTop(isAlwaysOnTop.value);
    };
    onMounted(async () => {
      mousetrap.bind(["shift+t"], toggleAlwaysOnTop);
      isAlwaysOnTop.value = await eagle.window.isAlwaysOnTop();
    });
    return (_ctx, _cache) => {
      const _component_ImageVue = _sfc_main$i;
      const _component_key = resolveComponent("key");
      const _component_tippy = resolveComponent("tippy");
      return openBlock(), createBlock(_component_tippy, {
        allowHTML: "",
        placement: "left",
        duration: "[200,0]"
      }, {
        default: withCtx(() => [
          createVNode(_component_ImageVue, {
            class: normalizeClass(["icon", {
              "icon-active": unref(isAlwaysOnTop)
            }]),
            width: "24",
            height: "24",
            src: unref(isAlwaysOnTop) ? "light/base/ic-thumbtack-pinned.svg" : "light/base/ic-thumbtack.svg",
            darkSrc: unref(isAlwaysOnTop) ? "dark/base/ic-thumbtack-pinned.svg" : "dark/base/ic-thumbtack.svg",
            onClick: toggleAlwaysOnTop
          }, null, 8, ["class", "src", "darkSrc"])
        ]),
        content: withCtx(() => [
          createBaseVNode("span", _hoisted_1$3, toDisplayString(unref(isAlwaysOnTop) ? unref(t)("header.thumbtack.isNotAlwaysOnTop") : unref(t)("header.thumbtack.isAlwaysOnTop")), 1),
          createVNode(_component_key, null, {
            default: withCtx(() => [
              createTextVNode(toDisplayString(unref(keyboard)("Shift")), 1)
            ]),
            _: 1
          }),
          createVNode(_component_key, null, {
            default: withCtx(() => [
              createTextVNode("T")
            ]),
            _: 1
          })
        ]),
        _: 1
      });
    };
  }
};
const _imports_0 = "" + new URL("../../logo.png", import.meta.url).href;
const HeaderVue_vue_vue_type_style_index_0_lang = "";
const _hoisted_1$2 = { class: "header-vue" };
const _hoisted_2$1 = { class: "drag" };
const _hoisted_3$1 = /* @__PURE__ */ createBaseVNode("img", {
  class: "logo",
  src: _imports_0,
  alt: "logo"
}, null, -1);
const _hoisted_4$1 = { class: "title" };
const _hoisted_5 = { class: "action" };
const _hoisted_6 = /* @__PURE__ */ createBaseVNode("div", { class: "dash" }, null, -1);
const _sfc_main$2 = {
  __name: "HeaderVue",
  setup(__props) {
    const title = eagle.plugin.manifest.name;
    const closeDialog = reactive({
      visible: false,
      text: {
        title: t("component.dialog.exit.title"),
        description: t("component.dialog.exit.description"),
        cancel: t("component.dialog.exit.cancel"),
        ok: t("component.dialog.exit.ok")
      },
      ok: () => {
        closeDialog.visible = false;
        window.close();
      }
    });
    return (_ctx, _cache) => {
      const _component_ThumbtackVue = _sfc_main$3;
      const _component_ImageVue = _sfc_main$i;
      const _component_WarningDialogVue = _sfc_main$h;
      return openBlock(), createElementBlock(Fragment, null, [
        createBaseVNode("div", _hoisted_1$2, [
          createBaseVNode("div", _hoisted_2$1, [
            _hoisted_3$1,
            createBaseVNode("span", _hoisted_4$1, toDisplayString(unref(title)), 1)
          ]),
          createBaseVNode("div", _hoisted_5, [
            renderSlot(_ctx.$slots, "default"),
            _hoisted_6,
            createVNode(_component_ThumbtackVue),
            createVNode(_component_ImageVue, {
              class: "icon close",
              width: "24",
              height: "24",
              src: "light/base/ic-header-close.svg",
              darkSrc: "dark/base/ic-header-close.svg",
              onClick: _cache[0] || (_cache[0] = ($event) => unref(closeDialog).visible = true)
            })
          ])
        ]),
        createVNode(_component_WarningDialogVue, {
          modelValue: unref(closeDialog).visible,
          "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => unref(closeDialog).visible = $event),
          text: unref(closeDialog).text,
          onOk: unref(closeDialog).ok
        }, null, 8, ["modelValue", "text", "onOk"])
      ], 64);
    };
  }
};
const SlideBarVue_vue_vue_type_style_index_0_lang = "";
const _hoisted_1$1 = { class: "slide-bar-vue" };
const _hoisted_2 = { class: "range-wrap" };
const _hoisted_3 = { class: "range-progressbar" };
const _hoisted_4 = ["min", "max", "step"];
const _sfc_main$1 = {
  __name: "SlideBarVue",
  props: {
    modelValue: {
      type: Number,
      default: 0
    },
    data: {
      type: Array,
      default: Array.from({ length: 101 }, (_, index) => index),
      required: true
    },
    step: {
      type: Number
    }
  },
  emits: ["update:modelValue", "changed"],
  setup(__props, { expose: __expose, emit: __emit }) {
    window.__miraPinterestUtils.time;
    const props = __props;
    const emit = __emit;
    const min = computed(() => Number(props.data[0] ?? 0));
    const max = computed(() => Number(props.data[props.data.length - 1] ?? 100));
    const step = computed(() => props.step ?? (max.value - min.value) / 100 ?? 1);
    const slide_bar_value = computed({
      get: () => props.modelValue,
      set: (value) => {
        emit("update:modelValue", value);
        emit("changed", value);
      }
    });
    function findClosestIndex(target) {
      let closestIndex = 0;
      let closestDifference = Math.abs(target - props.data[0]);
      for (let i = 1; i < props.data.length; i++) {
        const difference = Math.abs(target - props.data[i]);
        if (difference < closestDifference) {
          closestIndex = i;
          closestDifference = difference;
        }
      }
      return closestIndex;
    }
    const minus = () => {
      const index = findClosestIndex(props.modelValue);
      const value = props.data[index - 1 < 0 ? 0 : index - 1];
      slide_bar_value.value = value;
    };
    const plus = () => {
      const index = findClosestIndex(props.modelValue);
      const value = props.data[index + 1 > props.data.length - 1 ? props.data.length - 1 : index + 1];
      slide_bar_value.value = value;
    };
    __expose({
      minus,
      plus
    });
    return (_ctx, _cache) => {
      const _component_ImageVue = _sfc_main$i;
      const _directive_tippy = resolveDirective("tippy");
      return openBlock(), createElementBlock("div", _hoisted_1$1, [
        withDirectives(createVNode(_component_ImageVue, {
          onClick: minus,
          class: "icon",
          width: "23",
          height: "23",
          src: "light/base/ic-slide-bar-minus.svg",
          darkSrc: "dark/base/ic-slide-bar-minus.svg"
        }, null, 512), [
          [_directive_tippy, {
            allowHTML: true,
            content: unref(t)("header.slider.zoomOut") + `<key>${unref(keyboard)("-")}</key>`,
            delay: [150, 0],
            duration: [50, 0]
          }]
        ]),
        createBaseVNode("div", _hoisted_2, [
          createBaseVNode("div", _hoisted_3, [
            createBaseVNode("div", {
              class: "current",
              style: normalizeStyle({
                width: (unref(slide_bar_value) - unref(min)) / (unref(max) - unref(min)) * 100 + "%"
              })
            }, null, 4),
            withDirectives(createBaseVNode("input", {
              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => isRef(slide_bar_value) ? slide_bar_value.value = $event : null),
              type: "range",
              tabindex: "-1",
              min: unref(min),
              max: unref(max),
              step: unref(step)
            }, null, 8, _hoisted_4), [
              [vModelText, unref(slide_bar_value)]
            ])
          ])
        ]),
        withDirectives(createVNode(_component_ImageVue, {
          onClick: plus,
          class: "icon",
          width: "23",
          height: "23",
          src: "light/base/ic-slide-bar-plus.svg",
          darkSrc: "dark/base/ic-slide-bar-plus.svg"
        }, null, 512), [
          [_directive_tippy, {
            allowHTML: true,
            content: unref(t)("header.slider.zoomIn") + `<key>${unref(keyboard)("+")}</key>`,
            delay: [150, 0],
            duration: [50, 0]
          }]
        ])
      ]);
    };
  }
};
class Task {
  constructor({ ref: ref2, id, name, ext, width, height, url, largeURL, mediumURL, squareURL }) {
    this.id = (ref2 == null ? void 0 : ref2.id) ?? id ?? crypto.randomUUID();
    this.ref = ref2 ? markRaw(ref2) : null;
    this.name = (ref2 == null ? void 0 : ref2.name) ?? name;
    this.ext = (ref2 == null ? void 0 : ref2.ext) ?? ext;
    const thumbnailURL = (ref2 == null ? void 0 : ref2.thumbnailURL) ?? squareURL ?? url;
    this.width = (ref2 == null ? void 0 : ref2.width) ?? width ?? 0;
    this.height = (ref2 == null ? void 0 : ref2.height) ?? height ?? 0;
    this.image = {
      large: {
        url: largeURL ?? thumbnailURL
      },
      medium: {
        url: mediumURL ?? thumbnailURL
      },
      square: {
        url: squareURL ?? thumbnailURL
      }
    };
    this.scroll = 0;
    this.searchIndex = -1;
    this.result = {
      state: "waiting",
      message: "",
      data: null
    };
  }
  isWaiting() {
    return this.result.state === "waiting";
  }
  isProcessing() {
    return this.result.state === "processing";
  }
  isSuccess() {
    return this.result.state === "success";
  }
  isFailed() {
    return this.result.state === "failed";
  }
  waiting() {
    this.result.state = "waiting";
    this.result.message = "";
    this.result.data = null;
  }
  processing(process2 = 0) {
    this.result.state = "processing";
    this.result.message = "";
    this.result.data = process2;
  }
  success(data = null) {
    this.result.state = "success";
    this.result.message = "";
    this.result.data = data;
  }
  failed(message = "") {
    this.result.state = "failed";
    this.result.message = message;
    this.result.data = null;
  }
}
class Queue {
  constructor(data = []) {
    this.data = [];
    this.dataMap = {};
    this.type = ["success", "waiting", "failed"];
    for (let i of this.type) {
      this[i] = [];
    }
    this.queue = null;
    this.concurrency = 3;
    this.isWorking = false;
    this.enqueue(data);
  }
  get length() {
    return this.data.length;
  }
  get completed() {
    return [...this.success, ...this.failed];
  }
  enqueue(data, index = Infinity) {
    const ar = [data].flat(Infinity);
    for (let i = 0; i < ar.length; i++) {
      const task = new Task(ar[i]);
      if (this.dataMap[task.id])
        continue;
      this.dataMap[task.id] = task;
      this.data.splice(index + i, 0, task);
      this.waiting.splice(index + i, 0, task);
      if (this.queue)
        this.queue.push(task);
      ar[i] = task;
    }
    if (ar.length === 1)
      return ar[0];
    return ar;
  }
  dequeue(index = 0) {
    const task = this.data.splice(index, 1)[0];
    delete this.dataMap[task.id];
    for (let i of this.type) {
      const index2 = this[i].indexOf(task);
      if (index2 !== -1)
        this[i].splice(index2, 1);
    }
    if (this.queue) {
      this.queue.remove(({ data, priority }) => {
        return data.id === task.id;
      });
    }
    return task;
  }
  async start({
    onProcess = async () => {
    },
    onSuccess = async () => {
    },
    onFailed = async () => {
    }
  }) {
    if (this.isWorking)
      return;
    this.isWorking = true;
    this.queue = queue(async (task, callback = () => {
    }) => {
      task.processing();
      const result = await onProcess(task);
      await onSuccess(result);
      await task.success(result);
      this.success.push(task);
      callback();
    }, this.concurrency);
    this.queue.error(async (err, task) => {
      console.error(err, task);
      await onFailed(err);
      await task.failed(err);
      this.failed.push(task);
    });
    this.queue.push(this.waiting.splice(0));
    await this.queue.drain();
    this.queue = null;
    this.isWorking = false;
  }
  clear(type = "data") {
    const set = new Set(this[type]);
    this.data = this.data.filter((task) => !set.has(task));
    this[type] = [];
  }
  // todo: 下列方法或許不是最佳解,時間複雜度太高,也許能用Set來優化
  remove(task) {
    const index = this.data.indexOf(task);
    if (index !== -1)
      this.dequeue(index);
  }
  removeOther(task) {
    const index = this.data.indexOf(task);
    for (let i = this.data.length - 1; i > index; i--) {
      this.dequeue(i);
    }
    for (let i = 0; i < index; i++) {
      this.dequeue(0);
    }
  }
  removeOtherDown(task) {
    const index = this.data.indexOf(task);
    for (let i = this.data.length - 1; i > index; i--) {
      this.dequeue(i);
    }
  }
}
class PinterestError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "PinterestError";
    this.code = code;
  }
}
const _Pinterest = class _Pinterest {
};
__publicField(_Pinterest, "getVisualSearch", async (url, bookmark = "") => {
  const isBase64 = (value) => value.length > 1e3;
  try {
    eagle.log.info(`start visual search, url: ${isBase64(url) ? "base64" : url}`);
    const response = await fetch(url);
    const blob = await response.blob();
    const formData = new FormData();
    formData.append("image", blob);
    formData.append("x", "0");
    formData.append("y", "0");
    formData.append("w", "1");
    formData.append("h", "1");
    formData.append("page_size", "200");
    let apiURL = "https://api.pinterest.com/v3/visual_search/extension/image/";
    if (bookmark) {
      apiURL += `?bookmark=${bookmark}`;
    }
    const res = await fetch(apiURL, {
      method: "PUT",
      // headers: myHeaders,
      body: formData,
      redirect: "follow"
    });
    if (res.status === 401) {
      eagle.log.info(`token may be expired, please login again`);
      throw new Error("401");
    }
    const result = await res.json();
    if (result.status !== "success")
      throw new Error("response error");
    if (result.data.length === 0)
      throw new PinterestError("no results found", "ENOR");
    eagle.log.info(`end visual search`);
    console.log("bookmark", result.bookmark);
    return {
      results: result.data,
      bookmark: result.bookmark
    };
  } catch (err) {
    if (err instanceof PinterestError) {
      throw err;
    }
    throw new PinterestError(err.message, "EUNKNOWN");
  }
});
// FIXME: 考慮到可能會有其他網站也要輸出原圖，要它拆到utils?
__publicField(_Pinterest, "getLargeURL", async (src) => {
  return new Promise((resolve) => {
    let new_src = src.replace(/[0-9]+x/g, "originals");
    if (new_src.includes(".jpg") || new_src.includes(".png")) {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 3e3);
      var p1 = fetch(new_src.replace(".jpg", ".png"), {
        method: "HEAD",
        signal: controller.signal
      });
      var p2 = fetch(new_src.replace(".png", ".jpg"), {
        method: "HEAD",
        signal: controller.signal
      });
      Promise.all([p1, p2]).then((fetches) => {
        if (fetches[0].status === 200) {
          resolve(fetches[0].url);
        }
        if (fetches[1].status === 200) {
          resolve(fetches[1].url);
        }
        resolve(src);
      });
    } else {
      resolve(new_src);
    }
  });
});
__publicField(_Pinterest, "getToken", async (username, password) => {
  try {
    const token = await _Pinterest.loginToPinterest(username, password);
    if (!token) {
      throw new PinterestError(t("component.dialog.login.error.response_error"), "EUNKNOWN");
    }
    localStorage["pinterest_token"] = token;
    return token;
  } catch (error) {
    throw error;
  }
});
__publicField(_Pinterest, "createWebview", () => {
  return new Promise((resolve) => {
    let isWebviewIsCreated = true;
    let webview = document.getElementById("webview");
    if (!webview) {
      console.log("webview not found, create new one...");
      webview = document.createElement("webview");
      isWebviewIsCreated = false;
    } else {
      webview.stop();
      webview.remove();
      isWebviewIsCreated = false;
      webview = document.createElement("webview");
      isWebviewIsCreated = false;
    }
    webview.id = "webview";
    webview.src = "about:blank";
    webview.partition = "someRandomSession";
    webview.useragent = "Mozilla/7.0 (iPhone; CPU iPhone OS 17_1; iPhone 12) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
    if (!isWebviewIsCreated) {
      console.log("webview just created, append to webview-container");
      document.body.appendChild(webview);
      webview.addEventListener("dom-ready", async () => {
        resolve(webview);
      });
    } else {
      resolve(webview);
    }
  });
});
__publicField(_Pinterest, "loginToPinterest", async (username, password) => {
  eagle.log.info(`start login to pinterest`);
  const webview = await _Pinterest.createWebview();
  webview.loadURL("https://www.pinterest.com/");
  await new Promise((resolve) => webview.addEventListener("did-finish-load", resolve));
  return new Promise((resolve, reject) => {
  });
});
let Pinterest = _Pinterest;
const utils = window.__miraPinterestUtils;
const Swal = window.__miraPinterestSwal;
class Main {
  constructor() {
    this.isLoading = true;
    this.max_input_file_count = 5;
    this.currentId = null;
    this.isAlwaysOnTop = false;
    this.taskQueue = new Queue();
    this.isDetailMode = false;
    this.scale = {
      value: 240,
      min: 160,
      max: 720,
      step: 40
    };
    this.bookmark = null;
  }
  async work() {
    await this.taskQueue.start({
      onProcess: async (task) => {
        try {
          eagle.log.info(`start searching #${task.id}: ${task.name}.${task.ext}`);
          let url = task.image.large.url;
          if (task.ext !== "jpg" || task.ext !== "jpeg") {
            url = await this.convertPngToJpeg(url);
          }
          const results = await this.search(url);
          return results;
        } catch (error) {
          eagle.log.error(`#${task.id} search error : ${error}`);
          throw error;
        } finally {
          eagle.log.info(`end searching #${task.id}`);
        }
      }
    });
  }
  async search(url, continueSearch = false) {
    try {
      const { results, bookmark } = await Pinterest.getVisualSearch(url, continueSearch ? this.bookmark : null);
      this.bookmark = bookmark;
      results.forEach((item) => {
        item.saved = false;
        item.key = crypto.randomUUID();
        item.width = item.image_medium_size_pixels.width;
        item.height = item.image_medium_size_pixels.height;
        item.url = item.image_medium_url;
      });
      return results;
    } catch (err) {
      if (err.code === "ENOR") {
        this.bookmark = null;
        return [];
      }
      if (err.message === "401") {
        const account = await new Promise((resolve, reject) => {
          Swal.fire({
            title: '<svg height="40" viewBox="-3 -3 82 82" width="40" style="display: block;"><circle cx="38" cy="38" fill="white" r="40"></circle><path d="M27.5 71c3.3 1 6.7 1.6 10.3 1.6C57 72.6 72.6 57 72.6 37.8 72.6 18.6 57 3 37.8 3 18.6 3 3 18.6 3 37.8c0 14.8 9.3 27.5 22.4 32.5-.3-2.7-.6-7.2 0-10.3l4-17.2s-1-2-1-5.2c0-4.8 3-8.4 6.4-8.4 3 0 4.4 2.2 4.4 5 0 3-2 7.3-3 11.4C35.6 49 38 52 41.5 52c6.2 0 11-6.6 11-16 0-8.3-6-14-14.6-14-9.8 0-15.6 7.3-15.6 15 0 3 1 6 2.6 8 .3.2.3.5.2 1l-1 3.8c0 .6-.4.8-1 .4-4.4-2-7-8.3-7-13.4 0-11 7.8-21 22.8-21 12 0 21.3 8.6 21.3 20 0 12-7.4 21.6-18 21.6-3.4 0-6.7-1.8-7.8-4L32 61.7c-.8 3-3 7-4.5 9.4z" fill="#e60023" fill-rule="evenodd"></path></svg>',
            html: `
						<div class="swal2-input-group">
							<label for="username">${t("component.dialog.login.email")}</label>
							<input type="text" id="username" class="swal2-input">
						</div>
						<div class="swal2-input-group">
							<label for="password">${t("component.dialog.login.password")}</label>
							<input type="password" id="password" class="swal2-input">
						</div>`,
            showCancelButton: false,
            confirmButtonText: t("component.dialog.login.confirm"),
            cancelButtonText: "Cancel",
            allowOutsideClick: false,
            allowEscapeKey: false,
            preConfirm: () => {
              const username = document.getElementById("username").value;
              const password = document.getElementById("password").value;
              if (!username || !password) {
                Swal.showValidationMessage(t("component.dialog.login.error.input_empty"));
                return false;
              }
              return { username, password };
            },
            didOpen: () => {
              const usernameInput = document.getElementById("username");
              const passwordInput = document.getElementById("password");
              usernameInput.addEventListener("paste", (e) => {
                e.preventDefault();
                e.stopPropagation();
                usernameInput.value = e.clipboardData.getData("text");
              });
              passwordInput.addEventListener("paste", (e) => {
                e.preventDefault();
                e.stopPropagation();
                passwordInput.value = e.clipboardData.getData("text");
              });
            }
          }).then((result) => {
            if (result.isConfirmed) {
              resolve(result.value);
            } else {
              reject(new Error("user cancel login"));
            }
          });
        });
        try {
          if (!account) {
            throw new Error("login failed");
          }
          const token = await Pinterest.getToken(account.username, account.password);
          localStorage["pinterest_token"] = token;
          return this.search(url);
        } catch (err2) {
          console.log(err2);
          if (err2.code === "EGOOGLE") {
            let result = await Swal.fire({
              title: t("component.dialog.login.error.title"),
              text: err2.message,
              icon: "error",
              confirmButtonText: t("component.dialog.login.learn_more"),
              allowOutsideClick: false,
              allowEscapeKey: false
            });
            if (result.isConfirmed) {
              const INFO_URL_CN = "https://docs-cn.eagle.cool/article/1468-pinterest-your-account-is-connected-to-google-use-the-google-button-to-log-in";
              const INFO_URL_EN = "https://docs-en.eagle.cool/article/1469-pinterest-your-account-is-connected-to-google-use-the-google-button-to-log-in";
              if (eagle.app.locale === "zh_CN") {
                await eagle.shell.openExternal(INFO_URL_CN);
              } else {
                await eagle.shell.openExternal(INFO_URL_EN);
              }
            } else {
              throw new Error("user cancel login");
            }
          } else {
            await Swal.fire({
              title: t("component.dialog.login.error.title"),
              text: err2.message,
              icon: "error",
              allowOutsideClick: false,
              allowEscapeKey: false
            });
          }
          return this.search(url);
        }
      } else {
        throw new Error(err.message);
      }
    }
  }
  async convertPngToJpeg(url) {
    const isBase64 = (value) => value.length > 1e3;
    try {
      eagle.log.info(`start convert png to jpg, url: ${isBase64(url) ? "base64" : url}`);
      const result = await utils.image.convert(url, {
        type: "jpeg"
      });
      eagle.log.info("end convert png to jpg");
      return result;
    } catch (err) {
      throw new Error(err);
    }
  }
  // 載入資料
  async loadData() {
    const eagleItems = await eagle.item.getSelected();
    const count = eagleItems.length;
    let isSelected = false;
    for (let i = 0; i < count; i++) {
      const item = eagleItems[i];
      eagle.log.info(`start load data, id: ${item.id}`);
      if (item.thumbnailURL) {
        const task = this.taskQueue.enqueue({ ref: item });
        if (!task)
          continue;
        if (isSelected === true)
          continue;
        if (task.id) {
          this.currentId = task.id;
          isSelected = true;
        }
      }
      eagle.log.info(`end load data`);
    }
    this.work();
  }
  // 開啟網址
  async openURL(url) {
    await eagle.shell.openExternal(url);
  }
  // 儲存圖片
  async saveImage(item) {
    const url = item.image_large_url;
    const largeURL = await Pinterest.getLargeURL(url);
    const website = item.id ? `https://www.pinterest.com/pin/${item.id}/` : "";
    await eagle.item.addFromURL(largeURL, {
      website,
      name: item.title
    });
  }
  // 再查詢
  async reSearch(options) {
    if (this.taskQueue.dataMap[options.id])
      return;
    const currentIndex = this.taskQueue.data.findIndex((task) => task.id === this.currentId);
    this.taskQueue.enqueue(options, currentIndex + 1);
    this.work();
  }
  // 關閉任務
  async closeTask(index) {
    if (this.taskQueue.length <= 1) {
      this.currentId = null;
    } else {
      const next_index = (index + 1) % this.taskQueue.length;
      this.currentId = this.taskQueue.data[next_index].id;
    }
    this.taskQueue.dequeue(index);
  }
  // 關閉其他任務
  async closeOtherTask(index) {
    const task = this.taskQueue.data[index];
    this.taskQueue.removeOther(task);
    this.currentId = task.id;
  }
  // 關閉下方任務
  async closeOtherDownTask(index) {
    const task = this.taskQueue.data[index];
    this.taskQueue.removeOtherDown(task);
  }
  // 裁切查詢圖片
  async cropperSearch(url) {
    const task = this.taskQueue.dataMap[this.currentId];
    if (!task)
      return;
    task.processing();
    task.result.data = [];
    try {
      eagle.log.info("start cropper search");
      const result = await this.search(url);
      task.success(result);
      eagle.log.info("end cropper search");
    } catch (err) {
      task.failed(err);
      eagle.log.error(err);
    }
  }
  // 拖曳檔案上傳
  async dropFileUpload(files) {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        eagle.log.info(`start drop file upload, path:${file.path}`);
        const result = await utils.file.convert.fileToDataURL(file);
        const image = await utils.image.create(result);
        const task = this.taskQueue.enqueue({
          name: file.name,
          ext: file.type.split("/")[1],
          width: image.width,
          height: image.height,
          url: image.src
        });
        if (!task)
          continue;
        this.currentId = task.id;
        eagle.log.info(`end drop file upload`);
      } catch (err) {
        eagle.log.error(err);
      }
    }
    this.work();
  }
  // 剪貼簿圖片上傳
  async pasteImage() {
    try {
      eagle.log.info(`start paste image`);
      const { width, height } = eagle.clipboard.readImage().getSize();
      const buffer = eagle.clipboard.readImage().toJPEG(100);
      const url = await utils.file.convert.bufferToDataURL(buffer, "image/jpeg");
      const task = this.taskQueue.enqueue({ url, width, height });
      if (!task)
        return;
      this.currentId = task.id;
      eagle.log.info(`end paste image`);
    } catch (err) {
      eagle.log.error(err);
    }
    this.work();
  }
  // 切換視窗保持置頂
  async toggleAlwaysOnTop() {
    this.isAlwaysOnTop = !this.isAlwaysOnTop;
    await eagle.window.setAlwaysOnTop(this.isAlwaysOnTop);
  }
}
const App_vue_vue_type_style_index_0_lang = "";
const _hoisted_1 = {
  key: 0,
  class: "container"
};
const DEBOUNCE_DELAY = 1e3;
const _sfc_main = {
  __name: "App",
  setup(__props) {
    const mousetrap = inject("mousetrap");
    const main2 = reactive(new Main());
    const slideBar = ref(null);
    const inputWarningDialog = reactive({
      visible: false,
      text: {
        title: t("component.dialog.inputWarning.title"),
        description: "",
        cancel: t("component.dialog.inputWarning.cancel"),
        ok: t("component.dialog.inputWarning.ok")
      },
      ok: () => {
        load();
      },
      cancel: () => {
        main2.isLoading = false;
      }
    });
    eagle.onPluginRun(async () => {
      main2.isLoading = true;
      const items = await eagle.item.getSelected();
      if (items.length > main2.max_input_file_count) {
        inputWarningDialog.text.description = t("component.dialog.inputWarning.description", {
          count: items.length
        });
        inputWarningDialog.visible = true;
        inputWarningDialog.ok = async () => {
          await load();
        };
      } else {
        load();
      }
    });
    let lastPasteTime = 0;
    onMounted(async () => {
      window.addEventListener("paste", async (event2) => {
        const now = Date.now();
        if (now - lastPasteTime < DEBOUNCE_DELAY) {
          return;
        }
        lastPasteTime = now;
        await main2.pasteImage();
        event2.preventDefault();
      });
      mousetrap.bind(["mod+=", "=", "+"], async (event2) => {
        slideBar.value.plus();
        event2.preventDefault();
      });
      mousetrap.bind(["mod+-", "-"], async (event2) => {
        slideBar.value.minus();
        event2.preventDefault();
      });
    });
    const load = async () => {
      await main2.loadData();
      main2.isLoading = false;
    };
    const onDrop = async (files) => {
      if (files.length >= main2.max_input_file_count) {
        inputWarningDialog.text.description = t("component.dialog.inputWarning.description", {
          count: files.length
        });
        inputWarningDialog.visible = true;
        inputWarningDialog.ok = async () => {
          await main2.dropFileUpload(files);
        };
      } else {
        await main2.dropFileUpload(files);
      }
    };
    const wheel = (event2) => {
      if (event2.ctrlKey || event2.altKey || event2.metaKey) {
        const step = Math.max(-40, Math.min(40, event2.deltaY));
        main2.scale.value -= step;
        main2.scale.value = Math.min(Math.max(main2.scale.value, main2.scale.min), main2.scale.max);
        event2.stopPropagation();
        event2.preventDefault();
      }
    };
    window.addEventListener("wheel", wheel, { passive: false });
    provide("main", main2);
    return (_ctx, _cache) => {
      const _component_SlideBarVue = _sfc_main$1;
      const _component_HeaderVue = _sfc_main$2;
      const _component_ImageListVue = _sfc_main$4;
      const _component_ImagePreviewVue = _sfc_main$5;
      const _component_ImageSearchResultVue = _sfc_main$6;
      const _component_ImageVue = _sfc_main$i;
      const _component_el_empty = ElEmpty;
      const _component_DropZoneVue = _sfc_main$f;
      const _component_BodyVue = __unplugin_components_8;
      const _component_WarningDialogVue = _sfc_main$h;
      return openBlock(), createElementBlock(Fragment, null, [
        createVNode(_component_HeaderVue, null, {
          default: withCtx(() => [
            !unref(main2).isDetailMode ? (openBlock(), createBlock(_component_SlideBarVue, {
              key: 0,
              modelValue: unref(main2).scale.value,
              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => unref(main2).scale.value = $event),
              ref_key: "slideBar",
              ref: slideBar,
              data: [
                ...Array.from(
                  {
                    length: Math.floor((unref(main2).scale.max - unref(main2).scale.min) / unref(main2).scale.step) + unref(main2).scale.step
                  },
                  (_, index) => unref(main2).scale.min + index * unref(main2).scale.step
                ),
                unref(main2).scale.max
              ],
              step: unref(main2).scale.step
            }, null, 8, ["modelValue", "data", "step"])) : createCommentVNode("", true)
          ]),
          _: 1
        }),
        createVNode(_component_BodyVue, null, {
          default: withCtx(() => [
            !unref(main2).isLoading || unref(main2).taskQueue.length ? (openBlock(), createBlock(_component_DropZoneVue, {
              key: 0,
              onDrop
            }, {
              default: withCtx(() => [
                unref(main2).taskQueue.length ? (openBlock(), createElementBlock("div", _hoisted_1, [
                  createVNode(_component_ImageListVue),
                  createVNode(_component_ImagePreviewVue),
                  createVNode(_component_ImageSearchResultVue)
                ])) : (openBlock(), createBlock(_component_el_empty, {
                  key: 1,
                  description: unref(t)("main.empty.title"),
                  "image-size": 256
                }, {
                  image: withCtx(() => [
                    createVNode(_component_ImageVue, {
                      width: "256",
                      height: "144",
                      src: "light/state-empty.png",
                      darkSrc: "dark/state-empty.png"
                    })
                  ]),
                  default: withCtx(() => [
                    createTextVNode(" " + toDisplayString(unref(t)("main.empty.content")), 1)
                  ]),
                  _: 1
                }, 8, ["description"]))
              ]),
              _: 1
            })) : createCommentVNode("", true)
          ]),
          _: 1
        }),
        createVNode(_component_WarningDialogVue, {
          modelValue: unref(inputWarningDialog).visible,
          "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => unref(inputWarningDialog).visible = $event),
          text: unref(inputWarningDialog).text,
          closeOnClickModal: false,
          onOk: unref(inputWarningDialog).ok,
          onCancel: unref(inputWarningDialog).cancel
        }, null, 8, ["modelValue", "text", "onOk", "onCancel"])
      ], 64);
    };
  }
};
const main = "";
const app = createApp(_sfc_main);
app.use(VueTippy);
app.use(VueMousetrapPlugin).provide("mousetrap", app.config.globalProperties.$mousetrap);
eagle.onPluginCreate(async () => {
  process.on("uncaughtException", (error) => {
    eagle.log.error("uncaughtException : " + error);
  });
  app.mount("#app");
  toggleTheme();
});
eagle.onThemeChanged(() => {
  toggleTheme();
});
const THEME_SUPPORT = {
  Auto: eagle.app.isDarkColors() ? "gray" : "light",
  LIGHT: "light",
  LIGHTGRAY: "lightgray",
  GRAY: "gray",
  DARK: "dark",
  BLUE: "blue",
  PURPLE: "purple"
};
async function toggleTheme() {
  const theme = eagle.app.theme;
  const themeName = THEME_SUPPORT[theme] ?? "dark";
  const htmlEl = document.querySelector("html");
  htmlEl.classList.add("no-transition");
  htmlEl.setAttribute("theme", themeName);
  htmlEl.setAttribute("platform", eagle.app.platform);
  await nextTick();
  htmlEl.classList.remove("no-transition");
}
