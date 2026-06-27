/* ===================================================================
    
    Author          : Valid Theme
    Template Name   : Restan - Food & Restaurant HTML Template 
    Version         : 1.0
    
* ================================================================= */
(function($) {
	"use strict";

	$(document).ready(function() {

		/* ==================================================
		    # Tooltip Init
		===============================================*/
		$('[data-toggle="tooltip"]').tooltip();


		/* ==================================================
		    # Youtube Video Init
		 ===============================================*/
		$('.player').mb_YTPlayer();


		/* ==================================================
		    # Scrolla active
		===============================================*/
		$('.animate').scrolla({
			// default
			mobile: false, // disable animation on mobiles
		});


		/* ==================================================
		    # imagesLoaded active
		===============================================*/
		$('#gallery-masonary,.blog-masonry').imagesLoaded(function() {

			/* Filter menu */
			$('.mix-item-menu').on('click', 'button', function() {
				var filterValue = $(this).attr('data-filter');
				$grid.isotope({
					filter: filterValue
				});
			});

			/* filter menu active class  */
			$('.mix-item-menu button').on('click', function(event) {
				$(this).siblings('.active').removeClass('active');
				$(this).addClass('active');
				event.preventDefault();
			});

			/* Filter active */
			var $grid = $('#gallery-masonary').isotope({
				itemSelector: '.gallery-item',
				percentPosition: true,
				masonry: {
					columnWidth: '.gallery-item',
				}
			});

			/* Filter active */
			$('.blog-masonry').isotope({
				itemSelector: '.blog-item',
				percentPosition: true,
				masonry: {
					columnWidth: '.blog-item',
				}
			});

		});


		/* ==================================================
		    # Fun Factor Init
		===============================================*/
		$('.timer').countTo();
		$('.fun-fact').appear(function() {
			$('.timer').countTo();
		}, {
			accY: -100
		});
		

		/* ==================================================
		    # Magnific popup init
		 ===============================================*/
		$(".popup-link").magnificPopup({
			type: 'image',
			// other options
		});

		$(".popup-gallery").magnificPopup({
			type: 'image',
			gallery: {
				enabled: true
			},
			// other options
		});

		$(".popup-youtube, .popup-vimeo, .popup-gmaps").magnificPopup({
			type: "iframe",
			mainClass: "mfp-fade",
			removalDelay: 160,
			preloader: false,
			fixedContentPos: false
		});

		$('.magnific-mix-gallery').each(function() {
			var $container = $(this);
			var $imageLinks = $container.find('.item');

			var items = [];
			$imageLinks.each(function() {
				var $item = $(this);
				var type = 'image';
				if ($item.hasClass('magnific-iframe')) {
					type = 'iframe';
				}
				var magItem = {
					src: $item.attr('href'),
					type: type
				};
				magItem.title = $item.data('title');
				items.push(magItem);
			});

			$imageLinks.magnificPopup({
				mainClass: 'mfp-fade',
				items: items,
				gallery: {
					enabled: true,
					tPrev: $(this).data('prev-text'),
					tNext: $(this).data('next-text')
				},
				type: 'image',
				callbacks: {
					beforeOpen: function() {
						var index = $imageLinks.index(this.st.el);
						if (-1 !== index) {
							this.goTo(index);
						}
					}
				}
			});
		});


		/* ==================================================
		    _Progressbar Init
		 ===============================================*/
		function animateElements() {
			$('.progressbar').each(function() {
				var elementPos = $(this).offset().top;
				var topOfWindow = $(window).scrollTop();
				var percent = $(this).find('.circle').attr('data-percent');
				var animate = $(this).data('animate');
				if (elementPos < topOfWindow + $(window).height() - 30 && !animate) {
					$(this).data('animate', true);
					$(this).find('.circle').circleProgress({
						// startAngle: -Math.PI / 2,
						value: percent / 100,
						size: 130,
						thickness: 13,
						lineCap: 'round',
						emptyFill: '#f1f1f1',
						fill: {
							gradient: ['#2667FF', '#6c19ef']
						}
					}).on('circle-animation-progress', function(event, progress, stepValue) {
						$(this).find('strong').text((stepValue * 100).toFixed(0) + "%");
					}).stop();
				}
			});

		}

		animateElements();
		$(window).scroll(animateElements);


		/* ==================================================
            # Hover Active Init
        ===============================================*/
        $('.best-food-style-one').on('mouseenter', function() {
			var $this;
            $this = $(this);
			if ($this.hasClass('active')) {
				$this.addClass('active');
			} else {
				$this.addClass('active');
				$this.siblings().removeClass('active');
			}	
		})


		/* ==================================================
            # Banner Carousel
         ===============================================*/
		const bannerFade = new Swiper(".banner-fade", {
			// Optional parameters
			direction: "horizontal",
			loop: true,
			autoplay: true,
			effect: "fade",
			fadeEffect: {
				crossFade: true
			},
			speed: 3000,
			autoplay: {
				delay: 5000,
				disableOnInteraction: false,
			},

			// If we need pagination
			pagination: {
				el: '.swiper-pagination',
				type: 'bullets',
				clickable: true,
			},

			// Navigation arrows
			navigation: {
				nextEl: ".swiper-button-next",
				prevEl: ".swiper-button-prev"
			}

			// And if we need scrollbar
			/*scrollbar: {
            el: '.swiper-scrollbar',
          },*/
		});


		/* ==================================================
            # Brand Carousel
         ===============================================*/
		 const brandCarousel = new Swiper(".brand-style-one-carousel", {
			// Optional parameters
			loop: true,
			slidesPerView: 2,
			spaceBetween: 30,
			autoplay: true,
			pagination: {
				el: ".swiper-pagination",
				clickable: true,
			},
			// Navigation arrows
			navigation: {
				nextEl: ".swiper-button-next",
				prevEl: ".swiper-button-prev"
			},
			breakpoints: {
				768: {
					slidesPerView: 3,
					spaceBetween: 30,
				},
				992: {
					slidesPerView: 4,
					spaceBetween: 30,
				},
				1400: {
					slidesPerView: 5,
					spaceBetween: 30,
				}
			},
		});


		/* ==================================================
            # Food Category Carousel
         ===============================================*/
		 const foodCatCarousel = new Swiper(".food-cat-carousel", {
			// Optional parameters
			loop: true,
			slidesPerView: 1,
			spaceBetween: 30,
			autoplay: true,
			pagination: {
				el: ".swiper-pagination",
				clickable: true,
			},
			// Navigation arrows
			navigation: {
				nextEl: ".food-cat-next",
				prevEl: ".food-cat-prev"
			},
			breakpoints: {
				768: {
					slidesPerView: 2,
					spaceBetween: 30,
				},
				992: {
					slidesPerView: 3,
					spaceBetween: 30,
				}
			},
		});


		/* ==================================================
            # Gallery Carousel
         ===============================================*/
		const galleryCarousel = new Swiper(".gallery-style-one-carousel", {
			// Optional parameters
			loop: true,
			freeMode: true,
			grabCursor: true,
			slidesPerView: 1,
			spaceBetween: 50,
			autoplay: true,
			pagination: {
				el: ".swiper-pagination",
				clickable: true,
			},
			breakpoints: {
				778: {
					slidesPerView: 2,
				},
				1200: {
					slidesPerView: 2.5,
					centeredSlides: true,
				},
			},
		});


		/* ==================================================
            # Testimonials Carousel
         ===============================================*/
		const testimonialCarousel = new Swiper(".testimonial-carousel", {
			// Optional parameters
			direction: "horizontal",
			loop: true,
			autoplay: true,
			pagination: {
				el: ".swiper-pagination",
				clickable: true,
			},

			// And if we need scrollbar
			/*scrollbar: {
            el: '.swiper-scrollbar',
          },*/
		});


		/* ==================================================
            # Food Menu Carousel
         ===============================================*/
		 const foodMenuCarousel = new Swiper(".food-menu-carousel", {
			// Optional parameters
			loop: true,
			slidesPerView: 1,
			spaceBetween: 30,
			autoplay: false,
			pagination: {
				el: ".swiper-pagination",
				clickable: true,
			},
			// Navigation arrows
			navigation: {
				nextEl: ".swiper-button-next",
				prevEl: ".swiper-button-prev"
			},
			breakpoints: {
				768: {
					slidesPerView: 2,
					spaceBetween: 30,
				},
				992: {
					slidesPerView: 3,
					spaceBetween: 30,
				},
				1400: {
					slidesPerView: 4,
					spaceBetween: 30,
				},
			},
		});


		/* ==================================================
            # Services Style One Carousel
         ===============================================*/
		 const testimonialTwo = new Swiper(".services-style-one-carousel", {
			// Optional parameters
			loop: true,
			freeMode: true,
			grabCursor: true,
			slidesPerView: 1,
			spaceBetween: 50,
			autoplay: true,
			pagination: {
				el: ".swiper-pagination",
				clickable: true,
			},
			navigation: {
				nextEl: ".services-cat-next",
				prevEl: ".services-cat-prev"
			},
			breakpoints: {
				768: {
					slidesPerView: 2,
				},
				1200: {
					slidesPerView: 3,
				},
			},
		});
		

		/* ==================================================
            # Product Gallery Carousel
         ===============================================*/
		 const productGallery = new Swiper(".product-gallery-carousel", {
			// Optional parameters
			loop: true,
			slidesPerView: 2,
			spaceBetween: 30,
			autoplay: false,
			breakpoints: {
				768: {
					slidesPerView: 3,
				},
				992: {
					slidesPerView: 3,
				},
				1200: {
					slidesPerView: 4,
				},
			},
		});


		/* ==================================================
            # Related Product Carousel
         ===============================================*/
		 const relatedProduct = new Swiper(".related-product-carousel", {
			// Optional parameters
			loop: true,
			slidesPerView: 1,
			spaceBetween: 30,
			autoplay: true,
			breakpoints: {
				768: {
					slidesPerView: 2,
				},
				992: {
					slidesPerView: 3,
				},
				1400: {
					slidesPerView: 4,
				},
			},
		});


		/* ==================================================
		    Date Picker Init
		================================================== */
		$('.date-picker-one').datepicker()

		/* ==================================================


		Nice Select Init
		===============================================*/
		$('.reservation-form select').niceSelect();
		$('.checkout-form select').niceSelect();


		/* ==================================================
		    GSAP animation
		================================================== */

		let animateUpDown = document.querySelector(".upDownScrol");
		if (animateUpDown) {

			gsap.set(".upDownScrol", {
				yPercent: 105
			});
			gsap.to(".upDownScrol", {
				yPercent: -105,
				ease: "none",
				scrollTrigger: {
					trigger: ".upDownScrol",
					end: "bottom center",
					scrub: 1
				},
			});
		}


		/* ==================================================
		    Contact Form Validations
		================================================== */
		$('.contact-form').each(function() {
			var formInstance = $(this);
			formInstance.submit(function() {

				var action = $(this).attr('action');

				$("#message").slideUp(750, function() {
					$('#message').hide();

					$('#submit')
						.after('<img src="assets/img/ajax-loader.gif" class="loader" />')
						.attr('disabled', 'disabled');

					$.post(action, {
							name: $('#name').val(),
							email: $('#email').val(),
							phone: $('#phone').val(),
							comments: $('#comments').val()
						},
						function(data) {
							document.getElementById('message').innerHTML = data;
							$('#message').slideDown('slow');
							$('.contact-form img.loader').fadeOut('slow', function() {
								$(this).remove()
							});
							$('#submit').removeAttr('disabled');
						}
					);
				});
				return false;
			});
		});

	}); // end document ready function


	/* ==================================================
        Preloader Init
     ===============================================*/
	 function loader() {
		$(window).on('load', function() {
			$('#restan-preloader').addClass('loaded');
			$("#loading").fadeOut(500);
			// Una vez haya terminado el preloader aparezca el scroll

			if ($('#restan-preloader').hasClass('loaded')) {
				// Es para que una vez que se haya ido el preloader se elimine toda la seccion preloader
				$('#preloader').delay(900).queue(function() {
					$(this).remove();
				});
			}
		});
	}
	loader();



})(jQuery); // End jQuery