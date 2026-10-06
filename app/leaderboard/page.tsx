import type { Metadata } from 'next';
import LeaderboardExperience from '@/components/LeaderboardExperience';

export const metadata: Metadata = {
  title: 'The Scoreboard · Source Start',
  description: 'The Source Start 2026 player rankings.',
};

export default function LeaderboardPage() {
  return <LeaderboardExperience />;
}
