// 完全复刻 viewer.html 里修复后的 deriveExtraBase + entryUrl
function deriveExtraBase(url) {
  var u = new URL(url, 'http://localhost:8081/')
  var marker = '/api/files/extra/'
  var idx = u.pathname.indexOf(marker)
  if (idx < 0) return null
  var afterMarker = u.pathname.slice(idx + marker.length)
  var slashAfterLib = afterMarker.indexOf('/')
  if (slashAfterLib < 0) return null
  var slashAfterFile = afterMarker.indexOf('/', slashAfterLib + 1)
  if (slashAfterFile < 0) return null
  var base = u.origin + u.pathname.slice(0, idx + marker.length) + afterMarker.slice(0, slashAfterFile + 1)
  var token = u.searchParams.get('token') || ''
  return { origin: u.origin, base: base, token: token }
}
function entryUrl(extra, entryName) {
  var encoded = entryName.replace(/\\/g, '/').split('/').map(encodeURIComponent).join('/')
  var url = extra.base + encoded
  if (extra.token) url += '?token=' + encodeURIComponent(extra.token)
  return url
}
var indexUrl = 'http://localhost:8081/api/files/extra/1785462412295/267/__index.json?token=mira-token-1-1786325434877-c8e120ce6b89dfa93d8bc0206b370e6931a7e391b39d95649d07ee69e1e04f19'
var extra = deriveExtraBase(indexUrl)
console.log('extra:', JSON.stringify(extra, null, 2))
var u = entryUrl(extra, 'priestess/skin-67c2681a58ca60fc.png')
console.log('entryUrl:', u)
