"use client";

import type { RevenueDataPoint } from "@/db/queries/dashboard";
import { formatCompactCurrency, formatShortDate } from "./helpers";

interface Props {
  data: RevenueDataPoint[];
}

export function RevenueChart({ data }: Props) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
        Nessun dato disponibile
      </div>
    );
  }

  const values = data.map((d) => d.revenue);
  const maxValue = Math.max(...values, 1);
  const chartHeight = 200;
  const barWidth = Math.max(12, Math.min(40, (600 - 60) / data.length - 4));

  const isToday = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  };

  return (
    <div className="w-full">
      {/* Y-axis labels */}
      <div className="relative" style={{ height: chartHeight + 24 }}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = chartHeight - ratio * chartHeight;
          return (
            <div
              key={ratio}
              className="absolute left-0 right-0 flex items-center"
              style={{ top: y }}
            >
              <span className="w-14 text-right text-xs text-muted-foreground">
                  {formatCompactCurrency(maxValue * ratio)}
              </span>
              <div className="ml-2 flex-1 border-t border-border/40" />
            </div>
          );
        })}

        {/* Bars */}
        <div
          className="absolute left-16 right-0 bottom-0 flex items-end"
          style={{ height: chartHeight }}
        >
          {data.map((point) => {
            const height = maxValue > 0 ? (point.revenue / maxValue) * chartHeight : 0;
            const today = isToday(point.date);

            return (
              <div
                key={point.date}
                className="group relative flex flex-col items-center justify-end"
                style={{ width: barWidth + 4, marginRight: 2 }}
              >
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                  <div className="rounded-md bg-popover px-3 py-1.5 text-xs font-medium shadow-md border text-popover-foreground whitespace-nowrap">
                    {formatShortDate(point.date)} — {formatCompactCurrency(point.revenue)}
                    <span className="ml-1 text-muted-foreground">
                      ({point.orders} ordini)
                    </span>
                  </div>
                </div>

                {/* Bar */}
                <div
                  className={`w-full rounded-t-sm transition-all duration-300 ${
                    today
                      ? "bg-primary"
                      : "bg-primary/60 hover:bg-primary/80"
                  }`}
                  style={{ height: Math.max(height, 2) }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* X-axis labels */}
      <div className="flex pl-16 pt-2">
        {data
          .filter((_, i) => {
            // Show labels for first, last, and every N-th item to avoid overlap
            const interval = Math.max(1, Math.floor(data.length / 5));
            return i === 0 || i === data.length - 1 || i % interval === 0;
          })
          .map((point) => (
            <div
              key={point.date}
              className="text-xs text-muted-foreground truncate"
              style={{ width: `${100 / data.length}%`, textAlign: "center" }}
            >
              {formatShortDate(point.date)}
            </div>
          ))}
      </div>
    </div>
  );
}
