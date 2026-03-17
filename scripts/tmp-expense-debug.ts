import { buildExpenseMetricsSummary } from "@/lib/expense-metrics";

async function main() {
  const summary = await buildExpenseMetricsSummary();
  console.log(JSON.stringify(summary.openrouterActual, null, 2));
  console.log("entries", summary.metrics.counts.entries, "ignored", summary.metrics.counts.ignoredEntries);
  console.log("tokenUsageTotals", summary.tokenUsage.totals);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
