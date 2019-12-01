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
  name: 'doc',
  title: 'Doc',
  description: 'Manage and publish documents based on versions and revisions',
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
  let s = app.db.sequelize
  let opts = s._relate.cascade()
  let Doc = s.doImport(__dirname + '/models/Doc.js')
  let DocRevision = s.doImport(__dirname + '/models/DocRevision.js')
  let DocProject = s.doImport(__dirname + '/models/DocProject.js')
  let DocProjectVersion = s.doImport(__dirname + '/models/DocProjectVersion.js')
  Doc.hasMany(DocRevision,opts)
  DocRevision.belongsTo(Doc,opts)
  DocProject.hasMany(DocProjectVersion,opts)
  DocProjectVersion.belongsTo(DocProject,opts)
  DocProjectVersion.hasMany(Doc,opts)
  Doc.belongsTo(DocProjectVersion,opts)
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
  let s = K.db.sequelize
  let Doc = s.models.Doc
  let DocProject = s.models.DocProject
  let DocProjectVersion = s.models.DocProjectVersion
  let where = {[s.Op.or]: []}
  keywords.forEach((w) => {
    where[s.Op.or].push({id: {[s.Op.like]: '%'+w+'%'}})
  })
  return Doc.findAll({where: where, start: start, limit: limit, include: [
    {model: DocProjectVersion, include: [DocProject]}
  ]})
    .then((result) => {return result.map((r) => {
      let uri = app.uri.get('/doc/edit') + '?id=' + r.id
      if('main' === app._interfaceName){
        uri = app.uri.get('/doc') + '/' + r.uri
      }
      return {
        title: r.id,
        description: r.html,
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
  let admin = require('./admin/index')
  //register permissions
  //doc permissions
  app.permission.add('/doc/create','Create Doc')
  app.permission.add('/doc/save','Save Doc')
  app.permission.add('/doc/list','List Doc')
  app.permission.add('/doc/edit','Edit Doc')
  app.permission.add('/doc/remove','Remove Doc')
  //project perms
  app.permission.add('/doc/project/create','Create Doc Project')
  app.permission.add('/doc/project/save','Save Doc Project')
  app.permission.add('/doc/project/list','List Doc Projects')
  app.permission.add('/doc/project/edit','Edit Doc Project')
  app.permission.add('/doc/project/remove','Remove Doc Project')
  //version perms
  app.permission.add('/doc/version/create','Create Doc Project Version')
  app.permission.add('/doc/version/save','Save Doc Project Version')
  app.permission.add('/doc/version/edit','Edit Doc Project Version')
  app.permission.add('/doc/version/remove','Remove Doc Project Version')
  //register views
  //doc views
  app.view.add('doc/create',__dirname + '/admin/view/create.html')
  app.view.add('doc/edit',__dirname + '/admin/view/edit.html')
  app.view.add('doc/list',__dirname + '/admin/view/list.html')
  //project views
  app.view.add('doc/project/create',__dirname +
    '/admin/view/project/create.html')
  app.view.add('doc/project/edit',__dirname + '/admin/view/project/edit.html')
  app.view.add('doc/project/list',__dirname + '/admin/view/project/list.html')
  //version views
  app.view.add('doc/version/create',__dirname +
    '/admin/view/version/create.html')
  app.view.add('doc/version/edit',__dirname + '/admin/view/version/edit.html')
  //register navigation
  app.nav.addGroup('/doc','Doc','file-alt')
  app.nav.addItem('Doc','/doc/list','List','list')
  app.nav.addItem('Doc','/doc/create','Create','plus')
  app.nav.addItem('Doc','/doc/project/list',
    'List Projects','umbrella')
  //register routes
  //main doc routes
  app.get('/doc',(req,res) => {
    res.redirect(301,'/doc/list')
  })
  app.get('/doc/list',admin.list)
  app.get('/doc/create',admin.create)
  app.get('/doc/edit',admin.edit)
  app.post('/doc/save',admin.save)
  app.post('/doc/revert',admin.revert)
  app.post('/doc/remove',admin.remove)
  app.get('/doc/remove',admin.remove)
  //project routes
  app.get('/doc/project',(req,res) => {
    res.redirect(301,'/doc/project/list')
  })
  app.get('/doc/project/list',admin.project.list)
  app.get('/doc/project/create',admin.project.create)
  app.get('/doc/project/edit',admin.project.edit)
  app.post('/doc/project/save',admin.project.save)
  app.post('/doc/project/remove',admin.project.remove)
  app.get('/doc/project/remove',admin.project.remove)
  //version routes
  app.get('/doc/version/create',admin.version.create)
  app.get('/doc/version/edit',admin.version.edit)
  app.post('/doc/version/save',admin.version.save)
  app.post('/doc/version/remove',admin.version.remove)
  app.get('/doc/version/remove',admin.version.remove)
}


/**
 * Register in Main Interface
 * @param {Kado} app Main application
 */
exports.main = (app) => {
  let main = require('./main/index')
  //register routes
  app.get('/doc/project',main.project.index)
  app.get('/doc/project/:uri',main.project.entry)
  app.get('/doc',main.index)
  app.get('/doc/:project/:version/:uri',main.entry)
  app.get('/doc/:project/:version',main.list)
  app.get('/doc/:project',main.versionList)
  //register navigation
  app.nav.addGroup('/doc','Documentation','file-alt')
  //register views
  app.view.add('doc/entry',__dirname + '/main/view/entry.html')
  app.view.add('doc/versionList',__dirname + '/main/view/versionList.html')
  app.view.add('doc/list',__dirname + '/main/view/list.html')
  app.view.add('doc/project/entry',__dirname + '/main/view/project/entry.html')
  app.view.add('doc/project/list',__dirname + '/main/view/project/list.html')
}


/**
 * Test Access
 */
exports.test = () => {
  return require('./test/' + exports._kado.name + '.test.js')
}
