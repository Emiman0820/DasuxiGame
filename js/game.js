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
  
      transaction.update(roomReference, {
        dice: nextDice,
        remainingRolls: roomData.remainingRolls - 1,
        lastRolledAt: serverTimestamp(),
        lastRolledBy: userId
      });
    });
  }