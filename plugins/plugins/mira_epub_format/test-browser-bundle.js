const assert = require('assert')
const fs = require('fs')
const path = require('path')

const bundle = fs.readFileSync(path.join(__dirname, 'web/assets/js/index-3e85d680.js'), 'utf8')
const requestedModules = Array.from(bundle.matchAll(/require\(`\$\{__dirname\}([^`]+)`\)/g), (match) => match[1])

assert.match(bundle, /function require\(moduleId\)/, 'browser bundle must define its CommonJS compatibility function')
assert(!bundle.includes('i18next'), 'reader bundle must not depend on i18next')
assert(requestedModules.length > 0, 'expected migrated Eagle utility imports')
assert(requestedModules.every((id) => id === '/modules/utils' || id === '/modules/utils/time'))
console.log('EPUB browser bundle compatibility check passed')
