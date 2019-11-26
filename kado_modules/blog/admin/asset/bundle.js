'use strict';
/**
 * Kado - Web Application System
 * Copyright © 2015-2019 Bryan Tong, NULLIVEX LLC. All rights reserved.
 * Kado <support@kado.org>
 *
 * This file is part of Kado and bound to the MIT license distributed within.
 */


$(window).on('load', function() {
  $('.revertBlog').click(function(){
    let blogId = $(this).attr('data-blogId');
    let revisionId = $(this).attr('data-id');
    $.ajax('/blog/revert',{
      contentType: 'application/json',
      type: 'POST',
      data: JSON.stringify({
        blogId: blogId,
        revisionId: revisionId,
      }),
      success: function(res){
        if('ok' === res.status){
          location.reload()
          window.scrollTo(0, 0);
        }
        else{
          window.alert('ERROR: ' + res.message);
        }
      }
    })
  });
})