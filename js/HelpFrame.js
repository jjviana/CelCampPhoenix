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
<li><b>Run until steady state</b>: N becomes the maximum. Every step the window shows how much the average of |E|&sup2; (weighted by the SAR of the tissues)
over the last period differs from the period before. When that stays below the tolerance for 2 full periods, and the cubes agree one by one,
the run stops and writes <code>results/&lt;name&gt;_E2_&lt;f&gt;Hz</code>, E&sup2; averaged over the last period, the input of SAR to Temperature.
If N comes first there is a warning and no E&sup2; file.</li>
<li><b>Sources</b>: the cube, field (E/H), axis and amplitude of every source. A source is a hard voltage source
(Elsherbeni &amp; Demir 2009): E(n+1) = &minus;E(n) &minus; 2&middot;Max&middot;sin(&omega;t) on the 4 edges of its cube parallel to the axis.</li></ul>
<p>The whole head (151&times;259&times;259 cubes) expands to 82 million points and needs about 2.6 GB.
<b>Tools &rarr; Redux Model</b> halves the resolution. <b>Tools &rarr; Place Dipole Antenna</b> puts a half-wave dipole beside the head.</p>`,
    "Temperature (T)": `<h2>Calculate &rarr; Temperature (T)</h2>
<p>Solves the bioheat equation (Gandhi 2001) on the cubes of the model, with time step DeltaTT (at most 1 s):</p>
<p class="formula">C&middot;m&middot;dT/dt = V&middot;[ &nabla;&middot;(K&nabla;T) + &rho;&middot;hm + &sigma;E&sup2;/2 + bf&middot;Cb&middot;(Tblood &minus; T) ] &minus; radiation &minus; convection &minus; evaporation</p>
<p>Tenv, hc, Tblood, Ttissues, N, DeltaTT and Save each come from the model file; <b>Tinit</b> reads the initial temperature of every cube
from a file (for instance the last <code>TN&lt;n&gt;</code> file of a previous run, as in the 2007 "Situacao 1, 2, 3" studies).
This menu runs without the field (E&sup2; = 0). With <b>Run until steady state and save it as Tinit</b> (the default) it stops when the temperatures
stop changing (change over a window below 0.01&nbsp;% of the change since the start, twice in a row) and saves them as <code>results/&lt;model&gt;_Tinit</code>,
the starting point of SAR to Temperature. Results: <code>results/TN&lt;n&gt;</code> and <code>TMinAvMax.txt</code>.</p>
<p><b>Conduction between tissues</b>: <i>2010</i> (the default) lets heat flow to every neighbour cube that is not air, as CelCampJava does.
<i>2003</i> reproduces the C program of the thesis (Rodrigues 2003, version of 25/03/2003): K&nabla;&sup2;T only between cubes of the
<i>same</i> tissue; between different tissues only the &nabla;K&middot;&nabla;T term, and only along x, so heat crosses with the conductance |&Delta;K|
instead of K. Its steady state is saved apart, as <code>results/&lt;model&gt;_Tinit_2003</code>.</p>
<p>The steel cube model is the April/2007 validation: Tenv = 90, hc = 115, Ttissues = 450 (then with radiation off; since 2008 radiation is always on).</p>`,
    "SAR to Temperature (SAR->T)": `<h2>Calculate &rarr; SAR to Temperature</h2><p>Added in October 2008: asks for a file with E&sup2; for every cube
(x outermost, z fastest) and runs the temperature calculation with the heat of the field, hem = &sigma;&middot;E&sup2;/2
(SAR = &sigma;E&sup2;/2&rho;). An EH run that reaches the steady state writes that file to <code>results/</code>.</p>
<p>The run always starts from the thermal steady state of the model without SAR, <code>results/&lt;model&gt;_Tinit</code>. When that file does not exist
yet (or was made for another Tenv, Tblood or hc) it is calculated first, then reused by every later run.</p>`,
    "Place Dipole Antenna": `<h2>Tools &rarr; Place Dipole Antenna</h2><p>Writes a dipole into the open model: a wire of copper cubes along an axis,
with a gap cube of air in the middle and a hard E source in the gap; the sources of the model are replaced by it.
<b>Beside the head</b> proposes a half-wave dipole parallel to the longest side of the model, 1 cm from its surface
(on the head: vertical, beside the ear). <b>Thesis 2003</b> sets the antenna of the thesis and of MOMAG 2008 on John3Doe:
half-wave along y, 1.8 GHz, gap at cube (10, 121, 150), 1.86 cm from the skin (on a Redux, the same physical point).
Place it after a Redux, not before.</p>`,
    "JPVM": `<h2>JPVM</h2>
<p>In 2006 the calculations ran on a Java Parallel Virtual Machine: a <code>jpvmDaemon</code> on every computer, hosts added
with <code>jpvmConsole</code>, and one JVM per slave. In the web version the virtual machine lives in the page: every slave
is a Web Worker, and the tasks talk through MessageChannels with the same <code>pvm_send</code>/<code>pvm_recv</code> calls.</p>
<p><b>JPVM &rarr; Test</b> spawns 5 <code>Hello_slave</code> tasks. <b>JPVM &rarr; Console</b> lists the tasks and their log files.</p>`,
    "Field Viewer": `<h2>View &rarr; Field Viewer</h2><p>Slices of the model (materials), of |E|, E&sup2;, SAR, the temperature or its rise, along X, Y or Z,
with a time slider over the saved steps and the MinAvMax curve of the temperature runs. It replaces the MATLAB scripts of 2007
(PlotSliceFields.m, PlotFieldsMovie.m, CompareCubeSteel_2007.m...).</p>
<p>Closing it only hides it: <b>View &rarr; Field Viewer</b> opens it again with what it was showing. The first drop-down
switches between the model and every calculation of the session.</p>`,
    "Results Folder": `<h2>View &rarr; Results Folder</h2><p>The files written by the calculations, kept in the browser's private storage
(Origin Private File System) in the same text formats as in 2007. They can be downloaded, opened in the viewer, used as Tinit, or deleted.</p>`,
    "TLDR": `<h2>TLDR: phone beside the head, from EH to SAR to temperature</h2>
<p>The menus to select, on the reduced head:</p>
<ol>
<li><b>Open the head.</b> <b>File &rarr; New &rarr; John3Doe_v1_0.3dm</b>, then close the Simulation Data window.</li>
<li><b>Reduce it.</b> <b>Tools &rarr; Redux Model &rarr; OK</b>: 75&times;129&times;129 cubes, cube sizes and dt doubled.
Do this <i>before</i> placing the antenna: a one-cube wire placed earlier can fall between the cubes that Redux keeps.</li>
<li><b>Place the phone antenna.</b> <b>Tools &rarr; Place Dipole Antenna&hellip;</b>
  <ul><li>Check the frequency (1.8 GHz by default).</li>
  <li>Keep the proposal (beside the ear, vertical, half-wave, 1 cm from the skin) or press <b>Beside the head</b> to recompute it.
  <b>Thesis 2003</b> puts it where the thesis had it instead (gap at cube 10, 121, 150, 1.86 cm from the skin).</li>
  <li>Optionally set the gap voltage (default 1 V), then <b>Place &rarr; OK</b>.</li></ul></li>
<li><b>Electromagnetic field.</b> <b>Calculate &rarr; Eletromagnetic Fields (EH)</b>
  <ul><li>Select the same frequency as the dipole.</li>
  <li>Leave <b>Run until steady state</b> ticked: N (8000) is only the maximum, the tolerance is 1&nbsp;%.</li>
  <li>Press <b>Start</b>. The status line shows the difference between the last two periods at every step; the run stops by itself
  once that stays below the tolerance for 2 periods.</li>
  <li>The end dialog gives the step where it stopped, the E&sup2; file <code>results/John3Doe_v1_0_redux_E2_1.8E9Hz</code> and the SAR table:
  1 voxel max, 1 g max, 1 g brain max and 1 voxel brain max, compared with Gandhi et al. 1996 (835 MHz/600 mW or 1900 MHz/125 mW, the nearest frequency),
  with the percent error and the values of the thesis. The table is also saved as <code>results/&lt;model&gt;_SAR_&lt;f&gt;Hz.txt</code>.</li>
  <li>If N runs out first you get a warning and no E&sup2; file: increase N and run again.</li></ul></li>
<li><b>SAR.</b> There is no separate SAR menu: SAR = &sigma;E&sup2;/(2&rho;) is computed from that E&sup2; file.
To see it, choose <b>SAR</b> or <b>E&sup2;</b> in the second drop-down of the <b>Field Viewer</b>, which opens at the end of the EH run
(if you close it, <b>View &rarr; Field Viewer</b> opens it again).</li>
<li><b>Temperature with the SAR.</b> <b>Calculate &rarr; SAR to Temperature (SAR-&gt;T)</b>
  <ul><li>Choose <code>results/John3Doe_v1_0_redux_E2_1.8E9Hz</code> in the file list.</li>
  <li>The T window opens with the values of the model file: N = 10001 steps of 1 s for the SAR run, Tenv = 25, Tblood = 36.8, hc = 2.7.</li>
  <li>Its <b>Tinit</b> line says where the run will start from. That is always the thermal steady state of the head <i>without</i> the phone,
  saved in <code>results/John3Doe_v1_0_redux_Tinit</code>.</li>
  <li>Press <b>Start</b>.
    <ul><li>If that file does not exist yet, or was made for another Tenv, Tblood or hc, the run first calculates it.
    It runs without SAR from Ttissues until the change of T over 600 steps is below 0.01&nbsp;% of its change since the start, at 2 checks in a row.
    The status line shows that percentage. It saves the file and then runs the SAR heating from it.</li>
    <li>If the file exists, the SAR run starts from it at once.</li></ul></li>
  <li>At the end the Field Viewer shows <b>T</b> and <b>T rise since n = 0</b>, which is the rise caused by the phone, with the TMinAvMax curves under the image.</li></ul></li>
</ol>
<p><b>The Tinit file:</b></p>
<ul>
<li><b>Calculated once, then reused.</b> It is calculated once per model: one for the full head (<code>John3Doe_v1_0_Tinit</code>), one for the Redux
(<code>John3Doe_v1_0_redux_Tinit</code>). It stays in <code>results/</code> across sessions, and every later SAR run of that model reuses it.
It does not depend on the dipole, which is not part of the thermal calculation.</li>
<li><b>One per conduction scheme.</b> With <b>Conduction between tissues: 2003</b> the steady state is another one, saved as <code>&lt;model&gt;_Tinit_2003</code>.</li>
<li><b>Calculating it in advance.</b> <b>Calculate &rarr; Temperature (T)</b> with <b>Run until steady state and save it as Tinit</b> ticked (the default) also writes it.</li>
<li><b>Settings.</b> The window (600 steps), the tolerance (0.01&nbsp;%) and the maximum (36001 steps = 10 h) are in the T window.
If the maximum comes first, there is a warning, no Tinit and no SAR run.</li>
<li><b>Why 0.01&nbsp;%?</b> On the Redux head, a Tinit made at 1&nbsp;% (80 min of simulated time) still drifts by up to 0.03&nbsp;&deg;C
in the next 30 min without any phone. That is more than the rise caused by a 1&nbsp;V dipole (0.008&nbsp;&deg;C on the full head).
At 0.1&nbsp;% the drift is 0.004&nbsp;&deg;C (130 min); at 0.01&nbsp;% it is 0.0003&nbsp;&deg;C (190 min, about 3 minutes of calculation).
So the default is 0.01&nbsp;%. A Tinit made with a looser tolerance than the one in the window is calculated again.</li>
<li><b>Deleting it.</b> <b>View &rarr; Results Folder &rarr; Delete all</b> also deletes the Tinit files; they are then calculated again.</li>
<li><b>Another starting point.</b> The <b>Tinit</b> button of the T window still lets you choose another file instead.</li>
</ul>
<p><b>Things that break the sequence:</b></p>
<ul>
<li><b>Same session.</b> Do steps 2 to 6 without reopening the model. Reopening it goes back to full resolution without the dipole,
and the reduced E&sup2; file then no longer matches the grid.</li>
</ul>`,
    "About this port": `<h2>CelCamp Phoenix</h2><p>CelCampJava v1.0 (Copacabana, 2004&ndash;2010) ported to JavaScript in 2026 from the version of 27 May 2010, keeping the classes,
methods and the master/slave protocol of the original. The changes are listed in PORTING.md.</p>`,
};

const TREE = [
    ["Menu Principal", [
        ["File", ["New", "Open", "Save", "Close"]],
        ["Calculate", ["Eletromagnetic Fields (EH)", "SAR to Temperature (SAR->T)", "Temperature (T)"]],
        ["View", ["Field Viewer", "Results Folder"]],
        ["Tools", ["Place Dipole Antenna"]],
        ["JPVM", ["JPVM"]],
        ["Help", ["TLDR", "About this port"]],
    ]],
];

export class HelpFrame extends JFrame {
    /** Phoenix: `page` is the page shown first (2006: always "New"). */
    constructor(page) {
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
        this.show(page && PAGES[page] ? page : "New");
    }

    show(texto) {
        console.log("** Selecionou o no " + texto + "!");
        this.Text.innerHTML = PAGES[texto] || ("<p>\"" + texto + "\" nao encontrado!</p>");
        this.Text.scrollTop = 0;
    }
}
