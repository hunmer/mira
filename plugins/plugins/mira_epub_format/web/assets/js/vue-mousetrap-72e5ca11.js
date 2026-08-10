import { m as mousetrap } from "./mousetrap-7826f5a8.js";
const VueMousetrapPlugin = {
  install(app) {
    app.config.globalProperties.$mousetrap = mousetrap;
  }
};
export {
  VueMousetrapPlugin as V
};
