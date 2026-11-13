// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import "@testing-library/jest-dom/vitest";
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PublicMessageBoard } from "./message-board";

describe("PublicMessageBoard", () => {
  beforeEach(() => cleanup());

  it("renders the compact forum listing with All, Open, Resolved, and More -> Verified filters", async () => {
    const user = userEvent.setup();
    render(<PublicMessageBoard />);

    expect(screen.getByText(/Marketing & Product Forum/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^All$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Open$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Resolved$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /\+ New post/i })).toBeInTheDocument();

    // More menu opens Verified option
    const moreBtn = screen.getByRole("button", { name: /More/i });
    await user.click(moreBtn);
    expect(screen.getByRole("button", { name: /Verified/i })).toBeInTheDocument();
  });

  it("filters messages by Resolved status and opens post detail on card click", async () => {
    const user = userEvent.setup();
    render(<PublicMessageBoard />);

    const resolvedPill = screen.getByRole("button", { name: /^Resolved$/i });
    await user.click(resolvedPill);

    expect(
      screen.getByText(/Headline A\/B test copy generation for self-serve onboarding conversion/i)
    ).toBeInTheDocument();

    // Click the compact card to open detail view
    await user.click(
      screen.getByText(/Headline A\/B test copy generation for self-serve onboarding conversion/i)
    );
    expect(screen.getByRole("button", { name: /Back to discussions/i })).toBeInTheDocument();
    expect(screen.getByText(/Proposed Solutions & Replies/i)).toBeInTheDocument();
  });

  it("opens new post composer without Why Context when '+ New post' is clicked", async () => {
    const user = userEvent.setup();
    render(<PublicMessageBoard />);

    const postBtn = screen.getByRole("button", { name: /\+ New post/i });
    await user.click(postBtn);

    expect(screen.getByText(/Create New Forum Post/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Brief summary of request or announcement/i)).toBeInTheDocument();
    expect(screen.queryByText(/Why Context/i)).not.toBeInTheDocument();
  });
});
