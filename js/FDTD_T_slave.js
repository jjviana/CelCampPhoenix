/*
 * FDTD_T_slave.js
 *
 * Created on 6 de Marco de 2006, 13:02   (FDTD_T_slave.java, 29/3/2007 - 22/10/2008)
 * Ported to JavaScript in 2026 (CelCamp Phoenix).
 *
 * @author Ana de Oliveira Rodrigues
 * @version 0.1 - 3/Marco/2006
 *
 * One slave of the temperature calculation (bioheat equation, Gandhi 2001)
 * on the original - not expanded - model.
 *
 * October 2008: the heat of the electromagnetic field comes from E^2 read
 * from a file (hem = sigma.E^2/2), the metabolism is density*hm [W/m3]
 * (it was hm [W/kg]), and radiation, convection and evaporation are always
 * on.
 *
 * Phoenix notes:
 *  - "implementar paralelizacao da temperatura" was still on the 2007 to-do
 *    list: the slaves never exchanged borders, so only NPROC=1 worked.  The
 *    slaves now exchange the planes next to their borders (material codes
 *    once, temperatures every step), the same way FDTD_slave does;
 *  - the dtT stability limits (Wang / Bernardi) were checked after const1
 *    had been computed, so they never changed anything, and in the wrong
 *    units (C*3600 is in J: the limits came out in seconds and were compared
 *    with dt in hours, 3600 times too lax).  They are now in hours, with the
 *    three deltas, and CalculateTFrameParallel refuses a dtT above them;
 *  - the wire of the antenna ("copper..."/"source...") keeps its initial
 *    temperature: it is a perfect conductor in the EH calculation, and its
 *    stability limit (~2 ms on the head grid) made it overflow to NaN;
 *  - neighbours outside the model are treated as air (2007 threw an
 *    ArrayIndexOutOfBoundsException if a tissue touched the model border);
 *  - per-material constants are computed once instead of for every cube;
 *  - STEADY: with W > 0, every W steps the slave sums |T - T(n-W)| and
 *    |T - T(0)| over its tissue cubes and the master answers whether the
 *    thermal steady state was reached (the run then stops; its last T is
 *    the Tinit of SAR -> T).
 */
import { jpvmEnvironment } from './jpvm/jpvmEnvironment.js';
import { jpvmBuffer } from './jpvm/jpvmBuffer.js';
import { PvmUtil } from './PvmUtil.js';
import { Model } from './Model.js';
import { Field } from './Field.js';

const TAG_ACK = 905;           // Phoenix: master -> slave "partial received"
const TAG_STEADY = 99001;      // Phoenix: slave -> master, change of T over the last window
const TAG_VERDICT = 99002;     // Phoenix: master -> slave after every window: 1 go on, 0 stop
const MAX_UNACKED = 2;

export class FDTD_T_slave {

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
             * ok 4) RECEBE OS MATERIAIS
             *    5) CALCULA O FD-TD
             *       for (int n=0; n<max; n++){
             *        // CALCULA T
             *        // ENVIA O N PARA A MASTER
             *        // ENVIA O ARQUIVO PARA MASTER
             *       }
             **/

            // 1) RECEBE OS DADOS INICIAIS
            let message = await jpvm.pvm_recv(parent, 11);
            const slaveID = message.buffer.upkint();
            const NPROC = message.buffer.upkint();
            const nMax = message.buffer.upkint();
            const skip = message.buffer.upkint();
            //confirma que recebeu:
            texto = "Recebeu SlaveID = " + slaveID + ", NPROC = " + NPROC + ", Nmax = " + nMax + ", reduzN =" + skip + ".";
            tagAtual++;
            PvmUtil.sendMessageToParent(jpvm, parent, texto, tagAtual);
            //recebe os vizinhos
            message = await jpvm.pvm_recv(parent, 12);
            const Left = message.buffer.upktid();
            const Right = message.buffer.upktid();
            //confirma que recebeu:
            texto = "Slave " + slaveID + " recebeu Vizinhos: Left = " + Left.getPort() + " e Right = " + Right.getPort() + ".";
            PvmUtil.sendMessageToParent(jpvm, parent, texto, 14);

            // 2) RECEBE O PEDACO DO MODELO, E OS DELTAS
            //recebe o tamanho:
            message = await jpvm.pvm_recv(parent, 22);
            const ModelX = message.buffer.upkint();
            const ModelY = message.buffer.upkint();
            const ModelZ = message.buffer.upkint();
            const dx = message.buffer.upkdouble();
            const dy = message.buffer.upkdouble();
            const dz = message.buffer.upkdouble();
            const dtT = message.buffer.upkdouble();
            const hc = message.buffer.upkdouble(); //para o aco = 115[W/(m2.oC)], para a cabeca = 2,7[W/(m2.oC)]
            const Tenv = message.buffer.upkdouble();
            const Tblood = message.buffer.upkdouble();
            const Ttissues = message.buffer.upkdouble();
            const TRead = message.buffer.upkdouble();
            let TinitWasRead = false;
            if (TRead !== 0) {
                TinitWasRead = true;
            }
            const Xoffset = message.buffer.upkint(); // Phoenix (informative)
            const W = message.buffer.upkint();       // Phoenix: steps between steady-state checks (0 = off)
            //confirma que recebeu o tamanho:
            texto = "SLAVE::Recebeu Tamanho = (" + ModelX + "," + ModelY + "," + ModelZ + ") e Deltas = (" + dx + "," + dy + "," + dz + ") em X = " + Xoffset;
            tagAtual++;
            PvmUtil.sendMessageToParent(jpvm, parent, texto, tagAtual);
            //aloca o modelo local:
            const ModeloLocal = new Model("modeloLocal", ModelX, ModelY, ModelZ, dx, dy, dz);
            //recebe o modelo:
            message = await jpvm.pvm_recv(parent, 33);
            //confirma que recebeu o modelo:
            texto = "SLAVE::Recebeu o Modelo.";
            tagAtual++;
            PvmUtil.sendMessageToParent(jpvm, parent, texto, tagAtual);
            //coloca os valores dentro do modelo local:
            PvmUtil.unpackPartialModel(message.buffer, ModeloLocal);
            //INCLUIDO EM 06/10/2008 - Leitura de SAR externa
            //recebe a SAR:
            const SARLocal = new Field(ModelX, ModelY, ModelZ);
            message = await jpvm.pvm_recv(parent, 3301);
            //confirma que recebeu o modelo:
            texto = "SLAVE::Recebeu a SAR.";
            tagAtual++;
            PvmUtil.sendMessageToParent(jpvm, parent, texto, tagAtual);
            //coloca os valores dentro do modelo local:
            PvmUtil.unpackPartialSAR(message.buffer, SARLocal);

            let Tinit = null;
            if (TinitWasRead) { //recebe a Tinit:
                Tinit = new Field(ModelX, ModelY, ModelZ);
                message = await jpvm.pvm_recv(parent, 3302);
                //confirma que recebeu o modelo:
                texto = "SLAVE::Recebeu a Tinit.";
                tagAtual++;
                PvmUtil.sendMessageToParent(jpvm, parent, texto, tagAtual);
                //coloca os valores dentro do modelo local:
                PvmUtil.unpackPartialSAR(message.buffer, Tinit);
            }

            // 3) RECEBE OS MATERIAIS
            //recebe materiais:
            tagAtual++;
            const FreqIndex = 1;
            const Mat = await PvmUtil.receiveMaterials(jpvm, FreqIndex, tagAtual);
            //confirma que recebeu materiais:
            const mes0 = "SLAVE::Recebeu " + Mat.length + " materiais com o primeiro sendo " + Mat[0].name();
            tagAtual++;
            PvmUtil.sendMessageToParent(jpvm, parent, mes0, tagAtual);
            //descobre o codigo do ar se for diferente de 1
            let airCode = 1;
            for (let mm = 0; mm < Mat.length; mm++)
                if (Mat[mm].isAir())
                    airCode = Mat[mm].code();

            // 4) ALOCA A MATRIZ DE RESPOSTA E INICIALIZA COM O AMBIENTE
            const NumFields = 2;
            const T = new Array(NumFields);
            const initValue = Tenv;
            for (let tam = 0; tam < NumFields; tam++) {
                T[tam] = new Field(ModelX, ModelY, ModelZ, "T", initValue);
            }
            //Armazena a diferenca entre o valor inicial e o T
            //(2008; never sent to the master, which shows T - T(n=0) instead)
            let TRise = null;
            if (Tinit != null) {
                TRise = new Field(ModelX, ModelY, ModelZ, "TRise", 0);
            } else {
                Tinit = new Field(ModelX, ModelY, ModelZ, "Tinit", initValue);
                TRise = new Field(ModelX, ModelY, ModelZ, "TRise", 0);
            }

            // Phoenix: borders.  Planes are exchanged with PvmUtil.sendBorder()
            // (3 planes); the neighbour's plane next to ours is plane [1].
            const hasLeft = Left.getPort() !== 0;
            const hasRight = Right.getPort() !== 0;
            const plane = ModelY * ModelZ;
            const asField = (data) => ({ tx: ModelX, ty: ModelY, tz: ModelZ, getData: () => data });
            const ModelLeft = new Uint8Array(3 * plane).fill(airCode);
            const ModelRight = new Uint8Array(3 * plane).fill(airCode);
            const BorderLeft = new Float64Array(3 * plane).fill(Tenv);
            const BorderRight = new Float64Array(3 * plane).fill(Tenv);
            if (hasLeft) PvmUtil.sendBorder(jpvm, asField(ModeloLocal.getData()), 'l', Left, 7771);
            if (hasRight) PvmUtil.sendBorder(jpvm, asField(ModeloLocal.getData()), 'r', Right, 7772);
            if (hasRight) await PvmUtil.receiveBorder(jpvm, ModelRight, Right, 7771);
            if (hasLeft) await PvmUtil.receiveBorder(jpvm, ModelLeft, Left, 7772);

            // Phoenix: per-material constants
            const cellVolume = dx * dy * dz;
            const present = new Uint8Array(256);
            for (const c of ModeloLocal.getData()) present[c] = 1;
            const C = FDTD_T_slave.materialTables(Mat, dx, dy, dz, dtT, hc, cellVolume, myself, present);

            //valores iniciais e constantes:
            const Cb = 1.06; //[W hr / (oCkg)] = Blood Specific Heat
            const sbc = 5.67e-8; //[W/(m2.K4)] = Stefan-Boltzman constant
            let PwEnv = 23.8; //vapour pressure of water in Air [mmHg] for 25[oC]
            if (Tenv !== 25.0)
                PwEnv = 6.5743 * Math.exp(0.05 * Tenv);
            const TenvK4 = Math.pow((Tenv + 273.15), 4);

            // arrays reused by calculateGrads (2007 allocated them for every cube)
            const Air = new Array(6);
            const Tant = new Float64Array(6);

            const model = ModeloLocal.getData();
            const w0 = plane, w1 = ModelZ;
            let unacked = 0;
            let Tstart = null, Tlast = null;   // Phoenix: STEADY

            // 5) CALCULA O FD-TD
            tagAtual++;
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

                // Phoenix: exchange the temperatures of the previous step
                if (n > 0) {
                    if (hasLeft) PvmUtil.sendBorder(jpvm, T[1], 'l', Left, 777);
                    if (hasRight) PvmUtil.sendBorder(jpvm, T[1], 'r', Right, 778);
                    if (hasRight) await PvmUtil.receiveBorder(jpvm, BorderRight, Right, 777);
                    if (hasLeft) await PvmUtil.receiveBorder(jpvm, BorderLeft, Left, 778);
                }

                const T0 = T[0].getData();
                const T1 = T[1].getData();
                const Ti = Tinit.getData();
                const SARd = SARLocal.getData();
                const TR = TRise.getData();

                /**
                 * 2) Faz o T:
                 */
                //para o modelo sem expand()  (redux = true)
                const step = 1;
                for (let i = 0; i < ModelX; i += step) {
                    for (let j = 0; j < ModelY; j += step) {
                        for (let k = 0; k < ModelZ; k += step) {
                            //PEGA OS VALORES DO PONTO
                            const p = i * w0 + j * w1 + k;
                            const code = model[p];
                            //testes para sair:
                            if (code === airCode) {
                                T0[p] = Tenv;
                                continue;
                            }
                            if (n > 0 && C.wire[code]) {
                                T0[p] = T1[p];   // Phoenix: the antenna keeps its initial temperature
                                continue;
                            }
                            if (n === 0) {
                                if (!TinitWasRead) {
                                    T0[p] = Ttissues;
                                    continue;
                                } else {
                                    T0[p] = Ti[p];
                                    continue;
                                }
                            }
                            //Calculos Termicos:
                            //-----------------
                            //Calculates the thermal difusion equation from:
                            // Gandhi, O.P, "Temperature Rise for the Human Head for Cellular Telephones and for Peak
                            // SARs Prescribed in Safety Guidelines", IEEE Trans. on Microwave Theory and Techniques,
                            // vol.49, no.9, 2001.
                            //
                            //   C(m).mp(m).dT/dt = V. [ grad (K.grad (T)) + hm(m) + hEM(m) + bf.Cb(Tblood-T) ] - hRAD - hCONV - hE
                            //      dt in hours!
                            //      V = volume of the cell = dx * dy * dz
                            //      hm = metabolism
                            //      hEM = density.SAR
                            //      hRAD  = emiss . sbc . AeffRAD = 0.98 * 5.67e-8 * Area irradiando
                            //      hCONV = hc . AeffCONV . (Tpoint - Tenv) = 2.7 * Area irradiando * (T - Tenv)
                            //      hE = kevap . An . (Pwpoint - Pwenv)
                            //-------------------
                            //** Pega os valores das props do ponto: **/
                            const K = C.K[code];
                            const Bf = C.Bf[code];
                            const Hm = C.Hm[code];
                            const E = C.E[code];
                            const kEvap = C.kEvap[code];

                            //Pega o codigo dos vizinhos (Phoenix: from the neighbour slave at the borders)
                            const jk = j * ModelZ + k;
                            const Xminus = i > 0 ? model[p - w0] : ModelLeft[plane + jk];
                            const Xplus = i < ModelX - 1 ? model[p + w0] : ModelRight[plane + jk];
                            const Yminus = j > 0 ? model[p - w1] : airCode;
                            const Yplus = j < ModelY - 1 ? model[p + w1] : airCode;
                            const Zminus = k > 0 ? model[p - 1] : airCode;
                            const Zplus = k < ModelZ - 1 ? model[p + 1] : airCode;
                            //Decobre se os vizinhos sao ar
                            const XminusAir = (Xminus === airCode);
                            const XplusAir = (Xplus === airCode);
                            const YminusAir = (Yminus === airCode);
                            const YplusAir = (Yplus === airCode);
                            const ZminusAir = (Zminus === airCode);
                            const ZplusAir = (Zplus === airCode);

                            const Tpoint = T1[p];
                            const const1 = C.const1[code]; // dtThour/(C*mass)
                            const PwPoint = 1.92 * Tpoint - 2.53; //vapour pressure of water at Skin [mmHg]

                            //calor gerado pelo metabolismo interno:
                            // double metabolism = Hm;
                            //Essa modificacao foi feita em 2008, pois a unidade
                            //   de metabolism deve ser [W/m3] e era [W/kg]
                            const metabolism = C.density[code] * Hm;
                            //calor trocado com o sangue:
                            const bloodCooling = Bf * Cb * (Tblood - Tpoint);
                            //variacao do calor por conducao para outros tecidos:
                            Air[0] = XminusAir; Air[1] = XplusAir;
                            Air[2] = YminusAir; Air[3] = YplusAir;
                            Air[4] = ZminusAir; Air[5] = ZplusAir;
                            Tant[0] = i > 0 ? T1[p - w0] : BorderLeft[plane + jk];
                            Tant[1] = i < ModelX - 1 ? T1[p + w0] : BorderRight[plane + jk];
                            Tant[2] = YminusAir ? Tpoint : T1[p - w1];
                            Tant[3] = YplusAir ? Tpoint : T1[p + w1];
                            Tant[4] = ZminusAir ? Tpoint : T1[p - 1];
                            Tant[5] = ZplusAir ? Tpoint : T1[p + 1];
                            const conduction = FDTD_T_slave.calculateGrads(K, Tpoint, Tant, Air, dx, dy, dz);
                            //calor gerado pela SAR: (incluido em out/2008)
                            //======================
                            // O arquivo fornece o E^2
                            // Para calcular a SAR = (sigma.E^2)/(2*density)
                            // hem = SAR*density = (sigma*E^2)/(2*density) * density = (sigma*E^2)/2
                            const hem = C.sigma[code] * SARd[p] / 2;
                            //OK - calor perdido por radiacao, conveccao e evaporacao:
                            let radiation = 0;
                            let convection = 0;
                            let evaporation = 0;
                            let Aeff = 0;
                            const anyAir = XminusAir || XplusAir || YminusAir || YplusAir || ZminusAir || ZplusAir;
                            const rad = anyAir ? E * sbc * (Math.pow((Tpoint + 273.15), 4) - TenvK4) : 0;
                            if (XminusAir) {
                                Aeff = (dy * dz);
                                radiation += Aeff * rad;
                                convection += Aeff * hc * (Tpoint - Tenv);
                                evaporation += Aeff * kEvap * (PwPoint - PwEnv);
                            }
                            if (XplusAir) {
                                Aeff = (dy * dz);
                                radiation += Aeff * rad;
                                convection += Aeff * hc * (Tpoint - Tenv);
                                evaporation += Aeff * kEvap * (PwPoint - PwEnv);
                            }
                            if (YminusAir) {
                                Aeff = (dx * dz);
                                radiation += Aeff * rad;
                                convection += Aeff * hc * (Tpoint - Tenv);
                                evaporation += Aeff * kEvap * (PwPoint - PwEnv);
                            }
                            if (YplusAir) {
                                Aeff = (dx * dz);
                                radiation += Aeff * rad;
                                convection += Aeff * hc * (Tpoint - Tenv);
                                evaporation += Aeff * kEvap * (PwPoint - PwEnv);
                            }
                            if (ZminusAir) {
                                Aeff = (dx * dy);
                                radiation += Aeff * rad;
                                convection += Aeff * hc * (Tpoint - Tenv);
                                evaporation += Aeff * kEvap * (PwPoint - PwEnv);
                            }
                            if (ZplusAir) {
                                Aeff = (dx * dy);
                                radiation += Aeff * rad;
                                convection += Aeff * hc * (Tpoint - Tenv);
                                evaporation += Aeff * kEvap * (PwPoint - PwEnv);
                            }
                            //FDTD DA TEMPERATURA:
                            const Tatual = Tpoint +
                                const1 * (cellVolume * (conduction + metabolism + hem + bloodCooling) +
                                    (-radiation - convection - evaporation));
                            let Trise = 0;
                            Trise = Tatual - Ti[p];
                            T0[p] = Tatual;
                            TR[p] = Trise;
                        }
                    }
                }

                /** 6) Repassa as Matrizes
                 */
                Field.RefreshT(0, ModelX, 0, ModelY, 0, ModelZ, T);

                // Phoenix: STEADY - how much T changed over the last W steps,
                // against how much it changed since n = 0 (tissues only)
                let stop = false;
                if (W > 0) {
                    if (n === 0) { Tstart = Float64Array.from(T0); Tlast = Float64Array.from(T0); }
                    else if (n % W === 0) {
                        let num = 0, den = 0;
                        for (let p = 0; p < T0.length; p++) {
                            const code = model[p];
                            if (code === airCode || C.wire[code]) continue;
                            num += Math.abs(T0[p] - Tlast[p]);
                            den += Math.abs(T0[p] - Tstart[p]);
                        }
                        Tlast.set(T0);
                        const sb = new jpvmBuffer();
                        sb.pack(n); sb.pack(num); sb.pack(den);
                        jpvm.pvm_send(sb, parent, TAG_STEADY);
                        const verdict = await jpvm.pvm_recv(parent, TAG_VERDICT);
                        stop = verdict.buffer.upkint() === 0;
                    }
                }

                // ENVIA AS RESPOSTAS PARA MASTER:
                // -------------------------------
                // Apenas a cada SKIP (10/04/2007)  (Phoenix: and at the steady state)
                if (n % skip === 0 || stop) {
                    if (unacked >= MAX_UNACKED) { await jpvm.pvm_recv(parent, TAG_ACK); unacked--; }
                    const tagResposta = 900;
                    //manda o Tatual
                    let mes = "Mandando T parcial para master com tag =" + tagResposta + ".";
                    PvmUtil.sendMessageToParent(jpvm, parent, mes, (902));
                    // envia:
                    PvmUtil.sendPartialField(jpvm, parent, T[0], tagResposta);
                    mes = "Mandou T parcial para master com tag =" + tagResposta + ".";
                    PvmUtil.sendMessageToParent(jpvm, parent, mes, (904));
                    unacked++;
                    print.println("N = " + n + " enviado para o master.");
                }
                if (stop) break;
            }
            // Exit from the parallel virtual machine
            jpvm.pvm_exit();
        } catch (jpe) {
            if (myself) PvmUtil.logError(myself, "Error in FDTD_T_slave", jpe);
            throw jpe;
        }
    }

    /**
     * Phoenix: thermal constants per material code, including the dtT
     * checks of 2007 (TmaxW = Wang, TmaxB = Bernardi).
     */
    static materialTables(Mat, dx, dy, dz, dtT, hc, cellVolume, myself, present) {
        const N = 256;
        const C = {
            K: new Float64Array(N), Bf: new Float64Array(N), Hm: new Float64Array(N),
            E: new Float64Array(N), kEvap: new Float64Array(N), const1: new Float64Array(N),
            density: new Float64Array(N), sigma: new Float64Array(N), wire: new Uint8Array(N),
        };
        for (let mm = 0; mm < Mat.length; mm++) {
            const mat = Mat[mm];
            const code = mat.code();
            if (present && !present[code]) continue; // (2007 checked only the cubes it visited)
            const Cm = mat.C();
            const K = mat.K();
            const Bf = mat.Bf();
            const density = mat.density();
            C.K[code] = K; C.Bf[code] = Bf; C.Hm[code] = mat.Hm();
            C.E[code] = mat.Emissivity(); C.kEvap[code] = mat.Kevap();
            C.density[code] = density;
            // 2008: double sigma = mat.si(1);  (Phoenix: index 0 when the model has one frequency)
            C.sigma[code] = mat.si(Math.min(1, mat.nfreq() - 1));
            C.wire[code] = FDTD_T_slave.isWire(mat) ? 1 : 0;

            const dtThour = dtT / (60 * 60); //converte dt para horas
            const mass = cellVolume * density;
            //Testa o valor de dtT  (Phoenix: in hours, see stabilityLimits).  As in 2010 the
            //result is only logged; the master refuses a dtT above Wang's limit before starting.
            //(Changing dtThour of one material, as the 2007 code meant to, would slow its clock.)
            const [TmaxW, TmaxB] = FDTD_T_slave.stabilityLimits(mat, dx, dy, dz, hc);
            if (!C.wire[code] && dtThour > TmaxW) {
                PvmUtil.logError(myself, "   DELTA T (" + dtThour + ") HIGHER THAN THE MAXIMUM ALLOWED " + TmaxW + " (" + mat.name() + ")", null);
            }
            if (!C.wire[code] && dtThour > TmaxB) {
                PvmUtil.logError(myself, " Delta Wang = " + TmaxW + "      Delta Bernardi = " + TmaxB + "   DELTA T = " + dtThour + " (" + mat.name() + ")", null);
            }
            C.const1[code] = dtThour / (Cm * mass);
        }
        return C;
    }

    /** Phoenix: the wire of the antenna, a perfect conductor in the EH calculation. */
    static isWire(mat) {
        const name = mat.name().toLowerCase();
        return name.startsWith("copper") || name.startsWith("source");
    }

    /**
     * The stability limits of the explicit scheme for one material, in hours
     * (TmaxW = Wang, TmaxB = Bernardi).  2007 wrote them with C*3600, i.e. in
     * seconds, and compared them with dt in hours.  Phoenix: in hours, and
     * the 12/dx^2 of equal cubes becomes 4*(1/dx^2+1/dy^2+1/dz^2).
     */
    static stabilityLimits(mat, dx, dy, dz, hc) {
        const Cm = mat.C(), K = mat.K(), Bf = mat.Bf(), density = mat.density();
        const inv2 = 1 / (dx * dx) + 1 / (dy * dy) + 1 / (dz * dz);
        const TmaxW = (2 * density * Cm) / (4 * K * inv2 + Bf);
        const TmaxB = 1 / (8 * K * inv2 / (3 * Cm * density) + 8 * hc / (Cm * density * Math.min(dx, dy, dz)) + Bf / (Cm * density));
        return [TmaxW, TmaxB];
    }

    /**
     *  "gradients" = grad(k.grad(T)) = gradA + gradB
     *
     *      gradA = K(i,j,k)*[ (T(i+1,j,k,n)-2*T(i,j,k,n)+T(i-1,j,k,n))/(DeltaX*DeltaX) +
     *                         (T(i,j+1,k,n)-2*T(i,j,k,n)+T(i,j-1,k,n))/(DeltaY*DeltaY) +
     *                         (T(i,j,k+1,n)-2*T(i,j,k,n)+T(i,j,k-1,n))/(DeltaZ*DeltaZ)  ]
     *      gradB was commented out in 2007 (so the neighbours' K were looked
     *      up but never used; that lookup is gone).
     */
    static calculateGrads(K, Tpoint, Tant, Air, dx, dy, dz) {
        let grad = 0;
        for (let g = 0; g < 3; g++) { //faz para x, y e z
            const delta = g === 0 ? dx : (g === 1 ? dy : dz);
            const d = 1 / (delta * delta);
            let Tminus = Tant[2 * g];
            let Tplus = Tant[2 * g + 1];
            if (Air[2 * g]) { //tem ar do lado esquerdo
                //formulacao simplificada para gA e gB
                Tminus = Tpoint;
            }
            if (Air[2 * g + 1]) { //tem ar do lado direito
                //formulacao simplificada para gA e gB
                Tplus = Tpoint;
            }
            grad += d * K * (Tplus - 2 * Tpoint + Tminus); //gA
        }
        return grad;
    }

    static par(i) { return (i % 2) === 0; }
    static impar(i) { return (i % 2) !== 0; }
    static limiteInf(i, limI) { return i === limI; }
    static limiteSup(i, limS) { return i === limS - 1; }
}
