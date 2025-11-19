import React, { useContext, useState, useEffect } from "react";
import { ThemeContext } from "./context/ThemeContext";
import SiegeSimulator from "./components/SiegeSimulator";
import SugarOptimizer from "./components/SugarOptimizer";
import "./App.css";

const STORAGE_KEY = "sugar-optimizer-state-v1";

// SugarOptimizer용 초기 상태 생성 함수
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

  if (typeof window === "undefined") {
    return defaultState;
  }

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;

    const parsed = JSON.parse(raw);
    return {
      ...defaultState,
      ...parsed,
      // blockedCells는 Set으로 복원
      blockedCells: parsed.blockedCells
        ? new Set(parsed.blockedCells)
        : null,
    };
  } catch (e) {
    console.error("failed to load sugar optimizer state:", e);
    return defaultState;
  }
};

const App = () => {
  const { darkMode } = useContext(ThemeContext); // setDarkMode는 사용하지 않음

  // 상태를 URL 해시에서 초기화
  const [activeView, setActiveView] = useState(() => {
    const hash = window.location.hash;
    if (hash === "#sugar") {
      return "sugar";
    } else if (hash === "#siege") {
      return "siege";
    } else {
      return "siege"; // 기본값
    }
  });

  // activeView가 변경될 때 URL 해시도 업데이트
  useEffect(() => {
    window.location.hash = activeView;
  }, [activeView]);

  // URL 해시가 변경될 때 activeView 업데이트 (브라우저 뒤로가기/앞으로가기 대응)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === "#sugar" && activeView !== "sugar") {
        setActiveView("sugar");
      } else if (hash === "#siege" && activeView !== "siege") {
        setActiveView("siege");
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    // 초기 해시 확인 (예: 링크로 직접 접속한 경우)
    handleHashChange();

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, [activeView]);

  // 🔥 SugarOptimizer의 상태를 App에서 관리 + sessionStorage 연동
  const [sugarOptimizerState, setSugarOptimizerState] = useState(
    createInitialSugarState
  );

  // sugarOptimizerState 변할 때마다 sessionStorage에 저장
  useEffect(() => {
    try {
      const serializable = {
        ...sugarOptimizerState,
        // Set은 배열로 바꿔서 저장
        blockedCells: sugarOptimizerState.blockedCells
          ? Array.from(sugarOptimizerState.blockedCells)
          : null,
        // solution은 새로고침 후 다시 계산하도록 굳이 저장 안 함
        solution: null,
        // boardImage / piecesImage도 Object URL이라 새로고침 후엔 쓸모없어서 기본은 저장 X
        boardImage: null,
        piecesImage: null,
      };
      window.sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(serializable)
      );
    } catch (e) {
      console.error("failed to save sugar optimizer state:", e);
    }
  }, [sugarOptimizerState]);

  return (
    <div className={`App ${darkMode ? "dark" : ""}`}>
      {/* 상단 헤더: 시즈나이트 시뮬레이터 스타일 */}
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
        </div>
      </div>

      {activeView === "siege" ? (
        <SiegeSimulator />
      ) : (
        <SugarOptimizer
          appState={sugarOptimizerState}
          setAppState={setSugarOptimizerState}
        />
      )}
    </div>
  );
};

export default App;
