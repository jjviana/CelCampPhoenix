/*
 * CalculateEHFrameParallel.js
 *
 * Created on 7 de Marco de 2006, 14:57   (CalculateEHFrameParallel.java, version of 2010)
 * Ported to JavaScript in 2026 (CelCamp Phoenix).
 *
 * @author  Ana de Oliveira Rodrigues
 * @version 0.8 - 07/03/2006
 *
 * The window that starts the parallel FD-TD calculation of the electric (E)
 * and magnetic (H) fields, and the master side of the calculation: it
 * spawns the FDTD_slave tasks, sends each one its slice of the expanded
 * model, collects |E| at the cube centres and writes the results.
 *
 * Since 2008 the time step (dt), the number of steps (N) and how often to
 * save (reduzN) come from the .3dm file; the window shows them and lets
 * them be changed.
 *
 * Phoenix notes:
 *  - in 2010 NPROC was fixed at 1 (the parallel exchange did not work with
 *    the new H-then-E order; see FDTD_slave).  It can be chosen again;
 *  - the sources can be edited here (in 2010 only in the .3dm file);
 *  - "Run until steady state": N becomes the maximum.  Every step the
 *    window shows how much the last period differs from the one before;
 *    when that stays below the tolerance for 2 full periods (and the cubes
 *    agree one by one at the end of the period) the slaves stop and |E|^2
 *    averaged over the last period is written in the format read by "SAR to
 *    Temperature" (2010 read that file, but nothing in CelCampJava wrote it).
 */
import { jpvmEnvironment } from './jpvm/jpvmEnvironment.js';
import { jpvmBuffer } from './jpvm/jpvmBuffer.js';
import { PvmUtil } from './PvmUtil.js';
import { Field } from './Field.js';
import { doubleToString } from './JavaFormat.js';
import { JFrame, JOptionPane } from './swing/JFrame.js';
import { hasDOM, el, JLabel, JTextField, JButton, JRadioButton, ButtonGroup, JSpinner, JProgressBar, JCheckBox, JComboBox, panel, row } from './swing/swing.js';
import { ResultsDisk } from './phoenix/ResultsDisk.js';
import { ResultsStore } from './phoenix/ResultsStore.js';

const TAG_ACK = 905; // Phoenix: see FDTD_slave
const TAG_E2 = 950;
const TAG_STEADY = 99001;
const TAG_VERDICT = 99002;

export class CalculateEHFrameParallel extends JFrame {

    /**
     * Paralelizacao
     */
    static NPROC = 1; //3

    /** Creates new form CalculateEHFrameParallel */
    constructor(GridSizeX, GridSizeY, GridSizeZ, SName, s, m, mat, Nmat, path, dT, N, ReduzN) {
        super("Calculate EH (Parallel)");
        this.errorJPVM = false;
        this.gridSizeX = GridSizeX;
        this.gridSizeY = GridSizeY;
        this.gridSizeZ = GridSizeZ;
        this.dx = 0; this.dy = 0; this.dz = 0;
        this.SimulName = SName || "Default";
        this.Nmax = 0;
        this.min = 0;
        this.dt = 0.0;
        this.f = 0.0;
        this.Freq = null;
        this.S = null;
        this.M = null;
        this.Mat = null;
        this.NMat = 0;
        this.CCAtype = 'm';
        this.CCAorder = 1;
        this.PATH = path || "";
        this.num_data = 0;
        /** Define a frequencia a ser usada. Comeca invalido. */
        this.FIndex = 0;
        this.fbuttons = null;
        this.skip = 1;
        this.reduzN = 1;
        this.tcalc = null;
        this.stopThread = false;
        this.EHCalculated = false;
        this.tids = null;
        this.jpvm = null;
        this.run = null;           // Phoenix: snapshots for the viewer
        this.E2file = null;        // Phoenix: the E^2 file written at the end
        this.E2field = null;       // Phoenix: the E^2 received at the end (written only in steady state)
        this.steady = null;        // Phoenix: {P, tol, log: [{n, delta}], cube: [{n, delta}], reached, n}
        this.onFinished = null;    // Phoenix: callback (run) => void

        this.initComponents();
        this.setSource(s);
        this.setModel(m, Nmat);
        this.setMaterials(mat);
        this.setJPVM();
        this.dt = dT;
        this.DTField.setText("" + doubleToString(this.dt));
        this.Nmax = N;
        this.NField.setText("" + N);
        this.reduzN = ReduzN;
        this.SkipText.setText("" + this.reduzN);
    }

    setF(freq) {
        this.Freq = freq;
        this.fbuttons = new Array(this.Freq.length);
        for (let i = 0; i < this.Freq.length; i++) {
            this.fbuttons[i] = new JRadioButton(" " + doubleToString(this.Freq[i]) + "Hz");
            this.FreqButtonGroup.add(this.fbuttons[i]);
            if (this.FreqPanel) this.FreqPanel.appendChild(this.fbuttons[i].el);
            if (i === this.Freq.length - 1) {
                this.f = this.Freq[i];
                this.fbuttons[i].setSelected(true);
            } else
                this.fbuttons[i].setSelected(false);
        }
        this.pack();
    }

    setSource(s) {
        this.S = s || [];
        // Phoenix: the sources can be changed here (in 2010 only by editing the .3dm)
        this.SourceFields = [];
        if (!this.SourcesPanel) return;
        const cx = (this.gridSizeX - 1) / 2, cy = (this.gridSizeY - 1) / 2, cz = (this.gridSizeZ - 1) / 2;
        this.SourcesPanel.innerHTML = '';
        this.SourcesPanel.appendChild(el('legend', null, 'Sources (cube 0..' + (cx - 1) + ', 0..' + (cy - 1) + ', 0..' + (cz - 1) + ')'));
        if (!this.S.length) this.SourcesPanel.appendChild(el('div', 'jnote', 'No sources in this model: add one with Tools → Place Dipole Antenna.'));
        this.S.forEach((src, i) => {
            const L = src.getLocation();
            const f = {
                field: new JComboBox(["E", "H"], src.getField().toUpperCase()),
                axis: new JComboBox(["x", "y", "z"], src.getAxis().toLowerCase()),
                x: new JTextField(String(L[0]), 3), y: new JTextField(String(L[1]), 3), z: new JTextField(String(L[2]), 3),
                max: new JTextField(doubleToString(src.getMaxValue()), 6),
            };
            this.SourceFields.push(f);
            this.SourcesPanel.appendChild(row((i + 1) + ") " + src.getType() + (src.isHard() ? " (hard)" : ""), f.field.el ? f.field : null, f.axis.el ? f.axis : null,
                "cube", f.x, f.y, f.z, "max", f.max, src.getUnit()));
        });
    }

    /** Phoenix: reads the source fields back into the Source objects. */
    async readSources() {
        const lim = [(this.gridSizeX - 1) / 2, (this.gridSizeY - 1) / 2, (this.gridSizeZ - 1) / 2];
        for (let i = 0; i < this.SourceFields.length; i++) {
            const f = this.SourceFields[i];
            const L = [f.x, f.y, f.z].map(t => parseInt(t.getText(), 10));
            const max = Number(f.max.getText());
            if (L.some((v, a) => !(v >= 0 && v < lim[a])) || !isFinite(max)) {
                await JOptionPane.showMessageDialog(this, "Fonte " + (i + 1) + " fora do modelo!", "ERRO NA FONTE", JOptionPane.ERROR_MESSAGE);
                return false;
            }
            this.S[i].setLocation(L);
            this.S[i].setMaxValue(max);
            this.S[i].setField(f.field.getSelectedItem());
            this.S[i].setAxis(f.axis.getSelectedItem());
        }
        return true;
    }

    setModel(m, nm) {
        this.M = m;
        this.NMat = nm;
        this.dx = m.dx(); this.dy = m.dy(); this.dz = m.dz();
        this.updateMemoryEstimate();
    }

    setMaterials(mat) {
        this.Mat = mat;
    }

    setJPVM() {
        /** PARALELIZACAO **/
        const SIZEX = this.M.x();
        const SIZE = SIZEX; //so paraleliza em 1D, no eixo X
        console.log("*** CalculateEHFrame::setJPVM()::Paralelizando no eixo X em " + CalculateEHFrameParallel.NPROC + " diferentes processos!!");
        this.num_data = Math.floor(SIZE / CalculateEHFrameParallel.NPROC);
    }

    setMaxMin(min, max) {
        this.minimo.setText("" + min);
        this.pBar.setMinimum(min);
        this.maximo.setText("" + max);
        this.pBar.setMaximum(max);
        this.min = min;
        this.Nmax = max;
    }
    setBar(i) {
        this.pBar.setValue(i);
    }
    barValue() {
        return this.pBar.getValue();
    }

    async TestDT() {
        const DeltaTstring = this.DTField.getText();
        this.dt = Number(DeltaTstring);
        const c = 3e8;
        const InvertDeltas = 1 / (this.dx * this.dx) + 1 / (this.dy * this.dy) + 1 / (this.dz * this.dz);
        const MinDT = 1 / (c * Math.sqrt(InvertDeltas));
        if (!(this.dt > 0) || this.dt > MinDT) {
            this.dt = MinDT;
            this.DTField.setText(doubleToString(this.dt));
            await JOptionPane.showMessageDialog(this, "Delta T menor do que o minimo! Alterado para " + this.dt + "s !", "ERRO NO Delta T", JOptionPane.ERROR_MESSAGE);
            console.log("Delta T menor do que o minimo! Alterado para " + this.dt + "s !");
        } else {
            console.log("** CalculateEHFramePrallel::TestDT():: Delta T = " + this.dt);
        }
    }

    /**
     * Phoenix: the X partition.  The 2010 formula (tamModelo-1)*i only worked
     * for NPROC=1.  The cubes are spread as evenly as possible, and every
     * slice has at least 2 cubes (so the Mur boundary of the x faces never
     * reads the plane shared with a neighbour).
     * Returns [Xi, Xf] (expanded grid, inclusive) for slave i.
     */
    static partition(TX, NPROC, i) {
        const tamanhoOriginal = (TX - 1) / 2;
        const Xi = 2 * Math.floor(i * tamanhoOriginal / NPROC);
        const Xf = 2 * Math.floor((i + 1) * tamanhoOriginal / NPROC);
        return [Xi, Xf];
    }

    /** Phoenix: memory needed by the calculation (3 Float32 fields + the model in the slaves). */
    updateMemoryEstimate() {
        if (!this.M || !this.MemLabel) return;
        const points = this.M.x() * this.M.y() * this.M.z();
        const bytes = points * (3 * 4 + 1);
        const mb = bytes / (1024 * 1024);
        this.MemLabel.setText("Memory needed ≈ " + (mb > 1024 ? (mb / 1024).toFixed(1) + " GB" : Math.ceil(mb) + " MB") +
            " (" + this.M.x() + "×" + this.M.y() + "×" + this.M.z() + " points)");
        if (this.MemLabel.el) this.MemLabel.el.classList.toggle('warning', mb > 2500);
    }

    /** This method is called from within the constructor to initialize the form. */
    initComponents() {
        this.FreqButtonGroup = new ButtonGroup();
        this.CCAButtonGroup = new ButtonGroup();
        this.jLabel1 = new JLabel("EH Simulation Parameters (Parallel):", "jtitle");
        this.NField = new JTextField("0", 7);
        this.DTField = new JTextField("5e-12", 10);
        this.SkipText = new JTextField("1", 5);
        this.NProcSpinner = new JSpinner(Math.max(1, Math.min(8, (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) ? navigator.hardwareConcurrency - 1 : 3)), 1, 64);
        this.NProcSpinner.setToolTipText("Fixed at 1 in 2010; the slaves exchange their borders correctly again.");
        this.Mur1RadioButton = new JRadioButton("Mur 1st Order", true);
        this.Mur2RadioButton = new JRadioButton("Mur 2nd Order");
        this.PMLRadioButton = new JRadioButton("PML");
        this.Mur2RadioButton.setToolTipText("Mur2aOrdem() was still commented out in 2010: behaves as 1st order.");
        this.PMLRadioButton.setToolTipText("PML was never implemented: the minimum faces stay at zero, the maximum faces still get Mur.");
        this.CCAButtonGroup.add(this.Mur1RadioButton);
        this.CCAButtonGroup.add(this.Mur2RadioButton);
        this.CCAButtonGroup.add(this.PMLRadioButton);
        this.SteadyStateCheckBox = new JCheckBox("Run until steady state (N = maximum), then record E² for SAR → T", true);
        this.SteadyStateCheckBox.setToolTipText("Every step compares the last period with the one before. When the difference stays below the tolerance for 2 full periods the run stops and E² averaged over the last period goes to results/<name>_E2_<f>Hz, the file read by Calculate → SAR to Temperature.");
        this.ToleranceText = new JTextField("1", 4);
        this.WriteFilesCheckBox = new JCheckBox("Write result files to results/", true);
        this.MemLabel = new JLabel("", "jnote");
        this.minimo = new JLabel("1");
        this.maximo = new JLabel("<  >");
        this.pBar = new JProgressBar();
        this.StatusLabel = new JLabel("", "jnote");
        this.StartButton = new JButton("Start", () => this.StartButtonActionPerformed());
        this.CancelButton = new JButton("Cancel", () => this.CancelButtonActionPerformed());
        this.CancelButton.setEnabled(false);
        this.pBar.setToolTipText("n");
        if (this.StatusLabel.el) this.StatusLabel.el.style.whiteSpace = 'pre-line';

        if (!hasDOM) return;
        this.FreqPanel = row("Frequency :  ");
        const cp = this.getContentPane();
        cp.classList.add('calc-frame');
        cp.append(
            this.jLabel1.el,
            panel(null,
                row("N = ", this.NField, "  DeltaT = ", this.DTField, "s"),
                this.FreqPanel,
                row("Save each ", this.SkipText, " timesteps"),
                row("NPROC =", this.NProcSpinner, el('span', 'jnote', "(Web Workers)")),
                row("CCA: ", this.Mur1RadioButton, this.Mur2RadioButton, this.PMLRadioButton),
                row(this.SteadyStateCheckBox),
                row("Steady when the difference stays below ", this.ToleranceText, "% for 2 periods"),
                row(this.WriteFilesCheckBox),
                row(this.MemLabel)),
            this.SourcesPanel = panel(null),
            panel(null, row(this.minimo, this.pBar, this.maximo), row(this.StatusLabel)),
            row(this.StartButton, this.CancelButton));
        this.getContentPane().lastChild.classList.add('jbuttons');
    }

    async StartButtonActionPerformed() {
        this.StartButton.setEnabled(false);
        this.CancelButton.setEnabled(true);
        this.stopThread = false;
        const Nstring = this.NField.getText();
        const N = parseInt(Nstring, 10);
        this.skip = parseInt(this.SkipText.getText(), 10);
        const back = () => { this.StartButton.setEnabled(true); this.CancelButton.setEnabled(false); };
        if (!(N > 0) || !(this.skip > 0)) {
            await JOptionPane.showMessageDialog(this, "N e skip devem ser inteiros positivos!", "ERRO", JOptionPane.ERROR_MESSAGE);
            return back();
        }
        if (!this.S.length) {
            await JOptionPane.showMessageDialog(this, "O modelo nao tem fontes!\n(Tools → Place Dipole Antenna)", "ERRO NA FONTE", JOptionPane.ERROR_MESSAGE);
            return back();
        }
        if (!(await this.readSources())) return back();
        this.Nmax = N + 1;  // n = 0 .. N
        CalculateEHFrameParallel.NPROC = this.NProcSpinner.getValue() || 1;
        ResultsDisk.enabled = this.WriteFilesCheckBox.isSelected();
        this.setMaxMin(0, this.Nmax);
        await this.TestDT();
        for (let b = 0; b < this.Freq.length; b++) {
            if (this.fbuttons[b].isSelected()) {
                this.f = this.Freq[b];
                this.FIndex = b;
            }
        }
        let CCA = "Not Selected!";
        if (this.Mur1RadioButton.isSelected()) {
            this.CCAtype = 'm'; this.CCAorder = 1; CCA = "1st order Mur Boundary Condition";
        } else if (this.Mur2RadioButton.isSelected()) {
            this.CCAtype = 'm'; this.CCAorder = 2; CCA = "2nd order Mur Boundary Condition";
        } else if (this.PMLRadioButton.isSelected()) {
            this.CCAtype = 'p'; this.CCAorder = 1; CCA = "PML Boundary Condition";
        }
        console.log("*** CCA = " + CCA);
        console.log("*** Calculando os campos eletrico (E) e magnetico (H) por " + this.Nmax + " instantes de tempo com DeltaT=" + this.dt + "s ...");
        // 2006: new Thread(...).start()  ->  an async task
        this.tcalc = this.CalculateEHParallel();
        return this.tcalc;
    }

    async CancelButtonActionPerformed() {
        if (this.tcalc != null) {
            const message = "Deseja cancelar este processo?\n Todas as informacoes serao PERDIDAS!";
            const answer = await JOptionPane.showConfirmDialog(this, message, "Cancel Calculation", JOptionPane.YES_NO_OPTION);
            console.log("** CancelButton()::Resposta = " + answer);
            if (answer === 0) { //yes
                this.stopThread = true;
                if (this.jpvm && this.tids) this.jpvm.pvm_kill(this.tids); // Phoenix: stop the slaves too
                this.StartButton.setEnabled(true);
                this.CancelButton.setEnabled(false);
            }
        }
    }

    /** Phoenix: number of steps of one period (STEADY). */
    periodSteps() {
        return Math.max(1, Math.round(1 / (this.f * this.dt)));
    }

    async CalculateEHParallel() {
        const NPROC = CalculateEHFrameParallel.NPROC;
        let tagAtual = 12344;
        const comecou = new Date();
        const TX = this.gridSizeX;
        const tamanhoOriginal = (TX - 1) / 2;
        if (tamanhoOriginal / NPROC < 2) {
            const t = "*** PARALELIZACAO NO X NAO E' POSSIVEL POR CAUSA DO TAMANHO DO MODELO!\n*** TX = " + TX + "  NPROC = " + NPROC + "\n(every slave needs at least 2 cubes)";
            console.log(t);
            await JOptionPane.showMessageDialog(this, t, "Error", JOptionPane.ERROR_MESSAGE);
            this.StartButton.setEnabled(true); this.CancelButton.setEnabled(false);
            return;
        }
        const P = this.SteadyStateCheckBox.isSelected() ? this.periodSteps() : 0;
        const tol = Number(this.ToleranceText.getText()) / 100;
        if (P && !(tol > 0)) {
            await JOptionPane.showMessageDialog(this, "Tolerancia invalida!", "Steady state", JOptionPane.ERROR_MESSAGE);
            this.StartButton.setEnabled(true); this.CancelButton.setEnabled(false);
            return;
        }
        this.E2file = null;
        this.E2field = null;
        this.steady = P ? { P, tol, log: [], cube: [], reached: false, n: -1 } : null;
        this.errorJPVM = false;
        let jpvm = null;
        try {
            // Enroll in the parallel virtual machine...
            jpvm = new jpvmEnvironment("CalculateEHFrameParallel");
            this.jpvm = jpvm;
            const tids = new Array(NPROC);
            this.tids = tids;
            const TaskOk = await jpvm.pvm_spawn("FDTD_slave", NPROC, tids);
            if (TaskOk !== NPROC) {
                throw new Error(" *** ERRO NO SPAWN!!! Numero de Processos Iniciados (" + TaskOk + ") < NPROC (" + NPROC + ")");
            }
            //Recebe e testa se JPVM esta ok
            tagAtual++;
            await PvmUtil.printMessageFromSlaves(jpvm, tids, tagAtual, false);

            /**
             * PROCESSO DA PARALELIZACAO:
             * Inicializacao:
             * --------------
             * for (i=0; i<NPROC; i++){
             *  ok 1) MANDA OS DADOS INICIAIS PARA OS SLAVES
             *  ok 2) MANDA O PEDACO ESPECIFICO DO MODELO PARA SLAVES
             *  ok 3) MANDA AS FONTES E OS MATERIAIS PARA SLAVES
             * }
             *
             * Calculo:
             * --------
             * for (n=0; n<max; n++){
             *     for (i=0; i<NPROC; i++){
             *    ok 4) RECEBE O N DOS SLAVES E ATUALIZA BARRA
             *    ok 5) RECEBE AS RESPOSTAS DE CADA SLAVE
             *    ok 6) JUNTA OS DADOS EM UM UNICO PONTEIRO
             *    ok 7) GRAVA RESPOSTA EM DISCO
             *      }
             * }
             **/
            const M = this.M;
            const ModelX = M.x(), ModelY = M.y(), ModelZ = M.z();
            console.log(" ** Tamanho modelo = (" + ModelX + "," + ModelY + "," + ModelZ + ").");

            // 1) MANDA OS DADOS INICIAIS PARA OS SLAVES
            let buf;
            for (let i = 0; i < NPROC; i++) {
                buf = new jpvmBuffer();
                buf.pack(i);
                buf.pack(NPROC);
                buf.pack(this.Nmax);
                buf.pack(this.skip);
                jpvm.pvm_send(buf, tids[i], 11);
            }
            //confirma o recebimento:
            tagAtual++;
            await PvmUtil.printMessageFromSlaves(jpvm, tids, tagAtual, false);
            //manda os vizinhos:
            PvmUtil.sendTaskIDNeighbors(jpvm, tids, 12);
            //confirma o recebimento:
            await PvmUtil.printMessageFromSlaves(jpvm, tids, 14, false);

            // 2) MANDA O PEDACO ESPECIFICO DO MODELO PARA SLAVES
            //manda o tamanho e os deltas:   (Phoenix: one message per slave, sizes may differ)
            for (let i = 0; i < NPROC; i++) {
                const [Xi, Xf] = CalculateEHFrameParallel.partition(TX, NPROC, i);
                const tamModelo = Xf - Xi + 1;
                buf = new jpvmBuffer();
                buf.pack(tamModelo);
                buf.pack(ModelY);
                buf.pack(ModelZ);
                buf.pack(this.dx);
                buf.pack(this.dy);
                buf.pack(this.dz);
                buf.pack(this.dt);
                buf.pack(this.FIndex);
                buf.pack(this.CCAtype);
                buf.pack(this.CCAorder);
                buf.pack(Xi);        // Phoenix
                buf.pack(ModelX);    // Phoenix
                buf.pack(P);         // Phoenix
                jpvm.pvm_send(buf, tids[i], 22);
            }
            //confirma o recebimento do tamanho e dos deltas:
            tagAtual++;
            await PvmUtil.printMessageFromSlaves(jpvm, tids, tagAtual, false);
            //manda o modelo:
            for (let i = 0; i < NPROC; i++) {
                if (this.stopThread)
                    return;
                buf = new jpvmBuffer();
                const [Xi, Xf] = CalculateEHFrameParallel.partition(TX, NPROC, i);
                const tagModel = 33;
                console.log(" ** Mandando Modelo com X = " + Xi + " ate " + Xf + ", Y = " + 0 + " ate " + (ModelY - 1) + ", Z = " + 0 + " ate " + (ModelZ - 1));
                PvmUtil.sendPartialModel(jpvm, tids[i], buf, Xi, Xf, ModelY, ModelZ, M, tagModel);
            }
            //confirma o recebimento do modelo:
            tagAtual++;
            await PvmUtil.printMessageFromSlaves(jpvm, tids, tagAtual, false);

            // 3) MANDA AS FONTES E OS MATERIAIS PARA SLAVES
            //manda as fontes
            tagAtual++;
            PvmUtil.sendSources(jpvm, tids, this.S, tagAtual);
            //confirma o recebimento das fontes
            tagAtual++;
            await PvmUtil.printMessageFromSlaves(jpvm, tids, tagAtual, false);
            //manda os materiais
            tagAtual++;
            PvmUtil.sendMaterials(jpvm, tids, this.Mat, this.FIndex, tagAtual);
            //confirma o recebimento dos materiais
            tagAtual++;
            await PvmUtil.printMessageFromSlaves(jpvm, tids, tagAtual, false);
            tagAtual++;

            this.run = this.newResultsRun();
            const vI = 0.0;
            const cx = (ModelX - 1) / 2, cy = (ModelY - 1) / 2, cz = (ModelZ - 1) / 2;
            const FieldAtual = new Field(cx, cy, cz, "|E|", vI);   // Phoenix: |E| per cube
            const t0 = performance.now();
            // Phoenix: STEADY - sums of |E|^2 of every step, and prefix sums of them
            const prefS = P ? new Float64Array(this.Nmax + 1) : null;
            const prefU = P ? new Float64Array(this.Nmax + 1) : null;
            let below = 0;      // consecutive steps with the difference below the tolerance
            let stop = false;
            let n = 0;
            for (let cont = 0; cont < this.Nmax; cont++) {
                for (let i = 0; i < NPROC; i++) {
                    if (this.stopThread)
                        return;
                    // 4) RECEBE O N DOS SLAVES E ATUALIZA BARRA
                    const tagN = 197 + cont;
                    const message = await jpvm.pvm_recv(tids[i], tagN);
                    n = message.buffer.upkint();
                }
                let delta = null, cubeDelta = null;
                if (P) {
                    let wS = 0, wU = 0, check = false, numS = 0, denS = 0, numU = 0, denU = 0;
                    for (let i = 0; i < NPROC; i++) {
                        const b = (await jpvm.pvm_recv(tids[i], TAG_STEADY)).buffer;
                        b.upkint();
                        wS += b.upkdouble(); wU += b.upkdouble();
                        check = b.upkint() === 1;
                        numS += b.upkdouble(); denS += b.upkdouble(); numU += b.upkdouble(); denU += b.upkdouble();
                    }
                    prefS[cont + 1] = prefS[cont] + wS;
                    prefU[cont + 1] = prefU[cont] + wU;
                    // the last period against the one before (SAR-weighted when there are tissues)
                    if (cont + 1 >= 2 * P) {
                        const pref = prefS[cont + 1] > 0 ? prefS : prefU;
                        const A = (pref[cont + 1] - pref[cont + 1 - P]) / P;
                        const B = (pref[cont + 1 - P] - pref[cont + 1 - 2 * P]) / P;
                        delta = A > 0 ? Math.abs(A - B) / A : Infinity;
                        below = delta < tol ? below + 1 : 0;
                        this.steady.log.push({ n, delta });
                    }
                    if ((cont + 1) % P === 0) {
                        // end of a period: the cubes one by one, then the verdict for the slaves
                        if (check) {
                            cubeDelta = denS > 0 ? numS / denS : (denU > 0 ? numU / denU : Infinity);
                            this.steady.cube.push({ n, delta: cubeDelta });
                        }
                        stop = check && cubeDelta < tol && below >= 2 * P;
                        for (let i = 0; i < NPROC; i++) {
                            const vb = new jpvmBuffer();
                            vb.pack(stop ? 0 : 1);
                            jpvm.pvm_send(vb, tids[i], TAG_VERDICT);
                        }
                    }
                }
                //5) RECEBE OS ARQUIVOS DE CADA SLAVE
                const save = (cont % this.skip === 0 || cont === this.Nmax - 1 || stop);
                if (save) {
                    for (let i = 0; i < NPROC; i++) {
                        const tagResposta = 900;
                        await PvmUtil.printMessageFromSlave(jpvm, tids[i], (902), false);
                        const Partial = await PvmUtil.receivePartialField(jpvm, tids[i], tagResposta);
                        await PvmUtil.printMessageFromSlave(jpvm, tids[i], (904), false);
                        //6) JUNTA OS DADOS EM UM UNICO PONTEIRO
                        const [Xi] = CalculateEHFrameParallel.partition(TX, NPROC, i);
                        const Ci = Xi / 2;
                        FieldAtual.setValuesData(Partial, Ci, Ci + Partial.tx, 0, cy, 0, cz);
                        jpvm.pvm_send(new jpvmBuffer(), tids[i], TAG_ACK);
                    }
                }
                if (this.barValue() < (n + 1))
                    this.setBar(n + 1);
                const elapsed = (performance.now() - t0) / 1000;
                let status = "n = " + (n + 1) + " / " + this.Nmax + "   (" + ((cont + 1) / Math.max(elapsed, 1e-3)).toFixed(2) + " steps/s)";
                if (P) status += "\n" + this.steadyStatus(n, delta, below);
                this.StatusLabel.setText(status);
                //7) GRAVA RESPOSTA EM DISCO DEPOIS DE RECEBER DE TODOS OS SLAVES
                if (save) {
                    const r = FieldAtual.Save(this.PATH, this.SimulName, n, this);
                    ResultsStore.addSnapshot(this.run, n, r);
                    console.log("** CalculateEHFrameParallel::CalculateEHParallel():: GRAVANDO ARQUIVO " + this.PATH + "/results/EN" + n + ".");
                }
                if (stop) {
                    this.steady.reached = true;
                    this.steady.n = n;
                    this.setBar(this.Nmax);
                    break;
                }
            }
            if (P) {
                // Phoenix: E^2 of the last period, in the SAR -> T input format
                const E2 = new Field(cx, cy, cz, "E2", 0);
                for (let i = 0; i < NPROC; i++) {
                    const Partial = await PvmUtil.receivePartialField(jpvm, tids[i], TAG_E2);
                    const [Xi] = CalculateEHFrameParallel.partition(TX, NPROC, i);
                    E2.setValuesData(Partial, Xi / 2, Xi / 2 + Partial.tx, 0, cy, 0, cz);
                }
                this.E2field = E2;
                if (this.steady.reached) this.saveE2(E2, P);
                Object.assign(this.run.info, { steady: this.steady.reached, steadyAt: this.steady.n, period: P, tolerance: tol });
            }
            jpvm.pvm_exit();
        } catch (jpe) {
            if (this.stopThread) { if (jpvm) jpvm.pvm_exit(); return; }
            const texto = "*** CalculateEHFrameParallel::CalculateEHParallel()::Error - jpvm exception = " + jpe.toString();
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
            let texto = "Fim da Simulacao!! Tempo = " + (tempoTotal / 1000.0) + "s.";
            const st = this.steady;
            if (st && st.reached) {
                texto += "\n\nSteady state at n = " + st.n + ": the last periods differ by " + this.pct(st.log[st.log.length - 1].delta) +
                    " (cube by cube " + this.pct(st.cube[st.cube.length - 1].delta) + "), below " + this.pct(st.tol) + " for 2 periods." +
                    "\nE² of the last " + st.P + " steps: " + this.E2file +
                    "\nPeak SAR = " + this.run.info.peakSAR.toPrecision(3) + " W/kg (" + this.run.info.peakSARmaterial + ")";
            }
            await JOptionPane.showMessageDialog(this, texto, "End of Simulation", JOptionPane.INFORMATION_MESSAGE);
            if (st && !st.reached) {
                const last = st.log.length ? this.pct(st.log[st.log.length - 1].delta) : "not measured (fewer than 2 periods)";
                const t = "Steady state NOT reached in " + this.Nmax + " steps (" + (this.Nmax / st.P).toFixed(1) + " periods of " + st.P + " steps).\n" +
                    "Last difference between periods: " + last + " (tolerance " + this.pct(st.tol) + ").\n\nThe E² file was not written: increase N and run again.";
                console.log(t);
                await JOptionPane.showMessageDialog(this, t, "Steady state", JOptionPane.WARNING_MESSAGE);
            }
            this.EHCalculated = true;
        }
        this.StartButton.setEnabled(true);
        this.CancelButton.setEnabled(false);
        this.setVisible(false);
        if (!this.errorJPVM && this.onFinished) this.onFinished(this.run);
    }

    pct(x) { return isFinite(x) ? (100 * x).toPrecision(3) + " %" : "∞"; }

    /** Phoenix: the STEADY line of the status, every step. */
    steadyStatus(n, delta, below) {
        const st = this.steady;
        if (delta === null) return "Steady state: comparing periods from n = " + (2 * st.P - 1) + " (period = " + st.P + " steps)";
        let t = "Difference between the last two periods: " + this.pct(delta);
        if (below > 0) t += " — below " + this.pct(st.tol) + " for " + below + " of " + (2 * st.P) + " steps";
        if (st.cube.length) t += "; cube by cube: " + this.pct(st.cube[st.cube.length - 1].delta);
        return t;
    }

    /**
     * Phoenix: writes results/<SimulName>_E2_<f>Hz (one line per x, like the
     * T files) and gives the viewer E^2 and SAR = sigma.E^2/(2.density).
     */
    saveE2(E2, steps) {
        const name = this.PATH + "/results/" + this.SimulName + "_E2_" + doubleToString(this.f) + "Hz";
        const e2 = E2.getData();
        ResultsDisk.writeMatrix(name, e2, E2.tx, E2.ty * E2.tz);
        this.E2file = name.replace(/^\//, "");
        const sar = new Float32Array(e2.length);
        const sigma = new Float64Array(256), dens = new Float64Array(256), names = [];
        for (const m of this.Mat) {
            // (not in the air, nor in the wire of the antenna)
            if (m.isAir() || m.isConductor() || /^(copper|source)/i.test(m.name()) || !(m.density() > 0)) continue;
            sigma[m.code()] = m.si(this.FIndex); dens[m.code()] = m.density(); names[m.code()] = m.name();
        }
        const codes = this.run.codes;
        let peak = 0, peakCode = 0;
        for (let q = 0; q < e2.length; q++) {
            const c = codes[q];
            if (!dens[c]) continue;
            sar[q] = sigma[c] * e2[q] / (2 * dens[c]);
            if (sar[q] > peak) { peak = sar[q]; peakCode = c; }
        }
        this.run.extra = { E2: Float32Array.from(e2), SAR: sar };
        Object.assign(this.run.info, { E2file: this.E2file, E2steps: steps, peakSAR: peak, peakSARmaterial: names[peakCode] || "-" });
    }

    /** Phoenix: registers this calculation in the viewer's ResultsStore. */
    newResultsRun() {
        const M = this.M;
        const cx = (M.x() - 1) / 2, cy = (M.y() - 1) / 2, cz = (M.z() - 1) / 2;
        const codes = new Uint8Array(cx * cy * cz);
        const d = M.getData();
        let q = 0;
        for (let i = 1; i < M.x(); i += 2)
            for (let j = 1; j < M.y(); j += 2)
                for (let k = 1; k < M.z(); k += 2)
                    codes[q++] = d[i * M.w0 + j * M.w1 + k];
        return ResultsStore.newRun({
            kind: 'EH', name: this.SimulName, dims: [cx, cy, cz], deltas: [this.dx, this.dy, this.dz], codes,
            materials: this.Mat.map(m => ({ code: m.code(), name: m.name(), color: [m.color().getRed(), m.color().getGreen(), m.color().getBlue()] })),
            info: { f: this.f, dt: this.dt, N: this.Nmax, skip: this.skip, NPROC: CalculateEHFrameParallel.NPROC, CCA: this.CCAtype + this.CCAorder },
            sources: this.S.map(s => s.getLocation().slice()),
        });
    }

    save3dmDat3df(nome, PATH) {
        this.save3dm(nome, PATH);
        this.saveDat(nome, PATH);
        this.save3df(nome, PATH);
    }

    /** Phoenix: also writes the 2010 attributes (dt, N, field, axis...), so the file can be opened again. */
    save3dm(N3dm, PATH) {
        const M = this.M;
        const SX = (M.x() - 1) / 2;
        const SY = (M.y() - 1) / 2;
        const SZ = (M.z() - 1) / 2;
        const nome3dm = PATH + "/results/Simul" + N3dm + ".3dm";
        const T = this.thermal || {};
        let o = "";
        o += "<?xml version=\"1.0\" encoding=\"ISO-8859-1\"?>\n";
        o += "<!-- Created by Ana Rodrigues on September 28, 2005, 16:44 PM -->\n";
        o += "<MaterialModel name=\"" + this.SimulName + "\" dimention=\"" + SX + "," + SY + "," + SZ + "\" deltas=\"" + doubleToString(this.dx) + "," + doubleToString(this.dy) + "," + doubleToString(this.dz) + "\"";
        o += " frequency=\"" + this.Freq.map(doubleToString).join(",") + "\"";
        o += " dt=\"" + doubleToString(this.dt) + "\" N=\"" + (this.Nmax - 1) + "\" reduzN=\"" + this.skip + "\"";
        for (const k of ["dtt", "NT", "reduzNT", "Tenv", "Tblood", "Ttissues", "hc"]) if (T[k] !== undefined) o += " " + k + "=\"" + doubleToString(T[k]) + "\"";
        o += ">\n";
        o += "<sources>\n";
        for (let s = 0; s < this.S.length; s++) {
            const S = this.S[s];
            o += "<source type=\"" + S.getType() + "\" field=\"" + S.getField() + "\" axis=\"" + S.getAxis() + "\"" + (S.getPlane ? " plane=\"" + S.getPlane() + "\"" : "") +
                " location=\"" + S.getLocation()[0] + "," + S.getLocation()[1] + "," + S.getLocation()[2] + "\" maxValue=\"" + doubleToString(S.getMaxValue()) + "\" unit=\"" + S.getUnit() + "\"  hard=\"" + S.isHard() + "\"></source>\n";
        }
        o += "</sources>\n";
        o += "<materials>\n";
        for (let m = 0; m < this.NMat; m++) {
            const Mm = this.Mat[m];
            const perFreq = (fn) => Array.from({ length: Mm.nfreq() }, (_, ff) => doubleToString(fn.call(Mm, ff))).join(",");
            o += "<material code=\"" + Mm.code() + "\" color=\"" + Mm.color().getRed() + "," + Mm.color().getGreen() + "," + Mm.color().getBlue() + "\"";
            o += " name=\"" + Mm.name(0) + "\" transparency=\"" + doubleToString(Mm.transp()) + "\" visible=\"" + Mm.visible() + "\"";
            o += " muR=\"" + perFreq(Mm.muR) + "\" epR=\"" + perFreq(Mm.epR) + "\" si=\"" + perFreq(Mm.si) + "\" siC=\"" + perFreq(Mm.siC) + "\" density=\"" + doubleToString(Mm.density()) + "\"";
            o += " C=\"" + doubleToString(Mm.C()) + "\" k=\"" + doubleToString(Mm.K()) + "\" bf=\"" + doubleToString(Mm.Bf()) + "\" hm=\"" + doubleToString(Mm.Hm()) + "\"  e=\"" + doubleToString(Mm.Emissivity()) + "\" kevap=\"" + doubleToString(Mm.Kevap()) + "\"  >";
            o += "</material>\n";
        }
        o += "</materials>\n";
        const nameDat = N3dm + ".dat";
        o += "<datafile name=\"" + "Simul" + nameDat + "\" id=\"0001\"></datafile>\n";
        o += "</MaterialModel>\n";
        ResultsDisk.writeText(nome3dm, o);
    }

    /** (2010 also wrote SimulXH.3df, but no HN file: EscreveH() was called with writeH = false) */
    save3df(N3df, PATH) {
        const M = this.M;
        const SX = (M.x() - 1) / 2;
        const SY = (M.y() - 1) / 2;
        const SZ = (M.z() - 1) / 2;
        const name3df = PATH + "/results/Simul" + N3df + "E.3df";
        let o = "<?xml version=\"1.0\" encoding=\"ISO-8859-1\"?>\n";
        o += "<FieldModel name=\"" + this.SimulName + "\" dimention=\"" + SX + "," + SY + "," + SZ + "\" deltas=\"" + doubleToString(M.dx()) + "," + doubleToString(M.dy()) + "," + doubleToString(M.dz());
        o += "\" timesteps=\"" + (this.Nmax - 1) + "\" units=\"(E [V/m])\">\n";
        o += "<data prefix=\"EN\" initialSufixCount=\"0\" sufixIncrement=\"" + this.skip + "\"></data>\n";
        const name3dm = N3df + ".3dm";
        o += "<MaterialModel location =\"" + "Simul" + name3dm + "\"></MaterialModel>\n";
        o += "</FieldModel>\n";
        ResultsDisk.writeText(name3df, o);
    }

    saveDat(NArq, PATH) {
        const M = this.M;
        const nomeArq = PATH + "/results/Simul" + NArq + ".dat";
        const d = M.getData();
        const parts = [];
        for (let i = 1; i < M.x(); i += 2) {
            let line = "";
            for (let j = 1; j < M.y(); j += 2) {
                for (let k = 1; k < M.z(); k += 2) {
                    line += d[i * M.w0 + j * M.w1 + k] + " ";
                }
            }
            parts.push(line + "\n");
        }
        ResultsDisk.writeText(nomeArq, parts.join(""));
    }
}
