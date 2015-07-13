var logger = require('nlogger').logger(module);
logger.info('load database.js');

var mongoose = require('mongoose');
var userSchema = require('../schemas/user');
var favSchema = require('../schemas/fav');
var tagSchema = require('../schemas/tag');

// TTL errors when creating new user :
// http://stackoverflow.com/questions/22698661/mongodb-error-setting-ttl-index-on-collection-sessions
mongoose.connect('mongodb://localhost/webdevfavs'); // pending, then emits 'open' event

mongoose.connection.model('User', userSchema);
mongoose.connection.model('Fav', favSchema);
mongoose.connection.model('Tag', tagSchema);


module.exports = mongoose.connection;
