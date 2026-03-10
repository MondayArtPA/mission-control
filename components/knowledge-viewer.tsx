"use client";

import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { parseFrontmatter } from "@/lib/markdown-parser";
import type { KnowledgeMetadata } from "@/types/knowledge";
import "highlight.js/styles/atom-one-dark.css";

interface KnowledgeViewerProps {
  filename: string;
  content: string;
  metadata?: KnowledgeMetadata;
}

export default function KnowledgeViewer({ filename, content, metadata }: KnowledgeViewerProps) {
  const parsed = useMemo(() => parseFrontmatter(content), [content]);
  const fields = metadata ?? (parsed.metadata as KnowledgeMetadata);

  const rows = Object.entries(fields ?? {}).filter(([_, value]) => value !== undefined);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/60 bg-[#090d13] p-4">
        <div className="text-[11px] font-mono uppercase tracking-[0.28em] text-accent-cyan/70">{filename}</div>
        <h4 className="mt-1 text-xl font-semibold text-white">Metadata</h4>
        {rows.length === 0 ? (
          <p className="mt-2 text-sm text-gray-400">No metadata</p>
        ) : (
          <dl className="mt-3 grid grid-cols-1 gap-2 text-sm text-gray-200 sm:grid-cols-2">
            {rows.map(([key, value]) => (
              <div key={key} className="rounded-xl border border-white/5 bg-[#05070c] px-3 py-2">
                <dt className="text-[11px] font-mono uppercase tracking-[0.2em] text-gray-500">{key}</dt>
                <dd className="mt-1 text-sm text-white">{String(value)}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
      <div className="rounded-2xl border border-border/60 bg-[#05070c] p-4">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={{
            code({ node, inline, className, children, ...props }) {
              if (inline) {
                return (
                  <code className="rounded bg-white/10 px-1 py-0.5 text-[12px] text-emerald-200" {...props}>
                    {children}
                  </code>
                );
              }
              const language = className?.replace("language-", "");
              return (
                <pre className={`overflow-auto rounded-2xl border border-white/5 bg-black/60 p-4 text-sm ${className ?? ""}`}>
                  <code className={language ? `language-${language}` : undefined} {...props}>
                    {children}
                  </code>
                </pre>
              );
            },
            a({ href, children }) {
              return (
                <a href={href} target="_blank" rel="noreferrer" className="text-accent-cyan underline">
                  {children}
                </a>
              );
            },
          }}
        >
          {parsed.body}
        </ReactMarkdown>
      </div>
    </div>
  );
}
