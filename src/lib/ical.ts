import type { Task } from "@/types/task";

function escapeIcal(str: string): string {
  return str.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
}

function formatIcalDate(dateStr: string): string {
  return dateStr.replace(/-/g, "");
}

export function tasksToIcal(tasks: Task[], calendarName: string = "Gardener"): string {
  const now = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const events = tasks
    .filter((t) => !t.completedDate)
    .map((task) => {
      const dtStart = formatIcalDate(task.dueDate);
      // All-day event: DTEND is next day
      const endDate = new Date(task.dueDate);
      endDate.setDate(endDate.getDate() + 1);
      const dtEnd = formatIcalDate(endDate.toISOString().slice(0, 10));

      return [
        "BEGIN:VEVENT",
        `UID:${task.id}@gardener`,
        `DTSTAMP:${now}`,
        `DTSTART;VALUE=DATE:${dtStart}`,
        `DTEND;VALUE=DATE:${dtEnd}`,
        `SUMMARY:${escapeIcal(task.title)}`,
        task.description ? `DESCRIPTION:${escapeIcal(task.description)}` : "",
        `CATEGORIES:${task.type}`,
        "END:VEVENT",
      ].filter(Boolean).join("\r\n");
    });

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Gardener//Garden Planner//EN",
    `X-WR-CALNAME:${escapeIcal(calendarName)}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadIcal(tasks: Task[], filename: string = "gardener-tasks.ics"): void {
  const ical = tasksToIcal(tasks);
  const blob = new Blob([ical], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
