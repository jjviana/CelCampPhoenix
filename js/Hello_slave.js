/*
 * Hello_slave.js
 *
 * Created on 6 de Marco de 2006, 14:03   (Hello_slave.java)
 * Ported to JavaScript in 2026 (CelCamp Phoenix).
 *
 * @author juliano
 *
 * Spawned by JPVM -> Test to check that the virtual machine works.
 */
import { jpvmEnvironment } from './jpvm/jpvmEnvironment.js';
import { jpvmBuffer } from './jpvm/jpvmBuffer.js';

export class Hello_slave {
    static async main(args) {
        try {
            // Enroll in the parallel virtual machine...
            const jpvm = new jpvmEnvironment();
            // Get my parent's task id...
            const parent = jpvm.pvm_parent();
            // Send a message to my parent...
            const buf = new jpvmBuffer();
            buf.pack("Hello from jpvm task, id: " + jpvm.pvm_mytid().toString());
            jpvm.pvm_send(buf, parent, 12345);
            // Exit from the parallel virtual machine
            jpvm.pvm_exit();
        } catch (jpe) {
            console.log("Error - jpvm exception");
        }
    }
}
