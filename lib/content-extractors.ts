import { YoutubeTranscript } from "youtube-transcript";
import * as cheerio from "cheerio";

// Configuration constants
const FETCH_TIMEOUT_MS = 30000; // 30 seconds
const MIN_CONTENT_LENGTH = 100; // Minimum characters for valid content
const USER_AGENT = "Mozilla/5.0 (compatible; StudyEZ/1.0; +https://studyez.app)";


/**
 * Extract YouTube video ID from various YouTube URL formats
 */
export function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Fetch transcript from a YouTube video
 */
export async function fetchYouTubeTranscript(url: string): Promise<string> {
  const videoId = extractYouTubeVideoId(url);
  
  if (!videoId) {
    throw new Error("Invalid YouTube URL");
  }

  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    
    // Combine all transcript segments into a single text
    const fullText = transcript
      .map((segment) => segment.text)
      .join(" ");
    
    return fullText;
  } catch (error) {
    throw new Error(
      `Failed to fetch YouTube transcript: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Scrape text content from a web page
 */
export async function scrapeWebPage(url: string): Promise<string> {
  try {
    // Create an AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove script, style, nav, footer, and other non-content elements
    $("script, style, nav, footer, header, aside, iframe, noscript").remove();

    // Try to find main content areas first
    let content = "";
    
    // Common content selectors for educational sites
    const contentSelectors = [
      "article",
      "main",
      '[role="main"]',
      ".content",
      ".post-content",
      ".article-content",
      "#content",
      ".entry-content",
      ".mw-parser-output", // Wikipedia
    ];

    for (const selector of contentSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        content = element.text();
        break;
      }
    }

    // Fallback to body if no main content found
    if (!content) {
      content = $("body").text();
    }

    // Clean up the text: normalize whitespace and remove excessive newlines
    content = content
      .replace(/\s+/g, " ")
      .replace(/\n+/g, "\n")
      .trim();

    if (!content || content.length < MIN_CONTENT_LENGTH) {
      throw new Error("Insufficient content extracted from webpage");
    }

    return content;
  } catch (error) {
    throw new Error(
      `Failed to scrape webpage: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Check if URL is a valid YouTube URL
 */
export function isYouTubeUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    // Only accept youtube.com and its subdomains, and youtu.be
    return hostname === "youtube.com" || 
           hostname === "www.youtube.com" || 
           hostname.endsWith(".youtube.com") ||
           hostname === "youtu.be" ||
           hostname === "www.youtu.be";
  } catch {
    return false;
  }
}

/**
 * Detect the type of URL and extract content accordingly
 */
export async function extractContentFromUrl(url: string): Promise<{ content: string; type: "youtube" | "webpage" }> {
  // Check if it's a YouTube URL
  if (isYouTubeUrl(url)) {
    const content = await fetchYouTubeTranscript(url);
    return { content, type: "youtube" };
  }

  // Otherwise, treat it as a regular webpage
  const content = await scrapeWebPage(url);
  return { content, type: "webpage" };
}
