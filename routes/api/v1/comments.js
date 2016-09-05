'use strict'
const db = require('../../../database/database');
const Item = db.model('Item');
//const Comment = db.model('Item');

module.exports.autoroute = {
  post: {
    '/comments': postItemComment
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
