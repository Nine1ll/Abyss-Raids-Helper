// 어비스 던전 단계별 확률/개수 + 내부 점수

export const ABYSS_DUNGEON_CONFIG = {
  1: {
    name: "1단계",
    knightsPerRun: 2,
    glassPerRun: 5,
    knightProbs: {
      top: 0.009, // 상급 3종 x 0.3%
      rare: 0.051,
      uncommon: 0.10,
      common: 0.84,
    },
    glassProbs: {
      rare: 0.95,
      epic: 0.05,
    },
  },
  2: {
    name: "2단계",
    knightsPerRun: 2,
    glassPerRun: 6,
    knightProbs: {
      top: 0.015,
      rare: 0.063,
      uncommon: 0.12,
      common: 0.803,
    },
    glassProbs: {
      rare: 0.9,
      epic: 0.1,
    },
  },
  3: {
    name: "3단계",
    knightsPerRun: 2,
    glassPerRun: 8,
    knightProbs: {
      top: 0.021,
      rare: 0.075,
      uncommon: 0.14,
      common: 0.765,
    },
    glassProbs: {
      rare: 0.8,
      epic: 0.15,
      super_epic: 0.05,
    },
  },
  4: {
    name: "4단계",
    knightsPerRun: 2,
    glassPerRun: 8,
    knightProbs: {
      top: 0.024,
      rare: 0.09,
      uncommon: 0.16,
      common: 0.725,
    },
    glassProbs: {
      rare: 0.7,
      epic: 0.2,
      super_epic: 0.1,
    },
  },
  5: {
    name: "5단계",
    knightsPerRun: 2,
    glassPerRun: 8,
    knightProbs: {
      top: 0.033,
      rare: 0.099,
      uncommon: 0.18,
      common: 0.688,
    },
    glassProbs: {
      rare: 0.58,
      epic: 0.25,
      super_epic: 0.15,
      unique: 0.05,
    },
  },
};

// 시즈나이트 내부 점수
export const DUNGEON_SCORE_WEIGHTS = {
  top: 1000, // 상급
  rare: 400,
  uncommon: 120,
  common: 40,
};

// 설탕 유리조각 내부 점수
export const GLASS_SCORE_WEIGHTS = {
  rare: 30,
  epic: 80,
  super_epic: 200,
  unique: 500,
};

// 보너스 스테이지: 2% 확률, 상급 1개 확정
export const BONUS_STAGE_PROB = 0.02;
