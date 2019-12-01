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
  s.doImport(__dirname + '/model/StaffSession.js')
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
  //restrict searching staff from main
  if('main' === app._interfaceName) return K.bluebird.try(() => {})
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
  let userLogin = (email,password) => {
    let admin = require('./admin')
    return admin.doLogin(email,password)
  }
  userLogin(username,password)
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
  let admin = require('./admin')
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
  app.get('/staff',(req,res) => {
    res.redirect(301,'/staff/list')
  })
  app.post('/staff/save',admin.save)
  app.get('/staff/list',admin.list)
  app.get('/staff/create',admin.create)
  app.get('/staff/edit',admin.edit)
  app.get('/staff/grant',admin.grant)
  app.get('/staff/revoke',admin.revoke)
  app.post('/staff/remove',admin.remove)
  app.get('/staff/remove',admin.remove)
}


/**
 * CLI Access
 * @param {Kado} app Main application
 */
exports.cli = (app) => {
  require('./cli/staff')(app)
}


/**
 * Test Access
 * @param {Kado} app Main application
 */
exports.test = (app) => {
  return require('./test/' + exports._kado.name + '.test.js')(app)
}
