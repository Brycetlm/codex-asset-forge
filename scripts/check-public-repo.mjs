import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const tracked = execFileSync("git", ["ls-files", "-z"], {
  cwd: root,
  encoding: "utf8",
})
  .split("\0")
  .filter(Boolean);

const textExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".lock",
  ".md",
  ".mjs",
  ".py",
  ".rs",
  ".svg",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
]);

const riskyFiles = [
  {
    label: "runtime job history",
    test: (file) => file === "data/jobs.json",
  },
  {
    label: "runtime custom styles",
    test: (file) =>
      file === "data/custom-styles.json" || file === "data/style-projects.json",
  },
  {
    label: "generated output",
    test: (file) => file.startsWith("outputs/") && !file.endsWith("/.gitkeep"),
  },
  {
    label: "uploaded reference",
    test: (file) =>
      file.startsWith("references/") && !file.endsWith("/.gitkeep"),
  },
  {
    label: "downloaded library asset",
    test: (file) =>
      file.startsWith("library/imports/") && !file.endsWith("/.gitkeep"),
  },
  {
    label: "credential-like file",
    test: (file) =>
      /(^|\/)(\.env($|\.)|\.npmrc$|credentials.*\.json$|secrets?.*\.json$)/i.test(
        file,
      ) || /\.(key|p12|pem|pfx)$/i.test(file),
  },
];

const contentRules = [
  {
    label: "macOS user home path",
    pattern: /\/Users\/(?!you(?:rname)?\/|<)[^/\s]+\//i,
  },
  {
    label: "Linux user home path",
    pattern: /\/home\/(?!you(?:rname)?\/|<)[^/\s]+\//i,
  },
  {
    label: "Windows user home path",
    pattern: /[A-Z]:\\Users\\(?!you(?:rname)?\\|<)[^\\\s]+\\/i,
  },
  {
    label: "private key block",
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  },
  { label: "OpenAI-style secret", pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{16,}\b/ },
  { label: "AWS access key", pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { label: "Google API key", pattern: /\bAIza[0-9A-Za-z_-]{30,}\b/ },
  {
    label: "GitHub token",
    pattern: /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/,
  },
  { label: "Slack token", pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/ },
  {
    label: "assigned credential",
    pattern:
      /\b(?:api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret|password)\s*[:=]\s*["']?[A-Za-z0-9._~+\/-]{16,}/i,
  },
];

const findings = [];
for (const file of tracked) {
  for (const rule of riskyFiles) {
    if (rule.test(file)) findings.push(`${file}: ${rule.label}`);
  }

  const extension = path.extname(file).toLowerCase();
  const isKnownText =
    textExtensions.has(extension) ||
    [".gitignore", "Dockerfile", "LICENSE", "Makefile"].includes(
      path.basename(file),
    );
  if (!isKnownText) continue;

  const content = readFileSync(path.join(root, file), "utf8");
  for (const rule of contentRules) {
    if (rule.pattern.test(content)) findings.push(`${file}: ${rule.label}`);
  }
}

if (findings.length) {
  console.error("Public-repository audit failed:\n");
  for (const finding of [...new Set(findings)].sort()) {
    console.error(`- ${finding}`);
  }
  console.error(
    "\nOnly file names and rule labels are shown so the audit does not echo secrets.",
  );
  process.exit(1);
}

console.log(`Public-repository audit passed (${tracked.length} tracked files).`);
