const normalizeToSeconds = (ts) => {
  return ts > 1e12 ? ts / 1000 : ts;
};

function calculateMaxRollingSpeed(points, windowSize = 5, maxTimeSpan = 10) {
  if (!points || points.length < windowSize) return 0;

  let maxAvgMps = 0;

  for (let i = 0; i <= points.length - windowSize; i++) {

    const window = points.slice(i, i + windowSize);

    const startTime = normalizeToSeconds(window[0].ts);
    const endTime = normalizeToSeconds(window[window.length - 1].ts);

    const timeSpan = endTime - startTime;

    // Skip if points too far apart (missed uploads)
    if (timeSpan > maxTimeSpan) continue;

    const avgMps =
      window.reduce((sum, p) => sum + (p.speed ?? 0), 0) / window.length;

    if (avgMps > maxAvgMps) {
      maxAvgMps = avgMps;
    }
  }

  // convert to MPH
  return maxAvgMps * 2.23694;
}

module.exports = { calculateMaxRollingSpeed };