/* ===== Tic Tac Toe — Game Logic ===== */
(() => {
  'use strict';

  // --- DOM References ---
  const board       = document.getElementById('board');
  const cells       = document.querySelectorAll('.cell');
  const turnIndicator = document.getElementById('turnIndicator');
  const turnSymbol  = document.getElementById('turnSymbol');
  const turnText    = document.getElementById('turnText');
  const scoreX      = document.getElementById('scoreX');
  const scoreO      = document.getElementById('scoreO');
  const scoreDraw   = document.getElementById('scoreDraw');
  const nameO       = document.getElementById('nameO');
  const resultOverlay = document.getElementById('resultOverlay');
  const resultEmoji = document.getElementById('resultEmoji');
  const resultTitle = document.getElementById('resultTitle');
  const resultSub   = document.getElementById('resultSub');
  const btnPlayAgain = document.getElementById('btnPlayAgain');
  const btnRestart  = document.getElementById('btnRestart');
  const btnPvP      = document.getElementById('btnPvP');
  const btnPvAI     = document.getElementById('btnPvAI');
  const winLineSvg  = document.getElementById('winLineSvg');
  const winLine     = document.getElementById('winLine');

  // --- State ---
  let state = Array(9).fill(null);
  let currentPlayer = 'X';
  let gameOver = false;
  let mode = 'pvp'; // 'pvp' or 'pvai'
  let scores = { X: 0, O: 0, draw: 0 };

  const WIN_COMBOS = [
    [0,1,2],[3,4,5],[6,7,8], // rows
    [0,3,6],[1,4,7],[2,5,8], // cols
    [0,4,8],[2,4,6]          // diagonals
  ];

  // Win line coordinates (percentage based) for each combo
  const LINE_COORDS = {
    0: { x1:5,  y1:16.6, x2:95, y2:16.6 },
    1: { x1:5,  y1:50,   x2:95, y2:50 },
    2: { x1:5,  y1:83.3, x2:95, y2:83.3 },
    3: { x1:16.6, y1:5,  x2:16.6, y2:95 },
    4: { x1:50,  y1:5,   x2:50,  y2:95 },
    5: { x1:83.3, y1:5,  x2:83.3, y2:95 },
    6: { x1:5,  y1:5,    x2:95, y2:95 },
    7: { x1:95, y1:5,    x2:5,  y2:95 },
  };

  // Fun result messages
  const winMessages = [
    'Brilliant move!', 'What a play! 🔥', 'Unstoppable!',
    'Victory is sweet!', 'Nicely done! ✨', 'Absolute legend!'
  ];
  const drawMessages = [
    'Great minds think alike!', 'A battle of equals!',
    'So close!', 'Neither backs down!'
  ];

  // --- Initialize ---
  function init() {
    cells.forEach(cell => cell.addEventListener('click', handleClick));
    btnPlayAgain.addEventListener('click', resetBoard);
    btnRestart.addEventListener('click', resetAll);
    btnPvP.addEventListener('click', () => setMode('pvp'));
    btnPvAI.addEventListener('click', () => setMode('pvai'));
    updateTurnUI();
  }

  // --- Mode ---
  function setMode(m) {
    mode = m;
    btnPvP.classList.toggle('active', mode === 'pvp');
    btnPvAI.classList.toggle('active', mode === 'pvai');
    nameO.textContent = mode === 'pvai' ? 'AI' : 'Player 2';
    resetAll();
  }

  // --- Handle Click ---
  function handleClick(e) {
    const idx = +e.target.dataset.index;
    if (state[idx] || gameOver) return;
    // In AI mode, only allow clicks on X's turn
    if (mode === 'pvai' && currentPlayer === 'O') return;

    makeMove(idx, currentPlayer);
  }

  function makeMove(idx, player) {
    state[idx] = player;
    const cell = cells[idx];
    cell.classList.add('taken');
    cell.innerHTML = `<span class="mark mark-${player.toLowerCase()}">${player === 'X' ? '✕' : '◯'}</span>`;

    // Sound-like visual feedback: small ripple
    cell.style.animation = 'none';
    cell.offsetHeight; // reflow
    cell.style.animation = '';

    const winCombo = checkWin(player);
    if (winCombo !== null) {
      handleWin(player, winCombo);
      return;
    }
    if (state.every(c => c !== null)) {
      handleDraw();
      return;
    }

    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    updateTurnUI();

    // AI move
    if (mode === 'pvai' && currentPlayer === 'O' && !gameOver) {
      board.style.pointerEvents = 'none';
      setTimeout(() => {
        aiMove();
        board.style.pointerEvents = '';
      }, 400 + Math.random() * 300);
    }
  }

  // --- Win / Draw ---
  function checkWin(player) {
    for (let i = 0; i < WIN_COMBOS.length; i++) {
      const [a, b, c] = WIN_COMBOS[i];
      if (state[a] === player && state[b] === player && state[c] === player) {
        return i;
      }
    }
    return null;
  }

  function handleWin(player, comboIdx) {
    gameOver = true;
    scores[player]++;
    updateScores();

    // Highlight winning cells
    WIN_COMBOS[comboIdx].forEach(i => cells[i].classList.add('win-cell'));

    // Draw win line
    drawWinLine(comboIdx);

    // Show result after short delay
    setTimeout(() => {
      const isX = player === 'X';
      const name = (mode === 'pvai' && !isX) ? 'AI' : (isX ? 'Player 1' : 'Player 2');
      resultEmoji.textContent = isX ? '🎉' : '🏆';
      resultTitle.textContent = `${name} Wins!`;
      resultTitle.className = 'result-title ' + (isX ? 'win-x' : 'win-o');
      resultSub.textContent = winMessages[Math.floor(Math.random() * winMessages.length)];
      resultOverlay.classList.remove('hidden');
      spawnConfetti();
    }, 700);
  }

  function handleDraw() {
    gameOver = true;
    scores.draw++;
    updateScores();

    setTimeout(() => {
      resultEmoji.textContent = '🤝';
      resultTitle.textContent = "It's a Draw!";
      resultTitle.className = 'result-title draw';
      resultSub.textContent = drawMessages[Math.floor(Math.random() * drawMessages.length)];
      resultOverlay.classList.remove('hidden');
    }, 400);
  }

  function drawWinLine(comboIdx) {
    const coords = LINE_COORDS[comboIdx];
    winLine.setAttribute('x1', coords.x1);
    winLine.setAttribute('y1', coords.y1);
    winLine.setAttribute('x2', coords.x2);
    winLine.setAttribute('y2', coords.y2);
    winLine.classList.add('animate');
  }

  // --- AI (Minimax) ---
  function aiMove() {
    if (gameOver) return;
    const bestIdx = minimax(state.slice(), 'O', 0).index;
    if (bestIdx !== undefined) {
      makeMove(bestIdx, 'O');
    }
  }

  function minimax(board, player, depth) {
    const available = board.map((v, i) => v === null ? i : null).filter(v => v !== null);

    // Terminal checks
    if (isWinner(board, 'O')) return { score: 10 - depth };
    if (isWinner(board, 'X')) return { score: depth - 10 };
    if (available.length === 0)  return { score: 0 };

    const moves = [];
    for (const idx of available) {
      const move = { index: idx };
      board[idx] = player;
      const result = minimax(board, player === 'O' ? 'X' : 'O', depth + 1);
      move.score = result.score;
      board[idx] = null;
      moves.push(move);
    }

    let best;
    if (player === 'O') {
      let bestScore = -Infinity;
      for (const m of moves) {
        if (m.score > bestScore) { bestScore = m.score; best = m; }
      }
    } else {
      let bestScore = Infinity;
      for (const m of moves) {
        if (m.score < bestScore) { bestScore = m.score; best = m; }
      }
    }
    return best;
  }

  function isWinner(board, player) {
    return WIN_COMBOS.some(([a, b, c]) => board[a] === player && board[b] === player && board[c] === player);
  }

  // --- UI Updates ---
  function updateTurnUI() {
    turnSymbol.textContent = currentPlayer === 'X' ? '✕' : '◯';
    const nameStr = (mode === 'pvai' && currentPlayer === 'O') ? 'AI' : (currentPlayer === 'X' ? 'Player 1' : 'Player 2');
    turnText.textContent = `${nameStr}'s turn`;
    turnIndicator.className = 'turn-indicator ' + (currentPlayer === 'X' ? 'x-turn' : 'o-turn');
  }

  function updateScores() {
    scoreX.textContent = scores.X;
    scoreO.textContent = scores.O;
    scoreDraw.textContent = scores.draw;
  }

  // --- Reset ---
  function resetBoard() {
    state = Array(9).fill(null);
    gameOver = false;
    currentPlayer = 'X';
    cells.forEach(cell => {
      cell.innerHTML = '';
      cell.classList.remove('taken', 'win-cell');
    });
    winLine.classList.remove('animate');
    winLine.setAttribute('x1', 0);
    winLine.setAttribute('y1', 0);
    winLine.setAttribute('x2', 0);
    winLine.setAttribute('y2', 0);
    resultOverlay.classList.add('hidden');
    removeConfetti();
    updateTurnUI();
  }

  function resetAll() {
    scores = { X: 0, O: 0, draw: 0 };
    updateScores();
    resetBoard();
  }

  // --- Confetti ---
  function spawnConfetti() {
    removeConfetti();
    const container = document.createElement('div');
    container.className = 'confetti';
    container.id = 'confettiContainer';
    document.body.appendChild(container);

    const colors = ['#f472b6', '#60a5fa', '#a78bfa', '#facc15', '#34d399', '#fb923c'];
    for (let i = 0; i < 60; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.left = Math.random() * 100 + '%';
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDuration = (1.5 + Math.random() * 2) + 's';
      piece.style.animationDelay = Math.random() * 0.8 + 's';
      piece.style.width = (6 + Math.random() * 8) + 'px';
      piece.style.height = (6 + Math.random() * 8) + 'px';
      piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
      container.appendChild(piece);
    }
  }

  function removeConfetti() {
    const existing = document.getElementById('confettiContainer');
    if (existing) existing.remove();
  }

  // --- Start ---
  init();
})();
