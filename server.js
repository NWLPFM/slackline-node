// server.js

// Node.js implementation of slackline – https://github.com/ernesto-jimenez/slackline


// BASE SETUP
// ========================================================================================

// required modules
var settings  = require ('./settings');
var express   = require('express');
var bodyParser  = require('body-parser');
var http    = require('http');
var https   = require('https');
var querystring = require('querystring');
var request   = require('request');
var crypto    = require('crypto');
var url       = require('url');

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
  var source_domain = req.body.team_domain;
  var text = req.body.text;
  var target = req.query.target;
  console.log("query", req.query);
  console.log("body", req.body);

  // to avoid infinite loops, don't post messages generated by slackbot
  if (username == "slackbot") {
    console.log("don't reflect this message; it's from the other channel!");
    res.end('Message forwarded!');
    return;
  } else {
    getHash(userid, source_domain, target, function(err, email_hash) {
      console.log("Got hash of user", userid, 'from', source_domain, 'hash is', email_hash);
      fixMentions(text, target, function(err, cleanText) {
        console.log("Fixed mentions on", text, "to", cleanText);
        sendPost(email_hash, username, cleanText, target);
      });
    });

    // TO DO: only fire success message when sendPost actually finishes (via a callback)
    res.end('Message forwarded!');
  }
});

app.use(router);


// START THE SERVER
// ========================================================================================

app.listen(port);
console.log('slackline is running on port ' + port);


// FUNCTIONS
// ========================================================================================


var mentionMap = {};

// takes a raw Slack message as an input, returns a cleaned string with any @ mentions converted to the relevant usernames
function fixMentions(text, target, next){
  var strText = text;
  var userPattern = /<@([^>]+)>/igm;
  var userArray = strText.match(userPattern);

  if (userArray) {
    var counter = 0;

    userArray.forEach(function(strUseridRaw){
      if (mentionMap[strUseridRaw]) {
        strText = strText.replace(strUseridRaw, '@' + mentionMap[strUseridRaw]);
        counter += 1;
        if (counter == (userArray.length)) {
          next(null, strText);
        }
      } else {
        var strUserid = strUseridRaw.substring(2, strUseridRaw.length -1);

        // get the sender's domain from settings.js
        var referrer = settings.domainReferrer[target];

        // use the sender's domain and userid to grab their user info from the Slack API
        var url = 'https://slack.com/api/users.info?token=' + settings.tokens[referrer_domain] + '&user=' + strUserid;

        https.get(url, function(res) {
          var body = '';

          res.on('data', function(chunk) {
            body += chunk;
          });

          res.on('end', function() {
            var userResponse = JSON.parse(body);
            var username = userResponse.user.name;
            mentionMap[strUseridRaw] = username;
            strText = strText.replace(strUseridRaw, '@' + username);
            counter += 1;
            if (counter == (userArray.length)) {
              next(null, strText);
            }
          });
        }).on('error', function(e) {
          console.log('Got error: ' + e);
        });
      }
    });
  } else {
    next(null, text);
  }
}


// cache of hashed email addresses, used for Gravatar URLs
var emailMap = {};

// calculate a hash of a user's email address based on userid. if that userid already exists in the cache, use the cached value.
// pass hash to the callback
function getHash(userid, source_domain, target, next) {

  var target_domain = url.parse(target).host;

  if (emailMap[userid]) {
    var email_hash = emailMap[userid];
    next(null, email_hash);
  } else {
    // use the sender's domain and userid to grab their user info from the Slack API
    var apiurl = 'https://slack.com/api/users.info?token=' + settings.tokens[source_domain] + '&user=' + userid;

    https.get(apiurl, function(res) {
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
  }
}


// Send the forwarded message as a POST to the target Slack instance
function sendPost(email_hash, username, text, target) {
  var options = {
    uri: target,
    method: 'POST',
    json: true,
    body: {
      'username' : username,
      'text' : text,
      'icon_url' : 'http://www.gravatar.com/avatar/' + email_hash
    }
  };

  request(options, function(error, response, body) {
    if(!error && response.statusCode == 200) {
      console.log('Success!');
    } else {
      console.log(error, response, body);
    }
  });
}
