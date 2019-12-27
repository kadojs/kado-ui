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
  name: 'staff',
  title: 'Staff',
  description: 'Manage Kado Staff',
  languagePacks: [
    __dirname + '/lang/eng.js',
    __dirname + '/lang/spa.js',
  ],
  providesAuthentication: true
}


/**
 * Initialize database access
 * @param {Kado} app Main application
 */
exports.db = (app) => {
  const s = app.db.sequelize
  let opts = s._relate.cascade()
  let Staff = s.doImport(__dirname + '/model/Staff.js')
  let StaffPermission = s.doImport(__dirname + '/model/StaffPermission.js')
  s.doImport('../blog/models/Blog.js')
  Staff.hasMany(StaffPermission,opts)
  StaffPermission.belongsTo(Staff,opts)
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
  const P = require('bluebird')
  //restrict searching staff from main
  if('main' === app._interfaceName) return P.try(() => {})
  let s = app.db.sequelize
  let Staff = s.models.Staff
  let where = {[s.Op.or]: []}
  keywords.forEach((w) => {
    where[s.Op.or].push({name: {[s.Op.like]: '%'+w+'%'}})
    where[s.Op.or].push({email: {[s.Op.like]: '%'+w+'%'}})
  })
  return Staff.findAll({where: where, start: start, limit: limit})
    .then((result) => {return result.map((r) => {return {
      title: r.name || r.email,
      description: r.email,
      uri: app.uri.get('/staff/edit') + '?id=' + r.id,
      updatedAt: r.updatedAt
    }})})
}


/**
 * Authenticate requests
 * @param {Kado} app Main application
 * @param {string} username
 * @param {string} password
 * @param {function} done
 */
exports.authenticate = (app,username,password,done) => {
  const Staff = require('./lib/Staff').getInstance()
  Staff.authenticate(username,password)
    .then((user) => {
      done(null,true,user.dataValues)
    })
    .catch((e) => {
      done(e,false)
    })
}


/**
 * Register in Admin Interface
 * @param {Kado} app Main application
 */
exports.admin = (app) => {
  const Staff = require('./lib/Staff').getInstance()
  //register permissions
  app.permission.add('/staff/create','Create staff member')
  app.permission.add('/staff/list','List staff members')
  app.permission.add('/staff/edit','Edit staff member')
  app.permission.add('/staff/save','Save staff member')
  app.permission.add('/staff/remove','Remove staff member')
  app.permission.add('/staff/grant','Grant staff member permission')
  app.permission.add('/staff/revoke','Revoke staff member permission')
  //register views
  app.view.add('staff/create',__dirname + '/admin/view/create.html')
  app.view.add('staff/edit',__dirname + '/admin/view/edit.html')
  app.view.add('staff/list',__dirname + '/admin/view/list.html')
  //staff routes
  app.router.p('/login')
  app.router.p('/logout')
  app.get('/staff',(req,res)=>{
    res.redirect(301,'/staff/list')
  })
  app.get('/staff/list',(req,res)=>{
    const datatableView = require('../../lib/datatableView')
    if(!req.query.length){
      datatableView(res)
      res.render(
        'staff/list',
        {_pageTitle: app._l.staff.staff + ' ' + app._l.list}
      )
    } else {
      Staff.datatable(req,res).then((result) => { res.json(result) })
        .catch((err) => { res.json({error: err.message}) })
    }
  })
  app.get('/staff/create',(req,res)=>{
    res.render('staff/create',{
      _pageTitle: app._l.staff.staff + ' ' + app._l.create
    })
  })
  app.get('/staff/edit',(req,res)=>{
    P.try(()=>{
      if(req.query.id) return Staff.get(req.query.id)
      if(req.query.email) return Staff.getByEmail(req.query.email)
      throw new Error('ID or Email required to lookup Staff')
    })
      .then((result)=>{
        if(!result) throw new Error('Staff not found')
        let perm = []
        res.locals._permission.all().forEach((p) => {
          let allowed = false
          result.StaffPermissions.forEach((sp) => {
            if(sp.name === p.name) allowed = true
          })
          p.allowed = allowed
          perm.push(p)
        })
        res.render('staff/edit',{
          staff: result.dataValues,
          perm: perm,
          _pageTitle: app._l.staff.staff + ' ' + app._l.edit + ' ' + result.name
        })
      })
      .catch((err) => {
        res.render('error',{error: err.message})
      })
  })
  app.post('/staff/save',(req,res)=>{
    Staff.save(req.body)
      .then((result) => {
        if(res.isJSON){
          res.json({staff: result.dataValues})
        } else {
          req.flash('success',{
            message: app._l.staff.staff + ' ' +
              (result.isNewRecord ? app._l.created : app._l.saved),
            href: app.uri.get('/staff/edit') + '?id=' + result.result.id,
            name: result.result.id
          })
          res.redirect(app.uri.get('/staff/list'))
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
  app.get('/staff/grant',(req,res)=>{
    Staff.grant(req.query)
      .then(()=>{
        if(res.isJSON){
          res.json({success: app._l.staff.permission_granted})
        } else {
          req.flash('success',app._l.staff.permission_granted)
          res.redirect(301,app.uri.get('/staff/edit') + '?id=' + id)
        }
      })
      .catch((err) => {
        if(res.isJSON){
          res.json({error: err.message})
        } else {
          req.flash('warning',err.message)
          res.redirect(301,app.uri.get('/staff/edit') + '?id=' + id)
        }
      })
  })
  app.get('/staff/revoke',(req,res)=>{
    Staff.revoke(req.query)
      .then(()=>{
        if(res.isJSON){
          res.json({success: app._l.staff.premission_revoked})
        } else {
          req.flash('success',app._l.staff.premission_revoked)
          res.redirect(301,app.uri.get('/staff/edit') + '?id=' + id)
        }
      })
      .catch((err) => {
        if(res.isJSON){
          res.json({error: err.message})
        } else {
          req.flash('warning',err.message)
          res.redirect(301,app.uri.get('/staff/edit') + '?id=' + id)
        }
      })
  })
  app.post('/staff/remove',(req,res)=>{
    Staff.remove(req.body.remove)
      .then(() => {
        if(res.isJSON){
          res.json({success: app._l.staff.staff_removed})
        } else {
          req.flash('success',app._l.staff.staff_removed)
          res.redirect(app.uri.get('/staff/list'))
        }
      })
      .catch((err) => {
        if(res.isJSON){
          res.json({error: err.message || app._l.staff.err_staff_removed})
        } else {
          res.render('error',{error: err.message})
        }
      })
  })
}


/**
 * CLI Access
 * @param {Kado} app Main application
 */
exports.cli = (app) => {
  const Staff = require('./lib/Staff').getInstance()
  app.cli.command('staff','create',{
    description: 'Create staff member',
    options: [
      {definition: '-e, --email <s>', description: 'Email Address'},
      {definition: '-p, --password <s>', description: 'Password'},
      {definition: '-n, --name <s>', description: 'Name'}
    ],
    action: (opts)=>{
      const params = {
        email: opts.email || opts.e,
        password: opts.password || opts.p,
        name: opts.name || opts.n,
        active: true
      }
      return Staff.save(params)
        .then((result) => { return 'Staff member created: ' + result.id })
        .catch((err) => { return err.message })
    }
  })
  app.cli.command('staff','update',{
    description: 'Update existing staff member',
    options: [
      {
        definition: '-e, --email <s>',
        description: 'Email used to look up staff member'
      },
      {
        definition: '-E, --newEmail <s>',
        description: 'New email address if its being changed'
      },
      {definition: '-p, --password <s>', description: 'Password'},
      {definition: '-n, --name <s>', description: 'Name'}
    ],
    action: (opts)=>{
      const params = { email: opts.email || opts.e }
      if(opts.newEmail) params.email = opts.newEmail || opts.E
      if(opts.password) params.password = opts.password || opts.p
      if(opts.name) params.name = opts.name || opts.n
      return Staff.getByEmail(params.email)
        .then((result)=>{
          if(!result) throw new Error('Staff member not found')
          params.id = result.id
          return Staff.save(params)
        })
        .then(() => { return 'Staff member updated successfully!' })
        .catch((err) => { return err.message })
    }
  })
  app.cli.command('staff','remove',{
    description: 'Remove staff member',
    options: [
      {
        definition: '-e, --email <s>',
        description: 'Email of staff member to remove'
      },
    ],
    action: (opts)=>{
      const email = opts.email || opts.e
      if(!email) throw new Error('Staff email is required')
      return Staff.removeByEmail(email)
        .then(() => { return 'Staff member removed successfully!' })
        .catch((err) => { return err.message })
    }
  })
  app.cli.command('staff','grant',{
    description: 'Grant permission to staff member',
    options: [
      {
        definition: '-e, --email <s>',
        description: 'Email of staff member to grant permission'
      },
      {
        definition: '-p, --perm <s>',
        description: 'Name of permission to grant, usually URI'
      }
    ],
    action: (opts)=>{
      const email = opts.email || opts.e
      const perm = opts.perm || opts.email
      if(!email || !perm) throw new Error('Email and Perm required')
      return Staff.getByEmail(email)
        .then((result) => {
          if(!result) throw new Error('Staff member not found')
          return Staff.grant({id: result.id, name: perm})
        })
        .then(()=>{ return 'Staff member permission granted!' })
        .catch((err) => { return err.message })
    }
  })
  app.cli.command('staff','revoke',{
    description: 'Revoke permission to staff member',
    options: [
      {
        definition: '-e, --email <s>',
        description: 'Email of staff member to revoke permission'
      },
      {
        definition: '-p, --perm <s>',
        description: 'Name of permission to revoke, usually URI'
      }
    ],
    action: (opts)=>{
      const email = opts.email || opts.e
      const perm = opts.perm || opts.p
      if(!email || !perm) throw new Error('Email and Perm required')
      return Staff.getByEmail(email)
        .then((result) => {
          if(!result) throw new Error('Staff member not found')
          return Staff.revoke({id: result.id, name: perm})
        })
        .then(()=>{ return 'Staff member permission revoked!' })
        .catch((err) => { return err.message })
    }
  })
  app.cli.command('staff','list',{
    description: 'List staff members',
    action: ()=>{
      const Table = require('cli-table')
      let table = new Table({head: ['Id','Email','Name','Active']})
      let contentCount = 0
      return Staff.list().each((row) => {
        contentCount++
        table.push([
          row.id,
          row.email,
          row.name,
          row.active ? 'Yes' : 'No'
        ])
      })
        .then(() => {
          if(!contentCount) table.push(['No content entries'])
          return table.toString()
        })
        .catch((err) => { return err.message })
    }
  })
}


/**
 * Test Access
 */
exports.test = () => {
  return require('./test/' + exports._kado.name + '.test.js')
}
