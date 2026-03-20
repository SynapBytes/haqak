/* Service Worker for Web Push Notifications */
self.addEventListener("push", (event) => {
  if (!event.data) return;
  try {
    const payload = event.data.json();
    const { title, body, icon, data } = payload;
    event.waitUntil(
      self.registration.showNotification(title || "صوتك", {
        body: body || "",
        icon: icon || "/logo-sawtak.png",
        badge: "/logo-sawtak.png",
        data: data || {},
      })
    );
  } catch (e) {
    console.error("[push-sw] Error:", e);
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow("/");
    })
  );
});
