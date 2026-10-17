const express = require("express");
const cors = require("cors");
const path = require("node:path");
const dotenv = require("dotenv");
const { GoogleGenAI, Type } = require("@google/genai");
const books = require("./data/books.json");

const app = express();
const PORT = 5000;
const { parsed: serverEnv } = dotenv.config({
  path: path.join(__dirname, ".env"),
  quiet: true,
});
const GEMINI_API_KEY = serverEnv?.GEMINI_API_KEY?.trim();
const GEMINI_MODEL = "gemini-3.8-flash";
const STEP_LABELS = ["Start", "Practice", "Go Deeper"];
const genAI = GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: GEMINI_API_KEY })
  : null;

const recommendationStopWords = new Set([
  "a",
  "about",
  "and",
  "for",
  "i",
  "in",
  "is",
  "me",
  "my",
  "of",
  "on",
  "or",
  "first",
  "the",
  "to",
  "want",
  "what",
  "with",
  "you",
]);

const recommendationFields = [
  ["title", 1],
  ["category", 0.95],
  ["author", 0.85],
  ["level", 0.75],
  ["description", 0.65],
];

function normalizeKeyword(keyword) {
  if (keyword === "robotics" || keyword === "robotic") {
    return "robot";
  }

  if (keyword.endsWith("ies") && keyword.length > 4) {
    return `${keyword.slice(0, -3)}y`;
  }

  if (keyword.endsWith("ing") && keyword.length > 5) {
    let stem = keyword.slice(0, -3);
    if (
      stem.length > 2 &&
      stem[stem.length - 1] === stem[stem.length - 2]
    ) {
      stem = stem.slice(0, -1);
    }
    return stem;
  }

  if (keyword.endsWith("s") && keyword.length > 3) {
    return keyword.slice(0, -1);
  }

  return keyword;
}

function getKeywords(value) {
  return (value.toLowerCase().match(/[a-z0-9]+/g) || [])
    .filter((word) => !recommendationStopWords.has(word))
    .map(normalizeKeyword);
}

function parseAIRecommendations(text) {
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
    throw new Error('Gemini response must contain a "recommendations" array.');
  }
  if (result.recommendations.length > 3) {
    throw new Error("Gemini returned more than 3 recommendations.");
  }

  const seenBookIds = new Set();
  return result.recommendations.map((recommendation) => {
    if (
      !recommendation ||
      typeof recommendation !== "object" ||
      typeof recommendation.bookId !== "string" ||
      typeof recommendation.reason !== "string" ||
      !recommendation.reason.trim() ||
      typeof recommendation.score !== "number" ||
      !Number.isFinite(recommendation.score) ||
      recommendation.score < 0 ||
      recommendation.score > 1
    ) {
      throw new Error("Gemini returned an invalid recommendation.");
    }

    const book = books.find((item) => item.id === recommendation.bookId);
    if (!book || seenBookIds.has(book.id)) {
      throw new Error("Gemini returned an unknown or duplicate book ID.");
    }
    seenBookIds.add(book.id);

    return {
      bookId: book.id,
      title: book.title,
      author: book.author,
      category: book.category,
      level: book.level,
      availableCopies: book.availableCopies,
      reason: recommendation.reason.trim(),
      score: recommendation.score,
    };
  });
}

async function getAIRecommendations(query) {
  if (!genAI) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const response = await genAI.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      `Recommend the most relevant books for this request: ${query}\n` +
        "Use only the provided catalog. Return up to 3 recommendations, " +
        "ranked by relevance. Give each a concise reason and a score from 0 to 1.\n" +
        `Catalog:\n${JSON.stringify(books.map(({ id, title, author, category, level, description }) => ({
          id,
          title,
          author,
          category,
          level,
          description,
        })))}`,
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

  if (typeof response.text !== "string" || !response.text.trim()) {
    throw new Error("Gemini returned an empty response.");
  }

  return parseAIRecommendations(response.text);
}

function logRecommendationFallback(error) {
  const errorName = typeof error?.name === "string" ? error.name : "Error";
  const errorMessage =
    typeof error?.message === "string" ? error.message : "Unknown error";
  const safeMessage = GEMINI_API_KEY
    ? errorMessage.split(GEMINI_API_KEY).join("[REDACTED]")
    : errorMessage;
  const status =
    typeof error?.status === "number" || typeof error?.status === "string"
      ? ` HTTP status: ${error.status}`
      : "";
  const code =
    typeof error?.code === "number" || typeof error?.code === "string"
      ? ` code: ${error.code}`
      : "";

  console.warn(
    `Gemini recommendation failed (${errorName}): ${safeMessage}${status}${code}; using fallback.`
  );
}

function parseAIPath(text) {
  let result;
  try {
    result = JSON.parse(text);
  } catch {
    throw new Error("Gemini returned invalid JSON for reading path.");
  }
  if (!result || typeof result !== "object" || !Array.isArray(result.steps)) {
    throw new Error('Gemini path response must contain a "steps" array.');
  }
  if (result.steps.length > 3) {
    throw new Error("Gemini returned more than 3 path steps.");
  }

  const seenBookIds = new Set();
  const seenStepLabels = new Set();
  return result.steps.map((s) => {
    if (
      !s ||
      typeof s !== "object" ||
      !STEP_LABELS.includes(s.step) ||
      typeof s.bookId !== "string" ||
      typeof s.reason !== "string" ||
      !s.reason.trim()
    ) {
      throw new Error("Gemini returned an invalid path step.");
    }
    if (seenStepLabels.has(s.step)) {
      throw new Error("Gemini returned duplicate step labels.");
    }
    seenStepLabels.add(s.step);

    const book = books.find((b) => b.id === s.bookId);
    if (!book || seenBookIds.has(book.id)) {
      throw new Error("Gemini returned an unknown or duplicate book ID in path.");
    }
    seenBookIds.add(book.id);

    return {
      step: s.step,
      bookId: book.id,
      title: book.title,
      author: book.author,
      category: book.category,
      level: book.level,
      availableCopies: book.availableCopies,
      totalCopies: book.totalCopies,
      reason: s.reason.trim(),
    };
  });
}

async function getAIPath(goal, level) {
  if (!genAI) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const response = await genAI.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      `Create a learning path for a student with this goal: "${goal}" (target level: ${level}).\n` +
        "Build an ordered path using these exact step labels in order: Start, Practice, Go Deeper.\n" +
        "Use only books from the provided catalog. Each step must use a different book. " +
        "Only include steps you can fill with a genuinely suitable catalog book. " +
        "Give a concise reason (1-2 sentences) for each book choice.\n" +
        `Catalog:\n${JSON.stringify(
          books.map(({ id, title, author, category, level: lvl, description }) => ({
            id,
            title,
            author,
            category,
            level: lvl,
            description,
          }))
        )}`,
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          steps: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                step: { type: Type.STRING },
                bookId: { type: Type.STRING },
                reason: { type: Type.STRING },
              },
              required: ["step", "bookId", "reason"],
            },
          },
        },
        required: ["steps"],
      },
    },
  });

  if (typeof response.text !== "string" || !response.text.trim()) {
    throw new Error("Gemini returned an empty path response.");
  }

  return parseAIPath(response.text);
}

function logPathFallback(error) {
  const errorName = typeof error?.name === "string" ? error.name : "Error";
  const errorMessage =
    typeof error?.message === "string" ? error.message : "Unknown error";
  const safeMessage = GEMINI_API_KEY
    ? errorMessage.split(GEMINI_API_KEY).join("[REDACTED]")
    : errorMessage;
  console.warn(
    `Gemini path failed (${errorName}): ${safeMessage}; using fallback.`
  );
}

function getFallbackPath(goal, level) {
  const keywords = [...new Set(getKeywords(goal))];
  const levelOrder = { beginner: 0, intermediate: 1, advanced: 2 };
  const targetLevelOrder = levelOrder[level] ?? 1;

  const scored = books
    .map((book) => {
      const fieldKws = Object.fromEntries(
        recommendationFields.map(([field]) => [
          field,
          new Set(getKeywords(book[field] || "")),
        ])
      );
      const matched =
        keywords.length > 0
          ? keywords.filter((kw) =>
              recommendationFields.some(([field]) => fieldKws[field].has(kw))
            )
          : [];
      const bookLevel = levelOrder[book.level.toLowerCase()] ?? 1;
      const levelBonus = bookLevel <= targetLevelOrder ? 0.05 : 0;

      if (matched.length === 0) {
        return { book, score: levelBonus, matchedFields: [] };
      }

      const matchedFields = recommendationFields
        .filter(([field]) => matched.some((kw) => fieldKws[field].has(kw)))
        .map(([field]) => field);
      const strengths = matched.map((kw) =>
        Math.max(
          ...recommendationFields
            .filter(([field]) => fieldKws[field].has(kw))
            .map(([, s]) => s)
        )
      );
      const coverage = matched.length / keywords.length;
      const avgStrength =
        strengths.reduce((t, s) => t + s, 0) / strengths.length;
      const score =
        Math.round(
          (coverage * (avgStrength * 0.9 + 0.1) + levelBonus) * 100
        ) / 100;

      return { book, score, matchedFields };
    })
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, 3).map((item, i) => ({
    step: STEP_LABELS[i],
    bookId: item.book.id,
    title: item.book.title,
    author: item.book.author,
    category: item.book.category,
    level: item.book.level,
    availableCopies: item.book.availableCopies,
    totalCopies: item.book.totalCopies,
    reason:
      item.matchedFields.length > 0
        ? `Relevant to your goal; matched in ${item.matchedFields.join(", ")}.`
        : "A solid resource for your learning journey.",
  }));
}

app.use(cors());
app.use(express.json());

app.get("/api/books", (req, res) => {
  const query = (req.query.q || "").trim().toLowerCase();

  const results = books.filter((book) =>
    [book.title, book.author, book.category].some((value) =>
      value.toLowerCase().includes(query)
    )
  );

  res.json(results);
});

app.post("/api/recommend", async (req, res) => {
  const query = typeof req.body?.query === "string" ? req.body.query.trim() : "";

  if (!query) {
    return res.status(400).json({ error: "A non-blank query is required." });
  }

  if (genAI) {
    try {
      return res.json({
        query,
        source: "ai",
        recommendations: await getAIRecommendations(query),
      });
    } catch (error) {
      logRecommendationFallback(error);
    }
  } else {
    console.warn("GEMINI_API_KEY is not configured; using recommendation fallback.");
  }

  const keywords = [...new Set(getKeywords(query))];
  const recommendations = books
    .map((book) => {
      const fieldKeywords = Object.fromEntries(
        recommendationFields.map(([field]) => [
          field,
          new Set(getKeywords(book[field] || "")),
        ])
      );
      const matchedKeywords = keywords.filter((keyword) =>
        recommendationFields.some(([field]) => fieldKeywords[field].has(keyword))
      );

      if (matchedKeywords.length === 0) {
        return null;
      }

      const matchedFields = recommendationFields
        .filter(([field]) =>
          matchedKeywords.some((keyword) => fieldKeywords[field].has(keyword))
        )
        .map(([field]) => field);
      const keywordStrengths = matchedKeywords.map((keyword) =>
        Math.max(
          ...recommendationFields
            .filter(([field]) => fieldKeywords[field].has(keyword))
            .map(([, strength]) => strength)
        )
      );
      const coverage = matchedKeywords.length / keywords.length;
      const averageStrength =
        keywordStrengths.reduce((total, strength) => total + strength, 0) /
        keywordStrengths.length;
      const score = Math.round(coverage * (averageStrength * 0.9 + 0.1) * 100) / 100;

      return {
        bookId: book.id,
        title: book.title,
        author: book.author,
        category: book.category,
        level: book.level,
        availableCopies: book.availableCopies,
        reason: `Matched ${matchedKeywords.join(", ")} in ${matchedFields.join(", ")}.`,
        score,
      };
    })
    .filter(Boolean)
    .sort((first, second) => second.score - first.score);

  res.json({
    query,
    source: "fallback",
    recommendations,
  });
});

app.post("/api/reading-path", async (req, res) => {
  const goal =
    typeof req.body?.goal === "string" ? req.body.goal.trim() : "";
  const rawLevel =
    typeof req.body?.level === "string"
      ? req.body.level.trim().toLowerCase()
      : "";

  if (!goal) {
    return res
      .status(400)
      .json({ error: "A non-blank learning goal is required." });
  }
  if (!["beginner", "intermediate", "advanced"].includes(rawLevel)) {
    return res
      .status(400)
      .json({ error: "Level must be beginner, intermediate, or advanced." });
  }

  if (genAI) {
    try {
      const steps = await getAIPath(goal, rawLevel);
      if (steps.length > 0) {
        return res.json({ goal, level: rawLevel, source: "ai", steps });
      }
    } catch (error) {
      logPathFallback(error);
    }
  } else {
    console.warn(
      "GEMINI_API_KEY is not configured; using reading path fallback."
    );
  }

  const steps = getFallbackPath(goal, rawLevel);
  res.json({ goal, level: rawLevel, source: "fallback", steps });
});

app.get("/api/books/:id", (req, res) => {
  const book = books.find((item) => item.id === req.params.id);

  if (!book) {
    return res.status(404).json({
      error: "Book not found",
      bookId: req.params.id
    });
  }

  res.json(book);
});

app.listen(PORT, () => {
  console.log(`LibraAI server running at http://localhost:${PORT}`);
});