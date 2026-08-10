;(function () {
  const exportsObject = {}
  const moduleObject = { exports: exportsObject }
  window.exports = exportsObject
  window.module = moduleObject
  window.__miraPagModule = moduleObject
  window.__miraPagExports = exportsObject
})()
