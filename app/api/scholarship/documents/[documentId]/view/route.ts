import { NextResponse } from "next/server";

import { authorizeDocumentAccess } from "@/lib/scholarship/document-access";
import { createSignedDocumentUrl, logDocumentAccess, requestIp } from "@/lib/scholarship/documents";

export const dynamic = "force-dynamic";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/**
 * This route is opened in a new tab, so a failure has to read as a page, not
 * as JSON or a blank tab.
 */
function errorPage(message: string, status: number) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Document unavailable</title>
<style>body{font-family:system-ui,sans-serif;background:#f8fafc;color:#1f2937;margin:0;display:grid;place-items:center;min-height:100vh;padding:16px}
main{max-width:28rem;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px}h1{font-size:1.125rem;color:#1e2a4a;margin:0 0 8px}p{margin:0 0 16px;line-height:1.5}
button{font:inherit;border:1px solid #d1d5db;background:#fff;border-radius:8px;padding:6px 14px;cursor:pointer}</style></head>
<body><main><h1>This document can't be opened</h1><p>${escapeHtml(message)}</p><button type="button" onclick="window.close()">Close this tab</button></main></body></html>`;
  return new NextResponse(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

/**
 * GET /api/scholarship/documents/:id/view[?download=1]
 *
 * One click from the review screen: authorize, log, then redirect to a freshly
 * signed URL. The URL is minted at click time, so the 10-minute expiry never
 * catches a reviewer who left the page open. PDFs and images render in the
 * browser's own viewer; ?download=1 saves the file under its original name.
 */
export async function GET(request: Request, { params }: { params: Promise<{ documentId: string }> }) {
  try {
    const { documentId } = await params;
    const ip = requestIp(request);
    const download = new URL(request.url).searchParams.get("download") === "1";

    const access = await authorizeDocumentAccess(documentId, ip);
    if (!access.ok) return errorPage(access.message, access.status);

    const url = await createSignedDocumentUrl(access.storagePath, download ? { downloadAs: access.fileName } : {});
    if (!url) {
      return errorPage("The file could not be retrieved. It may have been removed under our retention policy.", 410);
    }

    await logDocumentAccess({
      documentId,
      accessedBy: access.actorId,
      accessorEmail: access.actorEmail,
      action: download ? "download" : "view",
      ip,
    });

    const response = NextResponse.redirect(url, 302);
    // The signed URL is a bearer credential for the file; keep it out of caches.
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  } catch (error) {
    console.error("[scholarship] document view failed", error);
    return errorPage("Something went wrong on our end. Try again, and tell us if it keeps happening.", 500);
  }
}
