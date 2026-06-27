/* ===================================
    Loading Timeout
    ====================================== */

    $(window).on("load", function() {
        "use strict";
        setTimeout(function() {
            $('.preloader').fadeOut();
        }, 400);
    });


  /*  ===================================
      counter script
      ====================================== */


      if (jQuery("#timelist").length) {
          function getTimeRemaining(endtime) {
            var t = Date.parse(endtime) - Date.parse(new Date());
            var secondsInADay = 60 * 60 * 1000 * 24,
                  secondsInAHour = 60 * 60 * 1000;

            var days = Math.floor(t / (secondsInADay) * 1);
            var hours = Math.floor((t % (secondsInADay)) / (secondsInAHour) * 1);
            var minutes = Math.floor(((t % (secondsInADay)) % (secondsInAHour)) / (60 * 1000) * 1);
            var seconds = Math.floor((((t % (secondsInADay)) % (secondsInAHour)) % (60 * 1000)) / 1000 * 1);
            return {
              'total': t,
              'days': days,
              'hours': hours,
              'minutes': minutes,
              'seconds': seconds
          };
      }

      function initializeClock(id, endtime) {
        var clock = document.getElementById(id);
        var daysSpan = clock.querySelector('.days');
        var hoursSpan = clock.querySelector('.hours');
        var minutesSpan = clock.querySelector('.minutes');
        var secondsSpan = clock.querySelector('.seconds');

        function updateClock() {
          var t = getTimeRemaining(endtime);

          daysSpan.innerHTML = t.days;
          hoursSpan.innerHTML = ('0' + t.hours).slice(-2);
          minutesSpan.innerHTML = ('0' + t.minutes).slice(-2);
          secondsSpan.innerHTML = ('0' + t.seconds).slice(-2);

          if (t.total <= 0) {
            clearInterval(timeinterval);
        }
    }

    updateClock();
      var timeinterval = setInterval(updateClock, 1000);
    }

  
    var deadline = new Date(Date.parse(new Date('March 23, 2023 00:00:00')));
    initializeClock('timelist', deadline);

  }