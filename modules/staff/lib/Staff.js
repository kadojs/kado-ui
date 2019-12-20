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
const StaffModel = K.db.sequelize.models.Staff
const StaffPermissionModel = K.db.sequelize.models.StaffPermission

//make some promises
P.promisifyAll(bcrypt)

class Staff {
  datatable(req,res){
    return datatable(StaffModel,req.query,res.Q)
  }
  get(id,q){
    if(!q) q = K.database.queryOptions(K.config)
    q.include = [StaffPermissionModel]
    return StaffModel.findByPk(id,q)
  }
  getByEmail(email,q){
    if(!q) q = K.database.queryOptions(K.config)
    q.include = [StaffPermissionModel]
    return StaffModel.findOne({where: {email: email, active: true}},q)
  }
  list(options,q){
    if(!q) q = K.database.queryOptions(K.config)
    if(!options) options = {}
    if(options.where) q.where = options.where
    if(options.order) q.order = options.order
    return StaffModel.findAll(q)
  }
  remove(list){
    if(!(list instanceof Array)) list = [list]
    return P.try(()=>{return list})
      .each((id)=>{
        return id > 0 ? StaffModel.destroy({where: {id: id}}) : null
      })
  }
  grant(data){
    const id = data.id
    const name = data.name
    this.get(id)
      .then((result) => {
        if(!result) throw new Error(K._l.staff.err_staff_not_found)
        return StaffPermissionModel.create({
          name: name,
          isAllowed: true,
          StaffId: result.id
        })
          .catch(K.db.sequelize.UniqueConstraintError,()=>{})
      })
  }
  revoke(data){
    const id = data.id
    const name = data.name
    this.get(id)
      .then((result) => {
        if(!result) throw new Error(K._l.staff.err_staff_not_found)
        return StaffPermissionModel.find({where: {
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
    let isNew = false
    let id = data.id || false
    return P.try(() => {
      if(!opts.email) throw new Error('Email is required')
      if(id){
        return that.get(id)
      } else {
        isNew = true
        return Staff.build()
      }
    })
      .then((result) => {
        let updated = false
        data.staffActive = ('on' === data.staffActive)
        if(result.email !== data.staffEmail){
          result.email = data.staffEmail
          updated = true
        }
        if(data.newEmail){
          result.email = data.newEmail
          updated = true
        }
        if(result.name !== data.staffName){
          result.name = data.staffName
          updated = true
        }
        if('' !== (data.staffPassword + data.staffPasswordConfirm)){
          if(data.staffPassword === data.staffPasswordConfirm){
            result.datePassword = sequelize.fn('NOW')
            result.password = data.staffPassword
            updated = true
          }
        }
        if(result.active !== data.staffActive){
          result.active = data.staffActive
          updated = true
        }
        if(!updated){
          return P.try(()=>{return false})
        } else {
          return result.save()
        }
      })
      .then((result) => {
        return {isNew: isNew, result: result}
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
          staff.dateFail = sequelize.fn('NOW')
          staff.loginFailCount =  (+staff.loginFailCount || 0) + 1
          return staff.save()
            .then(() => {
              throw new Error(K._l.invalid_login)
            })
        }
        staff.dateSeen = sequelize.fn('NOW')
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

Staff.getInstance = ()=>{
  return new Staff()
}

module.exports = Staff
