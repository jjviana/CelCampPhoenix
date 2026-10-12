/*
 * main.js  -  CelCamp Phoenix (2026)
 *
 * `java -Xmx700M -cp ../../lib/:. TelaInicial`
 */
import { TelaInicial } from './TelaInicial.js';
import { JOptionPane } from './swing/JFrame.js';

if (location.protocol === 'file:') {
    JOptionPane.showMessageDialog(null,
        "CelCamp Phoenix must be served over HTTP (Web Workers and the results folder do not work from file://).\n\n" +
        "Run `npm start` (or `node serve.mjs`) in the project folder and open http://localhost:8080/",
        "Copacabana v1.0", JOptionPane.ERROR_MESSAGE);
}

const tela = TelaInicial.main([]);
window.celcamp = tela;   // handy in the browser console
