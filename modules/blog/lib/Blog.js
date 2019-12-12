'use strict';
const datatable = require('sequelize-datatable')
const K = require('kado').getInstance()
const P = require('bluebird')
const BlogModel = K.db.sequelize.models.Blog
const BlogRevisionModel = K.db.sequelize.models.BlogRevision

class Blog {
  datatable(req,res){
    return datatable(BlogModel,req.query,res.Q)
  }
  get(id,q){
    if(!q) q = K.database.queryOptions()
    q.include = [{model: BlogRevision}]
    return BlogModel.findByPk(id,q)
  }
  getByUri(uri,q){
    if(!q) q = K.database.queryOptions()
    q.where = {uri: req.params.blogUri}
    return Blog.findOne(q)
  }
  getRevision(id,q){
    if(!q) q = K.database.queryOptions()
    return BlogRevisionModel.findByPk(id)
  }
  list(options,q){
    if(!q) q = K.database.queryOptions()
    if(options.where) q.where = options.where
    if(options.order) q.order = options.order
    return BlogModel.findAll(q)
  }
  remove(list){
    if(!(list instanceof Array)) list = [list]
    return P.try(()=>{return list})
      .each((id)=>{
        return id > 0 ? BlogModel.destroy({where: {id: id}}) : null
      })
  }
  save(data){
    let hash
    let blog
    let isNewRevision = false
    let isNew = false
    this.get(data.id)
      .then((result) => {
        blog = result
        if(!blog){
          isNew = true
          blog = BlogModel.build({
            content: '',
            html: ''
          })
        }
        if(data.title) blog.title = data.title
        if(data.uri) blog.uri = data.uri
        if('undefined' === typeof data.active) blog.active = false
        if(data.active) blog.active = true
        //first hash them
        if(!data.content) data.content = ''
        if(!data.html) data.html = ''
        let cipher = crypto.createHash('sha256')
        hash = cipher.update(data.content + data.html).digest('hex')
        return BlogRevisionModel.findOne({where: {hash: hash, BlogId: blog.id}})
      })
      .then((result) => {
        if(!result){
          isNewRevision = true
          let revParams = {
            content: data.content,
            html: data.html,
            hash: hash,
            BlogId: blog.id
          }
          return BlogRevisionModel.create(revParams)
        } else {
          return result
        }
      })
      .then(() => {
        blog.content = data.content
        blog.html = data.html
        return blog.save()
      })
  }
  revert(data){
    const that = this
    let revision
    let blog
    this.getRevision(data.revisionId)
      .then((result)=>{
        revision = result
        if(!revision) throw new Error('Revision Not Found')
        return that.get(data.blogId)
      })
      .then((result)=>{
        blog = result
        if(!blog) throw new Error('Blog Not Found')
        return blog
      })
      .then(()=> {
        blog.content = revision.content
        blog.html = revision.html
        return blog.save()
      })
  }
}

Blog.getInstance = ()=>{
  return new Blog()
}

module.exports = Blog
