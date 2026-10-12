/*
 * LinearSource.js
 *
 * Created on 17 de Novembro de 2005, 16:05   (LinearSource.java)
 * Ported to JavaScript in 2026 (CelCamp Phoenix).
 *
 * @author juliano
 */
import { Source } from './Source.js';

export class LinearSource extends Source {

    /** Creates a new instance of LinearSource
     *  (Java overloads: (a, f, i, e), (a, fe, i, e, type, location, maxValue, f, unit, hard), (a, f, i, e, Source s)) */
    constructor(a, fe, i, e, ...rest) {
        if (rest.length === 1 && rest[0] instanceof Source) {
            super();
            const s = rest[0];
            this.setType(s.Type);
            this.setLocation(s.Location);
            this.setMaxValue(s.MaxValue);
            this.setF(s.f);
            this.setUnit(s.Unit);
            this.setHardSource(s.HardSource);
        } else {
            super(...rest);
        }
        this.axis = a;   //x, y or z axis
        this.field = fe; //E or H
        this.init = i;
        this.end = e;
    }

    isSource(l) {
        const x = l[0], y = l[1], z = l[2];
        if (this.isE(x, y, z) && this.field.toUpperCase() === "H")
            return false;
        if (this.isH(x, y, z) && this.field.toUpperCase() === "E")
            return false;

        const axis = this.axis.toLowerCase();
        const Location = this.Location;
        if ((axis === "x") && (x >= this.init) && (x <= this.end) && (Location[1] === y) && (Location[2] === z))
            return true;
        else
            if ((axis === "y") && (y >= this.init) && (y <= this.end) && (Location[0] === x) && (Location[2] === z))
                return true;
            else
                if ((axis === "z") && (z >= this.init) && (z <= this.end) && (Location[0] === x) && (Location[1] === y))
                    return true;
                else
                    return false;
    }

    isHx(i, j, k) { return this.par(i) && this.impar(j) && this.impar(k); }
    isHy(i, j, k) { return this.impar(i) && this.par(j) && this.impar(k); }
    isHz(i, j, k) { return this.impar(i) && this.impar(j) && this.par(k); }
    isH(i, j, k) { return this.isHx(i, j, k) || this.isHy(i, j, k) || this.isHz(i, j, k); }

    isEx(i, j, k) { return this.impar(i) && this.par(j) && this.par(k); }
    isEy(i, j, k) { return this.par(i) && this.impar(j) && this.par(k); }
    isEz(i, j, k) { return this.par(i) && this.par(j) && this.impar(k); }
    isE(i, j, k) { return this.isEx(i, j, k) || this.isEy(i, j, k) || this.isEz(i, j, k); }

    par(i) { return (i % 2) === 0; }
    impar(i) { return (i % 2) !== 0; }

    bounds() {
        const L = this.Location, a = this.axis.toLowerCase();
        return [a === "x" ? this.init : L[0], a === "x" ? this.end : L[0],
                a === "y" ? this.init : L[1], a === "y" ? this.end : L[1],
                a === "z" ? this.init : L[2], a === "z" ? this.end : L[2]];
    }

    extraParams() { return { axis: this.axis, field: this.field, init: this.init, end: this.end }; }
}
