// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from './context/ThemeContext';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));

// 다크모드 상태에 따라 body 클래스 변경
function updateBodyClass(darkMode) {
  document.body.className = darkMode ? 'dark-mode' : '';
}

// 초기 설정
updateBodyClass(false);

root.render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);