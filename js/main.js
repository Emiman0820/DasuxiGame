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
    listenRoom,
    startGame
} from "./room.js";

import {
    rollDice,
    toggleDiceKeep,
    confirmScore
} from "./game.js";

import {
    calculateScoreCandidates,
    SCORE_CATEGORIES
} from "./score.js";

//エフェクトを追加する場合は以下に追加する
const SCORE_EFFECTS = {
    yacht: {
        minScore: 50,
        title: "YACHT!!",
        className: "effect-yacht",
        duration: 2500
    },

    fullHouse: {
        minScore: 1,
        title: "FULL HOUSE!",
        className: "effect-full-house",
        duration: 1600
    },

    largeStraight: {
        minScore: 30,
        title: "LARGE STRAIGHT!",
        className: "effect-large-straight",
        duration: 1800
    },

    fourCard: {
        minScore: 1,
        title: "FOUR OF A KIND!",
        className: "effect-four-card",
        duration: 1500
    }
};

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

const startGameButton =
    document.getElementById("startGameButton");

const gameScreen =
    document.getElementById("gameScreen");

const gameRoomId =
    document.getElementById("gameRoomId");

const gamePlayerList =
    document.getElementById("gamePlayerList");

const roundText =
    document.getElementById("roundText");

const currentPlayerText =
    document.getElementById("currentPlayerText");

const turnMessage =
    document.getElementById("turnMessage");

const diceElements =
    document.querySelectorAll(".dice");

const remainingRollsText =
    document.getElementById("remainingRollsText");

const rollDiceButton =
    document.getElementById("rollDiceButton");

const diceRollSound =
    document.getElementById("diceRollSound");

const scoreBoard =
    document.getElementById("scoreBoard");

const scoreHelp =
    document.getElementById("scoreHelp");

const scoreConfirmModal =
    document.getElementById("scoreConfirmModal");

const confirmCategoryName =
    document.getElementById("confirmCategoryName");

const confirmScoreValue =
    document.getElementById("confirmScoreValue");

const cancelScoreButton =
    document.getElementById("cancelScoreButton");

const confirmScoreButton =
    document.getElementById("confirmScoreButton");

const scoreEffect =
    document.getElementById("scoreEffect");

const scoreEffectPlayer =
    document.getElementById("scoreEffectPlayer");

const scoreEffectTitle =
    document.getElementById("scoreEffectTitle");

const scoreEffectValue =
    document.getElementById("scoreEffectValue");

const allScoreBoard =
    document.getElementById("allScoreBoard");

const appContainer =
    document.querySelector(".container");

const resultScreen =
    document.getElementById("resultScreen");

const resultRoomId =
    document.getElementById("resultRoomId");

const winnerName =
    document.getElementById("winnerName");

const winnerScore =
    document.getElementById("winnerScore");

const resultRanking =
    document.getElementById("resultRanking");

const resultScoreBoard =
    document.getElementById("resultScoreBoard");

const returnHomeButton =
    document.getElementById("returnHomeButton");

const DICE_PIP_POSITIONS = {
    1: ["center"],

    2: [
        "top-left",
        "bottom-right"
    ],

    3: [
        "top-left",
        "center",
        "bottom-right"
    ],

    4: [
        "top-left",
        "top-right",
        "bottom-left",
        "bottom-right"
    ],

    5: [
        "top-left",
        "top-right",
        "center",
        "bottom-left",
        "bottom-right"
    ],

    6: [
        "top-left",
        "middle-left",
        "bottom-left",
        "top-right",
        "middle-right",
        "bottom-right"
    ]
};

function renderDiceFace(
    diceElement,
    value
) {
    const positions =
        DICE_PIP_POSITIONS[value] ??
        DICE_PIP_POSITIONS[1];

    diceElement.innerHTML = positions
        .map(function (position) {
            return `
          <span class="pip ${position}"></span>
        `;
        })
        .join("");

    diceElement.setAttribute(
        "aria-label",
        `サイコロの目 ${value}`
    );
}

let currentUser = null;
let currentRoomId = null;
let currentRoom = null;
let currentPlayers = [];

let unsubscribeRoom = null;
let unsubscribePlayers = null;

let displayedRollNumber = 0;
let isDiceAnimating = false;

let pendingScoreCategory = null;
let displayedScoreEventNumber = 0;
let isScoreConfirming = false;
let isScoreEffectPlaying = false;

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

startGameButton.addEventListener(
    "click",
    handleStartGame
);

rollDiceButton.addEventListener(
    "click",
    handleRollDice
);

scoreBoard.addEventListener(
    "click",
    handleScoreBoardClick
);

cancelScoreButton.addEventListener(
    "click",
    closeScoreConfirmModal
);

confirmScoreButton.addEventListener(
    "click",
    handleConfirmScore
);

returnHomeButton.addEventListener(
    "click",
    handleReturnHome
);

diceElements.forEach(function (
    diceElement,
    index
) {
    diceElement.addEventListener(
        "click",
        function () {
            handleToggleDiceKeep(index);
        }
    );
});

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

    if (currentRoom.status === "playing") {
        if (gameScreen.classList.contains("hidden")) {
            openGameScreen();
        } else {
            renderGameScreen();
        }

        return;
    }

    if (currentRoom.status === "finished") {
        openResultScreen();
        return;
    }

    const playerCount = currentPlayers.length;
    const maxPlayers = currentRoom.maxPlayers;

    const isHost =
        currentRoom.hostId === currentUser?.uid;

    const isFull =
        playerCount >= maxPlayers;

    if (isFull) {
        waitingMessage.textContent =
            isHost
                ? "全員揃いました。ゲームを開始できます"
                : "全員揃いました。ホストの開始を待っています";
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

    if (isHost) {
        startGameButton.classList.remove("hidden");
        startGameButton.disabled = !isFull;

        startGameButton.textContent = isFull
            ? "ゲーム開始"
            : `あと${maxPlayers - playerCount}人`;
    } else {
        startGameButton.classList.add("hidden");
    }
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

async function handleStartGame() {
    if (!currentUser || !currentRoomId) {
        waitingMessage.textContent =
            "部屋情報を確認できません";

        return;
    }

    try {
        startGameButton.disabled = true;
        startGameButton.textContent =
            "ゲームを開始しています...";

        const playerIds = currentPlayers.map(
            function (player) {
                return player.id;
            }
        );

        await startGame({
            roomId: currentRoomId,
            userId: currentUser.uid,
            playerIds
        });
    } catch (error) {
        console.error("ゲーム開始エラー:", error);

        waitingMessage.textContent =
            error.message ||
            "ゲームの開始に失敗しました";

        renderWaitingRoom();
    }
}

function openGameScreen() {
    waitingRoomScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");

    appContainer.classList.add(
        "game-container-wide"
    );

    gameRoomId.textContent =
        `ルームID：${currentRoomId}`;

    renderGameScreen();
}

function renderGameScreen() {
    if (
        !currentRoom ||
        currentRoom.status !== "playing"
    ) {
        return;
    }

    const scoreEventNumber =
        currentRoom.scoreEventNumber ?? 0;

    if (
        scoreEventNumber >
        displayedScoreEventNumber &&
        !isScoreEffectPlaying
    ) {
        displayedScoreEventNumber =
            scoreEventNumber;

        showScoreEffect({
            playerId:
                currentRoom.lastScorePlayerId,

            categoryKey:
                currentRoom.lastScoreCategory,

            score:
                currentRoom.lastScoreValue
        });
    }

    const rollNumber =
        currentRoom.rollNumber ?? 0;

    if (
        rollNumber > displayedRollNumber &&
        !isDiceAnimating
    ) {
        displayedRollNumber = rollNumber;

        const finalDice =
            Array.isArray(currentRoom.dice)
                ? [...currentRoom.dice]
                : [1, 1, 1, 1, 1];

        animateDiceRoll(finalDice);
        return;
    }

    const currentPlayerIndex =
        currentRoom.currentPlayerIndex ?? 0;

    const currentPlayer =
        currentPlayers[currentPlayerIndex];

    if (!currentPlayer) {
        currentPlayerText.textContent =
            "プレイヤー情報を取得中...";

        rollDiceButton.disabled = true;
        return;
    }

    const isMyTurn =
        currentPlayer.id === currentUser?.uid;

    const remainingRolls =
        currentRoom.remainingRolls ?? 3;

    roundText.textContent =
        `ラウンド ${currentRoom.currentRound ?? 1}`;

    currentPlayerText.textContent =
        `${currentPlayer.name} の手番`;

    if (isMyTurn) {
        turnMessage.textContent =
            remainingRolls > 0
                ? "あなたの手番です"
                : "振り終わりました。役を選んでください";
    } else {
        turnMessage.textContent =
            `${currentPlayer.name}さんの操作を待っています`;
    }

    const dice = Array.isArray(currentRoom.dice)
        ? currentRoom.dice
        : [1, 1, 1, 1, 1];

    const keptDice =
        Array.isArray(currentRoom.keptDice)
            ? currentRoom.keptDice
            : [false, false, false, false, false];

    const hasRolled =
        currentRoom.hasRolled === true;

    diceElements.forEach(function (
        diceElement,
        index
    ) {
        const value = dice[index] ?? 1;
        const isKept = keptDice[index];

        if (!isDiceAnimating) {
            renderDiceFace(
                diceElement,
                value
            );
        }

        diceElement.classList.toggle(
            "kept",
            isKept
        );

        diceElement.disabled =
            !isMyTurn ||
            !hasRolled ||
            isDiceAnimating;

        diceElement.title = isKept
            ? "クリックしてキープ解除"
            : "クリックしてキープ";
    });

    remainingRollsText.textContent =
        `残り${remainingRolls}回`;

    rollDiceButton.disabled =
        !isMyTurn || remainingRolls <= 0;

    rollDiceButton.textContent =
        remainingRolls > 0
            ? "サイコロを振る"
            : "役を選んでください";

    const confirmedScores =
        currentPlayer.scores ?? {};

    renderScoreBoard({
        dice,
        isMyTurn,
        hasRolled,
        confirmedScores
    });

    gamePlayerList.innerHTML = currentPlayers
        .map(function (player, index) {
            const isCurrent =
                index === currentPlayerIndex;

            const turnLabel = isCurrent
                ? `<span class="turn-label">手番</span>`
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
              ${turnLabel}
            </span>
          </div>
        `;
        })
        .join("");

    renderAllPlayerScores(
        currentPlayerIndex
    );
}

async function handleRollDice() {
    if (!currentUser || !currentRoomId) {
        turnMessage.textContent =
            "ゲーム情報を確認できません";

        return;
    }

    try {
        rollDiceButton.disabled = true;
        rollDiceButton.textContent =
            "振っています...";

        /*
         * ユーザー操作直後なので、
         * 自分側の効果音を開始しやすい
         */
        playDiceSound();

        await rollDice({
            roomId: currentRoomId,
            userId: currentUser.uid
        });
    } catch (error) {
        console.error(
            "サイコロ処理エラー:",
            error
        );

        turnMessage.textContent =
            error.message ||
            "サイコロを振れませんでした";

        renderGameScreen();
    }
}

async function handleToggleDiceKeep(index) {
    if (
        !currentUser ||
        !currentRoomId ||
        isDiceAnimating
    ) {
        return;
    }

    try {
        await toggleDiceKeep({
            roomId: currentRoomId,
            userId: currentUser.uid,
            diceIndex: index
        });
    } catch (error) {
        console.error(
            "サイコロキープエラー:",
            error
        );

        turnMessage.textContent =
            error.message ||
            "キープ状態を変更できませんでした";
    }
}

async function animateDiceRoll(finalDice) {
    if (isDiceAnimating) {
        return;
    }

    isDiceAnimating = true;

    rollDiceButton.disabled = true;

    const wasRolledByMe =
        currentRoom.lastRolledBy ===
        currentUser?.uid;

    if (!wasRolledByMe) {
        playDiceSound();
    }

    const keptDice =
        Array.isArray(currentRoom.keptDice)
            ? currentRoom.keptDice
            : [false, false, false, false, false];

    diceElements.forEach(function (
        diceElement,
        index
    ) {
        if (!keptDice[index]) {
            diceElement.classList.add("rolling");
        }
    });

    const animationDuration = 700;
    const changeInterval = 80;

    const intervalId = window.setInterval(
        function () {
            diceElements.forEach(function (
                diceElement,
                index
            ) {
                if (keptDice[index]) {
                    return;
                }

                const randomValue =
                    Math.floor(Math.random() * 6) + 1;

                renderDiceFace(
                    diceElement,
                    randomValue
                );
            });
        },
        changeInterval
    );

    await wait(animationDuration);

    window.clearInterval(intervalId);

    diceElements.forEach(function (
        diceElement,
        index
    ) {
        renderDiceFace(
            diceElement,
            finalDice[index] ?? 1
        );

        diceElement.classList.remove("rolling");

        if (!keptDice[index]) {
            diceElement.classList.add("landed");

            window.setTimeout(function () {
                diceElement.classList.remove("landed");
            }, 250);
        }
    });

    isDiceAnimating = false;

    renderGameScreen();
}

function wait(milliseconds) {
    return new Promise(function (resolve) {
        window.setTimeout(resolve, milliseconds);
    });
}

function playDiceSound() {
    if (!diceRollSound) {
        return;
    }

    diceRollSound.pause();
    diceRollSound.currentTime = 0;

    const playPromise =
        diceRollSound.play();

    if (playPromise) {
        playPromise.catch(function (error) {
            console.debug(
                "サイコロ音を再生できませんでした:",
                error
            );
        });
    }
}

function renderScoreBoard({
    dice,
    isMyTurn,
    hasRolled,
    confirmedScores
}) {
    const scores = confirmedScores ?? {};

    // まだサイコロを振っていない場合
    if (!hasRolled) {
        scoreHelp.textContent =
            "最初にサイコロを振ってください";

        scoreBoard.innerHTML =
            SCORE_CATEGORIES
                .map(function (category) {
                    const confirmedScore =
                        scores[category.key];

                    const isConfirmed =
                        confirmedScore !== undefined &&
                        confirmedScore !== null;

                    return createScoreRowHtml({
                        category,
                        score: isConfirmed
                            ? confirmedScore
                            : null,
                        disabled: true,
                        isConfirmed
                    });
                })
                .join("");

        return;
    }

    let candidates;

    try {
        candidates =
            calculateScoreCandidates(dice);
    } catch (error) {
        console.error(
            "得点計算エラー:",
            error
        );

        scoreHelp.textContent =
            "得点を計算できませんでした";

        return;
    }

    scoreHelp.textContent = isMyTurn
        ? "現在の出目で獲得できる得点です"
        : "手番プレイヤーの得点候補です";

    scoreBoard.innerHTML =
        SCORE_CATEGORIES
            .map(function (category) {
                const confirmedScore =
                    scores[category.key];

                const isConfirmed =
                    confirmedScore !== undefined &&
                    confirmedScore !== null;

                return createScoreRowHtml({
                    category,

                    // 確定済みなら確定点、
                    // 未使用なら今回の候補点
                    score: isConfirmed
                        ? confirmedScore
                        : candidates[category.key],

                    // 確定済みの役は押せない
                    disabled:
                        isConfirmed ||
                        !isMyTurn ||
                        isDiceAnimating,

                    isConfirmed
                });
            })
            .join("");
}

function createScoreRowHtml({
    category,
    score,
    disabled,
    isConfirmed = false
}) {
    const scoreText =
        score === null
            ? "-"
            : `${score}点`;

    const sectionClass =
        category.section === "number"
            ? "number-score"
            : "combination-score";

    const confirmedClass =
        isConfirmed
            ? "confirmed"
            : "";

    return `
      <button
        type="button"
        class="score-row ${sectionClass} ${confirmedClass}"
        data-category="${category.key}"
        ${disabled ? "disabled" : ""}
      >
        <span class="score-name">
          ${isConfirmed ? "✓ " : ""}
          ${escapeHtml(category.label)}
        </span>

        <span class="score-value">
          ${scoreText}
        </span>
      </button>
    `;
}

function handleScoreBoardClick(event) {
    const scoreRow =
        event.target.closest(".score-row");

    if (
        !scoreRow ||
        scoreRow.disabled ||
        isDiceAnimating ||
        isScoreConfirming
    ) {
        return;
    }

    const categoryKey =
        scoreRow.dataset.category;

    const category =
        SCORE_CATEGORIES.find(function (item) {
            return item.key === categoryKey;
        });

    if (!category) {
        return;
    }

    const dice = currentRoom?.dice;

    if (!Array.isArray(dice)) {
        return;
    }

    const candidates =
        calculateScoreCandidates(dice);

    const score =
        candidates[categoryKey];

    pendingScoreCategory = {
        key: categoryKey,
        label: category.label,
        score
    };

    confirmCategoryName.textContent =
        category.label;

    confirmScoreValue.textContent =
        `${score}点`;

    scoreConfirmModal.classList.remove("hidden");
}

function closeScoreConfirmModal() {
    if (isScoreConfirming) {
        return;
    }

    pendingScoreCategory = null;
    scoreConfirmModal.classList.add("hidden");
}

async function handleConfirmScore() {
    if (
        !pendingScoreCategory ||
        !currentUser ||
        !currentRoomId ||
        isScoreConfirming
    ) {
        return;
    }

    try {
        isScoreConfirming = true;

        confirmScoreButton.disabled = true;
        cancelScoreButton.disabled = true;

        confirmScoreButton.textContent =
            "確定しています...";

        await confirmScore({
            roomId: currentRoomId,
            userId: currentUser.uid,
            categoryKey:
                pendingScoreCategory.key
        });

        scoreConfirmModal.classList.add("hidden");
        pendingScoreCategory = null;
    } catch (error) {
        console.error(
            "得点確定エラー:",
            error
        );

        turnMessage.textContent =
            error.message ||
            "得点を確定できませんでした";
    } finally {
        isScoreConfirming = false;

        confirmScoreButton.disabled = false;
        cancelScoreButton.disabled = false;

        confirmScoreButton.textContent =
            "確定する";
    }
}

async function showScoreEffect({
    playerId,
    categoryKey,
    score
}) {
    if (isScoreEffectPlaying) {
        return;
    }

    const player =
        currentPlayers.find(function (item) {
            return item.id === playerId;
        });

    const category =
        SCORE_CATEGORIES.find(function (item) {
            return item.key === categoryKey;
        });

    if (!category) {
        return;
    }

    isScoreEffectPlaying = true;

    const specialEffect =
        SCORE_EFFECTS[categoryKey];

    const useSpecialEffect =
        specialEffect &&
        score >= specialEffect.minScore;

    scoreEffect.className =
        "score-effect";

    if (useSpecialEffect) {
        scoreEffect.classList.add(
            specialEffect.className
        );

        scoreEffectTitle.textContent =
            specialEffect.title;
    } else {
        scoreEffect.classList.add(
            "effect-normal"
        );

        scoreEffectTitle.textContent =
            category.label;
    }

    scoreEffectPlayer.textContent =
        player
            ? `${player.name} が獲得！`
            : "得点獲得！";

    scoreEffectValue.textContent =
        `${score} POINTS`;

    scoreEffect.classList.remove("hidden");

    const duration =
        useSpecialEffect
            ? specialEffect.duration
            : 900;

    await wait(duration);

    scoreEffect.classList.add("hidden");

    isScoreEffectPlaying = false;
}

function renderAllPlayerScores(currentPlayerIndex) {
    if (
        !allScoreBoard ||
        currentPlayers.length === 0
    ) {
        return;
    }

    const headerHtml = `
      <thead>
        <tr>
          <th class="score-category-header">
            役
          </th>

          ${currentPlayers
            .map(function (player, index) {
                const isCurrent =
                    index === currentPlayerIndex;

                return `
                    <th class="
                      score-player-header
                      ${isCurrent ? "current-score-player" : ""}
                    ">
                      ${escapeHtml(player.name)}

                      ${isCurrent
                        ? `<span class="score-turn-mark">
                                   手番
                                 </span>`
                        : ""
                    }
                    </th>
                  `;
            })
            .join("")}
        </tr>
      </thead>
    `;

    const scoreRowsHtml =
        SCORE_CATEGORIES
            .map(function (category) {
                return `
                  <tr>
                    <th class="score-category-name">
                      ${escapeHtml(category.label)}
                    </th>

                    ${currentPlayers
                        .map(function (player, index) {
                            const score =
                                player.scores?.[
                                category.key
                                ];

                            const isConfirmed =
                                score !== undefined &&
                                score !== null;

                            const isCurrent =
                                index === currentPlayerIndex;

                            return `
                              <td class="
                                score-player-value
                                ${isCurrent ? "current-score-player" : ""}
                                ${isConfirmed ? "" : "score-empty"}
                              ">
                                ${isConfirmed
                                    ? score
                                    : "－"
                                }
                              </td>
                            `;
                        })
                        .join("")}
                  </tr>
                `;
            })
            .join("");

    const totalRowHtml = `
      <tr class="score-total-row">
        <th class="score-category-name">
          合計
        </th>

        ${currentPlayers
            .map(function (player, index) {
                const totalScore =
                    calculateConfirmedTotal(
                        player.scores
                    );

                const isCurrent =
                    index === currentPlayerIndex;

                return `
                  <td class="
                    score-total-value
                    ${isCurrent ? "current-score-player" : ""}
                  ">
                    ${totalScore}
                  </td>
                `;
            })
            .join("")}
      </tr>
    `;

    allScoreBoard.innerHTML = `
      ${headerHtml}

      <tbody>
        ${scoreRowsHtml}
        ${totalRowHtml}
      </tbody>
    `;
}

function calculateConfirmedTotal(scores) {
    if (!scores) {
        return 0;
    }

    return SCORE_CATEGORIES.reduce(
        function (total, category) {
            const score =
                scores[category.key];

            return typeof score === "number"
                ? total + score
                : total;
        },
        0
    );
}

function openResultScreen() {
    homeScreen.classList.add("hidden");
    waitingRoomScreen.classList.add("hidden");
    gameScreen.classList.add("hidden");

    resultScreen.classList.remove("hidden");

    appContainer.classList.add(
        "game-container-wide"
    );

    resultRoomId.textContent =
        `ルームID：${currentRoomId}`;

    renderResultScreen();
}

function createRanking(players) {
    const sortedPlayers = players
        .map(function (player) {
            return {
                ...player,
                totalScore:
                    calculateConfirmedTotal(
                        player.scores
                    )
            };
        })
        .sort(function (a, b) {
            return b.totalScore - a.totalScore;
        });

    let previousScore = null;
    let previousRank = 0;

    return sortedPlayers.map(
        function (player, index) {
            let rank;

            if (
                previousScore !== null &&
                player.totalScore === previousScore
            ) {
                rank = previousRank;
            } else {
                rank = index + 1;
            }

            previousScore = player.totalScore;
            previousRank = rank;

            return {
                ...player,
                rank
            };
        }
    );
}

function renderResultScreen() {
    const ranking =
        createRanking(currentPlayers);

    if (ranking.length === 0) {
        winnerName.textContent =
            "結果を取得できません";

        winnerScore.textContent = "";
        resultRanking.innerHTML = "";
        return;
    }

    const winners = ranking.filter(
        function (player) {
            return player.rank === 1;
        }
    );

    if (winners.length === 1) {
        winnerName.textContent =
            winners[0].name;

        winnerScore.textContent =
            `${winners[0].totalScore}点`;
    } else {
        winnerName.textContent =
            winners
                .map(function (player) {
                    return player.name;
                })
                .join("・");

        winnerScore.textContent =
            `${winners[0].totalScore}点で同率優勝`;
    }

    resultRanking.innerHTML = ranking
        .map(function (player) {
            const isMe =
                player.id === currentUser?.uid;

            const rankClass =
                player.rank === 1
                    ? "rank-first"
                    : player.rank === 2
                      ? "rank-second"
                      : player.rank === 3
                        ? "rank-third"
                        : "";

            return `
              <article class="
                result-player-card
                ${rankClass}
                ${isMe ? "result-own-player" : ""}
              ">
                <div class="result-rank">
                    ${player.rank}位
                </div>

                <div class="result-player-information">
                    <h3>
                        ${escapeHtml(player.name)}
                        ${isMe ? `<span>あなた</span>` : ""}
                    </h3>
                </div>

                <div class="result-player-score">
                    ${player.totalScore}点
                </div>
              </article>
            `;
        })
        .join("");

    renderResultScoreBoard(ranking);
}

function renderResultScoreBoard(ranking) {
    if (!resultScoreBoard) {
        return;
    }

    const headerHtml = `
      <thead>
        <tr>
          <th class="score-category-header">
            役
          </th>

          ${ranking
              .map(function (player) {
                  return `
                    <th class="score-player-header">
                      ${escapeHtml(player.name)}
                    </th>
                  `;
              })
              .join("")}
        </tr>
      </thead>
    `;

    const categoryRowsHtml =
        SCORE_CATEGORIES
            .map(function (category) {
                return `
                  <tr>
                    <th class="score-category-name">
                      ${escapeHtml(category.label)}
                    </th>

                    ${ranking
                        .map(function (player) {
                            const score =
                                player.scores?.[
                                    category.key
                                ];

                            return `
                              <td class="score-player-value">
                                ${
                                    typeof score === "number"
                                        ? score
                                        : "－"
                                }
                              </td>
                            `;
                        })
                        .join("")}
                  </tr>
                `;
            })
            .join("");

    const totalRowHtml = `
      <tr class="score-total-row">
        <th class="score-category-name">
          合計
        </th>

        ${ranking
            .map(function (player) {
                return `
                  <td class="score-total-value">
                    ${player.totalScore}
                  </td>
                `;
            })
            .join("")}
      </tr>
    `;

    resultScoreBoard.innerHTML = `
      ${headerHtml}

      <tbody>
        ${categoryRowsHtml}
        ${totalRowHtml}
      </tbody>
    `;
}

function handleReturnHome() {
    stopRoomListeners();

    currentRoomId = null;
    currentRoom = null;
    currentPlayers = [];

    displayedRollNumber = 0;
    displayedScoreEventNumber = 0;

    pendingScoreCategory = null;

    resultScreen.classList.add("hidden");
    gameScreen.classList.add("hidden");
    waitingRoomScreen.classList.add("hidden");

    homeScreen.classList.remove("hidden");

    appContainer.classList.remove(
        "game-container-wide"
    );

    playerNameInput.value = "";
    roomIdInput.value = "";

    message.textContent = "";

    createRoomButton.disabled =
        !currentUser;

    joinRoomButton.disabled =
        !currentUser;
}