/*
 * ResultsStore.js  -  CelCamp Phoenix (2026)
 *
 * Keeps the snapshots of the current session in memory (as Float32Arrays on
 * the original - not expanded - grid) so the Field Viewer can show them
 * while a calculation is still running.  The files written to results/ are
 * the permanent record; this is only a cache with a memory budget.
 */
export const ResultsStore = {
    runs: [],
    budgetBytes: 768 * 1024 * 1024,
    listeners: new Set(),
    nextId: 1,

    onChange(cb) { this.listeners.add(cb); return () => this.listeners.delete(cb); },
    _changed(run) { for (const cb of this.listeners) { try { cb(run); } catch (e) { console.error(e); } } },

    /**
     * kind: 'EH' | 'T' | 'model';  dims: [nx,ny,nz] cells; codes: Uint8Array (nx*ny*nz)
     * materials: [{code, name, color:[r,g,b]}]; deltas: [dx,dy,dz]
     */
    newRun({ kind, name, dims, deltas, codes, materials, info, sources }) {
        const run = { id: this.nextId++, kind, name, dims, deltas, codes, materials, info: info || {}, sources: sources || [], snapshots: [], series: [], started: Date.now(), finished: false };
        this.runs.push(run);
        this._changed(run);
        return run;
    },

    addSnapshot(run, n, fields) {
        const f32 = {};
        for (const k in fields) f32[k] = fields[k] instanceof Float32Array ? fields[k] : Float32Array.from(fields[k]);
        run.snapshots.push({ n, fields: f32 });
        this._evict();
        this._changed(run);
    },

    addSeries(run, n, values) {
        run.series.push({ n, ...values });
        this._changed(run);
    },

    finish(run, info) {
        run.finished = true;
        if (info) Object.assign(run.info, info);
        this._changed(run);
    },

    remove(run) {
        this.runs = this.runs.filter(r => r !== run);
        this._changed(null);
    },

    bytes() {
        let b = 0;
        for (const r of this.runs) for (const s of r.snapshots) for (const k in s.fields) b += s.fields[k].byteLength;
        return b;
    },

    _evict() {
        // drop the oldest snapshots (keeping the newest of every run) until within budget
        while (this.bytes() > this.budgetBytes) {
            let victim = null;
            for (const r of this.runs) if (r.snapshots.length > 1 && (!victim || r.snapshots.length > victim.snapshots.length)) victim = r;
            if (!victim) break;
            victim.snapshots.shift();
            victim.evicted = (victim.evicted || 0) + 1;
        }
    },
};
