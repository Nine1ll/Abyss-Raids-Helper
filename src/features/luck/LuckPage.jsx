import React, { useContext, useState } from "react";
import { ThemeContext } from "../../context/ThemeContext";
import RaidSection from "./components/RaidSection";
import DungeonSection from "./components/DungeonSection";
import ProcessingSection from "./components/ProcessingSection";

const LuckPage = () => {
  const { darkMode, setDarkMode } = useContext(ThemeContext);
  const [tab, setTab] = useState("raid"); // raid | dungeon | process

  return (
    <div className="sugar-view luck-view">

        <div className={`info-box ${darkMode ? "dark" : ""}`}>
        어비스 레이드, 어비스 던전, 시즈나이트 가공 기준으로
        오늘 내 보상이 통계적으로 어느 정도 구간인지 확인해보는 페이지입니다.
      </div>  
      <h1>🍪 CTOA:오늘의 운빨</h1>

      <div className={`view-tabs ${darkMode ? "dark" : ""}`}>
        <button
          type="button"
          className={tab === "raid" ? "active" : ""}
          onClick={() => setTab("raid")}
        >
          어비스 레이드 기준
        </button>
        <button
          type="button"
          className={tab === "dungeon" ? "active" : ""}
          onClick={() => setTab("dungeon")}
        >
          어비스 던전 기준
        </button>
        <button
          type="button"
          className={tab === "process" ? "active" : ""}
          onClick={() => setTab("process")}
        >
          시즈나이트 가공 기준
        </button>
      </div>
            {/* 라이트 / 다크 토글 */}
      <div className="theme-toggle-right">
        <div className="theme-toggle">
          <button
            type="button"
            className={`theme-chip ${!darkMode ? "active" : ""}`}
            onClick={() => setDarkMode(false)}
          >
            ☀️ 라이트
          </button>
          <button
            type="button"
            className={`theme-chip ${darkMode ? "active" : ""}`}
            onClick={() => setDarkMode(true)}
          >
            🌙 다크
          </button>
        </div>
      </div>

      {tab === "raid" && <RaidSection />}
      {tab === "dungeon" && <DungeonSection />}
      {tab === "process" && <ProcessingSection />}
    </div>

    

  );
};

export default LuckPage;
