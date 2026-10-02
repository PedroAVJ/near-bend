// Decoding is a trusted IO boundary, not a Bend type/proof guarantee.
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const exact = (v, keys) =>
  v &&
  typeof v === "object" &&
  !Array.isArray(v) &&
  Object.keys(v).sort().join(",") === keys.sort().join(",");
export function rows(xs, max = 1000) {
  const out = [];
  while (exact(xs, ["$", "head", "tail"]) && xs.$ === "Con") {
    if (out.length >= max) throw new Error("List limit exceeded");
    out.push(xs.head);
    xs = xs.tail;
  }
  if (!exact(xs, ["$"]) || xs.$ !== "Nil")
    throw new Error("Invalid typed list");
  return out;
}
