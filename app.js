'use strict';
const KadoUI = require('./index')
if(require.main === module){
  KadoUI.app(KadoUI.config(),__dirname + '/main',__dirname + '/admin')
}
