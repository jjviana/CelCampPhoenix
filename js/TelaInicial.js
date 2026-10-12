/*
 * TelaInicial.js
 *
 * Created on August 26, 2004, 2:11 PM   (TelaInicial.java)
 * Ported to JavaScript in 2026 (CelCamp Phoenix).
 *
 * @author  Ana de Oliveira Rodrigues
 * @version 0.1 - 06 de Marco de 2006
 *
 * ATENCAO PARA ROTEIRO DA JPVM:          (2006)
 *    - deve abrir o jpvmDaemon antes de rodar o programa
 * (2026: the daemon now lives inside the page - nothing to start by hand.)
 *
 * The main window ("Copacabana v1.0"): the menus, and the reading of the
 * model files (*.3dm + *.dat).
 */
import { JFrame, JMenuBar, JMenu, JMenuItem, JOptionPane } from './swing/JFrame.js';
import { hasDOM, el } from './swing/swing.js';
import { SAXBuilder } from './phoenix/MiniJDOM.js';
import { Material, Color } from './Material.js';
import { Model } from './Model.js';
import { PuntualSource } from './PuntualSource.js';
import { LinearSource } from './LinearSource.js';
import { SimulData } from './SimulData.js';
import { CalculateEHFrameParallel } from './CalculateEHFrameParallel.js';
import { CalculateTFrameParallel } from './CalculateTFrameParallel.js';
import { InputFileChooser } from './InputFileChooser.js';
import { HelpFrame } from './HelpFrame.js';
import { jpvmEnvironment } from './jpvm/jpvmEnvironment.js';
import { jpvmTaskId } from './jpvm/jpvmTaskId.js';
import './jpvm/jpvmDaemon.js';

const ICON = new URL('../img/iconeApp.gif', import.meta.url).href;
const ICON_SMALL = new URL('../img/iconeApp_small.gif', import.meta.url).href;

export class TelaInicial extends JFrame {

    static MAXBUFFER = 1000000;
    static CurrentDir = "";   // 2007: "/home/juliano/AAA_AnaPermanente/CelCampJava_v1.0"

    /** Creates new form TelaInicial */
    constructor() {
        super("Copacabana  v1.0");
        /**
         * Constant parameters
         */
        this.cc = 2.99792458e8;   //light velocity

        /** Parametros de Simulacao **/
        this.SimulName = "Default";
        this.Language = "portugues";
        this.nLang = 1;
        this.Freq = null;
        this.nFreq = 0;
        this.S = null;
        this.NumSources = 0;
        this.GridSizeX = 0;
        this.GridSizeY = 0;
        this.GridSizeZ = 0;
        this.dx = 0; this.dy = 0; this.dz = 0;
        this.ModelFileName = null;
        this.model = null;
        this.MaxNumMaterials = 256;
        this.mat = new Array(this.MaxNumMaterials);
        this.NumMaterials = 0;
        this.N = 0;
        this.dt = 0;
        this.ModelWasRead = false;
        this.EHwasCalculated = false;
        this.TwasCalculated = false;
        /** Phoenix: windows that only exist in the web version */
        this.phoenix = { viewer: null, results: null, console: null };

        console.log("*** ATENCAO!!! Atual diretorio = " + TelaInicial.CurrentDir);
        this.initComponents();
    }

    /** This method is called from within the constructor to initialize the form. */
    initComponents() {
        this.jMenuBar1 = new JMenuBar();
        this.FileMenu = new JMenu("File", "F");
        this.MenuNew = new JMenuItem("New", "N", () => this.MenuNewActionPerformed());
        this.MenuNew.setToolTipText("Creates a new simulation using a Model File (*.3dm).");
        this.FileMenu.add(this.MenuNew);
        this.MenuOpen = new JMenuItem("Open", "O");
        this.MenuOpen.setToolTipText("Opens a model to be edited using a Materials File (*.txt) and a Model file (*.f3d).");
        this.MenuOpen.setEnabled(false);
        this.FileMenu.add(this.MenuOpen);
        this.MenuSave = new JMenuItem("Save", "S");
        this.MenuSave.setToolTipText("Saves the Model in use under the formats *.f3d (for this program), *.dat (materials matrix) and *.3dm (model for Carnival3D program).");
        this.MenuSave.setEnabled(false);
        this.FileMenu.add(this.MenuSave);
        this.MenuClose = new JMenuItem("Close", "C");
        this.MenuClose.setToolTipText("NOT IMPLEMENTED! Closes the current model. If the model is not saved, a question is prompted for the user.");
        this.MenuClose.setEnabled(false);
        this.FileMenu.add(this.MenuClose);
        this.jMenuBar1.add(this.FileMenu);

        this.CalculateMenu = new JMenu("Calculate", "C");
        this.CalculateEHMenu = new JMenuItem("Eletromagnetic Fields (EH)", "E", () => this.CalculateEHMenuActionPerformed());
        this.CalculateEHMenu.setToolTipText("Calculates the electric (V/m) and magnetic (A/m) fields.");
        this.CalculateEHMenu.setEnabled(false);
        this.CalculateMenu.add(this.CalculateEHMenu);
        this.CalculateSAR_TMenu = new JMenuItem("SAR to Temperature (SAR->T)", "S", () => this.CalculateSAR_TMenuActionPerformed());
        this.CalculateSAR_TMenu.setToolTipText("Calculates the temperature rise in oC.");
        this.CalculateSAR_TMenu.setEnabled(false);
        this.CalculateMenu.add(this.CalculateSAR_TMenu);
        this.CalculateTMenu = new JMenuItem("Temperature (T)", "T", () => this.CalculateTMenuActionPerformed());
        this.CalculateTMenu.setToolTipText("Calculates the temperature rise in oC.");
        this.CalculateTMenu.setEnabled(false);
        this.CalculateMenu.add(this.CalculateTMenu);
        this.jMenuBar1.add(this.CalculateMenu);

        // Phoenix: tools that replace the MATLAB scripts and the shell
        this.ToolsMenu = new JMenu("Tools", "o");
        this.MenuViewer = new JMenuItem("Field Viewer", "V", () => this.openViewer());
        this.MenuViewer.setToolTipText("Slices of the model, the fields and the temperatures (replaces the MATLAB scripts).");
        this.ToolsMenu.add(this.MenuViewer);
        this.MenuResults = new JMenuItem("Results Folder (results/)", "R", () => this.openResults());
        this.MenuResults.setToolTipText("The files written by the calculations, kept in the browser.");
        this.ToolsMenu.add(this.MenuResults);
        this.ToolsMenu.addSeparator();
        this.MenuRedux = new JMenuItem("Redux Model (halve the resolution)", "d", () => this.MenuReduxActionPerformed());
        this.MenuRedux.setToolTipText("Model.redux(): keeps every second cube, so the EH calculation of the head fits in the browser.");
        this.MenuRedux.setEnabled(false);
        this.ToolsMenu.add(this.MenuRedux);
        this.jMenuBar1.add(this.ToolsMenu);

        this.JPVM = new JMenu("JPVM", "J");
        this.MenuTestJPVM = new JMenuItem("Test", "T", () => this.MenuTestJPVMActionPerformed());
        this.MenuTestJPVM.setToolTipText("Spawns 5 Hello_slave tasks and waits for their messages.");
        this.JPVM.add(this.MenuTestJPVM);
        this.MenuConsoleJPVM = new JMenuItem("Console", "C", () => this.openConsole());
        this.MenuConsoleJPVM.setToolTipText("The tasks of the virtual machine and their log files (jpvmConsole).");
        this.JPVM.add(this.MenuConsoleJPVM);
        this.jMenuBar1.add(this.JPVM);

        this.HelpMenu = new JMenu("Help", "H");
        this.MenuContents = new JMenuItem("Contents", "C", () => this.MenuContentsActionPerformed());
        this.HelpMenu.add(this.MenuContents);
        this.MenuAbout = new JMenuItem("About", "A", () => this.MenuAboutActionPerformed());
        this.MenuAbout.setToolTipText("Information about JCelCamp");
        this.HelpMenu.add(this.MenuAbout);
        this.jMenuBar1.add(this.HelpMenu);

        if (!hasDOM) return;
        this.win.classList.add('telainicial');
        this.setJMenuBar(this.jMenuBar1);
        const jPanel1 = el('div', 'telainicial-panel');
        const jLabel1 = el('img', 'telainicial-icon');
        jLabel1.src = ICON;
        jLabel1.alt = 'CelCamp: a mobile phone radiating next to the letters CC';
        jPanel1.appendChild(jLabel1);
        this.StatusLabel = el('div', 'telainicial-status', 'File → New to open a model');
        this.getContentPane().append(jPanel1, this.StatusLabel);
        this.setDefaultCloseOperation('none');
        this.pack();
    }

    setStatus(t) { if (this.StatusLabel) this.StatusLabel.textContent = t; }

    async CalculateTMenuActionPerformed() {
        if (this.ModelWasRead) {
            const tf = new CalculateTFrameParallel(this.GridSizeX, this.GridSizeY, this.GridSizeZ, this.SimulName, this.S, this.model, this.mat, this.NumMaterials, TelaInicial.CurrentDir);
            tf.setDefaultCloseOperation('dispose');
            tf.onFinished = (run) => this.openViewer(run);
            tf.setLocationByPlatform(true);
            tf.setVisible(true);
            return tf;
        } else {
            await JOptionPane.showMessageDialog(this, "Nao e' possivel calcular porque\n o modelo ainda nao foi lido!\n (Escolha o Modelo em ESCOLHER)", "ERRO NO CALCULO", JOptionPane.ERROR_MESSAGE);
            console.log("*** Nao e' possivel calcular porque o modelo ainda nao foi lido...");
        }
    }

    async MenuTestJPVMActionPerformed() {
        const NPROC = 5;
        console.log("*** MenuTestJPVMActionPerformed():: " + NPROC + " diferentes processos.");
        try {
            // Enroll in the parallel virtual machine...
            const jpvm = new jpvmEnvironment("MenuTestJPVM");
            const nula = new jpvmTaskId();
            const mytid = jpvm.pvm_mytid();
            const tids = new Array(NPROC);
            console.log("*** MenuTestJPVMActionPerformed():: Slave tasks: ");
            await jpvm.pvm_spawn("Hello_slave", NPROC, tids);
            for (let i = 0; i < NPROC; i++)
                console.log("     TASK " + i + " = " + tids[i].toString());
            const received = [];
            for (let i = 0; i < NPROC; i++) {
                const message = await jpvm.pvm_recv();
                const str = message.buffer.upkstr();
                received.push(str);
            }
            console.log("*** CalculateEHFrame::setJPVM():: COMMUNICATION OK!");
            jpvm.pvm_exit();
            await JOptionPane.showMessageDialog(this, "JPVM COMMUNICATION OK!\n\n" + received.join("\n"), "JPVM COMMUNICATION TEST", JOptionPane.INFORMATION_MESSAGE);
            return received;
        } catch (jpe) {
            const texto = "ERROR:" + jpe.toString();
            console.log("*** " + texto);
            await JOptionPane.showMessageDialog(this, texto, "JPVM COMMUNICATION TEST", JOptionPane.ERROR_MESSAGE);
        }
    }

    async CalculateSAR_TMenuActionPerformed() {
        if (this.ModelWasRead) {
            if (this.EHwasCalculated) {
                console.log("*** Calculando o aumento de Temperatura (T)...");
            } else {
                await JOptionPane.showMessageDialog(this, "Nao e' possivel calcular T \n porque EH ainda nao foi calculado!", "ERRO NO CALCULO", JOptionPane.ERROR_MESSAGE);
                console.log("*** Nao e' possivel calcular T porque EH ainda nao foi calculado...");
            }
        } else {
            await JOptionPane.showMessageDialog(this, "Nao e' possivel calcular porque\n o modelo ainda nao foi lido!\n (Escolha o Modelo em ESCOLHER)", "ERRO NO CALCULO", JOptionPane.ERROR_MESSAGE);
            console.log("*** Nao e' possivel calcular porque o modelo ainda nao foi lido...");
        }
    }

    async CalculateEHMenuActionPerformed() {
        if (this.ModelWasRead) {
            /** Tirei da Leitura do Modelo e Passei para dentro do CalculateEH() **/
            console.log("** TelaInicial::ReadInputXMLFile():: Antes do expand() - TamX = " + this.GridSizeX + ", TamY = " + this.GridSizeY + ", TamZ = " + this.GridSizeZ);
            // Phoenix: 2007 expanded `model` itself, so a second EH (or a T)
            // calculation ran on an already expanded model. Expand a copy.
            const expanded = new Model();
            expanded.copy(this.model);
            const points = (2 * expanded.x() + 1) * (2 * expanded.y() + 1) * (2 * expanded.z() + 1);
            const gb = points * 33 / (1024 * 1024 * 1024);
            if (gb > 1.5) {
                const answer = await JOptionPane.showConfirmDialog(this,
                    "The expanded model has " + (points / 1e6).toFixed(0) + " million points and needs about " + gb.toFixed(1) +
                    " GB of memory, more than a browser tab usually gets.\n\nUse Tools → Redux Model first.\n\nOpen the EH window anyway?",
                    "Model too large", JOptionPane.YES_NO_OPTION);
                if (answer !== 0) return;
            }
            expanded.printModel(expanded.x() * expanded.y() * expanded.z() < 200);
            expanded.expand();
            const GX = expanded.x(), GY = expanded.y(), GZ = expanded.z();
            console.log("** TelaInicial::ReadInputXMLFile():: Depois do expand() - TamX = " + GX + ", TamY = " + GY + ", TamZ = " + GZ);

            /** 07/Marco/2006 - A linha a seguir foi substituida pela sua versao paralelizada:
             **  CalculateEHFrame pf = new CalculateEHFrame(GridSizeX, GridSizeY, GridSizeZ, SimulName, S, model, mat, NumMaterials, CurrentDir);
             ***/
            const pf = new CalculateEHFrameParallel(GX, GY, GZ, this.SimulName, this.S, expanded, this.mat, this.NumMaterials, TelaInicial.CurrentDir);
            pf.setDefaultCloseOperation('dispose');
            pf.onFinished = (run) => { this.EHwasCalculated = true; this.openViewer(run); };
            pf.setLocationByPlatform(true);
            pf.setF(this.Freq);
            pf.setVisible(true);
            return pf;
        } else {
            await JOptionPane.showMessageDialog(this, "Nao e' possivel calcular porque\n o modelo ainda nao foi lido!\n (Escolha o Modelo em FILE - New)", "ERRO NO CALCULO", JOptionPane.ERROR_MESSAGE);
            console.log("*** Nao e' possivel calcular porque o modelo ainda nao foi lido...");
        }
    }

    MenuNewActionPerformed() {
        return this.OpenNewModel();
    }

    MenuContentsActionPerformed() {
        const Contents = new HelpFrame();
        console.log("** Chamando o Menu Contents HelpFrame.");
        Contents.setLocationByPlatform(true);
        Contents.setVisible(true);
    }

    MenuAboutActionPerformed() {
        const about = "Copacabana PRODUCT INFORMATION\n\n* Product Version: 1.0 (December 2006) \n* Developed by:\n  Ana de Oliveira Rodrigues (ana@logicstyle.com)\n\n" +
            "* CelCamp Phoenix: ported to the web in 2026\n  (JavaScript, Web Workers instead of JPVM)\n";
        return JOptionPane.showMessageDialog(null, about, "About", JOptionPane.PLAIN_MESSAGE, ICON_SMALL);
    }

    /** Phoenix: Tools -> Redux Model */
    async MenuReduxActionPerformed() {
        if (!this.ModelWasRead) return;
        if (this.model.x() < 5 || this.model.y() < 5 || this.model.z() < 5) {
            await JOptionPane.showMessageDialog(this, "O modelo ja' e' pequeno demais para o redux().", "Redux", JOptionPane.ERROR_MESSAGE);
            return;
        }
        const before = this.model.x() + " x " + this.model.y() + " x " + this.model.z();
        this.model.redux();
        this.GridSizeX = this.model.x(); this.GridSizeY = this.model.y(); this.GridSizeZ = this.model.z();
        this.dx = this.model.dx(); this.dy = this.model.dy(); this.dz = this.model.dz();
        this.SimulName = this.SimulName + "_redux";
        this.model.Name = this.SimulName;
        this.setStatus(this.SimulName + ": " + this.GridSizeX + " × " + this.GridSizeY + " × " + this.GridSizeZ + " cubes");
        const SD = new SimulData(this.model.name(), this.model.x(), this.model.y(), this.model.z(), this.model.dx(), this.model.dy(), this.model.dz(), this.mat, this.NumMaterials);
        SD.setDefaultCloseOperation('dispose');
        SD.setLocationByPlatform(true);
        SD.setVisible(true);
        this.publishModel();
        await JOptionPane.showMessageDialog(this, "Model reduced from " + before + " to " + this.GridSizeX + " x " + this.GridSizeY + " x " + this.GridSizeZ + " cubes\n(deltas doubled).\n\nThe source locations were not changed.", "Redux", JOptionPane.INFORMATION_MESSAGE);
    }

    async OpenNewModel() {
        let IF;
        try {
            IF = await InputFileChooser.chooseModel(TelaInicial.CurrentDir);
            if (!IF) return; //Escolheu Cancel
            this.setStatus("Lendo " + IF.name + " ...");
            if (hasDOM) document.body.classList.add('busy');
            await this.ReadInputXMLFile(IF.text, IF.readDat, IF.name);
        } catch (e) {
            console.log(e.toString(), e);
            this.setStatus("Erro lendo o modelo.");
            await JOptionPane.showMessageDialog(this, "Erro lendo o modelo:\n" + (e.message || e), "ERRO", JOptionPane.ERROR_MESSAGE);
        } finally {
            if (hasDOM) document.body.classList.remove('busy');
        }
    }

    /**
     * Reads a model: `text` is the .3dm (XML) file, `readDat(name)` returns
     * the bytes of the data file it points to.
     */
    async ReadInputXMLFile(text, readDat, fileName) {
        console.log("*** TelaInicial::ReadInputXMLFile():: Arquivo " + fileName);
        const builder = new SAXBuilder();
        const modeldoc = builder.build(text);
        const root = modeldoc.getRootElement();
        if (root.getName() !== "MaterialModel")
            throw new Error("ModelLoader.FileFormatException");

        // Phoenix: reading a second model starts from a clean slate
        this.mat = new Array(this.MaxNumMaterials);
        this.NumMaterials = 0;
        this.NumSources = 0;
        this.dt = 0;

        const tokens = (s) => String(s).split(',').map(t => t.trim()).filter(t => t.length);
        const intValue = (s, err) => { if (!/^[+-]?\d+$/.test(String(s).trim())) throw new Error(err); return parseInt(s, 10); };
        const doubleValue = (s, err) => { const v = Number(String(s).trim()); if (String(s).trim() === "" || Number.isNaN(v)) throw new Error(err); return v; };

        // Get the basic elements...
        this.SimulName = root.getAttributeValue("name");
        if (this.SimulName == null)
            this.SimulName = "Default";

        const frequency = root.getAttributeValue("frequency");
        if (frequency == null)
            throw new Error("ModelLoader.NoFrequencyError");
        let ctok = tokens(frequency);
        this.nFreq = ctok.length;
        this.Freq = ctok.map(f => doubleValue(f, "ModelLoader.FrequencyFormatError"));

        const dimentions = root.getAttributeValue("dimention");
        if (dimentions == null)
            throw new Error("ModelLoader.NoDimentionsError");
        ctok = tokens(dimentions);
        this.GridSizeX = intValue(ctok[0], "ModelLoader.DimentionsSintaxError");
        this.GridSizeY = intValue(ctok[1], "ModelLoader.DimentionsSintaxError");
        this.GridSizeZ = intValue(ctok[2], "ModelLoader.DimentionsSintaxError");
        if (this.GridSizeX <= 0 || this.GridSizeY <= 0 || this.GridSizeZ <= 0)
            throw new Error("ModelLoader.DimentionsSintaxError");
        console.log("*** TelaInicial::ReadInputXMLFile():: TX = " + this.GridSizeX + ", TY = " + this.GridSizeY + ", TZ = " + this.GridSizeZ);

        // Get the deltas
        const deltas = root.getAttributeValue("deltas");
        if (deltas == null)
            throw new Error("ModelLoader.NoDeltasError");
        ctok = tokens(deltas);
        this.dx = doubleValue(ctok[0], "ModelLoader.DeltaFormatError");
        this.dy = doubleValue(ctok[1], "ModelLoader.DeltaFormatError");
        this.dz = doubleValue(ctok[2], "ModelLoader.DeltaFormatError");
        if (this.dx <= 0 || this.dy <= 0 || this.dz <= 0)
            throw new Error("ModelLoader.DeltaFormatError");
        console.log("*** TelaInicial::ReadInputXMLFile():: dx = " + this.dx + ", dy = " + this.dy + ", dz = " + this.dz);

        // Read the materials specification
        const materials = root.getChild("materials");
        if (materials == null)
            throw new Error("ModelLoader.NoMaterialsError");
        const mats = materials.getChildren("material");
        if (mats.length === 0)
            throw new Error("ModelLoader.EmptyMaterialsException");

        const perFreq = (material, attr) => {
            const t = tokens(material.getAttributeValue(attr) || "");
            if (t.length < this.nFreq) throw new Error("ModelLoader: material " + material.getAttributeValue("name") + " has " + t.length + " values of " + attr + " for " + this.nFreq + " frequencies");
            const v = [];
            for (let f = 0; f < this.nFreq; f++) v.push(doubleValue(t[f], "ModelLoader." + attr + "FormatError"));
            return v;
        };

        for (let i = 0; i < mats.length; i++) {
            this.mat[i] = new Material();
            const material = mats[i];

            const Mnames = tokens(material.getAttributeValue("name") || "");

            const scolor = tokens(material.getAttributeValue("color") || "");
            const r = scolor.length > 0 ? intValue(scolor[0], "ModelLoader.MaterialColorFormatError") : -1;
            const g = scolor.length > 1 ? intValue(scolor[1], "ModelLoader.MaterialColorFormatError") : -1;
            const b = scolor.length > 2 ? intValue(scolor[2], "ModelLoader.MaterialColorFormatError") : -1;
            if (r === -1 || g === -1 || b === -1)
                throw new Error("ModelLoader.MaterialColorFormatError");
            const Mcolor = new Color(r, g, b);

            const strans = material.getAttributeValue("transparency");
            let Mtrans = 0.0;
            if (strans != null) Mtrans = doubleValue(strans, "ModelLoader.TransparencyFormatError");

            let Mdensity = 0.0;
            const density = material.getAttributeValue("density");
            if (density != null) Mdensity = doubleValue(density, "ModelLoader.DensityFormatError");

            const scode = material.getAttributeValue("code");
            if (scode == null)
                throw new Error("ModelLoader.NoMaterialCodeError");
            const Mcode = intValue(scode, "ModelLoader.MaterialCodeFormatError");

            const svisible = material.getAttributeValue("visible");
            let Mvisible = true;
            if (svisible != null)
                Mvisible = svisible.trim().toLowerCase() === "true";  // Boolean.valueOf

            const MepR = perFreq(material, "epR");
            const MmuR = perFreq(material, "muR");
            const Msi = perFreq(material, "si");
            const MsiC = perFreq(material, "siC");

            /*
             * Propriedades Termicas
             */
            const therm = (attr) => {
                const v = material.getAttributeValue(attr);
                if (v != null) return doubleValue(v, "ModelLoader." + attr + "FormatError");
                console.log("** TelaInicial::nao achou " + attr);
                return 0;
            };
            const Mc = therm("C"), Mk = therm("k"), Mbf = therm("bf"), Mhm = therm("hm"), Mkevap = therm("kevap"), Me = therm("e");

            this.mat[i].SetPhysicalParam(Mnames, Mcode, Mdensity);
            this.mat[i].SetVisualParam(Mcolor, Mtrans, Mvisible);
            this.mat[i].SetEMParamRelat(this.nFreq, this.Freq, MmuR, MepR, Msi, MsiC);
            this.mat[i].SetTParam(Mc, Mk, Mbf, Mhm, Mkevap, Me);

            for (let ff = 0; ff < this.nFreq; ff++) {
                const vel = this.mat[i].velocity(ff);
                const DTmax = 1 / (vel * Math.sqrt(1 / (this.dx * this.dx) + 1 / (this.dy * this.dy) + 1 / (this.dz * this.dz)));
                if (this.dt > DTmax) {
                    console.log("** TelaInicial::ReadInputXLMFile():: dt > DTmax em " + this.mat[i].name(0) + ". Alterando para dt = " + DTmax + "s.");
                    this.dt = DTmax;
                }
            }
            this.NumMaterials++;
        }
        const temp = new Array(this.NumMaterials);
        for (let mm = 0; mm < this.NumMaterials; mm++)
            temp[mm] = new Material(this.mat[mm]);
        this.mat = temp;

        // Read the sources specification
        const sources = root.getChild("sources");
        if (sources == null)
            throw new Error("ModelLoader.NoSourcesError");
        const srcs = sources.getChildren("source");
        if (srcs.length === 0)
            throw new Error("ModelLoader.EmptySourcesException");

        this.S = new Array(srcs.length);
        for (let i = 0; i < srcs.length; i++) {
            const source = srcs[i];
            const type = source.getAttributeValue("type") || "";
            const slocation = tokens(source.getAttributeValue("location") || "");
            const location = [-1, -1, -1];
            for (let q = 0; q < 3; q++) if (q < slocation.length && /^\d+$/.test(slocation[q])) location[q] = parseInt(slocation[q], 10);
            if (location[0] < 0 || location[1] < 0 || location[2] < 0)
                throw new Error("ModelLoader.SourceLoacationFormatError");

            const smaxValue = source.getAttributeValue("maxValue");
            let maxValue = 0.0;
            if (smaxValue != null) maxValue = doubleValue(smaxValue, "ModelLoader.SourceMaxValueFormatError");

            const unit = source.getAttributeValue("unit");
            if (unit == null)
                throw new Error("ModelLoader.SourceUnitEmptyError");

            const Shardsource = source.getAttributeValue("hard");
            if (Shardsource == null)
                throw new Error("ModelLoader.SourceUnitEmptyError");
            const hardsource = Shardsource.trim().toLowerCase() === "true";

            if (type.toLowerCase() === "puntual") {
                this.S[i] = new PuntualSource(type, location, maxValue, this.Freq, unit, hardsource);
                console.log("*** TelaInicial::ReadInputXMLFile():: Fonte Puntual em (" + location[0] + "," + location[1] + "," + location[2] + ").");
            }
            if (type.toLowerCase() === "linear") {
                const axis = source.getAttributeValue("axis");
                const field = source.getAttributeValue("field");
                const init = intValue(source.getAttributeValue("init"), "ModelLoader.SourceInitFormatError");
                const end = intValue(source.getAttributeValue("end"), "ModelLoader.SourceEndFormatError");
                console.log("   ** TelaInicial::ReadIputXMLFile()::Fonte Linear em " + field + " no eixo " + axis);
                this.S[i] = new LinearSource(axis, field, init, end, type, location, maxValue, this.Freq, unit, hardsource);
            }
            if (!this.S[i]) throw new Error("ModelLoader: unknown source type \"" + type + "\"");
            this.NumSources++;
        }

        // Reads the data.
        const datafile = root.getChild("datafile");
        if (datafile == null)
            throw new Error("ModelLoader.NoDatafileError");
        const filename = datafile.getAttributeValue("name");
        if (filename == null)
            throw new Error("ModelLoader.NoFileNameError");
        const bytes = await readDat(filename);

        this.model = new Model(this.SimulName, this.GridSizeX, this.GridSizeY, this.GridSizeZ, this.dx, this.dy, this.dz);
        TelaInicial.readModelData(bytes, this.model, this.NumMaterials);

        try {
            const SD = new SimulData(this.model.name(), this.model.x(), this.model.y(), this.model.z(), this.model.dx(), this.model.dy(), this.model.dz(), this.mat, this.NumMaterials);
            SD.setDefaultCloseOperation('dispose');
            SD.setLocationByPlatform(true);
            SD.setVisible(true);
            this.simulData = SD;
        } catch (e) {
            console.error(e);
        }
        this.CalculateEHMenu.setEnabled(true);
        this.CalculateTMenu.setEnabled(true);
        this.MenuRedux.setEnabled(true);
        this.ModelWasRead = true;
        this.EHwasCalculated = false;
        this.setStatus(this.SimulName + ": " + this.GridSizeX + " × " + this.GridSizeY + " × " + this.GridSizeZ + " cubes, " + this.NumMaterials + " materials");
        this.publishModel();
    }

    /**
     * The 2007 getNextToken()/Byte.valueOf() loop over the .dat file,
     * done on the raw bytes: whitespace separated integers, x outermost and
     * z varying fastest (the order of the Java loops).
     */
    static readModelData(bytes, model, NumMaterials) {
        const data = model.getData();
        const total = data.length;
        let count = 0, v = 0, inTok = false, neg = false, bad = false;
        const n = bytes.length;
        for (let p = 0; p <= n; p++) {
            const c = p < n ? bytes[p] : 32;
            if (c === 32 || c === 10 || c === 13 || c === 9 || c === 12) {
                if (inTok) {
                    if (bad) throw new Error("ModelLoader: invalid number at cube " + count);
                    if (neg) v = -v;
                    if (count >= total) { count++; break; }
                    if (v < 1 || v >= NumMaterials || v > 127)
                        throw new Error("ModelLoader.InvalidData (" + v + " at cube " + count + ")");
                    data[count++] = v;
                    inTok = false;
                }
            } else {
                if (!inTok) { inTok = true; v = 0; neg = false; bad = false; }
                if (c >= 48 && c <= 57) v = v * 10 + (c - 48);
                else if (c === 45 && !neg && v === 0) neg = true;
                else if (c !== 43) bad = true;
            }
        }
        if (count < total)
            throw new Error("ModelLoader.PrematureEOF (" + count + " of " + total + " cubes)");
    }

    /** Phoenix: lets the Field Viewer show the model just opened. */
    publishModel() {
        if (this.phoenix.viewer && this.phoenix.viewer.showModel) this.phoenix.viewer.showModel(this.modelForViewer());
    }
    modelForViewer() {
        if (!this.ModelWasRead) return null;
        return {
            name: this.SimulName, dims: [this.model.x(), this.model.y(), this.model.z()], deltas: [this.dx, this.dy, this.dz],
            codes: this.model.getData(),
            materials: this.mat.map(m => ({ code: m.code(), name: m.name(), color: [m.color().getRed(), m.color().getGreen(), m.color().getBlue()] })),
            sources: this.S.map(s => s.getLocation()),
        };
    }

    async openViewer(run) {
        if (!hasDOM) return null;
        const { FieldViewer } = await import('./phoenix/FieldViewer.js');
        if (!this.phoenix.viewer || this.phoenix.viewer.disposed) {
            this.phoenix.viewer = new FieldViewer();
            this.phoenix.viewer.setLocationByPlatform(true);
        }
        const v = this.phoenix.viewer;
        if (run) v.showRun(run);
        else if (!v.current && this.ModelWasRead) v.showModel(this.modelForViewer());
        v.setVisible(true);
        return v;
    }

    async openResults() {
        const { ResultsFrame } = await import('./phoenix/ResultsFrame.js');
        if (!this.phoenix.results || this.phoenix.results.disposed) {
            this.phoenix.results = new ResultsFrame((file) => this.openViewerFile(file));
            this.phoenix.results.setLocationByPlatform(true);
        }
        this.phoenix.results.setVisible(true);
        this.phoenix.results.refresh();
    }

    async openViewerFile(path) {
        const v = await this.openViewer();
        await v.loadResultsFile(path);
    }

    async openConsole() {
        const { jpvmConsoleFrame } = await import('./phoenix/jpvmConsoleFrame.js');
        if (!this.phoenix.console || this.phoenix.console.disposed) {
            this.phoenix.console = new jpvmConsoleFrame();
            this.phoenix.console.setLocationByPlatform(true);
        }
        this.phoenix.console.setVisible(true);
    }

    /**
     * @param args the command line arguments
     */
    static main(args) {
        const t = new TelaInicial();
        t.setLocation(16, 16);
        t.setVisible(true);
        return t;
    }
}
