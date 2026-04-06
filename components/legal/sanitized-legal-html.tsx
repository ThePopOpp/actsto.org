import DOMPurify from "isomorphic-dompurify";

import { LEGAL_BODY_CLASS } from "@/components/legal/legal-body-class";

export function SanitizedLegalHtml({ html }: { html: string }) {
  const clean = DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
  return <div className={LEGAL_BODY_CLASS} dangerouslySetInnerHTML={{ __html: clean }} />;
}
