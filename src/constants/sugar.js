export const GRADE_INFO = {
  rare: { label: "레어", color: "#3b82f6", points: 30, maxCells: 3 },
  epic: { label: "에픽", color: "#8b5cf6", points: 60, maxCells: 4 },
  super_epic: { label: "슈퍼에픽", color: "#ef4444", points: 120, maxCells: 5 },
  unique: { label: "유니크", color: "#facc15", points: 250, maxCells: null },
};

export const ROLE_LABELS = {
  dealer: "딜러",
  striker: "스트라이커",
  supporter: "서포터",
};

export const ROLE_MODIFIERS = {
  dealer: ["광휘", "관통"],
  striker: ["원소", "파쇄"],
  supporter: ["축복", "재생", "낙인"],
};

export const BONUS_PER_STEP = 265;
