/* global window, document, fetch, URL */
;(function () {
  const params = new URLSearchParams(window.location.search)
  const status = document.getElementById('status')
  let blobUrl = ''

  function notifyError(error) {
    const message = String(error?.message || error)
    status.textContent = `Unable to load SWF: ${message}`
    window.parent.postMessage({
      type: 'mira-swf-preview-error',
      fileId: params.get('fileId') || '',
      message,
    }, '*')
  }

  async function start() {
    const fileUrl = params.get('fileUrl')
    if (!fileUrl) throw new Error('Missing file URL')
    document.title = params.get('fileName') || 'SWF Player'
    const response = await fetch(fileUrl)
    if (!response.ok) throw new Error(`Request failed (${response.status})`)
    blobUrl = URL.createObjectURL(await response.blob())
    const ruffle = window.RufflePlayer?.newest()
    if (!ruffle) throw new Error('Ruffle runtime unavailable')
    const player = ruffle.createPlayer()
    player.style.width = '100%'
    player.style.height = '100%'
    document.getElementById('viewer').appendChild(player)
    await player.load({
      url: blobUrl,
      allowNetworking: 'none',
      allowScriptAccess: false,
    })
    status.hidden = true
    window.parent.postMessage({
      type: 'mira-swf-preview-ready',
      fileId: params.get('fileId') || '',
    }, '*')
  }

  window.addEventListener('beforeunload', () => {
    if (blobUrl) URL.revokeObjectURL(blobUrl)
  })
  start().catch(notifyError)
})()
