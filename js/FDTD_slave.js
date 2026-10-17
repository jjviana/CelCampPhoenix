/*
 * FDTD_slave.js
 *
 * Created on 6 de Marco de 2006, 13:02   (FDTD_slave.java, version of 27/5/2010)
 * Ported to JavaScript in 2026 (CelCamp Phoenix).
 *
 * @author Ana de Oliveira Rodrigues
 * @version 0.1 - 3/Marco/2006
 *
 * One slave of the parallel FD-TD calculation of the electromagnetic field.
 * The master (CalculateEHFrameParallel) cuts the expanded model in slices
 * along X; neighbouring slices share one plane.  In 2006 every slave was a
 * JVM started by jpvmDaemon; now every slave is a Web Worker.
 *
 * Every time step, as in May 2010:
 *   1) Pre-FDTD: the hard voltage sources (Elsherbeni & Demir 2009, 4.1.2)
 *      on the 4 parallel edges of the source cube;
 *   2) H (that has no boundary condition, by its position in the cube);
 *   3) E in the interior;
 *   4) Mur's boundary condition on the faces and on the edges x=y=0,
 *      x=z=0 and y=z=0;
 *   5) Pos-FDTD: E along the source axis is zeroed in the cubes of
 *      materials called "source..." or "copper..." (the dipole wire);
 *   6) the three time levels are shifted;
 *   7) |E| at the cube centres goes to the master every nSkip steps.
 *
 * Phoenix notes:
 *  - in 2010 the master always used NPROC = 1: the borders were exchanged
 *    before the H update (so E on the shared plane used the H of the
 *    previous step), the shared plane was updated twice and the source
 *    offsets ignored the overlap of the slices.  Now the right slave sends
 *    its H after (2), the left slave owns the shared plane and sends it back
 *    after (5), so any NPROC gives the result of NPROC = 1;
 *  - only |E| at the cube centres goes to the master (the 2010 master wrote
 *    nothing else: EscreveH() was called with writeH = false), and the
 *    fields are kept in Float32Array: the head fits in a browser;
 *  - optionally the run goes on until the steady state (see STEADY below)
 *    and |E|^2 averaged over the last period goes to the master, for the
 *    SAR -> T calculation (2010 read that E^2 from a file made elsewhere);
 *  - material properties come from tables indexed by material code instead
 *    of a linear search for every point (same values).
 */
import { jpvmEnvironment } from './jpvm/jpvmEnvironment.js';
import { jpvmBuffer } from './jpvm/jpvmBuffer.js';
import { PvmUtil } from './PvmUtil.js';
import { Model } from './Model.js';
import { Field } from './Field.js';

const TAG_ACK = 905;           // Phoenix: master -> slave "partial received"
const MAX_UNACKED = 2;
const TAG_E2 = 950;            // Phoenix: slave -> master, mean E^2 per cube
const TAG_STEADY = 99001;      // Phoenix: slave -> master, sums of |E|^2 of every step
const TAG_VERDICT = 99002;     // Phoenix: master -> slave at the end of every period: 1 go on, 0 stop

export class FDTD_slave {

    //para a CCA de Mur:
    static cmaX; static cmbX; static cmcX; static cmdX;
    static cmaY; static cmbY; static cmcY; static cmdY;
    static cmaZ; static cmbZ; static cmcZ; static cmdZ;
    static const2aOrdem;

    static async main(args) {
        let jpvm = null;
        let parent = null;
        let myself = null;
        let tagAtual = 12344;
        try {
            // Enroll in the parallel virtual machine...
            jpvm = new jpvmEnvironment();
            // Get my parent's task id...
            parent = jpvm.pvm_parent();
            // Get my task id...
            myself = jpvm.pvm_mytid();
            //Error log
            const logfile = ("LOG:" + myself.getHost() + ":" + myself.getPort() + ".log");
            const print = PvmUtil.openLog(jpvm, logfile);
            // Send a message to my parent...
            let texto = "Hello from Slave " + myself.getPort() + "!";
            tagAtual++;
            PvmUtil.sendMessageToParent(jpvm, parent, texto, tagAtual);

            /**
             * PROCESSO DO FD-TD
             * -----------------
             * ok 1) RECEBE OS DADOS INICIAIS
             * ok 2) RECEBE O PEDACO DO MODELO
             * ok 3) ALOCA A MATRIZ DE RESPOSTA E INICIALIZA
             * ok 4) RECEBE AS FONTES E OS MATERIAIS
             *    5) CALCULA O FD-TD
             *       for (int n=0; n<max; n++){
             *        // CALCULA CCA
             *            // RECEBE E ENVIA BORDAS
             *        // CALCULA E E H
             *        // ENVIA O N PARA A MASTER
             *        // GRAVA OS RESULTADOS EM DISCO
             *        // ENVIA O ARQUIVO PARA MASTER
             *       }
             **/

            // 1) RECEBE OS DADOS INICIAIS
            let message = await jpvm.pvm_recv(parent, 11);
            const slaveID = message.buffer.upkint();
            const NPROC = message.buffer.upkint();
            const nMax = message.buffer.upkint();
            const nSkip = message.buffer.upkint();
            //confirma que recebeu:
            texto = "Recebeu SlaveID = " + slaveID + ", NPROC = " + NPROC + ", Nmax = " + nMax + " e nSkip = " + nSkip + ".";
            tagAtual++;
            PvmUtil.sendMessageToParent(jpvm, parent, texto, tagAtual);
            //recebe os vizinhos
            message = await jpvm.pvm_recv(parent, 12);
            const Left = message.buffer.upktid();
            const Right = message.buffer.upktid();
            //confirma que recebeu:
            texto = "Slave " + slaveID + " recebeu Vizinhos: Left = " + Left.getPort() + " e Right = " + Right.getPort() + ".";
            PvmUtil.sendMessageToParent(jpvm, parent, texto, 14);

            // 2) RECEBE O PEDACO DO MODELO, OS DELTAS e as CCA
            //recebe o tamanho:
            message = await jpvm.pvm_recv(parent, 22);
            const ModelX = message.buffer.upkint();
            const ModelY = message.buffer.upkint();
            const ModelZ = message.buffer.upkint();
            const dx = message.buffer.upkdouble();
            const dy = message.buffer.upkdouble();
            const dz = message.buffer.upkdouble();
            const dt = message.buffer.upkdouble();
            const FreqIndex = message.buffer.upkint();
            const CCAtype = message.buffer.upkchar();
            const CCAorder = message.buffer.upkint();
            const Xoffset = message.buffer.upkint();   // Phoenix: global X of local i=0
            const GlobalX = message.buffer.upkint();   // Phoenix: size of the whole model
            const P = message.buffer.upkint();         // Phoenix: steps of one period, 0 = no steady state run (STEADY)
            //confirma que recebeu o tamanho:
            texto = "Recebeu Tamanho = (" + ModelX + "," + ModelY + "," + ModelZ + ") e Deltas = (" + dx + "," + dy + "," + dz + ")";
            tagAtual++;
            PvmUtil.sendMessageToParent(jpvm, parent, texto, tagAtual);
            //aloca o modelo local:
            const ModeloLocal = new Model("modeloLocal", ModelX, ModelY, ModelZ, dx, dy, dz);
            //recebe o modelo:
            message = await jpvm.pvm_recv(parent, 33);
            //confirma que recebeu o modelo:
            texto = "Recebeu o Modelo.";
            tagAtual++;
            PvmUtil.sendMessageToParent(jpvm, parent, texto, tagAtual);
            //coloca os valores dentro do modelo local:
            PvmUtil.unpackPartialModel(message.buffer, ModeloLocal);

            // 3) RECEBE AS FONTES E OS MATERIAIS
            //recebe fontes:
            tagAtual++;
            const S = await PvmUtil.receiveSources(jpvm, tagAtual);
            //confirma que recebeu as fontes:
            let printSource = "";
            for (let nf = 0; nf < S.length; nf++) {
                printSource = printSource + "\n       Fonte " + nf + " no ponto [" + S[nf].Location[0] + "," + S[nf].Location[1] + "," + S[nf].Location[2] + "], com freq = " + S[nf].f[FreqIndex] + " e max = " + S[nf].MaxValue;
            }
            let mes = "Recebeu " + S.length + " fontes: " + printSource;
            tagAtual++;
            PvmUtil.sendMessageToParent(jpvm, parent, mes, tagAtual);
            //recebe materiais:
            tagAtual++;
            const Mat = await PvmUtil.receiveMaterials(jpvm, FreqIndex, tagAtual);
            //confirma que recebeu materiais:
            mes = "Recebeu " + Mat.length + " materiais com o primeiro sendo " + Mat[0].name();
            tagAtual++;
            PvmUtil.sendMessageToParent(jpvm, parent, mes, tagAtual);

            // Phoenix: per-code tables of everything the loops need
            const T = FDTD_slave.materialTables(Mat, FreqIndex, dt, dx, dy, dz);

            // 4) ALOCA A MATRIZ DE RESPOSTA E INICIALIZA
            const EH = new Array(3);
            const initValue = 0;
            for (let tam = 0; tam < 3; tam++) {
                EH[tam] = new Field(ModelX, ModelY, ModelZ, "EH", initValue, Float32Array);
            }

            // 5) CALCULA O FD-TD
            tagAtual++;
            const tamCel = 3;
            const plane = ModelY * ModelZ;
            const BorderLeft = new Float64Array(tamCel * plane);   // [3][ModelY][ModelZ]
            const BorderRight = new Float64Array(tamCel * plane);
            const B1 = 1 * plane, B2 = 2 * plane;   // offsets of BorderX[1] and BorderX[2]

            const hasLeft = Left.getPort() !== 0;
            const hasRight = Right.getPort() !== 0;
            const SegundaOrdem = (CCAorder === 2);
            const model = ModeloLocal.getData();
            const w0 = plane, w1 = ModelZ;
            const X = ModelX, Y = ModelY, Z = ModelZ;
            const E0 = EH[0].getData(), E1 = EH[1].getData(), E2 = EH[2].getData();

            // the sources: main point (global, expanded grid) and the points it drives
            const setFourPoints = true;
            const sources = S.map((s) => {
                const main = s.globalLocation();
                const targets = [main];
                const isE = s.getField().toUpperCase() === "E";
                if (setFourPoints && isE) {
                    const a = s.getAxis().toLowerCase();
                    const offs = a === "x" ? [[0, 2, 0], [0, 0, 2], [0, 2, 2]]
                               : a === "y" ? [[2, 0, 0], [0, 0, 2], [2, 0, 2]]
                               :             [[2, 0, 0], [0, 2, 0], [2, 2, 0]];
                    for (const o of offs) targets.push([main[0] + o[0], main[1] + o[1], main[2] + o[2]]);
                }
                const local = (t) => (t[0] - Xoffset >= 0 && t[0] - Xoffset < X && t[1] < Y && t[2] < Z) ? (t[0] - Xoffset) * w0 + t[1] * w1 + t[2] : -1;
                return { s, main, mainLocal: local(main), targets: targets.map(local).filter(p => p >= 0) };
            });
            const mainsLocal = sources.map(q => q.mainLocal).filter(p => p >= 0);
            const saved = new Float32Array(mainsLocal.length);
            const keepMains = () => { for (let q = 0; q < mainsLocal.length; q++) saved[q] = E0[mainsLocal[q]]; };
            const restoreMains = () => { for (let q = 0; q < mainsLocal.length; q++) E0[mainsLocal[q]] = saved[q]; };

            // 5) Pos-FDTD: every source must have the same axis
            const axis = S[0].Axis;
            for (let f = 1; f < S.length; f++) {
                if (S[f].Axis.toLowerCase() !== axis.toLowerCase()) {
                    throw new Error("Sources have different axis!!! Not impelemented!!!");
                }
            }
            const axisIndex = "xyz".indexOf(axis.toLowerCase());

            /*
             * Phoenix: STEADY.  Every step |E|^2 at the cube centres is summed
             * over the slice (also weighted by sigma/2rho of the tissues, i.e.
             * the SAR) and sent to the master, which compares the last period
             * with the one before.  It is also summed per cube over each period
             * (periods start at n = 0); at the end of a period the per-cube
             * averages are compared with those of the previous period, and the
             * master answers whether the steady state was reached.
             */
            const cubesX = (X - 1) >> 1, cubesY = (Y - 1) >> 1, cubesZ = (Z - 1) >> 1;
            const nCubes = cubesX * cubesY * cubesZ;
            const E2cur = P > 0 ? new Float64Array(nCubes) : null;   // sum over the current period
            const E2prev = P > 0 ? new Float64Array(nCubes) : null;  // average of the last finished period
            let havePrev = false;
            const cubeCodes = new Uint8Array(P > 0 ? nCubes : 0);
            if (P > 0) {
                let q = 0;
                for (let i = 1; i < X; i += 2) for (let j = 1; j < Y; j += 2) for (let k = 1; k < Z; k += 2) cubeCodes[q++] = model[i * w0 + j * w1 + k];
            }
            let stop = false;

            /*
             * Phoenix: the current of every E source, I = closed integral of H.dl
             * around its cube (Ampere), in the plane across the source axis through
             * the middle of the gap.  With the source voltage the master gets the
             * power fed to the antenna (to scale the SAR to a given power).  Each
             * H point is counted by one slave: the shared plane by the left one.
             */
            const loops = sources.map((src) => {
                if (src.s.getField().toUpperCase() !== "E") return [];
                const a = "xyz".indexOf(src.s.getAxis().toLowerCase());
                const b = (a + 1) % 3, c = (a + 2) % 3;
                const L = src.s.getLocation();
                const d = [dx, dy, dz];
                const terms = [];
                const add = (pb, pc, w) => {
                    const g = [0, 0, 0];
                    g[a] = 2 * L[a] + 1; g[b] = pb; g[c] = pc;
                    const li = g[0] - Xoffset;
                    if (li < 0 || li >= X || (hasRight && li === X - 1)) return;
                    if (g[1] < 0 || g[1] >= Y || g[2] < 0 || g[2] >= Z) return;
                    terms.push([li * w0 + g[1] * w1 + g[2], w]);
                };
                for (const o of [0, 2]) {
                    add(2 * L[b] + o, 2 * L[c] - 1, +d[b]);   // H_b along +b
                    add(2 * L[b] + 3, 2 * L[c] + o, +d[c]);   // H_c along +c
                    add(2 * L[b] + o, 2 * L[c] + 3, -d[b]);   // H_b back
                    add(2 * L[b] - 1, 2 * L[c] + o, -d[c]);   // H_c back
                }
                return terms;
            });

            let unacked = 0;
            let foundSourceLogged = false;

            for (let n = 0; n < nMax; n++) {
                // ENVIA O N PARA A MASTER:
                // ------------------------
                const buf = new jpvmBuffer();
                buf.pack(n);
                jpvm.pvm_send(buf, parent, 197 + n);

                // FAZ O CALCULO:
                // --------------

                /**
                 * 1) Pre-FDTD para as Fontes:
                 * FONTES INCLUIDAS EM 2008:
                 */
                for (let q = 0; q < sources.length; q++) {
                    const src = sources[q];
                    if (!src.targets.length) continue;
                    // E(i,j,k,n) of the main point: here, or (just left of the
                    // shared plane) in the left slave's plane sent at the end of the last step
                    let Emain;
                    if (src.mainLocal >= 0) Emain = E0[src.mainLocal];
                    else Emain = BorderLeft[src.main[1] * ModelZ + src.main[2]];
                    const freq = src.s.f[FreqIndex];
                    const Max = src.s.MaxValue;
                    const angle = (2 * Math.PI * freq * (n + 0.5) * dt); //em radianos
                    //Mudado em 12/05/2010
                    //Referencia: "The Finite-Difference Time-Domain Method for Electromagnetics with MATLAB Simulations
                    //            Atef Elsherbeni and Veysel Demir, 2009, pag.74, 4.1.2 Hard Voltage Source
                    //HARD SOURCE: E(i,j,k,n+1) = -E(i,j,k,n)-2* V(t+1/2)/dz
                    // Como V = Vo*sin(w*t) e E = V/dz, dai:
                    //          SOURCE = -E(i,j,k,n) - 2*Eo*sin(w*t+1/2)*
                    const vS = -Emain - 2 * (Max * Math.sin(angle));
                    for (const p of src.targets) {
                        if (src.s.isHard()) E0[p] = vS;
                        else E0[p] = vS + E0[p];
                    }
                    if (n < 3) PvmUtil.log(myself, "N = " + n + ": Emax = Max e Setou valor = " + vS + " em " + src.main.join(",") + ".");
                }

                /** 4) Faz o H (que nao tem CC por causa da posicao no cubo)
                 */
                keepMains(); //fonte ja calculada
                for (let i = 0; i < X; i++) {
                    const io = i & 1;
                    for (let j = 0; j < Y; j++) {
                        const jo = j & 1;
                        const r = i * w0 + j * w1;
                        if (!io && jo) {            // isHx (even, odd, odd)
                            for (let k = 1; k < Z; k += 2) {
                                const p = r + k;
                                const code = model[p];
                                const a = T.a[code], b = T.b[code];
                                let vH = a * E0[p];
                                vH += b * ((E0[p + 1] - E0[p - 1]) / dz);
                                vH += b * (-(E0[p + w1] - E0[p - w1]) / dy);
                                E0[p] = vH;
                            }
                        } else if (io && !jo) {     // isHy (odd, even, odd)
                            for (let k = 1; k < Z; k += 2) {
                                const p = r + k;
                                const code = model[p];
                                const a = T.a[code], b = T.b[code];
                                let vH = a * E0[p];
                                vH += b * ((E0[p + w0] - E0[p - w0]) / dx);
                                vH += b * (-(E0[p + 1] - E0[p - 1]) / dz);
                                E0[p] = vH;
                            }
                        } else if (io && jo) {      // isHz (odd, odd, even)
                            for (let k = 0; k < Z; k += 2) {
                                const p = r + k;
                                const code = model[p];
                                const a = T.a[code], b = T.b[code];
                                let vH = a * E0[p];
                                vH += b * ((E0[p + w1] - E0[p - w1]) / dy);
                                vH += b * (-(E0[p + w0] - E0[p - w0]) / dx);
                                E0[p] = vH;
                            }
                        }
                    }
                }
                restoreMains();

                // ENVIA E RECEBE BORDAS: (13/12/2006)
                // Phoenix: after H, the right slave sends its first planes to the left one
                if (hasLeft) PvmUtil.sendBorder(jpvm, EH[0], 'l', Left, 555);
                if (hasRight) await PvmUtil.receiveBorder(jpvm, BorderRight, Right, 555);

                /**
                 * 2) Faz o E:
                 *      excluindo os limites minimos (i=0, j=0, k=0)
                 *     17/12/08 -  excluindo os limites maximos (i==TX-1, j==TY-1, k==TZ-1)
                 *     (with a right neighbour the last plane is computed here, with BorderRight[1])
                 */
                keepMains(); //fonte ja calculada
                const iEnd = hasRight ? X : X - 1;
                for (let i = 1; i < iEnd; i++) {
                    const seam = (i === X - 1);
                    for (let j = 1; j < Y - 1; j++) {
                        const r = i * w0 + j * w1;
                        if (i & 1) {
                            if (j & 1) continue;
                            for (let k = 2; k < Z - 1; k += 2) {     // isEx (odd, even, even)
                                const p = r + k;
                                const code = model[p];
                                const c = T.c[code], d = T.d[code];
                                let vE = c * E0[p];
                                vE += d * ((E0[p + w1] - E0[p - w1]) / dy);
                                vE += d * (-(E0[p + 1] - E0[p - 1]) / dz);
                                E0[p] = vE;
                            }
                        } else if (j & 1) {
                            for (let k = 2; k < Z - 1; k += 2) {     // isEy (even, odd, even)
                                const p = r + k;
                                const code = model[p];
                                const c = T.c[code], d = T.d[code];
                                const xPlus = seam ? BorderRight[B1 + j * ModelZ + k] : E0[p + w0];
                                let vE = c * E0[p];
                                vE += d * ((E0[p + 1] - E0[p - 1]) / dz);
                                vE += d * (-(xPlus - E0[p - w0]) / dx);
                                E0[p] = vE;
                            }
                        } else {
                            for (let k = 1; k < Z - 1; k += 2) {     // isEz (even, even, odd)
                                const p = r + k;
                                const code = model[p];
                                const c = T.c[code], d = T.d[code];
                                const xPlus = seam ? BorderRight[B1 + j * ModelZ + k] : E0[p + w0];
                                let vE = c * E0[p];
                                vE += d * ((xPlus - E0[p - w0]) / dx);
                                vE += d * (-(E0[p + w1] - E0[p - w1]) / dy);
                                E0[p] = vE;
                            }
                        }
                    }
                }
                restoreMains();

                /**
                 * 3) Faz os limites (the faces of the whole model), in the
                 *    order of the 2010 triple loop, visiting only those points.
                 *    The shared plane of a right slave belongs to its left neighbour.
                 */
                const iStart = hasLeft ? 1 : 0;
                for (let i = iStart; i < X; i++) {
                    const gi = i + Xoffset;
                    const xFace = (gi === 0 || gi === GlobalX - 1);
                    for (let j = 0; j < Y; j++) {
                        const wholeRow = xFace || j === 0 || j === Y - 1;
                        const kStep = wholeRow ? 1 : Z - 1;
                        for (let k = 0; k < Z; k += kStep) {
                            const odd = (i & 1) + (j & 1) + (k & 1);
                            if (odd !== 1) continue; // so tem cc no E
                            if ((gi === 0 && j === 0) || (gi === 0 && k === 0) || (k === 0 && j === 0)) //frestas
                                continue;
                            const p = i * w0 + j * w1 + k;
                            const code = model[p];
                            const isEx = (i & 1) === 1, isEy = (j & 1) === 1, isEz = (k & 1) === 1;
                            //Faz os maximos
                            if (gi === GlobalX - 1 || j === Y - 1 || k === Z - 1) {
                                //CCA
                                if (gi === GlobalX - 1) {
                                    if (isEy || isEz) {
                                        FDTD_slave.mur(E0, E1, E2, p, -2 * w0, T.cmaX[code], T.cmbX[code]);
                                        if (SegundaOrdem) FDTD_slave.Mur2aOrdem();
                                    }
                                    continue;
                                }
                                if (j === Y - 1) {
                                    if (isEx || isEz) {
                                        FDTD_slave.mur(E0, E1, E2, p, -2 * w1, T.cmaY[code], T.cmbY[code]);
                                        if (SegundaOrdem) FDTD_slave.Mur2aOrdem();
                                    }
                                    continue;
                                }
                                if (k === Z - 1) {
                                    if (isEx || isEy) {
                                        FDTD_slave.mur(E0, E1, E2, p, -2, T.cmaZ[code], T.cmbZ[code]);
                                        if (SegundaOrdem) FDTD_slave.Mur2aOrdem();
                                    }
                                    continue;
                                }
                                continue;
                            }
                            //Faz os minimos sem vizinho:
                            if (gi === 0 || j === 0 || k === 0) {
                                //CCA (only for Mur: the maximos above have no such test)
                                if (CCAtype === 'm') {
                                    if (gi === 0) {
                                        if (isEy || isEz) {
                                            FDTD_slave.mur(E0, E1, E2, p, 2 * w0, T.cmaX[code], T.cmbX[code]);
                                            if (SegundaOrdem) FDTD_slave.Mur2aOrdem();
                                            continue;
                                        }
                                    }
                                    if (j === 0) {
                                        if (isEx || isEz) {
                                            FDTD_slave.mur(E0, E1, E2, p, 2 * w1, T.cmaY[code], T.cmbY[code]);
                                            if (SegundaOrdem) FDTD_slave.Mur2aOrdem();
                                        }
                                        continue;
                                    }
                                    if (k === 0) {
                                        if (isEx || isEy) {
                                            FDTD_slave.mur(E0, E1, E2, p, 2, T.cmaZ[code], T.cmbZ[code]);
                                            if (SegundaOrdem) FDTD_slave.Mur2aOrdem();
                                        }
                                        continue;
                                    }
                                }
                                continue;
                            }
                        }
                    }
                }
                if (!hasLeft) {
                    for (let k = 1; k < Z; k += 2) { //borda de X com Y   (i=0, j=0: Ez)
                        const p = k;
                        FDTD_slave.mur(E0, E1, E2, p, 2 * w0, T.cmaX[model[p]], T.cmbX[model[p]]);
                        if (SegundaOrdem) FDTD_slave.Mur2aOrdem();
                    }
                    for (let j = 1; j < Y; j += 2) { //borda de X com Z   (i=0, k=0: Ey)
                        const p = j * w1;
                        FDTD_slave.mur(E0, E1, E2, p, 2, T.cmaZ[model[p]], T.cmbZ[model[p]]);
                        if (SegundaOrdem) FDTD_slave.Mur2aOrdem();
                    }
                }
                for (let i = 1; i < X; i += 2) { //borda de Y com Z   (j=0, k=0: Ex)
                    const p = i * w0;
                    FDTD_slave.mur(E0, E1, E2, p, 2 * w1, T.cmaY[model[p]], T.cmbY[model[p]]);
                    if (SegundaOrdem) FDTD_slave.Mur2aOrdem();
                }

                // 5) Pos-FDTD para as Fontes onde tem metal:
                let foundSource = false;
                {
                    const ip = axisIndex === 0 ? 1 : 0, jp = axisIndex === 1 ? 1 : 0, kp = axisIndex === 2 ? 1 : 0;
                    for (let i = ip; i < X; i += 2) {
                        for (let j = jp; j < Y; j += 2) {
                            for (let k = kp; k < Z; k += 2) {
                                const p = i * w0 + j * w1 + k;
                                if (!T.wire[model[p]]) continue;
                                const valor = 0.0;
                                E0[p] = valor;
                                foundSource = true;
                                if (setFourPoints) {
                                    // Phoenix: points outside this slice (or the model) are skipped
                                    if (axisIndex === 0) {
                                        if (j + 2 < Y) E0[p + 2 * w1] = valor;
                                        if (k + 2 < Z) E0[p + 2] = valor;
                                        if (j + 2 < Y && k + 2 < Z) E0[p + 2 * w1 + 2] = valor;
                                    } else if (axisIndex === 1) {
                                        if (i + 2 < X) E0[p + 2 * w0] = valor;
                                        if (k + 2 < Z) E0[p + 2] = valor;
                                        if (i + 2 < X && k + 2 < Z) E0[p + 2 * w0 + 2] = valor;
                                    } else {
                                        if (i + 2 < X) E0[p + 2 * w0] = valor;
                                        if (j + 2 < Y) E0[p + 2 * w1] = valor;
                                        if (i + 2 < X && j + 2 < Y) E0[p + 2 * w0 + 2 * w1] = valor;
                                    }
                                }
                            }
                        }
                    }
                }
                if (!foundSource && !foundSourceLogged) {
                    PvmUtil.log(myself, "WARN: Didnt find any source material in the model!!!!!!!!");
                    foundSourceLogged = true;
                }

                /**
                 * Manda e recebe as bordas de novo (Phoenix: the finished shared
                 * plane goes from the left slave to the right one)
                 **/
                if (hasRight) PvmUtil.sendBorder(jpvm, EH[0], 'r', Right, 666);
                if (hasLeft) {
                    await PvmUtil.receiveBorder(jpvm, BorderLeft, Left, 666);
                    E0.set(BorderLeft.subarray(B2, B2 + plane), 0); //SO COPIA A BORDA!!
                }

                // Phoenix: STEADY - |E|^2 of this step, and the comparison of periods
                if (P > 0) {
                    const [wS, wU] = FDTD_slave.addE2(E0, X, Y, Z, E2cur, cubeCodes, T.sar);
                    const periodEnd = (n + 1) % P === 0;
                    const check = periodEnd && havePrev;
                    let numS = 0, denS = 0, numU = 0, denU = 0;
                    if (periodEnd) {
                        for (let q = 0; q < nCubes; q++) {
                            const a = E2cur[q] / P;
                            if (havePrev) {
                                const b = E2prev[q], d = Math.abs(a - b), m = (a + b) / 2, w = T.sar[cubeCodes[q]];
                                numU += d; denU += m; numS += w * d; denS += w * m;
                            }
                            E2prev[q] = a;
                            E2cur[q] = 0;
                        }
                        havePrev = true;
                    }
                    const sb = new jpvmBuffer();
                    sb.pack(n); sb.pack(wS); sb.pack(wU);
                    sb.pack(check ? 1 : 0);
                    sb.pack(numS); sb.pack(denS); sb.pack(numU); sb.pack(denU);
                    // the part of each source current seen by this slave (H at n+1/2)
                    sb.pack(loops.length);
                    for (const terms of loops) {
                        let I = 0;
                        for (const [p, w] of terms) I += w * E0[p];
                        sb.pack(I);
                    }
                    jpvm.pvm_send(sb, parent, TAG_STEADY);
                    if (periodEnd) {
                        const verdict = await jpvm.pvm_recv(parent, TAG_VERDICT);
                        stop = verdict.buffer.upkint() === 0;
                        if (stop) print.println("Steady state: parou em N = " + n + ".");
                    }
                }

                /** 6) Repassa as Matrizes
                 *  (Phoenix: only where Mur reads them - see refreshBoundary)
                 */
                FDTD_slave.refreshBoundary(EH, Xoffset, GlobalX);

                // ENVIA AS RESPOSTAS PARA MASTER:
                // -------------------------------
                // (Phoenix: the last step always goes)
                if (n % nSkip === 0 || n === nMax - 1 || stop) {
                    if (unacked >= MAX_UNACKED) { await jpvm.pvm_recv(parent, TAG_ACK); unacked--; }
                    const tagResposta = 900;
                    mes = "Mandando parcial para master com tag =" + tagResposta + ".";
                    PvmUtil.sendMessageToParent(jpvm, parent, mes, (902));
                    // envia:
                    PvmUtil.sendPartialField(jpvm, parent, EH[0].EAtCubeCentres(), tagResposta);
                    mes = "Mandou parcial para master com tag =" + tagResposta + ".";
                    PvmUtil.sendMessageToParent(jpvm, parent, mes, (904));
                    unacked++;
                }
                if (stop) break;
            }

            if (P > 0) {
                const E2 = new Field(cubesX, cubesY, cubesZ, "E2");
                const e2 = E2.getData();
                // E^2 of the peak: twice the time average of |E|^2 over the last finished period
                for (let q = 0; q < e2.length; q++) e2[q] = 2 * E2prev[q];
                PvmUtil.sendPartialField(jpvm, parent, E2, TAG_E2);
            }
            print.println("Fim: " + nMax + " passos.");
            // Exit from the parallel virtual machine
            jpvm.pvm_exit();
        } catch (jpe) {
            if (myself) PvmUtil.logError(myself, "Error in FDTD_slave", jpe);
            throw jpe;
        }
    }

    /**
     * Phoenix: Field.Refresh() copied the whole grid twice per step, but the
     * two older time levels are only read by Mur1aOrdem(), at the points of
     * the faces and at the points 2 steps inside.  Only those layers are
     * copied now (the result is the same, the head runs ~2x faster).
     */
    static refreshBoundary(EH, Xoffset, GlobalX) {
        const F0 = EH[0], X = F0.tx, Y = F0.ty, Z = F0.tz;
        const E0 = F0.getData(), E1 = EH[1].getData(), E2 = EH[2].getData();
        const w0 = Y * Z, w1 = Z;
        const xLayer = (gi) => gi === 0 || gi === 2 || gi === GlobalX - 1 || gi === GlobalX - 3;
        const copy = (a, b) => { E2.set(E1.subarray(a, b), a); E1.set(E0.subarray(a, b), a); };
        for (let i = 0; i < X; i++) {
            const r = i * w0;
            if (xLayer(i + Xoffset)) { copy(r, r + w0); continue; }
            for (const j of [0, 2, Y - 3, Y - 1]) copy(r + j * w1, r + (j + 1) * w1);
            for (let j = 3; j < Y - 3; j++) {
                const q = r + j * w1;
                for (const k of [0, 2, Z - 3, Z - 1]) { E2[q + k] = E1[q + k]; E1[q + k] = E0[q + k]; }
            }
        }
    }

    /**
     * Phoenix: adds |E|^2 of every cube centre (as in Field.EAtCubeCentres) to
     * `sum`; returns [sum of sar[code]*|E|^2, sum of |E|^2] over the cubes.
     */
    static addE2(d, SX, SY, SZ, sum, codes, sar) {
        const w1 = SZ, w0 = SY * SZ;
        let count = 0, wS = 0, wU = 0;
        for (let i = 1; i < SX; i += 2) {
            for (let j = 1; j < SY; j += 2) {
                for (let k = 1; k < SZ; k += 2) {
                    const p = i * w0 + j * w1 + k;
                    const Ex = (d[p - w1 - 1] + d[p + w1 - 1] + d[p - w1 + 1] + d[p + w1 + 1]) / 4;
                    const Ey = (d[p - w0 - 1] + d[p - w0 + 1] + d[p + w0 - 1] + d[p + w0 + 1]) / 4;
                    const Ez = (d[p - w0 - w1] + d[p - w0 + w1] + d[p + w0 - w1] + d[p + w0 + w1]) / 4;
                    const e2 = Ex * Ex + Ey * Ey + Ez * Ez;
                    wU += e2;
                    wS += sar[codes[count]] * e2;
                    sum[count++] += e2;
                }
            }
        }
        return [wS, wU];
    }

    /**
     * Phoenix: the coefficients of the 2010 loops, computed once per
     * material code (they only depend on the material).
     */
    static materialTables(Mat, FreqIndex, dt, dx, dy, dz) {
        const N = 256;
        const T = {
            c: new Float64Array(N), d: new Float64Array(N),
            a: new Float64Array(N), b: new Float64Array(N),
            cmaX: new Float64Array(N), cmbX: new Float64Array(N),
            cmaY: new Float64Array(N), cmbY: new Float64Array(N),
            cmaZ: new Float64Array(N), cmbZ: new Float64Array(N),
            wire: new Uint8Array(N),
            sar: new Float64Array(N),   // Phoenix: sigma/(2.density) of the tissues (0 for air and the wire)
        };
        for (let mm = 0; mm < Mat.length; mm++) {
            const mat = Mat[mm];
            const code = mat.code();
            const ep = mat.ep(FreqIndex);
            const si = mat.si(FreqIndex);
            const mu = mat.mu(FreqIndex);
            const siC = mat.siC(FreqIndex);
            const cc = mat.velocity(FreqIndex);
            T.a[code] = (2 * mu - siC * dt) / (2 * mu + siC * dt);
            T.b[code] = (dt / mu) / (1 + (siC * dt) / (2 * mu));
            T.c[code] = (2 * ep - si * dt) / (2 * ep + si * dt);
            T.d[code] = (dt / ep) / (1 + (si * dt) / (2 * ep));
            FDTD_slave.initiateMurConstants(cc, dx, dy, dz, dt);
            T.cmaX[code] = FDTD_slave.cmaX; T.cmbX[code] = FDTD_slave.cmbX;
            T.cmaY[code] = FDTD_slave.cmaY; T.cmbY[code] = FDTD_slave.cmbY;
            T.cmaZ[code] = FDTD_slave.cmaZ; T.cmbZ[code] = FDTD_slave.cmbZ;
            const name = mat.name().toLowerCase();
            if (name.startsWith("source") || name.startsWith("copper")) T.wire[code] = 1;
            if (!mat.isAir() && !mat.isConductor() && !T.wire[code] && mat.density() > 0) T.sar[code] = si / (2 * mat.density());
        }
        return T;
    }

    static isHx(i, j, k) { return FDTD_slave.par(i) && FDTD_slave.impar(j) && FDTD_slave.impar(k); }
    static isHy(i, j, k) { return FDTD_slave.impar(i) && FDTD_slave.par(j) && FDTD_slave.impar(k); }
    static isHz(i, j, k) { return FDTD_slave.impar(i) && FDTD_slave.impar(j) && FDTD_slave.par(k); }
    static isH(i, j, k) {
        let teste = 0;
        if (FDTD_slave.impar(i)) teste++;
        if (FDTD_slave.impar(j)) teste++;
        if (FDTD_slave.impar(k)) teste++;
        if (teste === 2)
            return true;
        return false;
    }
    static isEx(i, j, k) { return FDTD_slave.impar(i) && FDTD_slave.par(j) && FDTD_slave.par(k); }
    static isEy(i, j, k) { return FDTD_slave.par(i) && FDTD_slave.impar(j) && FDTD_slave.par(k); }
    static isEz(i, j, k) { return FDTD_slave.par(i) && FDTD_slave.par(j) && FDTD_slave.impar(k); }
    static isE(i, j, k) {
        let teste = 0;
        if (FDTD_slave.impar(i)) teste++;
        if (FDTD_slave.impar(j)) teste++;
        if (FDTD_slave.impar(k)) teste++;
        if (teste === 1)
            return true;
        return false;
    }
    static par(i) { return (i % 2) === 0; }
    static impar(i) { return (i % 2) !== 0; }
    static limiteInf(i, limI) { return i === limI; }
    static limiteSup(i, limS) { return i === limS - 1; }

    /**
     * Mur's absorbing boundary condition (written with three time levels:
     * Campos = n+1, CamposAnterior = n, CamposAntAnterior = n-1).
     */
    static Mur1aOrdem(x, y, z, coordenada, valor, Campos, CamposAnterior, CamposAntAnterior, cA, cB) {
        const pulo = 2;
        let puloX = 0, puloY = 0, puloZ = 0;
        if (coordenada === 0) { //x
            if (valor === 0) { puloX = pulo; } else { puloX = -pulo; }
        }
        if (coordenada === 1) { //y
            if (valor === 0) { puloY = pulo; } else { puloY = -pulo; }
        }
        if (coordenada === 2) { //z
            if (valor === 0) { puloZ = pulo; } else { puloZ = -pulo; }
        }
        const value = -CamposAntAnterior.data(x + puloX, y + puloY, z + puloZ)
            + cA * (Campos.data(x + puloX, y + puloY, z + puloZ) + CamposAntAnterior.data(x, y, z))
            + cB * (CamposAnterior.data(x, y, z) + CamposAnterior.data(x + puloX, y + puloY, z + puloZ));
        Campos.data(x, y, z, value);
    }

    /** Phoenix: Mur1aOrdem() on the flat arrays; `pulo` is the offset of the point 2 steps inside. */
    static mur(Campos, CamposAnterior, CamposAntAnterior, p, pulo, cA, cB) {
        Campos[p] = -CamposAntAnterior[p + pulo]
            + cA * (Campos[p + pulo] + CamposAntAnterior[p])
            + cB * (CamposAnterior[p] + CamposAnterior[p + pulo]);
    }

    /**
     * 2nd order terms of Mur's condition.  The body was still commented out
     * in 2010 ("ESTA COM ERRO NOS FIELD..."), so "Mur 2nd Order" behaves
     * exactly like 1st order.  Kept that way.
     */
    static Mur2aOrdem(x, y, z, coordenada, valor, Campos, CamposAnterior, CamposAntAnterior, const2aOrdem, TamX, TamY, TamZ) {
    }

    static initiateMurConstants(cc, dx, dy, dz, dt) {
        FDTD_slave.cmaX = (cc * dt - dx) / (cc * dt + dx);
        FDTD_slave.cmbX = (2 * dx) / (cc * dt + dx);
        FDTD_slave.cmcX = ((cc * dt) * (cc * dt) * dx) / (2 * dy * dy * (cc * dt + dx));
        FDTD_slave.cmdX = ((cc * dt) * (cc * dt) * dx) / (2 * dz * dz * (cc * dt + dx));
        FDTD_slave.cmaY = (cc * dt - dy) / (cc * dt + dy);
        FDTD_slave.cmbY = (2 * dy) / (cc * dt + dy);
        FDTD_slave.cmcY = ((cc * dt) * (cc * dt) * dy) / (2 * dx * dx * (cc * dt + dy));
        FDTD_slave.cmdY = ((cc * dt) * (cc * dt) * dy) / (2 * dz * dz * (cc * dt + dy));
        FDTD_slave.cmaZ = (cc * dt - dz) / (cc * dt + dz);
        FDTD_slave.cmbZ = (2 * dz) / (cc * dt + dz);
        FDTD_slave.cmcZ = ((cc * dt) * (cc * dt) * dz) / (2 * dx * dx * (cc * dt + dz));
        FDTD_slave.cmdZ = ((cc * dt) * (cc * dt) * dz) / (2 * dy * dy * (cc * dt + dz));
        FDTD_slave.const2aOrdem = [FDTD_slave.cmcX, FDTD_slave.cmdX, FDTD_slave.cmcY,
                                   FDTD_slave.cmdY, FDTD_slave.cmcZ, FDTD_slave.cmdZ];
    }
}
