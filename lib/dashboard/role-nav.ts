import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  Bell,
  Building2,
  CreditCard,
  FileText,
  Heart,
  Images,
  LayoutDashboard,
  Mail,
  Megaphone,
  Receipt,
  ShieldCheck,
  UserCircle,
  Users,
} from "lucide-react";

import type { UserRole } from "@/lib/auth/types";

export type RoleNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

function base(b: string) {
  return b.replace(/\/$/, "");
}

/** Sidebar links for each portal; `basePath` is e.g. `/dashboard/parent` or `/dashboard/parent-preview`. */
export function getRoleNavItems(role: UserRole, basePath: string): RoleNavItem[] {
  const b = base(basePath);

  const profile = { href: `${b}/profile`, label: "Profile", icon: UserCircle };
  const messages = { href: `${b}/messages`, label: "Messages", icon: Mail };
  const notifications = { href: `${b}/notifications`, label: "Notifications", icon: Bell };
  const receipts = { href: `${b}/receipts`, label: "Receipts & tax", icon: Receipt };

  switch (role) {
    case "parent":
      return [
        { href: b, label: "Overview", icon: LayoutDashboard },
        profile,
        { href: `${b}/students`, label: "Students", icon: Users },
        { href: `${b}/campaigns`, label: "Campaigns", icon: Megaphone },
        { href: `${b}/marketing`, label: "Marketing", icon: Images },
        { href: `${b}/donations`, label: "Donations received", icon: Heart },
        messages,
        notifications,
        receipts,
      ];
    case "student":
      return [
        { href: b, label: "Overview", icon: LayoutDashboard },
        profile,
        { href: `${b}/campaigns`, label: "My campaign", icon: Megaphone },
        messages,
        notifications,
        receipts,
      ];
    case "donor_individual":
      return [
        { href: b, label: "Overview", icon: LayoutDashboard },
        profile,
        { href: `${b}/donations`, label: "Donations", icon: CreditCard },
        { href: `${b}/saved`, label: "Saved campaigns", icon: Heart },
        messages,
        notifications,
        receipts,
      ];
    case "donor_business":
      return [
        { href: b, label: "Overview", icon: LayoutDashboard },
        profile,
        { href: `${b}/company`, label: "Company info", icon: Building2 },
        { href: `${b}/employees`, label: "Employees", icon: Users },
        { href: `${b}/taxes`, label: "Taxes", icon: ShieldCheck },
        { href: `${b}/giving`, label: "Giving & pledges", icon: Banknote },
        { href: `${b}/invoices`, label: "Invoices & receipts", icon: Receipt },
        messages,
        notifications,
        { href: `${b}/compliance`, label: "Compliance docs", icon: FileText },
      ];
    default:
      return [{ href: b, label: "Overview", icon: LayoutDashboard }];
  }
}
