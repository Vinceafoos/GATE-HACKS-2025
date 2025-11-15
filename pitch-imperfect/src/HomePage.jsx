import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./App.css";

const SONGS = [
  "Never Gonna Give You Up",
  "Take On Me",
  "Bad Romance",
  "Bohemian Rhapsody",
];

export default function HomePage() {
  const [mode, setMode] = useState("solo");
  const [selectedSong, setSelectedSong] = useState(SONGS[0]);
  const navigate = useNavigate();

  const handleStart = () => {
    navigate("/play", {
      state: { mode, selectedSong },
    });
  };

  return (
    <div className="container">
      <h1 className="title">Pitch Imperfect</h1>

      <p className="subtitle">
        The karaoke game that loves your voice… no matter how questionable.
      </p>

      <div className="card">
        <h2>Choose Mode</h2>
        <div className="mode-select">
          <button
            className={mode === "solo" ? "active" : ""}
            onClick={() => setMode("solo")}
          >
            Solo
          </button>

          <button
            className={mode === "duo" ? "active" : ""}
            onClick={() => setMode("duo")}
          >
            Duo
          </button>
        </div>

        <h2>Select Your Anthem</h2>
        <select
          value={selectedSong}
          onChange={(e) => setSelectedSong(e.target.value)}
        >
          {SONGS.map((song) => (
            <option key={song}>{song}</option>
          ))}
        </select>

        <button className="start-btn" onClick={handleStart}>
          Start Singing 🎤
        </button>
      </div>
    </div>
  );
}
