import {
    doc,
    runTransaction,
    serverTimestamp
  } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
  
  import {
    db
  } from "./firebase-config.js";
  
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