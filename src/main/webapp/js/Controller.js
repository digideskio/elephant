jQuery(function($) {

    Controller = (function() {

        // Open the IRC API
        var irc = new IRC({ nick: 'asmbot' });

        // Set up a controller for interfacing with the
        // desktop for notifications, badges, etc.
        var desktopController = new DesktopController();

        // The set of channels we're connect(ed,ing) to
        var channelSet = {};

        /**
         * Executed when a channel is to be joined
         *
         * @param String channel
         * The name of the channel (or nick) to join
         *
         * @param optional Boolean shouldOpenBackground
         * Set to true to open a new window without
         * activating it
         *
         * @return void
         */
        function onJoin(channel, shouldOpenBackground) {
            // Check to make sure we haven't already joined
            if('undefined' !== typeof channelSet[channel]) {
                return;
            }

            // Create a new controller for the channel
            channelSet[channel] =
              new ChannelController(irc, channel, {});

            // Listen for a part from the channel and delete
            // the controller
            $(channelSet[channel]).bind(ChannelController.Events.PART,
                                        function(event) {
                if(channelSet[channel]) {
                    channelSet[channel].close();
                    // Show a random channel
                    for(var chan in channelSet) {
                        channelSet[chan].show();
                        break;
                    }
                }
                delete channelSet[channel];
            });

            // Listen for messages being sent out and make
            // sure we have a window open for them
            $(channelSet[channel]).bind(ChannelController.Events.MSG,
                                        function(event) {
                console.log(event);
                if(!channelSet[event.to]) {
                    onJoin(event.to);
                }
                onPrivMsg(event.to, this.irc.nick, event.message);
            });

            // Bring this channel to the front unless inhibited
            if('undefined' === typeof shouldOpenBackground ||
               shouldOpenBackground) {
                setActiveChannel(channel);
            }
            // Otherwise, highlight it so it gets noticed
            else {
                channelSet[channel].hide();
                channelSet[channel].highlight();
            }

            // Notify anyone plugins who care
            execPluginHandlers('onJoin', [ channel ]);
        }

        /**
         * React to NameLists coming from the server
         *
         * @param String nick
         * Our nick.
         *
         * @param String channel
         * The channel the name list is for
         *
         * @param Array<String> namesList
         * A (possibly partial) list of names
         */
        function onNamesList(nick, channel, namesList) {
            channelSet[channel].addToNamesList(namesList);
            execPluginHandlers('onNamesList', [ nick, channel, namesList ]);
        }

        /**
         * React to an incoming private message
         *
         * @param String channel
         * The name of the channel the message is on
         *
         * @param String from
         * The nick of the member the message is from
         *
         * @param String message
         * The message
         *
         * @return void
         */
        function onPrivMsg(channel, from, message) {
            // Messages from users have us as the channel
            // name, so we swap it in
            if(!channelSet[channel]) {
                if(!channelSet[from]) {
                    // Join it, but don't let it steal focus
                    desktopController.notify('Message from ' + from,
                                             message);
                    onJoin(from, false);
                }
                channel = from;
            }

            // Add the message to the channel
            channelSet[channel].addMessage(from, message)

            // Notify any plugins of the new message
            execPluginHandlers('onPrivMsg', [ channel, from, message ]);
        }

        /**
         * React to an incoming topic for the channel
         *
         * @param String channel
         * The name of the channel the topic is for
         *
         * @param String topic
         * The topic string
         *
         * @return void
         */
        function onTopic(channel, topic) {
            channelSet[channel].setTopic(topic)
            execPluginHandlers('onTopic', [ channel, topic ]);
        }

        /**
         * Set the active channel (bringing it into focus)
         *
         * @param String channel
         * The channel to focus
         *
         * @return void
         */
        function setActiveChannel(channel) {
            for(var deadChannel in channelSet) {
                channelSet[deadChannel].hide();
            }
            channelSet[channel].show();
            channelSet[channel].unsetHighlight();
        }

        /**
         *
         */
        function onClickChannelListItem(event) {
            var channel = $(event.target).attr('data-channel');
            setActiveChannel(channel);
        }

        /**
         * Execute any handlers defined for the given event
         */
        function execPluginHandlers(handler, parameters) {
            plugins = plugins || {};
            for(var plugin in plugins) {
                if('undefined' !== typeof plugins[plugin][handler]) {
                    plugins[plugin][handler].apply(this, parameters);
                }
            }
        }

        return {
            init: function() {

              irc.onJoin = onJoin;
              irc.onNamesList = onNamesList;
              irc.onPrivMsg = onPrivMsg;
              irc.onTopic = onTopic;


              $('#channelList li').live('click',
                                        onClickChannelListItem);

              // Initialize all plugins
              plugins = plugins ? plugins : {};
              for(var plugin in plugins) {
                  plugins[plugin].init.call(this);
              }

              // Set any properties we've previously stored
              $('#config .property').each(function(i, element) {
                  var key = $(element).attr('id');
                  var val = localStorage.getItem(key);
                  if(val) {
                      $(element).val(val);
                  }
              });

              // Save new properties as they're written
              $('#config .property').change(function(event) {
                  var key = $(event.target).attr('id');
                  var val = $(event.target).val();
                  localStorage.setItem(key, val);
              });

              // Connect when the button is hit
              $('#config #connect').click(function(event) {
                  var options = {
                      irc: {
                          host: localStorage.getItem('host'),
                          port: localStorage.getItem('port'),
                          password: localStorage.getItem('password'),
                          nick: _.trim(localStorage.getItem('nicks').split(',',1)),
                          altNicks: _.map(localStorage.getItem('nicks').split(',').slice(1),function(e) { return _.trim(e); }),
                          name: localStorage.getItem('name'),
                          autoJoin: _.map(localStorage.getItem('autojoin').split(','),function(e) { return _.trim(e); }),
                       }
                  };
                  $('#config').hide();
                  irc.connect(options);
              });
            }
        };
    })(jQuery);

    Controller.init();
});


