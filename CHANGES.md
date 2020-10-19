# Changelog

### Next
* (Breaking) Changes root element of snippet HTML to outerHTML.
* (Bugfix) Use correct path to snippet in `document-types.php`

### 0.4.1 (2020-09-16)
* (Bugfix) Fixes invalid document-types definition for snippets.

### 0.4.0 (2020-09-16)
* (Breaking) Changes Pimcore template structure (3 files to 2 files).
* (Feature) Adds support for `data-pimcore-snippet="<name>"` attribute

### 0.3.1 (2020-09-15)
* (Feature) Adds query parameter to called urls, so that Vue can react to the 'generator mode'.

### 0.3.0 (2020-09-15)
* (Breaking) Definition to generate templates was moved from `generator-definitions.js` to the new data attribute `data-pimcore-template="<name>"`
* (Bugfix) The comment removal regex was fixed to allow whitespaces around comments.
