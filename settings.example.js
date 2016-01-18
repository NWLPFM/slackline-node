var settings = {};

// Slack API tokens and incoming webhooks. Domain should just be the subdomain part (eg domain1.slack.com)
settings.domains = {
  'domain1': {key: 'key', webhook: 'http://hooks.slack.com/...'},
  'domain2': {key: 'key', webhook: 'http://hooks.slack.com/...'}
};


// Map non-standard channel names. In this case, domain2.slack.com has a channel named #channel_name and it should receive messages sent to what everyone else is calling #channelname
settings.channel_map = {
  'channelname': {
    'domain2': 'channel_name'
  }
};

module.exports = settings;
