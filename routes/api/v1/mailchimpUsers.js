var configAuth = require('../../../auth');
var listID = '2867adef0d';
var mailchimpAPI = require('mailchimp-api');
var apiKey = configAuth.mailchimpAuth.apiKey;


module.exports.autoroute = {
	get: {
    'mailchimpUser/subscribe' : subscribeUser
  }
};


function subscribeUser(req, res) {


}
