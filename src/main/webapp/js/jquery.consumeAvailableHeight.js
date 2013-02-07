(function($){

  ConsumeAvailableHeight = {};
  ConsumeAvailableHeight.Events = {
    SHOULD_RESIZE: 'ConsumeAvailableHeight.Events.SHOULD_RESIZE'
  };

  $.fn.consumeAvailableHeight = function() {

    /**
     * Set the height of the node to consume
     * the available space
     */
    function resizeNode(node) {
      // If you find this, you're probably mad at me. Sorry.
      node.parents().css('height', '100%');

      // sum the heights of all sibling elements
      var siblingsHeight = 0;
      node.siblings().each(function(i,element) {
        siblingsHeight += Number($(element).outerHeight(true));
      });

      // set the size to be the remaining height
      node.height(window.innerHeight - siblingsHeight);


      node.width(window.innerWidth);
    }

    /**
     * Size each element and set it up to be
     * resized on windows resize
     */
    this.each(function(i, element) {
      var node = $(element);

      // resize it now
      resizeNode(node);

      // resize it when the window changes size
      $(window).resize(function(event) {
        resizeNode(node);
      });

      // resize it whenever anything changes at all
      node.siblings().bind('DOMSubtreeModified', function(event) {
          resizeNode(node);
      });

      // resize it when requested
      node.parent().bind(ConsumeAvailableHeight.Events.SHOULD_RESIZE,
          function(event) {
              resizeNode(node);
          });

    });

  };
})(jQuery);
