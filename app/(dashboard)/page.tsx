'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SalesChart from './_components/dashboard/SalesChart';
import TopCategoryChart from './_components/dashboard/TopCategoryChart';
import LowStockAlerts from './_components/dashboard/LowStockAlerts';
import ReceivablesAging from './_components/dashboard/ReceivablesAging';
import EmptyState from './_components/dashboard/EmptyState';
import type { ActivityType, DashboardPeriod, DashboardResponse } from './_lib/dashboard-types';

function formatINR(val: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(val);
}

function formatDateTime(val: string) {
  return new Date(val).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const ACTIVITY_ICON: Record<ActivityType, string> = {
  dispatch: 'local_shipping',
  invoice: 'receipt_long',
  payment: 'payments',
  purchase: 'shopping_cart',
};

const ACTIVITY_ROUTE: Record<ActivityType, string> = {
  dispatch: '/dispatch-entries',
  invoice: '/invoices',
  payment: '/payments',
  purchase: '/purchases',
};

function ChangeIndicator({ changePct }: { changePct: number | null }) {
  if (changePct == null) return null;
  const flat = Math.abs(changePct) < 0.05;
  const up = changePct > 0;
  const icon = flat ? 'trending_flat' : up ? 'arrow_upward' : 'arrow_downward';
  const toneClass = flat
    ? 'text-on-surface-variant'
    : up
      ? 'text-status-success'
      : 'text-status-error';
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-0.5 text-[11px] font-medium ${toneClass}`}
      title="vs. previous period"
    >
      <span className="material-symbols-outlined text-[14px] leading-none">{icon}</span>
      {Math.abs(changePct).toFixed(1)}%
    </span>
  );
}

function StatTile({
  label,
  value,
  tone = 'primary',
  href,
  note,
  changePct,
}: {
  label: string;
  value: string;
  tone?: 'primary' | 'success' | 'error' | 'warning';
  href?: string;
  /** Small caption clarifying scope, e.g. "as of today" for running balances. */
  note?: string;
  /** Period-over-period change; renders a small ↑/↓ indicator next to the value. */
  changePct?: number | null;
}) {
  const router = useRouter();
  const toneClass =
    tone === 'success'
      ? 'text-status-success'
      : tone === 'error'
        ? 'text-status-error'
        : tone === 'warning'
          ? 'text-accent-yellow'
          : 'text-on-surface';
  return (
    <div
      onClick={href ? () => router.push(href) : undefined}
      className={`bg-surface-container-low border-border rounded-xl border p-5 ${
        href ? 'hover:bg-surface-container cursor-pointer transition-colors' : ''
      }`}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-on-surface-variant text-[11px] font-medium tracking-widest uppercase">
          {label}
        </p>
        {note && (
          <span className="border-outline-variant text-on-surface-variant shrink-0 rounded-full border-[0.5px] px-2 py-0.5 text-[9px] font-medium tracking-wide uppercase">
            {note}
          </span>
        )}
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <p className={`font-mono text-xl font-semibold ${toneClass}`}>{value}</p>
        {changePct !== undefined && <ChangeIndicator changePct={changePct} />}
      </div>
    </div>
  );
}

function StatTileSkeleton() {
  return (
    <div className="bg-surface-container-low border-border rounded-xl border p-5">
      <div className="bg-surface-container-high mb-2 h-3 w-24 animate-pulse rounded" />
      <div className="bg-surface-container-high h-7 w-32 animate-pulse rounded" />
    </div>
  );
}

function Card({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-surface-container-low border-border flex flex-col rounded-xl border">
      <div className="border-border flex items-center gap-2 border-b px-5 py-4">
        <span className="material-symbols-outlined text-on-surface-variant text-[18px]">
          {icon}
        </span>
        <h3 className="text-on-surface font-heading text-sm font-semibold">{title}</h3>
      </div>
      <div className="flex-1 p-5">{children}</div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-surface-variant h-5 w-full animate-pulse rounded" />
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return <div className="bg-surface-variant h-[260px] w-full animate-pulse rounded" />;
}

const PERIOD_LABEL: Record<DashboardPeriod, string> = {
  month: 'This Month',
  fy: 'This FY',
};

export default function DashboardPage() {
  const router = useRouter();
  const [period, setPeriod] = useState<DashboardPeriod>('month');
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDispatch, setPendingDispatch] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/dispatch-entries?status=PENDING_BILLING&isCancelled=false&limit=1')
      .then((r) => r.json())
      .then((d) => setPendingDispatch(d.pagination?.total ?? 0))
      .catch((err) => console.error('Failed to fetch pending dispatch count', err));
  }, []);

  const fetchDashboard = useCallback(async (p: DashboardPeriod, isInitial: boolean) => {
    if (!isInitial) setRefreshing(true);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard?period=${p}`);
      const json = await res.json();
      if (!res.ok || !json.data) {
        throw new Error(json?.error?.message ?? 'Failed to load dashboard');
      }
      setDashboard(json.data as DashboardResponse);
    } catch (err) {
      console.error('Failed to fetch dashboard', err);
      setError('Failed to load dashboard data.');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDashboard(period, dashboard === null);
  }, [period, fetchDashboard]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="border-outline-variant flex overflow-hidden rounded border-[0.5px]">
          {(['month', 'fy'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`text-label-caps border-outline-variant border-r-[0.5px] px-4 py-2 uppercase transition-colors last:border-r-0 ${
                period === p
                  ? 'bg-primary/10 text-primary'
                  : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-variant'
              }`}
            >
              {PERIOD_LABEL[p]}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="border-error/30 bg-error/10 text-error flex items-center gap-2 border-[0.5px] px-4 py-3">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <p className="text-body-md">{error}</p>
        </div>
      )}

      {dashboard === null ? (
        error ? null : (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <StatTileSkeleton key={i} />
              ))}
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card title="Sales Trend" icon="show_chart">
                <ChartSkeleton />
              </Card>
              <Card title="Top Categories" icon="bar_chart">
                <ChartSkeleton />
              </Card>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <Card title="Receivables Aging" icon="hourglass_bottom">
                <ListSkeleton />
              </Card>
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card title="Top Pending Vendors" icon="local_shipping">
                <ListSkeleton />
              </Card>
              <Card title="Low Stock Alerts" icon="inventory_2">
                <ListSkeleton />
              </Card>
              <Card title="Credit Health" icon="credit_card">
                <ListSkeleton />
              </Card>
              <Card title="Recent Activity" icon="history">
                <ListSkeleton />
              </Card>
            </div>
          </div>
        )
      ) : (
        <div
          className={`flex flex-col gap-6 transition-opacity duration-200 ${
            refreshing ? 'opacity-60' : 'opacity-100'
          }`}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <StatTile
              label="Invoiced"
              value={formatINR(dashboard.revenue.invoiced)}
              href="/invoices"
              changePct={dashboard.revenue.invoicedChangePct}
            />
            <StatTile
              label="Collected"
              value={formatINR(dashboard.revenue.collected)}
              tone="success"
              href="/payments"
              changePct={dashboard.revenue.collectedChangePct}
            />
            <StatTile
              label="Vendor Payables"
              value={formatINR(dashboard.vendorPayables.total)}
              tone="error"
              href="/purchases?paymentStatus=UNPAID"
              note="as of today"
            />
            <StatTile
              label="Outstanding (Customers)"
              value={formatINR(dashboard.creditHealth.totalOutstanding)}
              tone="error"
              href="/invoices?paymentStatus=UNPAID"
              note="as of today"
            />
            <StatTile
              label="On-Account Credit"
              value={formatINR(dashboard.onAccountCredit)}
              tone="warning"
              href="/payments"
              note="as of today"
            />
            <StatTile
              label="Awaiting Invoicing"
              value={pendingDispatch != null ? String(pendingDispatch) : '—'}
              tone="warning"
              href="/dispatch-entries?status=PENDING_BILLING"
              note="as of today"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card title="Sales Trend" icon="show_chart">
              <SalesChart data={dashboard.salesChart} period={period} />
            </Card>
            <Card title="Top Categories" icon="bar_chart">
              <TopCategoryChart data={dashboard.topCategoryChart} />
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <Card title="Receivables Aging" icon="hourglass_bottom">
              <ReceivablesAging data={dashboard.receivablesAging} />
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card title="Top Pending Vendors" icon="local_shipping">
              {dashboard.vendorPayables.topPendingVendors.length === 0 ? (
                <EmptyState icon="task_alt" message="No pending vendor payables." />
              ) : (
                <ul className="divide-outline-variant divide-y-[0.5px]">
                  {dashboard.vendorPayables.topPendingVendors.map((v) => (
                    <li
                      key={v.vendorId}
                      className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                    >
                      <button
                        onClick={() => router.push(`/vendors/${v.vendorId}`)}
                        className="text-on-surface hover:text-primary text-body-md text-left transition-colors"
                      >
                        {v.vendorName}
                      </button>
                      <span className="text-error text-data-tabular font-semibold">
                        {formatINR(v.amountDue)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title="Low Stock Alerts" icon="inventory_2">
              <LowStockAlerts data={dashboard.lowStock} />
            </Card>

            <Card title="Credit Health" icon="credit_card">
              {dashboard.creditHealth.breachedCustomers.length === 0 ? (
                <EmptyState icon="task_alt" message="No customers over their credit limit." />
              ) : (
                <ul className="divide-outline-variant divide-y-[0.5px]">
                  {dashboard.creditHealth.breachedCustomers.map((c) => (
                    <li
                      key={c.customerId}
                      className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                    >
                      <button
                        onClick={() => router.push(`/customers/${c.customerId}`)}
                        className="text-on-surface hover:text-primary text-body-md text-left transition-colors"
                      >
                        {c.customerName}
                      </button>
                      <span className="text-error text-data-tabular font-semibold">
                        {formatINR(c.outstandingBalance)} / {formatINR(c.creditLimit)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title="Recent Activity" icon="history">
              {dashboard.recentActivity.length === 0 ? (
                <EmptyState icon="history" message="No recent activity." />
              ) : (
                <ul className="divide-outline-variant divide-y-[0.5px]">
                  {dashboard.recentActivity.map((a) => (
                    <li
                      key={`${a.type}-${a.id}`}
                      className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <span className="material-symbols-outlined text-on-surface-variant text-[18px]">
                        {ACTIVITY_ICON[a.type]}
                      </span>
                      <button
                        onClick={() => router.push(`${ACTIVITY_ROUTE[a.type]}/${a.id}`)}
                        className="text-on-surface hover:text-primary text-body-md flex-1 text-left transition-colors"
                      >
                        {a.label}
                      </button>
                      <div className="text-right">
                        <p className="text-data-tabular text-primary text-sm font-semibold">
                          {formatINR(a.amount)}
                        </p>
                        <p className="text-on-surface-variant text-[11px]">
                          {formatDateTime(a.date)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
