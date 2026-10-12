/*
 * HelpFrame.js
 *
 * Created on 2006 (HelpFrame.java)
 * Ported to JavaScript in 2026 (CelCamp Phoenix).
 *
 * The Help window: a "Contents" tree and an alphabetical "Index", showing
 * the pages of baseTextos/ (2006) plus pages about the web version.
 */
import { JFrame } from './swing/JFrame.js';
import { hasDOM, el } from './swing/swing.js';

const IMG = (f) => new URL('../help/' + f, import.meta.url).href;

/** The pages. The first four are the 2006 baseTextos/*.html texts. */
const PAGES = {
    "New": `<h2>New</h2>
<p>Creates a new simulation using a Model File.</p>
<p>The first figure shows the initial screen of CelCamp.</p>
<img src="${IMG('01_TelaInicial.jpg')}" alt="The main window of JCelCamp v1.2 in 2006">
<p>To create a new simulation using a model File, choose <b>File</b> and select <b>New</b> as shown in the following figure.</p>
<img src="${IMG('02_EscolhaNew.jpg')}" alt="The File menu open with New highlighted">
<p>When the option New is chosen, the following screen will open so that you can choose a material model, based on a tree dimensional model (*.3dm).</p>
<img src="${IMG('03_OpenModel.jpg')}" alt="The 2006 Swing file chooser listing .3dm models">
<p>After opening the model, the following screen will open, showing the Simulation Data, and you can calculate Eletromagnetic Fields (see Calculate).</p>
<img src="${IMG('04_SimulationData.jpg')}" alt="The Simulation Data window with the table of materials of the Antena model">
<p class="phoenix-note">In the web version the chooser lists the models that come with the program, the
<code>results/</code> folder, and files from your computer (select the <code>.3dm</code> and its <code>.dat</code> together).</p>`,
    "Open": `<h2>Open</h2><p>Opens a model to be edited using a Materials File (*.txt) and a Model file (*.f3d).</p><p class="phoenix-note">Not implemented in 2006 either.</p>`,
    "Save": `<h2>Save</h2><p>Saves the Model in use under the formats *.f3d (for this program), *.dat (materials matrix) and *.3dm (model for Carnival3D program).</p><p class="phoenix-note">Not implemented in 2006 either.</p>`,
    "Close": `<h2>Close</h2><p>NOT IMPLEMENTED! Closes the current model. If the model is not saved, a question is prompted for the user.</p>`,
    "Eletromagnetic Fields (EH)": `<h2>Calculate &rarr; Eletromagnetic Fields (EH)</h2>
<p>Calculates the electric (V/m) and magnetic (A/m) fields with the FD-TD method. The model is first
<i>expanded</i>: every cube becomes the 3&times;3&times;3 points of a Yee cell, so a model of n&times;m&times;l cubes
becomes (2n+1)&times;(2m+1)&times;(2l+1) points; the parity of each point says which component (Ex, Ey, Ez, Hx, Hy, Hz) it holds.</p>
<ul><li><b>N</b>: number of time steps. <b>DeltaT</b>: the time step (at most the Courant limit).</li>
<li><b>Frequency</b>: one of the frequencies of the model file.</li>
<li><b>Save each</b>: files <code>results/EN&lt;n&gt;</code> and <code>HN&lt;n&gt;</code> (|E| and |H| at the centre of every cube) every that many steps.</li>
<li><b>NPROC</b>: number of slaves (Web Workers). The model is cut in slices along X.</li>
<li><b>CCA</b>: absorbing boundary. Only Mur 1st order works (2nd order was left commented out; PML was never written).</li></ul>
<p>The head (151&times;259&times;259 cubes) expands to 81 million points: use <b>Tools &rarr; Redux Model</b> first.</p>`,
    "Temperature (T)": `<h2>Calculate &rarr; Temperature (T)</h2>
<p>Solves the bioheat equation (Gandhi 2001) on the cubes of the model, with time step DeltaTT (at most 1 s):</p>
<p class="formula">C&middot;m&middot;dT/dt = V&middot;[ &nabla;&middot;(K&nabla;T) + hm + bf&middot;Cb&middot;(Tblood &minus; T) ] &minus; radiation &minus; convection &minus; evaporation</p>
<p>Tenv, hc, Tblood and Ttissues set the situation; <b>Tinit</b> reads the initial temperature of every cube from a file
(for instance the last <code>T_..._N</code> file of a previous run, as in the 2007 "Situacao 1, 2, 3" studies).
Results: <code>results/T_&lt;hc&gt;_&lt;Tenv&gt;_&lt;Tblood&gt;_&lt;Ttissues&gt;_N&lt;n&gt;</code> and <code>TMinAvMax_*.txt</code>.</p>
<p>The steel cube model reproduces the April/2007 validation: Tenv = 90, hc = 115, Ttissues = 450, radiation off.</p>`,
    "SAR to Temperature (SAR->T)": `<h2>SAR to Temperature</h2><p>Planned in 2007 (the SAR term of the temperature equation is still 0), never implemented.</p>`,
    "JPVM": `<h2>JPVM</h2>
<p>In 2006 the calculations ran on a Java Parallel Virtual Machine: a <code>jpvmDaemon</code> on every computer, hosts added
with <code>jpvmConsole</code>, and one JVM per slave. In the web version the virtual machine lives in the page: every slave
is a Web Worker, and the tasks talk through MessageChannels with the same <code>pvm_send</code>/<code>pvm_recv</code> calls.</p>
<p><b>JPVM &rarr; Test</b> spawns 5 <code>Hello_slave</code> tasks. <b>JPVM &rarr; Console</b> lists the tasks and their log files.</p>`,
    "Field Viewer": `<h2>Tools &rarr; Field Viewer</h2><p>Slices of the model (materials), of |E|, |H| or of the temperature, along X, Y or Z,
with a time slider over the saved steps and the MinAvMax curve of the temperature runs. It replaces the MATLAB scripts of 2007
(PlotSliceFields.m, PlotFieldsMovie.m, CompareCubeSteel_2007.m...).</p>`,
    "Results Folder": `<h2>Tools &rarr; Results Folder</h2><p>The files written by the calculations, kept in the browser's private storage
(Origin Private File System) in the same text formats as in 2007. They can be downloaded, opened in the viewer, used as Tinit, or deleted.</p>`,
    "About this port": `<h2>CelCamp Phoenix</h2><p>CelCampJava v1.0 (Copacabana, 2004&ndash;2007) ported to JavaScript in 2026, keeping the classes,
methods and the master/slave protocol of the original. The changes are listed in PORTING.md.</p>`,
};

const TREE = [
    ["Menu Principal", [
        ["File", ["New", "Open", "Save", "Close"]],
        ["Calculate", ["Eletromagnetic Fields (EH)", "SAR to Temperature (SAR->T)", "Temperature (T)"]],
        ["Tools", ["Field Viewer", "Results Folder"]],
        ["JPVM", ["JPVM"]],
        ["Help", ["About this port"]],
    ]],
];

export class HelpFrame extends JFrame {
    constructor() {
        super("Help Window");
        this.setDefaultCloseOperation('dispose');
        if (!hasDOM) return;
        const cp = this.getContentPane();
        cp.classList.add('helpframe');
        const left = el('div', 'help-left');
        const tabs = el('div', 'help-tabs');
        const tContents = el('button', 'help-tab selected', 'Contents');
        const tIndex = el('button', 'help-tab', 'Index');
        tContents.type = tIndex.type = 'button';
        tabs.append(tContents, tIndex);
        const contents = el('div', 'help-tree');
        const index = el('div', 'help-tree');
        index.style.display = 'none';
        this.Text = el('div', 'help-text');
        left.append(tabs, contents, index);
        cp.append(left, this.Text);

        const leaf = (name) => {
            const b = el('button', 'help-leaf', name);
            b.type = 'button';
            b.addEventListener('click', () => this.show(name));
            return b;
        };
        for (const [rootName, groups] of TREE) {
            const r = el('details', 'help-node'); r.open = true;
            r.appendChild(el('summary', null, rootName));
            for (const [g, leaves] of groups) {
                const d = el('details', 'help-node'); d.open = true;
                d.appendChild(el('summary', null, g));
                for (const l of leaves) d.appendChild(leaf(l));
                r.appendChild(d);
            }
            contents.appendChild(r);
        }
        // Indice Alfabetico
        const names = Object.keys(PAGES).sort((a, b) => a.localeCompare(b));
        for (const letter of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
            const these = names.filter(n => n[0].toUpperCase() === letter);
            if (!these.length) continue;
            index.appendChild(el('div', 'help-letter', letter));
            for (const n of these) index.appendChild(leaf(n));
        }
        tContents.addEventListener('click', () => { contents.style.display = ''; index.style.display = 'none'; tContents.classList.add('selected'); tIndex.classList.remove('selected'); });
        tIndex.addEventListener('click', () => { contents.style.display = 'none'; index.style.display = ''; tIndex.classList.add('selected'); tContents.classList.remove('selected'); });
        this.show("New");
    }

    show(texto) {
        console.log("** Selecionou o no " + texto + "!");
        this.Text.innerHTML = PAGES[texto] || ("<p>\"" + texto + "\" nao encontrado!</p>");
        this.Text.scrollTop = 0;
    }
}
