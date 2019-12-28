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
  name: 'content',
  title: 'Content',
  description: 'Manage and publish content',
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
  let Content = s.doImport(__dirname + '/models/Content.js')
  let ContentRevision = s.doImport(__dirname + '/models/ContentRevision.js')
  s.doImport(__dirname + '/models/ContentNav.js')
  Content.hasMany(ContentRevision,s._relate.cascade())
  ContentRevision.belongsTo(Content,s._relate.cascade())
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
  let Content = s.models.Content
  let where = {[s.Op.or]: []}
  keywords.forEach((w) => {
    where[s.Op.or].push({title: {[s.Op.like]: '%'+w+'%'}})
    where[s.Op.or].push({uri: {[s.Op.like]: '%'+w+'%'}})
    where[s.Op.or].push({content: {[s.Op.like]: '%'+w+'%'}})
  })
  if('main' === app._interfaceName){
    where.uri = {[s.Op.notLike]: 'partial_%'}
    where.active = true
  }
  return Content.findAll({where: where, start: start, limit: limit})
    .then((result) => {return result.map((r) => {
      let uri = app.uri.get('/content/edit') + '?id=' + r.id
      if('main' === app._interfaceName){
        uri = app.uri.get('/content') + '/' + r.uri
      }
      return {
        title: r.title,
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
  const Content = require('./lib/Content').getInstance()
  const ContentNav = require('./lib/ContentNav').getInstance()
  //register permissions
  app.permission.add('/content/create','Create Content')
  app.permission.add('/content/save','Save Content')
  app.permission.add('/content/list','List Content')
  app.permission.add('/content/edit','Edit Content')
  app.permission.add('/content/remove','Remove Content')
  //nav permissions
  app.permission.add('/content/nav/create','Create Content Nav')
  app.permission.add('/content/nav/save','Save Content Nav')
  app.permission.add('/content/nav/list','List Content Nav')
  app.permission.add('/content/nav/edit','Edit Content Nav')
  app.permission.add('/content/nav/remove','Remove Content Nav')
  //register views
  app.view.add('content/create',__dirname + '/admin/view/create.html')
  app.view.add('content/edit',__dirname + '/admin/view/edit.html')
  app.view.add('content/list',__dirname + '/admin/view/list.html')
  //nav views
  app.view.add('content/nav/create',__dirname + '/admin/view/nav/create.html')
  app.view.add('content/nav/edit',__dirname + '/admin/view/nav/edit.html')
  app.view.add('content/nav/list',__dirname + '/admin/view/nav/list.html')
  //register navigation
  app.nav.addGroup('/content','Content','file-alt')
  app.nav.addItem('Content','/content/list','List','list')
  app.nav.addItem('Content','/content/create','Create','plus')
  app.nav.addItem('Content','/content/nav/list','Manage Nav','clipboard-list')
  //register routes
  app.get('/content',(req,res)=>{
    res.redirect(301,'/content/list')
  })
  app.get('/content/list',(req,res)=>{
    const Datatable = require('../../lib/Datatable').getInstance()
    if(!req.query.length){
      Datatable.view(res)
      res.render(
        'content/list',
        {_pageTitle: app._l.content.content + ' ' + app._l.list}
      )
    } else {
      Content.datatable(req,res).then((result) => { res.json(result) })
        .catch((err) => { res.json({error: err.message}) })
    }
  })
  app.get('/content/create',(req,res)=>{
    app.asset.addScriptOnce('/js/util.js')
    app.asset.addScriptOnce('/js/mirrorToUri.js')
    res.render(
      'content/create',
      {_pageTitle: app._l.blog.blog + ' ' + app._l.create}
    )
  })
  app.get('/content/edit',(req,res)=>{
    tuiEditor(res)
    app.asset.addScriptOnce('/js/loadTuiEditor.js')
    res.locals._asset.addScriptOnce('/content/static/revertContent.js')
    Content.get(query.query.id,res.Q)
      .then((result) => {
        if(!result) throw new Error(K._l.content.entry_not_found)
        result.content = base64.fromByteArray(
          Buffer.from(result.content,'utf-8')
        )
        res.render('content/edit',{
          content: result, _pageTitle: app._l.edit + ' ' + app._l.content.content})
      })
      .catch((err) => { res.render('error',{error: err}) })
  })
  app.post('/content/save',(req,res)=>{
    Content.save(req.body)
      .then((content) => {
        if(res.isJSON){
          res.json({content: content.dataValues})
        } else {
          req.flash('success',{
            message: app._l.content.content_entry + ' ' +
              (isNew ? app._l.created : app._l.saved),
            href: '/content/edit?id=' + content.id,
            name: content.id
          })
          res.redirect('/content/list')
        }
      })
      .catch((err) => {
        if(res.isJSON){
          res.json({error: err.message})
        } else {
          res.render('error',{error: err})
        }
      })
  })
  app.post('/content/revert',(req,res)=>{
    Content.revert(req.body)
      .then(() => {
        res.json({
          status: 'ok',
          message: 'Content Reverted',
        })
      })
      .catch((err) => {
        res.status(500)
        res.json({
          status: 'error',
          message: err.message
        })
      })
  })
  app.post('/content/remove',(req,res)=>{
    if(req.query.id) req.body.remove = req.query.id.split(',')
    Content.remove(req.body.remove)
      .then(() => {
        if(res.isJSON){
          res.json({success: app._l.content.content_removed})
        } else {
          req.flash('success',app._l.content.content_removed)
          res.redirect('/blog/list')
        }
      })
      .catch((err) => {
        if(res.isJSON){
          res.json({error: err.message || app._l.content.content_removal_error})
        } else {
          res.render('error',{error: err.message})
        }
      })
  })
  //nav routes
  app.get('/content/nav',(req,res)=>{
    res.redirect(301,app.uri.get('/content/nav/list'))
  })
  app.get('/content/nav/list',(req,res)=>{
    if(!req.query.length){
      datatableView(res)
      res.render('content/nav/list')
    } else {
      ContentNav.datatable(req,res).then((result) => { res.json(result) })
        .catch((err) => { res.json({error: err.message}) })
    }
  })
  app.get('/content/nav/create',(req,res)=>{
    app.asset.addScriptOnce('/js/util.js')
    app.asset.addScriptOnce('/js/mirrorToUri.js')
    res.render('content/nav/create')
  })
  app.get('/content/nav/edit',(req,res)=>{
    ContentNav.get(query.query.id,res.Q)
      .then((result) => {
        if(!result) throw new Error(app._l.content.entry_not_found)
        res.render('content/nav/edit',{item: result})
      })
      .catch((err) => { res.render('error',{error: err}) })
  })
  app.post('/content/nav/save',(req,res)=>{
    ContentNav.save(req.body)
      .then((content) => {
        if(res.isJSON){
          res.json({item: content.dataValues})
        } else {
          req.flash('success',{
            message: K._l.content.content_entry + ' ' +
              (isNew ? app._l.created : app._l.saved),
            href: '/content/nav/edit?id=' + result.id,
            name: result.id
          })
          res.redirect('/content/nav/list')
        }
      })
      .catch((err) => {
        if(res.isJSON){
          res.json({error: err.message})
        } else {
          res.render('error',{error: err})
        }
      })
  })
  app.post('/content/nav/remove',(req,res)=>{
    if(req.query.id) req.body.remove = req.query.id.split(',')
    ContentNav.remove(req.body.remove)
      .then(() => {
        if(res.isJSON){
          res.json({success: app._l.content.content_removed})
        } else {
          req.flash('success',app_l.content.content_removed)
          res.redirect('/blog/list')
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
  app.use('/content/static',app.static(__dirname + '/admin/public'))
}


/**
 * Register in Main Interface
 * @param {Kado} app Main application
 */
exports.main = (app) => {
  const fs = require('fs')
  const base64 = require('base64-js')
  const ToastEditor = require('../../lib/ToastEditor').getInstance()
  const Content = require('./lib/Content').getInstance()
  app.get('/content',(req,res)=>{res.redirect(301,'/')})
  //register routes
  app.get('/content/:contentUri',(req,res)=>{
    let uri = req.params.contentUri
    Content.getByUri(uri,res.Q)
      .then((result) => {
        if(!result){
          //try and locate the content locally
          let contentList = app.config.module.content.content
          if(contentList[uri]){
            let content = contentList[uri]
            if(!fs.existsSync(content.templateFile)){
              throw new Error('Local content template not found: ' +
                content.templateFile)
            }
            //add the view to the view system
            res.locals._view.add('content/' + uri,content.templateFile)
            //now render with this template (so we have partials)
            content._pageTitle = content.title
            res.render('content/' + uri,content)
          } else {
            throw new Error('Content not found')
          }
        } else {
          //load tui viewer
          ToastEditor.viewer(res)
          res.locals._asset.addScriptOnce('/js/loadTuiViewer.js')
          result.contentRaw = result.content
          result.content = base64.fromByteArray(
            Buffer.from(result.content,'utf-8')
          )
          res.render('content/entry',{
            content: result,
            _pageTitle: result.title
          })
        }
      })
      .catch((err) => {
        if('Content not found' === err.message) res.status(404)
        res.render('error',{error: err})
      })
  })
  //register view
  app.view.add('content/entry',__dirname + '/main/view/entry.html')
}


/**
 * CLI Access
 * @param {Kado} app Main application
 */
exports.cli = (app) => {
  const Content = require('./lib/Content').getInstance()
  app.cli.command('content','create',{
    description: 'Create new content entry',
    options: [
      {definition: '-t, --title <s>', description: 'Content Title'},
      {definition: '-u, --uri <s>', description: 'Content URI'},
      {definition: '-c, --content <s>', description: 'Content Data'}
    ],
    action: (opts)=>{
      const title = opts.title || opts.t
      const uri = opts.uri || opts.u
      const content = opts.content || opts.c
      return Content.save({
        title: title,
        uri: uri || title.replace(/[\s]+/g,'-').toLowerCase(),
        content: content,
        html: content,
        active: true
      }).then((result) => { return 'Content entry created: ' + result.id })
    }
  })
  app.cli.command('content','update',{
    description: 'Update content entry',
    options: [
      {definition: '-i, --id <s>', description: 'Content ID'},
      {definition: '-t, --title <s>', description: 'Content Title'},
      {definition: '-u, --uri <s>', description: 'Content URI'},
      {definition: '-c, --content <s>', description: 'Content Content'}
    ],
    action: (opts)=>{
      const id = opts.id || opts.i
      const title = opts.title || opts.t
      const uri = opts.uri || opts.u
      const content = opts.content || opts.c
      if(!id) throw new Error('Content id is required')
      return Content.save({
        id: id,
        title: title,
        uri: uri,
        content: content
      })
        .then(() => { return 'Content entry updated successfully!' })
    }
  })
  app.cli.command('content','remove',{
    description: 'Remove content entry',
    options: [
      {definition: '-i, --id <s>', description: 'Content ID'},
    ],
    action: (opts)=>{
      const id = opts.id || opts.i
      if(!id) throw new Error('Content id is required')
      return Content.remove(id)
        .then(() => { return 'Content entry removed successfully!' })
    }
  })
  app.cli.command('content','list',{
    description: 'List Content Entries',
    action: ()=>{
      const Table = require('cli-table')
      let table = new Table({head: ['Id','Title','URI','Active']})
      let contentCount = 0
      return Content.list().each((row) => {
        contentCount++
        table.push([
          row.id,
          row.title,
          row.uri,
          row.active ? 'Yes' : 'No'
        ])
      })
        .then(() => {
          if(!contentCount) table.push(['No content entries'])
          return table.toString()
        })
    }
  })
}


/**
 * Test Access
 */
exports.test = () => {
  return require('./test/' + exports._kado.name + '.test.js')
}
