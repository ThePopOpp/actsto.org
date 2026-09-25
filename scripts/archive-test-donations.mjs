/**
 * Archive pre-launch PayPal sandbox donations.
 *
 * Run with:
 *   node --env-file=.env scripts/archive-test-donations.mjs            # dry run
 *   node --env-file=.env scripts/archive-test-donations.mjs --confirm  # apply
 *
 * Every donation taken before go-live was a sandbox capture. Sandbox rows look
 * exactly like live ones — real order ids, real capture ids, status "paid" —
 * so they are marked rather than left to be mistaken for revenue later.
 *
 * Nothing is deleted. Each donation keeps its row and gains three metadata
 * keys: `paypalEnvironment`, `isTest` and `archivedAt`. The public campaign
 * totals already exclude anything not stamped `live`, and the donor-facing
 * giving pages skip rows flagged `isTest`.
 *
 * Tax receipts issued against those donations are set to `void`. They are
 * acknowledgements of money that never moved and must not stay `generated`
 * once the site is taking real Arizona tax-credit donations.
 *
 * `admin_campaign_directory` held three sample campaigns as a JSON blob and is
 * no longer read by any code path; its rows are removed.
 */
import { Pool } from "pg";

const APPLY = process.argv.includes("--confirm");
const REASON = "Pre-launch PayPal sandbox testing";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });

/** Donations that were never live money: no `live` environment stamp. */
const TEST_DONATION_PREDICATE = `coalesce(metadata->>'paypalEnvironment', 'sandbox') <> 'live'`;

async function main() {
  const { rows: preview } = await pool.query(`
    select d.status,
           count(*)::int as donations,
           sum(d.amount)::text as amount,
           count(*) filter (where d.metadata->>'isTest' = 'true')::int as already_archived
    from donations d
    where ${TEST_DONATION_PREDICATE}
    group by d.status
    order by d.status`);

  console.log(APPLY ? "APPLYING" : "DRY RUN — pass --confirm to apply");
  console.log("\nDonations to archive:");
  if (preview.length === 0) console.log("  (none)");
  for (const r of preview) {
    console.log(
      `  ${r.status.padEnd(10)} ${String(r.donations).padStart(3)} donation(s)  $${r.amount}  already archived: ${r.already_archived}`,
    );
  }

  const { rows: receipts } = await pool.query(`
    select count(*)::int as n, coalesce(sum(tr.amount), 0)::text as amount
    from tax_receipts tr
    join donations d on d.id = tr.donation_id
    where ${TEST_DONATION_PREDICATE} and tr.status <> 'void'`);
  console.log(`\nTax receipts to void: ${receipts[0].n}  ($${receipts[0].amount})`);

  const { rows: dir } = await pool.query(`select count(*)::int as n from admin_campaign_directory`);
  console.log(`Orphaned admin_campaign_directory rows to remove: ${dir[0].n}`);

  if (!APPLY) {
    console.log("\nNothing changed.");
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("begin");

    const donations = await client.query(
      `update donations
          set metadata = coalesce(metadata, '{}'::jsonb)
                       || jsonb_build_object(
                            'paypalEnvironment', coalesce(metadata->>'paypalEnvironment', 'sandbox'),
                            'isTest', true,
                            'archivedAt', $1::text,
                            'archivedReason', $2::text)
        where ${TEST_DONATION_PREDICATE}`,
      [new Date().toISOString(), REASON],
    );

    const voided = await client.query(`
      update tax_receipts tr
         set status = 'void'
        from donations d
       where d.id = tr.donation_id
         and tr.status <> 'void'
         and coalesce(d.metadata->>'paypalEnvironment', 'sandbox') <> 'live'`);

    const directory = await client.query(`delete from admin_campaign_directory`);

    // Counters are derived from paid live donations on read, but leaving stale
    // numbers on the row would mislead anyone reading the table directly.
    const counters = await client.query(
      `update campaigns set raised_amount = 0, donor_count = 0
        where raised_amount <> 0 or donor_count <> 0`,
    );

    await client.query("commit");

    console.log("\nArchived donations:      ", donations.rowCount);
    console.log("Voided tax receipts:     ", voided.rowCount);
    console.log("Directory rows removed:  ", directory.rowCount);
    console.log("Campaign counters reset: ", counters.rowCount);
    console.log("\nCommitted.");
  } catch (error) {
    await client.query("rollback");
    console.error("\nROLLED BACK:", error.message);
    process.exitCode = 1;
  } finally {
    client.release();
  }
}

main()
  .catch((error) => {
    console.error("FAILED:", error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
