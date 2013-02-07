(function($) {

    ChannelController = function(irc, name, options) {
        this.options = $.extend({
        }, options);

        // Keep a handle on the IRC API
        this.irc = irc;

        // Keep a handle on a controller for various
        // desktop notifications we'll send out
        this.desktopController = new DesktopController();

        this.name = name;
        this.prettyName = (name && name[0] === '#') ? name.slice(1) : name;
        this.host = 'unknown';
        this.mode = 'unknown';

        // Populate the channl DOM
        this.rootNode =
            $('#tmplChannel')
            .tmpl({ channel: this })
            .appendTo('#channels');

        // While we wait for CSS flexboxes, we'll put a
        // listener on resize so we can tell when we have
        // to change the dimensions of the chat window
        this.rootNode
            .find('.consumeAvailableHeight').consumeAvailableHeight();

        // Hook up a listener to the input box and give
        // it initial focus
        this.rootNode.find('.input')
            .keypress(_.bind(this._onKeyPressInput, this));

        // Listen for changes to the channel topic
        this.rootNode.find('.topic')
            .keypress(_.bind(this._onKeyPressTopic, this));

        // Append this channel to the list of
        // available channels
        this.label =
            $('#tmplChannelListItem')
            .tmpl({ channel: this })
            .appendTo('#channelList');

        // Listen for clicks anywhere on this pane
        var self = this;
        this.rootNode.children().not('header').click(function(event) {
            self.touch();
        });
    };

    /**
     * Named events triggered by this controller
     */
    ChannelController.Events = {
        PART:      'ChannelController.PART',
        MSG:       'ChannelController.MSG',
        PRIVMSG:   'ChannelController.PRIVMSG'
    };


    ChannelController.prototype = {

        /**
         * Add a new message
         */
        addMessage: function(from, message) {
            var chatNode = this.rootNode.find('.chat');

            // Determine if we're scrolled all the way
            // down
            var wasAtBottom =
                this.isScrolledToBottom();

            // Build a date that can be read by $.timeago
            var date = new Date();
            var timeString = date.toDateString()
                + ' ' + date.getHours()
                + ':' + date.getMinutes()
                + ':' + date.getSeconds();

            // Note if the same author is writing another
            // message (so we don't have to show their
            // nick)
            var isFollowup =
                from === chatNode.find('.privmsg').last().find('.nick').attr('data-nick');

            // Add the message to the DOM and let the world
            // know that we have a new message
            var privMsg =
                $('#tmplPrivMsg')
                    .tmpl({ from: from,
                            message: message,
                            time: timeString})
                    .appendTo(chatNode)
                    .trigger($.Event(ChannelController.Events.PRIVMSG,
                                    { from: from, message: message }));

            // Prune old messages once in awhile
            this.maybePruneBuffer();

            // Get rid of the nick if they posted last
            if(isFollowup) {
                privMsg.addClass('followup');
            }

            // Set and watch the 'n minuges ago' display
            privMsg.find('.timeago').timeago();

            // Scroll to the new message
            if(wasAtBottom) {
                this.scrollToBottom();
            }
        },

        /**
         * Prune old messages once in a while
         *
         * @return void
         */
        maybePruneBuffer: function() {
            // Prune every 100 messages or so
            if(Math.random() > 0.01) {
                return;
            }
            var chatNode = this.rootNode.find('.chat');
            var messageCount = chatNode.find('.privmsg').length;
            var mark = messageCount - 1000;
            if(mark > 0) {
                console.log("Pruning Buffer " + this.name);
                chatNode.children().filter(':lt('+mark+')').remove();
            }
        },

        /**
         * @return Boolean
         * true if the user is scrolled to the bottom of the channel
         */
        isScrolledToBottom: function() {
            var chatNode = this.rootNode.find('.chat');
            return ((chatNode.scrollTop() + chatNode.outerHeight()) >= chatNode[0].scrollHeight);
        },

        /**
         * Scroll the chat window to the bottom of the buffer
         *
         * @param int animationTimeMs
         * The number of ms to spend animating
         *
         * @return void
         */
        scrollToBottom: function(animationTimeMs) {
            if('undefined' === typeof animationTimeMs) {
                animationTimeMs = 1000;
            }
            var chatNode = this.rootNode.find('.chat');
            chatNode.animate({ scrollTop: chatNode[0].scrollHeight }, animationTimeMs, 'swing');
        },

        /**
         * Send a message to the channel
         *
         * @param String message
         * A message to send to the channel
         *
         * @return void
         */
        sendMessage: function(message) {
          this.irc.privMsg(this.name, message);
        },

        /**
         * Add to the list of members in this channel
         *
         * @param Array<String> namesList
         * A list of names (nicks, members) in this channel
         *
         * @return void
         */
        addToNamesList: function(namesList) {
          // Get the people list DOM node
          var peopleList =
              this.rootNode.find('.peopleList ul');

          // Update the list of members
          $.each(namesList, function(i, name) {
              $('#tmplNickListItem').tmpl({ nick: name })
                  .appendTo(peopleList);
          });

          // Get the current list of the names list
          var memberCount = peopleList.children().length - 1;

          // Set the number of members in the channel
          this.rootNode.find('.memberCount')
              .empty()
              .html(memberCount + ' people');

        },

        /**
         * @param String topic
         * Set the channel topic
         */
        setTopic: function(topic) {
            var topicNode = this.rootNode.find('.topic');
            if(!topic) {
                topicNode.addClass('hidden');
                return;
            }
            topicNode.removeClass('hidden');
            topicNode.text(topic);
        },

        /**
         * Send a topic change to the server
         *
         * @param String topic
         *
         * @return void
         */
        sendTopic: function(topic) {
            return this.irc.setTopic(this.name, topic);
        },

        /**
         * Make this the active chat window
         *
         * @return void
         */
        show: function() {
            this.rootNode.show();
            this.label.addClass('active');
            this.touch();

            // Scrolling was wonky while the height was 0
            this.scrollToBottom(0);

            // Force a resize to account for the new geometry of the
            // topic
            this.rootNode.find('.chat')
                .trigger(ConsumeAvailableHeight.Events.SHOULD_RESIZE);

            document.title = this.name;
        },

        /**
         * Clear any notifications and focus the input
         * box.
         *
         * @return void
         */
        touch: function() {
            this.rootNode.find('.input').focus();
            this.unsetHighlight();
        },

        /**
         * We are no longer an active channel
         *
         * @return void
         */
        hide: function() {
            this.rootNode.hide();
            $('#channelList li[data-channel='+this.name+']')
                .removeClass('active');
        },

        /**
         * Close out this window. We presume a part took
         * place elsewhere
         *
         * @return void
         */
        close: function() {
          this.rootNode.remove();
          $('#channelList li[data-channel='+this.name+']')
              .remove();

        },

        /**
         * Part this channel and let the world know we're leaving.
         * We wait for an external trigger to actually close the
         * window.
         *
         * @param String channel
         * The name of the channel to part. It doesn't necessarily
         * have to be this channel
         *
         * @return void
         */
        part: function(channel) {
          console.log('> called');
          this.irc.part(channel);
          $(this).trigger($.Event(ChannelController.Events.PART,
                                  { channel: channel }));
        },

        /**
         * Send a private message to someone
         *
         * @param String nick
         * The nick to message
         *
         * @param String message
         * The message to send them
         */
        msg: function(to, message) {
          this.irc.privMsg(to, message);
          $(this).trigger($.Event(ChannelController.Events.MSG,
                                  { to: to,
                                    message: message }));
        },

        /**
         * Remove the highlight state of this channel
         *
         * @return void
         */
        unsetHighlight: function() {
            if(this.rootNode.hasClass('highlight')) {
                this.desktopController.badgeDecrement();
            }
            this.rootNode.removeClass('highlight');
            this.label.removeClass('highlight');
        },

        /**
         * Set the highlight state of this channel
         */
        highlight: function() {
            if(!this.rootNode.hasClass('highlight')) {
                this.desktopController.badgeIncrement();
            }
            this.rootNode.addClass('highlight');
            this.label.addClass('highlight');
        },

        /****************************************************
         * Private Methods
         ****************************************************/

        /**
         *
         */
        _routeUserInput: function(message) {
            var matches = message.match(/^\/([a-zA-Z0-9]+)( (.*))?$/);
            if(!matches) {
                this.addMessage(this.irc.nick, message);
                this.sendMessage(message);
            }
            else {
                var command = matches[1];
                var parameters = matches[3];
                switch(command) {
                    case 'join':
                        return this.irc.join(parameters);
                    case 'part':
                        return this.part(parameters ? parameters : this.name);
                    case 'msg':
                        if(!parameters) {
                            break;
                        }
                        var to = parameters.split(/\s+/, 1)[0];
                        var message = parameters.replace(/^[^ ]+\s+/,'');
                        this.msg(to, message);
                        break;
                    case 'topic':
                        return this.sendTopic(parameters);
                    default:
                        console.log("Unknown Command:", message);
                }
            }
        },

        /**
         *
         */
        _onKeyPressInput: function(event) {
          var character = event.charCode;
          var input = $(event.target);

          if((13 === character)
             && !event.shiftKey) {
              event.preventDefault();
              event.stopPropagation();
              var message = _.rtrim(input.text());
              if(!message) {
                  return;
              }
              this._routeUserInput(message);
              input.html('&nbsp');
              input.blur();
              input.focus();
          }
        },

        /**
         *
         */
        _onKeyPressTopic: function(event) {
            var character = event.charCode;
            var input = $(event.target);

            if(13 === character && !event.shiftKey) {
                event.preventDefault();
                var topic = $(event.target).text();
                console.log('topic is ' + topic);
                this.sendTopic(topic);
                $(event.target).blur();
                $(event.target).parents('.channel').find('.input').focus();
            }
        }
    };
})(jQuery);
