#!/usr/bin/env node

const puppeteer = require('puppeteer');
const _ = require('lodash');
const { writeFile, updateManifest } = require('./lib/output');

const {
  options,
  definitions,
  baseUrl,
  manifest,
  log,
  logVerbose,
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

const globalCookies = definitions.cookies || [];

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
    pageDefinition.browser || {},
    {
      defaultViewport: {
        width: 1920, height: 1080, deviceScaleFactor: 1, isMobile: false, hasTouch: false
      }
    },
    definitions.browser || {},
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
  const {
    cookies = [],
    path,
  } = pageDefinition;

  await page.setCookie(...prepareCookies(...globalCookies, ...cookies));

  if (options.debug) {
    page.on('console', msg => log('debug', '%s: console.%s(): %s', path, msg.type(), msg.text()));
  }

  await (pageDefinition.start || definitions.start || function() {})({
    pageDefinition, browser, page, log
  });

  log('start', path);

  logVerbose('await', `Loading page ${path}`);
  // attempt to append query string to the URL, handles the case with an existing query string and no query string
  const pageUrl = `${baseUrl}${path}${path.includes('?') ? '&' : '?'}is_generator=1`;

  await page.goto(pageUrl, { waitUntil: 'networkidle0' });

  await (pageDefinition.preParse || definitions.preParse || function() {})({
    pageDefinition, browser, page, log
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
      log('error', `No template name was defined for the template in '${path}'.`);
      throw new Error(`No template name was defined for the template in '${path}'.`);
    }

    const templateStump = `${pageDefinition.templatePath}/${templateName}`;
    const baseTemplate = pageDefinition.baseTemplate || definitions.twig.baseTemplate;
    const extendsTemplate = baseTemplate
      ? `{% extends '${baseTemplate}' %}\n`
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
  log('complete', `Done with page ${path}`);

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
