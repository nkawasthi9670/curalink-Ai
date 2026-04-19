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
  const isLocal = process.env.USE_OLLAMA === 'true';

  // LOCAL: use Ollama
  if (isLocal) {
    try {
      const res = await axios.post(
        `${process.env.OLLAMA_URL}/api/generate`,
        {
          model: process.env.OLLAMA_MODEL || 'llama3.2',
          prompt,
          stream: false,
          options: { temperature: 0.3, num_predict: 800, num_ctx: 2048 },
        },
        { timeout: 180000 }
      );
      console.log('[Ollama] Response received');
      return res.data?.response || buildFallbackResponse();
    } catch (err) {
      console.error('[Ollama] Error:', err.message);
      return buildFallbackResponse();
    }
  }

  // DEPLOYED: use Hugging Face Inference API (free, open-source)
  try {
    console.log('[HF] Calling Mistral-7B on Hugging Face...');
    const res = await axios.post(
      'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3',
      {
        inputs: prompt,
        parameters: {
          max_new_tokens: 800,
          temperature: 0.3,
          top_p: 0.9,
          return_full_text: false,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.HF_TOKEN}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000,
      }
    );

    const output = res.data?.[0]?.generated_text || '';
    console.log('[HF] Response received');
    return output.trim() || buildFallbackResponse();
  } catch (err) {
    console.error('[HF] Error:', err.message);
    return buildFallbackResponse();
  }
}

function buildFallbackResponse() {
  return `## Overview
Research retrieval was successful. Please review the sources panel for relevant publications and clinical trials.

## Note  
AI synthesis is temporarily unavailable. Sources above are retrieved directly from PubMed, OpenAlex, and ClinicalTrials.gov.

## What to do
- Click **Read paper** on any source card to access the full study
- Check the clinical trials panel for recruiting studies near you`;
}

module.exports = router;