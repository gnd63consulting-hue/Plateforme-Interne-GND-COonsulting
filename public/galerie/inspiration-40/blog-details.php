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
                  <div class="breadcumb__title">Blog Details</div>
                  <nav class="breadcumb__nav">
                    <ul>
                      <li><a href="index.php">Home</a></li>
                      <li><i class="fa-solid fa-chevron-right"></i></li>
                      <li><a class="active" href="blog-details.php">Blog Details</a></li>
                    </ul>
                  </nav>
                </div>
              </div>
            </div>
          </div>


          <!-- Blog Details Page -->
          <div class="blog-details-page section-padding">
            <div class="container">
              <div class="row gy-5">
                <div class="col-xl-8">
                  <div class="blog-details">

                    <div class="blog-details__thumb">
                      <img src="assets/img/inner/blog/blog-details-thumb1_1.jpg" alt="thumb">
                    </div>

                    <ul class="blog-details__posted">
                      <li class="bg-primary">
                        <i class="fa-solid fa-envelope"></i>
                        By Admin
                      </li>
                      <li>
                        <i class="fa-solid fa-calendar-days"></i>
                        04 Min Read
                      </li>
                      <li>
                        <i class="fa-solid fa-comments"></i>
                        0 Comments
                      </li>
                    </ul>

                    <h3 class="blog-details__title typo-h-three">How to Communicate with Your Construction Team</h3>
                    <p class="blog-details__desc typo-text-m text-secondary-color mb-4">Effective communication is the
                      foundation of any successful construction project. Whether you're a project manager, contractor,
                      or homeowner, clear communication ensures that timelines, budgets, and expectations are met
                      without confusion or costly mistakes.</p>

                    <blockquote class="blog-details__quote">
                      Our team of UI/UX experts conducts a thorough evaluation o the submitted element, analyzing its
                      usability, functionality

                      <span class="author">Jenny Wilson</span>
                    </blockquote>

                    <!-- Operation Section -->
                    <div class="blog-details__operation">
                      <h3 class="blog-details__operation-title">Key Points:</h3>
                      <div class="blog-details__operation-list">
                        <div class="blog-details__operation-subtitle typo-l-s">01. Establish Clear Communication
                          Channels</div>
                        <p class="blog-details__operation-text">
                          Decide early how your team will communicate—whether via emails, messaging apps, on-site
                          meetings, or project management software like Trello or Procore.
                        </p>

                        <div class="blog-details__operation-subtitle typo-l-s">02. Set Expectations Early</div>
                        <p class="blog-details__operation-text">
                          Be clear about your goals, timelines, quality standards, and responsibilities. A shared
                          understanding minimizes misunderstandings and promotes accountability.
                        </p>

                        <div class="blog-details__operation-subtitle typo-l-s">03. Hold Regular Meetings</div>
                        <p class="blog-details__operation-text">
                          Short daily or weekly check-ins help track progress, address issues early, and keep
                          everyone aligned.
                        </p>

                        <div class="blog-details__operation-subtitle typo-l-s">04. Encourage Feedback and Questions
                        </div>
                        <p class="blog-details__operation-text mb-0">
                          Create an environment where workers feel comfortable sharing ideas, concerns, or
                          reporting mistakes without fear of blame.
                        </p>
                      </div>
                    </div>

                    <!-- Feature Section -->
                    <div class="blog-details__feature">
                      <div class="row">
                        <div class="col-lg-6">
                          <div class="blog-details__feature-item mb-4 mb-lg-0">
                            <div class="blog-details__feature-img img-hover-ani">
                              <img src="assets/img/inner/blog/blog-details-thumb1_2.jpg" alt="Environmental Benefits">
                            </div>
                          </div>
                        </div>

                        <div class="col-lg-6">
                          <div class="blog-details__feature-item">
                            <div class="blog-details__feature-img img-hover-ani">
                              <img src="assets/img/inner/blog/blog-details-thumb1_3.jpg" alt="Challenges and Industry Response">
                            </div>
                          </div>
                        </div>


                        <h5 class="blog-details__feature-title mt-32 mb-8">Real-World Example:</h5>
                        <p class="typo-text-m">In a recent commercial build, the project was falling behind due to
                          unclear task assignments. Weekly team huddles and daily update boards helped align
                          everyone, resulting in regained momentum and timely delivery.</p>
                        <div class="col-lg-6">
                          <div class="blog-details__feature-item">
                            <div class="blog-details__feature-content">
                              <ul class="blog-details__feature-list">
                                <li><i class="fa-solid fa-arrow-right"></i> Start with a Communication Plan
                                </li>
                                <li><i class="fa-solid fa-arrow-right"></i> Be Present on Site </li>
                                <li><i class="fa-solid fa-arrow-right"></i> Keep Everyone Informed </li>
                              </ul>
                            </div>
                          </div>
                        </div>

                        <div class="col-lg-6">
                          <div class="blog-details__feature-item">
                            <div class="blog-details__feature-content">
                              <ul class="blog-details__feature-list">
                                <li><i class="fa-solid fa-arrow-right"></i> Use Simple, Direct Language
                                </li>
                                <li><i class="fa-solid fa-arrow-right"></i> Visual Aids Are Powerful </li>
                                <li><i class="fa-solid fa-arrow-right"></i> Respect Time and Roles </li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Final Thoughts -->
                    <div class="blog-details__final">
                      <h3 class="blog-details__final-title mb-8">Conclusion</h3>
                      <p class="blog-details__final-text">
                        Clear, consistent, and respectful communication can make or break a construction project.
                        When your team feels heard and informed, work flows smoother, problems are solved faster,
                        and the final results are stronger.
                      </p>
                    </div>

                    <!-- Tag & Share Section -->
                    <div class="blog-details__tags-share row mb-5">
                      <div class="col-lg-8 col-12">
                        <div class="blog-details__tags">
                          <span>Tags:</span>
                          <a href="#">HotelBooking</a>
                          <a href="#">CityBreak</a>
                          <a href="#">HotelOffer</a>
                        </div>
                      </div>

                      <div class="col-lg-4 col-12 mt-3 mt-lg-0 text-lg-end">
                        <div class="blog-details__share">
                          <a href="#"><i class="fab fa-twitter"></i></a>
                          <a href="#"><i class="fa-brands fa-youtube"></i></a>
                          <a href="#"><i class="fab fa-linkedin-in"></i></a>
                          <a href="#"><i class="fab fa-facebook-f"></i></a>
                        </div>
                      </div>
                    </div>
                  </div>



                  <!-- Blog Details Comments Section -->
                  <div class="blog-details__comments">
                    <div class="blog-details__comments-heading">
                      <h3 class="blog-details__comments-title">02 Comments</h3>
                    </div>

                    <!-- Single Comment -->
                    <div class="blog-details__comment d-flex gap-4 pt-4">
                      <div class="blog-details__comment-image img-hover-ani">
                        <img src="assets/img/inner/blog/comment-author1_1.jpg" alt="img">
                      </div>
                      <div class="blog-details__comment-content">
                        <div class="blog-details__comment-head d-flex flex-wrap gap-2 align-items-center justify-content-between">
                          <div class="blog-details__comment-info">
                            <span class="blog-details__comment-date">February 10, 2025</span>
                            <h5 class="blog-details__comment-author">
                              <a href="blog-details.php">Frank Flores</a>
                            </h5>
                          </div>
                          <button class="blog-details__comment-reply">Reply</button>
                        </div>
                        <p class="blog-details__comment-text mt-30 mb-4">
                          Neque porro est qui dolorem ipsum quia quaed inventor veritatis et quasi architecto
                          var sed efficitur turpis gilla sed sit amet finibus eros. Lorem Ipsum is simply
                          dummy.
                        </p>
                      </div>
                    </div>

                    <!-- Nested Comment -->
                    <div class="blog-details__comment blog-details__comment--reply d-flex gap-4 pt-2 pb-2">
                      <div class="blog-details__comment-image img-hover-ani">
                        <img src="assets/img/inner/blog/comment-author1_2.jpg" alt="img">
                      </div>
                      <div class="blog-details__comment-content">
                        <div class="blog-details__comment-head d-flex flex-wrap gap-2 align-items-center justify-content-between">
                          <div class="blog-details__comment-info">
                            <span class="blog-details__comment-date">February 10, 2025</span>
                            <h5 class="blog-details__comment-author">
                              <a href="blog-details.php">Charlie Tushar</a>
                            </h5>
                          </div>
                          <button class="blog-details__comment-reply">Reply</button>
                        </div>
                        <p class="blog-details__comment-text mt-30 mb-4">
                          Neque porro est qui dolorem ipsum quia quaed inventor veritatis et quasi architecto
                          var sed efficitur turpis gilla sed sit amet finibus eros. Lorem Ipsum is simply
                          dummy.
                        </p>
                      </div>
                    </div>

                    <!-- Single Comment -->
                    <div class="blog-details__comment d-flex gap-4 pb-2">
                      <div class="blog-details__comment-image img-hover-ani">
                        <img src="assets/img/inner/blog/comment-author1_3.jpg" alt="img">
                      </div>
                      <div class="blog-details__comment-content">
                        <div class="blog-details__comment-head d-flex flex-wrap gap-2 align-items-center justify-content-between">
                          <div class="blog-details__comment-info">
                            <span class="blog-details__comment-date">February 10, 2025</span>
                            <h5 class="blog-details__comment-author">
                              <a href="blog-details.php">Fatma Sariqul</a>
                            </h5>
                          </div>
                          <button class="blog-details__comment-reply">Reply</button>
                        </div>
                        <p class="blog-details__comment-text mt-30 mb-4">
                          Neque porro est qui dolorem ipsum quia quaed inventor veritatis et quasi architecto
                          var sed efficitur turpis gilla sed sit amet finibus eros. Lorem Ipsum is simply
                          dummy.
                        </p>
                      </div>
                    </div>
                  </div>


                  <!-- Blog Details Comment Form Section -->
                  <div class="blog-details__comment-form mt-5">
                    <h4 class="blog-details__comment-form-title">Leave a Comment</h4>

                    <form action="#" id="contact-form" method="POST" class="blog-details__form">
                      <div class="row">
                        <div class="col-lg-6">
                          <div class="blog-details__form-group">
                            <label class="typo-l-m" for="name">Your Name</label>
                            <input type="text" name="name" id="name" class="blog-details__form-input" placeholder="Your name">
                          </div>
                        </div>

                        <div class="col-lg-6">
                          <div class="blog-details__form-group">
                            <label class="typo-l-m" for="email">Your Email</label>
                            <input type="email" name="email" id="email" class="blog-details__form-input" placeholder="Email address">
                          </div>
                        </div>

                        <div class="col-lg-12">
                          <div class="blog-details__form-group">
                            <label class="typo-l-m" for="message">Your Message</label>
                            <textarea name="message" id="message" class="blog-details__form-textarea" placeholder="Type your message"></textarea>
                          </div>
                        </div>

                        <div class="col-lg-12">
                          <div class="blog-details__form-button">
                            <button type="submit" class="custom-btn custom-btn--primary">
                              <span class="text-one"> SEND MESSAGE </span>
                              <span class="text-two"> SEND MESSAGE </span>

                              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12.9854 15.4502L15.499 12.9277L11.8057 9.24902L15.3594 6.35156L15.3594 2.59277L11.7988 2.59277L11.7988 9.24121L5.2334 2.69922L2.71973 5.22168L9.41211 11.8896L2.7002 11.8896L2.7002 15.4502L12.9854 15.4502Z" fill="white"></path>
                              </svg>

                            </button>
                          </div>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
                <div class="col-xl-4">
                  <!-- Sidebar -->

                  <div class="sidebar">
                    <div class="row">
                      <div class="col-12">
                        <!-- Search Box -->
                        <div class="sidebar__search">
                          <form class="sidebar__search-form d-flex align-items-center">
                            <input type="text" class=" " placeholder="Search Blog">
                            <button type="submit" class="sidebar__search-btn">
                              <i class="fa-regular fa-magnifying-glass"></i>
                            </button>
                          </form>
                        </div>

                        <!-- Categories -->
                        <div class="sidebar__categories">
                          <h5 class="sidebar__title">Categories</h5>
                          <ul class="sidebar__list">
                            <li class="sidebar__item">
                              <a href="#!">
                                <span><i class="fa-solid fa-arrow-right"></i> Buildings</span>
                                <span>04</span>
                              </a>
                            </li>
                            <li class="sidebar__item">
                              <a href="#!">
                                <span><i class="fa-solid fa-arrow-right"></i> Construction</span>
                                <span>08</span>
                              </a>
                            </li>
                            <li class="sidebar__item">
                              <a href="#!">
                                <span><i class="fa-solid fa-arrow-right"></i> Roofing and
                                  waterproofing</span>
                                <span>02</span>
                              </a>
                            </li>
                            <li class="sidebar__item">
                              <a href="#!">
                                <span><i class="fa-solid fa-arrow-right"></i> Structural safety
                                  audits</span>
                                <span>00</span>
                              </a>
                            </li>
                            <li class="sidebar__item">
                              <a href="#!">
                                <span><i class="fa-solid fa-arrow-right"></i> Emergency repair
                                  services</span>
                                <span>06</span>
                              </a>
                            </li>
                          </ul>
                        </div>
                        <!-- Recent Posts -->
                        <div class="sidebar__recent">
                          <h5 class="sidebar__title">Recent Post</h5>

                          <div class="sidebar__post img-hover-ani">
                            <img src="assets/img/inner/blog/blog-post-thumb1_1.jpg" alt="Post" class="sidebar__post-img">
                            <div class="sidebar__post-content">
                              <p class="sidebar__post-date">
                                <i class="fa-solid fa-calendar-days"></i> April 12, 2025
                              </p>
                              <a href="blog-details.php" class="sidebar__post-title">Key Legal Aspects in
                                Building
                                Construction</a>
                            </div>
                          </div>
                          <div class="sidebar__post img-hover-ani">
                            <img src="assets/img/inner/blog/blog-post-thumb1_2.jpg" alt="Post" class="sidebar__post-img">
                            <div class="sidebar__post-content">
                              <p class="sidebar__post-date">
                                <i class="fa-solid fa-calendar-days"></i> April 12, 2025
                              </p>
                              <a href="blog-details.php" class="sidebar__post-title">How to Choose the
                                Right Construction
                                Site</a>
                            </div>
                          </div>
                          <div class="sidebar__post img-hover-ani">
                            <img src="assets/img/inner/blog/blog-post-thumb1_3.jpg" alt="Post" class="sidebar__post-img">
                            <div class="sidebar__post-content">
                              <p class="sidebar__post-date">
                                <i class="fa-solid fa-calendar-days"></i> April 12, 2025
                              </p>
                              <a href="blog-details.php" class="sidebar__post-title">The Lifecycle of a
                                Construction
                                Project</a>
                            </div>
                          </div>
                        </div>
                        <!-- Tags -->
                        <div class="sidebar__tags">
                          <h5 class="sidebar__title">Tags</h5>
                          <div class="sidebar__tag-list">
                            <a href="#" class="sidebar__tag">Green Building</a>
                            <a href="#" class="sidebar__tag sidebar__tag--active">Business</a>
                            <a href="#" class="sidebar__tag">Design</a>
                            <a href="#" class="sidebar__tag">Development</a>
                            <a href="#" class="sidebar__tag">Marketing</a>
                          </div>
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