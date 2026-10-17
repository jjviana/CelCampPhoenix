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
becomes (2n+1)&times;(2m+1)&times;(2l+1) points; the parity of each point says which component (Ex, Ey, Ez, Hx, Hy, Hz) it holds.
Every step (2010): the sources, H, E, Mur's boundary, and E along the source axis is zeroed in the cubes of
materials called <i>copper&hellip;</i> or <i>source&hellip;</i> (the wire of the antenna).</p>
<ul><li><b>N</b>: the last time step (steps 0&hellip;N). <b>DeltaT</b>: the time step (at most the Courant limit).
N, DeltaT and Save each come from the <code>dt</code>, <code>N</code> and <code>reduzN</code> of the model file.</li>
<li><b>Frequency</b>: one of the frequencies of the model file.</li>
<li><b>Save each</b>: files <code>results/EN&lt;n&gt;</code> (|E| at the centre of every cube, the average of its 4 parallel edges) every that many steps.</li>
<li><b>NPROC</b>: number of slaves (Web Workers). The model is cut in slices along X, at least 2 cubes each.</li>
<li><b>CCA</b>: absorbing boundary. Only Mur 1st order works (2nd order was left commented out; PML was never written).</li>
<li><b>Record E&sup2;</b>: averages |E|&sup2; over the last period and writes <code>results/&lt;name&gt;_E2_&lt;f&gt;Hz</code>, the input of SAR to Temperature.</li>
<li><b>Sources</b>: the cube, field (E/H), axis and amplitude of every source. A source is a hard voltage source
(Elsherbeni &amp; Demir 2009): E(n+1) = &minus;E(n) &minus; 2&middot;Max&middot;sin(&omega;t) on the 4 edges of its cube parallel to the axis.</li></ul>
<p>The whole head (151&times;259&times;259 cubes) expands to 82 million points and needs about 2.3 GB.
<b>Tools &rarr; Redux Model</b> halves the resolution. <b>Tools &rarr; Place Dipole Antenna</b> puts a half-wave dipole beside the head.</p>`,
    "Temperature (T)": `<h2>Calculate &rarr; Temperature (T)</h2>
<p>Solves the bioheat equation (Gandhi 2001) on the cubes of the model, with time step DeltaTT (at most 1 s):</p>
<p class="formula">C&middot;m&middot;dT/dt = V&middot;[ &nabla;&middot;(K&nabla;T) + &rho;&middot;hm + &sigma;E&sup2;/2 + bf&middot;Cb&middot;(Tblood &minus; T) ] &minus; radiation &minus; convection &minus; evaporation</p>
<p>Tenv, hc, Tblood, Ttissues, N, DeltaTT and Save each come from the model file; <b>Tinit</b> reads the initial temperature of every cube
from a file (for instance the last <code>TN&lt;n&gt;</code> file of a previous run, as in the 2007 "Situacao 1, 2, 3" studies).
This menu runs without the field (E&sup2; = 0). Results: <code>results/TN&lt;n&gt;</code> and <code>TMinAvMax.txt</code>.</p>
<p>The steel cube model is the April/2007 validation: Tenv = 90, hc = 115, Ttissues = 450 (then with radiation off; since 2008 radiation is always on).</p>`,
    "SAR to Temperature (SAR->T)": `<h2>Calculate &rarr; SAR to Temperature</h2><p>Added in October 2008: asks for a file with E&sup2; for every cube
(x outermost, z fastest) and runs the temperature calculation with the heat of the field, hem = &sigma;&middot;E&sup2;/2
(SAR = &sigma;E&sup2;/2&rho;). An EH run with <b>Record E&sup2;</b> writes that file to <code>results/</code>.</p>`,
    "Place Dipole Antenna": `<h2>Tools &rarr; Place Dipole Antenna</h2><p>Writes a dipole into the open model: a wire of copper cubes along an axis,
with a gap cube of air in the middle and a hard E source in the gap; the sources of the model are replaced by it.
<b>Beside the head</b> proposes a half-wave dipole parallel to the longest side of the model, 1 cm from its surface
(on the head: vertical, beside the ear). Place it after a Redux, not before.</p>`,
    "JPVM": `<h2>JPVM</h2>
<p>In 2006 the calculations ran on a Java Parallel Virtual Machine: a <code>jpvmDaemon</code> on every computer, hosts added
with <code>jpvmConsole</code>, and one JVM per slave. In the web version the virtual machine lives in the page: every slave
is a Web Worker, and the tasks talk through MessageChannels with the same <code>pvm_send</code>/<code>pvm_recv</code> calls.</p>
<p><b>JPVM &rarr; Test</b> spawns 5 <code>Hello_slave</code> tasks. <b>JPVM &rarr; Console</b> lists the tasks and their log files.</p>`,
    "Field Viewer": `<h2>Tools &rarr; Field Viewer</h2><p>Slices of the model (materials), of |E|, E&sup2;, SAR, the temperature or its rise, along X, Y or Z,
with a time slider over the saved steps and the MinAvMax curve of the temperature runs. It replaces the MATLAB scripts of 2007
(PlotSliceFields.m, PlotFieldsMovie.m, CompareCubeSteel_2007.m...).</p>`,
    "Results Folder": `<h2>Tools &rarr; Results Folder</h2><p>The files written by the calculations, kept in the browser's private storage
(Origin Private File System) in the same text formats as in 2007. They can be downloaded, opened in the viewer, used as Tinit, or deleted.</p>`,
    "About this port": `<h2>CelCamp Phoenix</h2><p>CelCampJava v1.0 (Copacabana, 2004&ndash;2010) ported to JavaScript in 2026 from the version of 27 May 2010, keeping the classes,
methods and the master/slave protocol of the original. The changes are listed in PORTING.md.</p>`,
};

const TREE = [
    ["Menu Principal", [
        ["File", ["New", "Open", "Save", "Close"]],
        ["Calculate", ["Eletromagnetic Fields (EH)", "SAR to Temperature (SAR->T)", "Temperature (T)"]],
        ["Tools", ["Field Viewer", "Results Folder", "Place Dipole Antenna"]],
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
