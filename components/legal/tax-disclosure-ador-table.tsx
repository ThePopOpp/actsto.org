import { Card } from "@/components/ui/card";
import { ADOR_DOCS_BASE, ADOR_REFERENCE_FORM_GROUPS } from "@/lib/tax-disclosure-ador-forms";

function PdfLink({ file, label }: { file: string; label: string }) {
  return (
    <a
      href={`${ADOR_DOCS_BASE}/${file}`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline-offset-4 hover:underline"
    >
      {label}
    </a>
  );
}

export function TaxDisclosureAdorTable() {
  return (
    <Card className="overflow-hidden border-border/80">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Publication</th>
              <th className="px-4 py-3">Form</th>
              <th className="px-4 py-3">Tax year</th>
              <th className="px-4 py-3">Form (PDF)</th>
              <th className="px-4 py-3">Instructions (PDF)</th>
            </tr>
          </thead>
          <tbody>
            {ADOR_REFERENCE_FORM_GROUPS.map((group) =>
              group.rows.map((row, index) => (
                <tr key={`${group.formLabel}-${row.taxYear}`} className="border-b border-border/60 last:border-0">
                  {index === 0 ? (
                    <td rowSpan={group.rows.length} className="align-top px-4 py-3 font-medium text-foreground">
                      {group.title}
                    </td>
                  ) : null}
                  {index === 0 ? (
                    <td rowSpan={group.rows.length} className="align-top px-4 py-3 text-muted-foreground">
                      {group.formLabel}
                    </td>
                  ) : null}
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">{row.taxYear}</td>
                  <td className="px-4 py-3">
                    <PdfLink file={row.formFile} label="Open" />
                  </td>
                  <td className="px-4 py-3">
                    <PdfLink file={row.instructionsFile} label="Open" />
                  </td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
