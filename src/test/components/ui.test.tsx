import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

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

describe("Input", () => {
  it("associates its label with the field without the caller passing an id", async () => {
    render(<Input label="Menge" />);
    const field = screen.getByLabelText("Menge");
    await userEvent.type(field, "42");
    expect(field).toHaveValue("42");
  });

  it("gives each instance its own id", () => {
    render(
      <>
        <Input label="Erste" />
        <Input label="Zweite" />
      </>,
    );
    expect(screen.getByLabelText("Erste").id).not.toBe(screen.getByLabelText("Zweite").id);
  });

  it("keeps an explicit id", () => {
    render(<Input label="Notiz" id="note" />);
    expect(screen.getByLabelText("Notiz")).toHaveAttribute("id", "note");
  });
});

describe("Modal", () => {
  it("names the dialog by its title", () => {
    render(<Modal open onClose={() => {}} title="Beet löschen"><p>Inhalt</p></Modal>);
    expect(screen.getByRole("dialog", { name: "Beet löschen" })).toBeInTheDocument();
  });

  it("gives the close button an accessible name", () => {
    render(<Modal open onClose={() => {}} title="Titel"><p>Inhalt</p></Modal>);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("button", { name: "common.close" })).toBeInTheDocument();
  });

  it("reports closing to the caller", async () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="Titel"><p>Inhalt</p></Modal>);
    await userEvent.click(screen.getByRole("button", { name: "common.close" }));
    expect(onClose).toHaveBeenCalled();
  });
});
