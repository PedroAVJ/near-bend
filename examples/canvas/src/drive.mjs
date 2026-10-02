export async function drive(op, effects) {
  while (op?.$ === "$FFI") {
    const run = effects ? effects[op.run.nearEffect] : op.run;
    if (typeof run !== "function") throw new Error("Unbound Bend IO effect");
    op = op.kont(await run(...op.args));
  }
  if (op?.$ === "Halt") throw new Error(op.message);
  if (op?.$ !== "Emit") throw new Error("Invalid Bend IO operation");
  return op.value;
}
