'use strict';
/**
 * Kado - Web Application System
 * Copyright © 2015-2019 Bryan Tong, NULLIVEX LLC. All rights reserved.
 * Kado <support@kado.org>
 *
 * This file is part of Kado and bound to the MIT license distributed within.
 */

module.exports = class Datatable {
  static getInstance(){ return new Datatable() }
  view(res){
    res.locals._asset.addScriptOnce(
      'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.36/pdfmake.min.js')
    res.locals._asset.addScriptOnce(
      'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.36/vfs_fonts.js')
    res.locals._asset.addScriptOnce(
      'https://cdn.datatables.net/v/bs4/jszip-2.5.0/dt-1.10.20/b-1.6.1/' +
      'b-colvis-1.6.1/b-html5-1.6.1/b-print-1.6.1/cr-1.5.2/fc-3.3.0/' +
      'fh-3.1.6/kt-2.5.1/r-2.2.3/rr-1.2.6/sl-1.3.1/datatables.min.js')
    res.locals._asset.addScriptOnce('/js/DataTableConfig.js')
    res.locals._asset.addScriptOnce('/js/util.js')
    res.locals._asset.addScriptOnce('/js/dataTableList.js')
    res.locals._asset.addCssOnce(
      'https://cdn.datatables.net/v/bs4/jszip-2.5.0/dt-1.10.20/b-1.6.1/' +
      'b-colvis-1.6.1/b-flash-1.6.1/b-html5-1.6.1/b-print-1.6.1/cr-1.5.2/' +
      'fc-3.3.0/fh-3.1.6/r-2.2.3/rr-1.2.6/sl-1.3.1/datatables.min.css')
  }
}
