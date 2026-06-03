import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PasswordSetup } from "@/components/password-setup";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock router
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

describe("PasswordSetup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the title and description", () => {
    render(<PasswordSetup />);
    expect(screen.getByText("Password di accesso")).toBeInTheDocument();
  });

  it("shows all input fields", () => {
    render(<PasswordSetup />);
    expect(screen.getByPlaceholderText(/Lascia vuoto/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Minimo 8 caratteri/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ripeti la password/)).toBeInTheDocument();
  });

  it("disables submit button when passwords are empty", () => {
    render(<PasswordSetup />);
    const button = screen.getByText("Salva password");
    expect(button).toBeDisabled();
  });

  it("shows error when passwords don't match", async () => {
    const user = userEvent.setup();
    render(<PasswordSetup />);

    await user.type(screen.getByPlaceholderText(/Minimo 8/), "password123");
    await user.type(screen.getByPlaceholderText(/Ripeti/), "different456");

    await user.click(screen.getByText("Salva password"));

    expect(screen.getByText("Le password non corrispondono.")).toBeInTheDocument();
  });

  it("shows error when password is too short", async () => {
    const user = userEvent.setup();
    render(<PasswordSetup />);

    await user.type(screen.getByPlaceholderText(/Minimo 8/), "short");
    await user.type(screen.getByPlaceholderText(/Ripeti/), "short");

    await user.click(screen.getByText("Salva password"));

    expect(
      screen.getByText("La password deve essere di almeno 8 caratteri."),
    ).toBeInTheDocument();
  });

  it("calls API and shows success on valid submission", async () => {
    const user = userEvent.setup();

    mockFetch.mockResolvedValueOnce({
      json: async () => ({ success: true }),
    });

    render(<PasswordSetup />);

    await user.type(screen.getByPlaceholderText(/Minimo 8/), "correct-horse-battery-staple");
    await user.type(
      screen.getByPlaceholderText(/Ripeti/),
      "correct-horse-battery-staple",
    );

    await user.click(screen.getByText("Salva password"));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: "",
          newPassword: "correct-horse-battery-staple",
        }),
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Password impostata con successo!")).toBeInTheDocument();
    });
  });

  it("shows error message from API on failure", async () => {
    const user = userEvent.setup();

    mockFetch.mockResolvedValueOnce({
      json: async () => ({ error: "Password attuale non corretta." }),
    });

    render(<PasswordSetup />);

    await user.type(screen.getByPlaceholderText(/Minimo 8/), "newpassword123");
    await user.type(screen.getByPlaceholderText(/Ripeti/), "newpassword123");
    await user.click(screen.getByText("Salva password"));

    await waitFor(() => {
      expect(
        screen.getByText("Password attuale non corretta."),
      ).toBeInTheDocument();
    });
  });

  it("shows connection error on network failure", async () => {
    const user = userEvent.setup();

    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    render(<PasswordSetup />);

    await user.type(screen.getByPlaceholderText(/Minimo 8/), "validpassword123");
    await user.type(screen.getByPlaceholderText(/Ripeti/), "validpassword123");
    await user.click(screen.getByText("Salva password"));

    await waitFor(() => {
      expect(screen.getByText("Errore di connessione.")).toBeInTheDocument();
    });
  });
});
