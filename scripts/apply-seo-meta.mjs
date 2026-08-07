// Patches the static dist/*.html files that `npm run build` produces
// (each route is a copy of dist/index.html — see the `build` script in
// package.json) with per-route title/description/canonical/OG tags, and
// marks non-marketing pages (app screens, login, admin) noindex.
//
// Without this, every route ships with the homepage's canonical URL and
// copy baked into the raw HTML. React (src/App.jsx SearchMetadata) fixes
// this client-side after hydration, which covers crawlers that render JS
// (Googlebot) — but crawlers that only fetch raw HTML (many AI crawlers
// this site's robots.txt explicitly allows, plus link-preview bots) would
// otherwise see every page as a duplicate of "/".

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { PAGE_META, PUBLIC_MARKETING_PATHS, SITE_URL } from '../src/data/seoMeta.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '..', 'dist');

// dist file (relative to dist/) -> route path used as the PAGE_META key
const ROUTE_BY_FILE = {
  'index.html': '/',
  'why-turbofix.html': '/why-turbofix.html',
  'platform.html': '/platform.html',
  'records-platform.html': '/records-platform.html',
  'workflow.html': '/workflow.html',
  'demo.html': '/demo.html',
  'pricing.html': '/pricing.html',
  'contact.html': '/contact.html',
};

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function patchPublicPage(html, route) {
  const { title, description } = PAGE_META[route];
  const canonicalUrl = `${SITE_URL}${route}`;
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);

  return html
    .replace(/<title>.*?<\/title>/s, `<title>${safeTitle}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${safeDescription}$2`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${canonicalUrl}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${safeTitle}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${safeDescription}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${canonicalUrl}$2`);
}

function patchInternalPage(html) {
  return html.replace(
    /(<meta name="robots" content=")[^"]*(")/,
    '$1noindex, nofollow$2',
  );
}

function processFile(relPath) {
  const filePath = path.join(distDir, relPath);
  if (!existsSync(filePath)) {
    console.warn(`[apply-seo-meta] skip (not found): ${relPath}`);
    return;
  }
  const html = readFileSync(filePath, 'utf8');
  const route = ROUTE_BY_FILE[relPath];
  const isPublic = route && PUBLIC_MARKETING_PATHS.includes(route);
  const patched = isPublic ? patchPublicPage(html, route) : patchInternalPage(html);
  writeFileSync(filePath, patched);
  console.log(`[apply-seo-meta] ${isPublic ? 'indexable' : 'noindex  '} ${relPath}`);
}

const files = [
  'index.html',
  '404.html',
  'why-turbofix.html',
  'platform.html',
  'records-platform.html',
  'workflow.html',
  'demo.html',
  'pricing.html',
  'contact.html',
  'dashboard.html',
  'qr-generator.html',
  'reset-password.html',
  'machines.html',
  'tickets.html',
  'team.html',
  'settings.html',
  'assistant.html',
  'shutdown-planner.html',
  'technician.html',
  'records.html',
  'support.html',
  'qr-gateway.html',
  'login.html',
  'inventory.html',
  'kaizen.html',
  'rca.html',
  'report-breakdown.html',
  'admin/index.html',
  'admin_portal/index.html',
  'superadmin/index.html',
  'admin.html',
  'admin_portal.html',
  'superadmin.html',
];

files.forEach(processFile);
