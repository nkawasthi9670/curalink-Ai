/**
 * Re-ranks a mixed pool of publications and clinical trials.
 * Scoring factors:
 *   - Keyword relevance (40%) — query terms found in title/abstract
 *   - Recency         (30%) — how recent the publication/trial is
 *   - Credibility     (30%) — source trust + citation count
 */

const CURRENT_YEAR = new Date().getFullYear();

/**
 * Scores and sorts publications. Returns top N.
 *
 * @param {Array}  publications  - Normalized publication objects
 * @param {string} query         - The expanded query string
 * @param {number} topN          - How many to return (default 6)
 * @returns {Array}
 */
function rerankPublications(publications, query, topN = 6) {
  const queryTerms = tokenize(query);

  const scored = publications
    .filter((p) => p && p.title)
    .map((pub) => {
      const relevance = keywordScore(pub, queryTerms);
      const recency = recencyScore(pub.year);
      const credibility = credibilityScore(pub);

      pub.relevanceScore =
        relevance * 0.4 + recency * 0.3 + credibility * 0.3;

      return pub;
    });

  // Sort descending, deduplicate by title similarity
  const sorted = scored.sort((a, b) => b.relevanceScore - a.relevanceScore);
  const deduped = deduplicateByTitle(sorted);

  return deduped.slice(0, topN);
}

/**
 * Scores and sorts clinical trials. Prioritizes RECRUITING status.
 *
 * @param {Array}  trials  - Normalized trial objects
 * @param {string} query   - The expanded query string
 * @param {number} topN    - How many to return (default 4)
 * @returns {Array}
 */
function rerankTrials(trials, query, topN = 4) {
  const queryTerms = tokenize(query);

  const STATUS_WEIGHT = {
    RECRUITING: 1.0,
    NOT_YET_RECRUITING: 0.8,
    ACTIVE_NOT_RECRUITING: 0.6,
    COMPLETED: 0.4,
    UNKNOWN: 0.2,
  };

  const scored = trials
    .filter((t) => t && t.title)
    .map((trial) => {
      const relevance = keywordScore(
        { title: trial.title, abstract: trial.summary },
        queryTerms
      );
      const statusBoost = STATUS_WEIGHT[trial.recruitingStatus] || 0.2;
      const recency = trial.startDate
        ? recencyScore(parseInt(trial.startDate.substring(0, 4)))
        : 0.3;

      trial.relevanceScore =
        relevance * 0.5 + statusBoost * 0.3 + recency * 0.2;

      return trial;
    });

  return scored
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, topN);
}

// ── Scoring helpers ──────────────────────────────────────────────────────────

function tokenize(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function keywordScore(item, queryTerms) {
  if (queryTerms.length === 0) return 0.5;

  const text = `${item.title || ''} ${item.abstract || ''}`.toLowerCase();
  let hits = 0;
  let titleHits = 0;

  for (const term of queryTerms) {
    if (text.includes(term)) hits++;
    if ((item.title || '').toLowerCase().includes(term)) titleHits++;
  }

  // Title matches weighted 2x
  const score = (hits + titleHits) / (queryTerms.length * 2);
  return Math.min(score, 1);
}

function recencyScore(year) {
  if (!year || isNaN(year)) return 0.3;
  const age = CURRENT_YEAR - year;
  if (age <= 1) return 1.0;
  if (age <= 3) return 0.85;
  if (age <= 5) return 0.7;
  if (age <= 10) return 0.5;
  return Math.max(0.1, 0.5 - (age - 10) * 0.02);
}

function credibilityScore(pub) {
  let score = 0.5; // baseline

  // Source trust weight
  if (pub.source === 'PubMed') score += 0.2;
  else if (pub.source === 'OpenAlex') score += 0.1;

  // Citation count bonus (OpenAlex provides this)
  if (pub.citationCount) {
    if (pub.citationCount > 500) score += 0.3;
    else if (pub.citationCount > 100) score += 0.2;
    else if (pub.citationCount > 20) score += 0.1;
  }

  return Math.min(score, 1);
}

function deduplicateByTitle(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item.title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 60);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

module.exports = { rerankPublications, rerankTrials };