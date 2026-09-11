import React from 'react';
import { Link } from 'react-router-dom';
import LandingNav, { landingLinks } from '../../components/landing/LandingNav';
import LandingFeatures from '../../components/landing/LandingFeatures';
import restaurantEvening from '../../assets/images/landing-evening.webp';
import restaurantDaylight from '../../assets/images/landing-daylight.webp';
import '../../assets/styles/landing.css';
import { useAuth } from '../../context/AuthContext';
import { getLandingActions, focusLandingAnchor } from '../../components/landing/landingNavigation';

function BookTableLink() {
  const auth = useAuth();
  const { booking } = getLandingActions(auth);
  if (auth.isLoading) return <span role="status">Restoring session...</span>;
  return <Link className="bistro-button bistro-button-gold" to={booking.to}>{booking.label} <span aria-hidden="true">↗</span></Link>;
}

const steps = [
  ['Make yourself at home', 'Create your account or log in. Your Cinnamon Bistro experience starts here.'],
  ['Find your favourite spot', 'Choose a date, time, and table size for your gathering.', true],
  ['Make the date', 'Reserve your place, then step forward to good company and a memorable meal.', true],
  ['Settle in & enjoy', 'Leave the everyday behind. Make time for the people around your table.'],
];

export default function LandingPage() {
  const auth = useAuth();
  const actions = getLandingActions(auth);
  const bookingNote = auth.isLoading ? "Online reservations coming soon." : auth.isAuthenticated ? "Online reservations coming soon. Your workspace is ready." : "Online reservations coming soon. Create your account today.";
  return (
    <div className="bistro-landing" id="home" tabIndex={-1} onClick={focusLandingAnchor}>
      <a className="bistro-skip" href="#main-content">Skip to content</a>
      <LandingNav actions={actions} isLoading={auth.isLoading} />
      <main id="main-content" tabIndex={-1}>
        <section className="bistro-hero" aria-labelledby="hero-title">
          <img className="bistro-hero-image" src={restaurantEvening} alt="Warm pendant lights above elegantly set tables in a cosy restaurant" fetchPriority="high" width="1672" height="941" />
          <div className="bistro-hero-shade" />
          <div className="bistro-hero-content">
            <p className="bistro-eyebrow"><span aria-hidden="true">✦</span> Welcome to Cinnamon Bistro</p>
            <h1 id="hero-title">A place to gather.<br />A moment to <em>savour.</em></h1>
            <p className="bistro-hero-description">Warm surroundings. Good company. A more thoughtful way to dine. Your next Cinnamon Bistro moment starts here.</p>
            <div className="bistro-actions"><BookTableLink /><a className="bistro-explore" href="#about">Explore Cinnamon Bistro <span aria-hidden="true">↓</span></a></div>
            <p className="bistro-booking-note">{bookingNote}</p>
          </div>
          <div className="bistro-hero-bottom"><span>Good food brings us together.</span><a href="#about">Discover the experience <span aria-hidden="true">↓</span></a></div>
        </section>

        <div className="bistro-values" aria-label="Our approach"><span>Thoughtful dining</span><span aria-hidden="true">✦</span><span>Warm hospitality</span><span aria-hidden="true">✦</span><span>Simply connected</span></div>

        <section className="bistro-section bistro-about" id="about" aria-labelledby="about-title">
          <div className="bistro-about-photo"><img src={restaurantDaylight} alt="Sunlit dining nook with curved seating, fresh greenery, and a table set for guests" width="1100" height="880" loading="lazy" /><span className="bistro-photo-note">Pull up a chair.<br /><em>Stay a little longer.</em></span></div>
          <div className="bistro-about-copy"><p className="bistro-eyebrow">The Cinnamon Bistro experience</p><h2 id="about-title">More than a table.<br /><em>A place to belong.</em></h2><p>Some of the best moments happen around a table. A catch-up that lasts a little longer. A celebration shared. A quiet evening that becomes something special.</p><p>We’re pairing that familiar warmth with a simpler digital experience: secure accounts, personal profiles, and thoughtful seating management. With convenient online reservations coming next, there’s more to look forward to.</p><a className="bistro-text-link" href="#features">Discover what makes us different <span aria-hidden="true">↗</span></a></div>
        </section>

        <LandingFeatures />

        <section className="bistro-section bistro-steps" aria-labelledby="steps-title">
          <p className="bistro-eyebrow">Your next visit, made simple</p><h2 id="steps-title">From hello to <em>having a seat.</em></h2><p className="bistro-steps-intro">A look at the dining journey we’re building. Accounts are ready; online table search and reservations are coming soon.</p>
          <ol className="bistro-step-grid">{steps.map(([title, text, soon], index) => <li key={title}><span className="bistro-step-number" aria-hidden="true">0{index + 1}</span><h3>{title}</h3><p>{text}</p>{soon && <span className="bistro-soon">Coming soon</span>}</li>)}</ol>
        </section>

        <section className="bistro-experience" aria-labelledby="experience-title">
          <img src={restaurantEvening} alt="" loading="lazy" width="1672" height="941" />
          <div className="bistro-experience-copy"><p className="bistro-eyebrow">Less everyday. More occasion.</p><h2 id="experience-title">The details matter.<br /><em>So do your moments.</em></h2><p>A welcoming space, secure personal access, and organised seating behind the scenes. Thoughtful touches for customers and staff, with simpler booking and availability search on the horizon.</p><a className="bistro-text-link" href="#reservations">Make yourself at home <span aria-hidden="true">↗</span></a></div>
        </section>

        <section className="bistro-section bistro-reservations" id="reservations" aria-labelledby="reservations-title"><p className="bistro-eyebrow">There’s a place for you here</p><h2 id="reservations-title">Ready for your next<br /><em>Cinnamon Bistro moment?</em></h2><p>{bookingNote}</p><BookTableLink />{!auth.isLoading && !auth.isAuthenticated && <p className="bistro-existing">Already part of the table? <Link to="/login">Log in</Link></p>}</section>
      </main>

      <footer className="bistro-footer" id="contact">
        <div className="bistro-footer-main"><div><a className="bistro-footer-brand" href="#home">Cinnamon Bistro<span>Gather. Dine. Savour.</span></a><p>A warm welcome.<br />A thoughtful dining experience.</p></div><nav aria-label="Footer navigation"><h2>Explore</h2>{landingLinks.slice(0, 4).map(([label, href]) => <a key={href} href={href}>{label}</a>)}</nav><div><h2>Your Cinnamon Bistro</h2>{!auth.isLoading && <>{actions.secondary && <Link to={actions.secondary.to}>{actions.secondary.label}</Link>}<Link to={actions.primary.to}>{auth.isAuthenticated ? actions.primary.label : "Create an account"}</Link></>}<h2 className="bistro-contact-heading">Contact</h2><p>Contact details will be shared here<br />when available.</p></div></div>
        <div className="bistro-footer-bottom"><span>© {new Date().getFullYear()} Cinnamon Bistro. All rights reserved.</span><a href="#home">Back to top ↑</a></div>
      </footer>
    </div>
  );
}
