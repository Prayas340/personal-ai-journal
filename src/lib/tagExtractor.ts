/**
 * Utility to extract search-related topic keywords strictly from text content.
 * Replaces generic pre-given tags with search-relevant topic hashtags.
 */
export function extractSearchRelatedTags(text: string): string[] {
  if (!text || typeof text !== 'string') return [];

  const stopWords = new Set([
    'about', 'above', 'after', 'again', 'against', 'all', 'also', 'and', 'any', 'are',
    'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
    'can', 'could', 'did', 'does', 'doing', 'down', 'during', 'each', 'few', 'for',
    'from', 'further', 'had', 'has', 'have', 'having', 'her', 'here', 'hers', 'herself',
    'him', 'himself', 'his', 'how', 'into', 'its', 'itself', 'just', 'make', 'more',
    'most', 'my', 'myself', 'nor', 'not', 'now', 'off', 'once', 'only', 'other', 'our',
    'ours', 'ourselves', 'out', 'over', 'own', 'same', 'should', 'some', 'such', 'than',
    'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these',
    'they', 'this', 'those', 'through', 'too', 'under', 'until', 'very', 'was', 'were',
    'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'would',
    'your', 'yours', 'yourself', 'yourselves', 'today', 'reflection', 'reflecting', 'please'
  ]);

  // Clean and find candidate topic words
  const words = text
    .replace(/[#.,!?:;()\[\]{}"'`/\\<>~@$%^&*_+=|\n\r]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 3 && !stopWords.has(w.toLowerCase()));

  const seen = new Set<string>();
  const tags: string[] = [];

  for (const word of words) {
    const cleanWord = word.replace(/[^a-zA-Z0-9-]/g, '');
    if (cleanWord.length < 3) continue;
    const lower = cleanWord.toLowerCase();
    if (!stopWords.has(lower) && !seen.has(lower)) {
      seen.add(lower);
      // Format as PascalCase or TitleCase tag
      const formatted = cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1);
      tags.push(formatted);
      if (tags.length >= 4) break;
    }
  }

  return tags;
}
