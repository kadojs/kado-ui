'use strict';
/**
 * Kado - Web Application System
 * Copyright © 2015-2019 Bryan Tong, NULLIVEX LLC. All rights reserved.
 * Kado <support@kado.org>
 *
 * This file is part of Kado and bound to the MIT license distributed within.
 */
const P = require('bluebird')
const { expect } = require('chai')
const request = require('request')
P.promisifyAll(request)


/**
 * CLI Tests
 * @param {Kado} app
 */
exports.cli = (app) => {
  describe('staff cli',() => {
    it('should allow staff sanitizing from cli',() => {
      return app.cli.run('staff remove -e test@test.com')
        .then((result) => {
          expect(result).to.match(/Staff member removed successfully!/i)
        })
    })
    it('should allow staff creation from cli',() => {
      return app.cli.run('staff create -e test@test.com -p test -n test')
        .then((result) => {
          expect(result).to.match(/Staff member created!/i)
        })
    })
    it('should allow staff password change from cli',() => {
      return app.cli.run('staff update -e test@test.com -p test2 -n test')
        .then((result) => {
          expect(result).to.match(/Staff member updated successfully!/i)
        })
    })
    it('should allow staff deletion from cli',() => {
      return app.cli.run('staff remove -e test@test.com')
        .then((result) => {
          expect(result).to.match(/Staff member removed successfully!/i)
        })
    })
  })
}


/**
 * Admin tests
 * @param {Kado} app
 * @param {function} params - An Object containing test specific
 */
exports.admin = (app,params) => {
  //expand some parameters
  describe('staff admin',() => {
    let staffId = null
    let removeStaff = () => {
      return request.getAsync({
        url: params.makeUrl('/staff/remove?id=' + staffId),
        jar: params.cookieJar,
        json: {}
      })
        .then((res) => {
          expect(res.body.success).to.match(/Staff removed/)
          staffId = null
        })
    }
    before(() => {
      if(!params.cookieJar._isLoggedIn) return doLogin()
    })
    after(() => {
      if(staffId) return removeStaff()
    })
    it('should list',() => {
      return request.getAsync({
        url: params.makeUrl('/staff/list'),
        jar: params.cookieJar
      })
        .then((res) => {
          expect(res.body).to.match(/Staff/)
        })
    })
    it('should show creation page',() => {
      return request.getAsync({
        url: params.makeUrl('/staff/create'),
        jar: params.cookieJar
      })
        .then((res) => {
          expect(res.body).to.match(/Create Staff/)
        })
    })
    it('should allow creation',() => {
      return app.cli.run('staff remove -e testing@testing.com')
        .then(() => {
          return request.postAsync({
            url: params.makeUrl('/staff/save'),
            jar: params.cookieJar,
            json: {
              staffName: 'Test Staff',
              staffEmail: 'testing@testing.com',
              staffPassword: 'testing',
              staffPasswordConfirm: 'testing'
            }
          })
        })
        .then((res) => {
          expect(res.body.staff.id).to.be.a('number')
          staffId = +res.body.staff.id
        })
    })
    it('should allow modification',() => {
      return request.postAsync({
        url: params.makeUrl('/staff/save'),
        jar: params.cookieJar,
        json: {
          id: staffId,
          staffName: 'Test Staff 2',
          staffEmail: 'testing@testing.com',
          staffPassword: 'testing2',
          staffPasswordConfirm: 'testing2'
        }
      })
        .then((res) => {
          expect(res.body.staff.id).to.be.a('number')
          expect(+res.body.staff.id).to.equal(staffId)
        })
    })
    it('should allow deletion',() => {
      return removeStaff()
    })
  })
}
