(function ($) {
	"use strict";
	
	var wekalaApp = {
		/* ---------------------------------------------
		    ## Content Loading
		--------------------------------------------- */	
		contentLoading: function() {
			$("body").imagesLoaded( function() {
				$('.preloader').delay(2000).fadeOut('slow');
				setTimeout(function() {
				    //After 2s, the no-scroll class of the body will be removed
				    $('body').removeClass('no-scroll');
					$("body").addClass("loading-done");
				}, 2000); //Here you can change preloader time

				// Page Animation Script
				$("[data-animate]").scrolla({
				    mobile: true,
				    once: true
				});
                
                $(".reveal-left:not(.in), .reveal-right:not(.in)").each(function(i) {
                    var $this = $(this);
                    $this.isInViewport(function(status) {
                        if (status === "entered") {
                            setTimeout(function () {
                                $this.addClass("in");
                            }, i* 50);
                        } else {
                            setTimeout(function () {
                                $this.removeClass("in");
                            }, i* 50);
                        }
                    });
                });
			});
		},	
        
        /* ---------------------------------------------
            ## Scroll top
        --------------------------------------------- */
        scroll_top: function () {
            $("body").append("<a href='#top' id='scroll-top' class='topbutton btn-hide'><span class='fa fa-angle-double-up'></span></a>");
            var $scrolltop = $('#scroll-top');
            $(window).on('scroll', function () {
                if ($(this).scrollTop() > $(this).height()) {
                    $scrolltop
                        .addClass('btn-show')
                        .removeClass('btn-hide');
                } else {
                    $scrolltop
                        .addClass('btn-hide')
                        .removeClass('btn-show');
                }
            });
            $("a[href='#top']").on('click', function () {
                $("html, body").animate({
                    scrollTop: 0
                }, "normal");
                return false;
            });
        },
        
        /*-------------------------------------------
            ## Sticky Header
        --------------------------------------------- */
        sticky_header: function() {
            if ($('#sticky-header').length) {
                var stickyMenu = $('.site-header').clone().appendTo('#sticky-header');
                $(window).on('scroll', function() {
                    var w = $(window).width();
                    if (w > 1200) {
                        if ($(this).scrollTop() > 350) {
                            $('#sticky-header').slideDown(500);
                        } else {
                            $('#sticky-header').slideUp(500);
                        }
                    }
                });
            } 
        },
        
		/* ---------------------------------------------
		    ## One Page Menu Script
		--------------------------------------------- */
		onePageMenu: function() {
            $('.mainmenu > li > a').on('click', function(e){
                var anchor = $(this);
                $('html, body').stop().animate({
                    scrollTop: $(anchor.attr('href')).offset().top - 165
                }, 1200);
                e.preventDefault();
            });
		},
        
        
		/* ---------------------------------------------
		    ## Menu Script
		--------------------------------------------- */
		menu_script: function() {
            if($('.mainmenu').find('li > a').siblings('.sub-menu')){
                $('.mainmenu li > .sub-menu').siblings('a').append("<span class='menu-arrow fa fa-angle-down'></span>");
            }
			var $submenu = $('.mainmenu').find('li').has('.sub-menu');
			$submenu.prepend("<span class='menu-click'><i class='menu-arrow fa fa-plus'></i></span>");
			var $mobileSubMenuOpen = $(".menu-click");
			$mobileSubMenuOpen.each(function() {
				var $self = $(this);
				$self.on("click", function(e) {
					e.stopImmediatePropagation();
				    $self.siblings(".sub-menu").slideToggle("slow");
				    $self.children(".menu-arrow").toggleClass("menu-extend");
                    
                    $(".site-header").toggleClass("sidemenu-active");
				});
			});

			//hamburger Menu
            if ($('.hamburger-menus').length) {
                var $hamburger_link = $('.hamburger-menus');
                $hamburger_link.on('click', function(e) {
                    e.preventDefault();
                    $(this).toggleClass('click-menu');
                    $(this).next().toggleClass('menuopen');
                });

                var $overlayClose = $('.overlaybg');
                $overlayClose.on('click', function(e) {
                    e.preventDefault();
                    $(this).parent().removeClass('menuopen');
                    $(this).parent().siblings('.hamburger-menus').removeClass('click-menu');
                });

                var el = document.querySelector('.site-navigation .navigation');
                if(el.length) {
                    SimpleScrollbar.initEl(el);
                }

                var menuelem = $('.hamburger-content .menu-block');
                var delay_count = 0;
                menuelem.find('ul.mainmenu > li').each(function(){
                    $(this).css('transition-delay', (delay_count * 200) + 'ms');
                    delay_count++;
                });
            }
            /*-----------------------------------------------------------------
              Hamburger Menus Two
            -------------------------------------------------------------------*/
            if ($('.hamburger-menus-two').length) {
                $('.hamburger-menus-two').on('click', function() {
                    $(this).toggleClass('is-active');
                    $('.site-header.header-style-four').toggleClass('is-active');
                    $('html').toggleClass('is-scroll-disabled');
                    $('body').toggleClass('open');
                    $('.hamburger-wrapper').toggleClass('menu-show');
                    $('.ef-background').addClass('animated').one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', 
                    function(){
                        $(this).removeClass('animated');
                    });
                });
                
                if ($('.hamburger-wrapper').length) {
                    var hamburger_scroll = document.querySelector('.hamburger-wrapper-inner');
                    SimpleScrollbar.initEl(hamburger_scroll);
                    
                    // Hovered link
                    $('.mainmenu-hamburger > li > a').wrapInner('<span></span>');
                    $('.mainmenu-hamburger > li > a').on('mouseenter', function(){
                        $('.mainmenu-hamburger').addClass('has-hovered-link');
                    });
                    $('.mainmenu-hamburger > li > a').on('mouseleave', function(){
                        $('.mainmenu-hamburger').removeClass('has-hovered-link');
                    });
                    
                    $('.hamburger-wrapper .mainmenu-hamburger li a').wrap('<div class="menu-inside"></div>');
                    var $submenuIndicatorHamburger = $('.hamburger-wrapper .mainmenu-hamburger').find('li').has('.sub-menu');
                        $submenuIndicatorHamburger.children('.menu-inside').append("<span class='menu-click'><i class='menu-arrow fas fa-arrow-right'></i></span>");

                    var $submenuHamburger = $('.hamburger-wrapper .mainmenu-hamburger').find('li .sub-menu');
                    $submenuHamburger.prepend("<li class='back-menu'><span class='back-click'><i class='menu-arrow fas fa-arrow-left'></i></span></li>");

                    var span = $('.hamburger-wrapper .mainmenu-hamburger li');
                    var main_menu = $('.hamburger-wrapper .mainmenu-hamburger');
                    var active_sub_menu = new TimelineMax({paused:true});
                    span.each(function() {
                        var _this = $(this).find('> .menu-inside > .menu-click'),
                            sub_menu = _this.parent().next('.sub-menu'),
                            sub_menu_back = sub_menu.find('>li:eq(0) .back-click'),
                            sub_menu_links = sub_menu.find('> li > .menu-inside > a'),
                            sub_tl = new TimelineMax({ 
                                paused:true, 
                            });

                        sub_tl
                            .set(main_menu, { minHeight: sub_menu.outerHeight() })
                            .to(main_menu, 0.5, { x:"-=100%" }, "start")
                            .to(_this.parents().siblings().find('>.menu-inside'), 0.5, { autoAlpha:0 }, "start")
                            .to(_this.parent(), 0.5, { autoAlpha:0 }, "start")
                            .to(sub_menu, 0.5, { autoAlpha: 1 }, "start")
                            .staggerTo(sub_menu_links, 0.2, { y:"0"}, 0.1, "start" );

                        _this.on('click', function() {
                            active_sub_menu = sub_tl;
                            sub_tl.play();
                            return false;
                        });

                        sub_menu_back.on('click', function() {
                            sub_tl.reverse();
                            return false;
                        });
                    });
                }
            }
		},		
            
		/* ---------------------------------------------
		    ## Pop Up Scripts
		 --------------------------------------------- */
		popupscript: function() {	
			function getScrollBarWidth () {
			    var $outer = $('<div>').css({visibility: 'hidden', width: 100, overflow: 'scroll'}).appendTo('body'),
			        widthWithScroll = $('<div>').css({width: '100%'}).appendTo($outer).outerWidth();
			    $outer.remove();
			    return 100 - widthWithScroll;
			}

			// Image Pop up
			var $popupImage = $(".popup-image");
			if ( $popupImage.length > 0 ) {
			    $popupImage.magnificPopup({
			        type:'image',
			        fixedContentPos: false,
			        gallery: { enabled:true },
			        removalDelay: 300,
			        mainClass: 'mfp-fade',
			        callbacks: {
			            // This prevenpt pushing the entire page to the right after opening Magnific popup image
			            open: function() {
			                $(".page-wrapper, .navbar-nav").css("margin-right", getScrollBarWidth());
			            },
			            close: function() {
			                $(".page-wrapper, .navbar-nav").css("margin-right", 0);
			            }
			        }
			    });
			}

			//Video Popup
			var $videoPopup = $(".video-popup");
			if ( $videoPopup.length > 0 ) {
			    $videoPopup.magnificPopup({
			        type: "iframe",
			        removalDelay: 300,
			        mainClass: "mfp-fade",
			        overflowY: "hidden",
			        iframe: {
			            markup: '<div class="mfp-iframe-scaler">'+
			            '<div class="mfp-close"></div>'+
			            '<iframe class="mfp-iframe" frameborder="0" allowfullscreen></iframe>'+
			            '</div>',
			            patterns: {
			                youtube: {
			                    index: 'youtube.com/',
			                    id: 'v=',
			                    src: '//www.youtube.com/embed/%id%?autoplay=1'
			                },
			                vimeo: {
			                    index: 'vimeo.com/',
			                    id: '/',
			                    src: '//player.vimeo.com/video/%id%?autoplay=1'
			                },
			                gmaps: {
			                    index: '//maps.google.',
			                    src: '%id%&output=embed'
			                }
			            },
			            srcAction: 'iframe_src'
			        }
			    });
			}
		},
        
		/* ---------------------------------------------
		    ## Isotope Activation
		 --------------------------------------------- */
		isotope_activation: function() {
			var IsoGriddoload = $('.portfolio-grid');
			IsoGriddoload.isotope({
			    itemSelector: '.item',
			    percentPosition: true,
			    layoutMode: 'packery',
			});

			var ProjMli = $('.portfolio-filter li a');
			var ProjGrid = $('.portfolio-grid');
			ProjMli.on('click', function(e) {
				e.preventDefault();
			    ProjMli.removeClass("active");
			    $(this).addClass("active");
			    var selector = $(this).attr('data-filter');
			    ProjGrid.isotope({
			        filter: selector,
			        animationOptions: {
			            duration: 750,
			            easing: 'linear',
			            queue: false,
			        }
			    });
			});
		},
        
        /* ---------------------------------------------
            ## Promo Numbers
         --------------------------------------------- */
        promo_numbers: function() {
            $(".hg-promo-numbers").each(function () {
                $(this).isInViewport(function(status) {
                    if (status === "entered") {
                        for( var i=0; i < document.querySelectorAll(".odometer").length; i++ ){
                            var el = document.querySelectorAll('.odometer')[i];
                            el.innerHTML = el.getAttribute("data-odometer-final");
                        }
                    }
                });
            });
        },  
		
		/* ---------------------------------------------
		    ## Content Video Responsive
		 --------------------------------------------- */
		content_video: function() {
			var $postVideo = $('.blog-single-page');
			$postVideo.fitVids();
		},		
        
         /* ---------------------------------------------
            ## Brands Carousel
         --------------------------------------------- */
        project_slider: function() {
            if ($('.project-slider-area').length) {
                $('.project-slider-area').owlCarousel({
                    center: false,
                    items: 1,
                    autoplay: false,
                    autoplayTimeout: 10000,
                    smartSpeed: 1200,
                    margin: 0,
                    singleItem: false,
                    loop: true,
                    nav: true,
                    dots: false,
                    navText: ["<span class='icon-arrow-back-left-'></span> Prev", "Next <span class='icon-arrow-forward-ne1'></span>"],
                });  
            }
        },	
        
         /* ---------------------------------------------
            ## Brands Carousel
         --------------------------------------------- */
        brands_carousel: function() {
            if ($('.brands-carousel').length) {
                var items = 4;
                $('.brands-carousel').owlCarousel({
                    center: false,
                    items: items,
                    autoplay: true,
                    autoplayTimeout: 5000,
                    smartSpeed: 700,
                    margin: 0,
                    singleItem: false,
                    loop: true,
                    nav: false,
                    dots: false,
                    responsive: {
                        280: {
                            items: 1
                        },
                        500: {
                            items: 2
                        },
                        768: {
                            items: 2
                        },
                        992: {
                            items: 3
                        },
                        1200: {
                            items: items
                        }
                    }
                });  
            }
        },
        
         /* ---------------------------------------------
            ## Team Member Carousel
         --------------------------------------------- */
        member_carousel: function() {
            var $member_items = $('#team-member-carousel');
            var items = 3;
            if ($member_items.length) {
                $member_items.owlCarousel({
                    center: false,
                    items: items,
                    autoplay: false,
                    autoplayTimeout: 5000,
                    margin: 30,
                    singleItem: false,
                    smartSpeed: 700,
                    loop: true,
                    nav: false,
                    dots: false,
                    responsive: {
                        280: {
                            items: 1
                        },
                        576: {
                            items: 2
                        },
                        768: {
                            items: 2
                        },
                        992: {
                            items: 3
                        },
                        1200: {
                            items: items
                        }
                    }
                });  
            }
            $('.team-block .btn-links-area .btn-prev').on('click',function() {
                $member_items.trigger('prev.owl.carousel');
            });
            $('.team-block .btn-links-area .btn-next').on('click',function() {
                $member_items.trigger('next.owl.carousel');
            });
        },
        
		/* ---------------------------------------------
            ## Innovation Carousel
		--------------------------------------------- */
		innovationCarousel: function() {
            var $innovationrCarousel = $("#innovation-carousel");
            
			if( $innovationrCarousel.length ){
			    $innovationrCarousel.each(function() {

			        var items = parseInt( $(this).attr("data-owl-items"), 10);
			        if( !items ) items = 1;

			        var nav = parseInt( $(this).attr("data-owl-nav"), 2);
			        if( !nav ) nav = 0;

			        var dots = parseInt( $(this).attr("data-owl-dots"), 2);
			        if( !dots ) dots = 0;

			        var center = parseInt( $(this).attr("data-owl-center"), 2);
			        if( !center ) center = 0;

			        var loop = parseInt( $(this).attr("data-owl-loop"), 2);
			        if( !loop ) loop = 0;

			        var margin = parseInt( $(this).attr("data-owl-margin"), 10);
			        if( !margin ) margin = 0;

			        var autoWidth = parseInt( $(this).attr("data-owl-auto-width"), 2);
			        if( !autoWidth ) autoWidth = 0;

			        var navContainer = $(this).attr("data-owl-nav-container");
			        if( !navContainer ) navContainer = 0;

			        var autoplay = parseInt( $(this).attr("data-owl-autoplay"), 2);
			        if( !autoplay ) autoplay = 0;

			        var autoplayTimeOut = parseInt( $(this).attr("data-owl-autoplay-timeout"), 10);
			        if( !autoplayTimeOut ) autoplayTimeOut = 5000;

			        var autoHeight = parseInt( $(this).attr("data-owl-auto-height"), 2);
			        if( !autoHeight ) autoHeight = 0;

			        var animationIn = $(this).attr("data-owl-anim-in");
			        if( !animationIn ) animationIn = 0;
			        else animationIn = $(this).attr("data-owl-anim-in");	        

			        var animationOut = $(this).attr("data-owl-anim-out");
			        if( !animationOut ) animationOut = 0;
			        else animationOut = $(this).attr("data-owl-anim-out");


			        if( $("body").hasClass("rtl") ) var rtl = true;
			        else rtl = false;

			        if( items === 5 || items === 4 ){
			            $(this).owlCarousel({
			                navContainer: navContainer,
			                animateOut: animationOut,
			                animateIn: animationIn,
			                autoplayTimeout: autoplayTimeOut,
			                autoplay: autoplay,
			                autoHeight: autoHeight,
			                center: center,
			                loop: loop,
			                margin: margin,
			                autoWidth: autoWidth,
			                items: 1,
                            smartSpeed: 700,
			                autoplayHoverPause: 1,
			                nav: nav,
			                dots: dots,
			                rtl: rtl,
			                navText: [],
			                responsive: {
                                280: {
                                    items: 1
                                },
                                576: {
                                    items: 2
                                },
                                768: {
                                    items: 2
                                },
                                992: {
                                    items: 3
                                },
                                1200: {
                                    items: items
                                },
                                1366: {
			                        items: items
			                    }
                            }
			            });
			        }
                    else if ( items === 2 ) {
			            $(this).owlCarousel({
			                navContainer: navContainer,
			                animateOut: animationOut,
			                animateIn: animationIn,
			                autoplayTimeout: autoplayTimeOut,
			                autoplay: autoplay,
			                autoHeight: autoHeight,
			                center: center,
			                loop: loop,
			                margin: margin,
			                autoWidth: autoWidth,
			                items: items,
                            smartSpeed: 700,
			                autoplayHoverPause: 1,
			                nav: nav,
			                dots: dots,
			                rtl: rtl,
			                navText: [],
			                responsive: {
			                    280: {
                                    items: 1
                                },
                                600: {
                                    items: 2
                                },
                                768: {
                                    items: 2
                                },
                                992: {
                                    items: 2
                                },
                                1200: {
                                    items: items
                                },
                                1366: {
			                        items: items
			                    }
			                }
			            });
			        }
			        else {
                        $(this).owlCarousel({
			                navContainer: navContainer,
			                animateOut: animationOut,
			                animateIn: animationIn,
			                autoplayTimeout: autoplayTimeOut,
			                autoplay: 1,
			                autoHeight: autoHeight,
			                center: center,
			                loop: loop,
			                margin: margin,
			                autoWidth: autoWidth,
			                items: 1,
			                autoplayHoverPause: 1,
                            smartSpeed: 700,
			                nav: nav,
			                dots: dots,
			                rtl: rtl,
			                navText: []
			            });
			        }

			        if( $(this).find(".owl-item").length === 1 ){
			            $(this).find(".owl-nav").css( { "opacity": 0,"pointer-events": "none"} );
			        }

			    });
			}
            $('.innovation-block .btn-links-area .btn-prev').on('click', function() {
                $innovationrCarousel.trigger('prev.owl.carousel');
            });
            $('.innovation-block .btn-links-area .btn-next').on('click', function() {
                $innovationrCarousel.trigger('next.owl.carousel');
            });
		},
        
        /* ---------------------------------------------
		    ## Testimonial Carousel
		 --------------------------------------------- */
		testimonial_carousel: function() {
            var slideMain  = $(".testimonial-slick-wrapper");
            var titleSubs  = slideMain.find("slick-active");

            if (slideMain.length) {
                slideMain.slick({
                    autoplay: false,
                    arrows: false,
                    dots: false,
                    slidesToShow: 3,
                    centerPadding: "0px",
                    draggable: true,
                    infinite: true,
                    centerMode: true,
                    pauseOnHover: false,
                    swipe: false,
                    touchMove: false,
                    vertical: true,
                    speed: 1000,
                    autoplaySpeed: 3000,
                    useTransform: true,
                    cssEase: 'cubic-bezier(0.645, 0.045, 0.355, 1.000)',
                    adaptiveHeight: true,
                });

                // On init
                $(".slick-slide-item").each(function(index, el) {
                       $(".testimonial-slick-wrapper").slick('slickAdd', "<div>" + el.innerHTML + "</div>");
                });
                
                $('.testimonial-block .btn-links-area .btn-prev').on('click', function() {
                    slideMain.slick('slickPrev');
                });
                $('.testimonial-block .btn-links-area .btn-next').on('click', function() {
                    slideMain.slick('slickNext');
                });
                // Manually refresh positioning of slick
                slideMain.slick('slickPlay');
            };
		},
        
		/* ---------------------------------------------
		    ## Sidebar Script
		--------------------------------------------- */
		sidebarScript: function() {
			if ($('.sidebar-items').length) {
                $('.sidebar-items').theiaStickySidebar({
                    'containerSelector': '.blog-page-block',
                    'additionalMarginTop': 0,
                    'minWidth': 992,
                });
            } 
			if ($('.portfolio-details-sticky').length) {
                $('.portfolio-details-sticky').theiaStickySidebar({
                    'containerSelector': '.portfolio-sticky',
                    'additionalMarginTop': 135,
                    'minWidth': 992,
                });
            } 
		},	
        	

		/* ---------------------------------------------
		    ## Contact Form Script
		--------------------------------------------- */
		contactFormScript: function() {
			$(".hg-form-email [type='submit']").each(function(){
			    var text = $(this).text();
			    $(this).html("").append("<span>"+ text +"</span>").prepend("<div class='status'><i class='fas fa-circle-notch fa-spin spinner'></i></div>");
			});

			$(".hg-form-email [type='submit']").on("click", function(e){
			    var $button = $(this);
			    var $form = $(this).closest("form");
			    var pathToPhp = $(this).closest("form").attr("data-php-path");
			    $form.validate({
			        submitHandler: function() {
			            $button.addClass("processing");
			            $.post( pathToPhp, $form.serialize(),  function(response) {
			                $button.addClass("done").find(".status").append(response).prop("disabled", true);
			            });
			            return false;
			        }
			    });
			});

			$("form:not(.hg-form-email)").each(function(){
			    $(this).validate();
			});
		},
		/* ---------------------------------------------
		 function initializ
		 --------------------------------------------- */
		initializ: function() {
			wekalaApp.scroll_top();
			wekalaApp.sticky_header();
			wekalaApp.onePageMenu();
			wekalaApp.menu_script();
            wekalaApp.popupscript();
            wekalaApp.promo_numbers();
			wekalaApp.content_video();
			wekalaApp.project_slider();
			wekalaApp.brands_carousel();
			wekalaApp.member_carousel();
			wekalaApp.innovationCarousel();
            wekalaApp.testimonial_carousel();
            wekalaApp.sidebarScript();
			wekalaApp.contactFormScript();
		}
	};
	/* ---------------------------------------------
	 Document ready function
	 --------------------------------------------- */
	$(function() {
		wekalaApp.initializ();
	});

	$(window).on('load', function() {
		wekalaApp.contentLoading();
		wekalaApp.isotope_activation();
	});
})(jQuery);
