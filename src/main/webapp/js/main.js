require(['js/vendor/less-1.1.0.min.js',
         'js/vendor/underscore-min.js',
         'js/vendor/jquery-1.7.1.min.js'], function() {
    require(['js/vendor/underscore.string.min.js',
             // 'js/vendor/jquery.address-1.4.min.js',
             'js/vendor/jquery.timeago.js',
             'js/vendor/jquery.tmpl.min.js',
             'js/Controller.js',
             'js/ChannelController.js',
             'js/DesktopController.js',
             'js/plugins/highlight.js',
             'js/plugins/url.js',
             'js/jquery.consumeAvailableHeight.js',
             'js/irc.js'], function() {
      require.ready(init);
    });
});

function init() {
}
