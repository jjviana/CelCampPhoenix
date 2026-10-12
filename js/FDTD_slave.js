/*
 * FDTD_slave.js
 *
 * Created on 6 de Marco de 2006, 13:02   (FDTD_slave.java)
 * Ported to JavaScript in 2026 (CelCamp Phoenix).
 *
 * @author Ana de Oliveira Rodrigues
 * @version 0.1 - 3/Marco/2006
 *
 * One slave of the parallel FD-TD calculation of the electromagnetic field.
 * The master (CalculateEHFrameParallel) cuts the expanded model in slices
 * along X; neighbouring slices share one plane and exchange their borders
 * every time step.  In 2006 every slave was a JVM started by jpvmDaemon; now
 * every slave is a Web Worker.
 *
 * Phoenix notes (changes to the 2007 behaviour are marked "Phoenix:"):
 *  - material properties are looked up in a table indexed by material code
 *    instead of a linear search for every point (same result, much faster);
 *  - the H loop and the conductor loop used Mat[code] (an array index) where
 *    the material *code* was meant: Mat[16] is code 17, so e.g. Hypotalamus
 *    was treated as copper.  All lookups now go by code;
 *  - the H coefficient was written a=(2*-siC*dt)/(2*mu+siC*dt), which is 0
 *    for siC=0, so H forgot its previous value every step.  It is now
 *    a=(2*mu-siC*dt)/(2*mu+siC*dt);
 *  - FreqIndex was fixed at 1 in the slave; the index chosen in the window
 *    is now used;
 *  - sources were placed using i+(ModelX*slaveID); the slices overlap by
 *    one plane, so the global X is i+Xoffset sent by the master;
 *  - the partial field is sent to the master only every `skip` steps (as
 *    FDTD_T_slave already did since 10/4/2007), with a small back-pressure
 *    so a slow master cannot be flooded.
 */
import { jpvmEnvironment } from './jpvm/jpvmEnvironment.js';
import { jpvmBuffer } from './jpvm/jpvmBuffer.js';
import { PvmUtil } from './PvmUtil.js';
import { Model } from './Model.js';
import { Field } from './Field.js';

const TAG_ACK = 905;           // Phoenix: master -> slave "partial received"
const MAX_UNACKED = 2;

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
        let host = null;
        let port = 0;
        try {
            // Enroll in the parallel virtual machine...
            jpvm = new jpvmEnvironment();
            // Get my parent's task id...
            parent = jpvm.pvm_parent();
            // Get my task id...
            myself = jpvm.pvm_mytid();
            host = myself.getHost();
            port = myself.getPort();
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
            const skip = message.buffer.upkint(); // Phoenix
            //confirma que recebeu:
            texto = "Recebeu SlaveID = " + slaveID + ", NPROC = " + NPROC + ", Nmax = " + nMax + ".";
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
            const CCAtype = message.buffer.upkchar();
            const CCAorder = message.buffer.upkint();
            const Xoffset = message.buffer.upkint(); // Phoenix: global X of local i=0
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
            let mes = "Recebeu " + S.length + " fontes.";
            tagAtual++;
            PvmUtil.sendMessageToParent(jpvm, parent, mes, tagAtual);
            //recebe materiais:
            tagAtual++;
            let FreqIndex = 1;
            const Mat = await PvmUtil.receiveMaterials(jpvm, FreqIndex, tagAtual);
            FreqIndex = Mat.FreqIndex; // Phoenix
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
                EH[tam] = new Field(ModelX, ModelY, ModelZ, "EH", initValue);
            }

            // 5) CALCULA O FD-TD
            tagAtual++;
            const tamCel = 3;
            const BorderLeft = new Float64Array(tamCel * ModelY * ModelZ);  // [3][ModelY][ModelZ]
            const BorderRight = new Float64Array(tamCel * ModelY * ModelZ);
            const plane = ModelY * ModelZ;
            const B1 = 1 * plane, B2 = 2 * plane;   // offsets of BorderX[1] and BorderX[2]

            const hasLeft = Left.getPort() !== 0;
            const hasRight = Right.getPort() !== 0;
            const SegundaOrdem = (CCAorder === 2);
            const model = ModeloLocal.getData();
            const w0 = ModelY * ModelZ, w1 = ModelZ;
            const srcBoxes = S.map(s => s.bounds());
            const location = [0, 0, 0];
            let unacked = 0;

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
                 */
                //Nao implementado

                // ENVIA E RECEBE BORDAS: (13/12/2006)
                //------------------------------------
                // (in 2006 four threads did this; postMessage never blocks)
                if (hasLeft) PvmUtil.sendBorder(jpvm, EH[0], 'l', Left, 555);
                if (hasRight) PvmUtil.sendBorder(jpvm, EH[0], 'r', Right, 666);
                if (hasRight) await PvmUtil.receiveBorder(jpvm, BorderRight, Right, 555);
                if (hasLeft) await PvmUtil.receiveBorder(jpvm, BorderLeft, Left, 666);

                const E0 = EH[0].getData();

                /**
                 * 2) Faz o E:
                 *      excluindo os limites minimos (i=0, j=0, k=0)
                 *      incluindo os limites maximos (i==TX-1, j==TY-1, k==TZ-1)
                 */
                for (let i = 0; i < ModelX; i++) {
                    for (let j = 0; j < ModelY; j++) {
                        for (let k = 0; k < ModelZ; k++) {
                            //testes para sair:
                            const odd = (i & 1) + (j & 1) + (k & 1);
                            if (odd === 2) continue; //calculando E   (isH)
                            if (odd !== 1) continue; //vazios         (!isE)
                            if (i === 0 || j === 0 || k === 0)
                                continue; //(3) a seguir
                            //PEGA OS VALORES DO PONTO
                            const p = i * w0 + j * w1 + k;
                            const code = model[p];
                            const c = T.c[code];
                            const d = T.d[code];
                            let vE = 0;
                            if ((i === ModelX - 1 && !hasRight) || j === ModelY - 1 || k === ModelZ - 1) {
                                //CCA
                                if (CCAtype === 'm') {
                                    const x = i, y = j, z = k;
                                    const TamX = ModelX, TamY = ModelY, TamZ = ModelZ;
                                    const Campos = EH[0];
                                    const CamposAnterior = EH[1];
                                    const CamposAntAnterior = EH[2];
                                    // Phoenix: x-boundary only when there is no right neighbour
                                    if (i === ModelX - 1 && !hasRight) {
                                        if (FDTD_slave.isEy(x, y, z) || FDTD_slave.isEz(x, y, z)) {
                                            FDTD_slave.Mur1aOrdem(x, y, z, 0, (TamX - 1), Campos, CamposAnterior, CamposAntAnterior, T.cmaX[code], T.cmbX[code]);
                                            if (SegundaOrdem) {
                                                FDTD_slave.Mur2aOrdem(x, y, z, 0, (TamX - 1), Campos, CamposAnterior, CamposAntAnterior, FDTD_slave.const2aOrdem, TamX, TamY, TamZ);
                                            }
                                        }
                                        continue;
                                    }
                                    if (j === ModelY - 1) {
                                        if (FDTD_slave.isEx(x, y, z) || FDTD_slave.isEz(x, y, z)) {
                                            FDTD_slave.Mur1aOrdem(x, y, z, 1, (TamY - 1), Campos, CamposAnterior, CamposAntAnterior, T.cmaY[code], T.cmbY[code]);
                                            if (SegundaOrdem) {
                                                FDTD_slave.Mur2aOrdem(x, y, z, 1, (TamY - 1), Campos, CamposAnterior, CamposAntAnterior, FDTD_slave.const2aOrdem, TamX, TamY, TamZ);
                                            }
                                        }
                                        continue;
                                    }
                                    if (k === ModelZ - 1) {
                                        if (FDTD_slave.isEx(x, y, z) || FDTD_slave.isEy(x, y, z)) {
                                            FDTD_slave.Mur1aOrdem(x, y, z, 2, (TamZ - 1), Campos, CamposAnterior, CamposAntAnterior, T.cmaZ[code], T.cmbZ[code]);
                                            if (SegundaOrdem) {
                                                FDTD_slave.Mur2aOrdem(x, y, z, 2, (TamZ - 1), Campos, CamposAnterior, CamposAntAnterior, FDTD_slave.const2aOrdem, TamX, TamY, TamZ);
                                            }
                                        }
                                        continue;
                                    }
                                }
                                continue;
                            }
                            if (i === ModelX - 1) {
                                //tem vizinho, IMPLEMENTAR FD-TD com as bordas
                                //Ex : Nunca tem Ex por causa da posicao no cubo
                                const jk = j * ModelZ + k;
                                //Ey
                                if (!(i & 1) && (j & 1) && !(k & 1)) {
                                    vE = c * E0[p];
                                    vE += d * ((E0[p + 1] - E0[p - 1]) / dz);
                                    vE += d * (-(BorderRight[B1 + jk] - E0[p - w0]) / dx);
                                    E0[p] = vE;
                                }
                                //Ez
                                if (!(i & 1) && !(j & 1) && (k & 1)) {
                                    vE = c * E0[p];
                                    vE += d * ((BorderRight[B1 + jk] - E0[p - w0]) / dx);
                                    vE += d * (-(E0[p + w1] - E0[p - w1]) / dy);
                                    E0[p] = vE;
                                }
                                // Phoenix: fall through to the sources (2007 did `continue`
                                // here, so a source on a shared plane was never applied)
                            } else {
                                //Faz o FDTD:
                                if (i & 1) {            // isEx (odd, even, even)
                                    vE = c * E0[p];
                                    vE += d * ((E0[p + w1] - E0[p - w1]) / dy);
                                    vE += d * (-(E0[p + 1] - E0[p - 1]) / dz);
                                    E0[p] = vE;
                                } else if (j & 1) {     // isEy (even, odd, even)
                                    vE = c * E0[p];
                                    vE += d * ((E0[p + 1] - E0[p - 1]) / dz);
                                    vE += d * (-(E0[p + w0] - E0[p - w0]) / dx);
                                    E0[p] = vE;
                                } else {                // isEz (even, even, odd)
                                    vE = c * E0[p];
                                    vE += d * ((E0[p + w0] - E0[p - w0]) / dx);
                                    vE += d * (-(E0[p + w1] - E0[p - w1]) / dy);
                                    E0[p] = vE;
                                }
                            }
                            //fontes em E:
                            for (let s = 0; s < S.length; s++) {
                                const gi = i + Xoffset; //coloca apenas no slave correto
                                const bb = srcBoxes[s];
                                if (gi < bb[0] || gi > bb[1] || j < bb[2] || j > bb[3] || k < bb[4] || k > bb[5]) continue;
                                location[0] = gi; location[1] = j; location[2] = k;
                                if (S[s].isSource(location)) {
                                    const freq = S[s].f[FreqIndex];
                                    const valorSource = S[s].calculateSource(n, freq, dt);
                                    if (S[s].isHard())
                                        vE = valorSource;
                                    else
                                        vE += valorSource;
                                    if (n < 20 || n % 100 === 0) print.println("N =" + n + " -> Source = " + vE);
                                    E0[p] = vE;
                                }
                            }
                        }
                    }
                }

                /**
                 * Manda e recebe as bordas de novo, para calcular o E das bordas
                 **/
                if (hasLeft) { //manda a borda da esquerda de novo
                    PvmUtil.sendBorder(jpvm, EH[0], 'l', Left, 5555);
                }
                if (hasRight) { //recebe a da direita e manda da direita
                    PvmUtil.sendBorder(jpvm, EH[0], 'r', Right, 6666);
                    await PvmUtil.receiveBorder(jpvm, BorderRight, Right, 5555);
                }
                if (hasLeft) { //recebe a da esquerda
                    await PvmUtil.receiveBorder(jpvm, BorderLeft, Left, 6666);
                }

                /**
                 * 3a) Phoenix: copy the left border first.  In 2007 the copy was
                 *     done inside the loop below, after the Mur points of the
                 *     same plane that read it (e.g. (0,0,k) reads (0,2,k)), so
                 *     those used the value of the previous step.
                 */
                if (hasLeft) {
                    for (let j = 1; j < ModelY; j++) {
                        for (let k = 1; k < ModelZ; k++) {
                            //Ex: nunca tem por causa da posicao no cubo
                            //Ey e Ez: SO COPIA A BORDA!!
                            if ((j & 1) + (k & 1) === 1) E0[j * w1 + k] = BorderLeft[B2 + j * ModelZ + k];
                        }
                    }
                }

                /**
                 * 3) Faz os limites minimos (i==0, j==0, k==0)
                 *    (same order as the 2007 triple loop, visiting only those points)
                 */
                for (let i = 0; i < ModelX; i++) {
                    for (let j = 0; j < ModelY; j++) {
                        const kEnd = (i === 0 || j === 0) ? ModelZ : 1;
                        for (let k = 0; k < kEnd; k++) {
                            //PEGA OS VALORES DO PONTO
                            const p = i * w0 + j * w1 + k;
                            const code = model[p];
                            const x = i, y = j, z = k;
                            const TamX = ModelX, TamY = ModelY, TamZ = ModelZ;
                            const Campos = EH[0];
                            const CamposAnterior = EH[1];
                            const CamposAntAnterior = EH[2];
                            if ((i === 0 && !hasLeft) || j === 0 || k === 0) {
                                //CCA
                                if (CCAtype === 'm') {
                                    // Phoenix: x-boundary only when there is no left neighbour
                                    if (i === 0 && !hasLeft) {
                                        if (FDTD_slave.isEy(x, y, z) || FDTD_slave.isEz(x, y, z)) {
                                            FDTD_slave.Mur1aOrdem(x, y, z, 0, 0, Campos, CamposAnterior, CamposAntAnterior, T.cmaX[code], T.cmbX[code]);
                                            if (SegundaOrdem) {
                                                FDTD_slave.Mur2aOrdem(x, y, z, 0, 0, Campos, CamposAnterior, CamposAntAnterior, FDTD_slave.const2aOrdem, TamX, TamY, TamZ);
                                            }
                                            continue;
                                        }
                                    }
                                    if (j === 0) {
                                        if (FDTD_slave.isEx(x, y, z) || FDTD_slave.isEz(x, y, z)) {
                                            FDTD_slave.Mur1aOrdem(x, y, z, 1, 0, Campos, CamposAnterior, CamposAntAnterior, T.cmaY[code], T.cmbY[code]);
                                            if (SegundaOrdem) {
                                                FDTD_slave.Mur2aOrdem(x, y, z, 1, 0, Campos, CamposAnterior, CamposAntAnterior, FDTD_slave.const2aOrdem, TamX, TamY, TamZ);
                                            }
                                        }
                                        continue;
                                    }
                                    if (k === 0) {
                                        if (FDTD_slave.isEx(x, y, z) || FDTD_slave.isEy(x, y, z)) {
                                            FDTD_slave.Mur1aOrdem(x, y, z, 2, 0, Campos, CamposAnterior, CamposAntAnterior, T.cmaZ[code], T.cmbZ[code]);
                                            if (SegundaOrdem) {
                                                FDTD_slave.Mur2aOrdem(x, y, z, 2, 0, Campos, CamposAnterior, CamposAntAnterior, FDTD_slave.const2aOrdem, TamX, TamY, TamZ);
                                            }
                                        }
                                        continue;
                                    }
                                }
                                continue;
                            }
                            //IMPLEMENTAR FDTD com as bordas: copied in 3a)
                        }
                    }
                }

                /** 4) Faz o H (que nao tem CC por causa da posicao no cubo)
                 */
                for (let i = 0; i < ModelX; i++) {
                    for (let j = 0; j < ModelY; j++) {
                        for (let k = 0; k < ModelZ; k++) {
                            //testes para sair:
                            const odd = (i & 1) + (j & 1) + (k & 1);
                            if (odd === 1) continue; //calculando H   (isE)
                            if (odd !== 2) continue; //vazios         (!isH)
                            //Mur's Absorbing Condition
                            //nao ha cc para campos magneticos
                            //faz o FD-TD:
                            const p = i * w0 + j * w1 + k;
                            const code = model[p];
                            const a = T.a[code];
                            const b = T.b[code];
                            let vH = 0;
                            if (!(i & 1)) {           // isHx (even, odd, odd)
                                vH = a * E0[p];
                                vH += b * ((E0[p + 1] - E0[p - 1]) / dz);
                                vH += b * (-(E0[p + w1] - E0[p - w1]) / dy);
                                E0[p] = vH;
                            } else if (!(j & 1)) {    // isHy (odd, even, odd)
                                vH = a * E0[p];
                                vH += b * ((E0[p + w0] - E0[p - w0]) / dx);
                                vH += b * (-(E0[p + 1] - E0[p - 1]) / dz);
                                E0[p] = vH;
                            } else {                  // isHz (odd, odd, even)
                                vH = a * E0[p];
                                vH += b * ((E0[p + w1] - E0[p - w1]) / dy);
                                vH += b * (-(E0[p + w0] - E0[p - w0]) / dx);
                                E0[p] = vH;
                            }
                            //fontes em H:
                            for (let s = 0; s < S.length; s++) {
                                const gi = i + Xoffset; //coloca a fonte apenas no slave correto
                                const bb = srcBoxes[s];
                                if (gi < bb[0] || gi > bb[1] || j < bb[2] || j > bb[3] || k < bb[4] || k > bb[5]) continue;
                                location[0] = gi; location[1] = j; location[2] = k;
                                if (S[s].isSource(location)) {
                                    const freq = S[s].f[FreqIndex];
                                    const valorSource = S[s].calculateSource(n, freq, dt);
                                    if (S[s].isHard())
                                        vH = valorSource;
                                    else
                                        vH += valorSource;
                                    E0[p] = vH;
                                }
                            }
                        }
                    }
                }

                /** 5) Pos-FDTD para as Fontes onde tem metal:
                 */
                if (T.anyConductor) {
                    for (let p = 0; p < E0.length; p++) {
                        if (!T.conductor[model[p]])
                            continue;
                        E0[p] = 0;
                    }
                }

                /** 6) Repassa as Matrizes
                 */
                Field.Refresh(0, ModelX, 0, ModelY, 0, ModelZ, EH);

                // ENVIA AS RESPOSTAS PARA MASTER:
                // -------------------------------
                // Phoenix: only every `skip` steps (the last one always goes)
                if (n % skip === 0 || n === nMax - 1) {
                    if (unacked >= MAX_UNACKED) { await jpvm.pvm_recv(parent, TAG_ACK); unacked--; }
                    // confirma o envio:
                    const tagResposta = 900;
                    mes = "Mandando parcial para master com tag =" + tagResposta + ".";
                    PvmUtil.sendMessageToParent(jpvm, parent, mes, (902));
                    // envia:
                    PvmUtil.sendPartialField(jpvm, parent, EH[0], tagResposta);
                    mes = "Mandou parcial para master com tag =" + tagResposta + ".";
                    PvmUtil.sendMessageToParent(jpvm, parent, mes, (904));
                    unacked++;
                }
            }
            // Exit from the parallel virtual machine
            jpvm.pvm_exit();
        } catch (jpe) {
            if (myself) PvmUtil.logError(myself, "Error in FDTD_slave", jpe);
            throw jpe;
        }
    }

    /**
     * Phoenix: the coefficients of the 2007 loops, computed once per
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
            conductor: new Uint8Array(N), anyConductor: false,
        };
        for (let mm = 0; mm < Mat.length; mm++) {
            const mat = Mat[mm];
            const code = mat.code();
            const ep = mat.ep(FreqIndex);
            const si = mat.si(FreqIndex);
            const cc = mat.velocity(FreqIndex);
            T.c[code] = (2 * ep - si * dt) / (2 * ep + si * dt);
            T.d[code] = (dt / ep) / (1 + (si * dt) / (2 * ep));
            const mu = mat.mu(FreqIndex);
            const siC = mat.siC(FreqIndex);
            T.a[code] = (2 * mu - siC * dt) / (2 * mu + siC * dt); // Phoenix: was (2*-siC*dt)/(...)
            T.b[code] = (dt / mu) / (1 + (siC * dt) / (2 * mu));
            FDTD_slave.initiateMurConstants(cc, dx, dy, dz, dt);
            T.cmaX[code] = FDTD_slave.cmaX; T.cmbX[code] = FDTD_slave.cmbX;
            T.cmaY[code] = FDTD_slave.cmaY; T.cmbY[code] = FDTD_slave.cmbY;
            T.cmaZ[code] = FDTD_slave.cmaZ; T.cmbZ[code] = FDTD_slave.cmbZ;
            if (mat.isConductor()) { T.conductor[code] = 1; T.anyConductor = true; }
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

    /**
     * 2nd order terms of Mur's condition.  In the 2007 code the body was
     * commented out ("ESTA COM ERRO NOS FIELD..."), so choosing
     * "Mur 2nd Order" behaves exactly like 1st order.  Kept that way.
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
