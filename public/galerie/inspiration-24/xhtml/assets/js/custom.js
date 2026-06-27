/**
	Template Name 	 : swigo
	Author			 : DexignZone
	Version			 : 1.3
	Author Portfolio : https://themeforest.net/user/dexignzone/portfolio
	
	Core script to handle the entire theme and core functions
**/

var swigo = function(){
	'use strict';
	
	var screenWidth = $( window ).width();
	
	/* Home Search ============ */
	var handleHomeSearch = function() {
		/* top search in header on click function */
		var quikSearch = jQuery("#quik-search-btn");
		var quikSearchRemove = jQuery("#quik-search-remove");
		
		quikSearch.on('click',function() {
			jQuery('.dz-quik-search').fadeIn(500);
			jQuery('.dz-quik-search').addClass('On');
		});
		
		quikSearchRemove.on('click',function() {
			jQuery('.dz-quik-search').fadeOut(500);
			jQuery('.dz-quik-search').removeClass('On');
		});	
		/* top search in header on click function End*/
	}
	
	/* handle Bootstrap Touch Spin ============ */
	var handleBootstrapTouchSpin = function(){
		if($("input[name='demo_vertical2']").length > 0 ) {
			jQuery("input[name='demo_vertical2']").TouchSpin({
			  verticalbuttons: true,
			  verticalupclass: 'ti-plus',
			  verticaldownclass: 'ti-minus'
			});
		}
		if($(".quantity-input").length > 0 ) {
			jQuery(".quantity-input").TouchSpin({
			  verticalbuttons: true,
			  verticalupclass: 'ti-plus',
			  verticaldownclass: 'ti-minus'
			});
		}
	}
	
	/* Mini shop-filter Function*/
	var handleShopPannel = function(){
		$(".panel-btn").on('click',function(){
			$(".shop-filter").addClass('show');
		});
		$('.panel-close-btn').on('click',function(){
			$(".shop-filter").removeClass('show');
		})
	}
	
	/* Cart Function*/
	var cartButton = function(){
		$(".item-close").on('click',function(){
			$(this).closest(".cart-item").hide('500');
		});
		$('.cart-btn').unbind().on('click',function(){
			$(".cart-list").slideToggle('slow');
		})
		
	}
	
	/* Range ============ */
	var handleNouiSlider = function(){
		if($("#slider-tooltips").length > 0 ) {
			var tooltipSlider = document.getElementById('slider-tooltips');
			noUiSlider.create(tooltipSlider, {
				start: [10, 70],
				connect: true,
				tooltips: [wNumb({decimals: 1}), true],
				range: {
					'min': 0,
					'max': 100,
				}
			});
		}
	}

	/* Password Show / Hide */
	var handleShowPass = function(){
		jQuery('.show-pass').on('click',function(){
			var inputType = jQuery(this).parent().find('.dz-password');
			if(inputType.attr('type') == 'password')
			{
				inputType.attr('type', 'text');
				jQuery(this).addClass('active');
			}
			else
			{
				inputType.attr('type', 'password');
				jQuery(this).removeClass('active');
			}
		});
	}
	
	/* Load File ============ */
	var dzTheme = function(){
		if(screenWidth <= 991 ){
			jQuery('.navbar-nav > li > a, .sub-menu > li > a').unbind().on('click', function(e){
				if(jQuery(this).parent().hasClass('open'))
				{
					jQuery(this).parent().removeClass('open');
				}
				else{
					jQuery(this).parent().parent().find('li').removeClass('open');
					jQuery(this).parent().addClass('open');
				}
			});
		}
		
		jQuery('.menu-btn, .openbtn').on('click',function(){
			jQuery('.contact-sidebar').addClass('active');
		});
		jQuery('.menu-close').on('click',function(){
			jQuery('.contact-sidebar').removeClass('active');
			jQuery('.menu-btn').removeClass('open');
		});
		
	}
	
	/* Magnific Popup ============ */
	var MagnificPopup = function(){
		if(jQuery('.mfp-gallery').length > 0){
			/* magnificPopup function */
			jQuery('.mfp-gallery').magnificPopup({
				delegate: '.mfp-link',
				type: 'image',
				tLoading: 'Loading image #%curr%...',
				mainClass: 'mfp-img-mobile',
				gallery: {
					enabled: true,
					navigateByImgClick: true,
					preload: [0,1] // Will preload 0 - before current, and 1 after the current image
				},
				image: {
					tError: '<a href="%url%">The image #%curr%</a> could not be loaded.',
					titleSrc: function(item) {
						return item.el.attr('title') + '<small></small>';
					}
				}
			});
			/* magnificPopup function end */
		}
		
		if(jQuery('.mfp-video').length > 0){
			/* magnificPopup for Play video function */		
			jQuery('.mfp-video').magnificPopup({
				type: 'iframe',
				iframe: {
					markup: '<div class="mfp-iframe-scaler">'+
							'<div class="mfp-close"></div>'+
							'<iframe class="mfp-iframe" frameborder="0" allowfullscreen></iframe>'+
							'<div class="mfp-title">Some caption</div>'+
							'</div>'
				},
				callbacks: {
					markupParse: function(template, values, item) {
						values.title = item.el.attr('title');
					}
				}
			});	
		}

		if(jQuery('.popup-youtube, .popup-vimeo, .popup-gmaps').length > 0){
			/* magnificPopup for Play video function end */
			$('.popup-youtube, .popup-vimeo, .popup-gmaps').magnificPopup({
				disableOn: 700,
				type: 'iframe',
				mainClass: 'mfp-fade',
				removalDelay: 160,
				preloader: false,
				fixedContentPos: true,
			});
		}
	}
	
	/* Scroll To Top ============ */
	var scrollTop = function (){
		var scrollTop = jQuery("button.scroltop");
		
		/* page scroll top on click function */	
		scrollTop.on('click',function() {
			jQuery("html, body").animate({
				scrollTop: 0
			}, 1000);
			return false;
		})

		jQuery(window).bind("scroll", function() {
			var scroll = jQuery(window).scrollTop();
			if (scroll > 900) {
				jQuery("button.scroltop").fadeIn(1000);
			} else {
				jQuery("button.scroltop").fadeOut(1000);
			}
		});
		/* page scroll top on click function end*/
	}
	
	/* Header Fixed ============ */
	var headerFix = function(){
		/* Main navigation fixed on top  when scroll down function custom */		
		jQuery(window).on('scroll', function () {
			if (jQuery('body').attr('data-headerposition') === 'sticky-no') {
				return;
			}
			if(jQuery('.sticky-header').length > 0){
				var menu = jQuery('.sticky-header');
				
				if ($(window).scrollTop() > menu.offset().top) {
					menu.addClass('is-fixed');
				} else {
					menu.removeClass('is-fixed');
				}
			}
		});
		/* Main navigation fixed on top  when scroll down function custom end*/
	}
	
	/* Masonry Box ============ */
	var masonryBox = function(){
		/* masonry by  = bootstrap-select.min.js */
		if(jQuery('#masonry, .masonry').length > 0)
		{
			jQuery('.filters li').removeClass('active');
			jQuery('.filters li:first').addClass('active');
			var self = jQuery("#masonry, .masonry"); 
			var filterValue = "";
	 
			if(jQuery('.card-container').length > 0)
			{
				var gutterEnable = self.data('gutter');
				
				var gutter = (self.data('gutter') === undefined)?0:self.data('gutter');
				gutter = parseInt(gutter);
				
				
				var columnWidthValue = (self.attr('data-column-width') === undefined)?'':self.attr('data-column-width');
				if(columnWidthValue != ''){columnWidthValue = parseInt(columnWidthValue);}
				
				self.imagesLoaded(function () {
					filter: filterValue,
					self.masonry({
						gutter: gutter,
						columnWidth:columnWidthValue, 
						//columnWidth:3, 
						//gutterWidth: 15,
						isAnimated: true,
						itemSelector: ".card-container",
						//horizontalOrder: true,
						//fitWidth: true,
						//stagger: 30
						//containerStyle: null
						//percentPosition: true
					});
					
				}); 
			} 
		}
		if(jQuery('.filters').length)
		{
			jQuery(".filters li:first").addClass('active');
			
			jQuery(".filters").on("click", "li", function() {
				
				jQuery('.filters li').removeClass('active');
				jQuery(this).addClass('active');
				
				var filterValue = $(this).attr("data-filter");
				self.isotope({ 
					filter: filterValue,
					masonry: {
						gutter: gutter,
						columnWidth: columnWidthValue,
						isAnimated: true,
						itemSelector: ".card-container"
					}
				});
			});
		}
		/* masonry by  = bootstrap-select.min.js end */
	}
	
	/* Counter Number ============ */
	var counter = function(){
		if(jQuery('.counter').length){
			jQuery('.counter').counterUp({
				delay: 10,
				time: 3000
			});	
		}
	}
	
	/* Heart Blast ============ */
	var heartBlast = function (){
		$(".heart").on("click", function() {
			$(this).toggleClass("heart-blast");
		});
	}
	
	/* Video Popup ============ */
	var handleVideo = function(){
		/* Video responsive function */	
		jQuery('iframe[src*="youtube.com"]').wrap('<div class="embed-responsive embed-responsive-16by9"></div>');
		jQuery('iframe[src*="vimeo.com"]').wrap('<div class="embed-responsive embed-responsive-16by9"></div>');	
		/* Video responsive function end */
	}
	
	/* Countdown ============ */
	var handleCountDown = function(WebsiteLaunchDate){
		/* Time Countr Down Js */
		if($(".countdown").length)
		{
			$('.countdown').countdown({date: WebsiteLaunchDate+' 23:5'}, function() {
				$('.countdown').text('we are live');
			});
		}
		/* Time Countr Down Js End */
	}
	
	/* Website Launch Date */ 
	var WebsiteLaunchDate = new Date();
	var monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
	WebsiteLaunchDate.setMonth(WebsiteLaunchDate.getMonth() + 1);
	WebsiteLaunchDate =  WebsiteLaunchDate.getDate() + " " + monthNames[WebsiteLaunchDate.getMonth()] + " " + WebsiteLaunchDate.getFullYear();
	/* Website Launch Date END */ 
	
	// Light Gallery ============
	var handleLightgallery = function() {
		if(jQuery('#lightgallery').length > 0){
			lightGallery(document.getElementById('lightgallery'), {
				plugins: [lgThumbnail, lgZoom],
				selector: '.lg-item',
				thumbnail:true,
				exThumbImage: 'data-src'
            });
		}
	}
	
	/* Box Hover ============ */
	var handleBoxHover = function(){
		jQuery('.box-hover').on('mouseenter',function(){
			var selector = jQuery(this).parent().parent();
			selector.find('.box-hover').removeClass('active');
			jQuery(this).addClass('active');
		});
	}

	/* Current Active Menu ============ */
	var handleCurrentActive = function() {
		for (var nk = window.location,
				o = $("ul.navbar a").filter(function(){
				return this.href == nk;
			})
			.addClass("active").parent().addClass("active");;)
		{
		if (!o.is("li")) break;
			o = o.parent().addClass("show").parent('li').addClass("active");
		}
	}
	
	/* Select Picker ============ */
	var handleSelectpicker = function(){
		if(jQuery('.default-select').length > 0 && jQuery.isFunction($.fn.selectpicker) ){
			jQuery('.default-select').selectpicker();
		}
	}

	var handleComingSoonCounter = function(){
		
		var commingSoonDate = new Date("2023-02-28 00:00:00").getTime();
		
		var x = setInterval(function() {
			clockCounter();
		}, 1000);
		
		function clockCounter(){
			var currentTime = new Date().getTime();
			var clockTime = commingSoonDate - currentTime;

			// Time calculations for days, hours, minutes and seconds
			var days = Math.floor(clockTime / (1000 * 60 * 60 * 24));
			var hours = Math.floor((clockTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
			var minutes = Math.floor((clockTime % (1000 * 60 * 60)) / (1000 * 60));
			var seconds = Math.floor((clockTime % (1000 * 60)) / 1000);

			var remainDays 		= (days.toString().length 		== 1) ? '0'+days	: days;
			var remainHour 		= (hours.toString().length 		== 1) ? '0'+hours	: hours;
			var remainMin 		= (minutes.toString().length 	== 1) ? '0'+minutes	: minutes;
			var remainSeconds 	= (seconds.toString().length 	== 1) ? '0'+seconds	: seconds;

			jQuery('#day').text(remainDays);
			jQuery('#hour').text(remainHour);
			jQuery('#min').text(remainMin);
			jQuery('#second').text(remainSeconds);
			
			var rotateNum = 6 * seconds;

			$('.round').css({'transform': 'rotate(' + rotateNum + 'deg)'});
			$('.round').css({'-webkit-transform': 'rotate(' + rotateNum + 'deg)'});
			$('.round').css({'-o-transform': 'rotate(' + rotateNum + 'deg)'});
			$('.round').css({'-moz-transform': 'rotate(' + rotateNum + 'deg)'});
			$('.round').css({'-ms-transform': 'rotate(' + rotateNum + 'deg)'});

			// If the count down is over, write some text 
			if (clockTime < 0) {
				clearInterval(x);
				jQuery("#day, #hour, #min, #second").html("EXPIRED");
			}
		}
		
	}
	
	/* WOW ANIMATION ============ */
	var handleWowAnimation = function(){
		if($('.wow').length > 0){
			var wow = new WOW({
				boxClass:     'wow',      // animated element css class (default is wow)
				animateClass: 'animated', // animation css class (default is animated)
				offset:       100,          // distance to the element when triggering the animation (default is 0)
				mobile:       false       // trigger animations on mobile devices (true is default)
			});
			wow.init();	
		}	
	}
	
	var handleOpenModal = function(){
		
		var modalBox = `<div class="modal fade inquiry-modal style-1" id="myModal" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle" aria-hidden="true">
			<div class="modal-dialog" role="document">
				<div class="inquiry-adv">
					<img src="assets/images/adv-media.jpg" alt=""/>
				</div>
				<div class="modal-content">
					<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close">
					  <span aria-hidden="true">
						<i class="icon feather icon-x"></i>
					  </span>
					</button>
					<div>
						<div class="modal-header">
							<span class="title-head">Newsletter</span>
							<h3 class="modal-title" id="exampleModalLongTitle">Subscribe Now</h3>
							<p class="text">Stay updated on all that’s new add noteworthy</p>
						</div>
						<div class="modal-body">
							<form action="assets/script/mailchamp.php" class="dzSubscribe" method="post">
								<div class="dzSubscribeMsg"></div>
								<div class="form-group">
									<label class="form-label">Email Address</label>
									<input type="email" name="dzEmail" class="form-control" required placeholder="Enter Email Address">
								</div>
								<button name="submit" type="submit" value="Submit" class="btn btn-primary btn-block m-b15 text-uppercase">Subscribe</button>
								<div class="custom-checkbox">
									<input type="checkbox" class="form-check-input mt-0" id="basic_checkbox_3">
									<label class="form-check-label" for="basic_checkbox_3">I agree to receive marketing materials</label>
								</div>
							</form>
						</div>
					</div>
				</div>
			</div>
		</div>`;
		
		if (getCookie('prevent_subscription') != 'true') {
			jQuery('body').append(modalBox);
			
			setTimeout(function () {
				jQuery("#myModal").modal('show');
			}, 5000)
		}
	}
	
	var handleOpenModalCookie = function () {
		$(document).on('click', '.modal-content .btn-close', function () {
			setCookie('prevent_subscription', 'true', 60);
		});
	}
	
	/* BGEFFECT ============ */
	var reposition = function () {
		var modal = jQuery(this),

		dialog = modal.find('.modal-dialog');
		modal.css('display', 'block');

		/* Dividing by two centers the modal exactly, but dividing by three  or four works better for larger screens.  */
		dialog.css("margin-top", Math.max(0, (jQuery(window).height() - dialog.height()) / 2));
	}

	var handelResize = function () {
		/* Reposition when the window is resized */
		jQuery(window).on('resize', function () {
			jQuery('.modal:visible').each(reposition);
		});
	}
	
	/* Handle Navbar Toggler ============ */
	var handleScreenLock = function(){
		jQuery('.navbar-toggler').on('click',function(){
			jQuery('body').toggleClass('screen-lock');
			jQuery('.styleswitcher, .DZ-theme-btn').toggleClass('hide');
		});
	}
	
	/* Scroll Top Progress ============ */
	var handleScrollTopProgress = function (){
		if(jQuery('.scroltop-progress').length > 0){
			var progressPath = $('.scroltop-progress path');
			var pathLength = progressPath[0].getTotalLength();
			var offset = 500;
			var duration = 550;

			progressPath.css({
				'transition': 'none',
				'WebkitTransition': 'none',
				'strokeDasharray': pathLength + ' ' + pathLength,
				'strokeDashoffset': pathLength
			});

			progressPath[0].getBoundingClientRect();

			progressPath.css({
				'transition': 'stroke-dashoffset 10ms linear',
				'WebkitTransition': 'stroke-dashoffset 10ms linear'
			});

			var updateProgress = function() {
			var scroll = $(window).scrollTop();
			var height = $(document).height() - $(window).height();
			var progress = pathLength - (scroll * pathLength / height);
				progressPath.css('strokeDashoffset', progress);
			};

			updateProgress();

			$(window).scroll(updateProgress);

			$(window).on('scroll', function() {
				if ($(this).scrollTop() > offset){
				  $('.scroltop-progress').addClass('active-progress');
				} else {
				  $('.scroltop-progress').removeClass('active-progress');
				}
			});

			$('.scroltop-progress').on('click', function(event) {
				event.preventDefault();
				$('html, body').animate({
					scrollTop: 0
				}, duration);
				return false;
			});
		}
	}
	
	var handlePlaceholderAnimation = function(){
		if(jQuery('.dezPlaceAni').length){
			$('input, textarea').focus(function(){
				$(this).parents('.input-group').addClass('focused');
			});
			$('input, textarea').blur(function(){
				var inputValue = $(this).val();
				if ( inputValue == "" ) {
					$(this).removeClass('filled');
					$(this).parents('.input-group').removeClass('focused');  
				} else {
					$(this).addClass('filled');
				}
			})
		}
	}
	
	var handleParallaxScroll = function(){
		if(jQuery('.dz-parallax').length > 0){
			$(window).on("load scroll", function() {
				var parallaxElements = $(".dz-parallax");

				window.requestAnimationFrame(function() {
					parallaxElements.each(function() {
						var currentElement = $(this),
							windowTop = $(window).scrollTop(),
							elementTop = currentElement.offset().top,
							elementHeight = currentElement.height(),
							viewPortHeight = window.innerHeight * 0.5 - elementHeight * 0.5,
							scrolled = windowTop - elementTop + viewPortHeight,
							customSpeed = currentElement.data("parallax-speed") || 0.1;

						currentElement.css({
							transform: "translate3d(0," + scrolled * -customSpeed + "px, 0) rotate(" + scrolled * -customSpeed + "deg)"
						});
					});
				});
			});	
		}
		if(jQuery('.bg-parallax').length > 0){
			$(window).on("scroll", function() {
				let offset = $(window).scrollTop();
				$(".bg-parallax").css("background-position-y", offset * 0.02 + "px");
			});	
		}
	}
	
	var handleTempusDominus = function(){
		if(jQuery('#datePickerOnly').length > 0){
			const td = new tempusDominus.TempusDominus(document.getElementById("datePickerOnly"), {
				display: {
					viewMode: "calendar",
					components: {
						decades: true,
						year: true,
						month: true,
						date: true,
						hours: false,
						minutes: false,
						seconds: false
					},
				},
				localization: {
				  locale: 'en',
				  format: 'dd/MM/yyyy',
				}
				
			});
		}
		if(jQuery('#timePickerOnly').length > 0){
			new tempusDominus.TempusDominus(document.getElementById("timePickerOnly"),{
				display: {
					viewMode: "clock",
					components: {
						decades: false,
						year: false,
						month: false,
						date: false,
						hours: true,
						minutes: true,
						seconds: false
					}
				},
				localization: {
					locale: 'en',
					format: 'HH:mm',
				}
			});
		}
	}
	
	/* Pointer Effect ============ */
	var handlePointerEffect = function(){
		const pointer = document.createElement("div")
		pointer.id = "pointer-dot"
		
		const ring = document.createElement("div")
		ring.id = "pointer-ring"
		document.body.insertBefore(pointer, document.body.children[0])
		document.body.insertBefore(ring, document.body.children[0])

		let mouseX = -100
		let mouseY = -100
		let ringX = -100
		let ringY = -100
		let isHover = false
		let mouseDown = false
		const init_pointer = (options) => {

			window.onmousemove = (mouse) => {
				mouseX = (mouse.clientX != undefined)?mouse.clientX:-100;
				mouseY = (mouse.clientY != undefined)?mouse.clientY:-100;
			}
			window.onmousedown = (mouse) => {
				mouseDown = true
			}
			window.onmouseup = (mouse) => {
				mouseDown = false
			}
			const trace = (a, b, n) => {
				return (1 - n) * a + n * b;
			}
			window["trace"] = trace

			const getOption = (option) => {
				let defaultObj = {
					pointerColor: "#750c7e",
					ringSize: 15,
					ringClickSize: (options["ringSize"] || 15) - 5,
				}
				if (options[option] == undefined) {
					return defaultObj[option]
				} else {
					return options[option]
				}
			}

			const render = () => {
				if(mouseX != undefined){
					ringX = trace(ringX, mouseX, 0.2)
					ringY = trace(ringY, mouseY, 0.2)
	
					if (document.querySelector(".p-action-click:hover")) {
						pointer.style.borderColor = getOption("pointerColor")
						isHover = true
					} else {
						pointer.style.borderColor = "white"
						isHover = false
					}
					ring.style.borderColor = getOption("pointerColor")
					if (mouseDown) {
						ring.style.padding = getOption("ringClickSize") + "px"
					} else {
						ring.style.padding = getOption("ringSize") + "px"
					}
					
					pointer.style.transform = `translate(${mouseX}px, ${mouseY}px)`
					
					ring.style.transform = `translate(${ringX - (mouseDown ? getOption("ringClickSize") : getOption("ringSize"))}px, ${ringY - (mouseDown ? getOption("ringClickSize") : getOption("ringSize"))}px)`
	
					requestAnimationFrame(render)
				}
			}
			requestAnimationFrame(render)
		}
		
		jQuery('a').on('mousemove',function(e){
			jQuery('#pointer-ring').addClass('active');
		});
		
		jQuery('a').on('mouseleave',function(e){
			jQuery('#pointer-ring').removeClass('active');
		});

		init_pointer({});
	}
	
	var handleBoxAware = function (){
		if(jQuery('.hover-aware').length > 0){	
			$('.hover-aware').on('mouseenter', function(e) {
				var parentOffset = $(this).offset(),
				relX = e.pageX - parentOffset.left,
				relY = e.pageY - parentOffset.top;
				$(this).find('.effect').css({top:relY, left:relX})
			})
			.on('mouseout', function(e) {
				var parentOffset = $(this).offset(),
				relX = e.pageX - parentOffset.left,
				relY = e.pageY - parentOffset.top;
				$(this).find('.effect').css({top:relY, left:relX})
			});
		}
	}
	
	var handledzNumber = function (){
		if ($('.dz-number').length > 0) {
			$('.dz-number').on('input', function() {
				var inputVal = $(this).val();
				var numericVal = inputVal.replace(/\D/g, ''); // Remove non-numeric characters

				if (numericVal.length > 10) {
					$(this).val(numericVal.slice(0, 10));
				} else {
					$(this).val(numericVal);
				}
			});
		}
	}
	/* CurrentYear-Function */
	
	var setCurrentYear = function(){
		const currentDate = new Date();
		let currentYear = currentDate.getFullYear();
		let elements = document.getElementsByClassName('current-year'); 

		for (const element of elements) {
		  element.innerHTML = currentYear;
		}
  	}

	/* Function ============ */
	return {
		init:function(){
			handleHomeSearch();
			cartButton();
			handleBootstrapTouchSpin();
			dzTheme();
			MagnificPopup();
			scrollTop();
			handleShopPannel();
			headerFix();
			handleVideo();
			handleNouiSlider();
			masonryBox();
			handleShowPass();
			heartBlast();
			handleCountDown(WebsiteLaunchDate);
			handleLightgallery();
			handleBoxHover();
			handleOpenModal();
			handleOpenModalCookie();
			handleCurrentActive();
			handleSelectpicker();
			handleComingSoonCounter();
			handleWowAnimation();
			handleScreenLock();
			handleScrollTopProgress();
			handlePlaceholderAnimation();
			handleParallaxScroll();
			handleTempusDominus();
			handlePointerEffect();
			setCurrentYear();
			handleBoxAware();
			handledzNumber();
			handelResize();
			jQuery('.modal').on('show.bs.modal', reposition);
		},
		load:function(){
			counter();
			masonryBox();
			handleMultipleImageSize();
			handleIsotope();
			jQuery('.modal').on('show.bs.modal', reposition);
		},
		load:function(){
			counter();
			masonryBox();
		},
		
		resize:function(){
			screenWidth = $(window).width();
			dzTheme();	
		}
	}
	
}();
	
/* Document.ready Start */	
jQuery(document).ready(function() {
    
	swigo.init();
	
	jQuery('.navicon').on('click',function(){
		$(this).toggleClass('open');
	});
	
});
/* Document.ready END */

/* Window Resize START */
jQuery(window).on('resize',function () {
	
	swigo.resize();
	
});
/*  Window Resize END */

/* Window Load START */
jQuery(window).on('load',function () {
	
	swigo.load();
	
	setTimeout(function(){
		jQuery('#loading-area').fadeOut();
	}, 1500);
	
	if(jQuery('#loading-area2').length > 0){
		let isVisible = false;
		
		function handleVisibilityChange() {
			if (!isVisible && !document.hidden) {
				
				setTimeout(function (){
					jQuery('#loading-area2').addClass('active');
					
					setTimeout(function() {
						jQuery('#loading-area2').fadeOut();
					}, 1200);
					
				}, 700);
				
				isVisible = true;
			}
		}
		document.addEventListener("visibilitychange", handleVisibilityChange);
		
		if ($("#loading-area2").is(":visible")) {
			handleVisibilityChange();
		}
	}
	
	if(jQuery('#loading-area3').length > 0){
		let isVisible = false;
		
		function handleVisibilityChange() {
			if (!isVisible && !document.hidden) {
				
				setTimeout(function() {
					jQuery('.text').addClass('show');
				}, 100);
				setTimeout(function (){
					jQuery('#loading-area3').addClass('active');
				}, 1500);
				setTimeout(function() {
					jQuery('#loading-area3').fadeOut();
				}, 2000);
				
				isVisible = true;
			}
		}
		document.addEventListener("visibilitychange", handleVisibilityChange);
		
		if ($("#loading-area3").is(":visible")) {
			handleVisibilityChange();
		}
	}

});
/*  Window Load END */