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
  config(){
    return {
      name: 'kado',
      title: 'Kado',
      userModuleFolderName: 'modules',
      db: {
        sequelize: {
          load: true,
          enabled: true,
          name: 'kado',
          user: 'kado',
          password: 'kado',
          define: {
            paranoid: false,
            freezeTableName: true,
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
        mustache: {
          enabled: true
        },
        addCss: [
          {uri: 'https://stackpath.bootstrapcdn.com/bootstrap/4.4.0/css/' +
              'bootstrap.min.css'},
          {uri: 'https://cdnjs.cloudflare.com/ajax/libs/flag-icon-css/3.4.3/' +
              'css/flag-icon.min.css'},
          {uri: '/css/main.css'},
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
        ],
        staticRoot: [
          __dirname + '/admin/public'
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
        mustache: {
          enabled: true
        },
        staticRoot: [
          __dirname + '/main/public'
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
        staff: {
          enabled: true,
          root: path.resolve(__dirname + '/../modules/staff/kado.js'),
        }
      }
    }
  }
  master(config,configOverlay){
    const child = require('infant').child
    const clusterSetup = require('infant').cluster
    let cluster
    child(
      config.name + ':' + configOverlay.instanceName + ':master',
      (done) => {
        cluster = clusterSetup('./worker',configOverlay.worker)
        cluster.start((err)=>{ done(err) })
      },
      (done) => {
        if(!cluster) return done()
        cluster.stop((err)=>{ done(err) })
      }
    )
  }
  worker(config,configOverlay){
    const Kado = require('kado')
    const worker = require('infant').worker
    const app = new Kado(config,configOverlay)
    const server = require('http').createServer(app.express)
    exports.start = (done)=>{
      server.listen(config.main.port,config.main.host)
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
  }
  app(config,mainRoot,adminRoot){
    const Kado = require('kado')
    const Lifecycle = require('infant').Lifecycle
    const child = require('infant').child
    const parent = require('infant').parent
    const lifecycle = new Lifecycle()
    const app = new Kado(config)
    if(adminRoot) const admin = parent(adminRoot || './admin')
    if(mainRoot) const main = parent(mainRoot || './main')
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
    exports.start = (done)=>{
      app.log.info('Beginning startup')
      lifecycle.start((err)=>{if(err) throw err; done()})
    }
    exports.stop = (done)=>{
      app.log.info('Beginning shutdown')
      lifecycle.stop((err)=>{ if(err) throw err; done() })
    }
    if(false === app.routeCli(process.argv)){
      child(config.name,(done)=>{
        exports.start(done)},(done)=>{exports.stop(done)
      })
    }
  }
}

module.exports = new KadoUI()
