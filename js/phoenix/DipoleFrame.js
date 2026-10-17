/*
 * DipoleFrame.js  -  CelCamp Phoenix (2026)
 *
 * Tools -> Place Dipole Antenna.  The 2010 backup was called
 * "DIPOLO_VALIDADO", but the dipole itself lived only in the model files:
 * a wire of cubes of a material called "copper..." (FDTD_slave zeroes E
 * along the source axis on the 4 edges of those cubes) with a puntual hard
 * source in the cube of the gap.  This window writes such a dipole into the
 * model that is open, by default a half-wave dipole beside the head.
 */
import { JFrame, JOptionPane } from '../swing/JFrame.js';
import { hasDOM, JLabel, JTextField, JButton, JComboBox, panel, row } from '../swing/swing.js';
import { Material, Color } from '../Material.js';
import { PuntualSource } from '../PuntualSource.js';
import { doubleToString } from '../JavaFormat.js';

const C0 = 2.99792458e8;

export class DipoleFrame extends JFrame {

    constructor(tela) {
        super("Place Dipole Antenna");
        this.tela = tela;
        this.initComponents();
        this.suggest();
    }

    initComponents() {
        const t = this.tela;
        this.AxisCombo = new JComboBox(["x", "y", "z"], "y");
        this.XText = new JTextField("0", 4);
        this.YText = new JTextField("0", 4);
        this.ZText = new JTextField("0", 4);
        this.LengthText = new JTextField("0", 4);
        this.VoltText = new JTextField("1.0", 5);
        this.FreqCombo = new JComboBox(t.Freq.map(f => doubleToString(f)), doubleToString(t.Freq[t.Freq.length - 1]));
        this.InfoLabel = new JLabel("", "jnote");
        this.SuggestButton = new JButton("Beside the head", () => this.suggest());
        this.SuggestButton.setToolTipText("A half-wave dipole parallel to the longest side of the model, 1 cm from its surface, where a phone would be.");
        this.ThesisButton = new JButton("Thesis 2003", () => this.thesis());
        this.ThesisButton.setToolTipText("The antenna of Rodrigues (2003) and MOMAG 2008 for John3Doe: half-wave along y, gap at cube (10, 121, 150), 1.86 cm from the skin.");
        this.PlaceButton = new JButton("Place", () => this.place());
        this.CancelButton = new JButton("Cancel", () => this.dispose());
        if (!hasDOM) return;
        const cp = this.getContentPane();
        cp.classList.add('calc-frame');
        cp.append(
            panel(null,
                row("Frequency ", this.FreqCombo, "Hz   axis ", this.AxisCombo),
                row("Gap cube ", this.XText, this.YText, this.ZText),
                row("Length ", this.LengthText, "cubes (odd)   gap voltage ", this.VoltText, "V"),
                row(this.InfoLabel)),
            row(this.SuggestButton, this.ThesisButton, this.PlaceButton, this.CancelButton));
        cp.lastChild.classList.add('jbuttons');
        for (const c of [this.AxisCombo, this.LengthText, this.FreqCombo]) c.el.addEventListener('change', () => this.updateInfo());
    }

    deltas() { const m = this.tela.model; return [m.dx(), m.dy(), m.dz()]; }
    dims() { const m = this.tela.model; return [m.x(), m.y(), m.z()]; }
    airCode() { const a = this.tela.mat.find(m => m.isAir()); return a ? a.code() : 1; }

    halfWaveCubes(axis) {
        const f = Number(this.FreqCombo.getSelectedItem());
        let n = Math.round(C0 / f / 2 / this.deltas()[axis]);
        if (n % 2 === 0) n--;
        return Math.max(3, n);
    }

    updateInfo() {
        const a = "xyz".indexOf(this.AxisCombo.getSelectedItem());
        const L = parseInt(this.LengthText.getText(), 10) || 0;
        const d = this.deltas()[a];
        this.InfoLabel.setText("Length = " + (L * d * 1000).toFixed(1) + " mm (λ/2 = " + this.halfWaveCubes(a) + " cubes); the source drives E" +
            "xyz"[a] + " = V / " + (d * 1000).toFixed(2) + " mm in the gap.");
    }

    /** Beside the model: parallel to its longest side, 1 cm from its surface, on the side of its smallest width. */
    suggest() {
        const M = this.tela.model, air = this.airCode();
        const n = this.dims(), d = this.deltas();
        const lo = [Infinity, Infinity, Infinity], hi = [-1, -1, -1];
        const data = M.getData();
        let q = 0;
        for (let i = 0; i < n[0]; i++) for (let j = 0; j < n[1]; j++) for (let k = 0; k < n[2]; k++, q++) {
            if (data[q] === air) continue;
            const p = [i, j, k];
            for (let a = 0; a < 3; a++) { if (p[a] < lo[a]) lo[a] = p[a]; if (p[a] > hi[a]) hi[a] = p[a]; }
        }
        if (hi[0] < 0) { lo.fill(0); hi[0] = n[0] - 1; hi[1] = n[1] - 1; hi[2] = n[2] - 1; }
        const ext = [0, 1, 2].map(a => (hi[a] - lo[a] + 1) * d[a]);
        const axis = [0, 1, 2].reduce((b, a) => ext[a] > ext[b] ? a : b, 0);
        const others = [0, 1, 2].filter(a => a !== axis);
        const side = ext[others[0]] <= ext[others[1]] ? others[0] : others[1];
        const third = others.find(a => a !== side);
        const c = [0, 0, 0];
        c[axis] = Math.round((lo[axis] + hi[axis]) / 2);
        c[third] = Math.round((lo[third] + hi[third]) / 2);
        let L = Math.min(this.halfWaveCubes(axis), n[axis] - 5);
        if (L % 2 === 0) L--;
        c[axis] = Math.max((L - 1) / 2 + 2, Math.min(c[axis], n[axis] - 3 - (L - 1) / 2));
        // the surface of the model along the wire, on the side with more room
        const gap = Math.max(1, Math.round(0.01 / d[side]));
        const surface = (dir) => {
            let s = dir > 0 ? -1 : n[side];
            for (let t = -(L - 1) / 2; t <= (L - 1) / 2; t++) {
                const p = c.slice(); p[axis] += t;
                for (let u = 0; u < n[side]; u++) {
                    p[side] = u;
                    if (data[(p[0] * n[1] + p[1]) * n[2] + p[2]] !== air) { if (dir > 0) s = Math.max(s, u); else s = Math.min(s, u); }
                }
            }
            return s;
        };
        const sHi = surface(+1), sLo = surface(-1);
        const roomHi = n[side] - 1 - sHi, roomLo = sLo;
        c[side] = roomHi >= roomLo ? Math.min(n[side] - 3, sHi + gap) : Math.max(2, sLo - gap);
        this.AxisCombo.setSelectedItem("xyz"[axis]);
        this.XText.setText(String(c[0])); this.YText.setText(String(c[1])); this.ZText.setText(String(c[2]));
        this.LengthText.setText(String(L));
        this.updateInfo();
    }

    /**
     * The antenna of the thesis (A. O. Rodrigues, UFMG, 2003, p.59; MOMAG 2008):
     * "A antena está posicionada em x=10 (1,86cm), y=121 (13,4cm) e z=150
     * (16,7cm). O ponto da cabeça mais próximo da antena é de pele e está à
     * uma distância de 10Δx (1,86cm)."  A half-wave dipole along y with its
     * gap there.  The cube is given for John3Doe (1.86 x 1.11 x 1.11 mm); on
     * another grid (e.g. Redux) the same physical point is used.
     */
    thesis() {
        const d = this.deltas(), n = this.dims();
        const at = [10 * 1.86e-3, 121 * 1.11e-3, 150 * 1.11e-3];
        const c = at.map((v, a) => Math.max(1, Math.min(n[a] - 2, Math.round(v / d[a]))));
        const f18 = this.tela.Freq.find(f => Math.abs(f - 1.8e9) < 1e6);
        if (f18 !== undefined) this.FreqCombo.setSelectedItem(doubleToString(f18));
        this.AxisCombo.setSelectedItem("y");
        let L = Math.min(this.halfWaveCubes(1), 2 * Math.min(c[1] - 1, n[1] - 2 - c[1]) + 1);
        if (L % 2 === 0) L--;
        this.XText.setText(String(c[0])); this.YText.setText(String(c[1])); this.ZText.setText(String(c[2]));
        this.LengthText.setText(String(L));
        this.updateInfo();
    }

    /** The material of the wire: the model's "copper...", or a new one. */
    copperCode() {
        const t = this.tela;
        const cu = t.mat.find(m => m.name().toLowerCase().startsWith("copper"));
        if (cu) return cu.code();
        const code = Math.max(...t.mat.map(m => m.code())) + 1;
        if (code > 127) throw new Error("No free material code for copper");
        const m = new Material();
        m.SetPhysicalParam(["Copper"], code, 8960.0);
        m.SetVisualParam(new Color(255, 204, 0), 0.0, true);
        const nf = t.nFreq;
        m.SetEMParamRelat(nf, t.Freq, new Array(nf).fill(1.0), new Array(nf).fill(1.0), new Array(nf).fill(5.8e7), new Array(nf).fill(0.0));
        m.SetTParam(0.106, 401.0, 0.0, 0.0, 0.0, 0.0);
        t.mat = t.mat.concat([m]);
        t.NumMaterials = t.mat.length;
        return code;
    }

    async place() {
        const t = this.tela, M = t.model, n = this.dims();
        const axis = "xyz".indexOf(this.AxisCombo.getSelectedItem());
        const c = [this.XText, this.YText, this.ZText].map(f => parseInt(f.getText(), 10));
        let L = parseInt(this.LengthText.getText(), 10);
        const V = Number(this.VoltText.getText());
        const half = (L - 1) / 2;
        const bad = !(L >= 3) || L % 2 !== 1 || !isFinite(V) || c.some((v, a) => !(v >= 1 && v < n[a] - 1)) ||
            c[axis] - half < 1 || c[axis] + half > n[axis] - 2;
        if (bad) {
            await JOptionPane.showMessageDialog(this, "The dipole must have an odd length of at least 3 cubes and stay one cube away from the faces of the model.", "Dipole", JOptionPane.ERROR_MESSAGE);
            return;
        }
        const cu = this.copperCode(), air = this.airCode();
        for (let s = -half; s <= half; s++) {
            const p = c.slice(); p[axis] += s;
            M.setData(p[0], p[1], p[2], s === 0 ? air : cu);
        }
        const d = this.deltas()[axis];
        const src = new PuntualSource("puntual", "E", "xyz"[axis], c, V / d, t.Freq, "V/m", true);
        const replaced = t.S.length;
        t.S = [src];
        t.NumSources = 1;
        t.dipole = { center: c, axis: "xyz"[axis], length: L, voltage: V };
        t.publishModel();
        t.setStatus(t.SimulName + ": dipole of " + L + " cubes along " + "xyz"[axis] + ", gap at (" + c.join(",") + ")");
        this.dispose();
        await JOptionPane.showMessageDialog(t, "Copper dipole of " + L + " cubes (" + (L * d * 1000).toFixed(1) + " mm) along " + "xyz"[axis] +
            ", with the gap at cube (" + c.join(", ") + ").\n\nSource: E" + "xyz"[axis] + " = " + doubleToString(V / d) + " V/m (hard)" +
            (replaced ? ", replacing the " + replaced + " source(s) of the model." : "."), "Dipole", JOptionPane.INFORMATION_MESSAGE);
    }
}
