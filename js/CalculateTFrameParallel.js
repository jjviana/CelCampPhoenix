/*
 * CalculateTFrameParallel.js
 *
 * Created on 29 de Marco de 2007, 13:57   (CalculateTFrameParallel.java, version of 2009)
 * Ported to JavaScript in 2026 (CelCamp Phoenix).
 *
 * @author  juliano
 *
 * The window and master side of the temperature calculation
 * (slaves: FDTD_T_slave).  Since 2008 it receives the E^2 of the
 * electromagnetic calculation ("SAR") and the thermal parameters of the
 * .3dm file (dtt, NT, reduzNT, Tenv, Tblood, Ttissues, hc).
 *
 * Phoenix: TINIT.  "Run until steady state" runs without SAR until the
 * temperatures stop changing and saves them as results/<model>_Tinit (plus
 * a .info with the grid and the conditions).  SAR -> T always starts from
 * that file: it is computed first when it does not exist yet or was made
 * for other conditions, and reused afterwards (one file per model, so one
 * for the full head and one for the Redux).
 */
import { jpvmEnvironment } from './jpvm/jpvmEnvironment.js';
import { jpvmBuffer } from './jpvm/jpvmBuffer.js';
import { PvmUtil } from './PvmUtil.js';
import { Field } from './Field.js';
import { DecimalFormat, doubleToString } from './JavaFormat.js';
import { JFrame, JOptionPane } from './swing/JFrame.js';
import { hasDOM, el, JLabel, JTextField, JButton, JSpinner, JProgressBar, JCheckBox, panel, row } from './swing/swing.js';
import { ResultsDisk } from './phoenix/ResultsDisk.js';
import { ResultsStore } from './phoenix/ResultsStore.js';
import { InputFileChooser } from './InputFileChooser.js';
import { FDTD_T_slave } from './FDTD_T_slave.js';

const TAG_ACK = 905; // Phoenix: see FDTD_T_slave
const TAG_STEADY = 99001;
const TAG_VERDICT = 99002;

export class CalculateTFrameParallel extends JFrame {

    /**
     * Paralelizacao
     */
    static NPROC = 1; //3

    /** Creates new form CalculateTFrameParallel */
    constructor(GridSizeX, GridSizeY, GridSizeZ, SName, s, sar, m, mat, Nmat, path, dTT, NT, ReduzNT, Temps, hc) {
        super("Calculate T (Parallel)");
        /** MINHAS VARIAVEIS **/
        this.errorJPVM = false;
        this.gridSizeX = GridSizeX;
        this.gridSizeY = GridSizeY;
        this.gridSizeZ = GridSizeZ;
        this.dx = 0; this.dy = 0; this.dz = 0;
        this.SimulName = SName || "Default";
        this.max = 0;
        this.min = 0;
        this.dtT = 0.0;
        this.f = 0.0;
        this.Freq = null;
        this.M = null;
        this.Mat = null;
        this.NMat = 0;
        this.PATH = path || "";
        this.tTcalc = null;
        this.stopTThread = false;
        this.TCalculated = false;
        this.skip = 1;
        /** Variaveis de Simulacao de temperatura **/
        this.Henv = 2.7; //W/m2.K
        this.Tenv = 25; //oC
        this.Tblood = 36.8; //oC
        this.Ttissues = 36.8; //oC
        this.SAR = sar;
        this.SARName = null;       // Phoenix: shown in the window
        this.Tinit = null;
        this.TinitWasRead = false;
        this.TinitSource = null;   // Phoenix: 'manual' (Tinit button) or the steady-state file used
        this.steady = null;        // Phoenix: {W, tol, log: [{n, delta}], reached, n}
        this.num_data = 0;
        this.jpvm = null;
        this.tids = null;
        this.run = null;
        this.onFinished = null;

        this.initComponents();
        this.setModel(m, Nmat);
        this.setMaterials(mat);
        this.setJPVM();
        this.max = NT;
        this.NField.setText("" + NT);
        this.dtT = dTT;
        this.DTTField.setText("" + doubleToString(this.dtT));
        this.reduzNT = ReduzNT;
        this.SkipText.setText("" + this.reduzNT);
        this.Tenv = Temps[0];
        this.TenvText.setText("" + doubleToString(this.Tenv));
        this.Tblood = Temps[1];
        this.TbloodText.setText("" + doubleToString(this.Tblood));
        this.Ttissues = Temps[2];
        this.TtissuesText.setText("" + doubleToString(this.Ttissues));
        this.Henv = hc;
        this.HenvText.setText("" + doubleToString(this.Henv));
        this.setSARName(null);
    }

    /** Phoenix: shows which E^2 ("SAR") file feeds the calculation. */
    setSARName(name) {
        this.SARName = name;
        // Phoenix: SAR -> T always starts from the thermal steady state (TINIT)
        if (this.SteadyStateCheckBox) {
            this.SteadyStateCheckBox.setSelected(!name);
            this.SteadyStateCheckBox.setVisible(!name);
            this.TinitTitle.setVisible(!!name);
        }
        this.showTinitPlan();
        let max = 0;
        for (const v of this.SAR.getData()) if (v > max) max = v;
        this.SARLabel.setText(name ? "E² = " + name + "  (max " + max.toPrecision(3) + " V²/m²)" : "E² = 0 (no SAR file: Calculate → SAR to Temperature)");
    }

    /** This method is called from within the constructor to initialize the form. */
    initComponents() {
        this.jLabel1 = new JLabel("T Simulation Parameters (Parallel):", "jtitle");
        this.NProcSpinner = new JSpinner(Math.max(1, Math.min(8, (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) ? navigator.hardwareConcurrency - 1 : 1)), 1, 64);
        this.NField = new JTextField("10001", 7);
        this.DTTField = new JTextField("1", 7);
        this.TenvText = new JTextField("25", 5);
        this.HenvText = new JTextField("2.7", 5);
        this.TbloodText = new JTextField("36.8", 5);
        this.TtissuesText = new JTextField("36.8", 5);
        this.LoadTinitFileButton = new JButton("Tinit", () => this.LoadTinitFileButtonMouseClicked());
        this.LoadTinitFileButton.setToolTipText("Reads the initial temperature of every cube from a file (e.g. a TN file of a previous run).");
        this.TinitLabel = new JLabel("", "jnote");
        this.SteadyStateCheckBox = new JCheckBox("Run until steady state and save it as Tinit", true);
        this.SteadyStateCheckBox.setToolTipText("Without SAR: stops when T changes by less than the tolerance over a window, compared with its change since the start, at 2 checks in a row; then writes results/<model>_Tinit, used by SAR to Temperature.");
        this.ToleranceText = new JTextField("1", 4);
        this.WindowText = new JTextField("600", 5);
        this.TinitMaxText = new JTextField("36001", 7);
        this.TinitTitle = new JLabel("Tinit = thermal steady state without SAR (calculated first when not saved yet):", "jnote");
        this.SARLabel = new JLabel("", "jnote");
        this.SkipText = new JTextField("1000", 6);
        this.WriteFilesCheckBox = new JCheckBox("Write result files to results/", true);
        this.MemLabel = new JLabel("", "jnote");
        this.minimo = new JLabel("1");
        this.maximo = new JLabel("<  >");
        this.pBar = new JProgressBar();
        this.StatusLabel = new JLabel("", "jnote");
        this.StartButton = new JButton("Start", () => this.StartButtonActionPerformed());
        this.CancelButton = new JButton("Cancel", () => this.CancelButtonActionPerformed());
        this.CancelButton.setEnabled(false);

        if (!hasDOM) return;
        const cp = this.getContentPane();
        cp.classList.add('calc-frame');
        cp.append(
            this.jLabel1.el,
            panel(null,
                row("NPROC =", this.NProcSpinner, el('span', 'jnote', "(Web Workers)")),
                row("N = ", this.NField, "  DeltaTT = ", this.DTTField, "s")),
            panel(null,
                row("Tenv:  ", this.TenvText, "oC", "   hc :", this.HenvText, "W/m2.K"),
                row("Tblood:  ", this.TbloodText, "oC", "   Ttissues:  ", this.TtissuesText, "oC", this.LoadTinitFileButton),
                row(this.TinitLabel),
                row(this.SARLabel)),
            panel(null,
                row(this.SteadyStateCheckBox),
                row(this.TinitTitle),
                row("Steady: change over ", this.WindowText, " steps < ", this.ToleranceText, "% of the change since n = 0, twice"),
                row("At most ", this.TinitMaxText, " steps for the steady state")),
            panel(null,
                row("Save each ", this.SkipText, " timesteps"),
                row(this.WriteFilesCheckBox),
                row(this.MemLabel)),
            panel(null, row(this.minimo, this.pBar, this.maximo), row(this.StatusLabel)),
            row(this.StartButton, this.CancelButton));
        cp.lastChild.classList.add('jbuttons');
    }

    async LoadTinitFileButtonMouseClicked() {
        const file = await InputFileChooser.chooseText("Choose the initial temperature file (Tinit)", /tinit|\/TN\d+$/i);
        if (file) {
            this.TinitWasRead = this.ReadTinitFile(file.text, file.name);
            this.TinitSource = this.TinitWasRead ? 'manual' : null;
            if (this.TinitWasRead) {
                const texto = "Leu o Arquivo de T inicial!";
                console.log("*** CalculateTFrameParallel::LoadTinitFileButtonMouseClicked():: " + texto);
                this.TinitLabel.setText("Tinit = " + file.name);
                await JOptionPane.showMessageDialog(this, texto, "Initial T Read", JOptionPane.INFORMATION_MESSAGE);
            }
        } else {
            console.log("Nao escolheu um arquivo inicial, foi cancelado!\n");
        }
    }

    /** Reads whitespace separated temperatures, x outermost, z fastest. */
    ReadTinitFile(text, name) {
        const M = this.M;
        console.log("*** TelaInicial::ReadTinitFile():: Lendo Arquivo " + name);
        const Tinit = new Field(M.x(), M.y(), M.z());
        const d = Tinit.getData();
        const re = /\S+/g;
        let count = 0, m;
        try {
            while (count < d.length && (m = re.exec(text)) !== null) {
                const v = Number(m[0]);
                if (Number.isNaN(v)) throw new Error("Valor de Tinit nao e' um numero valido!!! (" + m[0] + ")");
                d[count++] = v;
            }
            if (count < d.length) throw new Error("Nao tem valores suficientes de Tinit!! (" + count + " de " + d.length + ")");
        } catch (e) {
            JOptionPane.showMessageDialog(this, e.message, "Erro lendo o arquivo de T inicial", JOptionPane.ERROR_MESSAGE);
            return false;
        }
        this.Tinit = Tinit;
        return true;
    }

    async CancelButtonActionPerformed() {
        if (this.tTcalc != null) {
            const message = "Deseja cancelar este processo?\n Todas as informacoes serao PERDIDAS!";
            const answer = await JOptionPane.showConfirmDialog(this, message, "Cancel Calculation", JOptionPane.YES_NO_OPTION);
            console.log("** CancelButton()::Resposta = " + answer);
            if (answer === 0) { //yes
                this.stopTThread = true;
                if (this.jpvm && this.tids) this.jpvm.pvm_kill(this.tids);
                this.StartButton.setEnabled(true);
                this.CancelButton.setEnabled(false);
            }
        }
    }

    async StartButtonActionPerformed() {
        /**
         * Pega os valores iniciais de temperatura
         **/
        this.Henv = Number(this.HenvText.getText());
        this.Tenv = Number(this.TenvText.getText());
        this.Tblood = Number(this.TbloodText.getText());
        this.Ttissues = Number(this.TtissuesText.getText());
        if ([this.Henv, this.Tenv, this.Tblood, this.Ttissues].some(v => !isFinite(v))) {
            await JOptionPane.showMessageDialog(this, "Valores de temperatura invalidos!", "ERRO", JOptionPane.ERROR_MESSAGE);
            return;
        }
        console.log("*** Calculando o aumento de Temperatura (T) com Tenv=" + this.Tenv + "oC, Tblood = " + this.Tblood + "oC e Ttissues = " + this.Ttissues + "oC.");
        /** Habilita e desabilita os botoes **/
        this.StartButton.setEnabled(false);
        this.CancelButton.setEnabled(true);
        this.stopTThread = false;
        const Nstring = this.NField.getText();
        this.max = parseInt(Nstring, 10);
        this.skip = parseInt(this.SkipText.getText(), 10);
        if (!(this.max > 0) || !(this.skip > 0)) {
            await JOptionPane.showMessageDialog(this, "N e skip devem ser inteiros positivos!", "ERRO", JOptionPane.ERROR_MESSAGE);
            this.StartButton.setEnabled(true); this.CancelButton.setEnabled(false);
            return;
        }
        CalculateTFrameParallel.NPROC = this.NProcSpinner.getValue() || 1;
        ResultsDisk.enabled = this.WriteFilesCheckBox.isSelected();
        this.setMaxMin(0, this.max);
        if (!(await this.TestDTT())) {
            this.StartButton.setEnabled(true); this.CancelButton.setEnabled(false);
            return;
        }
        console.log("*** Calculando o aumento de Temperatura (T) por " + this.max + " instantes de tempo com DeltaTT=" + this.dtT + "s ...");
        this.tTcalc = this.RunPhases();
        return this.tTcalc;
    }

    /* ------------------------- Phoenix: TINIT -------------------------- */

    tinitPath() { return this.PATH + "/results/" + this.SimulName + "_Tinit"; }

    /** The conditions a steady state depends on. */
    tinitConditions() {
        const M = this.M;
        return { dims: [M.x(), M.y(), M.z()], deltas: [this.dx, this.dy, this.dz], Tenv: this.Tenv, Tblood: this.Tblood, hc: this.Henv };
    }

    /** Reads results/<model>_Tinit when it was made for this grid and these conditions. */
    async findTinit() {
        let info;
        try {
            const want = this.tinitPath().replace(/^\//, "");
            const files = (await ResultsDisk.list()).map(f => f.path);
            if (!files.includes(want) || !files.includes(want + ".info")) return null;
            info = JSON.parse(await ResultsDisk.readText(this.tinitPath() + ".info"));
        } catch (e) { return null; }
        const c = this.tinitConditions();
        const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
        if (!same(info.dims, c.dims) || !same(info.deltas, c.deltas) || info.Tenv !== c.Tenv || info.Tblood !== c.Tblood || info.hc !== c.hc) return null;
        // made with a looser tolerance than the one asked for now: calculate it again
        const tol = Number(this.ToleranceText.getText()) / 100;
        if (tol > 0 && info.tolerance > tol * (1 + 1e-9)) return null;
        let text;
        try { text = await ResultsDisk.readText(this.tinitPath()); } catch (e) { return null; }
        return { info, text };
    }

    saveTinit(values, n) {
        const was = ResultsDisk.enabled;
        ResultsDisk.enabled = true;   // always written, whatever "Write result files" says
        const M = this.M;
        ResultsDisk.writeMatrix(this.tinitPath(), Float64Array.from(values), M.x(), M.y() * M.z());
        const info = Object.assign(this.tinitConditions(), { model: this.SimulName, n, minutes: n * this.dtT / 60, tolerance: this.steady.tol, window: this.steady.W, date: new Date().toISOString() });
        ResultsDisk.writeText(this.tinitPath() + ".info", JSON.stringify(info, null, 1) + "\n");
        ResultsDisk.enabled = was;
        this.TinitInfo = info;
    }

    /** Tells, in the window, which Tinit the run will start from. */
    async showTinitPlan() {
        if (!this.TinitLabel || !this.SARName) return;
        if (this.TinitSource === 'manual') return;
        const found = await this.findTinit();
        this.TinitLabel.setText(found
            ? "Tinit = " + this.tinitPath().replace(/^\//, "") + " (steady state reached after " + found.info.minutes.toFixed(0) + " min, " + found.info.date.slice(0, 10) + ")"
            : "Tinit: not calculated yet for this model and these conditions. Start calculates it first (steady state without SAR), then the SAR run.");
    }

    /**
     * Start: in SAR -> T, first the steady state without SAR (unless a Tinit
     * file for this grid and these conditions exists, or one was chosen with
     * the Tinit button), then the SAR run from it.  In Temperature (T), one
     * run: until the steady state (saved as Tinit) or the fixed N of 2010.
     */
    async RunPhases() {
        const tol = Number(this.ToleranceText.getText()) / 100;
        const W = parseInt(this.WindowText.getText(), 10);
        const tmax = parseInt(this.TinitMaxText.getText(), 10);
        const back = () => { this.StartButton.setEnabled(true); this.CancelButton.setEnabled(false); };
        if ((this.SARName || this.SteadyStateCheckBox.isSelected()) && (!(tol > 0) || !(W > 0) || !(tmax > 2 * W))) {
            await JOptionPane.showMessageDialog(this, "Tolerancia, janela ou maximo invalido!", "Steady state", JOptionPane.ERROR_MESSAGE);
            return back();
        }
        // a steady-state run: at most tmax steps
        const steadyRun = async (opts) => {
            const N = this.max;
            this.max = tmax;
            this.setMaxMin(0, tmax);
            this.steady = { W, tol, log: [], reached: false, n: -1 };
            const r = await this.CalculateTParallel(Object.assign({ W }, opts));
            this.max = N;
            this.setMaxMin(0, N);
            this.setBar(0);
            return r;
        };
        if (!this.SARName) {
            if (!this.SteadyStateCheckBox.isSelected()) return this.CalculateTParallel({});
            return steadyRun({});
        }
        if (this.TinitSource !== 'manual') {
            const found = await this.findTinit();
            if (found && this.ReadTinitFile(found.text, this.tinitPath())) {
                this.TinitWasRead = true;
                this.TinitSource = this.tinitPath();
                this.TinitInfo = found.info;
            } else {
                // phase 1: the thermal steady state, without SAR
                this.TinitWasRead = false;
                const sar = this.SAR;
                this.SAR = new Field(this.M.x(), this.M.y(), this.M.z(), "SAR", 0);
                const phase = await steadyRun({ quiet: true, label: "Tinit: " });
                this.SAR = sar;
                if (!phase || !phase.reached) return;   // (the warning or the error was shown)
                this.ReadTinitFile(await ResultsDisk.readText(this.tinitPath()), this.tinitPath());
                this.TinitWasRead = true;
                this.TinitSource = this.tinitPath();
                this.StartButton.setEnabled(false);
                this.CancelButton.setEnabled(true);
            }
            this.TinitLabel.setText("Tinit = " + this.TinitSource.replace(/^\//, "") + " (steady state)");
        }
        // phase 2: the heating of the field, from Tinit
        this.steady = null;
        return this.CalculateTParallel({});
    }

    /** FUNCOES UTEIS **/
    setModel(m, nm) {
        this.M = m;
        this.NMat = nm;
        this.dx = m.dx(); this.dy = m.dy(); this.dz = m.dz();
        const MinDTT = 1;
        const DF = new DecimalFormat("0.000E00");
        this.DTTField.setText("" + DF.format(MinDTT));
        this.dtT = MinDTT;
        if (this.MemLabel) {
            const pts = m.x() * m.y() * m.z();
            const mb = Math.ceil(pts * (8 * 3 + 1) / (1024 * 1024));
            this.MemLabel.setText("Memory needed ≈ " + mb + " MB (" + m.x() + "×" + m.y() + "×" + m.z() + " cubes)");
        }
    }

    setMaterials(mat) {
        this.Mat = mat;
    }

    setJPVM() {
        /** PARALELIZACAO **/
        const SIZE = this.M.x(); //so paraleliza em 1D, no eixo X
        console.log("*** CalculateEHFrame::setJPVM()::Paralelizando no eixo X em " + CalculateTFrameParallel.NPROC + " diferentes processos!!");
        this.num_data = Math.floor(SIZE / CalculateTFrameParallel.NPROC);
    }

    setMaxMin(min, max) {
        this.minimo.setText("" + min);
        this.pBar.setMinimum(min);
        this.maximo.setText("" + max);
        this.pBar.setMaximum(max);
        this.min = min;
        this.max = max;
    }
    setBar(i) { this.pBar.setValue(i); }
    barValue() { return this.pBar.getValue(); }

    async TestDTT() {
        const DeltaTstring = this.DTTField.getText();
        this.dtT = Number(DeltaTstring);
        const MinDTT = 1;
        if (!(this.dtT > 0) || this.dtT > MinDTT) {
            this.dtT = MinDTT;
            await JOptionPane.showMessageDialog(this, "Delta TT menor do que o minimo! Alterado para " + this.dtT + "s !", "ERRO NO Delta TT", JOptionPane.ERROR_MESSAGE);
        }
        return this.TestStability();
    }

    /**
     * Phoenix: the explicit scheme diverges in a material whose stability
     * limit (FDTD_T_slave.stabilityLimits, Wang) is below dtT.  The 2007 check
     * had the wrong units and never fired.  The wire of the antenna and the
     * air are not updated, so they do not count.
     */
    async TestStability() {
        const present = new Uint8Array(256);
        for (const c of this.M.getData()) present[c] = 1;
        const bad = [];
        for (const m of this.Mat) {
            if (!present[m.code()] || m.isAir() || FDTD_T_slave.isWire(m) || !(m.density() > 0)) continue;
            const limit = FDTD_T_slave.stabilityLimits(m, this.dx, this.dy, this.dz, this.Henv)[0] * 3600;
            if (this.dtT > limit) bad.push(m.name() + " (" + limit.toPrecision(3) + " s)");
        }
        if (!bad.length) return true;
        await JOptionPane.showMessageDialog(this, "Delta TT = " + this.dtT + " s is above the stability limit of:\n" + bad.join("\n") +
            "\n\nThe calculation would diverge. Reduce Delta TT below the smallest limit.", "ERRO NO Delta TT", JOptionPane.ERROR_MESSAGE);
        return false;
    }

    /**
     * Phoenix: X partition of the (not expanded) model, slices sharing one
     * plane like in 2007; any NPROC up to (TX-1)/2 is accepted.
     */
    static partition(TX, NPROC, i) {
        const Xi = Math.floor(i * (TX - 1) / NPROC);
        const Xf = Math.floor((i + 1) * (TX - 1) / NPROC);
        return [Xi, Xf];
    }

    /** FUNCOES DE GRAVACAO **/
    save3dmDat3df(nome, PATH) {
        this.save3dmT(nome, PATH);
        this.saveDatT(nome, PATH);
        this.save3dT(nome, PATH);
    }

    save3dmT(N3dm, PATH) {
        const M = this.M;
        const SX = M.x(), SY = M.y(), SZ = M.z();
        const nome3dm = PATH + "/results/Simul" + N3dm + ".3dm";
        let o = "<?xml version=\"1.0\" encoding=\"ISO-8859-1\"?>\n";
        o += "<!-- Created by Ana Rodrigues on September 28, 2005, 16:44 PM -->\n";
        o += "<MaterialModel name=\"" + this.SimulName + "\" dimention=\"" + SX + "," + SY + "," + SZ + "\" deltas=\"" + doubleToString(this.dx) + "," + doubleToString(this.dy) + "," + doubleToString(this.dz) + "\" >";
        o += "<materials>\n";
        for (let m = 0; m < this.NMat; m++) {
            const Mm = this.Mat[m];
            o += "<material code=\"" + Mm.code() + "\" color=\"" + Mm.color().getRed() + "," + Mm.color().getGreen() + "," + Mm.color().getBlue() + "\"";
            o += " name=\"" + Mm.name(0) + "\" transparency=\"" + doubleToString(Mm.transp()) + "\" visible=\"" + Mm.visible() + "\"";
            o += " muR=\"" + doubleToString(Mm.muR(0)) + "\" epR=\"" + doubleToString(Mm.epR(0)) + "\" si=\"" + doubleToString(Mm.si(0)) + "\" siC=\"" + doubleToString(Mm.siC(0)) + "\" density=\"" + doubleToString(Mm.density()) + "\"";
            o += " C=\"" + doubleToString(Mm.C()) + "\" k=\"" + doubleToString(Mm.K()) + "\" bf=\"" + doubleToString(Mm.Bf()) + "\" hm=\"" + doubleToString(Mm.Hm()) + "\"  e=\"" + doubleToString(Mm.Emissivity()) + "\" kevap=\"" + doubleToString(Mm.Kevap()) + "\"  >";
            o += "</material>\n";
        }
        o += "</materials>\n";
        const nameDat = N3dm + ".dat";
        o += "<datafile name=\"" + "Simul" + nameDat + "\" id=\"0001\"></datafile>\n";
        o += "</MaterialModel>\n";
        ResultsDisk.writeText(nome3dm, o);
    }

    save3dT(N3df, PATH) {
        const M = this.M;
        const SX = M.x(), SY = M.y(), SZ = M.z();
        const name3df = PATH + "/results/Simul" + N3df + "T.3df";
        let o = "<?xml version=\"1.0\" encoding=\"ISO-8859-1\"?>\n";
        o += "<FieldModel name=\"" + this.SimulName + "\" dimention=\"" + SX + "," + SY + "," + SZ + "\" deltas=\"" + doubleToString(M.dx()) + "," + doubleToString(M.dy()) + "," + doubleToString(M.dz()) + "";
        o += "\" timesteps=\"" + (this.max - 1) + "\" units=\"(T [oC])\">\n";
        o += "<data prefix=\"TN\" initialSufixCount=\"0\" sufixIncrement=\"" + this.skip + "\"></data>\n";
        const name3dm = N3df + ".3dm";
        o += "<MaterialModel location =\"" + "Simul" + name3dm + "\"></MaterialModel>\n";
        o += "</FieldModel>\n";
        ResultsDisk.writeText(name3df, o);
    }

    saveDatT(NArq, PATH) {
        const M = this.M;
        const SX = M.x(), SY = M.y(), SZ = M.z();
        const nomeArq = PATH + "/results/Simul" + NArq + ".dat";
        const d = M.getData();
        const plane = SY * SZ;
        const parts = [];
        for (let i = 0; i < SX; i++) {
            let line = "";
            for (let q = i * plane; q < (i + 1) * plane; q++) line += d[q] + " ";
            parts.push(line + "\n");
        }
        ResultsDisk.writeText(nomeArq, parts.join(""));
    }

    async CalculateTParallel(opts = {}) {
        const W = opts.W || 0;          // Phoenix: STEADY window (0 = the fixed N of 2010)
        let reached = false;
        const NPROC = CalculateTFrameParallel.NPROC;
        let tagAtual = 12344;
        const comecou = new Date();
        const TX = this.gridSizeX;
        if ((TX - 1) / NPROC < 2) {
            const t = "*** PARALELIZACAO NO X NAO E' POSSIVEL POR CAUSA DO TAMANHO DO MODELO!\n*** TX = " + TX + "  NPROC = " + NPROC;
            console.log(t);
            await JOptionPane.showMessageDialog(this, t, "Error", JOptionPane.ERROR_MESSAGE);
            this.StartButton.setEnabled(true); this.CancelButton.setEnabled(false);
            return;
        }
        this.errorJPVM = false;
        let jpvm = null;
        try {
            // Enroll in the parallel virtual machine...
            jpvm = new jpvmEnvironment("CalculateTFrameParallel");
            this.jpvm = jpvm;
            const tids = new Array(NPROC);
            this.tids = tids;
            const TaskOk = await jpvm.pvm_spawn("FDTD_T_slave", NPROC, tids);
            if (TaskOk !== NPROC) {
                throw new Error(" *** ERRO NO SPAWN!!! Numero de Processos Iniciados (" + TaskOk + ") < NPROC (" + NPROC + ")");
            }
            //Recebe e testa se JPVM esta ok
            tagAtual++;
            await PvmUtil.printMessageFromSlaves(jpvm, tids, tagAtual, false);
            console.log("*** CalculateTFrame::setJPVM():: COMMUNICATION OK!");

            const M = this.M;
            const ModelX = M.x(), ModelY = M.y(), ModelZ = M.z();
            console.log(" ** Tamanho modelo = (" + ModelX + "," + ModelY + "," + ModelZ + ").");

            // 1) MANDA OS DADOS INICIAIS PARA OS SLAVES
            let buf;
            for (let i = 0; i < NPROC; i++) {
                buf = new jpvmBuffer();
                buf.pack(i);
                buf.pack(NPROC);
                buf.pack(this.max);
                buf.pack(this.skip);
                jpvm.pvm_send(buf, tids[i], 11);
            }
            //confirma o recebimento:
            tagAtual++;
            await PvmUtil.printMessageFromSlaves(jpvm, tids, tagAtual, true);
            //manda os vizinhos:
            PvmUtil.sendTaskIDNeighbors(jpvm, tids, 12);
            //confirma o recebimento:
            await PvmUtil.printMessageFromSlaves(jpvm, tids, 14, true);

            // 2) MANDA O PEDACO ESPECIFICO DO MODELO PARA SLAVES
            //manda o tamanho e os deltas:
            for (let i = 0; i < NPROC; i++) {
                const [Xi, Xf] = CalculateTFrameParallel.partition(TX, NPROC, i);
                buf = new jpvmBuffer();
                buf.pack(Xf - Xi + 1);
                buf.pack(ModelY);
                buf.pack(ModelZ);
                buf.pack(this.dx);
                buf.pack(this.dy);
                buf.pack(this.dz);
                buf.pack(this.dtT);
                buf.pack(this.Henv);
                buf.pack(this.Tenv);
                buf.pack(this.Tblood);
                buf.pack(this.Ttissues);
                if (this.TinitWasRead) {
                    buf.pack(1.0);
                } else {
                    buf.pack(0.0);
                }
                buf.pack(Xi); // Phoenix
                buf.pack(W);  // Phoenix
                jpvm.pvm_send(buf, tids[i], 22);
            }
            //confirma o recebimento do tamanho e dos deltas:
            tagAtual++;
            await PvmUtil.printMessageFromSlaves(jpvm, tids, tagAtual, true);
            //manda o modelo:
            for (let i = 0; i < NPROC; i++) {
                if (this.stopTThread)
                    return;
                buf = new jpvmBuffer();
                const [Xi, Xf] = CalculateTFrameParallel.partition(TX, NPROC, i);
                const tagModel = 33;
                console.log(" ** Mandando Modelo com X = " + Xi + " ate " + Xf + ", Y = " + 0 + " ate " + (ModelY - 1) + ", Z = " + 0 + " ate " + (ModelZ - 1));
                PvmUtil.sendPartialModel(jpvm, tids[i], buf, Xi, Xf, ModelY, ModelZ, M, tagModel);
            }
            //confirma o recebimento do modelo:
            tagAtual++;
            await PvmUtil.printMessageFromSlaves(jpvm, tids, tagAtual, true);
            //manda a SAR:
            for (let i = 0; i < NPROC; i++) {
                if (this.stopTThread)
                    return;
                buf = new jpvmBuffer();
                const [Xi, Xf] = CalculateTFrameParallel.partition(TX, NPROC, i);
                const tagSAR = 3301;
                PvmUtil.sendPartialSAR(jpvm, tids[i], buf, Xi, Xf, ModelY, ModelZ, this.SAR, tagSAR);
            }
            //confirma o recebimento da SAR:
            tagAtual++;
            await PvmUtil.printMessageFromSlaves(jpvm, tids, tagAtual, true);
            //manda o valor inicial de T:
            if (this.TinitWasRead) {
                for (let i = 0; i < NPROC; i++) {
                    if (this.stopTThread)
                        return;
                    buf = new jpvmBuffer();
                    const [Xi, Xf] = CalculateTFrameParallel.partition(TX, NPROC, i);
                    const tagTinit = 3302;
                    console.log(" ** Mandando Valores Iniciais de T com X = " + Xi + " ate " + Xf);
                    PvmUtil.sendPartialSAR(jpvm, tids[i], buf, Xi, Xf, ModelY, ModelZ, this.Tinit, tagTinit);
                }
                //confirma o recebimento do Tinit:
                tagAtual++;
                await PvmUtil.printMessageFromSlaves(jpvm, tids, tagAtual, true);
            }

            // 3) MANDA OS MATERIAIS PARA SLAVES
            tagAtual++;
            const FIndex = 0;
            PvmUtil.sendMaterials(jpvm, tids, this.Mat, FIndex, tagAtual);
            //confirma o recebimento dos materiais
            tagAtual++;
            await PvmUtil.printMessageFromSlaves(jpvm, tids, tagAtual, true);
            tagAtual++;

            this.run = this.newResultsRun(W ? " → Tinit" : "");
            const vI = 0.0;
            const FieldAtualT = new Field(ModelX, ModelY, ModelZ, "EH", vI);
            const t0 = performance.now();
            let T0 = null;
            let below = 0;
            for (let cont = 0; cont < this.max; cont++) {
                let n = 0;
                for (let i = 0; i < NPROC; i++) {
                    if (this.stopTThread)
                        return;
                    // 4) RECEBE O N DOS SLAVES E ATUALIZA BARRA
                    const tagN = 197 + cont;
                    const message = await jpvm.pvm_recv(tids[i], tagN);
                    n = message.buffer.upkint();
                }
                // Phoenix: STEADY - change over the last window against the change since n = 0
                let stop = false;
                if (W && cont > 0 && cont % W === 0) {
                    let num = 0, den = 0;
                    for (let i = 0; i < NPROC; i++) {
                        const b = (await jpvm.pvm_recv(tids[i], TAG_STEADY)).buffer;
                        b.upkint(); num += b.upkdouble(); den += b.upkdouble();
                    }
                    const delta = den > 0 ? num / den : 0;
                    this.steady.log.push({ n: cont, delta });
                    below = delta < this.steady.tol ? below + 1 : 0;
                    stop = below >= 2;
                    for (let i = 0; i < NPROC; i++) {
                        const vb = new jpvmBuffer();
                        vb.pack(stop ? 0 : 1);
                        jpvm.pvm_send(vb, tids[i], TAG_VERDICT);
                    }
                }
                for (let i = 0; i < NPROC; i++) {
                    //5) RECEBE OS ARQUIVOS DE CADA SLAVE
                    // APENAS QUANDO FOR GRAVAR: em 10/4/2007  (Phoenix: and at the steady state)
                    if (n % this.skip === 0 || stop) {
                        const tagResposta = 900;
                        await PvmUtil.printMessageFromSlave(jpvm, tids[i], (902), false);
                        const Partial = await PvmUtil.receivePartialField(jpvm, tids[i], tagResposta);
                        await PvmUtil.printMessageFromSlave(jpvm, tids[i], (904), false);
                        //6) JUNTA OS DADOS EM UM UNICO PONTEIRO
                        const [Xi] = CalculateTFrameParallel.partition(TX, NPROC, i);
                        const Xf = Xi + Partial.tx;
                        FieldAtualT.setValuesData(Partial, Xi, Xf, 0, ModelY, 0, ModelZ);
                        jpvm.pvm_send(new jpvmBuffer(), tids[i], TAG_ACK);
                    }
                }
                if (this.barValue() < (n + 1))
                    this.setBar(n + 1);
                if (cont % 10 === 0 || cont === this.max - 1 || stop) {
                    const elapsed = (performance.now() - t0) / 1000;
                    let status = (opts.label || "") + "n = " + (n + 1) + " / " + this.max + "   (" + ((cont + 1) / Math.max(elapsed, 1e-3)).toFixed(1) + " steps/s, simulated " + ((n + 1) * this.dtT / 60).toFixed(1) + " min)";
                    if (W) status += "\n" + this.steadyStatus(below);
                    this.StatusLabel.setText(status);
                }
                //7) GRAVA RESPOSTA EM DISCO DEPOIS DE RECEBER DE TODOS OS SLAVES
                if (n % this.skip === 0 || stop) {
                    const values = FieldAtualT.SaveT(this.PATH, this.SimulName, n, this);
                    this.checkFinite(values, n);
                    console.log("** CalculateTFrameParallel::CalculateTParallel():: GRAVOU ARQUIVO TEMPO = " + this.PATH + "/results/TN" + n);
                    const mam = FieldAtualT.SaveMinAvMaxT(this.PATH, this.SimulName, n, this, this.max, this.Tenv);
                    // Phoenix: the viewer also shows the rise since n = 0 (FDTD_T_slave's TRise)
                    if (!T0) T0 = Float64Array.from(values);
                    const rise = new Float32Array(values.length);
                    for (let q = 0; q < rise.length; q++) rise[q] = values[q] - T0[q];
                    ResultsStore.addSnapshot(this.run, n, { T: values, TRise: rise });
                    ResultsStore.addSeries(this.run, n, mam);
                }
                if (stop) {
                    reached = true;
                    this.steady.reached = true;
                    this.steady.n = n;
                    this.saveTinit(FieldAtualT.getData(), n);
                    this.setBar(this.max);
                    break;
                }
            }
            jpvm.pvm_exit();
        } catch (jpe) {
            if (this.stopTThread) { if (jpvm) jpvm.pvm_exit(); return; }
            const texto = "*** CalculateTFrameParallel::CalculateEHParallel()::Error - jpvm exception = " + jpe.toString();
            console.log(texto, jpe);
            this.errorJPVM = true;
            if (jpvm && this.tids) jpvm.pvm_kill(this.tids);
            await JOptionPane.showMessageDialog(this, texto, "Error", JOptionPane.ERROR_MESSAGE);
        }
        if (!this.errorJPVM) {
            const terminou = new Date();
            const tempoTotal = (terminou.getTime() - comecou.getTime());
            let tempoS = Math.floor(tempoTotal / 1000);
            let tempoM = 0;
            while (tempoS >= 60) {
                tempoM++;
                tempoS = tempoS - 60;
            }
            console.log("*** Tempo de simulacao = " + (tempoTotal / 1000.0) + "s = " + tempoM + "min e " + tempoS + "s.");
            await ResultsDisk.flush();
            ResultsStore.finish(this.run, { seconds: tempoTotal / 1000 });
            if (W && !reached) {
                const st = this.steady, last = st.log.length ? this.pct(st.log[st.log.length - 1].delta) : "not measured";
                const t = "Thermal steady state NOT reached in " + this.max + " steps (" + (this.max * this.dtT / 60).toFixed(0) + " min).\n" +
                    "Last change over " + st.W + " steps: " + last + " of the change since the start (tolerance " + this.pct(st.tol) + ").\n\n" +
                    "No Tinit file was written" + (opts.quiet ? " and the SAR run did not start" : "") + ": increase N and run again.";
                console.log(t);
                await JOptionPane.showMessageDialog(this, t, "Steady state", JOptionPane.WARNING_MESSAGE);
                this.StartButton.setEnabled(true);
                this.CancelButton.setEnabled(false);
                if (opts.quiet && this.onFinished) this.onFinished(this.run);
                return { reached: false };
            }
            if (opts.quiet) return { reached };
            let texto = "Fim da Simulacao!! Tempo = " + (tempoTotal / 1000.0) + "s.";
            if (W) texto += "\n\nThermal steady state at n = " + this.steady.n + " (" + (this.steady.n * this.dtT / 60).toFixed(0) + " min): the last " + this.steady.W +
                " steps changed T by " + this.pct(this.steady.log[this.steady.log.length - 1].delta) + " of its change since the start.\nSaved as Tinit: " + this.tinitPath().replace(/^\//, "");
            else if (this.TinitWasRead) texto += "\n\nStarted from " + (this.TinitSource || "Tinit").replace(/^\//, "") + ".";
            await JOptionPane.showMessageDialog(this, texto, "End of Simulation", JOptionPane.INFORMATION_MESSAGE);
            this.TCalculated = true;
        }
        this.StartButton.setEnabled(true);
        this.CancelButton.setEnabled(false);
        this.setVisible(false);
        if (!this.errorJPVM && this.onFinished) this.onFinished(this.run);
        return this.errorJPVM ? null : { reached };
    }

    pct(x) { return isFinite(x) ? (100 * x).toPrecision(3) + " %" : "∞"; }

    /** Phoenix: the STEADY line of the status. */
    steadyStatus(below) {
        const st = this.steady;
        if (!st.log.length) return "Steady state: first check at n = " + st.W;
        const d = st.log[st.log.length - 1];
        return "Change over the last " + st.W + " steps: " + this.pct(d.delta) + " of the change since the start" +
            (below ? " — below " + this.pct(st.tol) + " at " + below + " of 2 checks" : "");
    }

    /**
     * Phoenix: a temperature that is not a number poisons TMinAvMax and the
     * cubes around it, so the run stops at the first saved step that has one.
     */
    checkFinite(values, n) {
        const M = this.M, ny = M.y(), nz = M.z(), d = M.getData();
        let count = 0, first = -1;
        const byMat = new Map();
        for (let q = 0; q < values.length; q++) {
            if (Number.isFinite(values[q])) continue;
            if (first < 0) first = q;
            count++;
            byMat.set(d[q], (byMat.get(d[q]) || 0) + 1);
        }
        if (!count) return;
        const name = (c) => { const m = this.Mat.find(mm => mm.code() === c); return m ? m.name() : "code " + c; };
        const cube = [Math.floor(first / (ny * nz)), Math.floor(first / nz) % ny, first % nz];
        throw new Error("T is not a number in " + count + " cubes at n = " + n + " (" +
            [...byMat].map(([c, k]) => k + " " + name(c)).join(", ") + "; first at cube " + cube.join(",") + "). The run was stopped.");
    }

    /** Phoenix: registers this calculation in the viewer's ResultsStore. */
    newResultsRun(suffix) {
        const M = this.M;
        return ResultsStore.newRun({
            kind: 'T', name: this.SimulName + " (T" + (this.SARName && !suffix ? ", SAR" : "") + (suffix || "") + ")", dims: [M.x(), M.y(), M.z()],
            deltas: [this.dx, this.dy, this.dz], codes: M.getData(),
            materials: this.Mat.map(m => ({ code: m.code(), name: m.name(), color: [m.color().getRed(), m.color().getGreen(), m.color().getBlue()] })),
            info: { dtT: this.dtT, N: this.max, skip: this.skip, NPROC: CalculateTFrameParallel.NPROC, Tenv: this.Tenv, hc: this.Henv, Tblood: this.Tblood, Ttissues: this.Ttissues, SAR: this.SARName },
        });
    }
}
