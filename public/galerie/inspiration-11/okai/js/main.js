/* -------------------------------------------

Name:       Okai
Version:    1.0
Author:	    bslthemes
Website:    https://bslthemes.com/
Developer:	millerDigitalDesign (https://themeforest.net/user/millerdigitaldesign/)

------------------------------------------- */

document.addEventListener("DOMContentLoaded", function () {
    "use strict";

    /* -------------------------------------------

    register gsap plugins

    ------------------------------------------- */
    gsap.registerPlugin(ScrollTrigger, ScrollSmoother, ScrollToPlugin);

    /* -------------------------------------------

    ScrollSmoother

    ------------------------------------------- */
    ScrollSmoother.create({
        smooth: 1,
        effects: true,
        smoothTouch: 0.1,
    });
    /* -------------------------------------------
    
    tabs
    
    ------------------------------------------- */
    var tabs = document.querySelectorAll('ul.mil-tabs li');

    if (tabs.length > 0) {
        tabs.forEach(function (tab) {
            tab.addEventListener('click', function () {
                var tab_id = this.getAttribute('data-tab');

                tabs.forEach(function (tab) {
                    tab.classList.remove('mil-current');
                });
                var tabContents = document.querySelectorAll('.mil-tab-content');
                tabContents.forEach(function (content) {
                    content.classList.remove('mil-current');
                });

                this.classList.add('mil-current');
                var tabContentElement = document.getElementById(tab_id);
                if (tabContentElement) {
                    tabContentElement.classList.add('mil-current');
                }

                if (typeof ScrollTrigger !== 'undefined') {
                    ScrollTrigger.refresh();
                }
            });
        });
    }
    /* -------------------------------------------
    
    quantity
    
    ------------------------------------------- */
    var quantityField = document.getElementById('quantity');
    var minusButton = document.querySelector('.mil-minus');
    var plusButton = document.querySelector('.mil-plus');

    if (quantityField && minusButton && plusButton) {
        minusButton.addEventListener('click', function () {
            var currentValue = parseInt(quantityField.value, 10);
            if (currentValue > 0) {
                quantityField.value = currentValue - 1;
            }
        });

        plusButton.addEventListener('click', function () {
            var currentValue = parseInt(quantityField.value, 10);
            quantityField.value = currentValue + 1;
        });
    }
    /* -------------------------------------------

    accordion

    ------------------------------------------- */
    let groups = gsap.utils.toArray(".mil-accordion-group");
    let menus = gsap.utils.toArray(".mil-accordion-menu");
    let menuToggles = groups.map(createAnimation);

    menus.forEach(menu => {
        menu.addEventListener("click", () => toggleMenu(menu));
    });

    function toggleMenu(clickedMenu) {
        menuToggles.forEach(toggleFn => toggleFn(clickedMenu));
    }

    function createAnimation(element) {
        let menu = element.querySelector(".mil-accordion-menu");
        let box = element.querySelector(".mil-accordion-content");

        gsap.set(box, {
            height: "auto"
        });

        let animation = gsap.from(box, {
            height: 0,
            duration: 0.5,
            ease: "sine",
            onComplete: () => {
                ScrollTrigger.refresh();
            }
        }).reverse();

        let lastActiveMenu = null;

        return function (clickedMenu) {
            if (clickedMenu === menu) {
                let isOpen = animation.reversed();
                animation.reversed(!isOpen);

                if (isOpen) {
                    if (lastActiveMenu && lastActiveMenu !== menu) {
                        lastActiveMenu.classList.remove("mil-active");
                    }
                    menu.classList.add("mil-active");
                    lastActiveMenu = menu;
                } else {
                    menu.classList.remove("mil-active");
                }
            } else {
                animation.reverse();
                if (lastActiveMenu) {
                    lastActiveMenu.classList.remove("mil-active");
                }
                clickedMenu.classList.add("mil-active");
                lastActiveMenu = clickedMenu;
            }
        }
    }
    /* -------------------------------------------

    cursor

    ------------------------------------------- */
    var follower = document.querySelector(".mil-cursor-follower");
    var posX = 0,
        posY = 0;
    var mouseX = 0,
        mouseY = 0;

    gsap.ticker.add(function () {
        posX += (mouseX - posX) / 29;
        posY += (mouseY - posY) / 29;
        gsap.set(follower, {
            css: {
                left: posX,
                top: posY
            }
        });
    });

    function addHoverEffect(selector, className) {
        document.querySelectorAll(selector).forEach(function (link) {
            link.addEventListener("mouseenter", function () {
                follower.classList.add(className);
            });
            link.addEventListener("mouseleave", function () {
                follower.classList.remove(className);
            });
        });
    }

    addHoverEffect(".mil-c-dark", "mil-dark-active");
    addHoverEffect(".mil-c-gone", "mil-gone-active");
    addHoverEffect(".mil-c-view", "mil-view-active");
    addHoverEffect(".mil-c-next", "mil-next-active");
    addHoverEffect(".mil-c-read", "mil-read-active");
    addHoverEffect(".mil-c-swipe", "mil-swipe-active");

    document.addEventListener("mousemove", function (e) {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    /* -------------------------------------------

    menu

    ------------------------------------------- */
    document.addEventListener('click', function (event) {
        if (event.target.classList.contains('mil-menu-btn')) {
            event.target.classList.toggle('mil-active');
            document.querySelector('.mil-menu-window').classList.toggle('mil-active');
        }
    });
    /* -------------------------------------------

    back to top

    ------------------------------------------- */
    var btn = document.getElementById('mil-btt');

    if (btn) {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
    /* -------------------------------------------

    scrollbar

    ------------------------------------------- */
    gsap.to('.mil-progress', {
        height: '100%',
        ease: 'sine',
        scrollTrigger: {
            scrub: 0.3
        }
    });

    /* -------------------------------------------

    scroll animations

    ------------------------------------------- */
    const appearance = document.querySelectorAll(".mil-up");
    appearance.forEach((section) => {
        gsap.fromTo(section, {
            opacity: 0,
            y: 60,
            scale: .96,
            ease: 'sine',
        }, {
            y: 0,
            opacity: 1,
            scale: 1,
            scrollTrigger: {
                trigger: section,
                toggleActions: 'play none none reverse',
            }
        });
    });
    /* -------------------------------------------

    scale animations

    ------------------------------------------- */
    const scaleImage = document.querySelectorAll(".mil-scale-img");

    scaleImage.forEach((section) => {
        var value1 = section.getAttribute("data-value-1");
        var value2 = section.getAttribute("data-value-2");

        if (window.innerWidth < 992) {
            value1 = Math.max(.95, value1);
        }

        gsap.fromTo(section, {
            ease: 'sine',
            scale: value1,
        }, {
            scale: value2,
            scrollTrigger: {
                trigger: section,
                scrub: true,
                toggleActions: 'play none none reverse',
            }
        });
    });
    /* -------------------------------------------

    counters

    ------------------------------------------- */
    const numbers = document.querySelectorAll(".mil-counter");

    numbers.forEach((element) => {
        var zero = {
            val: 0
        };
        var num = parseFloat(element.getAttribute("data-number"));
        var split = (num + "").split("."); // to cover for instances of decimals
        var decimals = split.length > 1 ? split[1].length : 0;

        gsap.to(zero, {
            val: num,
            duration: 2,
            scrollTrigger: {
                trigger: element,
                toggleActions: 'play none none reverse',
            },
            onUpdate: function () {
                element.textContent = zero.val.toFixed(decimals);
            }
        });
    });
    /* -------------------------------------------

    add class

    ------------------------------------------- */
    function addClassToElement(element) {
        if (element) {
            element.classList.add('mil-added');
        }
    }

    function removeClassFromElement(element) {
        if (element) {
            element.classList.remove('mil-added');
        }
    }

    document.querySelectorAll('.mil-add-class').forEach(element => {
        ScrollTrigger.create({
            trigger: element,
            toggleActions: 'play none none reverse',
            onEnter: () => addClassToElement(element),
            onLeaveBack: () => removeClassFromElement(element)
        });
    });
    /* -------------------------------------------

    sliders

    ------------------------------------------- */
    var swiper = new Swiper('.mil-reviews-slider', {
        parallax: true,
        autoHeight: true,
        slidesPerView: 1,
        spaceBetween: 30,
        speed: 800,
        navigation: {
            prevEl: '.mil-reviews-nav .mil-prev',
            nextEl: '.mil-reviews-nav .mil-next',
        },
        on: {
            slideChangeTransitionEnd: function () {
                ScrollTrigger.refresh();
            }
        }
    });

    var swiper = new Swiper('.mil-portfolio-slider', {
        parallax: true,
        autoHeight: true,
        initialSlide: 1,
        slidesPerView: 1,
        spaceBetween: 30,
        speed: 800,
        scrollbar: {
            el: ".mil-pagination",
        },
        on: {
            slideChangeTransitionEnd: function () {
                ScrollTrigger.refresh();
            }
        }
    });

    var swiper = new Swiper('.mil-portfolio-fs-slider', {
        parallax: true,
        slidesPerView: 1,
        spaceBetween: 30,
        speed: 800,
        breakpoints: {
            992: {

            },
        },
        mousewheel: {
            sensitivity: 1,
        },
    });
    var swiper = new Swiper('.mil-portfolio-fs-slider-2', {
        parallax: true,
        slidesPerView: 1,
        spaceBetween: 30,
        speed: 800,
        navigation: {
            prevEl: '.mil-port-nav .mil-prev',
            nextEl: '.mil-port-nav .mil-next',
        },
        breakpoints: {
            992: {

            },
        },
        mousewheel: {
            sensitivity: 1,
        },
    });

    var swiper = new Swiper('.mil-store-slider', {
        parallax: true,
        slidesPerView: 1,
        spaceBetween: 30,
        speed: 800,
        breakpoints: {
            992: {

            },
        },
    });
    /* -------------------------------------------

    progressbar

    ------------------------------------------- */

    const progressBars = document.querySelectorAll('.mil-prog');

    progressBars.forEach(progressBar => {
        const widthPercentage = progressBar.getAttribute('data-number');
        gsap.fromTo(progressBar, {
            ease: 'sine',
            width: '0%'
        }, {
            width: `${widthPercentage}%`,
            scrollTrigger: {
                trigger: progressBar,
                toggleActions: 'play none none reverse',
                once: true
            },
            duration: 2,
            ease: 'sine'
        });
    });
    /* -------------------------------------------

    price

    ------------------------------------------- */
    var price = document.querySelectorAll('.mil-pricing-table-price');
    var year = document.getElementById('year');
    var month = document.getElementById('month');

    if (price.length > 0 && year && month) {
        year.addEventListener('click', function () {
            this.classList.add('mil-active');
            month.classList.remove('mil-active');
            price.forEach(function (element) {
                element.textContent = element.getAttribute('data-year-price');
            });
        });

        month.addEventListener('click', function () {
            this.classList.add('mil-active');
            year.classList.remove('mil-active');
            price.forEach(function (element) {
                element.textContent = element.getAttribute('data-month-price');
            });
        });
    }

});
