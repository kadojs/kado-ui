'use strict';
/**
 * Kado - Web Application System
 * Copyright © 2015-2019 Bryan Tong, NULLIVEX LLC. All rights reserved.
 * Kado <support@kado.org>
 *
 * This file is part of Kado and bound to the MIT license distributed within.
 */

module.exports = class Staff {
  static getInstance(){ return new Staff() }
  constructor(){
    this.app = require('../../../lib/Kado').getInstance()
    this.NOW = this.app.db.sequelize.fn('NOW')
    this.Staff = this.app.db.sequelize.models.Staff
    this.StaffPermission = this.app.db.sequelize.models.StaffPermission
  }
  datatable(req,res){
    const datatable = require('sequelize-datatable')
    return datatable(this.Staff,req.query,res.Q)
  }
  comparePassword(test,against){
    const bcrypt = require('bcrypt')
    return new Promise((resolve,reject)=> {
      bcrypt.compare(test,against,(err,match) => {
        if(err) return reject(err)
        resolve(match)
      })
    })
  }
  get(id,q){
    if(!q) q = this.app.database.queryOptions(this.app.config)
    q.include = [this.StaffPermission]
    return this.Staff.findByPk(id,q)
  }
  getByEmail(email,isActive,q){
    if(!q) q = this.app.database.queryOptions(this.app.config)
    q.include = [this.StaffPermission]
    q.where = {email: email}
    if(isActive !== undefined) q.where.active = !!isActive
    return this.Staff.findOne(q)
  }
  list(options,q){
    if(!q) q = this.app.database.queryOptions(this.app.config)
    if(!options) options = {}
    if(options.where) q.where = options.where
    if(options.order) q.order = options.order
    return this.Staff.findAll(q)
  }
  removeByEmail(email){
    return this.getByEmail(email).then((result) => {
      if(result) return result.destroy()
    })
  }
  remove(list){
    if(!(list instanceof Array)) list = [list]
    const promises = []
    for(let id of list){ promises.push(this.Staff.destroy({where: {id: id}})) }
    return Promise.all(promises)
  }
  grant(data){
    const id = data.id
    const name = data.name
    const UniqueConstraintError = require('sequelize').UniqueConstraintError
    this.get(id)
      .then((result) => {
        if(!result) throw new Error('Staff member not found')
        return this.StaffPermission.create({
          name: name,
          isAllowed: true,
          StaffId: result.id
        })
          .catch(UniqueConstraintError,()=>{})
      })
  }
  revoke(data){
    const id = data.id
    const name = data.name
    this.get(id)
      .then((result) => {
        if(!result) throw new Error('Staff member not found')
        return this.StaffPermission.find({
          where: {
            name: name,
            StaffId: result.id
          }
        })
      })
      .then((result) =>{
        if(!result) throw new Error('No permission to revoke')
        return result.destroy()
      })
  }
  save(data){
    return Promise.resolve().then(() => {
      if(data.id){
        if(!data.email) throw new Error('Email is required')
        return this.get(data.id)
          .then((result) => {
            if(data.email) result.email = data.email
            if(data.name) result.name = data.name
            if(data.password){
              result.datePassword = this.NOW
              result.password = data.password
            }
            result.active = !!data.active
            return result.save()
          })
      } else {
        return this.Staff.create({
          email: data.email,
          password: data.password,
          name: data.name || '',
          active: !!data.active
        })
      }
    })
  }
  authenticate(email,password){
    let staff = null
    const invalidLoginMsg = 'Invalid login'
    return this.getByEmail(email)
      .then((result) => {
        if(!result) throw new Error(invalidLoginMsg)
        staff = result
        if(!staff.password) throw new Error(invalidLoginMsg)
        return this.comparePassword(password,staff.password)
      })
      .then((match) => {
        if(!match){
          staff.dateFail = this.NOW
          staff.loginFailCount =  (+staff.loginFailCount || 0) + 1
          return staff.save()
            .then(() => {
              throw new Error(invalidLoginMsg)
            })
        }
        staff.dateSeen = this.NOW
        staff.loginCount = (+staff.loginCount || 0) + 1
        return staff.save()
      })
      .then(() => {
        return this.getByEmail(email)
      })
      .then((result) => {
        //no permissions set makes the staff a super admin
        if(!result.dataValues.StaffPermissions.length){
          delete result.dataValues.StaffPermissions
          result.dataValues.permission = false
          return result
        }
        //otherwise apply permission profile
        let permission = new this.app.Permission()
        result.dataValues.StaffPermissions.forEach((perm) => {
          if(perm.isAllowed) permission.add(perm.name)
        })
        delete result.dataValues.StaffPermissions
        result.dataValues.permission = permission.digest()
        return result
      })
  }
}
