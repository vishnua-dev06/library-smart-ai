export function PathStepCard({ stepData }) {
  const {
    step,
    title,
    author,
    category,
    level,
    availableCopies,
    totalCopies,
    reason,
  } = stepData;

  return (
    <article className="path-step-card">
      <div className="path-step-header">
        <span className="path-step-label">{step}</span>
        <span className="category">{category}</span>
      </div>
      <h4>{title}</h4>
      <p className="author">by {author}</p>
      <p className="path-step-reason">{reason}</p>
      <div className="book-footer">
        <span className="level">{level}</span>
        {Number.isFinite(availableCopies) && (
          <span className="availability">
            {availableCopies}
            {Number.isFinite(totalCopies) ? ` of ${totalCopies}` : ""} available
          </span>
        )}
      </div>
    </article>
  );
}
