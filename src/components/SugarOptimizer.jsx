import React, { useEffect, useMemo, useRef, useState } from "react";
import { ROLE_LABELS, ROLE_MODIFIERS, GRADE_INFO } from "../constants/sugar";
import { SHAPE_OPTIONS } from "../utils/sugar/shapes";
import { solveSugarBoard } from "../utils/sugar/solver";

const DEFAULT_PIECES = [
  {
    id: "sample-1",
    label: "광휘 네모",
    role: "dealer",
    modifier: "광휘",
    grade: "rare",
    shapeKey: "4_square",
    quantity: 2,
  },
  {
    id: "sample-2",
    label: "관통 T",
    role: "dealer",
    modifier: "관통",
    grade: "epic",
    shapeKey: "4_T_up",
    quantity: 1,
  },
  {
    id: "sample-3",
    label: "축복 스네이크",
    role: "supporter",
    modifier: "축복",
    grade: "super_epic",
    shapeKey: "8_snake_h",
    quantity: 1,
  },
];

const gradeEntries = Object.entries(GRADE_INFO);
const shapeEntries = SHAPE_OPTIONS;

const ShapePreview = ({ shape, color = "#475569" }) => {
  if (!shape) return null;
  return (
    <div className="shape-preview" style={{ gridTemplateColumns: `repeat(${shape.width}, 1fr)` }}>
      {shape.matrix.map((row, rowIndex) =>
        row.map((value, colIndex) => (
          <span
            key={`${rowIndex}-${colIndex}`}
            className={`shape-preview-cell ${value ? "filled" : ""}`}
            style={value ? { backgroundColor: color } : undefined}
          />
        ))
      )}
    </div>
  );
};

const cellKey = (row, col) => `${row},${col}`;
const formatScore = (value) => value.toLocaleString("ko-KR");

const SugarOptimizer = () => {
  const [boardRows, setBoardRows] = useState(6);
  const [boardCols, setBoardCols] = useState(6);
  const [blockedCells, setBlockedCells] = useState(() => new Set());
  const [playerRole, setPlayerRole] = useState("dealer");
  const [pieces, setPieces] = useState(DEFAULT_PIECES);
  const [boardImage, setBoardImage] = useState(null);
  const [piecesImage, setPiecesImage] = useState(null);
  const [solution, setSolution] = useState(null);
  const [isSolving, setIsSolving] = useState(false);

  const pieceIdRef = useRef(DEFAULT_PIECES.length + 1);

  const createNewPieceState = (role) => ({
    label: "",
    role,
    modifier: ROLE_MODIFIERS[role]?.[0] || "",
    grade: "rare",
    shapeKey: shapeEntries[0]?.key,
    quantity: 1,
  });

  const [newPiece, setNewPiece] = useState(() => createNewPieceState("dealer"));

  useEffect(() => {
    setNewPiece((prev) => {
      const modifiers = ROLE_MODIFIERS[playerRole] || [];
      return {
        ...prev,
        role: playerRole,
        modifier: modifiers.includes(prev.modifier) ? prev.modifier : modifiers[0] || "",
      };
    });
  }, [playerRole]);

  useEffect(() => {
    setBlockedCells((prev) => {
      const next = new Set();
      prev.forEach((key) => {
        const [row, col] = key.split(",").map(Number);
        if (row < boardRows && col < boardCols) {
          next.add(key);
        }
      });
      return next;
    });
  }, [boardRows, boardCols]);

  const highlightMap = useMemo(() => {
    if (!solution) return new Map();
    const map = new Map();
    solution.placements.forEach((placement, index) => {
      placement.cells.forEach(([row, col]) => {
        map.set(cellKey(row, col), {
          grade: placement.grade,
          modifier: placement.modifier,
          label: placement.label,
          order: index + 1,
        });
      });
    });
    return map;
  }, [solution]);

  const revokeUrl = (url) => {
    if (url) {
      URL.revokeObjectURL(url);
    }
  };

  useEffect(() => () => revokeUrl(boardImage), [boardImage]);
  useEffect(() => () => revokeUrl(piecesImage), [piecesImage]);

  const handleImageChange = (event, setter) => {
    const file = event.target.files?.[0];
    if (!file) {
      setter((prev) => {
        revokeUrl(prev);
        return null;
      });
      return;
    }
    const url = URL.createObjectURL(file);
    setter((prev) => {
      revokeUrl(prev);
      return url;
    });
  };

  const updateRows = (value) => {
    setBoardRows(value);
    setSolution(null);
  };

  const updateCols = (value) => {
    setBoardCols(value);
    setSolution(null);
  };

  const updateRole = (value) => {
    setPlayerRole(value);
    setSolution(null);
  };

  const toggleCell = (row, col) => {
    setSolution(null);
    setBlockedCells((prev) => {
      const next = new Set(prev);
      const key = cellKey(row, col);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleNewPieceChange = (field, value) => {
    setNewPiece((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddPiece = (event) => {
    event.preventDefault();
    if (!newPiece.modifier) return;
    const quantity = Math.max(1, Number(newPiece.quantity) || 1);
    const piece = {
      ...newPiece,
      role: playerRole,
      id: `piece-${pieceIdRef.current}`,
      quantity,
    };
    pieceIdRef.current += 1;
    setPieces((prev) => [...prev, piece]);
    setSolution(null);
    setNewPiece((prev) => ({ ...prev, label: "", quantity: 1 }));
  };

  const handleRemovePiece = (id) => {
    setPieces((prev) => prev.filter((piece) => piece.id !== id));
    setSolution(null);
  };

  const handleSolve = () => {
    setIsSolving(true);
    try {
      const blocked = Array.from(blockedCells).map((key) => {
        const [row, col] = key.split(",").map(Number);
        return { row, col };
      });

      const normalizedPieces = pieces.map((piece) => ({
        ...piece,
        quantity: Math.max(0, Number(piece.quantity) || 0),
      }));

      const result = solveSugarBoard({
        rows: boardRows,
        cols: boardCols,
        blocked,
        pieces: normalizedPieces,
        role: playerRole,
      });

      setSolution(result);
    } finally {
      setIsSolving(false);
    }
  };

  const renderCell = (row, col) => {
    const key = cellKey(row, col);
    const blocked = blockedCells.has(key);
    const highlight = highlightMap.get(key);
    const gradeColor = highlight ? GRADE_INFO[highlight.grade]?.color : null;
    return (
      <button
        key={key}
        type="button"
        className={`sugar-cell ${blocked ? "blocked" : ""} ${highlight ? "filled" : ""}`}
        style={{ backgroundColor: gradeColor || undefined }}
        onClick={() => toggleCell(row, col)}
      >
        {highlight ? highlight.order : ""}
      </button>
    );
  };

  const modifiersForRole = ROLE_MODIFIERS[playerRole] || [];
  const shapeLookup = useMemo(() => {
    const map = new Map();
    shapeEntries.forEach((shape) => map.set(shape.key, shape));
    return map;
  }, []);
  const playerPieces = useMemo(
    () => pieces.filter((piece) => piece.role === playerRole),
    [pieces, playerRole]
  );

  return (
    <div className="sugar-view">
      <h1>🧊 설탕 유리 배치 도우미</h1>
      <p className="sugar-subtitle">
        빈칸 사진과 조각 사진을 업로드한 뒤, 격자를 직접 표시하고 보유 중인 조각을
        입력하면 가장 높은 균열 저항력을 계산합니다.
      </p>

      <div className="sugar-layout">
        <section className="sugar-card">
          <div className="sugar-section-title">1. 보드 설정</div>
          <div className="board-settings">
            <label>
              행
              <input
                type="number"
                min="3"
                max="10"
                value={boardRows}
                onChange={(e) =>
                  updateRows(Math.max(3, Math.min(10, Number(e.target.value) || 3)))
                }
              />
            </label>
            <label>
              열
              <input
                type="number"
                min="3"
                max="10"
                value={boardCols}
                onChange={(e) =>
                  updateCols(Math.max(3, Math.min(10, Number(e.target.value) || 3)))
                }
              />
            </label>
            <label>
              직업
              <select value={playerRole} onChange={(e) => updateRole(e.target.value)}>
                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="sugar-grid" style={{ gridTemplateColumns: `repeat(${boardCols}, 1fr)` }}>
            {Array.from({ length: boardRows }).map((_, row) =>
              Array.from({ length: boardCols }).map((__, col) => renderCell(row, col))
            )}
          </div>

          <div className="image-uploaders">
            <div>
              <label className="upload-label">
                빈칸 사진 업로드
                <input type="file" accept="image/*" onChange={(e) => handleImageChange(e, setBoardImage)} />
              </label>
              {boardImage && <img src={boardImage} alt="보드 미리보기" className="preview-image" />}
            </div>
            <div>
              <label className="upload-label">
                조각 사진 업로드
                <input type="file" accept="image/*" onChange={(e) => handleImageChange(e, setPiecesImage)} />
              </label>
              {piecesImage && <img src={piecesImage} alt="조각 미리보기" className="preview-image" />}
            </div>
          </div>
        </section>

        <section className="sugar-card">
          <div className="sugar-section-title">2. 보유 중인 설탕 유리조각</div>
          <form className="piece-form" onSubmit={handleAddPiece}>
            <div className="piece-form-row">
              <label>
                이름
                <input
                  type="text"
                  placeholder="조각 이름"
                  value={newPiece.label}
                  onChange={(e) => handleNewPieceChange("label", e.target.value)}
                />
              </label>
              <label>
                수식어 ({ROLE_LABELS[playerRole]})
                <select
                  value={newPiece.modifier}
                  onChange={(e) => handleNewPieceChange("modifier", e.target.value)}
                >
                  {modifiersForRole.map((modifier) => (
                    <option key={modifier} value={modifier}>
                      {modifier}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                등급
                <select value={newPiece.grade} onChange={(e) => handleNewPieceChange("grade", e.target.value)}>
                  {gradeEntries.map(([value, info]) => (
                    <option key={value} value={value}>
                      {info.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                수량
                <input
                  type="number"
                  min="1"
                  max="6"
                  value={newPiece.quantity}
                  onChange={(e) => handleNewPieceChange("quantity", Number(e.target.value) || 1)}
                />
              </label>
            </div>

            <div className="shape-picker" role="radiogroup" aria-label="조각 모양 선택">
              {shapeEntries.map((shape) => (
                <button
                  key={shape.key}
                  type="button"
                  className={`shape-option ${newPiece.shapeKey === shape.key ? "selected" : ""}`}
                  onClick={() => handleNewPieceChange("shapeKey", shape.key)}
                  aria-pressed={newPiece.shapeKey === shape.key}
                >
                  <ShapePreview shape={shape} color={GRADE_INFO[newPiece.grade]?.color} />
                  <span>{shape.area}칸</span>
                </button>
              ))}
            </div>

            <button type="submit" className="primary small">
              현재 직업 조각 추가
            </button>
          </form>

          <p className="piece-hint">{ROLE_LABELS[playerRole]} 전용 조각만 표시되고 추가됩니다.</p>

          <div className="piece-gallery">
            {playerPieces.length === 0 && <p className="empty-text">추가된 조각이 없습니다.</p>}
            {playerPieces.map((piece) => {
              const info = GRADE_INFO[piece.grade];
              const shape = shapeLookup.get(piece.shapeKey);
              return (
                <div key={piece.id} className="piece-card">
                  <div className="piece-card-header" style={{ backgroundColor: info?.color || "#475569" }}>
                    <span>{piece.modifier}</span>
                    <span>{info?.label}</span>
                  </div>
                  <div className="piece-card-body">
                    <ShapePreview shape={shape} color={info?.color || "#475569"} />
                    <div className="piece-card-meta">
                      <div className="piece-card-label">{piece.label || shape?.key}</div>
                      <div className="piece-card-details">
                        <span>{shape?.area ?? "?"}칸</span>
                        <span>x{piece.quantity}</span>
                      </div>
                    </div>
                  </div>
                  <button type="button" className="ghost" onClick={() => handleRemovePiece(piece.id)}>
                    삭제
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <div className="sugar-actions">
        <button type="button" className="primary" onClick={handleSolve} disabled={isSolving}>
          {isSolving ? "계산 중..." : "최적 배치 계산"}
        </button>
      </div>

      {solution && (
        <section className="sugar-card solution-card">
          <div className="sugar-section-title">3. 결과 요약</div>
          <div className="solution-summary">
            <div>
              <div className="solution-label">총 점수</div>
              <div className="solution-value">{formatScore(solution.totalScore)} 점</div>
            </div>
            <div>
              <div className="solution-label">기본 점수</div>
              <div className="solution-value">{formatScore(solution.baseScore)} 점</div>
            </div>
            <div>
              <div className="solution-label">추가 점수</div>
              <div className="solution-value">{formatScore(solution.bonusScore)} 점</div>
            </div>
          </div>

          {solution.bonusBreakdown.length > 0 ? (
            <ul className="bonus-list">
              {solution.bonusBreakdown.map((bonus) => (
                <li key={bonus.modifier}>
                  <strong>{bonus.modifier}</strong> {bonus.cells}칸 → +{formatScore(bonus.bonus)}점
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-text">추가 점수를 받은 수식어가 없습니다.</p>
          )}

          <div className="placement-list">
            {solution.placements.map((placement, index) => {
              const info = GRADE_INFO[placement.grade];
              return (
                <div key={placement.id} className="placement-item">
                  <div className="placement-index" style={{ backgroundColor: info?.color || "#475569" }}>
                    {index + 1}
                  </div>
                  <div>
                    <div className="placement-label">{placement.label}</div>
                    <div className="placement-meta">
                      {placement.modifier} · {info?.label} · +{formatScore(placement.baseScore)}점
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};

export default SugarOptimizer;
