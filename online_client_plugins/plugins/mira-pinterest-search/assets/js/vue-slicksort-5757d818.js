import { x as defineComponent, M as h } from "./@vue-b2585a38.js";
const ElementMixin = defineComponent({
  inject: ["manager"],
  props: {
    index: {
      type: Number,
      required: true
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {};
  },
  watch: {
    index(newIndex) {
      if (this.$el && this.$el.sortableInfo) {
        this.$el.sortableInfo.index = newIndex;
      }
    },
    disabled(isDisabled) {
      if (isDisabled) {
        this.removeDraggable();
      } else {
        this.setDraggable(this.index);
      }
    }
  },
  mounted() {
    const { disabled, index } = this.$props;
    if (!disabled) {
      this.setDraggable(index);
    }
  },
  beforeUnmount() {
    if (!this.disabled)
      this.removeDraggable();
  },
  methods: {
    setDraggable(index) {
      const node = this.$el;
      node.sortableInfo = {
        index,
        manager: this.manager
      };
      this.ref = { node };
      this.manager.add(this.ref);
    },
    removeDraggable() {
      this.manager.remove(this.ref);
    }
  }
});
class Manager {
  constructor() {
    this.refs = [];
    this.active = null;
  }
  add(ref) {
    if (!this.refs) {
      this.refs = [];
    }
    this.refs.push(ref);
  }
  remove(ref) {
    const index = this.getIndex(ref);
    if (index !== -1) {
      this.refs.splice(index, 1);
    }
  }
  isActive() {
    return !!this.active;
  }
  getActive() {
    return this.refs.find(({ node }) => {
      var _a, _b;
      return ((_a = node === null || node === void 0 ? void 0 : node.sortableInfo) === null || _a === void 0 ? void 0 : _a.index) == ((_b = this === null || this === void 0 ? void 0 : this.active) === null || _b === void 0 ? void 0 : _b.index);
    }) || null;
  }
  getIndex(ref) {
    return this.refs.indexOf(ref);
  }
  getRefs() {
    return this.refs;
  }
  getOrderedRefs() {
    return this.refs.sort((a, b) => {
      return a.node.sortableInfo.index - b.node.sortableInfo.index;
    });
  }
}
const isTouch = (e) => {
  return e.touches != null;
};
function hasOwnProperty(obj, prop) {
  return !!obj && Object.prototype.hasOwnProperty.call(obj, prop);
}
function arrayMove(arr, previousIndex, newIndex) {
  const array = arr.slice(0);
  if (newIndex >= array.length) {
    let k = newIndex - array.length;
    while (k-- + 1) {
      array.push(void 0);
    }
  }
  array.splice(newIndex, 0, array.splice(previousIndex, 1)[0]);
  return array;
}
function arrayRemove(arr, previousIndex) {
  const array = arr.slice(0);
  if (previousIndex >= array.length)
    return array;
  array.splice(previousIndex, 1);
  return array;
}
function arrayInsert(arr, newIndex, value) {
  const array = arr.slice(0);
  if (newIndex === array.length) {
    array.push(value);
  } else {
    array.splice(newIndex, 0, value);
  }
  return array;
}
const events = {
  start: ["touchstart", "mousedown"],
  move: ["touchmove", "mousemove"],
  end: ["touchend", "mouseup"],
  cancel: ["touchcancel", "keyup"]
};
function closest(el, fn) {
  while (el) {
    if (fn(el))
      return el;
    el = el.parentNode;
  }
}
function limit(min, max, value) {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}
function getCSSPixelValue(stringValue) {
  if (stringValue.substr(-2) === "px") {
    return parseFloat(stringValue);
  }
  return 0;
}
function getElementMargin(element) {
  const style = window.getComputedStyle(element);
  return {
    top: getCSSPixelValue(style.marginTop),
    right: getCSSPixelValue(style.marginRight),
    bottom: getCSSPixelValue(style.marginBottom),
    left: getCSSPixelValue(style.marginLeft)
  };
}
function getPointerOffset(e, reference = "page") {
  const x = `${reference}X`;
  const y = `${reference}Y`;
  return {
    x: isTouch(e) ? e.touches[0][x] : e[x],
    y: isTouch(e) ? e.touches[0][y] : e[y]
  };
}
function offsetParents(node) {
  const nodes = [node];
  for (; node; node = node.offsetParent) {
    nodes.unshift(node);
  }
  return nodes;
}
function commonOffsetParent(node1, node2) {
  const parents1 = offsetParents(node1);
  const parents2 = offsetParents(node2);
  if (parents1[0] != parents2[0])
    throw "No common ancestor!";
  for (let i = 0; i < parents1.length; i++) {
    if (parents1[i] != parents2[i])
      return parents1[i - 1];
  }
}
function getEdgeOffset(node, container, offset = { top: 0, left: 0 }) {
  if (node) {
    const nodeOffset = {
      top: offset.top + node.offsetTop,
      left: offset.left + node.offsetLeft
    };
    if (node.offsetParent !== container.offsetParent) {
      return getEdgeOffset(node.offsetParent, container, nodeOffset);
    } else {
      return nodeOffset;
    }
  }
  return { top: 0, left: 0 };
}
function cloneNode(node) {
  const fields = node.querySelectorAll("input, textarea, select");
  const clonedNode = node.cloneNode(true);
  const clonedFields = [...clonedNode.querySelectorAll("input, textarea, select")];
  clonedFields.forEach((field, index) => {
    if (field.type !== "file" && fields[index]) {
      field.value = fields[index].value;
    }
  });
  return clonedNode;
}
function getLockPixelOffsets(lockOffset, width, height) {
  if (typeof lockOffset == "string") {
    lockOffset = +lockOffset;
  }
  if (!Array.isArray(lockOffset)) {
    lockOffset = [lockOffset, lockOffset];
  }
  if (lockOffset.length !== 2) {
    throw new Error(`lockOffset prop of SortableContainer should be a single value or an array of exactly two values. Given ${lockOffset}`);
  }
  const [minLockOffset, maxLockOffset] = lockOffset;
  return [getLockPixelOffset(minLockOffset, width, height), getLockPixelOffset(maxLockOffset, width, height)];
}
function getLockPixelOffset(lockOffset, width, height) {
  let offsetX = lockOffset;
  let offsetY = lockOffset;
  let unit = "px";
  if (typeof lockOffset === "string") {
    const match = /^[+-]?\d*(?:\.\d*)?(px|%)$/.exec(lockOffset);
    if (match === null) {
      throw new Error(`lockOffset value should be a number or a string of a number followed by "px" or "%". Given ${lockOffset}`);
    }
    offsetX = offsetY = parseFloat(lockOffset);
    unit = match[1];
  }
  if (!isFinite(offsetX) || !isFinite(offsetY)) {
    throw new Error(`lockOffset value should be a finite. Given ${lockOffset}`);
  }
  if (unit === "%") {
    offsetX = offsetX * width / 100;
    offsetY = offsetY * height / 100;
  }
  return {
    x: offsetX,
    y: offsetY
  };
}
function resetTransform(nodes = []) {
  for (let i = 0, len = nodes.length; i < len; i++) {
    const node = nodes[i];
    const el = node.node;
    if (!el)
      return;
    node.edgeOffset = null;
    setTransform(el);
  }
}
function setTransform(el, transform = "", duration = "") {
  if (!el)
    return;
  el.style["transform"] = transform;
  el.style["transitionDuration"] = duration;
}
const timeout = setTimeout;
const ContainerMixin = defineComponent({
  inject: {
    SlicksortHub: {
      from: "SlicksortHub",
      default: null
    }
  },
  provide() {
    return {
      manager: this.manager
    };
  },
  props: {
    list: { type: Array, required: true },
    axis: { type: String, default: "y" },
    distance: { type: Number, default: 0 },
    pressDelay: { type: Number, default: 0 },
    pressThreshold: { type: Number, default: 5 },
    useDragHandle: { type: Boolean, default: false },
    useWindowAsScrollContainer: { type: Boolean, default: false },
    hideSortableGhost: { type: Boolean, default: true },
    lockToContainerEdges: { type: Boolean, default: false },
    lockOffset: { type: [String, Number, Array], default: "50%" },
    transitionDuration: { type: Number, default: 300 },
    appendTo: { type: String, default: "body" },
    draggedSettlingDuration: { type: Number, default: null },
    group: { type: String, default: "" },
    accept: { type: [Boolean, Array, Function], default: null },
    cancelKey: { type: String, default: "Escape" },
    block: { type: Array, default: () => [] },
    lockAxis: { type: String, default: "" },
    helperClass: { type: String, default: "" },
    contentWindow: { type: Object, default: null },
    shouldCancelStart: {
      type: Function,
      default: (e) => {
        const disabledElements = ["input", "textarea", "select", "option", "button"];
        return disabledElements.indexOf(e.target.tagName.toLowerCase()) !== -1;
      }
    },
    getHelperDimensions: {
      type: Function,
      default: ({ node }) => ({
        width: node.offsetWidth,
        height: node.offsetHeight
      })
    }
  },
  emits: ["sort-start", "sort-move", "sort-end", "sort-cancel", "sort-insert", "sort-remove", "update:list"],
  data() {
    let useHub = false;
    if (this.group) {
      if (this.SlicksortHub) {
        useHub = true;
      }
    }
    return {
      sorting: false,
      hub: useHub ? this.SlicksortHub : null,
      manager: new Manager()
    };
  },
  mounted() {
    if (this.hub) {
      this.id = this.hub.getId();
    }
    this.container = this.$el;
    this.document = this.container.ownerDocument || document;
    this._window = this.contentWindow || window;
    this.scrollContainer = this.useWindowAsScrollContainer ? { scrollLeft: 0, scrollTop: 0 } : this.container;
    this.events = {
      start: this.handleStart,
      move: this.handleMove,
      end: this.handleEnd
    };
    for (const key in this.events) {
      if (hasOwnProperty(this.events, key)) {
        events[key].forEach((eventName) => this.container.addEventListener(eventName, this.events[key]));
      }
    }
    if (this.hub) {
      this.hub.addContainer(this);
    }
  },
  beforeUnmount() {
    for (const key in this.events) {
      if (hasOwnProperty(this.events, key)) {
        events[key].forEach((eventName) => this.container.removeEventListener(eventName, this.events[key]));
      }
    }
    if (this.hub) {
      this.hub.removeContainer(this);
    }
    if (this.dragendTimer)
      clearTimeout(this.dragendTimer);
    if (this.cancelTimer)
      clearTimeout(this.cancelTimer);
    if (this.pressTimer)
      clearTimeout(this.pressTimer);
    if (this.autoscrollInterval)
      clearInterval(this.autoscrollInterval);
  },
  methods: {
    handleStart(e) {
      const { distance, shouldCancelStart } = this.$props;
      if (!isTouch(e) && e.button === 2 || shouldCancelStart(e)) {
        return false;
      }
      this._touched = true;
      this._pos = getPointerOffset(e);
      const target = e.target;
      const node = closest(target, (el) => el.sortableInfo != null);
      if (node && node.sortableInfo && this.nodeIsChild(node) && !this.sorting) {
        const { useDragHandle } = this.$props;
        const { index } = node.sortableInfo;
        if (useDragHandle && !closest(target, (el) => el.sortableHandle != null))
          return;
        this.manager.active = { index };
        if (target.tagName.toLowerCase() === "a") {
          e.preventDefault();
        }
        if (!distance) {
          if (this.pressDelay === 0) {
            this.handlePress(e);
          } else {
            this.pressTimer = timeout(() => this.handlePress(e), this.pressDelay);
          }
        }
      }
    },
    nodeIsChild(node) {
      return node.sortableInfo.manager === this.manager;
    },
    handleMove(e) {
      const { distance, pressThreshold } = this.$props;
      if (!this.sorting && this._touched) {
        const offset = getPointerOffset(e);
        this._delta = {
          x: this._pos.x - offset.x,
          y: this._pos.y - offset.y
        };
        const delta = Math.abs(this._delta.x) + Math.abs(this._delta.y);
        if (!distance && (!pressThreshold || pressThreshold && delta >= pressThreshold)) {
          if (this.cancelTimer)
            clearTimeout(this.cancelTimer);
          this.cancelTimer = timeout(this.cancel, 0);
        } else if (distance && delta >= distance && this.manager.isActive()) {
          this.handlePress(e);
        }
      }
    },
    handleEnd() {
      if (!this._touched)
        return;
      const { distance } = this.$props;
      this._touched = false;
      if (!distance) {
        this.cancel();
      }
    },
    cancel() {
      if (!this.sorting) {
        if (this.pressTimer)
          clearTimeout(this.pressTimer);
        this.manager.active = null;
        if (this.hub)
          this.hub.cancel();
      }
    },
    handleSortCancel(e) {
      if (isTouch(e) || e.key === this.cancelKey) {
        this.newIndex = this.index;
        this.canceling = true;
        this.translate = { x: 0, y: 0 };
        this.animateNodes();
        this.handleSortEnd(e);
      }
    },
    handlePress(e) {
      e.stopPropagation();
      const active = this.manager.getActive();
      if (active) {
        const { getHelperDimensions, helperClass, hideSortableGhost, appendTo } = this.$props;
        const { node } = active;
        const { index } = node.sortableInfo;
        const margin = getElementMargin(node);
        const containerBoundingRect = this.container.getBoundingClientRect();
        const dimensions = getHelperDimensions({ index, node });
        this.node = node;
        this.margin = margin;
        this.width = dimensions.width;
        this.height = dimensions.height;
        this.marginOffset = {
          x: this.margin.left + this.margin.right,
          y: Math.max(this.margin.top, this.margin.bottom)
        };
        this.boundingClientRect = node.getBoundingClientRect();
        this.containerBoundingRect = containerBoundingRect;
        this.index = index;
        this.newIndex = index;
        const clonedNode = cloneNode(node);
        this.helper = this.document.querySelector(appendTo).appendChild(clonedNode);
        this.helper.style.position = "fixed";
        this.helper.style.top = `${this.boundingClientRect.top - margin.top}px`;
        this.helper.style.left = `${this.boundingClientRect.left - margin.left}px`;
        this.helper.style.width = `${this.width}px`;
        this.helper.style.height = `${this.height}px`;
        this.helper.style.boxSizing = "border-box";
        this.helper.style.pointerEvents = "none";
        if (hideSortableGhost) {
          this.sortableGhost = node;
          node.style.visibility = "hidden";
          node.style.opacity = "0";
        }
        if (this.hub) {
          this.hub.sortStart(this);
          this.hub.helper = this.helper;
          this.hub.ghost = this.sortableGhost;
        }
        this.intializeOffsets(e, this.boundingClientRect);
        this.offsetEdge = getEdgeOffset(node, this.container);
        if (helperClass) {
          this.helper.classList.add(...helperClass.split(" "));
        }
        this.listenerNode = isTouch(e) ? node : this._window;
        events.move.forEach((eventName) => this.listenerNode.addEventListener(eventName, this.handleSortMove));
        events.end.forEach((eventName) => this.listenerNode.addEventListener(eventName, this.handleSortEnd));
        events.cancel.forEach((eventName) => this.listenerNode.addEventListener(eventName, this.handleSortCancel));
        this.sorting = true;
        this.$emit("sort-start", { event: e, node, index });
      }
    },
    handleSortMove(e) {
      e.preventDefault();
      this.updatePosition(e);
      if (this.hub) {
        const payload = this.list[this.index];
        this.hub.handleSortMove(e, payload);
      }
      if (!this.hub || this.hub.isDest(this)) {
        this.animateNodes();
        this.autoscroll();
      }
      this.$emit("sort-move", { event: e });
    },
    handleDropOut() {
      const removed = this.list[this.index];
      const newValue = arrayRemove(this.list, this.index);
      this.$emit("sort-remove", {
        oldIndex: this.index
      });
      this.$emit("update:list", newValue);
      return removed;
    },
    handleDropIn(payload) {
      const newValue = arrayInsert(this.list, this.newIndex, payload);
      this.$emit("sort-insert", {
        newIndex: this.newIndex,
        value: payload
      });
      this.$emit("update:list", newValue);
      this.handleDragEnd();
    },
    handleDragOut() {
      if (this.autoscrollInterval) {
        clearInterval(this.autoscrollInterval);
        this.autoscrollInterval = null;
      }
      if (this.hub.isSource(this)) {
        this.translate = {
          x: 1e4,
          y: 1e4
        };
        this.animateNodes();
      } else {
        this.manager.getRefs().forEach((ref) => {
          ref.node.style["transform"] = "";
        });
        this.dragendTimer = timeout(this.handleDragEnd, this.transitionDuration || 0);
      }
    },
    handleDragEnd() {
      if (this.autoscrollInterval) {
        clearInterval(this.autoscrollInterval);
        this.autoscrollInterval = null;
      }
      resetTransform(this.manager.getRefs());
      if (this.sortableGhost) {
        this.sortableGhost.remove();
        this.sortableGhost = null;
      }
      if (this.dragendTimer) {
        clearTimeout(this.dragendTimer);
        this.dragendTimer = null;
      }
      this.manager.active = null;
      this._touched = false;
      this.sorting = false;
    },
    intializeOffsets(e, clientRect) {
      const { useWindowAsScrollContainer, containerBoundingRect, _window } = this;
      this.marginOffset = {
        x: this.margin.left + this.margin.right,
        y: Math.max(this.margin.top, this.margin.bottom)
      };
      this._axis = {
        x: this.axis.indexOf("x") >= 0,
        y: this.axis.indexOf("y") >= 0
      };
      this.initialOffset = getPointerOffset(e);
      this.initialScroll = {
        top: this.scrollContainer.scrollTop,
        left: this.scrollContainer.scrollLeft
      };
      this.initialWindowScroll = {
        top: window.pageYOffset,
        left: window.pageXOffset
      };
      this.translate = { x: 0, y: 0 };
      this.minTranslate = {};
      this.maxTranslate = {};
      if (this._axis.x) {
        this.minTranslate.x = (useWindowAsScrollContainer ? 0 : containerBoundingRect.left) - clientRect.left - this.width / 2;
        this.maxTranslate.x = (useWindowAsScrollContainer ? _window.innerWidth : containerBoundingRect.left + containerBoundingRect.width) - clientRect.left - this.width / 2;
      }
      if (this._axis.y) {
        this.minTranslate.y = (useWindowAsScrollContainer ? 0 : containerBoundingRect.top) - clientRect.top - this.height / 2;
        this.maxTranslate.y = (useWindowAsScrollContainer ? _window.innerHeight : containerBoundingRect.top + containerBoundingRect.height) - clientRect.top - this.height / 2;
      }
    },
    handleDragIn(e, sortableGhost, helper) {
      if (this.hub.isSource(this)) {
        return;
      }
      if (this.dragendTimer) {
        this.handleDragEnd();
        clearTimeout(this.dragendTimer);
        this.dragendTimer = null;
      }
      const nodes = this.manager.getRefs();
      this.index = nodes.length;
      this.manager.active = { index: this.index };
      const containerBoundingRect = this.container.getBoundingClientRect();
      const helperBoundingRect = helper.getBoundingClientRect();
      this.containerBoundingRect = containerBoundingRect;
      this.sortableGhost = cloneNode(sortableGhost);
      this.container.appendChild(this.sortableGhost);
      const ghostRect = this.sortableGhost.getBoundingClientRect();
      this.boundingClientRect = ghostRect;
      this.margin = getElementMargin(this.sortableGhost);
      this.width = ghostRect.width;
      this.height = ghostRect.height;
      this.offsetEdge = getEdgeOffset(this.sortableGhost, this.container);
      this.intializeOffsets(e, ghostRect);
      this.initialOffset.x += ghostRect.x - helperBoundingRect.x;
      this.initialOffset.y += ghostRect.y - helperBoundingRect.y;
      this.sorting = true;
    },
    handleSortEnd(e) {
      if (this.listenerNode) {
        events.move.forEach((eventName) => (
          // @ts-ignore
          this.listenerNode.removeEventListener(eventName, this.handleSortMove)
        ));
        events.end.forEach((eventName) => (
          // @ts-ignore
          this.listenerNode.removeEventListener(eventName, this.handleSortEnd)
        ));
        events.cancel.forEach((eventName) => (
          // @ts-ignore
          this.listenerNode.removeEventListener(eventName, this.handleSortCancel)
        ));
      }
      const nodes = this.manager.getRefs();
      if (this.helper && this.helperClass) {
        this.helper.classList.remove(...this.helperClass.split(" "));
      }
      if (this.autoscrollInterval)
        clearInterval(this.autoscrollInterval);
      this.autoscrollInterval = null;
      const onEnd = () => {
        if (this.helper) {
          this.helper.remove();
          this.helper = null;
        }
        if (this.hideSortableGhost && this.sortableGhost) {
          this.sortableGhost.style.visibility = "";
          this.sortableGhost.style.opacity = "";
        }
        resetTransform(nodes);
        if (this.hub && !this.hub.isDest(this)) {
          this.canceling ? this.hub.cancel() : this.hub.handleSortEnd();
        } else if (this.canceling) {
          this.$emit("sort-cancel", { event: e });
        } else {
          this.$emit("sort-end", {
            event: e,
            oldIndex: this.index,
            newIndex: this.newIndex
          });
          this.$emit("update:list", arrayMove(this.list, this.index, this.newIndex));
        }
        this.manager.active = null;
        this._touched = false;
        this.canceling = false;
        this.sorting = false;
      };
      if (this.transitionDuration || this.draggedSettlingDuration) {
        this.transitionHelperIntoPlace(nodes, onEnd);
      } else {
        onEnd();
      }
    },
    transitionHelperIntoPlace(nodes, cb) {
      if (this.draggedSettlingDuration === 0 || nodes.length === 0 || !this.helper) {
        return Promise.resolve();
      }
      const indexNode = nodes[this.index].node;
      let targetX = 0;
      let targetY = 0;
      const scrollDifference = {
        top: window.pageYOffset - this.initialWindowScroll.top,
        left: window.pageXOffset - this.initialWindowScroll.left
      };
      if (this.hub && !this.hub.isDest(this) && !this.canceling) {
        const dest = this.hub.getDest();
        if (!dest)
          return;
        const destIndex = dest.newIndex;
        const destRefs = dest.manager.getOrderedRefs();
        const destNode = destIndex < destRefs.length ? destRefs[destIndex].node : dest.sortableGhost;
        const ancestor = commonOffsetParent(indexNode, destNode);
        const sourceOffset = getEdgeOffset(indexNode, ancestor);
        const targetOffset = getEdgeOffset(destNode, ancestor);
        targetX = targetOffset.left - sourceOffset.left - scrollDifference.left;
        targetY = targetOffset.top - sourceOffset.top - scrollDifference.top;
      } else {
        const newIndexNode = nodes[this.newIndex].node;
        const deltaScroll = {
          left: this.scrollContainer.scrollLeft - this.initialScroll.left + scrollDifference.left,
          top: this.scrollContainer.scrollTop - this.initialScroll.top + scrollDifference.top
        };
        targetX = -deltaScroll.left;
        if (this.translate && this.translate.x > 0) {
          targetX += newIndexNode.offsetLeft + newIndexNode.offsetWidth - (indexNode.offsetLeft + indexNode.offsetWidth);
        } else {
          targetX += newIndexNode.offsetLeft - indexNode.offsetLeft;
        }
        targetY = -deltaScroll.top;
        if (this.translate && this.translate.y > 0) {
          targetY += newIndexNode.offsetTop + newIndexNode.offsetHeight - (indexNode.offsetTop + indexNode.offsetHeight);
        } else {
          targetY += newIndexNode.offsetTop - indexNode.offsetTop;
        }
      }
      const duration = this.draggedSettlingDuration !== null ? this.draggedSettlingDuration : this.transitionDuration;
      setTransform(this.helper, `translate3d(${targetX}px,${targetY}px, 0)`, `${duration}ms`);
      const cleanup = (event) => {
        if (!event || event.propertyName === "transform") {
          clearTimeout(cleanupTimer);
          setTransform(this.helper);
          cb();
        }
      };
      const cleanupTimer = setTimeout(cleanup, duration + 10);
      this.helper.addEventListener("transitionend", cleanup);
    },
    updatePosition(e) {
      const { lockAxis, lockToContainerEdges } = this.$props;
      const offset = getPointerOffset(e);
      const translate = {
        x: offset.x - this.initialOffset.x,
        y: offset.y - this.initialOffset.y
      };
      translate.y -= window.pageYOffset - this.initialWindowScroll.top;
      translate.x -= window.pageXOffset - this.initialWindowScroll.left;
      this.translate = translate;
      if (lockToContainerEdges) {
        const [minLockOffset, maxLockOffset] = getLockPixelOffsets(this.lockOffset, this.height, this.width);
        const minOffset = {
          x: this.width / 2 - minLockOffset.x,
          y: this.height / 2 - minLockOffset.y
        };
        const maxOffset = {
          x: this.width / 2 - maxLockOffset.x,
          y: this.height / 2 - maxLockOffset.y
        };
        if (this.minTranslate.x && this.maxTranslate.x)
          translate.x = limit(this.minTranslate.x + minOffset.x, this.maxTranslate.x - maxOffset.x, translate.x);
        if (this.minTranslate.y && this.maxTranslate.y)
          translate.y = limit(this.minTranslate.y + minOffset.y, this.maxTranslate.y - maxOffset.y, translate.y);
      }
      if (lockAxis === "x") {
        translate.y = 0;
      } else if (lockAxis === "y") {
        translate.x = 0;
      }
      if (this.helper) {
        this.helper.style["transform"] = `translate3d(${translate.x}px,${translate.y}px, 0)`;
      }
    },
    animateNodes() {
      const { transitionDuration, hideSortableGhost } = this.$props;
      const nodes = this.manager.getOrderedRefs();
      const deltaScroll = {
        left: this.scrollContainer.scrollLeft - this.initialScroll.left,
        top: this.scrollContainer.scrollTop - this.initialScroll.top
      };
      const sortingOffset = {
        left: this.offsetEdge.left + this.translate.x + deltaScroll.left,
        top: this.offsetEdge.top + this.translate.y + deltaScroll.top
      };
      const scrollDifference = {
        top: window.pageYOffset - this.initialWindowScroll.top,
        left: window.pageXOffset - this.initialWindowScroll.left
      };
      this.newIndex = null;
      for (let i = 0, len = nodes.length; i < len; i++) {
        const { node } = nodes[i];
        const index = node.sortableInfo.index;
        const width = node.offsetWidth;
        const height = node.offsetHeight;
        const offset = {
          width: this.width > width ? width / 2 : this.width / 2,
          height: this.height > height ? height / 2 : this.height / 2
        };
        const translate = {
          x: 0,
          y: 0
        };
        let { edgeOffset } = nodes[i];
        if (!edgeOffset) {
          nodes[i].edgeOffset = edgeOffset = getEdgeOffset(node, this.container);
        }
        const nextNode = i < nodes.length - 1 && nodes[i + 1];
        const prevNode = i > 0 && nodes[i - 1];
        if (nextNode && !nextNode.edgeOffset) {
          nextNode.edgeOffset = getEdgeOffset(nextNode.node, this.container);
        }
        if (index === this.index) {
          if (hideSortableGhost) {
            this.sortableGhost = node;
            node.style.visibility = "hidden";
            node.style.opacity = "0";
          }
          continue;
        }
        if (transitionDuration) {
          node.style["transitionDuration"] = `${transitionDuration}ms`;
        }
        if (this._axis.x) {
          if (this._axis.y) {
            if (index < this.index && (sortingOffset.left + scrollDifference.left - offset.width <= edgeOffset.left && sortingOffset.top + scrollDifference.top <= edgeOffset.top + offset.height || sortingOffset.top + scrollDifference.top + offset.height <= edgeOffset.top)) {
              translate.x = this.width + this.marginOffset.x;
              if (edgeOffset.left + translate.x > this.containerBoundingRect.width - offset.width && nextNode) {
                translate.x = nextNode.edgeOffset.left - edgeOffset.left;
                translate.y = nextNode.edgeOffset.top - edgeOffset.top;
              }
              if (this.newIndex === null) {
                this.newIndex = index;
              }
            } else if (index > this.index && (sortingOffset.left + scrollDifference.left + offset.width >= edgeOffset.left && sortingOffset.top + scrollDifference.top + offset.height >= edgeOffset.top || sortingOffset.top + scrollDifference.top + offset.height >= edgeOffset.top + height)) {
              translate.x = -(this.width + this.marginOffset.x);
              if (edgeOffset.left + translate.x < this.containerBoundingRect.left + offset.width && prevNode) {
                translate.x = prevNode.edgeOffset.left - edgeOffset.left;
                translate.y = prevNode.edgeOffset.top - edgeOffset.top;
              }
              this.newIndex = index;
            }
          } else {
            if (index > this.index && sortingOffset.left + scrollDifference.left + offset.width >= edgeOffset.left) {
              translate.x = -(this.width + this.marginOffset.x);
              this.newIndex = index;
            } else if (index < this.index && sortingOffset.left + scrollDifference.left <= edgeOffset.left + offset.width) {
              translate.x = this.width + this.marginOffset.x;
              if (this.newIndex == null) {
                this.newIndex = index;
              }
            }
          }
        } else if (this._axis.y) {
          if (index > this.index && sortingOffset.top + scrollDifference.top + offset.height >= edgeOffset.top) {
            translate.y = -(this.height + this.marginOffset.y);
            this.newIndex = index;
          } else if (index < this.index && sortingOffset.top + scrollDifference.top <= edgeOffset.top + offset.height) {
            translate.y = this.height + this.marginOffset.y;
            if (this.newIndex == null) {
              this.newIndex = index;
            }
          }
        }
        node.style["transform"] = `translate3d(${translate.x}px,${translate.y}px,0)`;
      }
      if (this.newIndex == null) {
        this.newIndex = this.index;
      }
    },
    autoscroll() {
      const translate = this.translate;
      const direction = {
        x: 0,
        y: 0
      };
      const speed = {
        x: 1,
        y: 1
      };
      const acceleration = {
        x: 10,
        y: 10
      };
      if (translate.y >= this.maxTranslate.y - this.height / 2) {
        direction.y = 1;
        speed.y = acceleration.y * Math.abs((this.maxTranslate.y - this.height / 2 - translate.y) / this.height);
      } else if (translate.x >= this.maxTranslate.x - this.width / 2) {
        direction.x = 1;
        speed.x = acceleration.x * Math.abs((this.maxTranslate.x - this.width / 2 - translate.x) / this.width);
      } else if (translate.y <= this.minTranslate.y + this.height / 2) {
        direction.y = -1;
        speed.y = acceleration.y * Math.abs((translate.y - this.height / 2 - this.minTranslate.y) / this.height);
      } else if (translate.x <= this.minTranslate.x + this.width / 2) {
        direction.x = -1;
        speed.x = acceleration.x * Math.abs((translate.x - this.width / 2 - this.minTranslate.x) / this.width);
      }
      if (this.autoscrollInterval) {
        clearInterval(this.autoscrollInterval);
        this.autoscrollInterval = null;
      }
      if (direction.x !== 0 || direction.y !== 0) {
        this.autoscrollInterval = window.setInterval(() => {
          const offset = {
            left: 1 * speed.x * direction.x,
            top: 1 * speed.y * direction.y
          };
          if (this.useWindowAsScrollContainer) {
            this._window.scrollBy(offset.left, offset.top);
          } else {
            this.scrollContainer.scrollTop += offset.top;
            this.scrollContainer.scrollLeft += offset.left;
          }
          this.translate.x += offset.left;
          this.translate.y += offset.top;
          this.animateNodes();
        }, 5);
      }
    }
  }
});
const SlickItem = defineComponent({
  name: "SlickItem",
  mixins: [ElementMixin],
  props: {
    tag: {
      type: String,
      default: "div"
    }
  },
  render() {
    var _a, _b;
    return h(this.tag, (_b = (_a = this.$slots).default) === null || _b === void 0 ? void 0 : _b.call(_a));
  }
});
const SlickList = defineComponent({
  name: "SlickList",
  mixins: [ContainerMixin],
  props: {
    tag: {
      type: String,
      default: "div"
    },
    itemKey: {
      type: [String, Function],
      default: "id"
    }
  },
  render() {
    var _a, _b;
    if (this.$slots.item) {
      return h(this.tag, this.list.map((item, index) => {
        let key;
        if (item == null) {
          return;
        } else if (typeof this.itemKey === "function") {
          key = this.itemKey(item);
        } else if (typeof item === "object" && hasOwnProperty(item, this.itemKey) && typeof item[this.itemKey] == "string") {
          key = item[this.itemKey];
        } else if (typeof item === "string") {
          key = item;
        } else {
          throw new Error("Cannot find key for item, use the item-key prop and pass a function or string");
        }
        return h(SlickItem, {
          key,
          index
        }, {
          default: () => {
            var _a2, _b2;
            return (_b2 = (_a2 = this.$slots).item) === null || _b2 === void 0 ? void 0 : _b2.call(_a2, { item, index });
          }
        });
      }));
    }
    return h(this.tag, (_b = (_a = this.$slots).default) === null || _b === void 0 ? void 0 : _b.call(_a));
  }
});
export {
  SlickItem as S,
  SlickList as a
};
