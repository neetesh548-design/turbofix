#!/usr/bin/env node
/**
 * Cleans and dedupes a contact export CSV (e.g. from Apollo, ZoomInfo, or
 * LinkedIn Sales Navigator) for outreach list prep.
 *
 * Usage:
 *   node scripts/clean-lead-export.mjs <input.csv> [output.csv] [options]
 *
 * Options:
 *   --city="Pune"           Keep only rows whose city/location column contains this string
 *   --min-size=1            Minimum company size (employee count) to keep
 *   --max-size=500          Maximum company size (employee count) to keep
 *   --title="founder,owner,ceo"  Comma-separated title keywords to keep (matches job title column)
 *
 * Input is expected to be a raw export from a B2B contact database you
 * already have legitimate access/rights to (e.g. a paid Apollo/ZoomInfo
 * seat or a Sales Navigator export). This script does not fetch or
 * scrape contact data itself — it only cleans a file you provide.
 */

import fs from "fs";
import path from "path";

function parseArgs(argv) {
  const positional = [];
  const options = {};
  for (const arg of argv) {
    if (arg.startsWith("--")) {
      const [key, ...rest] = arg.slice(2).split("=");
      options[key] = rest.join("=") || true;
    } else {
      positional.push(arg);
    }
  }
  return { positional, options };
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.length > 1 || (r.length === 1 && r[0] !== ""));
}

function toCsvField(value) {
  const str = value == null ? "" : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(rows) {
  return rows.map((r) => r.map(toCsvField).join(",")).join("\n");
}

// Common header aliases across Apollo / ZoomInfo / Sales Navigator exports.
const HEADER_ALIASES = {
  email: ["email", "email address", "work email", "primary email"],
  first_name: ["first name", "firstname", "given name"],
  last_name: ["last name", "lastname", "surname", "family name"],
  full_name: ["name", "full name", "contact name"],
  title: ["title", "job title", "position", "role"],
  company: ["company", "company name", "organization", "account name"],
  city: ["city", "location", "person city", "company city", "hq city"],
  company_size: [
    "company size",
    "employees",
    "employee count",
    "# employees",
    "headcount",
  ],
  linkedin_url: ["linkedin url", "linkedin", "person linkedin url"],
};

function normalizeHeader(h) {
  return h.trim().toLowerCase();
}

function buildColumnMap(headerRow) {
  const normalized = headerRow.map(normalizeHeader);
  const map = {};
  for (const [canonical, aliases] of Object.entries(HEADER_ALIASES)) {
    const idx = normalized.findIndex((h) => aliases.includes(h));
    if (idx !== -1) map[canonical] = idx;
  }
  return map;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email) {
  if (!email) return false;
  const trimmed = email.trim();
  if (!EMAIL_RE.test(trimmed)) return false;
  // Filter out obvious placeholder/catch-all patterns some exports include.
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("info@") || lower.startsWith("noreply@") || lower.startsWith("no-reply@")) {
    return false;
  }
  return true;
}

function parseCompanySize(raw) {
  if (!raw) return null;
  const str = String(raw).trim();
  // Range like "11-50"
  const rangeMatch = str.match(/(\d+)\s*-\s*(\d+)/);
  if (rangeMatch) {
    return Math.round((Number(rangeMatch[1]) + Number(rangeMatch[2])) / 2);
  }
  const numMatch = str.match(/\d+/);
  if (numMatch) return Number(numMatch[0]);
  return null;
}

function main() {
  const { positional, options } = parseArgs(process.argv.slice(2));
  const [inputPath, outputPathArg] = positional;

  if (!inputPath) {
    console.error(
      "Usage: node scripts/clean-lead-export.mjs <input.csv> [output.csv] [--city=Pune] [--min-size=1] [--max-size=500] [--title=founder,owner,ceo]"
    );
    process.exit(1);
  }

  const resolvedInput = path.resolve(inputPath);
  if (!fs.existsSync(resolvedInput)) {
    console.error(`Input file not found: ${resolvedInput}`);
    process.exit(1);
  }

  const outputPath = outputPathArg
    ? path.resolve(outputPathArg)
    : path.join(
        path.dirname(resolvedInput),
        `${path.basename(resolvedInput, path.extname(resolvedInput))}.cleaned.csv`
      );

  const raw = fs.readFileSync(resolvedInput, "utf8");
  const rows = parseCsv(raw);
  if (rows.length === 0) {
    console.error("Input file has no rows.");
    process.exit(1);
  }

  const headerRow = rows[0];
  const dataRows = rows.slice(1);
  const colMap = buildColumnMap(headerRow);

  if (colMap.email === undefined) {
    console.error(
      "Could not find an email column. Recognized header names: " +
        HEADER_ALIASES.email.join(", ")
    );
    process.exit(1);
  }

  const cityFilter = options.city ? String(options.city).toLowerCase() : null;
  const minSize = options["min-size"] !== undefined ? Number(options["min-size"]) : null;
  const maxSize = options["max-size"] !== undefined ? Number(options["max-size"]) : null;
  const titleKeywords = options.title
    ? String(options.title)
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
    : null;

  const seenEmails = new Set();
  const outHeader = [
    "full_name",
    "email",
    "title",
    "company",
    "city",
    "company_size",
    "linkedin_url",
  ];
  const outRows = [outHeader];

  let stats = { total: dataRows.length, invalidEmail: 0, duplicate: 0, filtered: 0, kept: 0 };

  for (const row of dataRows) {
    const get = (key) => (colMap[key] !== undefined ? (row[colMap[key]] || "").trim() : "");

    const email = get("email");
    if (!isValidEmail(email)) {
      stats.invalidEmail++;
      continue;
    }

    const emailLower = email.toLowerCase();
    if (seenEmails.has(emailLower)) {
      stats.duplicate++;
      continue;
    }

    const city = get("city");
    if (cityFilter && !city.toLowerCase().includes(cityFilter)) {
      stats.filtered++;
      continue;
    }

    const title = get("title");
    if (titleKeywords && !titleKeywords.some((k) => title.toLowerCase().includes(k))) {
      stats.filtered++;
      continue;
    }

    const companySize = parseCompanySize(get("company_size"));
    if (minSize !== null && companySize !== null && companySize < minSize) {
      stats.filtered++;
      continue;
    }
    if (maxSize !== null && companySize !== null && companySize > maxSize) {
      stats.filtered++;
      continue;
    }

    seenEmails.add(emailLower);

    const fullName =
      get("full_name") || [get("first_name"), get("last_name")].filter(Boolean).join(" ");

    outRows.push([
      fullName,
      email,
      title,
      get("company"),
      city,
      companySize != null ? String(companySize) : "",
      get("linkedin_url"),
    ]);
    stats.kept++;
  }

  fs.writeFileSync(outputPath, toCsv(outRows) + "\n", "utf8");

  console.log(`Read ${stats.total} rows from ${resolvedInput}`);
  console.log(`  Invalid/placeholder email: ${stats.invalidEmail}`);
  console.log(`  Duplicate email:           ${stats.duplicate}`);
  console.log(`  Filtered by criteria:      ${stats.filtered}`);
  console.log(`  Kept:                      ${stats.kept}`);
  console.log(`Wrote cleaned file to ${outputPath}`);
}

main();
