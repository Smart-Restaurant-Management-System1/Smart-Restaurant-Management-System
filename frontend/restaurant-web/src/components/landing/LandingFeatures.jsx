import React from 'react';

const features = [
  { title: 'Easy table reservations', symbol: '01', text: 'Your next gathering, a little easier to plan. Online booking is on its way.', soon: true },
  { title: 'Secure login & accounts', symbol: '02', text: 'A personal account and secure sign-in, for a more connected dining experience.' },
  { title: 'Table availability', symbol: '03', text: 'Find a table to suit your time and your company. Availability search is coming soon.', soon: true },
  { title: 'Your profile, your way', symbol: '04', text: 'Keep your name and contact details up to date, all in one place.' },
  { title: 'Thoughtful table management', symbol: '05', text: 'Our admin tools keep seating, capacity, and table status organised.' },
  { title: 'Smarter restaurant operations', symbol: '06', text: 'Dedicated customer and staff access helps everyone feel in the right place.' },
];

export default function LandingFeatures() {
  return (
    <section className="bistro-section bistro-features" id="features" aria-labelledby="features-title">
      <div className="bistro-section-heading">
        <div><p className="bistro-eyebrow">A little easier. A lot more enjoyable.</p><h2 id="features-title">Good dining.<br /><em>Thoughtfully connected.</em></h2></div>
        <p>From your first hello to your next visit, we’re bringing a little more simplicity to the table.</p>
      </div>
      <div className="bistro-feature-grid">
        {features.map(({ title, symbol, text, soon }) => (
          <article className="bistro-feature" key={symbol}>
            <div className="bistro-feature-top"><span className="bistro-feature-number" aria-hidden="true">{symbol}</span>{soon && <span className="bistro-soon">Coming soon</span>}</div>
            <h3>{title}</h3><p>{text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
