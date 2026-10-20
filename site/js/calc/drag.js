// Zero-lift drag coefficient build-up — C. P. Hoult, "Drag Coefficient (rev. 3.4)" (RS&T memo, 08 April 2016);
// workbook DRAG_COEFFICIENT3.4.xls (single fin set). Native English units: inches for geometry, ft for lengths in
// Reynolds numbers, °R, lb/ft². Coefficients are referenced to the body cross-section Sref = πd²/4.

const LOG10 = Math.log10;

/** Stagnation-pressure coefficient (workbook VBA function CPT): isentropic below M = 1, Rayleigh pitot above. */
export function cpt(gamma, M) {
  const prat = M <= 1
    ? (1 + ((gamma - 1) * M * M) / 2) ** (gamma / (gamma - 1))
    : (((gamma + 1) * M * M) / 2) ** (gamma / (gamma - 1)) * ((gamma + 1) / (2 * gamma * M * M - gamma + 1)) ** (1 / (gamma - 1));
  return ((prat - 1) * 2) / (gamma * M * M);
}

/** ρa/μ per foot from pressure (lb/ft²) and temperature (°R), memo eq. (1b). */
export const rhoAOverMu = (p, T) => 8816603 * p * T ** -1.26;

/** Turbulent flat-plate skin friction (memo eq. 3b) with the compressibility factor of eq. (9). */
const cfTurb = (Re, M) => (0.427 * (1 + 0.15 * M * M) ** -0.58) / (LOG10(Re) - 0.407) ** 2.64;

/** Wetted area of a tangent ogive (or cone) nose of length Ln, base radius Rn — workbook J22. */
export function noseWettedArea(Ln, Rn, ogive) {
  if (ogive) return Math.PI * ((Ln * Ln + Rn * Rn) / Rn) * (((Rn * Rn - Ln * Ln) * Math.asin((2 * Rn * Ln) / (Ln * Ln + Rn * Rn))) / (2 * Rn) + Ln);
  return Math.PI * Rn * (Rn + Math.sqrt(Rn * Rn + Ln * Ln));   // workbook cone branch (includes the base disc)
}

/** Piece-wise linear interpolation of the wetted-area curve [[station, S]...] at station x (inches). */
function interpArea(curve, x) {
  if (x <= curve[0][0]) return curve[0][1];
  for (let i = 1; i < curve.length; i++) {
    if (x <= curve[i][0]) {
      const [x0, s0] = curve[i - 1], [x1, s1] = curve[i];
      return s0 + ((s1 - s0) * (x - x0)) / (x1 - x0);
    }
  }
  return curve[curve.length - 1][1];
}

/**
 * @param {object} p  see the calculator definition for meanings; geometry in inches.
 * @param {{compat?: boolean}} opts compat=true reproduces DRAG_COEFFICIENT3.4.xls exactly.
 */
export function drag(p, { compat = false } = {}) {
  const gamma = 1.4, M = p.M;
  // --- body geometry & atmosphere
  const Ln = p.noseLength, Rb = p.bodyRadius, Lb = p.bodyLength;
  const Snose = noseWettedArea(Ln, Rb, p.ogive);
  const Swet = 2 * Math.PI * Rb * (Lb - Ln) + Snose;            // J23
  const curve = [[0, 0], [Ln, Snose], [Lb, Swet]];
  const d = 2 * Rb;                                              // L4
  const Sref = (Math.PI * (d / 12) ** 2) / 4;                    // O4, ft²
  const E = rhoAOverMu(p.p, p.T);                                // E4, 1/ft
  const Lft = Lb / 12;
  // --- body skin friction
  const xNat = p.ReTbody / (E * M);                              // Q4, ft
  const xTr = xNat > p.trip ? p.trip : xNat;                     // S4
  const Slam = Math.min(interpArea(curve, 12 * xTr), Swet);      // T4, in²
  const lamFrac = Slam / Swet;
  const CfBody = (1.328 * lamFrac) / Math.sqrt(E * M * xTr) + (0.427 * (1 - lamFrac) * (1 + 0.15 * M * M) ** -0.58) / (LOG10(E * M * Lft) - 0.407) ** 2.64;  // U4
  const comp = 1 - 0.09 * M * M;                                 // workbook factor
  const CDfBody = (CfBody * (Swet / 144) * comp) / Sref;        // W4
  // --- fins
  const { N, cR, cT, b, t } = p;
  const finWet = (cR + cT) * b;                                  // K8: both sides of one panel, in²
  const cAvg = (cR + cT) / 24;                                   // N8, ft
  const ReC = E * cAvg * M;                                      // O8
  const xFin = p.ReTfin / (E * M);                               // Q8, ft
  let CfFin;
  if (xFin > cAvg) CfFin = 1.328 / Math.sqrt(ReC);
  else {
    const lam = compat ? 1.328 / Math.sqrt(p.ReTfin) : ((xFin / cAvg) * 1.328) / Math.sqrt(p.ReTfin);
    CfFin = lam + cfTurb(ReC, M) - (xFin / cAvg) * cfTurb(p.ReTfin, M);
  }                                                              // U8
  const CDfFin = (N * (finWet / 144) * CfFin * comp) / Sref;    // V8
  const CDf = CDfBody + CDfFin;                                  // W8
  // fin trailing edge / wedge base area and fin base drag
  const sweep = Math.atan((cR - cT) / b);                        // AE8 (trailing edge unswept)
  const wedgeBase = (compat ? p.Nfins2 ?? N : N) * (Math.PI / 360) * b * Math.abs(p.wedge) * (cR + cT) * Math.cos(sweep);  // Y8
  const teBluntEff = p.wedge !== 0 && !p.bluntTE ? true : p.bluntTE;   // AC8
  const CDbFin = teBluntEff ? (0.135 * N * (t * b + wedgeBase)) / (144 * Sref * CfFin ** (1 / 3)) : 0;   // AD8
  // fin leading-edge pressure drag (Newtonian, hemicylindrical LE)
  const CptLE = cpt(gamma, M * Math.cos(sweep));                 // AF8
  const newton = (2 * N * t * b * CptLE * Math.cos(sweep) ** 2) / (3 * 144 * Sref);
  let CDle;
  if (compat) CDle = p.bluntLE && p.bluntTE ? newton : M * Math.cos(sweep) > 1 ? newton : 0;     // AG8
  else CDle = !p.bluntLE ? 0 : p.bluntTE ? newton : M * Math.cos(sweep) > 1 ? newton : 0;       // memo truth table
  // --- lugs
  const Cpt0 = cpt(gamma, M);                                    // J16
  const CDlug = (0.8 * p.lugArea * Cpt0) / (144 * Sref);         // L16 (one lug)
  const nLugs = compat ? 2 : p.nLugs;
  // --- body base drag
  const Sex = (Math.PI * p.nozzleD ** 2) / (4 * 144);            // P16, ft²
  const CPBsub = 0.029 / Math.sqrt((CfBody * (Swet / 144)) / Sref);   // Q16
  const CPBtr = CPBsub + 0.055;                                  // R16
  const Mlim = Math.sqrt(1.3 / (gamma * CPBtr));                 // U16
  const Sbase = (Math.PI * (d / 12) ** 2) / 4;
  const CDbOff = (M < 1 ? CPBsub : M < Mlim ? CPBtr : 1.3 / (gamma * M * M)) * (Sbase / Sref);  // V16
  const CDbOn = (compat ? 1 : 1.5) * (1 - Sex / Sref) * CDbOff;  // V20 (memo eq. 14 has the factor 1.5)
  // --- flat-faced nose
  const Aface = (Math.PI * p.flatD ** 2) / (4 * 144);
  const CDflat = !p.flatNose ? 0 : M > 1 ? (Aface * Cpt0) / Sref
    : (Aface * 0.85 * (compat ? 1 + 0.25 * M * M + M ** 4 : 1 + 0.25 * (M * M + M ** 4))) / Sref;   // P21 / R21
  // --- totals
  const CDpress = p.noseWave + CDle + p.finWave + CDflat;        // AI8
  const extraFlat = compat ? CDflat : 0;                         // workbook adds R21 a second time
  const CDoff = CDf + (CDbOff + CDbFin) + CDpress + nLugs * CDlug + extraFlat;   // AK8
  const CDon = CDf + (CDbOn + CDbFin) + CDpress + nLugs * CDlug + extraFlat;     // AK4
  const par = 1 + p.parasite / 100;
  return {
    Snose, Swet, Sref, d, E, xNat, xTr, Slam, lamFrac, CfBody, CDfBody,
    finWet, cAvg, ReC, xFin, CfFin, CDfFin, CDf, sweep, wedgeBase, CDbFin, CptLE, CDle,
    Cpt0, CDlug, CDlugs: nLugs * CDlug, Sex, CPBsub, CPBtr, Mlim, CDbOff, CDbOn, CDflat, CDpress,
    CDoff, CDon, CDpowerDiff: CDoff - CDon, CDoffPar: CDoff * par, CDonPar: CDon * par, curve,
    ReBody: E * M * Lft,
  };
}
