import { blink } from '../blink/client';
import { findRelevantChunks } from '../utils/textProcessing';

export interface AIResponse {
  answer: string;
  sources: {
    chunk: string;
    score: number;
    documentId: string;
    documentName: string;
  }[];
  confidence: number;
}

export async function generateAIResponse(
  query: string,
  documents: Array<{
    id: string;
    filename: string;
    chunks: string[];
    vectors: number[][];
    vocabulary: string[];
  }>
): Promise<AIResponse> {
  try {
    // Find relevant chunks from all documents
    const allRelevantChunks: Array<{
      chunk: string;
      score: number;
      documentId: string;
      documentName: string;
    }> = [];

    for (const doc of documents) {
      const relevantChunks = findRelevantChunks(
        query,
        doc.chunks,
        doc.vectors,
        doc.vocabulary,
        3
      );

      relevantChunks.forEach(chunk => {
        allRelevantChunks.push({
          chunk: chunk.chunk,
          score: chunk.score,
          documentId: doc.id,
          documentName: doc.filename
        });
      });
    }

    // Sort all chunks by relevance and take top 5
    const topChunks = allRelevantChunks
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    if (topChunks.length === 0) {
      return {
        answer: "I couldn't find relevant information in the uploaded documents to answer your question. Please try rephrasing your question or upload more relevant documents.",
        sources: [],
        confidence: 0
      };
    }

    // Create context from relevant chunks
    const context = topChunks
      .map((chunk, index) => `[Source ${index + 1}]: ${chunk.chunk}`)
      .join('\n\n');

    // Generate AI response using Blink AI
    const prompt = `Based on the following context from uploaded documents, please answer the user's question. If the context doesn't contain enough information to answer the question, say so clearly.

Context:
${context}

Question: ${query}

Please provide a clear, accurate answer based only on the information provided in the context. If you reference specific information, mention which source it came from (e.g., "According to Source 1...").`;

    const { text } = await blink.ai.generateText({
      prompt,
      model: 'gpt-4o-mini',
      maxTokens: 500
    });

    // Calculate overall confidence based on relevance scores
    const avgScore = topChunks.reduce((sum, chunk) => sum + chunk.score, 0) / topChunks.length;
    const confidence = Math.min(avgScore * 100, 95); // Cap at 95%

    return {
      answer: text,
      sources: topChunks,
      confidence
    };

  } catch (error) {
    console.error('AI response generation error:', error);
    throw new Error('Failed to generate AI response. Please try again.');
  }
}

export async function generateFollowUpQuestions(
  query: string,
  answer: string,
  documentTopics: string[]
): Promise<string[]> {
  try {
    const prompt = `Based on the user's question "${query}" and the answer provided, suggest 3 relevant follow-up questions that could be answered using documents about: ${documentTopics.join(', ')}.

Make the questions specific and actionable. Return only the questions, one per line.`;

    const { text } = await blink.ai.generateText({
      prompt,
      model: 'gpt-4o-mini',
      maxTokens: 200
    });

    return text
      .split('\n')
      .filter(line => line.trim().length > 0)
      .slice(0, 3);

  } catch (error) {
    console.error('Follow-up questions generation error:', error);
    return [];
  }
}