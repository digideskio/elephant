(function($) {

    /**
     * Provides various mechanisms for interacting with
     * the desktop, depending on which environment we're
     * running in.
     */
    DesktopController = function(options) {
        this.options = $.extend({
            identifier: 'Elephant',
            iconElementId: 'growlIcon',
            iconURL: 'img/elephantIcon.png',
            onClick: function(event) { }
        }, options);
    };

    DesktopController.prototype = {

        /**
         * Send a notification to the desktop via whatever
         * mechanism is available, if one is available
         *
         * @param String title
         * The title of the message
         *
         * @param String message
         * The message to send
         *
         * @return void
         */
        notify: function(title, message) {

            // Attempt to notify via Fluid's Growl API
            if(window.fluid) {
                window.fluid.showGrowlNotification({
                    title: title,
                    description: message,
                    priority: 1,
                    sticky: false,
                    identifier: this.options.identifier,
                    onclick: this.options.onClick,
                    icon: this.options.iconElementId
                });
            }

            // Else, attempt to use shitty webkit notifications
            else if(window.webkitNotifications) {
                if (window.webkitNotifications.checkPermission() == 0) {
                    window.webkitNotifications
                        .createNotification(this.options.iconUrl,
                                            title,
                                            message).show();
                } else {
                    window.webkitNotifications.requestPermission();
                }
            }
        },

        /**
         * Decrement the app icon badge count
         */
        badgeDecrement: function() {
            var count = Number($('#dockBadge').html())-1
            if(0 < count) {
                $('#dockBadge').html(count);
            }
            else {
                $('#dockBadge').html('');
            }
        },

        /**
         * Increment the app icon badge count
         */
        badgeIncrement: function() {
            $('#dockBadge').html(Number($('#dockBadge').html())+1);
        }
    };
})(jQuery);
