
const CHUNK_TOKENS = 500;   
const OVERLAP_TOKENS = 50;  
const WORDS_PER_TOKEN = 0.75; 

const CHUNK_WORDS = Math.floor(CHUNK_TOKENS * WORDS_PER_TOKEN);   
const OVERLAP_WORDS = Math.floor(OVERLAP_TOKENS * WORDS_PER_TOKEN); 

function extractSections(text) {
  const lines = text.split('\n');
  const sections = [];
  let currentHeading = 'Introduction';
  let currentContent = [];

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,3}\s+(.+)/);
    if (headingMatch) {
      if (currentContent.length > 0) {
        sections.push({ heading: currentHeading, content: currentContent.join('\n') });
      }
      currentHeading = headingMatch[1];
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  if (currentContent.length > 0) {
    sections.push({ heading: currentHeading, content: currentContent.join('\n') });
  }

  return sections;
}

function splitIntoChunks(text, chunkSize = CHUNK_WORDS, overlap = OVERLAP_WORDS) {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks = [];
  let i = 0;

  while (i < words.length) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    if (chunk.trim()) chunks.push(chunk);
    i += chunkSize - overlap;
    if (i + overlap >= words.length && i < words.length) break; 
  }

  if (words.length > 0 && (chunks.length === 0 || !chunks[chunks.length - 1].includes(words[words.length - 1]))) {
    const lastChunk = words.slice(Math.max(0, words.length - chunkSize)).join(' ');
    if (lastChunk && lastChunk !== chunks[chunks.length - 1]) {
      chunks.push(lastChunk);
    }
  }

  return chunks;
}

function chunkBlogBody(blogBody) {
  if (!blogBody || typeof blogBody !== 'string') return [];

  const sections = extractSections(blogBody);
  const result = [];
  let globalIndex = 0;

  for (const section of sections) {
    const chunks = splitIntoChunks(section.content);
    for (const chunk of chunks) {
      if (chunk.trim().split(/\s+/).length < 10) continue; 
      result.push({
        chunkIndex: globalIndex++,
        text: chunk.trim(),
        headingContext: section.heading,
      });
    }
  }

  return result;
}

module.exports = { chunkBlogBody };
