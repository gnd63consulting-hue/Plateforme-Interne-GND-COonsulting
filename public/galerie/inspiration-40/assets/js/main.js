/***** JS START*********/
(function ($) {
  "use strict";

  // Search Functionality
  // Only run if the search wrapper exists
  if ($(".header__search").length) {
    const $openBtn = $(".search-open-btn");
    const $panel = $("#site-search");
    const $inner = $panel.find(".search-inner");
    const $input = $panel.find(".search-input");
    const $close = $panel.find(".search-close");
    const KEY_ESC = 27;

    function openSearch() {
      $panel.addClass("open");
      $openBtn.attr("aria-expanded", "true");
      $panel.attr("aria-hidden", "false");
      $("body").css("overflow", "hidden");
      setTimeout(() => $input.focus(), 180);
    }

    function closeSearch() {
      $panel.removeClass("open");
      $openBtn.attr("aria-expanded", "false");
      $panel.attr("aria-hidden", "true");
      $("body").css("overflow", "");
      $openBtn.focus();
    }

    // Open button
    $openBtn.on("click", function (e) {
      e.preventDefault();
      if ($panel.hasClass("open")) closeSearch();
      else openSearch();
    });

    // Close button
    $close.on("click", function (e) {
      e.preventDefault();
      closeSearch();
    });

    // Click outside (on backdrop)
    $panel.on("click", function (e) {
      if ($(e.target).is(".search-backdrop")) closeSearch();
    });

    // ESC key closes
    $(document).on("keydown", function (e) {
      if (e.which === KEY_ESC && $panel.hasClass("open")) closeSearch();
    });

    // Prevent closing when clicking inside
    $inner.on("click", function (e) {
      e.stopPropagation();
    });
  }

  /* === Set Background Image & Mask === */
  if (typeof $ !== "undefined") {
    if ($("[data-bg-src]").length > 0) {
      $("[data-bg-src]").each(function () {
        var src = $(this).attr("data-bg-src");
        $(this).css("background-image", "url(" + src + ")");
        $(this).removeAttr("data-bg-src").addClass("background-image");
      });
    }
  }

  if ($("[data-mask-src]").length > 0) {
    $("[data-mask-src]").each(function () {
      var mask = $(this).attr("data-mask-src");
      $(this).css({
        "mask-image": "url(" + mask + ")",
        "-webkit-mask-image": "url(" + mask + ")",
      });
      $(this).addClass("bg-mask");
      $(this).removeAttr("data-mask-src");
    });
  }


  // Initialize WOW.js
  new WOW({
    offset: 0, // trigger when element is in view
  }).init();

  /* ===  Initialize only if .tabs exist js === */
  $(".tab-menu li a").on("click", function (e) {
    e.preventDefault();

    // 🔹 Check if .tab-menu exists
    if ($(".tab-menu").length > 0) {
      var tabMenu = $(".tab-menu");
      var tabMenuTop = tabMenu.offset().top;
      var tabMenuBottom = tabMenuTop + tabMenu.outerHeight();
      var scrollTop = $(window).scrollTop();
      var windowBottom = scrollTop + $(window).height();

      // 🔹 Only run tab switch if .tab-menu is visible in viewport
      if (tabMenuBottom > scrollTop && tabMenuTop < windowBottom) {
        var target = $(this).attr("data-rel");

        $(".tab-menu li a").removeClass("active");
        $(this).addClass("active");

        $("#" + target)
          .fadeIn("slow")
          .siblings(".tab-box")
          .hide();
      }
    }

    return false;
  });

  /* === Intro-silderone === */
  if ($(".intro-sliderone").length > 0) {
    var introSliderOne = new Swiper(".intro-sliderone", {
      loop: true,
      speed: 2000,
      autoplay: {
        delay: 3500,
      },
      autoplay: false,
      slidesPerView: 1,
      spaceBetween: 20,
      effect: "fade",
      centeredSlides: true,
      navigation: {
        nextEl: ".intro-silderone-next",
        prevEl: ".intro-silderone-prev",
      },
      breakpoints: {
        0: {
          slidesPerView: 1,
          spaceBetween: 10,
          centeredSlides: true,
        },
        576: {
          slidesPerView: 1,
          spaceBetween: 15,
        },
        768: {
          slidesPerView: 1,
          spaceBetween: 20,
        },
        1200: {
          slidesPerView: 1,
          spaceBetween: 20,
        },
      },
    });
  }

  /* === Testimonial-silderone === */
  if ($(".testimonial-sliderone").length > 0) {
    var testimonialSliderOne = new Swiper(".testimonial-sliderone", {
      loop: true,
      speed: 2000,
      autoplay: {
        delay: 2500,
        disableOnInteraction: false,
        pauseOnMouseEnter: true,
      },
      direction: "vertical", // must be in quotes
      slidesPerView: 1,
      spaceBetween: 20,
      centeredSlides: true,
      navigation: {
        nextEl: ".testimonial-sliderone-next",
        prevEl: ".testimonial-sliderone-prev",
      },
      breakpoints: {
        0: {
          slidesPerView: 1,
          spaceBetween: 10,
          centeredSlides: true,
        },
        576: {
          slidesPerView: 3,
          spaceBetween: 15,
        },
        768: {
          slidesPerView: 3,
          spaceBetween: 20,
        },
        1200: {
          slidesPerView: 3,
          spaceBetween: 20,
        },
      },
    });
  }

  if ($(".testimonialtwo__clients-slider").length > 0) {
    const testiTopSlider = new Swiper(".testimonialtwo__clients-slider", {
      spaceBetween: 24,
      speed: 1000,
      loop: true,
      direction: "vertical",
      centeredSlides: true,
      autoplay: true,
      navigation: {
        nextEl: ".testimonialtwo__prev",
        prevEl: ".testimonialtwo__next",
      },
      breakpoints: {
        991: {
          slidesPerView: 3,
        },
        767: {
          slidesPerView: 3,
        },
        575: {
          slidesPerView: 3,
        },
        100: {
          slidesPerView: 3,
        },
      },
    });
  }

  if ($(".testimonialtwo__content-slider").length > 0) {
    const testimonialtwoContentSlide = new Swiper(
      ".testimonialtwo__content-slider",
      {
        spaceBetween: 24,
        speed: 1000,
        loop: true,
        autoplay: true,
        navigation: {
          nextEl: ".testimonialtwo__prev",
          prevEl: ".testimonialtwo__next",
        },
      }
    );
  }

  if ($(".testimonialthree__content-slider").length > 0) {
    const testimonialthreeContentSlide = new Swiper(
      ".testimonialthree__content-slider",
      {
        spaceBetween: 24,
        speed: 1000,
        loop: true,
        // autoplay: true,
        navigation: {
          nextEl: ".testimonialthree__prev",
          prevEl: ".testimonialthree__next",
        },
      }
    );
  }

  /* === Project Silder === */
  if ($(".project-silderone").length > 0) {
    var projectSliderOne = new Swiper(".project-silderone", {
      loop: true,
      speed: 2000,
      autoplay: {
        delay: 2500,
      },
      slidesPerView: 1,
      spaceBetween: 32,
      centeredSlides: true,
      breakpoints: {
        0: {
          slidesPerView: 1,
          spaceBetween: 10,
          centeredSlides: true,
        },
        576: {
          slidesPerView: 1,
          spaceBetween: 15,
        },
        768: {
          slidesPerView: 2,
          spaceBetween: 20,
        },
        1200: {
          slidesPerView: 3,
          spaceBetween: 32,
        },
      },
    });
  }

  if ($(".project-slidertwo").length > 0) {
    var projectSliderTwo = new Swiper(".project-slidertwo", {
      loop: true,
      speed: 2000,
      autoplay: {
        delay: 1000, reverseDirection: true,
      },
      effect: "fade",
      slidesPerView: 1,
      spaceBetween: 32, navigation: {
        nextEl: ".project-sildertwo-next",
        prevEl: ".project-sildertwo-prev",
      },
      breakpoints: {
        0: {
          slidesPerView: 1,
          spaceBetween: 10,
          centeredSlides: true,
        },
        576: {
          slidesPerView: 1,
          spaceBetween: 15,
        },
        768: {
          slidesPerView: 1,
          spaceBetween: 20,
        },
        1200: {
          slidesPerView: 1,
          spaceBetween: 32,
        },
      },
    });
  }

  if ($(".project-sliderthree").length > 0) {
    var projectSliderThree = new Swiper(".project-sliderthree", {
      loop: true,
      speed: 2000,
      autoplay: {
        delay: 3000,
        disableOnInteraction: false,
        pauseOnMouseEnter: true,
      },
      slidesPerView: 1,
      spaceBetween: 32,
      centeredSlides: true,
      breakpoints: {
        0: {
          slidesPerView: 1,
          spaceBetween: 10,
          centeredSlides: true,
        },
        576: {
          slidesPerView: 1,
          spaceBetween: 15,
        },
        768: {
          slidesPerView: 2,
          spaceBetween: 20,
        },
        1200: {
          slidesPerView: 3,
          spaceBetween: 32,
        },
      },
    });
  }

  /* === Team silder === */
  if ($(".teamone__sliderone").length > 0) {
    var teamOneSliderOne = new Swiper(".teamone__sliderone", {
      loop: true,
      speed: 2000,
      autoplay: {
        delay: 2500,
      },
      slidesPerView: 1,
      spaceBetween: 20,
      centeredSlides: true,
      navigation: {
        nextEl: ".teamone-slidertwo-next",
        prevEl: ".teamone-slidertwo-prev",
      },
      breakpoints: {
        0: {
          slidesPerView: 1,
          spaceBetween: 10,
          centeredSlides: true,
        },
        576: {
          slidesPerView: 1,
          spaceBetween: 15,
        },
        768: {
          slidesPerView: 1,
          spaceBetween: 20,
        },
        1200: {
          slidesPerView: 1,
          spaceBetween: 20,
        },
      },
    });
  }

  if ($(".teamone__slidertwo").length > 0) {
    var teamOneSliderTwo = new Swiper(".teamone__slidertwo", {
      loop: true,
      speed: 2000,
      autoplay: {
        delay: 2500,
      },
      slidesPerView: 1,
      spaceBetween: 20,
      direction: "vertical",
      navigation: {
        nextEl: ".teamone-slidertwo-next",
        prevEl: ".teamone-slidertwo-prev",
      },
      breakpoints: {
        0: {
          slidesPerView: 2,
          spaceBetween: 10,
          centeredSlides: true,
        },
        576: {
          slidesPerView: 2,
          spaceBetween: 15,
        },
        768: {
          slidesPerView: 2,
          spaceBetween: 15,
        },
        1200: {
          slidesPerView: 3,
          spaceBetween: 10,
        },
      },
    });
  }

  if ($(".teamone__sliderthree").length > 0) {
    var teamOneSliderThree = new Swiper(".teamone__sliderthree", {
      loop: true,
      speed: 2000,
      autoplay: {
        delay: 2500,
      },
      slidesPerView: 1,
      spaceBetween: 20,
      centeredSlides: true,
      navigation: {
        nextEl: ".teamone-slidertwo-next",
        prevEl: ".teamone-slidertwo-prev",
      },
      breakpoints: {
        0: {
          slidesPerView: 1,
          spaceBetween: 10,
          centeredSlides: true,
        },
        576: {
          slidesPerView: 1,
          spaceBetween: 15,
        },
        768: {
          slidesPerView: 1,
          spaceBetween: 20,
        },
        1200: {
          slidesPerView: 1,
          spaceBetween: 20,
        },
      },
    });
  }


  /* === Marquee silder === */
  var marquee = new Swiper(".marquee-active", {
    loop: true,
    freemode: true,
    slidesPerView: "auto",
    spaceBetween: 20,
    centeredSlides: true,
    allowTouchMove: false,
    speed: 15000,
    autoplay: {
      delay: 1,
      disableOnInteraction: true,
    },
  });




  /* === Odometer js === */
  if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);

    const odometers = document.querySelectorAll(".odometer");
    if (odometers.length > 0) {
      odometers.forEach((el) => {
        const count = el.getAttribute("data-count");

        ScrollTrigger.create({
          trigger: el,
          start: "top 95%",
          once: true,
          onEnter: () => {
            el.innerHTML = count;
          },
        });
      });
    }
  } else {
    console.warn(
      "GSAP or ScrollTrigger not found. Odometer animation skipped."
    );
  }

  /* === Function to add animation classes js === */
  function animationProperties() {
    $("[data-ani]").each(function () {
      var animationName = $(this).data("ani");
      $(this).addClass(animationName);
    });

    $("[data-ani-delay]").each(function () {
      var delayTime = $(this).data("ani-delay");
      $(this).css("animation-delay", delayTime);
    });
  }
  animationProperties();

  //  Update progress
  $(".skill").each(function () {
    var $this = $(this);
    var percent = $this.data("percent");
    var $bar = $this.find(".progress-bar");

    $bar.animate(
      {
        width: percent + "%",
      },
      1500
    );

    $({
      countNum: 0,
    }).animate(
      {
        countNum: percent,
      },
      {
        duration: 1500,
        easing: "swing",
        step: function () {
          $bar.text(Math.floor(this.countNum) + "%");
        },
        complete: function () {
          $bar.text(this.countNum + "%");
        },
      }
    );
  });

  // Accordion
  $(".faq__question").on("click", function () {
    const $item = $(this).closest(".faq__item");

    // Toggle active class on the clicked item
    $item.toggleClass("active").siblings(".faq__item").removeClass("active");
  });

  /* === Overlap Animation a section one to another === */
  if (document.querySelector(".section-item")) {
    const mm = gsap.matchMedia();

    // We'll only create pin triggers for desktop screens (>=1024px)
    mm.add("(min-width: 1024px)", () => {
      const pinList = Array.from(document.querySelectorAll(".section-item"));
      const createdTriggers = [];

      pinList.forEach((item) => {
        const endDistance = Math.max(item.offsetHeight, window.innerHeight);

        const st = ScrollTrigger.create({
          trigger: item,
          start: "top top",
          end: () => `+=${endDistance}`,
          pin: true,
          pinSpacing: false,
          markers: false,
        });

        createdTriggers.push(st);
      });

      return () => {
        createdTriggers.forEach((t) => t.kill());
      };
    });

    mm.add("(max-width: 1023px)", () => {
      return () => { };
    });
  }
 
})(jQuery);
