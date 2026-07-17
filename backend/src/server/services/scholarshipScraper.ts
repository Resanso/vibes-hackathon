import { db } from "~/server/db";

// Both sources are WordPress sites exposing the standard `/wp-json/wp/v2/`
// REST API — real structured JSON, not HTML scraping. Chosen deliberately
// over other scholarship aggregators after checking robots.txt: e.g.
// indbeasiswa.com explicitly disallows non-search-engine crawlers
// (Crawl-delay: 600, allowlist of named bots only) and was excluded for
// that reason. These two both allow general crawling (empty/permissive
// Disallow, or no robots.txt at all for the .go.id one).
interface ScholarshipSource {
  name: string;
  wpApiBaseUrl: string;
}

const SOURCES: ScholarshipSource[] = [
  {
    name: "Beasiswa Unggulan (Kemendikdasmen)",
    wpApiBaseUrl: "https://beasiswaunggulan.kemendikdasmen.go.id/wp-json/wp/v2",
  },
  {
    name: "Beasiswa.ID",
    wpApiBaseUrl: "https://beasiswa.id/wp-json/wp/v2",
  },
];

const POSTS_PER_SOURCE = 10;

interface WpPost {
  link: string;
  date: string;
  title: { rendered: string };
  excerpt: { rendered: string };
}

// Strips tags + decodes the handful of HTML entities WordPress actually
// emits in title/excerpt fields — not a full HTML parser, deliberately,
// since this is just for a plain-text list-row summary.
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "…";
}

async function fetchSource(source: ScholarshipSource): Promise<WpPost[]> {
  const url = `${source.wpApiBaseUrl}/posts?per_page=${POSTS_PER_SOURCE}&orderby=date&order=desc`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "NeraScholarshipBot/1.0 (+https://nera.app; financial-safety hackathon project)",
    },
  });
  if (!response.ok) {
    throw new Error(`${source.name}: HTTP ${response.status}`);
  }
  return (await response.json()) as WpPost[];
}

// Upserts by sourceUrl (unique) — re-running this just refreshes existing
// rows rather than duplicating them. Called manually via
// scholarships.refresh (see that router) rather than on a cron; no new
// scheduling infra for this yet, see product-context.md's scope notes for
// what's in vs. out for the hackathon.
export async function refreshScholarships(): Promise<{ upserted: number; errors: string[] }> {
  let upserted = 0;
  const errors: string[] = [];

  for (const source of SOURCES) {
    try {
      const posts = await fetchSource(source);
      for (const post of posts) {
        const summary = truncate(stripHtml(post.excerpt.rendered), 220);
        if (!summary) continue; // skip posts with no usable excerpt

        await db.scholarship.upsert({
          where: { sourceUrl: post.link },
          create: {
            title: stripHtml(post.title.rendered),
            summary,
            sourceName: source.name,
            sourceUrl: post.link,
            publishedAt: new Date(post.date),
          },
          update: {
            title: stripHtml(post.title.rendered),
            summary,
            publishedAt: new Date(post.date),
          },
        });
        upserted += 1;
      }
    } catch (error) {
      errors.push(`${source.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return { upserted, errors };
}
