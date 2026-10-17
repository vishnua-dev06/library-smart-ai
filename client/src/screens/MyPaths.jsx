import { PathStepCard } from "../components/PathStepCard";

function formatDate(ts) {
  return new Date(ts).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function SavedPathCard({ path, index, onUpdate, onDelete }) {
  const completedSteps = path.completedSteps || [];
  const total = path.steps.length;
  const done = completedSteps.length;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  function toggleStep(stepLabel) {
    const next = completedSteps.includes(stepLabel)
      ? completedSteps.filter((s) => s !== stepLabel)
      : [...completedSteps, stepLabel];
    onUpdate(index, { ...path, completedSteps: next });
  }

  return (
    <article className="saved-path-card">
      <div className="saved-path-header">
        <div className="saved-path-meta">
          <h3 className="saved-path-goal">{path.goal}</h3>
          <div className="saved-path-tags">
            <span className="path-level-badge">{path.level}</span>
            <span className={`recommendation-source source-${path.source}`}>
              {path.source === "ai" ? "AI curated" : "Catalog matched"}
            </span>
            <span className="saved-path-date">
              Saved {formatDate(path.savedAt)}
            </span>
          </div>
        </div>
        <button
          className="saved-path-delete"
          type="button"
          onClick={() => onDelete(index)}
          aria-label={`Delete path: ${path.goal}`}
          title="Delete path"
        >
          ✕
        </button>
      </div>

      <div className="saved-path-progress">
        <div className="progress-bar-track">
          <div
            className="progress-bar-fill"
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
        <span className="progress-label">
          {done} of {total} complete
        </span>
      </div>

      <div className="saved-path-steps">
        {path.steps.map((stepData) => {
          const isDone = completedSteps.includes(stepData.step);
          return (
            <div
              key={stepData.step}
              className={`saved-step-row${isDone ? " saved-step-done" : ""}`}
            >
              <label className="saved-step-checkbox-label">
                <input
                  type="checkbox"
                  checked={isDone}
                  onChange={() => toggleStep(stepData.step)}
                  aria-label={`Mark "${stepData.step}" as ${isDone ? "incomplete" : "complete"}`}
                />
                <span className="path-step-label">{stepData.step}</span>
              </label>
              <div className="saved-step-book">
                <span className="saved-step-title">{stepData.title}</span>
                <span className="saved-step-author">by {stepData.author}</span>
              </div>
              {Number.isFinite(stepData.availableCopies) && (
                <span
                  className={`saved-step-avail${
                    stepData.availableCopies === 0 ? " unavailable" : ""
                  }`}
                >
                  {stepData.availableCopies === 0
                    ? "Checked out"
                    : `${stepData.availableCopies} available`}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Expanded step cards below the checklist */}
      {path.steps.length > 0 && (
        <div className="saved-path-cards">
          <div className="path-steps-grid">
            {path.steps.map((stepData) => (
              <PathStepCard key={stepData.step} stepData={stepData} />
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

export default function MyPaths({ paths, onUpdate, onDelete }) {
  if (paths.length === 0) {
    return (
      <section className="my-paths-screen">
        <div className="section-heading">
          <div>
            <p className="eyebrow">MY PATHS</p>
            <h2>Your saved learning paths</h2>
          </div>
        </div>
        <div className="my-paths-empty">
          <p className="my-paths-empty-title">No saved paths yet.</p>
          <p>
            Build a learning path on the{" "}
            <a href="#discover">Discover</a> screen and save it here.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="my-paths-screen">
      <div className="section-heading">
        <div>
          <p className="eyebrow">MY PATHS</p>
          <h2>Your saved learning paths</h2>
        </div>
        <span className="book-count">
          {paths.length} {paths.length === 1 ? "path" : "paths"}{" "}
          <span aria-hidden="true">↗</span>
        </span>
      </div>
      <div className="saved-paths-list">
        {paths.map((path, index) => (
          <SavedPathCard
            key={path.savedAt}
            path={path}
            index={index}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        ))}
      </div>
    </section>
  );
}
