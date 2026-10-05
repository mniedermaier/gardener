/** Groups date-sorted records into months ("2026-10") for List headers. */
export function groupByMonth<T extends { date: string }>(items: T[]): { key: string; date: string; items: T[] }[] {
  const groups: { key: string; date: string; items: T[] }[] = [];
  for (const item of items) {
    const key = item.date.slice(0, 7);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(item);
    else groups.push({ key, date: `${key}-01`, items: [item] });
  }
  return groups;
}
