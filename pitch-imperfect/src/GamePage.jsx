import { useLocation, useNavigate } from "react-router-dom";
import "./App.css";

export default function GamePage() {
  const location = useLocation();
  const navigate = useNavigate();

  const mode = location.state?.mode || "solo";
  const selectedSong = location.state?.selectedSong || "Unknown Song";

  const handleBack = () => {
    navigate("/");
  };

  return (
    <div className="container">
      <h1 className="title">Pitch Imperfect</h1>

      <p className="subtitle">
        Now playing: <strong>{selectedSong}</strong>{" "}
        {mode === "duo" ? "(Duo Mode)" : "(Solo Mode)"}
      </p>

      <div className="card game-card">
        <div className="game-top">
          <div className="score-panel">
            <h2>Score</h2>
            <p className="score-value">000,000</p>
            <p className="grade-label">Grade: —</p>
          </div>
          <div className="status-panel">
            <h2>Live Feedback</h2>
            <p className="feedback-tag">Waiting for vocals… 🎙️</p>
            <p className="feedback-mini">
              (UI mock only — pitch magic coming soon!)
            </p>
          </div>
        </div>

        <div className="lyrics-panel">
          <p className="lyrics-label">Current line</p>
          <p className="lyrics-main">♪ Never gonna give you up… ♪</p>
          <p className="lyrics-next">Next: Never gonna let you down…</p>
        </div>

        <div className="pitch-visualizer">
          <p className="visualizer-label">Pitch bar (preview)</p>
          <div className="visualizer-bar">
            <div className="visualizer-fill" />
          </div>
          <p className="visualizer-note">Target: G4 · Your pitch: —</p>
        </div>

        <button className="back-btn" onClick={handleBack}>
          ⬅ Back to Song Select
        </button>
      </div>
    </div>
  );
}
