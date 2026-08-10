'use strict';
class ePubApp {
    constructor(el) {
        this.ael = el;
        this.state = {
            rendition: null,
            book: null
        };

        this.currentOutlineHref = null;
        this.outline = [];
        this.outlineMap = {};
        this.metadata = {};
        this.bookReady = false;
        this.isLoading = true;
        this.loadingMessage = '';

        this.coverUrl = '';

        this.currentPage = 0;
        this.totalPages = 0;
        this.fixedLayout = null;
        this.loadId = 0;

        this.setting_dictionary = {
            theme: {
                transparent: {
                    color: '#2c2f32',
                    bg: 'transparent'
                },
                light: {
                    color: '#2c2f32',
                    bg: '#FFFFFFE5'
                },
                yellow: {
                    color: '#2c2f32',
                    bg: '#f2ecda'
                },
                dark: {
                    color: '#f7f8f8',
                    bg: '#37383cE5'
                }
            },
            fontSize: {
                min: 12,
                max: 20,
                step: 1
            },
            lineHeight: {
                min: 1.0,
                max: 2.0,
                step: 0.1
            },
            font: {
                default: "'Noto Sans SC', 'Noto Sans TC', 'Noto Sans JP', 'Noto Sans KR', 'PingFang SC', 'PingFang TC', 'Hiragino Sans', 'Hiragino Sans GB', 'Hiragino Sans JP', 'Hiragino Sans KR', 'SF Pro Text', 'Helvetica Neue', 'Arial', sans-serif",
                serif: "'Noto Serif SC', 'Noto Serif TC', 'Noto Serif JP', 'Noto Serif KR', 'Times New Roman', Times, 'SimSun', '宋体', 'Songti SC', '宋體', serif",
            }
        };

        this.default_setting = {
            theme: 'transparent',
            fontSize: 13,
            lineHeight: 1.5,
            font: 'default'
        };
        this.setting = {
            theme: 'transparent',
            fontSize: 13,
            lineHeight: 1.5,
            font: 'default'
        };

        document.body.addEventListener('keydown', this.onKeyDown.bind(this));
    }
    setLoading(message) {
        this.isLoading = true;
        this.loadingMessage = message || '';
    }
    clearLoading() {
        this.isLoading = false;
        this.loadingMessage = '';
    }
    async prepareBookInput(input, opts, normalize = false) {
        if (typeof input === 'string' || opts?.encoding !== 'binary') {
            return {
                input,
                opts,
                buffer: null,
                normalized: false
            };
        }

        const buffer = await this.toArrayBuffer(input);
        if (!buffer || !normalize || this.isStrictEpubZip(buffer)) {
            return {
                input: buffer || input,
                opts,
                buffer,
                normalized: false
            };
        }

        try {
            return {
                input: await this.normalizeEpubZip(buffer),
                opts,
                buffer,
                normalized: true
            };
        } catch (err) {
            console.warn('error normalizing epub archive', err);
            return {
                input: buffer,
                opts,
                buffer,
                normalized: false
            };
        }
    }
    async toArrayBuffer(input) {
        if (input instanceof ArrayBuffer) return input;
        if (ArrayBuffer.isView(input)) {
            return input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength);
        }
        if (input instanceof Blob) return await input.arrayBuffer();
        return null;
    }
    isStrictEpubZip(buffer) {
        if (buffer.byteLength < 58) return false;

        const view = new DataView(buffer);
        if (view.getUint32(0, true) !== 0x04034b50) return true;

        const compression = view.getUint16(8, true);
        const fileNameLength = view.getUint16(26, true);
        const extraLength = view.getUint16(28, true);
        const fileNameStart = 30;
        const fileNameEnd = fileNameStart + fileNameLength;
        if (fileNameEnd > buffer.byteLength) return false;

        const fileName = new TextDecoder().decode(buffer.slice(fileNameStart, fileNameEnd));
        if (fileName !== 'mimetype' || compression !== 0) return false;

        const contentStart = fileNameEnd + extraLength;
        const contentEnd = contentStart + 'application/epub+zip'.length;
        if (contentEnd > buffer.byteLength) return false;

        const content = new TextDecoder().decode(buffer.slice(contentStart, contentEnd));
        return content === 'application/epub+zip';
    }
    async normalizeEpubZip(buffer) {
        if (typeof JSZip === 'undefined') throw new Error('JSZip lib not loaded');

        const sourceZip = await JSZip.loadAsync(buffer);
        if (!sourceZip.file('mimetype')) return buffer;

        const normalizedZip = new JSZip();
        normalizedZip.file('mimetype', 'application/epub+zip', {
            compression: 'STORE'
        });

        for (const name of Object.keys(sourceZip.files)) {
            if (name === 'mimetype') continue;

            const entry = sourceZip.files[name];
            if (entry.dir) {
                normalizedZip.folder(name.replace(/\/$/, ''));
                continue;
            }

            normalizedZip.file(name, await entry.async('uint8array'), {
                date: entry.date,
                compression: 'DEFLATE'
            });
        }

        return await normalizedZip.generateAsync({
            type: 'arraybuffer',
            compression: 'DEFLATE'
        });
    }
    async doBook(url, opts) {
        opts = opts || {
            encoding: 'epub'
        };
        console.log('doBook', url, opts);
        const loadId = ++this.loadId;
        this.doReset();
        this.setLoading('main.loading.loadingEpub');

        let prepared = null;
        try {
            prepared = await this.prepareBookInput(url, opts);
            if (loadId !== this.loadId) return;

            try {
                await this.openPreparedBook(prepared, loadId);
            } catch (err) {
                if (
                    loadId !== this.loadId ||
                    !prepared?.buffer ||
                    prepared.normalized ||
                    this.isStrictEpubZip(prepared.buffer)
                ) {
                    throw err;
                }

                console.warn('error loading original epub archive, retrying with normalized zip', err);
                this.destroyBookInstance();
                this.setLoading('main.loading.preparingEpub');

                const normalized = await this.prepareBookInput(prepared.buffer, opts, true);
                if (loadId !== this.loadId) return;
                await this.openPreparedBook(normalized, loadId);
            }
        } catch (err) {
            this.clearLoading();
            this.fatal('error loading book', err);
            throw err;
        }
        if (loadId !== this.loadId) return;

        this.onBookReady();
        this.state.book.loaded.navigation
            .then(async (nav) => {
                const o = (outline) => {
                    this.outlineMap[outline.href] = outline;
                    outline.subitems = outline.subitems.map((item) => o(item));
                    return {
                        ...outline,
                        page: null
                    };
                };

                this.outline = nav.toc.map((item) => o(item));

                console.log('outline', this.outline, this.outlineMap);
            })
            .catch(this.fatal.bind(this, 'error loading toc'));
        this.state.book.loaded.metadata
            .then((metadata) => (this.metadata = metadata))
            .catch(this.fatal.bind(this, 'error loading metadata'));
        this.state.book.loaded.cover
            .then(this.onBookCoverLoaded.bind(this))
            .catch(this.fatal.bind(this, 'error loading cover'));

        if (!this.fixedLayout) {
            this.state.rendition.hooks.content.register(this.applyTheme.bind(this));

            this.state.rendition.on('click', this.onRenditionClick.bind(this));
            this.state.rendition.on('keydown', this.onKeyDown.bind(this));
            this.state.rendition.on('displayed', this.onRenditionDisplayedTouchSwipe.bind(this));
            this.state.rendition.on('relocated', this.onRenditionRelocated.bind(this));
            this.state.rendition.on('relocated', this.onRenditionRelocatedUpdateIndicators.bind(this));
            this.state.rendition.on('relocated', this.onRenditionRelocatedSavePos.bind(this));
            this.state.rendition.on('started', this.onRenditionStartedRestorePos.bind(this));
            this.state.rendition.on('displayError', this.fatal.bind(this, 'error rendering book'));

            try {
                await this.state.rendition.display();
            } finally {
                if (loadId === this.loadId) this.clearLoading();
            }
        } else {
            this.clearLoading();
        }
    }
    async openPreparedBook(prepared, loadId) {
        this.state.book = ePub(prepared.input, prepared.opts);
        await this.state.book.ready;
        if (loadId !== this.loadId) return;

        this.setLoading('main.loading.renderingEpub');
        const fixedLayoutReady = await this.setupFixedLayoutRenderer(prepared.input, loadId);
        if (loadId !== this.loadId) return;
        if (!fixedLayoutReady) {
            const bookElement = this.ael?.querySelector('.book');
            if (!bookElement) {
                console.error('[mira_epub_format] reader DOM unavailable', {
                    hasRoot: Boolean(this.ael),
                    hasApp: Boolean(document.querySelector('.app')),
                    hasBook: Boolean(document.querySelector('.book'))
                });
                throw new Error('EPUB reader DOM is not ready');
            }
            this.state.rendition = this.state.book.renderTo(bookElement, {});
        }
    }
    onRenditionRelocated(event) {
        this.currentOutlineHref = event.start.href;
        console.warn(this.currentOutlineHref);
        // console.log('currentOutlineHref', event.start, event.start.href);
    }
    doOpenBook() {
        const fi = document.createElement('input');
        fi.setAttribute('accept', 'application/epub+zip');
        fi.style.display = 'none';
        fi.type = 'file';
        fi.onchange = (event) => {
            const reader = new FileReader();
            reader.addEventListener(
                'load',
                () => {
                    const arr = new Uint8Array(reader.result).subarray(0, 2);
                    let header = '';
                    for (let i = 0; i < arr.length; i++) {
                        header += arr[i].toString(16);
                    }
                    if (header == '504b') {
                        this.doBook(reader.result, {
                            encoding: 'binary'
                        });
                    } else {
                        this.fatal('invalid file', 'not an epub book');
                    }
                },
                false
            );
            if (fi.files[0]) {
                reader.readAsArrayBuffer(fi.files[0]);
            }
        };
        document.body.appendChild(fi);
        fi.click();
    }
    fatal(msg, err, usersFault) {
        console.error(msg, err);
    }
    doReset() {
        this.destroyBookInstance();
        this.setting.theme = this.getSetting('theme');
        this.setting.fontSize = this.getSetting('fontSize');
        this.setting.lineHeight = this.getSetting('lineHeight');
        this.setting.font = this.getSetting('font');
        this.applyTheme();
    }
    destroyBookInstance() {
        if (this.state.rendition) this.state.rendition.destroy();
        if (this.state.book) this.state.book.destroy();
        this.destroyFixedLayoutRenderer();
        this.state.rendition = null;
        this.state.book = null;
    }
    onBookReady(event) {
        this.bookReady = true;

        console.log('bookKey', this.state.book.key());

        if (this.fixedLayout) {
            this.currentPage = 1;
            this.totalPages = this.fixedLayout.pages.length;
            return;
        }

        let chars = 1650;
        let key = `${this.state.book.key()}:locations-${chars}`;
        let stored = localStorage.getItem(key);
        console.log(
            'storedLocations',
            typeof stored == 'string' ? stored.substr(0, 40) + '...' : stored
        );

        if (stored) return this.state.book.locations.load(stored);
        console.log('generating locations');
        return this.state.book.locations
            .generate(chars)
            .then(() => {
                localStorage.setItem(key, this.state.book.locations.save());
                console.log('locations generated', this.state.book.locations);
            })
            .catch((err) => console.error('error generating locations', err));
    }
    onBookCoverLoaded(url) {
        if (!url) return;
        if (!this.state.book.archived) {
            this.coverUrl = url;
            return;
        }
        this.state.book.archive
            .createUrl(url)
            .then((url) => {
                this.coverUrl = url;
            })
            .catch(console.warn.bind(console));
    }
    onKeyDown(event) {
        if (!this.state.rendition) return;
        let kc = event.keyCode || event.which;
        if (kc === 37) {
            this.state.rendition.prev();
            event.preventDefault();
            event.stopPropagation();
        }
        if (kc === 39) {
            this.state.rendition.next();
            event.preventDefault();
            event.stopPropagation();
        }
    }
    onRenditionClick(event) {
        try {
            if (event.target.tagName?.toLowerCase() == 'a' && event.target.href) return;
            if (
                event.target.parentNode.tagName?.toLowerCase() == 'a' &&
                event.target.parentNode.href
            )
                return;
            if (window.getSelection().toString().length !== 0) return;
            if (
                this.state.rendition.manager.getContents()[0].window.getSelection().toString()
                    .length !== 0
            )
                return;
        } catch (err) {
            console.warn('error checking for selection', err);
        }

        const wrapper = this.state.rendition.manager.container;
        const third = wrapper.clientWidth / 3;
        const x = event.pageX - wrapper.scrollLeft;
        if (x > wrapper.clientWidth - 20) {
            event.preventDefault();
        } else if (x < third) {
            event.preventDefault();
            this.state.rendition.prev();
        } else if (x > third * 2) {
            event.preventDefault();
            this.state.rendition.next();
        }
    }
    onRenditionDisplayedTouchSwipe(event) {
        let start = null;
        let end = null;
        const el = event.document?.documentElement;
        if (!el) return;

        el.addEventListener('touchstart', (event) => {
            start = event.changedTouches[0];
        });
        el.addEventListener('touchend', (event) => {
            end = event.changedTouches[0];

            const hr = (end.screenX - start.screenX) / el.getBoundingClientRect().width;
            const vr = (end.screenY - start.screenY) / el.getBoundingClientRect().height;

            if (hr > vr && hr > 0.25) return this.state.rendition.prev();
            if (hr < vr && hr < -0.25) return this.state.rendition.next();
            if (vr > hr && vr > 0.25) return;
            if (vr < hr && vr < -0.25) return;
        });
    }
    setSetting(key, value) {
        localStorage.setItem(`${eagle.plugin.manifest.id}:setting:${key}`, value);
        this.setting[key] = value;
        this.applyTheme();
    }
    getSetting(key) {
        const stored = localStorage.getItem(`${eagle.plugin.manifest.id}:setting:${key}`);
        return stored ?? this.default_setting[key];
    }
    getTheme(themeName) {
        if (themeName === 'auto') {
            const theme = document.querySelector('html').getAttribute('theme');
            const isDarkTheme = {
                LIGHT: false,
                LIGHTGRAY: false,
                GRAY: true,
                DARK: true,
                BLUE: true,
                PURPLE: true,
                YELLOW: false
            };
            return this.setting_dictionary.theme[
                isDarkTheme[theme.toUpperCase()] ? 'dark' : 'light'
            ];
        }
        return this.setting_dictionary.theme[themeName];
    }
    resetSetting() {
        Object.assign(this.setting, this.default_setting);
        this.setSetting('theme', this.default_setting.theme);
        this.setSetting('fontSize', this.default_setting.fontSize);
        this.setSetting('lineHeight', this.default_setting.lineHeight);
        this.setSetting('font', this.default_setting.font);
    }
    applyTheme() {
        const font = this.setting_dictionary.font[this.getSetting('font')];
        const fontSize = this.getSetting('fontSize');
        const lineHeight = this.getSetting('lineHeight');
        const themeName = this.getSetting('theme');
        const isDarkTheme = {
            Auto: false,
            LIGHT: false,
            LIGHTGRAY: false,
            GRAY: true,
            DARK: true,
            BLUE: true,
            PURPLE: true,
            YELLOW: false
        };

        let theme =
            themeName === 'transparent'
                ? this.getTheme(
                      isDarkTheme[
                          new URLSearchParams(window.location.search).get('theme').toUpperCase()
                      ]
                          ? 'dark'
                          : 'light'
                  )
                : this.getTheme(themeName);

        let color = theme.color;

        const rules = {
            'body *': {
                color: `${color} !important`,
                'font-family': `${font} !important`,
                'font-size': `${fontSize}px !important`,
                'line-height': `${lineHeight} !important`
            },
            html: {
                background: `transparent !important`
            },
            body: {
                background: 'transparent !important',
                color: `${color} !important`,
                'font-family': font ? `${font}` : '!invalid-hack',
                'font-size': fontSize ? `${fontSize}px` : '!invalid-hack',
                'line-height': `${lineHeight}`,
                'text-align': `justify !important`
            },
            p: {
                'line-height': '1.8em',
                margin: '1em 0 0 !important',
                'font-family': font ? `${font}` : '!invalid-hack',
                'font-size': fontSize ? `${fontSize}px` : '!invalid-hack'
            },
            a: {
                color: 'inherit !important',
                'text-decoration': 'none !important',
                '-webkit-text-fill-color': 'inherit !important'
            },
            'a:link': {
                color: `#1e83d2 !important`,
                'text-decoration': 'none !important',
                '-webkit-text-fill-color': `#1e83d2 !important`
            },
            'a:link:hover': {
                background: 'rgba(0, 0, 0, 0.1) !important'
            },
            img: {
                'max-width': '100% !important'
            },
            "img[alt='Cover Image']": {
                width: '100%',
                'max-height': '100% !important'
            }
        };

        try {
            if (this.state.rendition) {
                this.state.rendition.getContents().forEach((c) => {
                    c.addStylesheetRules(rules);
                });
            }
        } catch (err) {
            console.error('error applying style', err);
        }
    }
    onRenditionRelocatedUpdateIndicators(event) {
        if (this.fixedLayout) {
            this.currentPage = this.getSpinePageIndex(event) + 1;
            this.totalPages = this.fixedLayout.pages.length;
            return;
        }

        this.currentPage = event.start.location;
        this.totalPages = Math.max(this.state.book.locations.length() - 1, 0);
    }
    isFixedLayoutBook() {
        const metadata = this.state.book?.package?.metadata || this.metadata || {};
        return metadata.layout === 'pre-paginated';
    }
    getSpinePageCount() {
        return this.state.book?.spine?.spineItems?.length || 0;
    }
    getSpinePageIndex(event) {
        if (Number.isFinite(event?.start?.index)) return event.start.index;

        const href = event?.start?.href;
        const spineItems = this.state.book?.spine?.spineItems || [];
        const index = spineItems.findIndex((item) => item.href === href);
        return index >= 0 ? index : 0;
    }
    async setupFixedLayoutRenderer(input, loadId = this.loadId) {
        if (!this.isFixedLayoutBook()) return false;

        const buffer = await this.toArrayBuffer(input);
        if (!buffer || typeof JSZip === 'undefined') return false;
        if (loadId !== this.loadId) return false;

        const zip = await JSZip.loadAsync(buffer);
        if (loadId !== this.loadId) return false;

        const spineItems = this.state.book?.spine?.spineItems || [];
        if (!spineItems.length) return false;

        const pages = [];

        for (const item of spineItems) {
            if (loadId !== this.loadId) return false;

            const pagePath = this.stripLeadingSlash(this.state.book.resolve(item.href));
            const pageEntry = zip.file(pagePath);
            if (!pageEntry) return false;

            const pageText = await pageEntry.async('string');
            const pageDoc = new DOMParser().parseFromString(pageText, 'application/xhtml+xml');
            if (!this.isImageOnlyPage(pageDoc)) return false;

            const image = pageDoc.querySelector('image, img');
            const imageHref =
                image?.getAttribute('href') ||
                image?.getAttribute('xlink:href') ||
                image?.getAttributeNS?.('http://www.w3.org/1999/xlink', 'href') ||
                image?.getAttribute('src');
            if (!imageHref) return false;

            const imagePath = this.resolveArchivePath(this.dirname(pagePath), imageHref);
            const imageEntry = zip.file(imagePath);
            if (!imageEntry) return false;

            pages.push({
                href: item.href,
                index: item.index,
                imagePath,
                imageEntry
            });
        }

        if (pages.length !== spineItems.length) return false;

        this.fixedLayout = {
            pages,
            objectUrls: [],
            currentIndex: 0,
            renderId: 0
        };

        this.state.rendition = {
            prev: () => this.displayFixedLayoutPage(this.fixedLayout.currentIndex - 1),
            next: () => this.displayFixedLayoutPage(this.fixedLayout.currentIndex + 1),
            display: (target) => this.displayFixedLayoutTarget(target),
            destroy: () => this.destroyFixedLayoutRenderer(),
            getContents: () => []
        };

        this.totalPages = pages.length;
        this.setLoading('main.loading.loadingPage');
        await this.displayFixedLayoutPage(0, loadId);
        return true;
    }
    isImageOnlyPage(doc) {
        const body = doc?.body;
        if (!body) return false;

        const hasImage = Boolean(body.querySelector('image, img'));
        if (!hasImage) return false;

        const text = (body.textContent || '').replace(/\s+/g, '');
        return text.length <= 8;
    }
    async displayFixedLayoutTarget(target) {
        if (!this.fixedLayout) return;

        if (Number.isFinite(target)) {
            return await this.displayFixedLayoutPage(target);
        }

        const href = String(target || '').split('#')[0];
        const index = this.fixedLayout.pages.findIndex((page) => {
            return (
                page.href === href ||
                this.stripLeadingSlash(page.href) === this.stripLeadingSlash(href)
            );
        });

        return await this.displayFixedLayoutPage(index >= 0 ? index : 0);
    }
    async displayFixedLayoutPage(index, loadId = this.loadId) {
        if (!this.fixedLayout) return;

        index = Math.max(0, Math.min(index, this.fixedLayout.pages.length - 1));
        const renderId = ++this.fixedLayout.renderId;
        const page = this.fixedLayout.pages[index];
        const blob = await page.imageEntry.async('blob');
        if (!this.fixedLayout || loadId !== this.loadId || renderId !== this.fixedLayout.renderId) {
            return;
        }

        const url = URL.createObjectURL(blob);
        const img = document.createElement('img');
        img.className = 'fixed-layout-page';
        img.src = url;
        img.alt = page.href;

        try {
            await this.waitForImageReady(img);
        } catch (err) {
            console.warn('fixed layout image load timeout', err);
        }

        if (!this.fixedLayout || loadId !== this.loadId || renderId !== this.fixedLayout.renderId) {
            URL.revokeObjectURL(url);
            return;
        }

        this.fixedLayout.currentIndex = index;
        this.currentPage = index + 1;
        this.totalPages = this.fixedLayout.pages.length;
        this.currentOutlineHref = page.href;

        const bookEl = this.ael.querySelector('.book');
        bookEl.classList.add('fixed-layout-book');
        bookEl.innerHTML = '';
        bookEl.appendChild(img);

        this.fixedLayout.objectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
        this.fixedLayout.objectUrls = [url];
    }
    waitForImageReady(img) {
        return new Promise((resolve, reject) => {
            if (img.complete && img.naturalWidth > 0) {
                resolve();
                return;
            }

            const timeout = setTimeout(() => {
                cleanup();
                reject(new Error('image load timeout'));
            }, 8000);

            const cleanup = () => {
                clearTimeout(timeout);
                img.onload = null;
                img.onerror = null;
            };

            img.onload = async () => {
                try {
                    if (img.decode) await img.decode();
                } catch (err) {
                    // The image is already loaded; decode failures should not block display.
                }
                cleanup();
                resolve();
            };
            img.onerror = () => {
                cleanup();
                reject(new Error('image load error'));
            };
        });
    }
    destroyFixedLayoutRenderer() {
        if (this.fixedLayout?.objectUrls) {
            this.fixedLayout.objectUrls.forEach((url) => URL.revokeObjectURL(url));
        }
        this.fixedLayout = null;
        const bookEl = this.ael?.querySelector('.book');
        if (bookEl) {
            bookEl.classList.remove('fixed-layout-book');
            bookEl.innerHTML = '<div class="empty-wrapper"><div class="empty"></div></div>';
        }
        this.state.rendition = null;
    }
    stripLeadingSlash(path) {
        return String(path || '').replace(/^\/+/, '');
    }
    dirname(path) {
        const normalized = this.stripLeadingSlash(path);
        const index = normalized.lastIndexOf('/');
        return index >= 0 ? normalized.slice(0, index) : '';
    }
    resolveArchivePath(base, href) {
        if (/^[a-z]+:/i.test(href)) return href;

        const parts = `${base}/${href}`.split('/');
        const resolved = [];
        for (const part of parts) {
            if (!part || part === '.') continue;
            if (part === '..') {
                resolved.pop();
            } else {
                resolved.push(part);
            }
        }
        return resolved.join('/');
    }
    onRenditionRelocatedSavePos(event) {
        localStorage.setItem(`${this.state.book.key()}:pos`, event.start.cfi);
    }
    onRenditionStartedRestorePos(event) {
        try {
            let stored = localStorage.getItem(`${this.state.book.key()}:pos`);
            console.log('storedPos', stored);
            if (stored) this.state.rendition.display(stored);

            // // 取得每頁的章節
            // for (let href of this.state.book.locations._locations) {
            //     const pattern = /\[(.*?\.xhtml)\]!/;
            //     const key = "xhtml/" + href.match(pattern)[1];
            //     this.outline[key].page++;
            // }

            // // 將章節的頁數加總
            // let count = 0;
            // for (let key in this.outline) {
            //     const page = this.outline[key].page;
            //     this.outline[key].page = count;
            //     count += page;
            // }
        } catch (err) {
            this.fatal('error restoring position', err);
        }
    }
    async doSearch(q, limit = 200) {
        if (this.fixedLayout) return [];
        if (!q) return Promise.resolve([]);
        let results = await Promise.all(
            this.state.book.spine.spineItems.map((item) => {
                return item.load(this.state.book.load.bind(this.state.book)).then((doc) => {
                    let results = item.find(q);
                    item.unload();
                    return Promise.resolve(results);
                });
            })
        );
        results = [].concat.apply([], results);
        if (limit) results = results.slice(0, limit);
        return results;
    }
}
