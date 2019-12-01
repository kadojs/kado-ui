'use strict';

exports.master = (config,configOverlay)=>{
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

exports.worker = (config,configOverlay)=>{
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
