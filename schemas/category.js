'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const categorySchema = new Schema({
  id: String,
  colour: String,
  isDefault: String,
  isPrivate: String,
  isReserved: String,
  itemCount: String,
  name: String,
  showSlackIcon: String,
  slackChannelId: String,
  user: String,
  userGroup: String
});

categorySchema.methods.makeEmberCategory = function(count) {
	const emberCategory = {
		id: this._id,
    name: this.name,
		colour: this.colour,
    itemCount: count,
    isPrivate: this.isPrivate,
    slackChannelId: this.slackChannelId,
    user: this.user,
    userGroup: this.userGroup,
	};
  return emberCategory;
};

module.exports = categorySchema;
