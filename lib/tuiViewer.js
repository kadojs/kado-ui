'use strict';
/**
 * Kado - Web Application System
 * Copyright © 2015-2019 Bryan Tong, NULLIVEX LLC. All rights reserved.
 * Kado <support@kado.org>
 *
 * This file is part of Kado and bound to the MIT license distributed within.
 */

module.exports = (res)=>{
  require('./tuiEditor').common(res)
  res.locals._asset.addScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/' +
    'tui-editor/1.4.6/tui-editor-Viewer.min.js')
}
