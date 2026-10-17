/*
 * FDTD_slave.java
 *
 * Created on 6 de Março de 2006, 13:02
 */

/**
 *
 * @author Ana de Oliveira Rodrigues
 * @version 0.1 - 3/Marco/2006
 */
import jpvm.*;
import java.io.*;

public class FDTD_T_slave {

    public static void main(String args[]) {
        jpvmEnvironment jpvm = null;
        jpvmTaskId parent = null;
        jpvmTaskId myself = null;
        int tagAtual = 12344;


        try {
            // Enroll in the parallel virtual machine...
            jpvm = new jpvmEnvironment();

            // Get my parent's task id...
            parent = jpvm.pvm_parent();

            // Get my task id...
            myself = jpvm.pvm_mytid();

            //Error log
            String logfile = ("LOG:" + myself.getHost() + ":" + myself.getPort() + ".log");
            FileOutputStream out = new FileOutputStream(logfile);
            PrintStream print = new PrintStream(out);


            // Send a message to my parent...
            String texto = new String("Hello from Slave " + myself.getPort() + "!");
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
            jpvmMessage message = jpvm.pvm_recv(parent, 11);
            int slaveID = message.buffer.upkint();
            int NPROC = message.buffer.upkint();
            int nMax = message.buffer.upkint();
            int skip = message.buffer.upkint();
            //confirma que recebeu:
            texto = new String("Recebeu SlaveID = " + slaveID + ", NPROC = " + NPROC + ", Nmax = " + nMax + ", reduzN =" + skip + ".");
            tagAtual++;
            PvmUtil.sendMessageToParent(jpvm, parent, texto, tagAtual);

            //recebe os vizinhos
            message = jpvm.pvm_recv(parent, 12);
            jpvmTaskId Left = message.buffer.upktid();
            jpvmTaskId Right = message.buffer.upktid();
            //confirma que recebeu:
            texto = new String("Slave " + slaveID + " recebeu Vizinhos: Left = " + Left.getPort() + " e Right = " + Right.getPort() + ".");
            //texto = new String("Slave "+slaveID+" recebeu Vizinhos.");
            PvmUtil.sendMessageToParent(jpvm, parent, texto, 14);


            // 2) RECEBE O PEDACO DO MODELO, E OS DELTAS
            //recebe o tamanho:
            message = jpvm.pvm_recv(parent, 22);
            int ModelX = message.buffer.upkint();
            int ModelY = message.buffer.upkint();
            int ModelZ = message.buffer.upkint();
            double dx = message.buffer.upkdouble();
            double dy = message.buffer.upkdouble();
            double dz = message.buffer.upkdouble();
            double dtT = message.buffer.upkdouble();
            double hc = message.buffer.upkdouble();
            double Tenv = message.buffer.upkdouble();
            double Tblood = message.buffer.upkdouble();
            double Ttissues = message.buffer.upkdouble();
            double TRead = message.buffer.upkdouble();
            boolean TinitWasRead = false;
            if (TRead != 0) {
                TinitWasRead = true;
            //confirma que recebeu o tamanho:
            }
            texto = new String("SLAVE::Recebeu Tamanho = (" + ModelX + "," + ModelY + "," + ModelZ + ") e Deltas = (" + dx + "," + dy + "," + dz + ")");
            tagAtual++;
            PvmUtil.sendMessageToParent(jpvm, parent, texto, tagAtual);

            //aloca o modelo local:
            Model ModeloLocal = new Model("modeloLocal", ModelX, ModelY, ModelZ, dx, dy, dz);

            //recebe o modelo:
            message = jpvm.pvm_recv(parent, 33);
            //confirma que recebeu o modelo:
            texto = new String("SLAVE::Recebeu o Modelo.");
            tagAtual++;
            PvmUtil.sendMessageToParent(jpvm, parent, texto, tagAtual);
            //coloca os valores dentro do modelo local:
            PvmUtil.unpackPartialModel(message.buffer, ModeloLocal);

            //INCLUIDO EM 06/10/2008 - Leitura de SAR externa
            //recebe a SAR:
            Field SARLocal = new Field(ModelX, ModelY, ModelZ);
            message = jpvm.pvm_recv(parent, 3301);
            //confirma que recebeu o modelo:
            texto = new String("SLAVE::Recebeu a SAR.");
            tagAtual++;
            PvmUtil.sendMessageToParent(jpvm, parent, texto, tagAtual);
            //coloca os valores dentro do modelo local:
            PvmUtil.unpackPartialSAR(message.buffer, SARLocal);

            Field Tinit = null;
            if (TinitWasRead) { //recebe a Tinit:

                Tinit = new Field(ModelX, ModelY, ModelZ);
                message = jpvm.pvm_recv(parent, 3302);
                //confirma que recebeu o modelo:
                texto = new String("SLAVE::Recebeu a Tinit.");
                tagAtual++;
                PvmUtil.sendMessageToParent(jpvm, parent, texto, tagAtual);
                //coloca os valores dentro do modelo local:
                PvmUtil.unpackPartialSAR(message.buffer, Tinit);
            }

            // 3) RECEBE OS MATERIAIS
            //recebe materiais:
            tagAtual++;
            int FreqIndex = 1;
            Material[] Mat = PvmUtil.receiveMaterials(jpvm, FreqIndex, tagAtual);
            //confirma que recebeu materiais:
            String mes = new String("SLAVE::Recebeu " + Mat.length + " materiais com o primeiro sendo " + Mat[0].name());
            tagAtual++;
            PvmUtil.sendMessageToParent(jpvm, parent, mes, tagAtual);

            //descobre o codigo do ar se for diferente de 1
            int airCode = 1;
            for (int mm = 0; mm < Mat.length; mm++) {
                if (Mat[mm].isAir()) {
                    airCode = Mat[mm].code();
                }
            }

            // 4) ALOCA A MATRIZ DE RESPOSTA E INICIALIZA COM O AMBIENTE
            //Inicializa o T
            int NumFields = 2;
            Field[] T = new Field[NumFields];

            double initValue = Tenv;
            try {
                for (int tam = 0; tam < NumFields; tam++) {
                    T[tam] = new Field(ModelX, ModelY, ModelZ, "T", initValue);
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
            //boolean initialValuesReadFromFile = false;

            //Armazena a diferenca entre o valor inicial e o T
            Field TRise = null;
            if (Tinit != null) {
                TRise = new Field(ModelX, ModelY, ModelZ, "TRise", 0);
            } else {
                Tinit = new Field(ModelX, ModelY, ModelZ, "Tinit", initValue);
                TRise = new Field(ModelX, ModelY, ModelZ, "TRise", 0);
            }

            // 5) CALCULA O FD-TD
            tagAtual++;
            for (int n = 0; n < nMax; n++) {
                // ENVIA O N PARA A MASTER:
                // ------------------------
                jpvmBuffer buf = new jpvmBuffer();
                buf.pack(n);
                jpvm.pvm_send(buf, parent, 197 + n);

                // FAZ O CALCULO:
                // --------------
                /**
                 * 1) Pre-FDTD para as Fontes:
                 */
                //Nao implementado
                /**
                 * 2) Faz o T:
                 */
                int step = 1;
                int xi = 0;
                int yi = 0;
                int zi = 0;
                int xf = ModelX;
                int yf = ModelY;
                int zf = ModelZ;

                for (int i = xi; i < xf; i += step) {
                    for (int j = yi; j < yf; j += step) {
                        for (int k = zi; k < zf; k += step) {
                            //PEGA OS VALORES DO PONTO
                            int code = ModeloLocal.getData(i, j, k);
                            //testes para sair:
                            if (code == airCode) {
                                T[0].data(i, j, k, Tenv);
                                continue;
                            }

                            Material mat = new Material();
                            for (int mm = 0; mm < Mat.length; mm++) {
                                if (Mat[mm].code() == code) {
                                    mat = Mat[mm];
                                }
                            }


                            if (n == 0) {
                                if (!TinitWasRead) {
                                    T[0].data(i, j, k, Ttissues);
                                    continue;
                                } else {
                                    T[0].data(i, j, k, Tinit.data(i, j, k));
                                    continue;
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
                            }
                            double C = mat.C();
                            double K = mat.K();
                            double Bf = mat.Bf();
                            double Hm = mat.Hm();
                            double E = mat.Emissivity();
                            double kEvap = mat.Kevap();
                            double density = mat.density();
                            double sigma = mat.si(1);

                            //Pega o codigo dos vizinhos
                            int Xminus = ModeloLocal.getData(i - step, j, k);
                            int Xplus = ModeloLocal.getData(i + step, j, k);
                            int Yminus = ModeloLocal.getData(i, j - step, k);
                            int Yplus = ModeloLocal.getData(i, j + step, k);
                            int Zminus = ModeloLocal.getData(i, j, k - step);
                            int Zplus = ModeloLocal.getData(i, j, k + step);

                            //Decobre se os vizinhos sao ar
                            boolean XminusAir = (Xminus == airCode);
                            boolean XplusAir = (Xplus == airCode);
                            boolean YminusAir = (Yminus == airCode);
                            boolean YplusAir = (Yplus == airCode);
                            boolean ZminusAir = (Zminus == airCode);
                            boolean ZplusAir = (Zplus == airCode);

                            //valores iniciais e constantes:
                            double cellVolume = dx * dy * dz;
                            double Cb = 1.06; //[W hr / (oCkg)] = Blood Specific Heat

                            double sbc = 5.67e-8; //[W/(m2.K4)] = Stefan-Boltzman constant

                            double Tpoint = T[1].data(i, j, k);
                            double dtThour = dtT / (60 * 60); //converte dt para horas

                            double mass = cellVolume * density;
                            double const1 = dtThour / (C * mass);
                            double PwEnv = 23.8; //vapour pressure of water in Air [mmHg] for 25[oC]

                            if (Tenv != 25.0d) {
                                PwEnv = 6.5743 * Math.exp(0.05 * Tenv);
                            }
                            double PwPoint = 1.92 * Tpoint - 2.53; //vapour pressure of water at Skin [mmHg]

                            //Testa o valor de dtT
                            double TmaxW = (2 * density * C * 3600 * dx * dx) / (12 * K + Bf * dx * dx);
                            double TmaxB = 1 / (8 * K / (C * 3600 * density * dx * dx) + 8 * hc / (C * 3600 * density * dx) + Bf / (C * 3600 * density));
                            if (dtThour > TmaxW) {
                                dtThour = TmaxW;
                                String text = new String("   DELTA T (" + dtThour + ") HIGHER THAN THE MAXIMUM ALLOWED, ALTERED TO  " + TmaxW);
                                PvmUtil.logError(myself, text, null);
                            }
                            if (dtThour > TmaxB) {
                                dtThour = TmaxB / 2;
                                String text = new String(" Delta Wang = " + TmaxW + "      Delta Bernardi = " + TmaxB + "   DELTA T ALTERED TO: " + dtThour);
                                PvmUtil.logError(myself, text, null);
                            }

                            //Exemplo: PELE
                            // code="15" muR="1.0,1.0" epR="40.71,37.21" si="0.65,1.25" siC="0.0,0.0"
                            // density="1100.0" C="1.05" k="0.334" bf="33600.0" hm="1.07"  e="0.98" kevap="0.35"

                            //calor gerado pelo metabolismo interno:
                            // double metabolism = Hm;
                            //Essa modificacao foi feita em 2008, pois a unidade
                            //   de metabolism deve ser [W/m3] e era [W/kg] 
                            double metabolism = density * Hm;


                            //calor trocado com o sangue:
                            double bloodCooling = Bf * Cb * (Tblood - Tpoint);

                            //variacao do calor por conducao para outros tecidos:
                            double conduction = 0;
                            boolean[] Air = new boolean[6];
                            Air[0] = XminusAir;
                            Air[1] = XplusAir;
                            Air[2] = YminusAir;
                            Air[3] = YplusAir;
                            Air[4] = ZminusAir;
                            Air[5] = ZplusAir;
                            int[] Neighbor = new int[6];
                            Neighbor[0] = Xminus;
                            Neighbor[1] = Xplus;
                            Neighbor[2] = Yminus;
                            Neighbor[3] = Yplus;
                            Neighbor[4] = Zminus;
                            Neighbor[5] = Zplus;
                            double[] Tant = new double[6];
                            Tant[0] = T[1].data(i - step, j, k);
                            Tant[1] = T[1].data(i + step, j, k);
                            Tant[2] = T[1].data(i, j - step, k);
                            Tant[3] = T[1].data(i, j + step, k);
                            Tant[4] = T[1].data(i, j, k - step);
                            Tant[5] = T[1].data(i, j, k + step);
                            conduction = calculateGrads(mat, Tpoint, Tant, Air, Neighbor, Mat, dx, dy, dz);

                            //calor gerado pela SAR: (incluido em out/2008)
                            //======================
                            // O arquivo fornece o E^2
                            // Para calcular a SAR = (sigma.E^2)/(2*density)
                            // hem = SAR*density = (sigma*E^2)/(2*density) * density = (sigma*E^2)/2
                            // double hem = 0;
                            double hem = sigma * SARLocal.data(i, j, k) / 2;

                            //OK - calor perdido por radiacao, conveccao e evaporacao:
                            double radiation = 0;
                            double convection = 0;
                            double evaporation = 0;

                            double Aeff = 0;
                            if (XminusAir) {
                                Aeff = (dy * dz);
                                radiation += Aeff * E * sbc * (Math.pow((Tpoint + 273.15), 4) - Math.pow((Tenv + 273.15), 4));
                                convection += Aeff * hc * (Tpoint - Tenv);
                                evaporation += Aeff * kEvap * (PwPoint - PwEnv);

                            }
                            if (XplusAir) {
                                Aeff = (dy * dz);
                                radiation += Aeff * E * sbc * (Math.pow((Tpoint + 273.15), 4) - Math.pow((Tenv + 273.15), 4));
                                convection += Aeff * hc * (Tpoint - Tenv);
                                evaporation += Aeff * kEvap * (PwPoint - PwEnv);
                            }
                            if (YminusAir) {
                                Aeff = (dx * dz);
                                radiation += Aeff * E * sbc * (Math.pow((Tpoint + 273.15), 4) - Math.pow((Tenv + 273.15), 4));
                                convection += Aeff * hc * (Tpoint - Tenv);
                                evaporation += Aeff * kEvap * (PwPoint - PwEnv);
                            }
                            if (YplusAir) {
                                Aeff = (dx * dz);
                                radiation += Aeff * E * sbc * (Math.pow((Tpoint + 273.15), 4) - Math.pow((Tenv + 273.15), 4));
                                convection += Aeff * hc * (Tpoint - Tenv);
                                evaporation += Aeff * kEvap * (PwPoint - PwEnv);
                            }
                            if (ZminusAir) {
                                Aeff = (dx * dy);
                                radiation += Aeff * E * sbc * (Math.pow((Tpoint + 273.15), 4) - Math.pow((Tenv + 273.15), 4));
                                convection += Aeff * hc * (Tpoint - Tenv);
                                evaporation += Aeff * kEvap * (PwPoint - PwEnv);
                            }
                            if (ZplusAir) {
                                Aeff = (dx * dy);
                                radiation += Aeff * E * sbc * (Math.pow((Tpoint + 273.15), 4) - Math.pow((Tenv + 273.15), 4));
                                convection += Aeff * hc * (Tpoint - Tenv);
                                evaporation += Aeff * kEvap * (PwPoint - PwEnv);
                            }


                            //FDTD DA TEMPERATURA:
                            double Tatual = Tpoint +
                                    const1 * (cellVolume * (conduction + metabolism + hem + bloodCooling) +
                                    (-radiation - convection - evaporation));
                            double Trise = 0;
                            Trise = Tatual - Tinit.data(i, j, k);
                            T[0].data(i, j, k, Tatual);
                            TRise.data(i, j, k, Trise);
                        }
                    }
                }

                /** 6) Repassa as Matrizes
                 */
                Field.RefreshT(0, ModelX, 0, ModelY, 0, ModelZ, T);

                // ** teste com valor fixo:
                //EH[0].setAllData(myself.getPort()-parent.getPort()+n);

                // ENVIA AS RESPOSTAS PARA MASTER:
                // -------------------------------
                // confirma o envio:
                if (n % skip == 0) {
                    //manda o Tatual
                    int tagResposta = 900;
                    mes = new String("Mandando T parcial para master com tag =" + tagResposta + ".");
                    PvmUtil.sendMessageToParent(jpvm, parent, mes, (902));
                    // envia:
                    PvmUtil.sendPartialField(jpvm, parent, T[0], tagResposta);
                    //PvmUtil.sendPartialField(jpvm, parent, TRise, tagResposta);
                    mes = new String("Mandou T parcial para master com tag =" + tagResposta + ".");
                    PvmUtil.sendMessageToParent(jpvm, parent, mes, (904));


                }
            }


            // Exit from the parallel virtual machine
            jpvm.pvm_exit();
        } catch (Throwable jpe) {
            try {
                String logfile = ("ERROR:" + myself.getHost() + ":" + myself.getPort() + ".log");
                FileOutputStream out = new FileOutputStream(logfile);
                PrintStream print = new PrintStream(out);
                jpe.printStackTrace(print);

                String texto = new String("Error!!! -  exception" + jpe.toString());
                jpvmBuffer buf = new jpvmBuffer();
                buf.pack(texto);
                jpvm.pvm_send(buf, parent, tagAtual);

            } catch (Throwable e) {
                e.printStackTrace();
            }
            throw new RuntimeException(jpe);
        }

    }

    public static void inicializa(double[][][] A, double value) {
        for (int i = 0; i < A.length; i++) {
            for (int j = 0; j < A[i].length; j++) {
                for (int k = 0; k < A[i][j].length; k++) {
                    A[i][j][k] = value;
                }
            }
        }
    }

    public static double calculateGrads(Material PointMaterial, double Tpoint, double[] Tant, boolean[] Air, int[] Neighbor, Material[] Mat, double dx, double dy, double dz) {
        //"gradients" = grad(k.grad(T)) = gradA + gradB
        //
        //      gradA = K(i,j,k)*[ (T(i+1,j,k,n)-2*T(i,j,k,n)+T(i-1,j,k,n))/(DeltaX*DeltaX) +
        //                         (T(i,j+1,k,n)-2*T(i,j,k,n)+T(i,j-1,k,n))/(DeltaY*DeltaY) +
        //                         (T(i,j,k+1,n)-2*T(i,j,k,n)+T(i,j,k-1,n))/(DeltaZ*DeltaZ)  ]
        //      DESNECESSARIO - retirado em 2008: 
        //      gradB = [ (k(i+1/2,j,k,n)+k(i-1/2,j,k,n))/DeltaX +
        //                (k(i,j+1/2,k,n)+k(i,j-1/2,k,n))/DeltaY +
        //                (k(i+1/2,j,k,n)+k(i-1/2,j,k,n))/DeltaZ  ] *
        //              [ (T(i+1/2,j,k,n)-T(i-1/2,j,k,n))/DeltaX +
        //                (T(i,j+1/2,k,n)-T(i,j-1/2,k,n))/DeltaY +
        //                (T(i,j,k+1/2,n)-T(i,j,k-1/2,n))/DeltaZ  ]

        double[] delta = new double[3];
        delta[0] = dx;
        delta[1] = dy;
        delta[2] = dz;

        Material[] NeighborMaterial = new Material[Neighbor.length];
        for (int mm = 0; mm < Mat.length; mm++) {
            for (int nn = 0; nn < Neighbor.length; nn++) {
                if (Mat[mm].code() == Neighbor[nn]) {
                    NeighborMaterial[nn] = Mat[mm];
                }
            }
        }

        double grad = 0;
        for (int g = 0; g < 3; g++) { //faz para x, y e z

            double d = (delta[g] * delta[g]);
            double K = PointMaterial.K();
            double Tminus = Tant[2 * g];
            double Tplus = Tant[2 * g + 1];
            if (Air[2 * g]) {//tem ar do lado esquerdo
                //formulacao simplificada para gA e gB
                Tminus = Tpoint;
            }
            if (Air[2 * g + 1]) {//tem ar do lado direito
                //formulacao simplificada para gA e gB
                Tplus = Tpoint;
            }

            grad += K * (Tplus - 2 * Tpoint + Tminus) / d;//gA

        /**
         * double Kminus = NeighborMaterial[2 * g].K();
         * double Kplus = NeighborMaterial[2 * g + 1].K();
         * double gB1 = d*(Kplus-K)*(Tplus-T);
         * double gB2 = d*(K-Kminus)*(T-Tminus);
         * if (Tpoint<Tplus) {
         * if (gB1<0) gB1=-gB1; //gA1 tem que ser positivo
         * } else {
         * if (gB1>0) gB1=-gB1;//gB1 tem que ser negativo
         * }
         * if (Tpoint<Tplus) {
         * if (gB1<0) gB1=-gB1; //gA1 tem que ser positivo
         * } else {
         * if (gB1>0) gB1=-gB1;//gB1 tem que ser negativo
         * }
         * if (Tpoint<Tminus) {
         * if (gB2<0) gB2=-gB2; //gB2 tem que ser positivo
         * } else {
         * if (gB2>0) gB2=-gB2; //gB2 tem que ser negativo
         * }
         *
         * grad += gB1+gB2 ; //gB
         **/
        }
        return grad;
    }
}
