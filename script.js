const API_URL = "https://scoringapi.h2ohackathon.org/Challenge/json";

let locations = [
  {
    name: "Demo: Tracy, CA",
    snowpack: 0.48,
    rainfall: 0.32,
    reservoir: 0.44,
    temp: 94,
    trend: -2.1,
    insight: "Low rainfall and declining reservoir levels are creating moderate water stress."
  },
  {
    name: "Demo: Sacramento, CA",
    snowpack: 0.72,
    rainfall: 0.66,
    reservoir: 0.78,
    temp: 86,
    trend: -0.4,
    insight: "Reservoir storage is strong, and recent rainfall has helped stabilize water availability."
  },
  {
    name: "Demo: Fresno, CA",
    snowpack: 0.36,
    rainfall: 0.28,
    reservoir: 0.31,
    temp: 99,
    trend: -2.8,
    insight: "Low rainfall, high heat, and falling reservoir levels are increasing water risk."
  },
  {
    name: "Demo: Redding, CA",
    snowpack: 0.81,
    rainfall: 0.74,
    reservoir: 0.69,
    temp: 83,
    trend: 0.2,
    insight: "Healthy snowpack and rainfall are supporting safer water availability."
  }
];

let selectedIndex = 0;

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function calculateWAI(location) {
  return Math.round(
    (0.3 * location.snowpack +
      0.3 * location.rainfall +
      0.4 * location.reservoir) *
      100
  );
}

function getStatus(wai) {
  if (wai >= 70) {
    return {
      label: "Safe",
      className: "safe"
    };
  }

  if (wai >= 40) {
    return {
      label: "Warning",
      className: "warning"
    };
  }

  return {
    label: "Critical",
    className: "critical"
  };
}

function predictWAI(wai, trend) {
  return clamp(Math.round(wai + trend * 4));
}

function getHealthRisk(wai, temp) {
  return wai < 40 && temp >= 90;
}

function getDrivers(location) {
  const drivers = [];

  if (location.rainfall < 0.45) {
    drivers.push("low precipitation");
  }

  if (location.reservoir < 0.45) {
    drivers.push("low reservoir storage");
  }

  if (location.snowpack < 0.5) {
    drivers.push("reduced snowpack");
  }

  if (drivers.length === 0) {
    drivers.push("stable water inputs");
  }

  return drivers;
}

function estimateTrend(currentRecord, previousRecord) {
  if (!currentRecord || !previousRecord) {
    return -1;
  }

  const currentLocation = convertAPIRecordToLocation(currentRecord, 0, null);
  const previousLocation = convertAPIRecordToLocation(previousRecord, 0, null);

  const currentWAI = calculateWAI(currentLocation);
  const previousWAI = calculateWAI(previousLocation);

  return currentWAI - previousWAI;
}

function cleanNumber(value) {
  const number = Number(value);

  if (Number.isNaN(number)) {
    return 0;
  }

  return number;
}

function convertAPIRecordToLocation(record, index, previousRecord) {
  const snowpackPercent = cleanNumber(record.Snowpack);
  const precipPercent = cleanNumber(record.Precip);
  const reservoirPercent = cleanNumber(record.Reservoir);

  const trend = previousRecord ? estimateTrend(record, previousRecord) : -1;

  return {
    name: `Water Data: ${record.Date}`,
    snowpack: clamp(snowpackPercent, 0, 150) / 100,
    rainfall: clamp(precipPercent, 0, 150) / 100,
    reservoir: clamp(reservoirPercent, 0, 150) / 100,
    temp: index === 0 ? 94 : 88,
    trend: trend,
    insight: `Challenge API data from ${record.Date}: snowpack is ${snowpackPercent}%, precipitation is ${precipPercent}%, and reservoir level is ${reservoirPercent}%.`
  };
}

async function loadWaterDataFromAPI() {
  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();

    console.log("API water data:", data);

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("API returned no usable data.");
    }

    locations = data.slice(0, 4).map((record, index) => {
      const previousRecord = data[index + 1] || null;
      return convertAPIRecordToLocation(record, index, previousRecord);
    });

    selectedIndex = 0;
  } catch (error) {
    console.error("Could not load API data. Using demo data instead.", error);
  }
}

function chatbotAnswer(question, selected, wai, predicted) {
  const q = question.toLowerCase();
  const status = getStatus(wai).label.toLowerCase();
  const drivers = getDrivers(selected);

  if (
    q.includes("why") ||
    q.includes("red") ||
    q.includes("yellow") ||
    q.includes("explain")
  ) {
    return `${selected.name} is currently marked as ${status} because of ${drivers.join(
      ", "
    )}. The WAI combines snowpack, precipitation, and reservoir levels into one score, so weaker inputs lower the final water availability score.`;
  }

  if (
    q.includes("do") ||
    q.includes("advice") ||
    q.includes("save") ||
    q.includes("help")
  ) {
    return `For ${selected.name}, the best actions are to reduce outdoor watering, fix leaks, reuse water when safe, and pay attention to local water alerts. Small daily changes matter most when the WAI is trending downward.`;
  }

  if (
    q.includes("health") ||
    q.includes("danger") ||
    q.includes("dehydration") ||
    q.includes("body")
  ) {
    return "Health connection: low water availability plus high heat can increase dehydration risk. Dehydration lowers blood volume, which can make the heart pump faster to maintain circulation and can also stress the kidneys.";
  }

  if (
    q.includes("future") ||
    q.includes("predict") ||
    q.includes("30")
  ) {
    return `Based on the recent trend, ${selected.name} is predicted to have a WAI near ${predicted} in about 30 days. This is a simple trend-based estimate, not a full machine learning model.`;
  }

  return `I can explain why your area has this WAI, give water-saving advice, discuss health risks, or estimate the future water score for ${selected.name}.`;
}

function runLogicTests() {
  const tests = [
    {
      name: "WAI calculates weighted score correctly",
      actual: calculateWAI({ snowpack: 0.6, rainfall: 0.4, reservoir: 0.8 }),
      expected: 62
    },
    {
      name: "WAI handles all-zero input",
      actual: calculateWAI({ snowpack: 0, rainfall: 0, reservoir: 0 }),
      expected: 0
    },
    {
      name: "WAI handles all-one input",
      actual: calculateWAI({ snowpack: 1, rainfall: 1, reservoir: 1 }),
      expected: 100
    },
    {
      name: "Safe status starts at 70",
      actual: getStatus(70).label,
      expected: "Safe"
    },
    {
      name: "Warning status includes 40 through 69",
      actual: getStatus(40).label,
      expected: "Warning"
    },
    {
      name: "Critical status is below 40",
      actual: getStatus(39).label,
      expected: "Critical"
    },
    {
      name: "Prediction clamps below zero",
      actual: predictWAI(5, -10),
      expected: 0
    },
    {
      name: "Prediction clamps above 100",
      actual: predictWAI(95, 10),
      expected: 100
    },
    {
      name: "Health risk triggers only when WAI is critical and temperature is high",
      actual: getHealthRisk(35, 95),
      expected: true
    },
    {
      name: "Health risk does not trigger when WAI is warning",
      actual: getHealthRisk(45, 95),
      expected: false
    },
    {
      name: "Drivers detect stable inputs",
      actual: getDrivers({
        snowpack: 0.8,
        rainfall: 0.8,
        reservoir: 0.8
      }).join(","),
      expected: "stable water inputs"
    },
    {
      name: "API record converts Snowpack correctly",
      actual: convertAPIRecordToLocation(
        { Date: "Test", Snowpack: "65", Precip: "105", Reservoir: "72" },
        0,
        null
      ).snowpack,
      expected: 0.65
    },
    {
      name: "API record converts Precip correctly",
      actual: convertAPIRecordToLocation(
        { Date: "Test", Snowpack: "65", Precip: "105", Reservoir: "72" },
        0,
        null
      ).rainfall,
      expected: 1.05
    },
    {
      name: "API record converts Reservoir correctly",
      actual: convertAPIRecordToLocation(
        { Date: "Test", Snowpack: "65", Precip: "105", Reservoir: "72" },
        0,
        null
      ).reservoir,
      expected: 0.72
    }
  ];

  tests.forEach((test) => {
    console.assert(
      test.actual === test.expected,
      `${test.name}: expected ${test.expected}, got ${test.actual}`
    );
  });
}

function updateDashboard() {
  const selected = locations[selectedIndex];
  const wai = calculateWAI(selected);
  const predicted = predictWAI(wai, selected.trend);
  const status = getStatus(wai);

  document.getElementById("selectedLocation").textContent = selected.name;
  document.getElementById("waiScore").textContent = wai;
  document.getElementById("mainInsight").textContent = selected.insight;

  const statusBadge = document.getElementById("statusBadge");
  statusBadge.textContent = status.label;
  statusBadge.className = `status ${status.className}`;

  updateMetric("snowpack", selected.snowpack);
  updateMetric("rainfall", selected.rainfall);
  updateMetric("reservoir", selected.reservoir);

  document.getElementById("predictedWAI").textContent = predicted;

  renderForecastBars(selected, wai);
  renderLocationCards();
  renderHealthBox(selected, wai);
}

function updateMetric(type, value) {
  const percent = Math.round(value * 100);

  document.getElementById(`${type}Value`).textContent = `${percent}%`;
  document.getElementById(`${type}Bar`).style.width = `${clamp(percent)}%`;
}

function renderLocationCards() {
  const locationGrid = document.getElementById("locationGrid");
  locationGrid.innerHTML = "";

  locations.forEach((location, index) => {
    const score = calculateWAI(location);
    const status = getStatus(score);

    const card = document.createElement("button");
    card.className = `location-card ${status.className}`;
    card.type = "button";

    if (index === selectedIndex) {
      card.classList.add("selected");
    }

    card.innerHTML = `
      <div class="location-top">
        <div class="location-name">
          <span class="dot ${status.className}"></span>
          <span>${location.name}</span>
        </div>
        <span class="location-score">${score}</span>
      </div>
      <p>${status.label} water availability</p>
    `;

    card.addEventListener("click", () => {
      selectedIndex = index;
      updateDashboard();
    });

    locationGrid.appendChild(card);
  });
}

function renderForecastBars(location, wai) {
  const forecastBars = document.getElementById("forecastBars");
  forecastBars.innerHTML = "";

  const days = [0, 7, 14, 21, 30];

  days.forEach((day) => {
    const score = clamp(Math.round(wai + location.trend * (day / 7)));
    const item = document.createElement("div");

    item.className = "forecast-item";
    item.innerHTML = `
      <div 
        class="forecast-bar" 
        style="height: ${Math.max(12, score)}px"
        title="Day ${day}: WAI ${score}">
      </div>
      <span class="forecast-label">${day}d</span>
    `;

    forecastBars.appendChild(item);
  });
}

function renderHealthBox(location, wai) {
  const healthBox = document.getElementById("healthBox");
  const risk = getHealthRisk(wai, location.temp);

  if (risk) {
    healthBox.className = "health-box danger";
    healthBox.innerHTML = `
      <h3>⚠️ High dehydration risk</h3>
      <p>
        WAI is below 40 and temperature is high. Dehydration can reduce blood volume,
        increase heart rate, and place extra stress on the kidneys.
      </p>
    `;
  } else {
    healthBox.className = "health-box safe";
    healthBox.innerHTML = `
      <h3>No extreme health warning right now</h3>
      <p>
        Current conditions do not trigger the high-risk rule, but hydration and conservation
        still matter.
      </p>
    `;
  }
}

function addMessage(text, sender) {
  const chatWindow = document.getElementById("chatWindow");
  const message = document.createElement("div");

  message.className = sender === "user" ? "user-message" : "bot-message";
  message.textContent = text;

  chatWindow.appendChild(message);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function sendQuestion() {
  const chatInput = document.getElementById("chatInput");
  const question = chatInput.value.trim();

  if (!question) {
    return;
  }

  const selected = locations[selectedIndex];
  const wai = calculateWAI(selected);
  const predicted = predictWAI(wai, selected.trend);

  addMessage(question, "user");

  const answer = chatbotAnswer(question, selected, wai, predicted);
  addMessage(answer, "bot");

  chatInput.value = "";
}

function setupEventListeners() {
  const sendBtn = document.getElementById("sendBtn");
  const chatInput = document.getElementById("chatInput");
  const promptButtons = document.querySelectorAll(".prompt");

  sendBtn.addEventListener("click", sendQuestion);

  chatInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      sendQuestion();
    }
  });

  promptButtons.forEach((button) => {
    button.addEventListener("click", () => {
      chatInput.value = button.textContent;
      sendQuestion();
    });
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  runLogicTests();

  document.getElementById("mainInsight").textContent =
    "Loading live water data from the H2O Hackathon API...";

  await loadWaterDataFromAPI();

  renderLocationCards();
  updateDashboard();
  setupEventListeners();
});
