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
const datatable = require('sequelize-datatable')
const datatableView = require(K.lib('datatableView'))
const sequelize = K.db.sequelize
const DocProject = sequelize.models.DocProject
const DocProjectVersion = sequelize.models.DocProjectVersion


/**
 * List
 * @param {object} req
 * @param {object} res
 */
exports.list = (req,res) => {
  if(!req.query.length){
    datatableView(res)
    res.render('doc/project/list',{
      _pageTitle: K._l.doc.doc_project + ' ' + K._l.list})
  } else {
    datatable(DocProject,req.query)
      .then((result) => {
        res.json(result)
      })
      .catch((err) => {
        res.json({error: err.message})
      })
  }
}


/**
 * Create entry
 * @param {object} req
 * @param {object} res
 */
exports.create = (req,res) => {
  res.locals._asset.addScriptOnce('/js/util.js')
  res.locals._asset.addScriptOnce('/js/mirrorToUri.js')
  res.render('doc/project/create',{
    _pageTitle: K._l.doc.doc_project + ' ' + K._l.create})
}


/**
 * Edit
 * @param {object} req
 * @param {object} res
 */
exports.edit = (req,res) => {
  let o = res.Q
  o.include = [DocProjectVersion]
  DocProject.findByPk(req.query.id,o)
    .then((result) => {
      if(!result) throw new Error(K._l.doc.entry_not_found)
      res.render('doc/project/edit',{
        item: result,
        _pageTitle: K._l.doc.doc_project + ' ' + K._l.create + ' ' + result.name
      })
    })
    .catch((err) => {
      res.render('error',{error: err})
    })
}


/**
 * Save
 * @param {object} req
 * @param {object} res
 */
exports.save = (req,res) => {
  let data = req.body
  let isNew = false
  DocProject.findByPk(data.id)
    .then((result) => {
      if(!result){
        isNew = true
        result = DocProject.build()
      }
      if(data.name) result.name = data.name
      if(data.uri) result.uri = data.uri
      return result.save()
    })
    .then((result) => {
      if(res.isJSON){
        res.json({item: result.dataValues})
      } else {
        req.flash('success',{
          message: K._l.doc.entry + ' ' + (isNew ? K._l.created : K._l.saved),
          href: '/doc/project/edit?id=' + result.id,
          name: result.id
        })
        req.flash('info','NOTE: Create a version below ' +
          'before creating documents.')
        res.redirect('/doc/project/edit?id=' + result.id)
      }
    })
    .catch((err) => {
      res.render('error',{error: err})
    })
}


/**
 * Process removals
 * @param {object} req
 * @param {object} res
 */
exports.remove = (req,res) => {
  if(req.query.id) req.body.remove = req.query.id.split(',')
  if(!(req.body.remove instanceof Array)) req.body.remove = [req.body.remove]
  P.try(()=>{return req.body.remove})
    .each((id)=>{
      return id > 0 ? DocProject.destroy({where: {id: id}}) : null
    })
    .then(() => {
      if(res.isJSON){
        res.json({success: K._l.doc.removed_project})
      } else {
        req.flash('success',K._l.doc.removed_project)
        res.redirect('/doc/project/list')
      }
    })
    .catch((err) => {
      if(res.isJSON){
        res.json({error: err.message || K._l.doc.removal_error})
      } else {
        res.render('error',{error: err.message})
      }
    })
}
