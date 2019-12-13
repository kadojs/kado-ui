'use strict';
/**
 * Kado - Web Application System
 * Copyright © 2015-2019 Bryan Tong, NULLIVEX LLC. All rights reserved.
 * Kado <support@kado.org>
 *
 * This file is part of Kado and bound to the MIT license distributed within.
 */
const crypto = require('crypto')
const datatable = require('sequelize-datatable')
const K = require('kado').getInstance()
const P = require('bluebird')
const ContentModel = K.db.sequelize.models.Content
const ContentRevisionModel = K.db.sequelize.models.ContentRevision

class Content {
  datatable(req,res){
    return datatable(ContentModel,req.query,res.Q)
  }
  get(id,q){
    if(!q) q = K.database.queryOptions(K.config)
    q.include = [{model: ContentRevisionModel}]
    return ContentModel.findByPk(id,q)
  }
  getByUri(uri,q){
    if(!q) q = K.database.queryOptions(K.config)
    q.where = {uri: uri}
    return ContentModel.findOne(q)
  }
  getRevision(id,q){
    if(!q) q = K.database.queryOptions(K.config)
    return ContentRevisionModel.findByPk(id,q)
  }
  list(options,q){
    if(!q) q = K.database.queryOptions(K.config)
    if(!options) options = {}
    if(options.where) q.where = options.where
    if(options.order) q.order = options.order
    return ContentModel.findAll(q)
  }
  remove(list){
    if(!(list instanceof Array)) list = [list]
    return P.try(()=>{return list})
      .each((id)=>{
        return id > 0 ? ContentModel.destroy({where: {id: id}}) : null
      })
  }
  save(data){
    let hash
    let content
    let isNewRevision = false
    let isNew = false
    if(!data.title && !data.uri){
      throw new Error('Content Title and URI are required')
    }
    return this.get(data.id)
      .then((result) => {
        content = result
        if(!content){
          isNew = true
          content = ContentModel.build({
            content: '',
            html: ''
          })
        }
        if(data.title) content.title = data.title
        if(data.uri) content.uri = data.uri
        if('undefined' === typeof data.active) content.active = false
        if(data.active) content.active = true
        //first hash them
        if(!data.content) data.content = ''
        if(!data.html) data.html = ''
        let cipher = crypto.createHash('sha256')
        hash = cipher.update(data.content + data.html).digest('hex')
        return ContentRevisionModel.findOne({where: {
          hash: hash, ContentId: content.id}})
      })
      .then((result) => {
        if(!result){
          isNewRevision = true
          let revParams = {
            content: data.content,
            html: data.html,
            hash: hash,
            ContentId: content.id
          }
          return ContentRevisionModel.create(revParams)
        } else {
          return result
        }
      })
      .then(() => {
        content.content = data.content
        content.html = data.html
        return content.save()
      })
  }
  revert(data){
    const that = this
    let revision
    let content
    this.getRevision(data.revisionId)
      .then((result)=>{
        revision = result
        if(!revision) throw new Error('Revision Not Found')
        return that.get(data.contentId)
      })
      .then((result)=>{
        content = result
        if(!content) throw new Error('Content Not Found')
        return content
      })
      .then(()=> {
        content.content = revision.content
        content.html = revision.html
        return content.save()
      })
  }
}

Content.getInstance = ()=>{
  return new Content()
}

module.exports = Content
