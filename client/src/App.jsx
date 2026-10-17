import { useEffect, useState } from "react";
import "./App.css";

const API_URL = "http://localhost:5000";

async function readJson(response, fallbackMessage) {
  let data;

  try {
    data = await response.json();
  } catch {
    if (!response.ok) {
      throw new Error(fallbackMessage);
    }
    throw new Error("The server returned an invalid response.");
  }

  if (!response.ok) {
    throw new Error(data.error || fallbackMessage);
  }

  return data;
}

async function getBooks(query = "") {
  const response = await fetch(
    `${API_URL}/api/books?q=${encodeURIComponent(query)}`
  );

  return readJson(response, "The server could not load the books.");
}

function BookCard({ book }) {
  return (
    <article className="book-card" key={book.id}>
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

function App() {
  const [query, setQuery] = useState("");
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [recommendationQuery, setRecommendationQuery] = useState("");
  const [recommendations, setRecommendations] = useState([]);
  const [recommendationsRequested, setRecommendationsRequested] = useState(false);
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [recommendationError, setRecommendationError] = useState("");

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

  async function handleRecommendations(event) {
    event.preventDefault();
    setRecommendationsRequested(true);
    setRecommendationLoading(true);
    setRecommendationError("");
    setRecommendations([]);

    try {
      const response = await fetch(`${API_URL}/api/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: recommendationQuery }),
      });
      const data = await readJson(
        response,
        "The server could not find recommendations."
      );
      const results = Array.isArray(data) ? data : data.recommendations;

      if (!Array.isArray(results)) {
        throw new Error("The recommendation response was not a list of books.");
      }

      setRecommendations(results);
    } catch (requestError) {
      setRecommendationError(
        requestError.message || "Could not connect to the recommendation service."
      );
    } finally {
      setRecommendationLoading(false);
    }
  }

  return (
    <main className="page">
      <header className="site-header">
        <a className="brand" href="/" aria-label="LibraAI home">
          <span className="brand-mark" aria-hidden="true">L</span>
          <span>Libra<span className="brand-accent">AI</span></span>
        </a>
        <a className="header-link" href="#catalog">Explore the catalog <span aria-hidden="true">↗</span></a>
      </header>

      <section className="hero">
        <div className="hero-content">
          <p className="eyebrow"><span className="eyebrow-dot" /> YOUR CAMPUS LIBRARY, REIMAGINED</p>
          <h1>Big ideas start<br />with <span>the right book.</span></h1>
          <p className="hero-copy">
            Find your next read from a collection curated for curious minds.
          </p>

          <form className="search" onSubmit={handleSearch}>
            <span className="search-icon" aria-hidden="true">⌕</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by title, author, or topic"
              aria-label="Search books"
            />
            <button type="submit" disabled={loading}>
              {loading ? "Searching…" : "Search"} <span aria-hidden="true">→</span>
            </button>
          </form>
          <p className="search-hint">Try “Python”, “Robotics”, or “Embedded Systems”</p>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="art-orbit orbit-one" />
          <div className="art-orbit orbit-two" />
          <div className="art-book">
            <span className="art-book-label">A WORLD<br />OF IDEAS</span>
            <span className="art-book-line" />
            <span className="art-book-small">LIBRARY / EST. 2024</span>
          </div>
          <span className="art-star star-one">✳</span>
          <span className="art-star star-two">✦</span>
          <span className="art-caption">TURN THE PAGE<br />TO WHAT&apos;S NEXT</span>
        </div>
      </section>

      <section className="recommend-section" aria-labelledby="recommend-heading">
        <div className="recommend-intro">
          <p className="eyebrow">A LITTLE HELP FROM AI</p>
          <h2 id="recommend-heading">Not sure what to read?</h2>
          <p>Tell us what you’re curious about. We’ll find a book to match.</p>
        </div>
        <form className="recommend-form" onSubmit={handleRecommendations}>
          <label className="visually-hidden" htmlFor="recommendation-query">
            What would you like to learn about?
          </label>
          <input
            id="recommendation-query"
            value={recommendationQuery}
            onChange={(event) => setRecommendationQuery(event.target.value)}
            placeholder="e.g. I want to build my first robot"
            required
          />
          <button type="submit" disabled={recommendationLoading}>
            {recommendationLoading ? "Finding…" : "Get recommendations"}
            <span aria-hidden="true">→</span>
          </button>
        </form>
        {recommendationError && (
          <p className="message error" role="alert">{recommendationError}</p>
        )}
        {recommendations.length > 0 && (
          <div className="recommendation-results">
            <h3>Your reading list</h3>
            <div className="book-grid">
              {recommendations.map((book) => (
                <BookCard book={book} key={book.id || book.title} />
              ))}
            </div>
          </div>
        )}
        {!recommendationLoading &&
          recommendationsRequested &&
          !recommendationError &&
          recommendations.length === 0 && (
            <p className="message">No recommendations found. Try another topic.</p>
          )}
      </section>

      <section className="catalog" id="catalog">
        <div className="section-heading">
          <div>
            <p className="eyebrow">THE CATALOG</p>
            <h2>Books for curious minds</h2>
          </div>
          <span className="book-count">{books.length} books <span aria-hidden="true">↗</span></span>
        </div>

        {loading && <p className="message">Loading books…</p>}
        {error && <p className="message error" role="alert">{error}</p>}
        {!loading && !error && books.length === 0 && (
          <p className="message">No books found. Try another search.</p>
        )}

        <div className="book-grid">
          {books.map((book) => <BookCard book={book} key={book.id} />)}
        </div>
      </section>

      <footer className="site-footer">
        <a className="brand" href="/" aria-label="LibraAI home">
          <span className="brand-mark" aria-hidden="true">L</span>
          <span>Libra<span className="brand-accent">AI</span></span>
        </a>
        <p>Good books. Bright futures.</p>
      </footer>
    </main>
  );
}

export default App;