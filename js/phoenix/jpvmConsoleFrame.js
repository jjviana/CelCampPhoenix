/*
 * jpvmConsoleFrame.js  -  CelCamp Phoenix (2026)
 *
 * The 2006 `java jpvm/jpvmConsole` (commands "conf", "ps", "add host"),
 * as a window: the tasks of the virtual machine and their log files.
 */
import { JFrame } from '../swing/JFrame.js';
import { el } from '../swing/swing.js';
import { jpvmDaemon } from '../jpvm/jpvmDaemon.js';

export class jpvmConsoleFrame extends JFrame {
    constructor() {
        super("jpvm Console");
        this.daemon = jpvmDaemon.get();
        const cp = this.getContentPane();
        cp.classList.add('jpvmconsole');
        const cores = (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || '?';
        this.conf = el('pre', 'jpvm-pre', "jpvm> conf\n  1 host: " + this.daemon.host + " (" + cores + " logical processors)\n");
        this.ps = el('pre', 'jpvm-pre');
        const logRow = el('div', 'jrow');
        this.logSel = el('select', 'jcombo'); this.logSel.setAttribute('aria-label', 'Log file');
        const clear = el('button', 'jbutton', 'Remove finished tasks'); clear.type = 'button';
        clear.addEventListener('click', () => this.daemon.clearFinished());
        logRow.append(el('span', 'jlabel', 'Log file:'), this.logSel, clear);
        this.log = el('pre', 'jpvm-pre jpvm-log');
        cp.append(this.conf, this.ps, logRow, this.log);
        this.logSel.addEventListener('change', () => this.showLog());
        let pending = false;
        this.unsub = this.daemon.onChange(() => {
            if (pending) return;
            pending = true;
            setTimeout(() => { pending = false; if (this.visible) this.update(); }, 250);
        });
        this.update();
        this.timer = setInterval(() => { if (this.visible) this.update(); }, 1000);
    }

    setVisible(b) { super.setVisible(b); if (b) this.update(); }

    update() {
        const now = Date.now();
        let s = "jpvm> ps\n  " + "tid".padEnd(28) + "task".padEnd(26) + "status".padEnd(9) + "time\n";
        for (const t of this.daemon.tasks.values()) {
            const secs = (((t.ended || now) - t.started) / 1000).toFixed(1) + "s";
            s += "  " + (t.tid.getHost() + ", port #" + t.tid.getPort()).padEnd(28) + String(t.name).padEnd(26) + t.status.padEnd(9) + secs + "\n";
        }
        this.ps.textContent = s;
        const names = [...this.daemon.logs.keys()];
        const cur = this.logSel.value;
        if (names.join('|') !== this.lastNames) {
            this.lastNames = names.join('|');
            this.logSel.innerHTML = '';
            for (const n of names) { const o = el('option', null, n); o.value = n; this.logSel.appendChild(o); }
            if (names.includes(cur)) this.logSel.value = cur;
            else if (names.length) this.logSel.value = names[names.length - 1];
        }
        this.showLog();
    }

    showLog() {
        const txt = this.daemon.logs.get(this.logSel.value) || "";
        const atBottom = this.log.scrollTop + this.log.clientHeight >= this.log.scrollHeight - 10;
        this.log.textContent = txt.length > 20000 ? "...\n" + txt.substring(txt.length - 20000) : txt;
        if (atBottom) this.log.scrollTop = this.log.scrollHeight;
    }

    dispose() {
        clearInterval(this.timer);
        if (this.unsub) this.unsub();
        super.dispose();
    }
}
