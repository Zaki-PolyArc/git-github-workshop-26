export interface ScoreboardPlayer {
  rank: number;
  username: string;
  name: string;
  branch: string;
  points: number;
  mergedPRs: number;
  lastScoringPR: string;
  certificate: boolean;
}

const USERNAME = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;

function rowsFromCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < csv.length; i++) {
    const char = csv[i];
    if (quoted && char === '"' && csv[i + 1] === '"') { cell += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (!quoted && char === ',') { row.push(cell); cell = ''; }
    else if (!quoted && (char === '\n' || char === '\r')) {
      if (char === '\r' && csv[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += char;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

const key = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
const scoringDate = (value: string) => {
  const serial = Number(value);
  const time = value.trim() && Number.isFinite(serial) && serial > 10_000
    ? Date.UTC(1899, 11, 30) + Math.floor(serial) * 86_400_000
    : Date.parse(value);
  return Number.isFinite(time) ? new Date(time).setUTCHours(0, 0, 0, 0) : 0;
};

export function parseLeaderboardCsv(csv: string): ScoreboardPlayer[] {
  if (!csv.trim() || csv.length > 1_000_000) throw new Error('The published sheet is empty or too large.');
  const [headers = [], ...rows] = rowsFromCsv(csv.replace(/^\uFEFF/, ''));
  const columns = new Map(headers.map((header, index) => [key(header), index]));
  const column = (...names: string[]) => names.map(key).map((name) => columns.get(name)).find((index) => index !== undefined);
  const userCol = column('Player (GitHub)', 'GitHub', 'Username');
  const nameCol = column('Name');
  const branchCol = column('Year / Branch', 'Branch');
  const pointsCol = column('Points');
  const mergedCol = column('Merged PRs', 'Merged Pull Requests');
  const dateCol = column('Last scoring PR', 'Last Scoring PR Date');
  const certificateCol = column('Certificate?');
  if ([userCol, pointsCol, mergedCol].some((index) => index === undefined)) {
    throw new Error('The published sheet is missing Player (GitHub), Points, or Merged PRs columns.');
  }
  if (rows.length > 5000) throw new Error('The published sheet has more than 5,000 rows.');

  const players = rows.flatMap((row) => {
    const username = row[userCol!]?.trim() ?? '';
    if (!username) return [];
    if (!USERNAME.test(username)) return [];
    const points = Number(row[pointsCol!]);
    const mergedPRs = Number(row[mergedCol!]);
    if (!Number.isFinite(points) || !Number.isFinite(mergedPRs)) return [];
    const rawDate = dateCol === undefined ? '' : row[dateCol]?.trim() ?? '';
    const timestamp = rawDate ? scoringDate(rawDate) : 0;
    const certificateValue = certificateCol === undefined ? '' : row[certificateCol]?.trim().toLowerCase() ?? '';
    return [{
      rank: 0,
      username,
      name: row[nameCol!]?.trim() || username,
      branch: branchCol === undefined ? '' : row[branchCol]?.trim() ?? '',
      points,
      mergedPRs,
      lastScoringPR: timestamp ? new Date(timestamp).toISOString().slice(0, 10) : '',
      certificate: ['yes', 'y', 'true', '1'].includes(certificateValue),
      timestamp,
    }];
  }).sort((a, b) => b.points - a.points || (a.points === 0 ? 0 : a.timestamp - b.timestamp) || a.username.localeCompare(b.username));

  let rank = 0;
  players.forEach((player, index) => {
    const previous = players[index - 1];
    if (!previous || player.points !== previous.points || player.timestamp !== previous.timestamp) rank = index + 1;
    player.rank = rank;
  });
  return players.map(({ timestamp: _timestamp, ...player }) => player);
}
