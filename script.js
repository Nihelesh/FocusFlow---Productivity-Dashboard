document.addEventListener('DOMContentLoaded', () => {
    // --- Greeting & Time ---
    const greetingEl = document.getElementById('greeting');
    const timeEl = document.getElementById('current-time');

    function updateTime() {
        const now = new Date();
        timeEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const hour = now.getHours();
        let greeting = 'Good Morning';
        if (hour >= 12 && hour < 17) greeting = 'Good Afternoon';
        else if (hour >= 17) greeting = 'Good Evening';

        greetingEl.textContent = `${greeting}, Student`;
    }

    setInterval(updateTime, 1000);
    updateTime();

    // --- Pomodoro Timer ---
    let timerInterval;
    let isRunning = false;

    // Default durations (in minutes)
    let durations = JSON.parse(localStorage.getItem('focusflow-durations')) || {
        focus: 25,
        short: 5,
        long: 15
    };

    let currentMode = 'focus';
    let timeLeft = durations[currentMode] * 60;

    const minutesEl = document.getElementById('minutes');
    const secondsEl = document.getElementById('seconds');
    const startBtn = document.getElementById('start-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const resetBtn = document.getElementById('reset-btn');
    const modeBtns = document.querySelectorAll('.mode-btn');

    function updateDisplay() {
        const m = Math.floor(timeLeft / 60);
        const s = timeLeft % 60;
        minutesEl.textContent = m.toString().padStart(2, '0');
        secondsEl.textContent = s.toString().padStart(2, '0');
        document.title = `${minutesEl.textContent}:${secondsEl.textContent} - FocusFlow`;
    }

    function startTimer() {
        if (isRunning) return;
        isRunning = true;
        startBtn.disabled = true;
        pauseBtn.disabled = false;

        timerInterval = setInterval(() => {
            if (timeLeft > 0) {
                timeLeft--;
                updateDisplay();
            } else {
                clearInterval(timerInterval);
                isRunning = false;
                startBtn.disabled = false;
                pauseBtn.disabled = true;
                playNotificationSound();
                alert('Time is up!');
            }
        }, 1000);
    }

    function playNotificationSound() {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
        oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.5); // Drop to A4

        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.5);
    }

    function pauseTimer() {
        clearInterval(timerInterval);
        isRunning = false;
        startBtn.disabled = false;
        pauseBtn.disabled = true;
    }

    function resetTimer() {
        pauseTimer();
        timeLeft = durations[currentMode] * 60;
        updateDisplay();
    }

    startBtn.addEventListener('click', startTimer);
    pauseBtn.addEventListener('click', pauseTimer);
    resetBtn.addEventListener('click', resetTimer);

    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            modeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentMode = btn.dataset.mode;
            timeLeft = durations[currentMode] * 60;
            pauseTimer();
            updateDisplay();
        });
    });

    // --- Task Manager ---
    const taskInput = document.getElementById('task-input');
    const addTaskBtn = document.getElementById('add-task-btn');
    const taskList = document.getElementById('task-list');
    const itemsLeftEl = document.getElementById('items-left');
    const clearCompletedBtn = document.getElementById('clear-completed');

    let tasks = JSON.parse(localStorage.getItem('focusflow-tasks')) || [];

    function saveTasks() {
        localStorage.setItem('focusflow-tasks', JSON.stringify(tasks));
        renderTasks();
    }

    function createTaskElement(task) {
        const li = document.createElement('li');
        li.className = `task-item ${task.completed ? 'completed' : ''}`;

        li.innerHTML = `
            <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
            <span class="task-text">${task.text}</span>
            <button class="delete-btn" aria-label="Delete task">✕</button>
        `;

        const checkbox = li.querySelector('.task-checkbox');
        checkbox.addEventListener('change', () => {
            task.completed = checkbox.checked;
            saveTasks();
        });

        const deleteBtn = li.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', () => {
            tasks = tasks.filter(t => t.id !== task.id);
            saveTasks();
        });

        return li;
    }

    function renderTasks() {
        taskList.innerHTML = '';
        tasks.forEach(task => {
            taskList.appendChild(createTaskElement(task));
        });

        const activeCount = tasks.filter(t => !t.completed).length;
        itemsLeftEl.textContent = `${activeCount} item${activeCount !== 1 ? 's' : ''} left`;
    }

    function addTask() {
        const text = taskInput.value.trim();
        if (text) {
            const newTask = {
                id: Date.now(),
                text: text,
                completed: false
            };
            tasks.push(newTask);
            saveTasks();
            taskInput.value = '';
        }
    }

    addTaskBtn.addEventListener('click', addTask);
    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTask();
    });

    clearCompletedBtn.addEventListener('click', () => {
        tasks = tasks.filter(t => !t.completed);
        saveTasks();
    });

    // --- Settings Modal ---
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    const focusInput = document.getElementById('focus-time');
    const shortInput = document.getElementById('short-break-time');
    const longInput = document.getElementById('long-break-time');

    function openSettings() {
        focusInput.value = durations.focus;
        shortInput.value = durations.short;
        longInput.value = durations.long;
        settingsModal.classList.add('show');
    }

    function closeSettings() {
        settingsModal.classList.remove('show');
    }

    function saveSettings() {
        durations.focus = parseInt(focusInput.value) || 25;
        durations.short = parseInt(shortInput.value) || 5;
        durations.long = parseInt(longInput.value) || 15;

        localStorage.setItem('focusflow-durations', JSON.stringify(durations));

        // Update current timer if not running or if the current mode's duration changed
        if (!isRunning) {
            timeLeft = durations[currentMode] * 60;
            updateDisplay();
        }

        closeSettings();
    }

    settingsBtn.addEventListener('click', openSettings);
    closeModalBtn.addEventListener('click', closeSettings);
    saveSettingsBtn.addEventListener('click', saveSettings);

    // Close modal when clicking outside
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) closeSettings();
    });

    // Initial Render
    updateDisplay();
    renderTasks();
});
