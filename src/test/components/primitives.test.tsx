import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Pencil, Trash2 } from "lucide-react";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Checkbox } from "@/components/ui/Checkbox";
import { Tabs } from "@/components/ui/Tabs";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Menu } from "@/components/ui/Menu";
import { List, ListRow } from "@/components/ui/List";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconButton } from "@/components/ui/IconButton";
import { ToastProvider, useToast } from "@/components/ui/Toast";

describe("form primitives", () => {
  it("Select ties label, hint and error to the control", () => {
    render(<Select label="Beet" hint="Optional" error="Pflichtfeld" options={[{ value: "a", label: "Hochbeet" }]} />);
    const select = screen.getByLabelText("Beet");
    expect(select.tagName).toBe("SELECT");
    expect(select).toHaveAttribute("aria-invalid", "true");
    expect(select).toHaveAccessibleDescription("Pflichtfeld");
  });

  it("Textarea and Checkbox are labelled", async () => {
    render(<><Textarea label="Notiz" hint="Kurz" /><Checkbox label="Bio" description="Nur biologisch" /></>);
    expect(screen.getByLabelText("Notiz")).toHaveAccessibleDescription("Kurz");
    const box = screen.getByRole("checkbox", { name: "Bio" });
    await userEvent.click(screen.getByText("Bio"));
    expect(box).toBeChecked();
  });
});

function TabsHarness() {
  const [v, setV] = useState<"a" | "b" | "c">("a");
  return (
    <Tabs label="Ansicht" value={v} onChange={setV} items={[{ value: "a", label: "Alpha" }, { value: "b", label: "Beta" }, { value: "c", label: "Gamma" }]}>
      <p>Panel {v}</p>
    </Tabs>
  );
}

describe("Tabs", () => {
  it("moves with arrow keys and labels the panel", async () => {
    render(<TabsHarness />);
    screen.getByRole("tab", { name: "Alpha" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Beta" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Beta" })).toHaveFocus();
    expect(screen.getByRole("tabpanel", { name: "Beta" })).toHaveTextContent("Panel b");
    await userEvent.keyboard("{End}");
    expect(screen.getByRole("tab", { name: "Gamma" })).toHaveAttribute("aria-selected", "true");
  });
});

describe("SegmentedControl", () => {
  it("is a radio group with counts", async () => {
    const onChange = vi.fn();
    render(<SegmentedControl label="Filter" value="a" onChange={onChange} options={[{ value: "a", label: "Aktiv", count: 2 }, { value: "b", label: "Gelöst", count: 1 }]} />);
    expect(screen.getByRole("radiogroup", { name: "Filter" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Aktiv 2" })).toHaveAttribute("aria-checked", "true");
    await userEvent.click(screen.getByRole("radio", { name: "Gelöst 1" }));
    expect(onChange).toHaveBeenCalledWith("b");
  });
});

describe("Menu", () => {
  it("opens from the keyboard, navigates and closes with Escape", async () => {
    const onEdit = vi.fn();
    render(<Menu label="Weitere Aktionen" items={[{ label: "Bearbeiten", icon: Pencil, onSelect: onEdit }, "separator", { label: "Löschen", icon: Trash2, danger: true, onSelect: () => {} }]} />);
    const trigger = screen.getByRole("button", { name: "Weitere Aktionen" });
    trigger.focus();
    await userEvent.keyboard("{Enter}");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    await act(() => new Promise((r) => requestAnimationFrame(() => r(null))));
    expect(screen.getByRole("menuitem", { name: "Bearbeiten" })).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Löschen" })).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("runs the selected item", async () => {
    const onEdit = vi.fn();
    render(<Menu label="Mehr" items={[{ label: "Bearbeiten", onSelect: onEdit }]} />);
    await userEvent.click(screen.getByRole("button", { name: "Mehr" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Bearbeiten" }));
    expect(onEdit).toHaveBeenCalled();
  });
});

describe("List and ListRow", () => {
  it("makes the row clickable while actions stay separate buttons", async () => {
    const onOpen = vi.fn();
    const onDelete = vi.fn();
    render(
      <List label="Ernten">
        <ListRow title="Tomate" meta="Heute" trailing="1,9 kg" onClick={onOpen} actions={<IconButton icon={Trash2} label="Löschen" onClick={onDelete} />} />
      </List>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Tomate" }));
    await userEvent.click(screen.getByRole("button", { name: "Löschen" }));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("region", { name: "Ernten" })).toBeInTheDocument();
  });
});

describe("display primitives", () => {
  it("StatCard shows value with unit, EmptyState shows its action", () => {
    render(
      <>
        <StatCard label="Geerntet" value="55,5" unit="kg" hint="diese Saison" />
        <EmptyState icon={Trash2} title="Noch leer" description="Hier erscheinen Einträge." action={<button type="button">Anlegen</button>} />
      </>,
    );
    expect(screen.getByText("55,5")).toHaveTextContent("55,5kg");
    expect(screen.getByRole("heading", { name: "Noch leer" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anlegen" })).toBeInTheDocument();
  });
});

function UndoHarness({ onUndo }: { onUndo: () => void }) {
  const { toast } = useToast();
  return <button type="button" onClick={() => toast("Gelöscht", "success", { action: { label: "Rückgängig", onClick: onUndo } })}>go</button>;
}

describe("Toast", () => {
  it("offers an undo action that dismisses the toast", async () => {
    const onUndo = vi.fn();
    render(<ToastProvider><UndoHarness onUndo={onUndo} /></ToastProvider>);
    await userEvent.click(screen.getByRole("button", { name: "go" }));
    expect(screen.getByRole("status")).toHaveTextContent("Gelöscht");
    await userEvent.click(screen.getByRole("button", { name: "Rückgängig" }));
    expect(onUndo).toHaveBeenCalled();
    expect(screen.queryByText("Gelöscht")).not.toBeInTheDocument();
  });
});
