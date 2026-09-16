import { NavLink, Outlet } from 'react-router-dom';
import Navigation from '../../public/Navigation';
import Footer from '../../public/Footer';

const CustomerDashboardLayout = () => {
  const navItems = [
    { name: 'Profile', path: '/dashboard/profile', icon: 'person' },
    { name: 'Redeem', path: '/dashboard/redeem', icon: 'stars' },
    { name: 'Appointments', path: '/dashboard/appointments', icon: 'calendar_today' },
    { name: 'Wishlist', path: '/dashboard/wishlist', icon: 'favorite' },
    { name: 'Reviews', path: '/dashboard/reviews', icon: 'star' },
    { name: 'Notifications', path: '/dashboard/notifications', icon: 'notifications' },
  ];

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col font-body-md">
      <Navigation />
      
      <main className="flex-grow flex flex-col md:flex-row mt-20 pt-8 pb-16 px-gutter max-w-container-max-width mx-auto w-full gap-8">
        
        {/* Sidebar */}
        <aside className="w-full md:w-64 flex-shrink-0">
          <div className="bg-surface border border-outline-variant/30 p-6 sticky top-28 luxury-shadow animate-fade-in">
            <h2 className="font-headline-sm text-xl uppercase tracking-widest text-on-surface mb-8 pb-4 border-b border-outline-variant/30">
              My Account
            </h2>
            <nav className="flex flex-col gap-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.path}
                  className={({ isActive }) => 
                    `flex items-center gap-4 px-4 py-3 transition-all duration-300 font-label-md text-label-md uppercase tracking-widest ${
                      isActive 
                        ? 'bg-primary-container/10 text-primary border-l-2 border-primary' 
                        : 'text-secondary hover:bg-surface-container-low hover:text-primary border-l-2 border-transparent'
                    }`
                  }
                >
                  <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                  {item.name}
                </NavLink>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main Content Area */}
        <section className="flex-grow min-w-0">
          <div className="bg-surface border border-outline-variant/30 p-6 md:p-10 luxury-shadow min-h-[500px] animate-fade-in">
            <Outlet />
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
};

export default CustomerDashboardLayout;
