// Bracket rendering — QF → SF → Final

function renderBracket(games, container) {
  container.innerHTML = '';
  const hideSpoilers = document.documentElement.classList.contains('no-spoilers');

  const bracketContainer = document.createElement('div');
  bracketContainer.className = 'bracket-container';

  const bracket = document.createElement('div');
  bracket.className = 'bracket';

  // Resolve who's in each slot
  const resolved = resolveSlots(games);

  // When hiding spoilers, strip winners and advanced teams from SF/Final
  if (hideSpoilers) {
    for (const key of Object.keys(resolved)) {
      resolved[key].winner = null;
      resolved[key].score = {};
    }
    // Don't show who advanced to SF/Final
    for (const key of ['SF1', 'SF2', 'Final']) {
      if (resolved[key]) {
        resolved[key].team1 = null;
        resolved[key].team2 = null;
      }
    }
  }

  // Quarterfinals column
  bracket.appendChild(buildRound('Quarterfinals', ['QF1', 'QF2', 'QF3', 'QF4'], resolved));
  // Semifinals column
  bracket.appendChild(buildRound('Semifinals', ['SF1', 'SF2'], resolved, [48, 64]));
  // Final column
  bracket.appendChild(buildRound('Final', ['Final'], resolved, [120]));

  bracketContainer.appendChild(bracket);
  container.appendChild(bracketContainer);

  // Champion badge (only when spoilers visible)
  if (!hideSpoilers) {
    const finalMatch = resolved.Final;
    if (finalMatch && finalMatch.winner) {
      const badge = document.createElement('div');
      badge.className = 'champion-badge';
      badge.innerHTML = `<div class="trophy">🏆</div>
        <div class="champ-name"><span class="flag" title="${esc(finalMatch.winner.name)}">${finalMatch.winner.flag}</span> ${esc(finalMatch.winner.name)}</div>
        <div class="label">2026 World Baseball Classic Champion</div>`;
      container.appendChild(badge);
    }
  }
}

function buildRound(title, matchKeys, resolved, topMargins) {
  const round = document.createElement('div');
  round.className = 'bracket-round';
  const h3 = document.createElement('h3');
  h3.textContent = title;
  round.appendChild(h3);

  matchKeys.forEach((key, i) => {
    const match = resolved[key];
    const matchup = document.createElement('div');
    matchup.className = 'bracket-matchup';
    if (topMargins && topMargins[i]) {
      matchup.style.marginTop = topMargins[i] + 'px';
    }

    // Two team rows
    for (const side of ['team1', 'team2']) {
      const t = match[side];
      const div = document.createElement('div');
      if (!t) {
        div.className = 'bracket-team tbd';
        div.innerHTML = `<span>${esc(match[side + 'Label'] || 'TBD')}</span>`;
      } else {
        const isWinner = match.winner && match.winner.id === t.id;
        div.className = 'bracket-team' + (isWinner ? ' winner' : '');
        const seedSpan = match[side + 'Seed'] ? ` <span class="seed">${match[side + 'Seed']}</span>` : '';
        const scoreSpan = match.score && match.score[side] != null
          ? `<span class="bracket-score">${match.score[side]}</span>` : '';
        div.innerHTML = `<span><span class="flag" title="${esc(t.name)}">${t.flag}</span> ${esc(t.name)}${seedSpan}</span>${scoreSpan}`;
      }
      matchup.appendChild(div);
    }

    // Label
    const info = BRACKET_STRUCTURE[key];
    const label = document.createElement('div');
    label.className = 'bracket-label';
    label.innerHTML = `${esc(info.label)} · ${esc(info.date)}, ${locationIconSVG(info.venue)}${esc(info.venue)}`;
    matchup.appendChild(label);

    round.appendChild(matchup);
  });

  return round;
}

function resolveSlots(games) {
  const standings = getPoolFinishers(games);
  const knockoutGames = games.filter(g => ['D', 'L', 'W'].includes(g.gameType) && g.state === 'Final');

  const resolved = {};

  // Quarterfinals — resolve from pool standings
  for (const [key, info] of Object.entries(BRACKET_STRUCTURE)) {
    if (!info.seeds) continue; // skip SF/Final

    const [seed1, seed2] = info.seeds; // e.g. 'C2', 'D1'
    const t1 = resolveSeed(seed1, standings);
    const t2 = resolveSeed(seed2, standings);

    const match = {
      team1: t1, team1Label: seedLabel(seed1), team1Seed: seed1,
      team2: t2, team2Label: seedLabel(seed2), team2Seed: seed2,
      winner: null, score: {},
    };

    // Find actual game result
    const gameResult = findKnockoutGame(key, knockoutGames, t1, t2);
    if (gameResult) {
      match.score = { team1: null, team2: null };
      if (t1) {
        match.score.team1 = gameResult.away.id === t1.id ? gameResult.away.runs : gameResult.home.runs;
      }
      if (t2) {
        match.score.team2 = gameResult.away.id === t2.id ? gameResult.away.runs : gameResult.home.runs;
      }
      if (gameResult.awayWinner) {
        match.winner = t1 && gameResult.away.id === t1.id ? t1 : t2;
      } else if (gameResult.homeWinner) {
        match.winner = t1 && gameResult.home.id === t1.id ? t1 : t2;
      }
    }

    resolved[key] = match;
  }

  // Semifinals and Final — resolve from previous round winners
  for (const [key, info] of Object.entries(BRACKET_STRUCTURE)) {
    if (!info.from) continue;

    const [from1, from2] = info.from;
    const t1 = resolved[from1]?.winner || null;
    const t2 = resolved[from2]?.winner || null;

    const match = {
      team1: t1, team1Label: `${from1} Winner`,
      team2: t2, team2Label: `${from2} Winner`,
      winner: null, score: {},
    };

    const gameResult = findKnockoutGame(key, knockoutGames, t1, t2);
    if (gameResult) {
      match.score = { team1: null, team2: null };
      if (t1) {
        match.score.team1 = gameResult.away.id === t1.id ? gameResult.away.runs : gameResult.home.runs;
      }
      if (t2) {
        match.score.team2 = gameResult.away.id === t2.id ? gameResult.away.runs : gameResult.home.runs;
      }
      if (gameResult.awayWinner) {
        match.winner = t1 && gameResult.away.id === t1.id ? t1 : t2;
      } else if (gameResult.homeWinner) {
        match.winner = t1 && gameResult.home.id === t1.id ? t1 : t2;
      }
    }

    resolved[key] = match;
  }

  return resolved;
}

function getPoolFinishers(games) {
  // Calculate standings to determine pool winners and runners-up
  const standings = {};
  for (const [poolName, poolInfo] of Object.entries(POOLS)) {
    const rows = poolInfo.teamIds.map(id => ({
      id, w: 0, l: 0, rs: 0, ra: 0,
    }));

    const poolGames = games.filter(g => g.gameType === 'F' && g.state === 'Final' && g.pool === poolName);
    for (const g of poolGames) {
      if (g.away.runs == null || g.home.runs == null) continue;
      const awayRow = rows.find(r => r.id === g.away.id);
      const homeRow = rows.find(r => r.id === g.home.id);
      if (!awayRow || !homeRow) continue;

      awayRow.rs += g.away.runs; awayRow.ra += g.home.runs;
      homeRow.rs += g.home.runs; homeRow.ra += g.away.runs;
      if (g.away.runs > g.home.runs) { awayRow.w++; homeRow.l++; }
      else { homeRow.w++; awayRow.l++; }
    }

    rows.sort((a, b) => {
      if (b.w !== a.w) return b.w - a.w;
      return (b.rs - b.ra) - (a.rs - a.ra);
    });

    standings[poolName] = rows;
  }
  return standings;
}

function resolveSeed(seed, standings) {
  // seed like 'C1', 'D2' → Pool C winner, Pool D runner-up
  const poolLetter = seed[0];
  const position = parseInt(seed[1]) - 1;
  const poolName = `Pool ${poolLetter}`;
  const pool = standings[poolName];
  if (!pool || !pool[position]) return null;
  const row = pool[position];
  // Only resolve if they've played at least one game
  if (row.w + row.l === 0) return null;
  const team = TEAMS[row.id];
  return team ? { ...team, id: row.id } : null;
}

function seedLabel(seed) {
  const poolLetter = seed[0];
  const pos = parseInt(seed[1]);
  return pos === 1 ? `Pool ${poolLetter} Winner` : `Pool ${poolLetter} Runner-Up`;
}

function findKnockoutGame(bracketKey, knockoutGames, t1, t2) {
  if (!t1 || !t2) return null;
  // Match by teams involved
  return knockoutGames.find(g => {
    const ids = [g.away.id, g.home.id];
    return ids.includes(t1.id) && ids.includes(t2.id);
  }) || null;
}

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
