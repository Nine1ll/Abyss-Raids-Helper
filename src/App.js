import React, { useContext, useState } from "react";
import { ThemeContext } from "./context/ThemeContext";
import SiegeSimulator from "./components/SiegeSimulator";
import SugarOptimizer from "./components/SugarOptimizer";
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
      </div>

      {activeView === "siege" ? <SiegeSimulator /> : <SugarOptimizer />}
    </div>
  );
};

export default App;
