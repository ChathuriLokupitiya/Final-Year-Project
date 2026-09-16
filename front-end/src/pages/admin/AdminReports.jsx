import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import adminService from '../../services/adminService';
import useAlertStore from '../../store/alertStore';
import useAuthStore from '../../store/authStore';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const formatLkr = (n) =>
  `LKR ${Number(n || 0).toLocaleString('en-LK', { maximumFractionDigits: 0 })}`;

const formatDate = (d) =>
  d
    ? new Date(d).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '—';

const triggerBlobDownload = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

const getFilenameFromHeaders = (headers, fallback) => {
  const disposition = headers?.['content-disposition'] || '';
  const match = disposition.match(/filename="?([^"]+)"?/i);
  return match?.[1] || fallback;
};

const AdminReports = () => {
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [revenueSeries, setRevenueSeries] = useState([]);
  const [popularServices, setPopularServices] = useState([]);
  const [peakHours, setPeakHours] = useState([]);
  const [retentionStats, setRetentionStats] = useState(null);

  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [loadingReports, setLoadingReports] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [downloading, setDownloading] = useState(null);

  const { showAlert } = useAlertStore();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const [revRes, servRes, peakRes, retRes] = await Promise.all([
        api.get('/admin/analytics/revenue'),
        api.get('/admin/analytics/popular-services'),
        api.get('/admin/analytics/peak-hours'),
        api.get('/admin/analytics/retention'),
      ]);

      setRevenueSeries(Array.isArray(revRes.data.data) ? revRes.data.data : []);
      setPopularServices(servRes.data.data || []);
      setPeakHours(peakRes.data.data || []);
      setRetentionStats(retRes.data.data);
    } catch {
      showAlert('error', 'Error', 'Failed to load analytics data.');
    } finally {
      setLoading(false);
    }
  }, [showAlert]);

  const fetchReports = useCallback(async () => {
    try {
      setLoadingReports(true);
      const res = await adminService.listBusinessReports({ page: 1, limit: 30 });
      setReports(res.data.data || []);
    } catch {
      showAlert('error', 'Error', 'Failed to load saved AI reports.');
    } finally {
      setLoadingReports(false);
    }
  }, [showAlert]);

  useEffect(() => {
    fetchAnalytics();
    fetchReports();
  }, [fetchAnalytics, fetchReports]);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setTab('ai');
      const res = await adminService.generateBusinessReport();
      const report = res.data.data;
      showAlert('success', 'Report ready', 'AI business analysis saved to the database.');
      setSelectedReport(report);
      await fetchReports();
    } catch (error) {
      showAlert(
        'error',
        'Generation failed',
        error.response?.data?.message || 'Could not generate the AI report. Try again shortly.'
      );
      await fetchReports();
    } finally {
      setGenerating(false);
    }
  };

  const handleOpenReport = async (id) => {
    try {
      setLoadingDetail(true);
      setTab('ai');
      const res = await adminService.getBusinessReport(id);
      setSelectedReport(res.data.data);
    } catch {
      showAlert('error', 'Error', 'Failed to load report details.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this saved AI report?')) return;
    try {
      await adminService.deleteBusinessReport(id);
      showAlert('success', 'Deleted', 'Report removed.');
      if (selectedReport?._id === id) setSelectedReport(null);
      await fetchReports();
    } catch (error) {
      showAlert('error', 'Error', error.response?.data?.message || 'Failed to delete report.');
    }
  };

  const handleDownload = async (id, format = 'pdf') => {
    try {
      setDownloading(`${id}-${format}`);
      const res = await adminService.downloadBusinessReport(id, format);
      const contentType = res.headers?.['content-type'] || '';
      if (contentType.includes('application/json')) {
        const text = await res.data.text();
        const json = JSON.parse(text);
        throw new Error(json.message || 'Download failed');
      }
      const blob = new Blob([res.data], {
        type:
          format === 'xlsx'
            ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            : 'application/pdf',
      });
      const filename = getFilenameFromHeaders(
        res.headers,
        `Aura_Business_Report_${id}.${format === 'xlsx' ? 'xlsx' : 'pdf'}`
      );
      triggerBlobDownload(blob, filename);
      showAlert('success', 'Downloaded', `Report saved as ${format.toUpperCase()}.`);
    } catch (error) {
      let message = 'Could not download the report.';
      if (error.message && !error.response) {
        message = error.message;
      } else if (error.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          const json = JSON.parse(text);
          message = json.message || message;
        } catch {
          /* ignore */
        }
      } else if (error.response?.data?.message) {
        message = error.response.data.message;
      }
      showAlert('error', 'Download failed', message);
    } finally {
      setDownloading(null);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading Business Analysis..." />;
  }

  const ytdRevenue = revenueSeries.reduce((sum, row) => sum + (row.revenue || 0), 0);
  const latestMonth = revenueSeries[revenueSeries.length - 1];
  const prevMonth = revenueSeries[revenueSeries.length - 2];
  const monthGrowth =
    prevMonth?.revenue > 0
      ? Math.round(((latestMonth.revenue - prevMonth.revenue) / prevMonth.revenue) * 100)
      : null;

  const maxServiceBookings = Math.max(...popularServices.map((s) => s.bookings), 1);
  const maxPeakCount = Math.max(...peakHours.map((p) => p.count), 1);

  const totalCustomers =
    (retentionStats?.returning || 0) + (retentionStats?.newCustomers || 0);
  const returningPercent = totalCustomers
    ? Math.round((retentionStats.returning / totalCustomers) * 100)
    : 0;
  const newPercent = totalCustomers
    ? Math.round((retentionStats.newCustomers / totalCustomers) * 100)
    : 0;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'monitoring' },
    { id: 'ai', label: 'AI Predictions', icon: 'auto_awesome' },
  ];

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <section className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
        <div>
          <p className="font-label-sm text-primary uppercase tracking-[0.2em] mb-2">Intelligence</p>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Business Reports</h1>
          <p className="font-body-md text-on-surface-variant mt-2 max-w-2xl">
            Track salon performance, then generate Gemini AI prediction reports you can save and
            download as PDF or Excel.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setTab('ai')}
            className="flex items-center gap-2 px-5 py-3 border border-outline-variant text-on-surface font-label-md hover:border-primary hover:text-primary transition-all"
          >
            <span className="material-symbols-outlined">folder_open</span>
            Saved Reports ({reports.length})
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 px-5 py-3 bg-primary text-on-primary font-label-md hover:opacity-90 transition-all luxury-shadow disabled:opacity-60"
          >
            <span className="material-symbols-outlined">
              {generating ? 'hourglass_top' : 'auto_awesome'}
            </span>
            {generating ? 'Generating…' : 'Generate AI Report'}
          </button>
        </div>
      </section>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-outline-variant/50">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`flex items-center gap-2 px-5 py-3 font-label-md transition-colors border-b-2 -mb-px ${
              tab === item.id
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-xl">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-6">
          {/* KPI strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="bg-surface/70 backdrop-blur-md border border-outline-variant/50 luxury-shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <span className="material-symbols-outlined text-primary text-2xl">payments</span>
                {monthGrowth != null && (
                  <span
                    className={`text-xs font-label-sm ${
                      monthGrowth >= 0 ? 'text-emerald-600' : 'text-red-500'
                    }`}
                  >
                    {monthGrowth >= 0 ? '+' : ''}
                    {monthGrowth}% MoM
                  </span>
                )}
              </div>
              <p className="text-xs uppercase tracking-wider text-on-surface-variant">YTD Revenue</p>
              <p className="font-headline-md text-on-surface mt-1">{formatLkr(ytdRevenue)}</p>
            </div>

            <div className="bg-surface/70 backdrop-blur-md border border-outline-variant/50 luxury-shadow p-6">
              <span className="material-symbols-outlined text-primary text-2xl mb-4 block">
                calendar_month
              </span>
              <p className="text-xs uppercase tracking-wider text-on-surface-variant">
                Latest Month {latestMonth?._id ? `(${latestMonth._id})` : ''}
              </p>
              <p className="font-headline-md text-on-surface mt-1">
                {formatLkr(latestMonth?.revenue || 0)}
              </p>
            </div>

            <div className="bg-surface/70 backdrop-blur-md border border-outline-variant/50 luxury-shadow p-6">
              <span className="material-symbols-outlined text-primary text-2xl mb-4 block">group</span>
              <p className="text-xs uppercase tracking-wider text-on-surface-variant">
                Returning Rate
              </p>
              <p className="font-headline-md text-on-surface mt-1">{returningPercent}%</p>
              <p className="text-xs text-on-surface-variant mt-1">
                {retentionStats?.returning || 0} returning customers
              </p>
            </div>

            <div className="bg-surface/70 backdrop-blur-md border border-outline-variant/50 luxury-shadow p-6">
              <span className="material-symbols-outlined text-primary text-2xl mb-4 block">spa</span>
              <p className="text-xs uppercase tracking-wider text-on-surface-variant">
                Top Service Bookings
              </p>
              <p className="font-headline-md text-on-surface mt-1">
                {popularServices[0]?.bookings || 0}
              </p>
              <p className="text-xs text-on-surface-variant mt-1 truncate">
                {popularServices[0]?.service?.name || 'No data yet'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-surface border border-outline-variant/50 luxury-shadow p-6">
              <h2 className="font-title-md font-semibold mb-2 text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">group</span>
                Customer Retention
              </h2>
              <p className="text-sm text-on-surface-variant mb-6">
                Mix of returning vs first-time bookers
              </p>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-sm font-medium mb-2">
                    <span>Returning ({retentionStats?.returning || 0})</span>
                    <span className="text-primary">{returningPercent}%</span>
                  </div>
                  <div className="w-full bg-surface-container h-3">
                    <div
                      className="bg-primary h-3 transition-all"
                      style={{ width: `${returningPercent}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm font-medium mb-2">
                    <span>New ({retentionStats?.newCustomers || 0})</span>
                    <span className="text-secondary">{newPercent}%</span>
                  </div>
                  <div className="w-full bg-surface-container h-3">
                    <div
                      className="bg-secondary h-3 transition-all"
                      style={{ width: `${newPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-surface border border-outline-variant/50 luxury-shadow p-6">
              <h2 className="font-title-md font-semibold mb-2 text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">trending_up</span>
                Monthly Revenue Series
              </h2>
              <p className="text-sm text-on-surface-variant mb-6">Year-to-date payment totals</p>
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {revenueSeries.slice(-8).map((row) => {
                  const maxRev = Math.max(...revenueSeries.map((r) => r.revenue || 0), 1);
                  return (
                    <div key={row._id}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-on-surface">{row._id}</span>
                        <span className="text-on-surface-variant">{formatLkr(row.revenue)}</span>
                      </div>
                      <div className="w-full bg-surface-container h-2">
                        <div
                          className="bg-primary/80 h-2"
                          style={{ width: `${((row.revenue || 0) / maxRev) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {revenueSeries.length === 0 && (
                  <p className="text-sm text-on-surface-variant italic">No revenue data yet.</p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-surface border border-outline-variant/50 luxury-shadow p-6">
              <h2 className="font-title-md font-semibold mb-6 text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">spa</span>
                Popular Services
              </h2>
              <div className="space-y-5">
                {popularServices.map((item, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between text-sm font-medium mb-1">
                      <span className="truncate pr-4">{item.service?.name}</span>
                      <span className="text-on-surface-variant shrink-0">
                        {item.bookings} bookings
                      </span>
                    </div>
                    <div className="w-full bg-surface-container h-3 overflow-hidden">
                      <div
                        className="bg-primary/80 h-3"
                        style={{ width: `${(item.bookings / maxServiceBookings) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
                {popularServices.length === 0 && (
                  <p className="text-sm text-on-surface-variant italic">No data available.</p>
                )}
              </div>
            </div>

            <div className="bg-surface border border-outline-variant/50 luxury-shadow p-6">
              <h2 className="font-title-md font-semibold mb-6 text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">schedule</span>
                Peak Booking Hours
              </h2>
              <div className="space-y-5">
                {peakHours.slice(0, 7).map((item, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between text-sm font-medium mb-1">
                      <span>{item._id}:00</span>
                      <span className="text-on-surface-variant">{item.count} appts</span>
                    </div>
                    <div className="w-full bg-surface-container h-3 overflow-hidden">
                      <div
                        className="bg-secondary/80 h-3"
                        style={{ width: `${(item.count / maxPeakCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
                {peakHours.length === 0 && (
                  <p className="text-sm text-on-surface-variant italic">No data available.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'ai' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* List */}
          <aside className="xl:col-span-4 bg-surface border border-outline-variant/50 luxury-shadow p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-title-md font-semibold text-on-surface">Saved Reports</h2>
              {loadingReports && (
                <span className="text-xs text-on-surface-variant">Refreshing…</span>
              )}
            </div>

            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              {reports.map((report) => (
                <div
                  key={report._id}
                  className={`border p-4 transition-colors ${
                    selectedReport?._id === report._id
                      ? 'border-primary bg-primary/5'
                      : 'border-outline-variant/60 hover:border-primary/40'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleOpenReport(report._id)}
                    className="w-full text-left"
                  >
                    <p className="font-medium text-on-surface text-sm line-clamp-2">
                      {report.title}
                    </p>
                    <p className="text-xs text-on-surface-variant mt-1">
                      {formatDate(report.createdAt)}
                      {report.status === 'failed' ? ' · Failed' : ''}
                    </p>
                    {report.predictions?.predictedRevenueNextMonth != null && (
                      <p className="text-xs text-primary mt-2">
                        Forecast {formatLkr(report.predictions.predictedRevenueNextMonth)}
                      </p>
                    )}
                  </button>

                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-outline-variant/40">
                    <button
                      type="button"
                      disabled={report.status === 'failed' || downloading === `${report._id}-pdf`}
                      onClick={() => handleDownload(report._id, 'pdf')}
                      className="flex-1 text-xs py-2 border border-outline-variant hover:border-primary hover:text-primary transition-colors disabled:opacity-40"
                    >
                      PDF
                    </button>
                    <button
                      type="button"
                      disabled={report.status === 'failed' || downloading === `${report._id}-xlsx`}
                      onClick={() => handleDownload(report._id, 'xlsx')}
                      className="flex-1 text-xs py-2 border border-outline-variant hover:border-primary hover:text-primary transition-colors disabled:opacity-40"
                    >
                      Excel
                    </button>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleDelete(report._id)}
                        className="px-2 py-2 text-on-surface-variant hover:text-red-600 transition-colors"
                        title="Delete"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {!loadingReports && reports.length === 0 && (
                <p className="text-sm text-on-surface-variant italic py-8 text-center">
                  No AI reports yet. Generate one to get predictions.
                </p>
              )}
            </div>
          </aside>

          {/* Detail */}
          <section className="xl:col-span-8 bg-surface border border-outline-variant/50 luxury-shadow p-6 min-h-[480px]">
            {generating || loadingDetail ? (
              <div className="flex items-center justify-center h-full min-h-[400px]">
                <LoadingSpinner
                  text={generating ? 'Gemini is analyzing your salon data…' : 'Loading report…'}
                />
              </div>
            ) : !selectedReport ? (
              <div className="flex flex-col items-center justify-center text-center h-full min-h-[400px] text-on-surface-variant px-6">
                <span className="material-symbols-outlined text-5xl text-primary mb-3">insights</span>
                <p className="font-medium text-on-surface text-lg">AI prediction workspace</p>
                <p className="text-sm mt-2 max-w-md">
                  Generate a report for revenue outlook, demand trends, risks, and recommended
                  actions — then download as PDF or Excel.
                </p>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={generating}
                  className="mt-6 flex items-center gap-2 px-5 py-3 bg-primary text-on-primary font-label-md"
                >
                  <span className="material-symbols-outlined">auto_awesome</span>
                  Generate AI Report
                </button>
              </div>
            ) : selectedReport.status === 'failed' ? (
              <div className="space-y-3">
                <h2 className="text-xl font-serif text-secondary font-bold">
                  {selectedReport.title}
                </h2>
                <p className="text-sm text-red-600">
                  {selectedReport.errorMessage || 'This report failed to generate.'}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-on-surface-variant">
                      {selectedReport.periodLabel} · {formatDate(selectedReport.createdAt)}
                    </p>
                    <h2 className="text-2xl font-serif text-secondary font-bold mt-1">
                      {selectedReport.title}
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={downloading === `${selectedReport._id}-pdf`}
                      onClick={() => handleDownload(selectedReport._id, 'pdf')}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary text-sm font-label-md hover:opacity-90 disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
                      {downloading === `${selectedReport._id}-pdf` ? 'Preparing…' : 'Download PDF'}
                    </button>
                    <button
                      type="button"
                      disabled={downloading === `${selectedReport._id}-xlsx`}
                      onClick={() => handleDownload(selectedReport._id, 'xlsx')}
                      className="flex items-center gap-2 px-4 py-2 border border-outline-variant text-sm font-label-md hover:border-primary hover:text-primary disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-lg">table</span>
                      {downloading === `${selectedReport._id}-xlsx` ? 'Preparing…' : 'Excel'}
                    </button>
                  </div>
                </div>

                {selectedReport.summary && (
                  <p className="text-on-surface leading-relaxed bg-surface-container-low/50 p-4 border border-outline-variant/40">
                    {selectedReport.summary}
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="border border-outline-variant/50 p-4 bg-surface-container-lowest/40">
                    <p className="text-xs text-on-surface-variant uppercase tracking-wide">
                      Predicted next month
                    </p>
                    <p className="text-xl font-serif text-primary mt-1">
                      {selectedReport.predictions?.predictedRevenueNextMonth != null
                        ? formatLkr(selectedReport.predictions.predictedRevenueNextMonth)
                        : '—'}
                    </p>
                  </div>
                  <div className="border border-outline-variant/50 p-4 bg-surface-container-lowest/40">
                    <p className="text-xs text-on-surface-variant uppercase tracking-wide">
                      Demand trend
                    </p>
                    <p className="text-sm text-on-surface mt-2 leading-snug">
                      {selectedReport.predictions?.demandTrend || '—'}
                    </p>
                  </div>
                  <div className="border border-outline-variant/50 p-4 bg-surface-container-lowest/40">
                    <p className="text-xs text-on-surface-variant uppercase tracking-wide">
                      Confidence
                    </p>
                    <p className="text-sm text-on-surface mt-2 capitalize">
                      {selectedReport.predictions?.confidence || '—'}
                    </p>
                  </div>
                </div>

                {selectedReport.predictions?.revenueOutlook && (
                  <section>
                    <h3 className="font-semibold text-on-surface mb-2">Revenue outlook</h3>
                    <p className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap">
                      {selectedReport.predictions.revenueOutlook}
                    </p>
                  </section>
                )}

                {selectedReport.analysis && (
                  <section>
                    <h3 className="font-semibold text-on-surface mb-2">Detailed analysis</h3>
                    <p className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap">
                      {selectedReport.analysis}
                    </p>
                  </section>
                )}

                {!!selectedReport.insights?.length && (
                  <section>
                    <h3 className="font-semibold text-on-surface mb-2">Key insights</h3>
                    <ul className="space-y-2">
                      {selectedReport.insights.map((item, i) => (
                        <li key={i} className="text-sm text-on-surface-variant flex gap-2">
                          <span className="text-primary">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {!!selectedReport.recommendations?.length && (
                  <section>
                    <h3 className="font-semibold text-on-surface mb-2">Recommendations</h3>
                    <ul className="space-y-2">
                      {selectedReport.recommendations.map((item, i) => (
                        <li key={i} className="text-sm text-on-surface-variant flex gap-2">
                          <span className="material-symbols-outlined text-primary text-base">
                            check_circle
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {!!selectedReport.opportunities?.length && (
                    <section>
                      <h3 className="font-semibold text-on-surface mb-2">Opportunities</h3>
                      <ul className="space-y-2">
                        {selectedReport.opportunities.map((item, i) => (
                          <li key={i} className="text-sm text-on-surface-variant">
                            • {item}
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                  {!!selectedReport.risks?.length && (
                    <section>
                      <h3 className="font-semibold text-on-surface mb-2">Risks</h3>
                      <ul className="space-y-2">
                        {selectedReport.risks.map((item, i) => (
                          <li key={i} className="text-sm text-on-surface-variant">
                            • {item}
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                </div>

                {selectedReport.generatedBy?.name && (
                  <p className="text-xs text-on-surface-variant pt-2 border-t border-outline-variant/50">
                    Generated by {selectedReport.generatedBy.name}
                    {selectedReport.modelUsed ? ` · Model: ${selectedReport.modelUsed}` : ''}
                  </p>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export default AdminReports;
