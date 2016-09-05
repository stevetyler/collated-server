'use strict'
const db = require('../../../database/database');
const ensureAuthenticated = require('../../../middlewares/ensure-authenticated').ensureAuthenticated;

const Item = db.model('Item');

module.exports.autoroute = {
  post: {
    '/comments': postItemComment
  },
  delete : {
    '/comments/:id': [ensureAuthenticated, deleteComment]
  }
};

function postItemComment(req, res) {
  //console.log('post comment called');
  const newComment = {
    author: req.body.comment.author,
    createdDate: req.body.comment.createdDate,
    body: req.body.comment.body,
    item: req.body.comment.item
  };
  console.log('post comment called', newComment);

  Item.findOne({_id: req.body.comment.item})
  .then((item) => {
    item.comments.push(newComment);
    item.save();
  })
  .then(() => {
		res.status('201').send({});
	}, (err) => {
		console.log(err);
		return res.status(500).end();
	});
}

function deleteComment(req, res) {
  console.log('delete comment called', req.params.id);
  let commentId = req.params.id;

  return Item.findOne({_id: {$in: {_id: commentId}}})
  .then((item) => {
    console.log('item found', item);
    item.update({
      $pull: {
        comments: {_id: commentId}
      }
    });
  })
  .then(() => {
    res.status('201').send({});
  }, () => {
    return res.status(500).end();
  });
}
