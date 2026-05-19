/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    /* rules from the 'recommended' preset: */
    {
      name: 'no-circular',
      severity: 'warn',
      comment:
        'This dependency is part of a circular relationship. You might want to revise ' +
        'your solution (i.e. use dependency inversion, make sure the modules have a single responsibility) ',
      from: {},
      to: {
        circular: true
      }
    },
    {
      name: 'no-orphans',
      comment:
        "This is an orphan module - it's likely not used (anymore?). Either use it or " +
        "remove it. If it's logical this module is an orphan (i.e. it's a config file), " +
        "add an exception for it in your dependency-cruiser configuration. By default " +
        "this rule does not scrutinize dot-files (e.g. .eslintrc.js), TypeScript declaration " +
        "files (.d.ts), tsconfig.json and some of the babel and webpack configs.",
      severity: 'warn',
      from: {
        orphan: true,
        pathNot: [
          '(^|/)\\.[^/]+\\.(js|cjs|mjs|ts|json)$', // dot files
          '\\.d\\.ts$',                            // TypeScript declaration files
          '(^|/)tsconfig\\.json$',                // tsconfig.json
          '(^|/)(babel|webpack)\\.config\\.(js|cjs|mjs|ts|json)$' // babel and webpack configs
        ]
      },
      to: {}
    },
    {
      name: 'no-deprecated-core',
      comment:
        'A module depends on a node core module that has been deprecated. Find an alternative - these are ' +
        "bound to exist - node doesn't deprecate lightly.",
      severity: 'warn',
      from: {},
      to: {
        dependencyTypes: [
          'core'
        ],
        path: [
          '^(v8\/tools\/codemap)$',
          '^(v8\/tools\/consarray)$',
          '^(v8\/tools\/csvparser)$',
          '^(v8\/tools\/logreader)$',
          '^(v8\/tools\/profile_view)$',
          '^(v8\/tools\/profile)$',
          '^(v8\/tools\/SourceMap)$',
          '^(v8\/tools\/splaytree)$',
          '^(v8\/tools\/tickprocessor-driver)$',
          '^(v8\/tools\/tickprocessor)$',
          '^(node-inspect\/lib\/_inspect)$',
          '^(node-inspect\/lib\/internal\/inspect_client)$',
          '^(node-inspect\/lib\/internal\/inspect_repl)$',
          '^(async_hooks)$',
          '^(punycode)$',
          '^(domain)$',
          '^(constants)$',
          '^(sys)$',
          '^(_linklist)$',
          '^(_stream_wrap)$'
        ]
      }
    },
    {
      name: 'not-to-deprecated',
      comment:
        'This module uses a (version of an) npm module that has been deprecated. Either upgrade to a later ' +
        'version of that module, or find an alternative. Deprecated modules are a security risk.',
      severity: 'warn',
      from: {},
      to: {
        dependencyTypes: [
          'deprecated'
        ]
      }
    },
    {
      name: 'no-non-package-json',
      severity: 'error',
      comment:
        "This module depends on an npm package that isn't in the 'dependencies' section of your package.json. " +
        "That's problematic as the package either (1) won't be available on live (2) will be available on live " +
        "but is not under semantic version control. Fix it by adding the package to the dependencies in your " +
        "package.json.",
      from: {},
      to: {
        dependencyTypes: [
          'npm-no-pkg',
          'npm-unknown'
        ]
      }
    },
    {
      name: 'not-to-unresolvable',
      comment:
        "This module depends on a module that cannot be found ('resolved to disk'). If it's an npm " +
        'module: add it to your package.json. In all other cases you likely already know what to do.',
      severity: 'error',
      from: {},
      to: {
        couldNotResolve: true
      }
    },
    {
      name: 'no-duplicate-dep-types',
      comment:
        "Likely this module depends on an external ('npm') package that occurs more than once " +
        "in your package.json i.e. both as a devDependencies and in dependencies. This will cause " +
        "maintenance problems later on.",
      severity: 'warn',
      from: {},
      to: {
        moreThanOneDependencyType: true,
        // as it's pretty common to have a type import be a type only import 
        // _and_ (e.g.) a devDependency - don't consider type-only dependency
        // types for this rule
        dependencyTypesNot: ["type-only"]
      }
    },

    /* rules you might want to tweak for your specific situation: */
    {
      name: 'not-to-spec',
      comment:
        'This module depends on a spec (test) file. The sole responsibility of a spec file is to test code. ' +
        "If there's something in a spec that's of use to other modules, it doesn't have that single " +
        'responsibility anymore. Factor it out into (e.g.) a separate utility/ helper or a mock.',
      severity: 'error',
      from: {},
      to: {
        path: '\\.(spec|test)\\.(js|mjs|cjs|ts|ls|coffee|litcoffee|coffee\\.md)$'
      }
    },
    {
      name: 'not-to-dev-dep',
      severity: 'error',
      comment:
        "This module depends on an npm package from the 'devDependencies' section of your " +
        'package.json. It looks like something that ships to production, though. To prevent problems ' +
        "with npm packages that aren't there on production declare it (only!) in the 'dependencies'" +
        'section of your package.json. If this module is development only - add it to the ' +
        'from.pathNot re of the not-to-dev-dep rule in the dependency-cruiser configuration',
      from: {
        path: '^(src)',
        pathNot: '\\.(spec|test)\\.(js|mjs|cjs|ts|ls|coffee|litcoffee|coffee\\.md)$'
      },
      to: {
        dependencyTypes: [
          'npm-dev'
        ],
        // type only dependencies are not a problem as they don't end up in the
        // production code or are ignored by the runtime.
        dependencyTypesNot: [
          'type-only'
        ],
        pathNot: [
          'node_modules/@types/'
        ]
      }
    },
    {
      name: 'optional-deps-used',
      severity: 'info',
      comment:
        "This module depends on an npm package that is declared as an optional dependency " +
        "in your package.json. As this makes sense in limited situations only, it's flagged here. " +
        "If you're using an optional dependency here by design - add an exception to your" +
        "dependency-cruiser configuration.",
      from: {},
      to: {
        dependencyTypes: [
          'npm-optional'
        ]
      }
    },
    {
      name: 'peer-deps-used',
      comment:
        "This module depends on an npm package that is declared as a peer dependency " +
        "in your package.json. This makes sense if your package is e.g. a plugin, but in " +
        "other cases - maybe not so much. If the use of a peer dependency is intentional " +
        "add an exception to your dependency-cruiser configuration.",
      severity: 'warn',
      from: {},
      to: {
        dependencyTypes: [
          'npm-peer'
        ]
      }
    }
  ],
  options: {
    /* conditions to check for in the 'to' part of a rule. Leave empty to check
       everything
     */
    doNotFollow: {
      path: 'node_modules'
    },

    /* pattern specifying which files not to follow further when encountered:
       - node_modules: don't cruise into node_modules
       - \\.(spec|test)\\.: don't cruise into test and spec files
       - \\.(d)\\.ts$: don't cruise into .d.ts files
     */
    exclude : {
      path: 'node_modules|\\.(spec|test)\\.|\\.(d)\\.ts$'
    },

    /* pattern specifying which files to include (regular expression)
       dependency-cruiser will skip everything not matching this pattern
    */
    includeOnly : {
      path: '^src'
    },

    /* dependency-cruiser will include modules matching against the focus
       pattern in its output, as well as their neighbours (direct dependencies
       and dependents)
    */
    focus : '',

    /* list of module systems to cruise */
    moduleSystems: ['amd', 'cjs', 'es6', 'tsd'],

    /* prefix for links in html and svg output (e.g. 'https://github.com/you/yourrepo/blob/develop/'
       to open it on your online repo or `vscode://file/${process.cwd()}/` to 
       open it in visual studio code),
     */
    prefix: 'https://github.com/mira-team/mira-desktop/blob/main/',

    /* false (the default): ignore dependencies that live outside the current folder & are not npm
       true: also detect dependencies that live outside the current folder (and are not npm)
    */
    externalModuleResolutionStrategy: 'lookup-closest-node-modules-file',

    /* List of strings you have in use in addition to cjs/ es6 requires
       & imports to declare module dependencies. Use this e.g. if you've
       re-declared require (`const want = require`), or if you're using a
       require-wrapper.
    */
    exoticRequireStrings: [],

    /* options to pass on to enhanced-resolve, the package webpack uses to resolve
       module references
    */
    enhancedResolveOptions: {
      /* List of strings to consider as 'exports' fields in package.json. Use
         ['exports'] when you use packages that use such a field and your environment
         supports it (e.g. node ^12.19 || >=14.7 or recent versions of webpack).

        If you have an `exportsFields` attribute in your webpack config, that one
         will have precedence over the one specified here.
      */
      exportsFields: ["exports"],
      /* List of conditions to check for in the exports field. e.g. use ['imports']
         if you're only interested in exposed es6 modules, ['require'] for commonjs,
         or all conditions at once `(['import', 'require', 'node', 'default']`)
         if anything goes for you. Only works when the 'exportsFields' array is
         non-empty.

        If you have a 'conditionNames' attribute in your webpack config, that one will
        have precedence over the one specified here.
      */
      conditionNames: ["import", "require", "node", "default"],

      /*
         The extensions to consider when a require or import doesn't explicitly mention the
         extension: https://webpack.js.org/configuration/resolve/#resolveextensions

         When not provided, defaults to [".js", ".json"] - only mention this when you want
         to depart from that default.

         If you have a 'resolve.extensions' attribute in your webpack config, that one will
         have precedence over the one specified here.
       */
      extensions: [".js", ".jsx", ".ts", ".tsx", ".vue", ".json"],

      /*
         The file name or file names to look for when a require or import refers to a folder:
         https://webpack.js.org/configuration/resolve/#resolvemainfiles

         When not provided, defaults to ["index"] - only mention this when you want
         to depart from that default.

         If you have a 'resolve.mainFiles' attribute in your webpack config, that one will
         have precedence over the one specified here.
       */
      mainFiles: ["index"],

      /*
         A list of alias fields in description files (package.json) to resolve:
         https://webpack.js.org/configuration/resolve/#resolvealias

         defaults to an empty array (= don't use alias fields).

         If you have a 'resolve.alias' attribute in your webpack config, that one will have
         precedence over the one specified here.

         Note: this option is part of enhanced-resolve, but only works when you specify the
               fallback yourself. dependency-cruiser does not (yet) fall back to looking in
               description files.
       */
      aliasFields: ["browser"],

      /*
         The JSON attributes to resolve to when looking for a module's main attributes:
         https://webpack.js.org/configuration/resolve/#resolvemainfields

         When not provided, defaults to ["main"] - only mention this when you want
         to depart from that default.

         If you have a 'resolve.mainFields' attribute in your webpack config, that one will
         have precedence over the one specified here.
       */
      mainFields: ["main", "types", "typings"],

      /*
         A list of alias fields in description files (package.json) to resolve:
         https://webpack.js.org/configuration/resolve/#resolvealias

         If you have a 'resolve.alias' attribute in your webpack config, that one will
         have precedence over the one specified here.
       */
      alias: {
        "@": "src",
        "@renderer": "src/renderer",
        "@main": "src/main"
      }
    },
    reporterOptions: {
      dot: {
        /* pattern of modules that can be consolidated in the detailed
           graphical dependency graph. The default pattern in this configuration
           collapses everything in node_modules to one folder deep so you see
           the external modules, but not the innards your app depends upon.
         */
        collapsePattern: 'node_modules/[^/]+',

        /* Options to tweak the appearance of your graph.See
           https://www.graphviz.org/doc/info/attrs.html for details.
           If you don't specify a theme don't leave 'theme' as an empty string;
           either just don't mention it or set it to null.

           For other themes see https://github.com/sverweij/dependency-cruiser/blob/develop/doc/rules-reference.md#dot
         */
        theme: {
          graph: {
            bgcolor: 'dodgerblue',
            color: 'white',
            fontcolor: 'white',
            fillcolor: 'transparent',
            splines: 'ortho',
          },
          node: {
            color: 'white',
            fillcolor: 'transparent',
            fontcolor: 'white',
          },
          edge: {
            color: 'white',
            fontcolor: 'white',
          },
          modules: [
            {
              criteria: { source: '^src/main' },
              attributes: { fillcolor: '#4fc3f7', fontcolor: 'black' }
            },
            {
              criteria: { source: '^src/renderer' },
              attributes: { fillcolor: '#81c784', fontcolor: 'black' }
            },
            {
              criteria: { source: '^src/preload' },
              attributes: { fillcolor: '#ffb74d', fontcolor: 'black' }
            },
            {
              criteria: { source: '\\.(spec|test)\\.' },
              attributes: { fillcolor: '#f48fb1', fontcolor: 'black' }
            }
          ],
          dependencies: [
            {
              criteria: { "rules[0].severity": "error" },
              attributes: { fontcolor: "red", color: "red" }
            },
            {
              criteria: { "rules[0].severity": "warn" },
              attributes: { fontcolor: "orange", color: "orange" }
            },
            {
              criteria: { "rules[0].severity": "info" },
              attributes: { fontcolor: "blue", color: "blue" }
            }
          ]
        }
      },
      archi: {
        /* pattern of modules that can be consolidated in the high level
          graphical dependency graph. If you use the high level graphical
          dependency graph reporter (`archi`) you probably want to tweak
          this collapsePattern to your situation.
        */
        collapsePattern: '^(src/[^/]+)',

        /* Options to tweak the appearance of your graph.See
           https://www.graphviz.org/doc/info/attrs.html for details.
           If you don't specify a theme, don't leave 'theme' as an empty string;
           either just don't mention it or set it to null.

           For other themes see https://github.com/sverweij/dependency-cruiser/blob/develop/doc/rules-reference.md#dot
         */
        theme: {
          graph: {
            bgcolor: "transparent",
            splines: "ortho",
          },
          node: {
            shape: "box",
            style: "rounded, filled",
            color: "black",
            fillcolor: "#ffffcc",
            fontcolor: "black",
          },
          edge: {
            color: "black",
          },
        }
      },
      text: {
        highlightFocused: true
      },
      html: {
        title: "Mira Desktop - Dependency Graph"
      }
    }
  }
};
