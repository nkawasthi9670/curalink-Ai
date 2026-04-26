const express = require('express');
const router = express.Router();
const axios = require('axios');

const Session = require('../models/Session');
const { fetchPubMed } = require('../services/pubmed');
const { fetchOpenAlex } = require('../services/openalex');
const { fetchClinicalTrials } = require('../services/clinicaltrials');
const { expandQuery } = require('../utils/queryExpand');
const { rerankPublications, rerankTrials } = require('../utils/rerank');
const authMiddleware = require('../middleware/auth');

/**
 * POST /api/chat
 * Body: {
 *   sessionId: string,
 *   message: string,
 *   context?: { disease, patientName, location }  // from structured form on first turn
 * }
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { sessionId, message, context: incomingContext } = req.body;

    if (!sessionId || !message) {
      return res.status(400).json({ error: 'sessionId and message are required' });
    }

    // ── 1. Load or create session ────────────────────────────────────────────
    let session = await Session.findOne({ sessionId });
    if (!session) {
      session = new Session({ sessionId, context: {}, messages: [] });
    }

    // Merge incoming context (structured form fields) with stored context
    if (incomingContext) {
      session.context = {
        disease: incomingContext.disease || session.context.disease || '',
        patientName: incomingContext.patientName || session.context.patientName || '',
        location: incomingContext.location || session.context.location || '',
      };
    }

    const { disease, patientName, location } = session.context;

   // ── 2. Expand the query ──────────────────────────────────────────────────
const { pubmed, openalex, trials, combined } = expandQuery(message, disease);

// ── 3. India tropical detection + query override ─────────────────────────
const symptomText = (message + ' ' + (disease || '')).toLowerCase();

// Cardiac detection — highest priority
const isCardiac = ['chest pain', 'heart', 'sweating', 'shortness of breath', 
  'palpitation', 'angina'].some(s => symptomText.includes(s));

// Tropical detection — only if fever present
const hasFever = symptomText.includes('fever');
const isTropical = hasFever && ['joint pain', 'rash', 'fatigue', 'chills', 'body pain']
  .some(s => symptomText.includes(s));

console.log('[Query] isCardiac:', isCardiac, '| isTropical:', isTropical);

const [pubmedRaw, openalexRaw, trialsRaw] = await Promise.allSettled([
  fetchPubMed(
    isCardiac ? 'heart attack myocardial infarction chest pain treatment emergency' :
    isTropical ? 'dengue chikungunya typhoid fever India treatment' : pubmed,
    80
  ),
  fetchOpenAlex(
    isCardiac ? 'heart attack chest pain cardiac emergency treatment 2024' :
    isTropical ? 'dengue fever chikungunya India 2024 treatment' : openalex,
    100
  ),
  fetchClinicalTrials(
    isCardiac ? 'myocardial infarction' :
    isTropical ? 'dengue' : (disease || message),
    combined, location, 50
  ),
]);
  

    const publications = [
      ...(pubmedRaw.status === 'fulfilled' ? pubmedRaw.value : []),
      ...(openalexRaw.status === 'fulfilled' ? openalexRaw.value : []),
    ];
    const clinicalTrials =
      trialsRaw.status === 'fulfilled' ? trialsRaw.value : [];

    console.log(
      `[Retrieval] PubMed: ${pubmedRaw.value?.length || 0}, OpenAlex: ${openalexRaw.value?.length || 0}, Trials: ${clinicalTrials.length}`
    );

    // ── 4. Re-rank → top 6 publications + top 4 trials ───────────────────────
    const topPublications = rerankPublications(publications, combined, 6);
    const topTrials = rerankTrials(clinicalTrials, combined, 4);

    // ── 5. Build LLM prompt ──────────────────────────────────────────────────
    const conversationHistory = session.messages
      .slice(-6) // last 3 turns for context window efficiency
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');

    const prompt = buildPrompt({
      patientName,
      disease,
      message,
      conversationHistory,
      publications: topPublications,
      trials: topTrials,
    });

    // ── 6. Call Ollama LLM ────────────────────────────────────────────────────
    const llmResponse = await callOllama(prompt);

    // ── 7. Save conversation turn ─────────────────────────────────────────────
    session.messages.push({ role: 'user', content: message });
    session.messages.push({ role: 'assistant', content: llmResponse });

    // Keep conversation history bounded to last 20 messages
    if (session.messages.length > 20) {
      session.messages = session.messages.slice(-20);
    }
    await session.save();

    // ── 8. Return structured response ────────────────────────────────────────
    res.json({
      sessionId,
      response: llmResponse,
      sources: {
        publications: topPublications.map((p) => ({
          title: p.title,
          authors: p.authors?.slice(0, 3),
          year: p.year,
          journal: p.journal,
          source: p.source,
          url: p.url,
          snippet: p.abstract?.substring(0, 200),
        })),
        clinicalTrials: topTrials.map((t) => ({
          nctId: t.nctId,
          title: t.title,
          recruitingStatus: t.recruitingStatus,
          phase: t.phase,
          sponsor: t.sponsor,
          eligibility: t.eligibility,
          locations: t.locations?.slice(0, 2),
          contact: t.contact,
          url: t.url,
          snippet: t.summary?.substring(0, 200),
        })),
      },
      context: session.context,
    });
  } catch (err) {
    console.error('[Chat Route] Error:', err);
    res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildPrompt({ patientName, disease, message, conversationHistory, publications, trials }) {
  const pubContext = publications
    .map((p, i) => `[P${i + 1}] "${p.title}" (${p.source}, ${p.year})\n${p.abstract?.substring(0, 400)}`)
    .join('\n\n');

  const trialContext = trials
    .map((t, i) => `[T${i + 1}] "${t.title}" — Status: ${t.recruitingStatus}\n${t.summary?.substring(0, 300)}`)
    .join('\n\n');

return `You are an advanced AI medical assistant with strong clinical reasoning.

STEP 1 — CLASSIFY SYMPTOMS FIRST:
- Chest pain + sweating + shortness of breath → CARDIAC (Heart Attack/Angina) — NEVER suggest Dengue
- Fever + rash + joint pain → INFECTIOUS (Dengue/Chikungunya)
- Fever + abdominal pain → TYPHOID
- Fever + chills + sweating cycles → MALARIA

CRITICAL RULES:
1. NEVER suggest Dengue/Chikungunya if fever is NOT mentioned
2. Chest pain = Cardiac emergency — suggest Heart Attack FIRST
3. Only use symptoms given — do NOT hallucinate
4. Cite [P1][P2] only if paper is directly relevant to symptoms

PATIENT:
- Name: ${patientName || 'Not provided'}
- Condition: ${disease || 'Not specified'}
- Location: India

${conversationHistory ? `HISTORY:\n${conversationHistory}\n` : ''}

QUERY: ${message}

RETRIEVED PUBLICATIONS (use ONLY if relevant to symptoms):
${pubContext || 'None'}

TRIALS:
${trialContext || 'None'}

OUTPUT FORMAT:
### 1. Case Category
(Cardiac / Infectious / Neurological / Respiratory / General)

### 2. Most Likely Conditions (Ranked)
1. Disease (Confidence: XX%)
   - Why: (symptom match only)
   - Key Indicators:

### 3. Less Likely Conditions
- Disease — Why considered

### 4. Recommended Diagnostic Tests
- Test → Purpose

### 5. Treatment Overview
- Condition: treatment
- Note: Consult physician before medication

### 6. Risk & Urgency Level
- Low / Moderate / High
- If HIGH: "Seek immediate medical attention"

### 7. Key Takeaways
- bullet points

REMEMBER: Chest pain without fever = CARDIAC not DENGUE. Never default to tropical diseases without fever.`;
}
async function callOllama(prompt) {
  if (process.env.USE_OLLAMA === 'true') {
    try {
      const res = await axios.post(
        `${process.env.OLLAMA_URL}/api/generate`,
        { model: process.env.OLLAMA_MODEL || 'llama3.2', prompt, stream: false,
          options: { temperature: 0.3, num_predict: 800 } },
        { timeout: 180000 }
      );
      return res.data?.response || buildFallbackResponse();
    } catch (err) {
      console.error('[Ollama] Error:', err.message);
      return buildFallbackResponse();
    }
  }

  try {
    console.log('[Groq] Calling LLaMA3...');
    const res = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 800,
        temperature: 0.3,
      },
      {
        headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
        timeout: 30000,
      }
    );
    const output = res.data?.choices?.[0]?.message?.content || '';
    console.log('[Groq] Success:', output.length, 'chars');
    return output || buildFallbackResponse();
  } catch (err) {
    console.error('[Groq] Error:', err.response?.status, err.message);
    return buildFallbackResponse();
  }
}

function buildFallbackResponse() {
  return `## Overview
Research retrieval was successful. Please review the sources panel for relevant publications and clinical trials.

## Note
AI synthesis is temporarily unavailable. Sources are retrieved directly from PubMed, OpenAlex, and ClinicalTrials.gov.

## What to do
- Click **Read paper** on any source card to access the full study
- Check the clinical trials panel for recruiting studies near you`;
}

module.exports = router;