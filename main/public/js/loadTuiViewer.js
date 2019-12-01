'use strict';
/**
 * Kado - Web Application System
 * Copyright © 2015-2019 Bryan Tong, NULLIVEX LLC. All rights reserved.
 * Kado <support@kado.org>
 *
 * This file is part of Kado and bound to the MIT license distributed within.
 */

$(document).ready(() => {
  $('.tui-content').each(function(){
    var element = $(this)
    var elId = '#' + element.attr('id')
    var editor = new tui.Editor({
      el: document.querySelector(elId),
      initialValue: window.atob(element.attr('data-src'))
    })
    editor.ok = true
  })
})
