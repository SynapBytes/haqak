/* eslint-disable no-undef */
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyAjxJ1v1R7Vm4-8n_lLQwxgEHZ9og4y4D8",
  authDomain: "sutak-3dfc4.firebaseapp.com",
  projectId: "sutak-3dfc4",
  storageBucket: "sutak-3dfc4.firebasestorage.app",
  messagingSenderId: "338886158794",
  appId: "1:338886158794:web:e3b0d96fc7bd9fb5594733",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-messaging-sw.js] Background message:", payload);
  const { title, body } = payload.notification || {};
  if (title) {
    self.registration.showNotification(title, {
      body: body || "",
      icon: "/logo-sawtak.png",
      badge: "/logo-sawtak.png",
    });
  }
});
