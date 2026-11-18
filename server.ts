import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '4mb' }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'Factory Memory OS' });
});

// Server-side Factory Memory AI endpoint (RAG over authorized database records)
app.post('/api/ai/query', async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      return res.status(503).json({
        error: 'Gemini API key is not configured on the server. Please configure GEMINI_API_KEY in Settings > Secrets.',
      });
    }

    const { question, factoryName, userRole, userName, contextRecords } = req.body ?? {};
    if (!question || typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({ error: 'A natural-language question is required.' });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const systemInstruction = `You are FACTORY MEMORY AI, the authorized industrial operations retrieval and analytical assistant for "${factoryName || 'Factory Memory OS'}".

STRICT OPERATIONAL & SAFETY RULES:
1. Ground EVERY statement strictly in the provided JSON "contextRecords" from the factory database.
2. NEVER invent, guess, extrapolate, or fabricate missing dates, batch numbers, measurements, spare parts, technician names, or fault histories.
3. If the requested historical record is not present in contextRecords, explicitly state that it is not available in the digitized factory records.
4. Distinguish clearly between "recordedFacts" (directly observed in database records with IDs and dates) and "analyticalObservations" (patterns, counts, comparisons derived strictly from those records).
5. If any referenced record has recordOrigin === "sample", explicitly note that it is sample pilot data rather than live floor data.
6. CRITICAL INDUSTRIAL SAFETY RULE: You MUST NOT independently diagnose electrical faults, recommend unapproved electrical troubleshooting or live-panel procedures, control machines, alter temperature settings, or make safety-critical operational decisions. If asked to diagnose an electrical fault or adjust machine settings, decline that action and state that only qualified maintenance personnel following approved lockout/tagout SOPs may perform diagnostics or equipment changes.
7. Current user role: "${userRole || 'unknown'}" (${userName || 'Authenticated User'}). Only reference records present in their authorized contextRecords payload.`;

    const promptPayload = JSON.stringify(
      {
        question: question.trim(),
        currentLocalTimestamp: new Date().toISOString(),
        contextRecords: contextRecords ?? {},
      },
      null,
      2
    );

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: promptPayload,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            answer: {
              type: Type.STRING,
              description: 'Clear executive summary directly answering the user question from database records.',
            },
            recordedFacts: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Factual statements directly backed by provided database records, including dates and values.',
            },
            analyticalObservations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Calculations, comparisons, or trend observations derived strictly from the retrieved records.',
            },
            citedRecords: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  module: { type: Type.STRING },
                  recordId: { type: Type.STRING },
                  date: { type: Type.STRING },
                  summary: { type: Type.STRING },
                },
              },
              description: 'Exact database records supporting the response.',
            },
            dataGaps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Any missing, incomplete, or unrecorded information relevant to the query.',
            },
            safetyNotice: {
              type: Type.STRING,
              description: 'Optional safety boundary reminder if query touches electrical diagnostics or equipment control.',
            },
          },
          required: ['answer', 'recordedFacts', 'analyticalObservations', 'citedRecords', 'dataGaps'],
        },
      },
    });

    const rawText = response.text;
    if (!rawText) {
      return res.status(502).json({ error: 'Empty response received from Factory Memory AI model.' });
    }

    const parsed = JSON.parse(rawText);
    return res.json(parsed);
  } catch (err: unknown) {
    console.error('Factory Memory AI query error:', err);
    const message = err instanceof Error ? err.message : 'Failed to process Factory Memory AI query.';
    return res.status(500).json({ error: message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Factory Memory OS server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
