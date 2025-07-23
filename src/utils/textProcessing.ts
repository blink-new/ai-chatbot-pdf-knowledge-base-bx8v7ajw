// Simple browser-compatible text processing without heavy dependencies

// Common English stopwords
const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he',
  'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'will', 'with',
  'the', 'this', 'but', 'they', 'have', 'had', 'what', 'said', 'each', 'which',
  'she', 'do', 'how', 'their', 'if', 'up', 'out', 'many', 'then', 'them', 'these',
  'so', 'some', 'her', 'would', 'make', 'like', 'into', 'him', 'time', 'two',
  'more', 'go', 'no', 'way', 'could', 'my', 'than', 'first', 'been', 'call',
  'who', 'oil', 'sit', 'now', 'find', 'down', 'day', 'did', 'get', 'come',
  'made', 'may', 'part'
]);

// Simple stemming function (Porter Stemmer simplified)
function simpleStem(word: string): string {
  // Remove common suffixes
  word = word.toLowerCase();
  
  // Step 1: Remove plurals and past tense
  if (word.endsWith('ies')) return word.slice(0, -3) + 'y';
  if (word.endsWith('ied')) return word.slice(0, -3) + 'y';
  if (word.endsWith('s') && word.length > 3 && !word.endsWith('ss')) return word.slice(0, -1);
  if (word.endsWith('ed') && word.length > 4) return word.slice(0, -2);
  if (word.endsWith('ing') && word.length > 5) return word.slice(0, -3);
  
  // Step 2: Remove common suffixes
  if (word.endsWith('ly') && word.length > 4) return word.slice(0, -2);
  if (word.endsWith('er') && word.length > 4) return word.slice(0, -2);
  if (word.endsWith('est') && word.length > 5) return word.slice(0, -3);
  
  return word;
}

// Text preprocessing function
export function preprocessText(text: string): string[] {
  // Convert to lowercase and remove special characters
  const cleaned = text.toLowerCase().replace(/[^\w\s]/g, ' ');
  
  // Tokenize by splitting on whitespace
  const tokens = cleaned.split(/\s+/).filter(token => token.length > 0);
  
  // Remove stopwords and short words
  const withoutStopwords = tokens.filter(token => 
    !STOPWORDS.has(token) && token.length > 2
  );
  
  // Apply simple stemming
  const stemmed = withoutStopwords.map(token => simpleStem(token));
  
  return stemmed;
}

// Split text into chunks for better retrieval
export function chunkText(text: string, chunkSize: number = 500, overlap: number = 50): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  
  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    if (chunk.trim().length > 0) {
      chunks.push(chunk.trim());
    }
  }
  
  return chunks;
}

// Calculate TF-IDF vectors
export function calculateTFIDF(documents: string[]): { vectors: number[][], vocabulary: string[] } {
  const processedDocs = documents.map(doc => preprocessText(doc));
  
  // Build vocabulary
  const vocabulary = Array.from(new Set(processedDocs.flat()));
  
  // Calculate TF-IDF for each document
  const vectors: number[][] = [];
  
  for (const doc of processedDocs) {
    const vector: number[] = [];
    
    for (const term of vocabulary) {
      // Term frequency
      const tf = doc.filter(token => token === term).length / doc.length;
      
      // Inverse document frequency
      const docsWithTerm = processedDocs.filter(d => d.includes(term)).length;
      const idf = Math.log(processedDocs.length / (docsWithTerm || 1));
      
      // TF-IDF score
      vector.push(tf * idf);
    }
    
    vectors.push(vector);
  }
  
  return { vectors, vocabulary };
}

// Calculate cosine similarity between two vectors
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Find most relevant chunks for a query
export function findRelevantChunks(
  query: string,
  chunks: string[],
  vectors: number[][],
  vocabulary: string[],
  topK: number = 3
): { chunk: string; score: number; index: number }[] {
  // Process query
  const queryTokens = preprocessText(query);
  
  // Create query vector
  const queryVector: number[] = [];
  for (const term of vocabulary) {
    const tf = queryTokens.filter(token => token === term).length / queryTokens.length;
    queryVector.push(tf);
  }
  
  // Calculate similarities
  const similarities = vectors.map((vector, index) => ({
    chunk: chunks[index],
    score: cosineSimilarity(queryVector, vector),
    index
  }));
  
  // Sort by similarity and return top K
  return similarities
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .filter(item => item.score > 0.05); // Filter out very low relevance
}