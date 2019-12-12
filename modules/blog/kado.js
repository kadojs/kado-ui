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
  const Blog = require(app.lib('Blog')).getInstance()
  const datatableView = require(app.lib('datatableView'))
  const tuiEditor = require(app.lib('tuiEditor'))
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
  app.get('/blog/list',(req,res)=> {
    if(!req.query.length){
      datatableView(res)
      res.render('blog/list',{_pageTitle: K._l.blog.blog + ' ' + K._l.list})
    } else {
      Blog.datatable(req,res).then((result) => { res.json(result) })
        .catch((err) => { res.json({error: err.message}) })
    }
  })
  app.get('/blog/create',(req,res)=>{
    app.asset.addScriptOnce('/js/util.js')
    app.asset.addScriptOnce('/js/mirrorToUri.js')
    res.render('blog/create',{_pageTitle: K._l.blog.blog + ' ' + K._l.create})
  })
  app.get('/blog/edit',(req,res)=> {
    tuiEditor(res)
    app.asset.addScriptOnce('/js/loadTuiEditor.js')
    Blog.get(query.query.id,res.Q)
      .then((result) => {
        if(!result) throw new Error(K._l.blog_entry_not_found)
        result.content = base64.fromByteArray(
          Buffer.from(result.content,'utf-8')
        )
        res.render('blog/edit',{
          blog: result, _pageTitle: K._l.edit + ' ' + K._l.blog.blog})
      })
      .catch((err) => { res.render('error',{error: err}) })
  })
  app.post('/blog/save',(req,res)=>{
    Blog.save(req.body)
      .then((blog) => {
        if(json){
          res.json({blog: blog.dataValues})
        } else {
          req.flash('success',{
            message: K._l.blog.blog_entry + ' ' +
              (isNew ? K._l.created : K._l.saved),
            href: '/blog/edit?id=' + blog.id,
            name: blog.id
          })
          res.redirect('/blog/list')
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
  app.post('/blog/revert',(req,res)=>{
    Blog.revert(req.body)
      .then(() => {
        res.json({
          status: 'ok',
          message: 'Blog Reverted',
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
  app.route('/blog/remove',(req,res)=>{
    if(req.query.id) req.body.remove = req.query.id.split(',')
    Blog.remove(req.body.remove)
      .then(() => {
        if(json){
          res.json({success: K._l.blog.blog_removed})
        } else {
          req.flash('success',K._l.blog.blog_removed)
          res.redirect('/blog/list')
        }
      })
      .catch((err) => {
        if(res.isJSON){
          res.json({error: err.message || K._l.blog.blog_removal_error})
        } else {
          res.render('error',{error: err.message})
        }
      })
  })
  //static routes for the module
  app.use('/blog/static',app.static(__dirname + '/admin/public'))
}


/**
 * Register in Main Interface
 * @param {Kado} app Main application
 */
exports.main = (app) => {
  const tuiViewer = require(app.lib('tuiViewer'))
  //register views
  app.view.add('blog/entry',__dirname + '/main/view/entry.html')
  app.view.add('blog/list',__dirname + '/main/view/list.html')
  //register navigation
  app.nav.addGroup('/blog','Blog','file-alt')
  //register routes
  app.get('/blog',(req,res)=>{
    Blog.list({where: {active: true, order: [['datePosted','DESC']]}},res.Q)
      .then((results) => {
        res.render('blog/list',{
          blogList: results,
          _pageTitle: K._l.blog.blog + ' ' + K._l.list
        })
      })
      .catch((err) => {
        res.render(res.locals._view.get('error'),{error: err})
      })
  })
  app.get('/blog/:blogUri',(req,res)=>{
    tuiViewer(res)
    app.asset.addScriptOnce('/js/loadTuiViewer.js')
    Blog.getByUri(req.params.blogUri,res.Q)
      .then((result) => {
        if(!result) throw new Error('Blog not found')
        result.contentRaw = result.content
        result.content = base64.fromByteArray(
          Buffer.from(result.content,'utf-8')
        )
        if(res.isJSON){
          res.json({blog: result})
        } else {
          res.render('blog/entry',{
            blog: result,
            _pageTitle: result.title
          })
        }
      })
      .catch((err) => {
        if('Blog not found' === err.message) res.status(404)
        if(res.isJSON){
          res.json({error: err.message})
        } else {
          res.render('error',{error: err})
        }
      })
  })
}


/**
 * CLI Access
 * @param {Kado} app Main application
 */
exports.cli = (app) => {
  const Table = require('cli-table')
  const program = require('commander')
  let log = app.log
  let Blog = require(app.lib('Blog')).getInstance()
  let config = app.config
  //create
  program
    .command('create')
    .option('-t, --title <s>','Blog Title')
    .option('-u, --uri <s>','Blog URI')
    .option('-c, --content <s>','Blog Content')
    .description('Create new blog entry')
    .action((opts) => {
      log.info('Creating blog entry')
      Blog.save({
        title: opts.title,
        uri: opts.title.replace(/[\s]+/g,'-').toLowerCase(),
        content: opts.content,
        html: opts.content,
        active: true
      })
        .then((result) => {
          log.info('Blog entry created: ' + result.id)
          process.exit(0)
        })
        .catch((err) => {
          log.error('Failed to create blog entry: ' + err + err.stack)
          process.exit(1)
        })
    })
  //update
  program
    .command('update')
    .option('-i, --id <s>','Blog Id')
    .option('-t, --title <s>','Blog Title')
    .option('-u, --uri <s>','Blog URI')
    .option('-c, --content <s>','Blog Content')
    .description('Update existing blog entry')
    .action((opts) => {
      if(!opts.id) throw new Error('Blog id is required')
      Blog.save({
        id: opts.id,
        title: opts.title,
        uri: opts.uri,
        content: opts.content,
        html: opts.html
      })
        .then(() => {
          log.info('Blog entry updated successfully!')
          process.exit(0)
        })
        .catch((err) => {
           log.error('Could not save blog entry: ' + err + err.stack)
          process.exit(1)
        })
    })
  //remove
  program
    .command('remove')
    .option('-i, --id <s>','Blog Id to remove')
    .description('Remove blog entry')
    .action((opts) => {
      if(!opts.id) throw new Error('Blog Id is required... exiting')
      Blog.remove(opts.id)
        .then(() => {
          log.info('Blog entry removed successfully!')
          process.exit()
        })
        .catch((err) => {
          log.error('Could not remove blog entry: ' + err + err.stack)
        })
    })
  //list
  program
    .command('list')
    .description('List blog entries')
    .action(() => {
      let table = new Table({
        head: ['Id','Title','Content','Active']
      })
      let blogCount = 0
      Blog.list()
        .each((row) => {
          blogCount++
          table.push([
            row.id,
            row.title,
            row.uri,
            row.content.replace(/<(?:.|\n)*?>/gm, '').substring(0,50),
            row.active ? 'Yes' : 'No'
          ])
        })
        .then(() => {
          if(!blogCount) table.push(['No blog entries'])
          console.log(table.toString())
          process.exit(0)
        })
        .catch((err) => {
          log.error('Could not list blog entries ' + err.stack)
          process.exit(1)
        })
    })
  program.version(config.version)
  if(process.argv.length - 3 < 0) program.help()
  else program.parse(process.argv)
}


/**
 * Test Access
 */
exports.test = () => {
  return require('./test/' + exports._kado.name + '.test.js')
}
