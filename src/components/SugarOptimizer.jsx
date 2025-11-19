// src/components/SugarOptimizer.jsx

import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { ROLE_LABELS, ROLE_MODIFIERS, GRADE_INFO } from "../constants/sugar";
import { SHAPE_OPTIONS } from "../utils/sugar/shapes";
import { ThemeContext } from "../context/ThemeContext";

const BOARD_SIZE = 7;
const OPEN_ROWS = [2, 3, 4];
const OPEN_COLS = [1, 2, 3, 4, 5];

const cellKey = (row, col) => `${row},${col}`;

// ✔ 보색 계산 함수
const getComplementaryColor = (hex) => {
  if (!hex) return "#000000";
  let c = hex.replace("#", "");
  if (c.length === 3) {
    c = c
      .split("")
      .map((v) => v + v)
      .join("");
  }

  const r = (255 - parseInt(c.substring(0, 2), 16)).toString(16).padStart(2, "0");
  const g = (255 - parseInt(c.substring(2, 4), 16)).toString(16).padStart(2, "0");
  const b = (255 - parseInt(c.substring(4, 6), 16)).toString(16).padStart(2, "0");

  return `#${r}${g}${b}`;
};

const createInitialBlockedCells = () => {
  const openRows = new Set(OPEN_ROWS);
  const openCols = new Set(OPEN_COLS);
  const initial = new Set();
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if (!openRows.has(row) || !openCols.has(col)) {
        initial.add(cellKey(row, col));
      }
    }
  }
  return initial;
};

const gradeEntries = Object.entries(GRADE_INFO);
const shapeEntries = SHAPE_OPTIONS;

const ShapePreview = ({ shape, color = "#475569", cellSize = 16 }) => {
  if (!shape) return null;
  const previewStyle = {
    gridTemplateColumns: `repeat(${shape.width}, ${cellSize}px)`,
    gridTemplateRows: `repeat(${shape.height}, ${cellSize}px)`,
  };
  const wrapperStyle = {
    width: `${cellSize * 5}px`,
    height: `${cellSize * 5}px`,
  };
  return (
    <div className="shape-preview-wrapper" style={wrapperStyle}>
      <div className="shape-preview" style={previewStyle}>
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
    </div>
  );
};

const formatScore = (value) => value.toLocaleString("ko-KR");

const SugarOptimizer = ({ appState, setAppState }) => {
  const { darkMode, setDarkMode } = useContext(ThemeContext);

  const [localState, setLocalState] = useState(() => {
    const initialBlocked = appState.blockedCells || createInitialBlockedCells();
    const initialNewPiece = {
      modifier: appState.newPiece.modifier || ROLE_MODIFIERS.dealer?.[0] || "",
      grade: appState.newPiece.grade || "rare",
    };
    return {
      blockedCells: initialBlocked,
      playerRole: appState.playerRole,
      pieces: appState.pieces,
      boardImage: appState.boardImage,
      piecesImage: appState.piecesImage,
      solution: appState.solution,
      isSolving: false,
      newPiece: initialNewPiece,
    };
  });

  const pieceIdRef = useRef(
    appState.pieces.length > 0
      ? Math.max(...appState.pieces.map((p) => parseInt(p.id.split("-")[1], 10))) + 1
      : 1
  );

  // App과 동기화
  useEffect(() => {
    setAppState({
      blockedCells: localState.blockedCells,
      playerRole: localState.playerRole,
      pieces: localState.pieces,
      boardImage: localState.boardImage,
      piecesImage: localState.piecesImage,
      solution: localState.solution,
      newPiece: localState.newPiece,
    });
  }, [localState, setAppState]);

  const handleThemeSelect = (mode) => {
    if (mode === "dark") setDarkMode(true);
    else if (mode === "light") setDarkMode(false);
  };

  // 역할/등급 변경 시 newPiece.modifier 정리
  useEffect(() => {
    setLocalState((prev) => {
      const { playerRole, newPiece } = prev;

      if (newPiece.grade === "unique") {
        if (newPiece.modifier === "") return prev;
        return { ...prev, newPiece: { ...newPiece, modifier: "" } };
      }

      const mods = ROLE_MODIFIERS[playerRole] || [];
      const nextMod = mods.includes(newPiece.modifier)
        ? newPiece.modifier
        : mods[0] || "";
      if (nextMod === newPiece.modifier) return prev;

      return { ...prev, newPiece: { ...newPiece, modifier: nextMod } };
    });
  }, [localState.playerRole, localState.newPiece.grade]);

  // ✅ 각 칸 → 어떤 조각/순서/수식어인지 매핑
  const highlightMap = useMemo(() => {
    if (!localState.solution) return new Map();
    const map = new Map();
    localState.solution.placements.forEach((placement, index) => {
      placement.cells.forEach(([row, col]) => {
        map.set(cellKey(row, col), {
          grade: placement.grade,
          modifier: placement.modifier,
          label: placement.label,
          order: index + 1,
          placementId: placement.id,
        });
      });
    });
    return map;
  }, [localState.solution]);

  const revokeUrl = (url) => {
    if (url) URL.revokeObjectURL(url);
  };

  useEffect(() => () => revokeUrl(localState.boardImage), [localState.boardImage]);
  useEffect(() => () => revokeUrl(localState.piecesImage), [localState.piecesImage]);

  const handleImageChange = (event, field) => {
    const file = event.target.files?.[0];
    if (!file) {
      setLocalState((prev) => {
        revokeUrl(prev[field]);
        return { ...prev, [field]: null };
      });
      return;
    }
    const url = URL.createObjectURL(file);
    setLocalState((prev) => {
      revokeUrl(prev[field]);
      return { ...prev, [field]: url };
    });
  };

  const updateRole = (value) => {
    setLocalState((prev) => ({ ...prev, playerRole: value, solution: null }));
  };

  const toggleCell = (row, col) => {
    setLocalState((prev) => {
      const next = new Set(prev.blockedCells);
      const key = cellKey(row, col);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return { ...prev, blockedCells: next, solution: null };
    });
  };

  const handleResetOpenCells = () => {
    setLocalState((prev) => ({
      ...prev,
      blockedCells: createInitialBlockedCells(),
      solution: null,
    }));
  };

  const handleOpenAllCells = () => {
    setLocalState((prev) => ({
      ...prev,
      blockedCells: new Set(),
      solution: null,
    }));
  };

  const handleNewPieceChange = (field, value) => {
    setLocalState((prev) => ({
      ...prev,
      newPiece: { ...prev.newPiece, [field]: value },
    }));
  };

  const handleAddShape = (shapeKey) => {
    const grade = localState.newPiece.grade;
    const isUnique = grade === "unique";
    const modifier = isUnique ? "" : localState.newPiece.modifier;

    if (!grade) return;
    if (!isUnique && !modifier) return;

    if (isUnique) {
      const alreadyHasUnique = localState.pieces.some(
        (p) => p.role === localState.playerRole && p.grade === "unique"
      );
      if (alreadyHasUnique) {
        alert("유니크 조각은 한 개까지만 추가할 수 있습니다.");
        return;
      }
    }

    const gradeInfo = GRADE_INFO[grade];
    const shape = shapeEntries.find((entry) => entry.key === shapeKey);
    if (!shape) return;
    if (gradeInfo?.maxCells && shape.area > gradeInfo.maxCells) return;

    const piece = {
      id: `piece-${pieceIdRef.current}`,
      role: localState.playerRole,
      modifier,
      grade,
      shapeKey,
      quantity: 1,
    };
    pieceIdRef.current += 1;
    setLocalState((prev) => ({
      ...prev,
      pieces: [...prev.pieces, piece],
      solution: null,
    }));
  };

  const handleRemovePiece = (id) => {
    setLocalState((prev) => ({
      ...prev,
      pieces: prev.pieces.filter((piece) => piece.id !== id),
      solution: null,
    }));
  };

  const handleResetPieces = () => {
    pieceIdRef.current = 1;
    setLocalState((prev) => ({ ...prev, pieces: [], solution: null }));
  };

  const handleSolve = () => {
    setLocalState((prev) => ({
      ...prev,
      isSolving: true,
      solution: null,
    }));

    const worker = new Worker(new URL("../utils/sugar/worker.js", import.meta.url));

    const blocked = Array.from(localState.blockedCells).map((key) => {
      const [row, col] = key.split(",").map(Number);
      return { row, col };
    });

    const normalizedPieces = localState.pieces.map((piece) => ({
      ...piece,
      quantity: Math.max(0, Number(piece.quantity) || 0),
    }));

    worker.postMessage({
      rows: BOARD_SIZE,
      cols: BOARD_SIZE,
      blocked,
      pieces: normalizedPieces,
      role: localState.playerRole,
    });

    worker.onmessage = (event) => {
      const { result } = event.data;
      setLocalState((prev) => ({
        ...prev,
        solution: result,
        isSolving: false,
      }));
      worker.terminate();
    };

    worker.onerror = (error) => {
      console.error("Worker error:", error);
      setLocalState((prev) => ({ ...prev, isSolving: false }));
      worker.terminate();
    };
  };

  // ✅ 윤곽선 + 분류 뱃지까지 포함한 셀 렌더링
  const renderCell = (row, col) => {
    const key = cellKey(row, col);
    const blocked = localState.blockedCells.has(key);
    const highlight = highlightMap.get(key);
    const gradeColor = highlight ? GRADE_INFO[highlight.grade]?.color : null;

    const cellContent = highlight ? highlight.order : blocked ? "🔒" : "";

    // 윤곽선 계산
    let borderStyles = {};
    if (highlight) {
      const baseColor = GRADE_INFO[highlight.grade]?.color || "#0f172a";
      const borderColor = getComplementaryColor(baseColor);
      const BORDER_WIDTH = "4px";

      const neighborSame = (dr, dc) => {
        const nr = row + dr;
        const nc = col + dc;
        if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) return false;
        const nKey = cellKey(nr, nc);
        const nh = highlightMap.get(nKey);
        return nh && nh.placementId === highlight.placementId;
      };

      const topSame = neighborSame(-1, 0);
      const bottomSame = neighborSame(1, 0);
      const leftSame = neighborSame(0, -1);
      const rightSame = neighborSame(0, 1);

      borderStyles = {
        borderTop: topSame ? "1px solid transparent" : `${BORDER_WIDTH} solid ${borderColor}`,
        borderBottom: bottomSame
          ? "1px solid transparent"
          : `${BORDER_WIDTH} solid ${borderColor}`,
        borderLeft: leftSame ? "1px solid transparent" : `${BORDER_WIDTH} solid ${borderColor}`,
        borderRight: rightSame
          ? "1px solid transparent"
          : `${BORDER_WIDTH} solid ${borderColor}`,
      };
    }

    const badgeText =
      highlight &&
      (highlight.grade === "unique"
        ? "유니크"
        : highlight.modifier || "");

    return (
      <button
        key={key}
        type="button"
        className={`sugar-cell ${blocked ? "blocked" : ""} ${
          highlight ? "filled" : ""
        }`}
        style={{
          backgroundColor: gradeColor || undefined,
          ...borderStyles,
        }}
        onClick={() => toggleCell(row, col)}
        aria-label={
          blocked
            ? "잠긴 칸"
            : highlight
            ? `${highlight.label} (${highlight.order}번)`
            : "빈 칸"
        }
        title={
          highlight
            ? `${highlight.label} (${highlight.order}번)`
            : blocked
            ? "잠긴 칸"
            : "빈 칸"
        }
      >
        <span className="cell-main">{cellContent}</span>
        {badgeText && <span className="cell-badge">{badgeText}</span>}
      </button>
    );
  };

  const modifiersForRole = ROLE_MODIFIERS[localState.playerRole] || [];
  const shapeLookup = useMemo(() => {
    const map = new Map();
    shapeEntries.forEach((shape) => map.set(shape.key, shape));
    return map;
  }, []);
  const gradeOrder = useMemo(() => {
    const order = new Map();
    gradeEntries.forEach(([grade], index) => {
      order.set(grade, index);
    });
    return order;
  }, []);
  const playerPieces = useMemo(
    () => localState.pieces.filter((piece) => piece.role === localState.playerRole),
    [localState.pieces, localState.playerRole]
  );
  const playerPieceCount = useMemo(
    () => playerPieces.reduce((sum, piece) => sum + (Number(piece.quantity) || 0), 0),
    [playerPieces]
  );
  const modifierOrder = useMemo(() => {
    const map = new Map();
    modifiersForRole.forEach((modifier, index) => {
      map.set(modifier, index);
    });
    return map;
  }, [modifiersForRole]);

  const groupedPieces = useMemo(() => {
    const groups = new Map();
    const uniquePieces = [];

    playerPieces.forEach((piece) => {
      if (piece.grade === "unique") {
        uniquePieces.push(piece);
        return;
      }

      const key = piece.modifier || "기타";
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(piece);
    });

    const sorted = Array.from(groups.entries()).sort(([a], [b]) => {
      const aOrder = modifierOrder.has(a) ? modifierOrder.get(a) : Number.MAX_SAFE_INTEGER;
      const bOrder = modifierOrder.has(b) ? modifierOrder.get(b) : Number.MAX_SAFE_INTEGER;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.localeCompare(b, "ko-KR");
    });

    const result = sorted.map(([modifier, list]) => ({
      modifier,
      isUnique: false,
      pieces: list.sort((pieceA, pieceB) => {
        const gradeDiff =
          (gradeOrder.get(pieceA.grade) ?? Number.MAX_SAFE_INTEGER) -
          (gradeOrder.get(pieceB.grade) ?? Number.MAX_SAFE_INTEGER);
        if (gradeDiff !== 0) return gradeDiff;
        const areaA = shapeLookup.get(pieceA.shapeKey)?.area || 0;
        const areaB = shapeLookup.get(pieceB.shapeKey)?.area || 0;
        return areaA - areaB;
      }),
    }));

    if (uniquePieces.length) {
      result.push({
        modifier: "유니크",
        isUnique: true,
        pieces: uniquePieces.sort((a, b) => {
          const areaA = shapeLookup.get(a.shapeKey)?.area || 0;
          const areaB = shapeLookup.get(b.shapeKey)?.area || 0;
          return areaA - areaB;
        }),
      });
    }

    return result;
  }, [gradeOrder, modifierOrder, playerPieces, shapeLookup]);

  const gradeSelectionInfo = GRADE_INFO[localState.newPiece.grade];
  const allowedShapeGroups = useMemo(() => {
    const limit = gradeSelectionInfo?.maxCells;
    const groups = new Map();
    shapeEntries.forEach((shape) => {
      if (localState.newPiece.grade === "unique" && shape.area !== 8) return;
      if (limit && shape.area > limit) return;
      if (!groups.has(shape.area)) groups.set(shape.area, []);
      groups.get(shape.area).push(shape);
    });

    return Array.from(groups.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([area, shapes]) => ({
        area,
        shapes: shapes.sort((a, b) => a.key.localeCompare(b.key)),
      }));
  }, [gradeSelectionInfo?.maxCells, localState.newPiece.grade]);

  return (
    <div className={`sugar-view ${darkMode ? "dark" : ""}`}>
      <h1 className="sugar-title">🍪 CTOA: 설탕 유리조각 최적 배치</h1>
      <p className="sugar-subtitle">
        아직 사진은 지원하지 않습니다. 알고리즘도 완벽하게 동작하지 않습니다. 죄송합니다. (추후 수정 예정)
      </p>

      <div className="theme-toggle-right">
        <div className="theme-toggle" role="group" aria-label="테마 선택">
          <button
            type="button"
            className={`theme-chip ${!darkMode ? "active" : ""}`}
            onClick={() => handleThemeSelect("light")}
          >
            ☀️ 라이트
          </button>
          <button
            type="button"
            className={`theme-chip ${darkMode ? "active" : ""}`}
            onClick={() => handleThemeSelect("dark")}
          >
            🌙 다크
          </button>
        </div>
      </div>

      <div className="sugar-layout">
        <section className="sugar-card">
          <div className="sugar-section-title">1. 보드 설정</div>
          <div className="role-selector">
            <div className="role-selector-header">
              <span>역할군 선택</span>
              <span>사용 가능한 수식어 목록을 한 번에 확인하세요.</span>
            </div>
            <div className="role-button-row" role="group" aria-label="역할군 선택">
              {Object.entries(ROLE_LABELS).map(([value, label]) => {
                const modifiers = ROLE_MODIFIERS[value] || [];
                const modifierLabel = modifiers.length
                  ? modifiers.join(" · ")
                  : "수식어 정보 없음";
                return (
                  <button
                    key={value}
                    type="button"
                    className={`role-button ${
                      localState.playerRole === value ? "active" : ""
                    }`}
                    aria-pressed={localState.playerRole === value}
                    onClick={() => updateRole(value)}
                  >
                    <span className="role-button-label">{label}</span>
                    <span className="role-button-modifiers">{modifierLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="board-hint-row">
            <p className="board-hint">
              잠긴 칸(🔒)을 다시 누르면 열리고, 열린 칸을 다시 누르면 잠글 수 있습니다.
            </p>
            <div className="board-hint-actions">
              <button
                type="button"
                className="ghost small"
                onClick={handleOpenAllCells}
              >
                모두 열기
              </button>
              <button
                type="button"
                className="ghost small"
                onClick={handleResetOpenCells}
              >
                열린 칸 초기화
              </button>
            </div>
          </div>

          <div className="sugar-grid-frame">
            <div
              className={`sugar-grid ${localState.isSolving ? "busy" : ""}`}
              aria-busy={localState.isSolving}
              style={{
                gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`,
                gridTemplateRows: `repeat(${BOARD_SIZE}, 1fr)`,
              }}
            >
              {Array.from({ length: BOARD_SIZE }).map((_, row) =>
                Array.from({ length: BOARD_SIZE }).map((__, col) =>
                  renderCell(row, col)
                )
              )}
            </div>
          </div>

          <div className="image-uploaders">
            <div>
              <label className="upload-label">
                빈칸 사진 업로드
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageChange(e, "boardImage")}
                />
              </label>
              {localState.boardImage && (
                <img
                  src={localState.boardImage}
                  alt="보드 미리보기"
                  className="preview-image"
                />
              )}
            </div>
            <div>
              <label className="upload-label">
                조각 사진 업로드
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageChange(e, "piecesImage")}
                />
              </label>
              {localState.piecesImage && (
                <img
                  src={localState.piecesImage}
                  alt="조각 미리보기"
                  className="preview-image"
                />
              )}
            </div>
          </div>
        </section>

        <section className="sugar-card inventory-card">
          <div className="sugar-section-title inventory-title-row">
            <span>
              2. 보유 중인 설탕 유리조각{" "}
              <span className="inventory-count">({playerPieceCount}개)</span>
            </span>
            <button type="button" className="ghost small" onClick={handleResetPieces}>
              보유 조각 초기화
            </button>
          </div>
          <div className="inventory-panels">
            <div className="inventory-column">
              <div className="inventory-box scrollable">
                <div className="piece-form">
                  <div className="piece-form-row compact">
                    <label>
                      수식어 ({ROLE_LABELS[localState.playerRole]})
                      {localState.newPiece.grade === "unique" ? (
                        <div className="unique-modifier-placeholder">
                          유니크는 수식어가 없습니다.
                        </div>
                      ) : (
                        <select
                          value={localState.newPiece.modifier}
                          onChange={(e) =>
                            handleNewPieceChange("modifier", e.target.value)
                          }
                        >
                          {modifiersForRole.map((modifier) => (
                            <option key={modifier} value={modifier}>
                              {modifier}
                            </option>
                          ))}
                        </select>
                      )}
                    </label>
                    <label>
                      등급
                      <select
                        value={localState.newPiece.grade}
                        onChange={(e) => handleNewPieceChange("grade", e.target.value)}
                      >
                        {gradeEntries.map(([value, info]) => (
                          <option key={value} value={value}>
                            {info.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <p className="piece-hint">
                    최대 {gradeSelectionInfo?.maxCells || "무제한"}칸 조각까지 담을 수
                    있습니다. 아래 모양을 누르면 즉시 목록에 추가됩니다.
                  </p>
                </div>

                <div className="shape-groups">
                  {allowedShapeGroups.length === 0 && (
                    <p className="empty-text">
                      선택한 등급에서 사용할 수 있는 모양이 없습니다.
                    </p>
                  )}
                  {allowedShapeGroups.map((group) => (
                    <div key={group.area} className="shape-group">
                      <div className="shape-group-title">{group.area}칸 조각</div>
                      <div className="shape-group-grid">
                        {group.shapes.map((shape) => (
                          <button
                            key={shape.key}
                            type="button"
                            className="shape-option add"
                            onClick={() => handleAddShape(shape.key)}
                            aria-label={`${group.area}칸 모양 추가`}
                          >
                            <ShapePreview
                              shape={shape}
                              color={GRADE_INFO[localState.newPiece.grade]?.color}
                            />
                            <span className="shape-area-label">+{group.area}칸</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <p className="piece-hint">
                  {ROLE_LABELS[localState.playerRole]} 전용 조각만 추가됩니다.
                </p>
              </div>
            </div>

            <div className="inventory-column">
              <div className="inventory-box vertical-list" aria-live="polite">
                <div className="inventory-summary">
                  <span>수식어별로 조각을 확인하세요.</span>
                  <span>유니크는 별도 섹션에 표시됩니다.</span>
                </div>
                {groupedPieces.length > 0 ? (
                  <div className="modifier-groups-column">
                    {groupedPieces.map((group) => (
                      <div key={group.modifier} className="modifier-group">
                        <div className="modifier-group-header">
                          <span>
                            {group.isUnique ? (
                              <>
                                <span className="unique-icon" aria-hidden="true">
                                  ⭐
                                </span>{" "}
                                유니크
                              </>
                            ) : (
                              group.modifier
                            )}
                          </span>
                          <span>{group.pieces.length}개</span>
                        </div>
                        <div className="piece-gallery" role="list">
                          {group.pieces.map((piece) => {
                            const info = GRADE_INFO[piece.grade];
                            const shape = shapeLookup.get(piece.shapeKey);
                            return (
                              <div
                                key={piece.id}
                                className="piece-card compact"
                                role="listitem"
                              >
                                <ShapePreview
                                  shape={shape}
                                  color={info?.color || "#475569"}
                                  cellSize={14}
                                />
                                <div className="piece-card-body">
                                  <div
                                    className="piece-card-grade"
                                    style={{ color: info?.color || "#475569" }}
                                  >
                                    {info?.label}
                                  </div>
                                  <div className="piece-card-details">
                                    <span>
                                      {shape?.area ?? "?"}칸 · x{piece.quantity || 1}
                                    </span>
                                    <span className="piece-card-modifier">
                                      {piece.grade === "unique"
                                        ? "유니크"
                                        : piece.modifier}
                                    </span>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  className="ghost"
                                  onClick={() => handleRemovePiece(piece.id)}
                                >
                                  삭제
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="empty-text">추가된 조각이 없습니다.</p>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="sugar-actions">
        <button
          type="button"
          className="primary"
          onClick={handleSolve}
          disabled={localState.isSolving}
        >
          {localState.isSolving ? "계산 중..." : "최적 배치 계산"}
        </button>
        <p className="actions-hint">
          잠긴 칸과 보유 조각을 설정한 뒤 계산 버튼을 눌러주세요.
        </p>
      </div>

      {localState.isSolving && (
        <div className="solve-progress" role="status" aria-live="polite">
          <span className="solve-spinner" aria-hidden />
          <span>최적 배치를 계산 중입니다...</span>
        </div>
      )}

      {localState.solution && (
        <section className="sugar-card solution-card">
          <div className="sugar-section-title">3. 결과 요약</div>
          <div className="solution-summary">
            <div>
              <div className="solution-label">총 점수</div>
              <div className="solution-value">
                {formatScore(localState.solution.totalScore)} 점
              </div>
            </div>
            <div>
              <div className="solution-label">기본 점수</div>
              <div className="solution-value">
                {formatScore(localState.solution.baseScore)} 점
              </div>
            </div>
            <div>
              <div className="solution-label">추가 점수</div>
              <div className="solution-value">
                {formatScore(localState.solution.bonusScore)} 점
              </div>
            </div>
          </div>

          {localState.solution.bonusBreakdown.length > 0 ? (
            <ul className="bonus-list">
              {localState.solution.bonusBreakdown.map((bonus) => (
                <li key={bonus.modifier}>
                  <strong>{bonus.modifier}</strong> {bonus.cells}칸 → +
                  {formatScore(bonus.bonus)}점
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-text">추가 점수를 받은 수식어가 없습니다.</p>
          )}

          <div className="placement-list">
            {localState.solution.placements.map((placement, index) => {
              const info = GRADE_INFO[placement.grade];
              return (
                <div key={placement.id} className="placement-item">
                  <div
                    className="placement-index"
                    style={{ backgroundColor: info?.color || "#475569" }}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <div className="placement-label">{placement.label}</div>
                    <div className="placement-meta">
                      {placement.grade === "unique"
                        ? info?.label
                        : `${placement.modifier} · ${info?.label}`}
                      {" · "}
                      +{formatScore(placement.baseScore)}점
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {localState.isSolving && (
        <div className="solve-overlay" role="alert" aria-live="assertive">
          <div className="solve-overlay-card">
            <span className="solve-spinner large" aria-hidden />
            <div>
              <h3>최적 배치를 찾는 중입니다</h3>
              <p>보유 조각이 많을수록 계산에 조금 더 시간이 필요할 수 있어요.</p>
            </div>
          </div>
        </div>
      )}

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

export default SugarOptimizer;
