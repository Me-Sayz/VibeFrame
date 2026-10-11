const busy = new Set<string>();

export function acquire(owner: string): boolean {
  if (busy.has(owner)) return false;
  busy.add(owner);
  return true;
}

export function release(owner: string): void {
  busy.delete(owner);
}
