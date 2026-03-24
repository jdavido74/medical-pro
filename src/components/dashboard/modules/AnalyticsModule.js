/**
 * AnalyticsModule — Clinic admin dashboard
 * Financial KPIs, revenue charts, treatment & practitioner breakdowns
 * Permission: analytics.admin
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, AlertTriangle, CheckCircle,
  Calendar, Users, Activity, BarChart3, Filter, RefreshCw,
  Clock, XCircle, UserX, FileText, ChevronDown
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getDashboardData, getActivityData } from '../../../api/analyticsApi';
import planningApi from '../../../api/planningApi';

// ─── Date helpers ───────────────────────────────────────────
const startOfMonth = (d = new Date()) => {
  const r = new Date(d);
  r.setDate(1);
  return r.toISOString().split('T')[0];
};
const endOfMonth = (d = new Date()) => {
  const r = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return r.toISOString().split('T')[0];
};
const today = () => new Date().toISOString().split('T')[0];
const startOfYear = () => `${new Date().getFullYear()}-01-01`;
const startOfQuarter = () => {
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3) * 3;
  return new Date(now.getFullYear(), q, 1).toISOString().split('T')[0];
};
const subMonths = (date, n) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() - n);
  return d;
};

const PRESETS = [
  { id: 'thisMonth', labelKey: 'thisMonth', from: () => startOfMonth(), to: () => today() },
  { id: 'lastMonth', labelKey: 'lastMonth', from: () => startOfMonth(subMonths(new Date(), 1)), to: () => endOfMonth(subMonths(new Date(), 1)) },
  { id: 'quarter', labelKey: 'quarter', from: () => startOfQuarter(), to: () => today() },
  { id: 'year', labelKey: 'year', from: () => startOfYear(), to: () => today() },
];

// ─── Chart components (pure CSS/SVG) ────────────────────────

const BarChart = ({ data, labelKey, valueKey, maxBars = 12, formatValue, color = '#10b981' }) => {
  if (!data || data.length === 0) return <p className="text-sm text-gray-400 text-center py-8">Sin datos</p>;
  const max = Math.max(...data.map(d => parseFloat(d[valueKey]) || 0), 1);

  return (
    <div className="flex items-end gap-1 h-48">
      {data.slice(0, maxBars).map((d, i) => {
        const val = parseFloat(d[valueKey]) || 0;
        const pct = (val / max) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
            <div className="w-full relative group">
              <div
                className="w-full rounded-t transition-all duration-500 ease-out"
                style={{ height: `${Math.max(pct * 1.8, 4)}px`, backgroundColor: color, opacity: 0.85 }}
              />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                {formatValue ? formatValue(val) : val.toLocaleString()}
              </div>
            </div>
            <span className="text-[10px] text-gray-500 truncate w-full text-center">{d[labelKey]}</span>
          </div>
        );
      })}
    </div>
  );
};

const HorizontalBarChart = ({ data, labelKey, valueKey, formatValue, color = '#6366f1' }) => {
  if (!data || data.length === 0) return <p className="text-sm text-gray-400 text-center py-4">Sin datos</p>;
  const max = Math.max(...data.map(d => parseFloat(d[valueKey]) || 0), 1);

  return (
    <div className="space-y-2">
      {data.map((d, i) => {
        const val = parseFloat(d[valueKey]) || 0;
        const pct = (val / max) * 100;
        return (
          <div key={i}>
            <div className="flex justify-between text-sm mb-0.5">
              <span className="text-gray-700 truncate mr-2">{d[labelKey]}</span>
              <span className="font-semibold text-gray-900 whitespace-nowrap">{formatValue ? formatValue(val) : val.toLocaleString()}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div
                className="h-2.5 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── KPI Card ───────────────────────────────────────────────

const KpiCard = ({ icon: Icon, title, value, subtitle, trend, trendLabel, color = 'blue', loading }) => {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className={`p-2.5 rounded-lg ${colorMap[color] || colorMap.blue}`}>
          <Icon className="h-5 w-5" />
        </div>
        {trend !== undefined && trend !== null && (
          <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
            trend >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
          }`}>
            {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>
      <div className="mt-3">
        <p className="text-sm text-gray-500">{title}</p>
        {loading ? (
          <div className="h-8 w-24 bg-gray-100 rounded animate-pulse mt-1" />
        ) : (
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        )}
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
};

// ─── Main Module ────────────────────────────────────────────

const AnalyticsModule = () => {
  const { t, i18n } = useTranslation(['analytics', 'common']);
  const [activeTab, setActiveTab] = useState('activity'); // 'activity' | 'billing'
  const [data, setData] = useState(null);
  const [activityData, setActivityData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [preset, setPreset] = useState('thisMonth');
  const [dateFrom, setDateFrom] = useState(startOfMonth());
  const [dateTo, setDateTo] = useState(today());
  const [practitionerId, setPractitionerId] = useState('');
  const [practitioners, setPractitioners] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  const locale = i18n.language === 'es' ? 'es-ES' : i18n.language === 'en' ? 'en-US' : 'fr-FR';

  const formatCurrency = useCallback((amount) => {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount || 0);
  }, [locale]);

  const formatCurrencyFull = useCallback((amount) => {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(amount || 0);
  }, [locale]);

  // Load practitioners for filter
  useEffect(() => {
    const loadPractitioners = async () => {
      try {
        const res = await planningApi.getResources();
        if (res.success) {
          setPractitioners(res.data?.providers || []);
        }
      } catch (err) {
        console.error('Failed to load practitioners:', err);
      }
    };
    loadPractitioners();
  }, []);

  // Apply preset
  const handlePreset = (id) => {
    const p = PRESETS.find(pr => pr.id === id);
    if (p) {
      setPreset(id);
      setDateFrom(p.from());
      setDateTo(p.to());
    }
  };

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { dateFrom, dateTo, year: new Date(dateFrom).getFullYear() };
      if (practitionerId) params.practitionerId = practitionerId;

      if (activeTab === 'billing') {
        const res = await getDashboardData(params);
        if (res.success) setData(res.data);
        else setError(res.error?.message || 'Error loading analytics');
      } else {
        const res = await getActivityData(params);
        if (res.success) setActivityData(res.data);
        else setError(res.error?.message || 'Error loading activity data');
      }
    } catch (err) {
      console.error('Analytics error:', err);
      setError(err.message || 'Error loading analytics');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, practitionerId, activeTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Month names for chart
  const monthNames = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) =>
      new Date(2026, i).toLocaleDateString(locale, { month: 'short' })
    );
  }, [locale]);

  const monthlyData = useMemo(() => {
    if (!data?.monthlyRevenue) return [];
    return Array.from({ length: 12 }, (_, i) => {
      const m = data.monthlyRevenue.find(r => parseInt(r.month) === i + 1);
      return {
        label: monthNames[i],
        total: parseFloat(m?.total || 0),
        paid: parseFloat(m?.paid || 0),
        count: parseInt(m?.count || 0)
      };
    });
  }, [data?.monthlyRevenue, monthNames]);

  const serviceData = useMemo(() => {
    if (!data?.revenueByService) return [];
    return data.revenueByService.slice(0, 10).map(s => ({
      label: s.title || 'N/A',
      total: parseFloat(s.total || 0),
      count: parseInt(s.count || 0)
    }));
  }, [data?.revenueByService]);

  const practitionerData = useMemo(() => {
    if (!data?.revenueByPractitioner) return [];
    return data.revenueByPractitioner.map(p => ({
      label: p.name || 'N/A',
      total: parseFloat(p.total || 0),
      count: parseInt(p.count || 0)
    }));
  }, [data?.revenueByPractitioner]);

  const appointments = data?.appointments || {};

  // Activity tab derived data
  const actMonthly = useMemo(() => {
    if (!activityData?.monthlyActivity) return [];
    return Array.from({ length: 12 }, (_, i) => {
      const m = activityData.monthlyActivity.find(r => parseInt(r.month) === i + 1);
      return { label: monthNames[i], total: parseFloat(m?.total || 0), count: parseInt(m?.count || 0) };
    });
  }, [activityData?.monthlyActivity, monthNames]);

  const actServices = useMemo(() => {
    if (!activityData?.revenueByService) return [];
    return activityData.revenueByService.slice(0, 10).map(s => ({
      label: `${s.title || 'N/A'} (${s.count})`,
      total: parseFloat(s.total || 0),
      count: parseInt(s.count || 0)
    }));
  }, [activityData?.revenueByService]);

  const actPractitioners = useMemo(() => {
    if (!activityData?.revenueByPractitioner) return [];
    return activityData.revenueByPractitioner.map(p => ({
      label: `${p.name || 'N/A'} (${p.count})`,
      total: parseFloat(p.total || 0),
      count: parseInt(p.count || 0)
    }));
  }, [activityData?.revenueByPractitioner]);

  const actTopPatients = useMemo(() => {
    if (!activityData?.topPatients) return [];
    return activityData.topPatients.map(p => ({
      label: `${p.name || 'N/A'} (${p.sessions} séances)`,
      total: parseFloat(p.total || 0)
    }));
  }, [activityData?.topPatients]);

  const actAppts = activityData?.appointments || {};

  return (
    <div className="flex flex-col gap-5 p-4 xl:p-6 h-[calc(100vh-7rem)] overflow-y-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-emerald-600" />
            {t('analytics:title', 'Panel de control')}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5 hidden xl:block">{t('analytics:subtitle', 'Indicadores financieros y de actividad')}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('activity')}
              className={`px-3 py-1 text-sm rounded-md transition-colors flex items-center gap-1.5 ${
                activeTab === 'activity' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Activity className="h-3.5 w-3.5" />
              {t('analytics:tabs.activity', 'Actividad')}
            </button>
            <button
              onClick={() => setActiveTab('billing')}
              className={`px-3 py-1 text-sm rounded-md transition-colors flex items-center gap-1.5 ${
                activeTab === 'billing' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <DollarSign className="h-3.5 w-3.5" />
              {t('analytics:tabs.billing', 'Facturación')}
            </button>
          </div>

          {/* Presets */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {PRESETS.map(p => (
              <button
                key={p.id}
                onClick={() => handlePreset(p.id)}
                className={`px-2.5 xl:px-3 py-1 text-sm rounded-md transition-colors ${
                  preset === p.id ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {t(`analytics:presets.${p.labelKey}`, p.labelKey)}
              </button>
            ))}
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg transition-colors ${showFilters ? 'bg-emerald-100 text-emerald-600' : 'hover:bg-gray-100'}`}
          >
            <Filter className="h-5 w-5" />
          </button>

          {/* Refresh */}
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className={`h-5 w-5 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="bg-white rounded-xl border p-4 grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('analytics:filters.from', 'Desde')}</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPreset('custom'); }}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('analytics:filters.to', 'Hasta')}</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPreset('custom'); }}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('analytics:filters.practitioner', 'Profesional')}</label>
            <select
              value={practitionerId}
              onChange={(e) => setPractitionerId(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">{t('analytics:filters.allPractitioners', 'Todos')}</option>
              {practitioners.map(p => (
                <option key={p.id} value={p.id}>{p.name || `${p.firstName || p.first_name} ${p.lastName || p.last_name}`}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-sm text-red-800">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* ═══ ACTIVITY TAB ═══ */}
      {activeTab === 'activity' && (
        <>
          {/* Activity KPIs */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <KpiCard
              icon={DollarSign}
              title={t('analytics:kpi.estimatedRevenue', 'CA estimado')}
              value={formatCurrency(activityData?.estimatedRevenue?.currentPeriod)}
              trend={activityData?.estimatedRevenue?.changePercent}
              subtitle={`${activityData?.estimatedRevenue?.completedCount || 0} ${t('analytics:kpi.completedSessions', 'sesiones')}`}
              color="green"
              loading={loading}
            />
            <KpiCard
              icon={Activity}
              title={t('analytics:kpi.occupationRate', 'Ocupación')}
              value={activityData?.occupation?.rate ? `${activityData.occupation.rate}%` : '—'}
              subtitle={`${Math.round((activityData?.occupation?.completedMinutes || 0) / 60)}h / ${Math.round((activityData?.occupation?.totalMinutes || 0) / 60)}h`}
              color="blue"
              loading={loading}
            />
            <KpiCard
              icon={CheckCircle}
              title={t('analytics:kpi.completed', 'Realizadas')}
              value={actAppts.completed || 0}
              subtitle={`${actAppts.total || 0} ${t('analytics:kpi.totalAppointments', 'total citas')}`}
              color="purple"
              loading={loading}
            />
            <KpiCard
              icon={UserX}
              title={t('analytics:kpi.noShowRate', 'Tasa ausencia')}
              value={activityData?.noShowRate ? `${activityData.noShowRate}%` : '0%'}
              subtitle={`${actAppts.noShow || 0} ${t('analytics:kpi.noShow', 'ausentes')} · ${actAppts.cancelled || 0} ${t('analytics:kpi.cancelled', 'anuladas')}`}
              color="amber"
              loading={loading}
            />
          </div>

          {/* Activity Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {/* Monthly activity */}
            <div className="bg-white rounded-xl border p-5 xl:col-span-2">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-emerald-600" />
                {t('analytics:charts.monthlyActivity', 'Actividad mensual (CA estimado)')}
              </h3>
              {loading ? <div className="h-48 bg-gray-50 rounded animate-pulse" /> : (
                <BarChart data={actMonthly} labelKey="label" valueKey="total" formatValue={formatCurrency} color="#10b981" />
              )}
            </div>

            {/* By service */}
            <div className="bg-white rounded-xl border p-5">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-600" />
                {t('analytics:charts.byService', 'Por tratamiento')}
              </h3>
              {loading ? (
                <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-8 bg-gray-50 rounded animate-pulse" />)}</div>
              ) : (
                <HorizontalBarChart data={actServices} labelKey="label" valueKey="total" formatValue={formatCurrency} color="#6366f1" />
              )}
            </div>

            {/* By practitioner */}
            <div className="bg-white rounded-xl border p-5">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                {t('analytics:charts.byPractitioner', 'Por profesional')}
              </h3>
              {loading ? (
                <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-8 bg-gray-50 rounded animate-pulse" />)}</div>
              ) : (
                <HorizontalBarChart data={actPractitioners} labelKey="label" valueKey="total" formatValue={formatCurrency} color="#3b82f6" />
              )}
            </div>

            {/* Top patients */}
            <div className="bg-white rounded-xl border p-5 xl:col-span-2">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-600" />
                {t('analytics:charts.topPatients', 'Top pacientes')}
              </h3>
              {loading ? (
                <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-8 bg-gray-50 rounded animate-pulse" />)}</div>
              ) : (
                <HorizontalBarChart data={actTopPatients} labelKey="label" valueKey="total" formatValue={formatCurrency} color="#10b981" />
              )}
            </div>
          </div>
        </>
      )}

      {/* ═══ BILLING TAB ═══ */}
      {activeTab === 'billing' && (
        <>
      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          icon={DollarSign}
          title={t('analytics:kpi.revenue', 'Facturación')}
          value={formatCurrency(data?.revenue?.currentMonth)}
          trend={data?.revenue?.changePercent}
          subtitle={t('analytics:kpi.vsPrevMonth', 'vs mes anterior')}
          color="green"
          loading={loading}
        />
        <KpiCard
          icon={AlertTriangle}
          title={t('analytics:kpi.overdue', 'Impagados')}
          value={data?.overdue?.count || 0}
          subtitle={data?.overdue?.amount ? formatCurrencyFull(data.overdue.amount) : '0 €'}
          color="red"
          loading={loading}
        />
        <KpiCard
          icon={CheckCircle}
          title={t('analytics:kpi.collectionRate', 'Cobro')}
          value={data?.collectionRate?.rate ? `${data.collectionRate.rate.toFixed(1)}%` : '—'}
          subtitle={`${formatCurrency(data?.collectionRate?.paid)} / ${formatCurrency(data?.collectionRate?.invoiced)}`}
          color="blue"
          loading={loading}
        />
        <KpiCard
          icon={Activity}
          title={t('analytics:kpi.appointments', 'Citas')}
          value={appointments.completed || 0}
          subtitle={`${appointments.cancelled || 0} ${t('analytics:kpi.cancelled', 'anuladas')} · ${appointments.noShow || 0} ${t('analytics:kpi.noShow', 'ausentes')}`}
          color="purple"
          loading={loading}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Monthly revenue */}
        <div className="bg-white rounded-xl border p-5 xl:col-span-2">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-emerald-600" />
            {t('analytics:charts.monthlyRevenue', 'Facturación mensual')}
          </h3>
          {loading ? (
            <div className="h-48 bg-gray-50 rounded animate-pulse" />
          ) : (
            <BarChart
              data={monthlyData}
              labelKey="label"
              valueKey="total"
              formatValue={formatCurrency}
              color="#10b981"
            />
          )}
        </div>

        {/* Revenue by service */}
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="h-4 w-4 text-indigo-600" />
            {t('analytics:charts.byService', 'Por tratamiento')}
          </h3>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <div key={i} className="h-8 bg-gray-50 rounded animate-pulse" />)}
            </div>
          ) : (
            <HorizontalBarChart
              data={serviceData}
              labelKey="label"
              valueKey="total"
              formatValue={formatCurrency}
              color="#6366f1"
            />
          )}
        </div>

        {/* Revenue by practitioner */}
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-600" />
            {t('analytics:charts.byPractitioner', 'Por profesional')}
          </h3>
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <div key={i} className="h-8 bg-gray-50 rounded animate-pulse" />)}
            </div>
          ) : (
            <HorizontalBarChart
              data={practitionerData}
              labelKey="label"
              valueKey="total"
              formatValue={formatCurrency}
              color="#3b82f6"
            />
          )}
        </div>
      </div>
        </>
      )}
    </div>
  );
};

export default AnalyticsModule;
