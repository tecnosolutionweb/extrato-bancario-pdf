export interface RawTextItem {
  str: string;
  transform: number[];
  width?: number;
  height?: number;
}

/**
 * Groups the raw text items of a page into logical lines.
 *
 * pdf.js returns text items in content-stream order without any line
 * information. Rendering them as a single string destroys the row layout of a
 * bank statement, so we rebuild the lines using the item's Y coordinate and
 * then join the items of each line respecting the horizontal gaps.
 */
export const buildLines = (items: RawTextItem[]): string[] => {
  const rows: { y: number; items: { x: number; end: number; str: string }[] }[] = [];

  for (const item of items) {
    const str = item.str;
    if (!str || !str.trim()) continue;

    const x = item.transform[4];
    const y = item.transform[5];
    const width = item.width ?? str.length * (item.height ?? 8) * 0.5;

    let row = rows.find((r) => Math.abs(r.y - y) <= 2.5);
    if (!row) {
      row = { y, items: [] };
      rows.push(row);
    }
    row.items.push({ x, end: x + width, str });
  }

  return rows
    .sort((a, b) => b.y - a.y)
    .map((row) => {
      row.items.sort((a, b) => a.x - b.x);

      let line = '';
      let prevEnd: number | null = null;

      for (const item of row.items) {
        if (prevEnd !== null && item.x - prevEnd > 1) {
          line += ' ';
        }
        line += item.str;
        prevEnd = item.end;
      }

      return line.replace(/\s+/g, ' ').trim();
    })
    .filter((line) => line.length > 0);
};
