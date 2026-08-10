import { m as mousetrap } from "./mousetrap-71492e72.js";
const VueMousetrapPlugin = {
  install(app) {
    app.config.globalProperties.$mousetrap = mousetrap;
  }
};
export {
  VueMousetrapPlugin as V
};
