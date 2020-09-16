const path = require('path');

/* eslint-disable no-unused-vars */
module.exports = {
  // Base URL for relative paths in pages (see below)
  baseUrl: 'https://example.com/',
  // optional, default is ../pimcore
  vueBasepath: root => path.join(root, '..', 'vue'),
  // optional, default is ../pimcore
  graphqlFolders: ['src/components', 'src/mixins', 'src/graphql'],
  // optional, default is ../pimcore
  pimcoreBasepath: root => path.join(root, '..', 'pimcore'),
  // optional, default is ../pimcore/app/Resources/views/Default
  twigBasepath: pimcoreRoot => path.join(pimcoreRoot, 'app', 'Resources', 'views', 'Default'),
  // optional, default is ../pimcore/app/Resources/views/snippets
  snippetTwigBasepath: pimcoreRoot => path.join(pimcoreRoot, 'app', 'Resources', 'views', 'snippets'),
  // optional, default is ../pimcore/app/Resources/views/Areas
  areabrickTwigBasepath: pimcoreRoot => path.join(pimcoreRoot, 'app', 'Resources', 'views', 'Areas'),
  // optional, default is ../pimcore/src/AppBundle/Document/Areabrick
  areabrickDefinitionsBasepath: pimcoreRoot => path.join(pimcoreRoot, 'src', 'AppBundle', 'Document', 'Areabrick'),
  cookies: [
    // see https://pptr.dev/#?product=Puppeteer&version=v3.3.0&show=api-pagesetcookiecookies
    {
      name: 'foo',
      value: 'bar',
    }
  ],
  browser: {
    // see https://pptr.dev/#?product=Puppeteer&version=v3.3.0&show=api-puppeteerlaunchoptions
  },
  twig: {
    baseTemplate: 'layouts/base.html.twig', // the twig template other pages inherit from
  },
  // global start hook
  async start({
    log, browser, page, pageDefinition
  }) {
    // log: https://github.com/klaussinani/signale, called using log(level, ...msg)
    // browser: https://pptr.dev/#?product=Puppeteer&version=v3.3.0&show=api-class-browser
    // page: https://pptr.dev/#?product=Puppeteer&version=v3.3.0&show=api-class-page
    // pageDefinition: the corresponding `pages` entry (see below)
  },
  // global start hook
  async preParse({
    log, browser, page, pageDefinition
  }) {
    //
  },
  // global start hook
  async postParse({
    log, browser, page, pageDefinition
  }) {
    //
  },
  // global start hook
  async done({
    log, browser, page, pageDefinition
  }) {
    //
  },
  pages: [
    // Minimal example
    {
      // The path, that should be called by the inspector
      path: 'de/news',
      // The name of the page template, that should be generated for the inspected path (optional)
      template: 'news',
    },
    // Kitchen sink
    {
      path: 'de/index',
      // If a template should be generated for the current page, this is the path to where it is exported.
      templatePath: 'default',
      browser: {
        // Define page-specific browser options.
        // Will be merged with global browser options.
        // Local values take priority over global values.
        defaultViewport: {
          width: 640,
          height: 480
        }
      },
      cookies: [
        // Define page-specific cookies.
        // Will be merged with global cookies.
        // Local values take priority over global values.
        {
          name: 'foo',
          value: 'baz'
        }
      ],
      // Page-specific hook overrides global hook.
      preParse: async({
        log, browser, page, pageDefinition
      }) => {
        //
      },
    },
  ]
};
