/*
 * SimulData.js
 *
 * Created on 15 de Setembro de 2005, 11:14   (SimulData.java)
 * Ported to JavaScript in 2026 (CelCamp Phoenix).
 *
 * @author  juliano
 *
 * The "Simulation Data" window: name, size, deltas, frequencies and the
 * table of materials of the model just opened.
 */
import { JFrame } from './swing/JFrame.js';
import { hasDOM, el } from './swing/swing.js';
import { DecimalFormat, doubleToString } from './JavaFormat.js';

export class SimulData extends JFrame {

    /** Creates new form SimulData (Java overloads: (), (name,sx,sy,sz,dx,dy,dz), (..., Material[] M, int nm)) */
    constructor(name, sx, sy, sz, dx, dy, dz, M, nm) {
        super("Simulation Data");
        this.Language = 0;
        this.initComponents();
        if (name === undefined) return;
        let formatter = new DecimalFormat("0");
        this.SimulNameLabel.textContent = name;
        this.SizeXLabel.textContent = "" + formatter.format(sx);
        this.SizeYLabel.textContent = "" + formatter.format(sy);
        this.SizeZLabel.textContent = "" + formatter.format(sz);
        formatter = new DecimalFormat("0E0");
        this.DXLabel.textContent = "" + formatter.format(dx);
        this.DYLabel.textContent = "" + formatter.format(dy);
        this.DZLabel.textContent = "" + formatter.format(dz);
        if (!M) return;

        let fvalor = "Frequency = ";
        for (let f = 0; f < M[0].nfreq(); f++) {
            fvalor = fvalor + doubleToString(M[0].freq(f)) + "Hz";
            if (f < M[0].nfreq() - 1)
                fvalor = fvalor + ", ";
        }
        this.FreqLabel.textContent = fvalor;

        const ColumnNames = ["Material", "Code", "Density", "RGB", "muR", "epR", "sigma", "sigmaC", "C", "k", "bf", "hm", "e", "kvap"];
        this.rows = [ColumnNames];
        for (let m = 0; m < nm; m++) {
            const nfreq = M[m].nfreq();
            let DF = new DecimalFormat("00.00");
            const r = [];
            r.push(M[m].name(this.Language));
            r.push(String(M[m].code()));
            r.push(doubleToString(M[m].density()));
            const c = M[m].color();
            r.push({ text: "|" + c.getRed() + "," + c.getGreen() + "," + c.getBlue() + "|", swatch: c.toCss() });
            let valor = "";
            for (let f = 0; f < nfreq; f++) valor = valor + " | " + doubleToString(M[m].muR(f));
            r.push(valor);
            valor = "";
            for (let f = 0; f < nfreq; f++) valor = valor + " | " + DF.format(M[m].epR(f));
            r.push(valor);
            valor = "";
            for (let f = 0; f < nfreq; f++) valor = valor + " | " + doubleToString(M[m].si(f));
            r.push(valor);
            valor = "";
            for (let f = 0; f < nfreq; f++) valor = valor + " | " + doubleToString(M[m].siC(f));
            r.push(valor);
            r.push(doubleToString(M[m].C()));
            r.push(doubleToString(M[m].K()));
            DF = new DecimalFormat("00000");
            r.push(DF.format(M[m].Bf()));
            r.push(doubleToString(M[m].Hm()));
            r.push(doubleToString(M[m].Emissivity()));
            r.push(doubleToString(M[m].Kevap()));
            this.rows.push(r);
        }
        this.fillTable();
        this.pack();
    }

    setLanguage(i) { this.Language = i; }
    getLanguage() { return this.Language; }

    /** This method is called from within the constructor to initialize the form. */
    initComponents() {
        if (!hasDOM) { this.SimulNameLabel = {}; this.SizeXLabel = {}; this.SizeYLabel = {}; this.SizeZLabel = {}; this.DXLabel = {}; this.DYLabel = {}; this.DZLabel = {}; this.FreqLabel = {}; return; }
        const cp = this.getContentPane();
        cp.classList.add('simuldata');
        const NamePanel = el('div', 'simul-name');
        NamePanel.append(el('span', 'king-richard', 'Simulation = '), this.SimulNameLabel = el('span', 'simul-name-value', 'DEFAULT'));
        const SizePanel = el('div', 'simul-line');
        SizePanel.append('SizeX = ', this.SizeXLabel = el('span', null, '0'), '  SizeY = ', this.SizeYLabel = el('span', null, '0'), '  SizeZ = ', this.SizeZLabel = el('span', null, '0'));
        const DeltaPanel = el('div', 'simul-line');
        DeltaPanel.append('DX = ', this.DXLabel = el('span', null, '0.0'), ' m  DY = ', this.DYLabel = el('span', null, '0.0'), ' m  DZ = ', this.DZLabel = el('span', null, '0.0'), ' m');
        this.FreqLabel = el('div', 'simul-line', 'Frequency = 0Hz');
        this.MaterialsPanel = el('div', 'simul-table-wrap');
        cp.append(NamePanel, SizePanel, DeltaPanel, this.FreqLabel, this.MaterialsPanel);
    }

    fillTable() {
        if (!hasDOM) return;
        const table = el('table', 'simul-table');
        this.rows.forEach((r, ri) => {
            const tr = el('tr', ri === 0 ? 'simul-header' : null);
            for (const cell of r) {
                const td = el(ri === 0 ? 'th' : 'td');
                if (typeof cell === 'object') {
                    const sw = el('span', 'swatch'); sw.style.background = cell.swatch;
                    td.append(sw, cell.text);
                } else td.textContent = cell;
                tr.appendChild(td);
            }
            table.appendChild(tr);
        });
        this.MaterialsPanel.innerHTML = '';
        this.MaterialsPanel.appendChild(table);
    }
}
