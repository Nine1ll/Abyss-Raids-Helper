// src/components/HelpBox.jsx
import React from 'react';

const HelpBox = ({ show, darkMode, onToggle }) => {
  return (
    <>
      <div style={{ textAlign: 'center', margin: '12px 0' }}>
        <button
          onClick={onToggle}
          style={{
            background: 'none',
            border: 'none',
            color: '#3b82f6',
            fontSize: '14px',
            cursor: 'pointer',
            padding: '4px 8px',
            fontWeight: 'bold',
            textDecoration: 'underline',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            margin: '0 auto',
          }}
        >
          ❓ 사용 방법
        </button>
      </div>

      {show && (
        <div
          style={{
            backgroundColor: darkMode ? '#1e293b' : '#e0f2fe',
            border: `1px solid ${darkMode ? '#4b5563' : '#3b82f6'}`,
            borderRadius: '10px',
            padding: '16px',
            margin: '16px auto',
            maxWidth: '600px',
            fontSize: '14px',
            lineHeight: '1.7',
            color: darkMode ? '#f9fafb' : '#1e40af',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          }}
        >
          <h3
            style={{
              margin: '0 0 12px 0',
              color: darkMode ? '#60a5fa' : '#1d4ed8',
              fontSize: '16px',
              fontWeight: 'bold',
            }}
          >
            🎯 사용 방법
          </h3>

          <ol
            style={{
              paddingLeft: '20px',
              marginBottom: '16px',
              marginTop: '0',
            }}
          >
            <li>위에서 <strong>상급 / 최상급</strong> 모드를 선택합니다.</li>
            <li>
              처음 1회는, 게임 화면과 똑같이 아래 보드에서{' '}
              <strong>현재 위치 칸</strong>을 클릭해서 맞춰 주세요.
            </li>
            <li>
              그 다음부터 한 턴을 진행할 때는<br />
              <strong>① 사용할 행동(세게 두드리기/ 세공하기/ 안정제 사용)을 먼저 선택</strong>하고,<br />
              <strong>② 행동을 한 뒤 나온 위치 칸을 클릭</strong>하면
              자동으로 턴이 갱신됩니다.
            </li>
          </ol>

          <p
            style={{
              fontSize: '12px',
              fontStyle: 'italic',
              margin: '8px 0 0 0',
              color: darkMode ? '#9ca3af' : '#475569',
            }}
          >
            ※ 로그는 <strong>행동을 선택한 상태에서 위치 칸을 클릭했을 때</strong>만 기록됩니다.
          </p>
        </div>
      )}
    </>
  );
};

export default HelpBox;
