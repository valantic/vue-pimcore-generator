const fs = require('fs-extra');
const path = require('path');
const md5 = require('md5');
const jsdiff = require('diff');
const {
  options, manifest, manifestOptions, log, logVerbose
} = require('./cli-options');
const { pimcoreBasepath } = require('./paths-names');

/**
 * Checks whether the file `name` should be skipped based on CLI options.
 *
 * @param {String} name The file path
 * @returns {Promise<*|Boolean>}
 */
async function skipPath(name) {
  const exists = await fs.pathExists(name);

  return (options.skipCreate && !exists) || (options.skipUpdate && exists);
}

/**
 * Write the file `name` to disk with `contents`. File may not be written
 * due to the non-matching hashes or CLI flags.
 * @param {String} name The file name (absolute path)
 * @param {String} contents The contents of the file
 * @returns {Promise<void>}
 */
async function writeFile(name, contents) {
  const basename = name.replace(`${path.join(pimcoreBasepath)}/`, '');
  const hashNew = md5(contents);
  const hashDisk = fs.pathExistsSync(name) ? md5(fs.readFileSync(name, 'utf-8')) : null;
  const hashManifest = manifest.files[basename];

  if (!options.ignoreManifest && (manifest.files[basename] && hashManifest !== hashDisk)) {
    log('warn', 'Skipped %s due to non-matching hashes', basename);

    if (options.patch) {
      log('info', 'Here is the patch for %s', name);
      // eslint-disable-next-line no-console
      console.log();
      // eslint-disable-next-line no-console
      console.log(jsdiff.createPatch(name, contents, fs.readFileSync(name, 'utf-8')));
    }

    return;
  }

  if (!options.dryRun) {
    if (await skipPath(name)) {
      log('warn', 'Skipped %s based on CLI flags', basename);

      return;
    }
    logVerbose('debug', 'Writing file %s', name);
    await fs.outputFile(name, contents);
    manifest.files[basename] = hashNew;
  }
}

/**
 * Updates the manifest file with `contents`.
 * @param {Object} contents The new manifest file contents
 * @returns {void}
 */
function updateManifest(contents) {
  manifest.timestamp = new Date().toISOString();

  if (!options.dryRun && !options.ignoreManifest) {
    fs.outputJsonSync(options.manifestFile, contents, manifestOptions, () => log('success', 'Wrote manifest'));
  }
}

module.exports = { skipPath, writeFile, updateManifest };
