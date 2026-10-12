/*
 * ResultsFrame.js  -  CelCamp Phoenix (2026)
 *
 * The results/ folder: the files written by the calculations (kept in the
 * browser by ResultsDisk), to download, open in the viewer or delete.
 */
import { JFrame, JOptionPane } from '../swing/JFrame.js';
import { el } from '../swing/swing.js';
import { ResultsDisk } from './ResultsDisk.js';

function fmtSize(b) {
    if (b > 1024 * 1024 * 1024) return (b / 1024 / 1024 / 1024).toFixed(2) + " GB";
    if (b > 1024 * 1024) return (b / 1024 / 1024).toFixed(1) + " MB";
    if (b > 1024) return (b / 1024).toFixed(1) + " KB";
    return b + " B";
}

export class ResultsFrame extends JFrame {
    constructor(openInViewer) {
        super("Results Folder (results/)");
        this.openInViewer = openInViewer;
        const cp = this.getContentPane();
        cp.classList.add('resultsframe');
        this.info = el('div', 'jnote results-info');
        const bar = el('div', 'jrow');
        const refresh = el('button', 'jbutton', 'Refresh'); refresh.type = 'button';
        const delAll = el('button', 'jbutton', 'Delete all'); delAll.type = 'button';
        this.filter = el('input', 'jtextfield'); this.filter.type = 'search'; this.filter.placeholder = 'filter'; this.filter.setAttribute('aria-label', 'Filter files');
        bar.append(refresh, delAll, this.filter);
        this.list = el('div', 'results-list');
        cp.append(this.info, bar, this.list);
        refresh.addEventListener('click', () => this.refresh());
        this.filter.addEventListener('input', () => this.render());
        delAll.addEventListener('click', async () => {
            const a = await JOptionPane.showConfirmDialog(this, "Apagar todos os arquivos de results/?", "Delete all", JOptionPane.YES_NO_OPTION);
            if (a === 0) { await ResultsDisk.removeAll(); this.refresh(); }
        });
        this.files = [];
    }

    async refresh() {
        try {
            this.files = await ResultsDisk.list();
        } catch (e) {
            this.files = [];
            this.info.textContent = "Could not read the results folder: " + e.message;
            return;
        }
        const total = this.files.reduce((a, f) => a + f.size, 0);
        let quota = "";
        try {
            if (navigator.storage && navigator.storage.estimate) {
                const est = await navigator.storage.estimate();
                if (est.quota) quota = " — browser quota " + fmtSize(est.quota);
            }
        } catch (e) { /* ignore */ }
        this.info.textContent = this.files.length + " files, " + fmtSize(total) +
            (ResultsDisk.kind === 'opfs' ? " in the browser's private file system" : " in memory (lost when the page is closed)") + quota + ".";
        this.render();
    }

    render() {
        const q = this.filter.value.trim().toLowerCase();
        this.list.innerHTML = '';
        const files = this.files.filter(f => !q || f.path.toLowerCase().includes(q));
        if (!files.length) { this.list.appendChild(el('div', 'jnote results-empty', this.files.length ? 'No file matches.' : 'Nothing yet: run a calculation (Calculate menu).')); return; }
        const table = el('table', 'results-table');
        const head = el('tr');
        head.append(el('th', null, 'File'), el('th', null, 'Size'), el('th', null, ''));
        table.appendChild(head);
        for (const f of files) {
            const tr = el('tr');
            const actions = el('td', 'results-actions');
            const dl = el('button', 'jbutton small', 'Download'); dl.type = 'button';
            dl.addEventListener('click', () => this.download(f.path));
            actions.appendChild(dl);
            if (f.path.endsWith('.3df')) {
                const v = el('button', 'jbutton small', 'View'); v.type = 'button';
                v.addEventListener('click', async () => {
                    try { await this.openInViewer(f.path); }
                    catch (e) { JOptionPane.showMessageDialog(this, e.message, "Viewer", JOptionPane.ERROR_MESSAGE); }
                });
                actions.appendChild(v);
            }
            const del = el('button', 'jbutton small', 'Delete'); del.type = 'button';
            del.addEventListener('click', async () => { await ResultsDisk.remove(f.path); this.refresh(); });
            actions.appendChild(del);
            tr.append(el('td', 'results-path', f.path + (f.open ? '  (being written)' : '')), el('td', 'results-size', fmtSize(f.size)), actions);
            table.appendChild(tr);
        }
        this.list.appendChild(table);
    }

    async download(path) {
        const blob = await ResultsDisk.readBlob(path);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = path.substring(path.lastIndexOf('/') + 1);
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
}
