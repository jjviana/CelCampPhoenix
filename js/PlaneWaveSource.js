/*
 * PlaneWaveSource.js
 *
 * Created on 17 de Novembro de 2005, 16:22   (PlaneWaveSource.java, 2010 version)
 * Ported to JavaScript in 2026 (CelCamp Phoenix).
 *
 * @author juliano
 *
 * In 2010 a plane wave source only carried the name of its plane: the
 * slaves still drove the single point given by SourceLocation(), exactly
 * like a puntual source.  Kept that way.
 */
import { Source } from './Source.js';

export class PlaneWaveSource extends Source {

    /** Creates a new instance of PlaneWaveSource
     *  (Java overloads: (), (type, field, axis, plane, location, maxValue, f, unit, hard), (Source s)) */
    constructor(...args) {
        if (args.length === 1 && args[0] instanceof Source) {
            super();
            const s = args[0];
            this.setType(s.Type);
            this.setField(s.Field);
            this.setAxis(s.Axis);
            this.setPlane(s instanceof PlaneWaveSource ? s.Plane : "z"); //default
            this.setLocation(s.Location);
            this.setMaxValue(s.MaxValue);
            this.setF(s.f);
            this.setUnit(s.Unit);
            this.setHardSource(s.HardSource);
        } else if (args.length === 0) {
            super();
            this.Plane = "z";
        } else {
            const [type, field, axis, plane, location, maxValue, f, unit, hardsource] = args;
            super(type, field, axis, location, maxValue, f, unit, hardsource);
            this.Plane = plane;
        }
    }

    setPlane(plane) { this.Plane = plane; }
    getPlane() { return this.Plane; }
}
