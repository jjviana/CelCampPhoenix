/*
 * Material.js
 *
 * Created on 13 de Setembro de 2005, 17:40   (Material.java)
 * Ported to JavaScript in 2026 (CelCamp Phoenix).
 *
 * @author juliano
 */

/** Stand-in for java.awt.Color (only what the program used). */
export class Color {
    constructor(r, g, b) { this.r = r; this.g = g; this.b = b; }
    getRed() { return this.r; }
    getGreen() { return this.g; }
    getBlue() { return this.b; }
    toCss() { return "rgb(" + this.r + "," + this.g + "," + this.b + ")"; }
}
Color.BLACK = new Color(0, 0, 0);

export class Material {

    /**
     * Static Properties
     */
    static mu0 = 4 * Math.PI * 1e-7; //vacum mu
    static ep0 = 8.854e-12; //vacum ep
    static Tb = 36.8; //blood temperature inside the tissue [oC]
    static mu0() { return Material.mu0; }
    static ep0() { return Material.ep0; }
    static Tb() { return Material.Tb; }
    static cc() { return (1 / (Math.sqrt(Material.mu0 * Material.ep0))); }

    /**
     * Java overloads:
     *   Material()
     *   Material(String[] n)
     *   Material(String[] n, int cod, double d, int nf, double[] f, Color cl, double t, boolean v,
     *            double[] m, double[] e, double[] s, double[] sC,
     *            double C, double K, double BF, double HM, double KEVAP, double E)
     *   Material(Material m)
     */
    constructor(...args) {
        /** Physical Properties **/
        this.name_ = null;        // String[]
        this.nlang = 2;
        this.code_ = 1;
        this.density_ = 0;      //density [kg/m3]
        /** Visual Properties **/
        this.color_ = null;
        this.transp_ = 0;
        this.visible_ = true;
        /** Electromagnetic Properties **/
        this.nfreq_ = 0;
        this.freq_ = null; //frequency [Hz]
        this.mu_ = null;   //mu = magnetic permeability [H/m]
        this.ep_ = null;   //epsilon = electric permissivity [F/m]
        this.si_ = null;   //sigma = conductivity
        this.siC_ = null;  //sigma complex = for PML Boundary Conditions
        this.v_ = null;    // velocity = 1/(Math.sqrt(mu*ep))
        /** Thermal Properties **/
        this.C_ = 0;     //specific heat [W.h/(oC.kg)]
        this.K_ = 0;     //thermal condutivity [W/(oC.m)]
        this.Bf_ = 0;    //blood flow in the tissue [kg/(m3.h)]
        this.Hm_ = 0;    //metabolic heat generation [W/m3]
        this.Kevap_ = 0; //evaporation constant [W/(m2.mmHg)]
        this.E_ = 0;     //proportional emissivity constant [-]

        if (args.length === 0 || (args.length === 1 && Array.isArray(args[0]))) {
            this.nlang = 1;
            const name = args.length === 0 ? ["Air"] : args[0];
            const code = 1;
            const density = 0.0016;
            const nfreq = 1;
            const freq = [1.8e9], mu = [Material.mu0], ep = [Material.ep0], si = [0], siC = [0];
            this.SetPhysicalParam(name, code, density);
            this.SetVisualParam(Color.BLACK, 0.0, true);
            this.SetEMParam(nfreq, freq, mu, ep, si, siC);
            this.SetTParam(0.28, 0.0263, 0.0, 0.0, 0.0, 0.0);
        } else if (args.length === 1 && args[0] instanceof Material) {
            const m = args[0];
            this.SetPhysicalParam(m.name_, m.code_, m.density_);
            this.SetVisualParam(m.color_, m.transp_, m.visible_);
            this.SetEMParam(m.nfreq_, m.freq_, m.mu_, m.ep_, m.si_, m.siC_);
            this.SetTParam(m.C_, m.K_, m.Bf_, m.Hm_, m.Kevap_, m.E_);
        } else {
            const [n, cod, d, nf, f, cl, t, v, m, e, s, sC, C, K, BF, HM, KEVAP, E] = args;
            this.SetPhysicalParam(n, cod, d);
            this.SetVisualParam(cl, t, v);
            this.SetEMParam(nf, f, m, e, s, sC);
            this.SetTParam(C, K, BF, HM, KEVAP, E);
        }
    }

    /**
     * Public Get functions
     **/
    getName() { return this.name_; }
    name(i) { return this.name_[i === undefined ? 0 : i]; }
    density() { return this.density_; }
    code() { return this.code_; }
    color() { return this.color_; }
    transp() { return this.transp_; }
    visible() { return this.visible_; }
    nfreq() { return this.nfreq_; }
    freq(i) { return this.freq_[i]; }
    mu(i) { return this.mu_[i]; }
    ep(i) { return this.ep_[i]; }
    si(i) { return this.si_[i]; }
    siC(i) { return this.siC_[i]; }
    velocity(i) { return this.v_[i]; }
    muR(i) { return (this.mu_[i] / Material.mu0); }
    epR(i) { return (this.ep_[i] / Material.ep0); }
    C() { return this.C_; }
    K() { return this.K_; }
    Bf() { return this.Bf_; }
    Hm() { return this.Hm_; }
    Kevap() { return this.Kevap_; }
    Emissivity() { return this.E_; }

    /**
     * Public Set Methods
     **/
    setC(c) { this.C_ = c; }
    setK(k) { this.K_ = k; }
    setBf(bf) { this.Bf_ = bf; }
    setHm(hm) { this.Hm_ = hm; }
    setKevap(Kevap) { this.Kevap_ = Kevap; }
    setEmissivity(E) { this.E_ = E; }

    SetPhysicalParam(n, c, d) {
        this.name_ = n;
        this.code_ = c;
        this.density_ = d;
    }

    SetVisualParam(cl, t, v) {
        this.color_ = cl;
        this.transp_ = t;
        this.visible_ = v;
    }

    SetEMParam(nf, f, m, e, s, sC) {
        this.nfreq_ = nf;
        this.freq_ = f;
        this.mu_ = new Array(this.nfreq_);
        this.ep_ = new Array(this.nfreq_);
        for (let i = 0; i < this.nfreq_; i++) {
            this.mu_[i] = m[i];
            this.ep_[i] = e[i];
        }
        this.si_ = s;
        this.siC_ = sC;
        this.nfreq_ = this.mu_.length;
        this.v_ = new Array(this.nfreq_);
        for (let i = 0; i < this.nfreq_; i++)
            this.v_[i] = 1 / (Math.sqrt(this.mu_[i] * this.ep_[i]));
    }

    SetEMParamRelat(nf, f, mR, eR, s, sC) {
        this.nfreq_ = nf;
        this.freq_ = f;
        this.mu_ = new Array(this.nfreq_);
        this.ep_ = new Array(this.nfreq_);
        for (let i = 0; i < this.nfreq_; i++) {
            this.mu_[i] = mR[i] * Material.mu0;
            this.ep_[i] = eR[i] * Material.ep0;
        }
        this.si_ = s;
        this.siC_ = sC;
        this.v_ = new Array(this.nfreq_);
        for (let i = 0; i < this.nfreq_; i++) {
            if (this.si_[i] === 0.0)
                this.v_[i] = 1 / (Math.sqrt(this.mu_[i] * this.ep_[i]));
            else {
                const w = 2 * Math.PI * this.freq_[i];
                let beta = 1;
                if (this.si_[i] > 10) // bons condutores
                    beta = Math.sqrt(Math.PI * this.freq_[i] * this.mu_[i] * this.si_[i]);
                else { //dieletricos com perdas
                    const tgTeta = this.si_[i] / (w * this.ep_[i]);
                    beta = w * Math.sqrt(this.mu_[i] * this.ep_[i] / 2) * Math.sqrt(Math.sqrt(1 + tgTeta * tgTeta) - 1);
                }
                this.v_[i] = w / beta;
            }
        }
    }

    SetTParam(C, K, BF, HM, KEVAP, E) {
        this.C_ = C; this.K_ = K; this.Bf_ = BF; this.Hm_ = HM; this.Kevap_ = KEVAP; this.E_ = E;
    }

    print(p) {
        if (p) {
            console.log("** Material = " + this.name_[0] + ", Codigo =" + this.code_ +
                ",  Density = " + this.density_ + ", Freq =" + this.freq_.map(f => f + "Hz ").join(""));
            console.log("   mu =" + this.mu_.join(" ") + "  ep =" + this.ep_.join(" ") + "  si =" + this.si_.join(" "));
            console.log("   C=" + this.C_ + " K=" + this.K_ + " bf=" + this.Bf_ + "  hm=" + this.Hm_ + " Kevap=" + this.Kevap_ + " E=" + this.E_);
        }
    }

    isConductor() {
        for (let i = 0; i < this.nfreq_; i++)
            if (this.si_[i] >= 100)
                return true;
        return false;
    }

    isAir() {
        const n = this.name_[0].toLowerCase();
        if (this.ep_[0] === Material.ep0 && this.mu_[0] === Material.mu0 && this.si_[0] === 0 && (n === "air" || n === "ar"))
            return true;
        else
            return false;
    }
}
