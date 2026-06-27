function getGridSize() {
    return (window.innerWidth <= 480) ? 2 :
           (window.innerWidth < 900) ? 5 : 5;
}
jQuery(window).load(function() {
	var post_carousel_column = jQuery('#post_client_column').val();
	var post_carousel_column_width = 200;
	var flexslider;
    
    if(jQuery.browser.msie) {
        jQuery('.post_carousel').flexslider({
		      animation: "slide",
		      animationLoop: true,
		      itemWidth: post_carousel_column_width,
		      itemMargin: 0,
		      minItems: getGridSize(),
		      maxItems: getGridSize(),
		      slideshow: false,
		      controlNav: false,
		      directionNav: false,
		      slideshow: true,
		      slideshowSpeed: 5000,
		      move: 1
	    }); 
    } else {
        jQuery('.post_carousel').flexslider({
		      animation: "slide",
		      animationLoop: true,
		      itemWidth: post_carousel_column_width,
		      itemMargin: 0,
		      minItems: getGridSize(),
		      maxItems: getGridSize(),
		      slideshow: false,
		      controlNav: false,
		      directionNav: false,
		      slideshow: true,
		      slideshowSpeed: 5000,
		      move: 1
	    });  
    }
});