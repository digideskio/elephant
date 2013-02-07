(function($) {

  /**
   * An IRC client that speaks to a server via a WebSocket proxy
   *
   *   var irc = new IRC({ nick: 'asm' });
   *   irc.onConnect(function(event) { console.debug('connected'); });
   *   irc.connect();
   *
   */
  IRC = function(options) {
    this.options = $.extend({
        irc: {
               host:     'irc.collapse.io',
               port:     6667,
               password: null,
               nick:     'elephant',
               altNicks: ['_elephant_', 'elephant01', 'elephant02'],
               name:     'Carl Sagan',
               autoJoin: ['#elephant']
             },
        proxyURI: 'ws://collapse.io:8080/proxy'
        // proxyURI: 'ws://localhost:8080/proxy'
    }, options);

    // The socket through which we communicate with the
    // IRC server
    this.websocket = null;

    // Client defined listeners for network events
    this.networkListeners = {
      onConnect: [],
      onNetworkDisconnect: [],
      onNetworkError: []
    };

    // The pointer to the current nick to try if
    // the nick is unavailable
    this.nickPointer = 0;

    /**
     * Whatever, I'm into this kind of thing lately
     */
    var self = this;
    function _bindPropertyFunction(name, callbackSet, callbackGet) {
      Object.defineProperty(self,
        name, { get: callbackGet ? callbackGet : function() { return null; },
                set: callbackSet,
                configurable: true,
                enumerable: false });
    };

    _bindPropertyFunction('nick', this.setNick, this.getNick);
    _bindPropertyFunction('user', this.setUser, this.getUser);
    _bindPropertyFunction('onConnect', this.onConnect);
    _bindPropertyFunction('onNetworkDisconnect', this.onNetworkDisconnect);
    _bindPropertyFunction('onNetworkError', this.onNetworkError);
    _bindPropertyFunction('onNick', this.onNick);
    _bindPropertyFunction('onError', this.onError);
    _bindPropertyFunction('onNickUnavailable', this.onNickUnavailable);
    _bindPropertyFunction('onWelcome', this.onWelcome);
    _bindPropertyFunction('onNotice', this.onNotice);
    _bindPropertyFunction('onJoin', this.onJoin);
    _bindPropertyFunction('onPart', this.onPart);
    _bindPropertyFunction('onTopic', this.onTopic);
    _bindPropertyFunction('onPing', this.onPing);
    _bindPropertyFunction('onMode', this.onMode);
    _bindPropertyFunction('onNamesList', this.onNamesList);
    _bindPropertyFunction('onPrivMsg', this.onPrivMsg);
    _bindPropertyFunction('onQuit', this.onQuit);

    /**
    * An enumeration of IRC commands that we're aware of
    */
    this.commands = {
      NICK:               { name: 'NICK',
                            handler: this._onNick,
                            listeners: [] },

      PASS:               { name: 'PASS',
                            handler: null,
                            listeners: [] },

      ERROR:              { name: 'ERROR',
                            handler: this._onError,
                            listeners: [] },

      USER:               { name: 'USER',
                            handler: null },

      NICK_UNAVAILABLE:   { name: '433',
                            handler: this._onNickUnavailable,
                            listeners: [] },

      WELCOME:            { name: '001',
                            handler: this._onWelcome,
                            listeners: [] },

      NOTICE:             { name: 'NOTICE',
                            aliases: ['001', '002', '003', '004', '005',
                                      '250', '251', '252', '253', '254',
                                      '255', '265', '266',
                                      '375', '372', '376', '366'],
                            handler: this._onNotice,
                            listeners: [] },

      JOIN:               { name: 'JOIN',
                            handler: this._onJoin,
                            listeners: [] },

      PART:               { name: 'PART',
                            handler: this._onPart,
                            listeners: [] },

      MSG:                { name: 'MSG',
                            handler: null,
                            listeners: [] },

      TOPIC:              { name: 'TOPIC',
                            handler: this._onTopic,
                            aliases: ['332'],
                            listeners: [] },

      PING:               { name: 'PING',
                            handler: this._onPing,
                            listeners: [] },

      PONG:               { name: 'PONG',
                            handler: null },

      MODE:               { name: 'MODE',
                            handler: this._onMode,
                            listeners: [] },

      NAMES_LIST:         { name: '353',
                            handler: this._onNamesList,
                            listeners: [] },

      PRIVMSG:            { name: 'PRIVMSG',
                            handler: this._onPrivMsg,
                            listeners: [] },

      QUIT:               { name: 'QUIT',
                            handler: this._onQuit,
                            listeners: [] },

      UNREGISTERED:       { name: '451',
                            handler: this._onUnregistered,
                            listeners: [] },

      ERRONEOUS_NICKNAME: { name: '432',
                            handler: this._onErroneousNickname,
                            listeners: [] }
    };

  };

  IRC.prototype = {

    /**
     * Connect to the IRC server. Call onConnect to set
     * a listener for when we successfully connect to the
     * server.
     *
     * @return void
     */
    connect: function(options) {
        $.extend(this.options, options);

        var proxyURL = this.options.proxyURI
            + '?host=' + this.options.irc.host
            + '&port=' + this.options.irc.port
            ;

        console.log(proxyURL);

        this.websocket = new WebSocket(proxyURL);
        this.websocket.onopen = _.bind(this._onWebSocketConnect, this);
        this.websocket.onclose = _.bind(this._onWebSocketClose, this);
        this.websocket.onerror = _.bind(this._onWebSocketError, this);
        this.websocket.onmessage = _.bind(this._onWebSocketMessage, this);
    },

    /**
     * Join a channel
     *
     * @param String channel
     * The name of a channel to join
     *
     * @return void
     */
    join: function(channel) {
      this._sendCommand(this.commands.JOIN.name, channel);
    },

    /**
     * Part a channel
     *
     * @param String channel
     * The name of a channel to part
     *
     * @return void
     */
    part: function(channel) {
        this._sendCommand(this.commands.PART.name, channel); },

    /**
     * Set the server password
     *
     * @param String password
     * The password
     *
     * @return void
     */
    setPass: function(pass) {
      this._sendCommand(this.commands.PASS.name, pass);
    },

    /**
     * Get your nick name
     *
     * @return String
     */
    getNick: function() {
      return this.options.irc.nick;
    },

    /**
     * Set your nick name
     *
     * @param optional String nick
     * Your nickname
     *
     * @return void
     */
    setNick: function(nick) {
      if('undefined' !== typeof nick) {
          this.options.irc.nick = nick;
      }
      this._sendCommand(this.commands.NICK.name,
                        this.options.irc.nick);
    },

    /**
     * Get the USER string
     *
     * @return String
     */
    getUser: function() {
      return this.nick + ' 0 * ' + this.options.irc.name;
    },

    /**
     * Set your USER name
     *
     * @param optional String name
     *
     * @return void
     */
    setUser: function(name) {
      if('undefined' !== typeof name) {
          this.options.irc.name = name;
      }
      this._sendCommand(this.commands.USER.name,
                        this.getUser());
    },

    /**
     * Set the channel topic
     *
     * @param String channel
     * The channel to set the topic for
     *
     * @param String topic
     * The topic to set
     *
     * @return void
     */
    setTopic: function(channel, topic) {
        this._sendCommand(this.commands.TOPIC.name,
                          channel + ' :' + topic);
    },

    /**
     * Send a private message
     *
     * @param String channel
     * The channel (or nick) to message
     *
     * @param String message
     * the message to send
     */
    privMsg: function(channel, message) {
      if('undefined' === typeof message) {
          message = '';
      }
      this._sendCommand(this.commands.PRIVMSG.name,
                        channel + ' :' +message);
    },

    /**
     * Message a user
     *
     * @param String nick
     * The nick of the person to message
     *
     * @param optional String message
     * An optional message to send to the member
     */
    msg: function(nick, message) {
       var parameters = nick;
       if('undefined' !== typeof message) {
           parameters += ' ' + message;
       }
       this._sendCommand(this.commands.MSG.name, parameters);
    },

    /**
     * Add a listener for when we connect to the IRC
     * server
     *
     * @param Callback listener
     *
     * @return void
     */
    onConnect: function(listener) {
      this.networkListeners.onConnect.push(listener);
    },

    /**
     * Add a listener for when we disconnect from the IRC
     * server
     *
     * @param Callback listener
     *
     * @return void
     */
    onNetworkDisconnect: function(listener) {
      this.networkListeners.onDisconnect.push(listener);
    },

    /**
     * Add a listener for network errors
     *
     * @param Callback listener
     *
     * @return void
     */
    onNetworkError: function(listener) {
      this.networkListeners.onError.push(listener);
    },

    /**
     * Add a listener for nick changes
     *
     * @param Callback listener
     *
     * @return void
     */
    onNick: function(listener) {
      this._pushListenerForCommand('NICK', listener); },

    /**
     * Add a listener for IRC errors
     *
     * @param Callback listener
     *
     * @return void
     */
    onError: function(listener) {
      this._pushListenerForCommand('ERROR', listener); },

    /**
     * Add a listener for when your chosen nick is unavailable
     *
     * @param Callback listener
     *
     * @return void
     */
    onNickUnavailable: function(listener) {
      this._pushListenerForCommand('NICK_UNAVAILABLE', listener); },

    /**
     * Add a listener for when negotiations with the server are complete
     *
     * @param Callback listener
     *
     * @return void
     */
    onWelcome: function(listener) {
      this._pushListenerForCommand('WELCOME', listener); },

    /**
     * Add a listener for server notices
     *
     * @param Callback listener
     *
     * @return void
     */
    onNotice: function(listener) {
      this._pushListenerForCommand('NOTICE', listener); },

    /**
     * Add a listener for when we've been added to a channel
     *
     * @param Callback listener
     *
     * @return void
     */
    onJoin: function(listener) {
      this._pushListenerForCommand('JOIN', listener); },

    /**
     * Add a listener for when someone parts the channel
     *
     * @param Callback listener
     *
     * @return void
     */
    onPart: function(listener) {
      this._pushListenerForCommand('PART', listener); },

    /**
     * Add a listener for topic changes
     *
     * @param Callback listener
     *
     * @return void
     */
    onTopic: function(listener) {
      this._pushListenerForCommand('TOPIC', listener); },

    /**
     * Add a listener for server PINGs
     *
     * @param Callback listener
     *
     * @return void
     */
    onPing: function(listener) {
      this._pushListenerForCommand('PING', listener); },

    /**
     * Add a listener for mode changes
     *
     * @param Callback listener
     *
     * @return void
     */
    onMode: function(listener) {
      this._pushListenerForCommand('MODE', listener); },

    /**
     * Add a listener for channel name lists
     *
     * @param Callback listener
     *
     * @return void
     */
    onNamesList: function(listener) {
      this._pushListenerForCommand('NAMES_LIST', listener); },

    /**
     * Add a listener for Private Messages
     *
     * @param Callback listener
     *
     * @return void
     */
    onPrivMsg: function(listener) {
      this._pushListenerForCommand('PRIVMSG', listener); },

    /**
     * Add a listener for when the server QUITs us
     *
     * @param Callback listener
     *
     * @return void
     */
    onQuit: function(listener) {
      this._pushListenerForCommand('QUIT', listener); },

    /**
     * Add a listener for when the server complains that
     * we aren't registered for our nick
     *
     * @param Callback listener
     *
     * @return void
     */
    onUnregistered: function(listener) {
      this._pushListenerForCommand('UNREGISTERED', listener); },

    /**
     * Add a listener for when the server complains our
     * nickname is erroneous
     *
     * @param Callback listener
     *
     * @return void
     */
    onErroneousNickname: function(listener) {
      this._pushListenerForCommand('ERRONEOUS_NICKNAME', listener); },


    /****************************************************
     * Private Methods
     ****************************************************/

    /**
     * Listener for error messages coming from the server
     *
     * @param String prefix
     * The command prefix (typicall a channel or host)
     *
     * @param String parameters
     * Optional command parameters
     *
     * @return void
     */
    _onError: function(prefix, parameters) {
      console.debug('Error: ' + prefix + ' ' + parameters);
      this._callListenersForCommand('ERROR', [parameters]);
    },

    /**
     * Listener for Notices
     *
     * @param String prefix
     * The command prefix (typicall a channel or host)
     *
     * @param String parameters
     * Optional command parameters
     *
     * @return void
     */
    _onNotice: function(prefix, parameters) {
      this._callListenersForCommand('NOTICE', [parameters]);
    },

    /**
     * Listener for channel joins
     *
     * @param String prefix
     * The command prefix (typicall a channel or host)
     *
     * @param String parameters
     * Optional command parameters
     *
     * @return void
     */
    _onJoin: function(prefix, parameters) {
      var matches = parameters.match(/^:?(.*)$/);
      var channel = matches[1];
      this._callListenersForCommand('JOIN', [channel]);
    },

    /**
     * Listener for channel parts
     *
     * @param String prefix
     * The command prefix (typicall a channel or host)
     *
     * @param String parameters
     * Optional command parameters
     *
     * @return void
     */
    _onPart: function(prefix, parameters) {
      var channel = parameters;
      this._callListenersForCommand('PART', [channel]);
    },

    /**
     * Listener for topic changes
     *
     * @param String prefix
     * The command prefix (typicall a channel or host)
     *
     * @param String parameters
     * Optional command parameters
     *
     * @return void
     */
    _onTopic: function(prefix, parameters) {
      var nick, channel, topic;
      var matches = parameters.match(/^([^ ]+) :(.*)$/);
      if(matches) {
          channel = matches[1];
          topic = matches[2];
      }
      else {
          matches = parameters.match(/^([^ ]+) ([^ ]+) :(.*)$/);
          nick = matches[1];
          channel = matches[2];
          topic = matches[3];
      }
      this._callListenersForCommand('TOPIC', [channel, topic]);
    },

    /**
     * Listener for pings
     *
     * @param String prefix
     * The command prefix (typicall a channel or host)
     *
     * @param String parameters
     * Optional command parameters
     *
     * @return void
     */
    _onPing: function(prefix, parameters) {
      // var matches = parameters.match(//);
      this._sendCommand(this.commands.PONG.name, parameters);
      this._callListenersForCommand('PING', [parameters]);
    },

    /**
     * Listener for mode changes
     *
     * @param String prefix
     * The command prefix (typicall a channel or host)
     *
     * @param String parameters
     * Optional command parameters
     *
     * @return void
     */
    _onMode: function(prefix, parameters) {
      var matches = parameters.match(/^([^ ]+) :?(.*)$/);
      var nick = matches[1];
      var mode = matches[2];
      this._callListenersForCommand('MODE', [parameters]);
    },

    /**
     * Listener for channel join name lists
     *
     * @param String prefix
     * The command prefix (typicall a channel or host)
     *
     * @param String parameters
     * Optional command parameters
     *
     * @return void
     */
    _onNamesList: function(prefix, parameters) {
      var matches =
          parameters.match(/^([^ ]+) (.) ([^ ]+) :(.*)$/);
      var nick = matches[1];
      var sign = matches[2];
      var channel = matches[3];
      var names = matches[4].split(' ');

      this._callListenersForCommand('NAMES_LIST',
                                    [nick, channel, names]);
    },

    /**
     * Listener for privmsg
     *
     * @param String prefix
     * The command prefix (typicall a channel or host)
     *
     * @param String parameters
     * Optional command parameters
     *
     * @return void
     */
    _onPrivMsg: function(prefix, parameters) {
      var matches =
          parameters.match(/^([^ ]+) :(.*)$/);
      var channel = matches[1];
      var message = matches[2];

      matches = prefix.match(/^:([^! ]+).*$/);
      var from = matches[1];

      this._callListenersForCommand('PRIVMSG', [channel, from, message]);
    },

    /**
     * Listener for when someone changes their nick
     *
     * @param String prefix
     * The command prefix (typicall a channel or host)
     *
     * @param String parameters
     * Optional command parameters
     *
     * @return void
     */
    _onNick: function(prefix, parameters) {
      this._callListenersForCommand('NICK', [parameters]);
    },

    /**
     * Listener for quit coming from the server
     *
     * @param String prefix
     * The command prefix (typicall a channel or host)
     *
     * @param String parameters
     * Optional command parameters
     *
     * @return void
     */
    _onQuit: function(prefix, parameters) {
      console.debug('Quit: ' + prefix + ' ' + parameters);
      this._callListenersForCommand('QUIT', [parameters]);
    },

    /**
     * Listener for when negotiations with the server have completed
     *
     * @param String prefix
     * The command prefix (typicall a channel or host)
     *
     * @param String parameters
     * Optional command parameters
     *
     * @return void
     */
    _onWelcome: function(prefix, parameters) {

      var self = this;
      $.each(this.options.irc.autoJoin, function(i, channel) {
          self.join(channel);
      });

      this._callListenersForCommand('WELCOME', [parameters]);
    },

    /**
     * Listener for when the nickname we requested is unavailable
     *
     * @param String prefix
     * The command prefix (typicall a channel or host)
     *
     * @param String parameters
     * Optional command parameters
     *
     * @return void
     */
    _onNickUnavailable: function(prefix, parameters) {

      // give up if we're out of nicks
      if(this.nickPointer >= this.options.irc.altNicks.length) {
          return;
      }

      // hunt for the next available nick
      this.setNick(this.options.irc.altNicks[this.nickPointer]);
      ++this.nickPointer;

      this._callListenersForCommand('NICK_UNAVAILABLE', [parameters]);
    },



    /**
     * Listener for being notified that we're not registered
     *
     * @param String prefix
     * The command prefix (typicall a channel or host)
     *
     * @param String parameters
     * Optional command parameters
     *
     * @return void
     */
    _onUnregistered: function(prefix, parameters) {
      this._callListenersForCommand('UNREGISTERED', [parameters]);
    },

    /**
     * Listener for being notified that the nickname is no good
     *
     * @param String prefix
     * The command prefix (typicall a channel or host)
     *
     * @param String parameters
     * Optional command parameters
     *
     * @return void
     */
    _onErroneousNickname: function(prefix, parameters) {
      this.commands.NICK_UNAVAILABLE.handler(prefix, parameters);
      this._callListenersForCommand('ERRONEOUS_NICKNAME', [parameters]);
    },

    /**
     * Listener for unknown commands
     *
     * @param String message
     * The text of the unknown message
     *
     * @return void
     */
    _onUnknownCommand: function(message) {
      console.debug('Unknown Command: ' + message);
    },

    /**
     * A listener for when we receive a command from the
     * IRC Server
     *
     * @param String prefix
     *
     * @param String command
     *
     * @param String params
     *
     * @return void
     */
    _onCommand: function(message, prefix, command, parameters) {
      var self = this;

      console.debug(message);

      // Hunt through the commands we know of
      for(var cmd in this.commands) {

          // Hunt to see if we can find a match on an alias of this command
          var aliasMatch = false;
          if(this.commands[cmd].aliases) {
              for(var i in this.commands[cmd].aliases) {
                  aliasMatch = (this.commands[cmd].aliases[i] === command);
                  if(aliasMatch) {
                      break;
                  }
              }
          }

          // If the name or an alias matches, call its handler if one is defined
          if(aliasMatch || command === this.commands[cmd].name) {
              if(!this.commands[cmd].handler) {
                  return this._onUnknownCommand(message);
              }
              try {
                  _.bind(this.commands[cmd].handler, self)(prefix, parameters);
              }
              catch(exception) {
                  console.error(exception);
                  console.error(exception.message);
                  console.error(exception.stack);
                  console.error(message);
              }
              finally {
                  return;
              }
          }
      }

      // If no command matched, log it
      this._onUnknownCommand(message);
    },

    /**
     * Send a command to the IRC Server
     *
     * @param String command
     * A command to execute such as IRC.Commands.NICK
     *
     * @param String parameters
     * A parameter string
     *
     * @return void
     */
    _sendCommand: function(command, parameters) {
      var message = command + " " + parameters + "\n";
      console.debug('>' + message);
      this.websocket.send(message);
    },

    /**
     * @param String command
     * The ID of the command to push a listener for
     *
     * @param Callback listener
     * The listener to push
     *
     * @return void
     */
    _pushListenerForCommand: function(command, listener) {
      this.commands[command].listeners.push(listener);
    },

    /**
     * Call all listeners for a given command
     *
     * @param String command
     * The ID of a command
     *
     * @param Array arguments
     * An array of arguments to be passed to the listener
     *
     * @return void
     */
    _callListenersForCommand: function(command, args) {
      var self = this;
      $.each(this.commands[command].listeners, function(i, listener) {
          listener.apply(self, args);
      });
    },

    /**
     * Listener for when the websocket connects to the IRC
     * server
     *
     * @return void
     */
    _onWebSocketConnect: function(event) {

      if(this.options.irc.password) {
          this.setPass(this.options.irc.password);
      }

      this.setNick();
      this.setUser();

      var connectEvent = {};
      $.each(this.networkListeners.onConnect, function(i,listener) {
        listener(connectEvent);
      });
    },

    /**
     * Listener for when we receive a message from the IRC
     * server
     *
     * @return void
     */
    _onWebSocketMessage: function(event) {

      // :kornbluth.freenode.net 433 * asm :Nickname is already in use.
      var matches =
          event.data.match(/^(:[^ ]+ )?([a-zA-Z0-9]+)( (.*))?$/);

      var prefix = matches[1];
      var command = matches[2];
      var params = matches[4];

      this._onCommand(event.data, prefix, command, params);
    },

    /**
     * Listener for when the WebSocket closes on us
     *
     * @return void
     */
    _onWebSocketClose: function(event) {
      console.debug('close');
      console.debug(event);
    },

    /**
     * Listener for errors on our WebSocket
     *
     * @return void
     */
    _onWebSocketError: function(event) {
      console.debug('error');
      console.debug(event);
    }
};

})(jQuery);
