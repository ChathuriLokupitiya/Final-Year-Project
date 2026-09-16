import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import useAuthStore from '../../store/authStore';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    overview: null,
    retention: null,
    revenueData: [],
    peakHours: []
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [overviewRes, retentionRes, revenueRes, peakRes] = await Promise.all([
          api.get('/admin/dashboard'),
          api.get('/admin/analytics/retention'),
          api.get('/admin/analytics/revenue?period=monthly'),
          api.get('/admin/analytics/peak-hours')
        ]);
        
        setData({
          overview: overviewRes.data.data,
          retention: retentionRes.data.data,
          revenueData: revenueRes.data.data || [],
          peakHours: peakRes.data.data || []
        });
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return <LoadingSpinner text="Loading dashboard..." />;
  }

  const { overview, retention, revenueData, peakHours } = data;
  const totalRevenue = overview?.revenue?.total || 0;
  const totalBookings = overview?.appointments?.thisMonth || 0;
  const newCustomers = overview?.customers?.newToday || 0;
  const totalCustomers = overview?.customers?.total || 0;
  
  // Calculate retention percentage
  const returning = retention?.returning || 0;
  const retentionRate = totalCustomers > 0 ? Math.round((returning / totalCustomers) * 100) : 0;
  
  // Calculate revenue growth (MoM)
  const lastMonthRev = overview?.revenue?.lastMonth || 0;
  const thisMonthRev = overview?.revenue?.thisMonth || 0;
  const revGrowth = lastMonthRev > 0 ? Math.round(((thisMonthRev - lastMonthRev) / lastMonthRev) * 100) : 100;
  return (
    <div className="animate-fade-in">
      {/* Welcome & Quick Actions */}
      <section className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface mb-2">Aura Dashboard</h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl">
            Welcome back. Your salon is performing with a <span className="text-primary font-semibold">{revGrowth > 0 ? `+${revGrowth}` : revGrowth}% growth</span> efficiency this month.
          </p>
        </div>
        <div className="flex gap-3">
          {/* Temporarily hidden
          <button className="flex items-center gap-2 px-6 py-3 border border-primary text-primary font-label-md text-label-md hover:bg-primary hover:text-on-primary transition-all">
            <span className="material-symbols-outlined">download</span>
            Export Report
          </button>
          <button className="flex items-center gap-2 px-6 py-3 bg-primary text-on-primary font-label-md text-label-md hover:opacity-90 transition-all luxury-shadow">
            <span className="material-symbols-outlined">campaign</span>
            Send Promo
          </button>
          */}
        </div>
      </section>

      {/* Top Metrics Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter mb-section-gap-mobile lg:mb-12">
        {/* Metric 1 */}
        <div className="bg-surface/70 backdrop-blur-md border border-outline-variant/50 luxury-shadow p-6 flex flex-col justify-between h-40 group hover:-translate-y-1 transition-transform">
          <div className="flex justify-between items-start">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase opacity-60">Total Revenue</span>
            <span className="text-primary material-symbols-outlined">payments</span>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-headline-md text-headline-md text-on-surface text-shadow-sm shadow-primary/20">LKR {(totalRevenue / 1000).toFixed(1)}k</span>
              <span className="font-label-sm text-label-sm text-primary">Total</span>
            </div>
            <div className="w-full h-1 bg-surface-container mt-2 overflow-hidden rounded-full">
              <div className="h-full bg-primary-container w-full"></div>
            </div>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-surface/70 backdrop-blur-md border border-outline-variant/50 luxury-shadow p-6 flex flex-col justify-between h-40 group hover:-translate-y-1 transition-transform">
          <div className="flex justify-between items-start">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase opacity-60">Total Bookings</span>
            <span className="text-primary material-symbols-outlined">calendar_today</span>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-headline-md text-headline-md text-on-surface">{totalBookings}</span>
              <span className="font-label-sm text-label-sm text-primary">{overview?.appointments?.today || 0} today</span>
            </div>
            <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">This month</p>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-surface/70 backdrop-blur-md border border-outline-variant/50 luxury-shadow p-6 flex flex-col justify-between h-40 group hover:-translate-y-1 transition-transform">
          <div className="flex justify-between items-start">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase opacity-60">New Customers</span>
            <span className="text-primary material-symbols-outlined">person_add</span>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-headline-md text-headline-md text-on-surface">{totalCustomers}</span>
              <span className="font-label-sm text-label-sm text-primary">Total</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-6 h-6 rounded-full bg-primary-container flex items-center justify-center text-[10px] text-on-primary-container">+{newCustomers}</div>
              <span className="text-xs text-on-surface-variant">new today</span>
            </div>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-surface/70 backdrop-blur-md border border-outline-variant/50 luxury-shadow p-6 flex flex-col justify-between h-40 group hover:-translate-y-1 transition-transform">
          <div className="flex justify-between items-start">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase opacity-60">Avg Rating</span>
            <span className="text-primary material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-headline-md text-headline-md text-on-surface">{overview?.reviews?.avgRating || '0.0'}</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">/ 5.0</span>
            </div>
            <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">From {overview?.reviews?.total || 0} reviews</p>
          </div>
        </div>
      </section>

      {/* Revenue & Insights Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-gutter mb-12">
        {/* Revenue Analytics Chart */}
        <div className="lg:col-span-8 bg-surface/70 backdrop-blur-md border border-outline-variant/50 luxury-shadow p-8 min-h-[400px] flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Revenue Analytics</h3>
              <p className="font-label-sm text-label-sm text-on-surface-variant">Monthly income performance trends</p>
            </div>
            <select className="bg-transparent border-none text-label-sm text-primary font-semibold focus:ring-0 cursor-pointer outline-none">
              <option>Last 6 Months</option>
              <option>Last Year</option>
            </select>
          </div>
          <div className="flex-1 relative border-b border-l border-outline-variant flex items-end justify-between px-4 pb-2 bg-gradient-to-b from-primary/10 to-transparent">
            {revenueData?.length > 0 ? (
              revenueData.slice(-6).map((item, index) => {
                const maxRev = Math.max(...revenueData.slice(-6).map(r => r.revenue));
                const heightPct = maxRev > 0 ? (item.revenue / maxRev) * 100 : 0;
                return (
                  <div key={index} className="w-12 bg-primary/30 rounded-t-sm hover:bg-primary/50 transition-all cursor-help relative group" style={{ height: `${heightPct}%` }}>
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-on-surface text-on-primary text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">LKR {(item.revenue / 1000).toFixed(1)}k</div>
                  </div>
                );
              })
            ) : (
              <div className="w-full text-center text-sm text-gray-400 mt-20">No revenue data available</div>
            )}
          </div>
          <div className="flex justify-between mt-4 px-4 font-label-sm text-label-sm text-on-surface-variant opacity-60">
            {revenueData?.length > 0 ? (
              revenueData.slice(-6).map((item, index) => {
                const [year, month] = item._id.split('-');
                const date = new Date(year, month - 1);
                return <span key={index}>{date.toLocaleString('default', { month: 'short' })}</span>;
              })
            ) : null}
          </div>
        </div>

        {/* Customer Insights */}
        <div className="lg:col-span-4 flex flex-col gap-gutter">
          {/* Retention Rate */}
          <div className="bg-surface/70 backdrop-blur-md border border-outline-variant/50 luxury-shadow p-6 flex-1 flex flex-col justify-center items-center text-center">
            <h3 className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest mb-6">Retention Rate</h3>
            <div className="relative w-32 h-32 mb-6">
              <svg className="w-full h-full transform -rotate-90">
                <circle className="text-surface-container" cx="64" cy="64" fill="transparent" r="58" stroke="currentColor" strokeWidth="12"></circle>
                <circle className="text-primary" cx="64" cy="64" fill="transparent" r="58" stroke="currentColor" strokeDasharray="364.4" strokeDashoffset={364.4 - (364.4 * retentionRate) / 100} strokeWidth="12"></circle>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-headline-sm text-headline-sm text-on-surface">{retentionRate}%</span>
              </div>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant"><span className="font-semibold text-on-surface">{returning}</span> Returning clients</p>
          </div>

          {/* Growth Stats */}
          <div className="bg-primary text-on-primary luxury-shadow p-6 flex-1">
            <h3 className="font-label-sm text-label-sm uppercase tracking-widest opacity-80 mb-4">Growth Index (MoM)</h3>
            <p className="font-headline-sm text-headline-sm mb-2">Steady Ascent</p>
            <div className="flex items-center gap-4 py-4 border-t border-on-primary/20">
              <div>
                <p className="text-[24px] font-bold">{revGrowth > 0 ? `+${revGrowth}` : revGrowth}%</p>
                <p className="text-[10px] uppercase opacity-70">Revenue Growth</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Busiest Hours Bar Chart */}
      <section className="grid grid-cols-1 gap-gutter">
        <div className="bg-surface/70 backdrop-blur-md border border-outline-variant/50 luxury-shadow p-8">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Busiest Hours of the Day</h3>
              <p className="font-label-sm text-label-sm text-on-surface-variant">Peak booking times based on historical appointments</p>
            </div>
          </div>
          <div className="relative border-b border-l border-outline-variant flex items-end justify-between px-4 pb-2 bg-gradient-to-b from-primary/10 to-transparent min-h-[300px]">
            {peakHours?.length > 0 ? (
              peakHours.sort((a, b) => parseInt(a._id) - parseInt(b._id)).map((item, index) => {
                const maxCount = Math.max(...peakHours.map(p => p.count));
                const heightPct = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                return (
                  <div key={index} className="flex flex-col items-center w-full group relative cursor-help">
                    <div className="absolute -top-10 bg-on-surface text-on-primary text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      {item.count} Bookings
                    </div>
                    <div className="w-8 md:w-16 bg-primary/40 rounded-t-sm hover:bg-primary/60 border-t-2 border-primary transition-all mx-1" style={{ height: `${heightPct}%`, minHeight: '10%' }}></div>
                  </div>
                );
              })
            ) : (
              <div className="w-full text-center text-sm text-gray-400 mt-20 absolute">No peak hour data available</div>
            )}
          </div>
          <div className="flex justify-between mt-4 px-4 font-label-sm text-label-sm text-on-surface-variant opacity-60">
            {peakHours?.length > 0 ? (
              peakHours.sort((a, b) => parseInt(a._id) - parseInt(b._id)).map((item, index) => {
                const hour = parseInt(item._id);
                const ampm = hour >= 12 ? 'PM' : 'AM';
                const displayHour = hour % 12 || 12;
                return <div key={index} className="w-full text-center text-[10px] md:text-xs">{displayHour} {ampm}</div>;
              })
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
};

export default AdminDashboard;
