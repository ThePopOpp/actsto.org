import { DashboardSectionPlaceholder } from "@/components/dashboard/dashboard-section-placeholder";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const EMPLOYEES = [
  { id: "e1", name: "Maya Reynolds", email: "maya@faithfulgiving.org", role: "Finance Admin", status: "Active" },
  { id: "e2", name: "Jordan Lee", email: "jordan@faithfulgiving.org", role: "Approver", status: "Active" },
  { id: "e3", name: "Trevor Chen", email: "trevor@faithfulgiving.org", role: "Viewer", status: "Invited" },
];

export default function BusinessEmployeesPage() {
  return (
    <div className="space-y-6">
      <DashboardSectionPlaceholder
        title="Employees"
        description="Manage team members with access to giving reports, invoices, and compliance artifacts."
      />
      <div className="flex justify-end">
        <Button size="sm">Invite employee</Button>
      </div>
      <Card className="overflow-hidden border-border/80">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs font-semibold uppercase text-muted-foreground">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {EMPLOYEES.map((e) => (
                <tr key={e.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3 font-medium text-primary">{e.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{e.email}</td>
                  <td className="px-4 py-3">{e.role}</td>
                  <td className="px-4 py-3">
                    <Badge variant={e.status === "Active" ? "secondary" : "outline"}>{e.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="sm" className="h-8 text-primary">
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
