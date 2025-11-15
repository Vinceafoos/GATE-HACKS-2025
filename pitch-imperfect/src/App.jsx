import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { useState, useRef } from "react";
import "./App.css";
import { PitchDetector } from "pitchy";

const SONGS = [
  "Twinkle Twinkle Little Star",
  "Never Gonna Give You Up",
  "Take On Me",
  "Bad Romance",
  "Bohemian Rhapsody",
];

// Twinkle timing + real pitches
const TWINKLE_DATA = {
  audioSrc: "/twinkle.mp3",
  minFreq: 261.63, // C4
  maxFreq: 440.0,  // A4
  lines: [
    {
      text: "Twinkle, twinkle, little star,",
      start: 3.2,
      end: 8.5,
      targetFreq: 392.0, // G4
    },
    {
      text: "How I wonder what you are.",
      start: 8.5,
      end: 12.28,
      targetFreq: 329.63, // E4
    },
    {
      text: "Up above the world so high,",
      start: 12.28,
      end: 16.4,
      targetFreq: 349.23, // F4
    },
    {
      text: "Like a diamond in the sky.",
      start: 16.4,
      end: 20.4,
      targetFreq: 329.63, // E4
    },
    {
      text: "Twinkle, twinkle, little star,",
      start: 20.4,
      end: 24.3,
      targetFreq: 392.0, // G4
    },
    {
      text: "How I wonder what you are.",
      start: 24.3,
      end: 27.8,
      targetFreq: 329.63, // E4
    },
  ],
};

function Home() {
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

function Play() {
  const location = useLocation();
  const navigate = useNavigate();

  const mode = location.state?.mode || "solo";
  const selectedSong =
    location.state?.selectedSong || "Twinkle Twinkle Little Star";

  // Only Twinkle is wired up fully for now
  const songData = TWINKLE_DATA;

  // Audio playback for the backing track
  const audioRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);

  // Mic pitch detection state/refs
  const [userFreq, setUserFreq] = useState(null);
  const [micOn, setMicOn] = useState(false);

  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const detectorRef = useRef(null);
  const rafRef = useRef(null);
  const framesWithoutPitchRef = useRef(0);
  const streamRef = useRef(null);
  const currentLineRef = useRef(null); // NEW: track current line for scoring

  const handleBack = () => {
    navigate("/");
  };

  const handlePlayPause = () => {
    const audioEl = audioRef.current;
    if (!audioEl) return;

    if (isPlaying) {
      audioEl.pause();
      setIsPlaying(false);
    } else {
      // optional: reset score if starting from the beginning
      if (audioEl.currentTime < 0.5) {
        setScore(0);
      }
      audioEl.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    const audioEl = audioRef.current;
    if (!audioEl) return;
    setCurrentTime(audioEl.currentTime);
  };

  // Which lyric line is active right now?
  const currentLineIndex = songData.lines.findIndex(
    (line) => currentTime >= line.start && currentTime < line.end
  );
  const currentLine =
    currentLineIndex >= 0 ? songData.lines[currentLineIndex] : null;

  // Keep ref in sync for use in updatePitch
  currentLineRef.current = currentLine;

  // Target bar width based on targetFreq
  let barPercent = 0;
  if (currentLine) {
    const { targetFreq } = currentLine;
    const min = songData.minFreq;
    const max = songData.maxFreq;
    barPercent = ((targetFreq - min) / (max - min)) * 100;
    barPercent = Math.min(100, Math.max(0, barPercent));
  }

  // Grade based on score
  let grade = "—";
  if (score > 8000) grade = "S";
  else if (score > 6000) grade = "A";
  else if (score > 4000) grade = "B";
  else if (score > 2000) grade = "C";
  else if (score > 500) grade = "D";

  // Text labels for user pitch
  let pitchLabel = "";
  let qualityLabel = "";

  if (userFreq) {
    const rounded = Math.round(userFreq / 5) * 5; // snap to nearest 5 Hz
    pitchLabel = `${rounded.toFixed(0)} Hz`;
    if (currentLine && currentLine.targetFreq) {
      const diffRatio =
        Math.abs(userFreq - currentLine.targetFreq) / currentLine.targetFreq;

      if (diffRatio < 0.08) {
        qualityLabel = "Perfect ⭐";
      } else if (diffRatio < 0.18) {
        qualityLabel = "Good 👍";
      } else if (diffRatio < 0.30) {
        qualityLabel = "Okay 😅";
      } else {
        qualityLabel = "Off-key 😬";
      }
    } else {
      qualityLabel = "No line active";
    }
  } else if (micOn) {
    pitchLabel = "No stable pitch yet";
  } else {
    pitchLabel = "Mic off";
  }

  const handleToggleMic = async () => {
    // Turn mic OFF
    if (micOn) {
      setMicOn(false);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      analyserRef.current = null;
      dataArrayRef.current = null;
      detectorRef.current = null;
      framesWithoutPitchRef.current = 0;
      setUserFreq(null);
      return;
    }

    // Turn mic ON
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;

      const bufferLength = analyser.fftSize;
      const dataArray = new Float32Array(bufferLength);

      analyserRef.current = analyser;
      dataArrayRef.current = dataArray;

      const detector = PitchDetector.forFloat32Array(bufferLength);
      detectorRef.current = detector;

      source.connect(analyser);

      const updatePitch = () => {
        if (
          !analyserRef.current ||
          !dataArrayRef.current ||
          !detectorRef.current
        ) {
          return;
        }

        analyserRef.current.getFloatTimeDomainData(dataArrayRef.current);
        const [freq, clarity] = detectorRef.current.findPitch(
          dataArrayRef.current,
          audioCtx.sampleRate
        );

        if (clarity > 0.7 && freq > 50 && freq < 1000) {
          framesWithoutPitchRef.current = 0;

          // Smooth the frequency
          setUserFreq((prev) => {
            if (!prev) return freq;
            return prev * 0.9 + freq * 0.1; // heavier smoothing
          });

          // 💯 SCORING: use live current line from ref
          const line = currentLineRef.current;
          if (line && line.targetFreq) {
            const diffRatio =
              Math.abs(freq - line.targetFreq) / line.targetFreq;

            let delta = 0;
            if (diffRatio < 0.08) {
              delta = 15;
            } else if (diffRatio < 0.18) {
              delta = 8;
            } else if (diffRatio < 0.30) {
              delta = 4;
            }

            if (delta > 0) {
              setScore((prev) => prev + delta);
            }
          }
        } else {
          framesWithoutPitchRef.current += 1;
          if (framesWithoutPitchRef.current > 20) {
            setUserFreq(null);
          }
        }

        rafRef.current = requestAnimationFrame(updatePitch);
      };

      setMicOn(true);
      updatePitch();
    } catch (err) {
      console.error("Could not access microphone", err);
      alert("Microphone access denied or unavailable.");
    }
  };

  return (
    <div className="container">
      <h1 className="title">Pitch Imperfect</h1>

      <p className="subtitle">
        Now playing: <strong>{selectedSong}</strong>{" "}
        {mode === "duo" ? "(Duo Mode)" : "(Solo Mode)"}
      </p>

      <audio
        ref={audioRef}
        src={songData.audioSrc}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setIsPlaying(false)}
      />

      <div className="card game-card">
        <div className="game-top">
          <div className="score-panel">
            <h2>Score</h2>
            <p className="score-value">
              {String(score).padStart(6, "0")}
            </p>
            <p className="grade-label">Grade: {grade}</p>
          </div>
        </div>

        <div className="lyrics-panel">
          <p className="lyrics-label">Lyrics</p>
          {songData.lines.map((line, idx) => {
            const isActive = idx === currentLineIndex;
            return (
              <p
                key={idx}
                className={isActive ? "lyrics-line active-line" : "lyrics-line"}
              >
                {line.text}
              </p>
            );
          })}
        </div>

        <div className="pitch-visualizer">
          <p className="visualizer-label">Target pitch vs your pitch</p>

          {/* Target bar */}
          <div className="visualizer-bar">
            <div
              className="visualizer-fill target-bar"
              style={{ width: `${barPercent || 5}%` }}
            />
          </div>
          <p className="visualizer-note">
            {currentLine
              ? `Target: ${currentLine.targetFreq.toFixed(1)} Hz`
              : "No line active yet"}
          </p>

          {/* User bar */}
          <div className="visualizer-bar" style={{ marginTop: "8px" }}>
            <div
              className="visualizer-fill user-bar"
              style={{
                width:
                  userFreq && currentLine
                    ? `${
                        ((Math.min(
                          Math.max(userFreq, songData.minFreq),
                          songData.maxFreq
                        ) -
                          songData.minFreq) /
                          (songData.maxFreq - songData.minFreq)) *
                        100
                      }%`
                    : "0%",
              }}
            />
          </div>

          <p className="visualizer-note">
            {micOn ? (
              userFreq ? (
                <>
                  You: {pitchLabel}{" "}
                  {qualityLabel && <>· {qualityLabel}</>}
                </>
              ) : (
                "Listening… no stable pitch yet"
              )
            ) : (
              "Mic off"
            )}
          </p>
        </div>

        <div
          style={{ marginTop: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}
        >
          <button className="start-btn" onClick={handlePlayPause}>
            {isPlaying ? "Pause ⏸️" : "Play ▶️"}
          </button>
          <button className="back-btn" onClick={handleBack}>
            ⬅ Back
          </button>
          <button
            className="back-btn"
            onClick={handleToggleMic}
            style={{ minWidth: "150px" }}
          >
            {micOn ? "Turn Mic Off 🎙️" : "Enable Mic 🎙️"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/play" element={<Play />} />
      </Routes>
    </BrowserRouter>
  );
}
