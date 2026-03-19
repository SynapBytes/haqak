import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyAjxJ1v1R7Vm4-8n_lLQwxgEHZ9og4y4D8",
  authDomain: "sutak-3dfc4.firebaseapp.com",
  projectId: "sutak-3dfc4",
  storageBucket: "sutak-3dfc4.firebasestorage.app",
  messagingSenderId: "338886158794",
  appId: "1:338886158794:web:e3b0d96fc7bd9fb5594733",
  measurementId: "G-M2GWMQQ811",
};

const VAPID_KEY = "BNVKoUpjJ2sGXKaWxBBbSGkPTGv38mDDeUbk1UFupvGkZ8_xWVj5dg8MnH-ZnNvtpOOMHu-HjbGZe4mZSSRw0M4";

const app = initializeApp(firebaseConfig);

export async function getFCMToken(): Promise<string | null> {
  try {
    const supported = await isSupported();
    if (!supported) {
      console.warn("Firebase Messaging is not supported in this browser");
      return null;
    }

    const messaging = getMessaging(app);
    
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("Notification permission denied");
      return null;
    }

    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    return token;
  } catch (error) {
    console.error("Error getting FCM token:", error);
    return null;
  }
}

export function onForegroundMessage(callback: (payload: any) => void) {
  isSupported().then((supported) => {
    if (!supported) return;
    const messaging = getMessaging(app);
    onMessage(messaging, callback);
  });
}
