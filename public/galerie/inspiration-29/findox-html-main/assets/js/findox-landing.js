(function ($) {
  "use strict";

  if ($(".dynamic-year").length) {
    let currentYear = new Date().getFullYear();
    $(".dynamic-year").html(currentYear);
  }

  // window load event
  $(window).on("load", function () {
    //AOS
    AOS.init();
  });
})(jQuery);
