// MLB Stats API fetching and data normalization

const SCHEDULE_URL =
  'https://statsapi.mlb.com/api/v1/schedule?sportId=51&startDate=2026-03-04&endDate=2026-03-17&hydrate=team,linescore';

/**
 * Fetch all WBC games from the MLB Stats API.
 * Returns an array of normalized game objects sorted by date/time.
 */
async function fetchGames() {
  const res = await fetch(SCHEDULE_URL, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  const games = [];
  for (const dateEntry of data.dates || []) {
    for (const g of dateEntry.games || []) {
      games.push(normalizeGame(g));
    }
  }
  return games;
}

function normalizeGame(g) {
  const away = g.teams.away;
  const home = g.teams.home;
  const awayTeam = getTeam(away.team.id, away.team.name);
  const homeTeam = getTeam(home.team.id, home.team.name);
  const awayPool = away.team.division?.name || '';
  const homePool = home.team.division?.name || '';
  const pool = awayPool.startsWith('Pool') ? awayPool : homePool.startsWith('Pool') ? homePool : '';

  const ls = g.linescore || {};
  const lsTeams = ls.teams || {};
  const awayRuns = lsTeams.away?.runs ?? null;
  const homeRuns = lsTeams.home?.runs ?? null;

  const state = g.status.abstractGameState; // Preview, Live, Final
  const detailedState = g.status.detailedState;

  // Determine inning info for live games
  let inningState = '';
  let outs = null;
  let balls = null;
  let strikes = null;
  let onFirst = false;
  let onSecond = false;
  let onThird = false;
  if (state === 'Live' && ls.currentInning) {
    const half = ls.isTopInning ? 'Top' : 'Bot';
    inningState = `${half} ${ls.currentInning}${ordinal(ls.currentInning)}`;
    outs = ls.outs ?? null;
    balls = ls.balls ?? null;
    strikes = ls.strikes ?? null;
    const offense = ls.offense || {};
    onFirst = !!offense.first;
    onSecond = !!offense.second;
    onThird = !!offense.third;
  }

  // Track innings for tiebreaker calculations (defensive outs)
  const currentInning = ls.currentInning ?? null;
  const isTopInning = ls.isTopInning ?? null;

  return {
    gamePk: g.gamePk,
    gameDate: g.gameDate,       // ISO UTC string
    officialDate: g.officialDate, // YYYY-MM-DD
    gameType: g.gameType,
    gameTypeLabel: GAME_TYPES[g.gameType] || g.gameType,
    state,        // Preview, Live, Final
    detailedState,
    pool,
    venue: g.venue?.name || '',
    away: { ...awayTeam, id: away.team.id, runs: awayRuns },
    home: { ...homeTeam, id: home.team.id, runs: homeRuns },
    awayWinner: state === 'Final' && awayRuns != null && homeRuns != null && awayRuns > homeRuns,
    homeWinner: state === 'Final' && awayRuns != null && homeRuns != null && homeRuns > awayRuns,
    inningState,
    outs,
    balls,
    strikes,
    onFirst,
    onSecond,
    onThird,
    currentInning,
    isTopInning,
    description: g.description || '',
    seriesDescription: g.seriesDescription || '',
  };
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
