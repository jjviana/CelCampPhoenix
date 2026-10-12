/*
 * CalculateTFrameParallel.js
 *
 * Created on 29 de Marco de 2007, 13:57   (CalculateTFrameParallel.java)
 * Ported to JavaScript in 2026 (CelCamp Phoenix).
 *
 * @author  juliano
 *
 * The window and master side of the temperature calculation
 * (slaves: FDTD_T_slave).
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

const TAG_ACK = 905; // Phoenix: see FDTD_T_slave

export class CalculateTFrameParallel extends JFrame {

    /**
     * Paralelizacao
     */
    static NPROC = 1; //3

    /** Creates new form CalculateTFrameParallel */
    constructor(GridSizeX, GridSizeY, GridSizeZ, SName, s, m, mat, Nmat, path) {
        super("Calculate T (Parallel)");
        /** MINHAS VARIAVEIS **/
        this.errorJPVM = false;
        this.gridSizeX = GridSizeX;
        this.gridSizeY = GridSizeY;
        this.gridSizeZ = GridSizeZ;
        this.dx = 0; this.dy = 0; this.dz = 0;
        this.SimulName = SName || "Default";
        this.SimulDataT = "Default";
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
        this.RadiationEnabled = true;
        this.ConvectionEnabled = true;
        this.EvaporationEnabled = true;
        this.Tinit = null;
        this.TinitLoaded = false;
        this.num_data = 0;
        this.jpvm = null;
        this.tids = null;
        this.run = null;
        this.onFinished = null;

        this.initComponents();
        this.setModel(m, Nmat);
        this.setMaterials(mat);
        this.setJPVM();
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
        this.LoadTinitFileButton.setToolTipText("Reads the initial temperature of every cube from a file (e.g. a T_..._N file of a previous run).");
        this.TinitLabel = new JLabel("", "jnote");
        this.RadiationCheckBox = new JCheckBox("Radiation", true);
        this.ConvectionCheckBox = new JCheckBox("Convection", true);
        this.EvaporationCheckBox = new JCheckBox("Evaporation", true);
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
                row(this.RadiationCheckBox, this.ConvectionCheckBox, this.EvaporationCheckBox)),
            panel(null,
                row("Save each ", this.SkipText, " timesteps"),
                row(this.WriteFilesCheckBox),
                row(this.MemLabel)),
            panel(null, row(this.minimo, this.pBar, this.maximo), row(this.StatusLabel)),
            row(this.StartButton, this.CancelButton));
        cp.lastChild.classList.add('jbuttons');
    }

    async LoadTinitFileButtonMouseClicked() {
        const file = await InputFileChooser.chooseText("Choose the initial temperature file (Tinit)", /tinit|^t_|\/t_/i);
        if (file) {
            this.TinitLoaded = this.ReadTinitFile(file.text, file.name);
            if (this.TinitLoaded) {
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
        this.RadiationEnabled = this.RadiationCheckBox.isSelected();
        this.ConvectionEnabled = this.ConvectionCheckBox.isSelected();
        this.EvaporationEnabled = this.EvaporationCheckBox.isSelected();
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
        await this.TestDTT();
        console.log("*** Calculando o aumento de Temperatura (T) por " + this.max + " instantes de tempo com DeltaTT=" + this.dtT + "s ...");
        this.tTcalc = this.CalculateTParallel();
        return this.tTcalc;
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
        const nome3dm = PATH + "/results/Simul" + N3dm + "_" + this.SimulDataT + ".3dm";
        let o = "<?xml version=\"1.0\" encoding=\"ISO-8859-1\"?>\n";
        o += "<!-- Created by Ana Rodrigues on September 28, 2005, 16:44 PM -->\n";
        o += "<MaterialModel name=\"" + this.SimulName + "\" dimention=\"" + SX + "," + SY + "," + SZ + "\" deltas=\"" + doubleToString(this.dx) + "," + doubleToString(this.dy) + "," + doubleToString(this.dz) + "\" frequency=\"1.8GHz\" >";
        o += "<sources>\n";
        o += "<source type=\"puntual\" location=\"21,21,20\" maxValue=\"1.0\" unit=\"default\" hard=\"true\"></source>\n";
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
        const nameDat = N3dm + "_" + this.SimulDataT + ".dat";
        o += "<datafile name=\"" + "Simul" + nameDat + "\" id=\"0001\"></datafile>\n";
        o += "</MaterialModel>\n";
        ResultsDisk.writeText(nome3dm, o);
    }

    save3dT(N3df, PATH) {
        const M = this.M;
        const SX = M.x(), SY = M.y(), SZ = M.z();
        const name3df = PATH + "/results/Simul" + N3df + "T_" + this.SimulDataT + ".3df";
        let o = "<?xml version=\"1.0\" encoding=\"ISO-8859-1\"?>\n";
        o += "<FieldModel name=\"" + this.SimulName + "\" dimention=\"" + SX + "," + SY + "," + SZ + "\" deltas=\"" + doubleToString(M.dx()) + "," + doubleToString(M.dy()) + "," + doubleToString(M.dz()) + "";
        o += "\" timesteps=\"" + (this.max - 1) + "\" units=\"(T [oC])\">\n";
        o += "<data prefix=\"T_" + this.SimulDataT + "_N\" initialSufixCount=\"0\" sufixIncrement=\"" + this.skip + "\"></data>\n";
        o += "<MaterialModel location =\"" + "Simul" + N3df + "_" + this.SimulDataT + ".3dm\"></MaterialModel>\n";
        o += "</FieldModel>\n";
        ResultsDisk.writeText(name3df, o);
    }

    saveDatT(NArq, PATH) {
        const M = this.M;
        const SX = M.x(), SY = M.y(), SZ = M.z();
        const nomeArq = PATH + "/results/Simul" + NArq + "_" + this.SimulDataT + ".dat";
        console.log("** CalculateEHFrameParallel::saveDat()T:: X = " + SX + "  Y = " + SY + "  Z = " + SZ);
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

    async CalculateTParallel() {
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
                PvmUtil.packBoolean(buf, this.RadiationEnabled);
                PvmUtil.packBoolean(buf, this.ConvectionEnabled);
                PvmUtil.packBoolean(buf, this.EvaporationEnabled);
                PvmUtil.packBoolean(buf, this.TinitLoaded);
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
            this.SimulDataT = "" + doubleToString(this.Henv) + "_" + doubleToString(this.Tenv) + "_" + doubleToString(this.Tblood) + "_" + doubleToString(this.Ttissues);
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
                buf.pack(Xi); // Phoenix
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
            //manda o valor inicial de T:
            if (this.TinitLoaded) {
                for (let i = 0; i < NPROC; i++) {
                    if (this.stopTThread)
                        return;
                    buf = new jpvmBuffer();
                    const [Xi, Xf] = CalculateTFrameParallel.partition(TX, NPROC, i);
                    const tagTinit = 4444;
                    console.log(" ** Mandando Valores Iniciais de T com X = " + Xi + " ate " + Xf);
                    PvmUtil.sendPartialTinit(jpvm, tids[i], buf, Xi, Xf, ModelY, ModelZ, this.Tinit, tagTinit);
                }
            } else
                console.log(" ** Nao Mandou Tinit porque nao foi lido.");
            //confirma o recebimento do Tinit:
            const tagTexto = 34;
            await PvmUtil.printMessageFromSlaves(jpvm, tids, tagTexto, true);

            // 3) MANDA OS MATERIAIS PARA SLAVES
            tagAtual++;
            const FIndex = 0;
            PvmUtil.sendMaterials(jpvm, tids, this.Mat, FIndex, tagAtual);
            //confirma o recebimento dos materiais
            tagAtual++;
            await PvmUtil.printMessageFromSlaves(jpvm, tids, tagAtual, true);
            tagAtual++;

            this.run = this.newResultsRun();
            const vI = 0.0;
            const FieldAtualT = new Field(ModelX, ModelY, ModelZ, "EH", vI);
            const t0 = performance.now();
            for (let cont = 0; cont < this.max; cont++) {
                let n = 0;
                for (let i = 0; i < NPROC; i++) {
                    if (this.stopTThread)
                        return;
                    // 4) RECEBE O N DOS SLAVES E ATUALIZA BARRA
                    const tagN = 197 + cont;
                    const message = await jpvm.pvm_recv(tids[i], tagN);
                    n = message.buffer.upkint();
                    //5) RECEBE OS ARQUIVOS DE CADA SLAVE
                    // APENAS QUANDO FOR GRAVAR: em 10/4/2007
                    if (n % this.skip === 0) {
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
                if (cont % 10 === 0 || cont === this.max - 1) {
                    const elapsed = (performance.now() - t0) / 1000;
                    this.StatusLabel.setText("n = " + (n + 1) + " / " + this.max + "   (" + ((cont + 1) / Math.max(elapsed, 1e-3)).toFixed(1) + " steps/s, simulated " + ((n + 1) * this.dtT / 60).toFixed(1) + " min)");
                }
                //7) GRAVA RESPOSTA EM DISCO DEPOIS DE RECEBER DE TODOS OS SLAVES
                if (n % this.skip === 0) {
                    const values = FieldAtualT.SaveT(this.PATH, this.SimulName, n, this, this.SimulDataT);
                    console.log("** CalculateTFrameParallel::CalculateTParallel():: GRAVOU ARQUIVO TEMPO = " + this.PATH + "/results/T_" + this.SimulDataT + "_N" + n);
                    const mam = FieldAtualT.SaveMinAvMaxT(this.PATH, this.SimulName, n, this, this.max, this.skip, this.Tenv, this.SimulDataT);
                    ResultsStore.addSnapshot(this.run, n, { T: values });
                    ResultsStore.addSeries(this.run, n, mam);
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
            const texto = "Fim da Simulacao!! Tempo = " + (tempoTotal / 1000.0) + "s.";
            await JOptionPane.showMessageDialog(this, texto, "End of Simulation", JOptionPane.INFORMATION_MESSAGE);
            this.TCalculated = true;
        }
        this.StartButton.setEnabled(true);
        this.CancelButton.setEnabled(false);
        this.setVisible(false);
        if (!this.errorJPVM && this.onFinished) this.onFinished(this.run);
    }

    /** Phoenix: registers this calculation in the viewer's ResultsStore. */
    newResultsRun() {
        const M = this.M;
        return ResultsStore.newRun({
            kind: 'T', name: this.SimulName + " (T " + this.SimulDataT + ")", dims: [M.x(), M.y(), M.z()],
            deltas: [this.dx, this.dy, this.dz], codes: M.getData(),
            materials: this.Mat.map(m => ({ code: m.code(), name: m.name(), color: [m.color().getRed(), m.color().getGreen(), m.color().getBlue()] })),
            info: { dtT: this.dtT, N: this.max, skip: this.skip, NPROC: CalculateTFrameParallel.NPROC, Tenv: this.Tenv, hc: this.Henv, Tblood: this.Tblood, Ttissues: this.Ttissues },
        });
    }
}
