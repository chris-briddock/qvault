/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("@/hooks/usePasskeyAuth", () => ({
  usePasskeyAuth: jest.fn(),
}));

import RegisterForm from "@/components/RegisterForm";
import { usePasskeyAuth } from "@/hooks/usePasskeyAuth";

const mockUsePasskeyAuth = usePasskeyAuth as jest.Mock;

function setupMock(overrides: Partial<ReturnType<typeof usePasskeyAuth>> = {}) {
  mockUsePasskeyAuth.mockReturnValue({
    register: jest.fn().mockResolvedValue(undefined),
    loading: false,
    error: null,
    clearError: jest.fn(),
    ...overrides,
  });
}

describe("RegisterForm", () => {
  beforeEach(() => setupMock());
  afterEach(() => jest.clearAllMocks());

  it("renders the username input", () => {
    render(<RegisterForm />);
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
  });

  it("renders the submit button", () => {
    render(<RegisterForm />);
    expect(
      screen.getByRole("button", { name: /register passkey/i })
    ).toBeInTheDocument();
  });

  it("renders a link to the login page", () => {
    render(<RegisterForm />);
    const link = screen.getByRole("link", { name: /sign in/i });
    expect(link).toHaveAttribute("href", "/login");
  });

  it("disables the button and shows loading text when loading", () => {
    setupMock({ loading: true });
    render(<RegisterForm />);
    expect(
      screen.getByRole("button", { name: /generating keys/i })
    ).toBeDisabled();
  });

  it("displays an error when error is set", () => {
    setupMock({ error: "Username already taken" });
    render(<RegisterForm />);
    expect(screen.getByText("Username already taken")).toBeInTheDocument();
  });

  it("calls register with the trimmed username on submit", async () => {
    const mockRegister = jest.fn().mockResolvedValue(undefined);
    setupMock({ register: mockRegister });

    render(<RegisterForm />);
    await userEvent.type(screen.getByLabelText(/username/i), "  bob  ");
    fireEvent.submit(screen.getByRole("button", { name: /register/i }).closest("form")!);

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith("bob");
    });
  });

  it("does not call register when username is empty or whitespace", async () => {
    const mockRegister = jest.fn();
    setupMock({ register: mockRegister });

    render(<RegisterForm />);
    fireEvent.submit(screen.getByRole("button", { name: /register/i }).closest("form")!);

    await waitFor(() => {
      expect(mockRegister).not.toHaveBeenCalled();
    });
  });
});
