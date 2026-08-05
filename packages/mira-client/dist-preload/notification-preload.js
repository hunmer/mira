"use strict";
const { ipcRenderer, contextBridge } = require("electron");
console.log("🔔 通知窗口 preload 已加载");
ipcRenderer.on("connect", (event, payload) => {
  console.log("🔔 preload 收到 connect 消息:", payload);
  const [port] = event.ports;
  if (port) {
    console.log("🔔 转发 MessagePort 到 DOM");
    window.dispatchEvent(new MessageEvent("message", {
      data: payload,
      // { role: 'notification' }
      ports: [port],
      // 关键：把 MessagePort 转过去
      origin: location.origin
    }));
  } else {
    console.error("❌ preload 未收到 MessagePort");
  }
});
contextBridge.exposeInMainWorld("electronAPI", {
  // IPC 监听器
  on: (channel, callback) => {
    const validChannels = ["notification-handler-message"];
    if (validChannels.includes(channel)) {
      ipcRenderer.removeAllListeners(channel);
      ipcRenderer.on(channel, callback);
    }
  },
  // 移除监听器
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },
  // 发送消息到主进程
  send: (channel, data) => {
    const validChannels = ["notification-response"];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  // 调用主进程方法
  invoke: (channel, ...args) => {
    const validChannels = [
      "notification-window:show",
      "notification-window:hide",
      "notification-window:dismiss"
    ];
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
  }
});
console.log("🔔 通知窗口 preload 初始化完成");
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90aWZpY2F0aW9uLXByZWxvYWQuanMiLCJzb3VyY2VzIjpbIi4uL3NyYy9wcmVsb2FkL25vdGlmaWNhdGlvbi1wcmVsb2FkLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICog6YCa55+l56qX5Y+j5LiT55SoIHByZWxvYWQg6ISa5pysXG4gKiDkvZzkuLogSVBDIOWSjCBET00g5LmL6Ze055qE5qGl5o6l5Zmo77yI5LiOIHNlYXJjaC1wcmVsb2FkIOe7k+aehOS4gOiHtO+8iVxuICovXG5jb25zdCB7IGlwY1JlbmRlcmVyLCBjb250ZXh0QnJpZGdlIH0gPSByZXF1aXJlKCdlbGVjdHJvbicpO1xuXG5jb25zb2xlLmxvZygn8J+UlCDpgJrnn6Xnqpflj6MgcHJlbG9hZCDlt7LliqDovb0nKTtcblxuLy8g5LuO5Li76L+b56iL5pS25YiwIE1lc3NhZ2VQb3J0TWFpbu+8jOi9rOWPkeS4uiBET00gbWVzc2FnZe+8iOW4piBwb3J0c++8iVxuaXBjUmVuZGVyZXIub24oJ2Nvbm5lY3QnLCAoZXZlbnQsIHBheWxvYWQpID0+IHtcbiAgY29uc29sZS5sb2coJ/CflJQgcHJlbG9hZCDmlLbliLAgY29ubmVjdCDmtojmga86JywgcGF5bG9hZCk7XG5cbiAgY29uc3QgW3BvcnRdID0gZXZlbnQucG9ydHM7XG4gIGlmIChwb3J0KSB7XG4gICAgY29uc29sZS5sb2coJ/CflJQg6L2s5Y+RIE1lc3NhZ2VQb3J0IOWIsCBET00nKTtcbiAgICAvLyDnlKggRE9NIOeahCBNZXNzYWdlRXZlbnQg6L2s57uZ55yf5q2j55qE6aG16Z2i546v5aKDXG4gICAgd2luZG93LmRpc3BhdGNoRXZlbnQobmV3IE1lc3NhZ2VFdmVudCgnbWVzc2FnZScsIHtcbiAgICAgIGRhdGE6IHBheWxvYWQsICAgICAgICAvLyB7IHJvbGU6ICdub3RpZmljYXRpb24nIH1cbiAgICAgIHBvcnRzOiBbcG9ydF0sICAgICAgICAvLyDlhbPplK7vvJrmioogTWVzc2FnZVBvcnQg6L2s6L+H5Y67XG4gICAgICBvcmlnaW46IGxvY2F0aW9uLm9yaWdpbixcbiAgICB9KSk7XG4gIH0gZWxzZSB7XG4gICAgY29uc29sZS5lcnJvcign4p2MIHByZWxvYWQg5pyq5pS25YiwIE1lc3NhZ2VQb3J0Jyk7XG4gIH1cbn0pO1xuXG4vLyDmmrTpnLLnu5nmuLLmn5Pov5vnqIvnmoQgQVBJXG5jb250ZXh0QnJpZGdlLmV4cG9zZUluTWFpbldvcmxkKCdlbGVjdHJvbkFQSScsIHtcbiAgLy8gSVBDIOebkeWQrOWZqFxuICBvbjogKGNoYW5uZWwsIGNhbGxiYWNrKSA9PiB7XG4gICAgY29uc3QgdmFsaWRDaGFubmVscyA9IFsnbm90aWZpY2F0aW9uLWhhbmRsZXItbWVzc2FnZSddO1xuICAgIGlmICh2YWxpZENoYW5uZWxzLmluY2x1ZGVzKGNoYW5uZWwpKSB7XG4gICAgICBpcGNSZW5kZXJlci5yZW1vdmVBbGxMaXN0ZW5lcnMoY2hhbm5lbCk7XG4gICAgICBpcGNSZW5kZXJlci5vbihjaGFubmVsLCBjYWxsYmFjayk7XG4gICAgfVxuICB9LFxuXG4gIC8vIOenu+mZpOebkeWQrOWZqFxuICByZW1vdmVBbGxMaXN0ZW5lcnM6IChjaGFubmVsKSA9PiB7XG4gICAgaXBjUmVuZGVyZXIucmVtb3ZlQWxsTGlzdGVuZXJzKGNoYW5uZWwpO1xuICB9LFxuXG4gIC8vIOWPkemAgea2iOaBr+WIsOS4u+i/m+eoi1xuICBzZW5kOiAoY2hhbm5lbCwgZGF0YSkgPT4ge1xuICAgIGNvbnN0IHZhbGlkQ2hhbm5lbHMgPSBbJ25vdGlmaWNhdGlvbi1yZXNwb25zZSddO1xuICAgIGlmICh2YWxpZENoYW5uZWxzLmluY2x1ZGVzKGNoYW5uZWwpKSB7XG4gICAgICBpcGNSZW5kZXJlci5zZW5kKGNoYW5uZWwsIGRhdGEpO1xuICAgIH1cbiAgfSxcblxuICAvLyDosIPnlKjkuLvov5vnqIvmlrnms5VcbiAgaW52b2tlOiAoY2hhbm5lbCwgLi4uYXJncykgPT4ge1xuICAgIGNvbnN0IHZhbGlkQ2hhbm5lbHMgPSBbXG4gICAgICAnbm90aWZpY2F0aW9uLXdpbmRvdzpzaG93JyxcbiAgICAgICdub3RpZmljYXRpb24td2luZG93OmhpZGUnLFxuICAgICAgJ25vdGlmaWNhdGlvbi13aW5kb3c6ZGlzbWlzcydcbiAgICBdO1xuICAgIGlmICh2YWxpZENoYW5uZWxzLmluY2x1ZGVzKGNoYW5uZWwpKSB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKGNoYW5uZWwsIC4uLmFyZ3MpO1xuICAgIH1cbiAgfVxufSk7XG5cbmNvbnNvbGUubG9nKCfwn5SUIOmAmuefpeeql+WPoyBwcmVsb2FkIOWIneWni+WMluWujOaIkCcpO1xuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFJQSxNQUFNLEVBQUUsYUFBYSxrQkFBa0IsUUFBUSxVQUFVO0FBRXpELFFBQVEsSUFBSSxxQkFBcUI7QUFHakMsWUFBWSxHQUFHLFdBQVcsQ0FBQyxPQUFPLFlBQVk7QUFDNUMsVUFBUSxJQUFJLDZCQUE2QixPQUFPO0FBRWhELFFBQU0sQ0FBQyxJQUFJLElBQUksTUFBTTtBQUNyQixNQUFJLE1BQU07QUFDUixZQUFRLElBQUkseUJBQXlCO0FBRXJDLFdBQU8sY0FBYyxJQUFJLGFBQWEsV0FBVztBQUFBLE1BQy9DLE1BQU07QUFBQTtBQUFBLE1BQ04sT0FBTyxDQUFDLElBQUk7QUFBQTtBQUFBLE1BQ1osUUFBUSxTQUFTO0FBQUEsSUFDdkIsQ0FBSyxDQUFDO0FBQUEsRUFDSixPQUFPO0FBQ0wsWUFBUSxNQUFNLDJCQUEyQjtBQUFBLEVBQzNDO0FBQ0YsQ0FBQztBQUdELGNBQWMsa0JBQWtCLGVBQWU7QUFBQTtBQUFBLEVBRTdDLElBQUksQ0FBQyxTQUFTLGFBQWE7QUFDekIsVUFBTSxnQkFBZ0IsQ0FBQyw4QkFBOEI7QUFDckQsUUFBSSxjQUFjLFNBQVMsT0FBTyxHQUFHO0FBQ25DLGtCQUFZLG1CQUFtQixPQUFPO0FBQ3RDLGtCQUFZLEdBQUcsU0FBUyxRQUFRO0FBQUEsSUFDbEM7QUFBQSxFQUNGO0FBQUE7QUFBQSxFQUdBLG9CQUFvQixDQUFDLFlBQVk7QUFDL0IsZ0JBQVksbUJBQW1CLE9BQU87QUFBQSxFQUN4QztBQUFBO0FBQUEsRUFHQSxNQUFNLENBQUMsU0FBUyxTQUFTO0FBQ3ZCLFVBQU0sZ0JBQWdCLENBQUMsdUJBQXVCO0FBQzlDLFFBQUksY0FBYyxTQUFTLE9BQU8sR0FBRztBQUNuQyxrQkFBWSxLQUFLLFNBQVMsSUFBSTtBQUFBLElBQ2hDO0FBQUEsRUFDRjtBQUFBO0FBQUEsRUFHQSxRQUFRLENBQUMsWUFBWSxTQUFTO0FBQzVCLFVBQU0sZ0JBQWdCO0FBQUEsTUFDcEI7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLElBQ047QUFDSSxRQUFJLGNBQWMsU0FBUyxPQUFPLEdBQUc7QUFDbkMsYUFBTyxZQUFZLE9BQU8sU0FBUyxHQUFHLElBQUk7QUFBQSxJQUM1QztBQUFBLEVBQ0Y7QUFDRixDQUFDO0FBRUQsUUFBUSxJQUFJLHVCQUF1QjsifQ==
