/*
 * jpvmMessage.js  -  CelCamp Phoenix (2026)
 */
export class jpvmMessage {
    constructor(buffer, sourceTid, messageTag) {
        this.buffer = buffer;
        this.sourceTid = sourceTid;
        this.messageTag = messageTag;
    }
}
