import type { UserRole } from "@/lib/auth/types";

export type AdminUserSample = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: "active" | "invited" | "suspended";
  lastActive: string;
  campaignsCount: number;
};

export const ADMIN_SAMPLE_USERS: AdminUserSample[] = [
  {
    id: "u-1",
    name: "Sarah Mitchell",
    email: "sarah.mitchell@example.com",
    role: "parent",
    status: "active",
    lastActive: "2 hours ago",
    campaignsCount: 2,
  },
  {
    id: "u-2",
    name: "James Okonkwo",
    email: "j.okonkwo@donors.org",
    role: "donor_business",
    status: "active",
    lastActive: "Yesterday",
    campaignsCount: 0,
  },
  {
    id: "u-3",
    name: "Emily Waters",
    email: "emily.waters@valleychristian.edu",
    role: "parent",
    status: "active",
    lastActive: "4 days ago",
    campaignsCount: 1,
  },
  {
    id: "u-4",
    name: "Marcus Chen",
    email: "mchen.student@gmail.com",
    role: "student",
    status: "invited",
    lastActive: "—",
    campaignsCount: 1,
  },
  {
    id: "u-5",
    name: "Rachel Thompson",
    email: "rachel.t@faithfulgiving.com",
    role: "donor_individual",
    status: "active",
    lastActive: "1 week ago",
    campaignsCount: 0,
  },
  {
    id: "u-6",
    name: "Legacy Systems LLC",
    email: "ap@legacysys.example",
    role: "donor_business",
    status: "suspended",
    lastActive: "3 months ago",
    campaignsCount: 0,
  },
];
