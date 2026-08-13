import React, { useEffect, useState } from "react";

const COUNTDOWN_SECONDS = 3;
const AUTO_RESET_SECONDS = 5 * 60;
const AUTO_RESET_NOTICE_MS = 1500;

export function BrewStopwatch() {
  const [status, setStatus] = useState("idle");
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (status !== "countdown") return undefined;

    const timerId = window.setTimeout(() => {
      setCountdown((current) => {
        if (current <= 1) {
          setStatus("running");
          setElapsedSeconds(0);
          return COUNTDOWN_SECONDS;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearTimeout(timerId);
  }, [status, countdown]);

  useEffect(() => {
    if (status !== "running") return undefined;

    const timerId = window.setInterval(() => {
      setElapsedSeconds((current) => {
        const next = current + 1;
        if (next >= AUTO_RESET_SECONDS) {
          setStatus("auto-reset");
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [status]);

  useEffect(() => {
    if (status !== "auto-reset") return undefined;

    const timerId = window.setTimeout(() => {
      setStatus("idle");
    }, AUTO_RESET_NOTICE_MS);

    return () => window.clearTimeout(timerId);
  }, [status]);

  function start() {
    setElapsedSeconds(0);
    setCountdown(COUNTDOWN_SECONDS);
    setStatus("countdown");
  }

  function reset() {
    setElapsedSeconds(0);
    setCountdown(COUNTDOWN_SECONDS);
    setStatus("idle");
  }

  const displayTime = status === "countdown" ? String(countdown) : formatElapsedTime(elapsedSeconds);
  const statusLabel = getStatusLabel(status);

  return (
    <section className="panel brew-stopwatch-panel" aria-labelledby="brewStopwatchTitle">
      <div className="brew-stopwatch-copy">
        <p className="eyebrow">Timer</p>
        <h2 id="brewStopwatchTitle">抽出ストップウォッチ</h2>
        <p aria-live="polite">{statusLabel}</p>
      </div>
      <div className="brew-stopwatch-readout" aria-live="polite">
        {displayTime}
      </div>
      <div className="brew-stopwatch-actions">
        <button className="primary-button" type="button" disabled={status === "countdown" || status === "running"} onClick={start}>
          Start
        </button>
        <button className="ghost-button" type="button" disabled={status === "idle"} onClick={reset}>
          Reset
        </button>
      </div>
    </section>
  );
}

function formatElapsedTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getStatusLabel(status) {
  if (status === "countdown") return "3秒後に計測を開始します。";
  if (status === "running") return "計測中";
  if (status === "auto-reset") return "5分経過したためリセットしました。";
  return "抽出開始時に Start を押してください。";
}
