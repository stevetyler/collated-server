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
