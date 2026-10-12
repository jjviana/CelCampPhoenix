/*
 * JavaFormat.js
 *
 * CelCamp Phoenix (2026): small helpers that reproduce the way the 2007 Java
 * code turned numbers into text, so that the files written to results/ look
 * like the ones produced by CelCampJava v1.0 (and can still be read by the
 * old MATLAB scripts).
 *
 *  - doubleToString(x)   ~ java.lang.Double.toString(x)   ("25.0", "1.0E-5")
 *  - new DecimalFormat("00.00").format(x) etc. for the few patterns used.
 */

/** Emulates java.lang.Double.toString(double). */
export function doubleToString(x) {
    if (Number.isNaN(x)) return "NaN";
    if (x === Infinity) return "Infinity";
    if (x === -Infinity) return "-Infinity";
    if (x === 0) return (Object.is(x, -0) ? "-0.0" : "0.0");
    const ax = Math.abs(x);
    if (ax >= 1e-3 && ax < 1e7) {
        const s = String(x);
        if (s.indexOf('e') >= 0) return expForm(x); // should not happen in range
        return s.indexOf('.') >= 0 ? s : s + ".0";
    }
    return expForm(x);
}

function expForm(x) {
    // JS: "1.2345e-7" -> Java: "1.2345E-7" ; "1e-7" -> "1.0E-7"
    let s = x.toExponential();
    let [m, e] = s.split('e');
    if (m.indexOf('.') < 0) m = m + ".0";
    if (e[0] === '+') e = e.substring(1);
    return m + "E" + e;
}

/** Emulates java.lang.Float.toString for values stored as float (rarely used). */
export function intToString(i) { return String(i | 0); }

/**
 * Minimal java.text.DecimalFormat for the patterns used in the original code:
 *   "0", "00.00", "00000", "0E0", "0.0E00", "0.000E00"
 * Rounding mode HALF_EVEN, like Java.
 */
export class DecimalFormat {
    constructor(pattern) {
        this.pattern = pattern;
        const ePos = pattern.indexOf('E');
        if (ePos >= 0) {
            this.sci = true;
            const mant = pattern.substring(0, ePos);
            this.expDigits = pattern.length - ePos - 1;
            const dot = mant.indexOf('.');
            this.fracDigits = dot >= 0 ? mant.length - dot - 1 : 0;
        } else {
            this.sci = false;
            const dot = pattern.indexOf('.');
            this.intDigits = dot >= 0 ? dot : pattern.length;
            this.fracDigits = dot >= 0 ? pattern.length - dot - 1 : 0;
        }
    }
    getDecimalFormatSymbols() { return { setDecimalSeparator() {} }; }
    setDecimalFormatSymbols() {}

    format(x) {
        x = Number(x);
        if (!isFinite(x)) return String(x);
        if (this.sci) {
            if (x === 0) return "0" + (this.fracDigits ? "." + "0".repeat(this.fracDigits) : "") + "E" + "0".repeat(this.expDigits);
            let exp = Math.floor(Math.log10(Math.abs(x)));
            let mant = roundHalfEven(x / Math.pow(10, exp), this.fracDigits);
            if (Math.abs(mant) >= 10) { exp += 1; mant = roundHalfEven(x / Math.pow(10, exp), this.fracDigits); }
            const m = mant.toFixed(this.fracDigits);
            const es = String(Math.abs(exp)).padStart(this.expDigits, '0');
            return m + "E" + (exp < 0 ? "-" : "") + es;
        }
        const neg = x < 0;
        const r = roundHalfEven(Math.abs(x), this.fracDigits);
        let s = r.toFixed(this.fracDigits);
        let [ip, fp] = s.split('.');
        ip = ip.padStart(this.intDigits, '0');
        return (neg && r !== 0 ? "-" : "") + ip + (this.fracDigits ? "." + fp : "");
    }
}

function roundHalfEven(x, digits) {
    const f = Math.pow(10, digits);
    const v = x * f;
    const fl = Math.floor(v);
    const diff = v - fl;
    let r;
    if (Math.abs(diff - 0.5) < 1e-9) r = (fl % 2 === 0) ? fl : fl + 1;
    else r = Math.round(v);
    return r / f;
}
