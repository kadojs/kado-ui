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
  name: 'blog',
  title: 'Blog',
  description: 'Manage and publish blog entries',
  languagePacks: [
    __dirname + '/lang/eng.js',
    __dirname + '/lang/spa.js',
  ]
}


/**
 * Initialize database access
 * @param {Kado} app Main application
 */
exports.db = (app) => {
  const s = app.db.sequelize
  let opts = s._relate.cascade()
  let Blog = s.doImport(__dirname + '/models/Blog.js')
  let BlogRevision = s.doImport(__dirname + '/models/BlogRevision.js')
  Blog.hasMany(BlogRevision,opts)
  BlogRevision.belongsTo(Blog,opts)
}


/**
 * Provide search
 * @param {Kado} app Main application
 * @param {array} keywords
 * @param {number} start
 * @param {number} limit
 * @return {Promise}
 */
exports.search = (app,keywords,start,limit) => {
  let s = app.db.sequelize
  let Blog = s.models.Blog
  let where = {[s.Op.or]: []}
  keywords.forEach((w) => {
    where[s.Op.or].push({title: {[s.Op.like]: '%'+w+'%'}})
    where[s.Op.or].push({uri: {[s.Op.like]: '%'+w+'%'}})
    where[s.Op.or].push({content: {[s.Op.like]: '%'+w+'%'}})
  })
  if('main' === app._interfaceName) where.active = true
  return Blog.findAll({where: where, start: start, limit: limit})
    .then((result) => {return result.map((r) => {
      let uri = app.uri.get('/blog/edit') + '?id=' + r.id
      if('main' === app._interfaceName){
        uri = app.uri.get('/blog') + '/' + r.uri
      }
      return {
        title: r.title,
        description: r.content.substring(0,150),
        uri: uri,
        updatedAt: r.updatedAt
      }
    })})
}


/**
 * Register in Admin Interface
 * @param {Kado} app Main application
 */
exports.admin = (app) => {
  let admin = require('./admin')
  //register permissions
  app.permission.add('/blog/create','Create blog')
  app.permission.add('/blog/save','Save blog')
  app.permission.add('/blog/list','List blog')
  app.permission.add('/blog/edit','Edit blog')
  app.permission.add('/blog/revert','Revert blog')
  app.permission.add('/blog/remove','Remove blog')
  //register views
  app.view.add('blog/create',__dirname + '/admin/view/create.html')
  app.view.add('blog/edit',__dirname + '/admin/view/edit.html')
  app.view.add('blog/list',__dirname + '/admin/view/list.html')
  //register navigation
  app.nav.addGroup('/blog','Blog','file-alt')
  app.nav.addItem('Blog','/blog/list','List','list')
  app.nav.addItem('Blog','/blog/create','Create','plus')
  //register routes
  app.get('/blog',(req,res) => {
    res.redirect(301,'/blog/list')
  })
  app.get('/blog/list',admin.list)
  app.get('/blog/create',admin.create)
  app.get('/blog/edit',admin.edit)
  app.post('/blog/save',admin.save)
  app.post('/blog/revert',admin.revert)
  app.post('/blog/remove',admin.remove)
  app.get('/blog/remove',admin.remove)
  //static routes for the module
  app.use('/blog/static',app.static(__dirname + '/admin/public'))
}


/**
 * Register in Main Interface
 * @param {Kado} app Main application
 */
exports.main = (app) => {
  let main = require('./main')
  //register routes
  app.get('/blog',main.index)
  app.get('/blog/:blogUri',main.entry)
  //register views
  app.view.add('blog/entry',__dirname + '/main/view/entry.html')
  app.view.add('blog/list',__dirname + '/main/view/list.html')
  //register navigation
  app.nav.addGroup('/blog','Blog','file-alt')
}


/**
 * CLI Access
 * @param {Kado} app Main application
 */
exports.cli = (app) => {
  require('./cli/blog')(app)
}


/**
 * Test Access
 */
exports.test = () => {
  return require('./test/' + exports._kado.name + '.test.js')
}
