function calculateIdleTime(points) {
  if (!points || points.length < 2) return 0;

  let idleSeconds = 0;

  const DISTANCE_THRESHOLD = 4; // meters considered "no movement"
  const MIN_IDLE_BLOCK = 5; // seconds required before counting idle
  // Check if epoch time is in milliseconds or seconds and calculate to seconds
  const normalizeToSeconds = (ts) => {
    return ts > 1e12 ? ts / 1000 : ts;
  };

  let idleBlockTime = 0;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];

    const prevTs = normalizeToSeconds(prev.ts);
    const currTs = normalizeToSeconds(curr.ts);

    const timeDiff = currTs - prevTs;

    const distance = curr.distanceFromPrev ?? 0;

    if (distance < DISTANCE_THRESHOLD) {
      idleBlockTime += timeDiff;
    } else {
      if (idleBlockTime >= MIN_IDLE_BLOCK) {
        idleSeconds += idleBlockTime;
      }
      idleBlockTime = 0;
    }
  }

  if (idleBlockTime >= MIN_IDLE_BLOCK) {
    idleSeconds += idleBlockTime;
  }

  return Math.round(idleSeconds);
}

module.exports = { calculateIdleTime };