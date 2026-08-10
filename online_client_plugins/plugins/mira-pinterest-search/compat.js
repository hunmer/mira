;(function () {
  const dataUrl = (buffer, type) => {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
    return `data:${type};base64,${btoa(binary)}`
  }
  const utils = {
    string: {
      format: (number, digits = 3) => Number(number).toLocaleString('en-US', { maximumFractionDigits: digits }),
      generateRandomString: (length) => Array.from({ length }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 52)]).join(''),
    },
    time: {
      sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
      imgLoad: async (children) => {
        for (const element of children || []) {
          if (element.tagName === 'IMG' && !element.complete) await new Promise((resolve, reject) => { element.onload = resolve; element.onerror = reject })
          await utils.time.imgLoad(element.children)
        }
      },
    },
    file: { convert: {
      fileToDataURL: (file) => new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(file)
      }),
      bufferToDataURL: async (buffer, type) => dataUrl(buffer, type),
    } },
    image: {
      create: (url) => new Promise((resolve, reject) => {
        const image = new Image()
        image.onload = () => resolve(image)
        image.onerror = () => reject(new Error('图片加载失败'))
        image.src = url
      }),
      convert: async (url, { type = 'png', quality = 1 } = {}) => {
        const image = await utils.image.create(url)
        const canvas = document.createElement('canvas')
        canvas.width = image.width
        canvas.height = image.height
        canvas.getContext('2d').drawImage(image, 0, 0)
        return canvas.toDataURL(`image/${type}`, quality)
      },
    },
  }

  window.__miraPinterestUtils = utils
  window.__miraPinterestSwal = {
    fire: async (options) => {
      if (options?.showCancelButton) {
        return { isConfirmed: window.confirm(options.title || options.text || '确认操作？') }
      }
      window.alert(options?.text || options?.title || '')
      return { isConfirmed: true }
    },
    showValidationMessage: (message) => window.alert(message),
  }

})()
