/* ===================================
    Full width Top Slider
    ====================================== */
$(document).ready(function(jQuery) {
    $('#fullwidth_top_slider').slick({
        slidesToShow: 1,
        slidesToScroll: 1,
        autoplay: true,
        autoplaySpeed: 2000,
        speed: 1500,
        arrows: true,
        dots: false,
        speed: 900,
        fade: true,
        prevArrow: '<div class="slick-prev"><i class="fas fa-arrow-left"></i></div>',
        nextArrow: '<div class="slick-next"><i class="fas fa-arrow-right"></i></div>'
    });
});

   