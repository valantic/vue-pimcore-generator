const compiler = require('vue-template-compiler');
const fs = require('fs-extra');
const path = require('path');
const acorn = require('acorn');
const walk = require('acorn-walk');
const graphql = require('graphql');
const _ = require('lodash');

const { execSync } = require('child_process');
const {
  vueBasepath, graphqlFolders, pimcoreBasepath, phpHelpersPath
} = require('./paths-names');
const { log, logVerbose } = require('./cli-options');

/**
 * Look for thumbnails.
 * @returns {void}
 */
function run() {
  const thumbnails = [];

  log('start', 'Looking for thumbnails');

  /**
   * Given a directory, return all file names in it and its subdirectories.
   * @param {String} dir The directory to scan
   * @returns {String[]}
   */
  const getAllFiles = (dir) => {
    let results = [];
    const list = fs.readdirSync(dir);

    list.forEach((file) => {
      file = `${dir}/${file}`;
      const stat = fs.statSync(file);

      if (stat && stat.isDirectory()) {
        results = results.concat(getAllFiles(file));
      } else {
        results.push(file);
      }
    });

    return results;
  };

  const files = _.chain(graphqlFolders)
    .map(folder => path.join(vueBasepath, folder))
    .flatMap(folder => getAllFiles(folder))
    .filter(
      file => file.endsWith('.js') || file.endsWith('.vue') || file.endsWith('.graphql')
    )
    .value();

  logVerbose('note', `Found ${files.length} files to check`);

  files.forEach((name) => {
    logVerbose('start', `Looking for thumbnails in ${path.basename(name)}`);
    // eslint-disable-next-line no-nested-ternary
    const type = name.endsWith('.vue') ? 'vue' : name.endsWith('.js') ? 'js' : name.endsWith('.graphql') ? 'graphql' : false;

    if (!type) {
      return;
    }

    const file = fs.readFileSync(name, 'utf-8');

    let parsed = null;
    let script = null;

    if (type === 'vue') {
      parsed = compiler.parseComponent(file);

      if (!parsed.script) {
        return;
      }
      script = parsed.script.content;
    } else if (type === 'js') {
      script = file;
    } else if (type === 'graphql') {
      _.chain(graphql.parse(file).definitions)
        .each(queryAst => graphql.visit(queryAst, {
          Argument(node) {
            if (node.name.value === 'thumbnail') {
              thumbnails.push(node.value.value);
            }
          }
        }))
        .value();
      logVerbose('complete', `Done with ${path.basename(name)}`);

      return;
    }

    if (!script) {
      return;
    }
    const ast = acorn.parse(script, { ecmaVersion: 2020, sourceType: 'module' });

    let apolloSection = null;

    walk.simple(ast, {
      Property(node) {
        if (node.key.name === 'apollo') {
          apolloSection = node;
        }
      }
    });

    if (!apolloSection) {
      return;
    }

    const queries = _.chain(apolloSection.value.properties)
      .mapKeys(property => property.key.name)
      .mapValues((property) => {
        if (property.value.properties) {
          return _.chain(property.value.properties)
            .filter(node => node.key.name === 'query')
            .first()
            .value();
        }

        return property;
      })
      .pickBy(node => node.value.quasi)
      .mapValues(node => node.value.quasi.quasis[0].value.raw)
      .value();

    _.chain(queries)
      .mapValues(query => graphql.parse(query))
      .each(queryAst => graphql.visit(queryAst, {
        Argument(node) {
          if (node.name.value === 'thumbnail') {
            thumbnails.push(node.value.value);
          }
        }
      }))
      .value();
    logVerbose('complete', `Done with ${path.basename(name)}`);
  });

  const thumbnailsUnique = _.uniq(thumbnails);

  log('note', 'Ensuring the following definitions exist: %s', thumbnailsUnique.join(', '));
  execSync(`php ${phpHelpersPath('thumbnail-ensure.php')} ${pimcoreBasepath} ${thumbnailsUnique.join(' ')}`);
  log('complete', 'Done with finding thumbnails');
}

module.exports = { run };
