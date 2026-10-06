'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { parseLeaderboardCsv, type ScoreboardPlayer } from '@/lib/leaderboard-csv';
import styles from './LeaderboardExperience.module.css';

type SheetState = { players: ScoreboardPlayer[]; syncedAt: Date } | null;

export default function LeaderboardExperience() {
  const scene = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const [sheet, setSheet] = useState<SheetState>(null);
  const [error, setError] = useState('');
  const { scrollYProgress } = useScroll({ target: scene, offset: ['start start', 'end end'] });
  const cardScale = useTransform(scrollYProgress, [0, 0.2, 0.4, 0.6, 0.8, 1], [0.16, 0.48, 0.9, 1.45, 3.8, 7.5]);
  const cardRotate = useTransform(scrollYProgress, [0, 0.45, 0.78, 1], [-12, -2, 8, 16]);
  const cardOpacity = useTransform(scrollYProgress, [0, 0.08, 0.72, 0.83, 1], [0, 1, 1, 0, 0]);
  const revealOpacity = useTransform(scrollYProgress, [0, 0.83, 0.93, 1], [0, 0, 1, 1]);
  const revealY = useTransform(scrollYProgress, [0.83, 0.95], [28, 0]);

  useEffect(() => {
    let controller: AbortController | undefined;
    const refresh = async () => {
      controller?.abort();
      const requestController = new AbortController();
      controller = requestController;
      try {
        const response = await fetch('/api/leaderboard', { signal: requestController.signal });
        if (!response.ok) throw new Error('The published Google Sheet could not be reached.');
        const csv = await response.text();
        setSheet({ players: parseLeaderboardCsv(csv), syncedAt: new Date() });
        setError('');
      } catch (cause: unknown) {
        if (!requestController.signal.aborted) setError(cause instanceof Error ? cause.message : 'Could not load the published scoreboard.');
      }
    };
    void refresh();
    const timer = window.setInterval(refresh, 5 * 60 * 1000);
    return () => { window.clearInterval(timer); controller?.abort(); };
  }, []);

  const skipCard = reduceMotion ?? false;

  return (
    <main className={styles.page}>
      <section className={styles.scene} ref={scene} aria-labelledby="scoreboard-title">
        <div className={styles.sticky}>
          <div className={styles.grid} aria-hidden="true" />
          <div className={styles.lasers} aria-hidden="true" />
          <motion.div
            className={styles.card}
            style={{
              scale: skipCard ? 0.8 : cardScale,
              rotate: skipCard ? 0 : cardRotate,
              opacity: skipCard ? 0 : cardOpacity,
            }}
            aria-hidden="true"
          >
            <span className={styles.corner}>♠<small>A</small></span>
            <span className={styles.cardIndex}>S · S</span>
            <span className={styles.centerSuit}>♠</span>
            <span className={styles.cardTitle}>SOURCE<br />START <small>2026</small></span>
            <span className={`${styles.corner} ${styles.cornerBottom}`}>♠<small>A</small></span>
          </motion.div>
          <motion.div
            className={styles.reveal}
            style={{ opacity: skipCard ? 1 : revealOpacity, y: skipCard ? 0 : revealY }}
          >
            <p className={styles.eyebrow}>GAME // RANKINGS</p>
            <h1 id="scoreboard-title">THE PLAYERS<br />ARE BEING RANKED</h1>
            <p className={styles.subtitle}>Every cleared game leaves its mark.</p>
          </motion.div>
          <div className={styles.vignette} aria-hidden="true" />
        </div>
        <a className={styles.back} href="/">← SOURCE START</a>
        {!skipCard && <span className={styles.scrollCue}><i /> SCROLL TO ENTER</span>}
      </section>

      <section className={styles.results} aria-labelledby="rankings-title">
        <div className={styles.resultsInner}>
          <header className={styles.resultsHead}>
            <div>
              <p className={styles.eyebrow}>♠ &nbsp; ♦ &nbsp; ♣ &nbsp; ♥ &nbsp; THE BORDERLAND</p>
              <h2 id="rankings-title">RANKINGS<span>.</span></h2>
              <p className={styles.resultsSub}>The Scoreboard <b>·</b> Source Start 2026</p>
            </div>
            <div className={styles.update} aria-live="polite">
              <span className={styles.liveDot} />
              {sheet ? `SHEET SYNCED ${sheet.syncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'SYNCING PUBLISHED SHEET'}
            </div>
          </header>

          {error && !sheet ? (
            <div className={styles.empty} role="alert">
              <p className={styles.eyebrow}>THE DEAL HAS BEEN INTERRUPTED</p>
              <h3>Could not load the rankings.</h3>
              <p className={styles.emptyCopy}>{error}</p>
            </div>
          ) : !sheet ? (
            <div className={styles.empty} aria-live="polite">
              <div className={styles.emptyCard} aria-hidden="true"><span>♦</span><i /><span>♦</span></div>
              <p className={styles.eyebrow}>THE DECK IS BEING DEALT</p>
              <h3>Loading the player rankings…</h3>
            </div>
          ) : sheet.players.length === 0 ? (
            <div className={styles.empty}>
              <p className={styles.eyebrow}>NO SCORES HAVE BEEN DEALT</p>
              <h3>The next game is about to begin.</h3>
            </div>
          ) : (
            <>
              <p className={styles.lastUpdated}>LAST UPDATED <time dateTime={sheet.syncedAt.toISOString()}>{sheet.syncedAt.toLocaleString()}</time></p>
              {error && <p className={styles.refreshError} role="status">Could not refresh; showing the last loaded sheet data.</p>}
              <ol className={styles.players}>
                {sheet.players.map((player) => (
                  <motion.li
                    key={player.username.toLowerCase()}
                    className={`${styles.player} ${player.rank <= 3 ? styles[`rank${player.rank}`] : ''}`}
                    initial={skipCard ? false : { opacity: 0, y: 28 }}
                    whileInView={skipCard ? undefined : { opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.15 }}
                    transition={{ duration: 0.45, ease: 'easeOut' }}
                  >
                    <article className={styles.playerCard}>
                      <header className={styles.playerCardHead}>
                        <span className={styles.playerSuit} aria-hidden="true">♠</span>
                        <span className={styles.rank} aria-label={`Rank ${player.rank}`}>#{String(player.rank).padStart(2, '0')}</span>
                      </header>
                      <div className={styles.playerMain}>
                        <img className={styles.avatar} src={`https://github.com/${encodeURIComponent(player.username)}.png?size=112`} alt="" loading="lazy" />
                        <h3>{player.name}</h3>
                        <a href={`https://github.com/${encodeURIComponent(player.username)}`} target="_blank" rel="noreferrer">@{player.username}</a>
                      </div>
                      <div className={styles.score}>
                        <strong>{player.points}</strong><span>POINTS</span>
                      </div>
                      <dl className={styles.playerDetails}>
                        <div><dt>Cleared games</dt><dd>{player.mergedPRs} merged PRs</dd></div>
                        <div><dt>Year / Branch</dt><dd>{player.branch || 'Not listed'}</dd></div>
                        <div><dt>Last scoring PR</dt><dd>{player.lastScoringPR || 'No scoring PR yet'}</dd></div>
                        <div><dt>Certificate</dt><dd>{player.certificate ? 'Yes · earned' : 'No'}</dd></div>
                      </dl>
                      <span className={`${styles.corner} ${styles.playerCorner}`}>♠<small>A</small></span>
                    </article>
                  </motion.li>
                ))}
              </ol>
            </>
          )}

          <footer className={styles.footer}>
            <span>PLAY FAIR. CLEAR GAMES.</span>
            <a href="/">RETURN TO THE PLAYERS ↗</a>
          </footer>
        </div>
      </section>
    </main>
  );
}
