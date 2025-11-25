// src/features/luck/LuckPage.jsx (또는 네가 둔 위치)

import React, { useContext, useState } from "react";
import { ThemeContext } from "../../context/ThemeContext";
import RaidSection from "./components/RaidSection";
import DungeonSection from "./components/DungeonSection";
import ProcessingSection from "./components/ProcessingSection";

const LuckPage = () => {
  const { darkMode, setDarkMode } = useContext(ThemeContext);
  const [tab, setTab] = useState("raid"); // raid | dungeon | process

  const handleOpenNaverFortune = () => {
    // 👉 네이버 오늘의 운세 검색 페이지
    window.open(
      "https://m.search.naver.com/search.naver?query=%EC%98%A4%EB%8A%98%EC%9D%98+%EC%9A%B4%EC%84%B8",
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <div className="sugar-view luck-view">
      <div className={`info-box ${darkMode ? "dark" : ""}`}>
        어비스 레이드, 어비스 던전, 시즈나이트 가공 기준으로
        오늘 내 보상이 통계적으로 어느 정도 구간인지 확인해보는 페이지입니다.
      </div>

      <div className={`naver-fortune-card ${darkMode ? "dark" : ""}`}>
        <div className="naver-fortune-text">
          아무리 안줘도 오늘의 운세는 보고 돌아야죠
        </div>
        <button
          type="button"
          className="naver-fortune-btn"
          onClick={handleOpenNaverFortune}
        >
          네이버 오늘의 운세 보러 가기
        </button>
      </div>

      <h1>🍪 CTOA:오늘의 운빨</h1>

      <div className={`view-tabs ${darkMode ? "dark" : ""}`}>
        <button
          type="button"
          className={tab === "raid" ? "active" : ""}
          onClick={() => setTab("raid")}
        >
          어비스 레이드
        </button>
        <button
          type="button"
          className={tab === "dungeon" ? "active" : ""}
          onClick={() => setTab("dungeon")}
        >
          어비스 던전
        </button>
        <button
          type="button"
          className={tab === "process" ? "active" : ""}
          onClick={() => setTab("process")}
        >
          시즈나이트
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

      <footer className={`sugar-footer ${darkMode ? "dark" : ""}`}>
        Feedback은{" "}
        <a
          href="https://open.kakao.com/o/sBd2uO0h"
          target="_blank"
          rel="noopener noreferrer"
        >
          타디스
        </a>
        를 찾아주세요.
      </footer>
    </div>
  );
};

export default LuckPage;
