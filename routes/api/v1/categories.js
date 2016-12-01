'use strict';
const db = require('../../../database/database');
const ensureAuthenticated = require('../../../middlewares/ensure-authenticated').ensureAuthenticated;

const Item = db.model('Item');
const Category = db.model('Category');
const User = db.model('User');
const UserGroup = db.model('UserGroup');

module.exports.autoroute = {
	get: {'/categories' : getCategories},
	post: {'/categories': [ensureAuthenticated, postCategory]},
	put: {'/categories/:id': [ensureAuthenticated, putCategory]},
	// delete: {'/categories/:id': [ensureAuthenticated, deleteCategory]}
};

function getCategories(req, res){
	console.log('get categories called');
	if (req.query.operation === 'userCategories') { getUserCategories(req, res); }
	else if (req.query.operation === 'groupCategories') { getGroupCategories(req, res); }
	else {
		res.status(404).end();
	}
}

function getGroupCategories(req, res) {
	const groupId = req.query.groupId;
	console.log('group categories', groupId);

	if (!groupId) {
		res.status(404).end();
		return;
	}
	Category.find({userGroup: groupId}).exec().then((categories) => {
		if (categories) {
			return makeEmberCategories(groupId, categories, 'group');
		}
	}).then((obj) => {
		res.send({ categories: obj.all });
	}, () => {
		res.status(404).end();
		return;
	});
}

function getUserCategories(req, res) {
	const userId = req.query.userId;
	console.log('user categories', userId);

	if (!userId) {
		res.status(404).end();
		return;
	}
	return Category.find({user: userId}).then(categories => {
		console.log('categories found', categories.length);
		if (!categories.length) {
			const newCategory = {
				colour: 'cp-colour-1',
				isDefault: true,
				name: 'General',
				user: userId,
			};
			return Category.create(newCategory);
		} else {
			return categories;
		}
	}).then(categoryData => {
		if (Array.isArray(categoryData)) {
			return makeEmberCategories(userId, categoryData, 'user');
		}
		else {
			return {
				all: [categoryData]
			};
		}
	}).then(obj => {
		console.log('obj returned', obj.all);
		res.send({ categories: obj.all });
	}, () => {
		res.status(401).end();
		return;
	});
}

function postCategory(req, res){
	if (req.body.category.userGroup) {
		postGroupCategoryHandler(req, res);
		return;
	}
	else if (req.user.id === req.body.category.user) {
		postUserCategoryHandler(req, res);
		return;
	}
	else {
		res.status(401).end();
		return;
	}
}

function postUserCategoryHandler(req, res) {
	User.findOne({id: req.user.id}).then(user => {
		if (user !== null && typeof user === 'object') {
			console.log('user category to save');
			return saveCategory(req.body.category);
		}
		res.status(404).end();
		return;
	}).then(category => {
		let emberCategory = category.makeEmberCategory();

		res.send({'category': emberCategory});
		return;
	}).catch(err => {
		console.log(err);
		res.status(404).end();
		return;
	});
}

function postGroupCategoryHandler(req, res) {
	const category = req.body.category;
	// need to check adminPermissions with user id
	UserGroup.findOne({id: category.userGroup}).then(group => {
		if (group !== null && typeof group === 'object') {
			return saveCategory(req.body.category);
		}
		res.status(404).end();
		return;
	}).then(category => {
		let emberCategory = category.makeEmberCategory();

		res.send({'category': emberCategory});
		return;
	}).catch(err => {
		console.log(err);
		res.status(404).end();
		return;
	});
}

function saveCategory(category) {
	return Category.create({
		name: category.name,
		colour: category.colour,
		isPrivate: category.isPrivate,
		slackChannelId: category.slackChannelId,
		slackTeamId: category.slackTeamId,
		user: category.user,
		userGroup: category.userGroup,
	});
}

function makeEmberCategories(id, categories, type) {
	console.log('make ember categories called');
	let categoryPromises;

	if (type === 'user') {
		console.log('make ember user categories called');
		categoryPromises = categories.map(category => Item.count({ user: id, categories: { $in: [ category._id ] }}));
	}	else if (type === 'group') {
		categoryPromises = categories.map(category => Item.count({ userGroup: id, categories: {$in: [category._id] }}));
	}
	if (categoryPromises) {
		return Promise.all(categoryPromises).then(counts => {
			return categories.reduce((obj, category, i) => {
				const emberCategory = category.makeEmberCategory(counts[i]);
				return category.isPrivate === 'true' ?
					{
						all: obj.all.concat(emberCategory),
						public: obj.public } :
					{
						all: obj.all.concat(emberCategory),
						public: obj.public.concat(emberCategory),
					};
			}, { all: [], public: [] });
		});
	}	else {
		return { all: [], public: [] };
	}
}

function putCategory(req, res) {
  const categoryId = req.params.id;
  const isPrivate = req.body.category.isPrivate;
	const categoryName = req.body.category.name;

	//console.log('putCategory', categoryId, categoryName);
  Category.update({_id: categoryId}, // removed user: req.user.id temporarily
    {$set: {
      name: categoryName,
      colour: req.body.category.colour,
      isPrivate: req.body.category.isPrivate
      }
    }
  ).then(() => {
    Item.find({user: req.user.id, categories: {$in: [categoryId]}}, (err, items) => {
      if (err) {
        return res.status(404).send();
      }
      items.forEach((item) => {
        item.isPrivate = isPrivate;
        return item.save();
      });
    });
  }).then(() => {
    return res.send({});
  }).then(null, (err) => {
    console.log(err);
    return res.status(400).end();
  });
}







// function getUserCategories(req, res) {
// 	const id = req.query.userId;
//
// 	if (!id) {
// 		return res.status(404).end();
// 	}
// 	Category.findOne({name: 'unassigned', user: id}).exec().then((category) => {
// 		if (typeof category !== 'object') {
// 			Category.create({
// 				name: 'unassigned',
// 				colour: 'cp-colour-1',
// 				user: id,
// 				itemCount: 0
// 			});
// 		}
// 	}).then(() => {
// 		return Category.find({user: id});
// 	}).then((categories) => {
// 		if (categories) {
// 			return makeEmberCategories(id, categories, 'user');
// 		}
// 	}).then((obj) => {
// 	  if (!req.user) {
// 			return obj.public;
// 	  } else if (req.user.id === req.query.userId) {
// 			return obj.all;
// 	  } else {
// 	    return obj.public;
// 	  }
// 	}).then((categories) => {
// 		res.send({ categories: categories });
// 	}, () => {
// 		return res.status(404).end();
// 	});
// }
//

// function postUserCategoryHandler(req, res) {
// 	saveCategory(req.body.category).then(category => {
// 		let emberCategory = category.makeEmberCategory();
//
// 		res.send({'category': emberCategory});
// 		return;
// 	}).catch(err => {
// 		console.log(err);
// 		res.status(401).end();
// 		return;
// 	});
// }

//
// function putCategory(req, res) {
//   const categoryId = req.params.id;
//   const isPrivate = req.body.category.isPrivate;
// 	const categoryName = req.body.category.name;
//
// 	console.log('putCategory', categoryId, categoryName);
//   if (req.user.id === req.body.category.user || req.user.slackProfile.isTeamAdmin) {
//     Category.update({_id: categoryId}, // removed user: req.user.id temporarily
//       {$set: {
//         name: categoryName,
//         colour: req.body.category.colour,
//         isPrivate: req.body.category.isPrivate
//         }
//       }
//     ).then(() => {
//       Item.find({user: req.user.id, categories: {$in: [categoryId]}}, (err, items) => {
//         if (err) {
//           return res.status(404).send();
//         }
//         items.forEach((item) => {
//           item.isPrivate = isPrivate;
//           return item.save();
//         });
//       });
//     }).then(() => {
//       return res.send({});
//     }).then(null, (err) => {
//       console.log(err);
//       return res.status(400).end();
//     });
//   }	else {
// 		console.log('userId', req.user.id, 'category user', req.body.category.user, req.user.slackProfile.isTeamAdmin);
// 		return res.status(401).end();
// 	}
// }
//
// function deleteCategory(req, res){
//   Category.remove({ _id: req.params.id }).exec().then(() => {
//     return res.send({});
//   }).then(null, (err) => {
// 		console.log(err);
// 		return res.status(500).end();
// 	});
// }
