/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { PageHeader } from "@/components/PageHeader";

describe("PageHeader", () => {
  it("renders the provided title in the heading", () => {
    render(<PageHeader title="MY TITLE" />);
    expect(screen.getByRole("heading", { name: "MY TITLE" })).toBeInTheDocument();
  });

  it("renders the QVAULT home link", () => {
    render(<PageHeader title="test" />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/dashboard");
  });

  it("renders an action when provided", () => {
    render(
      <PageHeader title="test" action={<button>New Entry</button>} />
    );
    expect(
      screen.getByRole("button", { name: "New Entry" })
    ).toBeInTheDocument();
  });

  it("renders nothing in the action slot when not provided", () => {
    const { container } = render(<PageHeader title="test" />);
    expect(container.querySelector("button")).toBeNull();
  });
});
