document.addEventListener("DOMContentLoaded", async () => {
  console.log("HydraSense Nexus script loaded.");

  setupLogin();
  setupEventListeners();

  const mainInsight = document.getElementById("mainInsight");
  if (mainInsight) {
    mainInsight.textContent =
      "Loading live water data from the H2O Hackathon API...";
  }

  await loadWaterDataFromAPI();

  renderLocationCards();
  updateDashboard();
});
