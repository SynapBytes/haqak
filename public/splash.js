(function () {
  const splash = document.getElementById("haqak-splash");
  const root = document.getElementById("root");

  if (!splash || !root) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const startedAt = performance.now();
  const minimumDuration = reduceMotion ? 180 : 1350;
  const maximumDuration = 5200;
  let appReady = root.childElementCount > 0;
  let windowReady = document.readyState === "complete";
  let removed = false;

  document.body.classList.add("splash-lock");
  requestAnimationFrame(() => splash.classList.add("is-entered"));

  const cleanup = () => {
    if (removed) return;
    removed = true;
    splash.remove();
    document.body.classList.remove("splash-lock");
    document.body.style.backgroundColor = "";
  };

  const exit = () => {
    if (removed || splash.classList.contains("is-exiting")) return;

    const elapsed = performance.now() - startedAt;
    const delay = Math.max(0, minimumDuration - elapsed);

    window.setTimeout(() => {
      splash.classList.add("is-ready");
      window.setTimeout(() => {
        splash.classList.add("is-exiting");
        window.setTimeout(cleanup, reduceMotion ? 80 : 720);
      }, reduceMotion ? 30 : 220);
    }, delay);
  };

  const maybeExit = () => {
    if (appReady && windowReady) exit();
  };

  const observer = new MutationObserver(() => {
    if (root.childElementCount > 0) {
      appReady = true;
      observer.disconnect();
      maybeExit();
    }
  });

  observer.observe(root, { childList: true });

  window.addEventListener(
    "load",
    () => {
      windowReady = true;
      maybeExit();
    },
    { once: true },
  );

  window.setTimeout(exit, maximumDuration);
  window.setTimeout(cleanup, maximumDuration + 1200);
})();
