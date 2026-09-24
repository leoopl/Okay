import * as React from 'react';

const MOBILE_BREAKPOINT = 768;
const MOBILE_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(MOBILE_QUERY);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}

function getSnapshot() {
  return window.innerWidth < MOBILE_BREAKPOINT;
}

// Server and hydration render as "not mobile", matching the previous behaviour.
function getServerSnapshot() {
  return false;
}

export function useMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
