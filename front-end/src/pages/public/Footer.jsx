import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-surface-container-lowest border-t border-outline-variant/20 py-20">
      <div className="max-w-container-max-width mx-auto px-gutter">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-1">
            <div className="font-headline-sm text-headline-sm text-on-surface uppercase mb-6 tracking-tighter">Aura</div>
            <p className="text-on-surface-variant text-sm leading-relaxed mb-6">Redefining the standards of beauty through expert artistry and holistic care in a sanctuary of quiet luxury.</p>
          </div>
          <div className="col-span-1">
            <h6 className="font-label-sm text-label-sm uppercase tracking-widest mb-6 text-on-surface">Experience</h6>
            <ul className="space-y-4">
              <li><Link className="text-sm text-on-surface-variant hover:text-primary transition-colors" to="/services">Our Services</Link></li>
              <li><Link className="text-sm text-on-surface-variant hover:text-primary transition-colors" to="/consultancy">The Artisans</Link></li>
              <li><Link className="text-sm text-on-surface-variant hover:text-primary transition-colors" to="/about">The Sanctuary</Link></li>
              <li><Link className="text-sm text-on-surface-variant hover:text-primary transition-colors" to="/gallery">Rituals Gallery</Link></li>
            </ul>
          </div>
          <div className="col-span-1">
            <h6 className="font-label-sm text-label-sm uppercase tracking-widest mb-6 text-on-surface">Company</h6>
            <ul className="space-y-4">
              <li><Link className="text-sm text-on-surface-variant hover:text-primary transition-colors" to="/about">Our Story</Link></li>
              <li><Link className="text-sm text-on-surface-variant hover:text-primary transition-colors" to="/contact">Contact Us</Link></li>
              <li><Link className="text-sm text-on-surface-variant hover:text-primary transition-colors" to="/terms">Terms of Service</Link></li>
              <li><Link className="text-sm text-on-surface-variant hover:text-primary transition-colors" to="/privacy">Privacy Policy</Link></li>
            </ul>
          </div>
          <div className="col-span-1">
            <h6 className="font-label-sm text-label-sm uppercase tracking-widest mb-6 text-on-surface">Concierge</h6>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary text-sm">location_on</span>
                <span className="text-sm text-on-surface-variant">15 Galle Face Centre Rd, Colombo 03, Sri Lanka</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary text-sm">phone</span>
                <span className="text-sm text-on-surface-variant">+94 11 234 5678</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary text-sm">mail</span>
                <span className="text-sm text-on-surface-variant">concierge@aura.lk</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="pt-12 border-t border-outline-variant/10 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="font-label-sm text-label-sm text-on-surface-variant uppercase">© 2024 Aura Beauty Consultancy. All rights reserved.</p>
          <div className="flex gap-8">
            <Link className="font-label-sm text-label-sm text-on-surface-variant uppercase hover:text-primary transition-colors" to="/terms">Terms of Service</Link>
            <Link className="font-label-sm text-label-sm text-on-surface-variant uppercase hover:text-primary transition-colors" to="/privacy">Privacy Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
