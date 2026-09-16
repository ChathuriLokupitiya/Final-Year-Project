import { Link } from 'react-router-dom';
import Navigation from '../../public/Navigation';
import Footer from '../../public/Footer';

const Privacy = () => {
  return (
    <div className="bg-surface text-on-surface font-body-md min-h-screen flex flex-col selection:bg-primary-container selection:text-on-primary-container">
      <Navigation />

      <main className="flex-1 pt-32 pb-24 max-w-3xl mx-auto px-margin-mobile md:px-gutter">
        <h1 className="font-display-lg text-4xl md:text-display-lg mb-4 text-center">Privacy Policy</h1>
        <p className="font-label-sm text-label-sm uppercase tracking-widest text-secondary text-center mb-4">
          Aura Salone
        </p>
        <p className="font-label-sm text-label-sm uppercase tracking-widest text-secondary text-center mb-16">
          Last Updated: 19 July 2026 · Version 1.0
        </p>

        <div className="space-y-12 text-secondary leading-relaxed">
          <section>
            <h2 className="font-headline-sm text-2xl text-on-surface mb-4">1. Who We Are</h2>
            <p>
              Aura Salone (“Aura”, “we”, “our”, or “us”) operates this salon management website and
              booking platform. This Privacy Policy explains what personal data we collect, how we use it,
              and your choices. By registering or using our Services, you acknowledge this Policy together
              with our{' '}
              <Link to="/terms" className="text-primary hover:underline underline-offset-4">
                Terms of Service
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="font-headline-sm text-2xl text-on-surface mb-4">2. Information We Collect</h2>
            <p className="mb-4">Depending on how you use Aura, we may collect:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong className="text-on-surface">Account data:</strong> name, email, phone, password
                (stored hashed), profile details, avatar, and your acceptance of Terms & Privacy.
              </li>
              <li>
                <strong className="text-on-surface">Booking data:</strong> services, dates/times, staff or
                consultant preferences, notes, payment status, and appointment history.
              </li>
              <li>
                <strong className="text-on-surface">Payment data:</strong> amounts, method, and transaction
                references. Card details are handled by payment processors (e.g. Stripe); we do not store
                full card numbers.
              </li>
              <li>
                <strong className="text-on-surface">Loyalty & promotions:</strong> points balance,
                transactions, coupon usage, and redeem-offer history.
              </li>
              <li>
                <strong className="text-on-surface">Engagement data:</strong> reviews, wishlist items,
                notifications preferences, inquiries, and support chat messages.
              </li>
              <li>
                <strong className="text-on-surface">Technical data:</strong> device/browser information,
                IP address, and cookies or similar technologies used to operate and secure the site.
              </li>
              <li>
                <strong className="text-on-surface">Social login:</strong> if you sign in with Google, we
                receive basic profile information permitted by that provider.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-headline-sm text-2xl text-on-surface mb-4">3. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Create and manage your account and verify your email</li>
              <li>Process bookings, payments, invoices, refunds, and reminders</li>
              <li>Apply coupons, catalog discounts, and loyalty redeem offers</li>
              <li>Send service-related notifications (email/in-app) according to your preferences</li>
              <li>Improve salon operations, staffing, and customer experience</li>
              <li>Moderate reviews, prevent fraud/abuse, and comply with legal obligations</li>
              <li>Respond to contact inquiries and customer support requests</li>
            </ul>
            <p className="mt-4">We do not sell your personal data to third parties.</p>
          </section>

          <section>
            <h2 className="font-headline-sm text-2xl text-on-surface mb-4">4. Legal Bases & Consent</h2>
            <p>
              Where required, we process data based on your consent (for example when you accept these
              Terms and this Privacy Policy at registration), performance of a contract (providing booked
              services), legitimate interests (security, service improvement), and legal obligations.
              You can withdraw marketing-style preferences where offered, but essential service messages
              may still be sent for bookings you make.
            </p>
          </section>

          <section>
            <h2 className="font-headline-sm text-2xl text-on-surface mb-4">5. Sharing & Processors</h2>
            <p className="mb-4">We may share data with:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Payment processors (e.g. Stripe) to complete transactions</li>
              <li>Cloud hosting, email delivery, and image storage providers that help run the platform</li>
              <li>Staff and administrators who need access to fulfil bookings and support</li>
              <li>Authorities when required by law or to protect rights and safety</li>
            </ul>
            <p className="mt-4">
              Service providers are expected to process data only for agreed purposes and with appropriate safeguards.
            </p>
          </section>

          <section>
            <h2 className="font-headline-sm text-2xl text-on-surface mb-4">6. Retention</h2>
            <p>
              We keep personal data only as long as needed for the purposes above—typically for the life
              of your account plus a reasonable period for legal, accounting, and dispute-resolution needs
              (for example booking and payment records). You may request account deletion subject to
              residual legal retention requirements.
            </p>
          </section>

          <section>
            <h2 className="font-headline-sm text-2xl text-on-surface mb-4">7. Security</h2>
            <p>
              We use industry-standard measures such as encrypted transport (HTTPS), hashed passwords,
              access controls, and rate limiting. No method of transmission or storage is completely
              secure; please use a strong unique password and notify us of suspected unauthorized access.
            </p>
          </section>

          <section>
            <h2 className="font-headline-sm text-2xl text-on-surface mb-4">8. Cookies</h2>
            <p>
              We use cookies and similar technologies for authentication, preferences, and understanding
              how the site is used. You can control cookies through your browser settings; disabling some
              cookies may affect login or booking features.
            </p>
          </section>

          <section>
            <h2 className="font-headline-sm text-2xl text-on-surface mb-4">9. Your Rights</h2>
            <p className="mb-4">Subject to applicable law, you may request to:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Access or correct your personal data</li>
              <li>Update profile and notification preferences in your dashboard</li>
              <li>Request deletion of your account where feasible</li>
              <li>Object to or restrict certain processing</li>
            </ul>
            <p className="mt-4">
              Contact{' '}
              <a href="mailto:concierge@aura.lk" className="text-primary hover:underline underline-offset-4">
                concierge@aura.lk
              </a>{' '}
              or use our{' '}
              <Link to="/contact" className="text-primary hover:underline underline-offset-4">
                Contact
              </Link>{' '}
              page. We may need to verify your identity before fulfilling requests.
            </p>
          </section>

          <section>
            <h2 className="font-headline-sm text-2xl text-on-surface mb-4">10. Children’s Privacy</h2>
            <p>
              The Services are not directed to children under 16. If you believe we have collected data
              from a child, please contact us so we can delete it.
            </p>
          </section>

          <section>
            <h2 className="font-headline-sm text-2xl text-on-surface mb-4">11. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy periodically. The “Last Updated” date and version will
              change when we do. Continued use after updates means you accept the revised Policy. For
              significant changes we may provide additional notice.
            </p>
          </section>

          <section>
            <h2 className="font-headline-sm text-2xl text-on-surface mb-4">12. Contact</h2>
            <p>
              Privacy questions:{' '}
              <a href="mailto:concierge@aura.lk" className="text-primary hover:underline underline-offset-4">
                concierge@aura.lk
              </a>
              .
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Privacy;
