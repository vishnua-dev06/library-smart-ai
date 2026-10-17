import { useEffect, useState } from "react";
import { API_URL, readJson } from "../api";

function BookCard({ book }) {
  return (
    <article className="book-card">
      <span className="category">{book.category}</span>
      <h3>{book.title}</h3>
      <p className="author">by {book.author}</p>
      <p className="description">{book.description}</p>
      <div className="book-footer">
        <span className="level">{book.level}</span>
        {Number.isFinite(book.availableCopies) &&
          Number.isFinite(book.totalCopies) && (
            <span className="availability">
              {book.availableCopies} of {book.totalCopies} available
            </span>
          )}
      </div>
    </article>
  );
}

async function fetchBooks(query = "") {
  const response = await fetch(
    `${API_URL}/api/books?q=${encodeURIComponent(query)}`
  );
  return readJson(response, "The server could not load the books.");
}

export default function Catalog() {
  const [query, setQuery] = useState("");
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchBooks()
      .then(setBooks)
      .catch(() => setError("Could not connect to the library server."))
      .finally(() => setLoading(false));
  }, []);

  async function handleSearch(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      setBooks(await fetchBooks(query));
    } catch {
      setError("Could not connect to the library server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="catalog" id="catalog">
      <div className="section-heading">
        <div>
          <p className="eyebrow">THE CATALOG</p>
          <h2>Books for curious minds</h2>
        </div>
        <span className="book-count">
          {books.length} books <span aria-hidden="true">↗</span>
        </span>
      </div>

      <form className="search catalog-search" onSubmit={handleSearch}>
        <span className="search-icon" aria-hidden="true">⌕</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by title, author, or topic"
          aria-label="Search books"
        />
        <button type="submit" disabled={loading}>
          {loading ? "Searching…" : "Search"}{" "}
          <span aria-hidden="true">→</span>
        </button>
      </form>

      {loading && <p className="message">Loading books…</p>}
      {error && (
        <p className="message error" role="alert">
          {error}
        </p>
      )}
      {!loading && !error && books.length === 0 && (
        <p className="message">No books found. Try another search.</p>
      )}

      <div className="book-grid">
        {books.map((book) => (
          <BookCard book={book} key={book.id} />
        ))}
      </div>
    </section>
  );
}
