/* ===== Snake Game — Canvas Logic ===== */
(() => {
    'use strict';

    // --- Canvas & Context ---
    const canvas = document.getElementById('snakeCanvas');
    const ctx = canvas.getContext('2d');

    // --- DOM ---
    const scoreValue = document.getElementById('scoreValue');
    const highScoreValue = document.getElementById('highScoreValue');
    const snakeOverlay = document.getElementById('snakeOverlay');
    const overlayTitle = document.getElementById('overlayTitle');
    const overlaySub = document.getElementById('overlaySub');
    const resultOverlay = document.getElementById('resultOverlay');
    const resultEmoji = document.getElementById('resultEmoji');
    const resultTitle = document.getElementById('resultTitle');
    const resultSub = document.getElementById('resultSub');
    const btnPlayAgain = document.getElementById('btnPlayAgain');
    const dpadButtons = document.querySelectorAll('.dpad-btn');

    // --- Config ---
    const GRID_SIZE = 20;
    const TILE_COUNT = canvas.width / GRID_SIZE; // 20x20 grid
    const BASE_SPEED = 120; // ms per frame
    const SPEED_INCREMENT = 2; // ms faster per food eaten
    const MIN_SPEED = 50;

    // --- Colors ---
    const COLORS = {
        bg: '#0d1117',
        grid: 'rgba(255, 255, 255, 0.02)',
        snakeHead: '#34d399',
        snakeHeadGlow: 'rgba(52, 211, 153, 0.5)',
        snakeBody: '#10b981',
        snakeBodyDark: '#059669',
        snakeTail: '#047857',
        food: '#f87171',
        foodGlow: 'rgba(248, 113, 113, 0.5)',
        foodInner: '#fca5a5',
        bonusFood: '#facc15',
        bonusFoodGlow: 'rgba(250, 204, 21, 0.5)',
    };

    // --- State ---
    let snake = [];
    let food = { x: 0, y: 0 };
    let bonusFood = null;
    let direction = { x: 1, y: 0 };
    let nextDirection = { x: 1, y: 0 };
    let score = 0;
    let highScore = parseInt(localStorage.getItem('snakeHighScore') || '0', 10);
    let speed = BASE_SPEED;
    let gameLoop = null;
    let gameState = 'start'; // 'start', 'playing', 'paused', 'gameover'
    let particles = [];
    let frameCount = 0;
    let bonusTimer = null;

    // --- Init ---
    function init() {
        highScoreValue.textContent = highScore;

        // Show start overlay
        showOverlay('🐍 Snake', 'Press Space or tap to start');

        // Keyboard
        document.addEventListener('keydown', handleKeyDown);

        // Touch / click to start
        canvas.addEventListener('click', handleCanvasClick);

        // Mobile D-pad
        dpadButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const dir = btn.dataset.dir;
                setDirection(dir);
                if (gameState === 'start' || gameState === 'paused') startGame();
            });
        });

        // Touch swipe
        let touchStartX = 0, touchStartY = 0;
        canvas.addEventListener('touchstart', e => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }, { passive: true });

        canvas.addEventListener('touchend', e => {
            const dx = e.changedTouches[0].clientX - touchStartX;
            const dy = e.changedTouches[0].clientY - touchStartY;
            const absDx = Math.abs(dx);
            const absDy = Math.abs(dy);
            if (Math.max(absDx, absDy) < 30) {
                // Tap = start/pause
                if (gameState === 'start' || gameState === 'paused') startGame();
                return;
            }
            if (absDx > absDy) {
                setDirection(dx > 0 ? 'right' : 'left');
            } else {
                setDirection(dy > 0 ? 'down' : 'up');
            }
            if (gameState === 'start' || gameState === 'paused') startGame();
        }, { passive: true });

        btnPlayAgain.addEventListener('click', restartGame);

        // Initial render
        resetGame();
        drawFrame();
    }

    // --- Direction ---
    function setDirection(dir) {
        const map = {
            up: { x: 0, y: -1 },
            down: { x: 0, y: 1 },
            left: { x: -1, y: 0 },
            right: { x: 1, y: 0 },
        };
        const d = map[dir];
        if (!d) return;
        // Prevent reversing
        if (d.x === -direction.x && d.y === -direction.y) return;
        nextDirection = d;
    }

    // --- Keyboard ---
    function handleKeyDown(e) {
        const keyMap = {
            ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
            w: 'up', s: 'down', a: 'left', d: 'right',
            W: 'up', S: 'down', A: 'left', D: 'right',
        };
        if (keyMap[e.key]) {
            e.preventDefault();
            setDirection(keyMap[e.key]);
            if (gameState === 'start') startGame();
            if (gameState === 'paused') startGame();
        }
        if (e.key === ' ') {
            e.preventDefault();
            if (gameState === 'start' || gameState === 'paused') startGame();
            else if (gameState === 'playing') pauseGame();
        }
    }

    function handleCanvasClick() {
        if (gameState === 'start' || gameState === 'paused') startGame();
        else if (gameState === 'playing') pauseGame();
    }

    // --- Game Lifecycle ---
    function resetGame() {
        const midX = Math.floor(TILE_COUNT / 2);
        const midY = Math.floor(TILE_COUNT / 2);
        snake = [
            { x: midX, y: midY },
            { x: midX - 1, y: midY },
            { x: midX - 2, y: midY },
        ];
        direction = { x: 1, y: 0 };
        nextDirection = { x: 1, y: 0 };
        score = 0;
        speed = BASE_SPEED;
        particles = [];
        bonusFood = null;
        if (bonusTimer) clearTimeout(bonusTimer);
        scoreValue.textContent = '0';
        spawnFood();
    }

    function startGame() {
        if (gameState === 'gameover') {
            resetGame();
        }
        gameState = 'playing';
        hideOverlay();
        resultOverlay.classList.add('hidden');
        if (gameLoop) clearInterval(gameLoop);
        gameLoop = setInterval(gameStep, speed);
    }

    function pauseGame() {
        gameState = 'paused';
        if (gameLoop) clearInterval(gameLoop);
        showOverlay('⏸ Paused', 'Press Space to continue');
    }

    function gameOver() {
        gameState = 'gameover';
        if (gameLoop) clearInterval(gameLoop);
        if (bonusTimer) clearTimeout(bonusTimer);

        // Update high score
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('snakeHighScore', highScore.toString());
            highScoreValue.textContent = highScore;
        }

        // Flash effect
        flashScreen();

        // Show result
        setTimeout(() => {
            const isNewHigh = score === highScore && score > 0;
            resultEmoji.textContent = isNewHigh ? '🏆' : '💥';
            resultTitle.textContent = isNewHigh ? 'New High Score!' : 'Game Over!';
            resultTitle.className = 'result-title ' + (isNewHigh ? 'win-x' : 'draw');
            resultSub.textContent = `Score: ${score}`;
            resultOverlay.classList.remove('hidden');
        }, 500);
    }

    function restartGame() {
        resultOverlay.classList.add('hidden');
        resetGame();
        drawFrame();
        showOverlay('🐍 Snake', 'Press Space or tap to start');
        gameState = 'start';
    }

    // --- Game Step ---
    function gameStep() {
        direction = { ...nextDirection };
        const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

        // Wall collision
        if (head.x < 0 || head.x >= TILE_COUNT || head.y < 0 || head.y >= TILE_COUNT) {
            gameOver();
            return;
        }

        // Self collision
        for (const seg of snake) {
            if (seg.x === head.x && seg.y === head.y) {
                gameOver();
                return;
            }
        }

        snake.unshift(head);

        // Food collision
        let ate = false;
        if (head.x === food.x && head.y === food.y) {
            score += 10;
            ate = true;
            spawnParticles(food.x, food.y, COLORS.food, 8);
            spawnFood();
            speed = Math.max(MIN_SPEED, speed - SPEED_INCREMENT);
            clearInterval(gameLoop);
            gameLoop = setInterval(gameStep, speed);

            // Chance to spawn bonus food
            if (!bonusFood && Math.random() < 0.3) {
                spawnBonusFood();
            }
        } else if (bonusFood && head.x === bonusFood.x && head.y === bonusFood.y) {
            score += 50;
            ate = true;
            spawnParticles(bonusFood.x, bonusFood.y, COLORS.bonusFood, 12);
            bonusFood = null;
            if (bonusTimer) clearTimeout(bonusTimer);
        }

        if (!ate) {
            snake.pop();
        }

        scoreValue.textContent = score;
        frameCount++;

        drawFrame();
    }

    // --- Spawn Food ---
    function spawnFood() {
        let pos;
        do {
            pos = {
                x: Math.floor(Math.random() * TILE_COUNT),
                y: Math.floor(Math.random() * TILE_COUNT),
            };
        } while (isOnSnake(pos) || (bonusFood && pos.x === bonusFood.x && pos.y === bonusFood.y));
        food = pos;
    }

    function spawnBonusFood() {
        let pos;
        do {
            pos = {
                x: Math.floor(Math.random() * TILE_COUNT),
                y: Math.floor(Math.random() * TILE_COUNT),
            };
        } while (isOnSnake(pos) || (pos.x === food.x && pos.y === food.y));
        bonusFood = pos;

        // Bonus food disappears after 5 seconds
        if (bonusTimer) clearTimeout(bonusTimer);
        bonusTimer = setTimeout(() => {
            bonusFood = null;
            if (gameState === 'playing') drawFrame();
        }, 5000);
    }

    function isOnSnake(pos) {
        return snake.some(seg => seg.x === pos.x && seg.y === pos.y);
    }

    // --- Particles ---
    function spawnParticles(tileX, tileY, color, count) {
        const cx = tileX * GRID_SIZE + GRID_SIZE / 2;
        const cy = tileY * GRID_SIZE + GRID_SIZE / 2;
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
            const speed = 1.5 + Math.random() * 2;
            particles.push({
                x: cx, y: cy,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1,
                decay: 0.02 + Math.random() * 0.02,
                size: 2 + Math.random() * 3,
                color,
            });
        }
    }

    function updateParticles() {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= p.decay;
            if (p.life <= 0) particles.splice(i, 1);
        }
    }

    function drawParticles() {
        for (const p of particles) {
            ctx.save();
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    // --- Flash Screen ---
    function flashScreen() {
        const overlay = snakeOverlay;
        overlay.style.background = 'rgba(248, 113, 113, 0.3)';
        overlay.classList.remove('hidden');
        setTimeout(() => {
            overlay.style.background = '';
            overlay.classList.add('hidden');
        }, 200);
    }

    // --- Draw ---
    function drawFrame() {
        updateParticles();

        const w = canvas.width;
        const h = canvas.height;

        // Background
        ctx.fillStyle = COLORS.bg;
        ctx.fillRect(0, 0, w, h);

        // Grid
        ctx.strokeStyle = COLORS.grid;
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= TILE_COUNT; i++) {
            const pos = i * GRID_SIZE;
            ctx.beginPath();
            ctx.moveTo(pos, 0);
            ctx.lineTo(pos, h);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, pos);
            ctx.lineTo(w, pos);
            ctx.stroke();
        }

        // Food
        drawFood();

        // Bonus Food
        if (bonusFood) drawBonusFood();

        // Snake
        drawSnake();

        // Particles
        drawParticles();
    }

    function drawFood() {
        const cx = food.x * GRID_SIZE + GRID_SIZE / 2;
        const cy = food.y * GRID_SIZE + GRID_SIZE / 2;
        const pulse = 0.8 + Math.sin(frameCount * 0.15) * 0.2;
        const r = (GRID_SIZE / 2 - 2) * pulse;

        // Glow
        ctx.save();
        ctx.shadowColor = COLORS.foodGlow;
        ctx.shadowBlur = 15;
        ctx.fillStyle = COLORS.food;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();

        // Inner highlight
        ctx.shadowBlur = 0;
        ctx.fillStyle = COLORS.foodInner;
        ctx.beginPath();
        ctx.arc(cx - 2, cy - 2, r * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    function drawBonusFood() {
        const cx = bonusFood.x * GRID_SIZE + GRID_SIZE / 2;
        const cy = bonusFood.y * GRID_SIZE + GRID_SIZE / 2;
        const pulse = 0.7 + Math.sin(frameCount * 0.25) * 0.3;
        const r = (GRID_SIZE / 2 - 1) * pulse;

        // Star shape
        ctx.save();
        ctx.shadowColor = COLORS.bonusFoodGlow;
        ctx.shadowBlur = 20;
        ctx.fillStyle = COLORS.bonusFood;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (Math.PI * 2 / 5) * i - Math.PI / 2 + frameCount * 0.05;
            const outerX = cx + Math.cos(angle) * r;
            const outerY = cy + Math.sin(angle) * r;
            const innerAngle = angle + Math.PI / 5;
            const innerX = cx + Math.cos(innerAngle) * r * 0.4;
            const innerY = cy + Math.sin(innerAngle) * r * 0.4;
            if (i === 0) ctx.moveTo(outerX, outerY);
            else ctx.lineTo(outerX, outerY);
            ctx.lineTo(innerX, innerY);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    function drawSnake() {
        const len = snake.length;
        for (let i = len - 1; i >= 0; i--) {
            const seg = snake[i];
            const x = seg.x * GRID_SIZE;
            const y = seg.y * GRID_SIZE;
            const t = i / Math.max(len - 1, 1); // 0 = head, 1 = tail

            // Color gradient from head to tail
            const r = Math.round(lerp(52, 4, t));
            const g = Math.round(lerp(211, 120, t));
            const b = Math.round(lerp(153, 87, t));
            const color = `rgb(${r}, ${g}, ${b})`;

            ctx.save();

            if (i === 0) {
                // Head — rounded rect with glow
                ctx.shadowColor = COLORS.snakeHeadGlow;
                ctx.shadowBlur = 12;
                ctx.fillStyle = COLORS.snakeHead;
                roundRect(ctx, x + 1, y + 1, GRID_SIZE - 2, GRID_SIZE - 2, 5);
                ctx.fill();

                // Eyes
                ctx.shadowBlur = 0;
                ctx.fillStyle = '#0d1117';
                const eyeSize = 2.5;
                const eyeOffset = 5;
                if (direction.x === 1) { // right
                    ctx.beginPath(); ctx.arc(x + 14, y + 6, eyeSize, 0, Math.PI * 2); ctx.fill();
                    ctx.beginPath(); ctx.arc(x + 14, y + 14, eyeSize, 0, Math.PI * 2); ctx.fill();
                } else if (direction.x === -1) { // left
                    ctx.beginPath(); ctx.arc(x + 6, y + 6, eyeSize, 0, Math.PI * 2); ctx.fill();
                    ctx.beginPath(); ctx.arc(x + 6, y + 14, eyeSize, 0, Math.PI * 2); ctx.fill();
                } else if (direction.y === -1) { // up
                    ctx.beginPath(); ctx.arc(x + 6, y + 6, eyeSize, 0, Math.PI * 2); ctx.fill();
                    ctx.beginPath(); ctx.arc(x + 14, y + 6, eyeSize, 0, Math.PI * 2); ctx.fill();
                } else { // down
                    ctx.beginPath(); ctx.arc(x + 6, y + 14, eyeSize, 0, Math.PI * 2); ctx.fill();
                    ctx.beginPath(); ctx.arc(x + 14, y + 14, eyeSize, 0, Math.PI * 2); ctx.fill();
                }
            } else {
                // Body segment — rounded rect with gradient color
                ctx.fillStyle = color;
                if (i === len - 1) {
                    // Tail — smaller
                    roundRect(ctx, x + 3, y + 3, GRID_SIZE - 6, GRID_SIZE - 6, 4);
                } else {
                    roundRect(ctx, x + 1.5, y + 1.5, GRID_SIZE - 3, GRID_SIZE - 3, 4);
                }
                ctx.fill();

                // Subtle scale pattern on every other segment
                if (i % 2 === 0) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
                    ctx.beginPath();
                    ctx.arc(x + GRID_SIZE / 2, y + GRID_SIZE / 2, 3, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            ctx.restore();
        }
    }

    // --- Helpers ---
    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    function roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    // --- Overlay ---
    function showOverlay(title, sub) {
        overlayTitle.textContent = title;
        overlaySub.textContent = sub;
        snakeOverlay.style.background = '';
        snakeOverlay.classList.remove('hidden');
    }

    function hideOverlay() {
        snakeOverlay.classList.add('hidden');
    }

    // --- Start ---
    init();
})();
