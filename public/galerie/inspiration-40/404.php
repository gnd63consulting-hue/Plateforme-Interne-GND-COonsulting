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
                  <div class="breadcumb__title">Error Page</div>
                  <nav class="breadcumb__nav">
                    <ul>
                      <li><a href="index.php">Home</a></li>
                      <li><i class="fa-solid fa-chevron-right"></i></li>
                      <li><a class="active" href="404.php">Error 404</a></li>
                    </ul>
                  </nav>
                </div>
              </div>
            </div>
          </div>

          <!-- Error Section -->
          <div class="error section-padding fix">
            <div class="container">
              <div class="row d-flex justify-content-center">
                <div class="col-xl-8">
                  <div class="error__wrap">
                    <div class="error__thumb">
                      <img src="assets/img/inner/error/error-thumb.png" alt="thumb">
                    </div>
                    <div class="error__title"><span>Oops! </span> We Built Over This Page</div>
                    <p class="error__text"> Oops! We built over this page or it never existed. Let’s get you back on
                      track—head home or explore our latest construction projects and updates.</p>
                    <div class="button__wrap d-flex justify-content-center">
                      <a href="index.php" class="custom-btn custom-btn--primary">
                        <span class="text-one"> Back To Home </span>
                        <span class="text-two"> Back To Home </span>

                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12.9854 15.4502L15.499 12.9277L11.8057 9.24902L15.3594 6.35156L15.3594 2.59277L11.7988 2.59277L11.7988 9.24121L5.2334 2.69922L2.71973 5.22168L9.41211 11.8896L2.7002 11.8896L2.7002 15.4502L12.9854 15.4502Z" fill="white"></path>
                        </svg>

                      </a>
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