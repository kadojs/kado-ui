'use strict';
/**
 * Kado - Web Application System
 * Copyright © 2015-2019 Bryan Tong, NULLIVEX LLC. All rights reserved.
 * Kado <support@kado.org>
 *
 * This file is part of Kado and bound to the MIT license distributed within.
 */

$(document).ready(() => {
  let editor = {}
  $('.tui-content').each(function(){
    var element = $(this)
    var elId = '#' + element.attr('id')
    editor[elId] = new tui.Editor({
      el: document.querySelector(elId),
      initialEditType: 'markdown',
      previewStyle: 'vertical',
      height: '400px',
      codeBlockLanguages: ['ruby','PHP','javascript'],
      initialValue: window.atob(element.attr('data-src')),
      events: {
        change: () => {
          $(element.attr('data-text-id')).val(editor[elId].getMarkdown())
          $(element.attr('data-html-id')).val(editor[elId].getHtml())
        }
      }
    })
  })
})
