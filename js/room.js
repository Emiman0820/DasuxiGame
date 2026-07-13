import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp
  } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
  
  import {
    db
  } from "./firebase-config.js";
  
  const ROOM_ID_CHARACTERS =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  
  const ROOM_ID_LENGTH = 6;
  
  /**
   * ランダムなルームIDを生成する
   */
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
  
  /**
   * 未使用のルームIDを生成する
   */
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
  
  /**
   * Firestoreに部屋を作成する
   */
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
      roomId: roomId,
      hostId: hostId,
      status: "waiting",
      maxPlayers: maxPlayers,
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