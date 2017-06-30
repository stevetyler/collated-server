process.env.NODE_ENV = 'test';

const chai = require('chai');
const chaiHttp = require('chai-http');
const extractUrl = require('../lib/utilities/extractUrl');

chai.use(chaiHttp);

describe('extractUrl', function() {
  it('should extract http:// url from item body string', function(done) {
    chai.assert.equal(extractUrl('ghgdh http://bbc.co.uk ghgjhagsgd'), 'http://bbc.co.uk');
    done();
  });
  it('should extract http://www url from item body string', function(done) {
    chai.assert.equal(extractUrl('ghgdhg http://www.bbc.co.uk ghgjhagsgd'), 'http://www.bbc.co.uk');
    done();
  });
  it('should extract https:// url from item body string', function(done) {
    chai.assert.equal(extractUrl('ghgdhgjdhgas https://www.facebook.com ghgjhagsgd'), 'https://www.facebook.com');
    done();
  });
  it('should return null from non http url from item body string', function(done) {
    chai.assert.equal(extractUrl('ghgdhgjdhgas www.facebook.com ghgjhagsgd'), null);
    done();
  });
  it('should return null for non url in item body string', function(done) {
    chai.assert.equal(extractUrl('ghgdhgjdhgas http//bbc.co.uk'), null);
    done();
  });
});

describe('itemPreview', function() {});

describe(' tests', function() {});
