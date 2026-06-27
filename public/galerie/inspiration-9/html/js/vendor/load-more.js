(function($){ "use strict";	
	/**
    	*	Load More Results v1.0.0
    	* Author: Cenk Çalgan
    	*
    	* Options:
    	* - tag (object):
    	*		- name (string)
    	*		- class (string)
    	* - displayedItems (int)
    	*	- showItems (int)
    	* - button (object):
    	*		- class (string)
    	*		- text (string)
    */
    $.fn.loadMoreResults = function (options) {

		var defaults = {
			tag: {
				name: 'div',
				'class': 'item'
			},
			displayedItems: 5,
			showItems: 5,
			button: {
				'class': 'btn-load-more',
				text: 'Load More'
			}
		};

		var opts = $.extend(true, {}, defaults, options);

		var alphaNumRE = /^[A-Za-z][-_A-Za-z0-9]+$/;
		var numRE = /^[0-9]+$/;

		$.each(opts, function validateOptions(key, val) {
			if (key === 'tag') {
				formatCheck(key, val, 'name', 'string');
				formatCheck(key, val, 'class', 'string');
			}
			if (key === 'displayedItems') {
				formatCheck(key, val, null, 'number');
			}
			if (key === 'showItems') {
				formatCheck(key, val, null, 'number');
			}
			if (key === 'button') {
				formatCheck(key, val, 'class', 'string');
			}
		});

		function formatCheck(key, val, prop, typ) {
			if (prop !== null && typeof prop !== 'object') {
				if (typeof val[prop] !== typ || String(val[prop]).match(typ == 'string' ? alphaNumRE : numRE) === null) {
					opts[key][prop] = defaults[key][prop];
				}
			} else {
				if (typeof val !== typ || String(val).match(typ == 'string' ? alphaNumRE : numRE) === null) {
					opts[key] = defaults[key];
				}
			}
		};

		return this.each(function (index, element) {
			var $list = $(element),
					lc = $list.find(' > ' + opts.tag.name + '.' + opts.tag.class).length,
					dc = parseInt(opts.displayedItems),
					sc = parseInt(opts.showItems);

			$list.find(' > ' + opts.tag.name + '.' + opts.tag.class + ':lt(' + dc + ')').css("display", "inline-block");
			$list.find(' > ' + opts.tag.name + '.' + opts.tag.class + ':gt(' + (dc - 1) + ')').css("display", "none");

			$list.parent().append('<div class="w-100 text-center"><button class="btn-view load-more ' + opts.button.class + '"><i class="ti-reload"></i>' + opts.button.text + '</button></div>');
			if (dc == lc) {
				$('button.btn-view').hide();
			}
			$list.parent().on("click", ".btn-view", function (e) {
				e.preventDefault();
				dc = (dc + sc <= lc) ? dc + sc : lc;

				$list.find(' > ' + opts.tag.name + '.' + opts.tag.class + ':lt(' + dc + ')').fadeIn();
				$(".loadmore-items").isotope({
		            itemSelector: '.single-item',
		            layoutMode: 'masonry',
		        });
				if (dc == lc) {
					$(this).hide();
				}
			});
		});

	};
	
})(jQuery);