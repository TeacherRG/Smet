/**
 * Shnayim Mikra — Parashat Shelach
 * Audio player + aliya navigation
 */

// Candidate audio URLs derived from the Kol Avrohom source page
const AUDIO_SOURCE_PAGE = 'https://kolavrohom.com/0-shnayim-mikra/37-Shelach.html';
const AUDIO_ENGLISH_NAMES = ['Rishon', 'Sheini', 'Shlishi', 'Revii', 'Chamishi', 'Shishi', 'Shevii'];
const AUDIO_URL_BUILDERS = [
  aliya => `https://kolavrohom.com/0-shnayim-mikra/37-Shelach/${aliya}.mp3`,
  aliya => `https://kolavrohom.com/0-shnayim-mikra/37-Shelach/${String(aliya).padStart(2, '0')}.mp3`,
  aliya => `https://kolavrohom.com/0-shnayim-mikra/37-Shelach-${aliya}.mp3`,
  aliya => `https://kolavrohom.com/0-shnayim-mikra/37-Shelach-${String(aliya).padStart(2, '0')}.mp3`,
  aliya => `https://kolavrohom.com/0-shnayim-mikra/37-Shelach/${AUDIO_ENGLISH_NAMES[aliya - 1]}.mp3`,
  aliya => `https://kolavrohom.com/0-shnayim-mikra/37-Shelach/${AUDIO_ENGLISH_NAMES[aliya - 1].toLowerCase()}.mp3`,
  aliya => `https://kolavrohom.com/0-shnayim-mikra/37-Shelach-${AUDIO_ENGLISH_NAMES[aliya - 1]}.mp3`,
  aliya => `https://kolavrohom.com/0-shnayim-mikra/37-Shelach-${AUDIO_ENGLISH_NAMES[aliya - 1].toLowerCase()}.mp3`,
  aliya => `https://kolavrohom.com/0-shnayim-mikra/${AUDIO_ENGLISH_NAMES[aliya - 1]}.mp3`,
  aliya => `https://kolavrohom.com/0-shnayim-mikra/${AUDIO_ENGLISH_NAMES[aliya - 1].toLowerCase()}.mp3`,
];

const ALIYA_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'ששי', 'שביעי'];
const TOTAL_ALIYOT = 7;
const STORAGE_KEY = 'shnayimMikraShelach';
const SAVE_INTERVAL_MS = 5000;

let currentAliya = 1;
let isPlaying = false;
let audioAttemptIndex = 0;
let savedPositions = {};
let saveTimer = null;

// ── Restore persisted state ───────────────────────────────────────────────────
try {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    const data = JSON.parse(raw);
    savedPositions = data.positions || {};
  }
} catch (_) {}

// ── DOM refs ──────────────────────────────────────────────────────────────────
const audio         = document.getElementById('audioEl');
const playBtn       = document.getElementById('playBtn');
const progressFill  = document.getElementById('progressFill');
const currentTimeEl = document.getElementById('currentTime');
const totalTimeEl   = document.getElementById('totalTime');
const playerLabel   = document.getElementById('playerLabel');
const audioStatus   = document.getElementById('audioStatus');
const toast         = document.getElementById('toast');

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatTime(s) {
  if (!isFinite(s)) return '--:--';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return m + ':' + String(sec).padStart(2, '0');
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ positions: savedPositions }));
  } catch (_) {}
}

function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    if (audio.currentTime > 1) {
      savedPositions[currentAliya] = audio.currentTime;
      saveState();
    }
  }, SAVE_INTERVAL_MS);
}

function updatePlayIcon() {
  playBtn.innerHTML = isPlaying
    ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="#1A1209"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>'
    : '<svg width="18" height="18" viewBox="0 0 24 24" fill="#1A1209"><path d="M8 5v14l11-7z"/></svg>';
}

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}

function showAudioSourceFallback() {
  audioStatus.textContent = '⚠ לא נמצא קובץ אודיו ישיר. אפשר לפתוח את ';
  const link = document.createElement('a');
  link.href = AUDIO_SOURCE_PAGE;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = 'מקור ההקלטות';
  audioStatus.appendChild(link);
}

// ── Audio URL fallback ────────────────────────────────────────────────────────
function buildAudioUrl(aliya, attemptIndex = audioAttemptIndex) {
  const builder = AUDIO_URL_BUILDERS[attemptIndex];
  return builder ? builder(aliya) : null;
}

function tryNextUrl(aliya) {
  if (audioAttemptIndex < AUDIO_URL_BUILDERS.length - 1) {
    audioAttemptIndex++;
    const nextUrl = buildAudioUrl(aliya);
    if (!nextUrl) {
      showAudioSourceFallback();
      return;
    }
    audio.src = nextUrl;
    audio.load();
    audioStatus.textContent = 'מנסה כתובת אודיו אחרת…';
  } else {
    showAudioSourceFallback();
  }
}

// ── Aliya selection ───────────────────────────────────────────────────────────
function selectAliya(n) {
  // Persist position of current aliya before switching
  if (audio.currentTime > 1) {
    savedPositions[currentAliya] = audio.currentTime;
    saveState();
  }

  audio.pause();
  isPlaying = false;
  updatePlayIcon();
  clearTimeout(saveTimer);
  saveTimer = null;

  currentAliya = n;
  audioAttemptIndex = 0;

  // Update nav buttons
  document.querySelectorAll('.aliya-btn').forEach((btn, i) => {
    btn.classList.toggle('active', i + 1 === n);
  });

  // Show the correct section
  document.querySelectorAll('.aliya-section').forEach((sec, i) => {
    sec.classList.toggle('active', i + 1 === n);
  });

  playerLabel.textContent = ALIYA_NAMES[n - 1] + ' — לחץ ▶ להפעלה';
  progressFill.style.width = '0%';
  currentTimeEl.textContent = '0:00';
  totalTimeEl.textContent = '--:--';
  audioStatus.textContent = 'טוען…';

  const initialUrl = buildAudioUrl(n);
  if (!initialUrl) {
    showAudioSourceFallback();
    return;
  }
  audio.src = initialUrl;
  audio.load();

  // Restore saved position after metadata is ready
  audio.addEventListener('loadedmetadata', () => {
    if (savedPositions[n]) {
      audio.currentTime = savedPositions[n];
    }
    totalTimeEl.textContent = formatTime(audio.duration);
    audioStatus.textContent = 'מוכן להפעלה';
  }, { once: true });

  // Scroll to section
  document.getElementById('aliya-' + n)
    .scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Play / pause ──────────────────────────────────────────────────────────────
function togglePlay() {
  if (!audio.src || audio.src === window.location.href) {
    selectAliya(currentAliya);
    setTimeout(() => audio.play().catch(handleAudioError), 300);
    return;
  }
  if (isPlaying) {
    audio.pause();
  } else {
    audio.play().catch(handleAudioError);
  }
}

function handleAudioError(err) {
  console.error('Audio error:', err, audio.src);
  audioStatus.textContent = '⚠ שגיאה — מנסה כתובת אודיו אחרת…';
  tryNextUrl(currentAliya);
}

// ── Seek ──────────────────────────────────────────────────────────────────────
function seekAudio(e) {
  if (!audio.duration) return;
  const rect = e.currentTarget.getBoundingClientRect();
  const ratio = (e.clientX - rect.left) / rect.width;
  audio.currentTime = Math.max(0, Math.min(audio.duration, ratio * audio.duration));
}

// ── Speed ─────────────────────────────────────────────────────────────────────
function setSpeed(s) {
  audio.playbackRate = s;
  document.querySelectorAll('.speed-btn').forEach(btn => {
    btn.classList.toggle('active', parseFloat(btn.dataset.speed) === s);
  });
}

// ── Audio events ──────────────────────────────────────────────────────────────
audio.addEventListener('play', () => {
  isPlaying = true;
  updatePlayIcon();
  audioStatus.textContent = '▶ מנגן';
});

audio.addEventListener('pause', () => {
  isPlaying = false;
  updatePlayIcon();
  audioStatus.textContent = '⏸ מושהה';
  // Save position on every manual pause
  if (audio.currentTime > 1) {
    savedPositions[currentAliya] = audio.currentTime;
    saveState();
  }
});

audio.addEventListener('ended', () => {
  isPlaying = false;
  updatePlayIcon();
  audioStatus.textContent = '✓ סיום';
  savedPositions[currentAliya] = 0;
  saveState();

  // Auto-advance to next aliya
  if (currentAliya < TOTAL_ALIYOT) {
    setTimeout(() => {
      selectAliya(currentAliya + 1);
      setTimeout(() => audio.play().catch(handleAudioError), 500);
    }, 1500);
  }
});

audio.addEventListener('timeupdate', () => {
  const pct = audio.duration ? (audio.currentTime / audio.duration * 100) : 0;
  progressFill.style.width = pct + '%';
  currentTimeEl.textContent = formatTime(audio.currentTime);
  scheduleSave();
});

audio.addEventListener('error', () => {
  tryNextUrl(currentAliya);
});

// ── Keyboard shortcuts ────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  switch (e.code) {
    case 'Space':
      e.preventDefault();
      togglePlay();
      break;
    // Standard media-player convention: right = skip forward, left = rewind
    case 'ArrowRight':
      audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 10);
      break;
    case 'ArrowLeft':
      audio.currentTime = Math.max(0, audio.currentTime - 10);
      break;
  }
});

// ── Init ──────────────────────────────────────────────────────────────────────
selectAliya(1);
