/* JavaScript Document */

var CafeZoneOwl = function(){
	
	var mainSlider = function(){
		jQuery('.main-slider').owlCarousel({
			loop:true,
			margin:0,
			nav:false,
			autoplay:true,
			autoplaySpeed: 2000,
			navSpeed: 2000,
			items:1,
			paginationSpeed: 2000,
			slideSpeed: 2000,
			dots: true,
			navText: ['<i class="la la-angle-left"></i>', '<i class="la la-angle-right"></i>'],
		});
	}

	var postSlider = function(){
		jQuery('.post-carousel').owlCarousel({
			loop:true,
			margin:30,
			nav:true,
			autoplaySpeed: 3000,
			navSpeed: 3000,
			paginationSpeed: 3000,
			slideSpeed: 3000,
			smartSpeed: 3000,
			autoplay: true,
			dots: true,
			responsive:{
				0:{
					items:1
				},
				600:{
					items:1
				},			
				
				767:{
					items:1
				},
				1200:{
					items:1
				}
			}
		})
	}
	
	var statusSlider = function(){
		if (jQuery('.status-swiper').length > 0) {
			var swiperTestimonial = new Swiper('.status-swiper', {
				loop: true,
				spaceBetween: 0,
				slidesPerView: "auto",
				speed: 1500,
				effect: "fade",
				//  autoplay: {
				//  	delay: 2000,
				//  },
				pagination: {
					el: ".status-pagination",
					clickable: true,
				},
			});
		}
	}
	
	/* Function ============ */
	return {
		init:function(){
			mainSlider();
			postSlider();
			statusSlider();
		},
		
		load:function(){
			
		},
		
		resize:function(){
			//alert(1);
			mainSlider();
		}
	}
}();

jQuery(document).ready(function() {
    'use strict';
	CafeZoneOwl.init();
	/* image-carousel no margin function by = owl.carousel.js */
	
	
});

/* Window Resize START */
jQuery(window).on('resize',function () {
	'use strict'; 
	
	setTimeout(function(){
		jQuery('.main-slider').data('owl.carousel')._invalidated.width = true;
		jQuery('.main-slider').trigger('refresh.owl.carousel');
	}, 2000); 
	
});
/*  Window Resize END */

/* Document .ready END */