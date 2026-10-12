/*
 * jpvmException.js  -  CelCamp Phoenix (2026)
 */
export class jpvmException extends Error {
    constructor(message) {
        super(message);
        this.name = "jpvmException";
    }
    toString() { return "jpvm.jpvmException: " + this.message; }
}
