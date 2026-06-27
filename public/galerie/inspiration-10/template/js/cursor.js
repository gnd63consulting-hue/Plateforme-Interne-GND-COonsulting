function initCursor() {
	var mouseX=window.innerWidth/2, mouseY=window.innerHeight/2;

	var cursor = {
		el: $('.cursor'),
		x: window.innerWidth/2, 
		y: window.innerHeight/2, 
		w: 30, 
		h: 30, 
		update:function() {
			l = this.x-this.w/2; 
			t = this.y-this.h/2; 
			this.el.css({ 'transform':'translate3d('+l+'px,'+t+'px, 0)' }); 
		}
	}

	$(window).mousemove (function(e) {
		mouseX = e.clientX;
		mouseY = e.clientY;
	});

	$('a, .swiper-pagination, .swiper-buttons, button, .button, .btn').hover(function() {
		$('.cursor').addClass("cursor-zoom");
	}, function(){
		$('.cursor').removeClass("cursor-zoom");
	});

	setInterval(move,1000/60);
	
	function move() {
		cursor.x = lerp (cursor.x, mouseX, 0.1);
		cursor.y = lerp (cursor.y, mouseY, 0.1);
		cursor.update() 
	}

	function lerp (start, end, amt) {
		return (1-amt)*start+amt*end
	}
}