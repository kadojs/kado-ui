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
  const datatableView = require('../../lib/Datatable')
  const fs = require('fs')
  const path = require('path')
  const Setting = require('./lib/Setting').getInstance()
  Setting.setConfig(app.config)
  let definitionFile = path.resolve(path.join(__dirname,'definitions.json'))
  if(fs.existsSync(definitionFile))
    Setting.setDefinitions(require(definitionFile))
  //register permissions
  app.permission.add('/setting/list','List settings')
  app.permission.add('/setting/edit','Edit etting')
  app.permission.add('/setting/save','Save etting')
  //add views
  app.view.add('setting/list',__dirname + '/admin/view/list.html')
  app.view.add('setting/edit',__dirname + '/admin/view/edit.html')
  //register routes
  app.get('/setting',(req,res) => {
    res.redirect(301,'/setting/list')
  })
  app.get('/setting/list',(req,res)=>{
    let result = Setting.query()
    if(!result || !result.rows){
      res.render(res.locals._view.get('error'),{
        error: app._l.setting.no_settings_exist})
    } else {
      datatableView(res)
      res.render('setting/list',{list: result.rows})
    }
  })
  app.get('/setting/edit',(req,res)=>{
    let setting = Setting.find(req.query.path)
    if(!setting){
      res.render('error',{error: app._l.setting.setting_not_found})
    } else {
      res.render('setting/edit',{setting: setting})
    }
  })
  app.post('/setting/list',(req,res)=>{
    Setting.remove(req.body.remove)
      .then(() => {
        req.flash('success',app._l.setting.overrides_cleared)
        res.redirect('/setting/list')
      })
      .catch((err) => {
        res.render('error',{error: err})
      })
  })
  app.post('/setting/save',(req,res)=>{
    Setting.save(req.body)
      .then(() => {
        req.flash('success',app._l.settings.setting_saved)
        res.redirect('/setting/edit?path=' + req.body.data.path)
      })
      .catch((err) => {
        res.render('error',{error: err})
      })
  })
}
