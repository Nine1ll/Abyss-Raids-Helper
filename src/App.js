import React, { useContext, useEffect, useState } from "react";
import { ThemeContext } from "./context/ThemeContext";
import SiegePage from "./features/siege/SiegePage";
import SugarPage from "./features/sugar/SugarPage";
import LuckPage from "./features/luck/LuckPage";
import "./App.css";

const STORAGE_KEY = "sugar-optimizer-state-v1";

const createInitialSugarState = () => {
  const defaultState = {
    blockedCells: null,
    playerRole: "dealer",
    pieces: [],
    boardImage: null,
    piecesImage: null,
    solution: null,
    newPiece: {
      modifier: null,
      grade: "rare",
    },
  };

  if (typeof window === "undefined") return defaultState;

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw);
    return {
      ...defaultState,
      ...parsed,
      blockedCells: parsed.blockedCells ? new Set(parsed.blockedCells) : null,
    };
  } catch {
    return defaultState;
  }
};

const App = () => {
  const { darkMode } = useContext(ThemeContext);
  const [activeView, setActiveView] = useState(() => {
    if (typeof window === "undefined") return "siege";
    const hash = window.location.hash;
    if (hash === "#sugar") return "sugar";
    if (hash === "#luck") return "luck";
    return "siege";
  });

  // hash 동기화
  useEffect(() => {
    if (activeView === "sugar") window.location.hash = "#sugar";
    else if (activeView === "luck") window.location.hash = "#luck";
    else window.location.hash = "#siege";
  }, [activeView]);

  useEffect(() => {
    const onHash = () => {
      const hash = window.location.hash;
      if (hash === "#sugar") setActiveView("sugar");
      else if (hash === "#luck") setActiveView("luck");
      else setActiveView("siege");
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const [sugarOptimizerState, setSugarOptimizerState] = useState(
    createInitialSugarState
  );

  useEffect(() => {
    try {
      const serializable = {
        ...sugarOptimizerState,
        blockedCells: sugarOptimizerState.blockedCells
          ? Array.from(sugarOptimizerState.blockedCells)
          : null,
        solution: null,
        boardImage: null,
        piecesImage: null,
      };
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
    } catch (e) {
      console.error("failed to save sugar optimizer state:", e);
    }
  }, [sugarOptimizerState]);

  return (
    <div className={`App ${darkMode ? "dark" : ""}`}>
      <div className="header-banner">
        <div className="header-buttons-center">
          <button
            type="button"
            className={`header-btn ${activeView === "siege" ? "active" : ""}`}
            onClick={() => setActiveView("siege")}
          >
            시즈나이트 선택지 최적화
          </button>
          <button
            type="button"
            className={`header-btn ${activeView === "sugar" ? "active" : ""}`}
            onClick={() => setActiveView("sugar")}
          >
            설탕 유리조각 최적 배치
          </button>
          <button
            type="button"
            className={`header-btn ${activeView === "luck" ? "active" : ""}`}
            onClick={() => setActiveView("luck")}
          >
            오늘의 운빨
          </button>
        </div>
      </div>

      {activeView === "siege" && <SiegePage />}
      {activeView === "sugar" && (
        <SugarPage
          appState={sugarOptimizerState}
          setAppState={setSugarOptimizerState}
        />
      )}
      {activeView === "luck" && <LuckPage />}
    </div>
  );
};

export default App;
