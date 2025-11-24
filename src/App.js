import React, { useContext, useState } from "react";
import { ThemeContext } from "./context/ThemeContext";
import SiegeSimulator from "./components/SiegeSimulator";
import SugarOptimizer from "./components/SugarOptimizer";
import LuckMeter from "./components/LuckMeter";
import "./App.css";

const App = () => {
  const { darkMode } = useContext(ThemeContext);
  const [activeView, setActiveView] = useState("siege");

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
        <button
          className={activeView === "luck" ? "active" : ""}
          onClick={() => setActiveView("luck")}
        >
          오늘의 운세 측정기
        </button>
      </div>

      {activeView === "siege" && <SiegeSimulator />}
      {activeView === "sugar" && <SugarOptimizer />}
      {activeView === "luck" && <LuckMeter onNavigate={setActiveView} />}
    </div>
  );
};

export default App;
