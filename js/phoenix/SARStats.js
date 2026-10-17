/*
 * SARStats.js  -  CelCamp Phoenix (2026)
 *
 * The SAR figures of the end of an EH run, and their comparison with
 * Gandhi, Lazzi & Furse 1996 as it was made in the thesis (Fig. 6.3 and
 * 6.4, "Comparacao com Gandhi"):
 *   - 1 voxel max:        the largest SAR of one cube of tissue;
 *   - 1 g max:            the largest SAR averaged over a cube of 1 g of tissue;
 *   - 1 g brain max:      the same over 1 g of brain;
 *   - 1 voxel brain max:  the largest SAR of one cube of brain.
 * The 1 g cube (C95.1: "1 g of tissue in the shape of a cube") is the
 * smallest cube of physical side s, centred on a cube of the model, that
 * holds at least 1 g of the tissue in question; the SAR is mass-averaged
 * over that tissue only (air and the antenna are left out).
 */

/**
 * Gandhi et al. 1996 (IEEE Trans. MTT 44(10):1884-1897), the values the
 * thesis compared with, and the thesis's own ("este estudo").
 */
export const GANDHI_1996 = {
    citation: "Gandhi, Lazzi & Furse 1996, IEEE Trans. MTT 44(10):1884-1897",
    rows: [
        {
            f: 835e6, label: "835 MHz, 600 mW", power: 0.6, thesisLabel: "thesis, 900 MHz",
            gandhi: { voxel: 9.13, g1: 2.71, g1Brain: 1.54, voxelBrain: 2.6 },
            thesis: { voxel: 8.87, g1: 3.51, g1Brain: 2.05, voxelBrain: 4.485 },
        },
        {
            f: 1900e6, label: "1900 MHz, 125 mW", power: 0.125, thesisLabel: "thesis, 1.8 GHz",
            gandhi: { voxel: 1.9, g1: 0.81, g1Brain: 0.41, voxelBrain: 0.64 },
            thesis: { voxel: 1.947, g1: 0.808, g1Brain: 0.178, voxelBrain: 0.405 },
        },
    ],
    /** The row of the frequency nearest to f (900 MHz -> 835 MHz, 1.8 GHz -> 1900 MHz). */
    pick(f) {
        return this.rows.reduce((best, r) => Math.abs(Math.log(r.f / f)) < Math.abs(Math.log(best.f / f)) ? r : best);
    },
};

export const QUANTITIES = [
    ["voxel", "1 voxel max"],
    ["g1", "1 g max"],
    ["g1Brain", "1 g brain max"],
    ["voxelBrain", "1 voxel brain max"],
];

/** (ours - reference) / reference, in %, as in the thesis. */
export function percentError(ours, ref) {
    return 100 * (ours - ref) / ref;
}

/**
 * sar: SAR of every cube (x outermost, z fastest); codes: material code of
 * every cube; density: kg/m3 by code; tissue, brain: 1 for the codes that
 * count.  Returns the four maxima (W/kg), where they are, and the power
 * absorbed by the tissues (W).
 */
export function sarStatistics({ sar, codes, dims, deltas, density, tissue, brain }) {
    const [X, Y, Z] = dims;
    const dV = deltas[0] * deltas[1] * deltas[2];
    const out = { voxel: 0, voxelAt: null, voxelBrain: 0, voxelBrainAt: null, g1: 0, g1At: null, g1Brain: 0, g1BrainAt: null, absorbed: 0 };
    let q = 0;
    for (let i = 0; i < X; i++) for (let j = 0; j < Y; j++) for (let k = 0; k < Z; k++, q++) {
        const c = codes[q];
        if (!tissue[c]) continue;
        const s = sar[q];
        out.absorbed += s * density[c] * dV;
        if (s > out.voxel) { out.voxel = s; out.voxelAt = [i, j, k]; }
        if (brain[c] && s > out.voxelBrain) { out.voxelBrain = s; out.voxelBrainAt = [i, j, k]; }
    }
    const [g1, g1At] = maxOneGram(sar, codes, dims, deltas, density, tissue);
    out.g1 = g1; out.g1At = g1At;
    const [g1b, g1bAt] = maxOneGram(sar, codes, dims, deltas, density, brain);
    out.g1Brain = g1b; out.g1BrainAt = g1bAt;
    return out;
}

/** The largest SAR averaged over 1 g of the tissues in `mask` (see the header). */
function maxOneGram(sar, codes, dims, deltas, density, mask) {
    const [X, Y, Z] = dims;
    const [dx, dy, dz] = deltas;
    const dV = dx * dy * dz;
    const P = (Y + 1) * (Z + 1), R = Z + 1;
    // 3D prefix sums of the mass and of mass*SAR of the tissue in the mask
    const M = new Float64Array((X + 1) * P), Q = new Float64Array((X + 1) * P);
    let maxRho = 0, q = 0;
    for (let i = 0; i < X; i++) for (let j = 0; j < Y; j++) for (let k = 0; k < Z; k++, q++) {
        const c = codes[q];
        const m = mask[c] ? density[c] * dV : 0;
        if (m > 0 && density[c] > maxRho) maxRho = density[c];
        const p = (i + 1) * P + (j + 1) * R + (k + 1);
        M[p] = m + M[p - P] + M[p - R] + M[p - 1] - M[p - P - R] - M[p - P - 1] - M[p - R - 1] + M[p - P - R - 1];
        const v = m * sar[q];
        Q[p] = v + Q[p - P] + Q[p - R] + Q[p - 1] - Q[p - P - R] - Q[p - P - 1] - Q[p - R - 1] + Q[p - P - R - 1];
    }
    if (!maxRho) return [0, null];
    // the cubes to try, smallest first: physical side from the 1 g cube of the densest tissue to 3 cm
    const boxes = [];
    const seen = new Set();
    const step = Math.min(dx, dy, dz) / 2;
    for (let s = Math.cbrt(0.001 / maxRho) * 0.9; s <= 0.03; s += step) {
        const n = [Math.max(1, Math.round(s / dx)), Math.max(1, Math.round(s / dy)), Math.max(1, Math.round(s / dz))];
        const key = n.join(",");
        if (seen.has(key)) continue;
        seen.add(key);
        boxes.push(n);
    }
    boxes.sort((a, b) => a[0] * a[1] * a[2] * dV - b[0] * b[1] * b[2] * dV);
    const sum = (A, i0, i1, j0, j1, k0, k1) => {   // inclusive-exclusive box [i0,i1) x [j0,j1) x [k0,k1)
        const a = i1 * P, b = i0 * P, c = j1 * R, d = j0 * R;
        return A[a + c + k1] - A[b + c + k1] - A[a + d + k1] - A[a + c + k0] + A[b + d + k1] + A[b + c + k0] + A[a + d + k0] - A[b + d + k0];
    };
    let best = 0, bestAt = null;
    q = 0;
    for (let i = 0; i < X; i++) for (let j = 0; j < Y; j++) for (let k = 0; k < Z; k++, q++) {
        if (!mask[codes[q]]) continue;
        for (const [nx, ny, nz] of boxes) {
            const i0 = Math.max(0, i - ((nx - 1) >> 1)), j0 = Math.max(0, j - ((ny - 1) >> 1)), k0 = Math.max(0, k - ((nz - 1) >> 1));
            const i1 = Math.min(X, i0 + nx), j1 = Math.min(Y, j0 + ny), k1 = Math.min(Z, k0 + nz);
            const m = sum(M, i0, i1, j0, j1, k0, k1);
            if (m < 0.001 * (1 - 1e-9)) continue;
            const avg = sum(Q, i0, i1, j0, j1, k0, k1) / m;
            if (avg > best) { best = avg; bestAt = [i, j, k]; }
            break;
        }
    }
    return [best, bestAt];
}
