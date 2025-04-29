// — Element References —
const canvas                = document.getElementById('gameCanvas');
const ctx                   = canvas.getContext('2d');
const bgMusic               = document.getElementById('bgMusic');
const collectSound          = document.getElementById('collectSound');
const clickSound            = document.getElementById('clickSound');
const cheerSound            = document.getElementById('cheerSound');
const menuOverlay           = document.getElementById('menuOverlay');
const gameOverOverlay       = document.getElementById('gameOverOverlay');
const startBtn              = document.getElementById('startBtn');
const stopBtn               = document.getElementById('stopBtn');
const replayBtn             = document.getElementById('replayBtn');
const exitBtn               = document.getElementById('exitBtn');
const menuHighScore         = document.getElementById('menuHighScore');
const menuLatestScoresList  = document.getElementById('menuLatestScoresList');
const finalScoreSpan        = document.getElementById('finalScore');
const goHighScore           = document.getElementById('goHighScore');
const goLatestScoresList    = document.getElementById('goLatestScoresList');

// — Game State —
let gameState      = 'menu';   // 'menu' | 'countdown' | 'playing' | 'gameover'
let score          = 0;
let highScore      = 0;
let pastScores     = [];
let stars          = [];
let confetti       = [];
let lastSpawnTime  = 0;
let spawnInterval  = 1000;
let countdownStart = 0;
let isNewHigh      = false;

// — Canvas Resizing —
function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// — Persistence —
function loadScores() {
  pastScores = JSON.parse(localStorage.getItem('pastScores') || '[]');
  highScore  = parseInt(localStorage.getItem('highScore') || '0', 10);
}
function saveScores() {
  localStorage.setItem('pastScores', JSON.stringify(pastScores));
  localStorage.setItem('highScore', highScore);
}

// — List Populator —
function populateList(ul, arr) {
  ul.innerHTML = '';
  arr.forEach(n => {
    const li = document.createElement('li');
    li.textContent = n;
    ul.appendChild(li);
  });
}

// — Menu & Overlays —
function updateMenu() {
  menuHighScore.textContent = highScore;
  populateList(menuLatestScoresList, pastScores.slice(-5).reverse());
}
function showMenu() {
  gameState            = 'menu';
  menuOverlay.classList.remove('hidden');
  gameOverOverlay.classList.add('hidden');
  stopBtn.classList.add('hidden');
  updateMenu();
}

// — Start & End Game —
function startGame() {
  clickSound.play();
  menuOverlay.classList.add('hidden');
  gameOverOverlay.classList.add('hidden');
  stopBtn.classList.remove('hidden');
  stars     = [];
  score     = 0;
  isNewHigh = false;
  countdownStart = performance.now();
  gameState = 'countdown';
  bgMusic.currentTime = 0; bgMusic.play();
}

function endGame() {
  // stop button
  gameState = 'gameover';
  stopBtn.classList.add('hidden');
  bgMusic.pause();
  cheerSound.currentTime = 0; cheerSound.play();

  // record score & trim to last 5
  pastScores.push(score);
  if (pastScores.length > 5) pastScores = pastScores.slice(-5);

  // update high-score
  if (score > highScore) {
    highScore = score;
    isNewHigh = true;
  }

  saveScores();

  // populate Game-Over overlay
  finalScoreSpan.textContent = score;
  goHighScore.textContent    = highScore;
  populateList(goLatestScoresList, pastScores.slice(-5).reverse());

  // show it
  gameOverOverlay.classList.remove('hidden');
  if (isNewHigh) spawnConfetti();
}

// — Spawning & Confetti —
function spawnStar() {
  const size = 20;
  stars.push({
    x:    Math.random() * (canvas.width - size),
    y:    Math.random() * (canvas.height - size),
    size,
    t0:   performance.now(),
    life: 800 + Math.random() * 700
  });
}
function spawnConfetti() {
  confetti = Array.from({length:100}, () => ({
    x:     Math.random() * canvas.width,
    y:     -10,
    vx:    -2 + Math.random()*4,
    vy:    2 + Math.random()*3,
    size:  4 + Math.random()*4,
    color: `hsl(${Math.random()*360},100%,50%)`
  }));
}

// — Input Handling —
function handlePointer(x, y) {
  if (gameState !== 'playing') return;
  for (let i = 0; i < stars.length; i++) {
    const st = stars[i];
    if (x >= st.x && x <= st.x + st.size &&
        y >= st.y && y <= st.y + st.size) {
      collectSound.currentTime = 0;
      collectSound.play();
      score++;
      stars.splice(i, 1);
      break;
    }
  }
}
canvas.addEventListener('click', e => {
  const r = canvas.getBoundingClientRect();
  handlePointer(e.clientX - r.left, e.clientY - r.top);
});
canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  const t = e.touches[0];
  const r = canvas.getBoundingClientRect();
  handlePointer(t.clientX - r.left, t.clientY - r.top);
});

// — Button Events —
stopBtn.addEventListener('click', () => {
  clickSound.play();
  if (gameState === 'playing') endGame();
});
startBtn.addEventListener('click', startGame);
replayBtn.addEventListener('click', startGame);
exitBtn.addEventListener('click', () => {
  clickSound.play();
  showMenu();
});

// — Main Loop —
function gameLoop(ts) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (gameState === 'countdown') {
    const sec = Math.floor((ts - countdownStart) / 1000);
    if (sec < 3) {
      ctx.fillStyle = '#fff';
      ctx.font      = 'bold 100px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${3 - sec}`, canvas.width/2, canvas.height/2);
    } else {
      gameState     = 'playing';
      lastSpawnTime = ts;
    }
  }

  if (gameState === 'playing') {
    if (ts - lastSpawnTime > spawnInterval) {
      spawnStar();
      lastSpawnTime  = ts;
      spawnInterval = 500 + Math.random()*1500;
    }
    stars = stars.filter(st => ts - st.t0 < st.life);
    ctx.fillStyle = '#fff';
    stars.forEach(st => ctx.fillRect(st.x, st.y, st.size, st.size));

    ctx.fillStyle = '#0f0';
    ctx.font      = '20px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${score}`, 10, 30);
  }

  if (gameState === 'gameover' && isNewHigh) {
    confetti.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    });
    confetti = confetti.filter(p => p.y < canvas.height);
  }

  requestAnimationFrame(gameLoop);
}

// — Init —
loadScores();
showMenu();
requestAnimationFrame(gameLoop);
