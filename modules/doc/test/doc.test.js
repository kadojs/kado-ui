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
 * Define admin tests
 * @param {object} K - The Kado object
 * @param {function} params - An Object containing test specific
 */
exports.admin = (K,params) => {
  //expand some parameters
  describe('doc admin',() => {
    let docId = null
    let docProjectId = null
    let docProjectVersionId = null
    let removeDoc = () => {
      return request.postAsync({
        url: params.makeUrl('/doc/remove?id=' + docId),
        jar: params.cookieJar,
        json: true
      })
        .then((res) => {
          expect(res.body.success).to.match(/Doc\(s\) removed/)
          docId = null
          return request.postAsync({
            url: params.makeUrl(
              '/doc/version/remove?id=' + docProjectVersionId),
            jar: params.cookieJar,
            json: true
          })
        })
        .then((res) => {
          expect(res.body.success).to.match(/Doc Project Version removed/)
          docProjectVersionId = null
          return request.postAsync({
            url: params.makeUrl('/doc/project/remove?id=' + docProjectId),
            jar: params.cookieJar,
            json: true
          })
        })
        .then((res) => {
          expect(res.body.success).to.match(/Doc Project removed/)
          docProjectId = null
        })
    }
    before(() => {
      return P.try(() => {
        if(!params.cookieJar) return params.doLogin()
      })
        .then(() => {
          return request.postAsync({
            url: params.makeUrl('/doc/project/save'),
            jar: params.cookieJar,
            json: {
              name: 'Kado',
              uri: 'kado'
            }
          })
        })
        .then((res) => {
          expect(+res.body.item.id).to.be.a('number')
          docProjectId = +res.body.item.id
          return request.postAsync({
            url: params.makeUrl('/doc/version/save'),
            jar: params.cookieJar,
            json: {
              name: '3.x',
              DocProjectId: docProjectId
            }
          })
        })
        .then((res) => {
          expect(+res.body.item.id).to.be.a('number')
          docProjectVersionId = +res.body.item.id
        })
    })
    after(() => {
      if(docId) removeDoc()
    })
    it('should list',() => {
      return request.getAsync({
        url: params.makeUrl('/doc/list'),
        jar: params.cookieJar
      })
        .then((res) => {
          expect(res.body).to.match(/Doc/)
        })
    })
    it('should show creation page',() => {
      return request.getAsync({
        url: params.makeUrl('/doc/create'),
        jar: params.cookieJar
      })
        .then((res) => {
          expect(res.body).to.match(/DocProjectVersionId/)
        })
    })
    it('should allow creation',() => {
      return request.postAsync({
        url: params.makeUrl('/doc/save'),
        jar: params.cookieJar,
        json: {
          title: 'Test Doc',
          uri: 'test-doc',
          content: 'testing the doc',
          html: '<p>testing the doc</p>',
          DocProjectVersionId: docProjectVersionId
        }
      })
        .then((res) => {
          expect(+res.body.item.id).to.be.a('number')
          docId = +res.body.item.id
        })
    })
    it('should allow modification',() => {
      return request.postAsync({
        url: params.makeUrl('/doc/save'),
        jar: params.cookieJar,
        json: {
          id: docId,
          title: 'Test Doc 2',
          uri: 'test-doc-2',
          content: 'testing the doc 2',
          html: '<p>testing the doc 2</p>',
          DocProjectVersionId: docProjectVersionId
        }
      })
        .then((res) => {
          expect(res.body.item.id).to.be.a('number')
          expect(+res.body.item.id).to.equal(docId)
        })
    })
    it('should allow deletion',() => {
      return removeDoc()
    })
  })
}
