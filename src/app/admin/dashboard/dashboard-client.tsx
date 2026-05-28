"use client";

import { useState } from "react";
import Link from "next/link";
import type { DashboardStats, RevenueDataPoint, RecentOrder, LowStockItem } from "@/db/queries/dashboard";
import { RevenueChart } from "./revenue-chart";
import { formatCurrency, formatDate, getStatusColor } from "./helpers";

interface DashboardData {
  stats: DashboardStats;
  revenue: RevenueDataPoint[];
  recentOrders: RecentOrder[];
  lowStockProducts: LowStockItem[];
}

interface Props {
  data: DashboardData;
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(status)}`}
    >
      {status}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────

export function DashboardClient({ data }: Props) {
  const [revenueDays, setRevenueDays] = useState(7);
  const [revenueData, setRevenueData] = useState<RevenueDataPoint[]>(data.revenue);
  const [loadingRevenue, setLoadingRevenue] = useState(false);

  const { stats, recentOrders, lowStockProducts } = data;

  const handleRevenuePeriodChange = async (days: number) => {
    setRevenueDays(days);
    setLoadingRevenue(true);
    try {
      const res = await fetch(`/api/admin/dashboard/revenue?days=${days}`);
      const json = await res.json();
      if (json.data) setRevenueData(json.data);
    } catch {
      // fallback to current data
    } finally {
      setLoadingRevenue(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Benvenuto nel pannello di amministrazione di Infograf Store.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Vendite oggi"
          value={formatCurrency(stats.revenueToday)}
          subtitle={`${stats.ordersToday} ordini oggi`}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
          accent="border-l-green-500"
        />
        <SummaryCard
          title="Ordini in sospeso"
          value={stats.pendingOrders.toString()}
          subtitle={`${stats.totalOrders} ordini totali`}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
          }
          accent="border-l-yellow-500"
        />
        <SummaryCard
          title="Prodotti totali"
          value={stats.totalProducts.toString()}
          subtitle={`${stats.lowStockCount} con stock basso`}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          }
          accent="border-l-blue-500"
        />
        <SummaryCard
          title="Ricavi totali"
          value={formatCurrency(stats.totalRevenue)}
          subtitle={`${stats.newCustomers} clienti registrati`}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
          accent="border-l-purple-500"
        />
      </div>

      {/* Revenue chart */}
      <div className="rounded-lg border bg-card">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">Andamento vendite</h2>
          <div className="flex gap-1">
            {[7, 30, 90].map((days) => (
              <button
                key={days}
                onClick={() => handleRevenuePeriodChange(days)}
                disabled={loadingRevenue}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  revenueDays === days
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {days} giorni
              </button>
            ))}
          </div>
        </div>
        <div className="p-6">
          {loadingRevenue ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
              Caricamento...
            </div>
          ) : (
            <RevenueChart data={revenueData} />
          )}
        </div>
      </div>

      {/* Recent orders + Low stock */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent orders */}
        <div className="rounded-lg border bg-card">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <h2 className="text-lg font-semibold">Ordini recenti</h2>
            <Link
              href="/admin/orders"
              className="text-xs font-medium text-primary hover:underline"
            >
              Vedi tutti
            </Link>
          </div>
          <div className="overflow-x-auto">
            {recentOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-sm text-muted-foreground">Nessun ordine ancora</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-6 py-3 font-medium">Ordine</th>
                    <th className="px-6 py-3 font-medium">Cliente</th>
                    <th className="px-6 py-3 font-medium">Stato</th>
                    <th className="px-6 py-3 font-medium text-right">Totale</th>
                    <th className="px-6 py-3 font-medium text-right">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-3 font-medium">
                        <Link
                          href={`/admin/orders`}
                          className="hover:text-primary transition-colors"
                        >
                          #{order.orderNumber}
                        </Link>
                      </td>
                      <td className="px-6 py-3 text-muted-foreground">
                        <div>{order.billingName}</div>
                        <div className="text-xs">{order.billingEmail}</div>
                      </td>
                      <td className="px-6 py-3">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-6 py-3 text-right font-medium">
                        {formatCurrency(order.total)}
                      </td>
                      <td className="px-6 py-3 text-right text-muted-foreground whitespace-nowrap">
                        {formatDate(order.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Low stock products */}
        <div className="rounded-lg border bg-card">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <h2 className="text-lg font-semibold">Stock basso</h2>
            <Link
              href="/admin/stock"
              className="text-xs font-medium text-primary hover:underline"
            >
              Gestisci magazzino
            </Link>
          </div>
          {lowStockProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-muted-foreground">Nessun prodotto con stock basso</p>
            </div>
          ) : (
            <div className="divide-y">
              {lowStockProducts.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between px-6 py-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {item.productTitle} — {item.variantName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      SKU: {item.sku ?? "N/A"}
                    </p>
                  </div>
                  <div className="ml-4 flex items-center gap-2 shrink-0">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                        item.stock === 0
                          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                      }`}
                    >
                      {item.stock}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      / {item.lowStock}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── SummaryCard sub-component ────────────────────────────────────

function SummaryCard({
  title,
  value,
  subtitle,
  icon,
  accent,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <div className={`rounded-lg border bg-card border-l-4 ${accent}`}>
      <div className="flex items-start justify-between p-5">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div className="text-muted-foreground">{icon}</div>
      </div>
    </div>
  );
}
