process.env.NODE_ENV = 'test';

var chai = require('chai');
var chaiHttp = require('chai-http');
var mongoose = require('mongoose');

var server = require('../server');
var itemSchema = require('../schemas/item');
var Item = mongoose.connection.model('Item', itemSchema);
//var userSchema = require('../schemas/user');
//var User = mongoose.connection.model('User', userSchema);

var should = chai.should();
chai.use(chaiHttp);

describe('Items', function() {

  Item.collection.drop();

  beforeEach(function(done){
    var newItem = new Item({
      user: 'test_user',
      body: 'test item',
      tags: ['Test']
    });
    newItem.save(function(err) {
      done();
    });
  });
  afterEach(function(done){
    Item.collection.drop();
    done();
  });

  it('should list ALL items on /api/v1/items GET', function(done) {
    chai.request(server)
      .get('/api/v1/items')
      .query({'operation': 'userItems', 'user': 'test_user'})
      .end(function(err, res){
        res.should.have.status(200);
        res.should.be.json;
        res.body.should.be.a('object');
        //res.body.items[0].should.have.property('_id');
        res.body.items[0].should.have.property('user');
        res.body.items[0].should.have.property('body');
        res.body.items[0].should.have.property('tags');
        res.body.items[0].user.should.equal('test_user');
        res.body.items[0].body.should.equal('test item');
        res.body.items[0].tags[0].should.equal('Test');
        done();
      });
  });

  // it('should list a SINGLE user on /user/<id> GET', function(done) {
  //   var newUser = new Item({
  //     user: 'test_user2',
  //     body: 'test item2',
  //     tags: ['Test2']
  //   });
  //   newUser.save(function(err, data) {
  //     chai.request(server)
  //       .get('/users/'+data.id)
  //       .end(function(err, res){
  //         res.should.have.status(200);
  //         res.should.be.json;
  //         res.body.should.be.a('object');
  //         res.body.should.have.property('id');
  //         res.body.should.have.property('user');
  //         res.body.should.have.property('body');
  //         res.body.should.have.property('tags');
  //         res.body.user.should.equal('test_user2');
  //         res.body.body.should.equal('test item2');
  //         res.body._id.should.equal(data.id);
  //         done();
  //       });
  //   });
  // });

  // it('should add a SINGLE item on /items POST', function(done) {
  //   chai.request(server)
  //     .post('/items')
  //     .send({'user': 'stevetyler_uk', 'body': 'Post Test'})
  //     .end(function(err, res){
  //       res.should.have.status(200);
  //       res.should.be.json;
  //       res.body.should.be.a('object');
  //       res.body.should.have.property('SUCCESS');
  //       res.body.SUCCESS.should.be.a('object');
  //       res.body.SUCCESS.should.have.property('name');
  //       res.body.SUCCESS.should.have.property('lastName');
  //       res.body.SUCCESS.should.have.property('_id');
  //       res.body.SUCCESS.user.should.equal('stevetyler_uk');
  //       res.body.SUCCESS.body.should.equal('Post Test');
  //       done();
  //     });
  // });

  // it('should update a SINGLE item on /item/<id> PUT', function(done) {
  //   chai.request(server)
  //     .get('/items')
  //     .end(function(err, res){
  //       chai.request(server)
  //         .put('/item/'+res.body[0]._id)
  //         .send({'name': 'Spider'})
  //         .end(function(error, response){
  //           response.should.have.status(200);
  //           response.should.be.json;
  //           response.body.should.be.a('object');
  //           response.body.should.have.property('UPDATED');
  //           response.body.UPDATED.should.be.a('object');
  //           response.body.UPDATED.should.have.property('name');
  //           response.body.UPDATED.should.have.property('_id');
  //           response.body.UPDATED.name.should.equal('Spider');
  //           done();
  //       });
  //     });
  // });

  // it('should delete a SINGLE item on /item/<id> DELETE', function(done) {
  //   chai.request(server)
  //     .get('/items')
  //     .end(function(err, res){
  //       chai.request(server)
  //         .delete('/item/'+res.body[0]._id)
  //         .end(function(error, response){
  //           response.should.have.status(200);
  //           response.should.be.json;
  //           response.body.should.be.a('object');
  //           response.body.should.have.property('REMOVED');
  //           response.body.REMOVED.should.be.a('object');
  //           response.body.REMOVED.should.have.property('name');
  //           response.body.REMOVED.should.have.property('_id');
  //           response.body.REMOVED.name.should.equal('Bat');
  //           done();
  //       });
  //     });
  // });
});
