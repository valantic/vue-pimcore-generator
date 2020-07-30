const path = require('path');
const _ = require('lodash');
const { definitions } = require('./cli-options');
const { rootDir } = require('./root-dir');

/**
 * The root of the Pimcore project (i.e. the directory where composer.json lies).
 * @type {string}
 */
const pimcoreBasepath = _.defaultTo(
  definitions.pimcoreBasepath,
  root => path.join(root, '..', 'pimcore')
)(rootDir);

/**
 * The root of the Pimcore project (i.e. the directory where composer.json lies).
 * @type {string}
 */
const vueBasepath = _.defaultTo(
  definitions.vueBasepath,
  root => path.join(root, '..', 'vue')
)(rootDir);

/**
 * The folders to scan for GraphQL queries.
 * @type {string}
 */
const graphqlFolders = _.defaultTo(
  definitions.graphqlFolders,
  ['src/components', 'src/mixins', 'src/graphql']
);

/**
 * The root path of Twig template files.
 * @type {string}
 */
const twigBasepath = _.defaultTo(
  definitions.twigBasepath,
  base => path.join(base, 'app', 'Resources', 'views', 'Default')
)(pimcoreBasepath);

/**
 * The root path of areabrick Twig template files.
 * @type {string}
 */
const areabrickTwigBasepath = _.defaultTo(
  definitions.areabrickTwigBasepath,
  base => path.join(base, 'app', 'Resources', 'views', 'Areas')
)(pimcoreBasepath);

/**
 * The root path of areabrick PHP class definitions.
 * @type {string}
 */
const areabrickDefinitionsBasepath = _.defaultTo(
  definitions.areabrickDefinitionsBasepath,
  base => path.join(base, 'src', 'AppBundle', 'Document', 'Areabrick')
)(pimcoreBasepath);

/**
 * Returns the full path to the PHP helpers.
 * @param {String} name The PHP file name.
 * @returns {String}
 */
const phpHelpersPath = name => path.join(__dirname, '..', 'php', name);

/**
 * Returns the full path to a Twig template.
 * @param {String} name The name of the template
 * @returns {String}
 */
const getTwigPath = name => path.join(twigBasepath, `${name}.html.twig`);

/**
 * Returns the full path to an areabrick Twig template.
 * @param {String} name The name of the areabrick
 * @param {String} suffix Whether the template is for `view` or `edit`
 * @returns {String}
 */
const getAreaTwigPath = (name, suffix = 'view') => path.join(
  areabrickTwigBasepath,
  _.snakeCase(name), `${suffix}.html.twig`
);

/**
 * Normalize the areabrick name.
 * @param {String} name The name of the areabrick
 * @returns {*}
 */
const getBrickPhpName = name => _.upperFirst(_.camelCase(name));

/**
 * Returns the full path to an areabrick PHP definition.
 * @param {String} name The name of the areabrick
 * @returns {String}
 */
const getAreaPhpPath = name => path.join(areabrickDefinitionsBasepath, `${getBrickPhpName(name)}.php`);

module.exports = {
  vueBasepath,
  graphqlFolders,
  pimcoreBasepath,
  twigBasepath,
  areabrickTwigBasepath,
  areabrickDefinitionsBasepath,
  phpHelpersPath,
  getTwigPath,
  getAreaTwigPath,
  getBrickPhpName,
  getAreaPhpPath
};
