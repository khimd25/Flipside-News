import { NextResponse } from 'next/server';
import axios from 'axios';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { url } from 'inspector';
import { error } from 'console';

function cleanHtml(html: string): string {
  if (!html) return '';
  // Remove script, style, and noscript blocks
  let cleaned = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');
  // Remove block-level tags
  cleaned = cleaned.replace(/<\/(p|div|h[1-6]|br|section|article|header|footer)>/gi, '\n');
  // Strip all remaining HTML tags
  cleaned = cleaned.replace(/<[^>]+>/g, '');
  // Decode HTML entities (expanded)
  cleaned = cleaned.replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lsquo;/g, '‘')
    .replace(/&rsquo;/g, '’')
    .replace(/&ldquo;/g, '“')
    .replace(/&rdquo;/g, '”')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&hellip;/g, '…');
  // Remove common noise phrases
  cleaned = cleaned.replace(/Font Size:/gi, '')
    .replace(/(Photo (courtesy|credit).*?\n)/gi, '')
    .replace(/(Senior Investigative Reporter|Investigative Group|By [A-Z][a-z]+ [A-Z][a-z]+.*?\n)/gi, '')
    .replace(/\d{1,2}:\d{2} (AM|PM) ET/g, '')
    .replace(/\b\d{1,2} [A-Z][a-z]+ \d{4}\b/g, '');
  // Collapse multiple newlines and trim
  cleaned = cleaned.replace(/\n\s*\n/g, '\n').trim();
  return cleaned;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }

  try {
    // First, try Readability.js extraction
    const clientResponse = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 7000
    });
    const html = clientResponse.data;
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (article && article.content) {
      const cleanedContent = cleanHtml(article.content);
      const content = cleanedContent.substring(0, 1000) + '...';
      return NextResponse.json({ success: true, content: `${article.title}\n\n${content}` });
    }

    // Fallback: try original regex extraction if Readability fails
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const contentMatch = html.match(/<article[^>]*>(.*?)<\/article>/is) || html.match(/<div[^>]*class=["']*content["']*[^>]*>(.*?)<\/div>/is);
    if (titleMatch && contentMatch) {
      const title = titleMatch[1].trim();
      const cleanedContent = cleanHtml(contentMatch[1]);
      const content = cleanedContent.substring(0, 1000) + '...';
      return NextResponse.json({ success: true, content: `${title}\n\n${content}` });
    }

    // Fallback to Jina AI if all else fails
    const jinaApiKey = 'jina_c7eea9f8fcb443b28bf69d7604fdfe84T5Z6gweDlY3FPmZREFkQlYsuTIMj';
    const jinaResponse = await axios.get(`https://r.jina.ai/${encodeURIComponent(url)}`, {
      headers: { 'Authorization': `Bearer ${jinaApiKey}` },
      timeout: 7000
    });
    if (jinaResponse.data?.content) {
      const cleanedContent = cleanHtml(jinaResponse.data.content);
      const content = cleanedContent.substring(0, 1000) + '...';
      return NextResponse.json({ success: true, content });
    }

    return NextResponse.json({ success: false, error: 'Failed to extract content' }, { status: 500 });
  } catch (error: any) {
    console.error('Extraction failed for:', url, error.message);
    return NextResponse.json({ success: false, error: 'Failed to extract content', details: error.message }, { status: 500 });
  }
}
