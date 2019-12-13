'use strict';
/**
 * Kado - Web Application System
 * Copyright © 2015-2019 Bryan Tong, NULLIVEX LLC. All rights reserved.
 * Kado <support@kado.org>
 *
 * This file is part of Kado and bound to the MIT license distributed within.
 */
const P = require('bluebird')
const ObjectManage = require('object-manage')

class Setting {
  constructor(){
    this.config = null
    this.definitions = null
  }
  setConfig(config){
    this.config = config
    return config
  }
  setDefinitions(definitions){
    this.definitions = definitions
    return definitions
  }
  find(path){
    let result = this.query()
    let entry = {}
    result.rows.forEach((item) => {
      if(item.path === path) entry = item
    })
    return entry
  }
  remove(list){
    const that = this
    if(!list) list = []
    if(!(list instanceof Array)) list = [list]
    let settingsFile = path.resolve(
      path.join(app.KADO_USER_ROOT,'settings.json')
    )
    return P.try(() => {
      //load settings overrides
      if(!fs.existsSync(settingsFile)){
        return fs.writeFileAsync(settingsFile,JSON.stringify({}))
      }
    })
      .then(() => {
        let settings = new ObjectManage(require(settingsFile))
        list.forEach((path) => {
          //remove boot config
          settings.$remove(path)
          //revert running config
          that.config.$set(path,that.config.$get('originalConfig.' + path))
        })
        //write changes
        return fs.writeFileAsync(settingsFile,JSON.stringify(settings.$strip()))
      })
  }
  query(search,options){
    const that = this
    if(!options) options = {}
    let paths = this.config.$getPaths()
    let db = {rows: [], count: 0}
    paths.forEach((path) => {
      let parts = path.split('.')
      let isMod = that.config.$get(path) !==
        that.config.$get('originalConfig.' + path)
      //add a one line search filter :)
      if(search && parts.indexOf(search) < 0) return
      //dont show internals
      if(path.match(/^\$/) || path.match(/^originalConfig/)) return
      //dont show objects as they are containers
      if('object' !== typeof(config.$get(path))){
        if(path.match(/password/i)) return
        if(that.definitions[path]){
          db.rows.push({
            path: path,
            parts: parts,
            className: isMod ? 'alert-warning' : '',
            type: that.definitions[path].type,
            name: that.definitions[path].name,
            description: that.definitions[path].description,
            defaultValue: that.config.$get('originalConfig.' + path),
            value: that.config.$get(path)
          })
        } else{
          db.rows.push({
            path: path,
            parts: parts,
            className: isMod ? 'alert-warning' : '',
            type: typeof(that.config.$get(path)),
            name: parts[parts.length - 1],
            description: null,
            defaultValue: config.$get('originalConfig.' + path),
            value: that.config.$get(path)
          })
        }
      }
    })
    db.count = db.rows.length
    //set some defaults for the limit filter
    if(!options.start) options.start = 0
    if(!options.limit) options.limit = db.rows.length
    db.rows = db.rows.splice(options.start,options.limit)
    return db
  }
  save(data){
    const that = this
    let settingsFile = process.env.KADO_ROOT + '/settings.json'
    return P.try(() => {
      //load settings overrides
      if(!fs.existsSync(settingsFile)){
        return fs.writeFileAsync(settingsFile,JSON.stringify({}))
      }
    })
      .then(() => {
        let settings = new ObjectManage(require(settingsFile))
        //save for restart
        settings.$set(data.path,data.value)
        //update running config
        that.config.$set(data.path,data.value)
        //write changes
        return fs.writeFileAsync(settingsFile,JSON.stringify(settings.$strip()))
      })
  }
}

Setting.getInstance = ()=>{
  return new Setting()
}

module.exports = Setting
