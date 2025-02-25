<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Medjugorje 2024 - Sky Travel</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/slick-carousel/1.8.1/slick.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/slick-carousel/1.8.1/slick-theme.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/slick-carousel/1.8.1/slick.min.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Arial', sans-serif;
        }

        .nav-container {
            background-color: #ffffff;
            padding: 0;
            position: fixed;
            width: 100%;
            top: 0;
            z-index: 1000;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
        }

        nav {
            max-width: 1400px;
            margin: 0 auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
            height: 90px;
            padding-right: 2rem;
        }

        .logo {
            text-decoration: none;
            display: flex;
            align-items: center;
            height: 100%;
            padding: 0;
        }
        
        .logo-image {
            height: 100%;
            width: auto;
            display: block;
            object-fit: contain;
        }

        .nav-links {
            display: flex;
            gap: 2.5rem;
        }

        .nav-links a {
            text-decoration: none;
            color: #333;
            font-size: 1.1rem;
            padding: 0.5rem 0;
            transition: color 0.3s ease;
        }

        .nav-links a:hover {
            color: #c8a97e;
        }

        .page-header {
            margin-top: 90px;
            padding: 4rem 2rem;
            background: url('/api/placeholder/1920/400') center/cover;
            text-align: center;
            color: white;
            position: relative;
        }

        .page-header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
        }

        .header-content {
            position: relative;
            z-index: 1;
        }

        .header-content h1 {
            font-size: 3rem;
            font-weight: 300;
            margin-bottom: 1rem;
            letter-spacing: 2px;
        }

        .page-content {
            max-width: 1400px;
            margin: 0 auto;
            padding: 3rem 2rem;
        }

        .description {
            max-width: 800px;
            margin: 0 auto 3rem auto;
            text-align: center;
            line-height: 1.6;
            font-size: 1.1rem;
            color: #555;
        }

        .back-link {
            display: inline-block;
            margin-bottom: 2rem;
            color: #c8a97e;
            text-decoration: none;
            font-size: 1.1rem;
            transition: color 0.3s ease;
        }

        .back-link:hover {
            color: #a58863;
        }

        /* Slideshow container */
        .slideshow-container {
            max-width: 900px;
            margin: 0 auto;
            position: relative;
            box-shadow: 0 5px 25px rgba(0, 0, 0, 0.1);
            border-radius: 8px;
            overflow: hidden;
            aspect-ratio: 4/3;
        }

        .slideshow {
            width: 100%;
            height: 100%;
        }

        .slide {
            position: relative;
            height: 0;
            padding-bottom: 75%;
        }

        .slide img {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .slide-caption {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
            padding: 1.5rem;
            color: white;
        }

        .slide-caption h3 {
            font-size: 1.5rem;
            margin-bottom: 0.5rem;
            font-weight: 400;
        }

        .slide-caption p {
            font-size: 1rem;
            opacity: 0.9;
        }

        /* Slick carousel customization */
        .slick-prev,
        .slick-next {
            z-index: 10;
            width: 50px;
            height: 50px;
        }

        .slick-prev {
            left: 20px;
        }

        .slick-next {
            right: 20px;
        }

        .slick-prev:before,
        .slick-next:before {
            font-size: 30px;
            opacity: 0.8;
        }

        .slick-dots {
            bottom: 20px;
            z-index: 5;
        }

        .slick-dots li button:before {
            color: white;
            font-size: 12px;
            opacity: 0.7;
        }

        .slick-dots li.slick-active button:before {
            color: white;
            opacity: 1;
        }

        .image-thumbnails {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 20px;
            justify-content: center;
        }

        .thumbnail {
            width: 100px;
            height: 75px;
            cursor: pointer;
            border-radius: 4px;
            overflow: hidden;
            border: 2px solid transparent;
            transition: all 0.3s ease;
        }

        .thumbnail img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .thumbnail.active {
            border-color: #c8a97e;
        }

        footer {
            background-color: #333;
            color: white;
            padding: 3rem 2rem;
            text-align: center;
            margin-top: 4rem;
        }

        footer p {
            max-width: 600px;
            margin: 0 auto;
            line-height: 1.6;
        }

        @media (max-width: 768px) {
            .nav-links {
                display: none;
            }

            .header-content h1 {
                font-size: 2.5rem;
            }
            
            .slideshow-container {
                aspect-ratio: 1/1;
            }
            
            .slide {
                padding-bottom: 100%;
            }
            
            .thumbnail {
                width: 80px;
                height: 60px;
            }
        }
    </style>
</head>
<body>
    <div class="nav-container">
        <nav>
            <a href="../index.html" class="logo">
                <img src="../images/Logo.jpg" alt="Sky Travel" class="logo-image">
            </a>
            <div class="nav-links">
                <a href="../index.html">Destinations</a>
                <a href="../experiences.html">Experiences</a>
                <a href="../about.html">About</a>
                <a href="../contact.html">Contact</a>
            </div>
        </nav>
    </div>

    <section class="page-header">
        <div class="header-content">
            <h1>Medjugorje 2024</h1>
            <p>Spiritual renewal in Bosnia and Herzegovina</p>
        </div>
    </section>

    <div class="page-content">
        <a href="../experiences.html" class="back-link">← Back to All Experiences</a>
        
        <div class="description">
            <p>In 2024, we embarked on a profound spiritual journey to Medjugorje, a place known for reported apparitions of the Virgin Mary. Our pilgrimage offered moments of deep prayer, reflection, and spiritual renewal in this peaceful sanctuary in Bosnia and Herzegovina.</p>
        </div>
        <div class="slideshow-container">
            <div class="slideshow">
                <?php
                // Path to the image directory
                $image_dir = "../experiences/images/medjugorje2024/";
                
                // Get all image files with a .jpg, .jpeg, .png, or .gif extension
                $images = glob($image_dir . "*.{jpg,jpeg,png,gif}", GLOB_BRACE);
                
                // Check if directory exists and has images
                if (empty($images)) {
                    echo "<p>No images found in the directory. Please check the path.</p>";
                } else {
                    // Loop through all images
                    foreach ($images as $image) {
                        // Get the filename without extension
                        $filename = pathinfo($image, PATHINFO_FILENAME);
                        
                        // Format the title (replace underscores with spaces and capitalize words)
                        $title = ucwords(str_replace('_', ' ', $filename));
                        
                        echo '<div class="slide">';
                        echo '<img src="' . $image . '" alt="' . $title . '">';
                        echo '<div class="slide-caption">';
                        echo '<h3>' . $title . '</h3>';
                        echo '<p>Medjugorje 2024 Pilgrimage</p>';
                        echo '</div>';
                        echo '</div>';
                    }
                }
                ?>
            </div>
        </div>
        
        <div class="image-thumbnails">
            <?php
            // Check if directory exists and has images
            if (!empty($images)) {
                // Loop through all images again for thumbnails
                foreach ($images as $index => $image) {
                    $filename = pathinfo($image, PATHINFO_FILENAME);
                    $title = ucwords(str_replace('_', ' ', $filename));
                    
                    // Add 'active' class to the first thumbnail
                    $active_class = ($index === 0) ? ' active' : '';
                    
                    echo '<div class="thumbnail' . $active_class . '">';
                    echo '<img src="' . $image . '" alt="' . $title . '">';
                    echo '</div>';
                }
            }
            ?>
        </div>
    </div>

    <footer>
        <p>© 2025 Voyage Luxury Travel Agency. Creating extraordinary journeys for discerning travelers.</p>
    </footer>

    <script>
        $(document).ready(function(){
            // Initialize the main slideshow
            $('.slideshow').slick({
                slidesToShow: 1,
                slidesToScroll: 1,
                arrows: true,
                fade: true,
                autoplay: true,
                autoplaySpeed: 5000,
                dots: true,
                adaptiveHeight: true,
                asNavFor: '.image-thumbnails'
            });
            
            // Initialize the thumbnail navigation
            $('.image-thumbnails').slick({
                slidesToShow: 6,
                slidesToScroll: 1,
                asNavFor: '.slideshow',
                dots: false,
                arrows: false,
                centerMode: false,
                focusOnSelect: true,
                responsive: [
                    {
                        breakpoint: 768,
                        settings: {
                            slidesToShow: 4
                        }
                    },
                    {
                        breakpoint: 576,
                        settings: {
                            slidesToShow: 3
                        }
                    }
                ]
            });
            
            // Update active thumbnail class
            $('.slideshow').on('beforeChange', function(event, slick, currentSlide, nextSlide){
                $('.thumbnail').removeClass('active');
                $('.thumbnail').eq(nextSlide).addClass('active');
            });
            
            // Thumbnail click event
            $('.thumbnail').on('click', function(){
                var index = $(this).index();
                $('.slideshow').slick('slickGoTo', index);
                $('.thumbnail').removeClass('active');
                $(this).addClass('active');
            });

            // Navbar transparency effect
            $(window).scroll(function() {
                if ($(window).scrollTop() > 50) {
                    $('.nav-container').css('background', 'rgba(255, 255, 255, 0.95)');
                } else {
                    $('.nav-container').css('background', 'rgba(255, 255, 255, 0.95)');
                }
            });
        });
    </script>
</body>
</html>