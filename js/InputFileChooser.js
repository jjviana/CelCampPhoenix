/*
 * InputFileChooser.js
 *
 * Created on August 26, 2004, 3:25 PM   (InputFileChooser.java)
 * Ported to JavaScript in 2026 (CelCamp Phoenix).
 *
 * @author  juliano
 *
 * In 2004 this was a JFileChooser opened in CurrentDir. A web page cannot
 * browse the disk, so the chooser offers three places:
 *   - the models that come with CelCamp Phoenix (models/),
 *   - the results/ folder written by previous calculations,
 *   - files from this computer.
 */
import { hasDOM, el } from './swing/swing.js';
import { ResultsDisk } from './phoenix/ResultsDisk.js';

const MODELS = new URL('../models/', import.meta.url);

/** Reads a model data file, gunzipping it when its name ends with .gz */
export async function fetchModelFile(name) {
    const resp = await fetch(new URL(name, MODELS));
    if (!resp.ok) throw new Error("O arquivo " + name + " nao foi encontrado!! (" + resp.status + ")");
    if (name.endsWith('.gz')) {
        const ds = resp.body.pipeThrough(new DecompressionStream('gzip'));
        return new Uint8Array(await new Response(ds).arrayBuffer());
    }
    return new Uint8Array(await resp.arrayBuffer());
}

async function readLocal(file) {
    if (file.name.endsWith('.gz')) {
        const ds = file.stream().pipeThrough(new DecompressionStream('gzip'));
        return new Uint8Array(await new Response(ds).arrayBuffer());
    }
    return new Uint8Array(await file.arrayBuffer());
}

let manifest = null;
async function getManifest() {
    if (!manifest) {
        try { manifest = await (await fetch(new URL('index.json', MODELS))).json(); }
        catch (e) { manifest = { models: [], tinit: [] }; }
    }
    return manifest;
}

function fmtSize(b) {
    if (b > 1024 * 1024) return (b / 1024 / 1024).toFixed(1) + " MB";
    if (b > 1024) return (b / 1024).toFixed(1) + " KB";
    return b + " B";
}

function pickLocalFiles(accept, multiple) {
    return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        if (accept) input.accept = accept;
        input.multiple = !!multiple;
        input.style.display = 'none';
        input.addEventListener('change', () => { resolve([...input.files]); input.remove(); });
        input.addEventListener('cancel', () => { resolve([]); input.remove(); });
        document.body.appendChild(input);
        input.click();
    });
}

/** A small modal list dialog; resolves with the chosen entry's value or null. */
function listDialog(title, sections) {
    return new Promise((resolve) => {
        const veil = el('div', 'joption-veil');
        const box = el('div', 'jframe jfilechooser');
        box.setAttribute('role', 'dialog');
        box.setAttribute('aria-label', title);
        const bar = el('div', 'jframe-title');
        bar.append(el('span', 'jframe-title-text', title));
        const body = el('div', 'jfilechooser-body');
        const done = (v) => { veil.remove(); document.removeEventListener('keydown', onKey); resolve(v); };
        const onKey = (e) => { if (e.key === 'Escape') done(null); };
        for (const sec of sections) {
            body.appendChild(el('div', 'jfilechooser-section', sec.title));
            if (!sec.entries.length) body.appendChild(el('div', 'jnote jfilechooser-empty', sec.empty || '(empty)'));
            for (const e of sec.entries) {
                const b = el('button', 'jfilechooser-entry');
                b.type = 'button';
                const name = el('span', 'jfilechooser-name', e.label);
                b.appendChild(name);
                if (e.detail) b.appendChild(el('span', 'jfilechooser-detail', e.detail));
                b.addEventListener('click', () => done(e.value));
                body.appendChild(b);
            }
        }
        const btns = el('div', 'joption-buttons');
        const cancel = el('button', 'jbutton', 'Cancel'); cancel.type = 'button';
        cancel.addEventListener('click', () => done(null));
        btns.appendChild(cancel);
        box.append(bar, body, btns);
        veil.appendChild(box);
        document.body.appendChild(veil);
        document.addEventListener('keydown', onKey);
        (body.querySelector('button') || cancel).focus();
    });
}

export class InputFileChooser {

    /**
     * Chooses a model (*.3dm). Resolves to
     *   { name, text, readDat(filename) -> Promise<Uint8Array> }  or null (Cancel).
     */
    static async chooseModel(CurrentDir) {
        if (!hasDOM) return null;
        const man = await getManifest();
        let results = [];
        try { results = (await ResultsDisk.list()).filter(f => f.path.endsWith('.3dm')); } catch (e) { /* none */ }
        const choice = await listDialog("Open - choose a Model File (*.3dm)", [
            {
                title: "Models (CelCampJava_v1.0/)", entries: man.models.map(m => ({
                    label: m.file, detail: m.title + (m.description ? " - " + m.description : ""), value: { kind: 'bundled', m },
                })),
            },
            {
                title: "Results folder (results/)", empty: "No .3dm files yet: they are written by the calculations.",
                entries: results.map(f => ({ label: f.path, detail: fmtSize(f.size), value: { kind: 'results', path: f.path } })),
            },
            { title: "This computer", entries: [{ label: "Open local files...", detail: "Choose a .3dm and its .dat (or .dat.gz) file together", value: { kind: 'local' } }] },
        ]);
        if (!choice) return null;

        if (choice.kind === 'bundled') {
            const text = new TextDecoder('latin1').decode(await fetchModelFile(choice.m.file));
            return {
                name: choice.m.file, text,
                readDat: (filename) => fetchModelFile(choice.m.dat && choice.m.dat.replace(/\.gz$/, '') === filename ? choice.m.dat : filename),
            };
        }
        if (choice.kind === 'results') {
            const text = await ResultsDisk.readText(choice.path);
            const dir = choice.path.substring(0, choice.path.lastIndexOf('/') + 1);
            return {
                name: choice.path, text,
                readDat: async (filename) => new TextEncoder().encode(await ResultsDisk.readText(dir + filename)),
            };
        }
        const files = await pickLocalFiles('.3dm,.dat,.gz,.xml,.txt', true);
        const f3dm = files.find(f => /\.3dm$/i.test(f.name)) || files.find(f => /\.xml$/i.test(f.name));
        if (!f3dm) return null;
        const text = new TextDecoder('latin1').decode(await readLocal(f3dm));
        return {
            name: f3dm.name, text,
            readDat: async (filename) => {
                let f = files.find(x => x.name === filename) || files.find(x => x.name === filename + '.gz') ||
                        files.find(x => /\.dat(\.gz)?$/i.test(x.name));
                if (!f) {
                    // the .dat was not selected together with the .3dm: ask for it
                    const more = await pickLocalFiles('.dat,.gz,.txt', false);
                    f = more[0];
                }
                if (!f) throw new Error("O arquivo " + filename + " nao foi encontrado!!");
                return readLocal(f);
            },
        };
    }

    /** Chooses any text file. Resolves to { name, text } or null. */
    static async chooseText(title, highlight) {
        if (!hasDOM) return null;
        const man = await getManifest();
        let results = [];
        try { results = await ResultsDisk.list(); } catch (e) { /* none */ }
        const interesting = results.filter(f => !highlight || highlight.test(f.path));
        const choice = await listDialog(title, [
            { title: "Results folder (results/)", empty: "Nothing yet.", entries: interesting.map(f => ({ label: f.path, detail: fmtSize(f.size), value: { kind: 'results', path: f.path } })) },
            { title: "Models (CelCampJava_v1.0/)", entries: (man.tinit || []).map(t => ({ label: t, value: { kind: 'bundled', file: t } })) },
            { title: "This computer", entries: [{ label: "Open local file...", value: { kind: 'local' } }] },
        ]);
        if (!choice) return null;
        if (choice.kind === 'results') return { name: choice.path, text: await ResultsDisk.readText(choice.path) };
        if (choice.kind === 'bundled') return { name: choice.file, text: new TextDecoder().decode(await fetchModelFile(choice.file)) };
        const files = await pickLocalFiles(null, false);
        if (!files.length) return null;
        return { name: files[0].name, text: new TextDecoder().decode(await readLocal(files[0])) };
    }
}
