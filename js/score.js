export const SCORE_CATEGORIES = [
    {
      key: "ones",
      label: "エース",
      section: "number"
    },
    {
      key: "twos",
      label: "デュース",
      section: "number"
    },
    {
      key: "threes",
      label: "スリー",
      section: "number"
    },
    {
      key: "fours",
      label: "フォー",
      section: "number"
    },
    {
      key: "fives",
      label: "ファイブ",
      section: "number"
    },
    {
      key: "sixes",
      label: "シックス",
      section: "number"
    },
    {
      key: "choice",
      label: "チョイス",
      section: "combination"
    },
    {
      key: "fourCard",
      label: "フォーカード",
      section: "combination"
    },
    {
      key: "fullHouse",
      label: "フルハウス",
      section: "combination"
    },
    {
      key: "smallStraight",
      label: "S.ストレート",
      section: "combination"
    },
    {
      key: "largeStraight",
      label: "L.ストレート",
      section: "combination"
    },
    {
      key: "yacht",
      label: "ヨット",
      section: "combination"
    }
  ];
  
  /**
   * 現在のサイコロから、各役の候補点を計算する
   */
  export function calculateScoreCandidates(dice) {
    if (
      !Array.isArray(dice) ||
      dice.length !== 5 ||
      dice.some(function (value) {
        return (
          !Number.isInteger(value) ||
          value < 1 ||
          value > 6
        );
      })
    ) {
      throw new Error(
        "サイコロの値が正しくありません"
      );
    }
  
    const counts = [
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ];
  
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
      ones: counts[1] * 1,
      twos: counts[2] * 2,
      threes: counts[3] * 3,
      fours: counts[4] * 4,
      fives: counts[5] * 5,
      sixes: counts[6] * 6,
  
      choice: total,
  
      fourCard: hasFourCard(counts)
        ? total
        : 0,
  
      fullHouse: hasFullHouse(counts)
        ? total
        : 0,
  
      smallStraight: hasSmallStraight(
        uniqueDice
      )
        ? 15
        : 0,
  
      largeStraight: hasLargeStraight(
        uniqueDice
      )
        ? 30
        : 0,
  
      yacht: counts.includes(5)
        ? 50
        : 0
    };
  }
  
  function hasFourCard(counts) {
    return counts.some(function (count) {
      return count >= 4;
    });
  }
  
  function hasFullHouse(counts) {
    const usedCounts = counts
      .filter(function (count, value) {
        return value !== 0 && count > 0;
      })
      .sort(function (a, b) {
        return a - b;
      });
  
    return (
      usedCounts.length === 2 &&
      usedCounts[0] === 2 &&
      usedCounts[1] === 3
    );
  }
  
  function hasSmallStraight(uniqueDice) {
    const straights = [
      [1, 2, 3, 4],
      [2, 3, 4, 5],
      [3, 4, 5, 6]
    ];
  
    return straights.some(function (straight) {
      return straight.every(function (value) {
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