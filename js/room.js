import {
    collection,
    doc,
    getDoc,
    onSnapshot,
    orderBy,
    query,
    runTransaction,
    serverTimestamp,
    setDoc
  } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
  
  import {
    db
  } from "./firebase-config.js";
  
  const ROOM_ID_CHARACTERS =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  
  const ROOM_ID_LENGTH = 6;
  
  function generateRoomId() {
    let roomId = "";
  
    for (let i = 0; i < ROOM_ID_LENGTH; i++) {
      const randomIndex = Math.floor(
        Math.random() * ROOM_ID_CHARACTERS.length
      );
  
      roomId += ROOM_ID_CHARACTERS[randomIndex];
    }
  
    return roomId;
  }
  
  async function generateUniqueRoomId() {
    const maxAttempts = 10;
  
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const roomId = generateRoomId();
      const roomReference = doc(db, "rooms", roomId);
      const roomSnapshot = await getDoc(roomReference);
  
      if (!roomSnapshot.exists()) {
        return roomId;
      }
    }
  
    throw new Error(
      "ルームIDを作成できませんでした。もう一度お試しください。"
    );
  }
  
  export async function createRoom({
    hostId,
    playerName,
    maxPlayers
  }) {
    if (!hostId) {
      throw new Error("ユーザー情報を確認できません");
    }
  
    if (!playerName) {
      throw new Error("プレイヤー名を入力してください");
    }
  
    if (![2, 3, 4].includes(maxPlayers)) {
      throw new Error("対戦人数が正しくありません");
    }
  
    const roomId = await generateUniqueRoomId();
    const roomReference = doc(db, "rooms", roomId);
  
    await setDoc(roomReference, {
      roomId,
      hostId,
      status: "waiting",
      maxPlayers,
      playerCount: 1,
      currentPlayerIndex: 0,
      createdAt: serverTimestamp()
    });
  
    const playerReference = doc(
      db,
      "rooms",
      roomId,
      "players",
      hostId
    );
  
    await setDoc(playerReference, {
      id: hostId,
      name: playerName,
      order: 0,
      isHost: true,
      joinedAt: serverTimestamp(),
      scores: {}
    });
  
    return roomId;
  }
  
  export async function joinRoom({
    roomId,
    playerId,
    playerName
  }) {
    const normalizedRoomId =
      roomId.trim().toUpperCase();
  
    if (!normalizedRoomId) {
      throw new Error("ルームIDを入力してください");
    }
  
    if (!playerId) {
      throw new Error("ユーザー情報を確認できません");
    }
  
    if (!playerName) {
      throw new Error("プレイヤー名を入力してください");
    }
  
    const roomReference = doc(
      db,
      "rooms",
      normalizedRoomId
    );
  
    const playerReference = doc(
      db,
      "rooms",
      normalizedRoomId,
      "players",
      playerId
    );
  
    await runTransaction(db, async function (transaction) {
      const roomSnapshot =
        await transaction.get(roomReference);
  
      if (!roomSnapshot.exists()) {
        throw new Error("指定された部屋が見つかりません");
      }
  
      const roomData = roomSnapshot.data();
  
      if (roomData.status !== "waiting") {
        throw new Error(
          "この部屋はすでにゲームを開始しています"
        );
      }
  
      const existingPlayerSnapshot =
        await transaction.get(playerReference);
  
      if (existingPlayerSnapshot.exists()) {
        return;
      }
  
      if (roomData.playerCount >= roomData.maxPlayers) {
        throw new Error("この部屋は満員です");
      }
  
      const playerOrder = roomData.playerCount;
  
      transaction.set(playerReference, {
        id: playerId,
        name: playerName,
        order: playerOrder,
        isHost: false,
        joinedAt: serverTimestamp(),
        scores: {}
      });
  
      transaction.update(roomReference, {
        playerCount: roomData.playerCount + 1
      });
    });
  
    return normalizedRoomId;
  }
  
  export function listenRoom(roomId, callback, errorCallback) {
    const roomReference = doc(db, "rooms", roomId);
  
    return onSnapshot(
      roomReference,
      function (snapshot) {
        if (!snapshot.exists()) {
          callback(null);
          return;
        }
  
        callback({
          id: snapshot.id,
          ...snapshot.data()
        });
      },
      errorCallback
    );
  }
  
  export function listenPlayers(
    roomId,
    callback,
    errorCallback
  ) {
    const playersReference = collection(
      db,
      "rooms",
      roomId,
      "players"
    );
  
    const playersQuery = query(
      playersReference,
      orderBy("order", "asc")
    );
  
    return onSnapshot(
      playersQuery,
      function (snapshot) {
        const players = snapshot.docs.map(function (document) {
          return {
            id: document.id,
            ...document.data()
          };
        });
  
        callback(players);
      },
      errorCallback
    );
  }

  /**
 * ホストがゲームを開始する
 */
export async function startGame({
    roomId,
    userId,
    playerIds
  }) {
    if (!roomId) {
      throw new Error("ルームIDを確認できません");
    }
  
    if (!userId) {
      throw new Error("ユーザー情報を確認できません");
    }

    if (!Array.isArray(playerIds) || playerIds.length < 2) {
        throw new Error(
          "プレイヤー情報を確認できません"
        );
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
  
      if (roomData.hostId !== userId) {
        throw new Error(
          "ゲームを開始できるのはホストだけです"
        );
      }
  
      if (roomData.status !== "waiting") {
        throw new Error(
          "この部屋はすでに開始されています"
        );
      }
  
      if (roomData.playerCount < roomData.maxPlayers) {
        throw new Error(
          "設定した人数がまだ揃っていません"
        );
      }
  
      transaction.update(roomReference, {
        status: "playing",
        startedAt: serverTimestamp(),
        playerIds: playerIds,
        currentPlayerIndex: 0,
        currentRound: 1,
        remainingRolls: 3,
        dice: [1, 1, 1, 1, 1],
        keptDice: [
          false,
          false,
          false,
          false,
          false
        ],
        hasRolled: false
      });
    });
  }