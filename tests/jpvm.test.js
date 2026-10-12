import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../js/jpvm/jpvmDaemon.js';
import { jpvmEnvironment } from '../js/jpvm/jpvmEnvironment.js';

test('JPVM -> Test: Hello_slave tasks answer the master', async () => {
    const NPROC = 5;
    const jpvm = new jpvmEnvironment();
    const tids = new Array(NPROC);
    const n = await jpvm.pvm_spawn("Hello_slave", NPROC, tids);
    assert.equal(n, NPROC);
    const got = [];
    for (let i = 0; i < NPROC; i++) {
        const message = await jpvm.pvm_recv();
        assert.equal(message.messageTag, 12345);
        got.push(message.buffer.upkstr());
    }
    assert.equal(got.length, NPROC);
    assert.match(got[0], /Hello from jpvm task, id: /);
    jpvm.pvm_exit();
});
