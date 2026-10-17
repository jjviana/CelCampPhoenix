/*
 * FieldViewer.js  -  CelCamp Phoenix (2026)
 *
 * In 2007 the results were looked at in MATLAB (PlotSliceFields.m,
 * PlotFieldsMovie.m, CompareCubeSteel_2007.m ...).  This window does the
 * same in the browser: a slice of the model, of |E|, E^2, SAR or T along
 * X, Y or Z, a time slider over the saved steps, and the TMinAvMax curves.
 */
import { JFrame } from '../swing/JFrame.js';
import { el } from '../swing/swing.js';
import { ResultsStore } from './ResultsStore.js';
import { ResultsDisk } from './ResultsDisk.js';
import { SAXBuilder } from './MiniJDOM.js';

/** MATLAB's default colormap of 2007 */
function jet(t) {
    t = Math.max(0, Math.min(1, t));
    const r = Math.max(0, Math.min(1, 1.5 - Math.abs(4 * t - 3)));
    const g = Math.max(0, Math.min(1, 1.5 - Math.abs(4 * t - 2)));
    const b = Math.max(0, Math.min(1, 1.5 - Math.abs(4 * t - 1)));
    return [r * 255 | 0, g * 255 | 0, b * 255 | 0];
}
const JET = Array.from({ length: 256 }, (_, i) => jet(i / 255));

const QUANT = {
    materials: { label: "Materials", unit: "" },
    E: { label: "|E| (V/m)", unit: "V/m" },
    H: { label: "|H| (A/m)", unit: "A/m" },
    T: { label: "T (°C)", unit: "°C" },
    TRise: { label: "T rise since n = 0 (°C)", unit: "°C" },
    E2: { label: "E² peak, last period (V²/m²)", unit: "V²/m²" },
    SAR: { label: "SAR = σE²/2ρ (W/kg)", unit: "W/kg" },
};
const LOG_DEFAULT = new Set(['E', 'H', 'E2', 'SAR']);
const SKIP_AIR = new Set(['T', 'TRise']);

function fmt(v) {
    if (!isFinite(v)) return String(v);
    const a = Math.abs(v);
    if (a !== 0 && (a < 1e-2 || a >= 1e5)) return v.toExponential(2);
    return (Math.round(v * 1000) / 1000).toString();
}

export class FieldViewer extends JFrame {

    static count = 0;

    constructor() {
        super("Field Viewer");
        this.current = null;     // a run (from ResultsStore, or loaded from results/)
        this.axis = 0;
        this.slice = {};
        this.snapIndex = 0;
        this.quantity = 'materials';
        this.log = true;
        this.overlay = true;
        this.playing = null;
        this.loaded = [];        // runs loaded from files
        this.modelRun = null;
        this.initComponents();
        this.unsub = ResultsStore.onChange((run) => this.storeChanged(run));
        this.addWindowListener({ windowClosing: () => this.stop() });
    }

    initComponents() {
        const cp = this.getContentPane();
        cp.classList.add('viewer');
        this.sourceSel = el('select', 'jcombo'); this.sourceSel.setAttribute('aria-label', 'Data to show');
        this.quantSel = el('select', 'jcombo'); this.quantSel.setAttribute('aria-label', 'Quantity');
        this.axisSel = el('div', 'jrow viewer-axis');
        const group = 'vaxis' + (++FieldViewer.count);
        ['X', 'Y', 'Z'].forEach((a, i) => {
            const lab = el('label', 'jradio');
            const r = el('input'); r.type = 'radio'; r.name = group; r.checked = i === 0;
            r.addEventListener('change', () => { this.axis = i; this.syncSlider(); this.draw(); });
            lab.append(r, ' ' + a);
            this.axisSel.appendChild(lab);
        });
        this.sliceRange = el('input', 'viewer-range'); this.sliceRange.type = 'range'; this.sliceRange.min = 0;
        this.sliceRange.setAttribute('aria-label', 'Slice');
        this.sliceLabel = el('span', 'jnote viewer-num');
        this.timeRange = el('input', 'viewer-range'); this.timeRange.type = 'range'; this.timeRange.min = 0;
        this.timeRange.setAttribute('aria-label', 'Saved time step');
        this.timeLabel = el('span', 'jnote viewer-num');
        this.playBtn = el('button', 'jbutton', '▶'); this.playBtn.type = 'button'; this.playBtn.title = 'Play the saved steps';
        this.logBox = el('label', 'jcheckbox'); const lb = el('input'); lb.type = 'checkbox'; lb.checked = true;
        this.logBox.append(lb, ' log scale'); this.logInput = lb;
        this.ovBox = el('label', 'jcheckbox'); const ob = el('input'); ob.type = 'checkbox'; ob.checked = true;
        this.ovBox.append(ob, ' material outlines'); this.ovInput = ob;

        const controls = el('div', 'viewer-controls');
        const r1 = el('div', 'jrow'); r1.append(el('span', 'jlabel', 'Show:'), this.sourceSel, this.quantSel);
        const r2 = el('div', 'jrow'); r2.append(el('span', 'jlabel', 'Slice:'), this.axisSel, this.sliceRange, this.sliceLabel);
        this.timeRow = el('div', 'jrow'); this.timeRow.append(el('span', 'jlabel', 'Step:'), this.playBtn, this.timeRange, this.timeLabel);
        const r4 = el('div', 'jrow'); r4.append(this.logBox, this.ovBox);
        controls.append(r1, r2, this.timeRow, r4);

        this.canvasWrap = el('div', 'viewer-canvas-wrap');
        this.canvas = el('canvas', 'viewer-canvas');
        this.canvas.setAttribute('role', 'img');
        this.canvasWrap.appendChild(this.canvas);
        this.colorbar = el('div', 'viewer-colorbar');
        this.readout = el('div', 'viewer-readout jnote', ' ');
        this.legend = el('div', 'viewer-legend');
        this.chartWrap = el('div', 'viewer-chart-wrap');
        this.chart = el('canvas', 'viewer-chart');
        this.chart.setAttribute('role', 'img');
        this.chartWrap.append(el('div', 'viewer-chart-title', 'TMinAvMax: minimum, average and maximum temperature of the tissues'), this.chart);
        this.empty = el('div', 'viewer-empty', 'Open a model (File → New) or run a calculation to see something here.');
        cp.append(controls, this.empty, this.canvasWrap, this.colorbar, this.readout, this.legend, this.chartWrap);

        this.sourceSel.addEventListener('change', () => this.selectSource());
        this.quantSel.addEventListener('change', () => { this.quantity = this.quantSel.value; this.draw(); });
        this.sliceRange.addEventListener('input', () => { this.slice[this.axis] = +this.sliceRange.value; this.draw(); });
        this.timeRange.addEventListener('input', () => { this.snapIndex = +this.timeRange.value; this.draw(); });
        this.playBtn.addEventListener('click', () => this.togglePlay());
        lb.addEventListener('change', () => { this.log = lb.checked; this.draw(); });
        ob.addEventListener('change', () => { this.overlay = ob.checked; this.draw(); });
        this.canvas.addEventListener('pointermove', (e) => this.hover(e));
        this.canvas.addEventListener('pointerleave', () => { this.readout.textContent = ' '; });
        if (typeof ResizeObserver !== 'undefined') {
            let pending = false;
            new ResizeObserver(() => { if (!pending) { pending = true; requestAnimationFrame(() => { pending = false; this.draw(); }); } }).observe(this.canvasWrap);
        }
        this.fillSources();
    }

    /* ----------------------------- data ------------------------------ */

    allRuns() {
        const runs = [];
        if (this.modelRun) runs.push(this.modelRun);
        for (const r of ResultsStore.runs) runs.push(r);
        for (const r of this.loaded) runs.push(r);
        return runs;
    }

    runLabel(r) {
        if (r.kind === 'model') return "Model: " + r.name;
        if (r.fromFile) return "results/: " + r.name;
        return (r.kind === 'EH' ? "EH: " : "T: ") + r.name + (r.finished ? "" : " (running)");
    }

    fillSources() {
        const runs = this.allRuns();
        this.sourceSel.innerHTML = '';
        runs.forEach((r, i) => {
            const o = el('option', null, this.runLabel(r));
            o.value = String(i);
            if (r === this.current) o.selected = true;
            this.sourceSel.appendChild(o);
        });
        this.sourceSel.disabled = runs.length === 0;
    }

    showModel(m) {
        if (!m) return;
        const sources = (m.sources || []).map(L => L.slice());
        this.modelRun = { kind: 'model', name: m.name, dims: m.dims, deltas: m.deltas, codes: m.codes, materials: m.materials, snapshots: [], series: [], sources, finished: true };
        this.setRun(this.modelRun);
    }

    showRun(run) { this.setRun(run); }

    setRun(run) {
        this.stop();
        this.current = run;
        this.fillSources();
        const qs = ['materials'];
        if (run.kind === 'EH') qs.push('E');
        if (run.kind === 'EH' && run.extra) qs.push('E2', 'SAR');
        if (run.kind === 'T') qs.push('T', 'TRise');
        if (run.fromFile) qs.push(...run.quantities.filter(q => !qs.includes(q)));
        this.quantSel.innerHTML = '';
        for (const q of qs) { const o = el('option', null, QUANT[q].label); o.value = q; this.quantSel.appendChild(o); }
        this.quantity = qs.length > 1 ? qs[1] : 'materials';
        this.quantSel.value = this.quantity;
        this.logInput.checked = this.log = LOG_DEFAULT.has(this.quantity);
        for (let a = 0; a < 3; a++) this.slice[a] = Math.floor(run.dims[a] / 2);
        this.snapIndex = Math.max(0, run.snapshots.length - 1);
        this.syncSlider();
        this.draw();
    }

    selectSource() {
        const r = this.allRuns()[+this.sourceSel.value];
        if (r) this.setRun(r);
    }

    storeChanged(run) {
        this.fillSources();
        if (run && run === this.current) {
            const atEnd = this.snapIndex >= run.snapshots.length - 2;
            if (atEnd) this.snapIndex = run.snapshots.length - 1;
            this.syncSlider();
            if (this.visible) this.draw();
        }
    }

    syncSlider() {
        const r = this.current;
        if (!r) return;
        this.sliceRange.max = r.dims[this.axis] - 1;
        this.sliceRange.value = this.slice[this.axis];
        this.sliceLabel.textContent = "XYZ"[this.axis] + " = " + this.slice[this.axis] + " / " + (r.dims[this.axis] - 1);
        const ns = r.snapshots.length;
        this.timeRow.style.display = ns > 0 ? '' : 'none';
        this.timeRange.max = Math.max(0, ns - 1);
        this.timeRange.value = Math.min(this.snapIndex, Math.max(0, ns - 1));
    }

    async snapshotValues() {
        const r = this.current;
        if (!r || this.quantity === 'materials') return null;
        if (r.extra && r.extra[this.quantity]) {
            // E^2 and SAR: one field for the whole run (the average over the last period)
            if (!r.extraSnap) r.extraSnap = { n: r.snapshots.length ? r.snapshots[r.snapshots.length - 1].n : 0, fields: r.extra, average: (r.info && r.info.E2steps) || 0 };
            return { s: r.extraSnap, v: r.extra[this.quantity] };
        }
        if (!r.snapshots.length) return null;
        const s = r.snapshots[Math.min(this.snapIndex, r.snapshots.length - 1)];
        if (s.fields[this.quantity]) return { s, v: s.fields[this.quantity] };
        if (s.paths && s.paths[this.quantity]) {
            // a file of results/: parse it on demand
            const text = await ResultsDisk.readText(s.paths[this.quantity]);
            const v = new Float32Array(r.dims[0] * r.dims[1] * r.dims[2]);
            const re = /\S+/g; let m, q = 0;
            while (q < v.length && (m = re.exec(text)) !== null) v[q++] = +m[0];
            s.fields[this.quantity] = v;
            return { s, v };
        }
        return null;
    }

    /* ---------------------------- drawing ---------------------------- */

    sliceGeometry() {
        const r = this.current;
        const [nx, ny, nz] = r.dims;
        const [dx, dy, dz] = r.deltas;
        // image axes for each slicing axis: [width axis, height axis]
        const axes = [[2, 1], [2, 0], [1, 0]][this.axis];
        const n = r.dims, d = [dx, dy, dz];
        const W = n[axes[0]], H = n[axes[1]];
        const index = (u, v) => {
            const c = [0, 0, 0];
            c[this.axis] = this.slice[this.axis];
            c[axes[0]] = u;
            c[axes[1]] = v;   // first index at the top, like MATLAB's imagesc
            return (c[0] * ny + c[1]) * nz + c[2];
        };
        const coords = (u, v) => {
            const c = [0, 0, 0];
            c[this.axis] = this.slice[this.axis]; c[axes[0]] = u; c[axes[1]] = v;
            return c;
        };
        return { W, H, index, coords, aspect: (d[axes[1]] / d[axes[0]]), axes };
    }

    async draw() {
        const r = this.current;
        this.empty.style.display = r ? 'none' : '';
        this.canvasWrap.style.display = r ? '' : 'none';
        this.chartWrap.style.display = (r && r.series && r.series.length) ? '' : 'none';
        if (!r) { this.colorbar.innerHTML = ''; this.legend.innerHTML = ''; return; }
        this.syncSlider();
        const token = (this.drawToken = (this.drawToken || 0) + 1);
        const sv = await this.snapshotValues();
        if (token !== this.drawToken) return;
        const g = this.sliceGeometry();
        const { W, H } = g;
        const colors = new Map(r.materials.map(m => [m.code, m.color]));
        const names = new Map(r.materials.map(m => [m.code, m.name]));
        const airCodes = new Set(r.materials.filter(m => /^(air|ar|default)$/i.test(m.name)).map(m => m.code));

        // value range over the whole volume (air excluded for T)
        let lo = Infinity, hi = -Infinity;
        if (sv) {
            const v = sv.v;
            if (!sv.s.range) sv.s.range = {};
            if (!sv.s.range[this.quantity]) {
                let a = Infinity, b = -Infinity, pmin = Infinity;
                const skipAir = SKIP_AIR.has(this.quantity);
                for (let p = 0; p < v.length; p++) {
                    if (skipAir && airCodes.has(r.codes[p])) continue;
                    const x = v[p];
                    if (x < a) a = x; if (x > b) b = x;
                    if (x > 0 && x < pmin) pmin = x;
                }
                sv.s.range[this.quantity] = [a, b, pmin];
            }
            [lo, hi] = sv.s.range[this.quantity];
        }
        const useLog = sv && this.log && hi > 0;
        let llo = 0, lhi = 1;
        if (useLog) { lhi = Math.log10(hi); llo = lhi - 4; }

        const img = new ImageData(W, H);
        const px = img.data;
        for (let v = 0; v < H; v++) {
            for (let u = 0; u < W; u++) {
                const p = g.index(u, v);
                const code = r.codes[p];
                let rgb;
                if (!sv) {
                    rgb = colors.get(code) || [255, 0, 255];
                } else if (SKIP_AIR.has(this.quantity) && airCodes.has(code)) {
                    const c = colors.get(code) || [0, 0, 0];
                    rgb = [c[0] * 0.3 + 60, c[1] * 0.3 + 60, c[2] * 0.3 + 60];
                } else {
                    const x = sv.v[p];
                    let t;
                    if (useLog) t = x > 0 ? (Math.log10(x) - llo) / (lhi - llo) : 0;
                    else t = hi > lo ? (x - lo) / (hi - lo) : 0.5;
                    rgb = JET[Math.max(0, Math.min(255, Math.round(t * 255)))];
                }
                const o = (v * W + u) * 4;
                px[o] = rgb[0]; px[o + 1] = rgb[1]; px[o + 2] = rgb[2]; px[o + 3] = 255;
            }
        }
        // canvas size: fit the available width, keep the physical aspect ratio
        const avail = Math.max(160, (this.canvasWrap.clientWidth || 480) - 4);
        const maxH = Math.max(200, Math.min(540, window.innerHeight - ((r.series && r.series.length) ? 470 : 300)));
        let scale = avail / W;
        if (H * g.aspect * scale > maxH) scale = maxH / (H * g.aspect);
        const cw = Math.max(1, Math.round(W * scale)), ch = Math.max(1, Math.round(H * g.aspect * scale));
        const off = new OffscreenCanvas(W, H);
        off.getContext('2d').putImageData(img, 0, 0);
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = Math.round(cw * dpr); this.canvas.height = Math.round(ch * dpr);
        this.canvas.style.width = cw + 'px'; this.canvas.style.height = ch + 'px';
        const ctx = this.canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(off, 0, 0, this.canvas.width, this.canvas.height);
        // material outlines over the field: thin lines between different materials
        if (sv && this.overlay) {
            const sx = this.canvas.width / W, sy = this.canvas.height / H;
            ctx.beginPath();
            for (let v = 0; v < H; v++) for (let u = 0; u < W; u++) {
                const c = r.codes[g.index(u, v)];
                if (u + 1 < W && r.codes[g.index(u + 1, v)] !== c) { const x = Math.round((u + 1) * sx) + 0.5; ctx.moveTo(x, v * sy); ctx.lineTo(x, (v + 1) * sy); }
                if (v + 1 < H && r.codes[g.index(u, v + 1)] !== c) { const y = Math.round((v + 1) * sy) + 0.5; ctx.moveTo(u * sx, y); ctx.lineTo((u + 1) * sx, y); }
            }
            ctx.strokeStyle = 'rgba(255,255,255,0.4)';
            ctx.lineWidth = Math.max(1, dpr * 0.75);
            ctx.stroke();
        }
        // the sources that lie in this slice (cube coordinates)
        for (const src of (r.sources || [])) {
            if (src[this.axis] !== this.slice[this.axis]) continue;
            const sx = this.canvas.width / W, sy = this.canvas.height / H;
            const x = (src[g.axes[0]] + 0.5) * sx, y = (src[g.axes[1]] + 0.5) * sy;
            const rad = Math.max(5 * dpr, 1.2 * Math.max(sx, sy));
            ctx.lineWidth = 2 * dpr;
            ctx.strokeStyle = '#000'; ctx.beginPath(); ctx.arc(x, y, rad + dpr, 0, 2 * Math.PI); ctx.stroke();
            ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, rad, 0, 2 * Math.PI); ctx.stroke();
        }
        this.geom = { g, scaleX: cw / W, scaleY: ch / H, sv, airCodes, names };
        const qlabel = QUANT[this.quantity].label;
        this.canvas.setAttribute('aria-label', qlabel + " on the " + "XYZ"[this.axis] + " = " + this.slice[this.axis] + " slice of " + r.name);

        // colour bar / legend
        this.colorbar.innerHTML = '';
        this.legend.innerHTML = '';
        if (sv) {
            const bar = el('div', 'viewer-colorbar-ramp');
            bar.style.background = 'linear-gradient(to right,' + [0, 0.125, 0.375, 0.625, 0.875, 1].map(t => 'rgb(' + jet(t).join(',') + ')').join(',') + ')';
            const a = useLog ? Math.pow(10, llo) : lo, b = hi;
            this.colorbar.append(el('span', 'jnote', fmt(a)), bar, el('span', 'jnote', fmt(b) + " " + QUANT[this.quantity].unit));
            const s = sv.s;
            if (s.average) this.timeLabel.textContent = "average of the last " + s.average + " steps (n ≤ " + s.n + ")";
            else this.timeLabel.textContent = "n = " + s.n + (r.info && r.info.dt ? "  (t = " + fmt(s.n * r.info.dt) + " s)" : r.info && r.info.dtT ? "  (t = " + fmt(s.n * r.info.dtT / 60) + " min)" : "");
        } else {
            const present = new Set();
            for (let v = 0; v < H; v++) for (let u = 0; u < W; u++) present.add(r.codes[g.index(u, v)]);
            for (const m of r.materials) {
                if (!present.has(m.code)) continue;
                const it = el('span', 'viewer-legend-item');
                const sw = el('span', 'swatch'); sw.style.background = 'rgb(' + m.color.join(',') + ')';
                it.append(sw, m.name);
                this.legend.appendChild(it);
            }
            if (r.snapshots.length) this.timeLabel.textContent = "n = " + r.snapshots[Math.min(this.snapIndex, r.snapshots.length - 1)].n;
        }
        this.drawChart();
    }

    hover(e) {
        if (!this.geom || !this.current) return;
        const rect = this.canvas.getBoundingClientRect();
        const u = Math.floor((e.clientX - rect.left) / this.geom.scaleX);
        const v = Math.floor((e.clientY - rect.top) / this.geom.scaleY);
        const { g, sv, names } = this.geom;
        if (u < 0 || v < 0 || u >= g.W || v >= g.H) return;
        const p = g.index(u, v);
        const c = g.coords(u, v);
        let t = "(" + c.join(", ") + ")  " + (names.get(this.current.codes[p]) || "?");
        if (sv) t += "   " + QUANT[this.quantity].label.split(' ')[0] + " = " + fmt(sv.v[p]) + " " + QUANT[this.quantity].unit;
        this.readout.textContent = t;
    }

    drawChart() {
        const r = this.current;
        if (!r || !r.series || !r.series.length) return;
        const W = Math.max(200, Math.min(560, (this.chartWrap.clientWidth || 480) - 4)), H = 170;
        const dpr = window.devicePixelRatio || 1;
        this.chart.width = W * dpr; this.chart.height = H * dpr;
        this.chart.style.width = W + 'px'; this.chart.style.height = H + 'px';
        const ctx = this.chart.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, W, H);
        const s = r.series;
        const dtT = (r.info && r.info.dtT) || 1;
        const xs = s.map(p => p.n * dtT / 60);
        let lo = Infinity, hi = -Infinity;
        for (const p of s) { lo = Math.min(lo, p.min); hi = Math.max(hi, p.max); }
        if (hi - lo < 1e-9) { hi += 0.5; lo -= 0.5; }
        const L = 52, R = 10, T = 8, B = 26;
        const X = (x) => L + (W - L - R) * (xs.length > 1 ? (x - xs[0]) / (xs[xs.length - 1] - xs[0] || 1) : 0.5);
        const Y = (y) => T + (H - T - B) * (1 - (y - lo) / (hi - lo));
        ctx.strokeStyle = '#c9d1db'; ctx.lineWidth = 1; ctx.font = '10px sans-serif'; ctx.fillStyle = '#333';
        for (let i = 0; i <= 4; i++) {
            const y = lo + (hi - lo) * i / 4;
            ctx.beginPath(); ctx.moveTo(L, Y(y) + 0.5); ctx.lineTo(W - R, Y(y) + 0.5); ctx.stroke();
            ctx.textAlign = 'right'; ctx.fillText(fmt(y), L - 4, Y(y) + 3);
        }
        ctx.textAlign = 'center';
        ctx.fillText('0', X(xs[0]), H - 12);
        ctx.fillText(fmt(xs[xs.length - 1]) + ' min', X(xs[xs.length - 1]) - 14, H - 12);
        const series = [['max', '#c0392b'], ['avg', '#2d6db5'], ['min', '#2a8a4a']];
        for (const [k, col] of series) {
            ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath();
            s.forEach((p, i) => { const x = X(xs[i]), y = Y(p[k]); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
            ctx.stroke();
        }
        // legend
        ctx.textAlign = 'left';
        let lx = L + 6;
        for (const [k, col] of series) {
            ctx.fillStyle = col; ctx.fillRect(lx, T + 4, 12, 3);
            ctx.fillStyle = '#333'; ctx.fillText(k, lx + 15, T + 9);
            lx += 46;
        }
        const last = s[s.length - 1];
        this.chart.setAttribute('aria-label', 'Tissue temperature over time; last saved step: min ' + fmt(last.min) + ', average ' + fmt(last.avg) + ', max ' + fmt(last.max) + ' degrees C');
    }

    togglePlay() {
        if (this.playing) { this.stop(); return; }
        const r = this.current;
        if (!r || r.snapshots.length < 2) return;
        this.playBtn.textContent = '■';
        if (this.snapIndex >= r.snapshots.length - 1) this.snapIndex = 0;
        this.playing = setInterval(async () => {
            if (this.snapIndex >= this.current.snapshots.length - 1) { this.stop(); return; }
            this.snapIndex++;
            await this.draw();
        }, 350);
    }
    stop() {
        if (this.playing) clearInterval(this.playing);
        this.playing = null;
        if (this.playBtn) this.playBtn.textContent = '▶';
    }

    /**
     * Opens a FieldModel (.3df) written by the calculations: reads its
     * material model (.3dm + .dat) and lists the saved steps.
     */
    async loadResultsFile(path) {
        const dir = path.substring(0, path.lastIndexOf('/') + 1);
        const fm = new SAXBuilder().build(await ResultsDisk.readText(path)).getRootElement();
        if (fm.getName() !== 'FieldModel') throw new Error(path + " is not a FieldModel (.3df) file");
        const dims = fm.getAttributeValue('dimention').split(',').map(Number);
        const deltas = fm.getAttributeValue('deltas').split(',').map(Number);
        const data = fm.getChild('data');
        const prefix = data.getAttributeValue('prefix');
        const units = fm.getAttributeValue('units') || '';
        const q = /T \[/.test(units) ? 'T' : /H \[/.test(units) ? 'H' : 'E';
        const skip = +data.getAttributeValue('sufixIncrement') || 1;
        const mmPath = dir + fm.getChild('MaterialModel').getAttributeValue('location');
        const mm = new SAXBuilder().build(await ResultsDisk.readText(mmPath)).getRootElement();
        const materials = mm.getChild('materials').getChildren('material').map(m => ({
            code: +m.getAttributeValue('code'), name: m.getAttributeValue('name'), color: m.getAttributeValue('color').split(',').map(Number),
        }));
        const datText = await ResultsDisk.readText(dir + mm.getChild('datafile').getAttributeValue('name'));
        const codes = new Uint8Array(dims[0] * dims[1] * dims[2]);
        { const re = /\S+/g; let m, k = 0; while (k < codes.length && (m = re.exec(datText)) !== null) codes[k++] = +m[0]; }
        const files = (await ResultsDisk.list()).map(f => f.path).filter(p => p.startsWith(dir + prefix));
        const steps = files.map(p => ({ p, n: +p.substring((dir + prefix).length) })).filter(s => Number.isInteger(s.n)).sort((a, b) => a.n - b.n);
        const run = {
            kind: q === 'T' ? 'T' : 'EH', fromFile: true, name: path.substring(dir.length), dims, deltas, codes, materials,
            quantities: [q], series: [], finished: true, info: {},
            snapshots: steps.map(s => ({ n: s.n, fields: {}, paths: { [q]: s.p } })),
        };
        if (q === 'T') {
            // the TMinAvMax file (of the last T run: 2010 gave it no run name)
            try {
                const lines = (await ResultsDisk.readText(dir + 'TMinAvMax.txt')).trim().split('\n');
                run.series = lines.slice(1).map((l, i) => { const [mn, av, mx] = l.trim().split(/\s+/).map(Number); return { n: i * skip, min: mn, avg: av, max: mx }; });
                run.info.dtT = 1;
            } catch (e) { /* no curve */ }
        }
        this.loaded = this.loaded.filter(r => r.name !== run.name);
        this.loaded.push(run);
        this.setRun(run);
        this.setVisible(true);
    }

    dispose() {
        this.stop();
        if (this.unsub) this.unsub();
        super.dispose();
    }
}
