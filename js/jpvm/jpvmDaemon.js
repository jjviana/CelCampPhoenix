/*
 * jpvmDaemon.js  -  CelCamp Phoenix (2026)
 *
 * In 2007 one had to open a shell and run `java jpvm.jpvmDaemon` on every
 * machine, then add the hosts with `jpvmConsole`.  Here the daemon is an
 * object living in the page: it hands out task ids, starts the workers,
 * wires the MessageChannels between them and keeps the tasks' log files
 * (the old "LOG:host:port.log" and "ERROR:host:port.log").
 *
 * The JPVM Console window (js/phoenix/jpvmConsoleFrame.js) shows its state.
 */
import { jpvmTaskId } from './jpvmTaskId.js';
import { jpvmEnvironment } from './jpvmEnvironment.js';

const isNode = typeof process !== 'undefined' && process.versions && process.versions.node && typeof window === 'undefined';

/** How a task is started: a Web Worker in the browser, a worker thread in Node. */
async function createWorker(taskName, port) {
    const url = new URL('./jpvmTask.js', import.meta.url);
    if (isNode) {
        const { Worker } = await import('node:worker_threads');
        const w = new Worker(url, { name: taskName + "@" + port });
        return {
            postMessage: (m, t) => w.postMessage(m, t),
            terminate: () => w.terminate(),
            onError: (cb) => { w.on('error', e => cb(e && e.stack || String(e))); },
            unref: () => w.unref(),
        };
    }
    const w = new Worker(url, { type: 'module', name: taskName + "@" + port });
    return {
        postMessage: (m, t) => w.postMessage(m, t),
        terminate: () => w.terminate(),
        onError: (cb) => { w.onerror = (e) => { e.preventDefault && e.preventDefault(); cb((e.message || "error") + (e.filename ? " (" + e.filename + ":" + e.lineno + ")" : "")); }; },
        unref: () => {},
    };
}

export class jpvmDaemon {

    static instance = null;
    static get() {
        if (!jpvmDaemon.instance) jpvmDaemon.instance = new jpvmDaemon();
        return jpvmDaemon.instance;
    }

    constructor() {
        this.host = (typeof location !== 'undefined' && location.hostname) ? location.hostname : "localhost";
        this.nextPort = 32871;   // the port printed by the 2007 daemon in the Readme :)
        this.tasks = new Map();  // port -> task record
        this.logs = new Map();   // file name -> text
        this.listeners = new Set();
        this.maxLogLength = 200000;
    }

    onChange(cb) { this.listeners.add(cb); return () => this.listeners.delete(cb); }
    _changed(what) { for (const cb of this.listeners) { try { cb(what); } catch (e) { console.error(e); } } }

    register(env, name) {
        const tid = new jpvmTaskId(this.host, this.nextPort++);
        this.tasks.set(tid.getPort(), { tid, name, status: "running", env, parent: null, started: Date.now() });
        this._changed("tasks");
        return tid;
    }

    unregister(env) {
        const t = this.tasks.get(env.myTid.getPort());
        if (t) { t.status = "exited"; t.ended = Date.now(); }
        this._changed("tasks");
    }

    async spawn(parentEnv, taskName, num) {
        const tids = [];
        for (let i = 0; i < num; i++) tids.push(new jpvmTaskId(this.host, this.nextPort++));
        const peers = tids.map(() => []);
        // parent <-> every slave
        tids.forEach((tid, s) => {
            const ch = new MessageChannel();
            parentEnv._attach(tid.getPort(), ch.port1);
            peers[s].push({ port: parentEnv.myTid.getPort(), messagePort: ch.port2 });
        });
        // every slave <-> every other slave (like JPVM's direct connections)
        for (let a = 0; a < num; a++) {
            for (let b = a + 1; b < num; b++) {
                const ch = new MessageChannel();
                peers[a].push({ port: tids[b].getPort(), messagePort: ch.port1 });
                peers[b].push({ port: tids[a].getPort(), messagePort: ch.port2 });
            }
        }
        for (let s = 0; s < num; s++) {
            const tid = tids[s];
            const control = new MessageChannel();
            const rec = { tid, name: taskName, status: "running", parent: parentEnv.myTid, started: Date.now(), worker: null, control: control.port1, parentEnv };
            this.tasks.set(tid.getPort(), rec);
            control.port1.onmessage = (ev) => this._control(rec, ev.data);
            const worker = await createWorker(taskName, tid.getPort());
            rec.worker = worker;
            worker.onError((msg) => this._died(rec, msg));
            const transfer = peers[s].map(p => p.messagePort).concat([control.port2]);
            worker.postMessage({
                kind: 'init', taskName, mytid: tid.toJSON(), parent: parentEnv.myTid.toJSON(),
                peers: peers[s], control: control.port2,
            }, transfer);
        }
        this._changed("tasks");
        return tids;
    }

    _control(rec, m) {
        if (m.kind === 'log') {
            this.log(rec.tid, m.file, m.text, m.append);
        } else if (m.kind === 'exit') {
            rec.status = "exited"; rec.ended = Date.now();
            this._changed("tasks");
            // give in-flight messages time to leave before stopping the worker
            setTimeout(() => this._stop(rec), 2000);
        } else if (m.kind === 'error') {
            this._died(rec, m.message);
        }
    }

    _died(rec, msg) {
        if (rec.status !== "running") return;
        rec.status = "error"; rec.ended = Date.now(); rec.error = msg;
        this.log(rec.tid, "ERROR:" + rec.tid.getHost() + ":" + rec.tid.getPort() + ".log", msg + "\n", true);
        if (rec.parentEnv) rec.parentEnv._taskDied(rec.tid, msg);
        this._stop(rec);
        this._changed("tasks");
    }

    _stop(rec) {
        if (rec.worker) { try { rec.worker.terminate(); } catch (e) { /* ignore */ } rec.worker = null; }
        if (rec.control) { try { rec.control.close(); } catch (e) { /* ignore */ } rec.control = null; }
    }

    kill(tid) {
        const rec = this.tasks.get(tid.getPort());
        if (!rec || rec.status !== "running") return;
        rec.status = "killed"; rec.ended = Date.now();
        this._stop(rec);
        if (rec.parentEnv) rec.parentEnv._taskDied(rec.tid, "killed");
        this._changed("tasks");
    }

    /** Virtual log files. append=false overwrites (new FileOutputStream in 2007). */
    log(tid, file, text, append) {
        let cur = append ? (this.logs.get(file) || "") : "";
        cur += text;
        if (cur.length > this.maxLogLength) cur = "...\n" + cur.substring(cur.length - this.maxLogLength);
        this.logs.set(file, cur);
        this._changed("logs");
    }

    clearFinished() {
        for (const [port, t] of this.tasks) if (t.status !== "running") this.tasks.delete(port);
        this._changed("tasks");
    }
}

jpvmEnvironment.daemonProvider = () => jpvmDaemon.get();
