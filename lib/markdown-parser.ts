export interface FrontmatterResult {
  metadata: Record<string, unknown>;
  body: string;
}

const FRONTMATTER_BOUNDARY = /^---\s*$/;

const coerceValue = (value: string) => {
  const trimmed = value.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null" || trimmed === "") return null;
  if (!Number.isNaN(Number(trimmed)) && trimmed !== "") {
    return Number(trimmed);
  }
  return trimmed;
};

export function parseFrontmatter(content: string): FrontmatterResult {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  if (lines.length === 0 || !FRONTMATTER_BOUNDARY.test(lines[0].trim())) {
    return { metadata: {}, body: content };
  }

  const metadata: Record<string, unknown> = {};
  let endIndex = -1;

  for (let i = 1; i < lines.length; i += 1) {
    if (FRONTMATTER_BOUNDARY.test(lines[i].trim())) {
      endIndex = i;
      break;
    }
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const [key, ...rest] = line.split(":");
    if (!key) continue;
    metadata[key.trim()] = coerceValue(rest.join(":"));
  }

  if (endIndex === -1) {
    return { metadata: {}, body: content };
  }

  const body = lines.slice(endIndex + 1).join("\n");
  return { metadata, body };
}

export function serializeFrontmatter(metadata: Record<string, unknown>, body: string): string {
  const entries = Object.entries(metadata ?? {}).filter(([_, value]) => value !== undefined);
  if (!entries.length) {
    return body.trimStart();
  }

  const header = entries
    .map(([key, value]) => {
      if (value === null) return `${key}:`;
      if (typeof value === "boolean") return `${key}: ${value ? "true" : "false"}`;
      return `${key}: ${value}`;
    })
    .join("\n");

  const normalizedBody = body.replace(/^\n+/, "");
  const document = `---\n${header}\n---\n\n${normalizedBody}`.replace(/\s+$/g, "").concat("\n");
  return document;
}
