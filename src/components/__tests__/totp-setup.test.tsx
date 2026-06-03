import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TotpSetup } from "@/components/totp-setup";

// Mock next-auth session — default: totp disabled
const mockSession = {
  data: {
    user: {
      id: "test-1",
      email: "admin@test.com",
      role: "ADMIN",
      totpEnabled: false,
      needsTotp: false,
    },
  },
  update: vi.fn(),
  status: "authenticated",
};

vi.mock("next-auth/react", () => ({
  useSession: () => mockSession,
}));

// Mock router
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("TotpSetup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders setup button when 2FA is not enabled", () => {
    render(<TotpSetup />);
    expect(screen.getByText("Autenticazione a due fattori")).toBeInTheDocument();
    expect(screen.getByText("Configura 2FA")).toBeInTheDocument();
  });

  it("shows active status when 2FA is enabled", () => {
    // Override session for this test
    mockSession.data.user.totpEnabled = true;
    const { rerender } = render(<TotpSetup />);
    expect(screen.getByText(/2FA attiva e funzionante/)).toBeInTheDocument();
    mockSession.data.user.totpEnabled = false; // reset
  });

  it("fetches QR code when setup button is clicked", async () => {
    const user = userEvent.setup();

    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        secret: "MOCKBASE32SECRET",
        qrCode: "data:image/png;base64,mockqrcode",
      }),
    });

    render(<TotpSetup />);

    await user.click(screen.getByText("Configura 2FA"));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/auth/totp-setup", {
        method: "POST",
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/Scansiona il QR code/)).toBeInTheDocument();
    });
  });

  it("shows error when QR fetch fails", async () => {
    const user = userEvent.setup();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ error: "Errore durante la generazione." }),
    });

    render(<TotpSetup />);

    await user.click(screen.getByText("Configura 2FA"));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(
        screen.getByText("Errore durante la generazione."),
      ).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
