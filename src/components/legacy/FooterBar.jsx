// src/components/FooterBar.jsx
import React from 'react';

const FooterBar = ({ darkMode }) => {
  return (
    <footer className={darkMode ? 'dark' : ''}>
      Feedback은 오픈채팅{' '}
      <a
        href="https://open.kakao.com/o/sBd2uO0h"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color: '#3b82f6',
          fontWeight: 'bold',
          textDecoration: 'underline',
        }}
      >
        타디스
      </a>
      를 찾아주세요.
    </footer>
  );
};

export default FooterBar;
