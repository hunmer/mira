import { o as openBlock, c as createElementBlock, y as renderSlot, l as inject, m as computed, X as toDisplayString, u as unref, r as ref, w as watch, e as onMounted, B as onUnmounted, a as createBaseVNode, G as normalizeStyle, I as createVNode, O as createCommentVNode, C as createBlock, D as withCtx, E as withDirectives, p as isRef, _ as withModifiers, bv as vModelText, H as vShow, J as Fragment, a8 as renderList, F as normalizeClass, bt as vModelRadio, a0 as createTextVNode, a3 as resolveComponent, b7 as resolveDirective, K as reactive, v as provide, ao as createApp } from "./@vue-0abaa203.js";
import { E as ElDropdown, a as ElTree } from "./element-plus-d9ab7494.js";
import "./@imengyu-0ae6bf7f.js";
import { V as VueTippy } from "./vue-tippy-00819d59.js";
import { V as VueMousetrapPlugin } from "./vue-mousetrap-72e5ca11.js";
import "./@element-plus-0eb908f2.js";
import "./@ctrl-ab5a38b7.js";
import "./@vueuse-a2bc4c81.js";
import "./@popperjs-8eb851c6.js";
import "./lodash-es-58c463ae.js";
import "./vue-9128ba93.js";
import "./mousetrap-7826f5a8.js";
const __dirname = ".";
const browserUtils = {
  string: {
    format(number, digits = 3) {
      return number.toLocaleString("en-US", { maximumFractionDigits: digits });
    }
  },
  time: {
    sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }
  }
};
function require(moduleId) {
  if (moduleId.endsWith("/modules/utils/time"))
    return browserUtils.time;
  if (moduleId.endsWith("/modules/utils"))
    return browserUtils;
  throw new Error(`Unsupported browser module: ${moduleId}`);
}
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
const BodyVue_vue_vue_type_style_index_0_lang = "";
const _export_sfc = (sfc, props) => {
  const target = sfc.__vccOpts || sfc;
  for (const [key, val] of props) {
    target[key] = val;
  }
  return target;
};
const _sfc_main$b = {};
const _hoisted_1$a = { class: "body-vue" };
function _sfc_render(_ctx, _cache) {
  return openBlock(), createElementBlock("div", _hoisted_1$a, [
    renderSlot(_ctx.$slots, "default")
  ]);
}
const __unplugin_components_3 = /* @__PURE__ */ _export_sfc(_sfc_main$b, [["render", _sfc_render]]);
const BookFooterVue_vue_vue_type_style_index_0_lang = "";
const _hoisted_1$9 = { class: "book-footer-vue" };
const _sfc_main$a = {
  __name: "BookFooterVue",
  setup(__props) {
    const utils2 = require(`${__dirname}/modules/utils`);
    inject("main");
    const ePub = inject("ePub");
    const currentPage = computed(() => {
      var _a;
      return ((_a = ePub.value) == null ? void 0 : _a.currentPage) ?? 0;
    });
    const totalPage = computed(() => {
      var _a;
      return ((_a = ePub.value) == null ? void 0 : _a.totalPages) ?? 0;
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1$9, toDisplayString(unref(utils2).string.format(unref(currentPage))) + "/" + toDisplayString(unref(utils2).string.format(unref(totalPage))), 1);
    };
  }
};
const ImageVue_vue_vue_type_style_index_0_lang = "";
const _hoisted_1$8 = { class: "image-vue" };
const _hoisted_2$8 = ["src", "alt"];
const themeAttributeName = "theme";
const _sfc_main$9 = {
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
    const base_path = __dirname + "/images/";
    const isDarkTheme = {
      LIGHT: false,
      LIGHTGRAY: false,
      GRAY: true,
      DARK: true,
      BLUE: true,
      PURPLE: true,
      YELLOW: false
    };
    const uri = ref("");
    const getUrl = (theme) => {
      if (theme && isDarkTheme[theme.toUpperCase()] && props.darkSrc)
        return props.darkSrc;
      return props.src;
    };
    watch([() => props.src, () => props.darkSrc], () => {
      uri.value = getUrl(document.querySelector("html").getAttribute(themeAttributeName));
    });
    const observer = new MutationObserver((mutationsList) => {
      for (const mutation of mutationsList) {
        if (mutation.type === "attributes" && mutation.attributeName === themeAttributeName) {
          const newValue = mutation.target.getAttribute(themeAttributeName);
          uri.value = getUrl(newValue);
        }
      }
    });
    onMounted(() => {
      uri.value = getUrl(document.querySelector("html").getAttribute(themeAttributeName));
      observer.observe(document.querySelector("html"), {
        attributes: true,
        attributeFilter: [themeAttributeName]
      });
    });
    onUnmounted(() => {
      observer.disconnect();
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1$8, [
        createBaseVNode("img", {
          style: normalizeStyle({
            width: props.width + "px",
            height: props.height + "px"
          }),
          src: base_path + unref(uri),
          alt: unref(uri),
          loading: "lazy"
        }, null, 12, _hoisted_2$8),
        renderSlot(_ctx.$slots, "default")
      ]);
    };
  }
};
const messages = {
  "main.loading.loadingEpub": "Loading EPUB...",
  "main.loading.preparingEpub": "Preparing EPUB...",
  "main.loading.renderingEpub": "Rendering EPUB...",
  "main.loading.loadingPage": "Loading page...",
  "main.search.placeholder": "Search",
  "main.search.notFound": "No results",
  "main.search.empty": "Enter search text",
  "main.style.slideBarTip": "Drag to adjust",
  "main.style.theme": "Theme",
  "main.style.fontSize": "Font size",
  "main.style.lineHeight": "Line height",
  "main.style.font": "Font",
  "main.style.fontSetting.main": "Font family",
  "main.style.fontSetting.default": "Sans serif",
  "main.style.fontSetting.serif": "Serif",
  "main.style.reset": "Reset"
};
const t = (key) => messages[key] || String(key || "").split(".").pop();
const BookBodyVue_vue_vue_type_style_index_0_lang = "";
const _hoisted_1$7 = { class: "book-body-vue" };
const _hoisted_2$7 = { class: "prev" };
const _hoisted_3$7 = { class: "app" };
const _hoisted_4$6 = /* @__PURE__ */ createBaseVNode("div", { class: "book" }, [
  /* @__PURE__ */ createBaseVNode("div", { class: "empty-wrapper" }, [
    /* @__PURE__ */ createBaseVNode("div", { class: "empty" })
  ])
], -1);
const _hoisted_5$4 = {
  key: 0,
  class: "loading-overlay"
};
const _hoisted_6$3 = /* @__PURE__ */ createBaseVNode("div", { class: "loading-spinner" }, null, -1);
const _hoisted_7$2 = { class: "loading-message" };
const _hoisted_8$2 = { class: "next" };
const _sfc_main$8 = {
  __name: "BookBodyVue",
  setup(__props) {
    const ePub = inject("ePub");
    const isLoading = computed(() => {
      var _a;
      return ((_a = ePub.value) == null ? void 0 : _a.isLoading) ?? true;
    });
    const loadingMessage = computed(() => {
      var _a;
      return t(((_a = ePub.value) == null ? void 0 : _a.loadingMessage) || "main.loading.loadingEpub");
    });
    onMounted(async () => {
      ePub.value = new ePubApp(document.querySelector(".app"));
      const urlParams = new URLSearchParams(window.location.search);
      const url = urlParams.get("path");
      ePub.value.setLoading("main.loading.loadingEpub");
      try {
        const response = await fetch(url);
        const data = await response.arrayBuffer();
        await ePub.value.doBook(data, {
          encoding: "binary"
        });
      } catch (err) {
        ePub.value.clearLoading();
        throw err;
      }
    });
    return (_ctx, _cache) => {
      const _component_ImageVue = _sfc_main$9;
      return openBlock(), createElementBlock("div", _hoisted_1$7, [
        createBaseVNode("div", _hoisted_2$7, [
          createBaseVNode("div", {
            class: "prev-btn",
            onClick: _cache[0] || (_cache[0] = ($event) => {
              var _a, _b, _c;
              return (_c = (_b = (_a = unref(ePub)) == null ? void 0 : _a.state) == null ? void 0 : _b.rendition) == null ? void 0 : _c.prev();
            })
          }, [
            createVNode(_component_ImageVue, {
              width: "6.5",
              height: "12",
              src: "light/prev-page-vertor.svg",
              darkSrc: "dark/prev-page-vertor.svg"
            })
          ])
        ]),
        createBaseVNode("div", _hoisted_3$7, [
          _hoisted_4$6,
          unref(isLoading) ? (openBlock(), createElementBlock("div", _hoisted_5$4, [
            _hoisted_6$3,
            createBaseVNode("div", _hoisted_7$2, toDisplayString(unref(loadingMessage)), 1)
          ])) : createCommentVNode("", true)
        ]),
        createBaseVNode("div", _hoisted_8$2, [
          createBaseVNode("div", {
            class: "next-btn",
            onClick: _cache[1] || (_cache[1] = ($event) => {
              var _a, _b, _c;
              return (_c = (_b = (_a = unref(ePub)) == null ? void 0 : _a.state) == null ? void 0 : _b.rendition) == null ? void 0 : _c.next();
            })
          }, [
            createVNode(_component_ImageVue, {
              width: "6.5",
              height: "12",
              src: "light/next-page-vertor.svg",
              darkSrc: "dark/next-page-vertor.svg"
            })
          ])
        ])
      ]);
    };
  }
};
const utils = require(`${__dirname}/modules/utils`);
const THEME_SUPPORT = {
  LIGHT: "light",
  LIGHTGRAY: "lightgray",
  GRAY: "gray",
  DARK: "dark",
  BLUE: "blue",
  PURPLE: "purple",
  YELLOW: "yellow"
};
function useTheme() {
  async function toggleTheme(theme) {
    if (!theme)
      return;
    theme = theme.toUpperCase();
    const htmlEl = document.querySelector("html");
    htmlEl.classList.add("no-transition");
    let themeName = theme;
    if (themeName === "AUTO")
      themeName = eagle.app.theme.toUpperCase();
    if (themeName === "AUTO")
      themeName = window.matchMedia("(prefers-color-scheme: dark)").matches ? "DARK" : "LIGHT";
    themeName = THEME_SUPPORT[themeName];
    htmlEl.setAttribute("theme", themeName);
    htmlEl.setAttribute("platform", eagle.app.platform);
    await utils.time.sleep(33);
    htmlEl.classList.remove("no-transition");
  }
  return {
    toggleTheme
  };
}
const SearchVue_vue_vue_type_style_index_0_lang = "";
const _hoisted_1$6 = { class: "container" };
const _hoisted_2$6 = { class: "feature" };
const _hoisted_3$6 = { class: "search" };
const _hoisted_4$5 = ["placeholder"];
const _hoisted_5$3 = {
  key: 0,
  class: "search-result"
};
const _hoisted_6$2 = ["onClick"];
const _hoisted_7$1 = ["innerHTML"];
const _hoisted_8$1 = { class: "description" };
const _hoisted_9$1 = {
  key: 0,
  class: "dash"
};
const _hoisted_10$1 = {
  key: 1,
  class: "search-result-empty"
};
const _hoisted_11$1 = {
  key: 1,
  class: "search-result-empty"
};
const _sfc_main$7 = {
  __name: "SearchVue",
  setup(__props) {
    const utils2 = require(`${__dirname}/modules/utils`);
    const ePub = inject("ePub");
    const dropdownEl = ref(null);
    const searchEl = ref(null);
    const search = ref("");
    const results = ref([]);
    watch(
      () => search.value,
      async (value) => {
        results.value = (await ePub.value.doSearch(value)).map((result) => {
          result.excerpt = result.excerpt.replace(
            new RegExp(value, "gi"),
            (match) => `<span class="highlight">${match}</span>`
          );
          return {
            ...result
            // ,outline
          };
        });
      }
    );
    return (_ctx, _cache) => {
      const _component_ImageVue = _sfc_main$9;
      const _component_el_dropdown = ElDropdown;
      return openBlock(), createBlock(_component_el_dropdown, {
        trigger: "click",
        class: "no-tick",
        "popper-class": "search-dropdown",
        ref_key: "dropdownEl",
        ref: dropdownEl
      }, {
        dropdown: withCtx(() => [
          createBaseVNode("div", _hoisted_1$6, [
            createBaseVNode("div", _hoisted_2$6, [
              createBaseVNode("div", _hoisted_3$6, [
                createVNode(_component_ImageVue, {
                  class: "search-icon",
                  width: "16",
                  height: "16",
                  src: "light/search-icon.svg",
                  darkSrc: "dark/search-icon.svg",
                  onClick: _cache[1] || (_cache[1] = ($event) => unref(searchEl).focus())
                }),
                withDirectives(createBaseVNode("input", {
                  "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => isRef(search) ? search.value = $event : null),
                  class: "search-input",
                  type: "text",
                  placeholder: unref(t)("main.search.placeholder"),
                  ref_key: "searchEl",
                  ref: searchEl,
                  onKeydown: _cache[3] || (_cache[3] = withModifiers(() => {
                  }, ["stop"]))
                }, null, 40, _hoisted_4$5), [
                  [vModelText, unref(search)]
                ]),
                withDirectives(createVNode(_component_ImageVue, {
                  class: "search-close",
                  width: "24",
                  height: "24",
                  src: "light/search-close.svg",
                  darkSrc: "dark/search-close.svg",
                  onClick: _cache[4] || (_cache[4] = () => {
                    search.value = "";
                    unref(searchEl).focus();
                  })
                }, null, 512), [
                  [vShow, unref(search).length]
                ])
              ]),
              createVNode(_component_ImageVue, {
                class: "icon",
                width: "24",
                height: "24",
                src: "light/base/ic-header-close.svg",
                darkSrc: "dark/base/ic-header-close.svg",
                onClick: _cache[5] || (_cache[5] = ($event) => unref(dropdownEl).handleClose())
              })
            ]),
            unref(search).length ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
              unref(results).length ? (openBlock(), createElementBlock("div", _hoisted_5$3, [
                (openBlock(true), createElementBlock(Fragment, null, renderList(unref(results), (result, index) => {
                  return openBlock(), createElementBlock(Fragment, { key: result }, [
                    createBaseVNode("div", {
                      class: "search-result-item",
                      onClick: ($event) => unref(ePub).state.rendition.display(result.cfi)
                    }, [
                      createBaseVNode("div", {
                        class: "title",
                        innerHTML: result.excerpt
                      }, null, 8, _hoisted_7$1),
                      createBaseVNode("div", _hoisted_8$1, toDisplayString(result.outline), 1)
                    ], 8, _hoisted_6$2),
                    index !== unref(results).length - 1 ? (openBlock(), createElementBlock("div", _hoisted_9$1)) : createCommentVNode("", true)
                  ], 64);
                }), 128))
              ])) : (openBlock(), createElementBlock("div", _hoisted_10$1, toDisplayString(unref(t)("main.search.notFound")), 1))
            ], 64)) : (openBlock(), createElementBlock("div", _hoisted_11$1, toDisplayString(unref(t)("main.search.empty")), 1))
          ])
        ]),
        default: withCtx(() => [
          createVNode(_component_ImageVue, {
            class: "icon",
            width: "24",
            height: "24",
            src: "light/search.svg",
            darkSrc: "dark/search.svg",
            onClick: _cache[0] || (_cache[0] = ($event) => unref(utils2).time.sleep(1).then(() => unref(searchEl).focus()))
          })
        ]),
        _: 1
      }, 512);
    };
  }
};
const InfoVue_vue_vue_type_style_index_0_lang = "";
const _hoisted_1$5 = ["src", "alt"];
const _hoisted_2$5 = { class: "title" };
const _hoisted_3$5 = { class: "author" };
const _hoisted_4$4 = { class: "description" };
const _sfc_main$6 = {
  __name: "InfoVue",
  setup(__props) {
    const ePub = inject("ePub");
    const cover = computed(() => {
      var _a;
      return (_a = ePub.value) == null ? void 0 : _a.coverUrl;
    });
    const title = computed(() => {
      var _a, _b;
      return (_b = (_a = ePub.value) == null ? void 0 : _a.metadata) == null ? void 0 : _b.title;
    });
    const author = computed(() => {
      var _a, _b;
      return (_b = (_a = ePub.value) == null ? void 0 : _a.metadata) == null ? void 0 : _b.creator;
    });
    const description = computed(() => {
      var _a, _b;
      return (_b = (_a = ePub.value) == null ? void 0 : _a.metadata) == null ? void 0 : _b.description;
    });
    return (_ctx, _cache) => {
      const _component_ImageVue = _sfc_main$9;
      const _component_el_dropdown = ElDropdown;
      return openBlock(), createBlock(_component_el_dropdown, {
        trigger: "click",
        class: "no-tick",
        "popper-class": "info-dropdown"
      }, {
        dropdown: withCtx(() => [
          createBaseVNode("img", {
            class: "cover img-border",
            src: unref(cover),
            alt: unref(cover)
          }, null, 8, _hoisted_1$5),
          createBaseVNode("div", _hoisted_2$5, toDisplayString(unref(title)), 1),
          createBaseVNode("div", _hoisted_3$5, toDisplayString(unref(author)), 1),
          createBaseVNode("div", _hoisted_4$4, toDisplayString(unref(description)), 1)
        ]),
        default: withCtx(() => [
          createVNode(_component_ImageVue, {
            class: "icon",
            width: "24",
            height: "24",
            src: "light/info.svg",
            darkSrc: "dark/info.svg"
          })
        ]),
        _: 1
      });
    };
  }
};
const OutlineVue_vue_vue_type_style_index_0_lang = "";
const _hoisted_1$4 = { class: "container" };
const _hoisted_2$4 = {
  class: /* @__PURE__ */ normalizeClass([
    "chapter",
    {
      selected: false
    }
  ])
};
const _hoisted_3$4 = { class: "title" };
const _hoisted_4$3 = { class: "page" };
const _sfc_main$5 = {
  __name: "OutlineVue",
  setup(__props) {
    const ePub = inject("ePub");
    return (_ctx, _cache) => {
      const _component_ImageVue = _sfc_main$9;
      const _component_el_tree = ElTree;
      const _component_el_dropdown = ElDropdown;
      return openBlock(), createBlock(_component_el_dropdown, {
        trigger: "click",
        class: "no-tick",
        "popper-class": "outline-dropdown"
      }, {
        dropdown: withCtx(() => {
          var _a;
          return [
            createBaseVNode("div", _hoisted_1$4, [
              createVNode(_component_el_tree, {
                data: (_a = unref(ePub)) == null ? void 0 : _a.outline,
                props: {
                  label: "label",
                  children: "subitems",
                  class: (data) => {
                    return data.href === unref(ePub).currentOutlineHref ? "active" : "";
                  }
                },
                onNodeClick: _cache[0] || (_cache[0] = (item) => unref(ePub).state.rendition.display(item.href))
              }, {
                default: withCtx(({ node, data }) => [
                  createBaseVNode("div", _hoisted_2$4, [
                    createBaseVNode("div", _hoisted_3$4, toDisplayString(data.label), 1),
                    createBaseVNode("div", _hoisted_4$3, toDisplayString(data.page), 1)
                  ])
                ]),
                _: 1
              }, 8, ["data", "props"])
            ])
          ];
        }),
        default: withCtx(() => [
          createVNode(_component_ImageVue, {
            class: "icon",
            width: "24",
            height: "24",
            src: "light/outline.svg",
            darkSrc: "dark/outline.svg"
          })
        ]),
        _: 1
      });
    };
  }
};
const ToggleSwitchSliderVue_vue_vue_type_style_index_0_lang = "";
const _hoisted_1$3 = { class: "toggle-switch-slider-vue" };
const _hoisted_2$3 = ["for"];
const _hoisted_3$3 = ["id", "name", "value"];
const _sfc_main$4 = {
  __name: "ToggleSwitchSliderVue",
  props: {
    modelValue: {
      type: Number,
      required: true
    },
    data: {
      type: Array,
      required: true
    }
  },
  emits: ["update:modelValue"],
  setup(__props, { emit }) {
    const props = __props;
    const value = computed({
      get() {
        return props.modelValue;
      },
      set(value2) {
        emit("update:modelValue", value2);
      }
    });
    const name = crypto.randomUUID();
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1$3, [
        (openBlock(true), createElementBlock(Fragment, null, renderList(props.data, (data) => {
          return openBlock(), createElementBlock("label", {
            key: data,
            for: `toggle-switch-slider-${data}`
          }, [
            withDirectives(createBaseVNode("input", {
              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => isRef(value) ? value.value = $event : null),
              type: "radio",
              id: `toggle-switch-slider-${data}`,
              name: unref(name),
              value: data,
              hidden: ""
            }, null, 8, _hoisted_3$3), [
              [vModelRadio, unref(value)]
            ]),
            renderSlot(_ctx.$slots, "default", { data }, () => [
              createTextVNode(toDisplayString(data), 1)
            ])
          ], 8, _hoisted_2$3);
        }), 128))
      ]);
    };
  }
};
const SlideBarVue_vue_vue_type_style_index_0_lang = "";
const _hoisted_1$2 = ["onKeydown"];
const _hoisted_2$2 = { class: "range-wrap" };
const _hoisted_3$2 = { class: "range-progressbar" };
const _hoisted_4$2 = ["min", "max", "step"];
const _hoisted_5$2 = ["data-number"];
const _hoisted_6$1 = ["innerHTML"];
const _sfc_main$3 = {
  __name: "SlideBarVue",
  props: {
    modelValue: {
      type: Number,
      default: 0
    },
    data: {
      type: Array,
      default: Array.from({ length: 100 - 0 + 1 }, (_, index) => index + 0),
      required: true
    },
    step: {
      type: Number
    }
  },
  emits: ["update:modelValue", "changed"],
  setup(__props, { expose: __expose, emit }) {
    const props = __props;
    require(`${__dirname}/modules/utils/time`);
    const min = computed(() => Number(props.data[0] ?? 0));
    const max = computed(() => Number(props.data[props.data.length - 1] ?? 100));
    const step = computed(() => props.step ?? (max.value - min.value) / 100);
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
    const onKeyHandle = (event2) => {
      switch (event2.key) {
        case "-":
          minus();
          break;
        case "=":
        case "+":
          plus();
          break;
      }
    };
    __expose({
      minus,
      plus
    });
    return (_ctx, _cache) => {
      const _component_ImageVue = _sfc_main$9;
      const _component_tippy = resolveComponent("tippy");
      return openBlock(), createBlock(_component_tippy, {
        allowHTML: "",
        placement: "top",
        duration: "[200,0]",
        delay: "[0,0]"
      }, {
        default: withCtx(() => [
          createBaseVNode("div", {
            class: "slide-bar-vue",
            style: normalizeStyle({ "--number": unref(slide_bar_value) }),
            onKeydown: withModifiers(onKeyHandle, ["stop"])
          }, [
            createBaseVNode("span", { onClick: minus }, [
              renderSlot(_ctx.$slots, "minus", {}, () => [
                createVNode(_component_ImageVue, {
                  width: "23",
                  height: "23",
                  src: "light/base/ic-slide-bar-minus.svg",
                  darkSrc: "dark/base/ic-slide-bar-minus.svg"
                })
              ])
            ]),
            createBaseVNode("div", _hoisted_2$2, [
              createBaseVNode("div", _hoisted_3$2, [
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
                }, null, 8, _hoisted_4$2), [
                  [vModelText, unref(slide_bar_value)]
                ]),
                createBaseVNode("div", {
                  class: "current-thumb",
                  style: normalizeStyle({
                    left: (unref(slide_bar_value) - unref(min)) / (unref(max) - unref(min)) * 100 + "%"
                  }),
                  "data-number": unref(slide_bar_value)
                }, null, 12, _hoisted_5$2)
              ])
            ]),
            createBaseVNode("span", { onClick: plus }, [
              renderSlot(_ctx.$slots, "plus", {}, () => [
                createVNode(_component_ImageVue, {
                  class: "icon",
                  width: "23",
                  height: "23",
                  src: "light/base/ic-slide-bar-plus.svg",
                  darkSrc: "dark/base/ic-slide-bar-plus.svg"
                })
              ])
            ])
          ], 44, _hoisted_1$2)
        ]),
        content: withCtx(() => [
          createBaseVNode("span", {
            innerHTML: unref(t)("main.style.slideBarTip")
          }, null, 8, _hoisted_6$1)
        ]),
        _: 3
      });
    };
  }
};
const StyleVue_vue_vue_type_style_index_0_lang = "";
const _hoisted_1$1 = { class: "container" };
const _hoisted_2$1 = { class: "title theme" };
const _hoisted_3$1 = { class: "name" };
const _hoisted_4$1 = { class: "feature" };
const _hoisted_5$1 = ["onClick"];
const _hoisted_6 = { class: "title font-size" };
const _hoisted_7 = { class: "name" };
const _hoisted_8 = { class: "feature" };
const _hoisted_9 = { class: "title line-height" };
const _hoisted_10 = { class: "name" };
const _hoisted_11 = { class: "feature" };
const _hoisted_12 = { class: "title font" };
const _hoisted_13 = { class: "name" };
const _hoisted_14 = { class: "feature" };
const _hoisted_15 = { class: "description" };
const _hoisted_16 = /* @__PURE__ */ createBaseVNode("div", { class: "dash" }, null, -1);
const _sfc_main$2 = {
  __name: "StyleVue",
  setup(__props) {
    const { toggleTheme } = useTheme();
    const ePub = inject("ePub");
    const isDarkTheme = {
      Auto: false,
      LIGHT: false,
      LIGHTGRAY: false,
      GRAY: true,
      DARK: true,
      BLUE: true,
      PURPLE: true,
      YELLOW: false
    };
    const theme = computed({
      get: () => {
        var _a;
        let theme2 = (_a = ePub.value) == null ? void 0 : _a.setting.theme;
        return theme2;
      },
      set: (value) => {
        if (!ePub.value)
          return;
        ePub.value.setSetting("theme", value);
      }
    });
    const fontSize = computed({
      get: () => {
        var _a;
        return (_a = ePub.value) == null ? void 0 : _a.setting.fontSize;
      },
      set: async (value) => {
        if (!ePub.value)
          return;
        ePub.value.setSetting("fontSize", value);
      }
    });
    const lineHeight = computed({
      get: () => {
        var _a;
        return (_a = ePub.value) == null ? void 0 : _a.setting.lineHeight;
      },
      set: (value) => {
        if (!ePub.value)
          return;
        ePub.value.setSetting("lineHeight", value);
      }
    });
    const font = computed({
      get: () => {
        var _a;
        return (_a = ePub.value) == null ? void 0 : _a.setting.font;
      },
      set: (value) => {
        if (!ePub.value)
          return;
        ePub.value.setSetting("font", value);
      }
    });
    watch(
      () => theme.value,
      async (value) => {
        await setTheme(value);
      }
    );
    const setTheme = async (themeName) => {
      if (!themeName)
        return;
      if (themeName === "transparent" || themeName === "auto") {
        const themeType = new URLSearchParams(window.location.search).get("theme").toUpperCase();
        await toggleTheme(isDarkTheme[themeType] ? "dark" : "light");
      } else {
        await toggleTheme(themeName);
      }
      ePub.value.applyTheme();
    };
    return (_ctx, _cache) => {
      const _component_ImageVue = _sfc_main$9;
      const _component_SlideBarVue = _sfc_main$3;
      const _component_ToggleSwitchSliderVue = _sfc_main$4;
      const _component_el_dropdown = ElDropdown;
      const _directive_tippy = resolveDirective("tippy");
      return openBlock(), createBlock(_component_el_dropdown, {
        trigger: "click",
        class: "no-tick",
        "popper-class": "style-dropdown"
      }, {
        dropdown: withCtx(() => {
          var _a, _b, _c, _d, _e, _f;
          return [
            createBaseVNode("div", _hoisted_1$1, [
              createBaseVNode("div", _hoisted_2$1, [
                createBaseVNode("div", _hoisted_3$1, toDisplayString(unref(t)("main.style.theme")), 1),
                createBaseVNode("div", _hoisted_4$1, [
                  (openBlock(), createElementBlock(Fragment, null, renderList([
                    /*'auto',*/
                    "transparent",
                    "light",
                    "yellow",
                    "dark"
                  ], (themeName) => {
                    return withDirectives(createBaseVNode("div", {
                      key: themeName,
                      class: normalizeClass([
                        "theme-btn",
                        "theme-btn-" + themeName,
                        {
                          active: unref(theme) === themeName
                        }
                      ]),
                      onClick: ($event) => theme.value = themeName
                    }, null, 10, _hoisted_5$1), [
                      [_directive_tippy, {
                        content: unref(t)("main.style.themeSettingTip." + themeName),
                        delay: [0, 0],
                        duration: [200, 0]
                      }]
                    ]);
                  }), 64))
                ])
              ]),
              createBaseVNode("div", _hoisted_6, [
                createBaseVNode("div", _hoisted_7, toDisplayString(unref(t)("main.style.fontSize")), 1),
                createBaseVNode("div", _hoisted_8, [
                  createVNode(_component_SlideBarVue, {
                    modelValue: unref(fontSize),
                    "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => isRef(fontSize) ? fontSize.value = $event : null),
                    data: Array.from(
                      {
                        length: ((_a = unref(ePub)) == null ? void 0 : _a.setting_dictionary.fontSize.max) - ((_b = unref(ePub)) == null ? void 0 : _b.setting_dictionary.fontSize.min) + 1
                      },
                      (_, index) => {
                        var _a2;
                        return index + ((_a2 = unref(ePub)) == null ? void 0 : _a2.setting_dictionary.fontSize.min);
                      }
                    ),
                    step: (_c = unref(ePub)) == null ? void 0 : _c.setting_dictionary.fontSize.step
                  }, {
                    minus: withCtx(() => [
                      createVNode(_component_ImageVue, {
                        width: "16",
                        height: "16",
                        src: "light/font-size-small.svg",
                        darkSrc: "dark/font-size-small.svg"
                      })
                    ]),
                    plus: withCtx(() => [
                      createVNode(_component_ImageVue, {
                        width: "16",
                        height: "16",
                        src: "light/font-size-large.svg",
                        darkSrc: "dark/font-size-large.svg"
                      })
                    ]),
                    _: 1
                  }, 8, ["modelValue", "data", "step"])
                ])
              ]),
              createBaseVNode("div", _hoisted_9, [
                createBaseVNode("div", _hoisted_10, toDisplayString(unref(t)("main.style.lineHeight")), 1),
                createBaseVNode("div", _hoisted_11, [
                  createVNode(_component_SlideBarVue, {
                    modelValue: unref(lineHeight),
                    "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => isRef(lineHeight) ? lineHeight.value = $event : null),
                    data: Array.from(
                      {
                        length: (((_d = unref(ePub)) == null ? void 0 : _d.setting_dictionary.lineHeight.max) - ((_e = unref(ePub)) == null ? void 0 : _e.setting_dictionary.lineHeight.min)) * 10 + 1
                      },
                      (_, index) => {
                        var _a2;
                        return index / 10 + ((_a2 = unref(ePub)) == null ? void 0 : _a2.setting_dictionary.lineHeight.min);
                      }
                    ),
                    step: (_f = unref(ePub)) == null ? void 0 : _f.setting_dictionary.lineHeight.step
                  }, {
                    minus: withCtx(() => [
                      createVNode(_component_ImageVue, {
                        width: "16",
                        height: "16",
                        src: "light/line-height-small.svg",
                        darkSrc: "dark/line-height-small.svg"
                      })
                    ]),
                    plus: withCtx(() => [
                      createVNode(_component_ImageVue, {
                        width: "16",
                        height: "16",
                        src: "light/line-height-large.svg",
                        darkSrc: "dark/line-height-large.svg"
                      })
                    ]),
                    _: 1
                  }, 8, ["modelValue", "data", "step"])
                ])
              ]),
              createBaseVNode("div", _hoisted_12, [
                createBaseVNode("div", _hoisted_13, toDisplayString(unref(t)("main.style.font")), 1),
                createBaseVNode("div", _hoisted_14, [
                  createVNode(_component_ToggleSwitchSliderVue, {
                    modelValue: unref(font),
                    "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => isRef(font) ? font.value = $event : null),
                    data: ["default", "serif"],
                    class: "font-switch"
                  }, {
                    default: withCtx(({ data }) => {
                      var _a2;
                      return [
                        createBaseVNode("div", {
                          class: "title",
                          style: normalizeStyle({
                            fontFamily: (_a2 = unref(ePub)) == null ? void 0 : _a2.setting_dictionary.font[data]
                          })
                        }, toDisplayString(unref(t)("main.style.fontSetting.main")), 5),
                        createBaseVNode("div", _hoisted_15, toDisplayString({
                          default: unref(t)("main.style.fontSetting.default"),
                          serif: unref(t)("main.style.fontSetting.serif")
                        }[data]), 1)
                      ];
                    }),
                    _: 1
                  }, 8, ["modelValue"])
                ])
              ]),
              _hoisted_16,
              createBaseVNode("div", {
                class: "reset icon",
                onClick: _cache[3] || (_cache[3] = (...args) => unref(ePub).resetSetting && unref(ePub).resetSetting(...args))
              }, [
                createVNode(_component_ImageVue, {
                  style: { "margin": "0 6px 0 0" },
                  width: "20",
                  height: "20",
                  src: "light/reset.svg",
                  darkSrc: "dark/reset.svg"
                }),
                createTextVNode(" " + toDisplayString(unref(t)("main.style.reset")), 1)
              ])
            ])
          ];
        }),
        default: withCtx(() => [
          createVNode(_component_ImageVue, {
            class: "icon",
            width: "24",
            height: "24",
            src: "light/style.svg",
            darkSrc: "dark/style.svg"
          })
        ]),
        _: 1
      });
    };
  }
};
const BookHeaderVue_vue_vue_type_style_index_0_lang = "";
const _hoisted_1 = { class: "book-header-vue" };
const _hoisted_2 = { class: "left" };
const _hoisted_3 = { class: "mid" };
const _hoisted_4 = /* @__PURE__ */ createBaseVNode("span", { class: "dash" }, "-", -1);
const _hoisted_5 = { class: "right" };
const _sfc_main$1 = {
  __name: "BookHeaderVue",
  setup(__props) {
    inject("main");
    const ePub = inject("ePub");
    const title = computed(() => {
      var _a, _b, _c;
      return (_c = (_b = (_a = ePub.value) == null ? void 0 : _a.metadata) == null ? void 0 : _b.title) == null ? void 0 : _c.trim();
    });
    const author = computed(() => {
      var _a, _b, _c;
      return (_c = (_b = (_a = ePub.value) == null ? void 0 : _a.metadata) == null ? void 0 : _b.creator) == null ? void 0 : _c.trim();
    });
    return (_ctx, _cache) => {
      const _component_OutlineVue = _sfc_main$5;
      const _component_InfoVue = _sfc_main$6;
      const _component_SearchVue = _sfc_main$7;
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createBaseVNode("div", _hoisted_2, [
          createVNode(_component_OutlineVue),
          createVNode(_component_InfoVue)
        ]),
        createBaseVNode("div", _hoisted_3, [
          createTextVNode(toDisplayString(unref(title)) + " ", 1),
          unref(author) ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
            _hoisted_4,
            createTextVNode(" " + toDisplayString(unref(author)), 1)
          ], 64)) : createCommentVNode("", true)
        ]),
        createBaseVNode("div", _hoisted_5, [
          createVNode(_sfc_main$2),
          createVNode(_component_SearchVue)
        ])
      ]);
    };
  }
};
class Task {
  constructor(args) {
    this.id = args.id ?? crypto.randomUUID();
    this.name = args.name;
    this.ext = args.ext;
    this.url = args.url;
    this.path = args.path;
    this.thumbnailPath = args.thumbnailPath;
    this.thumbnailURL = args.thumbnailURL;
    this.width = args.width;
    this.height = args.height;
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
  isSuccessful() {
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
  processing(process = 0) {
    this.result.state = "processing";
    this.result.message = "";
    this.result.data = process;
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
  async execute(func = async () => {
  }) {
    this.processing();
    try {
      this.success(await func());
    } catch (err) {
      this.failed(err);
    }
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
    this.isWorking = false;
    this.isProcessing = false;
    this.enqueue(data);
  }
  get length() {
    return this.data.length;
  }
  get complete() {
    return [...this.failed, ...this.success];
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
    }
  }
  dequeue(index = 0) {
    const task = this.data.splice(index, 1)[0];
    delete this.dataMap[task.id];
    for (let i of this.type) {
      const index2 = this[i].indexOf(task);
      if (index2 !== -1)
        this[i].splice(index2, 1);
    }
    return task;
  }
  dequeueById(id) {
    const task = this.dataMap[id];
    if (!task)
      return;
    const index = this.data.indexOf(task);
    return this.dequeue(index);
  }
  peek() {
    return this.data[0];
  }
  pause() {
    this.isWorking = false;
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
    while (this.waiting.length > 0 && this.isWorking) {
      this.isProcessing = true;
      const task = this.waiting.shift();
      task.processing();
      try {
        const result = await onProcess(task);
        await onSuccess(result);
        task.success(result);
        this.success.push(task);
      } catch (err) {
        await onFailed(err);
        this.failed.push(task);
        task.failed(err);
      }
      this.isProcessing = false;
    }
    this.isWorking = false;
  }
  clear(type = "data") {
    console.time("remove data : " + type);
    while (this[type].length) {
      const task = this[type].shift();
      const index = this.data.indexOf(task);
      this.dequeue(index);
    }
    console.timeEnd("remove data : " + type);
  }
  async reset() {
    this.isWorking = false;
    while (this.isProcessing)
      await new Promise((resolve) => setTimeout(resolve, 1));
    this.waiting = [...this.data];
    this.processing = [];
    this.success = [];
    for (let task of this.data)
      task.waiting();
  }
}
require(`${__dirname}/modules/utils`);
class Main {
  constructor() {
    this.isLoading = true;
    this.currentId = null;
    this.taskQueue = new Queue();
  }
}
const App_vue_vue_type_style_index_0_lang = "";
const _sfc_main = {
  __name: "App",
  setup(__props) {
    inject("mousetrap");
    require(`${__dirname}/modules/utils`);
    const main2 = reactive(new Main());
    const ePub = ref(null);
    provide("main", main2);
    provide("ePub", ePub);
    const theme = computed(() => {
      var _a;
      return (_a = ePub.value) == null ? void 0 : _a.setting.theme;
    });
    return (_ctx, _cache) => {
      const _component_BookHeaderVue = _sfc_main$1;
      const _component_BookBodyVue = _sfc_main$8;
      const _component_BookFooterVue = _sfc_main$a;
      const _component_BodyVue = __unplugin_components_3;
      return openBlock(), createBlock(_component_BodyVue, {
        class: "body",
        style: normalizeStyle({
          backgroundColor: unref(theme) === "transparent" ? "transparent" : "var(--color-theme-90)"
        })
      }, {
        default: withCtx(() => [
          createVNode(_component_BookHeaderVue, { class: "book-header" }),
          createVNode(_component_BookBodyVue, { class: "book-body" }),
          createVNode(_component_BookFooterVue, { class: "book-footer" })
        ]),
        _: 1
      }, 8, ["style"]);
    };
  }
};
(() => {
  class Pointer {
    constructor(nativePointer) {
      this.id = -1;
      this.nativePointer = nativePointer;
      this.pageX = nativePointer.pageX;
      this.pageY = nativePointer.pageY;
      this.clientX = nativePointer.clientX;
      this.clientY = nativePointer.clientY;
      if (self.Touch && nativePointer instanceof Touch) {
        this.id = nativePointer.identifier;
      } else if (isPointerEvent(nativePointer)) {
        this.id = nativePointer.pointerId;
      }
    }
    /**
     * Returns an expanded set of Pointers for high-resolution inputs.
     */
    getCoalesced() {
      if ("getCoalescedEvents" in this.nativePointer) {
        return this.nativePointer.getCoalescedEvents().map((p) => new Pointer(p));
      }
      return [this];
    }
  }
  const isPointerEvent = (event2) => self.PointerEvent && event2 instanceof PointerEvent;
  const noop = () => {
  };
  class PointerTracker {
    /**
     * Track pointers across a particular element
     *
     * @param element Element to monitor.
     * @param callbacks
     */
    constructor(_element, callbacks) {
      this._element = _element;
      this.startPointers = [];
      this.currentPointers = [];
      const { start = () => true, move = noop, end = noop } = callbacks;
      this._startCallback = start;
      this._moveCallback = move;
      this._endCallback = end;
      this._pointerStart = this._pointerStart.bind(this);
      this._touchStart = this._touchStart.bind(this);
      this._move = this._move.bind(this);
      this._triggerPointerEnd = this._triggerPointerEnd.bind(this);
      this._pointerEnd = this._pointerEnd.bind(this);
      this._touchEnd = this._touchEnd.bind(this);
      if (self.PointerEvent) {
        this._element.addEventListener("pointerdown", this._pointerStart);
      } else {
        this._element.addEventListener("mousedown", this._pointerStart);
        this._element.addEventListener("touchstart", this._touchStart);
        this._element.addEventListener("touchmove", this._move);
        this._element.addEventListener("touchend", this._touchEnd);
      }
    }
    /**
     * Call the start callback for this pointer, and track it if the user wants.
     *
     * @param pointer Pointer
     * @param event Related event
     * @returns Whether the pointer is being tracked.
     */
    _triggerPointerStart(pointer, event2) {
      if (!this._startCallback(pointer, event2))
        return false;
      this.currentPointers.push(pointer);
      this.startPointers.push(pointer);
      return true;
    }
    /**
     * Listener for mouse/pointer starts. Bound to the class in the constructor.
     *
     * @param event This will only be a MouseEvent if the browser doesn't support
     * pointer events.
     */
    _pointerStart(event2) {
      if (event2.button !== 0)
        return;
      if (!this._triggerPointerStart(new Pointer(event2), event2))
        return;
      if (isPointerEvent(event2)) {
        this._element.setPointerCapture(event2.pointerId);
        this._element.addEventListener("pointermove", this._move);
        this._element.addEventListener("pointerup", this._pointerEnd);
      } else {
        window.addEventListener("mousemove", this._move);
        window.addEventListener("mouseup", this._pointerEnd);
      }
    }
    /**
     * Listener for touchstart. Bound to the class in the constructor.
     * Only used if the browser doesn't support pointer events.
     */
    _touchStart(event2) {
      for (const touch of Array.from(event2.changedTouches)) {
        this._triggerPointerStart(new Pointer(touch), event2);
      }
    }
    /**
     * Listener for pointer/mouse/touch move events.
     * Bound to the class in the constructor.
     */
    _move(event2) {
      const previousPointers = this.currentPointers.slice();
      const changedPointers = "changedTouches" in event2 ? Array.from(event2.changedTouches).map((t2) => new Pointer(t2)) : [new Pointer(event2)];
      const trackedChangedPointers = [];
      for (const pointer of changedPointers) {
        const index = this.currentPointers.findIndex((p) => p.id === pointer.id);
        if (index === -1)
          continue;
        trackedChangedPointers.push(pointer);
        this.currentPointers[index] = pointer;
      }
      if (trackedChangedPointers.length === 0)
        return;
      this._moveCallback(previousPointers, trackedChangedPointers, event2);
    }
    /**
     * Call the end callback for this pointer.
     *
     * @param pointer Pointer
     * @param event Related event
     */
    _triggerPointerEnd(pointer, event2) {
      const index = this.currentPointers.findIndex((p) => p.id === pointer.id);
      if (index === -1)
        return false;
      this.currentPointers.splice(index, 1);
      this.startPointers.splice(index, 1);
      this._endCallback(pointer, event2);
      return true;
    }
    /**
     * Listener for mouse/pointer ends. Bound to the class in the constructor.
     * @param event This will only be a MouseEvent if the browser doesn't support
     * pointer events.
     */
    _pointerEnd(event2) {
      if (!this._triggerPointerEnd(new Pointer(event2), event2))
        return;
      if (isPointerEvent(event2)) {
        if (this.currentPointers.length)
          return;
        this._element.removeEventListener("pointermove", this._move);
        this._element.removeEventListener("pointerup", this._pointerEnd);
      } else {
        window.removeEventListener("mousemove", this._move);
        window.removeEventListener("mouseup", this._pointerEnd);
      }
    }
    /**
     * Listener for touchend. Bound to the class in the constructor.
     * Only used if the browser doesn't support pointer events.
     */
    _touchEnd(event2) {
      for (const touch of Array.from(event2.changedTouches)) {
        this._triggerPointerEnd(new Pointer(touch), event2);
      }
    }
  }
  function styleInject(css2, ref2) {
    if (ref2 === void 0)
      ref2 = {};
    var insertAt = ref2.insertAt;
    if (!css2 || typeof document === "undefined") {
      return;
    }
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
  var scrubber = "styles_scrubber__39cN6";
  var twoUpHandle = "styles_two-up-handle__2kVsP";
  var css = 'two-up{display:grid;position:relative;--split-point:0;--accent-color:#777;--track-color:var(--accent-color);--thumb-background:#fff;--thumb-color:var(--accent-color);--thumb-size:62px;--bar-size:6px;--bar-touch-size:30px}two-up>*{grid-area:1/1}two-up[legacy-clip-compat]>:not(.styles_two-up-handle__2kVsP){position:absolute}.styles_two-up-handle__2kVsP{touch-action:none;position:relative;width:var(--bar-touch-size);transform:translateX(var(--split-point)) translateX(-50%);will-change:transform;cursor:ew-resize}.styles_two-up-handle__2kVsP:before{content:"";display:block;height:100%;width:var(--bar-size);margin:0 auto;box-shadow:inset calc(var(--bar-size) / 2) 0 0 rgba(0,0,0,.1),0 1px 4px rgba(0,0,0,.4);background:var(--track-color)}.styles_scrubber__39cN6{display:flex;position:absolute;top:50%;left:50%;transform-origin:50% 50%;transform:translate(-50%,-50%);width:var(--thumb-size);height:calc(var(--thumb-size) * .9);background:var(--thumb-background);border:1px solid rgba(0,0,0,.2);border-radius:var(--thumb-size);box-shadow:0 1px 4px rgba(0,0,0,.1);color:var(--thumb-color);box-sizing:border-box;padding:0 calc(var(--thumb-size) * .24)}.styles_scrubber__39cN6 svg{flex:1}two-up[orientation=vertical] .styles_two-up-handle__2kVsP{width:auto;height:var(--bar-touch-size);transform:translateY(var(--split-point)) translateY(-50%);cursor:ns-resize}two-up[orientation=vertical] .styles_two-up-handle__2kVsP:before{width:auto;height:var(--bar-size);box-shadow:inset 0 calc(var(--bar-size) / 2) 0 rgba(0,0,0,.1),0 1px 4px rgba(0,0,0,.4);margin:calc((var(--bar-touch-size) - var(--bar-size)) / 2) 0 0}two-up[orientation=vertical] .styles_scrubber__39cN6{box-shadow:1px 0 4px rgba(0,0,0,.1);transform:translate(-50%,-50%) rotate(-90deg)}two-up>:first-child:not(.styles_two-up-handle__2kVsP){-webkit-clip-path:inset(0 calc(100% - var(--split-point)) 0 0);clip-path:inset(0 calc(100% - var(--split-point)) 0 0)}two-up>:nth-child(2):not(.styles_two-up-handle__2kVsP){-webkit-clip-path:inset(0 0 0 var(--split-point));clip-path:inset(0 0 0 var(--split-point))}two-up[orientation=vertical]>:first-child:not(.styles_two-up-handle__2kVsP){-webkit-clip-path:inset(0 0 calc(100% - var(--split-point)) 0);clip-path:inset(0 0 calc(100% - var(--split-point)) 0)}two-up[orientation=vertical]>:nth-child(2):not(.styles_two-up-handle__2kVsP){-webkit-clip-path:inset(var(--split-point) 0 0 0);clip-path:inset(var(--split-point) 0 0 0)}@supports not ((clip-path:inset(0 0 0 0)) or (-webkit-clip-path:inset(0 0 0 0))){two-up[legacy-clip-compat]>:first-child:not(.styles_two-up-handle__2kVsP){clip:rect(auto var(--split-point) auto auto)}two-up[legacy-clip-compat]>:nth-child(2):not(.styles_two-up-handle__2kVsP){clip:rect(auto auto auto var(--split-point))}two-up[orientation=vertical][legacy-clip-compat]>:first-child:not(.styles_two-up-handle__2kVsP){clip:rect(auto auto var(--split-point) auto)}two-up[orientation=vertical][legacy-clip-compat]>:nth-child(2):not(.styles_two-up-handle__2kVsP){clip:rect(var(--split-point) auto auto auto)}}';
  styleInject(css);
  const legacyClipCompatAttr = "legacy-clip-compat";
  const orientationAttr = "orientation";
  class TwoUp extends HTMLElement {
    constructor() {
      super();
      this._handle = document.createElement("div");
      this._position = 0;
      this._relativePosition = 0.5;
      this._positionOnPointerStart = 0;
      this._everConnected = false;
      this._handle.className = twoUpHandle;
      new MutationObserver(() => this._childrenChange()).observe(this, { childList: true });
      if ("ResizeObserver" in window) {
        new ResizeObserver(() => this._resetPosition()).observe(this);
      } else {
        window.addEventListener("resize", () => this._resetPosition());
      }
      const pointerTracker = new PointerTracker(this._handle, {
        start: (_, event2) => {
          if (pointerTracker.currentPointers.length === 1)
            return false;
          event2.preventDefault();
          this._positionOnPointerStart = this._position;
          return true;
        },
        move: () => {
          this._pointerChange(
            pointerTracker.startPointers[0],
            pointerTracker.currentPointers[0]
          );
        }
      });
    }
    static get observedAttributes() {
      return [orientationAttr];
    }
    connectedCallback() {
      this._childrenChange();
      this._handle.innerHTML = `<div class="${scrubber}">${`<svg viewBox="0 0 27 20" fill="currentColor">${'<path d="M17 19.2l9.5-9.6L16.9 0zM9.6 0L0 9.6l9.6 9.6z"/>'}</svg>`}</div>`;
      if (!this._everConnected) {
        this._resetPosition();
        this._everConnected = true;
      }
    }
    attributeChangedCallback(name) {
      if (name === orientationAttr) {
        this._resetPosition();
      }
    }
    _resetPosition() {
      requestAnimationFrame(() => {
        const bounds = this.getBoundingClientRect();
        const dimensionAxis = this.orientation === "vertical" ? "height" : "width";
        this._position = bounds[dimensionAxis] * this._relativePosition;
        this._setPosition();
      });
    }
    /**
     * If true, this element works in browsers that don't support clip-path (Edge).
     * However, this means you'll have to set the height of this element manually.
     */
    get legacyClipCompat() {
      return this.hasAttribute(legacyClipCompatAttr);
    }
    set legacyClipCompat(val) {
      if (val) {
        this.setAttribute(legacyClipCompatAttr, "");
      } else {
        this.removeAttribute(legacyClipCompatAttr);
      }
    }
    /**
     * Split vertically rather than horizontally.
     */
    get orientation() {
      const value = this.getAttribute(orientationAttr);
      if (value && value.toLowerCase() === "vertical")
        return "vertical";
      return "horizontal";
    }
    set orientation(val) {
      this.setAttribute(orientationAttr, val);
    }
    /**
     * Called when element's child list changes
     */
    _childrenChange() {
      if (this.lastElementChild !== this._handle) {
        this.appendChild(this._handle);
      }
    }
    /**
     * Called when a pointer moves.
     */
    _pointerChange(startPoint, currentPoint) {
      const pointAxis = this.orientation === "vertical" ? "clientY" : "clientX";
      const dimensionAxis = this.orientation === "vertical" ? "height" : "width";
      const bounds = this.getBoundingClientRect();
      this._position = this._positionOnPointerStart + (currentPoint[pointAxis] - startPoint[pointAxis]);
      this._position = Math.max(0, Math.min(this._position, bounds[dimensionAxis]));
      this._relativePosition = this._position / bounds[dimensionAxis];
      this._setPosition();
    }
    _setPosition() {
      this.style.setProperty("--split-point", `${this._position}px`);
    }
  }
  customElements.define("two-up", TwoUp);
})();
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
const main = "";
const app = createApp(_sfc_main);
app.use(VueTippy);
app.use(VueMousetrapPlugin).provide("mousetrap", app.config.globalProperties.$mousetrap);
eagle.onPluginCreate(async () => {
  app.mount("#app");
});
