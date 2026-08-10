import { g as getDefaultExportFromCjs } from "./@imengyu-b2fb178e.js";
var queue$2 = { exports: {} };
var queue$1 = { exports: {} };
var onlyOnce = { exports: {} };
(function(module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = onlyOnce2;
  function onlyOnce2(fn) {
    return function(...args) {
      if (fn === null)
        throw new Error("Callback was already called.");
      var callFn = fn;
      fn = null;
      callFn.apply(this, args);
    };
  }
  module.exports = exports.default;
})(onlyOnce, onlyOnce.exports);
var onlyOnceExports = onlyOnce.exports;
var setImmediate$1 = {};
Object.defineProperty(setImmediate$1, "__esModule", {
  value: true
});
setImmediate$1.fallback = fallback;
setImmediate$1.wrap = wrap;
var hasQueueMicrotask = setImmediate$1.hasQueueMicrotask = typeof queueMicrotask === "function" && queueMicrotask;
var hasSetImmediate = setImmediate$1.hasSetImmediate = typeof setImmediate === "function" && setImmediate;
var hasNextTick = setImmediate$1.hasNextTick = typeof process === "object" && typeof process.nextTick === "function";
function fallback(fn) {
  setTimeout(fn, 0);
}
function wrap(defer) {
  return (fn, ...args) => defer(() => fn(...args));
}
var _defer;
if (hasQueueMicrotask) {
  _defer = queueMicrotask;
} else if (hasSetImmediate) {
  _defer = setImmediate;
} else if (hasNextTick) {
  _defer = process.nextTick;
} else {
  _defer = fallback;
}
setImmediate$1.default = wrap(_defer);
var DoublyLinkedList = { exports: {} };
(function(module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  class DLL {
    constructor() {
      this.head = this.tail = null;
      this.length = 0;
    }
    removeLink(node) {
      if (node.prev)
        node.prev.next = node.next;
      else
        this.head = node.next;
      if (node.next)
        node.next.prev = node.prev;
      else
        this.tail = node.prev;
      node.prev = node.next = null;
      this.length -= 1;
      return node;
    }
    empty() {
      while (this.head)
        this.shift();
      return this;
    }
    insertAfter(node, newNode) {
      newNode.prev = node;
      newNode.next = node.next;
      if (node.next)
        node.next.prev = newNode;
      else
        this.tail = newNode;
      node.next = newNode;
      this.length += 1;
    }
    insertBefore(node, newNode) {
      newNode.prev = node.prev;
      newNode.next = node;
      if (node.prev)
        node.prev.next = newNode;
      else
        this.head = newNode;
      node.prev = newNode;
      this.length += 1;
    }
    unshift(node) {
      if (this.head)
        this.insertBefore(this.head, node);
      else
        setInitial(this, node);
    }
    push(node) {
      if (this.tail)
        this.insertAfter(this.tail, node);
      else
        setInitial(this, node);
    }
    shift() {
      return this.head && this.removeLink(this.head);
    }
    pop() {
      return this.tail && this.removeLink(this.tail);
    }
    toArray() {
      return [...this];
    }
    *[Symbol.iterator]() {
      var cur = this.head;
      while (cur) {
        yield cur.data;
        cur = cur.next;
      }
    }
    remove(testFn) {
      var curr = this.head;
      while (curr) {
        var { next } = curr;
        if (testFn(curr)) {
          this.removeLink(curr);
        }
        curr = next;
      }
      return this;
    }
  }
  exports.default = DLL;
  function setInitial(dll, node) {
    dll.length = 1;
    dll.head = dll.tail = node;
  }
  module.exports = exports.default;
})(DoublyLinkedList, DoublyLinkedList.exports);
var DoublyLinkedListExports = DoublyLinkedList.exports;
var wrapAsync = {};
var asyncify = { exports: {} };
var initialParams = { exports: {} };
(function(module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = function(fn) {
    return function(...args) {
      var callback = args.pop();
      return fn.call(this, args, callback);
    };
  };
  module.exports = exports.default;
})(initialParams, initialParams.exports);
var initialParamsExports = initialParams.exports;
var hasRequiredAsyncify;
function requireAsyncify() {
  if (hasRequiredAsyncify)
    return asyncify.exports;
  hasRequiredAsyncify = 1;
  (function(module, exports) {
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = asyncify2;
    var _initialParams = initialParamsExports;
    var _initialParams2 = _interopRequireDefault(_initialParams);
    var _setImmediate = setImmediate$1;
    var _setImmediate2 = _interopRequireDefault(_setImmediate);
    var _wrapAsync = requireWrapAsync();
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    function asyncify2(func) {
      if ((0, _wrapAsync.isAsync)(func)) {
        return function(...args) {
          const callback = args.pop();
          const promise = func.apply(this, args);
          return handlePromise(promise, callback);
        };
      }
      return (0, _initialParams2.default)(function(args, callback) {
        var result;
        try {
          result = func.apply(this, args);
        } catch (e) {
          return callback(e);
        }
        if (result && typeof result.then === "function") {
          return handlePromise(result, callback);
        } else {
          callback(null, result);
        }
      });
    }
    function handlePromise(promise, callback) {
      return promise.then((value) => {
        invokeCallback(callback, null, value);
      }, (err) => {
        invokeCallback(callback, err && (err instanceof Error || err.message) ? err : new Error(err));
      });
    }
    function invokeCallback(callback, error, value) {
      try {
        callback(error, value);
      } catch (err) {
        (0, _setImmediate2.default)((e) => {
          throw e;
        }, err);
      }
    }
    module.exports = exports.default;
  })(asyncify, asyncify.exports);
  return asyncify.exports;
}
var hasRequiredWrapAsync;
function requireWrapAsync() {
  if (hasRequiredWrapAsync)
    return wrapAsync;
  hasRequiredWrapAsync = 1;
  Object.defineProperty(wrapAsync, "__esModule", {
    value: true
  });
  wrapAsync.isAsyncIterable = wrapAsync.isAsyncGenerator = wrapAsync.isAsync = void 0;
  var _asyncify = requireAsyncify();
  var _asyncify2 = _interopRequireDefault(_asyncify);
  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : { default: obj };
  }
  function isAsync(fn) {
    return fn[Symbol.toStringTag] === "AsyncFunction";
  }
  function isAsyncGenerator(fn) {
    return fn[Symbol.toStringTag] === "AsyncGenerator";
  }
  function isAsyncIterable(obj) {
    return typeof obj[Symbol.asyncIterator] === "function";
  }
  function wrapAsync$1(asyncFn) {
    if (typeof asyncFn !== "function")
      throw new Error("expected a function");
    return isAsync(asyncFn) ? (0, _asyncify2.default)(asyncFn) : asyncFn;
  }
  wrapAsync.default = wrapAsync$1;
  wrapAsync.isAsync = isAsync;
  wrapAsync.isAsyncGenerator = isAsyncGenerator;
  wrapAsync.isAsyncIterable = isAsyncIterable;
  return wrapAsync;
}
(function(module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = queue2;
  var _onlyOnce = onlyOnceExports;
  var _onlyOnce2 = _interopRequireDefault(_onlyOnce);
  var _setImmediate = setImmediate$1;
  var _setImmediate2 = _interopRequireDefault(_setImmediate);
  var _DoublyLinkedList = DoublyLinkedListExports;
  var _DoublyLinkedList2 = _interopRequireDefault(_DoublyLinkedList);
  var _wrapAsync = requireWrapAsync();
  var _wrapAsync2 = _interopRequireDefault(_wrapAsync);
  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : { default: obj };
  }
  function queue2(worker, concurrency, payload) {
    if (concurrency == null) {
      concurrency = 1;
    } else if (concurrency === 0) {
      throw new RangeError("Concurrency must not be zero");
    }
    var _worker = (0, _wrapAsync2.default)(worker);
    var numRunning = 0;
    var workersList = [];
    const events = {
      error: [],
      drain: [],
      saturated: [],
      unsaturated: [],
      empty: []
    };
    function on(event, handler) {
      events[event].push(handler);
    }
    function once(event, handler) {
      const handleAndRemove = (...args) => {
        off(event, handleAndRemove);
        handler(...args);
      };
      events[event].push(handleAndRemove);
    }
    function off(event, handler) {
      if (!event)
        return Object.keys(events).forEach((ev) => events[ev] = []);
      if (!handler)
        return events[event] = [];
      events[event] = events[event].filter((ev) => ev !== handler);
    }
    function trigger(event, ...args) {
      events[event].forEach((handler) => handler(...args));
    }
    var processingScheduled = false;
    function _insert(data, insertAtFront, rejectOnError, callback) {
      if (callback != null && typeof callback !== "function") {
        throw new Error("task callback must be a function");
      }
      q.started = true;
      var res, rej;
      function promiseCallback(err, ...args) {
        if (err)
          return rejectOnError ? rej(err) : res();
        if (args.length <= 1)
          return res(args[0]);
        res(args);
      }
      var item = q._createTaskItem(data, rejectOnError ? promiseCallback : callback || promiseCallback);
      if (insertAtFront) {
        q._tasks.unshift(item);
      } else {
        q._tasks.push(item);
      }
      if (!processingScheduled) {
        processingScheduled = true;
        (0, _setImmediate2.default)(() => {
          processingScheduled = false;
          q.process();
        });
      }
      if (rejectOnError || !callback) {
        return new Promise((resolve, reject) => {
          res = resolve;
          rej = reject;
        });
      }
    }
    function _createCB(tasks) {
      return function(err, ...args) {
        numRunning -= 1;
        for (var i = 0, l = tasks.length; i < l; i++) {
          var task = tasks[i];
          var index = workersList.indexOf(task);
          if (index === 0) {
            workersList.shift();
          } else if (index > 0) {
            workersList.splice(index, 1);
          }
          task.callback(err, ...args);
          if (err != null) {
            trigger("error", err, task.data);
          }
        }
        if (numRunning <= q.concurrency - q.buffer) {
          trigger("unsaturated");
        }
        if (q.idle()) {
          trigger("drain");
        }
        q.process();
      };
    }
    function _maybeDrain(data) {
      if (data.length === 0 && q.idle()) {
        (0, _setImmediate2.default)(() => trigger("drain"));
        return true;
      }
      return false;
    }
    const eventMethod = (name) => (handler) => {
      if (!handler) {
        return new Promise((resolve, reject) => {
          once(name, (err, data) => {
            if (err)
              return reject(err);
            resolve(data);
          });
        });
      }
      off(name);
      on(name, handler);
    };
    var isProcessing = false;
    var q = {
      _tasks: new _DoublyLinkedList2.default(),
      _createTaskItem(data, callback) {
        return {
          data,
          callback
        };
      },
      *[Symbol.iterator]() {
        yield* q._tasks[Symbol.iterator]();
      },
      concurrency,
      payload,
      buffer: concurrency / 4,
      started: false,
      paused: false,
      push(data, callback) {
        if (Array.isArray(data)) {
          if (_maybeDrain(data))
            return;
          return data.map((datum) => _insert(datum, false, false, callback));
        }
        return _insert(data, false, false, callback);
      },
      pushAsync(data, callback) {
        if (Array.isArray(data)) {
          if (_maybeDrain(data))
            return;
          return data.map((datum) => _insert(datum, false, true, callback));
        }
        return _insert(data, false, true, callback);
      },
      kill() {
        off();
        q._tasks.empty();
      },
      unshift(data, callback) {
        if (Array.isArray(data)) {
          if (_maybeDrain(data))
            return;
          return data.map((datum) => _insert(datum, true, false, callback));
        }
        return _insert(data, true, false, callback);
      },
      unshiftAsync(data, callback) {
        if (Array.isArray(data)) {
          if (_maybeDrain(data))
            return;
          return data.map((datum) => _insert(datum, true, true, callback));
        }
        return _insert(data, true, true, callback);
      },
      remove(testFn) {
        q._tasks.remove(testFn);
      },
      process() {
        if (isProcessing) {
          return;
        }
        isProcessing = true;
        while (!q.paused && numRunning < q.concurrency && q._tasks.length) {
          var tasks = [], data = [];
          var l = q._tasks.length;
          if (q.payload)
            l = Math.min(l, q.payload);
          for (var i = 0; i < l; i++) {
            var node = q._tasks.shift();
            tasks.push(node);
            workersList.push(node);
            data.push(node.data);
          }
          numRunning += 1;
          if (q._tasks.length === 0) {
            trigger("empty");
          }
          if (numRunning === q.concurrency) {
            trigger("saturated");
          }
          var cb = (0, _onlyOnce2.default)(_createCB(tasks));
          _worker(data, cb);
        }
        isProcessing = false;
      },
      length() {
        return q._tasks.length;
      },
      running() {
        return numRunning;
      },
      workersList() {
        return workersList;
      },
      idle() {
        return q._tasks.length + numRunning === 0;
      },
      pause() {
        q.paused = true;
      },
      resume() {
        if (q.paused === false) {
          return;
        }
        q.paused = false;
        (0, _setImmediate2.default)(q.process);
      }
    };
    Object.defineProperties(q, {
      saturated: {
        writable: false,
        value: eventMethod("saturated")
      },
      unsaturated: {
        writable: false,
        value: eventMethod("unsaturated")
      },
      empty: {
        writable: false,
        value: eventMethod("empty")
      },
      drain: {
        writable: false,
        value: eventMethod("drain")
      },
      error: {
        writable: false,
        value: eventMethod("error")
      }
    });
    return q;
  }
  module.exports = exports.default;
})(queue$1, queue$1.exports);
var queueExports$1 = queue$1.exports;
(function(module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = function(worker, concurrency) {
    var _worker = (0, _wrapAsync2.default)(worker);
    return (0, _queue2.default)((items, cb) => {
      _worker(items[0], cb);
    }, concurrency, 1);
  };
  var _queue = queueExports$1;
  var _queue2 = _interopRequireDefault(_queue);
  var _wrapAsync = requireWrapAsync();
  var _wrapAsync2 = _interopRequireDefault(_wrapAsync);
  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : { default: obj };
  }
  module.exports = exports.default;
})(queue$2, queue$2.exports);
var queueExports = queue$2.exports;
const queue = /* @__PURE__ */ getDefaultExportFromCjs(queueExports);
export {
  queue as q
};
