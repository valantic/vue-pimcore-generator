#!/usr/bin/env node

const puppeteer = require('puppeteer');
const _ = require('lodash');
const { writeFile, updateManifest } = require('./lib/output');

const {
  options, definitions, baseUrl, manifest, log, logVerbose
} = require('./lib/cli-options');
const { beautify } = require('./lib/beautify');
const {
  prepareCookies, processIncludes, processBricks, processSnippets
} = require('./lib/browser');
const {
  twigBasepath,
  getTwigPath,
} = require('./lib/paths-names');
const {
  convertToTwig, fixCssPaths, fixJsPaths, disableNavigation
} = require('./lib/page-actions');
const { run: thumbnails } = require('./lib/thumbnails');

/*
Since we will be doing a lot of async processing,
we need to catch unhandled rejections.
 */
process.on('unhandledRejection', (error) => {
  log('error', 'Uh-oh unhandled promise rejection');
  // eslint-disable-next-line no-console
  console.error(error);
  log('fatal', 'Exiting now');
  process.exit(1);
});

const globalCookies = _.defaultTo(definitions.cookies, []);

/**
 * Defines which URLs (`path`) should be parsed and which Twig template
 * (`template`) it will be written to.
 * @type {{template: string, path: string}[]}
 */
const { pages } = definitions;

log('start', 'Starting with pre-rendering');

/**
 * Parse a page and generate corresponding files.
 * @param {{template: String, path: String}} pageDefinition Config for this page
 * @returns {Promise<void>}
 */
async function parsePageDefinition(pageDefinition) {
  /*
  IMPORTANT: everything inside of page.evaluate(() => { ... }) is executed
  **inside** the Puppeteer instance i.e. a Chromium (or Firefox) browser.
  */

  logVerbose('await', 'Starting browser');
  const browserOptions = _.defaultsDeep(
    {},
    _.defaultTo(pageDefinition.browser, {}),
    {
      defaultViewport: {
        width: 1920, height: 1080, deviceScaleFactor: 1, isMobile: false, hasTouch: false
      }
    },
    _.defaultTo(definitions.browser, {}),
    options.debug ? {
      headless: false,
      devtools: true,
      slowMo: 250,
    } : {}
  );

  if (options.firefox) {
    browserOptions.product = 'firefox';
    log('warn', 'If this fails, please run: PUPPETEER_PRODUCT=firefox npm i puppeteer');
  }

  const browser = await puppeteer.launch(browserOptions);
  const page = await browser.newPage();

  await page.setCookie(...prepareCookies(...globalCookies, ..._.defaultTo(pageDefinition.cookies, [])));

  if (options.debug) {
    page.on('console', msg => log('debug', '%s: console.%s(): %s', pageDefinition.path, msg.type(), msg.text()));
  }

  await _.defaultTo(pageDefinition.start, _.defaultTo(definitions.start, () => {
  }))({
    pageDefinition, browser, page, log
  });

  log('start', pageDefinition.path);

  logVerbose('await', `Loading page ${pageDefinition.path}`);
  await page.goto(`${baseUrl}${pageDefinition.path}`, { waitUntil: 'networkidle0' });

  await (pageDefinition.preParse || definitions.preParse || function() {})({
    pageDefinition, browser, page, log
  });

  // Replace #app id to prevent Vue initialization in Pimcore live edit
  await page.evaluate(() => {
    const app = document.getElementById('app')

    if (!app) {
      return;
    }

    app.id = 'not-app-anymore';
  });

  logVerbose('note', 'Disabling navigation for admin mode');
  await disableNavigation(page);

  logVerbose('note', 'Converting page to Twig - Twig includes');
  await processIncludes(page);

  /* Extract Twig for Snippets */
  logVerbose('note', 'Extracting snippets');
  await processSnippets(page);

  /* Extract Twig for Areabricks */
  logVerbose('note', 'Processing areabricks');
  await processBricks(page);

  /* Extract Twig for document itself */
  logVerbose('note', 'Converting page to Twig - Pimcore tags');
  await convertToTwig(page);

  logVerbose('note', 'Fixing JS paths');
  await fixJsPaths(page);

  logVerbose('note', 'Fixing CSS paths');
  await fixCssPaths(page);

  await (pageDefinition.postParse || definitions.postParse || function() {})({
    pageDefinition, browser, page, log
  });

  // Create page template, if defined in generator-definitions
  if (pageDefinition.templatePath) {
    logVerbose('note', `Writing Twig template as ${pageDefinition.template}`);
    const templateName = await page.evaluate(() => {
      const template = document.querySelector('[data-pimcore-template]');

      return (template && template.dataset.pimcoreTemplate) || null;
    });

    if (!templateName) {
      throw new Error(`No template name was defined for the template in '${pageDefinition.path}'.`)
    }

    const templateStump = `${pageDefinition.templatePath}/${templateName}`
    const extendsTemplate = pageDefinition.baseTemplate || definitions.twig.baseTemplate
      ? `{% extends '${definitions.twig.baseTemplate}' %}\n`
      : '';

    await writeFile(getTwigPath(templateStump),
      `${extendsTemplate}{% block app %}
    {% if editmode %}
        {% include '${getTwigPath(`${templateStump}_edit`).replace(twigBasepath, '').substr(1)}' %}
    {% else %}
        {% include '${getTwigPath(`${templateStump}_view`).replace(twigBasepath, '').substr(1)}' %}
    {% endif %}
{% endblock %}
`);

    // Extract body from puppeteer
    let bodyHTML = await page.evaluate(() => {
      const template = document.querySelector('[data-pimcore-template]') || document.documentElement;

      delete template.dataset.pimcoreTemplate;

      return template.outerHTML; // TODO: remove any other extractions (e.g. data-pimcore-areabrick elements)
    });

    await writeFile(getTwigPath(`${templateStump}_view`), beautify(bodyHTML));

    bodyHTML = bodyHTML.replace(/disabled-in-editmode/g, "{{ editmode ? 'disabled' : '' }}");

    await writeFile(getTwigPath(`${templateStump}_edit`), beautify(bodyHTML));
  }

  await (pageDefinition.done || definitions.done || function() {})({
    pageDefinition, browser, page, log
  });
  log('complete', `Done with page ${pageDefinition.path}`);

  if (!options.debug) {
    await browser.close();
  }
}

const promises = [];

// eslint-disable-next-line no-restricted-syntax
for (const page of pages) {
  promises.push(parsePageDefinition(page));
}

thumbnails();

Promise.all(promises)
  .then(() => {
    updateManifest(manifest);

    log('complete', 'Finished pre-rendering');

    if (options.debug) {
      log('info', 'Keeping generator running to allow for debugging.');

      setInterval(() => log('note', 'Still running. Use Ctrl+C to stop'), 10000);
    }
  });
