import {
    doc,
    runTransaction,
    serverTimestamp
  } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
  
  import {
    db
  } from "./firebase-config.js";

  import {
    calculateScoreCandidates,
    SCORE_CATEGORIES
  } from "./score.js";
  
  const DICE_COUNT = 5;
  
  /**
   * 1〜6のランダムな値を返す
   */
  function createRandomDiceValue() {
    return Math.floor(Math.random() * 6) + 1;
  }
  
  /**
   * 現在のプレイヤーがサイコロを振る
   */
  export async function rollDice({
    roomId,
    userId
  }) {
    if (!roomId) {
      throw new Error("ルームIDを確認できません");
    }
  
    if (!userId) {
      throw new Error("ユーザー情報を確認できません");
    }
  
    const roomReference = doc(
      db,
      "rooms",
      roomId
    );
  
    await runTransaction(db, async function (transaction) {
      const roomSnapshot =
        await transaction.get(roomReference);
  
      if (!roomSnapshot.exists()) {
        throw new Error("部屋が見つかりません");
      }
  
      const roomData = roomSnapshot.data();
  
      if (roomData.status !== "playing") {
        throw new Error(
          "ゲームはまだ開始されていません"
        );
      }
  
      const playerIds = roomData.playerIds;
  
      if (!Array.isArray(playerIds)) {
        throw new Error(
          "プレイヤー情報を確認できません"
        );
      }
  
      const currentPlayerId =
        playerIds[roomData.currentPlayerIndex];
  
      if (currentPlayerId !== userId) {
        throw new Error("現在はあなたの手番ではありません");
      }
  
      if (roomData.remainingRolls <= 0) {
        throw new Error(
          "このターンではもう振れません"
        );
      }
  
      const currentDice = Array.isArray(roomData.dice)
        ? roomData.dice
        : [1, 1, 1, 1, 1];
  
      const keptDice = Array.isArray(roomData.keptDice)
        ? roomData.keptDice
        : [false, false, false, false, false];
  
      const nextDice = Array.from(
        { length: DICE_COUNT },
        function (_, index) {
          if (keptDice[index]) {
            return currentDice[index];
          }
  
          return createRandomDiceValue();
        }
      );
    
      const nextRollNumber =
      (roomData.rollNumber ?? 0) + 1;

      transaction.update(roomReference, {
        dice: nextDice,
      
        remainingRolls:
          roomData.remainingRolls - 1,
      
        hasRolled: true,
      
        rollNumber: nextRollNumber,
      
        lastRolledAt: serverTimestamp(),
        lastRolledBy: userId
      });
    });
  }

  /**
 * サイコロのキープ状態を切り替える
 */
export async function toggleDiceKeep({
    roomId,
    userId,
    diceIndex
  }) {
    if (!roomId) {
      throw new Error("ルームIDを確認できません");
    }
  
    if (!userId) {
      throw new Error("ユーザー情報を確認できません");
    }
  
    if (
      !Number.isInteger(diceIndex) ||
      diceIndex < 0 ||
      diceIndex >= DICE_COUNT
    ) {
      throw new Error("サイコロの指定が正しくありません");
    }
  
    const roomReference = doc(
      db,
      "rooms",
      roomId
    );
  
    await runTransaction(db, async function (transaction) {
      const roomSnapshot =
        await transaction.get(roomReference);
  
      if (!roomSnapshot.exists()) {
        throw new Error("部屋が見つかりません");
      }
  
      const roomData = roomSnapshot.data();
  
      if (roomData.status !== "playing") {
        throw new Error(
          "ゲームはまだ開始されていません"
        );
      }
  
      const playerIds = roomData.playerIds;
  
      const currentPlayerId =
        playerIds?.[roomData.currentPlayerIndex];
  
      if (currentPlayerId !== userId) {
        throw new Error(
          "現在はあなたの手番ではありません"
        );
      }
  
      /*
       * まだ一度も振っていない状態では
       * キープさせない
       */
      if (!roomData.hasRolled) {
        throw new Error(
          "先にサイコロを振ってください"
        );
      }
  
      const keptDice =
        Array.isArray(roomData.keptDice)
          ? [...roomData.keptDice]
          : [false, false, false, false, false];
  
      keptDice[diceIndex] =
        !keptDice[diceIndex];
  
      transaction.update(roomReference, {
        keptDice
      });
    });
  }

  /**
 * 得点を確定して次のプレイヤーへ進む
 */
export async function confirmScore({
    roomId,
    userId,
    categoryKey
  }) {
    if (!roomId) {
      throw new Error("ルームIDを確認できません");
    }
  
    if (!userId) {
      throw new Error("ユーザー情報を確認できません");
    }
  
    const categoryExists =
      SCORE_CATEGORIES.some(function (category) {
        return category.key === categoryKey;
      });
  
    if (!categoryExists) {
      throw new Error("役の指定が正しくありません");
    }
  
    const roomReference = doc(
      db,
      "rooms",
      roomId
    );
  
    const playerReference = doc(
      db,
      "rooms",
      roomId,
      "players",
      userId
    );
  
    let confirmedResult = null;
  
    await runTransaction(db, async function (transaction) {
      const roomSnapshot =
        await transaction.get(roomReference);
  
      const playerSnapshot =
        await transaction.get(playerReference);
  
      if (!roomSnapshot.exists()) {
        throw new Error("部屋が見つかりません");
      }
  
      if (!playerSnapshot.exists()) {
        throw new Error("プレイヤー情報が見つかりません");
      }
  
      const roomData = roomSnapshot.data();
      const playerData = playerSnapshot.data();
  
      if (roomData.status !== "playing") {
        throw new Error(
          "現在は得点を確定できません"
        );
      }
  
      const playerIds = roomData.playerIds;
  
      if (!Array.isArray(playerIds)) {
        throw new Error(
          "プレイヤー情報を確認できません"
        );
      }
  
      const currentPlayerId =
        playerIds[roomData.currentPlayerIndex];
  
      if (currentPlayerId !== userId) {
        throw new Error(
          "現在はあなたの手番ではありません"
        );
      }
  
      if (!roomData.hasRolled) {
        throw new Error(
          "先にサイコロを振ってください"
        );
      }
  
      const scores = playerData.scores ?? {};
  
      if (
        scores[categoryKey] !== undefined &&
        scores[categoryKey] !== null
      ) {
        throw new Error(
          "この役はすでに使用しています"
        );
      }
  
      const dice = Array.isArray(roomData.dice)
        ? roomData.dice
        : null;
  
      if (!dice) {
        throw new Error(
          "サイコロ情報を確認できません"
        );
      }
  
      const candidates =
        calculateScoreCandidates(dice);
  
      const confirmedScore =
        candidates[categoryKey];
  
      const currentPlayerIndex =
        roomData.currentPlayerIndex;
  
      const nextPlayerIndex =
        (currentPlayerIndex + 1) %
        playerIds.length;
  
      const wrappedToFirstPlayer =
        nextPlayerIndex === 0;
  
      const nextRound =
        wrappedToFirstPlayer
          ? (roomData.currentRound ?? 1) + 1
          : (roomData.currentRound ?? 1);
  
      const completedTurns =
        (roomData.completedTurns ?? 0) + 1;
  
      const totalTurns =
        playerIds.length *
        SCORE_CATEGORIES.length;
  
      const isGameFinished =
        completedTurns >= totalTurns;
  
      const scoreEventNumber =
        (roomData.scoreEventNumber ?? 0) + 1;
  
      transaction.update(playerReference, {
        [`scores.${categoryKey}`]:
          confirmedScore
      });
  
      transaction.update(roomReference, {
        status: isGameFinished
          ? "finished"
          : "playing",
  
        currentPlayerIndex: isGameFinished
          ? currentPlayerIndex
          : nextPlayerIndex,
  
        currentRound: isGameFinished
          ? roomData.currentRound
          : nextRound,
  
        completedTurns,
        scoreEventNumber,
  
        lastScorePlayerId: userId,
        lastScoreCategory: categoryKey,
        lastScoreValue: confirmedScore,
  
        remainingRolls: 3,
        dice: [1, 1, 1, 1, 1],
        keptDice: [
          false,
          false,
          false,
          false,
          false
        ],
        hasRolled: false,
        rollNumber: 0
      });
  
      confirmedResult = {
        categoryKey,
        score: confirmedScore,
        isGameFinished
      };
    });
  
    return confirmedResult;
  }