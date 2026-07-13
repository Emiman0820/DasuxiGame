import {
    onAuthStateChanged,
    signInAnonymously
  } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
  
  import {
    auth
  } from "./firebase-config.js";
  
  import {
    createRoom,
    joinRoom,
    listenPlayers,
    listenRoom
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
  
  const waitingMessage =
    document.getElementById("waitingMessage");
  
  const playerList =
    document.getElementById("playerList");
  
  let currentUser = null;
  let currentRoomId = null;
  let currentRoom = null;
  let currentPlayers = [];
  
  let unsubscribeRoom = null;
  let unsubscribePlayers = null;
  
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
  
  joinRoomButton.addEventListener(
    "click",
    handleJoinRoom
  );
  
  roomIdInput.addEventListener("input", function () {
    roomIdInput.value = roomIdInput.value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
  });
  
  async function handleCreateRoom() {
    if (!currentUser) {
      message.textContent =
        "Firebaseへの接続を確認しています";
  
      return;
    }
  
    const playerName =
      playerNameInput.value.trim();
  
    const maxPlayers =
      Number(maxPlayersSelect.value);
  
    if (!validatePlayerName(playerName)) {
      return;
    }
  
    setHomeButtonsDisabled(true);
    message.textContent =
      "部屋を作成しています...";
  
    try {
      const roomId = await createRoom({
        hostId: currentUser.uid,
        playerName,
        maxPlayers
      });
  
      openWaitingRoom(roomId);
    } catch (error) {
      console.error("部屋作成エラー:", error);
  
      message.textContent =
        error.message || "部屋の作成に失敗しました";
  
      setHomeButtonsDisabled(false);
    }
  }
  
  async function handleJoinRoom() {
    if (!currentUser) {
      message.textContent =
        "Firebaseへの接続を確認しています";
  
      return;
    }
  
    const playerName =
      playerNameInput.value.trim();
  
    const roomId =
      roomIdInput.value.trim().toUpperCase();
  
    if (!validatePlayerName(playerName)) {
      return;
    }
  
    if (roomId.length !== 6) {
      message.textContent =
        "6文字のルームIDを入力してください";
  
      roomIdInput.focus();
      return;
    }
  
    setHomeButtonsDisabled(true);
    message.textContent =
      "部屋に参加しています...";
  
    try {
      const joinedRoomId = await joinRoom({
        roomId,
        playerId: currentUser.uid,
        playerName
      });
  
      openWaitingRoom(joinedRoomId);
    } catch (error) {
      console.error("部屋参加エラー:", error);
  
      message.textContent =
        error.message || "部屋への参加に失敗しました";
  
      setHomeButtonsDisabled(false);
    }
  }
  
  function validatePlayerName(playerName) {
    if (playerName) {
      return true;
    }
  
    message.textContent =
      "プレイヤー名を入力してください";
  
    playerNameInput.focus();
  
    return false;
  }
  
  function openWaitingRoom(roomId) {
    currentRoomId = roomId;
  
    homeScreen.classList.add("hidden");
    waitingRoomScreen.classList.remove("hidden");
  
    displayRoomId.textContent = roomId;
  
    startRoomListeners(roomId);
  }
  
  function startRoomListeners(roomId) {
    stopRoomListeners();
  
    unsubscribeRoom = listenRoom(
      roomId,
      function (room) {
        if (!room) {
          waitingMessage.textContent =
            "部屋が見つかりません";
  
          return;
        }
  
        currentRoom = room;
        renderWaitingRoom();
      },
      handleListenerError
    );
  
    unsubscribePlayers = listenPlayers(
      roomId,
      function (players) {
        currentPlayers = players;
        renderWaitingRoom();
      },
      handleListenerError
    );
  }
  
  function stopRoomListeners() {
    if (unsubscribeRoom) {
      unsubscribeRoom();
      unsubscribeRoom = null;
    }
  
    if (unsubscribePlayers) {
      unsubscribePlayers();
      unsubscribePlayers = null;
    }
  }
  
  function renderWaitingRoom() {
    if (!currentRoom) {
      return;
    }
  
    const playerCount = currentPlayers.length;
    const maxPlayers = currentRoom.maxPlayers;
  
    if (playerCount >= maxPlayers) {
      waitingMessage.textContent =
        "全員揃いました";
    } else {
      waitingMessage.textContent =
        `プレイヤーを待っています（${playerCount} / ${maxPlayers}）`;
    }
  
    playerList.innerHTML = currentPlayers
      .map(function (player, index) {
        const hostLabel = player.isHost
          ? `<span class="host-label">ホスト</span>`
          : "";
  
        const ownLabel =
          player.id === currentUser?.uid
            ? `<span class="own-label">あなた</span>`
            : "";
  
        return `
          <div class="player-card">
            <span>
              ${index + 1}.
              ${escapeHtml(player.name)}
            </span>
  
            <span class="player-labels">
              ${ownLabel}
              ${hostLabel}
            </span>
          </div>
        `;
      })
      .join("");
  }
  
  function handleListenerError(error) {
    console.error("リアルタイム監視エラー:", error);
  
    waitingMessage.textContent =
      "部屋情報の取得に失敗しました";
  }
  
  function setHomeButtonsDisabled(disabled) {
    createRoomButton.disabled = disabled;
    joinRoomButton.disabled = disabled;
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