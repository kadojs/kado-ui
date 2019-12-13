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
 * CLI tests
 * @param {Kado} app
 */
exports.cli = (app) => {
  describe('content cli',() => {
    let contentId = null
    after(() => {
      if(contentId) return app.cli.run('content remove -i ' + contentId)
    })
    it('should allow content creation from cli',() => {
      return app.cli.run('content create -t test -c test')
        .then((result) => {
          expect(result).to.match(/Content entry created: \d+/)
          contentId = result.match(/Content entry created: (\d+)/)[1]
        })
    })
    it('should allow content change from cli',() => {
      return app.cli.run('content update -i ' + contentId + ' -t test2 -c test')
        .then((result) => {
          expect(result).to.match(/Content entry updated successfully!/i)
        })
    })
    it('should allow content deletion from cli',() => {
      return app.cli.run('content remove -i ' + contentId)
        .then((result) => {
          expect(result).to.match(/Content entry removed successfully!/i)
          contentId = null
        })
    })
  })
}

/**
 * Define tests
 * @param {Kado} app
 * @param {function} params - An Object containing test specific
 */
exports.admin = (app,params) => {
  //expand some parameters
  describe('content admin',() => {
    let contentId = null
    let removeContent = () => {
      return request.postAsync({
        url: params.makeUrl('/content/remove?id=' + contentId),
        jar: params.cookieJar,
        json:true
      })
        .then((res) => {
          expect(res.body.success).to.match(/Content\(s\) removed/)
          contentId = null
        })
    }
    before(() => {
      if(!params.cookieJar._isLoggedIn) return doLogin()
    })
    after(() => {
      if(contentId) removeContent()
    })
    it('should list',() => {
      return request.getAsync({
        url: params.makeUrl('/content/list'),
        jar: params.cookieJar
      })
        .then((res) => {
          expect(res.body).to.match(/Content/)
        })
    })
    it('should show creation page',() => {
      return request.getAsync({
        url: params.makeUrl('/content/create'),
        jar: params.cookieJar
      })
        .then((res) => {
          expect(res.body).to.match(/Create Entry/)
        })
    })
    it('should allow creation',() => {
      return request.postAsync({
        url: params.makeUrl('/content/save'),
        jar: params.cookieJar,
        json: {
          title: 'Test Content',
          uri: 'test-content',
          content: 'testing the content',
          html: '<p>testing the content</p>'
        }
      })
        .then((res) => {
          expect(+res.body.content.id).to.be.a('number')
          contentId = +res.body.content.id
        })
    })
    it('should allow modification',() => {
      return request.postAsync({
        url: params.makeUrl('/content/save'),
        jar: params.cookieJar,
        json: {
          id: contentId,
          title: 'Test content 2',
          uri: 'test-content-2',
          content: 'testing the content 2',
          html: '<p>testing the content 2</p>'
        }
      })
        .then((res) => {
          expect(res.body.content.id).to.be.a('number')
          expect(+res.body.content.id).to.equal(contentId)
        })
    })
    it('should allow deletion',() => {
      return removeContent()
    })
  })
}
