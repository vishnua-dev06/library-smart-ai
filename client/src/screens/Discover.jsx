import { useState } from "react";
import { API_URL, readJson } from "../api";
import { PathStepCard } from "../components/PathStepCard";

function RecommendationCard({ book, rank }) {
  return (
    <article className="recommendation-card">
      <div className="recommendation-card-heading">
        <span className="recommendation-rank">0{rank}</span>
        <span className="category">{book.category}</span>
        <span className="recommendation-score">
          {Math.round(book.score * 100)}% match
        </span>
      </div>
      <h4>{book.title}</h4>
      <p className="author">by {book.author}</p>
      <p className="recommendation-reason">{book.reason}</p>
      <div className="book-footer">
        <span className="level">{book.level}</span>
        <span className="availability">{book.availableCopies} available</span>
      </div>
    </article>
  );
}

export default function Discover({ onSavePath }) {
  // ── AI Recommend state ──────────────────────────────────────────────────
  const [recommendationQuery, setRecommendationQuery] = useState("");
  const [recommendations, setRecommendations] = useState([]);
  const [recommendationSource, setRecommendationSource] = useState("");
  const [recommendationsRequested, setRecommendationsRequested] = useState(false);
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [recommendationError, setRecommendationError] = useState("");

  // ── Learning Path state ─────────────────────────────────────────────────
  const [pathGoal, setPathGoal] = useState("");
  const [pathLevel, setPathLevel] = useState("beginner");
  const [pathSteps, setPathSteps] = useState([]);
  const [pathSource, setPathSource] = useState("");
  const [pathLoading, setPathLoading] = useState(false);
  const [pathError, setPathError] = useState("");
  const [pathRequested, setPathRequested] = useState(false);
  const [pathSaved, setPathSaved] = useState(false);

  // ── Handlers ────────────────────────────────────────────────────────────
  async function handleRecommendations(event) {
    event.preventDefault();
    setRecommendationLoading(true);
    setRecommendationError("");
    setRecommendations([]);
    setRecommendationSource("");
    setRecommendationsRequested(false);

    try {
      const response = await fetch(`${API_URL}/api/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: recommendationQuery.trim() }),
      });
      const data = await readJson(
        response,
        "The server could not find recommendations."
      );

      if (
        !data ||
        typeof data !== "object" ||
        typeof data.query !== "string" ||
        !["ai", "fallback"].includes(data.source) ||
        !Array.isArray(data.recommendations)
      ) {
        throw new Error(
          "The server returned an invalid recommendations response."
        );
      }

      const validRecommendations = data.recommendations.every(
        (book) =>
          book &&
          typeof book.bookId === "string" &&
          typeof book.title === "string" &&
          typeof book.author === "string" &&
          typeof book.category === "string" &&
          typeof book.level === "string" &&
          Number.isFinite(book.availableCopies) &&
          typeof book.reason === "string" &&
          book.reason.trim() &&
          Number.isFinite(book.score) &&
          book.score >= 0 &&
          book.score <= 1
      );

      if (!validRecommendations) {
        throw new Error("The server returned an invalid recommendation.");
      }

      setRecommendations(data.recommendations);
      setRecommendationSource(data.source);
      setRecommendationsRequested(true);
    } catch (requestError) {
      setRecommendationError(
        requestError.message ||
          "Could not connect to the recommendation service."
      );
    } finally {
      setRecommendationLoading(false);
    }
  }

  async function handleLearningPath(event) {
    event.preventDefault();
    setPathLoading(true);
    setPathError("");
    setPathSteps([]);
    setPathSource("");
    setPathRequested(false);
    setPathSaved(false);

    try {
      const response = await fetch(`${API_URL}/api/reading-path`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: pathGoal.trim(), level: pathLevel }),
      });
      const data = await readJson(
        response,
        "The server could not build a learning path."
      );

      if (
        !data ||
        typeof data !== "object" ||
        typeof data.goal !== "string" ||
        !["ai", "fallback"].includes(data.source) ||
        !Array.isArray(data.steps)
      ) {
        throw new Error(
          "The server returned an invalid learning path response."
        );
      }

      const validSteps = data.steps.every(
        (s) =>
          s &&
          typeof s.step === "string" &&
          typeof s.bookId === "string" &&
          typeof s.title === "string" &&
          typeof s.author === "string" &&
          typeof s.category === "string" &&
          typeof s.level === "string" &&
          typeof s.reason === "string" &&
          s.reason.trim()
      );
      if (!validSteps) {
        throw new Error("The server returned an invalid learning path step.");
      }

      setPathSteps(data.steps);
      setPathSource(data.source);
      setPathRequested(true);
    } catch (requestError) {
      setPathError(
        requestError.message ||
          "Could not connect to the learning path service."
      );
    } finally {
      setPathLoading(false);
    }
  }

  function handleSavePath() {
    onSavePath({
      goal: pathGoal.trim(),
      level: pathLevel,
      source: pathSource,
      steps: pathSteps,
    });
    setPathSaved(true);
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <>
      {/* Hero */}
      <section className="hero">
        <div className="hero-content">
          <p className="eyebrow">
            <span className="eyebrow-dot" /> YOUR CAMPUS LIBRARY, REIMAGINED
          </p>
          <h1>
            Big ideas start
            <br />
            with <span>the right book.</span>
          </h1>
          <p className="hero-copy">
            Get AI-powered book picks and personalised learning paths from your
            campus collection.
          </p>
          <a className="hero-cta" href="#catalog">
            Browse the catalog <span aria-hidden="true">↗</span>
          </a>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="art-orbit orbit-one" />
          <div className="art-orbit orbit-two" />
          <div className="art-book">
            <span className="art-book-label">
              A WORLD
              <br />
              OF IDEAS
            </span>
            <span className="art-book-line" />
            <span className="art-book-small">LIBRARY / EST. 2024</span>
          </div>
          <span className="art-star star-one">✳</span>
          <span className="art-star star-two">✦</span>
          <span className="art-caption">
            TURN THE PAGE
            <br />
            TO WHAT&apos;S NEXT
          </span>
        </div>
      </section>

      {/* AI Recommend */}
      <section
        className="recommend-section"
        aria-labelledby="recommend-heading"
      >
        <div className="recommend-intro">
          <p className="eyebrow">A LITTLE HELP FROM AI</p>
          <h2 id="recommend-heading">Not sure what to read?</h2>
          <p>Tell us what you&apos;re curious about. We&apos;ll find a book to match.</p>
        </div>
        <form className="recommend-form" onSubmit={handleRecommendations}>
          <label className="visually-hidden" htmlFor="recommendation-query">
            Ask for a book recommendation
          </label>
          <textarea
            id="recommendation-query"
            value={recommendationQuery}
            onChange={(event) => setRecommendationQuery(event.target.value)}
            placeholder="Tell us what you'd like to read or learn about…"
            rows={2}
            required
          />
          <button type="submit" disabled={recommendationLoading}>
            {recommendationLoading ? "Finding…" : "Get recommendations"}
            <span aria-hidden="true">→</span>
          </button>
        </form>
        {recommendationLoading && (
          <p className="message recommendation-status" role="status">
            Finding books that fit your prompt…
          </p>
        )}
        {recommendationError && (
          <p className="message error" role="alert">
            {recommendationError}
          </p>
        )}
        {recommendations.length > 0 && (
          <div className="recommendation-results" aria-live="polite">
            <div className="recommendation-results-heading">
              <h3>Your reading list</h3>
              <span
                className={`recommendation-source source-${recommendationSource}`}
              >
                {recommendationSource === "ai" ? "AI matched" : "Keyword matched"}
              </span>
            </div>
            <div className="recommendation-grid">
              {recommendations.map((book, index) => (
                <RecommendationCard
                  book={book}
                  rank={index + 1}
                  key={book.bookId}
                />
              ))}
            </div>
          </div>
        )}
        {!recommendationLoading &&
          recommendationsRequested &&
          !recommendationError &&
          recommendations.length === 0 && (
            <p className="message">
              No recommendations found. Try another topic.
            </p>
          )}
      </section>

      {/* Learning Path */}
      <section
        className="learning-path-section"
        aria-labelledby="learning-path-heading"
      >
        <div className="learning-path-intro">
          <p className="eyebrow">LIBRA LEARNING PATH</p>
          <h2 id="learning-path-heading">Your personalised reading journey</h2>
          <p>
            Enter a learning goal and choose your level. We&apos;ll build a
            step-by-step path — Start, Practice, Go Deeper — using real books
            from the catalog.
          </p>
        </div>
        <form className="learning-path-form" onSubmit={handleLearningPath}>
          <label className="visually-hidden" htmlFor="path-goal">
            Learning goal
          </label>
          <input
            id="path-goal"
            className="path-goal-input"
            value={pathGoal}
            onChange={(event) => setPathGoal(event.target.value)}
            placeholder={`What do you want to learn? e.g. "build a robot from scratch"`}
            required
          />
          <select
            id="path-level"
            className="path-level-select"
            value={pathLevel}
            onChange={(event) => setPathLevel(event.target.value)}
            aria-label="Choose your level"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
          <button type="submit" disabled={pathLoading}>
            {pathLoading ? "Building…" : "Build my path"}
            <span aria-hidden="true">→</span>
          </button>
        </form>
        {pathLoading && (
          <p className="message" role="status">
            Building your learning path…
          </p>
        )}
        {pathError && (
          <p className="message error" role="alert">
            {pathError}
          </p>
        )}
        {pathSteps.length > 0 && (
          <div className="path-results" aria-live="polite">
            <div className="path-results-heading">
              <h3>Your learning path</h3>
              <span className={`recommendation-source source-${pathSource}`}>
                {pathSource === "ai" ? "AI curated" : "Catalog matched"}
              </span>
            </div>
            <div className="path-steps-grid">
              {pathSteps.map((stepData) => (
                <PathStepCard key={stepData.step} stepData={stepData} />
              ))}
            </div>
            <div className="path-save-row">
              {pathSaved ? (
                <p className="path-saved-confirm">
                  ✓ Saved to{" "}
                  <a href="#my-paths">My Paths</a>
                </p>
              ) : (
                <button
                  className="path-save-btn"
                  type="button"
                  onClick={handleSavePath}
                >
                  Save to My Paths <span aria-hidden="true">→</span>
                </button>
              )}
            </div>
          </div>
        )}
        {!pathLoading &&
          pathRequested &&
          !pathError &&
          pathSteps.length === 0 && (
            <p className="message">
              No path found for this goal. Try a different topic.
            </p>
          )}
      </section>
    </>
  );
}
