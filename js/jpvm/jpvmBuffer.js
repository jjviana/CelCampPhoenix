/*
 * jpvmBuffer.js  -  CelCamp Phoenix (2026)
 *
 * A message buffer: values are packed in order and unpacked in the same
 * order on the receiving side.  Java had one pack() overload per type; in
 * JavaScript pack() accepts numbers, strings, characters, task ids and
 * (typed) arrays, and the upk*() methods simply return the next element.
 *
 *   pack(x)                 - a single value
 *   pack(array, n, stride)  - n elements of an array (copied, like JPVM)
 */
import { jpvmTaskId } from './jpvmTaskId.js';
import { jpvmException } from './jpvmException.js';

function isArrayLike(d) {
    return Array.isArray(d) || ArrayBuffer.isView(d);
}

export class jpvmBuffer {
    constructor() {
        this.elements = [];
        this.curr = 0;
    }

    pack(d, n, stride) {
        if (isArrayLike(d)) {
            if (n === undefined) n = d.length;
            if (stride === undefined) stride = 1;
            let copy;
            if (stride === 1) copy = d.slice(0, n);
            else {
                copy = new d.constructor(n);
                for (let i = 0; i < n; i++) copy[i] = d[i * stride];
            }
            this.elements.push({ t: 'a', v: Array.isArray(d) ? copy.map(e => e instanceof jpvmTaskId ? e.toJSON() : e) : copy });
        } else if (d instanceof jpvmTaskId) {
            this.elements.push({ t: 'tid', v: d.toJSON() });
        } else if (typeof d === 'string') {
            this.elements.push({ t: 's', v: d });
        } else if (typeof d === 'number' || typeof d === 'boolean') {
            this.elements.push({ t: 'n', v: d });
        } else {
            throw new jpvmException("jpvmBuffer.pack: unsupported type " + typeof d);
        }
    }

    _next(kind) {
        if (this.curr >= this.elements.length)
            throw new jpvmException("buffer empty, upk " + kind);
        return this.elements[this.curr++];
    }

    upkint() { return this._next('int').v; }
    upkdouble() { return this._next('double').v; }
    upkbyte() { return this._next('byte').v; }
    upkshort() { return this._next('short').v; }
    upklong() { return this._next('long').v; }
    upkfloat() { return this._next('float').v; }
    upkchar() { return this._next('char').v; }
    upkstr() { return String(this._next('String').v); }
    upktid() { return jpvmTaskId.from(this._next('jpvmTaskId').v); }
    unpack(d, n, stride) {
        const e = this._next('array');
        if (d === undefined) return String(e.v); // Java: String unpack()
        if (n === undefined) n = d.length;
        if (stride === undefined) stride = 1;
        const src = e.v;
        if (stride === 1 && ArrayBuffer.isView(d) && ArrayBuffer.isView(src) && n === src.length) d.set(src);
        else for (let i = 0; i < n; i++) d[i * stride] = src[i];
    }
    /** Phoenix: returns the next packed array itself, avoiding one copy. */
    upkarray() { return this._next('array').v; }

    rewind() { this.curr = 0; }

    /** wire format (structured clone) */
    toWire() { return this.elements; }
    static fromWire(elements) {
        const b = new jpvmBuffer();
        b.elements = elements;
        return b;
    }
}
