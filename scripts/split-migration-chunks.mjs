import fs from "node:fs";
import path from "node:path";

const root = process.argv[2] || "supabase/migrations/005_new_project_schema.sql";
const outDir =
  process.argv[3] || "supabase/migrations/_apply_chunks";
const maxChunk = Number(process.argv[4]) || 4500;

const sql = fs.readFileSync(root, "utf8");

/** Split on semicolons outside dollar-quoted strings ($$...$$ or $tag$...$tag$). */
function splitSqlStatements(src) {
  const stmts = [];
  let i = 0;
  let buf = "";
  let dollarTag = null;

  while (i < src.length) {
    const c = src[i];

    if (dollarTag) {
      if (src.startsWith(dollarTag, i)) {
        buf += src.slice(i, i + dollarTag.length);
        i += dollarTag.length;
        dollarTag = null;
        continue;
      }
      buf += c;
      i++;
      continue;
    }

    if (c === "$") {
      const rest = src.slice(i);
      const m = rest.match(/^\$([A-Za-z0-9_]*)\$/);
      if (m) {
        dollarTag = m[0];
        buf += dollarTag;
        i += dollarTag.length;
        continue;
      }
    }

    if (
      c === ";" &&
      (i + 1 >= src.length || src[i + 1] === "\n" || src[i + 1] === "\r")
    ) {
      buf += ";";
      const trimmed = buf.trim();
      if (trimmed) stmts.push(trimmed);
      buf = "";
      i++;
      if (src[i] === "\r") i++;
      if (src[i] === "\n") i++;
      continue;
    }

    buf += c;
    i++;
  }

  const tail = buf.trim();
  if (tail) stmts.push(tail);
  return stmts;
}

const stmts = splitSqlStatements(sql);
const maxStmt = Math.max(...stmts.map((s) => s.length), 0);
console.log("statements", stmts.length, "max_stmt_len", maxStmt);

const chunks = [];
let cur = [];
let len = 0;

for (const s of stmts) {
  const add = s.length + 2;
  if (len + add > maxChunk && cur.length) {
    chunks.push(cur.join("\n\n"));
    cur = [s];
    len = s.length;
  } else {
    cur.push(s);
    len += add;
  }
}
if (cur.length) chunks.push(cur.join("\n\n"));

console.log(
  "chunks",
  chunks.length,
  "sizes",
  chunks.map((c) => c.length),
);

fs.mkdirSync(outDir, { recursive: true });
chunks.forEach((c, i) => {
  const p = path.join(outDir, `chunk_${String(i).padStart(2, "0")}.sql`);
  fs.writeFileSync(p, c);
});
