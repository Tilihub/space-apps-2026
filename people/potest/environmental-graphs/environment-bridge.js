"use strict";

function createEnvironmentBridge(getContext) {
  const sessionId = Array.from(crypto.getRandomValues(new Uint32Array(4)), part => part.toString(16).padStart(8, "0")).join("");
  const subscribers = new Set();
  const emitted = new Set();
  let run = 0;

  function clock(dataset, replayStart, time, cycle, missionOrigin = null) {
    const sourceTime = dataset.timeMode === "utc" ? new Date(time * 1000).toISOString() : time;
    const replayElapsedSeconds = dataset.timeMode === "sol" ? null : time - replayStart;
    return {
      sourceTime, sourceTimeMode: dataset.timeMode, replayElapsedSeconds, cycle,
      missionElapsedSeconds: missionOrigin !== null && replayElapsedSeconds !== null
        ? missionOrigin + replayElapsedSeconds : null,
    };
  }

  function provenance(dataset) {
    return {
      version: 1,
      dataset: dataset.id,
      source: dataset.source,
      sourceUrl: dataset.url || null,
      dataType: dataset.id === "alert-exercise" ? "synthetic" : "historical",
      replayId: `${sessionId}:${run}`,
      thresholds: "illustrative",
    };
  }

  function metricKey(metadata, cycle, metric) {
    return `${metadata.replayId}:${cycle}:${metric}`;
  }

  function getSnapshot({sourceTimestamp, missionElapsedSecondsAtReplayStart = null} = {}) {
    const {dataset, time: currentTime, replayStart, cycle, readingsAt} = getContext();
    if (missionElapsedSecondsAtReplayStart !== null && !Number.isFinite(missionElapsedSecondsAtReplayStart)) {
      throw new TypeError("Mission time at replay start must be a finite number of seconds.");
    }
    const time = sourceTimestamp ?? currentTime;
    if (!Number.isFinite(time) || time < replayStart || time > currentTime) {
      throw new RangeError("Snapshot time must be within the current replay, in source units.");
    }
    const mapTime = at => clock(dataset, replayStart, at, cycle, missionElapsedSecondsAtReplayStart);
    const at = mapTime(time);
    const metadata = provenance(dataset);
    return {
      ...metadata,
      timestamp: at.sourceTime,
      time: at,
      readings: readingsAt(time).map(({metric, observation, available, state}) => ({
        metric: metric.id,
        value: available ? observation[1] : null,
        unit: metric.unit,
        timestamp: observation ? mapTime(observation[0]).sourceTime : null,
        availability: available ? "available" : (observation ? "stale" : "missing"),
        state: available ? levels[state.level].toLowerCase() : "no-recent-reading",
        direction: available ? state.direction || null : null,
        pendingState: available && state.pending ? levels[state.pending.level].toLowerCase() : null,
        lastConfirmedState: state ? levels[state.level].toLowerCase() : null,
        alertId: state?.activeSince != null && cycle !== null
          ? `${metricKey(metadata, cycle, metric.id)}:${state.activeSince}` : null,
        recoveryUnverified: Boolean(state?.level && (!available || state.recoveryUnverified)),
      })),
    };
  }

  function notify(event) {
    for (const listener of subscribers) {
      try {
        listener(event);
      } catch (error) {
        console.error("Environment event subscriber failed", error);
      }
    }
  }

  function beginCycle(reason) {
    if (reason === "dataset-changed") run++;
    emitted.clear();
    const {dataset, time, replayStart, cycle} = getContext();
    const metadata = provenance(dataset);
    notify({...metadata, id: `${metadata.replayId}:${cycle}:reset`,
      kind: "replay-reset", reason, time: clock(dataset, replayStart, time, cycle)});
  }

  function publish(transitions) {
    const {dataset, replayStart, cycle} = getContext();
    const metadata = provenance(dataset);
    for (const transition of transitions) {
      const {kind, time, metric, level, direction, activeSince, value, lastSampleTime, limit} = transition;
      const key = metricKey(metadata, cycle, metric);
      const id = `${key}:${time}:${kind}`;
      if (emitted.has(id)) continue;
      emitted.add(id);
      notify({
        ...metadata, id, kind, metric, unit: limit.unit, value: value ?? null,
        level: kind === "gap" ? null : levels[level].toLowerCase(),
        lastConfirmedState: levels[level].toLowerCase(),
        direction: direction || null,
        time: clock(dataset, replayStart, time, cycle),
        lastSampleTime: lastSampleTime === undefined ? null : clock(dataset, replayStart, lastSampleTime, cycle).sourceTime,
        alertId: activeSince === null ? null : `${key}:${activeSince}`,
        recoveryUnverified: transition.recoveryUnverified,
      });
    }
  }

  function subscribe(listener) {
    if (typeof listener !== "function") throw new TypeError("Expected an environment event listener.");
    subscribers.add(listener);
    return () => subscribers.delete(listener);
  }

  return {getSnapshot, subscribe, beginCycle, publish};
}
