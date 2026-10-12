/*
 * ResultsDiskWorker.js  -  CelCamp Phoenix (2026)
 *
 * Writes the result files to the Origin Private File System using
 * synchronous access handles (only available inside workers).
 * Operations are executed strictly in the order they arrive.
 */
import { formatMatrixRow } from './ResultsDisk.js';

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const openHandles = new Map(); // path -> { handle, offset }
let root = null;

async function getRoot() {
    if (!root) root = await navigator.storage.getDirectory();
    return root;
}

async function getFileHandle(path, create) {
    const parts = path.split('/').filter(p => p.length);
    let dir = await getRoot();
    for (let i = 0; i < parts.length - 1; i++)
        dir = await dir.getDirectoryHandle(parts[i], { create });
    return dir.getFileHandle(parts[parts.length - 1], { create });
}

async function openSync(path) {
    const fh = await getFileHandle(path, true);
    const handle = await fh.createSyncAccessHandle();
    handle.truncate(0);
    return { handle, offset: 0 };
}

function write(h, text) {
    const bytes = encoder.encode(text);
    h.handle.write(bytes, { at: h.offset });
    h.offset += bytes.byteLength;
}

async function closePath(path) {
    const h = openHandles.get(path);
    if (h) { h.handle.flush(); h.handle.close(); openHandles.delete(path); }
}

async function writeText(path, text) {
    await closePath(path);
    const h = await openSync(path);
    write(h, text);
    h.handle.flush(); h.handle.close();
}

async function writeMatrix(path, values, rows, rowLen) {
    await closePath(path);
    const h = await openSync(path);
    let buf = "";
    for (let r = 0; r < rows; r++) {
        buf += formatMatrixRow(values, r * rowLen, rowLen);
        if (buf.length > (1 << 22)) { write(h, buf); buf = ""; }
    }
    if (buf.length) write(h, buf);
    h.handle.flush(); h.handle.close();
}

async function listDir(dir, prefix, out) {
    for await (const [name, handle] of dir.entries()) {
        const path = prefix ? prefix + "/" + name : name;
        if (handle.kind === 'directory') await listDir(handle, path, out);
        else {
            const h = openHandles.get(path);
            if (h) out.push({ path, size: h.offset, mtime: Date.now(), open: true });
            else {
                const f = await handle.getFile();
                out.push({ path, size: f.size, mtime: f.lastModified });
            }
        }
    }
}

async function readOpen(path) {
    const h = openHandles.get(path);
    const bytes = new Uint8Array(h.offset);
    h.handle.read(bytes, { at: 0 });
    return bytes;
}

const ops = {
    writeText: (m) => writeText(m.path, m.text),
    writeMatrix: (m) => writeMatrix(m.path, m.values, m.rows, m.rowLen),
    open: async (m) => { await closePath(m.path); openHandles.set(m.path, await openSync(m.path)); },
    append: async (m) => {
        let h = openHandles.get(m.path);
        if (!h) {
            // append to an existing file
            const fh = await getFileHandle(m.path, true);
            const handle = await fh.createSyncAccessHandle();
            h = { handle, offset: handle.getSize() };
            openHandles.set(m.path, h);
        }
        write(h, m.text);
    },
    close: (m) => closePath(m.path),
    flush: async () => { for (const h of openHandles.values()) h.handle.flush(); },
    list: async () => { const out = []; await listDir(await getRoot(), "", out); return out.sort((a, b) => a.path.localeCompare(b.path)); },
    readText: async (m) => {
        if (openHandles.has(m.path)) return decoder.decode(await readOpen(m.path));
        return (await (await getFileHandle(m.path, false)).getFile()).text();
    },
    readBlob: async (m) => {
        if (openHandles.has(m.path)) return new Blob([await readOpen(m.path)], { type: 'text/plain' });
        return (await getFileHandle(m.path, false)).getFile();
    },
    remove: async (m) => {
        await closePath(m.path);
        const parts = m.path.split('/');
        let dir = await getRoot();
        for (let i = 0; i < parts.length - 1; i++) dir = await dir.getDirectoryHandle(parts[i]);
        await dir.removeEntry(parts[parts.length - 1]);
    },
    removeAll: async () => {
        for (const p of [...openHandles.keys()]) await closePath(p);
        const r = await getRoot();
        for await (const [name] of r.entries()) await r.removeEntry(name, { recursive: true });
    },
};

let chain = Promise.resolve();
self.onmessage = (ev) => {
    const m = ev.data;
    chain = chain.then(async () => {
        try {
            const result = await ops[m.op](m);
            self.postMessage({ id: m.id, result });
        } catch (e) {
            self.postMessage({ id: m.id, error: (m.path ? m.path + ": " : "") + (e && e.message || String(e)) });
        }
    });
};
