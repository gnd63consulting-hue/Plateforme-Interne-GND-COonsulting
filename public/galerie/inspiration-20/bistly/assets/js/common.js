/*----------------------------------------------------------------------------------- 

Template Name: Bistly - Restaurant & Cafe HTML Template
URI: pixelfit.agency
Description: Bistly is a clean, modern, and fully responsive HTML template designed specifically for restaurants, cafes, bakeries, coffee shops, and food-related businesses. Crafted with attention to detail and built using the latest web technologies, Bistly ensures an exceptional user experience on all devices.
Author: Pixelfit
Author URI: https://themeforest.net/user/pixelfit
Version: 1.0 


------------------------------------------------------
   JS INDEX
-----------------------------------------------------

	# Main Menu
	# Offcanvas Overlay
	# Preloader
	# Sticky
	# Magnific-Popup JS
	# Counter JS
	# Nice Select Js
	# AOS Animation
	# GSAP Animation

-------------------------------------------------------    */

(function($) {
	'use strict';

	//===== Main Menu

	function mainMenu() {
		var var_window = $(window),
			navContainer = $('.header-navigation'),
			navbarToggler = $('.navbar-toggler'),
			navMenu = $('.theme-nav-menu'),
			navMenuLi = $('.theme-nav-menu ul li ul li'),
			closeIcon = $('.navbar-close');
		navbarToggler.on('click', function() {
			navbarToggler.toggleClass('active');
			navMenu.toggleClass('menu-on');
		});
		closeIcon.on('click', function() {
			navMenu.removeClass('menu-on');
			navbarToggler.removeClass('active');
		});
		navMenu.find("li a").each(function() {
			if ($(this).children('.dd-trigger').length < 1) {
				if ($(this).next().length > 0) {
					$(this).append('<span class="dd-trigger"><i class="far fa-angle-down"></i></span>')
				}
			}
		});
		navMenu.on('click', '.dd-trigger', function(e) {
			e.preventDefault();
			$(this).parent().parent().siblings().children('ul.sub-menu').slideUp();
			$(this).parent().next('ul.sub-menu').stop(true, true).slideToggle(350);
			$(this).toggleClass('sub-menu-open');
		});

	};

	//===== Offcanvas Overlay

	function offCanvas() {
		const $overlay = $(".offcanvas__overlay");
		const $toggler = $(".navbar-toggler");
		const $menu = $(".theme-nav-menu");
		$toggler.add($overlay).add(".navbar-close, .panel-close-btn").on("click", function() {
			$overlay.toggleClass("overlay-open");
			if ($(this).is($overlay)) {
				$toggler.removeClass("active");
				$menu.removeClass("menu-on");
			}
		});
		$(window).on("resize", function() {
			if ($(window).width() > 991) $overlay.removeClass("overlay-open");
		});
	}

	//===== Preloader

	$(window).on('load', function(event) {
		$('.preloader').delay(500).fadeOut(500);
	})

	//===== Sticky

	$(document).ready(function () {
        function initStickyHeader(headerSelector) {
            const header = $(headerSelector);
            let lastScroll = 0;
    
            $(window).on('scroll', function () {
                const currentScroll = $(this).scrollTop();
                if (currentScroll > 200) {
                    if (currentScroll < lastScroll) {
                        if (!header.hasClass('sticky')) {
                            header.addClass('sticky');
                        }
                    } else {
                        header.removeClass('sticky');
                    }
                } else if (currentScroll === 0) {
                    header.removeClass('sticky');
                }
                lastScroll = currentScroll;
            });
        }
        initStickyHeader('.header-area');
    });


	//===== Magnific-popup js

	if ($('.video-popup').length) {
		$('.video-popup').magnificPopup({
			type: 'iframe',
			removalDelay: 300,
			mainClass: 'mfp-fade'
		});
	}
	if ($('.play-btn').length) {
		$('.play-btn').magnificPopup({
			type: 'iframe',
			removalDelay: 300,
			mainClass: 'mfp-fade'
		});
	}
	// ===== Counter

	if ($('.counter').length) {
		const observer = new IntersectionObserver((entries, observer) => {
			entries.forEach(entry => {
				if (entry.isIntersecting) {
					$(entry.target).counterUp({
						delay: 100,
						time: 4000
					});
					observer.unobserve(entry.target);
				}
			});
		}, {
			threshold: 1.0
		});
		$('.counter').each(function() {
			observer.observe(this);
		});
	}

	//===== Nice select js
    
    if ($('select').length){
        $('select').niceSelect();
    }

  	//====== Aos 

	AOS.init({
		offset: 0
	});

	//===== Gasp Registration

	gsap.registerPlugin(SplitText, ScrollTrigger, ScrollSmoother);

	// Gsap ScrollSmoother

	if (window.innerWidth > 991) {
		ScrollSmoother.create({
		  smooth: 1,
		  effects: true
		});
	}

	// Gsap Text Animation

	if ($('.text-anm').length) {
		const animatedTextElements = document.querySelectorAll('.text-anm');
		animatedTextElements.forEach((element) => {
			let animationSplitText = new SplitText(element, {
				type: "chars,words"
			});
			gsap.from(animationSplitText.chars, {
				duration: .8,
				delay: 0.3,
				x: 50,
				autoAlpha: 0,
				stagger: 0.050,
				ease: "power2.out",
				scrollTrigger: {
					trigger: element,
					start: "top 85%"
				}
			});
		});
	}

	// Document Ready

	$(function() {
		mainMenu();
		offCanvas();
	});

})(window.jQuery);