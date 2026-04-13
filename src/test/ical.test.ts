import { describe, it, expect } from "vitest";
import { tasksToIcal } from "@/lib/ical";
import type { Task } from "@/types/task";

describe("iCal export", () => {
  const tasks: Task[] = [
    {
      id: "t1",
      gardenId: "g1",
      type: "sow_outdoors",
      title: "Sow Carrots",
      dueDate: "2026-05-15",
    },
    {
      id: "t2",
      gardenId: "g1",
      type: "harvest",
      title: "Harvest Tomatoes",
      description: "Check for ripe ones",
      dueDate: "2026-08-20",
      completedDate: "2026-08-20",
    },
  ];

  it("should generate valid iCal format", () => {
    const ical = tasksToIcal(tasks);
    expect(ical).toContain("BEGIN:VCALENDAR");
    expect(ical).toContain("END:VCALENDAR");
    expect(ical).toContain("VERSION:2.0");
    expect(ical).toContain("PRODID:-//Gardener");
  });

  it("should only include incomplete tasks", () => {
    const ical = tasksToIcal(tasks);
    expect(ical).toContain("Sow Carrots");
    expect(ical).not.toContain("Harvest Tomatoes"); // completed
  });

  it("should format dates correctly", () => {
    const ical = tasksToIcal(tasks);
    expect(ical).toContain("DTSTART;VALUE=DATE:20260515");
    expect(ical).toContain("DTEND;VALUE=DATE:20260516"); // next day
  });

  it("should include task category", () => {
    const ical = tasksToIcal(tasks);
    expect(ical).toContain("CATEGORIES:sow_outdoors");
  });

  it("should handle empty task list", () => {
    const ical = tasksToIcal([]);
    expect(ical).toContain("BEGIN:VCALENDAR");
    expect(ical).toContain("END:VCALENDAR");
    expect(ical).not.toContain("BEGIN:VEVENT");
  });
});
