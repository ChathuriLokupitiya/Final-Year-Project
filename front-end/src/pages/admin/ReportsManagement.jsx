import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import useAlertStore from '../../store/alertStore';
import useAuthStore from '../../store/authStore';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const todayStr = () => new Date().toISOString().slice(0, 10);

const TAB_META = {
  daily: {
    label: 'Daily Report',
    type: 'daily',
    description: 'Appointments and payment snapshot for a single day.',
    needsDate: true,
  },
  appointments: {
    label: 'Appointments',
    type: 'appointments',
    description: 'All bookings in a date range with status and amounts.',
    needsRange: true,
  },
  revenue: {
    label: 'Revenue',
    type: 'revenue',
    description: 'Completed payments and invoice totals for a period.',
    needsRange: true,
  },
  customers: {
    label: 'Customers',
    type: 'customers',
    description: 'Registered customers, loyalty points, and spend.',
    needsRange: true,
    rangeOptional: true,
  },
  staff: {
    label: 'Staff Performance',
    type: 'staff',
    description: 'Appointments completed and revenue by staff member.',
    needsRange: true,
  },
};

const TAB_PERMISSION = {
  daily: 'Daily Report',
  appointments: 'Appointments Report',
  revenue: 'Revenue Report',
  customers: 'Customers Report',
  staff: 'Staff Performance Report',
};

const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

const ReportsManagement = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { showAlert } = useAlertStore();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const staffTabs = user?.permissions?.tabs || [];

  const tab = useMemo(() => {
    const q = new URLSearchParams(location.search).get('tab');
    return TAB_META[q] ? q : 'daily';
  }, [location.search]);

  const meta = TAB_META[tab];

  const allowedTabs = useMemo(() => {
    const keys = Object.keys(TAB_META);
    if (isAdmin) return keys;
    return keys.filter(
      (k) =>
        staffTabs.includes('Reports') ||
        staffTabs.includes(TAB_PERMISSION[k]) ||
        staffTabs.includes(TAB_META[k].label)
    );
  }, [isAdmin, staffTabs]);

  useEffect(() => {
    const q = new URLSearchParams(location.search).get('tab');
    if (!q || !TAB_META[q]) {
      const fallback = allowedTabs.includes('daily') ? 'daily' : allowedTabs[0];
      if (fallback) navigate(`/admin/reports?tab=${fallback}`, { replace: true });
      return;
    }
    if (!allowedTabs.includes(tab) && allowedTabs.length) {
      navigate(`/admin/reports?tab=${allowedTabs[0]}`, { replace: true });
    }
  }, [allowedTabs, tab, navigate, location.search]);

  const [date, setDate] = useState(todayStr());
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(todayStr());
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState('');
  const [preview, setPreview] = useState(null);

  const queryParams = useCallback(() => {
    const params = { type: meta.type };
    if (meta.needsDate) params.date = date;
    if (meta.needsRange) {
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
    }
    return params;
  }, [meta, date, startDate, endDate]);

  const loadPreview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/reports/preview', { params: queryParams() });
      setPreview(res.data?.data || null);
    } catch (error) {
      setPreview(null);
      showAlert('error', 'Error', error.response?.data?.message || 'Failed to load report preview.');
    } finally {
      setLoading(false);
    }
  }, [queryParams, showAlert]);

  useEffect(() => {
    loadPreview();
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDownload = async (format) => {
    setDownloading(format);
    try {
      const res = await api.get('/admin/reports/export', {
        params: { ...queryParams(), format },
        responseType: 'blob',
      });
      const ext = format === 'excel' ? 'xlsx' : 'pdf';
      const stamp = meta.needsDate ? date : `${startDate || 'all'}_${endDate || 'all'}`;
      downloadBlob(res.data, `Aura_${meta.type}_report_${stamp}.${ext}`);
      showAlert('success', 'Downloaded', `${meta.label} exported as ${ext.toUpperCase()}.`);
    } catch (error) {
      let message = 'Download failed.';
      if (error.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          const json = JSON.parse(text);
          message = json.message || message;
        } catch {
          /* ignore */
        }
      } else {
        message = error.response?.data?.message || message;
      }
      showAlert('error', 'Error', message);
    } finally {
      setDownloading('');
    }
  };

  if (!isAdmin && allowedTabs.length === 0) {
    return (
      <div className="p-8">
        <p className="text-secondary">You do not have permission to view reports.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline-sm text-3xl text-on-surface mb-1">Reports</h1>
        <p className="text-secondary text-sm">
          Generate operational reports and download them as PDF or Excel.
        </p>
      </div>

      {/* Sub-tabs */}
      <div className="flex flex-wrap gap-2 border-b border-outline-variant/40 pb-3">
        {allowedTabs.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => navigate(`/admin/reports?tab=${key}`)}
            className={`px-4 py-2 text-sm font-label-md uppercase tracking-widest transition-colors ${
              tab === key
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container text-secondary hover:text-primary'
            }`}
          >
            {TAB_META[key].label}
          </button>
        ))}
      </div>

      <div className="bg-surface border border-outline-variant/50 luxury-shadow p-6 space-y-5">
        <div>
          <h2 className="font-semibold text-lg text-on-surface">{meta.label}</h2>
          <p className="text-sm text-on-surface-variant mt-1">{meta.description}</p>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          {meta.needsDate && (
            <div>
              <label className="block text-xs uppercase tracking-widest text-outline mb-1.5">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="border border-outline-variant px-3 py-2 bg-surface text-sm"
              />
            </div>
          )}
          {meta.needsRange && (
            <>
              <div>
                <label className="block text-xs uppercase tracking-widest text-outline mb-1.5">
                  From {meta.rangeOptional ? '(optional)' : ''}
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="border border-outline-variant px-3 py-2 bg-surface text-sm"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-outline mb-1.5">
                  To {meta.rangeOptional ? '(optional)' : ''}
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="border border-outline-variant px-3 py-2 bg-surface text-sm"
                />
              </div>
            </>
          )}
          <button
            type="button"
            onClick={loadPreview}
            disabled={loading}
            className="px-5 py-2.5 bg-surface-container text-on-surface text-sm uppercase tracking-widest hover:bg-primary/10 transition-colors disabled:opacity-60"
          >
            {loading ? 'Loading…' : 'Generate preview'}
          </button>
          <button
            type="button"
            onClick={() => handleDownload('pdf')}
            disabled={!!downloading || loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary text-sm uppercase tracking-widest hover:opacity-90 disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
            {downloading === 'pdf' ? 'Preparing…' : 'PDF'}
          </button>
          <button
            type="button"
            onClick={() => handleDownload('excel')}
            disabled={!!downloading || loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 border border-primary text-primary text-sm uppercase tracking-widest hover:bg-primary/5 disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[18px]">table_view</span>
            {downloading === 'excel' ? 'Preparing…' : 'Excel'}
          </button>
        </div>
      </div>

      {loading && !preview ? (
        <LoadingSpinner text="Building report…" />
      ) : preview ? (
        <div className="space-y-4">
          {/* Summary cards */}
          {preview.summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(preview.summary)
                .filter(([, v]) => typeof v !== 'object')
                .map(([key, value]) => (
                  <div
                    key={key}
                    className="border border-outline-variant/40 bg-surface-container-low p-4"
                  >
                    <p className="text-[10px] uppercase tracking-widest text-outline mb-1">
                      {key.replace(/([A-Z])/g, ' $1')}
                    </p>
                    <p className="font-headline-sm text-xl text-on-surface">
                      {typeof value === 'number' && key.toLowerCase().includes('revenue')
                        ? `LKR ${Number(value).toLocaleString('en-LK')}`
                        : String(value)}
                    </p>
                  </div>
                ))}
              {preview.summary.byStatus &&
                Object.entries(preview.summary.byStatus).map(([status, count]) => (
                  <div
                    key={status}
                    className="border border-outline-variant/40 bg-surface-container-low p-4"
                  >
                    <p className="text-[10px] uppercase tracking-widest text-outline mb-1">
                      {status}
                    </p>
                    <p className="font-headline-sm text-xl text-on-surface">{count}</p>
                  </div>
                ))}
            </div>
          )}

          <div className="bg-surface border border-outline-variant/50 luxury-shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-outline-variant/40 flex justify-between items-center">
              <h3 className="font-semibold">{preview.title}</h3>
              <span className="text-xs text-secondary">{preview.rowCount} row(s)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                    {(preview.headers || []).map((h) => (
                      <th key={h} className="px-4 py-3 font-medium whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(preview.previewRows || []).map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/80">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="px-4 py-2.5 whitespace-nowrap text-on-surface">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {(!preview.previewRows || preview.previewRows.length === 0) && (
                    <tr>
                      <td
                        colSpan={(preview.headers || []).length || 1}
                        className="px-4 py-8 text-center text-gray-500"
                      >
                        No rows for this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {preview.rowCount > (preview.previewRows?.length || 0) && (
              <p className="px-6 py-3 text-xs text-secondary border-t border-outline-variant/30">
                Showing first {preview.previewRows.length} of {preview.rowCount} rows. Download PDF
                or Excel for the full report.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ReportsManagement;
