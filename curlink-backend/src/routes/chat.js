const express = require('express');
const router = express.Router();
const axios = require('axios');

const Session = require('../models/Session');
const { fetchPubMed } = require('../services/pubmed');
const { fetchOpenAlex } = require('../services/openalex');
const { fetchClinicalTrials } = require('../services/clinicaltrials');
const { expandQuery } = require('../utils/queryExpand');
const { rerankPublications, rerankTrials } = require('../utils/rerank');

/**
 * POST /api/chat
 * Body: {
 *   sessionId: string,
 *   message: string,
 *   context?: { disease, patientName, location }  // from structured form on first turn
 * }
 */
router.post('/', async (req, res) => {
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

    // ── 3. Parallel retrieval from all 3 sources ─────────────────────────────
    const [pubmedRaw, openalexRaw, trialsRaw] = await Promise.allSettled([
      fetchPubMed(pubmed, 80),
      fetchOpenAlex(openalex, 100),
      fetchClinicalTrials(disease || message, combined, location, 50),
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
    .map(
      (p, i) =>
        `[P${i + 1}] "${p.title}" (${p.source}, ${p.year})\n${p.abstract?.substring(0, 400)}`
    )
    .join('\n\n');

  const trialContext = trials
    .map(
      (t, i) =>
        `[T${i + 1}] "${t.title}" — Status: ${t.recruitingStatus}, Phase: ${t.phase}\n${t.summary?.substring(0, 300)}`
    )
    .join('\n\n');

  return `You are Curalink, an expert AI medical research assistant. You provide structured, evidence-based answers grounded ONLY in the provided research sources. Never hallucinate or invent studies.

PATIENT CONTEXT:
- Name: ${patientName || 'Not provided'}
- Disease: ${disease || 'Not specified'}
- Question: ${message}

${conversationHistory ? `CONVERSATION HISTORY:\n${conversationHistory}\n` : ''}

RETRIEVED PUBLICATIONS:
${pubContext || 'No publications retrieved.'}

RETRIEVED CLINICAL TRIALS:
${trialContext || 'No clinical trials retrieved.'}

INSTRUCTIONS:
1. Answer the patient's question directly and clearly.
2. Structure your response with these sections:
   ## Overview
   ## Research Insights (cite [P1], [P2] etc.)
   ## Clinical Trials (if relevant, cite [T1], [T2] etc.)
   ## Key Takeaways
3. Always cite your sources using [P1], [T1] etc.
4. Use plain language — avoid unnecessary jargon.
5. If the evidence is limited or mixed, say so honestly.
6. Do NOT recommend specific treatments or dosages — direct patients to their physician.

Respond now:`;
}

async function callOllama(prompt) {
  const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
  const MODEL = process.env.OLLAMA_MODEL || 'llama3.2';

  console.log(`[Ollama] Calling model: ${MODEL} at ${OLLAMA_URL}`);

  try {
    const res = await axios.post(
      `${OLLAMA_URL}/api/generate`,
      {
        model: MODEL,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: 800,
          num_ctx: 2048,      // Reduce context to save RAM
          top_p: 0.9,
        },
      },
      {
        timeout: 180000,      // 3 minutes — llama3.2 can be slow
        headers: { 'Content-Type': 'application/json' },
      }
    );

    console.log('[Ollama] Response received successfully');

    const response = res.data?.response;
    if (!response || response.trim() === '') {
      console.error('[Ollama] Empty response received');
      return buildFallbackResponse(prompt);
    }

    return response;

  } catch (err) {
    // Detailed error logging
    if (err.code === 'ECONNREFUSED') {
      console.error('[Ollama] Connection refused — is ollama serve running?');
    } else if (err.code === 'ETIMEDOUT' || err.message.includes('timeout')) {
      console.error('[Ollama] Timeout — model too slow for available RAM');
    } else if (err.response?.status === 404) {
      console.error(`[Ollama] Model "${MODEL}" not found — run: ollama pull ${MODEL}`);
    } else {
      console.error('[Ollama] Unexpected error:', err.message);
    }

    return buildFallbackResponse(prompt);
  }
}

// Fallback: builds a structured response from the prompt itself
// so the user still gets value even without LLM
function buildFallbackResponse(prompt) {
  return `## Overview
The research retrieval was successful. Please review the sources panel on the right for relevant publications and clinical trials.

## Note
The AI synthesis is temporarily unavailable. The retrieved sources above contain the latest research directly from PubMed, OpenAlex, and ClinicalTrials.gov.

## What to do
- Click **Read paper** on any source card to access the full study
- Check the clinical trials panel for recruiting studies near you
- Try asking your question again in a moment`;
}

module.exports = router;