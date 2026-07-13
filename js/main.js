import {
    signInAnonymously,
    onAuthStateChanged
  } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
  
  import {
    auth
  } from "./firebase-config.js";
  
  const connectionStatus =
    document.getElementById("connectionStatus");
  
  const message =
    document.getElementById("message");
  
  const createRoomButton =
    document.getElementById("createRoomButton");
  
  const joinRoomButton =
    document.getElementById("joinRoomButton");
  
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
        "接続に失敗しました。しばらくしてから再度お試しください。";
    }
  }
  
  onAuthStateChanged(auth, function (user) {
    if (!user) {
      return;
    }
  
    console.log("ユーザーID:", user.uid);
  
    connectionStatus.textContent =
      "Firebaseに接続しました";
  
    createRoomButton.disabled = false;
    joinRoomButton.disabled = false;
  });
  
  loginAnonymously();