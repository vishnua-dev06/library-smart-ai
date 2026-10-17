import { useEffect, useState } from "react";
import "./App.css";

const API_URL = "http://localhost:5000";

async function getBooks(query = "") {
  const response = await fetch(
    `${API_URL}/api/books?q=${encodeURIComponent(query)}`
  );

  if (!response.ok) {
    throw new Error("The server could not load the books.");
  }

  return response.json();
}

function App() {
  const [query, setQuery] = useState("");
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getBooks()
      .then(setBooks)
      .catch(() => setError("Could not connect to the library server."))
      .finally(() => setLoading(false));
  }, []);

  async function handleSearch(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      setBooks(await getBooks(query));
    } catch {
      setError("Could not connect to the library server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <header className="hero">
        <p className="eyebrow">YOUR CAMPUS LIBRARY, REIMAGINED</p>
        <h1>Find your next great read.</h1>
        <p>Search books by title, author, or topic.</p>

        <form className="search" onSubmit={handleSearch}>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Try “Python” or “Robotics”"
            aria-label="Search books"
          />
          <button type="submit" disabled={loading}>
            Search
          </button>
        </form>
      </header>

      <section className="catalog">
        <div className="section-heading">
          <div>
            <p className="eyebrow">THE CATALOG</p>
            <h2>Books for curious minds</h2>
          </div>
          <span>{books.length} books</span>
        </div>

        {loading && <p className="message">Loading books…</p>}
        {error && <p className="message error">{error}</p>}
        {!loading && !error && books.length === 0 && (
          <p className="message">No books found. Try another search.</p>
        )}

        <div className="book-grid">
          {books.map((book) => (
            <article className="book-card" key={book.id}>
              <span className="category">{book.category}</span>
              <h3>{book.title}</h3>
              <p className="author">by {book.author}</p>
              <p className="description">{book.description}</p>
              <div className="book-footer">
                <span className="level">{book.level}</span>
                <span className="availability">
                  {book.availableCopies} of {book.totalCopies} available
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export default App;