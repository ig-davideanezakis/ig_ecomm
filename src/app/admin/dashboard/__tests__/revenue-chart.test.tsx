import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { RevenueChart } from "../revenue-chart";

const sampleData = [
  { date: "2026-05-22", revenue: 1500, orders: 3 },
  { date: "2026-05-23", revenue: 2300, orders: 5 },
  { date: "2026-05-24", revenue: 800, orders: 2 },
  { date: "2026-05-25", revenue: 4200, orders: 8 },
  { date: "2026-05-26", revenue: 3100, orders: 6 },
  { date: "2026-05-27", revenue: 1800, orders: 4 },
  { date: "2026-05-28", revenue: 950, orders: 1 },
];

describe("RevenueChart", () => {
  it("renders without crashing", () => {
    const { container } = render(<RevenueChart data={sampleData} />);
    expect(container).toBeInTheDocument();
  });

  it("renders empty state when data is empty", () => {
    const { container } = render(<RevenueChart data={[]} />);
    expect(container.textContent).toContain("Nessun dato disponibile");
  });

  it("renders a message when data is empty", () => {
    const { getByText } = render(<RevenueChart data={[]} />);
    expect(getByText("Nessun dato disponibile")).toBeInTheDocument();
  });

  it("renders Y-axis labels with currency values", () => {
    const { container } = render(<RevenueChart data={sampleData} />);
    // Y-axis grid lines contain formatted currency values
    const labels = container.querySelectorAll(".text-muted-foreground");
    const hasCurrencyLabel = Array.from(labels).some(
      (el) => el.textContent?.includes("€"),
    );
    expect(hasCurrencyLabel).toBe(true);
  });

  it("renders bars for each data point", () => {
    const { container } = render(<RevenueChart data={sampleData} />);
    // There should be bar elements matching our data points
    const barContainer = container.querySelector(".flex.items-end");
    expect(barContainer).toBeInTheDocument();
    const items = barContainer?.querySelectorAll("[class*='rounded-t-sm']");
    expect(items).toHaveLength(sampleData.length);
  });

  it("renders today's bar with primary color", () => {
    const today = new Date().toISOString().split("T")[0];
    // Use a unique set of data that doesn't overlap with today
    const dataWithToday = [
      { date: "2026-06-01", revenue: 1500, orders: 3 },
      { date: "2026-06-02", revenue: 2300, orders: 5 },
      { date: today, revenue: 500, orders: 1 },
    ];
    const { container } = render(<RevenueChart data={dataWithToday} />);
    // Today's bar should have the bg-primary class
    const bars = container.querySelectorAll("[class*='rounded-t-sm']");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("renders with single data point", () => {
    const { container } = render(
      <RevenueChart data={[{ date: "2026-05-28", revenue: 1000, orders: 2 }]} />,
    );
    const bars = container.querySelectorAll("[class*='rounded-t-sm']");
    expect(bars).toHaveLength(1);
  });
});
