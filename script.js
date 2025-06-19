const periodTimes = [
  { start: "09:15", end: "10:10" },
  { start: "10:10", end: "11:05" },
  { start: "11:05", end: "12:00" },
  { start: "12:00", end: "12:55" }
];

function getCurrentLectureInfo() {
  const today = new Date();
  const dayIndex = today.getDay(); // 1=Monday...5=Friday
  if (dayIndex < 1 || dayIndex > 5) return null;

  const hours = today.getHours();
  const minutes = today.getMinutes();
  const nowMinutes = hours * 60 + minutes;

  let currentPeriod = -1;
  for (let i = 0; i < periodTimes.length; i++) {
    const [sh, sm] = periodTimes[i].start.split(":").map(Number);
    const [eh, em] = periodTimes[i].end.split(":").map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    if (nowMinutes >= startMin && nowMinutes < endMin) {
      currentPeriod = i + 1;
      break;
    }
  }

  if (currentPeriod === -1) return null;

  const table = document.getElementById("timetable");
  const rows = table.getElementsByTagName("tr");
  const todayRow = rows[dayIndex]; // skip thead (assumes it’s first)
  const cells = todayRow.getElementsByTagName("td");

  let col = 1;
  let periodCount = 1;
  while (col < cells.length) {
    const cell = cells[col];
    const span = parseInt(cell.getAttribute("colspan")) || 1;
    if (periodCount <= currentPeriod && currentPeriod < periodCount + span) {
      const subject = cell.textContent.trim().split('\n')[0];
      const roomInfo = cell.title || "Room info not available";
      return { subject, roomInfo, period: currentPeriod };
    }
    periodCount += span;
    col++;
  }

  return null;
}

function filterTable() {
  const input = document.getElementById("searchInput");
  const filter = input.value.toUpperCase();
  const table = document.querySelector("table");
  const tr = table.getElementsByTagName("tr");

  for (let i = 1; i < tr.length; i++) {
    let rowVisible = false;
    const tds = tr[i].getElementsByTagName("td");

    for (let j = 0; j < tds.length; j++) {
      const td = tds[j];
      if (td && td.textContent.toUpperCase().includes(filter)) {
        rowVisible = true;
        break;
      }
    }

    tr[i].style.display = rowVisible ? "" : "none";
  }
}

function highlightCurrentPeriod() {
  const timetable = document.getElementById("timetable");
  const rows = timetable.getElementsByTagName("tr");

  const now = new Date();
  const day = now.getDay(); // 1 = Monday, ..., 5 = Friday
  const hour = now.getHours();
  const minute = now.getMinutes();
  const nowMin = hour * 60 + minute;

  const periods = [
    [9, 15, 10, 10],
    [10, 10, 11, 5],
    [11, 5, 12, 0],
    [12, 0, 12, 55]
  ];

  let currentPeriod = -1;
  for (let i = 0; i < periods.length; i++) {
    const [sh, sm, eh, em] = periods[i];
    const start = sh * 60 + sm;
    const end = eh * 60 + em;

    if (nowMin >= start && nowMin < end) {
      currentPeriod = i + 1;
      break;
    }
  }

  for (const row of rows) {
    for (const cell of row.children) {
      cell.classList.remove("current-period");
    }
  }

  if (day >= 1 && day <= 5 && currentPeriod > 0) {
    const row = rows[day];
    const cells = row.children;
    let colIndex = currentPeriod;
    let span = parseInt(cells[colIndex]?.getAttribute("colspan") || "1");

    let indexOffset = 1;
    while (span > 1 && currentPeriod > indexOffset) {
      if (colIndex - indexOffset < 1) break;
      indexOffset++;
    }

    cells[colIndex - indexOffset + 1]?.classList.add("current-period");
  }
}

function highlightTodayRow() {
  const table = document.getElementById("timetable");
  const rows = table.getElementsByTagName("tr");

  const today = new Date().getDay(); // Sunday = 0, Monday = 1
  if (today >= 1 && today <= 5) {
    rows[today].classList.add("today-row");
  }
}

function showTodayBanner() {
  const banner = document.getElementById("todayBanner");
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const today = new Date().getDay();
  banner.innerHTML = `📅 <strong>Today is ${days[today]}</strong>`;
  banner.classList.add("today-banner");
}

function scrollToTodayRow() {
  const table = document.getElementById("timetable");
  const rows = table.getElementsByTagName("tr");
  const today = new Date().getDay();

  if (today >= 1 && today <= 5) {
    const row = rows[today];
    row.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function setupAttendanceTracking() {
  const table = document.getElementById("timetable");
  const rows = table.querySelectorAll("tbody tr");

  const now = new Date();
  const todayDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const dayMap = {
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5
  };

  rows.forEach((row) => {
    const cells = row.querySelectorAll("td");
    const dayCell = cells[0];
    const dayName = dayCell.textContent.trim().toLowerCase();
    const weekdayIndex = dayMap[dayName];
    if (!weekdayIndex) return;

    const mondayThisWeek = new Date(now);
    mondayThisWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    const rowDate = new Date(mondayThisWeek);
    rowDate.setDate(mondayThisWeek.getDate() + (weekdayIndex - 1));
    const rowDateKey = `${rowDate.getFullYear()}-${rowDate.getMonth() + 1}-${rowDate.getDate()}`;

    const isToday = rowDate.toDateString() === todayDateOnly.toDateString();

    let periodIndex = 1;

    for (let col = 1; col < cells.length; col++) {
      const cell = cells[col];
      const colspan = parseInt(cell.getAttribute("colspan")) || 1;

      // Load attendance from localStorage
      let marked = true;
      for (let offset = 0; offset < colspan; offset++) {
        const cellId = `attend-${rowDateKey}-${periodIndex + offset}`;
        if (localStorage.getItem(cellId) !== "1") {
          marked = false;
          break;
        }
      }

      if (marked) {
        cell.classList.add("marked");
      }

      // Lock if not today
      if (!isToday) {
        cell.classList.add("locked");
        periodIndex += colspan;
        continue;
      }

      // ✅ Fix: Freeze values in closure
      (function(periodStart, span, cellElement) {
        cellElement.addEventListener("click", () => {
          const willBeMarked = !cellElement.classList.contains("marked");
          cellElement.classList.toggle("marked");

          for (let offset = 0; offset < span; offset++) {
            const cellId = `attend-${rowDateKey}-${periodStart + offset}`;
            localStorage.setItem(cellId, willBeMarked ? "1" : "0");
          }
        });
      })(periodIndex, colspan, cell);

      periodIndex += colspan;
    }
  }); // ✅ this was missing!
}

window.onload = () => {
  highlightTodayRow();
  showTodayBanner();
  scrollToTodayRow();
  highlightCurrentPeriod();
  setInterval(highlightCurrentPeriod, 60000);
  setupAttendanceTracking();
  setInterval(notifyUpcomingLecture, 60000); // Check every 1 minute
  scheduleReminders(); // <-- Call it here
};

function notifyCurrentLecture() {
  const info = getCurrentLectureInfo();
  if (!info) return;

  const message = `📢 ${info.subject} – ${info.roomInfo}`;
  if (Notification.permission === "granted") {
    new Notification("Current Lecture", { body: message });
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then(permission => {
      if (permission === "granted") {
        new Notification("Current Lecture", { body: message });
      }
    });
  }
}

// Check every minute
setInterval(notifyCurrentLecture, 60000);

function getUpcomingLectureInfo(offsetMinutes = 5) {
  const now = new Date();
  now.setMinutes(now.getMinutes() + offsetMinutes); // look ahead 5 min
  const dayIndex = now.getDay();
  if (dayIndex < 1 || dayIndex > 5) return null;

  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  let upcomingPeriod = -1;
  for (let i = 0; i < periodTimes.length; i++) {
    const [sh, sm] = periodTimes[i].start.split(":").map(Number);
    const startMin = sh * 60 + sm;
    if (startMin - nowMinutes === 5) {
      upcomingPeriod = i + 1;
      break;
    }
  }

  if (upcomingPeriod === -1) return null;

  const table = document.getElementById("timetable");
  const rows = table.getElementsByTagName("tr");
  const todayRow = rows[dayIndex];
  const cells = todayRow.getElementsByTagName("td");

  let col = 1;
  let periodCount = 1;
  while (col < cells.length) {
    const cell = cells[col];
    const span = parseInt(cell.getAttribute("colspan")) || 1;
    if (periodCount <= upcomingPeriod && upcomingPeriod < periodCount + span) {
      const subject = cell.textContent.trim().split('\n')[0];
      const roomInfo = cell.title || "Room info not available";
      return { subject, roomInfo, period: upcomingPeriod };
    }
    periodCount += span;
    col++;
  }

  return null;
}

function notifyUpcomingLecture() {
  const info = getUpcomingLectureInfo(5); // 5-minute look-ahead
  if (!info) return;

  const message = `Upcoming in 5 min: ${info.subject} – ${info.roomInfo}`;
  if (Notification.permission === "granted") {
    new Notification("⏳ Be Ready!", { body: message });
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then(permission => {
      if (permission === "granted") {
        new Notification("⏳ Be Ready!", { body: message });
      }
    });
  }
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js')
    .then(reg => console.log('Service Worker registered:', reg))
    .catch(err => console.error('Service Worker registration failed:', err));
}
