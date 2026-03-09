"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, ArrowUpRight, DollarSign, PanelLeft, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

interface NavigationItem {
  href: string;
  label: string;
  description: string;
  icon: typeof Activity;
}

const NAVIGATION: NavigationItem[] = [
  {
    href: "/",
    label: "Agent's Activities",
    description: "Live command center and event flow",
    icon: Activity,
  },
  {
    href: "/expenses",
    label: "Expenses",
    description: "Spending radar and quick logging",
    icon: DollarSign,
  },
];

interface AppShellProps {
  title: string;
  eyebrow: string;
  description: string;
  children: ReactNode;
}

export default function AppShell({ title, eyebrow, description, children }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-[1800px] flex-col lg:flex-row">
        <aside className="border-b border-border bg-[#0b0f15]/95 lg:sticky lg:top-0 lg:h-screen lg:w-[290px] lg:flex-shrink-0 lg:border-b-0 lg:border-r">
          <div className="flex h-full flex-col px-5 py-5 lg:px-6 lg:py-7">
            <div className="flex items-center gap-3 border border-border/80 bg-[#101826] px-4 py-3 shadow-[0_0_30px_rgba(0,255,255,0.06)]">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-accent-cyan/25 bg-accent-cyan/10 text-accent-cyan shadow-[0_0_20px_rgba(0,255,255,0.15)]">
                <PanelLeft size={20} />
              </div>
              <div>
                <div className="text-[11px] font-mono uppercase tracking-[0.3em] text-accent-cyan/70">
                  Mission Control
                </div>
                <div className="mt-1 text-sm font-semibold text-white">Artistuta Ops Grid</div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-border/80 bg-[#0f131b] p-4">
              <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.28em] text-accent-amber">
                <Sparkles size={14} />
                Dashboard Map
              </div>
              <p className="mt-2 text-sm leading-6 text-gray-400">
                Keep the activity loop focused, with finance moved into a dedicated spending view.
              </p>
            </div>

            <nav className="mt-6 space-y-2">
              {NAVIGATION.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group block rounded-2xl border px-4 py-3 transition-all ${
                      isActive
                        ? "border-accent-cyan/45 bg-accent-cyan/10 shadow-[0_0_24px_rgba(0,255,255,0.08)]"
                        : "border-border/80 bg-[#0f0f0f]/80 hover:border-accent-cyan/25 hover:bg-[#131922]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl border ${
                          isActive
                            ? "border-accent-cyan/30 bg-accent-cyan/10 text-accent-cyan"
                            : "border-border bg-[#151515] text-gray-500 group-hover:text-accent-cyan"
                        }`}
                      >
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-semibold ${isActive ? "text-white" : "text-gray-200"}`}>
                            {item.label}
                          </span>
                          {isActive && <ArrowUpRight size={14} className="text-accent-cyan" />}
                        </div>
                        <p className="mt-1 text-xs leading-5 text-gray-500">{item.description}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto hidden rounded-2xl border border-border/80 bg-[#0f0f0f] p-4 lg:block">
              <div className="text-[11px] font-mono uppercase tracking-[0.25em] text-gray-500">Layout Shift</div>
              <div className="mt-2 text-sm text-gray-300">Activity operations stay front and center. Expense management gets its own focused page.</div>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
          <div className="mb-6 rounded-[28px] border border-border/80 bg-gradient-to-br from-[#0d1218] via-[#0b0f15] to-[#111827] p-6 shadow-[0_0_40px_rgba(255,0,255,0.05)]">
            <div className="text-[11px] font-mono uppercase tracking-[0.32em] text-accent-magenta/70">{eyebrow}</div>
            <div className="mt-3 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400 sm:text-base">{description}</p>
              </div>
              <div className="rounded-2xl border border-accent-cyan/15 bg-accent-cyan/5 px-4 py-3 text-sm text-gray-300">
                Clean navigation. Focused signal. Cyberpunk control surface.
              </div>
            </div>
          </div>

          {children}
        </main>
      </div>
    </div>
  );
}
