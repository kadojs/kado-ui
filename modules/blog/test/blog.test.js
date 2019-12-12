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
const exec = P.promisify(require('child_process').exec)
const request = require('request')
P.promisifyAll(request)


/**
 * CLI tests
 */
exports.cli = () => {
  describe('blog cli',() => {
    let blogId = null
    after(() => {
      if(blogId) return exec('node app blog remove -i ' + blogId)
    })
    it('should allow blog creation from cli',() => {
      return exec('node app blog create -t test -c test')
        .then((result) => {
          expect(result).to.match(/Blog entry created: \d+/)
          blogId = result.match(/Blog entry created: (\d+)/)[1]
        })
    })
    it('should allow blog change from cli',() => {
      return exec('node app blog update -i ' + blogId + ' -t test2 -c test')
        .then((result) => {
          expect(result).to.match(/Blog entry updated successfully!/i)
        })
    })
    it('should allow blog deletion from cli',() => {
      return exec('node app blog remove -i ' + blogId)
        .then((result) => {
          expect(result).to.match(/Blog entry removed successfully!/i)
          blogId = null
        })
    })
  })
}


/**
 * Admin tests
 * @param {object} K - The Kado object
 * @param {function} params - An Object containing test specific
 */
exports.admin = (K,params) => {
  //expand some parameters
  describe('blog admin',() => {
    let blogId = null
    let removeBlog = () => {
      return request.postAsync({
        url: params.makeUrl('/blog/remove?id=' + blogId),
        jar: params.cookieJar,
        json: true
      })
        .then((res) => {
          expect(res.body.success).to.match(/Blog\(s\) removed/)
          blogId = null
        })
    }
    before(() => {
      if(!params.cookieJar._isLoggedIn) return params.doLogin()
    })
    after(() => {
      if(blogId) removeBlog()
    })
    it('should list',() => {
      return request.getAsync({
        url: params.makeUrl('/blog/list'),
        jar: params.cookieJar
      })
        .then((res) => {
          expect(res.body).to.match(/Blog/)
        })
    })
    it('should show creation page',() => {
      return request.getAsync({
        url: params.makeUrl('/blog/create'),
        jar: params.cookieJar
      })
        .then((res) => {
          expect(res.body).to.match(/Create Entry/)
        })
    })
    it('should allow creation',() => {
      return request.postAsync({
        url: params.makeUrl('/blog/save'),
        jar: params.cookieJar,
        json: {
          title: 'Test Blog',
          uri: 'kado-test-blog',
          content: 'testing the blog',
          html: '<p>testing the blog</p>'
        }
      })
        .then((res) => {
          expect(+res.body.blog.id).to.be.a('number')
          blogId = +res.body.blog.id
        })
    })
    it('should allow modification',() => {
      return request.postAsync({
        url: params.makeUrl('/blog/save'),
        jar: params.cookieJar,
        json: {
          id: blogId,
          title: 'Test blog 2',
          uri: 'kado-test-blog-2',
          content: 'testing the blog 2',
          html: '<p>testing the blog 2</p>'
        }
      })
        .then((res) => {
          expect(res.body.blog.id).to.be.a('number')
          expect(+res.body.blog.id).to.equal(blogId)
        })
    })
    it('should allow deletion',() => {
      return removeBlog()
    })
  })
}


/**
 * Main tests
 * @param {object} K - The Kado object
 * @param {function} params - An Object containing test specific
 */
exports.main = (K,params) => {
  //expand some parameters
  describe('blog main',() => {
    let blogId = null
    before(() => {
      return exec('node app blog create -t test -c test')
        .then((result) => {
          expect(result).to.match(/Blog entry created: \d+/)
          blogId = result.match(/Blog entry created: (\d+)/)[1]
        })
    })
    after(() => {
      return exec('node app blog remove -i ' + blogId)
        .then((result) => {
          expect(result).to.match(/Blog entry removed successfully!/i)
          blogId = null
        })
    })
    it('should allow viewing',() => {
      return request.getAsync({
        url: params.makeUrl('/blog/test'),
        jar: params.cookieJar
      })
        .then((res) => {
          expect(res.statusCode).to.equal(200)
          expect(res.body).to.match(/test/)
        })
    })
  })
}
