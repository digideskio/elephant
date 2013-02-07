plugins = 'undefined' === typeof plugins ?  {} : plugins;

/**
 * Makes URLs show up as links. Displays links to images inline.
 */
plugins.url = {

    /**
     * Called when the DOM and app controller are ready
     */
    init: function() {

        // Listen for new messages being added anywhere
        $(document).on(ChannelController.Events.PRIVMSG,
                       function(event) {
            var message = event.message;
            var from = event.from;

            // Check for URL looking things
            var exp = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
            var urls = message.match(exp);

            // Replace URLs with links
            message = message.replace(exp,"<a href='$1' target='_NEW'>$1</a>");
            $(event.target).find('.message').html(message);

            // Check if this URL is an image and append it if we can
            var target = $(event.target).find('.message');
            for(var i in _.uniq(urls, false)) {
                $('<img>', {
                    src: urls[i],
                    error: function() { /* do nothing */ },
                    load: function(imageEvent) {
                        $(imageEvent.target).appendTo(target);
                    }
                }).addClass('autoImage');
            }
        });
    }
}

