import { i as isString, e as camelize, f as isObject, h as hasOwn, w as warn, N as NOOP, j as isFunction, k as watch, u as unref, l as onMounted, m as watchEffect, n as onBeforeUnmount, p as inject, r as ref, q as computed, s as isRef, t as getCurrentInstance, v as computed$1, d as onScopeDispose, x as defineComponent, o as openBlock, c as createElementBlock, y as renderSlot, z as mergeProps, A as provide, B as nextTick, C as useSlots, T as Text, D as createBlock, E as withCtx, F as Fragment, G as normalizeClass, H as resolveDynamicComponent, I as createCommentVNode, J as reactive, K as toRef, L as createVNode, M as h, a as createBaseVNode, O as toDisplayString, P as normalizeStyle, Q as withDirectives, R as createSlots, S as vShow, U as Transition, V as Teleport } from "./@vue-b2585a38.js";
import { c as close_default, l as loading_default } from "./@element-plus-66022a55.js";
import { T as TinyColor } from "./@ctrl-ab5a38b7.js";
import { i as isClient, u as useTimeoutFn } from "./@vueuse-0417a617.js";
import { f as fromPairs, g as get, i as isNil } from "./lodash-es-90affd7f.js";
const isUndefined = (val) => val === void 0;
const isBoolean = (val) => typeof val === "boolean";
const isNumber = (val) => typeof val === "number";
const isStringNumber = (val) => {
  if (!isString(val)) {
    return false;
  }
  return !Number.isNaN(Number(val));
};
class ElementPlusError extends Error {
  constructor(m) {
    super(m);
    this.name = "ElementPlusError";
  }
}
function throwError(scope, m) {
  throw new ElementPlusError(`[${scope}] ${m}`);
}
const classNameToArray = (cls = "") => cls.split(" ").filter((item) => !!item.trim());
const hasClass = (el, cls) => {
  if (!el || !cls)
    return false;
  if (cls.includes(" "))
    throw new Error("className should not contain space.");
  return el.classList.contains(cls);
};
const addClass = (el, cls) => {
  if (!el || !cls.trim())
    return;
  el.classList.add(...classNameToArray(cls));
};
const removeClass = (el, cls) => {
  if (!el || !cls.trim())
    return;
  el.classList.remove(...classNameToArray(cls));
};
const getStyle = (element, styleName) => {
  var _a;
  if (!isClient || !element || !styleName)
    return "";
  let key = camelize(styleName);
  if (key === "float")
    key = "cssFloat";
  try {
    const style = element.style[key];
    if (style)
      return style;
    const computed2 = (_a = document.defaultView) == null ? void 0 : _a.getComputedStyle(element, "");
    return computed2 ? computed2[key] : "";
  } catch (e) {
    return element.style[key];
  }
};
function addUnit(value, defaultUnit = "px") {
  if (!value)
    return "";
  if (isNumber(value) || isStringNumber(value)) {
    return `${value}${defaultUnit}`;
  } else if (isString(value)) {
    return value;
  }
}
let scrollBarWidth;
const getScrollBarWidth = (namespace) => {
  var _a;
  if (!isClient)
    return 0;
  if (scrollBarWidth !== void 0)
    return scrollBarWidth;
  const outer = document.createElement("div");
  outer.className = `${namespace}-scrollbar__wrap`;
  outer.style.visibility = "hidden";
  outer.style.width = "100px";
  outer.style.position = "absolute";
  outer.style.top = "-9999px";
  document.body.appendChild(outer);
  const widthNoScroll = outer.offsetWidth;
  outer.style.overflow = "scroll";
  const inner = document.createElement("div");
  inner.style.width = "100%";
  outer.appendChild(inner);
  const widthWithScroll = inner.offsetWidth;
  (_a = outer.parentNode) == null ? void 0 : _a.removeChild(outer);
  scrollBarWidth = widthNoScroll - widthWithScroll;
  return scrollBarWidth;
};
const epPropKey = "__epPropKey";
const definePropType = (val) => val;
const isEpProp = (val) => isObject(val) && !!val[epPropKey];
const buildProp = (prop, key) => {
  if (!isObject(prop) || isEpProp(prop))
    return prop;
  const { values, required, default: defaultValue, type, validator } = prop;
  const _validator = values || validator ? (val) => {
    let valid = false;
    let allowedValues = [];
    if (values) {
      allowedValues = Array.from(values);
      if (hasOwn(prop, "default")) {
        allowedValues.push(defaultValue);
      }
      valid || (valid = allowedValues.includes(val));
    }
    if (validator)
      valid || (valid = validator(val));
    if (!valid && allowedValues.length > 0) {
      const allowValuesText = [...new Set(allowedValues)].map((value) => JSON.stringify(value)).join(", ");
      warn(`Invalid prop: validation failed${key ? ` for prop "${key}"` : ""}. Expected one of [${allowValuesText}], got value ${JSON.stringify(val)}.`);
    }
    return valid;
  } : void 0;
  const epProp = {
    type,
    required: !!required,
    validator: _validator,
    [epPropKey]: true
  };
  if (hasOwn(prop, "default"))
    epProp.default = defaultValue;
  return epProp;
};
const buildProps = (props) => fromPairs(Object.entries(props).map(([key, option]) => [
  key,
  buildProp(option, key)
]));
const iconPropType = definePropType([
  String,
  Object,
  Function
]);
const CloseComponents = {
  Close: close_default
};
const withInstall = (main, extra) => {
  main.install = (app) => {
    for (const comp of [main, ...Object.values(extra != null ? extra : {})]) {
      app.component(comp.name, comp);
    }
  };
  if (extra) {
    for (const [key, comp] of Object.entries(extra)) {
      main[key] = comp;
    }
  }
  return main;
};
const withNoopInstall = (component) => {
  component.install = NOOP;
  return component;
};
const composeRefs = (...refs) => {
  return (el) => {
    refs.forEach((ref2) => {
      if (isFunction(ref2)) {
        ref2(el);
      } else {
        ref2.value = el;
      }
    });
  };
};
const EVENT_CODE = {
  tab: "Tab",
  enter: "Enter",
  space: "Space",
  left: "ArrowLeft",
  up: "ArrowUp",
  right: "ArrowRight",
  down: "ArrowDown",
  esc: "Escape",
  delete: "Delete",
  backspace: "Backspace",
  numpadEnter: "NumpadEnter",
  pageUp: "PageUp",
  pageDown: "PageDown",
  home: "Home",
  end: "End"
};
const UPDATE_MODEL_EVENT = "update:modelValue";
const componentSizes = ["", "default", "small", "large"];
var PatchFlags = /* @__PURE__ */ ((PatchFlags2) => {
  PatchFlags2[PatchFlags2["TEXT"] = 1] = "TEXT";
  PatchFlags2[PatchFlags2["CLASS"] = 2] = "CLASS";
  PatchFlags2[PatchFlags2["STYLE"] = 4] = "STYLE";
  PatchFlags2[PatchFlags2["PROPS"] = 8] = "PROPS";
  PatchFlags2[PatchFlags2["FULL_PROPS"] = 16] = "FULL_PROPS";
  PatchFlags2[PatchFlags2["HYDRATE_EVENTS"] = 32] = "HYDRATE_EVENTS";
  PatchFlags2[PatchFlags2["STABLE_FRAGMENT"] = 64] = "STABLE_FRAGMENT";
  PatchFlags2[PatchFlags2["KEYED_FRAGMENT"] = 128] = "KEYED_FRAGMENT";
  PatchFlags2[PatchFlags2["UNKEYED_FRAGMENT"] = 256] = "UNKEYED_FRAGMENT";
  PatchFlags2[PatchFlags2["NEED_PATCH"] = 512] = "NEED_PATCH";
  PatchFlags2[PatchFlags2["DYNAMIC_SLOTS"] = 1024] = "DYNAMIC_SLOTS";
  PatchFlags2[PatchFlags2["HOISTED"] = -1] = "HOISTED";
  PatchFlags2[PatchFlags2["BAIL"] = -2] = "BAIL";
  return PatchFlags2;
})(PatchFlags || {});
const useDeprecated = ({ from, replacement, scope, version, ref: ref2, type = "API" }, condition) => {
  watch(() => unref(condition), (val) => {
  }, {
    immediate: true
  });
};
const useDraggable = (targetRef, dragRef, draggable) => {
  let transform = {
    offsetX: 0,
    offsetY: 0
  };
  const onMousedown = (e) => {
    const downX = e.clientX;
    const downY = e.clientY;
    const { offsetX, offsetY } = transform;
    const targetRect = targetRef.value.getBoundingClientRect();
    const targetLeft = targetRect.left;
    const targetTop = targetRect.top;
    const targetWidth = targetRect.width;
    const targetHeight = targetRect.height;
    const clientWidth = document.documentElement.clientWidth;
    const clientHeight = document.documentElement.clientHeight;
    const minLeft = -targetLeft + offsetX;
    const minTop = -targetTop + offsetY;
    const maxLeft = clientWidth - targetLeft - targetWidth + offsetX;
    const maxTop = clientHeight - targetTop - targetHeight + offsetY;
    const onMousemove = (e2) => {
      const moveX = Math.min(Math.max(offsetX + e2.clientX - downX, minLeft), maxLeft);
      const moveY = Math.min(Math.max(offsetY + e2.clientY - downY, minTop), maxTop);
      transform = {
        offsetX: moveX,
        offsetY: moveY
      };
      targetRef.value.style.transform = `translate(${addUnit(moveX)}, ${addUnit(moveY)})`;
    };
    const onMouseup = () => {
      document.removeEventListener("mousemove", onMousemove);
      document.removeEventListener("mouseup", onMouseup);
    };
    document.addEventListener("mousemove", onMousemove);
    document.addEventListener("mouseup", onMouseup);
  };
  const onDraggable = () => {
    if (dragRef.value && targetRef.value) {
      dragRef.value.addEventListener("mousedown", onMousedown);
    }
  };
  const offDraggable = () => {
    if (dragRef.value && targetRef.value) {
      dragRef.value.removeEventListener("mousedown", onMousedown);
    }
  };
  onMounted(() => {
    watchEffect(() => {
      if (draggable.value) {
        onDraggable();
      } else {
        offDraggable();
      }
    });
  });
  onBeforeUnmount(() => {
    offDraggable();
  });
};
var English = {
  name: "en",
  el: {
    colorpicker: {
      confirm: "OK",
      clear: "Clear",
      defaultLabel: "color picker",
      description: "current color is {color}. press enter to select a new color."
    },
    datepicker: {
      now: "Now",
      today: "Today",
      cancel: "Cancel",
      clear: "Clear",
      confirm: "OK",
      dateTablePrompt: "Use the arrow keys and enter to select the day of the month",
      monthTablePrompt: "Use the arrow keys and enter to select the month",
      yearTablePrompt: "Use the arrow keys and enter to select the year",
      selectedDate: "Selected date",
      selectDate: "Select date",
      selectTime: "Select time",
      startDate: "Start Date",
      startTime: "Start Time",
      endDate: "End Date",
      endTime: "End Time",
      prevYear: "Previous Year",
      nextYear: "Next Year",
      prevMonth: "Previous Month",
      nextMonth: "Next Month",
      year: "",
      month1: "January",
      month2: "February",
      month3: "March",
      month4: "April",
      month5: "May",
      month6: "June",
      month7: "July",
      month8: "August",
      month9: "September",
      month10: "October",
      month11: "November",
      month12: "December",
      week: "week",
      weeks: {
        sun: "Sun",
        mon: "Mon",
        tue: "Tue",
        wed: "Wed",
        thu: "Thu",
        fri: "Fri",
        sat: "Sat"
      },
      weeksFull: {
        sun: "Sunday",
        mon: "Monday",
        tue: "Tuesday",
        wed: "Wednesday",
        thu: "Thursday",
        fri: "Friday",
        sat: "Saturday"
      },
      months: {
        jan: "Jan",
        feb: "Feb",
        mar: "Mar",
        apr: "Apr",
        may: "May",
        jun: "Jun",
        jul: "Jul",
        aug: "Aug",
        sep: "Sep",
        oct: "Oct",
        nov: "Nov",
        dec: "Dec"
      }
    },
    inputNumber: {
      decrease: "decrease number",
      increase: "increase number"
    },
    select: {
      loading: "Loading",
      noMatch: "No matching data",
      noData: "No data",
      placeholder: "Select"
    },
    dropdown: {
      toggleDropdown: "Toggle Dropdown"
    },
    cascader: {
      noMatch: "No matching data",
      loading: "Loading",
      placeholder: "Select",
      noData: "No data"
    },
    pagination: {
      goto: "Go to",
      pagesize: "/page",
      total: "Total {total}",
      pageClassifier: "",
      page: "Page",
      prev: "Go to previous page",
      next: "Go to next page",
      currentPage: "page {pager}",
      prevPages: "Previous {pager} pages",
      nextPages: "Next {pager} pages",
      deprecationWarning: "Deprecated usages detected, please refer to the el-pagination documentation for more details"
    },
    dialog: {
      close: "Close this dialog"
    },
    drawer: {
      close: "Close this dialog"
    },
    messagebox: {
      title: "Message",
      confirm: "OK",
      cancel: "Cancel",
      error: "Illegal input",
      close: "Close this dialog"
    },
    upload: {
      deleteTip: "press delete to remove",
      delete: "Delete",
      preview: "Preview",
      continue: "Continue"
    },
    slider: {
      defaultLabel: "slider between {min} and {max}",
      defaultRangeStartLabel: "pick start value",
      defaultRangeEndLabel: "pick end value"
    },
    table: {
      emptyText: "No Data",
      confirmFilter: "Confirm",
      resetFilter: "Reset",
      clearFilter: "All",
      sumText: "Sum"
    },
    tree: {
      emptyText: "No Data"
    },
    transfer: {
      noMatch: "No matching data",
      noData: "No data",
      titles: ["List 1", "List 2"],
      filterPlaceholder: "Enter keyword",
      noCheckedFormat: "{total} items",
      hasCheckedFormat: "{checked}/{total} checked"
    },
    image: {
      error: "FAILED"
    },
    pageHeader: {
      title: "Back"
    },
    popconfirm: {
      confirmButtonText: "Yes",
      cancelButtonText: "No"
    }
  }
};
const buildTranslator = (locale) => (path, option) => translate(path, option, unref(locale));
const translate = (path, option, locale) => get(locale, path, path).replace(/\{(\w+)\}/g, (_, key) => {
  var _a;
  return `${(_a = option == null ? void 0 : option[key]) != null ? _a : `{${key}}`}`;
});
const buildLocaleContext = (locale) => {
  const lang = computed(() => unref(locale).name);
  const localeRef = isRef(locale) ? locale : ref(locale);
  return {
    lang,
    locale: localeRef,
    t: buildTranslator(locale)
  };
};
const localeContextKey = Symbol("localeContextKey");
const useLocale = (localeOverrides) => {
  const locale = localeOverrides || inject(localeContextKey, ref());
  return buildLocaleContext(computed(() => locale.value || English));
};
const defaultNamespace = "el";
const statePrefix = "is-";
const _bem = (namespace, block, blockSuffix, element, modifier) => {
  let cls = `${namespace}-${block}`;
  if (blockSuffix) {
    cls += `-${blockSuffix}`;
  }
  if (element) {
    cls += `__${element}`;
  }
  if (modifier) {
    cls += `--${modifier}`;
  }
  return cls;
};
const namespaceContextKey = Symbol("namespaceContextKey");
const useGetDerivedNamespace = (namespaceOverrides) => {
  const derivedNamespace = namespaceOverrides || (getCurrentInstance() ? inject(namespaceContextKey, ref(defaultNamespace)) : ref(defaultNamespace));
  const namespace = computed(() => {
    return unref(derivedNamespace) || defaultNamespace;
  });
  return namespace;
};
const useNamespace = (block, namespaceOverrides) => {
  const namespace = useGetDerivedNamespace(namespaceOverrides);
  const b = (blockSuffix = "") => _bem(namespace.value, block, blockSuffix, "", "");
  const e = (element) => element ? _bem(namespace.value, block, "", element, "") : "";
  const m = (modifier) => modifier ? _bem(namespace.value, block, "", "", modifier) : "";
  const be = (blockSuffix, element) => blockSuffix && element ? _bem(namespace.value, block, blockSuffix, element, "") : "";
  const em = (element, modifier) => element && modifier ? _bem(namespace.value, block, "", element, modifier) : "";
  const bm = (blockSuffix, modifier) => blockSuffix && modifier ? _bem(namespace.value, block, blockSuffix, "", modifier) : "";
  const bem = (blockSuffix, element, modifier) => blockSuffix && element && modifier ? _bem(namespace.value, block, blockSuffix, element, modifier) : "";
  const is = (name, ...args) => {
    const state = args.length >= 1 ? args[0] : true;
    return name && state ? `${statePrefix}${name}` : "";
  };
  const cssVar = (object) => {
    const styles = {};
    for (const key in object) {
      if (object[key]) {
        styles[`--${namespace.value}-${key}`] = object[key];
      }
    }
    return styles;
  };
  const cssVarBlock = (object) => {
    const styles = {};
    for (const key in object) {
      if (object[key]) {
        styles[`--${namespace.value}-${block}-${key}`] = object[key];
      }
    }
    return styles;
  };
  const cssVarName = (name) => `--${namespace.value}-${name}`;
  const cssVarBlockName = (name) => `--${namespace.value}-${block}-${name}`;
  return {
    namespace,
    b,
    e,
    m,
    be,
    em,
    bm,
    bem,
    is,
    cssVar,
    cssVarName,
    cssVarBlock,
    cssVarBlockName
  };
};
const useLockscreen = (trigger, options = {}) => {
  if (!isRef(trigger)) {
    throwError("[useLockscreen]", "You need to pass a ref param to this function");
  }
  const ns = options.ns || useNamespace("popup");
  const hiddenCls = computed$1(() => ns.bm("parent", "hidden"));
  if (!isClient || hasClass(document.body, hiddenCls.value)) {
    return;
  }
  let scrollBarWidth2 = 0;
  let withoutHiddenClass = false;
  let bodyWidth = "0";
  const cleanup = () => {
    setTimeout(() => {
      removeClass(document == null ? void 0 : document.body, hiddenCls.value);
      if (withoutHiddenClass && document) {
        document.body.style.width = bodyWidth;
      }
    }, 200);
  };
  watch(trigger, (val) => {
    if (!val) {
      cleanup();
      return;
    }
    withoutHiddenClass = !hasClass(document.body, hiddenCls.value);
    if (withoutHiddenClass) {
      bodyWidth = document.body.style.width;
    }
    scrollBarWidth2 = getScrollBarWidth(ns.namespace.value);
    const bodyHasOverflow = document.documentElement.clientHeight < document.body.scrollHeight;
    const bodyOverflowY = getStyle(document.body, "overflowY");
    if (scrollBarWidth2 > 0 && (bodyHasOverflow || bodyOverflowY === "scroll") && withoutHiddenClass) {
      document.body.style.width = `calc(100% - ${scrollBarWidth2}px)`;
    }
    addClass(document.body, hiddenCls.value);
  });
  onScopeDispose(() => cleanup());
};
const useProp = (name) => {
  const vm = getCurrentInstance();
  return computed(() => {
    var _a, _b;
    return (_b = (_a = vm == null ? void 0 : vm.proxy) == null ? void 0 : _a.$props) == null ? void 0 : _b[name];
  });
};
const useSameTarget = (handleClick) => {
  if (!handleClick) {
    return { onClick: NOOP, onMousedown: NOOP, onMouseup: NOOP };
  }
  let mousedownTarget = false;
  let mouseupTarget = false;
  const onClick = (e) => {
    if (mousedownTarget && mouseupTarget) {
      handleClick(e);
    }
    mousedownTarget = mouseupTarget = false;
  };
  const onMousedown = (e) => {
    mousedownTarget = e.target === e.currentTarget;
  };
  const onMouseup = (e) => {
    mouseupTarget = e.target === e.currentTarget;
  };
  return { onClick, onMousedown, onMouseup };
};
const defaultIdInjection = {
  prefix: Math.floor(Math.random() * 1e4),
  current: 0
};
const ID_INJECTION_KEY = Symbol("elIdInjection");
const useIdInjection = () => {
  return getCurrentInstance() ? inject(ID_INJECTION_KEY, defaultIdInjection) : defaultIdInjection;
};
const useId = (deterministicId) => {
  const idInjection = useIdInjection();
  const namespace = useGetDerivedNamespace();
  const idRef = computed(() => unref(deterministicId) || `${namespace.value}-id-${idInjection.prefix}-${idInjection.current++}`);
  return idRef;
};
let registeredEscapeHandlers = [];
const cachedHandler = (e) => {
  const event = e;
  if (event.key === EVENT_CODE.esc) {
    registeredEscapeHandlers.forEach((registeredHandler) => registeredHandler(event));
  }
};
const useEscapeKeydown = (handler) => {
  onMounted(() => {
    if (registeredEscapeHandlers.length === 0) {
      document.addEventListener("keydown", cachedHandler);
    }
    if (isClient)
      registeredEscapeHandlers.push(handler);
  });
  onBeforeUnmount(() => {
    registeredEscapeHandlers = registeredEscapeHandlers.filter((registeredHandler) => registeredHandler !== handler);
    if (registeredEscapeHandlers.length === 0) {
      if (isClient)
        document.removeEventListener("keydown", cachedHandler);
    }
  });
};
const zIndex = ref(0);
const defaultInitialZIndex = 2e3;
const zIndexContextKey = Symbol("zIndexContextKey");
const useZIndex = (zIndexOverrides) => {
  const zIndexInjection = zIndexOverrides || (getCurrentInstance() ? inject(zIndexContextKey, void 0) : void 0);
  const initialZIndex = computed(() => {
    const zIndexFromInjection = unref(zIndexInjection);
    return isNumber(zIndexFromInjection) ? zIndexFromInjection : defaultInitialZIndex;
  });
  const currentZIndex = computed(() => initialZIndex.value + zIndex.value);
  const nextZIndex = () => {
    zIndex.value++;
    return currentZIndex.value;
  };
  return {
    initialZIndex,
    currentZIndex,
    nextZIndex
  };
};
const useSizeProp = buildProp({
  type: String,
  values: componentSizes,
  required: false
});
const SIZE_INJECTION_KEY = Symbol("size");
const useGlobalSize = () => {
  const injectedSize = inject(SIZE_INJECTION_KEY, {});
  return computed(() => {
    return unref(injectedSize.size) || "";
  });
};
const configProviderContextKey = Symbol();
const globalConfig = ref();
function useGlobalConfig(key, defaultValue = void 0) {
  const config = getCurrentInstance() ? inject(configProviderContextKey, globalConfig) : globalConfig;
  if (key) {
    return computed(() => {
      var _a, _b;
      return (_b = (_a = config.value) == null ? void 0 : _a[key]) != null ? _b : defaultValue;
    });
  } else {
    return config;
  }
}
var _export_sfc = (sfc, props) => {
  const target = sfc.__vccOpts || sfc;
  for (const [key, val] of props) {
    target[key] = val;
  }
  return target;
};
const iconProps = buildProps({
  size: {
    type: definePropType([Number, String])
  },
  color: {
    type: String
  }
});
const __default__$6 = defineComponent({
  name: "ElIcon",
  inheritAttrs: false
});
const _sfc_main$7 = /* @__PURE__ */ defineComponent({
  ...__default__$6,
  props: iconProps,
  setup(__props) {
    const props = __props;
    const ns = useNamespace("icon");
    const style = computed(() => {
      const { size, color } = props;
      if (!size && !color)
        return {};
      return {
        fontSize: isUndefined(size) ? void 0 : addUnit(size),
        "--color": color
      };
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("i", mergeProps({
        class: unref(ns).b(),
        style: unref(style)
      }, _ctx.$attrs), [
        renderSlot(_ctx.$slots, "default")
      ], 16);
    };
  }
});
var Icon = /* @__PURE__ */ _export_sfc(_sfc_main$7, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/icon/src/icon.vue"]]);
const ElIcon = withInstall(Icon);
const formContextKey = Symbol("formContextKey");
const formItemContextKey = Symbol("formItemContextKey");
const useFormSize = (fallback, ignore = {}) => {
  const emptyRef = ref(void 0);
  const size = ignore.prop ? emptyRef : useProp("size");
  const globalConfig2 = ignore.global ? emptyRef : useGlobalSize();
  const form = ignore.form ? { size: void 0 } : inject(formContextKey, void 0);
  const formItem = ignore.formItem ? { size: void 0 } : inject(formItemContextKey, void 0);
  return computed(() => size.value || unref(fallback) || (formItem == null ? void 0 : formItem.size) || (form == null ? void 0 : form.size) || globalConfig2.value || "");
};
const useFormDisabled = (fallback) => {
  const disabled = useProp("disabled");
  const form = inject(formContextKey, void 0);
  return computed(() => disabled.value || unref(fallback) || (form == null ? void 0 : form.disabled) || false);
};
const useFormItem = () => {
  const form = inject(formContextKey, void 0);
  const formItem = inject(formItemContextKey, void 0);
  return {
    form,
    formItem
  };
};
const FOCUS_AFTER_TRAPPED = "focus-trap.focus-after-trapped";
const FOCUS_AFTER_RELEASED = "focus-trap.focus-after-released";
const FOCUSOUT_PREVENTED = "focus-trap.focusout-prevented";
const FOCUS_AFTER_TRAPPED_OPTS = {
  cancelable: true,
  bubbles: false
};
const FOCUSOUT_PREVENTED_OPTS = {
  cancelable: true,
  bubbles: false
};
const ON_TRAP_FOCUS_EVT = "focusAfterTrapped";
const ON_RELEASE_FOCUS_EVT = "focusAfterReleased";
const FOCUS_TRAP_INJECTION_KEY = Symbol("elFocusTrap");
const focusReason = ref();
const lastUserFocusTimestamp = ref(0);
const lastAutomatedFocusTimestamp = ref(0);
let focusReasonUserCount = 0;
const obtainAllFocusableElements = (element) => {
  const nodes = [];
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT, {
    acceptNode: (node) => {
      const isHiddenInput = node.tagName === "INPUT" && node.type === "hidden";
      if (node.disabled || node.hidden || isHiddenInput)
        return NodeFilter.FILTER_SKIP;
      return node.tabIndex >= 0 || node === document.activeElement ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    }
  });
  while (walker.nextNode())
    nodes.push(walker.currentNode);
  return nodes;
};
const getVisibleElement = (elements, container) => {
  for (const element of elements) {
    if (!isHidden(element, container))
      return element;
  }
};
const isHidden = (element, container) => {
  if (getComputedStyle(element).visibility === "hidden")
    return true;
  while (element) {
    if (container && element === container)
      return false;
    if (getComputedStyle(element).display === "none")
      return true;
    element = element.parentElement;
  }
  return false;
};
const getEdges = (container) => {
  const focusable = obtainAllFocusableElements(container);
  const first = getVisibleElement(focusable, container);
  const last = getVisibleElement(focusable.reverse(), container);
  return [first, last];
};
const isSelectable = (element) => {
  return element instanceof HTMLInputElement && "select" in element;
};
const tryFocus = (element, shouldSelect) => {
  if (element && element.focus) {
    const prevFocusedElement = document.activeElement;
    element.focus({ preventScroll: true });
    lastAutomatedFocusTimestamp.value = window.performance.now();
    if (element !== prevFocusedElement && isSelectable(element) && shouldSelect) {
      element.select();
    }
  }
};
function removeFromStack(list, item) {
  const copy = [...list];
  const idx = list.indexOf(item);
  if (idx !== -1) {
    copy.splice(idx, 1);
  }
  return copy;
}
const createFocusableStack = () => {
  let stack = [];
  const push = (layer) => {
    const currentLayer = stack[0];
    if (currentLayer && layer !== currentLayer) {
      currentLayer.pause();
    }
    stack = removeFromStack(stack, layer);
    stack.unshift(layer);
  };
  const remove = (layer) => {
    var _a, _b;
    stack = removeFromStack(stack, layer);
    (_b = (_a = stack[0]) == null ? void 0 : _a.resume) == null ? void 0 : _b.call(_a);
  };
  return {
    push,
    remove
  };
};
const focusFirstDescendant = (elements, shouldSelect = false) => {
  const prevFocusedElement = document.activeElement;
  for (const element of elements) {
    tryFocus(element, shouldSelect);
    if (document.activeElement !== prevFocusedElement)
      return;
  }
};
const focusableStack = createFocusableStack();
const isFocusCausedByUserEvent = () => {
  return lastUserFocusTimestamp.value > lastAutomatedFocusTimestamp.value;
};
const notifyFocusReasonPointer = () => {
  focusReason.value = "pointer";
  lastUserFocusTimestamp.value = window.performance.now();
};
const notifyFocusReasonKeydown = () => {
  focusReason.value = "keyboard";
  lastUserFocusTimestamp.value = window.performance.now();
};
const useFocusReason = () => {
  onMounted(() => {
    if (focusReasonUserCount === 0) {
      document.addEventListener("mousedown", notifyFocusReasonPointer);
      document.addEventListener("touchstart", notifyFocusReasonPointer);
      document.addEventListener("keydown", notifyFocusReasonKeydown);
    }
    focusReasonUserCount++;
  });
  onBeforeUnmount(() => {
    focusReasonUserCount--;
    if (focusReasonUserCount <= 0) {
      document.removeEventListener("mousedown", notifyFocusReasonPointer);
      document.removeEventListener("touchstart", notifyFocusReasonPointer);
      document.removeEventListener("keydown", notifyFocusReasonKeydown);
    }
  });
  return {
    focusReason,
    lastUserFocusTimestamp,
    lastAutomatedFocusTimestamp
  };
};
const createFocusOutPreventedEvent = (detail) => {
  return new CustomEvent(FOCUSOUT_PREVENTED, {
    ...FOCUSOUT_PREVENTED_OPTS,
    detail
  });
};
const _sfc_main$6 = defineComponent({
  name: "ElFocusTrap",
  inheritAttrs: false,
  props: {
    loop: Boolean,
    trapped: Boolean,
    focusTrapEl: Object,
    focusStartEl: {
      type: [Object, String],
      default: "first"
    }
  },
  emits: [
    ON_TRAP_FOCUS_EVT,
    ON_RELEASE_FOCUS_EVT,
    "focusin",
    "focusout",
    "focusout-prevented",
    "release-requested"
  ],
  setup(props, { emit }) {
    const forwardRef = ref();
    let lastFocusBeforeTrapped;
    let lastFocusAfterTrapped;
    const { focusReason: focusReason2 } = useFocusReason();
    useEscapeKeydown((event) => {
      if (props.trapped && !focusLayer.paused) {
        emit("release-requested", event);
      }
    });
    const focusLayer = {
      paused: false,
      pause() {
        this.paused = true;
      },
      resume() {
        this.paused = false;
      }
    };
    const onKeydown = (e) => {
      if (!props.loop && !props.trapped)
        return;
      if (focusLayer.paused)
        return;
      const { key, altKey, ctrlKey, metaKey, currentTarget, shiftKey } = e;
      const { loop } = props;
      const isTabbing = key === EVENT_CODE.tab && !altKey && !ctrlKey && !metaKey;
      const currentFocusingEl = document.activeElement;
      if (isTabbing && currentFocusingEl) {
        const container = currentTarget;
        const [first, last] = getEdges(container);
        const isTabbable = first && last;
        if (!isTabbable) {
          if (currentFocusingEl === container) {
            const focusoutPreventedEvent = createFocusOutPreventedEvent({
              focusReason: focusReason2.value
            });
            emit("focusout-prevented", focusoutPreventedEvent);
            if (!focusoutPreventedEvent.defaultPrevented) {
              e.preventDefault();
            }
          }
        } else {
          if (!shiftKey && currentFocusingEl === last) {
            const focusoutPreventedEvent = createFocusOutPreventedEvent({
              focusReason: focusReason2.value
            });
            emit("focusout-prevented", focusoutPreventedEvent);
            if (!focusoutPreventedEvent.defaultPrevented) {
              e.preventDefault();
              if (loop)
                tryFocus(first, true);
            }
          } else if (shiftKey && [first, container].includes(currentFocusingEl)) {
            const focusoutPreventedEvent = createFocusOutPreventedEvent({
              focusReason: focusReason2.value
            });
            emit("focusout-prevented", focusoutPreventedEvent);
            if (!focusoutPreventedEvent.defaultPrevented) {
              e.preventDefault();
              if (loop)
                tryFocus(last, true);
            }
          }
        }
      }
    };
    provide(FOCUS_TRAP_INJECTION_KEY, {
      focusTrapRef: forwardRef,
      onKeydown
    });
    watch(() => props.focusTrapEl, (focusTrapEl) => {
      if (focusTrapEl) {
        forwardRef.value = focusTrapEl;
      }
    }, { immediate: true });
    watch([forwardRef], ([forwardRef2], [oldForwardRef]) => {
      if (forwardRef2) {
        forwardRef2.addEventListener("keydown", onKeydown);
        forwardRef2.addEventListener("focusin", onFocusIn);
        forwardRef2.addEventListener("focusout", onFocusOut);
      }
      if (oldForwardRef) {
        oldForwardRef.removeEventListener("keydown", onKeydown);
        oldForwardRef.removeEventListener("focusin", onFocusIn);
        oldForwardRef.removeEventListener("focusout", onFocusOut);
      }
    });
    const trapOnFocus = (e) => {
      emit(ON_TRAP_FOCUS_EVT, e);
    };
    const releaseOnFocus = (e) => emit(ON_RELEASE_FOCUS_EVT, e);
    const onFocusIn = (e) => {
      const trapContainer = unref(forwardRef);
      if (!trapContainer)
        return;
      const target = e.target;
      const relatedTarget = e.relatedTarget;
      const isFocusedInTrap = target && trapContainer.contains(target);
      if (!props.trapped) {
        const isPrevFocusedInTrap = relatedTarget && trapContainer.contains(relatedTarget);
        if (!isPrevFocusedInTrap) {
          lastFocusBeforeTrapped = relatedTarget;
        }
      }
      if (isFocusedInTrap)
        emit("focusin", e);
      if (focusLayer.paused)
        return;
      if (props.trapped) {
        if (isFocusedInTrap) {
          lastFocusAfterTrapped = target;
        } else {
          tryFocus(lastFocusAfterTrapped, true);
        }
      }
    };
    const onFocusOut = (e) => {
      const trapContainer = unref(forwardRef);
      if (focusLayer.paused || !trapContainer)
        return;
      if (props.trapped) {
        const relatedTarget = e.relatedTarget;
        if (!isNil(relatedTarget) && !trapContainer.contains(relatedTarget)) {
          setTimeout(() => {
            if (!focusLayer.paused && props.trapped) {
              const focusoutPreventedEvent = createFocusOutPreventedEvent({
                focusReason: focusReason2.value
              });
              emit("focusout-prevented", focusoutPreventedEvent);
              if (!focusoutPreventedEvent.defaultPrevented) {
                tryFocus(lastFocusAfterTrapped, true);
              }
            }
          }, 0);
        }
      } else {
        const target = e.target;
        const isFocusedInTrap = target && trapContainer.contains(target);
        if (!isFocusedInTrap)
          emit("focusout", e);
      }
    };
    async function startTrap() {
      await nextTick();
      const trapContainer = unref(forwardRef);
      if (trapContainer) {
        focusableStack.push(focusLayer);
        const prevFocusedElement = trapContainer.contains(document.activeElement) ? lastFocusBeforeTrapped : document.activeElement;
        lastFocusBeforeTrapped = prevFocusedElement;
        const isPrevFocusContained = trapContainer.contains(prevFocusedElement);
        if (!isPrevFocusContained) {
          const focusEvent = new Event(FOCUS_AFTER_TRAPPED, FOCUS_AFTER_TRAPPED_OPTS);
          trapContainer.addEventListener(FOCUS_AFTER_TRAPPED, trapOnFocus);
          trapContainer.dispatchEvent(focusEvent);
          if (!focusEvent.defaultPrevented) {
            nextTick(() => {
              let focusStartEl = props.focusStartEl;
              if (!isString(focusStartEl)) {
                tryFocus(focusStartEl);
                if (document.activeElement !== focusStartEl) {
                  focusStartEl = "first";
                }
              }
              if (focusStartEl === "first") {
                focusFirstDescendant(obtainAllFocusableElements(trapContainer), true);
              }
              if (document.activeElement === prevFocusedElement || focusStartEl === "container") {
                tryFocus(trapContainer);
              }
            });
          }
        }
      }
    }
    function stopTrap() {
      const trapContainer = unref(forwardRef);
      if (trapContainer) {
        trapContainer.removeEventListener(FOCUS_AFTER_TRAPPED, trapOnFocus);
        const releasedEvent = new CustomEvent(FOCUS_AFTER_RELEASED, {
          ...FOCUS_AFTER_TRAPPED_OPTS,
          detail: {
            focusReason: focusReason2.value
          }
        });
        trapContainer.addEventListener(FOCUS_AFTER_RELEASED, releaseOnFocus);
        trapContainer.dispatchEvent(releasedEvent);
        if (!releasedEvent.defaultPrevented && (focusReason2.value == "keyboard" || !isFocusCausedByUserEvent() || trapContainer.contains(document.activeElement))) {
          tryFocus(lastFocusBeforeTrapped != null ? lastFocusBeforeTrapped : document.body);
        }
        trapContainer.removeEventListener(FOCUS_AFTER_RELEASED, releaseOnFocus);
        focusableStack.remove(focusLayer);
      }
    }
    onMounted(() => {
      if (props.trapped) {
        startTrap();
      }
      watch(() => props.trapped, (trapped) => {
        if (trapped) {
          startTrap();
        } else {
          stopTrap();
        }
      });
    });
    onBeforeUnmount(() => {
      if (props.trapped) {
        stopTrap();
      }
    });
    return {
      onKeydown
    };
  }
});
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return renderSlot(_ctx.$slots, "default", { handleKeydown: _ctx.onKeydown });
}
var ElFocusTrap = /* @__PURE__ */ _export_sfc(_sfc_main$6, [["render", _sfc_render], ["__file", "/home/runner/work/element-plus/element-plus/packages/components/focus-trap/src/focus-trap.vue"]]);
const buttonGroupContextKey = Symbol("buttonGroupContextKey");
const useButton = (props, emit) => {
  useDeprecated({
    from: "type.text",
    replacement: "link",
    version: "3.0.0",
    scope: "props",
    ref: "https://element-plus.org/en-US/component/button.html#button-attributes"
  }, computed(() => props.type === "text"));
  const buttonGroupContext = inject(buttonGroupContextKey, void 0);
  const globalConfig2 = useGlobalConfig("button");
  const { form } = useFormItem();
  const _size = useFormSize(computed(() => buttonGroupContext == null ? void 0 : buttonGroupContext.size));
  const _disabled = useFormDisabled();
  const _ref = ref();
  const slots = useSlots();
  const _type = computed(() => props.type || (buttonGroupContext == null ? void 0 : buttonGroupContext.type) || "");
  const autoInsertSpace = computed(() => {
    var _a, _b, _c;
    return (_c = (_b = props.autoInsertSpace) != null ? _b : (_a = globalConfig2.value) == null ? void 0 : _a.autoInsertSpace) != null ? _c : false;
  });
  const _props = computed(() => {
    if (props.tag === "button") {
      return {
        ariaDisabled: _disabled.value || props.loading,
        disabled: _disabled.value || props.loading,
        autofocus: props.autofocus,
        type: props.nativeType
      };
    }
    return {};
  });
  const shouldAddSpace = computed(() => {
    var _a;
    const defaultSlot = (_a = slots.default) == null ? void 0 : _a.call(slots);
    if (autoInsertSpace.value && (defaultSlot == null ? void 0 : defaultSlot.length) === 1) {
      const slot = defaultSlot[0];
      if ((slot == null ? void 0 : slot.type) === Text) {
        const text = slot.children;
        return /^\p{Unified_Ideograph}{2}$/u.test(text.trim());
      }
    }
    return false;
  });
  const handleClick = (evt) => {
    if (props.nativeType === "reset") {
      form == null ? void 0 : form.resetFields();
    }
    emit("click", evt);
  };
  return {
    _disabled,
    _size,
    _type,
    _ref,
    _props,
    shouldAddSpace,
    handleClick
  };
};
const buttonTypes = [
  "default",
  "primary",
  "success",
  "warning",
  "info",
  "danger",
  "text",
  ""
];
const buttonNativeTypes = ["button", "submit", "reset"];
const buttonProps = buildProps({
  size: useSizeProp,
  disabled: Boolean,
  type: {
    type: String,
    values: buttonTypes,
    default: ""
  },
  icon: {
    type: iconPropType
  },
  nativeType: {
    type: String,
    values: buttonNativeTypes,
    default: "button"
  },
  loading: Boolean,
  loadingIcon: {
    type: iconPropType,
    default: () => loading_default
  },
  plain: Boolean,
  text: Boolean,
  link: Boolean,
  bg: Boolean,
  autofocus: Boolean,
  round: Boolean,
  circle: Boolean,
  color: String,
  dark: Boolean,
  autoInsertSpace: {
    type: Boolean,
    default: void 0
  },
  tag: {
    type: definePropType([String, Object]),
    default: "button"
  }
});
const buttonEmits = {
  click: (evt) => evt instanceof MouseEvent
};
function darken(color, amount = 20) {
  return color.mix("#141414", amount).toString();
}
function useButtonCustomStyle(props) {
  const _disabled = useFormDisabled();
  const ns = useNamespace("button");
  return computed(() => {
    let styles = {};
    const buttonColor = props.color;
    if (buttonColor) {
      const color = new TinyColor(buttonColor);
      const activeBgColor = props.dark ? color.tint(20).toString() : darken(color, 20);
      if (props.plain) {
        styles = ns.cssVarBlock({
          "bg-color": props.dark ? darken(color, 90) : color.tint(90).toString(),
          "text-color": buttonColor,
          "border-color": props.dark ? darken(color, 50) : color.tint(50).toString(),
          "hover-text-color": `var(${ns.cssVarName("color-white")})`,
          "hover-bg-color": buttonColor,
          "hover-border-color": buttonColor,
          "active-bg-color": activeBgColor,
          "active-text-color": `var(${ns.cssVarName("color-white")})`,
          "active-border-color": activeBgColor
        });
        if (_disabled.value) {
          styles[ns.cssVarBlockName("disabled-bg-color")] = props.dark ? darken(color, 90) : color.tint(90).toString();
          styles[ns.cssVarBlockName("disabled-text-color")] = props.dark ? darken(color, 50) : color.tint(50).toString();
          styles[ns.cssVarBlockName("disabled-border-color")] = props.dark ? darken(color, 80) : color.tint(80).toString();
        }
      } else {
        const hoverBgColor = props.dark ? darken(color, 30) : color.tint(30).toString();
        const textColor = color.isDark() ? `var(${ns.cssVarName("color-white")})` : `var(${ns.cssVarName("color-black")})`;
        styles = ns.cssVarBlock({
          "bg-color": buttonColor,
          "text-color": textColor,
          "border-color": buttonColor,
          "hover-bg-color": hoverBgColor,
          "hover-text-color": textColor,
          "hover-border-color": hoverBgColor,
          "active-bg-color": activeBgColor,
          "active-border-color": activeBgColor
        });
        if (_disabled.value) {
          const disabledButtonColor = props.dark ? darken(color, 50) : color.tint(50).toString();
          styles[ns.cssVarBlockName("disabled-bg-color")] = disabledButtonColor;
          styles[ns.cssVarBlockName("disabled-text-color")] = props.dark ? "rgba(255, 255, 255, 0.5)" : `var(${ns.cssVarName("color-white")})`;
          styles[ns.cssVarBlockName("disabled-border-color")] = disabledButtonColor;
        }
      }
    }
    return styles;
  });
}
const __default__$5 = defineComponent({
  name: "ElButton"
});
const _sfc_main$5 = /* @__PURE__ */ defineComponent({
  ...__default__$5,
  props: buttonProps,
  emits: buttonEmits,
  setup(__props, { expose, emit }) {
    const props = __props;
    const buttonStyle = useButtonCustomStyle(props);
    const ns = useNamespace("button");
    const { _ref, _size, _type, _disabled, _props, shouldAddSpace, handleClick } = useButton(props, emit);
    expose({
      ref: _ref,
      size: _size,
      type: _type,
      disabled: _disabled,
      shouldAddSpace
    });
    return (_ctx, _cache) => {
      return openBlock(), createBlock(resolveDynamicComponent(_ctx.tag), mergeProps({
        ref_key: "_ref",
        ref: _ref
      }, unref(_props), {
        class: [
          unref(ns).b(),
          unref(ns).m(unref(_type)),
          unref(ns).m(unref(_size)),
          unref(ns).is("disabled", unref(_disabled)),
          unref(ns).is("loading", _ctx.loading),
          unref(ns).is("plain", _ctx.plain),
          unref(ns).is("round", _ctx.round),
          unref(ns).is("circle", _ctx.circle),
          unref(ns).is("text", _ctx.text),
          unref(ns).is("link", _ctx.link),
          unref(ns).is("has-bg", _ctx.bg)
        ],
        style: unref(buttonStyle),
        onClick: unref(handleClick)
      }), {
        default: withCtx(() => [
          _ctx.loading ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
            _ctx.$slots.loading ? renderSlot(_ctx.$slots, "loading", { key: 0 }) : (openBlock(), createBlock(unref(ElIcon), {
              key: 1,
              class: normalizeClass(unref(ns).is("loading"))
            }, {
              default: withCtx(() => [
                (openBlock(), createBlock(resolveDynamicComponent(_ctx.loadingIcon)))
              ]),
              _: 1
            }, 8, ["class"]))
          ], 64)) : _ctx.icon || _ctx.$slots.icon ? (openBlock(), createBlock(unref(ElIcon), { key: 1 }, {
            default: withCtx(() => [
              _ctx.icon ? (openBlock(), createBlock(resolveDynamicComponent(_ctx.icon), { key: 0 })) : renderSlot(_ctx.$slots, "icon", { key: 1 })
            ]),
            _: 3
          })) : createCommentVNode("v-if", true),
          _ctx.$slots.default ? (openBlock(), createElementBlock("span", {
            key: 2,
            class: normalizeClass({ [unref(ns).em("text", "expand")]: unref(shouldAddSpace) })
          }, [
            renderSlot(_ctx.$slots, "default")
          ], 2)) : createCommentVNode("v-if", true)
        ]),
        _: 3
      }, 16, ["class", "style", "onClick"]);
    };
  }
});
var Button = /* @__PURE__ */ _export_sfc(_sfc_main$5, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/button/src/button.vue"]]);
const buttonGroupProps = {
  size: buttonProps.size,
  type: buttonProps.type
};
const __default__$4 = defineComponent({
  name: "ElButtonGroup"
});
const _sfc_main$4 = /* @__PURE__ */ defineComponent({
  ...__default__$4,
  props: buttonGroupProps,
  setup(__props) {
    const props = __props;
    provide(buttonGroupContextKey, reactive({
      size: toRef(props, "size"),
      type: toRef(props, "type")
    }));
    const ns = useNamespace("button");
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        class: normalizeClass(`${unref(ns).b("group")}`)
      }, [
        renderSlot(_ctx.$slots, "default")
      ], 2);
    };
  }
});
var ButtonGroup = /* @__PURE__ */ _export_sfc(_sfc_main$4, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/button/src/button-group.vue"]]);
const ElButton = withInstall(Button, {
  ButtonGroup
});
withNoopInstall(ButtonGroup);
const overlayProps = buildProps({
  mask: {
    type: Boolean,
    default: true
  },
  customMaskEvent: {
    type: Boolean,
    default: false
  },
  overlayClass: {
    type: definePropType([
      String,
      Array,
      Object
    ])
  },
  zIndex: {
    type: definePropType([String, Number])
  }
});
const overlayEmits = {
  click: (evt) => evt instanceof MouseEvent
};
const BLOCK = "overlay";
var Overlay = defineComponent({
  name: "ElOverlay",
  props: overlayProps,
  emits: overlayEmits,
  setup(props, { slots, emit }) {
    const ns = useNamespace(BLOCK);
    const onMaskClick = (e) => {
      emit("click", e);
    };
    const { onClick, onMousedown, onMouseup } = useSameTarget(props.customMaskEvent ? void 0 : onMaskClick);
    return () => {
      return props.mask ? createVNode("div", {
        class: [ns.b(), props.overlayClass],
        style: {
          zIndex: props.zIndex
        },
        onClick,
        onMousedown,
        onMouseup
      }, [renderSlot(slots, "default")], PatchFlags.STYLE | PatchFlags.CLASS | PatchFlags.PROPS, ["onClick", "onMouseup", "onMousedown"]) : h("div", {
        class: props.overlayClass,
        style: {
          zIndex: props.zIndex,
          position: "fixed",
          top: "0px",
          right: "0px",
          bottom: "0px",
          left: "0px"
        }
      }, [renderSlot(slots, "default")]);
    };
  }
});
const ElOverlay = Overlay;
const dialogInjectionKey = Symbol("dialogInjectionKey");
const dialogContentProps = buildProps({
  center: Boolean,
  alignCenter: Boolean,
  closeIcon: {
    type: iconPropType
  },
  customClass: {
    type: String,
    default: ""
  },
  draggable: Boolean,
  fullscreen: Boolean,
  showClose: {
    type: Boolean,
    default: true
  },
  title: {
    type: String,
    default: ""
  },
  ariaLevel: {
    type: String,
    default: "2"
  }
});
const dialogContentEmits = {
  close: () => true
};
const _hoisted_1$3 = ["aria-level"];
const _hoisted_2$2 = ["aria-label"];
const _hoisted_3$1 = ["id"];
const __default__$3 = defineComponent({ name: "ElDialogContent" });
const _sfc_main$3 = /* @__PURE__ */ defineComponent({
  ...__default__$3,
  props: dialogContentProps,
  emits: dialogContentEmits,
  setup(__props) {
    const props = __props;
    const { t } = useLocale();
    const { Close } = CloseComponents;
    const { dialogRef, headerRef, bodyId, ns, style } = inject(dialogInjectionKey);
    const { focusTrapRef } = inject(FOCUS_TRAP_INJECTION_KEY);
    const dialogKls = computed(() => [
      ns.b(),
      ns.is("fullscreen", props.fullscreen),
      ns.is("draggable", props.draggable),
      ns.is("align-center", props.alignCenter),
      { [ns.m("center")]: props.center },
      props.customClass
    ]);
    const composedDialogRef = composeRefs(focusTrapRef, dialogRef);
    const draggable = computed(() => props.draggable);
    useDraggable(dialogRef, headerRef, draggable);
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        ref: unref(composedDialogRef),
        class: normalizeClass(unref(dialogKls)),
        style: normalizeStyle(unref(style)),
        tabindex: "-1"
      }, [
        createBaseVNode("header", {
          ref_key: "headerRef",
          ref: headerRef,
          class: normalizeClass(unref(ns).e("header"))
        }, [
          renderSlot(_ctx.$slots, "header", {}, () => [
            createBaseVNode("span", {
              role: "heading",
              "aria-level": _ctx.ariaLevel,
              class: normalizeClass(unref(ns).e("title"))
            }, toDisplayString(_ctx.title), 11, _hoisted_1$3)
          ]),
          _ctx.showClose ? (openBlock(), createElementBlock("button", {
            key: 0,
            "aria-label": unref(t)("el.dialog.close"),
            class: normalizeClass(unref(ns).e("headerbtn")),
            type: "button",
            onClick: _cache[0] || (_cache[0] = ($event) => _ctx.$emit("close"))
          }, [
            createVNode(unref(ElIcon), {
              class: normalizeClass(unref(ns).e("close"))
            }, {
              default: withCtx(() => [
                (openBlock(), createBlock(resolveDynamicComponent(_ctx.closeIcon || unref(Close))))
              ]),
              _: 1
            }, 8, ["class"])
          ], 10, _hoisted_2$2)) : createCommentVNode("v-if", true)
        ], 2),
        createBaseVNode("div", {
          id: unref(bodyId),
          class: normalizeClass(unref(ns).e("body"))
        }, [
          renderSlot(_ctx.$slots, "default")
        ], 10, _hoisted_3$1),
        _ctx.$slots.footer ? (openBlock(), createElementBlock("footer", {
          key: 0,
          class: normalizeClass(unref(ns).e("footer"))
        }, [
          renderSlot(_ctx.$slots, "footer")
        ], 2)) : createCommentVNode("v-if", true)
      ], 6);
    };
  }
});
var ElDialogContent = /* @__PURE__ */ _export_sfc(_sfc_main$3, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/dialog/src/dialog-content.vue"]]);
const dialogProps = buildProps({
  ...dialogContentProps,
  appendToBody: Boolean,
  beforeClose: {
    type: definePropType(Function)
  },
  destroyOnClose: Boolean,
  closeOnClickModal: {
    type: Boolean,
    default: true
  },
  closeOnPressEscape: {
    type: Boolean,
    default: true
  },
  lockScroll: {
    type: Boolean,
    default: true
  },
  modal: {
    type: Boolean,
    default: true
  },
  openDelay: {
    type: Number,
    default: 0
  },
  closeDelay: {
    type: Number,
    default: 0
  },
  top: {
    type: String
  },
  modelValue: Boolean,
  modalClass: String,
  width: {
    type: [String, Number]
  },
  zIndex: {
    type: Number
  },
  trapFocus: {
    type: Boolean,
    default: false
  },
  headerAriaLevel: {
    type: String,
    default: "2"
  }
});
const dialogEmits = {
  open: () => true,
  opened: () => true,
  close: () => true,
  closed: () => true,
  [UPDATE_MODEL_EVENT]: (value) => isBoolean(value),
  openAutoFocus: () => true,
  closeAutoFocus: () => true
};
const useDialog = (props, targetRef) => {
  const instance = getCurrentInstance();
  const emit = instance.emit;
  const { nextZIndex } = useZIndex();
  let lastPosition = "";
  const titleId = useId();
  const bodyId = useId();
  const visible = ref(false);
  const closed = ref(false);
  const rendered = ref(false);
  const zIndex2 = ref(props.zIndex || nextZIndex());
  let openTimer = void 0;
  let closeTimer = void 0;
  const namespace = useGlobalConfig("namespace", defaultNamespace);
  const style = computed(() => {
    const style2 = {};
    const varPrefix = `--${namespace.value}-dialog`;
    if (!props.fullscreen) {
      if (props.top) {
        style2[`${varPrefix}-margin-top`] = props.top;
      }
      if (props.width) {
        style2[`${varPrefix}-width`] = addUnit(props.width);
      }
    }
    return style2;
  });
  const overlayDialogStyle = computed(() => {
    if (props.alignCenter) {
      return { display: "flex" };
    }
    return {};
  });
  function afterEnter() {
    emit("opened");
  }
  function afterLeave() {
    emit("closed");
    emit(UPDATE_MODEL_EVENT, false);
    if (props.destroyOnClose) {
      rendered.value = false;
    }
  }
  function beforeLeave() {
    emit("close");
  }
  function open() {
    closeTimer == null ? void 0 : closeTimer();
    openTimer == null ? void 0 : openTimer();
    if (props.openDelay && props.openDelay > 0) {
      ({ stop: openTimer } = useTimeoutFn(() => doOpen(), props.openDelay));
    } else {
      doOpen();
    }
  }
  function close() {
    openTimer == null ? void 0 : openTimer();
    closeTimer == null ? void 0 : closeTimer();
    if (props.closeDelay && props.closeDelay > 0) {
      ({ stop: closeTimer } = useTimeoutFn(() => doClose(), props.closeDelay));
    } else {
      doClose();
    }
  }
  function handleClose() {
    function hide(shouldCancel) {
      if (shouldCancel)
        return;
      closed.value = true;
      visible.value = false;
    }
    if (props.beforeClose) {
      props.beforeClose(hide);
    } else {
      close();
    }
  }
  function onModalClick() {
    if (props.closeOnClickModal) {
      handleClose();
    }
  }
  function doOpen() {
    if (!isClient)
      return;
    visible.value = true;
  }
  function doClose() {
    visible.value = false;
  }
  function onOpenAutoFocus() {
    emit("openAutoFocus");
  }
  function onCloseAutoFocus() {
    emit("closeAutoFocus");
  }
  function onFocusoutPrevented(event) {
    var _a;
    if (((_a = event.detail) == null ? void 0 : _a.focusReason) === "pointer") {
      event.preventDefault();
    }
  }
  if (props.lockScroll) {
    useLockscreen(visible);
  }
  function onCloseRequested() {
    if (props.closeOnPressEscape) {
      handleClose();
    }
  }
  watch(() => props.modelValue, (val) => {
    if (val) {
      closed.value = false;
      open();
      rendered.value = true;
      zIndex2.value = props.zIndex ? zIndex2.value++ : nextZIndex();
      nextTick(() => {
        emit("open");
        if (targetRef.value) {
          targetRef.value.scrollTop = 0;
        }
      });
    } else {
      if (visible.value) {
        close();
      }
    }
  });
  watch(() => props.fullscreen, (val) => {
    if (!targetRef.value)
      return;
    if (val) {
      lastPosition = targetRef.value.style.transform;
      targetRef.value.style.transform = "";
    } else {
      targetRef.value.style.transform = lastPosition;
    }
  });
  onMounted(() => {
    if (props.modelValue) {
      visible.value = true;
      rendered.value = true;
      open();
    }
  });
  return {
    afterEnter,
    afterLeave,
    beforeLeave,
    handleClose,
    onModalClick,
    close,
    doClose,
    onOpenAutoFocus,
    onCloseAutoFocus,
    onCloseRequested,
    onFocusoutPrevented,
    titleId,
    bodyId,
    closed,
    style,
    overlayDialogStyle,
    rendered,
    visible,
    zIndex: zIndex2
  };
};
const _hoisted_1$2 = ["aria-label", "aria-labelledby", "aria-describedby"];
const __default__$2 = defineComponent({
  name: "ElDialog",
  inheritAttrs: false
});
const _sfc_main$2 = /* @__PURE__ */ defineComponent({
  ...__default__$2,
  props: dialogProps,
  emits: dialogEmits,
  setup(__props, { expose }) {
    const props = __props;
    const slots = useSlots();
    useDeprecated({
      scope: "el-dialog",
      from: "the title slot",
      replacement: "the header slot",
      version: "3.0.0",
      ref: "https://element-plus.org/en-US/component/dialog.html#slots"
    }, computed(() => !!slots.title));
    useDeprecated({
      scope: "el-dialog",
      from: "custom-class",
      replacement: "class",
      version: "2.3.0",
      ref: "https://element-plus.org/en-US/component/dialog.html#attributes",
      type: "Attribute"
    }, computed(() => !!props.customClass));
    const ns = useNamespace("dialog");
    const dialogRef = ref();
    const headerRef = ref();
    const dialogContentRef = ref();
    const {
      visible,
      titleId,
      bodyId,
      style,
      overlayDialogStyle,
      rendered,
      zIndex: zIndex2,
      afterEnter,
      afterLeave,
      beforeLeave,
      handleClose,
      onModalClick,
      onOpenAutoFocus,
      onCloseAutoFocus,
      onCloseRequested,
      onFocusoutPrevented
    } = useDialog(props, dialogRef);
    provide(dialogInjectionKey, {
      dialogRef,
      headerRef,
      bodyId,
      ns,
      rendered,
      style
    });
    const overlayEvent = useSameTarget(onModalClick);
    const draggable = computed(() => props.draggable && !props.fullscreen);
    expose({
      visible,
      dialogContentRef
    });
    return (_ctx, _cache) => {
      return openBlock(), createBlock(Teleport, {
        to: "body",
        disabled: !_ctx.appendToBody
      }, [
        createVNode(Transition, {
          name: "dialog-fade",
          onAfterEnter: unref(afterEnter),
          onAfterLeave: unref(afterLeave),
          onBeforeLeave: unref(beforeLeave),
          persisted: ""
        }, {
          default: withCtx(() => [
            withDirectives(createVNode(unref(ElOverlay), {
              "custom-mask-event": "",
              mask: _ctx.modal,
              "overlay-class": _ctx.modalClass,
              "z-index": unref(zIndex2)
            }, {
              default: withCtx(() => [
                createBaseVNode("div", {
                  role: "dialog",
                  "aria-modal": "true",
                  "aria-label": _ctx.title || void 0,
                  "aria-labelledby": !_ctx.title ? unref(titleId) : void 0,
                  "aria-describedby": unref(bodyId),
                  class: normalizeClass(`${unref(ns).namespace.value}-overlay-dialog`),
                  style: normalizeStyle(unref(overlayDialogStyle)),
                  onClick: _cache[0] || (_cache[0] = (...args) => unref(overlayEvent).onClick && unref(overlayEvent).onClick(...args)),
                  onMousedown: _cache[1] || (_cache[1] = (...args) => unref(overlayEvent).onMousedown && unref(overlayEvent).onMousedown(...args)),
                  onMouseup: _cache[2] || (_cache[2] = (...args) => unref(overlayEvent).onMouseup && unref(overlayEvent).onMouseup(...args))
                }, [
                  createVNode(unref(ElFocusTrap), {
                    loop: "",
                    trapped: unref(visible),
                    "focus-start-el": "container",
                    onFocusAfterTrapped: unref(onOpenAutoFocus),
                    onFocusAfterReleased: unref(onCloseAutoFocus),
                    onFocusoutPrevented: unref(onFocusoutPrevented),
                    onReleaseRequested: unref(onCloseRequested)
                  }, {
                    default: withCtx(() => [
                      unref(rendered) ? (openBlock(), createBlock(ElDialogContent, mergeProps({
                        key: 0,
                        ref_key: "dialogContentRef",
                        ref: dialogContentRef
                      }, _ctx.$attrs, {
                        "custom-class": _ctx.customClass,
                        center: _ctx.center,
                        "align-center": _ctx.alignCenter,
                        "close-icon": _ctx.closeIcon,
                        draggable: unref(draggable),
                        fullscreen: _ctx.fullscreen,
                        "show-close": _ctx.showClose,
                        title: _ctx.title,
                        "aria-level": _ctx.headerAriaLevel,
                        onClose: unref(handleClose)
                      }), createSlots({
                        header: withCtx(() => [
                          !_ctx.$slots.title ? renderSlot(_ctx.$slots, "header", {
                            key: 0,
                            close: unref(handleClose),
                            titleId: unref(titleId),
                            titleClass: unref(ns).e("title")
                          }) : renderSlot(_ctx.$slots, "title", { key: 1 })
                        ]),
                        default: withCtx(() => [
                          renderSlot(_ctx.$slots, "default")
                        ]),
                        _: 2
                      }, [
                        _ctx.$slots.footer ? {
                          name: "footer",
                          fn: withCtx(() => [
                            renderSlot(_ctx.$slots, "footer")
                          ])
                        } : void 0
                      ]), 1040, ["custom-class", "center", "align-center", "close-icon", "draggable", "fullscreen", "show-close", "title", "aria-level", "onClose"])) : createCommentVNode("v-if", true)
                    ]),
                    _: 3
                  }, 8, ["trapped", "onFocusAfterTrapped", "onFocusAfterReleased", "onFocusoutPrevented", "onReleaseRequested"])
                ], 46, _hoisted_1$2)
              ]),
              _: 3
            }, 8, ["mask", "overlay-class", "z-index"]), [
              [vShow, unref(visible)]
            ])
          ]),
          _: 3
        }, 8, ["onAfterEnter", "onAfterLeave", "onBeforeLeave"])
      ], 8, ["disabled"]);
    };
  }
});
var Dialog = /* @__PURE__ */ _export_sfc(_sfc_main$2, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/dialog/src/dialog.vue"]]);
const ElDialog = withInstall(Dialog);
const _hoisted_1$1 = {
  viewBox: "0 0 79 86",
  version: "1.1",
  xmlns: "http://www.w3.org/2000/svg",
  "xmlns:xlink": "http://www.w3.org/1999/xlink"
};
const _hoisted_2$1 = ["id"];
const _hoisted_3 = ["stop-color"];
const _hoisted_4 = ["stop-color"];
const _hoisted_5 = ["id"];
const _hoisted_6 = ["stop-color"];
const _hoisted_7 = ["stop-color"];
const _hoisted_8 = ["id"];
const _hoisted_9 = {
  id: "Illustrations",
  stroke: "none",
  "stroke-width": "1",
  fill: "none",
  "fill-rule": "evenodd"
};
const _hoisted_10 = {
  id: "B-type",
  transform: "translate(-1268.000000, -535.000000)"
};
const _hoisted_11 = {
  id: "Group-2",
  transform: "translate(1268.000000, 535.000000)"
};
const _hoisted_12 = ["fill"];
const _hoisted_13 = ["fill"];
const _hoisted_14 = {
  id: "Group-Copy",
  transform: "translate(34.500000, 31.500000) scale(-1, 1) rotate(-25.000000) translate(-34.500000, -31.500000) translate(7.000000, 10.000000)"
};
const _hoisted_15 = ["fill"];
const _hoisted_16 = ["fill"];
const _hoisted_17 = ["fill"];
const _hoisted_18 = ["fill"];
const _hoisted_19 = ["fill"];
const _hoisted_20 = {
  id: "Rectangle-Copy-17",
  transform: "translate(53.000000, 45.000000)"
};
const _hoisted_21 = ["fill", "xlink:href"];
const _hoisted_22 = ["fill", "mask"];
const _hoisted_23 = ["fill"];
const __default__$1 = defineComponent({
  name: "ImgEmpty"
});
const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  ...__default__$1,
  setup(__props) {
    const ns = useNamespace("empty");
    const id = useId();
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("svg", _hoisted_1$1, [
        createBaseVNode("defs", null, [
          createBaseVNode("linearGradient", {
            id: `linearGradient-1-${unref(id)}`,
            x1: "38.8503086%",
            y1: "0%",
            x2: "61.1496914%",
            y2: "100%"
          }, [
            createBaseVNode("stop", {
              "stop-color": `var(${unref(ns).cssVarBlockName("fill-color-1")})`,
              offset: "0%"
            }, null, 8, _hoisted_3),
            createBaseVNode("stop", {
              "stop-color": `var(${unref(ns).cssVarBlockName("fill-color-4")})`,
              offset: "100%"
            }, null, 8, _hoisted_4)
          ], 8, _hoisted_2$1),
          createBaseVNode("linearGradient", {
            id: `linearGradient-2-${unref(id)}`,
            x1: "0%",
            y1: "9.5%",
            x2: "100%",
            y2: "90.5%"
          }, [
            createBaseVNode("stop", {
              "stop-color": `var(${unref(ns).cssVarBlockName("fill-color-1")})`,
              offset: "0%"
            }, null, 8, _hoisted_6),
            createBaseVNode("stop", {
              "stop-color": `var(${unref(ns).cssVarBlockName("fill-color-6")})`,
              offset: "100%"
            }, null, 8, _hoisted_7)
          ], 8, _hoisted_5),
          createBaseVNode("rect", {
            id: `path-3-${unref(id)}`,
            x: "0",
            y: "0",
            width: "17",
            height: "36"
          }, null, 8, _hoisted_8)
        ]),
        createBaseVNode("g", _hoisted_9, [
          createBaseVNode("g", _hoisted_10, [
            createBaseVNode("g", _hoisted_11, [
              createBaseVNode("path", {
                id: "Oval-Copy-2",
                d: "M39.5,86 C61.3152476,86 79,83.9106622 79,81.3333333 C79,78.7560045 57.3152476,78 35.5,78 C13.6847524,78 0,78.7560045 0,81.3333333 C0,83.9106622 17.6847524,86 39.5,86 Z",
                fill: `var(${unref(ns).cssVarBlockName("fill-color-3")})`
              }, null, 8, _hoisted_12),
              createBaseVNode("polygon", {
                id: "Rectangle-Copy-14",
                fill: `var(${unref(ns).cssVarBlockName("fill-color-7")})`,
                transform: "translate(27.500000, 51.500000) scale(1, -1) translate(-27.500000, -51.500000) ",
                points: "13 58 53 58 42 45 2 45"
              }, null, 8, _hoisted_13),
              createBaseVNode("g", _hoisted_14, [
                createBaseVNode("polygon", {
                  id: "Rectangle-Copy-10",
                  fill: `var(${unref(ns).cssVarBlockName("fill-color-7")})`,
                  transform: "translate(11.500000, 5.000000) scale(1, -1) translate(-11.500000, -5.000000) ",
                  points: "2.84078316e-14 3 18 3 23 7 5 7"
                }, null, 8, _hoisted_15),
                createBaseVNode("polygon", {
                  id: "Rectangle-Copy-11",
                  fill: `var(${unref(ns).cssVarBlockName("fill-color-5")})`,
                  points: "-3.69149156e-15 7 38 7 38 43 -3.69149156e-15 43"
                }, null, 8, _hoisted_16),
                createBaseVNode("rect", {
                  id: "Rectangle-Copy-12",
                  fill: `url(#linearGradient-1-${unref(id)})`,
                  transform: "translate(46.500000, 25.000000) scale(-1, 1) translate(-46.500000, -25.000000) ",
                  x: "38",
                  y: "7",
                  width: "17",
                  height: "36"
                }, null, 8, _hoisted_17),
                createBaseVNode("polygon", {
                  id: "Rectangle-Copy-13",
                  fill: `var(${unref(ns).cssVarBlockName("fill-color-2")})`,
                  transform: "translate(39.500000, 3.500000) scale(-1, 1) translate(-39.500000, -3.500000) ",
                  points: "24 7 41 7 55 -3.63806207e-12 38 -3.63806207e-12"
                }, null, 8, _hoisted_18)
              ]),
              createBaseVNode("rect", {
                id: "Rectangle-Copy-15",
                fill: `url(#linearGradient-2-${unref(id)})`,
                x: "13",
                y: "45",
                width: "40",
                height: "36"
              }, null, 8, _hoisted_19),
              createBaseVNode("g", _hoisted_20, [
                createBaseVNode("use", {
                  id: "Mask",
                  fill: `var(${unref(ns).cssVarBlockName("fill-color-8")})`,
                  transform: "translate(8.500000, 18.000000) scale(-1, 1) translate(-8.500000, -18.000000) ",
                  "xlink:href": `#path-3-${unref(id)}`
                }, null, 8, _hoisted_21),
                createBaseVNode("polygon", {
                  id: "Rectangle-Copy",
                  fill: `var(${unref(ns).cssVarBlockName("fill-color-9")})`,
                  mask: `url(#mask-4-${unref(id)})`,
                  transform: "translate(12.000000, 9.000000) scale(-1, 1) translate(-12.000000, -9.000000) ",
                  points: "7 0 24 0 20 18 7 16.5"
                }, null, 8, _hoisted_22)
              ]),
              createBaseVNode("polygon", {
                id: "Rectangle-Copy-18",
                fill: `var(${unref(ns).cssVarBlockName("fill-color-2")})`,
                transform: "translate(66.000000, 51.500000) scale(-1, 1) translate(-66.000000, -51.500000) ",
                points: "62 45 79 45 70 58 53 58"
              }, null, 8, _hoisted_23)
            ])
          ])
        ])
      ]);
    };
  }
});
var ImgEmpty = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/empty/src/img-empty.vue"]]);
const emptyProps = buildProps({
  image: {
    type: String,
    default: ""
  },
  imageSize: Number,
  description: {
    type: String,
    default: ""
  }
});
const _hoisted_1 = ["src"];
const _hoisted_2 = { key: 1 };
const __default__ = defineComponent({
  name: "ElEmpty"
});
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  props: emptyProps,
  setup(__props) {
    const props = __props;
    const { t } = useLocale();
    const ns = useNamespace("empty");
    const emptyDescription = computed(() => props.description || t("el.table.emptyText"));
    const imageStyle = computed(() => ({
      width: addUnit(props.imageSize)
    }));
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        class: normalizeClass(unref(ns).b())
      }, [
        createBaseVNode("div", {
          class: normalizeClass(unref(ns).e("image")),
          style: normalizeStyle(unref(imageStyle))
        }, [
          _ctx.image ? (openBlock(), createElementBlock("img", {
            key: 0,
            src: _ctx.image,
            ondragstart: "return false"
          }, null, 8, _hoisted_1)) : renderSlot(_ctx.$slots, "image", { key: 1 }, () => [
            createVNode(ImgEmpty)
          ])
        ], 6),
        createBaseVNode("div", {
          class: normalizeClass(unref(ns).e("description"))
        }, [
          _ctx.$slots.description ? renderSlot(_ctx.$slots, "description", { key: 0 }) : (openBlock(), createElementBlock("p", _hoisted_2, toDisplayString(unref(emptyDescription)), 1))
        ], 2),
        _ctx.$slots.default ? (openBlock(), createElementBlock("div", {
          key: 0,
          class: normalizeClass(unref(ns).e("bottom"))
        }, [
          renderSlot(_ctx.$slots, "default")
        ], 2)) : createCommentVNode("v-if", true)
      ], 2);
    };
  }
});
var Empty = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/empty/src/empty.vue"]]);
const ElEmpty = withInstall(Empty);
const base = "";
const elDialog = "";
const elOverlay = "";
const elButton = "";
const elEmpty = "";
export {
  ElButton as E,
  ElDialog as a,
  ElEmpty as b
};
