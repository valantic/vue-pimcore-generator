const path = require('path');
const commandLineUsage = require('command-line-usage');
const commandLineArgs = require('command-line-args');
const fs = require('fs-extra');
const signale = require('signale');
const _ = require('lodash');
const moment = require('moment');
const { rootDir } = require('./root-dir');

let options = {};

/**
 * Logs a message using signale.
 * Needs to be in this file to avoid circular dependency
 * @param {String} level The log level
 * @param {any} msg Parameters to pass to signale
 * @returns {void}
 */
const log = (level, ...msg) => {
  signale[level](...msg);
};

/**
 * Logs a message using signale if verbose is true.
 * Needs to be in this file to avoid circular dependency
 * @param {String} level The log level
 * @param {any} msg Parameters to pass to signale
 * @returns {void}
 */
const logVerbose = (level, ...msg) => {
  if (options && options.verbose) {
    signale[level](...msg);
  }
};

module.exports = { log, logVerbose };

/**
 * Define CLI options.
 * @see https://github.com/75lb/command-line-args/wiki/Option-definition-reference
 */
const optionDefinitions = [
  {
    name: 'help',
    alias: 'h',
    type: Boolean,
    description: 'Display this usage guide.',
    group: 'output',
  },
  {
    name: 'verbose',
    alias: 'v',
    type: Boolean,
    description: 'Use verbose output.',
    group: 'output',
  },
  {
    name: 'manifest-file',
    defaultValue: path.join(rootDir, 'generator-manifest.json'),
    type: String,
    description: 'Manifest to read and write from. Defaults to ./generator-manifest.json.',
    group: 'output',
    typeLabel: '{underline path}',
  },
  {
    name: 'definitions-file',
    defaultOption: true,
    defaultValue: path.join(rootDir, 'generator-definitions.js'),
    type: String,
    description: 'File with definition to use for loading pages. Defaults to ./generator-definitions.js.',
    group: 'browser',
    typeLabel: '{underline path}',
  },
  {
    name: 'base-url',
    alias: 'b',
    type: String,
    description: 'Base URL for all pages. Defaults to definitions.baseUrl.',
    group: 'browser',
    typeLabel: '{underline URL}',
  },
  {
    name: 'debug',
    alias: 'd',
    type: Boolean,
    description: 'Debug mode. Use a non-headless browser and slows down operations by 250 ms.',
    group: 'browser',
  },
  {
    name: 'firefox',
    type: Boolean,
    description: 'Use Firefox instead of Chromium (experimental).',
    group: 'browser',
  },
  {
    name: 'dry-run',
    alias: 'n',
    type: Boolean,
    description: 'Do not actually modify any files on disk.',
    group: 'files',
  },
  {
    name: 'skip-create',
    alias: 'c',
    type: Boolean,
    description: 'Do not create new files.',
    group: 'files',
  },
  {
    name: 'skip-update',
    alias: 'u',
    type: Boolean,
    description: 'Do not update existing files.',
    group: 'files',
  },
  {
    name: 'ignore-manifest',
    alias: 'm',
    type: Boolean,
    description: 'Ignore manifest.',
    group: 'files',
  },
  {
    name: 'patch',
    alias: 'p',
    type: Boolean,
    description: 'Show patch for files that cannot be updated to the manifest.',
    group: 'files',
  },
  {
    name: 'skip-thumbnails',
    alias: 't',
    type: Boolean,
    description: 'Skip creating thumbnail definitions in Pimcore.',
    group: 'files',
  },
];

/**
 * Based on the CLI options, a usage screen is generated which may be displayed.
 * @type {string}
 */
const usage = commandLineUsage([
  {
    header: 'Vue-Pimcore Generator',
    // eslint-disable-next-line max-len
    content: 'Based on Vue components with minor annotations using data-pimcore-* attributes, the corresponding Pimcore files will be created.'
  },
  {
    header: 'Synopsis',
    content: '$ node prerender.js [definitions-file] <options>'
  },
  {
    header: 'File options',
    optionList: optionDefinitions,
    group: ['files']
  },
  {
    header: 'Browser options',
    optionList: optionDefinitions,
    group: ['browser']
  },
  {
    header: 'Output options',
    optionList: optionDefinitions,
    group: ['output']
  },
]);

/*
   Attempt to parse CLI options. Otherwise exit with non-zero code
   and display usage screen.
  */
try {
  /**
     * Retrieve the parsed CLI options.
     * Note: _all includes parameters from all groups
     * @type {Object}
     */
  options = commandLineArgs(optionDefinitions, { camelCase: true })._all; // eslint-disable-line no-underscore-dangle

  // If the help options was passed, display usage and exit.
  if (options.help) {
    // eslint-disable-next-line no-console
    console.log(usage);
    process.exit(0);
  }

  if (!fs.pathExistsSync(options.definitionsFile)) {
    log('fatal', 'Cannot find definitions file at %s', options.definitionsFile);
    log('info', 'The file was recently renamed from manifest.json to generator-manifest.json to avoid confusion with similar files used by other tools. Maybe you need to rename your definition file to generator-manifest.json?', options.definitionsFile);
    process.exit(1);
  }
} catch (e) {
  log('fatal', e);
  // eslint-disable-next-line no-console
  console.log(usage);
  process.exit(2);
}
// See definitions.sample.js for docs
logVerbose('debug', 'Reading definitions from %s', options.definitionsFile);
// eslint-disable-next-line import/no-dynamic-require
const definitions = require(`${process.cwd()}/${options.definitionsFile}`);

/**
 * The base URL for all pages to be parsed.
 * @type {string}
 */
const baseUrl = _.defaultTo(options.baseUrl, definitions.baseUrl);

/**
 * The full path to the manifest file.
 * @type {string}
 */
const { manifestFile } = options;

/**
 * Options for fs.outputJson() and fs.outputJsonSync().
 * @type {object}
 */
const manifestOptions = { spaces: 2 };

log('note', 'Reading manifest');

if (!fs.pathExistsSync(manifestFile)) {
  log('info', 'Creating new manifest at %s', manifestFile);
  fs.outputJsonSync(manifestFile, { version: 1, timestamp: moment().toISOString(), files: {} }, manifestOptions);
}

const manifest = fs.readJsonSync(manifestFile);

module.exports = {
  definitions, options, baseUrl, manifest, manifestOptions, log, logVerbose
};
