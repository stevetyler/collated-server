'use strict';
const request = require('request');
const Q = require('q');
const configAuth = require('../auth');

const apiKey = configAuth.mailchimpAuth.apiKey;

module.exports = function subscribe(email, listId, fname, lname) {
  return Q.fcall(function() {
    const prefix = apiKey.split('-')[1];

    console.log({
      uri: `https://anystring:${apiKey}@${prefix}.api.mailchimp.com/3.0/lists/${listId}/members/`,
      method: 'POST',
      json: true,
      body: {
        'email_address': email,
        'status': 'subscribed',
        'merge_fields': {
          'FNAME': fname,
          'LNAME': lname
        }
      }
    });
    return Q.nfcall(request, {
      uri: `https://anystring:${apiKey}@${prefix}.api.mailchimp.com/3.0/lists/${listId}/members/`,
      method: 'POST',
      json: true,
      body: {
        'email_address': email,
        'status': 'subscribed',
        'merge_fields': {
          'FNAME': fname,
          'LNAME': lname
        }
      }
    });
  });
};
