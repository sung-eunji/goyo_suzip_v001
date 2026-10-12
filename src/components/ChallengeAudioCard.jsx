import { useEffect, useRef, useState } from 'react';
import * as store from '../lib/store';

const PREVIEW_MODE =
  import.meta.env.DEV &&
  new URLSearchParams(window.location.search).get('challengePreview') === '1';

function addDays(dateKey, count) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}

function dayNumber(startDate, dateKey) {
  return (
    Math.floor(
      (Date.parse(`${dateKey}T00:00:00Z`) -
        Date.parse(`${startDate}T00:00:00Z`)) /
        86400000,
    ) + 1
  );
}

function timeLabel(seconds) {
  const safeSeconds = Math.max(0, Math.floor(seconds || 0));
  return `${Math.floor(safeSeconds / 60)}:${String(safeSeconds % 60).padStart(2, '0')}`;
}

function koreanDate(dateKey, includeWeekday = false) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  const label = `${date.getUTCMonth() + 1}월 ${date.getUTCDate()}일`;
  if (!includeWeekday) return label;
  return `${label}(${['일', '월', '화', '수', '목', '금', '토'][date.getUTCDay()]})`;
}

function requestId() {
  return globalThis.crypto.randomUUID();
}

function updateMediaPosition(media) {
  const session = navigator.mediaSession;
  if (
    !session?.setPositionState ||
    !Number.isFinite(media.duration) ||
    media.duration <= 0
  )
    return;
  try {
    session.setPositionState({
      duration: media.duration,
      playbackRate: media.playbackRate || 1,
      position: Math.min(media.currentTime, media.duration),
    });
  } catch {}
}

export default function ChallengeAudioCard({ dateKey, onChallengeWindow }) {
  const selectedDate = dateKey;
  const [guide, setGuide] = useState(null);
  const [signedUrl, setSignedUrl] = useState('');
  const [fileReady, setFileReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [message, setMessage] = useState('');
  const audioRef = useRef(null);
  const lastMediaPosition = useRef(0);
  const lastTickAt = useRef(0);
  const pendingSeconds = useRef(0);
  const fractionalSeconds = useRef(0);
  const sessionListenedSeconds = useRef(0);
  const playingRef = useRef(false);
  const currentGuide = useRef(null);
  const flushRef = useRef(() => {});
  currentGuide.current = guide;

  useEffect(() => {
    let cancelled = false;
    pendingSeconds.current = 0;
    fractionalSeconds.current = 0;
    sessionListenedSeconds.current = 0;
    setGuide(null);
    setSignedUrl('');
    setFileReady(false);
    setDuration(0);
    setPosition(0);
    setPlaying(false);
    setMessage('');
    if (PREVIEW_MODE) {
      onChallengeWindow(null);
      setGuide({
        start_date: '2026-10-13',
        duration_days: 14,
        record_end_date: '2026-10-27',
        server_date: '2026-10-13',
        current_day: 1,
        selectedDay: 1,
        selectedAudio: {
          audio_id: null,
          day_number: 1,
          audio_title: '숨이 들어오는 자리',
          body_part: 'TODO',
          duration_sec: 92,
          last_position_sec: 0,
          listened_seconds: 0,
          completed: false,
          storage_path: 'preview/day1.mp3',
        },
      });
      return () => {
        audioRef.current?.pause();
        flushRef.current('pause');
      };
    }
    store
      .getMyChallengeAudios()
      .then(async (rows) => {
        if (cancelled) return;
        if (!rows.length) {
          onChallengeWindow(null);
          return;
        }
        const details = rows[0];
        onChallengeWindow(
          details.is_participant && !details.viewer_is_admin
            ? {
                startDate: details.start_date,
                endDate: details.record_end_date,
                serverDate: details.server_date,
              }
            : null,
        );
        const requestedDay = dayNumber(details.start_date, selectedDate);
        const selectedDay = details.viewer_is_admin
          ? Math.max(1, Math.min(details.duration_days, requestedDay))
          : requestedDay;
        const selectedAudio = rows.find(
          (row) => row.day_number === selectedDay,
        );
        const recordEndDate =
          details.record_end_date ||
          addDays(details.start_date, details.duration_days - 1);
        setGuide({ ...details, selectedDay, selectedAudio });
        if (
          selectedDate >= details.start_date &&
          (details.viewer_is_admin ||
            (selectedDate <= recordEndDate &&
              selectedDate <= details.server_date)) &&
          selectedAudio?.storage_path
        ) {
          try {
            const url = await store.createChallengeAudioUrl(
              selectedAudio.storage_path,
            );
            if (!cancelled) {
              setSignedUrl(url);
              setFileReady(true);
            }
          } catch (error) {
            if (!cancelled) {
              setFileReady(false);
              setMessage(error.message || '오디오 파일 경로를 확인해주세요.');
            }
          }
        }
      })
      .catch(() => {
        if (!cancelled) onChallengeWindow(null);
      });
    return () => {
      cancelled = true;
      audioRef.current?.pause();
      flushRef.current('pause');
    };
  }, [selectedDate, onChallengeWindow]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flush('pause');
    };
    const onPageHide = () => flush('pause');
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [guide]);

  useEffect(() => {
    const session = navigator.mediaSession;
    const audio = guide?.selectedAudio;
    if (!session || !fileReady || !audio?.audio_id) return undefined;

    if (window.MediaMetadata) {
      session.metadata = new window.MediaMetadata({
        title: audio.audio_title,
        artist: '고요수집',
        album: `Day ${guide.selectedDay} · 2주 챌린지`,
      });
    }
    session.playbackState = audioRef.current?.paused ? 'paused' : 'playing';

    const actions = {
      play: () => audioRef.current?.play().catch(() => {}),
      pause: () => audioRef.current?.pause(),
      stop: () => {
        if (!audioRef.current) return;
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setPosition(0);
      },
      seekbackward: ({ seekOffset = 10 } = {}) => {
        if (audioRef.current)
          audioRef.current.currentTime = Math.max(
            0,
            audioRef.current.currentTime - seekOffset,
          );
      },
      seekforward: ({ seekOffset = 10 } = {}) => {
        if (audioRef.current)
          audioRef.current.currentTime = Math.min(
            audioRef.current.duration || Infinity,
            audioRef.current.currentTime + seekOffset,
          );
      },
      seekto: ({ seekTime }) => {
        if (audioRef.current && Number.isFinite(seekTime))
          audioRef.current.currentTime = seekTime;
      },
    };

    Object.entries(actions).forEach(([action, handler]) => {
      try {
        session.setActionHandler(action, handler);
      } catch {}
    });

    return () => {
      Object.keys(actions).forEach((action) => {
        try {
          session.setActionHandler(action, null);
        } catch {}
      });
      session.metadata = null;
      session.playbackState = 'none';
    };
  }, [
    fileReady,
    guide?.selectedAudio?.audio_id,
    guide?.selectedAudio?.audio_title,
    guide?.selectedDay,
  ]);

  function sendEvent(eventType, seconds = 0, atPosition) {
    if (!guide?.is_participant || !guide.selectedAudio?.audio_id) return;
    sessionListenedSeconds.current += Math.max(0, Math.floor(seconds));
    const payload = {
      audioId: guide.selectedAudio.audio_id,
      eventType,
      positionSec: Math.max(
        0,
        Math.floor(atPosition ?? audioRef.current?.currentTime ?? position),
      ),
      deltaSeconds: Math.max(0, Math.floor(seconds)),
      requestId: requestId(),
    };
    store.recordChallengeAudioEvent(payload).catch(() => {
      window.setTimeout(() => {
        store.recordChallengeAudioEvent(payload).catch(() => {});
      }, 1200);
    });
  }

  function flush(eventType) {
    const totalSeconds = pendingSeconds.current + fractionalSeconds.current;
    const seconds = Math.floor(totalSeconds);
    fractionalSeconds.current = totalSeconds - seconds;
    pendingSeconds.current = 0;
    lastTickAt.current = 0;
    if (
      currentGuide.current?.selectedAudio?.audio_id &&
      (playingRef.current || seconds > 0)
    ) {
      sendEvent(eventType, seconds);
    }
  }
  flushRef.current = flush;

  useEffect(
    () => () => {
      audioRef.current?.pause();
      flushRef.current('pause');
    },
    [],
  );

  function onTimeUpdate(event) {
    const media = event.currentTarget;
    const current = media.currentTime;
    const now = performance.now();
    if (lastTickAt.current && !media.paused && !media.seeking) {
      const wallSeconds = (now - lastTickAt.current) / 1000;
      const mediaSeconds = Math.max(0, current - lastMediaPosition.current);
      pendingSeconds.current += Math.min(wallSeconds, mediaSeconds);
    }
    lastMediaPosition.current = current;
    lastTickAt.current = now;
    setPosition(current);
    updateMediaPosition(media);
  }

  function onPlay() {
    const media = audioRef.current;
    lastMediaPosition.current = media?.currentTime || 0;
    lastTickAt.current = performance.now();
    playingRef.current = true;
    setPlaying(true);
    if (navigator.mediaSession) navigator.mediaSession.playbackState = 'playing';
    setMessage('');
    sendEvent('play', 0, media?.currentTime || 0);
  }

  function onPause() {
    const totalSeconds = pendingSeconds.current + fractionalSeconds.current;
    const seconds = Math.floor(totalSeconds);
    fractionalSeconds.current = totalSeconds - seconds;
    pendingSeconds.current = 0;
    lastTickAt.current = 0;
    playingRef.current = false;
    setPlaying(false);
    if (navigator.mediaSession) navigator.mediaSession.playbackState = 'paused';
    sendEvent('pause', seconds);
  }

  function onSeeked(event) {
    const media = event.currentTarget;
    const totalSeconds = pendingSeconds.current + fractionalSeconds.current;
    const seconds = Math.floor(totalSeconds);
    fractionalSeconds.current = totalSeconds - seconds;
    pendingSeconds.current = 0;
    lastMediaPosition.current = media.currentTime;
    lastTickAt.current = media.paused ? 0 : performance.now();
    setPosition(media.currentTime);
    updateMediaPosition(media);
    sendEvent('seek', seconds, media.currentTime);
  }

  function onEnded(event) {
    const media = event.currentTarget;
    const totalSeconds = pendingSeconds.current + fractionalSeconds.current;
    const seconds = Math.floor(totalSeconds);
    fractionalSeconds.current = totalSeconds - seconds;
    pendingSeconds.current = 0;
    lastTickAt.current = 0;
    playingRef.current = false;
    const reachedCompletionThreshold =
      (guide.selectedAudio.listened_seconds || 0) +
        sessionListenedSeconds.current +
        seconds >=
      Math.ceil((guide.selectedAudio.duration_sec || media.duration) * 0.8);
    setPlaying(false);
    if (navigator.mediaSession) navigator.mediaSession.playbackState = 'paused';
    setPosition(media.duration || media.currentTime);
    sendEvent('ended', seconds, media.duration || media.currentTime);
    if (guide.is_participant) {
      setGuide((current) => ({
        ...current,
        selectedAudio: {
          ...current.selectedAudio,
          completed: reachedCompletionThreshold,
        },
      }));
    }
  }

  async function togglePlayback() {
    const media = audioRef.current;
    if (!media || !fileReady || busy) return;
    if (!media.paused) {
      media.pause();
      return;
    }
    if (
      !guide.selectedAudio.completed &&
      guide.selectedAudio.last_position_sec > 0 &&
      media.currentTime === 0
    ) {
      media.currentTime = guide.selectedAudio.last_position_sec;
    }
    setBusy(true);
    try {
      await media.play();
    } catch {
      setMessage('오디오를 재생할 수 없어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setBusy(false);
    }
  }

  function seek(event) {
    const media = audioRef.current;
    if (!media || !duration) return;
    const nextPosition = Number(event.target.value);
    media.currentTime = nextPosition;
    setPosition(nextPosition);
  }

  if (!guide) return null;

  const {
    start_date: startDate,
    duration_days: durationDays,
    record_end_date: recordEndDate,
    server_date: serverDate,
  } = guide;
  const endDate = recordEndDate || addDays(startDate, durationDays - 1);
  if (selectedDate < startDate) {
    return (
      <section
        className="card challenge-audio-card"
        aria-label="오늘의 몸 가이드"
      >
        <p className="challenge-audio-note">음원 준비 중이에요.</p>
      </section>
    );
  }
  if (
    !guide.viewer_is_admin &&
    (selectedDate < startDate || selectedDate > endDate)
  )
    return null;

  const selectedDay = guide.selectedDay;
  const audio = guide.selectedAudio;
  if (!audio && !guide.viewer_is_admin && selectedDay > durationDays)
    return null;
  const isDateUnlocked =
    guide.viewer_is_admin ||
    (selectedDate <= serverDate && selectedDay <= guide.current_day);
  const hasRecording =
    !!audio?.storage_path &&
    audio.audio_title !== 'TODO' &&
    !/^goyo-stillness-2week-20261013\/day\d+\.mp3$/i.test(audio.storage_path);
  const resumeAt = audio?.last_position_sec || 0;
  const audioTitle = audio?.audio_title || 'TODO';

  return (
    <section
      className="card challenge-audio-card"
      aria-label="오늘의 몸 가이드"
    >
      {!isDateUnlocked ? (
        <div className="challenge-audio-locked">
          <span className="challenge-audio-lock" aria-hidden="true">
            &#128274;
          </span>
          <div>
            <div className="challenge-audio-heading">
              Day {selectedDay} · 오늘의 몸 가이드
            </div>
            <p className="challenge-audio-note">
              {Number(selectedDate.slice(8, 10))}일이 되면 들을 수 있어요.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="challenge-audio-heading">
            Day {selectedDay} · 오늘의 몸 가이드
            {audio?.completed && (
              <span className="challenge-audio-complete">
                끝까지 들었어요 ✓
              </span>
            )}
          </div>
          {(audioTitle !== 'TODO' ||
            (audio?.body_part && audio.body_part !== 'TODO') ||
            audio?.description) && (
            <div className="challenge-audio-meta">
              {audioTitle !== 'TODO' && <strong>{audioTitle}</strong>}
              {audio?.body_part && audio.body_part !== 'TODO' && (
                <span>{audio.body_part}</span>
              )}
              {audio?.description && <p>{audio.description}</p>}
            </div>
          )}
          {hasRecording ? (
            <div className="audio-player">
              {fileReady && (
                <audio
                  ref={audioRef}
                  src={signedUrl}
                  preload="metadata"
                  onLoadedMetadata={(event) => {
                    const mediaDuration = Number.isFinite(
                      event.currentTarget.duration,
                    )
                      ? event.currentTarget.duration
                      : audio?.duration_sec || 0;
                    setDuration(mediaDuration);
                    updateMediaPosition(event.currentTarget);
                    if (resumeAt > 0) setPosition(resumeAt);
                  }}
                  onTimeUpdate={onTimeUpdate}
                  onPlay={onPlay}
                  onPause={onPause}
                  onSeeked={onSeeked}
                  onEnded={onEnded}
                  onError={() =>
                    setMessage(
                      '오디오 파일을 불러오지 못했어요. 잠시 후 다시 시도해주세요.',
                    )
                  }
                />
              )}
              <button
                className="audio-play-button"
                type="button"
                onClick={togglePlayback}
                disabled={busy || !fileReady}
                aria-label={playing ? '일시정지' : '재생'}
              >
                {busy ? '…' : playing ? 'Ⅱ' : '▶'}
              </button>
              <div className="audio-player-main">
                {resumeAt > 0 && !audio?.completed && position === 0 && (
                  <span className="audio-resume">
                    이어 듣기 {timeLabel(resumeAt)}
                  </span>
                )}
                <input
                  className="audio-seek"
                  type="range"
                  min="0"
                  max={duration || 1}
                  step="0.1"
                  value={Math.min(position, duration || 0)}
                  onChange={seek}
                  disabled={!fileReady || !duration}
                  aria-label="오디오 재생 위치"
                />
                <div className="audio-time">
                  <span>{timeLabel(position)}</span>
                  <span>{timeLabel(duration)}</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="challenge-audio-note" role="status">
              음원 준비 중이에요.
            </p>
          )}
          {hasRecording && !fileReady && (
            <p className="challenge-audio-note" role="status">
              {message || '오디오 파일을 불러오는 중이에요.'}
            </p>
          )}
          {message && fileReady && (
            <p className="challenge-audio-error" role="status">
              {message}
            </p>
          )}
        </>
      )}
    </section>
  );
}
