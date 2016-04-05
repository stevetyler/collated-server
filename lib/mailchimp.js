var request = require('request');
var Q = require('q');
var configAuth = require('../auth');

var apiKey = configAuth.mailchimpAuth.apiKey;

module.exports = function subscribe(email, listId) {
  return Q.fcall(function() {
    var prefix = apiKey.split('-')[1];

    console.log({
      uri: `https://anystring:${apiKey}@${prefix}.api.mailchimp.com/3.0/lists/${listId}/members/`,
      method: 'POST',
      json: true,
      body: {
        'email_address': email,
        'status': 'subscribed',
      }
    });
    return Q.nfcall(request, {
      uri: `https://anystring:${apiKey}@${prefix}.api.mailchimp.com/3.0/lists/${listId}/members/`,
      method: 'POST',
      json: true,
      body: {
        'email_address': email,
        'status': 'subscribed',
      }
    });
  });
};
