'use strict';
/**
 * Kado - Web Application System
 * Copyright © 2015-2019 Bryan Tong, NULLIVEX LLC. All rights reserved.
 * Kado <support@kado.org>
 *
 * This file is part of Kado and bound to the MIT license distributed within.
 */

module.exports = (res)=>{
  module.exports.common(res)
  res.locals._asset.addScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/' +
    'tui-editor/1.4.6/tui-editor-Editor.min.js')
}

module.exports.common = (res) => {
  res.locals._asset.addCssOnce('https://cdnjs.cloudflare.com/ajax/libs/' +
    'codemirror/5.33.0/codemirror.css')
  res.locals._asset.addCssOnce('https://cdnjs.cloudflare.com/ajax/libs/' +
    'highlight.js/9.12.0/styles/github.min.css')
  res.locals._asset.addCssOnce('https://cdnjs.cloudflare.com/ajax/libs/' +
    'tui-editor/1.4.6/tui-editor.min.css')
  res.locals._asset.addCssOnce('https://cdnjs.cloudflare.com/ajax/libs/' +
    'tui-editor/1.4.6/tui-editor-contents.min.css')
  res.locals._asset.addScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/' +
    'codemirror/5.48.4/codemirror.min.js')
  res.locals._asset.addScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/' +
    'markdown-it/10.0.0/markdown-it.min.js')
  res.locals._asset.addScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/' +
    'highlight.js/9.15.10/highlight.min.js')
  res.locals._asset.addScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/' +
    'squire-rte/1.9.0/squire.js')
  res.locals._asset.addScriptOnce('https://bowercdn.net/c/to-mark-1.1.9/dist/' +
    'to-mark.min.js')
  res.locals._asset.addScriptOnce('https://cdn.jsdelivr.net/npm/' +
    'tui-code-snippet@1.5.2/dist/tui-code-snippet.min.js')
  res.locals._asset.addScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/' +
    'Base64/1.0.2/base64.min.js')
}
