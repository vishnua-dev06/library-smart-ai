const path = require("node:path");
const dotenv = require("dotenv");
const { GoogleGenAI, Type } = require("@google/genai");
const books = require("./data/books.json");

const MODEL = "gemini-3.8-flash";
const { parsed: env } = dotenv.config({
  path: path.join(__dirname, ".env"),
  quiet: true,
});
const apiKey = env?.GEMINI_API_KEY?.trim();

function parseRecommendations(text, sampleBook) {
  let result;

  try {
    result = JSON.parse(text);
  } catch {
    throw new Error("Gemini returned invalid JSON.");
  }

  if (
    !result ||
    typeof result !== "object" ||
    !Array.isArray(result.recommendations)
  ) {
    throw new Error('Gemini JSON must contain a "recommendations" array.');
  }

  if (result.recommendations.length > 1) {
    throw new Error("Gemini returned more than one recommendation for one sample book.");
  }

  const recommendations = result.recommendations.map((recommendation) => {
    if (
      !recommendation ||
      typeof recommendation !== "object" ||
      recommendation.bookId !== sampleBook.id ||
      typeof recommendation.reason !== "string" ||
      !recommendation.reason.trim() ||
      typeof recommendation.score !== "number" ||
      !Number.isFinite(recommendation.score) ||
      recommendation.score < 0 ||
      recommendation.score > 1
    ) {
      throw new Error(
        "Gemini returned an invalid recommendation; expected the sample book ID, a non-empty reason, and a score from 0 to 1."
      );
    }

    return {
      bookId: recommendation.bookId,
      reason: recommendation.reason.trim(),
      score: recommendation.score,
    };
  });

  return { recommendations };
}

async function main() {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing from server/.env.");
  }

  const sampleBook = books[0];
  if (!sampleBook) {
    throw new Error("No sample book is available in server/data/books.json.");
  }

  const ai = new GoogleGenAI({ apiKey });
  let response;

  try {
    response = await ai.models.generateContent({
      model: MODEL,
      contents: [
        "Recommend from the supplied sample book for a reader interested in programming. Use only that book. Return one JSON object with a recommendations array; each item must have bookId, reason, and score from 0 to 1.",
        JSON.stringify({
          id: sampleBook.id,
          title: sampleBook.title,
          author: sampleBook.author,
          category: sampleBook.category,
          level: sampleBook.level,
          description: sampleBook.description,
        }),
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  bookId: { type: Type.STRING },
                  reason: { type: Type.STRING },
                  score: { type: Type.NUMBER },
                },
                required: ["bookId", "reason", "score"],
              },
            },
          },
          required: ["recommendations"],
        },
      },
    });
  } catch {
    throw new Error(
      "Gemini API request failed. Check model availability, API access, and network connectivity."
    );
  }

  if (typeof response.text !== "string" || !response.text.trim()) {
    throw new Error("Gemini returned an empty response instead of JSON.");
  }

  const validated = parseRecommendations(response.text, sampleBook);
  console.log(JSON.stringify(validated, null, 2));
}

main().catch((error) => {
  console.error(`AI recommendation test failed: ${error.message}`);
  process.exitCode = 1;
});
