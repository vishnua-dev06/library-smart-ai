import { useEffect, useState } from "react";
import "./App.css";
import Discover from "./screens/Discover";
import Catalog from "./screens/Catalog";
import MyPaths from "./screens/MyPaths";

const SCREENS = [
  { hash: "#discover", label: "Discover" },
  { hash: "#catalog", label: "Catalog" },
  { hash: "#my-paths", label: "My Paths" },
];

const VALID_HASHES = SCREENS.map((s) => s.hash);

function useHash() {
  const [hash, setHash] = useState(() => {
    const h = window.location.hash;
    return VALID_HASHES.includes(h) ? h : "#discover";
  });

  useEffect(() => {
    function handleHashChange() {
      const h = window.location.hash;
      setHash(VALID_HASHES.includes(h) ? h : "#discover");
    }
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  return hash;
}

export default function App() {
  const screen = useHash();

  const [savedPaths, setSavedPaths] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("libraPaths") || "[]");
    } catch {
      return [];
    }
  });

  function savePath(path) {
    setSavedPaths((prev) => {
      const next = [
        { ...path, savedAt: Date.now(), completedSteps: [] },
        ...prev,
      ];
      localStorage.setItem("libraPaths", JSON.stringify(next));
      return next;
    });
  }

  function updatePath(index, updatedPath) {
    setSavedPaths((prev) => {
      const next = prev.map((p, i) => (i === index ? updatedPath : p));
      localStorage.setItem("libraPaths", JSON.stringify(next));
      return next;
    });
  }

  function deletePath(index) {
    setSavedPaths((prev) => {
      const next = prev.filter((_, i) => i !== index);
      localStorage.setItem("libraPaths", JSON.stringify(next));
      return next;
    });
  }

  return (
    <div className="page">
      <header className="site-nav">
        <a className="brand" href="#discover" aria-label="LibraAI home">
          <span className="brand-mark" aria-hidden="true">L</span>
          <span>
            Libra<span className="brand-accent">AI</span>
          </span>
        </a>
        <nav aria-label="Main navigation">
          <ul className="nav-links" role="list">
            {SCREENS.map(({ hash, label }) => (
              <li key={hash}>
                <a
                  href={hash}
                  className={`nav-link${screen === hash ? " nav-link-active" : ""}`}
                  aria-current={screen === hash ? "page" : undefined}
                >
                  {label}
                  {hash === "#my-paths" && savedPaths.length > 0 && (
                    <span className="nav-badge">{savedPaths.length}</span>
                  )}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main>
        {screen === "#discover" && <Discover onSavePath={savePath} />}
        {screen === "#catalog" && <Catalog />}
        {screen === "#my-paths" && (
          <MyPaths
            paths={savedPaths}
            onUpdate={updatePath}
            onDelete={deletePath}
          />
        )}
      </main>

      <footer className="site-footer">
        <a className="brand" href="#discover" aria-label="LibraAI home">
          <span className="brand-mark" aria-hidden="true">L</span>
          <span>
            Libra<span className="brand-accent">AI</span>
          </span>
        </a>
        <p>Good books. Bright futures.</p>
      </footer>
    </div>
  );
}