const {
  log,
} = require('./cli-options');

/**
 * Finds bricks in page.
 * @param {any} page Puppeteer page.
 * @returns {Promise<*>} Array with bricks
 */
async function findBricks(page) {
  // eslint-disable-next-line no-return-await
  return await page.evaluate(() => {
    const bricks = [];
    const nodes = document.querySelectorAll('[data-pimcore-areabrick]');

    nodes.forEach((node) => {
      const name = node.dataset.pimcoreAreabrick;

      if (!name) {
        const html = node.outerHTML;

        log('error', `No areabrick name was defined on '${html}'.`);
        throw new Error(`No areabrick name was defined on '${html}'.`);
      }

      [...node.querySelectorAll('[data-pimcore-type][data-pimcore-identifier]'), node]
        .filter(brickNode => brickNode.dataset.pimcoreType)
        .forEach((brickNode) => {
        // eslint-disable-next-line max-len
          brickNode.textContent = `{{ pimcore_${brickNode.dataset.pimcoreType}('${brickNode.dataset.pimcoreIdentifier}'${brickNode.dataset.pimcoreArg ? `, ${brickNode.dataset.pimcoreArg}` : ''}) }} `;
          delete brickNode.dataset.pimcoreType;
          delete brickNode.dataset.pimcoreIdentifier;
          delete brickNode.dataset.pimcoreArg;
        });

      delete node.dataset.pimcoreAreabrick;

      bricks.push({
        name,
        html: node.outerHTML
      });
    });

    return bricks;
  });
}

/**
 * Finds snippets in page.
 * @param {any} page Puppeteer page.
 * @returns {Promise<*>} Array with snippets
 */
async function findSnippets(page) {
  // eslint-disable-next-line no-return-await
  return await page.evaluate(() => {
    const snippets = [];
    const nodes = document.querySelectorAll('[data-pimcore-snippet]');

    nodes.forEach((node) => {
      const snippetNodes = node.querySelectorAll('[data-pimcore-type][data-pimcore-identifier]');

      snippetNodes.forEach((snippetNode) => {
        // eslint-disable-next-line max-len
        snippetNode.textContent = `{{ pimcore_${snippetNode.dataset.pimcoreType}('${snippetNode.dataset.pimcoreIdentifier}'${snippetNode.dataset.pimcoreArg ? `, ${snippetNode.dataset.pimcoreArg}` : ''}) }} `;
        delete snippetNode.dataset.pimcoreType;
        delete snippetNode.dataset.pimcoreIdentifier;
        delete snippetNode.dataset.pimcoreArg;
      });

      if (!node.dataset.pimcoreSnippet) {
        const html = node.outerHTML;

        log('error', `No snippet name was defined on '${html}'.`);
        throw new Error(`No snippet name was defined on '${html}'.`);
      }
      const snippet = { name: node.dataset.pimcoreSnippet, html: node.innerHTML };

      snippets.push(snippet);

      delete node.dataset.pimcoreIsSnippet;
    });

    return snippets;
  });
}

/**
 * Finds includes in page.
 * @param {any} page Puppeteer page.
 * @returns {Promise<*>} Array with includes
 */
async function findIncludes(page) {
  // eslint-disable-next-line no-return-await
  return await page.evaluate(() => {
    const includes = [];
    const nodes = document.querySelectorAll('[data-twig-include]');

    nodes.forEach((node) => {
      includes.push(node.dataset.twigInclude);
      node.textContent = `{% include 'Default/${node.dataset.twigInclude}.html.twig' %}`;
      node.dataset.twigIncludeRendered = node.dataset.twigInclude;
      delete node.dataset.twigInclude;
    });

    return includes;
  });
}

/**
 * Convert page to Twig.
 * @param {any} page Puppeteer page.
 * @returns {Promise<*>}
 */
async function convertToTwig(page) {
  await page.evaluate(() => {
    const nodes = document.querySelectorAll('[data-pimcore-type][data-pimcore-identifier]');

    nodes.forEach((node) => {
      // eslint-disable-next-line max-len
      node.textContent = `{{ pimcore_${node.dataset.pimcoreType}('${node.dataset.pimcoreIdentifier}'${node.dataset.pimcoreArg ? `, ${node.dataset.pimcoreArg}` : ''}) }}`;
      delete node.dataset.pimcoreType;
      delete node.dataset.pimcoreIdentifier;
      delete node.dataset.pimcoreArg;
    });
  });
}

/**
 * Fix CSS paths.
 * @param {any} page Puppeteer page.
 * @returns {Promise<void>}
 */
async function fixCssPaths(page) {
  await page.evaluate(() => {
    const nodes = document.querySelectorAll('link[rel="stylesheet"][href^="/"]');

    nodes.forEach((node) => {
      const linkElement = document.createElement('link');

      linkElement.rel = 'stylesheet';
      linkElement.href = node.href;
      linkElement.innerHTML = null;
      node.replaceWith(linkElement);
    });
  });
}

/**
 * Fix JS paths.
 * @param {any} page Puppeteer page.
 * @returns {Promise<void>}
 */
async function fixJsPaths(page) {
  await page.evaluate(() => {
    const nodes = document.querySelectorAll('script[src^="/"]');
    const href = window.location.href.split('/');
    const baseUrl = `${href[0]}//${href[2]}/`;

    nodes.forEach((node) => {
      const scriptElement = document.createElement('script');

      scriptElement.type = 'text/javascript';
      scriptElement.src = baseUrl + node.attributes.src.value.substr(1);
      scriptElement.innerHTML = null;
      node.replaceWith(scriptElement);
    });
  });
}

/**
 * Disable navigation.
 * @param {any} page Puppeteer page.
 * @returns {Promise<void>}
 */
async function disableNavigation(page) {
  await page.evaluate(() => {
    const nodes = document.querySelectorAll('[data-pimcore-disable-in-editmode]');

    nodes.forEach((node) => {
      node.querySelectorAll('a').forEach((disablable) => {
        disablable.classList.add('disabled-in-editmode');
      });
      delete node.dataset.pimcoreDisableInEditmode;
    });
  });
}

module.exports = {
  findBricks, findSnippets, convertToTwig, fixCssPaths, fixJsPaths, findIncludes, disableNavigation
};
