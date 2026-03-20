const VAPID_PUBLIC_KEY = "BNVKoUpjJ2sGXKaWxBBbSGkPTGv38mDDeUbk1UFupvGkZ8_xWVj5dg8MnH-ZnNvtpOOMHu-HjbGZe4mZSSRw0M4";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export interface PushSubscriptionData {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export async function subscribeToPush(): Promise<PushSubscriptionData | null> {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.warn("Push notifications not supported");
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("Notification permission denied");
      return null;
    }

    const registration = await navigator.serviceWorker.register("/push-sw.js");
    await navigator.serviceWorker.ready;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    const key = subscription.getKey("p256dh");
    const auth = subscription.getKey("auth");

    if (!key || !auth) {
      console.error("Missing push subscription keys");
      return null;
    }

    return {
      endpoint: subscription.endpoint,
      p256dh: arrayBufferToBase64(key),
      auth: arrayBufferToBase64(auth),
    };
  } catch (error) {
    console.error("Error subscribing to push:", error);
    return null;
  }
}
