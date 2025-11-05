const calendarBody = document.getElementById("calendar-body");
const monthYear = document.getElementById("month-year");
const prevBtn = document.getElementById("prev-month");
const nextBtn = document.getElementById("next-month");
const todayBtn = document.getElementById("today-btn");
const eventListBtn = document.getElementById("event-list-btn");
const timeContainer = document.getElementById("time-container");

let currentDate = new Date();
let events = JSON.parse(localStorage.getItem("calendarEvents")) || {};

// ----------------------
// 🕒 Show Current Time
// ----------------------
function updateTime() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const seconds = now.getSeconds().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    timeContainer.textContent = `${hours}:${minutes}:${seconds} ${ampm}`;
}
setInterval(updateTime, 1000);
updateTime();

// ----------------------
// 📅 Render Calendar
// ----------------------
function renderCalendar() {
    calendarBody.innerHTML = "";

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    monthYear.textContent = `${firstDay.toLocaleString("default", {
        month: "long",
    })} ${year}`;

    // Weekday Headers
    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    weekDays.forEach((day) => {
        const dayEl = document.createElement("div");
        dayEl.classList.add("weekday");
        dayEl.textContent = day;
        calendarBody.appendChild(dayEl);
    });

    // Empty cells before start of month
    for (let i = 0; i < firstDay.getDay(); i++) {
        const empty = document.createElement("div");
        empty.classList.add("empty");
        calendarBody.appendChild(empty);
    }

    // Days of month
    for (let i = 1; i <= lastDay.getDate(); i++) {
        const dateEl = document.createElement("div");
        dateEl.classList.add("day");
        dateEl.textContent = i;

        const dateKey = `${year}-${month + 1}-${i}`;

        // 🔹 Highlight today
        const today = new Date();
        if (
            i === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear()
        ) {
            dateEl.style.border = "2px solid #00ffcc";
            dateEl.style.boxShadow = "0 0 10px #00ffcc";
        }

        // Add event dot if event exists
        if (events[dateKey] && events[dateKey].length > 0) {
            const dot = document.createElement("div");
            dot.classList.add("event-dot");
            dateEl.appendChild(dot);
        }

        // Add event on click
        dateEl.addEventListener("click", () => addEvent(dateKey));

        calendarBody.appendChild(dateEl);
    }
}

// ----------------------
// ✏️ Add Event
// ----------------------
function addEvent(dateKey) {
    const eventName = prompt("Enter event:");
    if (!eventName) return;

    if (!events[dateKey]) {
        events[dateKey] = [];
    }
    events[dateKey].push(eventName);

    localStorage.setItem("calendarEvents", JSON.stringify(events));
    alert("Event added successfully!");
    renderCalendar();
}

// ----------------------
// 📋 Show Event List
// ----------------------
function showEventList() {
    const overlay = document.createElement("div");
    overlay.classList.add("event-overlay");

    const popup = document.createElement("div");
    popup.classList.add("event-popup");

    const heading = document.createElement("h2");
    heading.textContent = "Event List";
    popup.appendChild(heading);

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "Close";
    closeBtn.classList.add("close-btn");
    closeBtn.addEventListener("click", () => overlay.remove());
    popup.appendChild(closeBtn);

    const allDates = Object.keys(events);
    if (allDates.length === 0) {
        const noEvent = document.createElement("p");
        noEvent.textContent = "No events found.";
        popup.appendChild(noEvent);
    } else {
        allDates.forEach((date) => {
            events[date].forEach((event, index) => {
                const eventItem = document.createElement("div");
                eventItem.classList.add("event-item");

                const eventText = document.createElement("span");
                eventText.textContent = `${date}: ${event}`;

                const delBtn = document.createElement("button");
                delBtn.textContent = "Delete";
                delBtn.classList.add("delete-btn");
                delBtn.addEventListener("click", () => deleteEvent(date, index, overlay));

                eventItem.appendChild(eventText);
                eventItem.appendChild(delBtn);
                popup.appendChild(eventItem);
            });
        });
    }

    overlay.appendChild(popup);
    document.body.appendChild(overlay);
}

// ----------------------
// 🗑️ Delete Event
// ----------------------
function deleteEvent(date, index, overlay) {
    events[date].splice(index, 1);
    if (events[date].length === 0) delete events[date];
    localStorage.setItem("calendarEvents", JSON.stringify(events));
    overlay.remove();
    showEventList();
    renderCalendar();
}

// ----------------------
// 🔘 Button Listeners
// ----------------------
prevBtn.addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
});

nextBtn.addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
});

todayBtn.addEventListener("click", () => {
    currentDate = new Date();
    renderCalendar();
});

eventListBtn.addEventListener("click", showEventList);

// ----------------------
// 🚀 Initialize
// ----------------------
renderCalendar();
