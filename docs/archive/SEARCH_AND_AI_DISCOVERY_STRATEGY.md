# TurboFix Search and AI Discovery Strategy

## Goal

Make TurboFix a credible source that Google, Bing, ChatGPT, Copilot, and other answer engines can crawl, understand, cite, and recommend for manufacturing-maintenance questions. No platform can guarantee recommendation or ranking; the strategy is to earn it through useful evidence, clear entities, and authority.

## Positioning

Own one clear category: **AI-assisted maintenance decision software for manufacturing SMEs**.

Support it with five problem areas:

1. Digitizing handwritten and spreadsheet maintenance records
2. Machine-specific maintenance knowledge
3. Preventive maintenance and breakdown workflows
4. Factory shutdown planning
5. Technician execution, evidence, and supervisor closure

Use the same product name, description, audience, and claims on the website, social profiles, directories, demos, and press mentions. Avoid unsupported superlatives such as “best” or invented customer outcomes.

## Technical foundation

- Keep the public marketing URL crawlable and canonical.
- Keep only real, public, useful URLs in `sitemap.xml`; do not submit authenticated product screens.
- Allow Googlebot, Bingbot, and OAI-SearchBot to crawl public content.
- Maintain Organization, WebSite, and SoftwareApplication JSON-LD that matches visible page content.
- Keep `llms.txt` as a concise machine-readable product summary, but treat it as supplementary—not a replacement for normal SEO.
- When public content pages are added, give each a unique title, description, canonical URL, visible author/reviewer, publication date, and accurate sitemap `lastmod`.

## Content that can earn citations

Publish one strong page every two weeks. Each page should answer a real maintenance question with a short definition, step-by-step method, example, checklist/table, and sources where relevant.

Priority pages:

1. Preventive maintenance checklist for small manufacturing plants
2. How to digitize handwritten machine-maintenance registers
3. Shutdown maintenance planning: capacity, priority, and sequence
4. Breakdown maintenance vs preventive maintenance
5. Machine maintenance history template and example
6. Spare-parts planning from maintenance history
7. Maintenance KPI guide: MTBF, MTTR, backlog, and schedule compliance
8. How human approval makes maintenance AI safer

Create original evidence quarterly: an anonymized benchmark, a worked factory example, or a downloadable template. AI systems and search engines are more likely to cite specific, verifiable information than generic product copy.

## Authority and distribution

- Verify the domain in Google Search Console and Bing Webmaster Tools; submit the sitemap in both.
- Set up Bing IndexNow when the site begins publishing or changing multiple public content URLs.
- Create consistent company profiles on LinkedIn and relevant manufacturing/software directories.
- Seek links and mentions from manufacturing associations, integration partners, customers, and credible maintenance publications.
- Publish named customer case studies only with permission, including plant type, starting problem, method, timeframe, and measurable result.
- Keep public demos, videos, and brochures aligned with the same claims and link them back to the most relevant page.

## Measurement

Review monthly:

- Google Search Console: indexed pages, non-brand queries, impressions, clicks, and rich-result issues
- Bing Webmaster Tools: index coverage, crawl issues, search performance, and AI Performance citations where available
- Analytics: organic demo requests and referrals from ChatGPT, Copilot, Perplexity, Gemini, and other AI products
- Citation test set: repeat 15 target questions monthly and record whether TurboFix is mentioned or cited

Focus on qualified demo requests and citations, not raw traffic alone.

## First 90 days

### Days 1–14

- Deploy the technical foundation in this repository.
- Verify Google Search Console and Bing Webmaster Tools.
- Submit `https://turbofix.co.in/sitemap.xml` and inspect the home URL.
- Add real organization details and social profile URLs to structured data when finalized.

### Days 15–45

- Publish the first two problem-led pages and one downloadable maintenance template.
- Add an About page with named leadership/domain expertise and a Contact page with consistent business details.
- Ask three relevant partners or customers for an accurate mention or link.

### Days 46–90

- Publish two more guides and the first evidence-led case study.
- Enable IndexNow for content updates.
- Compare query/citation results, improve pages that receive impressions but few visits, and expand the topic that produces qualified leads.

## Guardrails

- Do not mass-produce thin AI articles.
- Do not create fake reviews, citations, authors, addresses, or case-study metrics.
- Do not put private dashboards or customer data in sitemaps or public AI files.
- Do not add FAQ or review structured data unless the same information is visibly present and eligible under current search-engine rules.
