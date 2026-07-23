
const { pipeline } = require('@xenova/transformers');

const EMBEDDING_DIMENSIONS = 384; 
let extractorPromise = null;

function getExtractor() {
  if (!extractorPromise) {
    console.log('[embeddings] Loading local AI model (may take a few seconds on first run)...');
    extractorPromise = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return extractorPromise;
}

async function embedText(text) {
  const extractor = await getExtractor();
  const output = await extractor(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

async function embedBatch(texts) {
  if (!texts || texts.length === 0) return [];

    const extractor = await getExtractor();
  const output = await extractor(texts, { pooling: 'mean', normalize: true });

    const results = [];
  for (let i = 0; i < texts.length; i++) {
    results.push(Array.from(output.data.subarray(i * EMBEDDING_DIMENSIONS, (i + 1) * EMBEDDING_DIMENSIONS)));
  }
  return results;
}

function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    magA += vecA[i] * vecA[i];
    magB += vecB[i] * vecB[i];
  }
  const mag = Math.sqrt(magA) * Math.sqrt(magB);
  return mag === 0 ? 0 : dot / mag;
}

module.exports = { embedText, embedBatch, cosineSimilarity, EMBEDDING_DIMENSIONS };
