var settings = {};

// Slack API tokens and incoming webhooks. Domain should just be the subdomain part (eg domain1.slack.com)
settings.domains = {
  domain1: {key: 'asdfasdf', webhook: 'http://hooks.slack.com/...', token: {channel1: 'zdjfas', channel2: 'iasdfaasdf'}},
  domain2: {key: 'asdfas43', webhook: 'http://hooks.slack.com/...', token: {channel1: 'asdfasd', channel2: 'ijasdif'}}
};

module.exports = settings;
