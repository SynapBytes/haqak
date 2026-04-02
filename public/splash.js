(function () {
  const logo = document.getElementById("splash-logo");
  const brand = document.getElementById("splash-brand");
  const splash = document.getElementById("haqak-splash");

  if (!logo || !brand || !splash) return;

  // Stage 1: Show Logo
  setTimeout(() => {
    logo.classList.add("active");
  }, 100);

  // Stage 2: Transition to Brand
  setTimeout(() => {
    logo.classList.remove("active");
    logo.classList.add("fade-out");
    setTimeout(() => {
      brand.classList.add("active");
    }, 400);
  }, 2000);

  // Stage 3: Exit Splash
  setTimeout(() => {
    brand.classList.remove("active");
    brand.classList.add("fade-out");
    setTimeout(() => {
      splash.style.opacity = "0";
      setTimeout(() => {
        splash.remove();
        document.body.style.backgroundColor = "";
      }, 800);
    }, 400);
  }, 4200);

  // Safety: Ensure splash is removed even if something fails
  setTimeout(() => {
    if (splash.isConnected) {
      splash.remove();
      document.body.style.backgroundColor = "";
    }
  }, 6000);
})();
