'use strict';
const db = require('../../../database/database');
const ensureAuthenticated = require('../../../middlewares/ensure-authenticated').ensureAuthenticated;

const Item = db.model('Item');

module.exports.autoroute = {
  post: {
    '/comments': [ensureAuthenticated, postItemComment]
  },
  delete : {
    '/comments/:id': [ensureAuthenticated, deleteComment]
  }
};

function postItemComment(req, res) {
  //console.log('post comment called');
  const newComment = {
    createdDate: req.body.comment.createdDate,
    body: req.sanitize().escape(req.body.comment.body),
    item: req.body.comment.item,
    user: req.body.comment.user
  };
  //console.log('post comment called', newComment);

  Item.findOne({_id: req.body.comment.item})
  .then((item) => {
    item.comments.push(newComment);
    return item.save();
  })
  .then((item) => {
    let emberItem = item.makeEmberItem();
		res.status('201').send({items: [emberItem]});
	}, (err) => {
		console.log(err);
		return res.status(500).end();
	});
}

function deleteComment(req, res) {
  console.log('delete comment called', req.params.id);
  let commentId = req.params.id;

  //return Item.findOne({comments: {$in: {_id: commentId}}})
  return Item.findOne({'comments._id': commentId})
  .then((item) => {
    console.log('item found', item);
    item.update({
      $pull: {
        comments: {_id: commentId}
      }
    }).then(item => {
      item.save();
    });
  })
  .then(() => {
    res.status('201').send({});
  }, () => {
    return res.status(500).end();
  });
}
