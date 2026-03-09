import { Calculator, CalendarClock, Database, GitBranch, Layers, ShieldCheck } from "lucide-react";

const SECTION_TITLE_CLASS = "flex items-center gap-2 text-sm font-semibold text-white";
const SECTION_BODY_CLASS = "mt-2 text-sm text-gray-300";

export default function ExpenseCalculationInfo() {
  return (
    <div className="border border-border rounded-2xl bg-[#0f0f0f] p-6">
      <h3 className="text-sm font-semibold text-white mb-6">How Expenses Are Calculated</h3>

      <div className="space-y-6">
        <div className="rounded-xl border border-white/5 bg-black/20 p-4">
          <div className={SECTION_TITLE_CLASS}>
            <Database size={16} className="text-accent-cyan" />
            📊 Data Source
          </div>
          <p className={SECTION_BODY_CLASS}>
            Expense data is automatically extracted from OpenClaw session logs, which record actual costs from AI provider APIs (OpenAI,
            Anthropic, Google, OpenRouter).
          </p>
        </div>

        <div className="rounded-xl border border-white/5 bg-black/20 p-4">
          <div className={SECTION_TITLE_CLASS}>
            <Calculator size={16} className="text-accent-green" />
            💰 Cost Calculation
          </div>
          <ol className="mt-3 space-y-3 text-sm text-gray-300 list-decimal list-inside">
            <li>
              <p className="font-semibold text-white">Provider Cost (USD)</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-[13px] text-gray-400">
                <li>Direct from provider billing API response</li>
                <li>Each AI request returns actual cost in USD</li>
                <li>Includes: input tokens, output tokens, cache usage</li>
              </ul>
            </li>
            <li>
              <p className="font-semibold text-white">Currency Conversion</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-[13px] text-gray-400">
                <li>USD → THB rate: 1 USD = 33 THB</li>
                <li>Display: ฿ (THB) primary + ($USD) secondary</li>
              </ul>
            </li>
            <li>
              <p className="font-semibold text-white">Model Coverage</p>
              <div className="mt-1 grid gap-2 rounded-lg border border-dashed border-white/10 bg-black/30 p-3 text-[13px] text-gray-300 sm:grid-cols-2">
                <div>
                  <p className="font-semibold text-accent-green">✅ Tracked</p>
                  <p>OpenAI (GPT, Codex), Anthropic (Claude), OpenRouter (Gemini, etc.)</p>
                </div>
                <div>
                  <p className="font-semibold text-accent-amber">❌ Not Tracked</p>
                  <p>Local models (Ollama), free-tier usage</p>
                </div>
              </div>
            </li>
          </ol>
        </div>

        <div className="rounded-xl border border-white/5 bg-black/20 p-4">
          <div className={SECTION_TITLE_CLASS}>
            <GitBranch size={16} className="text-accent-amber" />
            🔍 Process
          </div>
          <p className={SECTION_BODY_CLASS}>
            Session Log → Extract cost (USD) → Convert to THB → Group by agent/model/date → Display
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-white/5 bg-black/20 p-4">
            <div className={SECTION_TITLE_CLASS}>
              <CalendarClock size={16} className="text-accent-magenta" />
              📅 Time Periods
            </div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-300">
              <li>MTD: Current month (day 1 to today)</li>
              <li>YTD: Year-to-date (January 1 to today)</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/5 bg-black/20 p-4">
            <div className={SECTION_TITLE_CLASS}>
              <ShieldCheck size={16} className="text-accent-cyan" />
              🎯 Accuracy
            </div>
            <p className={SECTION_BODY_CLASS}>
              Costs reflect actual provider billing — matches invoices.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
