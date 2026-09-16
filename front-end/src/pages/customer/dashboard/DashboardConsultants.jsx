const DashboardConsultants = () => {
  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-end mb-8 border-b border-outline-variant/30 pb-4">
        <div>
          <h1 className="font-headline-md text-3xl text-on-surface uppercase tracking-widest mb-2">My Consultants</h1>
          <p className="font-body-md text-secondary">View your assigned specialists and skin consultancy results.</p>
        </div>
        <button className="bg-on-surface text-surface px-6 py-2 font-label-md uppercase tracking-widest hover:bg-primary transition-colors luxury-shadow">
          Start Consultation
        </button>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant/30 p-12 text-center flex flex-col items-center justify-center luxury-shadow opacity-70">
        <span className="material-symbols-outlined text-5xl text-outline mb-4">support_agent</span>
        <h3 className="font-headline-sm text-xl text-on-surface mb-2 uppercase tracking-widest">No Active Consultations</h3>
        <p className="font-body-md text-secondary max-w-md">Start a new skin or hair consultation to get personalized recommendations from our expert specialists.</p>
      </div>
    </div>
  );
};

export default DashboardConsultants;
