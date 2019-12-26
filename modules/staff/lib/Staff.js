'use strict';
/**
 * Kado - Web Application System
 * Copyright © 2015-2019 Bryan Tong, NULLIVEX LLC. All rights reserved.
 * Kado <support@kado.org>
 *
 * This file is part of Kado and bound to the MIT license distributed within.
 */
const bcrypt = require('bcrypt')
const datatable = require('sequelize-datatable')
const K = require('kado').getInstance()
const P = require('bluebird')

//make some promises
P.promisifyAll(bcrypt)

class Staff {
  static getInstance(){
    return new Staff()
  }
  constructor(){
    this.NOW = K.db.sequelize.fn('NOW')
    this.Staff = K.db.sequelize.models.Staff
    this.StaffPermission = K.db.sequelize.models.StaffPermission
    this.UniqueConstraintError = K.db.sequelize.UniqueConstraintError
  }
  datatable(req,res){
    return datatable(this.Staff,req.query,res.Q)
  }
  get(id,q){
    if(!q) q = K.database.queryOptions(K.config)
    q.include = [this.StaffPermission]
    return this.Staff.findByPk(id,q)
  }
  getByEmail(email,isActive,q){
    if(!q) q = K.database.queryOptions(K.config)
    q.include = [this.StaffPermission]
    q.where = {email: email}
    if(isActive !== undefined) q.where.active = !!isActive
    return this.Staff.findOne(q)
  }
  list(options,q){
    if(!q) q = K.database.queryOptions(K.config)
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
    return P.try(()=>{return list})
      .each((id)=>{
        return id > 0 ? this.Staff.destroy({where: {id: id}}) : null
      })
  }
  grant(data){
    const id = data.id
    const name = data.name
    this.get(id)
      .then((result) => {
        if(!result) throw new Error(K._l.staff.err_staff_not_found)
        return this.StaffPermission.create({
          name: name,
          isAllowed: true,
          StaffId: result.id
        })
          .catch(this.UniqueConstraintError,()=>{})
      })
  }
  revoke(data){
    const id = data.id
    const name = data.name
    const that = this
    this.get(id)
      .then((result) => {
        if(!result) throw new Error(K._l.staff.err_staff_not_found)
        return that.StaffPermission.find({where: {
            name: name,
            StaffId: result.id
          }})
      })
      .then((result) =>{
        if(!result) throw new Error(K._l.staff.err_no_permission_to_revoke)
        return result.destroy()
      })
  }
  save(data){
    const that = this
    return P.try(() => {
      if(!data.email) throw new Error('Email is required')
      if(data.id){
        return that.get(data.id)
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
        return that.Staff.create({
          email: data.email,
          password: data.password,
          name: data.name || '',
          active: !!data.active
        })
      }
    })
  }
  authenticate(email,password){
    const that = this
    let staff = null
    return this.getByEmail(email)
      .then((result) => {
        if(!result) throw new Error(K._l.invalid_login)
        staff = result
        if(!staff.password) throw new Error(K._l.invalid_login)
        return bcrypt.compareAsync(password,staff.password)
      })
      .then((match) => {
        if(!match){
          staff.dateFail = that.NOW
          staff.loginFailCount =  (+staff.loginFailCount || 0) + 1
          return staff.save()
            .then(() => {
              throw new Error(K._l.invalid_login)
            })
        }
        staff.dateSeen = that.NOW
        staff.loginCount = (+staff.loginCount || 0) + 1
        return staff.save()
      })
      .then(() => {
        return that.getByEmail(email)
      })
      .then((result) => {
        //no permissions set makes the staff a super admin
        if(!result.dataValues.StaffPermissions.length){
          delete result.dataValues.StaffPermissions
          result.dataValues.permission = false
          return result
        }
        //otherwise apply permission profile
        let permission = new K.Permission()
        result.dataValues.StaffPermissions.forEach((perm) => {
          if(perm.isAllowed) permission.add(perm.name)
        })
        delete result.dataValues.StaffPermissions
        result.dataValues.permission = permission.digest()
        return result
      })
  }
}

module.exports = Staff
