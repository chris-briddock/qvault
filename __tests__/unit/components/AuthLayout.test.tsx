/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { AuthLayout } from "@/components/AuthLayout";

describe("AuthLayout", () => {
  it("renders children", () => {
    render(
      <AuthLayout>
        <p>test child</p>
      </AuthLayout>
    );
    expect(screen.getByText("test child")).toBeInTheDocument();
  });

  it("renders the QVAULT logo link", () => {
    render(<AuthLayout><span /></AuthLayout>);
    expect(screen.getByText("VAULT")).toBeInTheDocument();
    expect(screen.getByText("Q")).toBeInTheDocument();
  });

  it("renders the tagline", () => {
    render(<AuthLayout><span /></AuthLayout>);
    expect(
      screen.getByText(/quantum-secure vault/i)
    ).toBeInTheDocument();
  });

  it("logo links to the home page", () => {
    render(<AuthLayout><span /></AuthLayout>);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/");
  });
});
