plugins = 'undefined' === typeof plugins ?  {} : plugins;

/**
 * Adds a class to any messages that contain highlight words and
 * sends out desktop notification
 */
plugins.highlight = {

    /**
     * Highlight words should be all lowercase
     */
    highlightWords: [ 'asm', 'amorrison', 'andrew', 'search jackass' ],


    /**
     * Called when the DOM and the Controller are ready
     */
    init: function() {

        var desktopController = new DesktopController();

        // Listen for the privmsg event and highlight messages
        // that match
        $(document).on(ChannelController.Events.PRIVMSG,
                       function(event) {
            var message = event.message;
            var from = event.from;

            for(var i = 0; i < plugins.highlight.highlightWords.length; i++) {
                if(0 <= message.toLowerCase().search(plugins.highlight.highlightWords[i])) {

                    // Find out which channel this is in
                    var channel = $(event.target).parents('section.channel').attr('data-channel');

                    // Make some noise on the desktop if we can
                    desktopController.notify(from, message);
                    if(!$('#channels .channel[data-channel='+channel+']').hasClass('highlight')) {
                        desktopController.badgeIncrement();
                    }

                    // Highlight the message
                    $(event.target).addClass('highlight');

                    // Highlight the channel and its label
                    // n.b.: This is a hack since I don't have access to the
                    //       channel controller.
                    $('#channelList li[data-channel='+channel+']').addClass('highlight');
                    $('#channels .channel[data-channel='+channel+']').addClass('highlight');
                }
            }
        });
    }
};
