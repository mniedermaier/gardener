import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { useCallback, useState } from "react";
import { QuickAdd } from "@/components/layout/QuickAdd";
import { useOpenAddOnNavigate } from "@/hooks/useOpenAddOnNavigate";

function HarvestPage() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useOpenAddOnNavigate(useCallback(() => setOpen(true), []));
  return (
    <div>
      <p>harvest page</p>
      <p data-testid="dialog">{open ? "open" : "closed"}</p>
      <p data-testid="state">{location.state ? "has-state" : "no-state"}</p>
    </div>
  );
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <QuickAdd />
      <Routes>
        <Route path="/" element={<p>home</p>} />
        <Route path="/harvest" element={<HarvestPage />} />
        <Route path="/planner" element={<p>planner</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

// The Modal renders through <dialog>, which jsdom knows but does not implement.
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.open = true;
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.open = false;
    this.dispatchEvent(new Event("close"));
  });
});

describe("QuickAdd", () => {
  it("navigates to the page and opens its add dialog, then clears the flag", async () => {
    const user = userEvent.setup();
    renderAt("/");
    await user.click(screen.getByRole("button", { name: "quickAdd.title" }));
    await user.click(screen.getByRole("button", { name: /quickAdd.harvest/ }));

    expect(await screen.findByText("harvest page")).toBeInTheDocument();
    expect(screen.getByTestId("dialog")).toHaveTextContent("open");
    expect(screen.getByTestId("state")).toHaveTextContent("no-state");
  });

  it("stays out of the planner, which has its own bottom sheet", () => {
    renderAt("/planner");
    expect(screen.queryByRole("button", { name: "quickAdd.title" })).toBeNull();
  });
});
