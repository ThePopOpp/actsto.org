import { redirect } from "next/navigation";

/**
 * There are no compliance documents to offer a business donor yet — this page
 * used to list three "Download (demo)" templates, including a W-9 that was
 * never on file. Receipts are the documents a company actually has.
 */
export default function BusinessCompliancePage() {
  redirect("/dashboard/business/invoices");
}
