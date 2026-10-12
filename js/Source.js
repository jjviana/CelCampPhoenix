/*
 * Source.js
 *
 * Created on 27 de Setembro de 2005, 14:46   (Source.java)
 * Ported to JavaScript in 2026 (CelCamp Phoenix).
 *
 * @author juliano
 *
 * Source locations are given in the coordinates of the *expanded* (Yee) grid
 * used by the EH calculation, exactly like in the 2007 .3dm files.
 */
export class Source {

    /** Creates a new instance of Source */
    constructor(type, location, maxValue, f, unit, hardsource) {
        this.Type = "Default";
        this.Location = [0, 0, 0];
        this.MaxValue = 1.0;
        this.f = [1.8e9];
        this.Unit = "?/?";
        this.HardSource = true;
        if (arguments.length === 0) {
            this.setType("Default");
            this.setLocation([0, 0, 0]);
            this.setMaxValue(1.0);
            this.setF([1.8e9]);
            this.setUnit("?/?");
            return;
        }
        this.setType(type);
        this.setLocation(location);
        this.setMaxValue(maxValue);
        this.setF(f);
        this.setUnit(unit);
        this.setHardSource(hardsource);
    }

    getType() { return this.Type; }
    setType(Type) { this.Type = Type; }
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

    StringLocation() {
        return ("(" + this.Location[0] + "," + this.Location[1] + "," + this.Location[2] + ")");
    }
    print() {
        console.log("** Source::Fonte do tipo " + this.Type + " localizada em " + this.StringLocation() + " com MaxValue=" + this.MaxValue + this.Unit + ".");
    }

    isSource(l) {
        const x = l[0], y = l[1], z = l[2];
        if ((this.Location[0] === x) && (this.Location[1] === y) && (this.Location[2] === z))
            return true;
        else return false;
    }

    calculateSource(n, f, dt) {
        const angle = (2 * Math.PI * f * n * dt); //em radianos
        return (this.MaxValue * Math.sin(angle));
    }

    posFDTD(l) {
        return 0;
    }

    /**
     * Phoenix: bounding box (in expanded-grid coordinates) of the points where
     * isSource() may be true; lets the slaves test only those points instead
     * of calling isSource() for every point of the grid.
     */
    bounds() {
        const L = this.Location;
        return [L[0], L[0], L[1], L[1], L[2], L[2]];
    }

    /** Phoenix: extra fields that must travel through PvmUtil.sendSources(). */
    extraParams() { return {}; }
}
