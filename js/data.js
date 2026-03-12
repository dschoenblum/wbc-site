// Static tournament data for WBC 2026

const TOURNAMENT = {
  startDate: '2026-03-04',
  endDate: '2026-03-17',
  poolPlayEnd: '2026-03-11',
};

const GAME_TYPES = {
  E: 'Exhibition',
  F: 'Pool Play',
  D: 'Quarterfinals',
  L: 'Semifinals',
  W: 'Finals',
};

// Team ID → display info
const TEAMS = {
  784: { name: 'Canada', code: 'CAN', flag: '🇨🇦' },
  792: { name: 'Colombia', code: 'COL', flag: '🇨🇴' },
  798: { name: 'Cuba', code: 'CUB', flag: '🇨🇺' },
  890: { name: 'Panama', code: 'PAN', flag: '🇵🇦' },
  897: { name: 'Puerto Rico', code: 'PUR', flag: '🇵🇷' },
  776: { name: 'Brazil', code: 'BRA', flag: '🇧🇷' },
  821: { name: 'Great Britain', code: 'GBR', flag: '🇬🇧' },
  841: { name: 'Italy', code: 'ITA', flag: '🇮🇹' },
  867: { name: 'Mexico', code: 'MEX', flag: '🇲🇽' },
  940: { name: 'United States', code: 'USA', flag: '🇺🇸' },
  760: { name: 'Australia', code: 'AUS', flag: '🇦🇺' },
  791: { name: 'Taiwan', code: 'TPE', flag: '🇹🇼' },
  800: { name: 'Czechia', code: 'CZE', flag: '🇨🇿' },
  843: { name: 'Japan', code: 'JPN', flag: '🇯🇵' },
  1171: { name: 'South Korea', code: 'KOR', flag: '🇰🇷' },
  805: { name: 'Dominican Republic', code: 'DOM', flag: '🇩🇴' },
  840: { name: 'Israel', code: 'ISR', flag: '🇮🇱' },
  878: { name: 'Netherlands', code: 'NED', flag: '🇳🇱' },
  881: { name: 'Nicaragua', code: 'NIC', flag: '🇳🇮' },
  944: { name: 'Venezuela', code: 'VEN', flag: '🇻🇪' },
};

const POOLS = {
  'Pool A': {
    venue: 'Hiram Bithorn Stadium, San Juan',
    teamIds: [784, 792, 798, 890, 897],
  },
  'Pool B': {
    venue: 'Daikin Park, Houston',
    teamIds: [776, 821, 841, 867, 940],
  },
  'Pool C': {
    venue: 'Tokyo Dome, Tokyo',
    teamIds: [760, 791, 800, 843, 1171],
  },
  'Pool D': {
    venue: 'loanDepot Park, Miami',
    teamIds: [805, 840, 878, 881, 944],
  },
};

const BRACKET_STRUCTURE = {
  QF1: { label: 'QF1', date: 'Mar 13', venue: 'Miami', seeds: ['C2', 'D1'] },
  QF2: { label: 'QF2', date: 'Mar 13', venue: 'Houston', seeds: ['A2', 'B1'] },
  QF3: { label: 'QF3', date: 'Mar 14', venue: 'Houston', seeds: ['B2', 'A1'] },
  QF4: { label: 'QF4', date: 'Mar 14', venue: 'Miami', seeds: ['D2', 'C1'] },
  SF1: { label: 'SF1', date: 'Mar 15', venue: 'Miami', from: ['QF1', 'QF2'] },
  SF2: { label: 'SF2', date: 'Mar 16', venue: 'Miami', from: ['QF3', 'QF4'] },
  Final: { label: 'Final', date: 'Mar 17', venue: 'Miami', from: ['SF1', 'SF2'] },
};

// Get team display info, with fallback for non-WBC teams (exhibition opponents)
function getTeam(teamId, apiName) {
  if (TEAMS[teamId]) return TEAMS[teamId];
  return { name: apiName || `Team ${teamId}`, code: '', flag: '⚾' };
}
