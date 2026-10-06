import { describe, expect, it } from 'vitest';
import { parseLeaderboardCsv } from './leaderboard-csv';

describe('parseLeaderboardCsv', () => {
  it('sorts points, breaks ties by earlier scoring date, and shares exact ties', () => {
    const csv = [
      'Player (GitHub),Name,Year / Branch,Points,Merged PRs,Last scoring PR',
      'later,Later Player,2029/CE,3,1,2026-10-05',
      'winner,Winner,2029/CE,3,2,2026-10-04',
      'co-winner,Co Winner,2029/CSE,3,1,2026-10-04',
      'newbie,New Player,,0,0,',
    ].join('\n');

    expect(parseLeaderboardCsv(csv).map(({ username, rank }) => [username, rank])).toEqual([
      ['co-winner', 1], ['winner', 1], ['later', 3], ['newbie', 4],
    ]);
    expect(parseLeaderboardCsv(csv)[3].branch).toBe('');
  });

  it('handles quoted commas and rejects a missing required column', () => {
    const csv = 'Player (GitHub),Name,Points,Merged PRs\nplayer,"Name, With Comma",2,1';
    expect(parseLeaderboardCsv(csv)[0].name).toBe('Name, With Comma');
    expect(() => parseLeaderboardCsv('Name,Points\nPlayer,2')).toThrow(/missing/i);
  });

  it('accepts spreadsheet serial dates', () => {
    const csv = 'Player (GitHub),Points,Merged PRs,Last scoring PR,Certificate?\nlate,3,1,46298,Yes\nearly,3,1,46297,No';
    const players = parseLeaderboardCsv(csv);
    expect(players.map(({ username, rank }) => [username, rank])).toEqual([['early', 1], ['late', 2]]);
    expect(players[0].lastScoringPR).toBe('2026-10-02');
    expect(players[1].certificate).toBe(true);
  });
});
