'use strict';
const ui = require('./index')
if(require.main === module){
  ui.app(ui.config(),__dirname + '/main',__dirname + '/admin')
}
