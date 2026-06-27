/***************************************************
==================== JS INDEX ======================
01. Data Background Set
02. Sticky Header
03. GSAP Plugins Register
04. Smooth Scroll
05. Fade Animation
06. Preloader
07. Side Info Toggle
08. Mean Menu Init
09. Video Popup
10. Text Invert Scroll Effect
11. Smooth Anchor Scroll
12. Nice Select Init
****************************************************/

(function ($) {
    "use strict";

    var windowOn = $(window);
    let mm = gsap.matchMedia();

    /* === Data Css Js  === */
    $("[data-background]").each(function () {
        $(this).css(
            "background-image",
            "url( " + $(this).attr("data-background") + "  )"
        );
    });

    /* === sticky header Js === */
    function pinned_header() {
        var lastScrollTop = 0;

        windowOn.on('scroll', function () {
            var currentScrollTop = $(this).scrollTop();
            if (currentScrollTop > lastScrollTop) {
                $('.header-sticky').removeClass('sticky');
                $('.header-sticky').addClass('transformed');
            } else if ($(this).scrollTop() <= 500) {
                $('.header-sticky').removeClass('sticky');
                $('.header-sticky').removeClass('transformed');
            } else {
                // Scrolling up, remove the class
                $('.header-sticky').addClass('sticky');
                $('.header-sticky').removeClass('transformed');
            }
            lastScrollTop = currentScrollTop;
        });
    }
    pinned_header();

    /* === Register GSAP Plugins Js  === */
    gsap.registerPlugin(ScrollTrigger, ScrollSmoother, CustomEase);

    /* === Smooth active Js  === */
    var device_width = window.screen.width;

    if (device_width > 767) {
        if (document.querySelector("#has_smooth").classList.contains("has-smooth")) {
            const smoother = ScrollSmoother.create({ 
                smooth: 0.9,
                effects: device_width < 1025 ? false : true,
                smoothTouch: 0.1,
                 normalizeScroll: false,
                normalizeScroll: {
                    allowNestedScroll: true,
                },
                ignoreMobileResize: true,
            });
        }

    }

    /* === GSAP Fade Animation Js  === */
    let fadeArray_items = document.querySelectorAll(".fade-anim");
    if (fadeArray_items.length > 0) {
        const fadeArray = gsap.utils.toArray(".fade-anim")
        fadeArray.forEach((item, i) => {
            var fade_direction = "bottom"
            var onscroll_value = 1
            var duration_value = 1.15
            var fade_offset = 50
            var delay_value = 0.15
            var ease_value = "power2.out"
            if (item.getAttribute("data-offset")) {
                fade_offset = item.getAttribute("data-offset");
            }
            if (item.getAttribute("data-duration")) {
                duration_value = item.getAttribute("data-duration");
            }
            if (item.getAttribute("data-direction")) {
                fade_direction = item.getAttribute("data-direction");
            }
            if (item.getAttribute("data-on-scroll")) {
                onscroll_value = item.getAttribute("data-on-scroll");
            }
            if (item.getAttribute("data-delay")) {
                delay_value = item.getAttribute("data-delay");
            }
            if (item.getAttribute("data-ease")) {
                ease_value = item.getAttribute("data-ease");
            }
            let animation_settings = {
                opacity: 0,
                ease: ease_value,
                duration: duration_value,
                delay: delay_value,
            }
            if (fade_direction == "top") {
                animation_settings['y'] = -fade_offset
            }
            if (fade_direction == "left") {
                animation_settings['x'] = -fade_offset;
            }
            if (fade_direction == "bottom") {
                animation_settings['y'] = fade_offset;
            }
            if (fade_direction == "right") {
                animation_settings['x'] = fade_offset;
            }
            if (onscroll_value == 1) {
                animation_settings['scrollTrigger'] = {
                    trigger: item,
                    start: 'top 85%',
                }
            }
            gsap.from(item, animation_settings);
        })
    }


    /* === Side Info  Js === */
    $(".side-info-close,.offcanvas-overlay").on("click", function () {
        $(".side-info").removeClass("info-open");
        $(".offcanvas-overlay").removeClass("overlay-open");
    });
    $(".side-toggle").on("click", function () {
        $(".side-info").addClass("info-open");
        $(".offcanvas-overlay").addClass("overlay-open");
    });

    $(window).scroll(function () {
        if ($("body").scrollTop() > 0 || $("html").scrollTop() > 0) {
            $(".side-info").removeClass("info-open");
            $(".offcanvas-overlay").removeClass("overlay-open");
        }
    });

    /* === Mean menu activation  Js  === */
    $('.main-menu').meanmenu({
        meanScreenWidth: "1199",
        meanMenuContainer: '.mobile-menu',
        meanMenuCloseSize: '28px',
    });
    $('.main-menu-all').meanmenu({
        meanScreenWidth: "5000",
        meanMenuContainer: '.mobile-menu',
        meanMenuCloseSize: '28px',
    });

   
  
  /* === Magnific Popup Image Gallery  Js  === */
  if ($('.popup-gallery').length && 'magnificPopup' in jQuery) {
  $(".popup-gallery").magnificPopup({
    delegate: "a",
    type: "image",
    gallery: {
      enabled: true,
      navigateByImgClick: true,
      preload: [0, 1] // Preload previous & next image
    }
  });  
  }

  /* === Magnific Video popup Js  === */
  if ($('.popup-video').length && 'magnificPopup' in jQuery) {
    $('.popup-video').magnificPopup({
      type: 'iframe',
    });
  }

    /* === Text Invert With Scroll Js === */
    const split = new SplitText(".text-invert", { type: "lines" });
    split.lines.forEach((target) => {
        gsap.to(target, {
            backgroundPositionX: 0,
            ease: "none",
            scrollTrigger: {
                trigger: target,
                scrub: 1,
                start: 'top 85%',
                end: "bottom center",
            }
        });
    });


 

    /* === gsap nav Js  === */
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const targetId = this.getAttribute('href').substring(1);
        const targetElement = document.getElementById(targetId);

        if (targetElement) {
            window.scrollTo({
                top: targetElement.offsetTop,
                behavior: 'smooth',
            });
        }
    });
});
 

/* === Preloader Animation Js === */
if (document.querySelectorAll(".loader-wrap").length > 0) {
    $(document).ready(function () {

        setTimeout(function () {
            $('#container').addClass('loaded');
        }, 200);

        setTimeout(function () {
            $('.loader-wrap').fadeOut(200, function () {
                $(this).remove();
                // Trigger text animation AFTER preloader is gone
                startTextAnimation();
            });
        }, 3000);

        // your other preloader animations...
    });
}

/* === GSAP Text Animation Function === */
function startTextAnimation() {
    if ($('.gsap-title-anim').length) {
        gsap.registerPlugin(ScrollTrigger, SplitText);

        let staggerAmount = 0.05,
            translateXValue = 20,
            delayValue = 0.3,
            easeType = "power2.out",
            animatedTextElements = document.querySelectorAll('.gsap-title-anim');

        animatedTextElements.forEach((element) => {
            let animationSplitText = new SplitText(element, { type: "chars, words" });
            gsap.from(animationSplitText.chars, {
                duration: 0.3,
                delay: delayValue,
                x: translateXValue,
                autoAlpha: 0,
                stagger: staggerAmount,
                ease: easeType,
                scrollTrigger: { trigger: element, start: "top 85%" },
            });
        });
    }
}

/* Call it (in case no preloader exists) */
$(window).on('load', function() {
    startTextAnimation();
});


    /* ========  main Js ======== */


}) (jQuery);

