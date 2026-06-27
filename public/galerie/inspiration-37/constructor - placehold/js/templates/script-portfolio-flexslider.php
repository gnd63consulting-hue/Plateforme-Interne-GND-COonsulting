jQuery(window).load(function(){ 
	jQuery('.slider_wrapper').flexslider({
	      animation: "fade",
	      animationLoop: true,
	      itemMargin: 0,
	      minItems: 1,
	      maxItems: 1,
	      slideshow: false,
	      controlNav: false,
	      smoothHeight: false,
	      slideshowSpeed: 5000,
	      move: 1
	});
	
	jQuery('.slider_wrapper.portfolio .slides li').each( function() {
	    var height = jQuery(this).height();
	    var imageHeight = jQuery(this).find('img').height();
	
	    var offset = (height - imageHeight) / 2;
	
	    jQuery(this).find('img').css('margin-top', offset + 'px');
	
	});
});