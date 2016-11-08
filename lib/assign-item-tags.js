'use strict';
const mongoose = require('mongoose');

const categorySchema = require('../schemas/category.js');
const Category = mongoose.model('Category', categorySchema);
const tagSchema = require('../schemas/tag.js');
const Tag = mongoose.model('Tag', tagSchema);

function assignItemTags(titleText, groupId, userId, slackChannelId) {
  const text = titleText.toLowerCase();
  const categoryQuery = slackChannelId ? {userGroup: groupId, slackChannelId: slackChannelId} : {user: userId};
	const tagQuery = groupId ? {slackTeamId: groupId} : {user: userId};
  const tagsObj = {};

  Category.find(categoryQuery).then(categories => {
    if (Array.isArray(categories)) {
      return categories.reduce((tagsObj, category) => {
        if (category.slackChannelId === 'string') {
          Object.assign(tagsObj, {categoryId: category._id});
          return;
        }
        let categoryname = category.name.toLowerCase();

        return text.indexOf(categoryname) !== -1 ? Object.assign(tagsObj, {categoryId: category._id}) : null;
      }, tagsObj);
    }
  }).then(() => {
    return Tag.find(tagQuery);
  }).then(tags => {
    if (Array.isArray(tags)) {
      return tags.reduce((obj, tag) => {
  			let tagname = tag.name.toLowerCase();

  	    if (text.indexOf(tagname) !== -1) {
  	      console.log('tag found', tag);
  	      obj.tagIds.push(tag._id);
  	    }
  			if (tagname === 'unassigned') {
  				obj.unassignedId.push(tag._id);
  			}
  			return obj;
  	  }, {tagIds: [], unassignedId: []});
    }
	}).then(obj => {
		console.log('tags returned', tagsObj);
		return tagsObj.tagIds.length > 0 ? {
      categoryId: tagsObj.categoryId,
      tagIds: obj.tagIds,
		} : {
      categoryId: tagsObj.categoryId,
      tagIds: obj.unassignedId
    };
	});
}


module.exports = assignItemTags;

// old saveSlackItem
// function saveSlackItem(message) {
// 	const slackTimestamp = message.timestamp || message.ts;
// 	const newTimestamp = slackTimestamp.split('.')[0] * 1000;
// 	let unassignedTagId;
// 	let slackItem = {
//     user: message.user_name,
// 		author: message.user_name,
//     createdDate: newTimestamp,
//     body: message.text,
// 		type: 'slack',
// 		slackChannelId: message.channel_id,
// 		slackTeamId: message.team_id
//   };
//
// 	return Tag.findOne({name: 'unassigned', slackChannelId: message.channel_id}).exec().then(tag => {
// 		if (tag) {
// 			return tag;
// 		} else {
// 			return Tag.create({
// 				name: 'unassigned',
// 				colour: 'cp-colour-1',
// 				slackChannelId: message.channel_id,
// 				slackTeamId: message.team_id
// 			});
// 		}
// 	}).then(tag => {
// 		unassignedTagId = tag._id;
// 	}).then(() => {
// 		return Tag.findOne({name:message.channel_name, slackChannelId: message.channel_id});
// 	}).then(function(tag) {
// 		if (!tag) {
// 			let newTag = {
// 				name: message.channel_name,
// 				isSlackChannel: true,
// 				slackChannelId: message.channel_id,
// 				slackTeamId: message.team_id,
// 				colour: 'cp-colour-1'
// 			};
// 			return Tag.create(newTag);
// 		} else {
// 			Object.assign(slackItem, {tags: [tag._id, unassignedTagId]});
// 		}
// 	}).then(tag => {
// 		if (tag) {
// 			Object.assign(slackItem, {tags: [tag._id, unassignedTagId]});
// 		}
// 	}).then(function() {
// 		let newItem = new Item(slackItem);
// 		console.log('new slack item', newItem);
// 		return newItem.save();
// 	});
// }
