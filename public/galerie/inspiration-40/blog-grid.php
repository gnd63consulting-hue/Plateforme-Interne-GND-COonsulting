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
                  <div class="breadcumb__title">Blog Post</div>
                  <nav class="breadcumb__nav">
                    <ul>
                      <li><a href="index.php">Home</a></li>
                      <li><i class="fa-solid fa-chevron-right"></i></li>
                      <li><a class="active" href="blog-grid.php">Our Blog</a></li>
                    </ul>
                  </nav>
                </div>
              </div>
            </div>
          </div>


          <!-- Blog Grid Page -->
          <div class="blog-grid-page section-padding">
            <div class="container">
              <div class="row gy-32">
                <div class="col-xl-4 col-md-6">
                  <div class="blog-cardone img-hover-ani">
                    <div class="blog-cardone__thumb img-hover-ani"><img src="assets/img/inner/blog/blog-thumb1_1.jpg" alt="thumb">
                    </div>
                    <div class="blog-cardone__content">
                      <div class="blog-cardone__date">
                        <span> 28 </span>
                        <span>June</span>
                      </div>
                      <a class="blog-cardone__title typo-secondary-color hover-color" href="blog-details.php">
                        <h5 class="mb-2 mb-sm-3">Sustainable Building Practices for Modern Projects</h5>
                      </a>
                      <a href="blog-details.php" class="blog-cardone__link hover-color">READ MORE
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12.9854 15.4502L15.499 12.9277L11.8057 9.24902L15.3594 6.35156L15.3594 2.59277L11.7988 2.59277L11.7988 9.24121L5.2334 2.69922L2.71973 5.22168L9.41211 11.8896L2.7002 11.8896L2.7002 15.4502L12.9854 15.4502Z" fill="white"></path>
                        </svg>
                      </a>

                      <div class="blog-cardone__posted mt-4">
                        <div class="blog-cardone__author typo-text-m text-secondary-color">
                          <i class="fa-solid fa-user"></i>
                          <span class="ms-1">By John Doe</span>
                        </div>
                        <div class="blog-cardone__comment typo-text-m text-secondary-color"><i class="fa-solid fa-comments"></i>
                          <span class="ms-1">Comments (04)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="col-xl-4 col-md-6">
                  <div class="blog-cardone img-hover-ani">
                    <div class="blog-cardone__thumb img-hover-ani"><img src="assets/img/inner/blog/blog-thumb1_2.jpg" alt="thumb"></div>
                    <div class="blog-cardone__content">
                      <div class="blog-cardone__date">
                        <span> 28 </span>
                        <span>June</span>
                      </div>
                      <a class="blog-cardone__title typo-secondary-color hover-color" href="blog-details.php">
                        <h5 class="mb-2 mb-sm-3">The Role of Architects in Building Design</h5>
                      </a>
                      <a href="blog-details.php" class="blog-cardone__link hover-color">READ MORE
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12.9854 15.4502L15.499 12.9277L11.8057 9.24902L15.3594 6.35156L15.3594 2.59277L11.7988 2.59277L11.7988 9.24121L5.2334 2.69922L2.71973 5.22168L9.41211 11.8896L2.7002 11.8896L2.7002 15.4502L12.9854 15.4502Z" fill="white"></path>
                        </svg>
                      </a>

                      <div class="blog-cardone__posted mt-4">
                        <div class="blog-cardone__author typo-text-m text-secondary-color">
                          <i class="fa-solid fa-user"></i>
                          <span class="ms-1">By John Doe</span>
                        </div>
                        <div class="blog-cardone__comment typo-text-m text-secondary-color"><i class="fa-solid fa-comments"></i>
                          <span class="ms-1">Comments (04)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="col-xl-4 col-md-6">
                  <div class="blog-cardone img-hover-ani">
                    <div class="blog-cardone__thumb img-hover-ani"><img src="assets/img/inner/blog/blog-thumb1_3.jpg" alt="thumb">
                    </div>
                    <div class="blog-cardone__content">
                      <div class="blog-cardone__date">
                        <span> 28 </span>
                        <span>June</span>
                      </div>
                      <a class="blog-cardone__title typo-secondary-color hover-color" href="blog-details.php">
                        <h5 class="mb-2 mb-sm-3">Best Materials for Long-Lasting Structures</h5>
                      </a>
                      <a href="blog-details.php" class="blog-cardone__link hover-color">READ MORE
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12.9854 15.4502L15.499 12.9277L11.8057 9.24902L15.3594 6.35156L15.3594 2.59277L11.7988 2.59277L11.7988 9.24121L5.2334 2.69922L2.71973 5.22168L9.41211 11.8896L2.7002 11.8896L2.7002 15.4502L12.9854 15.4502Z" fill="white"></path>
                        </svg>
                      </a>

                      <div class="blog-cardone__posted mt-4">
                        <div class="blog-cardone__author typo-text-m text-secondary-color">
                          <i class="fa-solid fa-user"></i>
                          <span class="ms-1">By John Doe</span>
                        </div>
                        <div class="blog-cardone__comment typo-text-m text-secondary-color"><i class="fa-solid fa-comments"></i>
                          <span class="ms-1">Comments (04)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="col-xl-4 col-md-6">
                  <div class="blog-cardone img-hover-ani">
                    <div class="blog-cardone__thumb img-hover-ani"><img src="assets/img/inner/blog/blog-thumb1_4.jpg" alt="thumb">
                    </div>
                    <div class="blog-cardone__content">
                      <div class="blog-cardone__date">
                        <span> 28 </span>
                        <span>June</span>
                      </div>
                      <a class="blog-cardone__title typo-secondary-color hover-color" href="blog-details.php">
                        <h5 class="mb-2 mb-sm-3">Latest Technologies Revolutionizing Construction</h5>
                      </a>
                      <a href="blog-details.php" class="blog-cardone__link hover-color">READ MORE
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12.9854 15.4502L15.499 12.9277L11.8057 9.24902L15.3594 6.35156L15.3594 2.59277L11.7988 2.59277L11.7988 9.24121L5.2334 2.69922L2.71973 5.22168L9.41211 11.8896L2.7002 11.8896L2.7002 15.4502L12.9854 15.4502Z" fill="white"></path>
                        </svg>
                      </a>

                      <div class="blog-cardone__posted mt-4">
                        <div class="blog-cardone__author typo-text-m text-secondary-color">
                          <i class="fa-solid fa-user"></i>
                          <span class="ms-1">By John Doe</span>
                        </div>
                        <div class="blog-cardone__comment typo-text-m text-secondary-color"><i class="fa-solid fa-comments"></i>
                          <span class="ms-1">Comments (04)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="col-xl-4 col-md-6">
                  <div class="blog-cardone img-hover-ani">
                    <div class="blog-cardone__thumb img-hover-ani"><img src="assets/img/inner/blog/blog-thumb1_5.jpg" alt="thumb">
                    </div>
                    <div class="blog-cardone__content">
                      <div class="blog-cardone__date">
                        <span> 28 </span>
                        <span>June</span>
                      </div>
                      <a class="blog-cardone__title typo-secondary-color hover-color" href="blog-details.php">
                        <h5 class="mb-2 mb-sm-3">From Blueprint to Reality A Builder’s Journey</h5>
                      </a>
                      <a href="blog-details.php" class="blog-cardone__link hover-color">READ MORE
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12.9854 15.4502L15.499 12.9277L11.8057 9.24902L15.3594 6.35156L15.3594 2.59277L11.7988 2.59277L11.7988 9.24121L5.2334 2.69922L2.71973 5.22168L9.41211 11.8896L2.7002 11.8896L2.7002 15.4502L12.9854 15.4502Z" fill="white"></path>
                        </svg>
                      </a>

                      <div class="blog-cardone__posted mt-4">
                        <div class="blog-cardone__author typo-text-m text-secondary-color">
                          <i class="fa-solid fa-user"></i>
                          <span class="ms-1">By John Doe</span>
                        </div>
                        <div class="blog-cardone__comment typo-text-m text-secondary-color"><i class="fa-solid fa-comments"></i>
                          <span class="ms-1">Comments (04)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="col-xl-4 col-md-6">
                  <div class="blog-cardone img-hover-ani">
                    <div class="blog-cardone__thumb img-hover-ani"><img src="assets/img/inner/blog/blog-thumb1_6.jpg" alt="thumb">
                    </div>
                    <div class="blog-cardone__content">
                      <div class="blog-cardone__date">
                        <span> 28 </span>
                        <span>June</span>
                      </div>
                      <a class="blog-cardone__title typo-secondary-color hover-color" href="blog-details.php">
                        <h5 class="mb-2 mb-sm-3">Green Construction Eco-Friendly Building Tips</h5>
                      </a>
                      <a href="blog-details.php" class="blog-cardone__link hover-color">READ MORE
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12.9854 15.4502L15.499 12.9277L11.8057 9.24902L15.3594 6.35156L15.3594 2.59277L11.7988 2.59277L11.7988 9.24121L5.2334 2.69922L2.71973 5.22168L9.41211 11.8896L2.7002 11.8896L2.7002 15.4502L12.9854 15.4502Z" fill="white"></path>
                        </svg>
                      </a>

                      <div class="blog-cardone__posted mt-4">
                        <div class="blog-cardone__author typo-text-m text-secondary-color">
                          <i class="fa-solid fa-user"></i>
                          <span class="ms-1">By John Doe</span>
                        </div>
                        <div class="blog-cardone__comment typo-text-m text-secondary-color"><i class="fa-solid fa-comments"></i>
                          <span class="ms-1">Comments (04)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="col-xl-4 col-md-6">
                  <div class="blog-cardone img-hover-ani">
                    <div class="blog-cardone__thumb img-hover-ani"><img src="assets/img/inner/blog/blog-thumb1_7.jpg" alt="thumb">
                    </div>
                    <div class="blog-cardone__content">
                      <div class="blog-cardone__date">
                        <span> 28 </span>
                        <span>June</span>
                      </div>
                      <a class="blog-cardone__title typo-secondary-color hover-color" href="blog-details.php">
                        <h5 class="mb-2 mb-sm-3">What to Expect During the Construction Phase</h5>
                      </a>
                      <a href="blog-details.php" class="blog-cardone__link hover-color">READ MORE
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12.9854 15.4502L15.499 12.9277L11.8057 9.24902L15.3594 6.35156L15.3594 2.59277L11.7988 2.59277L11.7988 9.24121L5.2334 2.69922L2.71973 5.22168L9.41211 11.8896L2.7002 11.8896L2.7002 15.4502L12.9854 15.4502Z" fill="white"></path>
                        </svg>
                      </a>

                      <div class="blog-cardone__posted mt-4">
                        <div class="blog-cardone__author typo-text-m text-secondary-color">
                          <i class="fa-solid fa-user"></i>
                          <span class="ms-1">By John Doe</span>
                        </div>
                        <div class="blog-cardone__comment typo-text-m text-secondary-color"><i class="fa-solid fa-comments"></i>
                          <span class="ms-1">Comments (04)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="col-xl-4 col-md-6">
                  <div class="blog-cardone img-hover-ani">
                    <div class="blog-cardone__thumb img-hover-ani"><img src="assets/img/inner/blog/blog-thumb1_8.jpg" alt="thumb">
                    </div>
                    <div class="blog-cardone__content">
                      <div class="blog-cardone__date">
                        <span> 28 </span>
                        <span>June</span>
                      </div>
                      <a class="blog-cardone__title typo-secondary-color hover-color" href="blog-details.php">
                        <h5 class="mb-2 mb-sm-3">Understanding the Construction Bidding Process</h5>
                      </a>
                      <a href="blog-details.php" class="blog-cardone__link hover-color">READ MORE
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12.9854 15.4502L15.499 12.9277L11.8057 9.24902L15.3594 6.35156L15.3594 2.59277L11.7988 2.59277L11.7988 9.24121L5.2334 2.69922L2.71973 5.22168L9.41211 11.8896L2.7002 11.8896L2.7002 15.4502L12.9854 15.4502Z" fill="white"></path>
                        </svg>
                      </a>

                      <div class="blog-cardone__posted mt-4">
                        <div class="blog-cardone__author typo-text-m text-secondary-color">
                          <i class="fa-solid fa-user"></i>
                          <span class="ms-1">By John Doe</span>
                        </div>
                        <div class="blog-cardone__comment typo-text-m text-secondary-color"><i class="fa-solid fa-comments"></i>
                          <span class="ms-1">Comments (04)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="col-xl-4 col-md-6">
                  <div class="blog-cardone img-hover-ani">
                    <div class="blog-cardone__thumb img-hover-ani"><img src="assets/img/inner/blog/blog-thumb1_9.jpg" alt="thumb">
                    </div>
                    <div class="blog-cardone__content">
                      <div class="blog-cardone__date">
                        <span> 28 </span>
                        <span>June</span>
                      </div>
                      <a class="blog-cardone__title typo-secondary-color hover-color" href="blog-details.php">
                        <h5 class="mb-2 mb-sm-3">Why Foundation Work Is the Key to Strong Structures</h5>
                      </a>
                      <a href="blog-details.php" class="blog-cardone__link hover-color">READ MORE
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12.9854 15.4502L15.499 12.9277L11.8057 9.24902L15.3594 6.35156L15.3594 2.59277L11.7988 2.59277L11.7988 9.24121L5.2334 2.69922L2.71973 5.22168L9.41211 11.8896L2.7002 11.8896L2.7002 15.4502L12.9854 15.4502Z" fill="white"></path>
                        </svg>
                      </a>

                      <div class="blog-cardone__posted mt-4">
                        <div class="blog-cardone__author typo-text-m text-secondary-color">
                          <i class="fa-solid fa-user"></i>
                          <span class="ms-1">By John Doe</span>
                        </div>
                        <div class="blog-cardone__comment typo-text-m text-secondary-color"><i class="fa-solid fa-comments"></i>
                          <span class="ms-1">Comments (04)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Works directly with Laravel pagination: -->
              <!-- =========================================

        {{ $data->links('pagination::bootstrap-5') }} 

        ==========================================-->

              <nav class="pagination-area mt-48" aria-label="Page navigation">
                <ul class="pagination justify-content-center">
                  <!-- Previous Button -->
                  <li class="page-item disabled">
                    <a class="page-link" tabindex="-1" aria-disabled="true">
                      Perv
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M5.01465 15.4492L2.50293 12.9277L6.19531 9.25L2.64063 6.35156L2.64063 2.59277L6.20117 2.59277L6.20117 9.24316L12.7686 2.69922L15.2813 5.22168L8.58887 11.8896L15.3008 11.8896L15.3008 15.4502L5.01465 15.4502L5.01465 15.4492Z" fill="#0E121D" />
                      </svg>
                    </a>
                  </li>

                  <!-- Numbered Pages -->
                  <li class="page-item active"><a class="page-link" href="#">01</a></li>
                  <li class="page-item"><a class="page-link" href="#">02</a></li>
                  <li class="page-item"><a class="page-link" href="#">03</a></li>
                  <li class="page-item"><a class="page-link" href="#">...</a></li>
                  <li class="page-item"><a class="page-link" href="#">10</a></li>

                  <!-- Next Button -->
                  <li class="page-item">
                    <a class="page-link" href="#" aria-label="Next">
                      Next
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12.9854 15.4492L15.4971 12.9277L11.8047 9.25L15.3594 6.35156L15.3594 2.59277L11.7988 2.59277L11.7988 9.24316L5.23145 2.69922L2.71875 5.22168L9.41113 11.8896L2.69922 11.8896L2.69922 15.4502L12.9854 15.4502L12.9854 15.4492Z" fill="white" />
                      </svg>

                    </a>
                  </li>
                </ul>
              </nav>
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