function bind(fn, thisArg) {
  return function wrap() {
    return fn.apply(thisArg, arguments);
  };
}
const { toString } = Object.prototype;
const { getPrototypeOf } = Object;
const { iterator, toStringTag } = Symbol;
const kindOf = /* @__PURE__ */ ((cache) => (thing) => {
  const str = toString.call(thing);
  return cache[str] || (cache[str] = str.slice(8, -1).toLowerCase());
})(/* @__PURE__ */ Object.create(null));
const kindOfTest = (type) => {
  type = type.toLowerCase();
  return (thing) => kindOf(thing) === type;
};
const typeOfTest = (type) => (thing) => typeof thing === type;
const { isArray } = Array;
const isUndefined = typeOfTest("undefined");
function isBuffer(val) {
  return val !== null && !isUndefined(val) && val.constructor !== null && !isUndefined(val.constructor) && isFunction$1(val.constructor.isBuffer) && val.constructor.isBuffer(val);
}
const isArrayBuffer = kindOfTest("ArrayBuffer");
function isArrayBufferView(val) {
  let result;
  if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView) {
    result = ArrayBuffer.isView(val);
  } else {
    result = val && val.buffer && isArrayBuffer(val.buffer);
  }
  return result;
}
const isString = typeOfTest("string");
const isFunction$1 = typeOfTest("function");
const isNumber = typeOfTest("number");
const isObject = (thing) => thing !== null && typeof thing === "object";
const isBoolean = (thing) => thing === true || thing === false;
const isPlainObject = (val) => {
  if (kindOf(val) !== "object") {
    return false;
  }
  const prototype2 = getPrototypeOf(val);
  return (prototype2 === null || prototype2 === Object.prototype || Object.getPrototypeOf(prototype2) === null) && !(toStringTag in val) && !(iterator in val);
};
const isEmptyObject = (val) => {
  if (!isObject(val) || isBuffer(val)) {
    return false;
  }
  try {
    return Object.keys(val).length === 0 && Object.getPrototypeOf(val) === Object.prototype;
  } catch (e) {
    return false;
  }
};
const isDate = kindOfTest("Date");
const isFile = kindOfTest("File");
const isReactNativeBlob = (value) => {
  return !!(value && typeof value.uri !== "undefined");
};
const isReactNative = (formData) => formData && typeof formData.getParts !== "undefined";
const isBlob = kindOfTest("Blob");
const isFileList = kindOfTest("FileList");
const isStream = (val) => isObject(val) && isFunction$1(val.pipe);
function getGlobal() {
  if (typeof globalThis !== "undefined") return globalThis;
  if (typeof self !== "undefined") return self;
  if (typeof window !== "undefined") return window;
  if (typeof global !== "undefined") return global;
  return {};
}
const G = getGlobal();
const FormDataCtor = typeof G.FormData !== "undefined" ? G.FormData : void 0;
const isFormData = (thing) => {
  if (!thing) return false;
  if (FormDataCtor && thing instanceof FormDataCtor) return true;
  const proto = getPrototypeOf(thing);
  if (!proto || proto === Object.prototype) return false;
  if (!isFunction$1(thing.append)) return false;
  const kind = kindOf(thing);
  return kind === "formdata" || // detect form-data instance
  kind === "object" && isFunction$1(thing.toString) && thing.toString() === "[object FormData]";
};
const isURLSearchParams = kindOfTest("URLSearchParams");
const [isReadableStream, isRequest, isResponse, isHeaders] = [
  "ReadableStream",
  "Request",
  "Response",
  "Headers"
].map(kindOfTest);
const trim = (str) => {
  return str.trim ? str.trim() : str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, "");
};
function forEach(obj, fn, { allOwnKeys = false } = {}) {
  if (obj === null || typeof obj === "undefined") {
    return;
  }
  let i;
  let l;
  if (typeof obj !== "object") {
    obj = [obj];
  }
  if (isArray(obj)) {
    for (i = 0, l = obj.length; i < l; i++) {
      fn.call(null, obj[i], i, obj);
    }
  } else {
    if (isBuffer(obj)) {
      return;
    }
    const keys = allOwnKeys ? Object.getOwnPropertyNames(obj) : Object.keys(obj);
    const len = keys.length;
    let key;
    for (i = 0; i < len; i++) {
      key = keys[i];
      fn.call(null, obj[key], key, obj);
    }
  }
}
function findKey(obj, key) {
  if (isBuffer(obj)) {
    return null;
  }
  key = key.toLowerCase();
  const keys = Object.keys(obj);
  let i = keys.length;
  let _key;
  while (i-- > 0) {
    _key = keys[i];
    if (key === _key.toLowerCase()) {
      return _key;
    }
  }
  return null;
}
const _global = (() => {
  if (typeof globalThis !== "undefined") return globalThis;
  return typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : global;
})();
const isContextDefined = (context) => !isUndefined(context) && context !== _global;
function merge(...objs) {
  const { caseless, skipUndefined } = isContextDefined(this) && this || {};
  const result = {};
  const assignValue = (val, key) => {
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      return;
    }
    const targetKey = caseless && findKey(result, key) || key;
    const existing = hasOwnProperty(result, targetKey) ? result[targetKey] : void 0;
    if (isPlainObject(existing) && isPlainObject(val)) {
      result[targetKey] = merge(existing, val);
    } else if (isPlainObject(val)) {
      result[targetKey] = merge({}, val);
    } else if (isArray(val)) {
      result[targetKey] = val.slice();
    } else if (!skipUndefined || !isUndefined(val)) {
      result[targetKey] = val;
    }
  };
  for (let i = 0, l = objs.length; i < l; i++) {
    objs[i] && forEach(objs[i], assignValue);
  }
  return result;
}
const extend = (a, b, thisArg, { allOwnKeys } = {}) => {
  forEach(
    b,
    (val, key) => {
      if (thisArg && isFunction$1(val)) {
        Object.defineProperty(a, key, {
          // Null-proto descriptor so a polluted Object.prototype.get cannot
          // hijack defineProperty's accessor-vs-data resolution.
          __proto__: null,
          value: bind(val, thisArg),
          writable: true,
          enumerable: true,
          configurable: true
        });
      } else {
        Object.defineProperty(a, key, {
          __proto__: null,
          value: val,
          writable: true,
          enumerable: true,
          configurable: true
        });
      }
    },
    { allOwnKeys }
  );
  return a;
};
const stripBOM = (content) => {
  if (content.charCodeAt(0) === 65279) {
    content = content.slice(1);
  }
  return content;
};
const inherits = (constructor, superConstructor, props, descriptors) => {
  constructor.prototype = Object.create(superConstructor.prototype, descriptors);
  Object.defineProperty(constructor.prototype, "constructor", {
    __proto__: null,
    value: constructor,
    writable: true,
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(constructor, "super", {
    __proto__: null,
    value: superConstructor.prototype
  });
  props && Object.assign(constructor.prototype, props);
};
const toFlatObject = (sourceObj, destObj, filter2, propFilter) => {
  let props;
  let i;
  let prop;
  const merged = {};
  destObj = destObj || {};
  if (sourceObj == null) return destObj;
  do {
    props = Object.getOwnPropertyNames(sourceObj);
    i = props.length;
    while (i-- > 0) {
      prop = props[i];
      if ((!propFilter || propFilter(prop, sourceObj, destObj)) && !merged[prop]) {
        destObj[prop] = sourceObj[prop];
        merged[prop] = true;
      }
    }
    sourceObj = filter2 !== false && getPrototypeOf(sourceObj);
  } while (sourceObj && (!filter2 || filter2(sourceObj, destObj)) && sourceObj !== Object.prototype);
  return destObj;
};
const endsWith = (str, searchString, position) => {
  str = String(str);
  if (position === void 0 || position > str.length) {
    position = str.length;
  }
  position -= searchString.length;
  const lastIndex = str.indexOf(searchString, position);
  return lastIndex !== -1 && lastIndex === position;
};
const toArray = (thing) => {
  if (!thing) return null;
  if (isArray(thing)) return thing;
  let i = thing.length;
  if (!isNumber(i)) return null;
  const arr = new Array(i);
  while (i-- > 0) {
    arr[i] = thing[i];
  }
  return arr;
};
const isTypedArray = /* @__PURE__ */ ((TypedArray) => {
  return (thing) => {
    return TypedArray && thing instanceof TypedArray;
  };
})(typeof Uint8Array !== "undefined" && getPrototypeOf(Uint8Array));
const forEachEntry = (obj, fn) => {
  const generator = obj && obj[iterator];
  const _iterator = generator.call(obj);
  let result;
  while ((result = _iterator.next()) && !result.done) {
    const pair = result.value;
    fn.call(obj, pair[0], pair[1]);
  }
};
const matchAll = (regExp, str) => {
  let matches;
  const arr = [];
  while ((matches = regExp.exec(str)) !== null) {
    arr.push(matches);
  }
  return arr;
};
const isHTMLForm = kindOfTest("HTMLFormElement");
const toCamelCase = (str) => {
  return str.toLowerCase().replace(/[-_\s]([a-z\d])(\w*)/g, function replacer(m, p1, p2) {
    return p1.toUpperCase() + p2;
  });
};
const hasOwnProperty = (({ hasOwnProperty: hasOwnProperty2 }) => (obj, prop) => hasOwnProperty2.call(obj, prop))(Object.prototype);
const isRegExp = kindOfTest("RegExp");
const reduceDescriptors = (obj, reducer) => {
  const descriptors = Object.getOwnPropertyDescriptors(obj);
  const reducedDescriptors = {};
  forEach(descriptors, (descriptor, name) => {
    let ret;
    if ((ret = reducer(descriptor, name, obj)) !== false) {
      reducedDescriptors[name] = ret || descriptor;
    }
  });
  Object.defineProperties(obj, reducedDescriptors);
};
const freezeMethods = (obj) => {
  reduceDescriptors(obj, (descriptor, name) => {
    if (isFunction$1(obj) && ["arguments", "caller", "callee"].includes(name)) {
      return false;
    }
    const value = obj[name];
    if (!isFunction$1(value)) return;
    descriptor.enumerable = false;
    if ("writable" in descriptor) {
      descriptor.writable = false;
      return;
    }
    if (!descriptor.set) {
      descriptor.set = () => {
        throw Error("Can not rewrite read-only method '" + name + "'");
      };
    }
  });
};
const toObjectSet = (arrayOrString, delimiter) => {
  const obj = {};
  const define = (arr) => {
    arr.forEach((value) => {
      obj[value] = true;
    });
  };
  isArray(arrayOrString) ? define(arrayOrString) : define(String(arrayOrString).split(delimiter));
  return obj;
};
const noop = () => {
};
const toFiniteNumber = (value, defaultValue) => {
  return value != null && Number.isFinite(value = +value) ? value : defaultValue;
};
function isSpecCompliantForm(thing) {
  return !!(thing && isFunction$1(thing.append) && thing[toStringTag] === "FormData" && thing[iterator]);
}
const toJSONObject = (obj) => {
  const visited = /* @__PURE__ */ new WeakSet();
  const visit = (source) => {
    if (isObject(source)) {
      if (visited.has(source)) {
        return;
      }
      if (isBuffer(source)) {
        return source;
      }
      if (!("toJSON" in source)) {
        visited.add(source);
        const target = isArray(source) ? [] : {};
        forEach(source, (value, key) => {
          const reducedValue = visit(value);
          !isUndefined(reducedValue) && (target[key] = reducedValue);
        });
        visited.delete(source);
        return target;
      }
    }
    return source;
  };
  return visit(obj);
};
const isAsyncFn = kindOfTest("AsyncFunction");
const isThenable = (thing) => thing && (isObject(thing) || isFunction$1(thing)) && isFunction$1(thing.then) && isFunction$1(thing.catch);
const _setImmediate = ((setImmediateSupported, postMessageSupported) => {
  if (setImmediateSupported) {
    return setImmediate;
  }
  return postMessageSupported ? ((token, callbacks) => {
    _global.addEventListener(
      "message",
      ({ source, data }) => {
        if (source === _global && data === token) {
          callbacks.length && callbacks.shift()();
        }
      },
      false
    );
    return (cb) => {
      callbacks.push(cb);
      _global.postMessage(token, "*");
    };
  })(`axios@${Math.random()}`, []) : (cb) => setTimeout(cb);
})(typeof setImmediate === "function", isFunction$1(_global.postMessage));
const asap = typeof queueMicrotask !== "undefined" ? queueMicrotask.bind(_global) : typeof process !== "undefined" && process.nextTick || _setImmediate;
const isIterable = (thing) => thing != null && isFunction$1(thing[iterator]);
const utils$1 = {
  isArray,
  isArrayBuffer,
  isBuffer,
  isFormData,
  isArrayBufferView,
  isString,
  isNumber,
  isBoolean,
  isObject,
  isPlainObject,
  isEmptyObject,
  isReadableStream,
  isRequest,
  isResponse,
  isHeaders,
  isUndefined,
  isDate,
  isFile,
  isReactNativeBlob,
  isReactNative,
  isBlob,
  isRegExp,
  isFunction: isFunction$1,
  isStream,
  isURLSearchParams,
  isTypedArray,
  isFileList,
  forEach,
  merge,
  extend,
  trim,
  stripBOM,
  inherits,
  toFlatObject,
  kindOf,
  kindOfTest,
  endsWith,
  toArray,
  forEachEntry,
  matchAll,
  isHTMLForm,
  hasOwnProperty,
  hasOwnProp: hasOwnProperty,
  // an alias to avoid ESLint no-prototype-builtins detection
  reduceDescriptors,
  freezeMethods,
  toObjectSet,
  toCamelCase,
  noop,
  toFiniteNumber,
  findKey,
  global: _global,
  isContextDefined,
  isSpecCompliantForm,
  toJSONObject,
  isAsyncFn,
  isThenable,
  setImmediate: _setImmediate,
  asap,
  isIterable
};
const ignoreDuplicateOf = utils$1.toObjectSet([
  "age",
  "authorization",
  "content-length",
  "content-type",
  "etag",
  "expires",
  "from",
  "host",
  "if-modified-since",
  "if-unmodified-since",
  "last-modified",
  "location",
  "max-forwards",
  "proxy-authorization",
  "referer",
  "retry-after",
  "user-agent"
]);
const parseHeaders = (rawHeaders) => {
  const parsed = {};
  let key;
  let val;
  let i;
  rawHeaders && rawHeaders.split("\n").forEach(function parser(line) {
    i = line.indexOf(":");
    key = line.substring(0, i).trim().toLowerCase();
    val = line.substring(i + 1).trim();
    if (!key || parsed[key] && ignoreDuplicateOf[key]) {
      return;
    }
    if (key === "set-cookie") {
      if (parsed[key]) {
        parsed[key].push(val);
      } else {
        parsed[key] = [val];
      }
    } else {
      parsed[key] = parsed[key] ? parsed[key] + ", " + val : val;
    }
  });
  return parsed;
};
function trimSPorHTAB(str) {
  let start = 0;
  let end = str.length;
  while (start < end) {
    const code = str.charCodeAt(start);
    if (code !== 9 && code !== 32) {
      break;
    }
    start += 1;
  }
  while (end > start) {
    const code = str.charCodeAt(end - 1);
    if (code !== 9 && code !== 32) {
      break;
    }
    end -= 1;
  }
  return start === 0 && end === str.length ? str : str.slice(start, end);
}
const INVALID_UNICODE_HEADER_VALUE_CHARS = new RegExp("[\\u0000-\\u0008\\u000a-\\u001f\\u007f]+", "g");
const INVALID_BYTE_STRING_HEADER_VALUE_CHARS = new RegExp("[^\\u0009\\u0020-\\u007e\\u0080-\\u00ff]+", "g");
function sanitizeValue(value, invalidChars) {
  if (utils$1.isArray(value)) {
    return value.map((item) => sanitizeValue(item, invalidChars));
  }
  return trimSPorHTAB(String(value).replace(invalidChars, ""));
}
const sanitizeHeaderValue = (value) => sanitizeValue(value, INVALID_UNICODE_HEADER_VALUE_CHARS);
const sanitizeByteStringHeaderValue = (value) => sanitizeValue(value, INVALID_BYTE_STRING_HEADER_VALUE_CHARS);
function toByteStringHeaderObject(headers) {
  const byteStringHeaders = /* @__PURE__ */ Object.create(null);
  utils$1.forEach(headers.toJSON(), (value, header) => {
    byteStringHeaders[header] = sanitizeByteStringHeaderValue(value);
  });
  return byteStringHeaders;
}
const $internals = Symbol("internals");
function normalizeHeader(header) {
  return header && String(header).trim().toLowerCase();
}
function normalizeValue(value) {
  if (value === false || value == null) {
    return value;
  }
  return utils$1.isArray(value) ? value.map(normalizeValue) : sanitizeHeaderValue(String(value));
}
function parseTokens(str) {
  const tokens = /* @__PURE__ */ Object.create(null);
  const tokensRE = /([^\s,;=]+)\s*(?:=\s*([^,;]+))?/g;
  let match;
  while (match = tokensRE.exec(str)) {
    tokens[match[1]] = match[2];
  }
  return tokens;
}
const isValidHeaderName = (str) => /^[-_a-zA-Z0-9^`|~,!#$%&'*+.]+$/.test(str.trim());
function matchHeaderValue(context, value, header, filter2, isHeaderNameFilter) {
  if (utils$1.isFunction(filter2)) {
    return filter2.call(this, value, header);
  }
  if (isHeaderNameFilter) {
    value = header;
  }
  if (!utils$1.isString(value)) return;
  if (utils$1.isString(filter2)) {
    return value.indexOf(filter2) !== -1;
  }
  if (utils$1.isRegExp(filter2)) {
    return filter2.test(value);
  }
}
function formatHeader(header) {
  return header.trim().toLowerCase().replace(/([a-z\d])(\w*)/g, (w, char, str) => {
    return char.toUpperCase() + str;
  });
}
function buildAccessors(obj, header) {
  const accessorName = utils$1.toCamelCase(" " + header);
  ["get", "set", "has"].forEach((methodName) => {
    Object.defineProperty(obj, methodName + accessorName, {
      // Null-proto descriptor so a polluted Object.prototype.get cannot turn
      // this data descriptor into an accessor descriptor on the way in.
      __proto__: null,
      value: function(arg1, arg2, arg3) {
        return this[methodName].call(this, header, arg1, arg2, arg3);
      },
      configurable: true
    });
  });
}
let AxiosHeaders$1 = class AxiosHeaders {
  constructor(headers) {
    headers && this.set(headers);
  }
  set(header, valueOrRewrite, rewrite) {
    const self2 = this;
    function setHeader(_value, _header, _rewrite) {
      const lHeader = normalizeHeader(_header);
      if (!lHeader) {
        throw new Error("header name must be a non-empty string");
      }
      const key = utils$1.findKey(self2, lHeader);
      if (!key || self2[key] === void 0 || _rewrite === true || _rewrite === void 0 && self2[key] !== false) {
        self2[key || _header] = normalizeValue(_value);
      }
    }
    const setHeaders = (headers, _rewrite) => utils$1.forEach(headers, (_value, _header) => setHeader(_value, _header, _rewrite));
    if (utils$1.isPlainObject(header) || header instanceof this.constructor) {
      setHeaders(header, valueOrRewrite);
    } else if (utils$1.isString(header) && (header = header.trim()) && !isValidHeaderName(header)) {
      setHeaders(parseHeaders(header), valueOrRewrite);
    } else if (utils$1.isObject(header) && utils$1.isIterable(header)) {
      let obj = {}, dest, key;
      for (const entry of header) {
        if (!utils$1.isArray(entry)) {
          throw TypeError("Object iterator must return a key-value pair");
        }
        obj[key = entry[0]] = (dest = obj[key]) ? utils$1.isArray(dest) ? [...dest, entry[1]] : [dest, entry[1]] : entry[1];
      }
      setHeaders(obj, valueOrRewrite);
    } else {
      header != null && setHeader(valueOrRewrite, header, rewrite);
    }
    return this;
  }
  get(header, parser) {
    header = normalizeHeader(header);
    if (header) {
      const key = utils$1.findKey(this, header);
      if (key) {
        const value = this[key];
        if (!parser) {
          return value;
        }
        if (parser === true) {
          return parseTokens(value);
        }
        if (utils$1.isFunction(parser)) {
          return parser.call(this, value, key);
        }
        if (utils$1.isRegExp(parser)) {
          return parser.exec(value);
        }
        throw new TypeError("parser must be boolean|regexp|function");
      }
    }
  }
  has(header, matcher) {
    header = normalizeHeader(header);
    if (header) {
      const key = utils$1.findKey(this, header);
      return !!(key && this[key] !== void 0 && (!matcher || matchHeaderValue(this, this[key], key, matcher)));
    }
    return false;
  }
  delete(header, matcher) {
    const self2 = this;
    let deleted = false;
    function deleteHeader(_header) {
      _header = normalizeHeader(_header);
      if (_header) {
        const key = utils$1.findKey(self2, _header);
        if (key && (!matcher || matchHeaderValue(self2, self2[key], key, matcher))) {
          delete self2[key];
          deleted = true;
        }
      }
    }
    if (utils$1.isArray(header)) {
      header.forEach(deleteHeader);
    } else {
      deleteHeader(header);
    }
    return deleted;
  }
  clear(matcher) {
    const keys = Object.keys(this);
    let i = keys.length;
    let deleted = false;
    while (i--) {
      const key = keys[i];
      if (!matcher || matchHeaderValue(this, this[key], key, matcher, true)) {
        delete this[key];
        deleted = true;
      }
    }
    return deleted;
  }
  normalize(format) {
    const self2 = this;
    const headers = {};
    utils$1.forEach(this, (value, header) => {
      const key = utils$1.findKey(headers, header);
      if (key) {
        self2[key] = normalizeValue(value);
        delete self2[header];
        return;
      }
      const normalized = format ? formatHeader(header) : String(header).trim();
      if (normalized !== header) {
        delete self2[header];
      }
      self2[normalized] = normalizeValue(value);
      headers[normalized] = true;
    });
    return this;
  }
  concat(...targets) {
    return this.constructor.concat(this, ...targets);
  }
  toJSON(asStrings) {
    const obj = /* @__PURE__ */ Object.create(null);
    utils$1.forEach(this, (value, header) => {
      value != null && value !== false && (obj[header] = asStrings && utils$1.isArray(value) ? value.join(", ") : value);
    });
    return obj;
  }
  [Symbol.iterator]() {
    return Object.entries(this.toJSON())[Symbol.iterator]();
  }
  toString() {
    return Object.entries(this.toJSON()).map(([header, value]) => header + ": " + value).join("\n");
  }
  getSetCookie() {
    return this.get("set-cookie") || [];
  }
  get [Symbol.toStringTag]() {
    return "AxiosHeaders";
  }
  static from(thing) {
    return thing instanceof this ? thing : new this(thing);
  }
  static concat(first, ...targets) {
    const computed = new this(first);
    targets.forEach((target) => computed.set(target));
    return computed;
  }
  static accessor(header) {
    const internals = this[$internals] = this[$internals] = {
      accessors: {}
    };
    const accessors = internals.accessors;
    const prototype2 = this.prototype;
    function defineAccessor(_header) {
      const lHeader = normalizeHeader(_header);
      if (!accessors[lHeader]) {
        buildAccessors(prototype2, _header);
        accessors[lHeader] = true;
      }
    }
    utils$1.isArray(header) ? header.forEach(defineAccessor) : defineAccessor(header);
    return this;
  }
};
AxiosHeaders$1.accessor([
  "Content-Type",
  "Content-Length",
  "Accept",
  "Accept-Encoding",
  "User-Agent",
  "Authorization"
]);
utils$1.reduceDescriptors(AxiosHeaders$1.prototype, ({ value }, key) => {
  let mapped = key[0].toUpperCase() + key.slice(1);
  return {
    get: () => value,
    set(headerValue) {
      this[mapped] = headerValue;
    }
  };
});
utils$1.freezeMethods(AxiosHeaders$1);
const REDACTED = "[REDACTED ****]";
function hasOwnOrPrototypeToJSON(source) {
  if (utils$1.hasOwnProp(source, "toJSON")) {
    return true;
  }
  let prototype2 = Object.getPrototypeOf(source);
  while (prototype2 && prototype2 !== Object.prototype) {
    if (utils$1.hasOwnProp(prototype2, "toJSON")) {
      return true;
    }
    prototype2 = Object.getPrototypeOf(prototype2);
  }
  return false;
}
function redactConfig(config, redactKeys) {
  const lowerKeys = new Set(redactKeys.map((k) => String(k).toLowerCase()));
  const seen = [];
  const visit = (source) => {
    if (source === null || typeof source !== "object") return source;
    if (utils$1.isBuffer(source)) return source;
    if (seen.indexOf(source) !== -1) return void 0;
    if (source instanceof AxiosHeaders$1) {
      source = source.toJSON();
    }
    seen.push(source);
    let result;
    if (utils$1.isArray(source)) {
      result = [];
      source.forEach((v, i) => {
        const reducedValue = visit(v);
        if (!utils$1.isUndefined(reducedValue)) {
          result[i] = reducedValue;
        }
      });
    } else {
      if (!utils$1.isPlainObject(source) && hasOwnOrPrototypeToJSON(source)) {
        seen.pop();
        return source;
      }
      result = /* @__PURE__ */ Object.create(null);
      for (const [key, value] of Object.entries(source)) {
        const reducedValue = lowerKeys.has(key.toLowerCase()) ? REDACTED : visit(value);
        if (!utils$1.isUndefined(reducedValue)) {
          result[key] = reducedValue;
        }
      }
    }
    seen.pop();
    return result;
  };
  return visit(config);
}
let AxiosError$1 = class AxiosError extends Error {
  static from(error, code, config, request, response, customProps) {
    const axiosError = new AxiosError(error.message, code || error.code, config, request, response);
    axiosError.cause = error;
    axiosError.name = error.name;
    if (error.status != null && axiosError.status == null) {
      axiosError.status = error.status;
    }
    customProps && Object.assign(axiosError, customProps);
    return axiosError;
  }
  /**
   * Create an Error with the specified message, config, error code, request and response.
   *
   * @param {string} message The error message.
   * @param {string} [code] The error code (for example, 'ECONNABORTED').
   * @param {Object} [config] The config.
   * @param {Object} [request] The request.
   * @param {Object} [response] The response.
   *
   * @returns {Error} The created error.
   */
  constructor(message, code, config, request, response) {
    super(message);
    Object.defineProperty(this, "message", {
      // Null-proto descriptor so a polluted Object.prototype.get cannot turn
      // this data descriptor into an accessor descriptor on the way in.
      __proto__: null,
      value: message,
      enumerable: true,
      writable: true,
      configurable: true
    });
    this.name = "AxiosError";
    this.isAxiosError = true;
    code && (this.code = code);
    config && (this.config = config);
    request && (this.request = request);
    if (response) {
      this.response = response;
      this.status = response.status;
    }
  }
  toJSON() {
    const config = this.config;
    const redactKeys = config && utils$1.hasOwnProp(config, "redact") ? config.redact : void 0;
    const serializedConfig = utils$1.isArray(redactKeys) && redactKeys.length > 0 ? redactConfig(config, redactKeys) : utils$1.toJSONObject(config);
    return {
      // Standard
      message: this.message,
      name: this.name,
      // Microsoft
      description: this.description,
      number: this.number,
      // Mozilla
      fileName: this.fileName,
      lineNumber: this.lineNumber,
      columnNumber: this.columnNumber,
      stack: this.stack,
      // Axios
      config: serializedConfig,
      code: this.code,
      status: this.status
    };
  }
};
AxiosError$1.ERR_BAD_OPTION_VALUE = "ERR_BAD_OPTION_VALUE";
AxiosError$1.ERR_BAD_OPTION = "ERR_BAD_OPTION";
AxiosError$1.ECONNABORTED = "ECONNABORTED";
AxiosError$1.ETIMEDOUT = "ETIMEDOUT";
AxiosError$1.ECONNREFUSED = "ECONNREFUSED";
AxiosError$1.ERR_NETWORK = "ERR_NETWORK";
AxiosError$1.ERR_FR_TOO_MANY_REDIRECTS = "ERR_FR_TOO_MANY_REDIRECTS";
AxiosError$1.ERR_DEPRECATED = "ERR_DEPRECATED";
AxiosError$1.ERR_BAD_RESPONSE = "ERR_BAD_RESPONSE";
AxiosError$1.ERR_BAD_REQUEST = "ERR_BAD_REQUEST";
AxiosError$1.ERR_CANCELED = "ERR_CANCELED";
AxiosError$1.ERR_NOT_SUPPORT = "ERR_NOT_SUPPORT";
AxiosError$1.ERR_INVALID_URL = "ERR_INVALID_URL";
AxiosError$1.ERR_FORM_DATA_DEPTH_EXCEEDED = "ERR_FORM_DATA_DEPTH_EXCEEDED";
const httpAdapter = null;
function isVisitable(thing) {
  return utils$1.isPlainObject(thing) || utils$1.isArray(thing);
}
function removeBrackets(key) {
  return utils$1.endsWith(key, "[]") ? key.slice(0, -2) : key;
}
function renderKey(path, key, dots) {
  if (!path) return key;
  return path.concat(key).map(function each(token, i) {
    token = removeBrackets(token);
    return !dots && i ? "[" + token + "]" : token;
  }).join(dots ? "." : "");
}
function isFlatArray(arr) {
  return utils$1.isArray(arr) && !arr.some(isVisitable);
}
const predicates = utils$1.toFlatObject(utils$1, {}, null, function filter(prop) {
  return /^is[A-Z]/.test(prop);
});
function toFormData$1(obj, formData, options) {
  if (!utils$1.isObject(obj)) {
    throw new TypeError("target must be an object");
  }
  formData = formData || new FormData();
  options = utils$1.toFlatObject(
    options,
    {
      metaTokens: true,
      dots: false,
      indexes: false
    },
    false,
    function defined(option, source) {
      return !utils$1.isUndefined(source[option]);
    }
  );
  const metaTokens = options.metaTokens;
  const visitor = options.visitor || defaultVisitor;
  const dots = options.dots;
  const indexes = options.indexes;
  const _Blob = options.Blob || typeof Blob !== "undefined" && Blob;
  const maxDepth = options.maxDepth === void 0 ? 100 : options.maxDepth;
  const useBlob = _Blob && utils$1.isSpecCompliantForm(formData);
  if (!utils$1.isFunction(visitor)) {
    throw new TypeError("visitor must be a function");
  }
  function convertValue(value) {
    if (value === null) return "";
    if (utils$1.isDate(value)) {
      return value.toISOString();
    }
    if (utils$1.isBoolean(value)) {
      return value.toString();
    }
    if (!useBlob && utils$1.isBlob(value)) {
      throw new AxiosError$1("Blob is not supported. Use a Buffer instead.");
    }
    if (utils$1.isArrayBuffer(value) || utils$1.isTypedArray(value)) {
      return useBlob && typeof Blob === "function" ? new Blob([value]) : Buffer.from(value);
    }
    return value;
  }
  function defaultVisitor(value, key, path) {
    let arr = value;
    if (utils$1.isReactNative(formData) && utils$1.isReactNativeBlob(value)) {
      formData.append(renderKey(path, key, dots), convertValue(value));
      return false;
    }
    if (value && !path && typeof value === "object") {
      if (utils$1.endsWith(key, "{}")) {
        key = metaTokens ? key : key.slice(0, -2);
        value = JSON.stringify(value);
      } else if (utils$1.isArray(value) && isFlatArray(value) || (utils$1.isFileList(value) || utils$1.endsWith(key, "[]")) && (arr = utils$1.toArray(value))) {
        key = removeBrackets(key);
        arr.forEach(function each(el, index) {
          !(utils$1.isUndefined(el) || el === null) && formData.append(
            // eslint-disable-next-line no-nested-ternary
            indexes === true ? renderKey([key], index, dots) : indexes === null ? key : key + "[]",
            convertValue(el)
          );
        });
        return false;
      }
    }
    if (isVisitable(value)) {
      return true;
    }
    formData.append(renderKey(path, key, dots), convertValue(value));
    return false;
  }
  const stack = [];
  const exposedHelpers = Object.assign(predicates, {
    defaultVisitor,
    convertValue,
    isVisitable
  });
  function build(value, path, depth = 0) {
    if (utils$1.isUndefined(value)) return;
    if (depth > maxDepth) {
      throw new AxiosError$1(
        "Object is too deeply nested (" + depth + " levels). Max depth: " + maxDepth,
        AxiosError$1.ERR_FORM_DATA_DEPTH_EXCEEDED
      );
    }
    if (stack.indexOf(value) !== -1) {
      throw Error("Circular reference detected in " + path.join("."));
    }
    stack.push(value);
    utils$1.forEach(value, function each(el, key) {
      const result = !(utils$1.isUndefined(el) || el === null) && visitor.call(formData, el, utils$1.isString(key) ? key.trim() : key, path, exposedHelpers);
      if (result === true) {
        build(el, path ? path.concat(key) : [key], depth + 1);
      }
    });
    stack.pop();
  }
  if (!utils$1.isObject(obj)) {
    throw new TypeError("data must be an object");
  }
  build(obj);
  return formData;
}
function encode$1(str) {
  const charMap = {
    "!": "%21",
    "'": "%27",
    "(": "%28",
    ")": "%29",
    "~": "%7E",
    "%20": "+"
  };
  return encodeURIComponent(str).replace(/[!'()~]|%20/g, function replacer(match) {
    return charMap[match];
  });
}
function AxiosURLSearchParams(params, options) {
  this._pairs = [];
  params && toFormData$1(params, this, options);
}
const prototype = AxiosURLSearchParams.prototype;
prototype.append = function append(name, value) {
  this._pairs.push([name, value]);
};
prototype.toString = function toString2(encoder) {
  const _encode = encoder ? function(value) {
    return encoder.call(this, value, encode$1);
  } : encode$1;
  return this._pairs.map(function each(pair) {
    return _encode(pair[0]) + "=" + _encode(pair[1]);
  }, "").join("&");
};
function encode(val) {
  return encodeURIComponent(val).replace(/%3A/gi, ":").replace(/%24/g, "$").replace(/%2C/gi, ",").replace(/%20/g, "+");
}
function buildURL(url, params, options) {
  if (!params) {
    return url;
  }
  const _encode = options && options.encode || encode;
  const _options = utils$1.isFunction(options) ? {
    serialize: options
  } : options;
  const serializeFn = _options && _options.serialize;
  let serializedParams;
  if (serializeFn) {
    serializedParams = serializeFn(params, _options);
  } else {
    serializedParams = utils$1.isURLSearchParams(params) ? params.toString() : new AxiosURLSearchParams(params, _options).toString(_encode);
  }
  if (serializedParams) {
    const hashmarkIndex = url.indexOf("#");
    if (hashmarkIndex !== -1) {
      url = url.slice(0, hashmarkIndex);
    }
    url += (url.indexOf("?") === -1 ? "?" : "&") + serializedParams;
  }
  return url;
}
class InterceptorManager {
  constructor() {
    this.handlers = [];
  }
  /**
   * Add a new interceptor to the stack
   *
   * @param {Function} fulfilled The function to handle `then` for a `Promise`
   * @param {Function} rejected The function to handle `reject` for a `Promise`
   * @param {Object} options The options for the interceptor, synchronous and runWhen
   *
   * @return {Number} An ID used to remove interceptor later
   */
  use(fulfilled, rejected, options) {
    this.handlers.push({
      fulfilled,
      rejected,
      synchronous: options ? options.synchronous : false,
      runWhen: options ? options.runWhen : null
    });
    return this.handlers.length - 1;
  }
  /**
   * Remove an interceptor from the stack
   *
   * @param {Number} id The ID that was returned by `use`
   *
   * @returns {void}
   */
  eject(id) {
    if (this.handlers[id]) {
      this.handlers[id] = null;
    }
  }
  /**
   * Clear all interceptors from the stack
   *
   * @returns {void}
   */
  clear() {
    if (this.handlers) {
      this.handlers = [];
    }
  }
  /**
   * Iterate over all the registered interceptors
   *
   * This method is particularly useful for skipping over any
   * interceptors that may have become `null` calling `eject`.
   *
   * @param {Function} fn The function to call for each interceptor
   *
   * @returns {void}
   */
  forEach(fn) {
    utils$1.forEach(this.handlers, function forEachHandler(h) {
      if (h !== null) {
        fn(h);
      }
    });
  }
}
const transitionalDefaults = {
  silentJSONParsing: true,
  forcedJSONParsing: true,
  clarifyTimeoutError: false,
  legacyInterceptorReqResOrdering: true
};
const URLSearchParams$1 = typeof URLSearchParams !== "undefined" ? URLSearchParams : AxiosURLSearchParams;
const FormData$1 = typeof FormData !== "undefined" ? FormData : null;
const Blob$1 = typeof Blob !== "undefined" ? Blob : null;
const platform$1 = {
  isBrowser: true,
  classes: {
    URLSearchParams: URLSearchParams$1,
    FormData: FormData$1,
    Blob: Blob$1
  },
  protocols: ["http", "https", "file", "blob", "url", "data"]
};
const hasBrowserEnv = typeof window !== "undefined" && typeof document !== "undefined";
const _navigator = typeof navigator === "object" && navigator || void 0;
const hasStandardBrowserEnv = hasBrowserEnv && (!_navigator || ["ReactNative", "NativeScript", "NS"].indexOf(_navigator.product) < 0);
const hasStandardBrowserWebWorkerEnv = (() => {
  return typeof WorkerGlobalScope !== "undefined" && // eslint-disable-next-line no-undef
  self instanceof WorkerGlobalScope && typeof self.importScripts === "function";
})();
const origin = hasBrowserEnv && window.location.href || "http://localhost";
const utils = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  hasBrowserEnv,
  hasStandardBrowserEnv,
  hasStandardBrowserWebWorkerEnv,
  navigator: _navigator,
  origin
}, Symbol.toStringTag, { value: "Module" }));
const platform = {
  ...utils,
  ...platform$1
};
function toURLEncodedForm(data, options) {
  return toFormData$1(data, new platform.classes.URLSearchParams(), {
    visitor: function(value, key, path, helpers) {
      if (platform.isNode && utils$1.isBuffer(value)) {
        this.append(key, value.toString("base64"));
        return false;
      }
      return helpers.defaultVisitor.apply(this, arguments);
    },
    ...options
  });
}
function parsePropPath(name) {
  return utils$1.matchAll(/\w+|\[(\w*)]/g, name).map((match) => {
    return match[0] === "[]" ? "" : match[1] || match[0];
  });
}
function arrayToObject(arr) {
  const obj = {};
  const keys = Object.keys(arr);
  let i;
  const len = keys.length;
  let key;
  for (i = 0; i < len; i++) {
    key = keys[i];
    obj[key] = arr[key];
  }
  return obj;
}
function formDataToJSON(formData) {
  function buildPath(path, value, target, index) {
    let name = path[index++];
    if (name === "__proto__") return true;
    const isNumericKey = Number.isFinite(+name);
    const isLast = index >= path.length;
    name = !name && utils$1.isArray(target) ? target.length : name;
    if (isLast) {
      if (utils$1.hasOwnProp(target, name)) {
        target[name] = utils$1.isArray(target[name]) ? target[name].concat(value) : [target[name], value];
      } else {
        target[name] = value;
      }
      return !isNumericKey;
    }
    if (!utils$1.hasOwnProp(target, name) || !utils$1.isObject(target[name])) {
      target[name] = [];
    }
    const result = buildPath(path, value, target[name], index);
    if (result && utils$1.isArray(target[name])) {
      target[name] = arrayToObject(target[name]);
    }
    return !isNumericKey;
  }
  if (utils$1.isFormData(formData) && utils$1.isFunction(formData.entries)) {
    const obj = {};
    utils$1.forEachEntry(formData, (name, value) => {
      buildPath(parsePropPath(name), value, obj, 0);
    });
    return obj;
  }
  return null;
}
const own = (obj, key) => obj != null && utils$1.hasOwnProp(obj, key) ? obj[key] : void 0;
function stringifySafely(rawValue, parser, encoder) {
  if (utils$1.isString(rawValue)) {
    try {
      (parser || JSON.parse)(rawValue);
      return utils$1.trim(rawValue);
    } catch (e) {
      if (e.name !== "SyntaxError") {
        throw e;
      }
    }
  }
  return (encoder || JSON.stringify)(rawValue);
}
const defaults = {
  transitional: transitionalDefaults,
  adapter: ["xhr", "http", "fetch"],
  transformRequest: [
    function transformRequest(data, headers) {
      const contentType = headers.getContentType() || "";
      const hasJSONContentType = contentType.indexOf("application/json") > -1;
      const isObjectPayload = utils$1.isObject(data);
      if (isObjectPayload && utils$1.isHTMLForm(data)) {
        data = new FormData(data);
      }
      const isFormData2 = utils$1.isFormData(data);
      if (isFormData2) {
        return hasJSONContentType ? JSON.stringify(formDataToJSON(data)) : data;
      }
      if (utils$1.isArrayBuffer(data) || utils$1.isBuffer(data) || utils$1.isStream(data) || utils$1.isFile(data) || utils$1.isBlob(data) || utils$1.isReadableStream(data)) {
        return data;
      }
      if (utils$1.isArrayBufferView(data)) {
        return data.buffer;
      }
      if (utils$1.isURLSearchParams(data)) {
        headers.setContentType("application/x-www-form-urlencoded;charset=utf-8", false);
        return data.toString();
      }
      let isFileList2;
      if (isObjectPayload) {
        const formSerializer = own(this, "formSerializer");
        if (contentType.indexOf("application/x-www-form-urlencoded") > -1) {
          return toURLEncodedForm(data, formSerializer).toString();
        }
        if ((isFileList2 = utils$1.isFileList(data)) || contentType.indexOf("multipart/form-data") > -1) {
          const env = own(this, "env");
          const _FormData = env && env.FormData;
          return toFormData$1(
            isFileList2 ? { "files[]": data } : data,
            _FormData && new _FormData(),
            formSerializer
          );
        }
      }
      if (isObjectPayload || hasJSONContentType) {
        headers.setContentType("application/json", false);
        return stringifySafely(data);
      }
      return data;
    }
  ],
  transformResponse: [
    function transformResponse(data) {
      const transitional2 = own(this, "transitional") || defaults.transitional;
      const forcedJSONParsing = transitional2 && transitional2.forcedJSONParsing;
      const responseType = own(this, "responseType");
      const JSONRequested = responseType === "json";
      if (utils$1.isResponse(data) || utils$1.isReadableStream(data)) {
        return data;
      }
      if (data && utils$1.isString(data) && (forcedJSONParsing && !responseType || JSONRequested)) {
        const silentJSONParsing = transitional2 && transitional2.silentJSONParsing;
        const strictJSONParsing = !silentJSONParsing && JSONRequested;
        try {
          return JSON.parse(data, own(this, "parseReviver"));
        } catch (e) {
          if (strictJSONParsing) {
            if (e.name === "SyntaxError") {
              throw AxiosError$1.from(e, AxiosError$1.ERR_BAD_RESPONSE, this, null, own(this, "response"));
            }
            throw e;
          }
        }
      }
      return data;
    }
  ],
  /**
   * A timeout in milliseconds to abort a request. If set to 0 (default) a
   * timeout is not created.
   */
  timeout: 0,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
  maxContentLength: -1,
  maxBodyLength: -1,
  env: {
    FormData: platform.classes.FormData,
    Blob: platform.classes.Blob
  },
  validateStatus: function validateStatus(status) {
    return status >= 200 && status < 300;
  },
  headers: {
    common: {
      Accept: "application/json, text/plain, */*",
      "Content-Type": void 0
    }
  }
};
utils$1.forEach(["delete", "get", "head", "post", "put", "patch", "query"], (method) => {
  defaults.headers[method] = {};
});
function transformData(fns, response) {
  const config = this || defaults;
  const context = response || config;
  const headers = AxiosHeaders$1.from(context.headers);
  let data = context.data;
  utils$1.forEach(fns, function transform(fn) {
    data = fn.call(config, data, headers.normalize(), response ? response.status : void 0);
  });
  headers.normalize();
  return data;
}
function isCancel$1(value) {
  return !!(value && value.__CANCEL__);
}
let CanceledError$1 = class CanceledError extends AxiosError$1 {
  /**
   * A `CanceledError` is an object that is thrown when an operation is canceled.
   *
   * @param {string=} message The message.
   * @param {Object=} config The config.
   * @param {Object=} request The request.
   *
   * @returns {CanceledError} The created error.
   */
  constructor(message, config, request) {
    super(message == null ? "canceled" : message, AxiosError$1.ERR_CANCELED, config, request);
    this.name = "CanceledError";
    this.__CANCEL__ = true;
  }
};
function settle(resolve, reject, response) {
  const validateStatus2 = response.config.validateStatus;
  if (!response.status || !validateStatus2 || validateStatus2(response.status)) {
    resolve(response);
  } else {
    reject(new AxiosError$1(
      "Request failed with status code " + response.status,
      response.status >= 400 && response.status < 500 ? AxiosError$1.ERR_BAD_REQUEST : AxiosError$1.ERR_BAD_RESPONSE,
      response.config,
      response.request,
      response
    ));
  }
}
function parseProtocol(url) {
  const match = /^([-+\w]{1,25}):(?:\/\/)?/.exec(url);
  return match && match[1] || "";
}
function speedometer(samplesCount, min) {
  samplesCount = samplesCount || 10;
  const bytes = new Array(samplesCount);
  const timestamps = new Array(samplesCount);
  let head = 0;
  let tail = 0;
  let firstSampleTS;
  min = min !== void 0 ? min : 1e3;
  return function push(chunkLength) {
    const now = Date.now();
    const startedAt = timestamps[tail];
    if (!firstSampleTS) {
      firstSampleTS = now;
    }
    bytes[head] = chunkLength;
    timestamps[head] = now;
    let i = tail;
    let bytesCount = 0;
    while (i !== head) {
      bytesCount += bytes[i++];
      i = i % samplesCount;
    }
    head = (head + 1) % samplesCount;
    if (head === tail) {
      tail = (tail + 1) % samplesCount;
    }
    if (now - firstSampleTS < min) {
      return;
    }
    const passed = startedAt && now - startedAt;
    return passed ? Math.round(bytesCount * 1e3 / passed) : void 0;
  };
}
function throttle(fn, freq) {
  let timestamp = 0;
  let threshold = 1e3 / freq;
  let lastArgs;
  let timer;
  const invoke = (args, now = Date.now()) => {
    timestamp = now;
    lastArgs = null;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    fn(...args);
  };
  const throttled = (...args) => {
    const now = Date.now();
    const passed = now - timestamp;
    if (passed >= threshold) {
      invoke(args, now);
    } else {
      lastArgs = args;
      if (!timer) {
        timer = setTimeout(() => {
          timer = null;
          invoke(lastArgs);
        }, threshold - passed);
      }
    }
  };
  const flush = () => lastArgs && invoke(lastArgs);
  return [throttled, flush];
}
const progressEventReducer = (listener, isDownloadStream, freq = 3) => {
  let bytesNotified = 0;
  const _speedometer = speedometer(50, 250);
  return throttle((e) => {
    if (!e || typeof e.loaded !== "number") {
      return;
    }
    const rawLoaded = e.loaded;
    const total = e.lengthComputable ? e.total : void 0;
    const loaded = total != null ? Math.min(rawLoaded, total) : rawLoaded;
    const progressBytes = Math.max(0, loaded - bytesNotified);
    const rate = _speedometer(progressBytes);
    bytesNotified = Math.max(bytesNotified, loaded);
    const data = {
      loaded,
      total,
      progress: total ? loaded / total : void 0,
      bytes: progressBytes,
      rate: rate ? rate : void 0,
      estimated: rate && total ? (total - loaded) / rate : void 0,
      event: e,
      lengthComputable: total != null,
      [isDownloadStream ? "download" : "upload"]: true
    };
    listener(data);
  }, freq);
};
const progressEventDecorator = (total, throttled) => {
  const lengthComputable = total != null;
  return [
    (loaded) => throttled[0]({
      lengthComputable,
      total,
      loaded
    }),
    throttled[1]
  ];
};
const asyncDecorator = (fn) => (...args) => utils$1.asap(() => fn(...args));
const isURLSameOrigin = platform.hasStandardBrowserEnv ? /* @__PURE__ */ ((origin2, isMSIE) => (url) => {
  url = new URL(url, platform.origin);
  return origin2.protocol === url.protocol && origin2.host === url.host && (isMSIE || origin2.port === url.port);
})(
  new URL(platform.origin),
  platform.navigator && /(msie|trident)/i.test(platform.navigator.userAgent)
) : () => true;
const cookies = platform.hasStandardBrowserEnv ? (
  // Standard browser envs support document.cookie
  {
    write(name, value, expires, path, domain, secure, sameSite) {
      if (typeof document === "undefined") return;
      const cookie = [`${name}=${encodeURIComponent(value)}`];
      if (utils$1.isNumber(expires)) {
        cookie.push(`expires=${new Date(expires).toUTCString()}`);
      }
      if (utils$1.isString(path)) {
        cookie.push(`path=${path}`);
      }
      if (utils$1.isString(domain)) {
        cookie.push(`domain=${domain}`);
      }
      if (secure === true) {
        cookie.push("secure");
      }
      if (utils$1.isString(sameSite)) {
        cookie.push(`SameSite=${sameSite}`);
      }
      document.cookie = cookie.join("; ");
    },
    read(name) {
      if (typeof document === "undefined") return null;
      const cookies2 = document.cookie.split(";");
      for (let i = 0; i < cookies2.length; i++) {
        const cookie = cookies2[i].replace(/^\s+/, "");
        const eq = cookie.indexOf("=");
        if (eq !== -1 && cookie.slice(0, eq) === name) {
          return decodeURIComponent(cookie.slice(eq + 1));
        }
      }
      return null;
    },
    remove(name) {
      this.write(name, "", Date.now() - 864e5, "/");
    }
  }
) : (
  // Non-standard browser env (web workers, react-native) lack needed support.
  {
    write() {
    },
    read() {
      return null;
    },
    remove() {
    }
  }
);
function isAbsoluteURL(url) {
  if (typeof url !== "string") {
    return false;
  }
  return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url);
}
function combineURLs(baseURL, relativeURL) {
  return relativeURL ? baseURL.replace(/\/?\/$/, "") + "/" + relativeURL.replace(/^\/+/, "") : baseURL;
}
function buildFullPath(baseURL, requestedURL, allowAbsoluteUrls) {
  let isRelativeUrl = !isAbsoluteURL(requestedURL);
  if (baseURL && (isRelativeUrl || allowAbsoluteUrls === false)) {
    return combineURLs(baseURL, requestedURL);
  }
  return requestedURL;
}
const headersToObject = (thing) => thing instanceof AxiosHeaders$1 ? { ...thing } : thing;
function mergeConfig$1(config1, config2) {
  config2 = config2 || {};
  const config = /* @__PURE__ */ Object.create(null);
  Object.defineProperty(config, "hasOwnProperty", {
    // Null-proto descriptor so a polluted Object.prototype.get cannot turn
    // this data descriptor into an accessor descriptor on the way in.
    __proto__: null,
    value: Object.prototype.hasOwnProperty,
    enumerable: false,
    writable: true,
    configurable: true
  });
  function getMergedValue(target, source, prop, caseless) {
    if (utils$1.isPlainObject(target) && utils$1.isPlainObject(source)) {
      return utils$1.merge.call({ caseless }, target, source);
    } else if (utils$1.isPlainObject(source)) {
      return utils$1.merge({}, source);
    } else if (utils$1.isArray(source)) {
      return source.slice();
    }
    return source;
  }
  function mergeDeepProperties(a, b, prop, caseless) {
    if (!utils$1.isUndefined(b)) {
      return getMergedValue(a, b, prop, caseless);
    } else if (!utils$1.isUndefined(a)) {
      return getMergedValue(void 0, a, prop, caseless);
    }
  }
  function valueFromConfig2(a, b) {
    if (!utils$1.isUndefined(b)) {
      return getMergedValue(void 0, b);
    }
  }
  function defaultToConfig2(a, b) {
    if (!utils$1.isUndefined(b)) {
      return getMergedValue(void 0, b);
    } else if (!utils$1.isUndefined(a)) {
      return getMergedValue(void 0, a);
    }
  }
  function mergeDirectKeys(a, b, prop) {
    if (utils$1.hasOwnProp(config2, prop)) {
      return getMergedValue(a, b);
    } else if (utils$1.hasOwnProp(config1, prop)) {
      return getMergedValue(void 0, a);
    }
  }
  const mergeMap = {
    url: valueFromConfig2,
    method: valueFromConfig2,
    data: valueFromConfig2,
    baseURL: defaultToConfig2,
    transformRequest: defaultToConfig2,
    transformResponse: defaultToConfig2,
    paramsSerializer: defaultToConfig2,
    timeout: defaultToConfig2,
    timeoutMessage: defaultToConfig2,
    withCredentials: defaultToConfig2,
    withXSRFToken: defaultToConfig2,
    adapter: defaultToConfig2,
    responseType: defaultToConfig2,
    xsrfCookieName: defaultToConfig2,
    xsrfHeaderName: defaultToConfig2,
    onUploadProgress: defaultToConfig2,
    onDownloadProgress: defaultToConfig2,
    decompress: defaultToConfig2,
    maxContentLength: defaultToConfig2,
    maxBodyLength: defaultToConfig2,
    beforeRedirect: defaultToConfig2,
    transport: defaultToConfig2,
    httpAgent: defaultToConfig2,
    httpsAgent: defaultToConfig2,
    cancelToken: defaultToConfig2,
    socketPath: defaultToConfig2,
    allowedSocketPaths: defaultToConfig2,
    responseEncoding: defaultToConfig2,
    validateStatus: mergeDirectKeys,
    headers: (a, b, prop) => mergeDeepProperties(headersToObject(a), headersToObject(b), prop, true)
  };
  utils$1.forEach(Object.keys({ ...config1, ...config2 }), function computeConfigValue(prop) {
    if (prop === "__proto__" || prop === "constructor" || prop === "prototype") return;
    const merge2 = utils$1.hasOwnProp(mergeMap, prop) ? mergeMap[prop] : mergeDeepProperties;
    const a = utils$1.hasOwnProp(config1, prop) ? config1[prop] : void 0;
    const b = utils$1.hasOwnProp(config2, prop) ? config2[prop] : void 0;
    const configValue = merge2(a, b, prop);
    utils$1.isUndefined(configValue) && merge2 !== mergeDirectKeys || (config[prop] = configValue);
  });
  return config;
}
const FORM_DATA_CONTENT_HEADERS = ["content-type", "content-length"];
function setFormDataHeaders(headers, formHeaders, policy) {
  if (policy !== "content-only") {
    headers.set(formHeaders);
    return;
  }
  Object.entries(formHeaders).forEach(([key, val]) => {
    if (FORM_DATA_CONTENT_HEADERS.includes(key.toLowerCase())) {
      headers.set(key, val);
    }
  });
}
const encodeUTF8 = (str) => encodeURIComponent(str).replace(
  /%([0-9A-F]{2})/gi,
  (_, hex) => String.fromCharCode(parseInt(hex, 16))
);
const resolveConfig = (config) => {
  const newConfig = mergeConfig$1({}, config);
  const own2 = (key) => utils$1.hasOwnProp(newConfig, key) ? newConfig[key] : void 0;
  const data = own2("data");
  let withXSRFToken = own2("withXSRFToken");
  const xsrfHeaderName = own2("xsrfHeaderName");
  const xsrfCookieName = own2("xsrfCookieName");
  let headers = own2("headers");
  const auth = own2("auth");
  const baseURL = own2("baseURL");
  const allowAbsoluteUrls = own2("allowAbsoluteUrls");
  const url = own2("url");
  newConfig.headers = headers = AxiosHeaders$1.from(headers);
  newConfig.url = buildURL(
    buildFullPath(baseURL, url, allowAbsoluteUrls),
    config.params,
    config.paramsSerializer
  );
  if (auth) {
    headers.set(
      "Authorization",
      "Basic " + btoa((auth.username || "") + ":" + (auth.password ? encodeUTF8(auth.password) : ""))
    );
  }
  if (utils$1.isFormData(data)) {
    if (platform.hasStandardBrowserEnv || platform.hasStandardBrowserWebWorkerEnv) {
      headers.setContentType(void 0);
    } else if (utils$1.isFunction(data.getHeaders)) {
      setFormDataHeaders(headers, data.getHeaders(), own2("formDataHeaderPolicy"));
    }
  }
  if (platform.hasStandardBrowserEnv) {
    if (utils$1.isFunction(withXSRFToken)) {
      withXSRFToken = withXSRFToken(newConfig);
    }
    const shouldSendXSRF = withXSRFToken === true || withXSRFToken == null && isURLSameOrigin(newConfig.url);
    if (shouldSendXSRF) {
      const xsrfValue = xsrfHeaderName && xsrfCookieName && cookies.read(xsrfCookieName);
      if (xsrfValue) {
        headers.set(xsrfHeaderName, xsrfValue);
      }
    }
  }
  return newConfig;
};
const isXHRAdapterSupported = typeof XMLHttpRequest !== "undefined";
const xhrAdapter = isXHRAdapterSupported && function(config) {
  return new Promise(function dispatchXhrRequest(resolve, reject) {
    const _config = resolveConfig(config);
    let requestData = _config.data;
    const requestHeaders = AxiosHeaders$1.from(_config.headers).normalize();
    let { responseType, onUploadProgress, onDownloadProgress } = _config;
    let onCanceled;
    let uploadThrottled, downloadThrottled;
    let flushUpload, flushDownload;
    function done() {
      flushUpload && flushUpload();
      flushDownload && flushDownload();
      _config.cancelToken && _config.cancelToken.unsubscribe(onCanceled);
      _config.signal && _config.signal.removeEventListener("abort", onCanceled);
    }
    let request = new XMLHttpRequest();
    request.open(_config.method.toUpperCase(), _config.url, true);
    request.timeout = _config.timeout;
    function onloadend() {
      if (!request) {
        return;
      }
      const responseHeaders = AxiosHeaders$1.from(
        "getAllResponseHeaders" in request && request.getAllResponseHeaders()
      );
      const responseData = !responseType || responseType === "text" || responseType === "json" ? request.responseText : request.response;
      const response = {
        data: responseData,
        status: request.status,
        statusText: request.statusText,
        headers: responseHeaders,
        config,
        request
      };
      settle(
        function _resolve(value) {
          resolve(value);
          done();
        },
        function _reject(err) {
          reject(err);
          done();
        },
        response
      );
      request = null;
    }
    if ("onloadend" in request) {
      request.onloadend = onloadend;
    } else {
      request.onreadystatechange = function handleLoad() {
        if (!request || request.readyState !== 4) {
          return;
        }
        if (request.status === 0 && !(request.responseURL && request.responseURL.startsWith("file:"))) {
          return;
        }
        setTimeout(onloadend);
      };
    }
    request.onabort = function handleAbort() {
      if (!request) {
        return;
      }
      reject(new AxiosError$1("Request aborted", AxiosError$1.ECONNABORTED, config, request));
      done();
      request = null;
    };
    request.onerror = function handleError(event) {
      const msg = event && event.message ? event.message : "Network Error";
      const err = new AxiosError$1(msg, AxiosError$1.ERR_NETWORK, config, request);
      err.event = event || null;
      reject(err);
      done();
      request = null;
    };
    request.ontimeout = function handleTimeout() {
      let timeoutErrorMessage = _config.timeout ? "timeout of " + _config.timeout + "ms exceeded" : "timeout exceeded";
      const transitional2 = _config.transitional || transitionalDefaults;
      if (_config.timeoutErrorMessage) {
        timeoutErrorMessage = _config.timeoutErrorMessage;
      }
      reject(
        new AxiosError$1(
          timeoutErrorMessage,
          transitional2.clarifyTimeoutError ? AxiosError$1.ETIMEDOUT : AxiosError$1.ECONNABORTED,
          config,
          request
        )
      );
      done();
      request = null;
    };
    requestData === void 0 && requestHeaders.setContentType(null);
    if ("setRequestHeader" in request) {
      utils$1.forEach(toByteStringHeaderObject(requestHeaders), function setRequestHeader(val, key) {
        request.setRequestHeader(key, val);
      });
    }
    if (!utils$1.isUndefined(_config.withCredentials)) {
      request.withCredentials = !!_config.withCredentials;
    }
    if (responseType && responseType !== "json") {
      request.responseType = _config.responseType;
    }
    if (onDownloadProgress) {
      [downloadThrottled, flushDownload] = progressEventReducer(onDownloadProgress, true);
      request.addEventListener("progress", downloadThrottled);
    }
    if (onUploadProgress && request.upload) {
      [uploadThrottled, flushUpload] = progressEventReducer(onUploadProgress);
      request.upload.addEventListener("progress", uploadThrottled);
      request.upload.addEventListener("loadend", flushUpload);
    }
    if (_config.cancelToken || _config.signal) {
      onCanceled = (cancel) => {
        if (!request) {
          return;
        }
        reject(!cancel || cancel.type ? new CanceledError$1(null, config, request) : cancel);
        request.abort();
        done();
        request = null;
      };
      _config.cancelToken && _config.cancelToken.subscribe(onCanceled);
      if (_config.signal) {
        _config.signal.aborted ? onCanceled() : _config.signal.addEventListener("abort", onCanceled);
      }
    }
    const protocol = parseProtocol(_config.url);
    if (protocol && !platform.protocols.includes(protocol)) {
      reject(
        new AxiosError$1(
          "Unsupported protocol " + protocol + ":",
          AxiosError$1.ERR_BAD_REQUEST,
          config
        )
      );
      return;
    }
    request.send(requestData || null);
  });
};
const composeSignals = (signals, timeout) => {
  signals = signals ? signals.filter(Boolean) : [];
  if (!timeout && !signals.length) {
    return;
  }
  const controller = new AbortController();
  let aborted = false;
  const onabort = function(reason) {
    if (!aborted) {
      aborted = true;
      unsubscribe();
      const err = reason instanceof Error ? reason : this.reason;
      controller.abort(
        err instanceof AxiosError$1 ? err : new CanceledError$1(err instanceof Error ? err.message : err)
      );
    }
  };
  let timer = timeout && setTimeout(() => {
    timer = null;
    onabort(new AxiosError$1(`timeout of ${timeout}ms exceeded`, AxiosError$1.ETIMEDOUT));
  }, timeout);
  const unsubscribe = () => {
    if (!signals) {
      return;
    }
    timer && clearTimeout(timer);
    timer = null;
    signals.forEach((signal2) => {
      signal2.unsubscribe ? signal2.unsubscribe(onabort) : signal2.removeEventListener("abort", onabort);
    });
    signals = null;
  };
  signals.forEach((signal2) => signal2.addEventListener("abort", onabort));
  const { signal } = controller;
  signal.unsubscribe = () => utils$1.asap(unsubscribe);
  return signal;
};
const streamChunk = function* (chunk, chunkSize) {
  let len = chunk.byteLength;
  if (len < chunkSize) {
    yield chunk;
    return;
  }
  let pos = 0;
  let end;
  while (pos < len) {
    end = pos + chunkSize;
    yield chunk.slice(pos, end);
    pos = end;
  }
};
const readBytes = async function* (iterable, chunkSize) {
  for await (const chunk of readStream(iterable)) {
    yield* streamChunk(chunk, chunkSize);
  }
};
const readStream = async function* (stream) {
  if (stream[Symbol.asyncIterator]) {
    yield* stream;
    return;
  }
  const reader = stream.getReader();
  try {
    for (; ; ) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      yield value;
    }
  } finally {
    await reader.cancel();
  }
};
const trackStream = (stream, chunkSize, onProgress, onFinish) => {
  const iterator2 = readBytes(stream, chunkSize);
  let bytes = 0;
  let done;
  let _onFinish = (e) => {
    if (!done) {
      done = true;
      onFinish && onFinish(e);
    }
  };
  return new ReadableStream(
    {
      async pull(controller) {
        try {
          const { done: done2, value } = await iterator2.next();
          if (done2) {
            _onFinish();
            controller.close();
            return;
          }
          let len = value.byteLength;
          if (onProgress) {
            let loadedBytes = bytes += len;
            onProgress(loadedBytes);
          }
          controller.enqueue(new Uint8Array(value));
        } catch (err) {
          _onFinish(err);
          throw err;
        }
      },
      cancel(reason) {
        _onFinish(reason);
        return iterator2.return();
      }
    },
    {
      highWaterMark: 2
    }
  );
};
function estimateDataURLDecodedBytes(url) {
  if (!url || typeof url !== "string") return 0;
  if (!url.startsWith("data:")) return 0;
  const comma = url.indexOf(",");
  if (comma < 0) return 0;
  const meta = url.slice(5, comma);
  const body = url.slice(comma + 1);
  const isBase64 = /;base64/i.test(meta);
  if (isBase64) {
    let effectiveLen = body.length;
    const len = body.length;
    for (let i = 0; i < len; i++) {
      if (body.charCodeAt(i) === 37 && i + 2 < len) {
        const a = body.charCodeAt(i + 1);
        const b = body.charCodeAt(i + 2);
        const isHex = (a >= 48 && a <= 57 || a >= 65 && a <= 70 || a >= 97 && a <= 102) && (b >= 48 && b <= 57 || b >= 65 && b <= 70 || b >= 97 && b <= 102);
        if (isHex) {
          effectiveLen -= 2;
          i += 2;
        }
      }
    }
    let pad = 0;
    let idx = len - 1;
    const tailIsPct3D = (j) => j >= 2 && body.charCodeAt(j - 2) === 37 && // '%'
    body.charCodeAt(j - 1) === 51 && // '3'
    (body.charCodeAt(j) === 68 || body.charCodeAt(j) === 100);
    if (idx >= 0) {
      if (body.charCodeAt(idx) === 61) {
        pad++;
        idx--;
      } else if (tailIsPct3D(idx)) {
        pad++;
        idx -= 3;
      }
    }
    if (pad === 1 && idx >= 0) {
      if (body.charCodeAt(idx) === 61) {
        pad++;
      } else if (tailIsPct3D(idx)) {
        pad++;
      }
    }
    const groups = Math.floor(effectiveLen / 4);
    const bytes2 = groups * 3 - (pad || 0);
    return bytes2 > 0 ? bytes2 : 0;
  }
  if (typeof Buffer !== "undefined" && typeof Buffer.byteLength === "function") {
    return Buffer.byteLength(body, "utf8");
  }
  let bytes = 0;
  for (let i = 0, len = body.length; i < len; i++) {
    const c = body.charCodeAt(i);
    if (c < 128) {
      bytes += 1;
    } else if (c < 2048) {
      bytes += 2;
    } else if (c >= 55296 && c <= 56319 && i + 1 < len) {
      const next = body.charCodeAt(i + 1);
      if (next >= 56320 && next <= 57343) {
        bytes += 4;
        i++;
      } else {
        bytes += 3;
      }
    } else {
      bytes += 3;
    }
  }
  return bytes;
}
const VERSION$1 = "1.16.1";
const DEFAULT_CHUNK_SIZE = 64 * 1024;
const { isFunction } = utils$1;
const test = (fn, ...args) => {
  try {
    return !!fn(...args);
  } catch (e) {
    return false;
  }
};
const factory = (env) => {
  const globalObject = utils$1.global !== void 0 && utils$1.global !== null ? utils$1.global : globalThis;
  const { ReadableStream: ReadableStream2, TextEncoder } = globalObject;
  env = utils$1.merge.call(
    {
      skipUndefined: true
    },
    {
      Request: globalObject.Request,
      Response: globalObject.Response
    },
    env
  );
  const { fetch: envFetch, Request, Response } = env;
  const isFetchSupported = envFetch ? isFunction(envFetch) : typeof fetch === "function";
  const isRequestSupported = isFunction(Request);
  const isResponseSupported = isFunction(Response);
  if (!isFetchSupported) {
    return false;
  }
  const isReadableStreamSupported = isFetchSupported && isFunction(ReadableStream2);
  const encodeText = isFetchSupported && (typeof TextEncoder === "function" ? /* @__PURE__ */ ((encoder) => (str) => encoder.encode(str))(new TextEncoder()) : async (str) => new Uint8Array(await new Request(str).arrayBuffer()));
  const supportsRequestStream = isRequestSupported && isReadableStreamSupported && test(() => {
    let duplexAccessed = false;
    const request = new Request(platform.origin, {
      body: new ReadableStream2(),
      method: "POST",
      get duplex() {
        duplexAccessed = true;
        return "half";
      }
    });
    const hasContentType = request.headers.has("Content-Type");
    if (request.body != null) {
      request.body.cancel();
    }
    return duplexAccessed && !hasContentType;
  });
  const supportsResponseStream = isResponseSupported && isReadableStreamSupported && test(() => utils$1.isReadableStream(new Response("").body));
  const resolvers = {
    stream: supportsResponseStream && ((res) => res.body)
  };
  isFetchSupported && (() => {
    ["text", "arrayBuffer", "blob", "formData", "stream"].forEach((type) => {
      !resolvers[type] && (resolvers[type] = (res, config) => {
        let method = res && res[type];
        if (method) {
          return method.call(res);
        }
        throw new AxiosError$1(
          `Response type '${type}' is not supported`,
          AxiosError$1.ERR_NOT_SUPPORT,
          config
        );
      });
    });
  })();
  const getBodyLength = async (body) => {
    if (body == null) {
      return 0;
    }
    if (utils$1.isBlob(body)) {
      return body.size;
    }
    if (utils$1.isSpecCompliantForm(body)) {
      const _request = new Request(platform.origin, {
        method: "POST",
        body
      });
      return (await _request.arrayBuffer()).byteLength;
    }
    if (utils$1.isArrayBufferView(body) || utils$1.isArrayBuffer(body)) {
      return body.byteLength;
    }
    if (utils$1.isURLSearchParams(body)) {
      body = body + "";
    }
    if (utils$1.isString(body)) {
      return (await encodeText(body)).byteLength;
    }
  };
  const resolveBodyLength = async (headers, body) => {
    const length = utils$1.toFiniteNumber(headers.getContentLength());
    return length == null ? getBodyLength(body) : length;
  };
  return async (config) => {
    let {
      url,
      method,
      data,
      signal,
      cancelToken,
      timeout,
      onDownloadProgress,
      onUploadProgress,
      responseType,
      headers,
      withCredentials = "same-origin",
      fetchOptions,
      maxContentLength,
      maxBodyLength
    } = resolveConfig(config);
    const hasMaxContentLength = utils$1.isNumber(maxContentLength) && maxContentLength > -1;
    const hasMaxBodyLength = utils$1.isNumber(maxBodyLength) && maxBodyLength > -1;
    let _fetch = envFetch || fetch;
    responseType = responseType ? (responseType + "").toLowerCase() : "text";
    let composedSignal = composeSignals(
      [signal, cancelToken && cancelToken.toAbortSignal()],
      timeout
    );
    let request = null;
    const unsubscribe = composedSignal && composedSignal.unsubscribe && (() => {
      composedSignal.unsubscribe();
    });
    let requestContentLength;
    try {
      if (hasMaxContentLength && typeof url === "string" && url.startsWith("data:")) {
        const estimated = estimateDataURLDecodedBytes(url);
        if (estimated > maxContentLength) {
          throw new AxiosError$1(
            "maxContentLength size of " + maxContentLength + " exceeded",
            AxiosError$1.ERR_BAD_RESPONSE,
            config,
            request
          );
        }
      }
      if (hasMaxBodyLength && method !== "get" && method !== "head") {
        const outboundLength = await resolveBodyLength(headers, data);
        if (typeof outboundLength === "number" && isFinite(outboundLength) && outboundLength > maxBodyLength) {
          throw new AxiosError$1(
            "Request body larger than maxBodyLength limit",
            AxiosError$1.ERR_BAD_REQUEST,
            config,
            request
          );
        }
      }
      if (onUploadProgress && supportsRequestStream && method !== "get" && method !== "head" && (requestContentLength = await resolveBodyLength(headers, data)) !== 0) {
        let _request = new Request(url, {
          method: "POST",
          body: data,
          duplex: "half"
        });
        let contentTypeHeader;
        if (utils$1.isFormData(data) && (contentTypeHeader = _request.headers.get("content-type"))) {
          headers.setContentType(contentTypeHeader);
        }
        if (_request.body) {
          const [onProgress, flush] = progressEventDecorator(
            requestContentLength,
            progressEventReducer(asyncDecorator(onUploadProgress))
          );
          data = trackStream(_request.body, DEFAULT_CHUNK_SIZE, onProgress, flush);
        }
      }
      if (!utils$1.isString(withCredentials)) {
        withCredentials = withCredentials ? "include" : "omit";
      }
      const isCredentialsSupported = isRequestSupported && "credentials" in Request.prototype;
      if (utils$1.isFormData(data)) {
        const contentType = headers.getContentType();
        if (contentType && /^multipart\/form-data/i.test(contentType) && !/boundary=/i.test(contentType)) {
          headers.delete("content-type");
        }
      }
      headers.set("User-Agent", "axios/" + VERSION$1, false);
      const resolvedOptions = {
        ...fetchOptions,
        signal: composedSignal,
        method: method.toUpperCase(),
        headers: toByteStringHeaderObject(headers.normalize()),
        body: data,
        duplex: "half",
        credentials: isCredentialsSupported ? withCredentials : void 0
      };
      request = isRequestSupported && new Request(url, resolvedOptions);
      let response = await (isRequestSupported ? _fetch(request, fetchOptions) : _fetch(url, resolvedOptions));
      if (hasMaxContentLength) {
        const declaredLength = utils$1.toFiniteNumber(response.headers.get("content-length"));
        if (declaredLength != null && declaredLength > maxContentLength) {
          throw new AxiosError$1(
            "maxContentLength size of " + maxContentLength + " exceeded",
            AxiosError$1.ERR_BAD_RESPONSE,
            config,
            request
          );
        }
      }
      const isStreamResponse = supportsResponseStream && (responseType === "stream" || responseType === "response");
      if (supportsResponseStream && response.body && (onDownloadProgress || hasMaxContentLength || isStreamResponse && unsubscribe)) {
        const options = {};
        ["status", "statusText", "headers"].forEach((prop) => {
          options[prop] = response[prop];
        });
        const responseContentLength = utils$1.toFiniteNumber(response.headers.get("content-length"));
        const [onProgress, flush] = onDownloadProgress && progressEventDecorator(
          responseContentLength,
          progressEventReducer(asyncDecorator(onDownloadProgress), true)
        ) || [];
        let bytesRead = 0;
        const onChunkProgress = (loadedBytes) => {
          if (hasMaxContentLength) {
            bytesRead = loadedBytes;
            if (bytesRead > maxContentLength) {
              throw new AxiosError$1(
                "maxContentLength size of " + maxContentLength + " exceeded",
                AxiosError$1.ERR_BAD_RESPONSE,
                config,
                request
              );
            }
          }
          onProgress && onProgress(loadedBytes);
        };
        response = new Response(
          trackStream(response.body, DEFAULT_CHUNK_SIZE, onChunkProgress, () => {
            flush && flush();
            unsubscribe && unsubscribe();
          }),
          options
        );
      }
      responseType = responseType || "text";
      let responseData = await resolvers[utils$1.findKey(resolvers, responseType) || "text"](
        response,
        config
      );
      if (hasMaxContentLength && !supportsResponseStream && !isStreamResponse) {
        let materializedSize;
        if (responseData != null) {
          if (typeof responseData.byteLength === "number") {
            materializedSize = responseData.byteLength;
          } else if (typeof responseData.size === "number") {
            materializedSize = responseData.size;
          } else if (typeof responseData === "string") {
            materializedSize = typeof TextEncoder === "function" ? new TextEncoder().encode(responseData).byteLength : responseData.length;
          }
        }
        if (typeof materializedSize === "number" && materializedSize > maxContentLength) {
          throw new AxiosError$1(
            "maxContentLength size of " + maxContentLength + " exceeded",
            AxiosError$1.ERR_BAD_RESPONSE,
            config,
            request
          );
        }
      }
      !isStreamResponse && unsubscribe && unsubscribe();
      return await new Promise((resolve, reject) => {
        settle(resolve, reject, {
          data: responseData,
          headers: AxiosHeaders$1.from(response.headers),
          status: response.status,
          statusText: response.statusText,
          config,
          request
        });
      });
    } catch (err) {
      unsubscribe && unsubscribe();
      if (composedSignal && composedSignal.aborted && composedSignal.reason instanceof AxiosError$1) {
        const canceledError = composedSignal.reason;
        canceledError.config = config;
        request && (canceledError.request = request);
        err !== canceledError && (canceledError.cause = err);
        throw canceledError;
      }
      if (err && err.name === "TypeError" && /Load failed|fetch/i.test(err.message)) {
        throw Object.assign(
          new AxiosError$1(
            "Network Error",
            AxiosError$1.ERR_NETWORK,
            config,
            request,
            err && err.response
          ),
          {
            cause: err.cause || err
          }
        );
      }
      throw AxiosError$1.from(err, err && err.code, config, request, err && err.response);
    }
  };
};
const seedCache = /* @__PURE__ */ new Map();
const getFetch = (config) => {
  let env = config && config.env || {};
  const { fetch: fetch2, Request, Response } = env;
  const seeds = [Request, Response, fetch2];
  let len = seeds.length, i = len, seed, target, map = seedCache;
  while (i--) {
    seed = seeds[i];
    target = map.get(seed);
    target === void 0 && map.set(seed, target = i ? /* @__PURE__ */ new Map() : factory(env));
    map = target;
  }
  return target;
};
getFetch();
const knownAdapters = {
  http: httpAdapter,
  xhr: xhrAdapter,
  fetch: {
    get: getFetch
  }
};
utils$1.forEach(knownAdapters, (fn, value) => {
  if (fn) {
    try {
      Object.defineProperty(fn, "name", { __proto__: null, value });
    } catch (e) {
    }
    Object.defineProperty(fn, "adapterName", { __proto__: null, value });
  }
});
const renderReason = (reason) => `- ${reason}`;
const isResolvedHandle = (adapter) => utils$1.isFunction(adapter) || adapter === null || adapter === false;
function getAdapter$1(adapters2, config) {
  adapters2 = utils$1.isArray(adapters2) ? adapters2 : [adapters2];
  const { length } = adapters2;
  let nameOrAdapter;
  let adapter;
  const rejectedReasons = {};
  for (let i = 0; i < length; i++) {
    nameOrAdapter = adapters2[i];
    let id;
    adapter = nameOrAdapter;
    if (!isResolvedHandle(nameOrAdapter)) {
      adapter = knownAdapters[(id = String(nameOrAdapter)).toLowerCase()];
      if (adapter === void 0) {
        throw new AxiosError$1(`Unknown adapter '${id}'`);
      }
    }
    if (adapter && (utils$1.isFunction(adapter) || (adapter = adapter.get(config)))) {
      break;
    }
    rejectedReasons[id || "#" + i] = adapter;
  }
  if (!adapter) {
    const reasons = Object.entries(rejectedReasons).map(
      ([id, state]) => `adapter ${id} ` + (state === false ? "is not supported by the environment" : "is not available in the build")
    );
    let s = length ? reasons.length > 1 ? "since :\n" + reasons.map(renderReason).join("\n") : " " + renderReason(reasons[0]) : "as no adapter specified";
    throw new AxiosError$1(
      `There is no suitable adapter to dispatch the request ` + s,
      "ERR_NOT_SUPPORT"
    );
  }
  return adapter;
}
const adapters = {
  /**
   * Resolve an adapter from a list of adapter names or functions.
   * @type {Function}
   */
  getAdapter: getAdapter$1,
  /**
   * Exposes all known adapters
   * @type {Object<string, Function|Object>}
   */
  adapters: knownAdapters
};
function throwIfCancellationRequested(config) {
  if (config.cancelToken) {
    config.cancelToken.throwIfRequested();
  }
  if (config.signal && config.signal.aborted) {
    throw new CanceledError$1(null, config);
  }
}
function dispatchRequest(config) {
  throwIfCancellationRequested(config);
  config.headers = AxiosHeaders$1.from(config.headers);
  config.data = transformData.call(config, config.transformRequest);
  if (["post", "put", "patch"].indexOf(config.method) !== -1) {
    config.headers.setContentType("application/x-www-form-urlencoded", false);
  }
  const adapter = adapters.getAdapter(config.adapter || defaults.adapter, config);
  return adapter(config).then(
    function onAdapterResolution(response) {
      throwIfCancellationRequested(config);
      config.response = response;
      try {
        response.data = transformData.call(config, config.transformResponse, response);
      } finally {
        delete config.response;
      }
      response.headers = AxiosHeaders$1.from(response.headers);
      return response;
    },
    function onAdapterRejection(reason) {
      if (!isCancel$1(reason)) {
        throwIfCancellationRequested(config);
        if (reason && reason.response) {
          config.response = reason.response;
          try {
            reason.response.data = transformData.call(
              config,
              config.transformResponse,
              reason.response
            );
          } finally {
            delete config.response;
          }
          reason.response.headers = AxiosHeaders$1.from(reason.response.headers);
        }
      }
      return Promise.reject(reason);
    }
  );
}
const validators$1 = {};
["object", "boolean", "number", "function", "string", "symbol"].forEach((type, i) => {
  validators$1[type] = function validator2(thing) {
    return typeof thing === type || "a" + (i < 1 ? "n " : " ") + type;
  };
});
const deprecatedWarnings = {};
validators$1.transitional = function transitional(validator2, version, message) {
  function formatMessage(opt, desc) {
    return "[Axios v" + VERSION$1 + "] Transitional option '" + opt + "'" + desc + (message ? ". " + message : "");
  }
  return (value, opt, opts) => {
    if (validator2 === false) {
      throw new AxiosError$1(
        formatMessage(opt, " has been removed" + (version ? " in " + version : "")),
        AxiosError$1.ERR_DEPRECATED
      );
    }
    if (version && !deprecatedWarnings[opt]) {
      deprecatedWarnings[opt] = true;
      console.warn(
        formatMessage(
          opt,
          " has been deprecated since v" + version + " and will be removed in the near future"
        )
      );
    }
    return validator2 ? validator2(value, opt, opts) : true;
  };
};
validators$1.spelling = function spelling(correctSpelling) {
  return (value, opt) => {
    console.warn(`${opt} is likely a misspelling of ${correctSpelling}`);
    return true;
  };
};
function assertOptions(options, schema, allowUnknown) {
  if (typeof options !== "object") {
    throw new AxiosError$1("options must be an object", AxiosError$1.ERR_BAD_OPTION_VALUE);
  }
  const keys = Object.keys(options);
  let i = keys.length;
  while (i-- > 0) {
    const opt = keys[i];
    const validator2 = Object.prototype.hasOwnProperty.call(schema, opt) ? schema[opt] : void 0;
    if (validator2) {
      const value = options[opt];
      const result = value === void 0 || validator2(value, opt, options);
      if (result !== true) {
        throw new AxiosError$1(
          "option " + opt + " must be " + result,
          AxiosError$1.ERR_BAD_OPTION_VALUE
        );
      }
      continue;
    }
    if (allowUnknown !== true) {
      throw new AxiosError$1("Unknown option " + opt, AxiosError$1.ERR_BAD_OPTION);
    }
  }
}
const validator = {
  assertOptions,
  validators: validators$1
};
const validators = validator.validators;
let Axios$1 = class Axios {
  constructor(instanceConfig) {
    this.defaults = instanceConfig || {};
    this.interceptors = {
      request: new InterceptorManager(),
      response: new InterceptorManager()
    };
  }
  /**
   * Dispatch a request
   *
   * @param {String|Object} configOrUrl The config specific for this request (merged with this.defaults)
   * @param {?Object} config
   *
   * @returns {Promise} The Promise to be fulfilled
   */
  async request(configOrUrl, config) {
    try {
      return await this._request(configOrUrl, config);
    } catch (err) {
      if (err instanceof Error) {
        let dummy = {};
        Error.captureStackTrace ? Error.captureStackTrace(dummy) : dummy = new Error();
        const stack = (() => {
          if (!dummy.stack) {
            return "";
          }
          const firstNewlineIndex = dummy.stack.indexOf("\n");
          return firstNewlineIndex === -1 ? "" : dummy.stack.slice(firstNewlineIndex + 1);
        })();
        try {
          if (!err.stack) {
            err.stack = stack;
          } else if (stack) {
            const firstNewlineIndex = stack.indexOf("\n");
            const secondNewlineIndex = firstNewlineIndex === -1 ? -1 : stack.indexOf("\n", firstNewlineIndex + 1);
            const stackWithoutTwoTopLines = secondNewlineIndex === -1 ? "" : stack.slice(secondNewlineIndex + 1);
            if (!String(err.stack).endsWith(stackWithoutTwoTopLines)) {
              err.stack += "\n" + stack;
            }
          }
        } catch (e) {
        }
      }
      throw err;
    }
  }
  _request(configOrUrl, config) {
    if (typeof configOrUrl === "string") {
      config = config || {};
      config.url = configOrUrl;
    } else {
      config = configOrUrl || {};
    }
    config = mergeConfig$1(this.defaults, config);
    const { transitional: transitional2, paramsSerializer, headers } = config;
    if (transitional2 !== void 0) {
      validator.assertOptions(
        transitional2,
        {
          silentJSONParsing: validators.transitional(validators.boolean),
          forcedJSONParsing: validators.transitional(validators.boolean),
          clarifyTimeoutError: validators.transitional(validators.boolean),
          legacyInterceptorReqResOrdering: validators.transitional(validators.boolean)
        },
        false
      );
    }
    if (paramsSerializer != null) {
      if (utils$1.isFunction(paramsSerializer)) {
        config.paramsSerializer = {
          serialize: paramsSerializer
        };
      } else {
        validator.assertOptions(
          paramsSerializer,
          {
            encode: validators.function,
            serialize: validators.function
          },
          true
        );
      }
    }
    if (config.allowAbsoluteUrls !== void 0) ;
    else if (this.defaults.allowAbsoluteUrls !== void 0) {
      config.allowAbsoluteUrls = this.defaults.allowAbsoluteUrls;
    } else {
      config.allowAbsoluteUrls = true;
    }
    validator.assertOptions(
      config,
      {
        baseUrl: validators.spelling("baseURL"),
        withXsrfToken: validators.spelling("withXSRFToken")
      },
      true
    );
    config.method = (config.method || this.defaults.method || "get").toLowerCase();
    let contextHeaders = headers && utils$1.merge(headers.common, headers[config.method]);
    headers && utils$1.forEach(["delete", "get", "head", "post", "put", "patch", "query", "common"], (method) => {
      delete headers[method];
    });
    config.headers = AxiosHeaders$1.concat(contextHeaders, headers);
    const requestInterceptorChain = [];
    let synchronousRequestInterceptors = true;
    this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
      if (typeof interceptor.runWhen === "function" && interceptor.runWhen(config) === false) {
        return;
      }
      synchronousRequestInterceptors = synchronousRequestInterceptors && interceptor.synchronous;
      const transitional3 = config.transitional || transitionalDefaults;
      const legacyInterceptorReqResOrdering = transitional3 && transitional3.legacyInterceptorReqResOrdering;
      if (legacyInterceptorReqResOrdering) {
        requestInterceptorChain.unshift(interceptor.fulfilled, interceptor.rejected);
      } else {
        requestInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
      }
    });
    const responseInterceptorChain = [];
    this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
      responseInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
    });
    let promise;
    let i = 0;
    let len;
    if (!synchronousRequestInterceptors) {
      const chain = [dispatchRequest.bind(this), void 0];
      chain.unshift(...requestInterceptorChain);
      chain.push(...responseInterceptorChain);
      len = chain.length;
      promise = Promise.resolve(config);
      while (i < len) {
        promise = promise.then(chain[i++], chain[i++]);
      }
      return promise;
    }
    len = requestInterceptorChain.length;
    let newConfig = config;
    while (i < len) {
      const onFulfilled = requestInterceptorChain[i++];
      const onRejected = requestInterceptorChain[i++];
      try {
        newConfig = onFulfilled(newConfig);
      } catch (error) {
        onRejected.call(this, error);
        break;
      }
    }
    try {
      promise = dispatchRequest.call(this, newConfig);
    } catch (error) {
      return Promise.reject(error);
    }
    i = 0;
    len = responseInterceptorChain.length;
    while (i < len) {
      promise = promise.then(responseInterceptorChain[i++], responseInterceptorChain[i++]);
    }
    return promise;
  }
  getUri(config) {
    config = mergeConfig$1(this.defaults, config);
    const fullPath = buildFullPath(config.baseURL, config.url, config.allowAbsoluteUrls);
    return buildURL(fullPath, config.params, config.paramsSerializer);
  }
};
utils$1.forEach(["delete", "get", "head", "options"], function forEachMethodNoData(method) {
  Axios$1.prototype[method] = function(url, config) {
    return this.request(
      mergeConfig$1(config || {}, {
        method,
        url,
        data: (config || {}).data
      })
    );
  };
});
utils$1.forEach(["post", "put", "patch", "query"], function forEachMethodWithData(method) {
  function generateHTTPMethod(isForm) {
    return function httpMethod(url, data, config) {
      return this.request(
        mergeConfig$1(config || {}, {
          method,
          headers: isForm ? {
            "Content-Type": "multipart/form-data"
          } : {},
          url,
          data
        })
      );
    };
  }
  Axios$1.prototype[method] = generateHTTPMethod();
  if (method !== "query") {
    Axios$1.prototype[method + "Form"] = generateHTTPMethod(true);
  }
});
let CancelToken$1 = class CancelToken {
  constructor(executor) {
    if (typeof executor !== "function") {
      throw new TypeError("executor must be a function.");
    }
    let resolvePromise;
    this.promise = new Promise(function promiseExecutor(resolve) {
      resolvePromise = resolve;
    });
    const token = this;
    this.promise.then((cancel) => {
      if (!token._listeners) return;
      let i = token._listeners.length;
      while (i-- > 0) {
        token._listeners[i](cancel);
      }
      token._listeners = null;
    });
    this.promise.then = (onfulfilled) => {
      let _resolve;
      const promise = new Promise((resolve) => {
        token.subscribe(resolve);
        _resolve = resolve;
      }).then(onfulfilled);
      promise.cancel = function reject() {
        token.unsubscribe(_resolve);
      };
      return promise;
    };
    executor(function cancel(message, config, request) {
      if (token.reason) {
        return;
      }
      token.reason = new CanceledError$1(message, config, request);
      resolvePromise(token.reason);
    });
  }
  /**
   * Throws a `CanceledError` if cancellation has been requested.
   */
  throwIfRequested() {
    if (this.reason) {
      throw this.reason;
    }
  }
  /**
   * Subscribe to the cancel signal
   */
  subscribe(listener) {
    if (this.reason) {
      listener(this.reason);
      return;
    }
    if (this._listeners) {
      this._listeners.push(listener);
    } else {
      this._listeners = [listener];
    }
  }
  /**
   * Unsubscribe from the cancel signal
   */
  unsubscribe(listener) {
    if (!this._listeners) {
      return;
    }
    const index = this._listeners.indexOf(listener);
    if (index !== -1) {
      this._listeners.splice(index, 1);
    }
  }
  toAbortSignal() {
    const controller = new AbortController();
    const abort = (err) => {
      controller.abort(err);
    };
    this.subscribe(abort);
    controller.signal.unsubscribe = () => this.unsubscribe(abort);
    return controller.signal;
  }
  /**
   * Returns an object that contains a new `CancelToken` and a function that, when called,
   * cancels the `CancelToken`.
   */
  static source() {
    let cancel;
    const token = new CancelToken(function executor(c) {
      cancel = c;
    });
    return {
      token,
      cancel
    };
  }
};
function spread$1(callback) {
  return function wrap(arr) {
    return callback.apply(null, arr);
  };
}
function isAxiosError$1(payload) {
  return utils$1.isObject(payload) && payload.isAxiosError === true;
}
const HttpStatusCode$1 = {
  Continue: 100,
  SwitchingProtocols: 101,
  Processing: 102,
  EarlyHints: 103,
  Ok: 200,
  Created: 201,
  Accepted: 202,
  NonAuthoritativeInformation: 203,
  NoContent: 204,
  ResetContent: 205,
  PartialContent: 206,
  MultiStatus: 207,
  AlreadyReported: 208,
  ImUsed: 226,
  MultipleChoices: 300,
  MovedPermanently: 301,
  Found: 302,
  SeeOther: 303,
  NotModified: 304,
  UseProxy: 305,
  Unused: 306,
  TemporaryRedirect: 307,
  PermanentRedirect: 308,
  BadRequest: 400,
  Unauthorized: 401,
  PaymentRequired: 402,
  Forbidden: 403,
  NotFound: 404,
  MethodNotAllowed: 405,
  NotAcceptable: 406,
  ProxyAuthenticationRequired: 407,
  RequestTimeout: 408,
  Conflict: 409,
  Gone: 410,
  LengthRequired: 411,
  PreconditionFailed: 412,
  PayloadTooLarge: 413,
  UriTooLong: 414,
  UnsupportedMediaType: 415,
  RangeNotSatisfiable: 416,
  ExpectationFailed: 417,
  ImATeapot: 418,
  MisdirectedRequest: 421,
  UnprocessableEntity: 422,
  Locked: 423,
  FailedDependency: 424,
  TooEarly: 425,
  UpgradeRequired: 426,
  PreconditionRequired: 428,
  TooManyRequests: 429,
  RequestHeaderFieldsTooLarge: 431,
  UnavailableForLegalReasons: 451,
  InternalServerError: 500,
  NotImplemented: 501,
  BadGateway: 502,
  ServiceUnavailable: 503,
  GatewayTimeout: 504,
  HttpVersionNotSupported: 505,
  VariantAlsoNegotiates: 506,
  InsufficientStorage: 507,
  LoopDetected: 508,
  NotExtended: 510,
  NetworkAuthenticationRequired: 511,
  WebServerIsDown: 521,
  ConnectionTimedOut: 522,
  OriginIsUnreachable: 523,
  TimeoutOccurred: 524,
  SslHandshakeFailed: 525,
  InvalidSslCertificate: 526
};
Object.entries(HttpStatusCode$1).forEach(([key, value]) => {
  HttpStatusCode$1[value] = key;
});
function createInstance(defaultConfig) {
  const context = new Axios$1(defaultConfig);
  const instance = bind(Axios$1.prototype.request, context);
  utils$1.extend(instance, Axios$1.prototype, context, { allOwnKeys: true });
  utils$1.extend(instance, context, null, { allOwnKeys: true });
  instance.create = function create2(instanceConfig) {
    return createInstance(mergeConfig$1(defaultConfig, instanceConfig));
  };
  return instance;
}
const axios = createInstance(defaults);
axios.Axios = Axios$1;
axios.CanceledError = CanceledError$1;
axios.CancelToken = CancelToken$1;
axios.isCancel = isCancel$1;
axios.VERSION = VERSION$1;
axios.toFormData = toFormData$1;
axios.AxiosError = AxiosError$1;
axios.Cancel = axios.CanceledError;
axios.all = function all(promises) {
  return Promise.all(promises);
};
axios.spread = spread$1;
axios.isAxiosError = isAxiosError$1;
axios.mergeConfig = mergeConfig$1;
axios.AxiosHeaders = AxiosHeaders$1;
axios.formToJSON = (thing) => formDataToJSON(utils$1.isHTMLForm(thing) ? new FormData(thing) : thing);
axios.getAdapter = adapters.getAdapter;
axios.HttpStatusCode = HttpStatusCode$1;
axios.default = axios;
const {
  Axios: Axios2,
  AxiosError: AxiosError2,
  CanceledError: CanceledError2,
  isCancel,
  CancelToken: CancelToken2,
  VERSION,
  all: all2,
  Cancel,
  isAxiosError,
  spread,
  toFormData,
  AxiosHeaders: AxiosHeaders2,
  HttpStatusCode,
  formToJSON,
  getAdapter,
  mergeConfig,
  create
} = axios;
class HttpClient {
  constructor(config) {
    this.config = config;
    this.axiosInstance = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 1e4 * 6,
      headers: {
        "Content-Type": "application/json",
        ...config.headers
      }
    });
    this.axiosInstance.interceptors.request.use(
      (config2) => {
        const token = this.config.getToken?.() || this.config.token;
        if (token) {
          config2.headers.Authorization = `Bearer ${token}`;
        }
        return config2;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
    this.axiosInstance.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        if (error.response) {
          const errorResponse = {
            error: error.response.data?.error || "HTTP_ERROR",
            message: error.response.data?.message || error.message,
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            stack: error.response.data?.stack,
            status: error.response.status
          };
          return Promise.reject(errorResponse);
        } else if (error.request) {
          const errorResponse = {
            error: "NETWORK_ERROR",
            message: "Network error or server is not responding",
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          };
          return Promise.reject(errorResponse);
        } else {
          const errorResponse = {
            error: "REQUEST_ERROR",
            message: error.message,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          };
          return Promise.reject(errorResponse);
        }
      }
    );
  }
  /**
   * 设置认证令牌
   */
  setToken(token) {
    this.config.token = token;
  }
  /**
   * 清除认证令牌
   */
  clearToken() {
    this.config.token = void 0;
  }
  /**
   * GET 请求
   */
  async get(url, config) {
    const response = await this.axiosInstance.get(url, config);
    return this.extractData(response);
  }
  /**
   * POST 请求
   */
  async post(url, data, config) {
    const response = await this.axiosInstance.post(url, data, config);
    return this.extractData(response);
  }
  /**
   * PUT 请求
   */
  async put(url, data, config) {
    const response = await this.axiosInstance.put(url, data, config);
    return this.extractData(response);
  }
  /**
   * PATCH 请求
   */
  async patch(url, data, config) {
    const response = await this.axiosInstance.patch(url, data, config);
    return this.extractData(response);
  }
  /**
   * DELETE 请求
   */
  async delete(url, config) {
    const response = await this.axiosInstance.delete(url, config);
    return this.extractData(response);
  }
  /**
   * 上传文件
   */
  async upload(url, formData, config) {
    const response = await this.axiosInstance.post(url, formData, {
      ...config,
      headers: {
        "Content-Type": "multipart/form-data",
        ...config?.headers
      }
    });
    return response.data;
  }
  /**
   * 下载文件
   */
  async download(url, config) {
    const response = await this.axiosInstance.get(url, {
      ...config,
      responseType: "blob"
    });
    return response.data;
  }
  /** 构造可供 img/iframe 等元素直接访问的鉴权 URL。 */
  getUrl(url) {
    const resolved = new URL(url, this.config.baseURL.endsWith("/") ? this.config.baseURL : `${this.config.baseURL}/`);
    const token = this.config.getToken?.() || this.config.token;
    if (token) resolved.searchParams.set("token", token);
    return resolved.toString();
  }
  /**
   * 提取响应数据
   * 支持不同的响应格式
   */
  extractData(response) {
    const data = response.data;
    if (typeof data === "object" && data !== null && "data" in data) {
      return data.data;
    }
    return data;
  }
  /**
   * 获取原始 axios 实例
   */
  getAxiosInstance() {
    return this.axiosInstance;
  }
}
let WS;
let isBrowser = typeof window !== "undefined" && typeof window.WebSocket !== "undefined";
if (isBrowser) {
  WS = window.WebSocket;
} else {
  try {
    WS = require("ws");
  } catch {
    WS = class {
      constructor() {
        throw new Error("ws module not available");
      }
    };
  }
}
const WS_OPEN = 1;
class SimpleEmitter {
  constructor() {
    this._listeners = /* @__PURE__ */ new Map();
  }
  on(event, fn) {
    if (!this._listeners.has(event)) this._listeners.set(event, []);
    this._listeners.get(event).push(fn);
    return this;
  }
  off(event, fn) {
    const list = this._listeners.get(event);
    if (list) {
      const idx = list.indexOf(fn);
      if (idx !== -1) list.splice(idx, 1);
    }
    return this;
  }
  emit(event, ...args) {
    const list = this._listeners.get(event);
    if (!list || list.length === 0) return false;
    for (const fn of list.slice()) fn(...args);
    return true;
  }
  removeAllListeners(event) {
    if (event) this._listeners.delete(event);
    else this._listeners.clear();
    return this;
  }
}
class WebSocketClient extends SimpleEmitter {
  constructor(port, options = {}) {
    super();
    this._isConnected = false;
    this.reconnectCount = 0;
    this.eventCallbacks = /* @__PURE__ */ new Map();
    this.options = {
      reconnect: true,
      reconnectInterval: 5e3,
      maxReconnectAttempts: 10,
      ...options
    };
    const params = new URLSearchParams();
    if (this.options.clientId) params.append("clientId", this.options.clientId);
    if (this.options.libraryId) params.append("libraryId", this.options.libraryId);
    if (this.options.token) params.append("token", this.options.token);
    if (this.options.url) {
      const base = this.options.url.replace(/\/+$/, "").replace(/\?.*$/, "");
      this.url = `${base}?${params.toString()}`;
    } else {
      const host = this.options.host || "localhost";
      this.url = `ws://${host}:${port}?${params.toString()}`;
    }
  }
  async start() {
    return new Promise((resolve, reject) => {
      try {
        const wsInstance = new WS(this.url);
        this.ws = wsInstance;
        if (!this.ws) {
          reject(new Error("Failed to create WebSocket instance"));
          return;
        }
        this.ws.on("open", () => {
          this._isConnected = true;
          this.reconnectCount = 0;
          this.emit("connected");
          resolve();
        });
        this.ws.on("message", (data) => {
          this.handleMessage(data);
        });
        this.ws.on("close", (code, reason) => {
          this._isConnected = false;
          const reasonStr = typeof reason === "string" ? reason : reason && typeof reason.toString === "function" ? reason.toString() : "";
          this.emit("disconnected", { code, reason: reasonStr });
          if (this.options.reconnect && this.reconnectCount < (this.options.maxReconnectAttempts || 10)) {
            this.scheduleReconnect();
          }
        });
        this.ws.on("error", (error) => {
          this.emit("error", error);
          if (!this._isConnected) reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }
  stop() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = void 0;
    }
    if (this.ws) {
      this.options.reconnect = false;
      this.ws.close();
      this.ws = void 0;
    }
    this._isConnected = false;
  }
  bind(eventName, callback) {
    if (!this.eventCallbacks.has(eventName)) this.eventCallbacks.set(eventName, []);
    this.eventCallbacks.get(eventName).push(callback);
  }
  unbind(eventName, callback) {
    if (!this.eventCallbacks.has(eventName)) return;
    const callbacks = this.eventCallbacks.get(eventName);
    if (callback) {
      const index = callbacks.indexOf(callback);
      if (index !== -1) callbacks.splice(index, 1);
    } else {
      this.eventCallbacks.set(eventName, []);
    }
  }
  onData(callback) {
    this.dataCallback = callback;
  }
  send(message) {
    if (!this._isConnected || !this.ws) {
      throw new Error("WebSocket is not connected");
    }
    this.ws.send(JSON.stringify(message));
  }
  sendPluginMessage(action, data, requestId) {
    this.send({
      eventName: "plugin",
      action,
      requestId: requestId || this.generateRequestId(),
      libraryId: this.options.libraryId,
      payload: { type: "plugin", data },
      data
    });
  }
  isConnectedStatus() {
    return this._isConnected && this.ws?.readyState === WS_OPEN;
  }
  handleMessage(data) {
    try {
      const raw = typeof data === "string" ? data : data && typeof data.toString === "function" ? data.toString() : String(data);
      const message = JSON.parse(raw);
      if (this.dataCallback) {
        try {
          this.dataCallback(message);
        } catch (e) {
          console.error("Error in data callback:", e);
        }
      }
      if (message.eventName && this.eventCallbacks.has(message.eventName)) {
        for (const cb of this.eventCallbacks.get(message.eventName).slice()) {
          try {
            cb(message.data || message);
          } catch (e) {
            console.error(`Error in event callback for ${message.eventName}:`, e);
          }
        }
      }
      this.emit("message", message);
    } catch (error) {
      console.error("Failed to parse WebSocket message:", error);
      this.emit("error", new Error("Failed to parse message"));
    }
  }
  scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectCount++;
    console.log(`Attempting to reconnect (${this.reconnectCount}/${this.options.maxReconnectAttempts})...`);
    this.reconnectTimer = setTimeout(() => {
      this.start().catch((e) => console.error("Reconnection failed:", e));
    }, this.options.reconnectInterval);
  }
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
class AuthModule {
  constructor(httpClient) {
    this.httpClient = httpClient;
  }
  /**
   * 用户登录
   * @param username 用户名
   * @param password 密码
   * @returns Promise<LoginResponse>
   */
  async login(username, password) {
    const request = { username, password };
    const response = await this.httpClient.post("/api/auth/login", request);
    if (response.accessToken) {
      this.httpClient.setToken(response.accessToken);
    }
    return response;
  }
  /**
   * 用户注册
   * @param username 用户名
   * @param password 密码
   * @returns Promise<RegisterResponse>
   */
  async register(username, password) {
    const request = { username, password };
    const response = await this.httpClient.post("/api/auth/register", request);
    return response;
  }
  /**
   * 用户登出
   * @returns Promise<BaseResponse>
   */
  async logout() {
    const response = await this.httpClient.post("/api/auth/logout");
    this.httpClient.clearToken();
    return response;
  }
  /**
   * 验证令牌是否有效
   * @returns Promise<VerifyResponse>
   */
  async verify() {
    return await this.httpClient.get("/api/auth/verify");
  }
  /**
   * 获取当前用户的权限码列表
   * @returns Promise<string[]>
   */
  async getCodes() {
    return await this.httpClient.get("/api/auth/codes");
  }
  /**
   * 手动设置令牌
   * @param token 访问令牌
   * @returns AuthModule 返回自身以支持链式调用
   */
  setToken(token) {
    this.httpClient.setToken(token);
    return this;
  }
  /**
   * 清除令牌
   * @returns AuthModule 返回自身以支持链式调用
   */
  clearToken() {
    this.httpClient.clearToken();
    return this;
  }
  /**
   * 检查是否已登录（有令牌）
   * @returns boolean
   */
  isAuthenticated() {
    return this.httpClient.config.token !== void 0;
  }
}
class UserModule {
  constructor(httpClient) {
    this.httpClient = httpClient;
  }
  /**
   * 获取当前登录用户的详细信息
   * @returns Promise<UserInfo>
   */
  async getInfo() {
    return await this.httpClient.get("/api/user/info");
  }
  /**
   * 更新当前登录用户的信息
   * @param userData 要更新的用户数据
   * @returns Promise<BaseResponse>
   */
  async updateInfo(userData) {
    return await this.httpClient.put("/api/user/info", userData);
  }
  /**
   * 修改当前登录用户的密码
   * @param oldPassword 旧密码
   * @param newPassword 新密码
   */
  async changePassword(oldPassword, newPassword) {
    await this.httpClient.put("/api/user/change-password", { oldPassword, newPassword });
  }
  /**
   * 上传当前登录用户的头像（base64 data URL 写入服务器文件）
   * @param image base64 图片数据（data:image/...;base64,...）
   */
  async uploadAvatar(image) {
    await this.httpClient.post("/api/user/avatar", { image });
  }
  /**
   * 读取当前登录用户数据目录（服务器 /user_data/{user_id}/）下的文本文件
   * @param relPath 相对路径，如 'dashboard/layouts.json'
   * @returns 文件内容；文件不存在时返回 null
   */
  async readFile(relPath) {
    const data = await this.httpClient.get("/api/user/files", {
      params: { path: relPath }
    });
    return data ? data.content : null;
  }
  /**
   * 写入当前登录用户数据目录下的文本文件（父目录不存在时自动创建）
   * @param relPath 相对路径
   * @param content 文本内容
   */
  async writeFile(relPath, content) {
    await this.httpClient.put("/api/user/files", { path: relPath, content });
  }
  /**
   * 获取当前登录用户的 API Token 列表
   */
  async getTokens() {
    return await this.httpClient.get("/api/user/tokens");
  }
  /**
   * 构造用户头像的资源 URL（供 img src 直接访问，自动附加鉴权）
   */
  getAvatarUrl(userId) {
    return this.httpClient.getUrl(`/api/user/avatar/${encodeURIComponent(userId)}`);
  }
  /**
   * 更新用户真实姓名
   * @param realName 真实姓名
   * @returns UserModule 返回自身以支持链式调用
   */
  updateRealName(realName) {
    return this.updateInfo({ realName });
  }
  /**
   * 更新用户头像
   * @param avatar 头像URL
   * @returns UserModule 返回自身以支持链式调用
   */
  updateAvatar(avatar) {
    return this.updateInfo({ avatar });
  }
  /**
   * 批量更新用户信息
   * @param realName 真实姓名
   * @param avatar 头像URL
   * @returns Promise<BaseResponse>
   */
  updateProfile(realName, avatar) {
    const updateData = {};
    if (realName) updateData.realName = realName;
    if (avatar) updateData.avatar = avatar;
    return this.updateInfo(updateData);
  }
}
class LibraryModule {
  constructor(httpClient) {
    this.httpClient = httpClient;
  }
  /**
   * 获取所有素材库列表
   * @returns Promise<Library[]>
   */
  async getAll() {
    return await this.httpClient.get("/api/libraries");
  }
  /**
   * 根据ID获取单个素材库
   * @param id 素材库ID
   * @returns Promise<Library>
   */
  async getById(id) {
    const libraries = await this.getAll();
    const library = libraries.find((lib) => lib.id === id);
    if (!library) {
      throw new Error(`Library with id ${id} not found`);
    }
    return library;
  }
  /**
   * 创建新的素材库
   * @param libraryData 素材库数据
   * @returns Promise<BaseResponse>
   */
  async create(libraryData) {
    return await this.httpClient.post("/api/libraries", libraryData);
  }
  /**
   * 更新素材库信息
   * @param id 素材库ID
   * @param updateData 更新数据
   * @returns Promise<BaseResponse>
   */
  async update(id, updateData) {
    return await this.httpClient.put(`/api/libraries/${id}`, updateData);
  }
  /**
   * 删除素材库
   * @param id 素材库ID
   * @returns Promise<BaseResponse>
   */
  async delete(id) {
    return await this.httpClient.delete(`/api/libraries/${id}`);
  }
  /** 设置素材库启用状态。 */
  async setStatus(id, status) {
    return await this.httpClient.patch(
      `/api/libraries/${id}/status`,
      { status }
    );
  }
  /** 获取素材库统计信息（包含快捷分类数量）。 */
  async stats(id) {
    return await this.httpClient.get(`/api/libraries/${encodeURIComponent(id)}/stats`);
  }
  /**
   * 启动素材库服务
   * @param id 素材库ID
   * @returns Promise<BaseResponse>
   */
  async start(id) {
    return await this.httpClient.post(`/api/libraries/${id}/start`);
  }
  /**
   * 停止素材库服务
   * @param id 素材库ID
   * @returns Promise<BaseResponse>
   */
  async stop(id) {
    return await this.httpClient.post(`/api/libraries/${id}/stop`);
  }
  /**
   * 重启素材库服务
   * @param id 素材库ID
   * @returns Promise<BaseResponse>
   */
  async restart(id) {
    await this.stop(id);
    return await this.start(id);
  }
  /**
   * 创建素材库
   * @param name 名称
   * @param path 路径
   * @param description 描述
   * @param options 其他选项
   * @returns Promise<BaseResponse>
   */
  async createLocal(name, path, description, options) {
    const libraryData = {
      name,
      path,
      description,
      ...options
    };
    return await this.create(libraryData);
  }
  /**
   * 获取活跃的素材库列表
   * @returns Promise<Library[]>
   */
  async getActive() {
    const libraries = await this.getAll();
    return libraries.filter((lib) => lib.status === "active");
  }
  /**
   * 按状态筛选素材库
   * @param status 状态
   * @returns Promise<Library[]>
   */
  async getByStatus(status) {
    const libraries = await this.getAll();
    return libraries.filter((lib) => lib.status === status);
  }
  /**
   * 从其他素材库（Eagle/Billfish）导入：新建素材库并复制素材（保留文件夹、标签、文件信息）
   * @param request 导入请求
   * @returns Promise<ImportLibraryResponse> importId 用于轮询进度
   */
  async importFrom(request) {
    return await this.httpClient.post("/api/libraries/import", request);
  }
  /**
   * 查询导入任务进度
   * @param importId 导入任务ID（importFrom 返回）
   * @returns Promise<LibraryImportProgress>
   */
  async getImportProgress(importId) {
    return await this.httpClient.get(`/api/libraries/import/${encodeURIComponent(importId)}`);
  }
  /**
   * 取消导入任务（已导入内容保留）
   * @param importId 导入任务ID
   */
  async cancelImport(importId) {
    return await this.httpClient.post(`/api/libraries/import/${encodeURIComponent(importId)}/cancel`);
  }
}
class PluginModule {
  constructor(httpClient) {
    this.httpClient = httpClient;
  }
  /**
   * 获取所有插件列表
   * @returns Promise<Plugin[]>
   */
  async getAll() {
    return await this.httpClient.get("/api/plugins");
  }
  /**
   * 按素材库分组获取插件列表
   * @returns Promise<PluginsByLibrary[]>
   */
  async getByLibrary() {
    return await this.httpClient.get("/api/plugins/by-library");
  }
  /** 获取指定素材库启用的服务端 Web 插件。 */
  async getWeb(libraryId) {
    const plugins = await this.httpClient.get("/api/plugins/web", {
      params: { libraryId }
    });
    return plugins.map((plugin) => ({
      ...plugin,
      url: this.httpClient.getUrl(plugin.url)
    }));
  }
  /**
   * 根据ID获取单个插件（服务端单查）
   * @param id 插件名称或ID
   * @param libraryId 可选，插件所在素材库ID（同名插件多库安装时用于定位）
   * @returns Promise<Plugin>
   */
  async getById(id, libraryId) {
    return await this.httpClient.get(`/api/plugins/${encodeURIComponent(id)}`, {
      params: libraryId ? { libraryId } : void 0
    });
  }
  /**
   * 安装插件
   * @param pluginData 插件安装数据
   * @returns Promise<BaseResponse>
   */
  async install(pluginData) {
    return await this.httpClient.post("/api/plugins/install", pluginData);
  }
  /**
   * 启用插件
   * @param id 插件ID
   * @returns Promise<BaseResponse>
   */
  async enable(id) {
    return await this.httpClient.post(`/api/plugins/${id}/enable`);
  }
  /**
   * 禁用插件
   * @param id 插件ID
   * @returns Promise<BaseResponse>
   */
  async disable(id) {
    return await this.httpClient.post(`/api/plugins/${id}/disable`);
  }
  /**
   * 卸载插件
   * @param id 插件名称或ID
   * @param libraryId 可选，插件所在素材库ID（同名插件多库安装时用于定位）
   * @returns Promise<BaseResponse>
   */
  async uninstall(id, libraryId) {
    return await this.httpClient.delete(`/api/plugins/${encodeURIComponent(id)}`, {
      params: libraryId ? { libraryId } : void 0
    });
  }
  /**
   * 安装最新版本的插件
   * @param name 插件名称
   * @param libraryId 素材库ID
   * @returns Promise<BaseResponse>
   */
  async installLatest(name, libraryId) {
    return await this.install({
      name,
      version: "latest",
      libraryId
    });
  }
  /**
   * 安装指定版本的插件
   * @param name 插件名称
   * @param version 版本号
   * @param libraryId 素材库ID
   * @returns Promise<BaseResponse>
   */
  async installVersion(name, version, libraryId) {
    return await this.install({
      name,
      version,
      libraryId
    });
  }
  /**
   * 同步插件元数据（从已安装插件刷新 package 信息）
   */
  async syncMeta(libraryId) {
    return await this.httpClient.post("/api/plugins/sync-meta", { libraryId });
  }
  /**
   * 上传本地插件包安装（multipart）
   * @param file 插件包文件（.tgz/.zip）
   */
  async upload(file, libraryId) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("libraryId", libraryId);
    return await this.httpClient.upload("/api/plugins/upload", formData);
  }
  /**
   * 切换插件启用状态
   */
  async toggleStatus(libraryId, pluginName, status) {
    return await this.httpClient.post("/api/plugins/toggle-status", {
      libraryId,
      pluginName,
      status
    });
  }
  /**
   * 禁用所有库中同名插件
   */
  async disableAll(pluginName) {
    return await this.httpClient.post("/api/plugins/disable-all", { pluginName });
  }
  /**
   * 读取插件配置
   */
  async getConfig(name, libraryId) {
    return await this.httpClient.get(`/api/plugins/${encodeURIComponent(name)}/config`, {
      params: libraryId ? { libraryId } : void 0
    });
  }
  /**
   * 更新插件配置
   */
  async updateConfig(name, config, libraryId) {
    return await this.httpClient.put(
      `/api/plugins/${encodeURIComponent(name)}/config`,
      config,
      { params: libraryId ? { libraryId } : void 0 }
    );
  }
  /**
   * 获取指定素材库的插件路由定义（动态路由发现端点）
   */
  async getRoutes(libraryId) {
    return await this.httpClient.get(`/api/plugin-routes/${encodeURIComponent(libraryId)}`);
  }
  /**
   * 获取活跃的插件列表
   * @returns Promise<Plugin[]>
   */
  async getActive() {
    const plugins = await this.getAll();
    return plugins.filter((plugin) => plugin.status === "active");
  }
  /**
   * 获取非活跃的插件列表
   * @returns Promise<Plugin[]>
   */
  async getInactive() {
    const plugins = await this.getAll();
    return plugins.filter((plugin) => plugin.status === "inactive");
  }
  /**
   * 根据素材库ID获取插件列表
   * @param libraryId 素材库ID
   * @returns Promise<Plugin[]>
   */
  async getByLibraryId(libraryId) {
    const plugins = await this.getAll();
    return plugins.filter((plugin) => plugin.libraryId === libraryId);
  }
  /**
   * 根据分类获取插件列表
   * @param category 分类
   * @returns Promise<Plugin[]>
   */
  async getByCategory(category) {
    const plugins = await this.getAll();
    return plugins.filter((plugin) => plugin.category === category);
  }
  /**
   * 根据标签获取插件列表
   * @param tag 标签
   * @returns Promise<Plugin[]>
   */
  async getByTag(tag) {
    const plugins = await this.getAll();
    return plugins.filter((plugin) => plugin.tags.includes(tag));
  }
  /**
   * 搜索插件
   * @param query 搜索关键词
   * @returns Promise<Plugin[]>
   */
  async search(query) {
    const plugins = await this.getAll();
    const lowerQuery = query.toLowerCase();
    return plugins.filter(
      (plugin) => plugin.name.toLowerCase().includes(lowerQuery) || plugin.description.toLowerCase().includes(lowerQuery) || plugin.pluginName.toLowerCase().includes(lowerQuery) || plugin.author.toLowerCase().includes(lowerQuery) || plugin.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
    );
  }
  /**
   * 批量启用插件
   * @param ids 插件ID数组
   * @returns Promise<BaseResponse[]>
   */
  async enableMultiple(ids) {
    return await Promise.all(ids.map((id) => this.enable(id)));
  }
  /**
   * 批量禁用插件
   * @param ids 插件ID数组
   * @returns Promise<BaseResponse[]>
   */
  async disableMultiple(ids) {
    return await Promise.all(ids.map((id) => this.disable(id)));
  }
}
class FileModule {
  constructor(httpClient) {
    this.httpClient = httpClient;
  }
  /**
   * 上传文件到指定素材库
   * @param uploadRequest 上传请求数据
   * @returns Promise<UploadResponse>
   */
  async upload(uploadRequest) {
    const formData = new FormData();
    if (uploadRequest.files instanceof FileList) {
      Array.from(uploadRequest.files).forEach((file, index) => {
        formData.append("files", file);
      });
    } else {
      uploadRequest.files.forEach((file, index) => {
        formData.append("files", file);
      });
    }
    formData.append("libraryId", uploadRequest.libraryId);
    if (uploadRequest.sourcePath) {
      formData.append("sourcePath", uploadRequest.sourcePath);
    }
    if (uploadRequest.clientId) {
      formData.append("clientId", uploadRequest.clientId);
    }
    if (uploadRequest.batchImport) {
      formData.append("batchImport", "true");
    }
    if (uploadRequest.silent) {
      formData.append("silent", "true");
    }
    if (uploadRequest.urlItems?.length) {
      formData.append("urlItems", JSON.stringify(uploadRequest.urlItems));
    }
    if (uploadRequest.fields) {
      formData.append("fields", JSON.stringify(uploadRequest.fields));
    }
    if (uploadRequest.payload) {
      formData.append("payload", JSON.stringify(uploadRequest.payload));
    }
    return await this.httpClient.upload("/api/files/upload", formData, uploadRequest.onUploadProgress ? {
      onUploadProgress: (e) => uploadRequest.onUploadProgress({
        loaded: e.loaded,
        total: e.total,
        percent: e.total ? Math.round(e.loaded / e.total * 100) : void 0
      })
    } : void 0);
  }
  /**
   * 下载文件
   * @param libraryId 素材库ID
   * @param fileId 文件ID
   * @returns Promise<Blob>
   */
  async download(libraryId, fileId) {
    return await this.httpClient.download(`/api/files/download/${libraryId}/${fileId}`);
  }
  /** 在服务端将文件原子地移动到另一个素材库。 */
  async moveFile(sourceLibraryId, targetLibraryId, fileId) {
    return await this.httpClient.post("/api/files/move", {
      libraryId: sourceLibraryId,
      sourceLibraryId,
      targetLibraryId,
      fileId: String(fileId)
    });
  }
  /** 覆盖素材封面。 */
  async setCover(libraryId, fileId, cover) {
    const formData = new FormData();
    formData.append("cover", new File([cover], "cover.png", { type: "image/png" }));
    const response = await this.httpClient.upload(
      `/api/files/cover/${encodeURIComponent(libraryId)}/${fileId}`,
      formData
    );
    return response.data;
  }
  /**
   * 覆盖写入文件内容（保留文件 ID、目录和元数据）。
   */
  async writeFile(libraryId, fileId, content, options = {}) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: options.contentType || "application/octet-stream" });
    const file = new File([blob], options.name || "file", {
      type: options.contentType || blob.type || "application/octet-stream"
    });
    const formData = new FormData();
    formData.append("files", file);
    formData.append("libraryId", libraryId);
    formData.append("fileId", String(fileId));
    formData.append("name", options.name || file.name);
    if (options.silent) {
      formData.append("silent", "true");
    }
    return await this.httpClient.upload("/api/files/upload", formData);
  }
  /**
   * 删除文件
   * @param libraryId 素材库ID
   * @param fileId 文件ID
   * @param options.moveToRecycleBin 是否移动到回收站（默认 true）
   * @returns Promise<BaseResponse>
   */
  async delete(libraryId, fileId, options) {
    const params = new URLSearchParams();
    if (options?.moveToRecycleBin !== void 0) {
      params.set("moveToRecycleBin", String(options.moveToRecycleBin));
    }
    const query = params.toString() ? `?${params.toString()}` : "";
    return await this.httpClient.delete(`/api/files/${libraryId}/${fileId}${query}`);
  }
  /**
   * 批量删除文件（一次请求，默认移入回收站）
   * @param libraryId 素材库ID
   * @param fileIds 文件ID数组
   * @param options.moveToRecycleBin 是否移动到回收站（默认 true）
   * @returns Promise<{ success: boolean; message: string; deletedCount: number; deletedIds: number[]; failedIds: number[] }>
   */
  async batchDelete(libraryId, fileIds, options) {
    return await this.httpClient.post("/api/files/batch-delete", {
      libraryId,
      fileIds: fileIds.map(String),
      moveToRecycleBin: options?.moveToRecycleBin !== false
    });
  }
  /**
   * 上传单个文件
   * @param file 文件对象
   * @param libraryId 素材库ID
   * @param options 可选参数
   * @returns Promise<UploadResponse>
   */
  async uploadFile(file, libraryId, options) {
    const uploadRequest = {
      files: [file],
      libraryId,
      sourcePath: options?.sourcePath,
      clientId: options?.clientId,
      silent: options?.silent,
      onUploadProgress: options?.onUploadProgress
    };
    if (options?.tags || options?.folderId) {
      uploadRequest.payload = {
        data: {
          tags: options.tags,
          folder_id: options.folderId
        }
      };
    }
    return await this.upload(uploadRequest);
  }
  /**
   * 上传多个文件
   * @param files 文件数组或FileList
   * @param libraryId 素材库ID
   * @param options 可选参数
   * @returns Promise<UploadResponse>
   */
  async uploadFiles(files, libraryId, options) {
    const uploadRequest = {
      files,
      libraryId,
      sourcePath: options?.sourcePath,
      clientId: options?.clientId,
      silent: options?.silent,
      onUploadProgress: options?.onUploadProgress
    };
    if (options?.tags || options?.folderId) {
      uploadRequest.payload = {
        data: {
          tags: options.tags,
          folder_id: options.folderId
        }
      };
    }
    return await this.upload(uploadRequest);
  }
  /** 直接上传已获取的二进制文件并批量导入，服务端不会再次下载 URL。 */
  async batchImport(items, libraryId, options) {
    const files = items.filter((item) => typeof item !== "string");
    const urlItems = items.filter((item) => typeof item === "string");
    const uploadRequest = {
      files,
      libraryId,
      clientId: options?.clientId,
      batchImport: true,
      urlItems
    };
    if (options?.folderId !== void 0) {
      uploadRequest.payload = { data: { folder_id: String(options.folderId) } };
    }
    return await this.upload(uploadRequest);
  }
  /** 使用服务端 Cookie 按 URL 批量下载并导入。 */
  async batchImportFromUrls(libraryId, urls, options) {
    return await this.httpClient.post("/api/download/start", {
      libraryId,
      urls,
      folderId: options?.folderId ?? null,
      tagIds: options?.tagIds,
      clientId: options?.clientId
    });
  }
  /**
   * 上传文件到指定文件夹
   * @param file 文件对象
   * @param libraryId 素材库ID
   * @param folderId 文件夹ID
   * @param tags 标签数组
   * @returns Promise<UploadResponse>
   */
  async uploadToFolder(file, libraryId, folderId, tags) {
    return await this.uploadFile(file, libraryId, { folderId, tags });
  }
  /**
   * 上传文件并添加标签
   * @param file 文件对象
   * @param libraryId 素材库ID
   * @param tags 标签数组
   * @returns Promise<UploadResponse>
   */
  async uploadWithTags(file, libraryId, tags) {
    return await this.uploadFile(file, libraryId, { tags });
  }
  /**
   * 下载文件并保存为指定文件名
   * @param libraryId 素材库ID
   * @param fileId 文件ID
   * @param filename 保存的文件名
   * @returns Promise<void>
   */
  async downloadAndSave(libraryId, fileId, filename) {
    const blob = await this.download(libraryId, fileId);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
  /**
   * 批量删除文件
   * @param libraryId 素材库ID
   * @param fileIds 文件ID数组
   * @returns Promise<BaseResponse[]>
   */
  async deleteMultiple(libraryId, fileIds) {
    return await Promise.all(fileIds.map((fileId) => this.delete(libraryId, fileId)));
  }
  /**
   * 清空回收站
   * @param libraryId 素材库ID
   * @returns Promise<{ success: boolean; deletedCount: number; errors?: string[] }>
   */
  async emptyTrash(libraryId) {
    return await this.httpClient.delete(`/api/files/${libraryId}/trash`);
  }
  /**
   * 恢复文件（从回收站还原）
   * @param libraryId 素材库ID
   * @param fileId 文件ID
   * @returns Promise<BaseResponse>
   */
  async restoreFile(libraryId, fileId) {
    return await this.httpClient.post("/api/files/recover", {
      libraryId,
      fileId: fileId.toString()
    });
  }
  /**
   * 批量恢复文件（从回收站还原，一次请求）
   * @param libraryId 素材库ID
   * @param fileIds 文件ID数组
   * @returns Promise<{ success: boolean; message: string; recoveredCount: number; recoveredIds: number[]; failedIds: number[] }>
   */
  async batchRestoreFiles(libraryId, fileIds) {
    return await this.httpClient.post("/api/files/batch-recover", {
      libraryId,
      fileIds: fileIds.map(String)
    });
  }
  /**
   * 获取文件列表（支持过滤）
   * @param request 获取文件请求
   * @returns Promise<FileData[]>
   */
  async getFiles(request) {
    return await this.httpClient.post("/api/files/getFiles", request);
  }
  /**
   * 获取单个文件信息
   * @param libraryId 素材库ID
   * @param fileId 文件ID
   * @returns Promise<FileData>
   */
  async getFile(libraryId, fileId, clientId) {
    return await this.httpClient.post("/api/files/getFile", {
      libraryId,
      fileId: fileId.toString(),
      clientId
    });
  }
  /** 批量获取文件 metadata 及可用于布局的宽高。 */
  async getMetadataByIds(libraryId, fileIds, clientId) {
    return await this.httpClient.post("/api/files/metadata", {
      libraryId,
      ids: fileIds.map((id) => String(id)),
      clientId
    });
  }
  /** 按素材 ID 即时调用服务端 exiftool 获取完整 EXIF。 */
  async getExifByIds(libraryId, fileIds, clientId) {
    return await this.httpClient.post("/api/files/exif", {
      libraryId,
      ids: fileIds.map((id) => String(id)),
      clientId
    });
  }
  /** 获取所有可用于该文件的插件 iframe Viewer。 */
  async getPreviewViewers(libraryId, fileId, clientId) {
    const response = await this.httpClient.post("/api/files/getPreviewViewers", {
      libraryId,
      fileId: fileId.toString(),
      clientId
    });
    return {
      ...response,
      viewers: response.viewers.map((viewer) => ({
        ...viewer,
        iframeUrl: this.httpClient.getUrl(viewer.iframeUrl)
      }))
    };
  }
  /**
   * 便捷方法：获取所有文件
   * @param libraryId 素材库ID
   * @param isUrlFile 是否为URL文件
   * @returns Promise<FilesListResponse>
   */
  async getAllFiles(libraryId, isUrlFile) {
    return await this.getFiles({ libraryId, isUrlFile });
  }
  /**
   * 便捷方法：按标签筛选文件
   * @param libraryId 素材库ID
   * @param tags 标签数组
   * @returns Promise<FilesListResponse>
   */
  async getFilesByTags(libraryId, tags) {
    return await this.getFiles({ libraryId, filters: { tags } });
  }
  /**
   * 便捷方法：按文件夹筛选文件
   * @param libraryId 素材库ID
   * @param folderId 文件夹ID（传 null 表示查未分类）
   * @returns Promise<FilesListResponse>
   */
  async getFilesByFolder(libraryId, folderId) {
    return await this.getFiles({ libraryId, filters: { folder: folderId } });
  }
  /**
   * 便捷方法：按文件标题搜索文件
   * @param libraryId 素材库ID
   * @param title 文件标题（支持模糊搜索）
   * @returns Promise<FilesListResponse>
   */
  async searchFilesByTitle(libraryId, title) {
    return await this.getFiles({ libraryId, filters: { title } });
  }
  /**
   * 便捷方法：按扩展名筛选文件
   * @param libraryId 素材库ID
   * @param extension 文件扩展名
   * @returns Promise<FilesListResponse>
   */
  async getFilesByExtension(libraryId, extension) {
    return await this.getFiles({ libraryId, filters: { extension } });
  }
  /**
   * 便捷方法：按大小范围筛选文件
   * @param libraryId 素材库ID
   * @param minSize 最小大小（字节）
   * @param maxSize 最大大小（字节）
   * @returns Promise<FilesListResponse>
   */
  async getFilesBySize(libraryId, minSize, maxSize) {
    return await this.getFiles({
      libraryId,
      filters: { size_min: minSize, size_max: maxSize }
    });
  }
  /**
   * 便捷方法：按创建时间范围筛选文件
   * @param libraryId 素材库ID
   * @param afterDate 开始日期（ISO字符串）
   * @param beforeDate 结束日期（ISO字符串）
   * @returns Promise<FilesListResponse>
   */
  async getFilesByDateRange(libraryId, afterDate, beforeDate) {
    return await this.getFiles({
      libraryId,
      filters: { created_after: afterDate, created_before: beforeDate }
    });
  }
  /**
   * 便捷方法：分页获取文件
   * @param libraryId 素材库ID
   * @param page 页码（从1开始）
   * @param pageSize 每页大小
   * @param filters 其他过滤条件
   * @returns Promise<FilesListResponse>
   */
  async getFilesPaginated(libraryId, page = 1, pageSize = 20, filters) {
    const offset = (page - 1) * pageSize;
    return await this.getFiles({
      libraryId,
      filters: {
        ...filters,
        limit: pageSize,
        offset
      }
    });
  }
  /**
   * 重命名文件（同名时自动追加序号后缀）
   * @param libraryId 素材库ID
   * @param fileId 文件ID
   * @param name 新文件名
   * @returns Promise<FileData>
   */
  async renameFile(libraryId, fileId, name) {
    return await this.httpClient.post("/api/files/rename", {
      libraryId,
      fileId: fileId.toString(),
      name
    });
  }
  /**
   * 更新文件元数据（website 等）
   * @param libraryId 素材库ID
   * @param fileId 文件ID
   * @param data 更新数据
   * @returns Promise<FileData>
   */
  async updateFile(libraryId, fileId, data) {
    return await this.httpClient.post("/api/files/update", {
      libraryId,
      fileId: fileId.toString(),
      data
    });
  }
  async getExtraFileList(libraryId, fileId) {
    return await this.httpClient.get(
      `/api/files/extra/${encodeURIComponent(libraryId)}/${encodeURIComponent(String(fileId))}`
    );
  }
  async getExtraFile(libraryId, fileId, fileName) {
    return await this.httpClient.download(this.getExtraFilePath(libraryId, fileId, fileName));
  }
  getExtraFileUrl(libraryId, fileId, fileName) {
    return this.httpClient.getUrl(this.getExtraFilePath(libraryId, fileId, fileName));
  }
  getExtraFilePath(libraryId, fileId, fileName) {
    const encodedName = fileName.replace(/\\/g, "/").split("/").map(encodeURIComponent).join("/");
    return `/api/files/extra/${encodeURIComponent(libraryId)}/${encodeURIComponent(String(fileId))}/${encodedName}`;
  }
}
class DatabaseModule {
  constructor(httpClient) {
    this.httpClient = httpClient;
  }
  /**
   * 获取数据库中所有表的信息
   * @param libraryId 素材库ID
   * @returns Promise<DatabaseTable[]>
   */
  async getTables(libraryId) {
    return await this.httpClient.get(`/api/database/tables?libraryId=${encodeURIComponent(libraryId)}`);
  }
  /**
   * 执行只读 SQL 查询
   * @param libraryId 素材库ID
   * @param sql SQL 查询语句
   * @returns Promise<any[]> 查询结果行
   */
  async query(libraryId, sql) {
    return await this.httpClient.post("/api/database/query", { libraryId, sql });
  }
  /**
   * 获取指定表的数据
   * @param libraryId 素材库ID
   * @param tableName 表名
   * @returns Promise<any[]>
   */
  async getTableData(libraryId, tableName) {
    return await this.httpClient.get(`/api/database/tables/${encodeURIComponent(tableName)}/data?libraryId=${encodeURIComponent(libraryId)}`);
  }
  /**
   * 获取指定表的结构信息
   * @param libraryId 素材库ID
   * @param tableName 表名
   * @returns Promise<TableColumn[]>
   */
  async getTableSchema(libraryId, tableName) {
    return await this.httpClient.get(`/api/database/tables/${encodeURIComponent(tableName)}/schema?libraryId=${encodeURIComponent(libraryId)}`);
  }
  /**
   * 检查表是否存在
   * @param libraryId 素材库ID
   * @param tableName 表名
   * @returns Promise<boolean>
   */
  async tableExists(libraryId, tableName) {
    try {
      const tables = await this.getTables(libraryId);
      return tables.some((table) => table.name === tableName);
    } catch {
      return false;
    }
  }
  /**
   * 获取表的行数
   * @param libraryId 素材库ID
   * @param tableName 表名
   * @returns Promise<number>
   */
  async getTableRowCount(libraryId, tableName) {
    const tables = await this.getTables(libraryId);
    const table = tables.find((t) => t.name === tableName);
    return table ? table.rowCount : 0;
  }
  /**
   * 获取表的详细信息（包含数据和结构）
   * @param libraryId 素材库ID
   * @param tableName 表名
   * @returns Promise<{table: DatabaseTable, schema: TableColumn[], data: any[]}>
   */
  async getTableDetails(libraryId, tableName) {
    const [tables, schema, data] = await Promise.all([
      this.getTables(libraryId),
      this.getTableSchema(libraryId, tableName),
      this.getTableData(libraryId, tableName)
    ]);
    const table = tables.find((t) => t.name === tableName);
    if (!table) {
      throw new Error(`Table ${tableName} not found`);
    }
    return { table, schema, data };
  }
  /**
   * 获取所有表的基本信息
   * @param libraryId 素材库ID
   * @returns Promise<{name: string, rowCount: number}[]>
   */
  async getTablesInfo(libraryId) {
    const tables = await this.getTables(libraryId);
    return tables.map((table) => ({
      name: table.name,
      rowCount: table.rowCount
    }));
  }
  /**
   * 搜索包含指定关键词的表名
   * @param libraryId 素材库ID
   * @param keyword 搜索关键词
   * @returns Promise<DatabaseTable[]>
   */
  async searchTables(libraryId, keyword) {
    const tables = await this.getTables(libraryId);
    const lowerKeyword = keyword.toLowerCase();
    return tables.filter(
      (table) => table.name.toLowerCase().includes(lowerKeyword)
    );
  }
  /**
   * 获取表中的主键列
   * @param libraryId 素材库ID
   * @param tableName 表名
   * @returns Promise<TableColumn[]>
   */
  async getPrimaryKeys(libraryId, tableName) {
    const schema = await this.getTableSchema(libraryId, tableName);
    return schema.filter((column) => column.pk === 1);
  }
  /**
   * 获取表中的非空列
   * @param libraryId 素材库ID
   * @param tableName 表名
   * @returns Promise<TableColumn[]>
   */
  async getNotNullColumns(libraryId, tableName) {
    const schema = await this.getTableSchema(libraryId, tableName);
    return schema.filter((column) => column.notnull === 1);
  }
  /**
   * 获取表中有默认值的列
   * @param libraryId 素材库ID
   * @param tableName 表名
   * @returns Promise<TableColumn[]>
   */
  async getColumnsWithDefaults(libraryId, tableName) {
    const schema = await this.getTableSchema(libraryId, tableName);
    return schema.filter((column) => column.dflt_value !== null);
  }
  /**
   * 按行数排序获取表列表
   * @param libraryId 素材库ID
   * @param order 排序方式 'asc' | 'desc'
   * @returns Promise<DatabaseTable[]>
   */
  async getTablesByRowCount(libraryId, order = "desc") {
    const tables = await this.getTables(libraryId);
    return tables.sort((a, b) => {
      if (order === "asc") {
        return a.rowCount - b.rowCount;
      } else {
        return b.rowCount - a.rowCount;
      }
    });
  }
  /**
   * 获取空表列表
   * @param libraryId 素材库ID
   * @returns Promise<DatabaseTable[]>
   */
  async getEmptyTables(libraryId) {
    const tables = await this.getTables(libraryId);
    return tables.filter((table) => table.rowCount === 0);
  }
  /**
   * 获取非空表列表
   * @param libraryId 素材库ID
   * @returns Promise<DatabaseTable[]>
   */
  async getNonEmptyTables(libraryId) {
    const tables = await this.getTables(libraryId);
    return tables.filter((table) => table.rowCount > 0);
  }
}
class DeviceModule {
  constructor(httpClient) {
    this.httpClient = httpClient;
  }
  /**
   * 创建设备间分享票据
   * 接收方凭 ticketId 通过 downloadUrl（GET /api/devices/share/:ticketId）免 token 下载，
   * 票据限时（默认 30 分钟）且限次，由服务端内存管理。
   * @param request 分享请求（libraryId + 库内相对路径文件列表）
   * @returns Promise<ShareTicketResponse>
   */
  async createShareTicket(request) {
    return await this.httpClient.post("/api/devices/share-tickets", request);
  }
  /**
   * 获取所有设备连接信息
   * @returns Promise<DevicesResponse>
   */
  async getAll() {
    return await this.httpClient.get("/api/devices");
  }
  /**
   * 获取指定素材库的设备连接信息
   * @param libraryId 素材库ID
   * @returns Promise<Device[]>
   */
  async getByLibrary(libraryId) {
    return await this.httpClient.get(`/api/devices/library/${libraryId}`);
  }
  /**
   * 断开设备连接
   * @param clientId 客户端ID
   * @param libraryId 素材库ID
   * @returns Promise<BaseResponse>
   */
  async disconnect(clientId, libraryId) {
    const request = { clientId, libraryId };
    return await this.httpClient.post("/api/devices/disconnect", request);
  }
  /**
   * 按客户端 ID 断开设备连接（路径参数版，dashboard 使用）
   * @param clientId 客户端ID
   */
  async disconnectById(clientId) {
    return await this.httpClient.post(`/api/devices/${encodeURIComponent(clientId)}/disconnect`);
  }
  /**
   * 向设备广播消息
   * @param message 消息内容
   * @param title 可选标题
   * @param clientIds 可选，限定接收的客户端；不传则广播全部
   */
  async broadcast(message, title, clientIds) {
    return await this.httpClient.post("/api/devices/broadcast", {
      message,
      ...title !== void 0 && { title },
      ...clientIds !== void 0 && { clientIds }
    });
  }
  /**
   * 向设备发送消息
   * @param clientId 客户端ID
   * @param libraryId 素材库ID
   * @param message 消息内容
   * @returns Promise<BaseResponse>
   */
  async sendMessage(clientId, libraryId, message) {
    const request = { clientId, libraryId, message };
    return await this.httpClient.post("/api/devices/send-message", request);
  }
  /**
   * 获取设备统计信息
   * @returns Promise<DeviceStatsResponse>
   */
  async getStats() {
    return await this.httpClient.get("/api/devices/stats");
  }
  /**
   * 获取所有已连接的设备
   * @returns Promise<Device[]>
   */
  async getConnectedDevices() {
    const response = await this.getAll();
    const allDevices = [];
    Object.values(response.data).forEach((devices) => {
      allDevices.push(...devices.filter((device) => device.status === "connected"));
    });
    return allDevices;
  }
  /**
   * 获取所有已断开的设备
   * @returns Promise<Device[]>
   */
  async getDisconnectedDevices() {
    const response = await this.getAll();
    const allDevices = [];
    Object.values(response.data).forEach((devices) => {
      allDevices.push(...devices.filter((device) => device.status === "disconnected"));
    });
    return allDevices;
  }
  /**
   * 根据客户端ID查找设备
   * @param clientId 客户端ID
   * @returns Promise<Device | null>
   */
  async findByClientId(clientId) {
    const response = await this.getAll();
    for (const devices of Object.values(response.data)) {
      const device = devices.find((d) => d.clientId === clientId);
      if (device) {
        return device;
      }
    }
    return null;
  }
  /**
   * 获取指定素材库的连接设备数量
   * @param libraryId 素材库ID
   * @returns Promise<number>
   */
  async getLibraryConnectionCount(libraryId) {
    const devices = await this.getByLibrary(libraryId);
    return devices.filter((device) => device.status === "connected").length;
  }
  /**
   * 批量断开设备连接
   * @param connections 连接信息数组
   * @returns Promise<BaseResponse[]>
   */
  async disconnectMultiple(connections) {
    return await Promise.all(
      connections.map((conn) => this.disconnect(conn.clientId, conn.libraryId))
    );
  }
  /**
   * 断开素材库的所有设备连接
   * @param libraryId 素材库ID
   * @returns Promise<BaseResponse[]>
   */
  async disconnectAllInLibrary(libraryId) {
    const devices = await this.getByLibrary(libraryId);
    const connectedDevices = devices.filter((device) => device.status === "connected");
    return await Promise.all(
      connectedDevices.map((device) => this.disconnect(device.clientId, device.libraryId))
    );
  }
  /**
   * 向素材库的所有设备广播消息
   * @param libraryId 素材库ID
   * @param message 消息内容
   * @returns Promise<BaseResponse[]>
   */
  async broadcastToLibrary(libraryId, message) {
    const devices = await this.getByLibrary(libraryId);
    const connectedDevices = devices.filter((device) => device.status === "connected");
    return await Promise.all(
      connectedDevices.map(
        (device) => this.sendMessage(device.clientId, device.libraryId, message)
      )
    );
  }
  /**
   * 向所有连接的设备广播消息
   * @param message 消息内容
   * @returns Promise<BaseResponse[]>
   */
  async broadcastToAll(message) {
    const connectedDevices = await this.getConnectedDevices();
    return await Promise.all(
      connectedDevices.map(
        (device) => this.sendMessage(device.clientId, device.libraryId, message)
      )
    );
  }
  /**
   * 获取设备的连接时长（分钟）
   * @param device 设备信息
   * @returns number
   */
  getConnectionDuration(device) {
    const connectionTime = new Date(device.connectionTime);
    const now = /* @__PURE__ */ new Date();
    return Math.floor((now.getTime() - connectionTime.getTime()) / (1e3 * 60));
  }
  /**
   * 获取设备的最后活动时间（分钟前）
   * @param device 设备信息
   * @returns number
   */
  getLastActivityMinutes(device) {
    const lastActivity = new Date(device.lastActivity);
    const now = /* @__PURE__ */ new Date();
    return Math.floor((now.getTime() - lastActivity.getTime()) / (1e3 * 60));
  }
  /**
   * 检查设备是否在线
   * @param device 设备信息
   * @param timeoutMinutes 超时时间（分钟）
   * @returns boolean
   */
  isDeviceOnline(device, timeoutMinutes = 5) {
    return device.status === "connected" && this.getLastActivityMinutes(device) <= timeoutMinutes;
  }
}
class SystemModule {
  constructor(httpClient) {
    this.httpClient = httpClient;
  }
  /**
   * 获取详细的系统健康状态
   * @returns Promise<HealthResponse>
   */
  async getHealth() {
    return await this.httpClient.get("/api/health");
  }
  /**
   * 获取简单的健康状态
   * @returns Promise<HealthResponse>
   */
  async getSimpleHealth() {
    return await this.httpClient.get("/health");
  }
  /**
   * 停止服务器（服务端优雅关闭后退出进程）
   * 仅限本机回环调用，远程调用会被服务端拒绝（403）
   * @returns Promise<{stopping: boolean}>
   */
  async stopServer() {
    return await this.httpClient.post("/api/system/stop");
  }
  /**
   * 检查服务器是否可用
   * @returns Promise<boolean>
   */
  async isServerAvailable() {
    try {
      const health = await this.getSimpleHealth();
      return health.status === "ok";
    } catch {
      return false;
    }
  }
  /**
   * 获取服务器运行时间（秒）
   * @returns Promise<number>
   */
  async getUptime() {
    const health = await this.getHealth();
    return health.uptime;
  }
  /**
   * 获取服务器版本信息
   * @returns Promise<string>
   */
  async getVersion() {
    const health = await this.getHealth();
    return health.version;
  }
  /**
   * 获取 Node.js 版本
   * @returns Promise<string | undefined>
   */
  async getNodeVersion() {
    const health = await this.getHealth();
    return health.nodeVersion;
  }
  /**
   * 获取运行环境
   * @returns Promise<string | undefined>
   */
  async getEnvironment() {
    const health = await this.getHealth();
    return health.environment;
  }
  /**
   * 获取完整的系统信息
   * @returns Promise<{uptime: number, version: string, nodeVersion?: string, environment?: string}>
   */
  async getSystemInfo() {
    const health = await this.getHealth();
    return {
      uptime: health.uptime,
      version: health.version,
      nodeVersion: health.nodeVersion,
      environment: health.environment
    };
  }
  /**
   * 检查服务器是否健康（带重试机制）
   * @param maxRetries 最大重试次数
   * @param retryDelay 重试间隔（毫秒）
   * @returns Promise<boolean>
   */
  async checkHealthWithRetry(maxRetries = 3, retryDelay = 1e3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const isAvailable = await this.isServerAvailable();
        if (isAvailable) {
          return true;
        }
      } catch {
      }
      if (i < maxRetries - 1) {
        await this.delay(retryDelay);
      }
    }
    return false;
  }
  /**
   * 等待服务器就绪
   * @param timeout 超时时间（毫秒）
   * @param checkInterval 检查间隔（毫秒）
   * @returns Promise<boolean>
   */
  async waitForServer(timeout = 3e4, checkInterval = 1e3) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      try {
        const isAvailable = await this.isServerAvailable();
        if (isAvailable) {
          return true;
        }
      } catch {
      }
      await this.delay(checkInterval);
    }
    return false;
  }
  /**
   * 获取运行时间的可读格式
   * @returns Promise<string>
   */
  async getUptimeFormatted() {
    const uptimeSeconds = await this.getUptime();
    return this.formatUptime(uptimeSeconds);
  }
  /**
   * 监控服务器状态
   * @param callback 状态变化回调函数
   * @param interval 检查间隔（毫秒）
   * @returns 停止监控的函数
   */
  monitorHealth(callback, interval = 5e3) {
    let isRunning = true;
    const check = async () => {
      while (isRunning) {
        try {
          const health = await this.getHealth();
          const isHealthy = health.status === "ok";
          callback(isHealthy, health);
        } catch (error) {
          callback(false, void 0, error);
        }
        if (isRunning) {
          await this.delay(interval);
        }
      }
    };
    check();
    return () => {
      isRunning = false;
    };
  }
  /**
   * 延迟函数
   * @param ms 延迟时间（毫秒）
   * @returns Promise<void>
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  /**
   * 格式化运行时间
   * @param seconds 秒数
   * @returns 格式化的时间字符串
   */
  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor(seconds % 86400 / 3600);
    const minutes = Math.floor(seconds % 3600 / 60);
    const secs = Math.floor(seconds % 60);
    const parts = [];
    if (days > 0) parts.push(`${days}天`);
    if (hours > 0) parts.push(`${hours}小时`);
    if (minutes > 0) parts.push(`${minutes}分钟`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}秒`);
    return parts.join("");
  }
}
class TagModule {
  constructor(httpClient) {
    this.httpClient = httpClient;
  }
  /**
   * 获取所有标签
   * @param libraryId 素材库ID
   * @returns Promise<Tag[]>
   */
  async getAll(libraryId) {
    return await this.httpClient.get(`/api/tags/all?libraryId=${libraryId}`);
  }
  /**
   * 查询标签
   * @param request 查询请求
   * @returns Promise<Tag[]>
   */
  async query(request) {
    return await this.httpClient.post("/api/tags/query", request);
  }
  /**
   * 创建标签
   * @param request 创建请求
   * @returns Promise<number> 新建标签的 id
   */
  async create(request) {
    return await this.httpClient.post("/api/tags/create", request);
  }
  /**
   * 更新标签
   * @param request 更新请求
   * @returns Promise<boolean> 更新成功返回 true
   */
  async update(request) {
    return await this.httpClient.put("/api/tags/update", request);
  }
  /**
   * 删除标签
   * @param request 删除请求
   * @returns Promise<BaseResponse>
   */
  async delete(request) {
    const response = await this.httpClient.getAxiosInstance().delete("/api/tags/delete", {
      data: request
    });
    return response.data;
  }
  /**
   * 为文件设置标签
   * @param request 设置请求
   * @returns Promise<SetFileTagsResponse>
   */
  async setFileTags(request) {
    return await this.httpClient.post("/api/tags/file/set", request);
  }
  /**
   * 获取文件的标签
   * @param request 获取请求
   * @returns Promise<FileTagsResponse>
   */
  async getFileTags(request) {
    return await this.httpClient.get(`/api/tags/file/${request.fileId}?libraryId=${request.libraryId}`);
  }
  /**
   * 便捷方法：创建标签
   * @param libraryId 素材库ID
   * @param title 标签标题
   * @param parentId 父标签ID（可选）
   * @param color 标签颜色（可选，数字类型）
   * @param description 标签描述（可选）
   * @param icon 标签图标（可选，Material Icons 图标名）
   * @returns Promise<number> 新建标签的 id
   */
  async createTag(libraryId, title, parentId, color, description, icon) {
    return await this.create({ libraryId, title, parent_id: parentId, color, icon, description });
  }
  /**
   * 便捷方法：更新标签
   * @param libraryId 素材库ID
   * @param id 标签ID
   * @param updates 更新数据
   * @returns Promise<boolean> 更新成功返回 true
   */
  async updateTag(libraryId, id, updates) {
    return await this.update({ libraryId, id, ...updates });
  }
  /**
   * 批量更新标签排序 index
   */
  async updateSortIndex(libraryId, items) {
    return await this.httpClient.put("/api/tags/sort-index", { libraryId, items });
  }
  /**
   * 便捷方法：删除标签
   * @param libraryId 素材库ID
   * @param id 标签ID
   * @returns Promise<BaseResponse>
   */
  async deleteTag(libraryId, id) {
    return await this.delete({ libraryId, id });
  }
  /**
   * 便捷方法：为文件添加标签
   * 支持传标签名或标签ID，服务端会自动将名称解析为ID
   * @param libraryId 素材库ID
   * @param fileId 文件ID
   * @param tags 标签数组（名称或ID）
   * @returns Promise<SetFileTagsResponse>
   */
  async addTagsToFile(libraryId, fileId, tags) {
    return await this.setFileTags({ libraryId, fileId, tags });
  }
  /**
   * 便捷方法：获取文件标签
   * @param libraryId 素材库ID
   * @param fileId 文件ID
   * @returns Promise<FileTagsResponse>
   */
  async getFileTagList(libraryId, fileId) {
    return await this.getFileTags({ libraryId, fileId });
  }
  /**
   * 便捷方法：按标题查询标签
   * @param libraryId 素材库ID
   * @param title 标签标题
   * @returns Promise<Tag[]>
   */
  async findByTitle(libraryId, title) {
    return await this.query({ libraryId, query: { title } });
  }
  /**
   * 便捷方法：按颜色查询标签
   * @param libraryId 素材库ID
   * @param color 标签颜色（数字类型）
   * @returns Promise<Tag[]>
   */
  async findByColor(libraryId, color) {
    return await this.query({ libraryId, query: { color } });
  }
  /**
   * 便捷方法：获取子标签
   * @param libraryId 素材库ID
   * @param parentId 父标签ID
   * @returns Promise<Tag[]>
   */
  async getSubTags(libraryId, parentId) {
    return await this.query({ libraryId, query: { parent_id: parentId } });
  }
  /**
   * 便捷方法：获取根标签（没有父标签的标签）
   * @param libraryId 素材库ID
   * @returns Promise<Tag[]>
   */
  async getRootTags(libraryId) {
    return await this.query({ libraryId, query: { parent_id: 0 } });
  }
}
class FolderModule {
  constructor(httpClient) {
    this.httpClient = httpClient;
  }
  /**
   * 获取所有文件夹
   * @param libraryId 素材库ID
   * @returns Promise<Folder[]>
   */
  async getAll(libraryId) {
    return await this.httpClient.get(`/api/folders/all?libraryId=${libraryId}`);
  }
  /** 批量获取可直接用于 img src 的文件夹封面 URL。 */
  async getCovers(libraryId, folderIds) {
    const covers = await this.httpClient.post("/api/folders/covers", {
      libraryId,
      folderIds
    });
    return covers.map((cover) => ({
      ...cover,
      coverUrl: cover.coverUrl ? this.httpClient.getUrl(cover.coverUrl) : null
    }));
  }
  /**
   * 查询文件夹
   * @param request 查询请求
   * @returns Promise<Folder[]>
   */
  async query(request) {
    return await this.httpClient.post("/api/folders/query", request);
  }
  /**
   * 创建文件夹
   * @param request 创建请求
   * @returns Promise<number> 新建文件夹的 id
   */
  async create(request) {
    return await this.httpClient.post("/api/folders/create", request);
  }
  /**
   * 更新文件夹
   * @param request 更新请求
   * @returns Promise<boolean> 更新成功返回 true
   */
  async update(request) {
    return await this.httpClient.put("/api/folders/update", request);
  }
  /**
   * 删除文件夹
   * @param request 删除请求
   * @returns Promise<BaseResponse>
   */
  async delete(request) {
    const response = await this.httpClient.getAxiosInstance().delete("/api/folders/delete", {
      data: request
    });
    return response.data;
  }
  /**
   * 为文件设置文件夹
   * @param request 设置请求
   * @returns Promise<SetFileFolderResponse>
   */
  async setFileFolder(request) {
    return await this.httpClient.post("/api/folders/file/set", request);
  }
  /**
   * 获取文件的文件夹
   * @param request 获取请求
   * @returns Promise<FileFolderResponse>
   */
  async getFileFolder(request) {
    return await this.httpClient.get(`/api/folders/file/${request.fileId}?libraryId=${request.libraryId}`);
  }
  /**
   * 便捷方法：创建文件夹
   * @param libraryId 素材库ID
   * @param title 文件夹标题
   * @param parentId 父文件夹ID（可选）
   * @param color 文件夹颜色（可选，数字类型）
   * @param description 文件夹描述（可选）
   * @param icon 文夹夹图标（可选，Material Icons 图标名）
   * @returns Promise<number> 新建文件夹的 id
   */
  async createFolder(libraryId, title, parentId, color, description, icon) {
    return await this.create({ libraryId, title, parent_id: parentId, color, icon, description });
  }
  /**
   * 便捷方法：更新文件夹
   * @param libraryId 素材库ID
   * @param id 文件夹ID
   * @param updates 更新数据
   * @returns Promise<boolean> 更新成功返回 true
   */
  async updateFolder(libraryId, id, updates) {
    return await this.update({ libraryId, id, ...updates });
  }
  /**
   * 批量更新文件夹排序 index
   */
  async updateSortIndex(libraryId, items) {
    return await this.httpClient.put("/api/folders/sort-index", { libraryId, items });
  }
  /**
   * 便捷方法：删除文件夹
   * @param libraryId 素材库ID
   * @param id 文件夹ID
   * @returns Promise<BaseResponse>
   */
  async deleteFolder(libraryId, id, deleteFiles) {
    return await this.delete({ libraryId, id, deleteFiles });
  }
  /**
   * 便捷方法：将文件移动到文件夹
   * @param libraryId 素材库ID
   * @param fileId 文件ID
   * @param folderId 文件夹ID
   * @returns Promise<SetFileFolderResponse>
   */
  async moveFileToFolder(libraryId, fileId, folderId) {
    return await this.setFileFolder({ libraryId, fileId, folder: folderId });
  }
  /**
   * 便捷方法：将文件移出文件夹（移到根目录）
   * @param libraryId 素材库ID
   * @param fileId 文件ID
   * @returns Promise<SetFileFolderResponse>
   */
  async removeFileFromFolder(libraryId, fileId) {
    return await this.setFileFolder({ libraryId, fileId, folder: null });
  }
  /**
   * 便捷方法：获取文件所在文件夹
   * @param libraryId 素材库ID
   * @param fileId 文件ID
   * @returns Promise<FileFolderResponse>
   */
  async getFileFolderInfo(libraryId, fileId) {
    return await this.getFileFolder({ libraryId, fileId });
  }
  /**
   * 便捷方法：按标题查询文件夹
   * @param libraryId 素材库ID
   * @param title 文件夹标题
   * @returns Promise<Folder[]>
   */
  async findByTitle(libraryId, title) {
    return await this.query({ libraryId, query: { title } });
  }
  /**
   * 便捷方法：按颜色查询文件夹
   * @param libraryId 素材库ID
   * @param color 文件夹颜色（数字类型）
   * @returns Promise<Folder[]>
   */
  async findByColor(libraryId, color) {
    return await this.query({ libraryId, query: { color } });
  }
  /**
   * 便捷方法：获取子文件夹
   * @param libraryId 素材库ID
   * @param parentId 父文件夹ID
   * @returns Promise<Folder[]>
   */
  async getSubFolders(libraryId, parentId) {
    return await this.query({ libraryId, query: { parent_id: parentId } });
  }
  /**
   * 便捷方法：获取根文件夹（没有父文件夹的文件夹）
   * @param libraryId 素材库ID
   * @returns Promise<Folder[]>
   */
  async getRootFolders(libraryId) {
    return await this.query({ libraryId, query: { parent_id: 0 } });
  }
}
class CookieSiteModule {
  constructor(httpClient) {
    this.httpClient = httpClient;
  }
  async getAll() {
    return await this.httpClient.get("/api/cookie-sites");
  }
  async create(request) {
    return await this.httpClient.post("/api/cookie-sites", request);
  }
  async update(id, request) {
    return await this.httpClient.put(`/api/cookie-sites/${id}`, request);
  }
  async setDefault(id) {
    return await this.httpClient.put(`/api/cookie-sites/${id}/default`);
  }
  async delete(id) {
    return await this.httpClient.delete(`/api/cookie-sites/${id}`);
  }
}
class SettingsModule {
  constructor(httpClient) {
    this.httpClient = httpClient;
  }
  /**
   * 获取服务器设置
   * @returns Promise<ServerSettings>
   */
  async get() {
    return await this.httpClient.get("/api/settings");
  }
  /**
   * 更新服务器设置（需要 admin 权限）
   * @param settings 需要更新的字段
   * @returns Promise<ServerSettings> 更新后的完整设置
   */
  async update(settings) {
    return await this.httpClient.put("/api/settings", settings);
  }
}
class AdminModule {
  constructor(httpClient) {
    this.httpClient = httpClient;
  }
  /**
   * 获取管理员列表
   * @returns Promise<AdminUser[]>
   */
  async getAll() {
    return await this.httpClient.get("/api/admins");
  }
  /**
   * 创建管理员
   * @returns Promise<{ id: string }> 新建管理员 ID
   */
  async create(data) {
    return await this.httpClient.post("/api/admins", data);
  }
  /**
   * 更新管理员信息
   */
  async update(id, data) {
    return await this.httpClient.put(`/api/admins/${encodeURIComponent(id)}`, data);
  }
  /**
   * 删除管理员
   */
  async delete(id) {
    return await this.httpClient.delete(`/api/admins/${encodeURIComponent(id)}`);
  }
  /**
   * 获取管理员的 API Token 列表
   */
  async getTokens(id) {
    return await this.httpClient.get(`/api/admins/${encodeURIComponent(id)}/tokens`);
  }
  /**
   * 为管理员创建 API Token
   */
  async createToken(id, data) {
    return await this.httpClient.post(`/api/admins/${encodeURIComponent(id)}/tokens`, data);
  }
  /**
   * 更新管理员的 API Token
   */
  async updateToken(id, tokenId, data) {
    return await this.httpClient.put(
      `/api/admins/${encodeURIComponent(id)}/tokens/${tokenId}`,
      data
    );
  }
  /**
   * 删除管理员的 API Token
   */
  async deleteToken(id, tokenId) {
    return await this.httpClient.delete(
      `/api/admins/${encodeURIComponent(id)}/tokens/${tokenId}`
    );
  }
}
class DownloadModule {
  constructor(httpClient) {
    this.httpClient = httpClient;
  }
  /**
   * 查询批量下载进度
   * @param batchId 批次 ID（download/start 返回）
   */
  async getProgress(batchId) {
    return await this.httpClient.get(`/api/download/progress/${encodeURIComponent(batchId)}`);
  }
}
class FileSystemModule {
  constructor(httpClient) {
    this.httpClient = httpClient;
  }
  /**
   * 在服务器磁盘上创建目录
   */
  async mkdir(parentPath, name) {
    return await this.httpClient.post("/api/fs/mkdir", { path: parentPath, name });
  }
  /**
   * 列出服务器目录树（仅目录，供路径选择组件使用）
   * @param dirPath 父目录；不传时返回根（Windows 为盘符列表）
   */
  async getDirs(dirPath) {
    return await this.httpClient.get("/api/fs/dirs", {
      params: dirPath ? { path: dirPath } : void 0
    });
  }
  /**
   * 列出素材库目录内的文件
   */
  async list(params) {
    return await this.httpClient.get("/api/fs/list", { params });
  }
  /**
   * 在库目录内移动文件
   */
  async move(data) {
    return await this.httpClient.post("/api/fs/move", data);
  }
  /**
   * 在库目录内删除文件（磁盘级）
   */
  async remove(data) {
    return await this.httpClient.post("/api/fs/remove", data);
  }
  /**
   * 同步库目录与数据库
   */
  async sync(libraryId) {
    return await this.httpClient.post("/api/fs/sync", { libraryId });
  }
  /**
   * 扫描库中缺失文件的数据库记录
   */
  async scanMissing(libraryId) {
    return await this.httpClient.get("/api/fs/database/missing", { params: { libraryId } });
  }
  /**
   * 清除缺失文件的数据库记录
   */
  async clearMissing(libraryId) {
    return await this.httpClient.delete("/api/fs/database/missing", { data: { libraryId } });
  }
  /**
   * 扫描库目录中的新文件（未入库）
   */
  async findNewFiles(libraryId) {
    return await this.httpClient.post("/api/fs/database/new", { libraryId });
  }
  /**
   * 将新文件导入数据库
   */
  async importNewFiles(libraryId, paths) {
    return await this.httpClient.post("/api/fs/database/new/import", { libraryId, paths });
  }
  /**
   * 删除新文件扫描记录
   */
  async deleteNewFiles(libraryId, paths) {
    return await this.httpClient.delete("/api/fs/database/new", { data: { libraryId, paths } });
  }
  /**
   * 扫描数据库中的重复文件记录
   */
  async scanDuplicates(libraryId) {
    return await this.httpClient.post("/api/fs/database/duplicates", { libraryId });
  }
  /**
   * 删除重复文件记录
   */
  async removeDuplicateRecords(libraryId, fileIds) {
    return await this.httpClient.delete("/api/fs/database/duplicates", { data: { libraryId, fileIds } });
  }
  /**
   * 打包下载库内文件（返回 zip Blob）
   */
  async download(data) {
    return await this.httpClient.post("/api/fs/download", data, { responseType: "blob" });
  }
}
class StatisticsModule {
  constructor(httpClient) {
    this.httpClient = httpClient;
  }
  /**
   * 上传统计
   */
  async upload(libraryId, days) {
    return await this.httpClient.get(`/api/statistics/${encodeURIComponent(libraryId)}/upload`, {
      params: days ? { days } : void 0
    });
  }
  /**
   * 按日上传统计
   */
  async uploadDaily(libraryId, days) {
    return await this.httpClient.get(`/api/statistics/${encodeURIComponent(libraryId)}/upload/daily`, {
      params: days ? { days } : void 0
    });
  }
  /**
   * 文件类型统计
   */
  async fileTypes(libraryId, days) {
    return await this.httpClient.get(`/api/statistics/${encodeURIComponent(libraryId)}/file-types`, {
      params: days ? { days } : void 0
    });
  }
  /**
   * 最近上传的文件
   */
  async recentUploads(libraryId, days = 7) {
    return await this.httpClient.get(`/api/statistics/${encodeURIComponent(libraryId)}/recent-uploads`, {
      params: { days }
    });
  }
}
class ThumbnailModule {
  constructor(httpClient) {
    this.httpClient = httpClient;
  }
  /**
   * 开始扫描生成缩略图
   */
  async scan(libraryId) {
    return await this.httpClient.get("/api/thumb/scan", { params: { libraryId } });
  }
  /**
   * 查询缩略图生成进度
   */
  async progress(libraryId) {
    return await this.httpClient.get("/api/thumb/progress", { params: { libraryId } });
  }
  /**
   * 取消缩略图生成任务
   */
  async cancel() {
    return await this.httpClient.get("/api/thumb/cancel");
  }
  /**
   * 缩略图统计信息
   */
  async stats(libraryId) {
    return await this.httpClient.get("/api/thumb/stats", { params: { libraryId } });
  }
  /**
   * 可用的缩略图生成器列表
   */
  async generators() {
    return await this.httpClient.get("/api/thumb/generators");
  }
  /**
   * 同步缺失缩略图
   */
  async sync(libraryId) {
    return await this.httpClient.get("/api/thumb/sync", { params: { libraryId } });
  }
  /**
   * 元数据扫描统计
   */
  async metadataStats(libraryId) {
    return await this.httpClient.get("/api/thumb/metadata/stats", { params: { libraryId } });
  }
  /**
   * 开始元数据扫描
   */
  async metadataScan(libraryId) {
    return await this.httpClient.get("/api/thumb/metadata/scan", { params: { libraryId } });
  }
  /**
   * 查询元数据扫描进度
   */
  async metadataProgress(libraryId) {
    return await this.httpClient.get("/api/thumb/metadata/progress", { params: { libraryId } });
  }
}
class MiraClient {
  constructor(baseURL, config) {
    const clientConfig = {
      baseURL,
      timeout: 1e4 * 6,
      ...config
    };
    this.httpClient = new HttpClient(clientConfig);
    this._auth = new AuthModule(this.httpClient);
    this._user = new UserModule(this.httpClient);
    this._libraries = new LibraryModule(this.httpClient);
    this._plugins = new PluginModule(this.httpClient);
    this._files = new FileModule(this.httpClient);
    this._database = new DatabaseModule(this.httpClient);
    this._devices = new DeviceModule(this.httpClient);
    this._system = new SystemModule(this.httpClient);
    this._tags = new TagModule(this.httpClient);
    this._folders = new FolderModule(this.httpClient);
    this._cookieSites = new CookieSiteModule(this.httpClient);
    this._settings = new SettingsModule(this.httpClient);
    this._admins = new AdminModule(this.httpClient);
    this._downloads = new DownloadModule(this.httpClient);
    this._fs = new FileSystemModule(this.httpClient);
    this._statistics = new StatisticsModule(this.httpClient);
    this._thumbnails = new ThumbnailModule(this.httpClient);
  }
  /**
   * 获取认证模块
   * @returns AuthModule
   */
  auth() {
    return this._auth;
  }
  /**
   * 获取用户模块
   * @returns UserModule
   */
  user() {
    return this._user;
  }
  /**
   * 获取素材库模块
   * @returns LibraryModule
   */
  libraries() {
    return this._libraries;
  }
  /**
   * 获取插件模块
   * @returns PluginModule
   */
  plugins() {
    return this._plugins;
  }
  /**
   * 获取文件模块
   * @returns FileModule
   */
  files() {
    return this._files;
  }
  /**
   * 获取数据库模块
   * @returns DatabaseModule
   */
  database() {
    return this._database;
  }
  /**
   * 获取设备模块
   * @returns DeviceModule
   */
  devices() {
    return this._devices;
  }
  /**
   * 获取系统模块
   * @returns SystemModule
   */
  system() {
    return this._system;
  }
  /**
   * 获取标签模块
   * @returns TagModule
   */
  tags() {
    return this._tags;
  }
  /**
   * 获取文件夹模块
   * @returns FolderModule
   */
  folders() {
    return this._folders;
  }
  /**
   * 获取当前用户的下载站点 Cookie 模块
   * @returns CookieSiteModule
   */
  cookieSites() {
    return this._cookieSites;
  }
  /**
   * 获取服务器设置模块
   * @returns SettingsModule
   */
  settings() {
    return this._settings;
  }
  /**
   * 获取管理员模块
   * @returns AdminModule
   */
  admins() {
    return this._admins;
  }
  /**
   * 获取批量下载模块
   * @returns DownloadModule
   */
  downloads() {
    return this._downloads;
  }
  /**
   * 获取服务器文件系统模块
   * @returns FileSystemModule
   */
  fs() {
    return this._fs;
  }
  /**
   * 获取统计模块
   * @returns StatisticsModule
   */
  statistics() {
    return this._statistics;
  }
  /**
   * 获取缩略图模块
   * @returns ThumbnailModule
   */
  thumbnails() {
    return this._thumbnails;
  }
  /**
   * 创建WebSocket客户端
   * @param port WebSocket服务器端口
   * @param options WebSocket连接选项
   * @returns WebSocketClient
   */
  websocket(port, options) {
    return new WebSocketClient(port, options);
  }
  /**
   * 设置认证令牌
   * @param token 访问令牌
   * @returns MiraClient 返回自身以支持链式调用
   */
  setToken(token) {
    this.httpClient.setToken(token);
    return this;
  }
  /**
   * 清除认证令牌
   * @returns MiraClient 返回自身以支持链式调用
   */
  clearToken() {
    this.httpClient.clearToken();
    return this;
  }
  /**
   * 快速登录方法
   * @param username 用户名
   * @param password 密码
   * @returns Promise<MiraClient> 返回自身以支持链式调用
   */
  async login(username, password) {
    await this._auth.login(username, password);
    return this;
  }
  /**
   * 快速登出方法
   * @returns Promise<MiraClient> 返回自身以支持链式调用
   */
  async logout() {
    await this._auth.logout();
    return this;
  }
  /**
   * 检查连接状态
   * @returns Promise<boolean>
   */
  async isConnected() {
    return await this._system.isServerAvailable();
  }
  /**
   * 等待服务器就绪
   * @param timeout 超时时间（毫秒）
   * @param checkInterval 检查间隔（毫秒）
   * @returns Promise<boolean>
   */
  async waitForServer(timeout, checkInterval) {
    return await this._system.waitForServer(timeout, checkInterval);
  }
  /**
   * 获取客户端配置
   * @returns Partial<ClientConfig>
   */
  getConfig() {
    return {
      baseURL: this.httpClient.config.baseURL,
      timeout: this.httpClient.config.timeout,
      token: this.httpClient.config.token
    };
  }
  /**
   * 更新客户端配置
   * @param config 新的配置
   * @returns MiraClient 返回自身以支持链式调用
   */
  updateConfig(config) {
    if (config.baseURL) {
      const newConfig = { ...this.httpClient.config, ...config };
      this.httpClient = new HttpClient(newConfig);
      this._auth = new AuthModule(this.httpClient);
      this._user = new UserModule(this.httpClient);
      this._libraries = new LibraryModule(this.httpClient);
      this._plugins = new PluginModule(this.httpClient);
      this._files = new FileModule(this.httpClient);
      this._database = new DatabaseModule(this.httpClient);
      this._devices = new DeviceModule(this.httpClient);
      this._system = new SystemModule(this.httpClient);
      this._tags = new TagModule(this.httpClient);
      this._folders = new FolderModule(this.httpClient);
      this._cookieSites = new CookieSiteModule(this.httpClient);
      this._settings = new SettingsModule(this.httpClient);
      this._admins = new AdminModule(this.httpClient);
      this._downloads = new DownloadModule(this.httpClient);
      this._fs = new FileSystemModule(this.httpClient);
      this._statistics = new StatisticsModule(this.httpClient);
      this._thumbnails = new ThumbnailModule(this.httpClient);
    }
    return this;
  }
  /**
   * 获取原始 HTTP 客户端（用于高级用法）
   * @returns HttpClient
   */
  getHttpClient() {
    return this.httpClient;
  }
  /**
   * 创建新的客户端实例（用于多服务器场景）
   * @param baseURL 新的服务器地址
   * @param config 配置选项
   * @returns MiraClient
   */
  static create(baseURL, config) {
    return new MiraClient(baseURL, config);
  }
  /**
   * 批量操作工具方法 - 执行多个异步操作
   * @param operations 操作函数数组
   * @returns Promise<any[]>
   */
  async batch(operations) {
    return await Promise.all(operations.map((op) => op()));
  }
  /**
   * 错误处理工具方法
   * @param operation 要执行的操作
   * @param fallback 失败时的回退值
   * @returns Promise<T>
   */
  async safe(operation, fallback) {
    try {
      return await operation();
    } catch {
      return fallback;
    }
  }
  /**
   * 重试工具方法
   * @param operation 要执行的操作
   * @param maxRetries 最大重试次数
   * @param delay 重试间隔（毫秒）
   * @returns Promise<T>
   */
  async retry(operation, maxRetries = 3, delay = 1e3) {
    let lastError;
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (i < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
    throw lastError;
  }
}
export {
  AdminModule,
  AuthModule,
  CookieSiteModule,
  DatabaseModule,
  DeviceModule,
  DownloadModule,
  FileModule,
  FileSystemModule,
  FolderModule,
  LibraryModule,
  MiraClient,
  PluginModule,
  SettingsModule,
  StatisticsModule,
  SystemModule,
  TagModule,
  ThumbnailModule,
  UserModule,
  WebSocketClient
};
//# sourceMappingURL=mira-sdk.esm.mjs.map
