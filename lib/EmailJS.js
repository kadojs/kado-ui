'use strict';
/**
 * Kado - Web Application System
 * Copyright © 2015-2019 Bryan Tong, NULLIVEX LLC. All rights reserved.
 * Kado <support@kado.org>
 *
 * This file is part of Kado and bound to the MIT license distributed within.
 */
const EmailConnector = require('kado/lib/EmailConnector')

module.exports = class EmailJs extends EmailConnector {
  static getInstance(){ return new EmailJs() }
  constructor(options){
    super(options)
    this.emailjs = require('emailjs')
  }
  connect(){
    this.server = this.emailjs.server.connect(this.options)
    return this.server
  }
  /**
   * Send mail
   *  {
   *    from: 'Foo <foo@example.com>',
   *    to: 'Foo <foo@example.com>',
   *    subject: 'Foo Foo',
   *    message: 'Foo bar baz',
   *    html: '<b>Foo</b>',
   *    attachment: '/foo.jpg' || streamFoo || 'foo attachment message'
   *  }
   * @param {object} options
   */
  send(options){
    //coerce options to our liking
    if(options.html && !options.attachment){
      options.attachment = [{data: options.html, alternative: true}]
      delete options.html
    } else if(options.html && options.attachment){
      delete options.html
    }
    //shift attachment into an array if its not already
    if(options.attachment && !(options.attachment instanceof Array)){
      options.attachment = [options.attachment]
    }
    //send the email
    let emailOptions = {...this.emailConfig}
    if(options.text) emailOptions.text = options.text
    if(options.to) emailOptions.to = options.to
    if(options.cc) emailOptions.cc = options.cc
    if(options.bcc) emailOptions.bcc = options.bcc
    if(options['reply-to']) emailOptions['reply-to'] = options['reply-to']
    if(options.from) emailOptions.from = options.from
    if(options.subject) emailOptions.subject = options.subject
    if(options.attachment) emailOptions.attachment = options.attachment
    const that = this
    return Promise.resolve().then(()=>{ that.checkServer() })
      .then(new Promise((resolve,reject)=>{
        that.server.send(emailOptions,(err,message) => {
          if(err) return reject(err)
          resolve(message)
        })
      }))
  }
}
