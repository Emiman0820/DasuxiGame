export const SCORE_CATEGORIES = [
  {
    key: "ones",
    label: "エース",
    section: "upper"
  },
  {
    key: "twos",
    label: "デュース",
    section: "upper"
  },
  {
    key: "threes",
    label: "トレイ",
    section: "upper"
  },
  {
    key: "fours",
    label: "フォー",
    section: "upper"
  },
  {
    key: "fives",
    label: "ファイブ",
    section: "upper"
  },
  {
    key: "sixes",
    label: "シックス",
    section: "upper"
  },
  {
    key: "choice",
    label: "チョイス",
    section: "lower"
  },
  {
    key: "fourCard",
    label: "フォーダイス",
    section: "lower"
  },
  {
    key: "fullHouse",
    label: "フルハウス",
    section: "lower"
  },
  {
    key: "smallStraight",
    label: "S.ストレート",
    section: "lower"
  },
  {
    key: "largeStraight",
    label: "B.ストレート",
    section: "lower"
  },
  {
    key: "yacht",
    label: "ヨット",
    section: "lower"
  }
];

export const UPPER_SCORE_KEYS = [
  "ones",
  "twos",
  "threes",
  "fours",
  "fives",
  "sixes"
];

export const UPPER_BONUS_THRESHOLD = 63;
export const UPPER_BONUS_SCORE = 35;

/**
 * 任天堂版ヨットの得点候補を計算する
 */
export function calculateScoreCandidates(dice) {
  validateDice(dice);

  const counts = Array(7).fill(0);

  dice.forEach(function (value) {
    counts[value]++;
  });

  const total = dice.reduce(
    function (sum, value) {
      return sum + value;
    },
    0
  );

  const uniqueDice = [
    ...new Set(dice)
  ].sort(function (a, b) {
    return a - b;
  });

  return {
    ones: counts[1],
    twos: counts[2] * 2,
    threes: counts[3] * 3,
    fours: counts[4] * 4,
    fives: counts[5] * 5,
    sixes: counts[6] * 6,

    choice: total,

    // 同じ目が4個以上なら、残り1個も含めた合計
    fourCard: counts.some(function (count) {
      return count >= 4;
    })
      ? total
      : 0,

    // 3個＋2個の場合、5個の合計
    fullHouse: hasFullHouse(counts)
      ? total
      : 0,

    smallStraight: hasSmallStraight(uniqueDice)
      ? 15
      : 0,

    largeStraight: hasLargeStraight(uniqueDice)
      ? 30
      : 0,

    yacht: counts.includes(5)
      ? 50
      : 0
  };
}

/**
 * エース～シックスの合計
 */
export function calculateUpperSectionTotal(scores) {
  return UPPER_SCORE_KEYS.reduce(
    function (total, key) {
      const score = scores?.[key];

      return typeof score === "number"
        ? total + score
        : total;
    },
    0
  );
}

/**
 * 上段ボーナス
 */
export function calculateUpperBonus(scores) {
  const upperTotal =
    calculateUpperSectionTotal(scores);

  return upperTotal >= UPPER_BONUS_THRESHOLD
    ? UPPER_BONUS_SCORE
    : 0;
}

/**
 * ボーナス込みの総合計
 */
export function calculateTotalScore(scores) {
  const categoryTotal =
    SCORE_CATEGORIES.reduce(
      function (total, category) {
        const score = scores?.[category.key];

        return typeof score === "number"
          ? total + score
          : total;
      },
      0
    );

  return (
    categoryTotal +
    calculateUpperBonus(scores)
  );
}

function validateDice(dice) {
  const isValid =
    Array.isArray(dice) &&
    dice.length === 5 &&
    dice.every(function (value) {
      return (
        Number.isInteger(value) &&
        value >= 1 &&
        value <= 6
      );
    });

  if (!isValid) {
    throw new Error(
      "サイコロの値が正しくありません"
    );
  }
}

function hasFullHouse(counts) {
  const groupedCounts = counts
    .slice(1)
    .filter(function (count) {
      return count > 0;
    })
    .sort(function (a, b) {
      return a - b;
    });

  return (
    groupedCounts.length === 2 &&
    groupedCounts[0] === 2 &&
    groupedCounts[1] === 3
  );
}

function hasSmallStraight(uniqueDice) {
  const patterns = [
    [1, 2, 3, 4],
    [2, 3, 4, 5],
    [3, 4, 5, 6]
  ];

  return patterns.some(function (pattern) {
    return pattern.every(function (value) {
      return uniqueDice.includes(value);
    });
  });
}

function hasLargeStraight(uniqueDice) {
  const pattern = uniqueDice.join(",");

  return (
    pattern === "1,2,3,4,5" ||
    pattern === "2,3,4,5,6"
  );
}