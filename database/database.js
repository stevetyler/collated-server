'use strict';
//const logger = require('nlogger').logger(module);
//logger.info('load database.js');
const auth = require('../auth');
const mongoose = require('mongoose');

const categorySchema = require('../schemas/category');
const itemSchema = require('../schemas/item');
const userSchema = require('../schemas/user');
const userGroupSchema = require('../schemas/userGroup');
const tagSchema = require('../schemas/tag');
const planSchema = require('../schemas/plan');


if (process.env.NODE_ENV === 'production') {
  mongoose.connect(`mongodb://${auth.mlabAuth.user}:${auth.mlabAuth.password}@ds013291-a0.mlab.com:13291,ds013291-a1.mlab.com:13291/collated?replicaSet=rs-ds013291`);
}
else if (process.env.NODE_ENV === 'Atlas test') {
  mongoose.connect(`mongodb://${auth.atlasAuth.user}:${auth.atlasAuth.password}@collatedlive.monbi.mongodb.net/collated?retryWrites=true&w=majority`);
  console.log('connected to Atlas test db');
}
else {
  console.log('connected to local Collated db');
  mongoose.connect('mongodb://localhost/collated'); // pending, then emits 'open' event
}

mongoose.connection.model('Category', categorySchema);
mongoose.connection.model('UserGroup', userGroupSchema);
mongoose.connection.model('User', userSchema);
mongoose.connection.model('Item', itemSchema);
mongoose.connection.model('Tag', tagSchema);
mongoose.connection.model('Plan', planSchema);


module.exports = mongoose.connection;
