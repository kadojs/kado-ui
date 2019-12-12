'use strict';
/**
 * Kado - Web Application System
 * Copyright © 2015-2019 Bryan Tong, NULLIVEX LLC. All rights reserved.
 * Kado <support@kado.org>
 *
 * This file is part of Kado and bound to the MIT license distributed within.
 */
const path = require('path')

class KadoUI {
  library(){
    return __dirname
  }
  config(){
    return {
      name: 'kado',
      title: 'Kado',
      userModuleFolderName: 'modules',
      libraryPaths: [this.library()],
      db: {
        sequelize: {
          load: true,
          enabled: true,
          name: 'kado',
          user: 'kado',
          password: 'kado',
          define: {
            paranoid: false,
            dialectOptions: {collate: 'utf8_general_mb4'}
          }
        }
      },
      email: {
        notifyTo: 'Kado <support@kado.org>',
        notifyCc: '',
        replyTo: 'Kado <support@kado.org>',
        defaultFrom: 'Kado <support@kado.org>',
        defaultSubject: 'Email from Kado',
        log: {
          enable: false,
          file: '/var/log/emailinfo'
        },
        emailjs: {
          enabled: true,
          load: true,
          user: 'kado',
          password: 'kado',
          host: 'localhost',
          port: 25,
          ssl: false,
          tls: true
        }
      },
      admin: {
        enabled: false,
        title: 'Kado Admin',
        pageTitle: 'Kado Admin',
        instanceName: 'admin',
        port: 3000,
        host: null,
        session: {
          enabled: true,
          enableLogin: true,
          enableFlash: true
        },
        worker: {
          enhanced: true,
          stopTimeout: 30000,
          count: 1,
          maxConnections: 100000
        },
        render: {
          enabled: true,
          mustache: {
            enabled: true
          }
        },
        staticRoot: [
          __dirname + '/../admin/public'
        ],
        addCss: [
          {uri: 'https://stackpath.bootstrapcdn.com/bootstrap/4.4.0/css/' +
              'bootstrap.min.css'},
          {uri: 'https://cdnjs.cloudflare.com/ajax/libs/flag-icon-css/3.4.3/' +
              'css/flag-icon.min.css'},
          {uri: 'https://use.fontawesome.com/releases/v5.2.0/css/all.css'},
          {uri: '/css/layout.css'},
          {uri: '/css/sidebar.css'}
        ],
        addScript: [
          {uri: 'https://code.jquery.com/jquery-3.4.1.min.js'},
          {uri: 'https://cdn.jsdelivr.net/npm/popper.js@1.16.0/dist/umd/' +
              'popper.min.js'},
          {uri: 'https://stackpath.bootstrapcdn.com/bootstrap/4.4.0/js/' +
              'bootstrap.min.js'},
          {uri: 'https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.24.0/' +
              'moment.min.js'},
          {uri: '/js/sidebar.js'}
        ]
      },
      main: {
        enabled: false,
        title: 'Kado',
        pageTitle: 'Kado Main',
        instanceName: 'main',
        port: 3001,
        host: null,
        worker: {
          enhanced: true,
          stopTimeout: 30000,
          count: 1,
          maxConnections: 100000
        },
        render: {
          enabled: true,
          mustache: {
            enabled: true
          }
        },
        staticRoot: [
          __dirname + '/../main/public'
        ],
        addCss: [
          {uri: 'https://stackpath.bootstrapcdn.com/bootstrap/4.4.0/css/' +
              'bootstrap.min.css'},
          {uri: 'https://cdnjs.cloudflare.com/ajax/libs/flag-icon-css/3.4.3/' +
              'css/flag-icon.min.css'},
          {uri: 'https://use.fontawesome.com/releases/v5.2.0/css/all.css'},
          {uri: '/css/layout.css'},
          {uri: '/css/search.css'}
        ],
        addScript: [
          {uri: 'https://code.jquery.com/jquery-3.3.1.min.js'},
          {uri: 'https://cdnjs.cloudflare.com/ajax/libs/popper.js/' +
              '1.14.7/umd/popper.min.js'},
          {uri: 'https://stackpath.bootstrapcdn.com/bootstrap/' +
              '4.3.1/js/bootstrap.min.js'},
          {uri: 'https://use.fontawesome.com/releases/' +
              'v5.3.1/js/all.js'},
          {uri: 'https://cdnjs.cloudflare.com/ajax/libs/moment.js/' +
              '2.24.0/moment.min.js'}
        ]
      },
      module: {
        blog: {
          enabled: true,
          root: path.resolve(__dirname + '/../modules/blog/kado.js')
        },
        content: {
          enabled: true,
          root: path.resolve(__dirname + '/../modules/content/kado.js')
        },
        doc: {
          enabled: true,
          root: path.resolve(__dirname + '/../modules/doc/kado.js')
        },
        home: {
          enabled: true,
          root: path.resolve(__dirname + '/../modules/home/kado.js')
        },
        setting: {
          enabled: true,
          root: path.resolve(__dirname + '/../modules/setting/kado.js')
        },
        staff: {
          enabled: true,
          root: path.resolve(__dirname + '/../modules/staff/kado.js'),
        }
      }
    }
  }
  master(config,configOverlay,workerRoot){
    const child = require('infant').child
    const clusterSetup = require('infant').cluster
    let cluster
    child(
      config.name + ':' + configOverlay.instanceName + ':master',
      (done) => {
        cluster = clusterSetup(workerRoot,configOverlay.worker)
        cluster.start((err)=>{ done(err) })
      },
      (done) => {
        if(!cluster) return done()
        cluster.stop((err)=>{ done(err) })
      }
    )
    return cluster
  }
  worker(config,configOverlay){
    const Kado = require('kado')
    const worker = require('infant').worker
    const app = new Kado(config,configOverlay)
    const server = require('http').createServer(app.express)
    exports.start = (done)=>{
      server.listen(configOverlay.port,configOverlay.host)
      app.start().then(()=>{done()}).catch(done)
    }
    exports.stop = (done)=>{
      app.stop(); server.close(); process.nextTick(done)
    }
    worker(
      server,
      config.name + ':' + configOverlay.instanceName + ':worker',
      (done) => { exports.start(done) },
      (done) => { exports.stop(done) }
    )
    return app
  }
  app(config,mainRoot,adminRoot){
    const Kado = require('kado')
    const Lifecycle = require('infant').Lifecycle
    const child = require('infant').child
    const parent = require('infant').parent
    const lifecycle = new Lifecycle()
    const app = new Kado(config)
    let admin = null
    let main = null
    if(adminRoot) admin = parent(adminRoot || './admin')
    if(mainRoot) main = parent(mainRoot || './main')
    lifecycle.on('start',(item)=>{app.log.info('Starting ' + item.title)})
    lifecycle.on('stop',(item)=>{app.log.info('Stopping ' + item.title)})
    lifecycle.on('online',()=>{app.log.info('Startup complete')})
    lifecycle.on('offline',()=>{app.log.info('Shutdown complete')})
    if(adminRoot && config.admin.enabled){
      lifecycle.add('admin',(done)=>{
        admin.start(done)},(done)=>{admin.stop(done)
      })
    }
    if(mainRoot && config.main.enabled){
      lifecycle.add('main',(done)=>{
        main.start(done)},(done)=>{main.stop(done)
      })
    }
    let start = (done)=>{
      app.log.info('Beginning startup')
      lifecycle.start((err)=>{if(err) throw err; done()})
    }
    let stop = (done)=>{
      app.log.info('Beginning shutdown')
      lifecycle.stop((err)=>{ if(err) throw err; done() })
    }
    if(false === app.routeCli(process.argv)){
      child(config.name,(done)=>{ start(done) },(done)=>{ stop(done) })
    }
    return lifecycle
  }
  test(config){
    const Kado = require('kado')
    const P = require('bluebird')
    const exec = P.promisify(require('child_process').exec)
    const { expect } = require('chai')
    const request = require('request')
    //turn off dev mode
    config.dev = false
    //make some promises
    P.promisifyAll(request)
    const testModules = (app,instanceName,params) => {
      if(!params) params = {}
      Object.keys(app.modules).forEach((moduleKey)=>{
        const mod = app.modules[moduleKey]
        if(typeof mod.test !== 'function') return
        const tests = mod.test()
        if(!(tests instanceof Object)) return
        if(typeof tests[instanceName] !== 'function') return
        tests[instanceName](app,params)
      })
    }
    describe('kado-web',()=>{
      describe('cli',()=>{
        const app = new Kado(config)
        testModules(app,'cli')
      })
      describe('admin',()=>{
        //setup server
        const app = new Kado(config,config.admin)
        const server = require('http').createServer(app.express)
        const makeUrl = (uri)=>{
          return 'http://' + (config.admin.host || 'localhost') +
            ':' + (config.admin.port || 3001) + (uri || '/')
        }
        //setup test params for the module environment
        const params = {}
        params.baseUrl = makeUrl('')
        params.makeUrl = makeUrl
        params.cookieJar = request.jar()
        params.doLogin = () => {
          return request.postAsync({
            url: params.makeUrl('/login'),
            jar: params.cookieJar,
            json: {
              email: 'test@test.com',
              password: 'test'
            }
          })
            .then((res) => {
              params.cookieJar._isLoggedIn = true
              expect(res.body.success).to.match(/Login success/)
            })
        }
        params.doLogout = () => {
          return request.getAsync({
            url: params.makeUrl('/logout'),
            jar: params.cookieJar
          })
            .then((res) => {
              expect(res.body).to.match(/<h2>Login<\/h2>/)
              params.cookieJar = null
            })
        }
        before(()=>{
          return exec('node app staff create -e test@test.com -p test -n test')
            .then((result) => {
              expect(result).to.match(/Staff member created!/i)
              server.listen(config.admin.port || 3001,config.admin.host)
              return app.start()
            })
        })
        after(()=>{
          return P.try(() => {
            if(params.cookieJar){
              return params.doLogout()
            }
          })
            .then(() => {
              server.close()
              //app.stop() // this does is shut down sequelize connections which
              //we need for testing main, thus avoiding this call
              return exec('node app staff remove -e test@test.com')
            })
            .then((result) => {
              expect(result).to.match(/Staff member removed successfully!/i)
            })
        })
        it('should be up',() => {
          return request.getAsync(makeUrl('/'))
            .then((res) => {
              expect(res.statusCode).to.equal(200)
              expect(res.body).to.match(/<html/)
            })
        })
        it('should have a login page',() => {
          return request.getAsync(makeUrl('/login'))
            .then((res) => {
              expect(res.statusCode).to.equal(200)
              expect(res.body).to.match(/login/i)
            })
        })
        it('should login',() => {
          return params.doLogin()
        })
        describe('modules',()=>{
          testModules(app,'admin',params)
        })
      })
      describe('main',()=>{
        //setup server
        const app = new Kado(config,config.main)
        const server = require('http').createServer(app.express)
        const makeUrl = (uri)=>{
          return 'http://' + (config.main.host || 'localhost') +
            ':' + (config.main.port || 3001) + (uri || '/')
        }
        before(()=>{
          server.listen(config.main.port || 3001,config.main.host)
          return app.start()
        })
        after(()=>{
          server.close()
          app.stop() //this should actually close the connection manager on
          //final shutdown
        })
        //setup test params for the module environment
        const params = {}
        params.baseUrl = makeUrl('')
        params.makeUrl = makeUrl
        params.cookieJar = request.jar()
        it('should be up',() => {
          return request.getAsync(makeUrl('/'))
            .then((res) => {
              expect(res.statusCode).to.equal(200)
              expect(res.body).to.match(/<html/)
            })
        })
        it('should have a homepage',()=>{
          return request.getAsync(makeUrl('/'))
            .then((result)=>{
              expect(result.body).to.match(/Install Now/)
            })
        })
        describe('modules',()=>{
          testModules(app,'main',params)
        })
      })
    })
  }
}

module.exports = new KadoUI()
