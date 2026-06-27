<!DOCTYPE html>
<html lang="en">

<?php $title = 'HomeRise - Construction & Industry PHP Template' ?>
<?php include './partials/head.php' ?>

<body>

  <div class="has-smooth" id="has_smooth"></div>
  <div id="smooth-wrapper">
    <div id="smooth-content">
      <!-- side toggle start -->
        <?php include './partials/sidebar.php' ?>
      <!-- side toggle end -->

      <!-- Header area start -->
        <?php include './partials/header.php' ?>
      <!-- Header area end -->

      <!-- Sroll to top -->
        <?php include './partials/scroll-to-top.php' ?>

      <main class="bg-white">
        <div class="layout">
          <!-- Breadcumb -->
          <div class="breadcumb fix">
            <div class="shapeone">
              <img src="assets/img/breadcumb/shape1.png" alt="shape">
            </div>
            <div class="shapetwo">
              <img src="assets/img/breadcumb/shape2.png" alt="shape">
            </div>
            <div class="breadcumb__bg">
              <img src="assets/img/breadcumb/breadcumb-bg.jpg" alt="bg-thumb">
            </div>
            <div class="container">
              <div class="row">
                <div class="breadcumb__wrap">
                  <div class="breadcumb__title">Project Details</div>
                  <nav class="breadcumb__nav">
                    <ul>
                      <li><a href="index.php">Home</a></li>
                      <li><i class="fa-solid fa-chevron-right"></i></li>
                      <li><a class="active" href="project-details.php">Project Details</a></li>
                    </ul>
                  </nav>
                </div>
              </div>
            </div>
          </div>

          <!-- Project Details Page -->
          <div class="project-details section-padding">
            <div class="container">
              <div class="project-details__thumb">
                <img src="assets/img/inner/project/project-details-thumb1.jpg" alt="thumb">
              </div>
              <div class="project-details__wrap">
                <div class="row gy-4">
                  <!-- Left Content -->
                  <div class="col-lg-8">
                    <div class="project-details__content">
                      <!-- Header -->
                      <div class="project-details__header mb-4">
                        <div class="d-flex flex-wrap align-items-center mb-4 gap-xl-5 gap-2">
                          <span class="typo-text-m text-secondary-color"><i class="fa-solid fa-location-dot typo-primary-color me-1"></i> Niagara Falls,
                            Banff
                            National Park</span>

                          <span class="typo-text-m text-secondary-color"> <i class="fa-solid fa-calendar-days typo-primary-color me-1"></i> 11 March
                            2025</span>
                        </div>
                        <h3 class="project-details__title mb-3">Luxury Apartment Renovation</h3>
                        <p class="project-details__description text-secondary-color">
                          Transform your living space with our luxury apartment renovation services. From elegant
                          interiors to smart technology, we deliver modern, high-end upgrades that enhance
                          comfort,
                          style, and value in every corner of your home.
                        </p>
                      </div>

                      <!-- Full Interior Makeover -->
                      <div class="project-details__block">
                        <h5 class="typo-secondary-color">Full Interior Makeover</h5>
                        <ul>
                          <li><strong> <i class="fa-solid fa-arrow-right"></i>Scope:</strong> Living room,
                            bedrooms,
                            kitchen, and bathrooms</li>
                          <li><strong> <i class="fa-solid fa-arrow-right"></i>Upgrades:</strong> Italian marble
                            flooring, custom lighting, luxury paint
                            finishes</li>
                          <li><strong> <i class="fa-solid fa-arrow-right"></i>Goal:</strong> Transform outdated
                            space
                            into a modern, elegant residence</li>
                        </ul>
                      </div>

                      <!-- Kitchen Remodeling -->
                      <div class="project-details__block">
                        <h5 class="typo-secondary-color">Kitchen Remodeling with Smart Tech</h5>
                        <ul>
                          <li><strong> <i class="fa-solid fa-arrow-right"></i>Scope:</strong> High-end modular
                            kitchen
                            upgrade</li>
                          <li><strong> <i class="fa-solid fa-arrow-right"></i>Features:</strong> Quartz
                            countertops,
                            touchless faucets, built-in smart
                            appliance</li>
                          <li><strong> <i class="fa-solid fa-arrow-right"></i>Goal:</strong> Maximize
                            functionality
                            with a sleek, contemporary design</li>
                        </ul>
                      </div>

                      <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
                        <!-- Living & Dining -->
                        <div class="project-details__block mb-0">
                          <h5 class="typo-secondary-color">Living & Dining Area Redesign</h5>
                          <ul>
                            <li><strong> <i class="fa-solid fa-arrow-right"></i>Scope:</strong> Open-concept
                              transformation</li>
                            <li><strong> <i class="fa-solid fa-arrow-right"></i>Upgrades:</strong> False
                              ceiling,
                              designer wallpaper</li>
                            <li><strong> <i class="fa-solid fa-arrow-right"></i>Goal:</strong> Create an
                              inviting
                              space for both family</li>
                          </ul>
                        </div>

                        <!-- Custom Closet -->
                        <div class="project-details__block mb-0">
                          <h5 class="typo-secondary-color">Custom Walk-In Closet & Storage</h5>
                          <ul>
                            <li><strong> <i class="fa-solid fa-arrow-right"></i>Scope:</strong> Bedroom walk-in
                              closet renovation</li>
                            <li><strong> <i class="fa-solid fa-arrow-right"></i>Features:</strong> LED lighting,
                              glass shelves, custom</li>
                            <li><strong> <i class="fa-solid fa-arrow-right"></i>Goal:</strong> Stylish
                              organization
                              with a boutique feel</li>
                          </ul>
                        </div>
                      </div>

                      <!-- Image Row -->
                      <div class="project-details__images row g-3">
                        <div class="col-md-6">
                          <img src="assets/img/inner/project/project-details-thumb2.jpg" alt="Work 1">
                        </div>
                        <div class="col-md-3">
                          <img src="assets/img/inner/project/project-details-thumb3.jpg" alt="Work 2">
                        </div>
                        <div class="col-md-3">
                          <img src="assets/img/inner/project/project-details-thumb4.jpg" alt="Work 3">
                        </div>
                      </div>

                      <!-- Smart Home -->
                      <div class="project-details__block mb-0 mt-4">
                        <h5 class="typo-secondary-color">Smart Home Automation Installation</h5>
                        <ul>
                          <li><strong> <i class="fa-solid fa-arrow-right"></i>Scope:</strong> Full apartment tech
                            integration</li>
                          <li><strong> <i class="fa-solid fa-arrow-right"></i>Features:</strong> Voice-controlled
                            lighting, climate control, smart locks</li>
                          <li><strong> <i class="fa-solid fa-arrow-right"></i>Goal:</strong> Enhance lifestyle
                            with
                            modern, intelligent convenience</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <!-- Right Sidebar -->
                  <div class="col-lg-4">
                    <div class="project-details__sidebar">

                      <div class="project-details__info card p-4 mb-4">
                        <h5 class="pb-3 typo-secondary-color">Project Information</h5>
                        <ul class="list-unstyled mb-0">
                          <li>Client: <strong class="ms-12">Masirul Malan</strong></li>
                          <li>Project Category: <strong class="ms-12">Royel Carafa-brandsl Tower</strong></li>
                          <li>Project Date: <strong class="ms-12">10 May, 2019</strong></li>
                          <li>Submit Date: <strong class="ms-12">29 May, 2024</strong></li>
                          <li>Locations: <strong class="ms-12">NewYork – 4574 Firs, USA</strong></li>
                          <li>Price After: <strong class="ms-12">$2 Million</strong></li>
                        </ul>
                      </div>


                      <div class="project-details__social card border-0 p-4">
                        <h5 class="typo-secondary-color pb-3">Social Icon</h5>
                        <div class="d-flex gap-3">
                          <a href="#" class="text-secondary"><i class="fa-brands fa-twitter"></i></a>
                          <a href="#" class="text-secondary"><i class="fa-brands fa-instagram"></i></a>
                          <a href="#" class="text-secondary"><i class="fa-brands fa-youtube"></i></a>
                          <a href="#" class="text-secondary"><i class="fa-brands fa-facebook-f"></i></a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

        <?php include './partials/footer.php'; ?>
    </div>
  </div>

  <!-- JS here -->
  <?php include './partials/script.php'?>
</body>

</html>