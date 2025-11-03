let events = {};  // Object to store events by date
let selectedDate = null;
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

// Save events to localStorage
function saveEvents() {
    localStorage.setItem('events', JSON.stringify(events));
}

// Load events from localStorage
function loadEventsFromStorage() {
    const storedEvents = localStorage.getItem('events');
    if (storedEvents) {
        events = JSON.parse(storedEvents);
    }
    loadCalendar(); // Load calendar after events
    loadEvents(); // Load events for selected date
}

// Generate and display the calendar
function loadCalendar() {
    const calendarDays = document.getElementById('calendar-days');
    const monthYear = document.getElementById('monthYear');
    calendarDays.innerHTML = ''; // Clear previous calendar

    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
    const lastDateOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    monthYear.textContent = `${monthNames[currentMonth]} ${currentYear}`;

    // Add blank spaces for days before the first of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
        const emptyDay = document.createElement('div');
        calendarDays.appendChild(emptyDay);
    }

    // Add days of the month
    for (let i = 1; i <= lastDateOfMonth; i++) {
        const dayElement = document.createElement('div');
        dayElement.classList.add('calendar-day');
        dayElement.textContent = i;

        const dateKey = new Date(currentYear, currentMonth, i).toDateString();

        // Highlight today's date
        if (new Date().toDateString() === dateKey) {
            dayElement.classList.add('today');
        }

        // Add a small dot if there are events for this day
        if (events[dateKey] && events[dateKey].length > 0) {
            const eventDot = document.createElement('div');
            eventDot.classList.add('event-dot');
            dayElement.appendChild(eventDot);
        }

        // Handle click to select date
        dayElement.addEventListener('click', () => {
            selectedDate = new Date(currentYear, currentMonth, i);
            loadEvents();
            document.querySelectorAll('.calendar-day').forEach(day => day.classList.remove('selected'));
            dayElement.classList.add('selected');
        });

        calendarDays.appendChild(dayElement);
    }
}

// Show events for the selected date
function loadEvents() {
    const eventList = document.getElementById('eventList');
    const selectedDateLabel = document.getElementById('selectedDate');
    eventList.innerHTML = ''; // Clear previous events

    if (!selectedDate) return;

    const dateKey = selectedDate.toDateString();
    selectedDateLabel.textContent = selectedDate.toLocaleDateString();
    const eventsForTheDay = events[dateKey] || [];

    eventsForTheDay.forEach((event, index) => {
        const eventItem = document.createElement('div');
        eventItem.classList.add('event-item');
        if (event.done) eventItem.classList.add('done');

        const eventText = document.createElement('span');
        eventText.textContent = event.text;

        // Create buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.classList.add('event-buttons');

        const doneBtn = document.createElement('button');
        doneBtn.textContent = 'Done';
        doneBtn.classList.add('done-btn');
        doneBtn.addEventListener('click', () => markEventAsDone(dateKey, index));

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.classList.add('delete-btn');
        deleteBtn.addEventListener('click', () => deleteEvent(dateKey, index));

        // Append the text and buttons to the button container
        buttonContainer.appendChild(doneBtn);
        buttonContainer.appendChild(deleteBtn);

        // Append the text and buttons to the event item
        eventItem.appendChild(eventText);
        eventItem.appendChild(buttonContainer);

        eventList.appendChild(eventItem);
    });
}

// Add a new event
function addEvent() {
    const eventInput = document.getElementById('eventInput');
    const eventText = eventInput.value.trim();

    if (eventText && selectedDate) {
        const dateKey = selectedDate.toDateString();
        if (!events[dateKey]) events[dateKey] = [];
        events[dateKey].push({ text: eventText, done: false });
        saveEvents();
        loadEvents(); // Reload event list
        eventInput.value = ''; // Clear input
    }
}

// Mark an event as done
function markEventAsDone(dateKey, index) {
    events[dateKey][index].done = true;
    saveEvents();
    loadEvents();  // Reload event list
}

// Delete an event
function deleteEvent(dateKey, index) {
    events[dateKey].splice(index, 1);
    if (events[dateKey].length === 0) delete events[dateKey];
    saveEvents();
    loadCalendar();  // Reload calendar to reflect removal of event dot
    loadEvents();  // Reload event list
}

// Switch to previous month
function prevMonth() {
    currentMonth--;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    loadCalendar();
}

// Switch to next month
function nextMonth() {
    currentMonth++;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    loadCalendar();
}

// Digital clock
function updateClock() {
    const clockElement = document.getElementById('clock');
    const now = new Date();
    const hours = now.getHours() % 12 || 12;
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
    clockElement.textContent = `${hours}:${minutes}:${seconds} ${ampm}`;
}

setInterval(updateClock, 1000);  // Update clock every second

// Add event when "Enter" key is pressed in the input field
document.getElementById('eventInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addEvent();
    }
});

document.addEventListener('DOMContentLoaded', function () {
    loadEventsFromStorage();  // Load events from localStorage on page load
    document.getElementById('addEventBtn').addEventListener('click', addEvent);
    document.getElementById('prevMonthBtn').addEventListener('click', prevMonth);
    document.getElementById('nextMonthBtn').addEventListener('click', nextMonth);
});












