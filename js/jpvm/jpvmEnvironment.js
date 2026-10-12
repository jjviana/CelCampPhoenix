/*
 * jpvmEnvironment.js  -  CelCamp Phoenix (2026)
 *
 * The JPVM programming interface used by CelCampJava (Ferrari's JPVM, 1998),
 * re-implemented on top of Web Workers:
 *
 *   JPVM (2006)                         Phoenix (2026)
 *   ----------------------------------  ---------------------------------------
 *   jpvmDaemon running on every host    jpvmDaemon object in the page
 *   pvm_spawn() starts a new JVM        pvm_spawn() starts a Web Worker
 *   TCP connections between tasks       MessageChannels between tasks
 *   blocking pvm_recv()                 `await pvm_recv()`
 *
 * Inside a worker, `new jpvmEnvironment()` returns the environment the task
 * was started with (its parent, its own task id and its connections), just
 * like a JPVM slave enrolling in the virtual machine.
 */
import { jpvmTaskId } from './jpvmTaskId.js';
import { jpvmBuffer } from './jpvmBuffer.js';
import { jpvmMessage } from './jpvmMessage.js';
import { jpvmException } from './jpvmException.js';

export class jpvmEnvironment {

    static _workerEnv = null;   // the environment of this worker (slave side)
    static daemonProvider = null; // () => jpvmDaemon (master side, set by jpvmDaemon.js)

    constructor(taskName) {
        if (jpvmEnvironment._workerEnv) return jpvmEnvironment._workerEnv;
        // master side: enroll in the virtual machine held by the page
        if (!jpvmEnvironment.daemonProvider)
            throw new jpvmException("jpvm daemon not running (import jpvmDaemon.js)");
        this._init();
        this.daemon = jpvmEnvironment.daemonProvider();
        this.myTid = this.daemon.register(this, taskName || "master");
        this.parentTid = null;
    }

    _init() {
        this.connections = new Map(); // port number -> MessagePort
        this.queue = [];              // received, not yet consumed messages
        this.waiters = [];            // pending pvm_recv() calls
        this.exited = false;
        this.deadTasks = new Map();
    }

    /** Called by jpvmTask.js inside a worker. */
    static _setupWorker(init) {
        const env = Object.create(jpvmEnvironment.prototype);
        env._init();
        env.myTid = jpvmTaskId.from(init.mytid);
        env.parentTid = jpvmTaskId.from(init.parent);
        env.control = init.control;
        env.taskName = init.taskName;
        for (const p of init.peers) env._attach(p.port, p.messagePort);
        jpvmEnvironment._workerEnv = env;
        return env;
    }

    _attach(port, messagePort) {
        this.connections.set(port, messagePort);
        messagePort.onmessage = (ev) => this._deliver(ev.data);
    }

    _deliver(data) {
        const msg = new jpvmMessage(jpvmBuffer.fromWire(data.el), jpvmTaskId.from(data.src), data.tag);
        for (let w = 0; w < this.waiters.length; w++) {
            const waiter = this.waiters[w];
            if (this._matches(msg, waiter.tid, waiter.tag)) {
                this.waiters.splice(w, 1);
                waiter.resolve(msg);
                return;
            }
        }
        this.queue.push(msg);
    }

    _matches(msg, tid, tag) {
        if (tid != null && msg.sourceTid.getPort() !== tid.getPort()) return false;
        if (tag != null && tag !== -1 && msg.messageTag !== tag) return false;
        return true;
    }

    _args(a, b) {
        // (tid, tag) | (tid) | (tag) | ()
        let tid = null, tag = null;
        if (a instanceof jpvmTaskId) { tid = a; if (typeof b === 'number') tag = b; }
        else if (typeof a === 'number') tag = a;
        return [tid, tag];
    }

    pvm_mytid() { return this.myTid; }
    pvm_parent() { return this.parentTid; }

    /** Starts `num` tasks running the class `task_name`. Returns how many started. */
    async pvm_spawn(task_name, num, tids) {
        if (!this.daemon) throw new jpvmException("pvm_spawn: only the master can spawn tasks in Phoenix");
        const started = await this.daemon.spawn(this, task_name, num);
        for (let i = 0; i < started.length; i++) tids[i] = started[i];
        return started.length;
    }

    pvm_send(buf, tid, tag) {
        if (this.exited) throw new jpvmException("pvm_send: task has exited");
        const p = this.connections.get(tid.getPort());
        if (!p) throw new jpvmException("pvm_send: no connection to task " + tid.toString());
        p.postMessage({ src: this.myTid.toJSON(), tag: tag, el: buf.toWire() });
    }

    pvm_mcast(buf, tids, tag) {
        for (const t of tids) this.pvm_send(buf, t, tag);
    }

    /** Blocking receive -> returns a Promise<jpvmMessage>. */
    pvm_recv(a, b) {
        const [tid, tag] = this._args(a, b);
        for (let q = 0; q < this.queue.length; q++) {
            if (this._matches(this.queue[q], tid, tag)) {
                const m = this.queue[q];
                this.queue.splice(q, 1);
                return Promise.resolve(m);
            }
        }
        if (tid != null && this.deadTasks.has(tid.getPort()))
            return Promise.reject(new jpvmException("task " + tid.toString() + " died: " + this.deadTasks.get(tid.getPort())));
        return new Promise((resolve, reject) => this.waiters.push({ tid, tag, resolve, reject }));
    }

    /** Non blocking receive: the message or null. */
    pvm_nrecv(a, b) {
        const [tid, tag] = this._args(a, b);
        for (let q = 0; q < this.queue.length; q++) {
            if (this._matches(this.queue[q], tid, tag)) {
                const m = this.queue[q];
                this.queue.splice(q, 1);
                return m;
            }
        }
        return null;
    }

    pvm_probe(a, b) {
        const [tid, tag] = this._args(a, b);
        return this.queue.some(m => this._matches(m, tid, tag));
    }

    /** Called by the daemon when a task stops unexpectedly (Phoenix). */
    _taskDied(tid, reason) {
        this.deadTasks.set(tid.getPort(), reason);
        const keep = [];
        for (const w of this.waiters) {
            if (w.tid == null || w.tid.getPort() === tid.getPort())
                w.reject(new jpvmException("task " + tid.toString() + " died: " + reason));
            else keep.push(w);
        }
        this.waiters = keep;
    }

    /** Phoenix: stops the given tasks (used by the Cancel buttons). */
    pvm_kill(tids) {
        if (this.daemon) for (const t of tids) if (t) this.daemon.kill(t);
    }

    /** Appends (or writes) text to one of this task's log files. */
    log(fileName, text, append) {
        if (this.daemon) this.daemon.log(this.myTid, fileName, text, append);
        else if (this.control) this.control.postMessage({ kind: 'log', file: fileName, text: text, append: append });
    }

    pvm_exit() {
        if (this.exited) return;
        this.exited = true;
        if (this.daemon) {
            this.daemon.unregister(this);
        } else if (this.control) {
            this.control.postMessage({ kind: 'exit' });
        }
    }
}
