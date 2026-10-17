/*
 * Tests of the ported calculations, run headless in Node (the slaves run in
 * worker threads through the same jpvm layer the browser uses).
 *
 *   node --test tests/*.test.js
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { TelaInicial } from '../js/TelaInicial.js';
import { Model } from '../js/Model.js';
import { CalculateEHFrameParallel } from '../js/CalculateEHFrameParallel.js';
import { CalculateTFrameParallel } from '../js/CalculateTFrameParallel.js';
import { ResultsDisk } from '../js/phoenix/ResultsDisk.js';
import { ResultsStore } from '../js/phoenix/ResultsStore.js';

const MODELS = new URL('../models/', import.meta.url);
console.log = () => {};   // the ported code is as chatty as the original

async function load(name) {
    const t = new TelaInicial();
    const text = readFileSync(new URL(name, MODELS), 'latin1');
    await t.ReadInputXMLFile(text, async (f) => {
        try { return new Uint8Array(readFileSync(new URL(f, MODELS))); }
        catch (e) { return new Uint8Array(gunzipSync(readFileSync(new URL(f + '.gz', MODELS)))); }
    }, name);
    return t;
}

async function runT(t, opts, NPROC, sarFile) {
    const tf = sarFile ? await t.CalculateSAR_TMenuActionPerformed(sarFile) : await t.CalculateTMenuActionPerformed();
    tf.NProcSpinner.setValue(NPROC);
    if (!sarFile) tf.SteadyStateCheckBox.setSelected(opts.steady ?? false);
    if (opts.tinitMax !== undefined) tf.TinitMaxText.setText(String(opts.tinitMax));
    if (opts.window !== undefined) tf.WindowText.setText(String(opts.window));
    if (opts.tol !== undefined) tf.ToleranceText.setText(String(opts.tol));
    if (opts.N !== undefined) tf.NField.setText(String(opts.N));
    if (opts.skip !== undefined) tf.SkipText.setText(String(opts.skip));
    if (opts.Tenv !== undefined) tf.TenvText.setText(String(opts.Tenv));
    if (opts.hc !== undefined) tf.HenvText.setText(String(opts.hc));
    if (opts.Ttissues !== undefined) tf.TtissuesText.setText(String(opts.Ttissues));
    await tf.StartButtonActionPerformed();
    assert.equal(tf.errorJPVM, false);
    if (opts.frame) return tf;
    return tf.run;
}

async function runEH(t, opts, NPROC) {
    const pf = await t.CalculateEHMenuActionPerformed();
    pf.NProcSpinner.setValue(NPROC);
    pf.NField.setText(String(opts.N));
    pf.SkipText.setText(String(opts.skip));
    pf.SteadyStateCheckBox.setSelected(opts.steady ?? false);
    if (opts.tol !== undefined) pf.ToleranceText.setText(String(opts.tol));
    await pf.StartButtonActionPerformed();
    assert.equal(pf.errorJPVM, false);
    return pf;
}

/** Tools -> Place Dipole Antenna, without the window. */
async function placeDipole(t, center, axis, length, volts = 1) {
    const f = await t.MenuDipoleActionPerformed();
    f.AxisCombo.setSelectedItem(axis);
    f.XText.setText(String(center[0])); f.YText.setText(String(center[1])); f.ZText.setText(String(center[2]));
    f.LengthText.setText(String(length));
    f.VoltText.setText(String(volts));
    await f.place();
}

function maxDiff(a, b) {
    let m = 0;
    for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i] - b[i]));
    return m;
}

test('Model.expand() turns n cubes into 2n+1 points with the 27-point rule', () => {
    const m = new Model("t", 2, 1, 1, 1, 1, 1);
    m.setData(0, 0, 0, 1); m.setData(1, 0, 0, 2);
    m.expand();
    assert.deepEqual([m.x(), m.y(), m.z()], [5, 3, 3]);
    // the shared face (x=2) belongs to the later cube
    assert.equal(m.getData(1, 1, 1), 1);
    assert.equal(m.getData(2, 1, 1), 2);
    assert.equal(m.getData(3, 1, 1), 2);
    const r = new Model(); r.copy(m); r.redux();
    assert.deepEqual([r.x(), r.y(), r.z()], [2, 1, 1]);
    assert.equal(r.getData(0, 0, 0), 1);
    assert.equal(r.getData(1, 0, 0), 2);
});

test('reads the steel cube model', async () => {
    const t = await load('Cube_5_21_21_21.3dm');
    assert.equal(t.SimulName, 'Cube_5_21_21_21');
    assert.deepEqual([t.GridSizeX, t.GridSizeY, t.GridSizeZ], [21, 21, 21]);
    assert.equal(t.NumMaterials, 20);
    const steel = t.model.getData().filter(c => c === 19).length;
    assert.equal(steel, 125);
});

test('reads the John3Doe head (151 x 259 x 259, gzipped data)', async () => {
    const t = await load('John3Doe_v1_0.3dm');
    assert.deepEqual([t.GridSizeX, t.GridSizeY, t.GridSizeZ], [151, 259, 259]);
    assert.equal(t.model.getSizeData(), 151 * 259 * 259);
    const counts = new Map();
    for (const c of t.model.getData()) counts.set(c, (counts.get(c) || 0) + 1);
    assert.ok(counts.get(4) > 100000, 'brain');
    assert.ok(counts.get(5) > 10000, 'skin');
});

test('reads the 2010 attributes and sources (cube, field, axis)', async () => {
    const t = await load('Air_21_21_21.3dm');
    assert.equal(t.dt, 1.9e-11);
    assert.equal(t.N, 1000);
    assert.equal(t.reduzN, 100);
    assert.deepEqual(t.Temps, [25, 36.8, 36.8]);
    assert.equal(t.S.length, 1);
    assert.deepEqual(t.S[0].getLocation(), [10, 10, 10]);
    assert.deepEqual(t.S[0].globalLocation(), [20, 20, 21]);   // Ez on the edge of cube (10,10,10)
    assert.deepEqual(t.S[0].SourceLocation(1024, 0), [20, 20, 21]);
    assert.equal(t.defaultsUsed.length, 0);
});

test('a 2007 .3dm (expanded-grid source, no dt/N) still opens', async () => {
    const t = new TelaInicial();
    const text = readFileSync(new URL('Air_21_21_21.3dm', MODELS), 'latin1')
        .replace(/ dt="[^"]*" N="[^"]*" reduzN="[^"]*"/, '')
        .replace('field="E" axis="z" location="10,10,10"', 'location="21,21,20"');
    await t.ReadInputXMLFile(text, async (f) => new Uint8Array(readFileSync(new URL(f, MODELS))), 'old.3dm');
    assert.equal(t.S[0].getField(), 'H');
    assert.equal(t.S[0].getAxis(), 'z');
    assert.deepEqual(t.S[0].getLocation(), [10, 10, 10]);
    assert.ok(t.dt > 0 && t.dt <= 1 / (3e8 * Math.sqrt(3) / 0.01));
    assert.ok(t.defaultsUsed.includes('dt'));
});

test('April/2007 validation, 2010 thermal code: steel cube cooling matches the lumped solution', { timeout: 120000 }, async () => {
    ResultsDisk.useMemory();
    const t = await load('Cube_5_21_21_21.3dm');
    // 2007 ran it with radiation off; since 2008 radiation is always on, so
    // the steel gets emissivity 0 (convection no longer depends on it)
    t.mat.find(m => m.name() === 'Steel').setEmissivity(0);
    const run = await runT(t, {}, 2);   // NT=1001, reduzNT=100, Tenv=90, hc=115, Ttissues=450 from the .3dm
    // CompareCubeSteel_2007.m: AnalyticLumped = Tenv + 360*exp(-0.0041*time)
    let worst = 0;
    for (const s of run.series) {
        if (s.n === 0) continue;
        const time = s.n * 1;  // dtT = 1s
        const lumped = 90 + 360 * Math.exp(-0.0041 * time);
        worst = Math.max(worst, Math.abs(100 * (lumped - s.avg) / lumped));
    }
    assert.ok(run.series.length === 11);
    assert.ok(worst < 1.5, 'max error ' + worst.toFixed(3) + '% (2007: 1.47%)');
    process.stdout.write('# steel cube: max error vs lumped solution = ' + worst.toFixed(3) + '% (2007: 1.47%)\n');
    // the TMinAvMax file has the 2010 layout: NMAX, then "min avg max" lines
    const txt = await ResultsDisk.readText('results/TMinAvMax.txt');
    const lines = txt.trim().split('\n');
    assert.equal(lines[0], '1001');
    assert.equal(lines.length, 1 + 11);
    assert.ok(await ResultsDisk.readText('results/TN1000'));
});

test('temperature: 1, 3 and 4 slaves give the same result', { timeout: 120000 }, async () => {
    ResultsDisk.useMemory();
    const t = await load('Air_SmallHead.3dm');
    const opts = { N: 31, skip: 10 };
    const r1 = await runT(t, opts, 1);
    const r3 = await runT(t, opts, 3);
    const r4 = await runT(t, opts, 4);
    const last = (r) => r.snapshots[r.snapshots.length - 1].fields.T;
    assert.equal(r1.snapshots.length, 4);
    assert.ok(maxDiff(last(r1), last(r3)) < 1e-6);
    assert.ok(maxDiff(last(r1), last(r4)) < 1e-6);
    // the tissues moved away from 36.8 (metabolism, blood, losses to the air)
    const T = last(r1);
    let changed = 0;
    for (const v of T) if (v !== 25 && Math.abs(v - 36.8) > 1e-6) changed++;
    assert.ok(changed > 0);
});

test('EH: 1, 3 and 4 slaves give the same fields, and the fields stay bounded', { timeout: 180000 }, async () => {
    ResultsDisk.useMemory();
    const t = await load('Air_21_21_21.3dm');
    const opts = { N: 60, skip: 20 };
    const p1 = await runEH(t, opts, 1);
    const p3 = await runEH(t, opts, 3);
    const p4 = await runEH(t, opts, 4);  // 21 cubes / 4 slaves: uneven slices
    const last = (p) => p.run.snapshots[p.run.snapshots.length - 1].fields.E;
    assert.equal(p1.run.snapshots.length, 4); // n = 0, 20, 40, 60
    const a = last(p1);
    let peak = 0;
    for (const v of a) { assert.ok(Number.isFinite(v)); peak = Math.max(peak, v); }
    assert.ok(peak > 0, 'E is not zero');
    assert.equal(maxDiff(a, last(p3)), 0, 'NPROC 1 vs 3');
    assert.equal(maxDiff(a, last(p4)), 0, 'NPROC 1 vs 4');
    // the EN files are in the 2010 text format (one line per x); there are no HN files
    const en = await ResultsDisk.readText('results/EN40');
    assert.equal(en.trim().split('\n').length, 21);
    assert.equal(en.split('\n')[0].trim().split(' ').length, 21 * 21);
    const files = (await ResultsDisk.list()).map(f => f.path);
    assert.ok(files.includes('results/SimulAir_21_21_21.3dm'));
    assert.ok(!files.some(f => /\/HN\d/.test(f)));
    assert.ok(!files.some(f => /_E2_/.test(f)), 'a fixed-N run writes no E2');
});

test('EH with Mur boundaries does not blow up over a long run', { timeout: 180000 }, async () => {
    ResultsDisk.useMemory();
    const t = await load('Air_21_21_21.3dm');
    const pf = await runEH(t, { N: 600, skip: 100 }, 2);
    const peaks = pf.run.snapshots.map(s => s.fields.E.reduce((m, v) => Math.max(m, v), 0));
    for (const p of peaks) assert.ok(Number.isFinite(p));
    // a 1 V/m hard source: the field settles, it does not grow without bound
    assert.ok(peaks[peaks.length - 1] < 10 * peaks[1] + 1e3, 'peaks ' + peaks.join(', '));
    ResultsStore.runs.length = 0;
});

/** An air box of n^3 cubes made from Air_21_21_21.3dm. */
async function airBox(n) {
    const t = new TelaInicial();
    const text = readFileSync(new URL('Air_21_21_21.3dm', MODELS), 'latin1').replace('dimention="21,21,21"', `dimention="${n},${n},${n}"`);
    await t.ReadInputXMLFile(text, async () => new TextEncoder().encode(Array(n * n * n).fill('1').join(' ')), 'box.3dm');
    return t;
}

test('dipole (Tools -> Place Dipole Antenna): far-field pattern, NPROC 1 = 4', { timeout: 240000 }, async () => {
    ResultsDisk.useMemory();
    const n = 41, c = 20;
    const t = await airBox(n);
    await placeDipole(t, [c, c, c], 'z', 7);   // 7 cm at 1.8 GHz (lambda/2 = 8.3 cm)
    assert.equal(t.S.length, 1);
    assert.equal(t.S[0].getAxis(), 'z');
    const cu = t.mat.find(m => m.name().toLowerCase().startsWith('copper'));
    assert.ok(cu, 'a copper material was added');
    assert.equal(t.model.getData(c, c, c - 3), cu.code());
    assert.equal(t.model.getData(c, c, c), 1);
    // until the steady state (N is only the maximum)
    const p1 = await runEH(t, { N: 3000, skip: 1000, steady: true, tol: 1 }, 1);
    const p4 = await runEH(t, { N: 3000, skip: 1000, steady: true, tol: 1 }, 4);
    const st = p1.steady;
    assert.equal(st.P, 29);
    assert.ok(st.reached, 'steady state reached');
    assert.equal(p4.steady.n, st.n, 'NPROC 4 stops at the same step');
    assert.ok(st.n < 3000);
    // the difference was reported at every step from the end of the second period
    assert.equal(st.log.length, st.n + 1 - (2 * st.P - 1));
    assert.ok(st.log.slice(-2 * st.P).every(e => e.delta < 0.01), 'below 1 % for the last 2 periods');
    assert.ok(st.cube[st.cube.length - 1].delta < 0.01);
    assert.equal((st.n + 1) % st.P, 0, 'stops at the end of a period');
    process.stdout.write('# dipole: steady state at n = ' + st.n + ' (' + ((st.n + 1) / st.P) + ' periods), difference ' + (100 * st.log[st.log.length - 1].delta).toFixed(3) + ' %\n');
    const E2 = p1.run.extra.E2;
    assert.equal(maxDiff(E2, p4.run.extra.E2), 0);
    const at = (i, j, k) => E2[(i * n + j) * n + k];
    // along the wire E is zero (FDTD_slave Pos-FDTD on the copper cubes)
    assert.equal(at(c, c, c + 2), 0);
    // 14 cm from the gap: broadside >> along the axis, and 45 degrees about half of broadside (sin^2)
    const axial = at(c, c, c + 14), broadside = at(c + 14, c, c), diag = at(c + 10, c, c + 10);
    process.stdout.write('# dipole at 14 cm: E2 broadside / axis = ' + (broadside / axial).toFixed(1) + ', 45deg / broadside = ' + (diag / broadside).toFixed(2) + '\n');
    assert.ok(broadside > 4 * axial, 'broadside ' + broadside + ' axial ' + axial);
    assert.ok(diag / broadside > 0.3 && diag / broadside < 0.7);
    ResultsStore.runs.length = 0;
});

test('sources on and next to the plane shared by two slaves: NPROC 1 = 4', { timeout: 240000 }, async () => {
    ResultsDisk.useMemory();
    // 41 cubes in 4 slices: the slices meet at cubes 10, 20 and 30.  An Ey
    // source in cube 10 drives x = 20 (the shared plane) and x = 22; in cube 9
    // it drives x = 18 and x = 20 (seen by the right slave only through the border).
    for (const cx of [9, 10]) {
        const runs = [];
        for (const NPROC of [1, 4]) {
            const t = await airBox(41);
            await placeDipole(t, [cx, 20, 20], 'y', 7);
            runs.push(await runEH(t, { N: 120, skip: 30, steady: true }, NPROC));
        }
        runs[0].run.snapshots.forEach((s, i) => assert.equal(maxDiff(s.fields.E, runs[1].run.snapshots[i].fields.E), 0, 'cube ' + cx + ', n = ' + s.n));
        assert.equal(maxDiff(runs[0].E2field.getData(), runs[1].E2field.getData()), 0);
        // the differences are sums over the slaves: equal up to the order of the additions
        runs[0].steady.log.forEach((e, i) => assert.ok(Math.abs(e.delta - runs[1].steady.log[i].delta) <= 1e-9 * Math.max(1, e.delta)));
    }
    ResultsStore.runs.length = 0;
});

test('steady state not reached within N: warning, no E2 file', { timeout: 120000 }, async () => {
    ResultsDisk.useMemory();
    const t = await airBox(41);
    await placeDipole(t, [20, 20, 20], 'z', 7);
    const pf = await runEH(t, { N: 100, skip: 50, steady: true }, 2);
    assert.equal(pf.steady.reached, false);
    assert.equal(pf.run.snapshots[pf.run.snapshots.length - 1].n, 100, 'ran to N');
    assert.ok(pf.steady.log.length > 0 && pf.steady.log.every(e => Number.isFinite(e.delta)));
    assert.equal(pf.E2file, null);
    assert.ok(!(await ResultsDisk.list()).some(f => /_E2_/.test(f.path)));
    ResultsStore.runs.length = 0;
});

test('temperature: a dtT above the stability limit of a material is refused', { timeout: 60000 }, async () => {
    ResultsDisk.useMemory();
    const t = await load('Air_SmallHead.3dm');
    const f = await t.MenuDipoleActionPerformed(); f.suggest(); await f.place();
    // the wire itself is not updated, so this runs
    const ok = await runT(t, { N: 11, skip: 10 }, 1);
    assert.ok(ok.snapshots[ok.snapshots.length - 1].fields.T.every(Number.isFinite));
    // copper that is not the antenna's wire would diverge at dtT = 1 s (limit ~2 ms on this grid)
    t.mat.find(m => /^copper/i.test(m.name())).name_[0] = 'Coper';
    const tf = await t.CalculateTMenuActionPerformed();
    await tf.StartButtonActionPerformed();
    assert.equal(tf.run, null, 'the run did not start');
    assert.equal(tf.StartButton.isEnabled(), true);
});

test('Temperature (T) until the steady state writes results/<model>_Tinit, reused by SAR -> T', { timeout: 300000 }, async () => {
    ResultsDisk.useMemory();
    const t = await load('Air_SmallHead.3dm');
    const tf = await runT(t, { steady: true, frame: true, tol: 1 }, 2);
    assert.equal(tf.steady.tol, 0.01);
    assert.ok(tf.steady.reached, 'thermal steady state reached');
    assert.equal(tf.steady.n % 600, 0);
    const last2 = tf.steady.log.slice(-2);
    assert.ok(last2.length === 2 && last2.every(e => e.delta < 0.01), 'below 1 % at the last 2 checks');
    const info = JSON.parse(await ResultsDisk.readText('results/Air_SmallHead_Tinit.info'));
    assert.deepEqual(info.dims, [21, 21, 21]);
    assert.equal(info.n, tf.steady.n);
    const tinit = (await ResultsDisk.readText('results/Air_SmallHead_Tinit')).trim().split(/\s+/).map(Number);
    assert.equal(tinit.length, 21 * 21 * 21);
    // SAR -> T (here with E2 = 0) finds it and starts from it: no new steady-state run, and no drift
    const zero = new Array(21 * 21 * 21).fill(0).join(' ');
    const before = ResultsStore.runs.length;
    const sf = await runT(t, { N: 1201, skip: 600, frame: true, tol: 1 }, 2, { name: 'zero_E2', text: zero });
    assert.equal(ResultsStore.runs.length, before + 1, 'only the SAR run');
    assert.equal(sf.TinitSource, '/results/Air_SmallHead_Tinit');
    const T = sf.run.snapshots[sf.run.snapshots.length - 1].fields.T;
    let drift = 0;
    for (let q = 0; q < T.length; q++) drift = Math.max(drift, Math.abs(T[q] - tinit[q]));
    process.stdout.write('# Tinit at n = ' + tf.steady.n + '; drift over 20 min from it without SAR: ' + drift.toExponential(2) + ' C\n');
    assert.ok(drift < 0.01, 'drift ' + drift);
    // the default tolerance (0.01 %) is tighter than the saved 1 %: Tinit is calculated again
    const n0 = ResultsStore.runs.length;
    const df = await runT(t, { N: 11, skip: 10, frame: true }, 2, { name: 'zero_E2', text: zero });
    assert.equal(df.ToleranceText.getText(), '0.01');
    assert.equal(ResultsStore.runs.length, n0 + 2, 'a new steady-state run, then the SAR run');
    assert.equal(JSON.parse(await ResultsDisk.readText('results/Air_SmallHead_Tinit.info')).tolerance, 0.0001);
    ResultsStore.runs.length = 0;
});

test('E2 of a dipole run heats the tissues in SAR -> T (Tinit calculated first), and nothing becomes NaN', { timeout: 300000 }, async () => {
    ResultsDisk.useMemory();
    await ResultsDisk.removeAll();
    const t = await load('Air_SmallHead.3dm');
    const f = await t.MenuDipoleActionPerformed(); f.suggest(); await f.place();
    const cu = t.mat.find(m => /^copper/i.test(m.name())).code();
    const pf = await runEH(t, { N: 8000, skip: 2000, steady: true }, 2);
    assert.ok(pf.steady.reached);
    assert.ok(pf.E2file);
    const sarText = await ResultsDisk.readText(pf.E2file);
    const e2 = sarText.trim().split(/\s+/).map(Number);
    const codes = t.model.getData();
    assert.ok(codes.some(c => c === cu));
    // the wire is a perfect conductor: no E2 in its cubes
    for (let q = 0; q < e2.length; q++) if (codes[q] === cu) assert.equal(e2[q], 0);
    const opts = { N: 2001, skip: 1000, frame: true };
    // no Tinit yet: SAR -> T calculates it first, saves it, then runs the SAR
    const hotF = await runT(t, opts, 2, { name: pf.E2file, text: sarText });
    assert.ok(hotF.steady === null && hotF.TinitSource === '/results/Air_SmallHead_Tinit');
    assert.ok(await ResultsDisk.readText('results/Air_SmallHead_Tinit.info'));
    const hot = hotF.run;
    // the same from the same Tinit with E2 = 0
    const cold = (await runT(t, opts, 2, { name: 'zero_E2', text: new Array(e2.length).fill(0).join(' ') })).run;
    const last = (r) => r.snapshots[r.snapshots.length - 1].fields.T;
    let warmer = 0, colder = 0;
    const a = last(hot), b = last(cold);
    for (let q = 0; q < a.length; q++) {
        assert.ok(Number.isFinite(a[q]), 'T of cube ' + q + ' is ' + a[q]);
        if (a[q] > b[q] + 1e-9) warmer++;
        if (a[q] < b[q] - 1e-9) colder++;
    }
    assert.ok(warmer > 0, 'some cube got warmer');
    assert.equal(colder, 0);
    assert.ok(hot.series.every(s => Number.isFinite(s.avg)), 'TMinAvMax has no NaN');
    // T rise since n = 0 (= since Tinit) is in the snapshots
    assert.ok(hot.snapshots[hot.snapshots.length - 1].fields.TRise);
    // an E2 file written before the fix, with E2 left in the copper cubes, does not heat the wire either
    const old = e2.map((v, q) => codes[q] === cu ? 6.3 : v).join(' ');
    const oldRun = (await runT(t, opts, 2, { name: 'old_E2', text: old })).run;
    assert.equal(maxDiff(last(oldRun), a), 0);
    ResultsStore.runs.length = 0;
});
