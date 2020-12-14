'use strict';
//const logger = require('nlogger').logger(module);
//logger.info('load database.js');
const auth = require('../auth');
const mongoose = require('mongoose');
const connectOptions = {
  useNewUrlParser: true, 
  useFindAndModify: false,
  useUnifiedTopology: true 
}

const categorySchema = require('../schemas/category');
const itemSchema = require('../schemas/item');
const userSchema = require('../schemas/user');
const userGroupSchema = require('../schemas/userGroup');
const tagSchema = require('../schemas/tag');
const planSchema = require('../schemas/plan');


if (process.env.NODE_ENV === 'production') {
  console.log(`mongodb+srv://${auth.atlasAuth.user}:${auth.atlasAuth.password}@collatedlive.monbi.mongodb.net/collated?retryWrites=true&w=majority`);
  mongoose.connect(`mongodb+srv://${auth.atlasAuth.user}:${auth.atlasAuth.password}@collatedlive.monbi.mongodb.net/collated?retryWrites=true&w=majority`, 
    connectOptions
  );
}
else {
  mongoose.connect(`mongodb+srv://${auth.atlasAuth.user}:${auth.atlasAuth.password}@collatedlive.monbi.mongodb.net/collated-test?retryWrites=true&w=majority`, 
  connectOptions
  );
}

mongoose.connection.model('Category', categorySchema);
mongoose.connection.model('UserGroup', userGroupSchema);
mongoose.connection.model('User', userSchema);
mongoose.connection.model('Item', itemSchema);
mongoose.connection.model('Tag', tagSchema);
mongoose.connection.model('Plan', planSchema);


module.exports = mongoose.connection;
