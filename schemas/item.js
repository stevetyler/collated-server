var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var itemSchema = new Schema({
  id: String,
  user: String,
  tags: [String],
  author: String,
  createdDate: Date,
  body: String,
  importedFrom: String,
  type: String,
  twitterProfile: {
    id: String,
    author: String,
    authorImageUrl: String
  },
  isPrivate: String
});

itemSchema.methods.makePrivate = function() {
};

module.exports = itemSchema;
