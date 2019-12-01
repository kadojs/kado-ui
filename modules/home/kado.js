'use strict';
/**
 * Kado - Web Application System
 * Copyright © 2015-2019 Bryan Tong, NULLIVEX LLC. All rights reserved.
 * Kado <support@kado.org>
 *
 * This file is part of Kado and bound to the MIT license distributed within.
 */

//module properties
exports._kado = {
  enabled: true,
  name: 'home',
  title: 'Home',
  description: 'Manage and publish home entries'
}


/**
 * Register in Admin Interface
 * @param {object} app
 */
exports.admin = (app) => {
  let admin = require('./admin/index')
  //register basic views
  app.view.add('alert',__dirname + '/../../admin/view/alert.html')
  app.view.add('breadcrumb',__dirname + '/../../admin/view/breadcrumb.html')
  app.view.add('error',__dirname + '/../../admin/view/error.html')
  app.view.add('footer',__dirname + '/../../admin/view/footer.html')
  app.view.add('header',__dirname + '/../../admin/view/header.html')
  app.view.add('home',__dirname + '/../../admin/view/home.html')
  app.view.add('login',__dirname + '/../../admin/view/login.html')
  app.view.add('navbar',__dirname + '/../../admin/view/navbar.html')
  app.view.add('search',__dirname + '/../../admin/view/search.html')
  app.view.add('sidebar',__dirname + '/../../admin/view/sidebar.html')
  //register routes
  app.get('/',admin.index)
}


/**
 * Register in Main Interface
 * @param {object} app
 */
exports.main = (app) => {
  let main = require('./main/index')
  //register basic views
  app.view.add('error',__dirname + '/../../main/view/error.html')
  app.view.add('home',__dirname + '/../../main/view/home.html')
  app.view.add('login',__dirname + '/../../main/view/login.html')
  //register routes
  app.get('/',main.index)
}
