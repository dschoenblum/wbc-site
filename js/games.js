// Games list view — renders game cards grouped by date

function renderGames(games, container) {
  container.innerHTML = '';

  // Exclude exhibition games
  const filtered = games.filter(g => g.gameType !== 'E');

  if (filtered.length === 0) {
    const msg = document.createElement('div');
    msg.className = 'loading-msg';
    msg.textContent = 'No games to show.';
    container.appendChild(msg);
    return;
  }

  // Group by local date (derived from gameDate UTC string in user's timezone)
  const groups = new Map();
  for (const g of filtered) {
    const localDate = localDateStr(g.gameDate);
    if (!groups.has(localDate)) groups.set(localDate, []);
    groups.get(localDate).push(g);
  }

  for (const [date, dateGames] of groups) {
    const header = document.createElement('div');
    header.className = 'date-header';
    header.textContent = formatDateHeader(date);
    container.appendChild(header);

    for (const g of dateGames) {
      container.appendChild(buildGameCard(g));
    }
  }

}

function buildGameCard(g) {
  const card = document.createElement('div');
  card.className = 'game-card' + (g.state === 'Live' ? ' live' : '');

  const isFinished = g.state === 'Final';
  const isLive = g.state === 'Live';
  const hasScore = g.away.runs != null && g.home.runs != null;
  const hideSpoilers = document.documentElement.classList.contains('no-spoilers');
  const showResult = hasScore && !hideSpoilers;

  // Away team
  const awayRow = document.createElement('div');
  awayRow.className = 'team-row away' + (showResult && g.awayWinner ? ' winner' : '');
  awayRow.innerHTML = `<span>${esc(g.away.name)}</span><span class="flag" title="${esc(g.away.name)}">${g.away.flag}</span>`;

  // Score column
  const scoreCol = document.createElement('div');
  scoreCol.className = 'score-col';

  if (showResult) {
    const scoreDiv = document.createElement('div');
    scoreDiv.className = 'score';
    const awaySpan = g.awayWinner ? `<span class="winner-score">${g.away.runs}</span>` : `${g.away.runs}`;
    const homeSpan = g.homeWinner ? `<span class="winner-score">${g.home.runs}</span>` : `${g.home.runs}`;
    scoreDiv.innerHTML = `${awaySpan}<span class="sep">–</span>${homeSpan}`;
    scoreCol.appendChild(scoreDiv);
  }

  const badge = document.createElement('div');
  if (isFinished) {
    badge.className = 'status-badge final';
    badge.textContent = hideSpoilers && hasScore ? '✓ Complete' : 'Final';
  } else if (isLive) {
    badge.className = 'status-badge live';
    badge.textContent = hideSpoilers ? '● Live' : `● Live${g.inningState ? ' · ' + g.inningState : ''}`;
  } else {
    badge.className = 'status-badge upcoming';
    badge.textContent = formatGameTime(g.gameDate);
  }
  scoreCol.appendChild(badge);

  // Home team
  const homeRow = document.createElement('div');
  homeRow.className = 'team-row home' + (showResult && g.homeWinner ? ' winner' : '');
  homeRow.innerHTML = `<span class="flag" title="${esc(g.home.name)}">${g.home.flag}</span><span>${esc(g.home.name)}</span>`;

  // Meta row
  const meta = document.createElement('div');
  meta.className = 'game-meta';
  const poolLabel = g.pool || g.gameTypeLabel;
  meta.innerHTML = `<span class="pool-badge">${esc(poolLabel)} ${locationIconSVG(g.venue)}${esc(g.venue)}</span>` +
    `<a href="https://www.mlb.com/gameday/${g.gamePk}" target="_blank" rel="noopener">${isFinished ? 'Gameday' : 'Preview'} →</a>`;

  // Live game state: diamond, count, outs
  if (isLive && g.outs != null && !hideSpoilers) {
    const stateRow = document.createElement('div');
    stateRow.className = 'game-state';

    // Baseball diamond SVG
    const diamond = `<svg class="diamond" viewBox="0 0 60 60" width="48" height="48">
      <path d="M30 45 L15 30 L30 15 L45 30 Z" fill="none" stroke="var(--diamond-stroke)" stroke-width="1.5"/>
      <rect x="27" y="43" width="6" height="4" rx="1" fill="var(--diamond-plate)"/>
      <circle cx="45" cy="30" r="5" fill="${g.onFirst ? 'var(--accent)' : 'none'}" stroke="${g.onFirst ? 'var(--accent)' : 'var(--diamond-stroke)'}" stroke-width="1.5" transform="rotate(45 45 30)"/>
      <circle cx="30" cy="15" r="5" fill="${g.onSecond ? 'var(--accent)' : 'none'}" stroke="${g.onSecond ? 'var(--accent)' : 'var(--diamond-stroke)'}" stroke-width="1.5" transform="rotate(45 30 15)"/>
      <circle cx="15" cy="30" r="5" fill="${g.onThird ? 'var(--accent)' : 'none'}" stroke="${g.onThird ? 'var(--accent)' : 'var(--diamond-stroke)'}" stroke-width="1.5" transform="rotate(45 15 30)"/>
    </svg>`;

    // Count (B-S)
    const countStr = g.balls != null && g.strikes != null
      ? `<div class="count-display"><span class="count-label">Count</span><span class="count-value">${g.balls}-${g.strikes}</span></div>`
      : '';

    // Outs
    const outDots = [0, 1, 2].map(i =>
      `<span class="out-dot${i < g.outs ? ' filled' : ''}"></span>`
    ).join('');
    const outsStr = `<div class="outs-display"><span class="count-label">${g.outs} Out${g.outs !== 1 ? 's' : ''}</span><div class="out-dots">${outDots}</div></div>`;

    stateRow.innerHTML = `${countStr}${diamond}${outsStr}`;
    card.append(awayRow, scoreCol, homeRow, stateRow, meta);
  } else {
    card.append(awayRow, scoreCol, homeRow, meta);
  }
  return card;
}

function formatDateHeader(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function formatGameTime(isoStr) {
  const d = new Date(isoStr);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}


/** Convert an ISO UTC datetime string to a YYYY-MM-DD string in the user's local timezone */
function localDateStr(isoStr) {
  const d = new Date(isoStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
