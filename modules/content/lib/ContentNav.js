'use strict';
/**
 * Kado - Web Application System
 * Copyright © 2015-2019 Bryan Tong, NULLIVEX LLC. All rights reserved.
 * Kado <support@kado.org>
 *
 * This file is part of Kado and bound to the MIT license distributed within.
 */
const datatable = require('sequelize-datatable')
const K = require('kado').getInstance()
const P = require('bluebird')
const ContentNavModel = K.db.sequelize.models.ContentNav
class ContentNav {
  datatable(req,res){
    return datatable(ContentNavModel,req.query,res.Q)
  }
  get(id,q){
    if(!q) q = K.database.queryOptions(K.config)
    return ContentNavModel.findByPk(id,q)
  }
  list(options,q){
    if(!q) q = K.database.queryOptions(K.config)
    if(!options) options = {}
    if(options.where) q.where = options.where
    if(options.order) q.order = options.order
    return ContentNavModel.findAll(q)
  }
  remove(list){
    if(!(list instanceof Array)) list = [list]
    return P.try(()=>{return list})
      .each((id)=>{
        return id > 0 ? ContentNavModel.destroy({where: {id: id}}) : null
      })
  }
  save(data){
    let isNew = false
    return this.get(data.id)
      .then((result) => {
        if(!result){
          isNew = true
          result = ContentNavModel.build()
        }
        if(data.title) result.title = data.title
        if(data.uri) result.uri = data.uri
        if(data.sortNum) result.sortNum = data.sortNum
        return result.save()
      })
  }
}

ContentNav.getInstance = ()=>{
  return new ContentNav()
}

module.exports = ContentNav
