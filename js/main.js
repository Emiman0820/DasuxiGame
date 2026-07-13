import {
    signInAnonymously,
    onAuthStateChanged
  } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
  
  import {
    auth
  } from "./firebase-config.js";
  
  import {
    createRoom
  } from "./room.js";
  
  const connectionStatus =
    document.getElementById("connectionStatus");
  
  const message =
    document.getElementById("message");
  
  const playerNameInput =
    document.getElementById("playerName");
  
  const maxPlayersSelect =
    document.getElementById("maxPlayers");
  
  const roomIdInput =
    document.getElementById("roomIdInput");
  
  const createRoomButton =
    document.getElementById("createRoomButton");
  
  const joinRoomButton =
    document.getElementById("joinRoomButton");
  
  const homeScreen =
    document.getElementById("homeScreen");
  
  const waitingRoomScreen =
    document.getElementById("waitingRoomScreen");
  
  const displayRoomId =
    document.getElementById("displayRoomId");
  
  const playerList =
    document.getElementById("playerList");
  
  let currentUser = null;
  
  createRoomButton.disabled = true;
  joinRoomButton.disabled = true;
  
  async function loginAnonymously() {
    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.error("匿名ログインエラー:", error);
  
      connectionStatus.textContent =
        "Firebaseへの接続に失敗しました";
  
      message.textContent =
        "接続に失敗しました";
    }
  }
  
  onAuthStateChanged(auth, function (user) {
    if (!user) {
      return;
    }
  
    currentUser = user;
  
    console.log("ユーザーID:", user.uid);
  
    connectionStatus.textContent =
      "Firebaseに接続しました";
  
    createRoomButton.disabled = false;
    joinRoomButton.disabled = false;
  });
  
  createRoomButton.addEventListener(
    "click",
    handleCreateRoom
  );
  
  async function handleCreateRoom() {
    if (!currentUser) {
      message.textContent =
        "Firebaseへの接続を確認しています...";
  
      return;
    }
  
    const playerName =
      playerNameInput.value.trim();
  
    const maxPlayers =
      Number(maxPlayersSelect.value);
  
    if (!playerName) {
      message.textContent =
        "プレイヤー名を入力してください";
  
      playerNameInput.focus();
      return;
    }
  
    try {
      createRoomButton.disabled = true;
      joinRoomButton.disabled = true;
  
      message.textContent =
        "部屋を作成しています...";
  
      const roomId = await createRoom({
        hostId: currentUser.uid,
        playerName: playerName,
        maxPlayers: maxPlayers
      });
  
      showWaitingRoom({
        roomId: roomId,
        playerName: playerName,
        maxPlayers: maxPlayers
      });
    } catch (error) {
      console.error("部屋作成エラー:", error);
  
      message.textContent =
        error.message || "部屋の作成に失敗しました";
  
      createRoomButton.disabled = false;
      joinRoomButton.disabled = false;
    }
  }
  
  function showWaitingRoom({
    roomId,
    playerName,
    maxPlayers
  }) {
    homeScreen.classList.add("hidden");
    waitingRoomScreen.classList.remove("hidden");
  
    displayRoomId.textContent = roomId;
  
    playerList.innerHTML = `
      <div class="player-card">
        <span>1. ${escapeHtml(playerName)}</span>
        <span class="host-label">ホスト</span>
      </div>
  
      <p>参加者 1 / ${maxPlayers}</p>
    `;
  }
  
  function escapeHtml(value) {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
  
  loginAnonymously();