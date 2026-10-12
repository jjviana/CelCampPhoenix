/*
 * jpvmTaskId.js  -  CelCamp Phoenix (2026)
 *
 * In JPVM a task was identified by the host and TCP port it listened on.
 * In the browser every task is a Web Worker on the same "host", and the
 * "port" is a number handed out by the jpvmDaemon.  The 2007 code tested
 * `Left.getPort()!=0` to know whether a slave had a neighbour; that still
 * works because the null task id is ("0", 0).
 */
export class jpvmTaskId {
    constructor(host, port) {
        this.taskHost = (host === undefined) ? null : String(host);
        this.taskConnectPort = (port === undefined) ? 0 : port;
    }
    getHost() { return this.taskHost; }
    getPort() { return this.taskConnectPort; }
    equals(tid) {
        return tid != null && this.taskConnectPort === tid.taskConnectPort && this.taskHost === tid.taskHost;
    }
    toString() {
        return (this.taskHost != null ? this.taskHost : "(null)") + ", port #" + this.taskConnectPort;
    }
    /** structured-clone friendly form */
    toJSON() { return { host: this.taskHost, port: this.taskConnectPort }; }
    static from(o) { return o instanceof jpvmTaskId ? o : new jpvmTaskId(o.host, o.port); }
}
