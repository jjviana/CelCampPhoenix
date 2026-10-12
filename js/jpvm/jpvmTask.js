/*
 * jpvmTask.js  -  CelCamp Phoenix (2026)
 *
 * Bootstrap of every spawned task (Web Worker in the browser, worker thread
 * in Node). It plays the role of `java -cp . FDTD_slave` started by the 2007
 * jpvmDaemon: it enrolls the task in the virtual machine and runs the
 * slave's static main().
 */
import { jpvmEnvironment } from './jpvmEnvironment.js';

/** The programs a master can pvm_spawn(). */
const registry = {
    Hello_slave: () => import('../Hello_slave.js'),
    FDTD_slave: () => import('../FDTD_slave.js'),
    FDTD_T_slave: () => import('../FDTD_T_slave.js'),
};

let parentPort = null;
if (typeof self === 'undefined' || typeof self.postMessage !== 'function') {
    ({ parentPort } = await import('node:worker_threads'));
}

async function run(init) {
    const env = jpvmEnvironment._setupWorker(init);
    try {
        const loader = registry[init.taskName];
        if (!loader) throw new Error("jpvm: unknown task " + init.taskName);
        const mod = await loader();
        await mod[init.taskName].main([]);
    } catch (e) {
        env.control.postMessage({ kind: 'error', message: (e && e.stack) ? e.stack : String(e) });
    }
}

function onInit(data) {
    if (data && data.kind === 'init') run(data);
}

if (parentPort) parentPort.on('message', onInit);
else self.onmessage = (ev) => onInit(ev.data);
