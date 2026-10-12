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

async function runT(t, opts, NPROC) {
    const tf = await t.CalculateTMenuActionPerformed();
    tf.NProcSpinner.setValue(NPROC);
    tf.NField.setText(String(opts.N));
    tf.SkipText.setText(String(opts.skip));
    tf.TenvText.setText(String(opts.Tenv ?? 25));
    tf.HenvText.setText(String(opts.hc ?? 2.7));
    tf.TbloodText.setText(String(opts.Tblood ?? 36.8));
    tf.TtissuesText.setText(String(opts.Ttissues ?? 36.8));
    tf.RadiationCheckBox.setSelected(opts.radiation ?? true);
    await tf.StartButtonActionPerformed();
    assert.equal(tf.errorJPVM, false);
    return tf.run;
}

async function runEH(t, opts, NPROC) {
    const pf = await t.CalculateEHMenuActionPerformed();
    pf.NProcSpinner.setValue(NPROC);
    pf.NField.setText(String(opts.N));
    pf.SkipText.setText(String(opts.skip));
    await pf.StartButtonActionPerformed();
    assert.equal(pf.errorJPVM, false);
    return pf.run;
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

test('April/2007 validation: steel cube cooling matches the lumped solution', { timeout: 120000 }, async () => {
    ResultsDisk.useMemory();
    const t = await load('Cube_5_21_21_21.3dm');
    const N = 1001, skip = 100;
    const run = await runT(t, { N, skip, Tenv: 90, hc: 115, Ttissues: 450, radiation: false }, 2);
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
    // the TMinAvMax file has the 2007 layout: NMAX, skip, then "min avg max" lines
    const txt = await ResultsDisk.readText('results/TMinAvMax_115.0_90.0_36.8_450.0.txt');
    const lines = txt.trim().split('\n');
    assert.equal(lines[0], '1001');
    assert.equal(lines[1], '100');
    assert.equal(lines.length, 2 + 11);
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
    const r1 = await runEH(t, opts, 1);
    const r3 = await runEH(t, opts, 3);
    const r4 = await runEH(t, opts, 4);  // 21 cubes / 4 slaves: uneven slices
    const last = (r) => r.snapshots[r.snapshots.length - 1].fields;
    assert.equal(r1.snapshots.length, 4); // n = 0, 20, 40, 59
    for (const k of ['E', 'H']) {
        const a = last(r1)[k], b = last(r3)[k], c = last(r4)[k];
        let peak = 0;
        for (const v of a) { assert.ok(Number.isFinite(v)); peak = Math.max(peak, v); }
        assert.ok(peak > 0, k + ' is not zero');
        assert.ok(maxDiff(a, b) <= 1e-9 * peak, k + ' NPROC 1 vs 3');
        assert.ok(maxDiff(a, c) <= 1e-9 * peak, k + ' NPROC 1 vs 4');
    }
    // the EN/HN files exist in the 2007 text format (one line per x)
    const en = await ResultsDisk.readText('results/EN40');
    assert.equal(en.trim().split('\n').length, 21);
    assert.equal(en.split('\n')[0].trim().split(' ').length, 21 * 21);
    assert.ok((await ResultsDisk.list()).some(f => f.path === 'results/SimulAir_21_21_21.3dm'));
});

test('EH with Mur boundaries does not blow up over a long run', { timeout: 180000 }, async () => {
    ResultsDisk.useMemory();
    const t = await load('Air_21_21_21.3dm');
    const run = await runEH(t, { N: 400, skip: 100 }, 2);
    const peaks = run.snapshots.map(s => s.fields.E.reduce((m, v) => Math.max(m, v), 0));
    for (const p of peaks) assert.ok(Number.isFinite(p));
    // a hard 1 A/m sinusoidal source: the field settles, it does not grow without bound
    assert.ok(peaks[peaks.length - 1] < 10 * peaks[1] + 1e3, 'peaks ' + peaks.join(', '));
    ResultsStore.runs.length = 0;
});
