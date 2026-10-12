/*
 * CalculateEHFrameParallel.js
 *
 * Created on 7 de Marco de 2006, 14:57   (CalculateEHFrameParallel.java)
 * Ported to JavaScript in 2026 (CelCamp Phoenix).
 *
 * @author  Ana de Oliveira Rodrigues
 * @version 0.8 - 07/03/2006
 *
 * The window that starts the parallel FD-TD calculation of the electric (E)
 * and magnetic (H) fields, and the master side of the calculation: it
 * spawns the FDTD_slave tasks, sends each one its slice of the expanded
 * model, collects the partial fields and writes the results.
 */
import { jpvmEnvironment } from './jpvm/jpvmEnvironment.js';
import { jpvmBuffer } from './jpvm/jpvmBuffer.js';
import { PvmUtil } from './PvmUtil.js';
import { Field } from './Field.js';
import { DecimalFormat, doubleToString } from './JavaFormat.js';
import { JFrame, JOptionPane } from './swing/JFrame.js';
import { hasDOM, el, JLabel, JTextField, JButton, JRadioButton, ButtonGroup, JSpinner, JProgressBar, JCheckBox, panel, row } from './swing/swing.js';
import { ResultsDisk } from './phoenix/ResultsDisk.js';
import { ResultsStore } from './phoenix/ResultsStore.js';

const TAG_ACK = 905; // Phoenix: see FDTD_slave

export class CalculateEHFrameParallel extends JFrame {

    /**
     * Paralelizacao
     */
    static NPROC = 3; //3

    /** Creates new form CalculateEHFrameParallel */
    constructor(GridSizeX, GridSizeY, GridSizeZ, SName, s, m, mat, Nmat, path) {
        super("Calculate EH (Parallel)");
        this.errorJPVM = false;
        this.gridSizeX = GridSizeX;
        this.gridSizeY = GridSizeY;
        this.gridSizeZ = GridSizeZ;
        this.dx = 0; this.dy = 0; this.dz = 0;
        this.SimulName = SName || "Default";
        this.max = 0;
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
        this.tcalc = null;
        this.stopThread = false;
        this.EHCalculated = false;
        this.tids = null;
        this.jpvm = null;
        this.run = null;           // Phoenix: snapshots for the viewer
        this.onFinished = null;    // Phoenix: callback (run) => void

        this.initComponents();
        this.setSource(s);
        this.setModel(m, Nmat);
        this.setMaterials(mat);
        this.setJPVM();
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
        this.S = s;
        // Phoenix: the sources can be moved here (in 2007 only by editing the .3dm)
        this.SourceFields = [];
        if (!this.SourcesPanel) return;
        this.SourcesPanel.innerHTML = '';
        this.SourcesPanel.appendChild(el('legend', null, 'Sources (expanded grid: 0..' + (this.gridSizeX - 1) + ', 0..' + (this.gridSizeY - 1) + ', 0..' + (this.gridSizeZ - 1) + ')'));
        s.forEach((src, i) => {
            const L = src.getLocation();
            const f = { x: new JTextField(String(L[0]), 4), y: new JTextField(String(L[1]), 4), z: new JTextField(String(L[2]), 4), max: new JTextField(doubleToString(src.getMaxValue()), 6) };
            this.SourceFields.push(f);
            const kind = Field.isE(L[0], L[1], L[2]) ? "E" : Field.isH(L[0], L[1], L[2]) ? "H" : "-";
            this.SourcesPanel.appendChild(row((i + 1) + ") " + src.getType() + (src.isHard() ? " (hard)" : ""), "x", f.x, "y", f.y, "z", f.z, "max", f.max, src.getUnit()));
            this.SourcesPanel.lastChild.title = "The parity of (x,y,z) decides the component: odd/even/even = Ex, even/odd/odd = Hx, etc. Now on a" + (kind === "-" ? " point with no field component" : "n " + kind + " point") + ".";
        });
    }

    /** Phoenix: reads the source fields back into the Source objects. */
    async readSources() {
        for (let i = 0; i < this.SourceFields.length; i++) {
            const f = this.SourceFields[i];
            const L = [f.x, f.y, f.z].map(t => parseInt(t.getText(), 10));
            const max = Number(f.max.getText());
            const lim = [this.gridSizeX, this.gridSizeY, this.gridSizeZ];
            if (L.some((v, a) => !(v >= 0 && v < lim[a])) || !isFinite(max)) {
                await JOptionPane.showMessageDialog(this, "Fonte " + (i + 1) + " fora do modelo!", "ERRO NA FONTE", JOptionPane.ERROR_MESSAGE);
                return false;
            }
            this.S[i].setLocation(L);
            this.S[i].setMaxValue(max);
        }
        return true;
    }

    setModel(m, nm) {
        this.M = m;
        this.NMat = nm;
        this.dx = m.dx(); this.dy = m.dy(); this.dz = m.dz();
        const c = 3e8;
        const InvertDeltas = 1 / (this.dx * this.dx) + 1 / (this.dy * this.dy) + 1 / (this.dz * this.dz);
        const MinDT = 1 / (2 * c * Math.sqrt(InvertDeltas));
        const DF = new DecimalFormat("0.000E00");
        this.DTField.setText("" + DF.format(MinDT));
        this.dt = MinDT;
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
        this.max = max;
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
            await JOptionPane.showMessageDialog(this, "Delta T menor do que o minimo! Alterado para " + this.dt + "s !", "ERRO NO Delta T", JOptionPane.ERROR_MESSAGE);
        }
    }

    /**
     * Phoenix: the X partition. In 2007 every slave got (tamanhoOriginal/NPROC)
     * cubes and the program exited when that was not an integer
     * ("PARALELIZACAO NO X NAO E' POSSIVEL..."). Now the cubes are spread as
     * evenly as possible; when NPROC divides them the result is the same.
     * Returns [Xi, Xf] (expanded grid, inclusive) for slave i.
     */
    static partition(TX, NPROC, i) {
        const tamanhoOriginal = (TX - 1) / 2;
        const Xi = 2 * Math.floor(i * tamanhoOriginal / NPROC);
        const Xf = 2 * Math.floor((i + 1) * tamanhoOriginal / NPROC);
        return [Xi, Xf];
    }

    /** Phoenix: memory needed by the calculation (3 fields in the slaves + 1 in the master). */
    updateMemoryEstimate() {
        if (!this.M || !this.MemLabel) return;
        const points = this.M.x() * this.M.y() * this.M.z();
        const bytes = points * 8 * 4 + points;
        const mb = bytes / (1024 * 1024);
        this.MemLabel.setText("Memory needed ≈ " + (mb > 1024 ? (mb / 1024).toFixed(1) + " GB" : Math.ceil(mb) + " MB") +
            " (" + this.M.x() + "×" + this.M.y() + "×" + this.M.z() + " points)");
        if (this.MemLabel.el) this.MemLabel.el.classList.toggle('warning', mb > 1500);
    }

    /** This method is called from within the constructor to initialize the form. */
    initComponents() {
        this.FreqButtonGroup = new ButtonGroup();
        this.CCAButtonGroup = new ButtonGroup();
        this.jLabel1 = new JLabel("EH Simulation Parameters (Parallel):", "jtitle");
        this.NField = new JTextField("61", 7);
        this.DTField = new JTextField("5e-12", 10);
        this.SkipText = new JTextField("1", 5);
        this.NProcSpinner = new JSpinner(Math.max(1, Math.min(8, (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) ? navigator.hardwareConcurrency - 1 : 3)), 1, 64);
        this.Mur1RadioButton = new JRadioButton("Mur 1st Order", true);
        this.Mur2RadioButton = new JRadioButton("Mur 2nd Order");
        this.PMLRadioButton = new JRadioButton("PML");
        this.Mur2RadioButton.setToolTipText("Mur2aOrdem() was left commented out in 2007: behaves as 1st order.");
        this.PMLRadioButton.setToolTipText("PML was never implemented: the boundary stays at zero (a perfect conductor).");
        this.CCAButtonGroup.add(this.Mur1RadioButton);
        this.CCAButtonGroup.add(this.Mur2RadioButton);
        this.CCAButtonGroup.add(this.PMLRadioButton);
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
        this.max = parseInt(Nstring, 10);
        this.skip = parseInt(this.SkipText.getText(), 10);
        if (!(this.max > 0) || !(this.skip > 0)) {
            await JOptionPane.showMessageDialog(this, "N e skip devem ser inteiros positivos!", "ERRO", JOptionPane.ERROR_MESSAGE);
            this.StartButton.setEnabled(true); this.CancelButton.setEnabled(false);
            return;
        }
        if (!(await this.readSources())) {
            this.StartButton.setEnabled(true); this.CancelButton.setEnabled(false);
            return;
        }
        CalculateEHFrameParallel.NPROC = this.NProcSpinner.getValue() || 1;
        ResultsDisk.enabled = this.WriteFilesCheckBox.isSelected();
        this.setMaxMin(0, this.max);
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
        console.log("*** Calculando os campos eletrico (E) e magnetico (H) por " + this.max + " instantes de tempo com DeltaT=" + this.dt + "s ...");
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

    async CalculateEHParallel() {
        let frequencia;
        if (this.FIndex === 0)
            frequencia = "900MHz";
        else if (this.FIndex === 1)
            frequencia = "1,8GHz";
        else
            frequencia = " INVALIDA!!! ";
        console.log("*** Valor da Frequencia = " + frequencia);

        const NPROC = CalculateEHFrameParallel.NPROC;
        let tagAtual = 12344;
        const comecou = new Date();
        const TX = this.gridSizeX;
        const tamanhoOriginal = (TX - 1) / 2;
        if (NPROC > tamanhoOriginal) {
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
                buf.pack(this.max);
                buf.pack(this.skip); // Phoenix
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
                if (tamModelo % 2 !== 1)
                    console.log(" *** ERRO!! TamModelo nao gera cubos inteiros!!");
                buf = new jpvmBuffer();
                buf.pack(tamModelo);
                buf.pack(ModelY);
                buf.pack(ModelZ);
                buf.pack(this.dx);
                buf.pack(this.dy);
                buf.pack(this.dz);
                buf.pack(this.dt);
                buf.pack(this.CCAtype);
                buf.pack(this.CCAorder);
                buf.pack(Xi); // Phoenix
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
            const FieldAtual = new Field(ModelX, ModelY, ModelZ, "EH", vI);
            const t0 = performance.now();
            for (let cont = 0; cont < this.max; cont++) {
                let n = 0;
                const save = (cont % this.skip === 0 || cont === this.max - 1);
                for (let i = 0; i < NPROC; i++) {
                    if (this.stopThread)
                        return;
                    // 4) RECEBE O N DOS SLAVES E ATUALIZA BARRA
                    const tagN = 197 + cont;
                    const message = await jpvm.pvm_recv(tids[i], tagN);
                    n = message.buffer.upkint();
                    //5) RECEBE OS ARQUIVOS DE CADA SLAVE (Phoenix: only when saving)
                    if (save) {
                        const tagResposta = 900;
                        await PvmUtil.printMessageFromSlave(jpvm, tids[i], (902), false);
                        const Partial = await PvmUtil.receivePartialField(jpvm, tids[i], tagResposta);
                        await PvmUtil.printMessageFromSlave(jpvm, tids[i], (904), false);
                        //6) JUNTA OS DADOS EM UM UNICO PONTEIRO
                        const [Xi] = CalculateEHFrameParallel.partition(TX, NPROC, i);
                        const Xf = Xi + Partial.tx;
                        FieldAtual.setValuesData(Partial, Xi, Xf, 0, ModelY, 0, ModelZ);
                        jpvm.pvm_send(new jpvmBuffer(), tids[i], TAG_ACK);
                    }
                }
                if (this.barValue() < (n + 1))
                    this.setBar(n + 1);
                const elapsed = (performance.now() - t0) / 1000;
                this.StatusLabel.setText("n = " + (n + 1) + " / " + this.max + "   (" + ((cont + 1) / Math.max(elapsed, 1e-3)).toFixed(1) + " steps/s)");
                //7) GRAVA RESPOSTA EM DISCO DEPOIS DE RECEBER DE TODOS OS SLAVES
                if (save) {
                    const r = FieldAtual.Save(this.PATH, this.SimulName, n, this);
                    ResultsStore.addSnapshot(this.run, n, r);
                    console.log("** CalculateEHFrameParallel::CalculateEHParallel():: GRAVANDO ARQUIVO " + this.PATH + "/results/EN" + n + ".");
                }
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
            const texto = "Fim da Simulacao!! Tempo = " + (tempoTotal / 1000.0) + "s.";
            await JOptionPane.showMessageDialog(this, texto, "End of Simulation", JOptionPane.INFORMATION_MESSAGE);
            this.EHCalculated = true;
        }
        this.StartButton.setEnabled(true);
        this.CancelButton.setEnabled(false);
        this.setVisible(false);
        if (!this.errorJPVM && this.onFinished) this.onFinished(this.run);
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
            info: { f: this.f, dt: this.dt, N: this.max, skip: this.skip, NPROC: CalculateEHFrameParallel.NPROC, CCA: this.CCAtype + this.CCAorder },
            // the cube that contains each source (expanded point 2c+1 is the centre of cube c)
            sources: this.S.map(s => s.getLocation().map((v, a) => Math.max(0, Math.min(Math.floor(v / 2), [cx, cy, cz][a] - 1)))),
        });
    }

    save3dmDat3df(nome, PATH) {
        this.save3dm(nome, PATH);
        this.saveDat(nome, PATH);
        this.save3df(nome, PATH);
    }

    save3dm(N3dm, PATH) {
        const M = this.M;
        const SX = (M.x() - 1) / 2;
        const SY = (M.y() - 1) / 2;
        const SZ = (M.z() - 1) / 2;
        const nome3dm = PATH + "/results/Simul" + N3dm + ".3dm";
        let o = "";
        o += "<?xml version=\"1.0\" encoding=\"ISO-8859-1\"?>\n";
        o += "<!-- Created by Ana Rodrigues on September 28, 2005, 16:44 PM -->\n";
        o += "<MaterialModel name=\"" + this.SimulName + "\" dimention=\"" + SX + "," + SY + "," + SZ + "\" deltas=\"" + doubleToString(this.dx) + "," + doubleToString(this.dy) + "," + doubleToString(this.dz) + "\"";
        o += " frequency=\"" + doubleToString(this.f) + "\">\n";
        o += "<sources>\n";
        for (let s = 0; s < this.S.length; s++) {
            const S = this.S[s];
            o += "<source type=\"" + S.getType() + "\" location=\"" + S.getLocation()[0] + "," + S.getLocation()[1] + "," + S.getLocation()[2] + "\" maxValue=\"" + doubleToString(S.getMaxValue()) + "\" unit=\"" + S.getUnit() + "\"  hard=\"" + S.isHard() + "\"></source>\n";
        }
        o += "</sources>\n";
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

    save3df(N3df, PATH) {
        const M = this.M;
        const SX = (M.x() - 1) / 2;
        const SY = (M.y() - 1) / 2;
        const SZ = (M.z() - 1) / 2;
        let name3df = PATH + "/results/Simul" + N3df + "E.3df";
        let o = "<?xml version=\"1.0\" encoding=\"ISO-8859-1\"?>\n";
        o += "<FieldModel name=\"" + this.SimulName + "\" dimention=\"" + SX + "," + SY + "," + SZ + "\" deltas=\"" + doubleToString(M.dx()) + "," + doubleToString(M.dy()) + "," + doubleToString(M.dz());
        o += "\" timesteps=\"" + (this.max - 1) + "\" units=\"(E [V/m])\">\n";
        o += "<data prefix=\"EN\" initialSufixCount=\"0\" sufixIncrement=\"" + this.skip + "\"></data>\n";
        const name3dm = N3df + ".3dm";
        o += "<MaterialModel location =\"" + "Simul" + name3dm + "\"></MaterialModel>\n";
        o += "</FieldModel>\n";
        ResultsDisk.writeText(name3df, o);

        name3df = PATH + "/results/Simul" + N3df + "H.3df";
        o = "<?xml version=\"1.0\" encoding=\"ISO-8859-1\"?>\n";
        o += "<FieldModel name=\"" + this.SimulName + "\" dimention=\"" + SX + "," + SY + "," + SZ + "\" deltas=\"" + doubleToString(M.dx()) + "," + doubleToString(M.dy()) + "," + doubleToString(M.dz()) + "\" timesteps=\"" + this.max + "\" units=\"(H [A/m])\">\n";
        o += "<data prefix=\"HN\" initialSufixCount=\"0\" sufixIncrement=\"" + this.skip + "\"></data>\n";
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
