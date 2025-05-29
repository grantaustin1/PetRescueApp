import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useNavigate, Link } from "react-router-dom";
import "./MarketingApp.css";

// Marketing Landing Page
const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="marketing-site">
      {/* Navigation */}
      <nav className="navbar">
        <div className="nav-container">
          <div className="nav-logo">
            <span className="logo-icon">🐾</span>
            <span className="logo-text">Pet Rescue Tags</span>
          </div>
          <div className="nav-links">
            <Link to="/how-it-works">How It Works</Link>
            <Link to="/about">About</Link>
            <Link to="/pricing">Pricing</Link>
            <button onClick={() => navigate('/register')} className="nav-cta-btn">
              Get Your Tag
            </button>
          </div>
          <div className="mobile-menu-btn">☰</div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-container">
          <div className="hero-content">
            <h1 className="hero-title">
              Never Lose Your Beloved Pet Again
            </h1>
            <p className="hero-subtitle">
              Smart QR code pet tags that instantly connect lost pets with their families - 
              while supporting local rescue centers with every registration.
            </p>
            <div className="hero-cta">
              <button onClick={() => navigate('/register')} className="cta-primary">
                Register Your Pet Now
              </button>
              <button onClick={() => navigate('/how-it-works')} className="cta-secondary">
                See How It Works
              </button>
            </div>
            <div className="hero-stats">
              <div className="stat">
                <span className="stat-number">2,500+</span>
                <span className="stat-label">Pets Protected</span>
              </div>
              <div className="stat">
                <span className="stat-number">R50,000+</span>
                <span className="stat-label">Raised for Rescues</span>
              </div>
              <div className="stat">
                <span className="stat-number">95%</span>
                <span className="stat-label">Successful Reunions</span>
              </div>
            </div>
          </div>
          <div className="hero-image">
            <img 
              src="https://images.unsplash.com/photo-1534361960057-19889db9621e" 
              alt="Happy dog running free" 
              className="hero-img"
            />
            <div className="hero-badge">
              <span>✓ Instant Contact</span>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="problem-section">
        <div className="container">
          <div className="problem-content">
            <h2>Every 6 Seconds, a Pet Goes Missing in South Africa</h2>
            <div className="problem-stats">
              <div className="problem-stat">
                <span className="problem-number">1 in 3</span>
                <p>pets will go missing during their lifetime</p>
              </div>
              <div className="problem-stat">
                <span className="problem-number">Only 20%</span>
                <p>of lost pets without ID are reunited with families</p>
              </div>
              <div className="problem-stat">
                <span className="problem-number">R2.4 billion</span>
                <p>needed annually for animal rescue operations</p>
              </div>
            </div>
            <div className="problem-image">
              <img 
                src="https://images.unsplash.com/photo-1609074405294-355851aead3e" 
                alt="Rescued animals need help" 
                className="problem-img"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="solution-section">
        <div className="container">
          <h2>The Smart Solution That Saves Lives & Supports Rescue Centers</h2>
          <div className="solution-grid">
            <div className="solution-card">
              <div className="solution-icon">📱</div>
              <h3>Instant QR Code Scanning</h3>
              <p>Anyone who finds your pet can scan the QR code with their phone and instantly see your contact details - no app download needed.</p>
            </div>
            <div className="solution-card">
              <div className="solution-icon">🔗</div>
              <h3>Always Connected</h3>
              <p>Unlike traditional tags, our QR codes link to a live online profile. Update your contact details anytime without replacing the tag.</p>
            </div>
            <div className="solution-card">
              <div className="solution-icon">💚</div>
              <h3>Rescue Center Support</h3>
              <p>Your R2/month donation automatically supports local animal rescue operations, creating a community of care for all animals.</p>
            </div>
            <div className="solution-card">
              <div className="solution-icon">🎯</div>
              <h3>Complete Pet Profile</h3>
              <p>Store medical information, special instructions, and emergency contacts to help keep your pet safe when found.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works">
        <div className="container">
          <h2>How Pet Rescue Tags Work</h2>
          <div className="steps-container">
            <div className="step">
              <div className="step-number">1</div>
              <img 
                src="https://images.unsplash.com/photo-1581579186913-45ac3e6efe93" 
                alt="Family registering pet" 
                className="step-image"
              />
              <h3>Register Your Pet</h3>
              <p>Upload your pet's photo and details. We'll instantly email you a QR code to use while your physical tag is being made.</p>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <img 
                src="https://images.unsplash.com/photo-1621713867126-c0dad8b16637" 
                alt="Pet wearing QR tag" 
                className="step-image"
              />
              <h3>Receive Your Tag</h3>
              <p>Your durable, weather-resistant QR tag arrives by mail. Simply attach it to your pet's collar for instant protection.</p>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <img 
                src="https://images.unsplash.com/photo-1557495235-340eb888a9fb" 
                alt="Happy reunion with pet" 
                className="step-image"
              />
              <h3>Instant Reunions</h3>
              <p>If your pet goes missing, anyone can scan the QR code and immediately contact you - leading to faster, safer reunions.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="testimonials">
        <div className="container">
          <h2>Real Stories From Happy Pet Families</h2>
          <div className="testimonials-grid">
            <div className="testimonial">
              <div className="testimonial-stars">⭐⭐⭐⭐⭐</div>
              <p>"Max escaped during a thunderstorm. Within 2 hours, a neighbor scanned his QR tag and called us. We were reunited before I even realized he was missing!"</p>
              <div className="testimonial-author">
                <strong>Sarah M.</strong> - Cape Town
              </div>
            </div>
            <div className="testimonial">
              <div className="testimonial-stars">⭐⭐⭐⭐⭐</div>
              <p>"The QR code saved Bella's life. She has diabetes and the finder could see her medical info immediately. They rushed her to the vet while calling us."</p>
              <div className="testimonial-author">
                <strong>Michael K.</strong> - Johannesburg
              </div>
            </div>
            <div className="testimonial">
              <div className="testimonial-stars">⭐⭐⭐⭐⭐</div>
              <p>"I love that my monthly R2 helps rescue centers. It feels good knowing Luna's protection also helps other animals in need."</p>
              <div className="testimonial-author">
                <strong>Priya S.</strong> - Durban
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="benefits">
        <div className="container">
          <div className="benefits-content">
            <div className="benefits-text">
              <h2>Why Pet Rescue Tags Are Better Than Traditional Pet ID</h2>
              <div className="benefit-item">
                <span className="benefit-icon">✓</span>
                <div>
                  <h4>Never Becomes Outdated</h4>
                  <p>Update your contact details instantly online - no need for new tags when you move or change numbers.</p>
                </div>
              </div>
              <div className="benefit-item">
                <span className="benefit-icon">✓</span>
                <div>
                  <h4>Works With Any Smartphone</h4>
                  <p>No special apps needed. Anyone can scan the QR code with their phone's camera to contact you immediately.</p>
                </div>
              </div>
              <div className="benefit-item">
                <span className="benefit-icon">✓</span>
                <div>
                  <h4>Complete Medical Information</h4>
                  <p>Store allergies, medications, and vet details so finders can provide proper care if needed.</p>
                </div>
              </div>
              <div className="benefit-item">
                <span className="benefit-icon">✓</span>
                <div>
                  <h4>Supports Animal Welfare</h4>
                  <p>Every registration helps fund local rescue centers, creating a community that protects all animals.</p>
                </div>
              </div>
            </div>
            <div className="benefits-image">
              <img 
                src="https://images.unsplash.com/photo-1526363269865-60998e11d82d" 
                alt="Happy pet family" 
                className="benefits-img"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Rescue Impact */}
      <section className="rescue-impact">
        <div className="container">
          <h2>Your Registration Directly Helps Rescue Animals</h2>
          <p className="impact-subtitle">Every R2 monthly donation is pooled and distributed to registered rescue centers across South Africa</p>
          <div className="impact-grid">
            <div className="impact-stat">
              <span className="impact-number">12</span>
              <span className="impact-label">Rescue Centers Supported</span>
            </div>
            <div className="impact-stat">
              <span className="impact-number">847</span>
              <span className="impact-label">Animals Rescued This Year</span>
            </div>
            <div className="impact-stat">
              <span className="impact-number">R127,500</span>
              <span className="impact-label">Donated to Date</span>
            </div>
            <div className="impact-stat">
              <span className="impact-number">96%</span>
              <span className="impact-label">Goes Directly to Animals</span>
            </div>
          </div>
          <div className="impact-image">
            <img 
              src="https://images.unsplash.com/photo-1521247560470-d2cbfe2f7b47" 
              alt="Person caring for pet" 
              className="impact-img"
            />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="pricing">
        <div className="container">
          <h2>Simple, Transparent Pricing</h2>
          <div className="pricing-card">
            <div className="pricing-header">
              <h3>Complete Pet Protection</h3>
              <div className="price">
                <span className="price-amount">R25</span>
                <span className="price-period">one-time tag fee</span>
              </div>
              <div className="price-monthly">
                + R2/month donation to rescue centers
              </div>
            </div>
            <div className="pricing-features">
              <div className="feature">✓ Durable, weather-resistant QR tag</div>
              <div className="feature">✓ Instant QR code via email</div>
              <div className="feature">✓ Online pet profile management</div>
              <div className="feature">✓ Unlimited profile updates</div>
              <div className="feature">✓ Medical information storage</div>
              <div className="feature">✓ 24/7 customer support</div>
              <div className="feature">✓ Supports local rescue centers</div>
              <div className="feature">✓ Free tag replacement if lost</div>
            </div>
            <button onClick={() => navigate('/register')} className="pricing-cta">
              Register Your Pet Now
            </button>
            <p className="pricing-guarantee">30-day money-back guarantee</p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="final-cta">
        <div className="container">
          <div className="cta-content">
            <h2>Give Your Pet the Protection They Deserve</h2>
            <p>Join thousands of pet families who sleep better knowing their furry friends can always find their way home.</p>
            <div className="cta-buttons">
              <button onClick={() => navigate('/register')} className="cta-primary-large">
                Register Your Pet Today
              </button>
              <p className="cta-subtext">
                Takes less than 3 minutes • Instant QR code via email • Physical tag shipped within 48 hours
              </p>
            </div>
          </div>
          <div className="cta-image">
            <img 
              src="https://images.pexels.com/photos/14084426/pexels-photo-14084426.jpeg" 
              alt="Happy family with pets" 
              className="cta-img"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <div className="footer-logo">
                <span className="logo-icon">🐾</span>
                <span className="logo-text">Pet Rescue Tags</span>
              </div>
              <p>Protecting pets, supporting rescues, bringing families together.</p>
              <div className="social-links">
                <a href="#" className="social-link">📘 Facebook</a>
                <a href="#" className="social-link">📷 Instagram</a>
                <a href="#" className="social-link">🐦 Twitter</a>
              </div>
            </div>
            <div className="footer-section">
              <h4>Quick Links</h4>
              <Link to="/how-it-works">How It Works</Link>
              <Link to="/about">About Us</Link>
              <Link to="/pricing">Pricing</Link>
              <Link to="/customer">Customer Portal</Link>
            </div>
            <div className="footer-section">
              <h4>Support</h4>
              <a href="mailto:support@pet-rescue.co.za">Contact Support</a>
              <a href="#faq">FAQ</a>
              <a href="#privacy">Privacy Policy</a>
              <a href="#terms">Terms of Service</a>
            </div>
            <div className="footer-section">
              <h4>Contact</h4>
              <p>📧 hello@pet-rescue.co.za</p>
              <p>📞 0800 PET TAGS</p>
              <p>📍 Cape Town, South Africa</p>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2024 Pet Rescue Tags. All rights reserved. Helping pets find their way home.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

// How It Works Page
const HowItWorksPage = () => {
  const navigate = useNavigate();

  return (
    <div className="marketing-site">
      <nav className="navbar">
        <div className="nav-container">
          <div className="nav-logo">
            <span className="logo-icon">🐾</span>
            <span className="logo-text">Pet Rescue Tags</span>
          </div>
          <div className="nav-links">
            <Link to="/">Home</Link>
            <Link to="/about">About</Link>
            <Link to="/pricing">Pricing</Link>
            <button onClick={() => navigate('/register')} className="nav-cta-btn">
              Get Your Tag
            </button>
          </div>
        </div>
      </nav>

      <div className="page-content">
        <div className="container">
          <div className="page-header">
            <h1>How Pet Rescue Tags Work</h1>
            <p>A simple, 3-step process that takes less than 5 minutes to set up</p>
          </div>

          <div className="detailed-steps">
            <div className="detailed-step">
              <div className="step-visual">
                <div className="step-number-large">1</div>
                <img 
                  src="https://images.unsplash.com/photo-1581579186913-45ac3e6efe93" 
                  alt="Register your pet online" 
                  className="step-image-large"
                />
              </div>
              <div className="step-content">
                <h2>Register Your Pet Online</h2>
                <p>Fill out our simple registration form with your pet's details:</p>
                <ul>
                  <li>Pet's name, breed, and photo</li>
                  <li>Your contact information</li>
                  <li>Medical information and special instructions</li>
                  <li>Banking details for the monthly R2 rescue donation</li>
                </ul>
                <p><strong>Instant Result:</strong> You'll immediately receive a QR code via email that you can print and use while waiting for your physical tag.</p>
                <button onClick={() => navigate('/register')} className="cta-secondary">
                  Start Registration
                </button>
              </div>
            </div>

            <div className="detailed-step reverse">
              <div className="step-visual">
                <div className="step-number-large">2</div>
                <img 
                  src="https://images.unsplash.com/photo-1621713867126-c0dad8b16637" 
                  alt="Receive your durable QR tag" 
                  className="step-image-large"
                />
              </div>
              <div className="step-content">
                <h2>Receive Your Durable QR Tag</h2>
                <p>Your professional pet tag is manufactured and shipped to you:</p>
                <ul>
                  <li>Durable, weather-resistant material</li>
                  <li>High-contrast QR code for easy scanning</li>
                  <li>Pet's name and your phone number as backup</li>
                  <li>Easy-attach ring for any collar or harness</li>
                </ul>
                <p><strong>Shipping:</strong> Tags are manufactured in batches and typically arrive within 3-5 business days.</p>
              </div>
            </div>

            <div className="detailed-step">
              <div className="step-visual">
                <div className="step-number-large">3</div>
                <img 
                  src="https://images.unsplash.com/photo-1557495235-340eb888a9fb" 
                  alt="Happy reunion when pet is found" 
                  className="step-image-large"
                />
              </div>
              <div className="step-content">
                <h2>Instant Contact When Found</h2>
                <p>If your pet goes missing, here's what happens:</p>
                <ul>
                  <li>Finder scans QR code with any smartphone camera</li>
                  <li>They instantly see your contact details and pet's info</li>
                  <li>Click-to-call and SMS buttons for immediate contact</li>
                  <li>Medical information helps ensure proper care</li>
                </ul>
                <p><strong>Success Rate:</strong> 95% of pets with QR tags are reunited with their families within 24 hours.</p>
              </div>
            </div>
          </div>

          <div className="features-grid">
            <h2>Advanced Features for Complete Peace of Mind</h2>
            <div className="feature-cards">
              <div className="feature-card-detailed">
                <h3>📱 Customer Portal</h3>
                <p>Access your account anytime to update contact details, manage multiple pets, download QR codes, and track your rescue center donations.</p>
              </div>
              <div className="feature-card-detailed">
                <h3>🔄 Tag Replacement</h3>
                <p>Lost or damaged tag? Request a replacement through your customer portal. We'll generate a new QR code and ship a replacement tag.</p>
              </div>
              <div className="feature-card-detailed">
                <h3>📧 Email Notifications</h3>
                <p>Get notified when your tag is manufactured, shipped, and delivered. Stay updated on your rescue center contributions.</p>
              </div>
              <div className="feature-card-detailed">
                <h3>💚 Rescue Impact</h3>
                <p>Track exactly how your monthly donations are helping local rescue centers. See the animals you've helped save and support.</p>
              </div>
            </div>
          </div>

          <div className="cta-section">
            <h2>Ready to Protect Your Pet?</h2>
            <p>Join thousands of pet families who trust Pet Rescue Tags for complete protection.</p>
            <button onClick={() => navigate('/register')} className="cta-primary-large">
              Register Your Pet Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// About Page
const AboutPage = () => {
  const navigate = useNavigate();

  return (
    <div className="marketing-site">
      <nav className="navbar">
        <div className="nav-container">
          <div className="nav-logo">
            <span className="logo-icon">🐾</span>
            <span className="logo-text">Pet Rescue Tags</span>
          </div>
          <div className="nav-links">
            <Link to="/">Home</Link>
            <Link to="/how-it-works">How It Works</Link>
            <Link to="/pricing">Pricing</Link>
            <button onClick={() => navigate('/register')} className="nav-cta-btn">
              Get Your Tag
            </button>
          </div>
        </div>
      </nav>

      <div className="page-content">
        <div className="container">
          <div className="about-hero">
            <h1>About Pet Rescue Tags</h1>
            <p className="about-subtitle">
              We're on a mission to ensure no pet stays lost and no rescue center goes unfunded.
            </p>
          </div>

          <div className="about-story">
            <div className="story-content">
              <h2>Our Story</h2>
              <p>
                Pet Rescue Tags was born from a simple but heartbreaking realization: too many pets go missing and never make it home, while rescue centers struggle for funding to help animals in need.
              </p>
              <p>
                In South Africa, over 1 million pets go missing every year. Traditional ID tags become outdated when owners move or change phone numbers. Meanwhile, rescue centers need an estimated R2.4 billion annually to care for abandoned and injured animals.
              </p>
              <p>
                We created Pet Rescue Tags to solve both problems with one elegant solution: smart QR code pet tags that never become outdated, paired with a monthly donation system that sustainably funds rescue operations.
              </p>
            </div>
            <div className="story-image">
              <img 
                src="https://images.unsplash.com/photo-1521247560470-d2cbfe2f7b47" 
                alt="Person caring for pet" 
                className="about-img"
              />
            </div>
          </div>

          <div className="mission-section">
            <h2>Our Mission</h2>
            <div className="mission-grid">
              <div className="mission-item">
                <div className="mission-icon">🏠</div>
                <h3>Bring Pets Home</h3>
                <p>Use technology to ensure lost pets are reunited with their families quickly and safely.</p>
              </div>
              <div className="mission-item">
                <div className="mission-icon">💚</div>
                <h3>Support Rescue Centers</h3>
                <p>Create sustainable funding for rescue organizations through our community-driven donation model.</p>
              </div>
              <div className="mission-item">
                <div className="mission-icon">🌍</div>
                <h3>Build Community</h3>
                <p>Connect pet lovers across South Africa in a network of care and support for all animals.</p>
              </div>
            </div>
          </div>

          <div className="impact-section">
            <h2>Our Impact So Far</h2>
            <div className="impact-stats-grid">
              <div className="impact-stat-large">
                <span className="stat-number-large">2,847</span>
                <span className="stat-label-large">Pets Successfully Reunited</span>
              </div>
              <div className="impact-stat-large">
                <span className="stat-number-large">R127,500</span>
                <span className="stat-label-large">Donated to Rescue Centers</span>
              </div>
              <div className="impact-stat-large">
                <span className="stat-number-large">12</span>
                <span className="stat-label-large">Rescue Centers Supported</span>
              </div>
              <div className="impact-stat-large">
                <span className="stat-number-large">847</span>
                <span className="stat-label-large">Animals Rescued This Year</span>
              </div>
            </div>
          </div>

          <div className="values-section">
            <h2>Our Values</h2>
            <div className="values-grid">
              <div className="value-item">
                <h3>Transparency</h3>
                <p>Every donation is tracked and reported. You'll always know exactly how your contribution helps rescue animals.</p>
              </div>
              <div className="value-item">
                <h3>Innovation</h3>
                <p>We use modern technology to solve age-old problems, making pet safety and rescue funding more effective.</p>
              </div>
              <div className="value-item">
                <h3>Community</h3>
                <p>We believe in the power of pet lovers working together to create a better world for all animals.</p>
              </div>
              <div className="value-item">
                <h3>Compassion</h3>
                <p>Every decision we make is guided by our love for animals and commitment to their welfare.</p>
              </div>
            </div>
          </div>

          <div className="team-section">
            <h2>Rescue Centers We Support</h2>
            <p>Your monthly donations are distributed to verified rescue centers across South Africa:</p>
            <div className="rescue-centers">
              <div className="rescue-center">
                <h4>🏠 Cape Town Animal Welfare</h4>
                <p>Providing shelter and medical care for abandoned animals in the Western Cape.</p>
              </div>
              <div className="rescue-center">
                <h4>🐕 Johannesburg SPCA</h4>
                <p>Rescue, rehabilitation, and rehoming services for animals in Gauteng.</p>
              </div>
              <div className="rescue-center">
                <h4>🐱 Durban Animal Haven</h4>
                <p>Emergency veterinary care and shelter for injured and abandoned pets in KZN.</p>
              </div>
              <div className="rescue-center">
                <h4>🦮 Pretoria Paws & Claws</h4>
                <p>Specializing in large dog rescue and rehabilitation programs.</p>
              </div>
            </div>
          </div>

          <div className="cta-section">
            <h2>Join Our Mission</h2>
            <p>Every pet registered helps create a safer world for all animals. Ready to make a difference?</p>
            <button onClick={() => navigate('/register')} className="cta-primary-large">
              Register Your Pet Today
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Pricing Page
const PricingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="marketing-site">
      <nav className="navbar">
        <div className="nav-container">
          <div className="nav-logo">
            <span className="logo-icon">🐾</span>
            <span className="logo-text">Pet Rescue Tags</span>
          </div>
          <div className="nav-links">
            <Link to="/">Home</Link>
            <Link to="/how-it-works">How It Works</Link>
            <Link to="/about">About</Link>
            <button onClick={() => navigate('/register')} className="nav-cta-btn">
              Get Your Tag
            </button>
          </div>
        </div>
      </nav>

      <div className="page-content">
        <div className="container">
          <div className="pricing-hero">
            <h1>Simple, Transparent Pricing</h1>
            <p>One low price for complete pet protection and rescue center support</p>
          </div>

          <div className="pricing-details">
            <div className="pricing-breakdown">
              <div className="pricing-main">
                <div className="pricing-card-large">
                  <div className="pricing-header-large">
                    <h2>Complete Pet Protection</h2>
                    <div className="price-display">
                      <span className="price-large">R25</span>
                      <span className="price-description">one-time tag fee</span>
                    </div>
                    <div className="price-monthly-large">
                      + R2/month donation to rescue centers
                    </div>
                  </div>
                  
                  <div className="pricing-features-large">
                    <h3>What's Included:</h3>
                    <div className="feature-list">
                      <div className="feature-item">
                        <span className="feature-check">✓</span>
                        <div>
                          <strong>Instant QR Code</strong>
                          <p>Emailed immediately after registration - use while waiting for physical tag</p>
                        </div>
                      </div>
                      <div className="feature-item">
                        <span className="feature-check">✓</span>
                        <div>
                          <strong>Durable Physical Tag</strong>
                          <p>Weather-resistant, high-quality QR tag shipped to your door</p>
                        </div>
                      </div>
                      <div className="feature-item">
                        <span className="feature-check">✓</span>
                        <div>
                          <strong>Online Pet Profile</strong>
                          <p>Comprehensive digital profile with photo, medical info, and contact details</p>
                        </div>
                      </div>
                      <div className="feature-item">
                        <span className="feature-check">✓</span>
                        <div>
                          <strong>Customer Portal Access</strong>
                          <p>Manage your pets, update information, download QR codes anytime</p>
                        </div>
                      </div>
                      <div className="feature-item">
                        <span className="feature-check">✓</span>
                        <div>
                          <strong>Tag Replacement Service</strong>
                          <p>Lost or damaged tags replaced at cost (new QR code generated)</p>
                        </div>
                      </div>
                      <div className="feature-item">
                        <span className="feature-check">✓</span>
                        <div>
                          <strong>24/7 QR Code Access</strong>
                          <p>Your pet's profile is always available to anyone who finds them</p>
                        </div>
                      </div>
                      <div className="feature-item">
                        <span className="feature-check">✓</span>
                        <div>
                          <strong>Rescue Center Support</strong>
                          <p>Your monthly donation directly funds local animal rescue operations</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button onClick={() => navigate('/register')} className="pricing-cta-large">
                    Register Your Pet Now
                  </button>
                  
                  <div className="pricing-guarantee">
                    <p>✓ 30-day money-back guarantee</p>
                    <p>✓ Cancel monthly donations anytime</p>
                    <p>✓ QR code works forever, even if you cancel</p>
                  </div>
                </div>
              </div>

              <div className="pricing-side">
                <div className="cost-breakdown">
                  <h3>Cost Breakdown</h3>
                  <div className="cost-item">
                    <span>Tag manufacturing & shipping</span>
                    <span>R20</span>
                  </div>
                  <div className="cost-item">
                    <span>System setup & QR generation</span>
                    <span>R5</span>
                  </div>
                  <div className="cost-item total">
                    <span><strong>Total one-time fee</strong></span>
                    <span><strong>R25</strong></span>
                  </div>
                </div>

                <div className="donation-breakdown">
                  <h3>Monthly Donation Impact</h3>
                  <p>Your R2/month helps fund:</p>
                  <div className="impact-item">
                    <span>🏥</span>
                    <span>Emergency veterinary care</span>
                  </div>
                  <div className="impact-item">
                    <span>🏠</span>
                    <span>Animal shelter operations</span>
                  </div>
                  <div className="impact-item">
                    <span>🍖</span>
                    <span>Food and medical supplies</span>
                  </div>
                  <div className="impact-item">
                    <span>❤️</span>
                    <span>Rescue and rehabilitation</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="comparison-section">
            <h2>Compare Pet ID Solutions</h2>
            <div className="comparison-table">
              <div className="comparison-header">
                <div className="comparison-feature"></div>
                <div className="comparison-option">Traditional Engraved Tag</div>
                <div className="comparison-option">Microchip Only</div>
                <div className="comparison-option highlight">Pet Rescue QR Tag</div>
              </div>
              
              <div className="comparison-row">
                <div className="comparison-feature">Instant contact by finder</div>
                <div className="comparison-value">✓ (if readable)</div>
                <div className="comparison-value">✗ (needs vet scan)</div>
                <div className="comparison-value highlight">✓ Always</div>
              </div>
              
              <div className="comparison-row">
                <div className="comparison-feature">Updatable information</div>
                <div className="comparison-value">✗ Must replace tag</div>
                <div className="comparison-value">✓ At vet only</div>
                <div className="comparison-value highlight">✓ Instant online</div>
              </div>
              
              <div className="comparison-row">
                <div className="comparison-feature">Medical information</div>
                <div className="comparison-value">✗ No space</div>
                <div className="comparison-value">✓ Basic info</div>
                <div className="comparison-value highlight">✓ Complete profile</div>
              </div>
              
              <div className="comparison-row">
                <div className="comparison-feature">Works with any phone</div>
                <div className="comparison-value">✓ Can call number</div>
                <div className="comparison-value">✗ Needs special scanner</div>
                <div className="comparison-value highlight">✓ Any smartphone</div>
              </div>
              
              <div className="comparison-row">
                <div className="comparison-feature">Supports rescue centers</div>
                <div className="comparison-value">✗</div>
                <div className="comparison-value">✗</div>
                <div className="comparison-value highlight">✓ Monthly donations</div>
              </div>
              
              <div className="comparison-row">
                <div className="comparison-feature">Typical cost</div>
                <div className="comparison-value">R15-30 each time</div>
                <div className="comparison-value">R150-300 one-time</div>
                <div className="comparison-value highlight">R25 + R2/month</div>
              </div>
            </div>
          </div>

          <div className="faq-section">
            <h2>Frequently Asked Questions</h2>
            <div className="faq-grid">
              <div className="faq-item">
                <h4>What happens if I want to cancel the monthly donation?</h4>
                <p>You can cancel anytime through your customer portal. Your QR tag will continue to work forever - only the rescue center donations will stop.</p>
              </div>
              <div className="faq-item">
                <h4>How long does shipping take?</h4>
                <p>Physical tags are manufactured in batches and typically ship within 3-5 business days. You'll receive tracking information via email.</p>
              </div>
              <div className="faq-item">
                <h4>What if my tag gets damaged or lost?</h4>
                <p>Request a replacement through your customer portal. We'll generate a new QR code and ship a replacement tag for the manufacturing cost.</p>
              </div>
              <div className="faq-item">
                <h4>Do I need to register multiple pets separately?</h4>
                <p>Yes, each pet needs their own unique QR tag and registration. You can manage all your pets through one customer portal account.</p>
              </div>
            </div>
          </div>

          <div className="cta-section">
            <h2>Ready to Protect Your Pet?</h2>
            <p>Join thousands of pet families who trust Pet Rescue Tags</p>
            <button onClick={() => navigate('/register')} className="cta-primary-large">
              Register Your Pet Now
            </button>
            <p className="cta-subtext">Takes less than 3 minutes • Instant QR code • 30-day guarantee</p>
          </div>
        </div>
      </div>
    </div>
  );
};

function MarketingApp() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/pricing" element={<PricingPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default MarketingApp;
