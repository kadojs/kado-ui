'use strict';
/**
 * Kado - Web Application System
 * Copyright © 2015-2019 Bryan Tong, NULLIVEX LLC. All rights reserved.
 * Kado <support@kado.org>
 *
 * This file is part of Kado and bound to the MIT license distributed within.
 */

//module properties
exports._kado ={
  enabled: true,
  name: 'setting',
  title: 'Settings',
  description: 'Manage Kado settings directly to the config',
  languagePacks: [
    __dirname + '/lang/eng.js',
    __dirname + '/lang/spa.js',
  ]
}


/**
 * Register in Admin Interface
 * @param {Kado} app
 */
exports.admin = (app) => {
  let admin = require('./admin')
  //register permissions
  app.permission.add('/setting/list','List settings')
  app.permission.add('/setting/edit','Edit etting')
  app.permission.add('/setting/save','Save etting')
  //register routes
  app.get(app.uri.p('/setting'),(req,res) => {
    res.redirect(301,app.uri.p('/setting/list'))
  })
  app.get(app.uri.p('/setting/list'),admin.list)
  app.get(app.uri.p('/setting/edit'),admin.edit)
  app.post(app.uri.p('/setting/list'),admin.listAction)
  app.post(app.uri.p('/setting/save'),admin.save)
}
