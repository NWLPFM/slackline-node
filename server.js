// server.js

// Node.js implementation of slackline – https://github.com/ernesto-jimenez/slackline


// BASE SETUP
// ========================================================================================

// required modules
var settings 	= require ('./settings');
var express 	= require('express');
var bodyParser 	= require('body-parser');
var http		= require('http');
var https		= require('https');
var querystring = require('querystring');
var request		= require('request');
var crypto		= require('crypto');

// create an instance of express
var app = express();

// configure the app to use bodyParser()
// this will allow us to interpret the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var port = process.env.PORT || 8080;


// ROUTES
// ========================================================================================

var router = express.Router();

// test route to make sure everything is working
router.get('/', function(req, res) {
	res.json({ message: 'hooray! welcome to slackline!' });
});

router.all('/bridge', function(req, res) {
	var username = req.body.user_name;
	var userid = req.body.user_id;
	var text = req.body.text;
	var target_domain = req.query.domain;
	var target_hook_token = req.query.token;

	// to avoid infinite loops, don't post messages generated by slackbot
	if (username == "slackbot") {
		console.log("don't reflect this message; it's from the other channel!")
		return
	} else {
		getHash(userid, target_domain, function(err, email_hash){
			var cleanText = fixMentions(text, target_domain);
			sendPost(email_hash, username, cleanText, target_domain, target_hook_token);
		});
		console.log(text);
		
		// TO DO: only fire success message when sendPost actually finishes (via a callback)
		res.end('Message forwarded!');
	};
});

app.use(router);


// START THE SERVER
// ========================================================================================

app.listen(port);
console.log('slackline is running on port ' + port);


// FUNCTIONS
// ========================================================================================


var mentionMap = {
	'<@U02SL0VER>': 'max',
	'<@U02S1JF1T>': 'brian'
}

// takes a raw Slack message as an input, returns a cleaned string with any @ mentions converted to the relevant usernames
function fixMentions(text, target_domain){
	var strText = text;
	var userPattern = new RegExp(/<@([^>]+)>/igm);
	var userArray = strText.match(userPattern);

	for (i = 0; i < userArray.length + 1; i++) {
		if (mentionMap[userArray[i]]) {
			var strUserid = userArray[i];
			strText = strText.replace(strUserid, '<https://' + target_domain + '/team/' + mentionMap[strUserid] + '|@' + mentionMap[strUserid] + '>');
		};
	};
	return strText;
}


// cache of hashed email addresses, used for Gravatar URLs
var emailMap = {};

// calculate a hash of a user's email address based on userid. if that userid already exists in the cache, use the cached value.
// pass hash to the callback
function getHash(userid, target_domain, next) {

	if (emailMap[userid]) {
		var email_hash = emailMap[userid];
		next(null, email_hash);
	} else {
		// get the sender's domain from settings.js
		var referrer_domain = settings.domainReferrer[target_domain];

		// use the sender's domain and userid to grab their user info from the Slack API
		var url = 'https://slack.com/api/users.info?token=' + settings.tokens[referrer_domain] + '&user=' + userid;
		//console.log(url);

		https.get(url, function(res) {
			var body = '';

			res.on('data', function(chunk) {
				body += chunk;
			});

			res.on('end', function() {
				var userResponse = JSON.parse(body);
				var email_hash = crypto.createHash('md5').update(userResponse.user.profile.email).digest('hex');
				emailMap[userid] = email_hash;
				next(null, email_hash);
			});
		}).on('error', function(e) {
			console.log('Got error: ' + e);
		});
	};
};


// Send the forwarded message as a POST to the target Slack instance
function sendPost(email_hash, username, text, target_domain, target_hook_token) {
	var options = {
		uri: 'https://' + target_domain + settings.postUrl + target_hook_token,
		method: 'POST',
		json: {
			'username' : username,
			'text' : text,
			'icon_url' : 'http://www.gravatar.com/avatar/' + email_hash
		}
	};

	request(options, function(error, response, body) {
		if(!error && response.statusCode == 200) {
			console.log('Success!');
		} else {
			console.log(response);
		}
	});
};
