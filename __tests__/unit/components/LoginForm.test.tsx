/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("@/hooks/usePasskeyAuth", () => ({
  usePasskeyAuth: jest.fn(),
}));

import LoginForm from "@/components/LoginForm";
import { usePasskeyAuth } from "@/hooks/usePasskeyAuth";

const mockUsePasskeyAuth = usePasskeyAuth as jest.Mock;

function setupMock(overrides: Partial<ReturnType<typeof usePasskeyAuth>> = {}) {
  mockUsePasskeyAuth.mockReturnValue({
    login: jest.fn().mockResolvedValue(undefined),
    loading: false,
    error: null,
    clearError: jest.fn(),
    ...overrides,
  });
}

describe("LoginForm", () => {
  beforeEach(() => setupMock());
  afterEach(() => jest.clearAllMocks());

  it("renders the username input", () => {
    render(<LoginForm />);
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
  });

  it("renders the submit button", () => {
    render(<LoginForm />);
    expect(
      screen.getByRole("button", { name: /unlock with passkey/i })
    ).toBeInTheDocument();
  });

  it("renders a link to the register page", () => {
    render(<LoginForm />);
    const link = screen.getByRole("link", { name: /create one/i });
    expect(link).toHaveAttribute("href", "/register");
  });

  it("disables the submit button when loading", () => {
    setupMock({ loading: true });
    render(<LoginForm />);
    expect(
      screen.getByRole("button", { name: /authenticating/i })
    ).toBeDisabled();
  });

  it("displays an error message when error is set", () => {
    setupMock({ error: "Authentication failed" });
    render(<LoginForm />);
    expect(screen.getByText("Authentication failed")).toBeInTheDocument();
  });

  it("calls login with the trimmed username on submit", async () => {
    const mockLogin = jest.fn().mockResolvedValue(undefined);
    setupMock({ login: mockLogin });

    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText(/username/i), "  alice  ");
    fireEvent.submit(screen.getByRole("button", { name: /unlock/i }).closest("form")!);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith("alice");
    });
  });

  it("does not call login when username is empty", async () => {
    const mockLogin = jest.fn();
    setupMock({ login: mockLogin });

    render(<LoginForm />);
    fireEvent.submit(screen.getByRole("button", { name: /unlock/i }).closest("form")!);

    await waitFor(() => {
      expect(mockLogin).not.toHaveBeenCalled();
    });
  });
});
