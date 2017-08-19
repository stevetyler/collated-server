process.env.NODE_ENV = 'test';

const chai = require('chai');
const chaiHttp = require('chai-http');
const helpers = require('../lib/utilities/helpers.js');

chai.use(chaiHttp);

describe('helpers.extractUrl', function() {
  it("should extract url from 'ghgdh http://bbc.co.uk ghgjhagsgd'", function(done) {
    chai.assert.equal(helpers.extractUrl('ghgdh http://bbc.co.uk ghgjhagsgd'), 'http://bbc.co.uk');
    done();
  });
  it("should extract url from 'ghgdhg http://www.bbc.co.uk ghgjhagsgd'", function(done) {
    chai.assert.equal(helpers.extractUrl('ghgdhg http://www.bbc.co.uk ghgjhagsgd'), 'http://www.bbc.co.uk');
    done();
  });
  it("should extract url from 'ghgdhgjdhgas https://www.facebook.com ghgjhagsgd'", function(done) {
    chai.assert.equal(helpers.extractUrl('ghgdhgjdhgas https://www.facebook.com ghgjhagsgd'), 'https://www.facebook.com');
    done();
  });
  it("should return null from non http url from 'ghgdhgjdhgas www.facebook.com ghgjhagsgd'", function(done) {
    chai.assert.equal(helpers.extractUrl('ghgdhgjdhgas www.facebook.com ghgjhagsgd'), null);
    done();
  });
  it("should return null for non url in 'ghgdhgjdhgas http//bbc.co.uk'", function(done) {
    chai.assert.equal(helpers.extractUrl('ghgdhgjdhgas http//bbc.co.uk'), null);
    done();
  });
});

describe('helpers.containsUrl', function() {
  it('should return true for url in item body string', function(done) {
    chai.assert.equal(helpers.containsUrl('ghgdh http://bbc.co.uk ghgjhagsgd'), true);
    done();
  });
  it('should return true for multiple urls in item body string', function(done) {
    chai.assert.equal(helpers.containsUrl('ghgdh http://bbc.co.uk http://www.facebook.com ghgjhagsgd'), true);
    done();
  });
  it('should return false for non urls in item body string', function(done) {
    chai.assert.equal(helpers.containsUrl('ghgdh uuiuoaidus ghgjhagsgd'), false);
    done();
  });
});

describe('helpers.extractToken', function() {
  it('should return token string', function(done) {
    chai.assert.equal(helpers.extractToken('connect.sid=s%3AtVk4ib6Oh3xsGnQ; ios-token=bcfsX867oup9sCXurT'), 'bcfsX867oup9sCXurT');
    done();
  });
  it('should return token string', function(done) {
    chai.assert.equal(helpers.extractToken('ios-token=bcfsX8gsfgdfg9jFTsCXurT; connect.sid=s%3AtVk4ibrZH6Oh3xsGnQ'), 'bcfsX8gsfgdfg9jFTsCXurT');
    done();
  });
  it('should return empty string', function(done) {
    chai.assert.equal(helpers.extractToken('token=bcfsX89jFsdfgsdfTsCXurT; connect.sid=s%3AtVk4ibrZH6Oh3xsGnQ'), '');
    done();
  });
  it('should return token string', function(done) {
    chai.assert.equal(helpers.extractToken('connect.sid=s%3AtVk4ib6Oh3xsGnQ;ios-token=bcfsX8sdfgdfs67oup9sCXurT'), 'bcfsX8sdfgdfs67oup9sCXurT');
    done();
  });
});
