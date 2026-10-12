/*
 * PlaneWaveSource.js
 *
 * Created on 28 de Marco de 2006, 15:04   (PlaneWaveSource.java)
 * Ported to JavaScript in 2026 (CelCamp Phoenix).
 *
 * @author Ana de Oliveira Rodrigues
 * @ NAO FOI TESTADA!!!!   (never instantiated by the 2007 model loader)
 */
import { Source } from './Source.js';

export class PlaneWaveSource extends Source {

    /** Creates a new instance of PlaneWaveSource */
    constructor(type, location, maxValue, f, unit, hardsource, MainAxis) {
        if (arguments.length === 0) { super(); this.axis = 'x'; return; }
        super(type, location, maxValue, f, unit, hardsource);
        this.axis = MainAxis;
        console.log("*** ATENCAO!!! ESTA CLASSE NAO FOI TESTADA!!!!");
    }

    isSource(l) {
        const x = l[0], y = l[1], z = l[2];
        if ((this.axis === 'x') && (this.Location[0] === x))
            return true;
        if ((this.axis === 'y') && (this.Location[1] === y))
            return true;
        if ((this.axis === 'z') && (this.Location[2] === z))
            return true;
        return false;
    }

    bounds() {
        const L = this.Location, I = 1 << 30;
        return [this.axis === 'x' ? L[0] : 0, this.axis === 'x' ? L[0] : I,
                this.axis === 'y' ? L[1] : 0, this.axis === 'y' ? L[1] : I,
                this.axis === 'z' ? L[2] : 0, this.axis === 'z' ? L[2] : I];
    }

    extraParams() { return { axis: this.axis }; }
}
