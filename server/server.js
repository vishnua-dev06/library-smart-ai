const express = require("express");
const cors = require("cors");
const books = require("./data/books.json");

const app = express();
const PORT = 5000;

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

app.post("/api/recommend", (req, res) => {
  const query = typeof req.body?.query === "string" ? req.body.query.trim() : "";

  if (!query) {
    return res.status(400).json({ error: "A non-blank query is required." });
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