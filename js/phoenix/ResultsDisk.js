/*
 * ResultsDisk.js  -  CelCamp Phoenix (2026)
 *
 * In 2007 every calculation wrote its results as text files to
 * CelCampJava_v1.0/results/ ("GRAVA RESPOSTA EM DISCO").  In the browser the
 * same files are written to the Origin Private File System (OPFS), through a
 * dedicated worker so that formatting millions of numbers never blocks the
 * user interface.  When OPFS is not available (or in the Node tests) the
 * files are kept in memory.
 *
 * Write calls are fire-and-forget (like the Java PrintWriters); call
 * `await ResultsDisk.flush()` to wait for them.
 */
import { doubleToString } from '../JavaFormat.js';

function normalize(path) {
    return path.replace(/^\/+/, '').replace(/\/+/g, '/');
}

/** Formats a matrix like the 2007 PrintWriter loops: one line per row,
 *  every value followed by a space. */
export function formatMatrixRow(values, start, len) {
    let s = "";
    for (let q = start; q < start + len; q++) s += doubleToString(values[q]) + " ";
    return s + "\n";
}

class MemoryBackend {
    constructor() { this.files = new Map(); }
    writeText(path, text) { this.files.set(path, { chunks: [text], mtime: Date.now() }); }
    writeMatrix(path, values, rows, rowLen) { this.files.set(path, { matrix: { values, rows, rowLen }, mtime: Date.now() }); }
    open(path) { this.files.set(path, { chunks: [], mtime: Date.now() }); }
    append(path, text) {
        let f = this.files.get(path);
        if (!f) { f = { chunks: [], mtime: Date.now() }; this.files.set(path, f); }
        if (!f.chunks) f.chunks = [this._text(f)];
        f.chunks.push(text); f.mtime = Date.now();
    }
    close() {}
    _text(f) {
        if (f.chunks) return f.chunks.join("");
        const { values, rows, rowLen } = f.matrix;
        let s = "";
        for (let r = 0; r < rows; r++) s += formatMatrixRow(values, r * rowLen, rowLen);
        return s;
    }
    _size(f) {
        if (f.chunks) return f.chunks.reduce((a, c) => a + c.length, 0);
        return f.matrix.values.length * 10; // estimate
    }
    async flush() {}
    async list() {
        return [...this.files.entries()].map(([path, f]) => ({ path, size: this._size(f), mtime: f.mtime }))
            .sort((a, b) => a.path.localeCompare(b.path));
    }
    async readText(path) {
        const f = this.files.get(normalize(path));
        if (!f) throw new Error("O arquivo " + path + " nao foi encontrado!!");
        return this._text(f);
    }
    async readBlob(path) { return new Blob([await this.readText(path)], { type: "text/plain" }); }
    async remove(path) { this.files.delete(normalize(path)); }
    async removeAll() { this.files.clear(); }
    async usage() { const l = await this.list(); return l.reduce((a, f) => a + f.size, 0); }
    get kind() { return "memory"; }
}

class OPFSBackend {
    constructor() {
        this.worker = new Worker(new URL('./ResultsDiskWorker.js', import.meta.url), { type: 'module', name: 'ResultsDisk' });
        this.nextId = 1;
        this.pending = new Map();
        this.worker.onmessage = (ev) => {
            const { id, result, error } = ev.data;
            const p = this.pending.get(id);
            if (!p) return;
            this.pending.delete(id);
            if (error) p.reject(new Error(error)); else p.resolve(result);
        };
        this.lastError = null;
    }
    _call(msg, transfer) {
        const id = this.nextId++;
        msg.id = id;
        const pr = new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
        pr.catch(e => { this.lastError = e; console.error("ResultsDisk:", e); });
        this.worker.postMessage(msg, transfer || []);
        return pr;
    }
    writeText(path, text) { this._call({ op: 'writeText', path, text }); }
    writeMatrix(path, values, rows, rowLen) {
        const copy = new Float64Array(values); // the caller keeps its own array
        this._call({ op: 'writeMatrix', path, values: copy, rows, rowLen }, [copy.buffer]);
    }
    open(path) { this._call({ op: 'open', path }); }
    append(path, text) { this._call({ op: 'append', path, text }); }
    close(path) { this._call({ op: 'close', path }); }
    flush() { return this._call({ op: 'flush' }); }
    list() { return this._call({ op: 'list' }); }
    readText(path) { return this._call({ op: 'readText', path: normalize(path) }); }
    async readBlob(path) { return this._call({ op: 'readBlob', path: normalize(path) }); }
    remove(path) { return this._call({ op: 'remove', path: normalize(path) }); }
    removeAll() { return this._call({ op: 'removeAll' }); }
    async usage() { const l = await this.list(); return l.reduce((a, f) => a + f.size, 0); }
    get kind() { return "opfs"; }
}

function chooseBackend() {
    try {
        if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.getDirectory &&
            typeof Worker !== 'undefined' && typeof window !== 'undefined' && window.isSecureContext)
            return new OPFSBackend();
    } catch (e) {
        console.warn("ResultsDisk: OPFS unavailable, keeping results in memory.", e);
    }
    return new MemoryBackend();
}

let backend = null;
function b() { if (!backend) backend = chooseBackend(); return backend; }

export const ResultsDisk = {
    /** When false, the calculation frames skip writing result files. */
    enabled: true,
    get kind() { return b().kind; },
    useMemory() { backend = new MemoryBackend(); },
    writeText(path, text) { if (this.enabled) b().writeText(normalize(path), text); },
    writeMatrix(path, values, rows, rowLen) { if (this.enabled) b().writeMatrix(normalize(path), values, rows, rowLen); },
    open(path) { if (this.enabled) b().open(normalize(path)); },
    append(path, text) { if (this.enabled) b().append(normalize(path), text); },
    close(path) { if (this.enabled) b().close(normalize(path)); },
    flush() { return b().flush(); },
    list() { return b().list(); },
    readText(path) { return b().readText(path); },
    readBlob(path) { return b().readBlob(path); },
    remove(path) { return b().remove(path); },
    removeAll() { return b().removeAll(); },
    usage() { return b().usage(); },
};
