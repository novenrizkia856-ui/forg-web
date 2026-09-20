/**
 * Section reveals and the event ticker.
 *
 * Both behaviours are rebuilt from the reference page: blocks rise into
 * place when they reach the viewport, and the two event rows scroll in
 * opposite directions at a constant speed.
 */

const TICKER_SPEED = 50; /* px per second, measured off the reference */

/**
 * Reveal a block once it reaches the viewport, then stop watching it.
 * Anything already on screen at load reveals straight away.
 */
export function startReveals(root = document) {
  const targets = root.querySelectorAll("[data-forg-anim]");
  if (!targets.length) return;

  if (!("IntersectionObserver" in window)) {
    targets.forEach((el) => el.classList.add("forg-in"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("forg-in");
        observer.unobserve(entry.target);
      });
    },
    /* the reference waits until a little of the block is past the fold */
    { rootMargin: "0px 0px -12% 0px", threshold: 0.01 },
  );

  targets.forEach((el) => observer.observe(el));
}

/**
 * Continuous marquee for the event rows.
 *
 * The row is duplicated until it is wider than twice its frame, then the
 * track is shifted every frame and wrapped, so the loop has no seam.
 */
export function startTickers(root = document) {
  const tracks = root.querySelectorAll(".framer-kpi6zr > ul, .framer-1cf44ic > ul");
  if (!tracks.length) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const rows = [];

  tracks.forEach((track, index) => {
    const frame = track.parentElement.clientWidth || 1;
    const original = [...track.children];
    if (!original.length) return;

    track.classList.add("forg-ticker-track");
    track.style.width = "max-content";
    track.style.transform = "translateX(0px)";

    /* one clone set is the loop, extra sets only fill a wide frame */
    let span = track.scrollWidth;
    const copy = () => original.forEach((node) => track.appendChild(node.cloneNode(true)));
    copy();
    let guard = 0;
    while (track.scrollWidth - span < frame && guard < 8) {
      copy();
      guard += 1;
    }
    span = track.scrollWidth / (guard + 2);

    rows.push({ track, span, direction: index % 2 === 0 ? -1 : 1, offset: index % 2 === 0 ? 0 : -span });
  });

  if (!rows.length || reduced.matches) return;

  let last = performance.now();
  const step = (now) => {
    const delta = Math.min((now - last) / 1000, 0.05);
    last = now;
    rows.forEach((row) => {
      row.offset += row.direction * TICKER_SPEED * delta;
      if (row.offset <= -row.span) row.offset += row.span;
      if (row.offset >= 0) row.offset -= row.span;
      row.track.style.transform = `translateX(${row.offset.toFixed(2)}px)`;
    });
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
