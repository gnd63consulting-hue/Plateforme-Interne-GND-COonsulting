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
                  <div class="breadcumb__title">Contact Us</div>
                  <nav class="breadcumb__nav">
                    <ul>
                      <li><a href="index.php">Home</a></li>
                      <li><i class="fa-solid fa-chevron-right"></i></li>
                      <li><a class="active" href="contact.php">Contact</a></li>
                    </ul>
                  </nav>
                </div>
              </div>
            </div>
          </div>

          <!-- Contact Section -->
          <div class="contact-page section-padding pt-0 fix">
            <div class="contact-page__map">
              <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d52808140.21705447!2d-161.46429918210544!3d36.11412792251988!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x54eab584e432360b%3A0x1c3bb99243deb742!2sUnited%20States!5e0!3m2!1sen!2sbd!4v1762587789246!5m2!1sen!2sbd" style="border: 0" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
            </div>
            <div class="container">
              <div class="contact-page__info-wrap">
                <div class="row g-4">
                  <div class="col-xl-4 col-md-6">
                    <div class="contact-info">
                      <div class="contact-info__icon"> <i class="fa-regular fa-location-dot"></i> </div>
                      <p class="contact-info__text typo-text-m">House #5, Street Number #98, brasilia- 70000-000,
                        Brazil.</p>
                    </div>
                  </div>
                  <div class="col-xl-4 col-md-6">
                    <div class="contact-info">
                      <div class="contact-info__icon"> <i class="fa-regular fa-envelope"></i> </div>
                      <a href="mailto:support@diagno.com" class="contact-info__text typo-text-m d-flex justify-content-center hover-color">support@diagno.com</a>
                      <a href="mailto:support@diagno.com" class="contact-info__text typo-text-m d-flex justify-content-center hover-color">contact@diagno.com</a>
                    </div>
                  </div>
                  <div class="col-xl-4 col-md-6">
                    <div class="contact-info">
                      <div class="contact-info__icon"> <i class="fa-regular fa-phone"></i> </div>
                      <a href="tel:45646456" class="contact-info__text typo-text-m d-flex justify-content-center hover-color">+380961381876</a>
                      <a href="tel:45646456" class="contact-info__text typo-text-m d-flex justify-content-center hover-color">+380961381877</a>
                    </div>
                  </div>
                </div>
              </div>

              <div class="contact-form">
                <h3 class="contact-form__title text-secondary-color typo-h-four">Send Your Message To Us</h3>

                <form class="contact-form__form">
                  <div class="row g-3">
                    <div class="col-md-6">
                      <input type="text" class="contact-form__input" placeholder="Enter Your Name">
                    </div>
                    <div class="col-md-6">
                      <input type="text" class="contact-form__input" placeholder="Enter Your Number">
                    </div>

                    <div class="col-md-6">
                      <select class="contact-form__input">
                        <option>Web Design</option>
                        <option>Development</option>
                        <option>SEO</option>
                      </select>
                    </div>
                    <div class="col-md-6">
                      <input type="email" class="contact-form__input" placeholder="Your Email Address">
                    </div>

                    <div class="col-12">
                      <textarea class="contact-form__textarea" rows="5" placeholder="Enter Your Message"></textarea>
                    </div>

                    <div class="col-12">
                      <button type="submit" class="custom-btn custom-btn--primary justify-content-center w-100">
                        <span class="text-one"> Send Message </span>
                        <span class="text-two"> Send Message </span>

                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12.9854 15.4502L15.499 12.9277L11.8057 9.24902L15.3594 6.35156L15.3594 2.59277L11.7988 2.59277L11.7988 9.24121L5.2334     2.69922L2.71973 5.22168L9.41211 11.8896L2.7002 11.8896L2.7002 15.4502L12.9854 15.4502Z" fill="white"></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                </form>
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