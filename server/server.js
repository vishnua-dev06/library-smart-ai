const express = require("express");
const cors = require("cors");
const books = require("./data/books.json");

const app = express();
const PORT = 5000;

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