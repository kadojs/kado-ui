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
  const Doc = require('./lib/Doc').getInstance()
  const tuiEditor = require('../../lib/tuiEditor')
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
  app.get('/doc',(req,res) => {
    res.redirect(301,'/doc/list')
  })
  app.get('/doc/list',(req,res)=>{
    const datatableView = require('../../lib/datatableView')
    if(!req.query.length){
      datatableView(res)
      res.render(
        'doc/list',
        {_pageTitle: app._l.doc.doc + ' ' + app._l.list}
      )
    } else {
      Doc.datatable(req,res).then((result) => { res.json(result) })
        .catch((err) => { res.json({error: err.message}) })
    }
  })
  app.get('/doc/create',(req,res)=>{
    app.asset.addScriptOnce('/js/util.js')
    app.asset.addScriptOnce('/js/mirrorToUri.js')
    Doc.listProjects(res.Q)
      .then((result) => {
        res.render('doc/create',{
          projects: result,
          _pageTitle: app._l.doc.doc + ' ' + app._l.create
        })
      })
  })
  app.get('/doc/edit',(req,res)=>{
    tuiEditor(res)
    app.asset.addScriptOnce('/js/loadTuiEditor.js')
    app.asset.addScriptOnce('/doc/static/revertDoc.js')
    Doc.get(req.query.id)
      .then((result) => {
        if(!result) throw new Error(app._l.doc.entry_not_found)
        result.content = base64.fromByteArray(
          Buffer.from(result.content,'utf-8')
        )
        res.render('doc/edit',{
          item: result,
          _pageTitle: app._l.edit + ' ' + app._l.doc.doc + ' ' + result.title
        })
      })
      .catch((err) => {
        res.render('error',{error: err})
      })
  })
  app.post('/doc/save',(req,res)=>{
    Doc.save(req.body)
      .then((result) => {
        if(res.isJSON){
          res.json({item: result.dataValues})
        } else {
          req.flash('success',{
            message: app._l.doc.entry + ' ' +
              (result.isNew ? app._l.created : app._l.saved),
            href: app.uri.get('/doc/edit') + '?id=' + doc.id,
            name: result.id
          })
          res.redirect(app.uri.get('/doc/list'))
        }
      })
      .catch((err) => {
        res.render('error',{error: err})
      })
  })
  app.post('/doc/revert',(req,res)=>{
    Doc.revert(req.data)
      .then(() => {
        res.json({status: 'ok', message: 'Document Reverted'})
      })
      .catch((err) => {
        res.status(500)
        res.json({status: 'error', message: err.message})
      })
  })
  app.post('/doc/remove',(req,res)=>{
    if(req.query.id) req.body.remove = req.query.id.split(',')
    if(!(req.body.remove instanceof Array)) req.body.remove = [req.body.remove]
    Doc.remove(req.body.remove)
      .then(() => {
        if(res.isJSON){
          res.json({success: app._l.doc.removed})
        } else {
          req.flash('success',app._l.doc.removed)
          res.redirect('/doc/list')
        }
      })
      .catch((err) => {
        if(res.isJSON){
          res.json({error: err.message || app._l.doc.removal_error})
        } else {
          res.render('error',{error: err.message})
        }
      })
  })
  //project routes
  app.get('/doc/project',(req,res) => {
    res.redirect(301,'/doc/project/list')
  })
  app.get('/doc/project/list',(req,res)=>{
    if(!req.query.length){
      datatableView(res)
      res.render(
        'doc/project/list',
        {_pageTitle: app._l.doc.doc_project + ' ' + app._l.list}
      )
    } else {
      Doc.datatable(req,res).then((result) => { res.json(result) })
        .catch((err) => { res.json({error: err.message}) })
    }
  })
  app.get('/doc/project/create',(req,res)=>{
    app.asset.addScriptOnce('/js/util.js')
    app.asset.addScriptOnce('/js/mirrorToUri.js')
    res.render('doc/project/create',{
      _pageTitle: app._l.doc.doc_project + ' ' + app._l.create})
  })
  app.get('/doc/project/edit',(req,res)=>{
    Doc.getProject(req.query.id,res.Q)
      .then((result) => {
        if(!result) throw new Error(app._l.doc.entry_not_found)
        res.render('doc/project/edit',{
          item: result,
          _pageTitle: app._l.doc.doc_project + ' ' +
            app._l.create + ' ' + result.name
        })
      })
      .catch((err) => {
        res.render('error',{error: err})
      })
  })
  app.post('/doc/project/save',(req,res)=>{
    Doc.saveProject(req.body)
      .then((result) => {
        if(res.isJSON){
          res.json({item: result.result.dataValues})
        } else {
          req.flash('success',{
            message: app._l.doc.entry + ' ' +
              (result.isNew ? app._l.created : app._l.saved),
            href: '/doc/project/edit?id=' + result.result.id,
            name: result.result.id
          })
          req.flash('info','NOTE: Create a version below ' +
            'before creating documents.')
          res.redirect('/doc/project/edit?id=' + result.result.id)
        }
      })
      .catch((err) => {
        res.render('error',{error: err})
      })
  })
  app.post('/doc/project/remove',(req,res)=>{
    if(req.query.id) req.body.remove = req.query.id.split(',')
    if(!(req.body.remove instanceof Array)) req.body.remove = [req.body.remove]
    Doc.removeProject(req.body.remove)
      .then(() => {
        if(res.isJSON){
          res.json({success: app._l.doc.removed_project})
        } else {
          req.flash('success',app._l.doc.removed_project)
          res.redirect('/doc/project/list')
        }
      })
      .catch((err) => {
        if(res.isJSON){
          res.json({error: err.message || app._l.doc.removal_error})
        } else {
          res.render('error',{error: err.message})
        }
      })
  })
  //version routes
  app.get('/doc/version/create',(req,res)=>{
    if(!req.query.project){
      res.render('error',{error: 'Missing project id'})
    } else {
      res.render('doc/version/create',{
        project: req.query.project,
        _pageTitle: app._l.doc.doc_project_version + ' ' + app._l.list
      })
    }
  })
  app.get('/doc/version/edit',(req,res)=>{
    if(req.query.DocProjectVersionId) req.query.id = req.query.DocProjectVersionId
    Doc.getProjectVersion(req.query.id)
      .then((result) => {
        if(!result) throw new Error(app._l.doc.entry_not_found)
        res.render('doc/version/edit',{
          item: result,
          _pageTitle: app._l.doc.doc_project_version + ' ' + app._l.list +
            ' ' + result.name
        })
      })
      .catch((err) => {
        res.render('error',{error: err})
      })
  })
  app.post('/doc/version/save',(req,res)=>{
    Doc.saveProjectVersion(req.body)
      .then((result) => {
        if(res.isJSON){
          res.json({item: result.result.dataValues})
        } else {
          req.flash('success',{
            message: app._l.doc.entry + ' ' +
              (result.isNew ? app._l.created : app._l.saved),
            href: '/doc/version/edit?id=' + result.id,
            name: result.id
          })
          res.redirect('/doc/project/edit?id=' + result.DocProject.id)
        }
      })
      .catch((err) => {
        res.render('error',{error: err})
      })
  })
  app.post('/doc/version/remove',(req,res)=>{
    if(req.query.id) req.body.remove = req.query.id.split(',')
    if(req.query.project) req.body.project = req.query.project
    if(req.query.DocProjectId) req.body.project = req.query.DocProjectId
    if(!(req.body.remove instanceof Array)) req.body.remove = [req.body.remove]
    Doc.removeProjectVersion(req.body.remove)
      .then(() => {
        if(res.isJSON){
          res.json({success: app._l.doc.removed_version})
        } else {
          req.flash('success',app._l.doc.removed_version)
          if(req.body.project){
            res.redirect(301,'/doc/project/edit?id=' + req.body.project)
          } else {
            res.redirect('/doc/project/list')
          }
        }
      })
      .catch((err) => {
        if(res.isJSON){
          res.json({error: err.message})
        } else {
          res.render('error',{error: err.message})
        }
      })
  })
  //static routes
  app.use('/doc/static',app.static(__dirname + '/admin/public'))
}


/**
 * Register in Main Interface
 * @param {Kado} app Main application
 */
exports.main = (app) => {
  const Doc = require('./lib/Doc').getInstance()
  //register navigation
  app.nav.addGroup('/doc','Documentation','file-alt')
  //register views
  app.view.add('doc/entry',__dirname + '/main/view/entry.html')
  app.view.add('doc/versionList',__dirname + '/main/view/versionList.html')
  app.view.add('doc/list',__dirname + '/main/view/list.html')
  app.view.add('doc/project/entry',__dirname + '/main/view/project/entry.html')
  app.view.add('doc/project/list',__dirname + '/main/view/project/list.html')
  //register routes
  app.get('/doc/project',(req,res)=>{
    Doc.listProjectsSorted(res.Q)
      .then((results) => {
        res.render('doc/project/list',{
          projectList: results,
          _pageTitle: app._l.doc.doc_project + ' ' + app._l.list
        })
      })
      .catch((err) => {
        res.render('error',{error: err})
      })
  })
  app.get('/doc/project/:uri',(req,res)=>{
    Doc.getProject(req.query.id,res.Q)
      .then((result) => {
        res.render('doc/project/entry',{
          item: result,
          _pageTitle: result.name
        })
      })
      .catch((err) => {
        res.render('error',{error: err})
      })
  })
  app.get('/doc',(req,res)=>{
    res.redirect('/doc/project')
  })
  app.get('/doc/:project/:version/:uri',(req,res)=>{
    let docList
    let q = res.Q
    q.include = [
      {model: DocProjectVersion, where: {name: req.params.version}, include: [
          {model: DocProject, where: {uri: req.params.project}}
        ]}
    ]
    q.order = [['sortNum','ASC']]
    Doc.findAll(q)
    Doc.listDocuments(req.params.version,req.params.project,res.Q)
      .then((result) => {
        docList = result
        return Doc.getFull(
          req.params.uri,
          req.params.version,
          req.params.project,
          res.Q
        )
      })
      .then((result) => {
        if(!result) throw new Error('Document not found')
        //load tui viewer
        tuiViewer(res)
        app.asset.addScriptOnce('/js/loadTuiViewer.js')
        result.contentRaw = result.content
        result.content = base64.fromByteArray(
          Buffer.from(result.content,'utf-8'))
        res.render('doc/entry',{
          doc: result,
          docList: docList,
          _pageTitle: result.title
        })
      })
      .catch((err) => {
        if('Document not found' === err.message) res.status(404)
        res.render('error',{error: err})
      })
  })
  app.get('/doc/:project/:version',(req,res)=>{
    Doc.listDocuments(req.params.version,req.params.project,res.Q)
      .then((result) => {
        if(!result) throw new Error('This project version has no documents.')
        res.render('doc/list',{
          project: result[0].DocProjectVersion.DocProject,
          version: result[0].DocProjectVersion,
          docList: result,
          _pageTitle: app._l.doc.doc + ' ' + app._l.list
        })
      })
      .catch((err) => {
        res.render('error',{error: err.message})
      })
  })
  app.get('/doc/:project',(req,res)=>{
    Doc.listProjectVersions(req.params.project,res.Q)
      .then((result) => {
        if(!result) throw new Error('This project has no versions')
        res.render('doc/versionList',{
          project: result[0].DocProject,
          versionList: result,
          _pageTitle: app._l.doc.doc_project_version + ' ' + app._l.list
        })
      })
      .catch((err) => {
        res.render('error',{error: err.message})
      })
  })
}


/**
 * Test Access
 */
exports.test = () => {
  return require('./test/' + exports._kado.name + '.test.js')
}
