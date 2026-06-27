$(function() {

    /* Preloader */
    $(window).on('load', function() {
        setTimeout(function() {
            $('#preloader').addClass('hide');
        }, 350);
    });
    setTimeout(function() {
        $('#preloader').addClass('hide');
    }, 2500);

    /* AOS init */
    AOS.init({
        duration: 800,
        easing: 'ease-out-cubic',
        once: true,
        offset: 60
    });

    /* Image graceful fallback */
    $('img').on('error', function() {
        $(this).addClass('img-fallback').off('error');
    });

    /* Sticky navbar */
    $(window).on('scroll', function() {
        if ($(window).scrollTop() > 60) {
            $('#mainNav').addClass('scrolled');
        } else {
            $('#mainNav').removeClass('scrolled');
        }

        if ($(window).scrollTop() > 400) {
            $('#backToTop').addClass('show');
        } else {
            $('#backToTop').removeClass('show');
        }
    });

    $('#backToTop').on('click', function() {
        $('html,body').animate({
            scrollTop: 0
        }, 600);
    });

    /* Smooth scroll + active link */
    $('.nav-link-custom').on('click', function(e) {
        var target = $(this).attr('href');
        if (target.startsWith('#') && $(target).length) {
            e.preventDefault();
            $('html,body').animate({
                scrollTop: $(target).offset().top - 80
            }, 700);
            $('.nav-link-custom').removeClass('active');
            $(this).addClass('active');
            var navCollapse = document.getElementById('navMenu');
            if (navCollapse.classList.contains('show')) {
                bootstrap.Collapse.getOrCreateInstance(navCollapse).hide();
            }
        }
    });

    /* Counter animation on scroll into view */
    var countersAnimated = false;

    function animateCounters() {
        if (countersAnimated) return;
        var top = $(window).scrollTop(),
            winH = $(window).height();
        $('.counter').each(function() {
            var $this = $(this),
                elTop = $this.offset().top;
            if (elTop < top + winH - 80 && !countersAnimated) {
                var target = parseInt($this.data('target'), 10);
                $({
                    val: 0
                }).animate({
                    val: target
                }, {
                    duration: 1600,
                    easing: 'swing',
                    step: function() {
                        $this.text(Math.floor(this.val));
                    },
                    complete: function() {
                        $this.text(target);
                    }
                });
            }
        });
    }
    var heroCounterFired = false,
        statsFired = false;
    $(window).on('scroll', function() {
        var top = $(window).scrollTop(),
            winH = $(window).height();

        if (!heroCounterFired) {
            var $hs = $('.hero-stats .counter');
            if ($hs.length && $hs.first().offset().top < top + winH - 80) {
                heroCounterFired = true;
                $hs.each(function() {
                    var $this = $(this),
                        target = parseInt($this.data('target'), 10);
                    $({
                        val: 0
                    }).animate({
                        val: target
                    }, {
                        duration: 1500,
                        step: function() {
                            $this.text(Math.floor(this.val));
                        },
                        complete: function() {
                            $this.text(target);
                        }
                    });
                });
            }
        }
        if (!statsFired) {
            var $cb = $('.counter-grid .counter');
            if ($cb.length && $cb.first().offset().top < top + winH - 80) {
                statsFired = true;
                $cb.each(function() {
                    var $this = $(this),
                        target = parseInt($this.data('target'), 10);
                    $({
                        val: 0
                    }).animate({
                        val: target
                    }, {
                        duration: 1500,
                        step: function() {
                            $this.text(Math.floor(this.val));
                        },
                        complete: function() {
                            $this.text(target);
                        }
                    });
                });
                $('.progress-fill').each(function() {
                    var w = $(this).data('width');
                    $(this).css('width', w + '%');
                });
            }
        }
    }).trigger('scroll');

    /* Menu ticket filter */
    $('.ticket-tab').on('click', function() {
        $('.ticket-tab').removeClass('active');
        $(this).addClass('active');
        var f = $(this).data('filter');
        $('.ticket-item').each(function() {
            if (f === 'all' || $(this).data('cat') === f) {
                $(this).stop().slideDown(300).css('display', 'flex');
            } else {
                $(this).stop().slideUp(300);
            }
        });
    });

    /* Cart logic */
    var cart = [];

    function renderCart() {
        var $wrap = $('#cartItems');
        if (cart.length === 0) {
            $wrap.html('<p class="text-center text-muted mt-5" id="cartEmptyMsg">Your cart is empty.<br>Add something delicious!</p>');
            $('#cartTotal').text('$0.00');
            $('#cartCount').text('0');
            return;
        }
        var html = '',
            total = 0;
        cart.forEach(function(item, idx) {
            total += item.price;
            html += '<div class="ci-item">' +
                '<img src="' + item.img + '" alt="' + item.name + '">' +
                '<div class="flex-grow-1"><div class="ci-name">' + item.name + '</div><div class="ci-price">$' + item.price.toFixed(2) + '</div></div>' +
                '<i class="bi bi-x-lg ci-remove" data-idx="' + idx + '"></i>' +
                '</div>';
        });
        $wrap.html(html);
        $('#cartTotal').text('$' + total.toFixed(2));
        $('#cartCount').text(cart.length);
    }

    function addToCart(item, qty) {
        qty = qty || 1;
        for (var i = 0; i < qty; i++) {
            cart.push(item);
        }
        renderCart();
        $('#toastMsg').text(item.name + (qty > 1 ? ' x' + qty : '') + ' added to cart');
        var toast = new bootstrap.Toast(document.getElementById('cartToast'), {
            delay: 2200
        });
        toast.show();
    }

    /* Quick View modal â€” opened from card click OR plus icon click */
    var qvCurrent = null,
        qvQty = 1;
    $('.qv-trigger').on('click', function() {
        qvCurrent = {
            name: $(this).data('name'),
            price: parseFloat($(this).data('price')),
            img: $(this).data('img'),
            desc: $(this).data('desc'),
            rating: parseFloat($(this).data('rating'))
        };
        qvQty = 1;
        $('#qvQty').text(qvQty);
        $('#qvImg').attr('src', qvCurrent.img).attr('alt', qvCurrent.name);
        $('#qvName').text(qvCurrent.name);
        $('#qvDesc').text(qvCurrent.desc);
        $('#qvPrice').text('$' + qvCurrent.price.toFixed(2));

        var full = Math.floor(qvCurrent.rating),
            half = (qvCurrent.rating % 1) >= 0.5;
        var starsHtml = '';
        for (var i = 0; i < full; i++) {
            starsHtml += '<i class="bi bi-star-fill"></i>';
        }
        if (half) {
            starsHtml += '<i class="bi bi-star-half"></i>';
            full++;
        }
        for (var j = full; j < 5; j++) {
            starsHtml += '<i class="bi bi-star"></i>';
        }
        $('#qvStars').html(starsHtml);

        var modal = new bootstrap.Modal(document.getElementById('quickViewModal'));
        modal.show();
    });

    $('#qvPlus').on('click', function() {
        qvQty++;
        $('#qvQty').text(qvQty);
    });
    $('#qvMinus').on('click', function() {
        if (qvQty > 1) {
            qvQty--;
            $('#qvQty').text(qvQty);
        }
    });
    $('#qvAddCart').on('click', function() {
        if (!qvCurrent) return;
        addToCart({
            name: qvCurrent.name,
            price: qvCurrent.price,
            img: qvCurrent.img
        }, qvQty);
        bootstrap.Modal.getOrCreateInstance(document.getElementById('quickViewModal')).hide();
    });

    $('#cartItems').on('click', '.ci-remove', function() {
        var idx = $(this).data('idx');
        cart.splice(idx, 1);
        renderCart();
    });

    /* Gallery lightbox modal */
    $('.gallery-tile').on('click', function() {
        $('#lbImg').attr('src', $(this).data('img')).attr('alt', $(this).data('title'));
        $('#lbTitle').text($(this).data('title'));
        $('#lbDesc').text($(this).data('desc'));
        new bootstrap.Modal(document.getElementById('galleryModal')).show();
    });

    /* Blog article modal */
    $('.blog-card').on('click', function() {
        $('#bmImg').attr('src', $(this).data('img')).attr('alt', $(this).data('title'));
        $('#bmTitle').text($(this).data('title'));
        $('#bmMeta').text($(this).data('meta'));
        var paras = String($(this).data('body')).split('|');
        var html = '';
        paras.forEach(function(p) {
            html += '<p>' + p + '</p>';
        });
        $('#bmBody').html(html);
        new bootstrap.Modal(document.getElementById('blogModal')).show();
    });

    /* Reservation form fake submit */
    $('#reservationForm').on('submit', function(e) {
        e.preventDefault();
        $('#reservationSuccess').fadeIn();
        var f = this;
        setTimeout(function() {
            f.reset();
        }, 200);
    });

    /* Contact form fake submit */
    $('#contactForm').on('submit', function(e) {
        e.preventDefault();
        $('#contactSuccess').fadeIn();
        var f = this;
        setTimeout(function() {
            f.reset();
        }, 200);
    });

    /* Countdown timer (24h rolling deal) */
    var dealEnd = new Date().getTime() + (1000 * 60 * 60 * 26) + (1000 * 60 * 42);
    setInterval(function() {
        var now = new Date().getTime();
        var dist = dealEnd - now;
        if (dist < 0) dist = 0;
        var d = Math.floor(dist / (1000 * 60 * 60 * 24));
        var h = Math.floor((dist % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        var m = Math.floor((dist % (1000 * 60 * 60)) / (1000 * 60));
        var s = Math.floor((dist % (1000 * 60)) / 1000);
        $('#cd-days').text(String(d).padStart(2, '0'));
        $('#cd-hours').text(String(h).padStart(2, '0'));
        $('#cd-mins').text(String(m).padStart(2, '0'));
        $('#cd-secs').text(String(s).padStart(2, '0'));
    }, 1000);

    /* Video modal â€” swap iframe src on open, clear on close */
    $('#videoModal').on('show.bs.modal', function() {
        $('#videoFrame').attr('src', 'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1');
    });
    $('#videoModal').on('hidden.bs.modal', function() {
        $('#videoFrame').attr('src', '');
    });

    /* Newsletter fake submit */
    $('#newsletterForm').on('submit', function(e) {
        e.preventDefault();
        $('#newsletterMsg').fadeIn();
        $(this)[0].reset();
    });

    /* Swiper testimonials */
    new Swiper('.testiSwiper', {
        slidesPerView: 1,
        spaceBetween: 24,
        loop: true,
        autoplay: {
            delay: 4500,
            disableOnInteraction: false
        },
        pagination: {
            el: '.swiper-pagination',
            clickable: true
        },
        breakpoints: {
            768: {
                slidesPerView: 2
            },
            1200: {
                slidesPerView: 3
            }
        }
    });

    /* Scrollspy-ish active nav on scroll */
    var sections = ['home', 'about', 'menu', 'chef', 'gallery', 'reservation', 'blog', 'contact'];
    $(window).on('scroll', function() {
        var pos = $(window).scrollTop() + 120;
        sections.forEach(function(id) {
            var $sec = $('#' + id);
            if ($sec.length && pos >= $sec.offset().top && pos < $sec.offset().top + $sec.outerHeight()) {
                $('.nav-link-custom').removeClass('active');
                $('.nav-link-custom[href="#' + id + '"]').addClass('active');
            }
        });
    });

});