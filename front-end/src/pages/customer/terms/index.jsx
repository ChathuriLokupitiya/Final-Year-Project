import { Link } from 'react-router-dom';
import Navigation from '../../public/Navigation';
import Footer from '../../public/Footer';

const Terms = () => {
  return (
    <div className="bg-surface text-on-surface font-body-md min-h-screen flex flex-col selection:bg-primary-container selection:text-on-primary-container">
      <Navigation />

      <main className="flex-1 pt-32 pb-24 max-w-3xl mx-auto px-margin-mobile md:px-gutter">
        <h1 className="font-display-lg text-4xl md:text-display-lg mb-4 text-center">Terms of Service</h1>
        <p className="font-label-sm text-label-sm uppercase tracking-widest text-secondary text-center mb-4">
          Aura Salone
        </p>
        <p className="font-label-sm text-label-sm uppercase tracking-widest text-secondary text-center mb-16">
          Last Updated: 19 July 2026 · Version 1.0
        </p>

        <div className="space-y-12 text-secondary leading-relaxed">
          <section>
            <h2 className="font-headline-sm text-2xl text-on-surface mb-4">1. Acceptance of Terms</h2>
            <p className="mb-4">
              These Terms of Service (“Terms”) govern your access to and use of the Aura Salone website,
              mobile experience, booking platform, and related services (collectively, the “Services”)
              operated by Aura Salone (“Aura”, “we”, “our”, or “us”).
            </p>
            <p>
              By creating an account, booking an appointment, or otherwise using the Services, you confirm
              that you have read, understood, and agree to these Terms and our{' '}
              <Link to="/privacy" className="text-primary hover:underline underline-offset-4">
                Privacy Policy
              </Link>
              . If you do not agree, do not use the Services.
            </p>
          </section>

          <section>
            <h2 className="font-headline-sm text-2xl text-on-surface mb-4">2. Eligibility & Accounts</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>You must provide accurate registration details and keep them up to date.</li>
              <li>You are responsible for safeguarding your login credentials and for activity under your account.</li>
              <li>We may suspend or close accounts that are inaccurate, abusive, fraudulent, or in breach of these Terms.</li>
              <li>Staff and admin accounts are issued only by Aura and remain subject to internal policies.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-headline-sm text-2xl text-on-surface mb-4">3. Services We Provide</h2>
            <p className="mb-4">Through the platform you may:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Browse salon services and consultations, pricing, and availability</li>
              <li>Book, reschedule, or cancel appointments (subject to salon rules)</li>
              <li>Pay online (including Stripe) or confirm other accepted payment methods</li>
              <li>Use loyalty points, redeem offers, and apply valid coupons where eligible</li>
              <li>Leave reviews, manage a wishlist, and receive booking notifications</li>
            </ul>
            <p className="mt-4">
              Service descriptions, durations, and prices shown online are indicative and may be updated.
              Final charges follow the booking confirmation and any applicable discounts.
            </p>
          </section>

          <section>
            <h2 className="font-headline-sm text-2xl text-on-surface mb-4">4. Bookings, Availability & Attendance</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                Time slots that conflict with existing bookings, staff leave, or daily limits may appear
                unavailable and cannot be selected.
              </li>
              <li>
                Please arrive on time. Late arrival may shorten your service or require rescheduling at
                Aura’s discretion.
              </li>
              <li>
                We recommend at least <strong className="text-on-surface">24 hours’ notice</strong> to
                cancel or reschedule. Late cancellations or no-shows may incur a fee of up to 50% of the
                booked service value, or forfeiture of prepaid amounts, as communicated at booking.
              </li>
              <li>Aura may reassign staff when needed while aiming to honour your preferred stylist or consultant.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-headline-sm text-2xl text-on-surface mb-4">5. Payments, Refunds & Promotions</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Online payments are processed by third-party providers (e.g. Stripe). Their terms also apply.</li>
              <li>Prices are typically displayed in LKR unless otherwise stated.</li>
              <li>Coupons, catalog discounts, and loyalty redeem offers are subject to validity dates, service restrictions, and usage limits.</li>
              <li>Refunds, if any, follow Aura’s refund policy for the payment method used and the appointment status.</li>
              <li>Loyalty points have no cash value except as allowed under our redeem offers.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-headline-sm text-2xl text-on-surface mb-4">6. Conduct in the Salon & Online</h2>
            <p className="mb-4">
              Please keep devices on silent and treat staff and other guests respectfully. We may refuse
              or end service where behaviour is unsafe, discriminatory, or disruptive.
            </p>
            <p>
              You must not misuse the platform (including attempting to bypass booking rules, scrape data,
              or post false reviews). Content you submit (reviews, messages, images) must be lawful and
              may be moderated.
            </p>
          </section>

          <section>
            <h2 className="font-headline-sm text-2xl text-on-surface mb-4">7. Health & Treatment Disclaimer</h2>
            <p>
              Beauty and wellness services may not be suitable for every condition. You should disclose
              relevant allergies, medical conditions, or sensitivities before treatment. Aura is not a
              substitute for medical advice. Results vary; we do not guarantee specific outcomes.
            </p>
          </section>

          <section>
            <h2 className="font-headline-sm text-2xl text-on-surface mb-4">8. Intellectual Property</h2>
            <p>
              Website content, branding, logos, gallery images, and software are owned by Aura or its
              licensors. You may not copy, redistribute, or commercially exploit them without prior written consent.
            </p>
          </section>

          <section>
            <h2 className="font-headline-sm text-2xl text-on-surface mb-4">9. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by law, Aura is not liable for indirect, incidental, or
              consequential losses arising from use of the Services or salon visits, except where liability
              cannot be excluded (including for death or personal injury caused by negligence, or fraud).
              Our total liability related to a booking is generally limited to the amount you paid for that booking.
            </p>
          </section>

          <section>
            <h2 className="font-headline-sm text-2xl text-on-surface mb-4">10. Changes to These Terms</h2>
            <p>
              We may update these Terms from time to time. The “Last Updated” date and version above will
              change when we do. Continued use of the Services after updates constitutes acceptance of the
              revised Terms. Material changes may also be communicated by email or in-app notice.
            </p>
          </section>

          <section>
            <h2 className="font-headline-sm text-2xl text-on-surface mb-4">11. Contact</h2>
            <p>
              Questions about these Terms:{' '}
              <a href="mailto:concierge@aura.lk" className="text-primary hover:underline underline-offset-4">
                concierge@aura.lk
              </a>
              . You can also reach us via the{' '}
              <Link to="/contact" className="text-primary hover:underline underline-offset-4">
                Contact
              </Link>{' '}
              page.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Terms;
