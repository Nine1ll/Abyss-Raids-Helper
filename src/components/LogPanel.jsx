export default function LogPanel({ logs }) {
  return (
    <div style={{
      marginTop: "20px",
      padding: "16px",
      background: "rgba(0,0,0,0.3)",
      borderRadius: "12px",
      color: "white"
    }}>
      <h3>📜 이번 판 로그</h3>

      {logs.length === 0 ? (
        <div style={{ opacity: 0.7 }}>
          아직 기록이 없습니다.  
          <br />  
          행동 버튼 클릭 → 칸 클릭해야 기록됩니다.
        </div>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {logs.map((log, i) => (
            <li key={i} style={{ padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
              <strong>{log.turn}턴</strong> — {log.label}
              <br />
              {log.from} → {log.to} ({log.delta >= 0 ? "+" + log.delta : log.delta})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
