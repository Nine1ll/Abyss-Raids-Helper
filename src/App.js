import React, { useContext, useState } from "react";
import { ThemeContext } from "./context/ThemeContext";
import SiegeSimulator from "./components/SiegeSimulator";
import SugarOptimizer from "./components/SugarOptimizer";
import "./App.css";

const App = () => {
  const { darkMode, setDarkMode } = useContext(ThemeContext);
  const [activeView, setActiveView] = useState("siege");

  // SugarOptimizer의 상태를 App에서 관리
  const [sugarOptimizerState, setSugarOptimizerState] = useState({
    blockedCells: null, // 초기 상태는 null, SugarOptimizer에서 초기화
    playerRole: "dealer",
    pieces: [],
    boardImage: null,
    piecesImage: null,
    solution: null,
    newPiece: {
      modifier: null, // SugarOptimizer에서 초기화
      grade: "rare",
    },
  });

  return (
    <div className={`App ${darkMode ? "dark" : ""}`}>
      <div className={`view-tabs ${darkMode ? "dark" : ""}`}>
        <button
          className={activeView === "siege" ? "active" : ""}
          onClick={() => setActiveView("siege")}
        >
          시즈나이트 시뮬레이터
        </button>
        <button
          className={activeView === "sugar" ? "active" : ""}
          onClick={() => setActiveView("sugar")}
        >
          설탕 유리 배치 도우미
        </button>
      </div>

      {activeView === "siege" ? <SiegeSimulator /> : <SugarOptimizer appState={sugarOptimizerState} setAppState={setSugarOptimizerState} />}
    </div>
  );
};

export default App;