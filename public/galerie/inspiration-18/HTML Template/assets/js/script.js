/*-----------------------------------------------------------------------------------
    Template Name: WellFood - Resturent HTML Template
    Template URI: https://webtend.net/demo/html/limestone/
    Author: WebTend
    Author URI:  https://webtend.net/
    Version: 1.0

    Note: This is Main JS File.
-----------------------------------------------------------------------------------
	CSS INDEX
	===================
    ## Header Style
    ## Dropdown menu
    ## Submenu
    ## Menu Hidden Sidebar
    ## Search Box
    ## Video Popup
    ## Offer CountDown
    ## Testimonial Slider
    ## Testimonial Two
    ## Testimonial Five
    ## Pizza Slider
    ## Food Category
    ## Why Choose Us
    ## Client Active
    ## Widget Gallery
    ## Fact Counter
    ## History Progress
    ## Gallery Filter
    ## Products Filter
    ## Price Range Fliter
    ## Quantity Number
    ## Scroll to Top
    ## Nice Select
    ## AOS Animation
    ## Preloader
    
-----------------------------------------------------------------------------------*/

(function ($) {

    "use strict";

    $(document).ready(function () {

        // ## Header Style and Scroll to Top
        function headerStyle() {
            if ($('.main-header').length) {
                var windowpos = $(window).scrollTop();
                var siteHeader = $('.main-header');
                var scrollLink = $('.scroll-top');
                if (windowpos >= 250) {
                    siteHeader.addClass('fixed-header');
                    scrollLink.fadeIn(300);
                } else {
                    siteHeader.removeClass('fixed-header');
                    scrollLink.fadeOut(300);
                }
            }
        }
        headerStyle();
        
        
        // ## Dropdown menu
        var mobileWidth = 992;
        var navcollapse = $('.navigation li.dropdown');

        navcollapse.hover(function () {
            if ($(window).innerWidth() >= mobileWidth) {
                $(this).children('ul').stop(true, false, true).slideToggle(300);
                $(this).children('.megamenu').stop(true, false, true).slideToggle(300);
            }
        });
        
        // ## Submenu Dropdown Toggle
        if ($('.main-header .navigation li.dropdown ul').length) {
            $('.main-header .navigation li.dropdown').append('<div class="dropdown-btn"><span class="far fa-angle-down"></span></div>');

            //Dropdown Button
            $('.main-header .navigation li.dropdown .dropdown-btn').on('click', function () {
                $(this).prev('ul').slideToggle(500);
                $(this).prev('.megamenu').slideToggle(800);
            });
            
            //Disable dropdown parent link
            $('.navigation li.dropdown > a').on('click', function (e) {
                e.preventDefault();
            });
        }
        
        //Submenu Dropdown Toggle
        if ($('.main-header .main-menu').length) {
            $('.main-header .main-menu .navbar-toggle').click(function () {
                $(this).prev().prev().next().next().children('li.dropdown').hide();
            });
        }
        
         
        // ## Menu Hidden Sidebar Content Toggle
        if($('.menu-sidebar').length){
            //Show Form
            $('.menu-sidebar').on('click', function(e) {
                e.preventDefault();
                $('body').toggleClass('side-content-visible');
            });
            //Hide Form
            $('.hidden-bar .inner-box .cross-icon,.form-back-drop,.close-menu').on('click', function(e) {
                e.preventDefault();
                $('body').removeClass('side-content-visible');
            });
            //Dropdown Menu
            $('.fullscreen-menu .navigation li.dropdown > a').on('click', function() {
                $(this).next('ul').slideToggle(500);
            });
        }
         
        
        // ## Search Box
		$('.nav-search > button').on('click', function () {
			$('.nav-search form').toggleClass('hide');
		});
        
        
        // Hide Box Search WHEN CLICK OUTSIDE
		if ($(window).width() > 767){
			$('body').on('click', function (event) {
				if ($('.nav-search > button').has(event.target).length == 0 && !$('.nav-search > button').is(event.target)
					&& $('.nav-search form').has(event.target).length == 0 && !$('.nav-search form').is(event.target)) {
					if ($('.nav-search form').hasClass('hide') == false) {
						$('.nav-search form').toggleClass('hide');
					};
				}
			});
		}
        
  
        // ## Video Popup
        if ($('.video-play').length) {
            $('.video-play').magnificPopup({
                type: 'video',
            });
        }
        
        // ## Video Popup With Text
        if ($('.video-play-text').length) {
            $('.video-play-text').magnificPopup({
                type: 'video',
            });
        }

        
        // ## Offer CountDown //
		if($('.offer-countdown-wrap').length !== 0){
                const second = 1000,
				  minute = second * 60,
				  hour = minute * 60,
				  day = hour * 24;
				let	countDown = new Date('Aug 15, 2024 00:00:00').getTime(),
			x = setInterval(function() {
			  let now = new Date().getTime(),
				  distance = countDown - now;
				document.getElementById('days').innerText = Math.floor(distance / (day)),
				document.getElementById('hours').innerText = Math.floor((distance % (day)) / (hour)),
				document.getElementById('minutes').innerText = Math.floor((distance % (hour)) / (minute)),
				document.getElementById('seconds').innerText = Math.floor((distance % (minute)) / second);
			  //do something later when date is reached
			  //if (distance < 0) {
			  //  clearInterval(x);
			  //  'IT'S MY BIRTHDAY!;
			  //}
			}, second)
        };
        
        
        // ## Testimonial Slider
        if ($('.testimonials-active').length) {
            $('.testimonials-active').slick({
                slidesToShow: 3,
                slidesToScroll: 1,
                infinite: false,
                speed: 400,
                arrows: false,
                dots: true,
                focusOnSelect: true,
                autoplay: false,
                autoplaySpeed: 5000,
                responsive: [
                    {
                        breakpoint: 1200,
                        settings: {
                            slidesToShow: 2,
                        }
                    },
                    {
                        breakpoint: 767,
                        settings: {
                            slidesToShow: 1,
                            slidesToScroll: 1,
                        }
                    }
                ]
            });
        }
        
        
        // ## Testimonial Two Slider
        if ($('.testimonials-two-carousel').length) {
            $('.testimonials-two-carousel').slick({
                slidesToShow: 1,
                slidesToScroll: 1,
                infinite: false,
                speed: 400,
                arrows: false,
                dots: true,
                fade: true,
                focusOnSelect: true,
                autoplay: false,
                autoplaySpeed: 5000,
            });
        }
        
        
        
        // ## Testimonial Five Content Slider
        if ($('.testimonials-five-content').length) {
            $('.testimonials-five-content').slick({
                slidesToShow: 1,
                slidesToScroll: 1,
                infinite: false,
                speed: 400,
                arrows: false,
                dots: true,
                fade: true,
                focusOnSelect: true,
                autoplay: false,
                autoplaySpeed: 5000,
                asNavFor: '.testimonials-five-authors',
            });
        }
        
        // ## Testimonial Five Images Slider
        if ($('.testimonials-five-authors').length) {
            $('.testimonials-five-authors').slick({
                slidesToShow: 3,
                slidesToScroll: 1,
                infinite: true,
                speed: 400,
                arrows: false,
                dots: false,
                fade: false,
                centerMode: true,
                centerPadding: "0",
                variableWidth: true,
                focusOnSelect: true,
                autoplay: false,
                autoplaySpeed: 5000,
                asNavFor: '.testimonials-five-content',
            });
        }
        
        
        // ## Pizza Slider
        if ($('.pizza-active').length) {
            $('.pizza-active').slick({
                slidesToShow: 4,
                slidesToScroll: 1,
                infinite: false,
                speed: 400,
                arrows: false,
                dots: true,
                focusOnSelect: true,
                autoplay: false,
                autoplaySpeed: 5000,
                responsive: [
                    {
                        breakpoint: 1200,
                        settings: {
                            slidesToShow: 3,
                        }
                    },
                    {
                        breakpoint: 991,
                        settings: {
                            slidesToShow: 2,
                        }
                    },
                    {
                        breakpoint: 767,
                        settings: {
                            slidesToShow: 1,
                            slidesToScroll: 1,
                        }
                    }
                ]
            });
        }
        
        
        // ## Food Category Slider
        if ($('.food-category-active').length) {
            $('.food-category-active').slick({
                infinite: true,
                speed: 400,
                arrows: false,
                dots: false,
                focusOnSelect: true,
                autoplay: true,
                autoplaySpeed: 5000,
                variableWidth: true,
            });
        }
        
        
        // ## Food Category Two
        if ($('.fc-two-active').length) {
            $('.fc-two-active').slick({
                infinite: true,
                speed: 400,
                arrows: false,
                dots: true,
                focusOnSelect: true,
                autoplay: true,
                autoplaySpeed: 5000,
                slidesToShow: 5,
                slidesToScroll: 2,
                responsive: [
                    {
                        breakpoint: 1200,
                        settings: {
                            slidesToShow: 4,
                        }
                    },
                    {
                        breakpoint: 991,
                        settings: {
                            slidesToShow: 3,
                        }
                    },
                    {
                        breakpoint: 767,
                        settings: {
                            slidesToShow: 2,
                        }
                    },
                    {
                        breakpoint: 480,
                        settings: {
                            slidesToShow: 1,
                            slidesToScroll: 1,
                        }
                    }
                ]
            });
        }
        
        
        // ## Why Choose Us Carousel
        if ($('.why-choose-carousel').length) {
            $('.why-choose-carousel').slick({
                infinite: true,
                speed: 400,
                arrows: false,
                dots: false,
                focusOnSelect: true,
                autoplay: true,
                autoplaySpeed: 5000,
                variableWidth: true,
            });
        }
        
        
        // ## Client Active
        if ($('.client-active').length) {
            $('.client-active').slick({
                slidesToShow: 6,
                slidesToScroll: 1,
                infinite: true,
                speed: 400,
                arrows: false,
                dots: false,
                focusOnSelect: true,
                autoplay: true,
                autoplaySpeed: 5000,
                responsive: [
                    {
                        breakpoint: 1300,
                        settings: {
                            slidesToShow: 5,
                        }
                    },
                    {
                        breakpoint: 1200,
                        settings: {
                            slidesToShow: 4,
                        }
                    },
                    {
                        breakpoint: 991,
                        settings: {
                            slidesToShow: 3,
                        }
                    },
                    {
                        breakpoint: 575,
                        settings: {
                            slidesToShow: 2,
                            slidesToScroll: 1,
                        }
                    }
                ]
            });
        }
        
        
        // ## Widget Gallery Popup 
        $('.instagram-item a').magnificPopup({
            type: 'image',
            gallery: {
                enabled: true,
                navigateByImgClick: true,
            },
        });
        
        
         /* ## Fact Counter + Text Count - Our Success */
        if ($('.counter-text-wrap').length) {
            $('.counter-text-wrap').appear(function () {
                
                var $t = $(this),
                    n = $t.find(".count-text").attr("data-stop"),
                    r = parseInt($t.find(".count-text").attr("data-speed"), 10);

                if (!$t.hasClass("counted")) {
                    $t.addClass("counted");
                    $({
                        countNum: $t.find(".count-text").text()
                    }).animate({
                        countNum: n
                    }, {
                        duration: r,
                        easing: "linear",
                        step: function () {
                            $t.find(".count-text").text(Math.floor(this.countNum));
                        },
                        complete: function () {
                            $t.find(".count-text").text(this.countNum);
                        }
                    });
                }

            }, {
                accY: 0
            });
        }
        

        /* ## History Progress */
		if ($.fn.circleProgress) {
			var progressOne = $('.history-progress.one')
			if($.fn.circleProgress) {
			  progressOne.appear(function () {
				progressOne.circleProgress({
					value: 0.85,
					size: 120,
                    thickness: 4,
					fill: "#EC3D08",
                    lineCap: 'round',
					emptyFill: "rgba(236, 61, 8, 0.2)",
                    startAngle: -Math.PI / 4 * 2,
					animation : { duration: 2000},
				  }).on('circle-animation-progress', function(event, progress) {
					$(this).find('.counting').html(Math.round(95 * progress) + '<span>%</span>');
				  });
			  });
			};
		};
		if ($.fn.circleProgress) {
			var progressTwo = $('.history-progress.two')
			if($.fn.circleProgress) {
			  progressTwo.appear(function () {
				progressTwo.circleProgress({
					value: 0.78,
					size: 120,
                    thickness: 4,
					fill: "#EC3D08",
                    lineCap: 'round',
					emptyFill: "rgba(236, 61, 8, 0.2)",
                    startAngle: -Math.PI / 4 * 2,
					animation : { duration: 2000},
				  }).on('circle-animation-progress', function(event, progress) {
					$(this).find('.counting').html(Math.round(78 * progress) + '<span>%</span>');
				  });
			  });
			};
		};
        
		if ($.fn.circleProgress) {
			var progressThree = $('.history-progress.three')
			if($.fn.circleProgress) {
			  progressThree.appear(function () {
				progressThree.circleProgress({
					value: 0.98,
					size: 120,
                    thickness: 4,
					fill: "#EC3D08",
                    lineCap: 'round',
					emptyFill: "rgba(236, 61, 8, 0.2)",
                    startAngle: -Math.PI / 4 * 2,
					animation : { duration: 2000},
				  }).on('circle-animation-progress', function(event, progress) {
					$(this).find('.counting').html(Math.round(98 * progress) + '<span>%</span>');
				  });
			  });
			};
		};
        
        
        // ## Gallery Filter
        $('.gallery-active').imagesLoaded(function () {
			var items = $('.gallery-active').isotope({
				itemSelector: '.item',
				percentPosition: true,
			});
			// items on button click
			$('.gallery-nav li').on('click', 'button', function () {
				var filterValue = $(this).attr('data-filter');
				items.isotope({
					filter: filterValue
				});
			});
			// menu active class
			$('.gallery-nav li button').on('click', function (event) {
				$('.gallery-nav li button').removeClass('active');
				$(this).addClass('active');
				event.preventDefault();
			});
		});
        
        
        
        // ## Products Filter
        $('.product-filter-active').imagesLoaded(function () {
			var items = $('.product-filter-active').isotope({
				itemSelector: '.item',
				percentPosition: true,
			});
			// items on button click
			$('.product-filter-nav li').on('click', this, function () {
				var filterValue = $(this).attr('data-filter');
				items.isotope({
					filter: filterValue
				});
			});
			// menu active class
			$('.product-filter-nav li').on('click', function (event) {
				$('.product-filter-nav li').removeClass('active');
				$(this).addClass('active');
				event.preventDefault();
			});
		});
        
        
        // ## Price Range Fliter jQuery UI
        if ($('.price-slider-range').length) {
            $(".price-slider-range").slider({
                range: true,
                min: 5,
                max: 1000,
                values: [100, 750],
                slide: function (event, ui) {
                    $("#price").val("$ " + ui.values[0] + " - $ " + ui.values[1]);
                }
            });
            $("#price").val("$ " + $(".price-slider-range").slider("values", 0) +
                " - $ " + $(".price-slider-range").slider("values", 1));
        }
        
        
        // ## Quantity Number js
        $('.quantity-down').on('click', function(){
            var numProduct = Number($(this).next().val());
            if(numProduct > 1) $(this).next().val(numProduct - 1);
        });
        $('.quantity-up').on('click', function(){
            var numProduct = Number($(this).prev().val());
            $(this).prev().val(numProduct + 1);
        });
        
        
        // ## Scroll to Top
        if ($('.scroll-to-target').length) {
            $(".scroll-to-target").on('click', function () {
                var target = $(this).attr('data-target');
                // animate
                $('html, body').animate({
                    scrollTop: $(target).offset().top
                }, 1000);

            });
        }
        
        
        // ## Nice Select
        $('select').niceSelect();
        
        
        // ## AOS Animation
        AOS.init();
        
 
    });
    
    
    /* ==========================================================================
       When document is resize, do
    ========================================================================== */

    $(window).on('resize', function () {
        var mobileWidth = 992;
        var navcollapse = $('.navigation li.dropdown');
        navcollapse.children('ul').hide();
        navcollapse.children('.megamenu').hide();

    });


    /* ==========================================================================
       When document is scroll, do
    ========================================================================== */

    $(window).on('scroll', function () {

        // Header Style and Scroll to Top
        function headerStyle() {
            if ($('.main-header').length) {
                var windowpos = $(window).scrollTop();
                var siteHeader = $('.main-header');
                var scrollLink = $('.scroll-top');
                if (windowpos >= 100) {
                    siteHeader.addClass('fixed-header');
                    scrollLink.fadeIn(300);
                } else {
                    siteHeader.removeClass('fixed-header');
                    scrollLink.fadeOut(300);
                }
            }
        }

        headerStyle();

    });

    /* ==========================================================================
       When document is loaded, do
    ========================================================================== */

    $(window).on('load', function () {

        // ## Preloader
        function handlePreloader() {
            if ($('.preloader').length) {
                $('.preloader').delay(200).fadeOut(500);
            }
        }
        handlePreloader();
        
    });

})(window.jQuery);
