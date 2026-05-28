import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DashboardClient } from "../dashboard-client";

// Mock fetch for the period switcher
const mockFetch = vi.fn();
global.fetch = mockFetch;

const baseData = {
  stats: {
    totalProducts: 42,
    totalOrders: 156,
    totalRevenue: 48500,
    pendingOrders: 8,
    lowStockCount: 3,
    newCustomers: 89,
    ordersToday: 5,
    revenueToday: 3200,
  },
  revenue: [
    { date: "2026-05-22", revenue: 1500, orders: 3 },
    { date: "2026-05-23", revenue: 2300, orders: 5 },
    { date: "2026-05-24", revenue: 800, orders: 2 },
    { date: "2026-05-25", revenue: 4200, orders: 8 },
    { date: "2026-05-26", revenue: 3100, orders: 6 },
    { date: "2026-05-27", revenue: 1800, orders: 4 },
    { date: "2026-05-28", revenue: 950, orders: 1 },
  ],
  recentOrders: [
    {
      id: "1",
      orderNumber: "ORD-001",
      status: "PENDING",
      total: 1299.99,
      billingName: "Mario Rossi",
      billingEmail: "mario@example.com",
      createdAt: "2026-05-28T14:30:00",
      itemCount: 3,
    },
    {
      id: "2",
      orderNumber: "ORD-002",
      status: "DELIVERED",
      total: 549.5,
      billingName: "Luigi Bianchi",
      billingEmail: "luigi@example.com",
      createdAt: "2026-05-27T10:15:00",
      itemCount: 1,
    },
  ],
  lowStockProducts: [
    {
      id: "v1",
      variantName: "Nero 256GB",
      productTitle: "SSD NVMe",
      productSlug: "ssd-nvme",
      sku: "SSD-001",
      stock: 2,
      lowStock: 5,
    },
  ],
};

describe("DashboardClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the page header", () => {
    render(<DashboardClient data={baseData} />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText(/Benvenuto nel pannello di amministrazione/)).toBeInTheDocument();
  });

  it("renders summary cards", () => {
    render(<DashboardClient data={baseData} />);
    expect(screen.getByText("Vendite oggi")).toBeInTheDocument();
    expect(screen.getByText("Ordini in sospeso")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("Prodotti totali")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("Ricavi totali")).toBeInTheDocument();
  });

  it("renders revenue chart section", () => {
    render(<DashboardClient data={baseData} />);
    expect(screen.getByText("Andamento vendite")).toBeInTheDocument();
    expect(screen.getByText("7 giorni")).toBeInTheDocument();
    expect(screen.getByText("30 giorni")).toBeInTheDocument();
    expect(screen.getByText("90 giorni")).toBeInTheDocument();
  });

  it("renders recent orders section", () => {
    render(<DashboardClient data={baseData} />);
    expect(screen.getByText("Ordini recenti")).toBeInTheDocument();
    expect(screen.getByText("#ORD-001")).toBeInTheDocument();
    expect(screen.getByText("Mario Rossi")).toBeInTheDocument();
    expect(screen.getByText("#ORD-002")).toBeInTheDocument();
  });

  it("renders low stock section", () => {
    render(<DashboardClient data={baseData} />);
    expect(screen.getByText("Stock basso")).toBeInTheDocument();
    expect(screen.getByText("SSD NVMe — Nero 256GB")).toBeInTheDocument();
  });

  it("shows empty state when no orders", () => {
    const emptyOrders = {
      ...baseData,
      recentOrders: [],
    };
    render(<DashboardClient data={emptyOrders} />);
    expect(screen.getByText("Nessun ordine ancora")).toBeInTheDocument();
  });

  it("shows empty state when no low stock", () => {
    const noLowStock = {
      ...baseData,
      lowStockProducts: [],
    };
    render(<DashboardClient data={noLowStock} />);
    expect(screen.getByText("Nessun prodotto con stock basso")).toBeInTheDocument();
  });

  it("renders with zero values", () => {
    const zeroData = {
      ...baseData,
      stats: {
        totalProducts: 0,
        totalOrders: 0,
        totalRevenue: 0,
        pendingOrders: 0,
        lowStockCount: 0,
        newCustomers: 0,
        ordersToday: 0,
        revenueToday: 0,
      },
    };
    render(<DashboardClient data={zeroData} />);
    // Verify cards render with zeros - use getAllByText since "0" appears in multiple cards
    const zeros = screen.getAllByText("0");
    expect(zeros.length).toBeGreaterThanOrEqual(2);
  });

  it("switches revenue period on button click", async () => {
    const user = userEvent.setup();

    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        data: [
          { date: "2026-04-28", revenue: 1000, orders: 2 },
          { date: "2026-04-29", revenue: 2000, orders: 4 },
        ],
      }),
    });

    render(<DashboardClient data={baseData} />);

    // Click "30 giorni"
    await user.click(screen.getByText("30 giorni"));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/admin/dashboard/revenue?days=30");
    });
  });
});
