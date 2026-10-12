/*
 * DipoleSource.js
 *
 * Created on 28 de Marco de 2006, 15:08   (DipoleSource.java)
 * Ported to JavaScript in 2026 (CelCamp Phoenix).
 *
 * @author juliano
 *
 * (Never instantiated by the 2007 model loader; kept for completeness.)
 */
import { Source } from './Source.js';

export class DipoleSource extends Source {

    /** Creates a new instance of DipoleSource */
    constructor(type, location, maxValue, f, unit, hardsource, Size, Axis) {
        if (arguments.length === 0) { super(); return; }
        super(type, location, maxValue, f, unit, hardsource);
        this.size = Size;       //defines the size in number of cubes
        this.center = location;
        this.axis = Axis;
    }

    isSource(l) {
        const x = l[0], y = l[1], z = l[2];
        if ((this.Location[0] === x) && (this.Location[1] === y) && (this.Location[2] === z))
            return true;
        else return false;
    }

    posFDTD(l, valueAtual) {
        const x = l[0], y = l[1], z = l[2];
        const center = this.center, axis = this.axis, size = this.size;

        let centro = 0;
        if (axis === 'x') centro = center[0];
        if (axis === 'y') centro = center[1];
        if (axis === 'z') centro = center[2];

        const limiteInf = centro - Math.trunc(size / 2);
        const limiteSup = centro + Math.trunc(size / 2);

        if (axis === 'x' && x <= limiteSup && x >= limiteInf && y === center[1] && z === center[2])
            return 0;
        if (axis === 'y' && y <= limiteSup && y >= limiteInf && x === center[0] && z === center[2])
            return 0;
        if (axis === 'z' && z <= limiteSup && z >= limiteInf && x === center[0] && y === center[1])
            return 0;

        return valueAtual;
    }
}
