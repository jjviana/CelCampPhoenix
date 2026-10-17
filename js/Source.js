/*
 * Source.js
 *
 * Created on 27 de Setembro de 2005, 14:46   (Source.java, 2010 version)
 * Ported to JavaScript in 2026 (CelCamp Phoenix).
 *
 * @author juliano
 *
 * Since 2008 a source is given in the coordinates of the *original* model
 * (the cube that contains it) plus the field ("E" or "H") and the axis
 * ("x", "y" or "z") of the component it drives.  SourceLocation() turns that
 * into the point of the expanded (Yee) grid where the component lives.
 */
export class Source {

    /** Creates a new instance of Source
     *  (Java overloads: () and (type, field, axis, location, maxValue, f, unit, hardsource)) */
    constructor(type, field, axis, location, maxValue, f, unit, hardsource) {
        this.Type = "Default";
        this.Field = "E";
        this.Axis = "z";
        this.Location = [0, 0, 0];
        this.MaxValue = 1.0;
        this.f = [1.8e9];
        this.Unit = "?/?";
        this.HardSource = true;
        if (arguments.length === 0) return;
        this.setType(type);
        this.setField(field);
        this.setAxis(axis);
        this.setLocation(location);
        this.setMaxValue(maxValue);
        this.setF(f);
        this.setUnit(unit);
        this.setHardSource(hardsource);
    }

    getType() { return this.Type; }
    setType(Type) { this.Type = Type; }
    getField() { return this.Field; }
    setField(F) { this.Field = F; }
    getAxis() { return this.Axis; }
    setAxis(A) { this.Axis = A; }
    getLocation() { return this.Location; }
    setLocation(Location) { this.Location = Location; }
    getMaxValue() { return this.MaxValue; }
    setMaxValue(MaxValue) { this.MaxValue = MaxValue; }
    getF() { return this.f; }
    setF(f) { this.f = f; }
    getUnit() { return this.Unit; }
    setUnit(Unit) { this.Unit = Unit; }
    isHard() { return this.HardSource; }
    setHardSource(hs) { this.HardSource = hs; }

    /**
     * The 2010 code: the point of the expanded grid inside the slice of slave
     * `slaveID` (slices of ModelX points).  It subtracted ModelX*slaveID but
     * the slices overlap by one plane, and for E/x and H/y, H/z it added 1 to
     * the global xs instead of to thisX; the master always used NPROC=1, so
     * neither mattered.  The Phoenix slaves use globalLocation().
     */
    SourceLocation(ModelX, slaveID) {
        const locationS = this.Location;
        let xs = locationS[0] * 2;
        let ys = locationS[1] * 2;
        let zs = locationS[2] * 2;
        let thisX = xs - ModelX * slaveID;
        if (thisX > 0 && thisX < ModelX) { //esta nesta fatia
            const field = this.Field;
            const axis = this.Axis;
            if (field.toUpperCase() === "E") {
                if (axis.toLowerCase() === "x") thisX = xs + 1;
                if (axis.toLowerCase() === "y") ys = ys + 1;
                if (axis.toLowerCase() === "z") zs = zs + 1;
            }
            if (field.toUpperCase() === "H") {
                if (axis.toLowerCase() === "x") { ys = ys + 1; zs = zs + 1; }
                if (axis.toLowerCase() === "y") { thisX = xs + 1; zs = zs + 1; }
                if (axis.toLowerCase() === "z") { thisX = xs + 1; ys = ys + 1; }
            }
        }
        return [thisX, ys, zs];
    }

    /**
     * Phoenix: the point of the whole expanded grid that holds the component:
     * E along an axis lives on the edge of the cube (2c+1 on that axis),
     * H along an axis on the face (2c+1 on the two other axes).
     */
    globalLocation() {
        const L = this.Location;
        const p = [2 * L[0], 2 * L[1], 2 * L[2]];
        const a = "xyz".indexOf(this.Axis.toLowerCase());
        if (this.Field.toUpperCase() === "E") p[a] += 1;
        else for (let q = 0; q < 3; q++) if (q !== a) p[q] += 1;
        return p;
    }

    setSourcePoints(F, x, y, z, v) {
        if (this.isHard())
            F.data(x, y, z, v);
        else
            F.data(x, y, z, v + F.data(x, y, z));
    }

    StringLocation() {
        return ("(" + this.Location[0] + "," + this.Location[1] + "," + this.Location[2] + ")");
    }
}
