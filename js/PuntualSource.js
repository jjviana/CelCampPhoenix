/*
 * PuntualSource.js
 *
 * Created on 17 de Novembro de 2005, 16:22   (PuntualSource.java)
 * Ported to JavaScript in 2026 (CelCamp Phoenix).
 *
 * @author juliano
 */
import { Source } from './Source.js';

export class PuntualSource extends Source {

    /** Creates a new instance of PuntualSource
     *  (Java overloads: (), (type, location, maxValue, f, unit, hard), (Source s)) */
    constructor(...args) {
        if (args.length === 1 && args[0] instanceof Source) {
            super();
            const s = args[0];
            this.setType(s.Type);
            this.setLocation(s.Location);
            this.setMaxValue(s.MaxValue);
            this.setF(s.f);
            this.setUnit(s.Unit);
            this.setHardSource(s.HardSource);
        } else {
            super(...args);
        }
    }
}
