$(document).ready(function(){

	"use strict";
	
	/* =================================
	LOADER 
	=================================== */
	$(".loader").delay(400).fadeOut();
    $(".animationload").delay(400).fadeOut("fast");

    var bgi = $("[data-background]");
    bgi.length > 0 && bgi.each(function() {
    	var e = $(this),
    	t = e.attr('data-background');
    	e.css({'background-image': 'url(' + t + ')'});
    });

    var progressBar = $('.progress-bar');
    progressBar.length > 0 && progressBar.each(function() {
    	var e = $(this),
    	t = e.attr('aria-valuenow');
    	e.css({'width': t + '%'});
    });
	
	/* =================================
	NAVBAR 
	=================================== */
	var top = jQuery(document).scrollTop();
	var batas = 200;
	var navbar = jQuery('.navbar-main');
	var navbarnav = jQuery('.navbar-nav');
	var header = jQuery('.header');
	
	
	if ( top > batas ) {
		navbar.addClass('stiky');
		navbarnav.addClass('ml-auto');
	}
	jQuery(window).scroll(function () {
		top = jQuery(document).scrollTop();

		
		if ( top > batas ) {
			navbar.addClass('stiky');
		}else {
			navbar.removeClass('stiky'); 
			if(header.hasClass('header-2')){
				navbarnav.removeClass('ml-auto');
			}
			if(header.hasClass('header-5')){
				navbarnav.removeClass('ml-auto');
			}
		}

	});
	
	/* =================================
	BANNER ROTATOR IMAGE 
	=================================== */
	var slides = $(".full-screen"),
    b = slides.find('.item');
    b.each(function(){
        var e = $(this),
        ocImg = e.find('img').attr('src');
        e.css({'background-image': 'url(' + ocImg + ')'});
    });

    slides.owlCarousel({
	    // stagePadding: 50,
	    loop: true,
	    // margin: 10,
	    nav: false,
	    navText: [
	        '<i class="fa fa-angle-left" aria-hidden="true"></i>',
	        '<i class="fa fa-angle-right" aria-hidden="true"></i>'
	    ],
	    // navContainer: '.banner .custom-nav',
	    items: 1,
	})

	// Slide Thumbnail
	var slider = $(".carousel-full");
	var thumbnailSlider = $(".carousel-thumbs");
	var duration = 500;
	var syncedSecondary = true;

	var c = slider.find('.item');
    c.each(function(){
        var e = $(this),
        ocImg = e.find('img').attr('src');
        e.css({'background-image': 'url(' + ocImg + ')'});
    });

	slider
    .owlCarousel({
        loop: true,
        nav: true,
        navText: [
	        '<i class="fa fa-angle-left" aria-hidden="true"></i>',
	        '<i class="fa fa-angle-right" aria-hidden="true"></i>'
	    ],
        items: 1,
        lazyLoad: true,
        autoplay: true,
        smartSpeed: 600,
        autoplayHoverPause: true,
        dots: false,
        navContainer: '.banner .custom-nav',
        onInitialized  : counter,
        onTranslated : counter
    })
    .on("changed.owl.carousel", syncPosition);

    thumbnailSlider
    .on("initialized.owl.carousel", function() {
        thumbnailSlider
            .find(".owl-item")
            .eq(0)
            .addClass("current");
    })
    .owlCarousel({
        loop: false,
        nav: false,
        smartSpeed: 600,
        responsive: {
            0: {
                items: 4
            },
            600: {
                items: 6
            },
            1200: {
                items: 9
            }
        }
    })
    .on("changed.owl.carousel", syncPosition2);

	// on click thumbnaisl
	thumbnailSlider.on("click", ".owl-item", function(e) {
	    e.preventDefault();
	    var number = $(this).index();
	    slider.data("owl.carousel").to(number, 300, true);

	});

	function counter(event) {
	   var element   = event.target; 
	   var items     = event.item.count; 
	   var item      = event.item.index + 1; 
	  
	  if(item > items) {
	    item = item - items
	  }
	  // console.log(slider.find(".owl-item").eq(item).find("img").attr('title'));
	  $('#counter').html(slider.find(".owl-item").eq(event.item.index).find("img").attr('title'));
	}

	function syncPosition(el) {
	    var count = el.item.count - 1;
	    var current = Math.round(el.item.index - el.item.count / 2 - 0.5);

	    if (current < 0) {
	        current = count;
	    }
	    if (current > count) {
	        current = 0;
	    }
	   
	    thumbnailSlider
	        .find(".owl-item")
	        .removeClass("current")
	        .eq(current)
	        .addClass("current");
	    var onscreen = thumbnailSlider.find(".owl-item.active").length - 1;
	    var start = thumbnailSlider
	        .find(".owl-item.active")
	        .first()
	        .index();
	    var end = thumbnailSlider
	        .find(".owl-item.active")
	        .last()
	        .index();

	    if (current > end) {
	        thumbnailSlider.data("owl.carousel").to(current, 100, true);
	    }
	    if (current < start) {
	        thumbnailSlider.data("owl.carousel").to(current - onscreen, 100, true);
	    }
	}

	function syncPosition2(el) {
	    if (syncedSecondary) {
	        var number = el.item.index;
	        slider.data("owl.carousel").to(number, 100, true);
	    }
	}


	/* =================================
	BACK TO TOP 
	=================================== */
	// browser window scroll (in pixels) after which the "back to top" link is shown
	var offset = 300,
		//browser window scroll (in pixels) after which the "back to top" link opacity is reduced
		offset_opacity = 1200,
		//duration of the top scrolling animation (in ms)
		scroll_top_duration = 700,
		//grab the "back to top" link
		$back_to_top = $('.cd-top');

	//hide or show the "back to top" link
	$(window).scroll(function(){
		( $(this).scrollTop() > offset ) ? $back_to_top.addClass('cd-is-visible') : $back_to_top.removeClass('cd-is-visible cd-fade-out');
		if( $(this).scrollTop() > offset_opacity ) { 
			$back_to_top.addClass('cd-fade-out');
		}
	});

	//smooth scroll to top
	$back_to_top.on('click', function(event){
		event.preventDefault();
		$('body,html').animate({
			scrollTop: 0 ,
		 	}, scroll_top_duration
		);
	});
	

	/* =================================
	OWL
	=================================== */
	
	var caro = $("#caro");
	caro.owlCarousel({
		items: 1,
		autoplay: true,
		autoplayTimeout: 5000,
		autoplayHoverPause: true,
		loop: true,
	});	
	var caro2 = $("#caro-2");
	caro2.owlCarousel({
		autoplay: true,
		margin: 30,
		autoplayTimeout: 5000,
		autoplayHoverPause: true,
		items : 3,
		dots: true,
		loop: true,
		responsive:{
			0:{
				items:1
			},
			768:{
				items:2
			},
			1000:{
				items:3
			}
		}
	});
	var testimony = $("#testimonial");
	testimony.owlCarousel({
		items: 1,
		autoplay: true,
		autoplayTimeout: 5000,
		autoplayHoverPause: true,
		loop: true,
		animateIn: 'fadeIn',
        animateOut: 'fadeOut',
	});
	
	var testimony2 = $("#owl-testimony2");
	testimony2.owlCarousel({
		items: 1,
		autoplay: true,
		autoplayTimeout: 5000,
		autoplayHoverPause: true,
		navText: ["<span class='fa fa-chevron-left'></span>", "<span class='fa fa-chevron-right'></span>"],
		dots: true,
		loop: true
	});
	var caro_2_colm = $("#caro_2_colm");
	caro_2_colm.owlCarousel({
		autoplay: true,
		margin: 30,
		autoplayTimeout: 5000,
		autoplayHoverPause: true,
		dots: true,
		loop: true,
		nav: false,
		navText: ["<span class='fa fa-chevron-left'></span>", "<span class='fa fa-chevron-right'></span>"],
		items : 2,
		responsive:{
			0:{
				items:1
			},
			768:{
				items:2
			},
			1000:{
				items:2
			}
		}
	});
	var caro4 = $("#caro-4");
	caro4.owlCarousel({
		autoplay: true,
		autoplayTimeout: 5000,
		autoplayHoverPause: true,
		items : 4,
		dots: true,
		loop: true,
		responsive:{
			0:{
				items:1
			},
			768:{
				items:2
			},
			1000:{
				items:4
			}
		}
	});

	// edit
	var carousel_1 = $("#carousel-1");
	carousel_1.owlCarousel({
		items: 1,
		autoplay: true,
		autoplayTimeout: 5000,
		autoplayHoverPause: true,
		loop: true,
		animateIn: 'fadeIn',
        animateOut: 'fadeOut',
	});
	var carousel_2 = $("#carousel-2");
	carousel_2.owlCarousel({
		autoplay: true,
		margin: 30,
		autoplayTimeout: 5000,
		autoplayHoverPause: true,
		dots: true,
		loop: true,
		nav: false,
		items : 2,
		responsive:{
			0:{
				items:1
			},
			768:{
				items:2
			},
			1000:{
				items:2
			}
		}
	});
	var carousel_3 = $("#carousel-3");
	carousel_3.owlCarousel({
		autoplay: true,
		margin: 30,
		autoplayTimeout: 5000,
		autoplayHoverPause: true,
		items : 3,
		dots: true,
		loop: true,
		responsive:{
			0:{
				items:1
			},
			768:{
				items:2
			},
			1000:{
				items:3
			}
		}
	});
	
	/* =================================
	MAGNIFIC POPUP
	=================================== */
	$('.popup-youtube, .popup-vimeo, .popup-gmaps').magnificPopup({
      disableOn: 700,
      type: 'iframe',
      mainClass: 'mfp-fade',
      removalDelay: 160,
      preloader: false,

      fixedContentPos: false
    });

	$('.grid, .popup-gallery').magnificPopup({
	  delegate: 'a',
	  type: 'image',
	  tLoading: 'Loading image #%curr%...',
	  mainClass: 'mfp-img-mobile',
	  gallery: {
		enabled: true,
		navigateByImgClick: true,
		preload: [0,1]
	  },
	  image: {
		tError: '<a href="%url%">The image #%curr%</a> could not be loaded.',
		titleSrc: function(item) {
		  return item.el.attr('title') + '';
		}
	  }
	});

	/* =================================
	ISOTOP
	=================================== */	

	var $grid = $('.grid').isotope({
		itemSelector: '.grid-item',
		isFitWidth: true,
		masonry: {
			columnWidth: '.grid-sizer'
		}
	});

	$grid.imagesLoaded().progress( function() {
		$grid.isotope('layout');
	});

	var $gridv2 = $('.grid-v1');
	$gridv2.isotope({
		itemSelector: '.grid-item-v1',
		isFitWidth: true,
		filter: '*',
		masonry: {
			columnWidth: '.grid-sizer-v1'
		}
	});

	$gridv2.imagesLoaded().progress( function() {
		$gridv2.isotope('layout');
	});

	$('.portfolio_filter a').on('click', function() {
 		$('.portfolio_filter .active').removeClass('active');
		$(this).addClass('active');
 
		var selector = $(this).attr('data-filter');
		$gridv2.isotope({
			filter: selector,
			animationOptions: {
				duration: 500,
				animationEngine : "jquery"
			}
		});
		return false;
 	});


	
});




  
  