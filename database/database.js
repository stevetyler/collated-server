var logger = require('nlogger').logger(module);
logger.info('load database.js');

var mongoose = require('mongoose');
var userSchema = require('../schemas/user');
var itemSchema = require('../schemas/item');
var tagSchema = require('../schemas/tag');

// TTL errors when creating new user :
// http://stackoverflow.com/questions/22698661/mongodb-error-setting-ttl-index-on-collection-sessions
mongoose.connect('mongodb://localhost/collated'); // pending, then emits 'open' event

mongoose.connection.model('User', userSchema);
mongoose.connection.model('Item', itemSchema);
mongoose.connection.model('Tag', tagSchema);


module.exports = mongoose.connection;
