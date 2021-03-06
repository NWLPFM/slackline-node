slackline-node
==============

A Node.js implementation of [Slackline](https://github.com/ernesto-jimenez/slackline).

Slackline is a web hook bridge that allows you to mirror channels across Slack teams.

# Standard setup

## Install
Get the code, run `npm install`:
```
$ git clone https://github.com/NWLPFM/slackline-node
$ cd slackline-node
$ npm install
```

## Configure Slack
For each slack you wish to bridge, you will need to do the following:
* Create an incoming webhook. You can do so [here](https://www.slack.com/services/new/incoming-webhook), although be wary as this link acts unpredictably if you are signed into multiple Slacks. Double check the subdomain before creating it. It will ask you to select a channel, then give you a URL. Note that only one webhook is required per Slack, even if multiple channels are bridged (the selected channel is ignored). Make note of the URL used, as we will need it in a second.

* Create an outgoing webhook. You can do so [here](https://www.slack.com/services/new/outgoing-webhook), although once again, this link acts unpredictably when signed into multiple Slacks, so double check the subdomain. The outgoing webhook will ask for either a URL, give it whatever machine you will be hosting this at, with a path of `/bridge`. For example, if you were hosting this at `slackline.example.com`, on port 8080 (default unless otherwise specified) you would set the outgoing webhook's URL to `http://slackline.example.com:8080/bridge`. Make note of the token it generates, as you will need that. If you have multiple channels bridged, you will need to repeat this for each channel.

* Create or retrieve your Slack Web API token. Until we figure out Slack's crazy new API stuff, we're just using personal tokens. You can pick yours up at [the bottom of this page](https://api.slack.com/web).

## Configure Slackline
Next, copy `settings.example.json` to `settings.json` and fill it out. You will need a couple of things:

* `settings.domains` is a dict. Each item's key is the slack domain (eg for `awesomeorg.slack.com` you would put `awesomeorg`). The value is another dict with two keys:
 * `key` should be a Slack web API key for that domain.
 * `webhook` is the incoming webhook URL for that domain's Slack.
 * `tokens`, used to verify that the request came from an Slack. This was provided when you created the outgoing web hook. It should be a dict in `channel: token` format.

**TODO**: Describe how `settings.channel_map` works

## Run slackline
It is recommended that you configure slackline as a system service. A sample systemd service file is provided, although you may need to adapt it to your needs or write something entirely different if you do not use systemd. When it is running, it will serve up a message about successful configuration on `/`.

For security reasons, it is recommended that you place a front-end proxy, such as nginx, in front of slackline-node and have it do SSL termination.


# Extra Goodies

## Non-uniform channel names
In general, we assume the bridged channels are all named the identically across Slacks. However, sometimes that's not the case. For this, we have `channel_map`. If you have a channel, lets say it's called `#awesomechannel` on most of the Slacks that it's bridged with, but one Slack, say `radteam.slack.com` really wants to call it `#radchannel`, update `settings.json` like such:

```json
{
  "domains": {
    "usual_stuff": "see_above_for_proper_domain_configuration"
  },
  "channel_map": {
    "awesomechannel": {
      "radteam": "radchannel"
    }
  }
}
```

and update the outgoing webhook for that team's channel to include `channel=awesomechannel` in the query string, so it might look like `https://slackline.example.org/bridge?channel=awesomechannel`. That's it! When setting outgoing webhook tokens, use the team-specific channel name, as that is checked before the channel mapping is.


## Reloading config
The `/reload` endpoint will re-read the `settings.json` file. If reading or parsing of the file fails, the original settings will be kept in place and the details of the failure will be returned to the requester.

```
$ curl https://slackline.example.org/reload
{"success":true}
```
