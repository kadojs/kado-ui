'use strict';
const ui = require('./index').getInstance()
ui.app(ui.config(),__dirname + '/main',__dirname + '/admin')
