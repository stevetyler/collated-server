'use strict';

var db = require('../../database/database');
var mongoose = require('');

const Category = db.model('Category');
const categorySchema = require('../schemas/category');

const Tag = db.model('Tag');
const tagSchema = require('../schemas/tag');

mongoose.connection.model('Category', categorySchema);
mongoose.connection.model('Tag', tagSchema);

function removeRedundantTags(req, res) {
  Category.find({user: req.params.id}).then(categories => {
    let categoryArr = categories.map(category => {
      return category._id;
    });
    return categoryArr;
  }).then(categoryArr => {
    let tagsPromise = new Promise(resolve => {
      resolve(Tag.find({}));
    });

    return {
      categoryArr: categoryArr,
      tags: tagsPromise
    };
  }).then(obj => {
    obj.tags.reduce((arr, tag) => {
      if (obj.categoryArr.indexOf(tag.category) === -1) {
        return arr.push(tag);
      }
    }, []);
  }).then(tagsArr => {
    tagsArr.map(tag => {
      console.log('tag to delete ', tag._id, 'for user ', tag.user);
      //Tag.remove({_id: tag._id});
    });
  });
}
