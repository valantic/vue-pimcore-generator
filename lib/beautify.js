const beautifier = require('js-beautify').html;

/**
 * Beautifies an HTML snippet and removes comment-only lines
 * caused by Vue.
 * @param {String} html The input HTML
 * @returns {String} The beautified HTML
 */
function beautify(html) {
  return beautifier(html, {
    indent_size: 4,
    indent_char: ' ',
    end_with_newline: true,
    preserve_newlines: false,
    brace_style: 'collapse',
    indent_scripts: 'normal',
    wrap_line_length: 120,
    wrap_attributes: 'force-expand-multiline',
    inline: [],
  }).replace(/^<!---->$\n/gm, '');
}

module.exports = {
  beautify
};
