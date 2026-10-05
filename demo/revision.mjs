/** Prevent an old model response from becoming the current speech direction. */
export function createRevisionGate() {
  let revision = 0;
  let current = null;
  return {
    invalidate() { revision++; current = null; return revision; },
    ticket() { return revision; },
    accept(ticket, result) { if (ticket !== revision) return false; current = result; return true; },
    value() { return current; },
  };
}
