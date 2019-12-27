'use strict';
/**
 * Kado - Web Application System
 * Copyright © 2015-2019 Bryan Tong, NULLIVEX LLC. All rights reserved.
 * Kado <support@kado.org>
 *
 * This file is part of Kado and bound to the MIT license distributed within.
 */
const P = require('bluebird')
const K = require('kado').getInstance()
const crypto = require('crypto')
const datatable = require('sequelize-datatable')
const sequelize = K.db.sequelize
const DocModel = sequelize.models.Doc
const DocRevisionModel = sequelize.models.DocRevision
const DocProjectModel = sequelize.models.DocProject
const DocProjectVersionModel = sequelize.models.DocProjectVersion


class Doc {
  datatable(req,res){
    const q = res.Q
    q.include = [{model: DocProjectVersionModel, include: [DocProjectModel]}]
    return datatable(DocModel,req.query,q)
  }
  datatableProjects(req,res){
    return datatable(DocProjectModel,req.query,res.Q)
  }
  listProjectsSorted(q){
    if(!q) q = K.database.queryOptions(K.config)
    q.order = [['name','ASC']]
    return DocProjectModel.findAll(q)
  }
  listProjects(q){
    if(!q) q = K.database.queryOptions(K.config)
    q.include = [DocProjectModel]
    return DocProjectVersionModel.findAll(q)
  }
  listProjectVersions(uri,q){
    if(!q) q = K.database.queryOptions(K.config)
    q.include = [{model: DocProjectModel, where: {uri: uri}}]
    return DocProjectVersionModel.findAll(q)
  }
  listDocuments(version,project,q){
    if(!q) q = K.database.queryOptions(K.config)
    q.include = [
      {model: DocProjectVersionModel, where: {name: req.params.version},
        include: [
          {model: DocProjectModel, where: {uri: req.params.project}}
        ]
      }
    ]
    q.order = [['sortNum','ASC']]
    return DocModel.findAll(q)
  }
  get(id,q){
    if(!q) q = K.database.queryOptions(K.config)
    q.include = [DocRevisionModel]
    return DocModel.findByPk(id,q)
  }
  getFull(uri,version,project,q){
    if(!q) q = K.database.queryOptions(K.config)
    q.where = {uri: uri}
    q.include = [
      {
        model: DocProjectVersionModel, where: {name: version},
        include: [ {model: DocProjectModel,where: {uri: project}} ]
      }
    ]
    return DocModel.findOne(q)
  }
  getRevision(id,q){
    if(!q) q = K.database.queryOptions(K.config)
    return DocRevisionModel.findByPk(id,q)
  }
  getProject(id,q){
    if(!q) q = K.database.queryOptions(K.config)
    q.include = [DocProjectVersionModel]
    return DocProjectModel.findByPk(id,q)
  }
  getProjectVersion(id,q){
    if(!q) q = K.database.queryOptions(K.config)
    q.include = [DocProjectModel]
    return DocProjectVersionModel.findByPk(id,q)
  }
  remove(list){
    if(!(list instanceof Array)) list = [list]
    return P.try(()=>{return list})
      .each((id)=>{
        return id > 0 ? DocModel.destroy({where: {id: id}}) : null
      })
  }
  removeProject(list){
    if(!(list instanceof Array)) list = [list]
    return P.try(()=>{return list})
      .each((id)=>{
        return id > 0 ? DocProjectModel.destroy({where: {id: id}}) : null
      })
  }
  removeProjectVersion(list){
    if(!(list instanceof Array)) list = [list]
    return P.try(()=>{return list})
      .each((id)=>{
        return id > 0 ? DocProjectVersionModel.destroy({where: {id: id}}) : null
      })
  }
  save(data){
    let isNew = false
    let hash
    let doc
    let isNewRevision = false
    return Promise.resolve().then(()=> {
      if(!data.id){
        isNew = true
        return DocModel.build({
          name: data.name,
          uri: data.uri,
          sortNum: data.sortNum,
          content: data.content,
          html: data.html,
          DocProjectVersionId: data.DocProjectVersionId
        })
      }
      else{
        return DocModel.findByPk(data.id)
      }
    })
      .then((result) => {
        if(!result) throw new Error('Document Not Found')
        if(!data.DocProjectVersionId) throw new Error('Missing Project')
        doc = result
        if(data.title) doc.title = data.title
        if(data.uri) doc.uri = data.uri
        if(data.sortNum) doc.sortNum = data.sortNum
        doc.DocProjectVersionId = data.DocProjectVersionId
        //Deal with the doc revision to save the content
        //here is how this is going to go, first we hash the content and the html
        //if both match then we do nothing, if they don't match then we make a new
        //revision record and then finally store the current content and html into
        //the main doc record as the revisions only support the doc not depend on
        //it
        if(!data.content) data.content = ''
        if(!data.html) data.html = ''
        //first hash them
        let cipher = crypto.createHash('sha256')
        hash = cipher.update(data.html + data.content).digest('hex')
        return DocRevisionModel.findOne({where: {hash: hash, DocId: doc.id}})
      })
      .then((result) => {
        if(!result){
          isNewRevision = true
          return DocRevisionModel.create({
            content: data.content,
            html: data.html,
            hash: hash,
            DocId: doc.id
          })
        } else {
          return result
        }
      })
      .then(() => {
        doc.content = data.content
        doc.html = data.html
        return doc.save()
      })
      .then((result)=>{
        result.isNew = isNew
        result.isNewRevision = isNewRevision
        return result
      })
  }
  saveProject(data){
    let isNew = false
    return this.getProject(data.id)
      .then((result) => {
        if(!result){
          isNew = true
          result = DocProjectModel.build()
        }
        if(data.name) result.name = data.name
        if(data.uri) result.uri = data.uri
        return result.save()
      })
      .then((result)=>{
        return {
          result: result,
          isNew: isNew
        }
      })
  }
  saveProjectVersion(data){
    let isNew = false
    return this.getProjectVersion(data.id)
      .then((result) => {
        if(!data.DocProjectId) throw new Error('Missing project')
        if(!result){
          isNew = true
          result = DocProjectVersionModel.build({
            DocProjectId: data.DocProjectId
          })
        }
        if(data.name) result.name = data.name
        return result.save()
      })
      .then((result)=> {
        return this.getProjectVersion(result.id)
      })
      .then((result)=>{
        return { result: result, isNew: isNew }
      })
  }
  revert(data){
    const that = this
    let revision
    this.getRevision(data.revisionId)
      .then((result)=>{
        if(!result) throw new Error('Revision Not Found')
        revision = result
        return that.get(data.docId)
      })
      .then((result)=>{
        if(!result) throw new Error('Doc Not Found')
        result.content = revision.content
        result.html = revision.html
        return result.save()
      })
  }
}

Doc.getInstance = ()=>{
  return new Doc()
}

module.exports = Doc
