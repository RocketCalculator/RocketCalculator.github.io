// Ground handling loads — C. P. Hoult, "Ground Handling Loads" (RS&T, 2014), and the UNBUTTON field tool.
// Transport: the rocket carried at x_F and x_A; statics give the support forces, and a phantom cut at a joint x_J
// carries shear and bending moment, multiplied by a load factor N for bouncing on the road.
// Rail loading: a crew member lifts the nose at x_F while the aft button at x_L rides in the rail slot; once the
// nozzle exit x_A touches the rail, more lift tries to pull the button out (eq. 6). Stations from the nose tip.

/** Support forces for weight W at x_CG carried at x_F and x_A (memo eq. 2). */
export const supports = (W, xCG, xF, xA) => ({ FF: (W * (xA - xCG)) / (xA - xF), FA: (W * (xCG - xF)) / (xA - xF) });

/** Weight and centre of gravity of items [{ w, x }]. */
export function massProps(items) {
  const W = items.reduce((a, i) => a + i.w, 0);
  return { W, xCG: items.reduce((a, i) => a + i.w * i.x, 0) / W };
}

/**
 * Shear (positive up on the forward piece) and bending moment at a cut x_J from everything ahead of it: the forward
 * support (if ahead of the cut) and the item weights, moments taken about the cut, times the load factor N.
 */
export function cut(items, FF, xF, xJ, N = 1) {
  let V = xF < xJ ? FF : 0, M = xF < xJ ? FF * (xJ - xF) : 0;
  for (const i of items) if (i.x < xJ) { V -= i.w; M -= i.w * (xJ - i.x); }
  return { V: N * V, M: N * M };
}

/** Initial nose lift force with the aft button carrying the rest (eq. 4), and the button limit load at K times it (eq. 6). */
export const liftForce = (W, xCG, xF, xL) => (W * (xL - xCG)) / (xL - xF);
export const buttonLoad = (W, xCG, xF, xL, xA, K) =>
  (W * (K * (xL - xCG) * (xA - xF) - (xA - xCG) * (xL - xF))) / ((xL - xF) * (xA - xL));
