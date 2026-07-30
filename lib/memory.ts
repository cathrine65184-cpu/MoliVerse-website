export type SharedMemory = {
  journeyId: string;
  journeyTitle: string;
  mentorName: string;
  phrase: string;
  createdAt: string;
};

function key(journeyId: string) {
  return `moliverse-memory-${journeyId}`;
}

export function saveSharedMemory(memory: SharedMemory) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key(memory.journeyId), JSON.stringify(memory));
}

export function loadSharedMemory(journeyId: string): SharedMemory | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key(journeyId));
    return raw ? (JSON.parse(raw) as SharedMemory) : null;
  } catch {
    return null;
  }
}
