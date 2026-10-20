import "server-only";

import { strFromU8, unzipSync } from "fflate";

/**
 * The first worksheet of an .xlsx file as rows of cell text, enough to read a
 * simple published table such as ADOR's state aid matrix. Formulas give their
 * cached value; styling, merged cells and other sheets are ignored.
 */
export function readFirstSheet(bytes: Uint8Array): string[][] {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes, { filter: (f) => f.name.startsWith("xl/") });
  } catch {
    throw new Error("That file isn't a readable .xlsx workbook.");
  }
  const text = (name: string) => (files[name] ? strFromU8(files[name]) : null);

  const shared: string[] = [];
  const sst = text("xl/sharedStrings.xml");
  if (sst) {
    for (const si of sst.match(/<si\b[\s\S]*?<\/si>/g) ?? []) {
      shared.push((si.match(/<t\b[^>]*>([\s\S]*?)<\/t>/g) ?? []).map((t) => decode(t.replace(/^<t\b[^>]*>|<\/t>$/g, ""))).join(""));
    }
  }

  const sheetPath = firstSheetPath(text) ?? Object.keys(files).filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort()[0];
  const sheet = sheetPath ? text(sheetPath) : null;
  if (!sheet) throw new Error("The workbook has no worksheet.");

  const rows: string[][] = [];
  for (const rowXml of sheet.match(/<row\b[\s\S]*?<\/row>/g) ?? []) {
    const row: string[] = [];
    for (const cell of rowXml.match(/<c\b[^>]*\/>|<c\b[\s\S]*?<\/c>/g) ?? []) {
      const attrs = cell.match(/^<c\b([^>]*)/)?.[1] ?? "";
      const ref = attrs.match(/\br="([A-Z]+)\d+"/)?.[1];
      const type = attrs.match(/\bt="([^"]+)"/)?.[1] ?? "n";
      const v = cell.match(/<v>([\s\S]*?)<\/v>/)?.[1];
      let value = "";
      if (type === "s" && v !== undefined) value = shared[Number(v)] ?? "";
      else if (type === "inlineStr") value = (cell.match(/<t\b[^>]*>([\s\S]*?)<\/t>/g) ?? []).map((t) => decode(t.replace(/^<t\b[^>]*>|<\/t>$/g, ""))).join("");
      else if (v !== undefined) value = type === "n" && /^-?[\d.]+(E[-+]?\d+)?$/i.test(v) ? String(Math.round(Number(v) * 100) / 100) : decode(v);
      const index = ref ? columnIndex(ref) : row.length;
      while (row.length < index) row.push("");
      row[index] = value;
    }
    rows.push(row);
  }
  return rows;
}

function firstSheetPath(text: (name: string) => string | null): string | null {
  const workbook = text("xl/workbook.xml");
  const rels = text("xl/_rels/workbook.xml.rels");
  const rid = workbook?.match(/<sheet\b[^>]*\br:id="([^"]+)"/)?.[1];
  if (!rid || !rels) return null;
  const target = rels.match(new RegExp(`<Relationship\\b[^>]*Id="${rid}"[^>]*Target="([^"]+)"`))?.[1] ??
    rels.match(new RegExp(`<Relationship\\b[^>]*Target="([^"]+)"[^>]*Id="${rid}"`))?.[1];
  if (!target) return null;
  return target.startsWith("/") ? target.slice(1) : `xl/${target.replace(/^\.\//, "")}`;
}

function columnIndex(letters: string): number {
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function decode(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCharCode(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/g, "&");
}
