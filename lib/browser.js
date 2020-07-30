const _ = require('lodash');
const fs = require('fs-extra');
const { execSync } = require('child_process');
const { baseUrl, logVerbose } = require('./cli-options');
const { beautify } = require('./beautify');
const { writeFile, skipPath } = require('./output');
const {
  getTwigPath, getAreaPhpPath, getBrickPhpName, twigBasepath, getAreaTwigPath, areabrickTwigBasepath, pimcoreBasepath, phpHelpersPath
} = require('./paths-names');
const { findBricks, findSnippets, findIncludes } = require('./page-actions');

/**
 * Add domain to cookies if missing.
 * @param {{name:String,value:String}[]} cookies For exact format, see https://pptr.dev/#?product=Puppeteer&version=v3.3.0&show=api-pagesetcookiecookies
 * @returns {*}
 */
const prepareCookies = (...cookies) => _.chain(cookies)
  .flatten()
  .filter(_.isObject)
  .map(cookie => ({
    url: baseUrl,
    ...cookie
  }))
  .values()
  .value();

/**
 * Generates Twig files for snippets.
 * @param {any} page Current puppeteer page.
 */
async function processSnippets(page) {
  const snippetsInDocuments = await findSnippets(page);

  _.chain(snippetsInDocuments)
    .keyBy('name')
    .each(snippet => logVerbose('debug', 'Found snippet %s', snippet.name))
    .each(async(snippet) => {
      await writeFile(getTwigPath(snippet.name),
        `{% if editmode %}
    {% include '${getTwigPath(`${snippet.name}_edit`).replace(twigBasepath, 'Default')}' %}
{% else %}
    {% include '${getTwigPath(`${snippet.name}_display`).replace(twigBasepath, 'Default')}' %}
{% endif %}
`);
      await writeFile(getTwigPath(`${snippet.name}_display`), beautify(snippet.html));
      await writeFile(getTwigPath(`${snippet.name}_edit`), beautify(snippet.html));
    })
    .each(async(snippet) => {
      const predefinedDocument = {
        name: snippet.name,
        module: 'AppBundle',
        controller: '@AppBundle\\Controller\\DefaultController',
        action: 'default',
        template: getTwigPath(snippet.name).replace(twigBasepath, 'Default'),
        type: 'snippet',
        priority: 0,
        creationDate: Math.round(Date.now() / 1000),
        modificationDate: Math.round(Date.now() / 1000),
      };

      const definitionAsBase64 = Buffer.from(JSON.stringify(predefinedDocument)).toString('base64');

      execSync(`php ${phpHelpersPath('document-type-ensure.php')} ${pimcoreBasepath} ${definitionAsBase64}`);
    })
    .value();
}

/**
 * Ensures Twig templates that are included exist.
 * @param {any} page Current puppeteer page.
 */
async function processIncludes(page) {
  const includesInDocument = await findIncludes(page);

  _.chain(includesInDocument)
    .uniq()
    .each(include => logVerbose('debug', 'Found Twig include %s', include))
    .map(include => getTwigPath(include))
    // eslint-disable-next-line no-return-await
    .reject(async file => await skipPath(file))
    .each(file => fs.ensureFileSync(file))
    .value();
}

/**
 * Generates Twig and PHP files for areabricks.
 * @param {any} page Current puppeteer page.
 */
async function processBricks(page) {
  const bricksInDocument = await findBricks(page);

  _.chain(bricksInDocument)
    .keyBy('name')
    .each(brick => logVerbose('debug', 'Found areabrick %s', brick.name))
    .each(async(brick) => {
      await writeFile(getAreaTwigPath(brick.name),
        `{% if editmode %}
    {% include '${getAreaTwigPath(brick.name, 'edit').replace(areabrickTwigBasepath, 'Areas')}' %}
{% else %}
    {% include '${getAreaTwigPath(brick.name, 'display').replace(areabrickTwigBasepath, 'Areas')}' %}
{% endif %}
`);
      await writeFile(getAreaTwigPath(brick.name, 'display'), beautify(brick.html));
      await writeFile(getAreaTwigPath(brick.name, 'edit'), beautify(brick.html));
    })
    .each(async(brick) => {
      await writeFile(getAreaPhpPath(brick.name), `<?php

namespace AppBundle\\Document\\Areabrick;

use Pimcore\\Extension\\Document\\Areabrick\\AbstractTemplateAreabrick;

class ${getBrickPhpName(brick.name)} extends AbstractTemplateAreabrick
{
    public function getTemplateLocation()
    {
        return static::TEMPLATE_LOCATION_GLOBAL;
    }

    public function getTemplateSuffix()
    {
        return static::TEMPLATE_SUFFIX_TWIG;
    }
}
`);
    })
    .value();
}

module.exports = {
  prepareCookies, processBricks, processIncludes, processSnippets
};
