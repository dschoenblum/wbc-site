// Standings calculation and rendering

function renderStandings(games, container) {
  container.innerHTML = '';
  const standings = calculateStandings(games);
  const hideSpoilers = document.documentElement.classList.contains('no-spoilers');

  for (const [poolName, poolInfo] of Object.entries(POOLS)) {
    const section = document.createElement('div');
    section.className = 'pool-section';

    const title = document.createElement('div');
    title.className = 'pool-title';
    title.innerHTML = `${esc(poolName)} <span class="venue">${locationIconSVG(poolInfo.venue)}${esc(poolInfo.venue)}</span>`;
    section.appendChild(title);

    const table = document.createElement('table');
    table.innerHTML = hideSpoilers
      ? `<thead><tr><th>Team</th></tr></thead>`
      : `<thead><tr>
      <th>Team</th><th>W</th><th>L</th><th>RS</th><th>RA</th><th>Diff</th>
    </tr></thead>`;

    const tbody = document.createElement('tbody');
    const poolStandings = standings[poolName] || [];

    // When hiding spoilers, show teams in original pool order (no ranking reveal)
    const rows = hideSpoilers
      ? poolInfo.teamIds.map(id => { const t = TEAMS[id]; return { id, name: t.name, flag: t.flag, w: 0, l: 0, rs: 0, ra: 0 }; })
      : poolStandings;

    rows.forEach((row, i) => {
      const tr = document.createElement('tr');
      if (!hideSpoilers && i < 2 && row.w + row.l > 0) tr.className = 'qualified';
      const nameClass = !hideSpoilers && row.clinched ? 'team-name clinched' :
                         !hideSpoilers && row.eliminated ? 'team-name eliminated' : 'team-name';
      if (hideSpoilers) {
        tr.innerHTML = `
          <td><div class="team-cell">
            <span class="flag" title="${esc(row.name)}">${row.flag}</span> <span class="team-name">${esc(row.name)}</span>
          </div></td>`;
      } else {
        const diff = row.rs - row.ra;
        const diffStr = diff > 0 ? `+${diff}` : `${diff}`;
        tr.innerHTML = `
          <td><div class="team-cell">
            <span class="rank">${i + 1}</span>
            <span class="flag" title="${esc(row.name)}">${row.flag}</span> <span class="${nameClass}">${esc(row.name)}</span>
          </div></td>
          <td>${row.w}</td><td>${row.l}</td>
          <td>${row.rs}</td><td>${row.ra}</td><td>${diffStr}</td>`;
      }
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    section.appendChild(table);
    container.appendChild(section);
  }
}

function calculateStandings(games) {
  // Initialize standings for each pool
  const standings = {};
  for (const [poolName, poolInfo] of Object.entries(POOLS)) {
    standings[poolName] = poolInfo.teamIds.map(id => {
      const t = TEAMS[id];
      return { id, name: t.name, flag: t.flag, w: 0, l: 0, rs: 0, ra: 0 };
    });
  }

  // Tally pool play results
  const poolGames = games.filter(g => g.gameType === 'F' && g.state === 'Final');
  for (const g of poolGames) {
    if (!g.pool || g.away.runs == null || g.home.runs == null) continue;

    const pool = standings[g.pool];
    if (!pool) continue;

    const awayRow = pool.find(r => r.id === g.away.id);
    const homeRow = pool.find(r => r.id === g.home.id);
    if (!awayRow || !homeRow) continue;

    awayRow.rs += g.away.runs;
    awayRow.ra += g.home.runs;
    homeRow.rs += g.home.runs;
    homeRow.ra += g.away.runs;

    if (g.away.runs > g.home.runs) {
      awayRow.w++;
      homeRow.l++;
    } else {
      homeRow.w++;
      awayRow.l++;
    }
  }

  // Sort each pool using proper WBC tiebreaker rules
  for (const poolName of Object.keys(standings)) {
    standings[poolName] = sortPool(standings[poolName], poolGames);
  }

  // Compute clinch/elimination status for each pool
  const clinchStatus = computeClinchStatus(standings, poolGames);
  for (const poolName of Object.keys(standings)) {
    for (const row of standings[poolName]) {
      const status = clinchStatus[poolName]?.[row.id];
      if (status === 'clinched') row.clinched = true;
      if (status === 'eliminated') row.eliminated = true;
    }
  }

  return standings;
}

/**
 * Sort a pool using WBC tiebreaker rules:
 * 1. Win-loss record
 * 2. Head-to-head among tied teams
 * 3. Runs allowed quotient (RA / defensive outs) among tied teams
 * 4. Run differential among tied teams (fallback)
 */
function sortPool(pool, poolGames) {
  // Group teams by win count (primary sort)
  const groups = {};
  for (const row of pool) {
    const key = `${row.w}-${row.l}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(row);
  }

  // Sort group keys by wins descending
  const sortedKeys = Object.keys(groups).sort((a, b) => {
    const [aw] = a.split('-').map(Number);
    const [bw] = b.split('-').map(Number);
    return bw - aw;
  });

  // Resolve ties within each group and flatten
  const result = [];
  for (const key of sortedKeys) {
    const group = groups[key];
    if (group.length === 1) {
      result.push(group[0]);
    } else {
      result.push(...resolveTiedGroup(group, poolGames));
    }
  }
  return result;
}

/**
 * Resolve a group of teams tied on W-L record.
 * Applies WBC tiebreakers recursively.
 */
function resolveTiedGroup(teams, poolGames) {
  if (teams.length <= 1) return teams;

  const teamIds = new Set(teams.map(t => t.id));

  // Games among the tied teams only
  const tiedGames = poolGames.filter(g =>
    g.away.runs != null && g.home.runs != null &&
    teamIds.has(g.away.id) && teamIds.has(g.home.id)
  );

  // Step 1: Head-to-head among tied teams
  const h2h = {};
  for (const t of teams) h2h[t.id] = { w: 0, l: 0 };
  for (const g of tiedGames) {
    if (g.away.runs > g.home.runs) {
      h2h[g.away.id].w++;
      h2h[g.home.id].l++;
    } else {
      h2h[g.home.id].w++;
      h2h[g.away.id].l++;
    }
  }

  // Check if H2H separates into distinct tiers
  const h2hGroups = groupByKey(teams, t => h2h[t.id].w - h2h[t.id].l);
  if (h2hGroups.length > 1) {
    // H2H resolved at least partially — sort tiers by H2H diff desc, recurse within each
    h2hGroups.sort((a, b) => b.key - a.key);
    const result = [];
    for (const g of h2hGroups) {
      result.push(...resolveTiedGroup(g.items, poolGames));
    }
    return result;
  }

  // Step 2: Runs allowed quotient (RA / defensive outs) among tied teams
  const raQuotient = {};
  for (const t of teams) raQuotient[t.id] = { ra: 0, outs: 0 };
  for (const g of tiedGames) {
    const { awayOuts, homeOuts } = getDefensiveOuts(g);
    raQuotient[g.home.id].ra += g.away.runs;
    raQuotient[g.home.id].outs += homeOuts;
    raQuotient[g.away.id].ra += g.home.runs;
    raQuotient[g.away.id].outs += awayOuts;
  }

  const raGroups = groupByKey(teams, t => {
    const q = raQuotient[t.id];
    return q.outs > 0 ? q.ra / q.outs : Infinity;
  }, true);
  if (raGroups.length > 1) {
    raGroups.sort((a, b) => a.key - b.key); // lower quotient is better
    const result = [];
    for (const g of raGroups) {
      result.push(...resolveTiedGroup(g.items, poolGames));
    }
    return result;
  }

  // Step 3: Run differential among tied teams (fallback)
  const rdiff = {};
  for (const t of teams) rdiff[t.id] = 0;
  for (const g of tiedGames) {
    rdiff[g.away.id] += g.away.runs - g.home.runs;
    rdiff[g.home.id] += g.home.runs - g.away.runs;
  }
  teams.sort((a, b) => rdiff[b.id] - rdiff[a.id]);
  return teams;
}

/**
 * Calculate defensive outs for each team in a game.
 * Home team fields during top halves; away team fields during bottom halves.
 */
function getDefensiveOuts(game) {
  const inn = game.currentInning || 9;
  // Home team always pitches all top halves
  const homeOuts = inn * 3;
  // Away team pitches bottom halves. If game ended after top of last inning
  // (isTopInning=true for Final), bottom of last inning wasn't played.
  let awayOuts;
  if (game.state === 'Final' && game.isTopInning === true) {
    awayOuts = (inn - 1) * 3;
  } else {
    awayOuts = inn * 3;
  }
  return { awayOuts, homeOuts };
}

/**
 * Group items by a numeric key function. Items with equal keys (within tolerance
 * for floats) are placed in the same group.
 */
function groupByKey(items, keyFn, isFloat = false) {
  const entries = items.map(item => ({ item, key: keyFn(item) }));
  entries.sort((a, b) => a.key - b.key);

  const groups = [];
  for (const entry of entries) {
    const last = groups[groups.length - 1];
    const same = last && (isFloat
      ? Math.abs(last.key - entry.key) < 1e-9
      : last.key === entry.key);
    if (same) {
      last.items.push(entry.item);
    } else {
      groups.push({ key: entry.key, items: [entry.item] });
    }
  }
  return groups;
}

/**
 * Determine clinched/eliminated status for every team in every pool.
 * Simulates all possible outcomes of remaining pool games (2^n where n = remaining games).
 * A team is "clinched" if it finishes top 2 in every scenario.
 * A team is "eliminated" if it never finishes top 2 in any scenario.
 *
 * Uses W-L and H2H tiebreakers (which depend only on who wins, not scores).
 * When teams remain tied beyond H2H (needing RA quotient or run differential,
 * which depend on unknown future scores), conservatively assumes any ordering
 * within the tied group is possible.
 */
function computeClinchStatus(standings, playedGames) {
  const result = {};
  for (const [poolName, poolInfo] of Object.entries(POOLS)) {
    result[poolName] = {};
    const teamIds = poolInfo.teamIds;

    // Find remaining games: all pairs that haven't played yet
    const playedPairs = new Set();
    for (const g of playedGames) {
      if (g.pool !== poolName) continue;
      const key = [g.away.id, g.home.id].sort((a, b) => a - b).join('-');
      playedPairs.add(key);
    }

    const remaining = [];
    for (let i = 0; i < teamIds.length; i++) {
      for (let j = i + 1; j < teamIds.length; j++) {
        const key = [teamIds[i], teamIds[j]].sort((a, b) => a - b).join('-');
        if (!playedPairs.has(key)) {
          remaining.push([teamIds[i], teamIds[j]]);
        }
      }
    }

    // If no remaining games, no simulation needed
    if (remaining.length === 0) {
      const pool = standings[poolName];
      pool.forEach((row, i) => {
        result[poolName][row.id] = i < 2 ? 'clinched' : 'eliminated';
      });
      continue;
    }

    // Current W-L records
    const currentRecord = {};
    for (const row of standings[poolName]) {
      currentRecord[row.id] = { w: row.w, l: row.l, rs: row.rs, ra: row.ra };
    }

    // Track if a team ever finishes top 2 or ever doesn't
    const everTop2 = {};
    const alwaysTop2 = {};
    for (const id of teamIds) {
      everTop2[id] = false;
      alwaysTop2[id] = true;
    }

    // Enumerate all 2^n outcomes
    const n = remaining.length;
    const total = 1 << n;
    const poolPlayedGames = playedGames.filter(g => g.pool === poolName);
    for (let mask = 0; mask < total; mask++) {
      // Build simulated W-L for this scenario
      const simPool = teamIds.map(id => {
        const r = currentRecord[id];
        return { id, name: '', flag: '', w: r.w, l: r.l, rs: r.rs, ra: r.ra };
      });
      // Build fake game objects for simulated outcomes (for H2H tiebreaking)
      const simGames = [...poolPlayedGames];
      for (let k = 0; k < n; k++) {
        const [a, b] = remaining[k];
        const rowA = simPool.find(r => r.id === a);
        const rowB = simPool.find(r => r.id === b);
        if (mask & (1 << k)) {
          rowA.w++; rowB.l++;
          simGames.push({ away: { id: a, runs: 1 }, home: { id: b, runs: 0 }, pool: poolName, state: 'Final', currentInning: 9, isTopInning: false });
        } else {
          rowB.w++; rowA.l++;
          simGames.push({ away: { id: a, runs: 0 }, home: { id: b, runs: 1 }, pool: poolName, state: 'Final', currentInning: 9, isTopInning: false });
        }
      }

      // Sort into groups: resolved by W-L and H2H, but teams still tied
      // beyond H2H are grouped together (any ordering possible)
      const groups = sortPoolGroups(simPool, simGames);

      // Walk groups and determine possible positions for each team
      let pos = 0;
      for (const group of groups) {
        const groupEnd = pos + group.length;
        for (const team of group) {
          if (pos < 2) everTop2[team.id] = true;
          if (groupEnd > 2) alwaysTop2[team.id] = false;
        }
        pos = groupEnd;
      }
    }

    for (const id of teamIds) {
      if (alwaysTop2[id]) result[poolName][id] = 'clinched';
      else if (!everTop2[id]) result[poolName][id] = 'eliminated';
    }
  }
  return result;
}

/**
 * Sort a pool into groups for simulation purposes.
 * Uses W-L and H2H tiebreakers (which only depend on who won, not scores).
 * Returns array of arrays — each inner array is a group of teams that could
 * not be further separated. Teams within a group can finish in any order
 * (since further tiebreakers depend on unknown future scores).
 */
function sortPoolGroups(pool, allGames) {
  const groups = {};
  for (const row of pool) {
    const key = `${row.w}-${row.l}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(row);
  }
  const sortedKeys = Object.keys(groups).sort((a, b) => {
    const [aw] = a.split('-').map(Number);
    const [bw] = b.split('-').map(Number);
    return bw - aw;
  });

  const result = [];
  for (const key of sortedKeys) {
    const group = groups[key];
    if (group.length === 1) {
      result.push(group);
    } else {
      result.push(...resolveGroupsH2HOnly(group, allGames));
    }
  }
  return result;
}

/**
 * Resolve tied teams using only H2H (not RA quotient or run differential).
 * Returns array of groups — teams within a group remain unseparated.
 */
function resolveGroupsH2HOnly(teams, allGames) {
  if (teams.length <= 1) return [teams];

  const teamIds = new Set(teams.map(t => t.id));
  const tiedGames = allGames.filter(g =>
    g.away.runs != null && g.home.runs != null &&
    teamIds.has(g.away.id) && teamIds.has(g.home.id)
  );

  const h2h = {};
  for (const t of teams) h2h[t.id] = { w: 0, l: 0 };
  for (const g of tiedGames) {
    if (g.away.runs > g.home.runs) {
      h2h[g.away.id].w++;
      h2h[g.home.id].l++;
    } else {
      h2h[g.home.id].w++;
      h2h[g.away.id].l++;
    }
  }

  const h2hGroups = groupByKey(teams, t => h2h[t.id].w - h2h[t.id].l);
  if (h2hGroups.length > 1) {
    h2hGroups.sort((a, b) => b.key - a.key);
    const result = [];
    for (const g of h2hGroups) {
      result.push(...resolveGroupsH2HOnly(g.items, allGames));
    }
    return result;
  }

  // H2H couldn't separate — return as one unseparated group
  return [teams];
}

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
