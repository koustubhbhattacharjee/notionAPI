function startSidebarTimer(seconds, label = "Time Left") {
  // Grab all the elements once
  const sidebar     = document.getElementById('timer-sidebar');
  const timerDisplay = document.getElementById('timer-display');
  const timerLabel   = document.getElementById('timer-label');

  // Safety check — if someone forgot to add the HTML
  if (!sidebar || !timerDisplay || !timerLabel) {
    console.error("Timer sidebar HTML is missing! Add the <div id='timer-sidebar'> to your page.");
    return;
  }

  timerLabel.textContent = label;
  sidebar.style.display = 'block';          // make sure it's visible
  sidebar.style.background = '#111111ee';   // reset color

  let timeLeft = seconds;

  const update = () => {
    const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0');
    const secs = String(timeLeft % 60).padStart(2, '0');
    timerDisplay.textContent = `${mins}:${secs}`;

    // Last 10 seconds → red + blinking
    if (timeLeft <= 10) {
      sidebar.style.background = '#8B0000dd';
      timerDisplay.style.animation = 'blink 1s infinite';
    }

    // Time's up
    if (timeLeft <= 0) {
      timerDisplay.textContent = "00:00";
      sidebar.style.background = '#330000';
      clearInterval(timerInterval);
      return;
    }

    timeLeft--;
  };

  update(); // show the starting time immediately

  // Stop any previous timer
  if (window.currentTimer) clearInterval(window.currentTimer);

  // Start the new one
  const timerInterval = setInterval(update, seconds);
  window.currentTimer = timerInterval;
}