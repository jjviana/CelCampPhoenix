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

public class FDTD_slave {

    //static int slaveID = 0;
    //para a CCA de Mur:
    static double cmaX, cmbX, cmcX, cmdX;
    static double cmaY, cmbY, cmcY, cmdY;
    static double cmaZ, cmbZ, cmcZ, cmdZ;
    static double[] const2aOrdem;

    public static void main(String args[]) {
        final jpvmEnvironment jpvm;
        jpvmTaskId parent = null;
        final jpvmTaskId myself;
        int tagAtual = 12344;
        String host = null;
        int port = 0;


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
            jpvmMessage message = jpvm.pvm_recv(parent, 11);
            int slaveID = message.buffer.upkint();
            int NPROC = message.buffer.upkint();
            int nMax = message.buffer.upkint();
            int nSkip = message.buffer.upkint();
            //confirma que recebeu:
            texto = new String("Recebeu SlaveID = " + slaveID + ", NPROC = " + NPROC + ", Nmax = " + nMax + " e nSkip = " + nSkip + ".");
            tagAtual++;
            PvmUtil.sendMessageToParent(jpvm, parent, texto, tagAtual);

            //recebe os vizinhos
            message = jpvm.pvm_recv(parent, 12);
            final jpvmTaskId Left = message.buffer.upktid();
            final jpvmTaskId Right = message.buffer.upktid();
            //confirma que recebeu:
            texto = new String("Slave " + slaveID + " recebeu Vizinhos: Left = " + Left.getPort() + " e Right = " + Right.getPort() + ".");
            //texto = new String("Slave "+slaveID+" recebeu Vizinhos.");
            PvmUtil.sendMessageToParent(jpvm, parent, texto, 14);


            // 2) RECEBE O PEDACO DO MODELO, OS DELTAS e as CCA
            //recebe o tamanho:
            message = jpvm.pvm_recv(parent, 22);
            int ModelX = message.buffer.upkint();
            int ModelY = message.buffer.upkint();
            int ModelZ = message.buffer.upkint();
            double dx = message.buffer.upkdouble();
            double dy = message.buffer.upkdouble();
            double dz = message.buffer.upkdouble();
            double dt = message.buffer.upkdouble();
            int FreqIndex = message.buffer.upkint();
            char CCAtype = message.buffer.upkchar();
            int CCAorder = message.buffer.upkint();

            //confirma que recebeu o tamanho:
            texto = new String("Recebeu Tamanho = (" + ModelX + "," + ModelY + "," + ModelZ + ") e Deltas = (" + dx + "," + dy + "," + dz + ")");
            tagAtual++;
            PvmUtil.sendMessageToParent(jpvm, parent, texto, tagAtual);

            //aloca o modelo local:
            //byte [][][]  ModeloLocal = new byte[ModelX][ModelY][ModelZ];
            Model ModeloLocal = new Model("modeloLocal", ModelX, ModelY, ModelZ, dx, dy, dz);

            //recebe o modelo:
            message = jpvm.pvm_recv(parent, 33);
            //confirma que recebeu o modelo:
            texto = new String("Recebeu o Modelo.");
            tagAtual++;
            PvmUtil.sendMessageToParent(jpvm, parent, texto, tagAtual);

            //coloca os valores dentro do modelo local:
            /**
             * for (int x=0; x<ModelX; x++){
             * for (int y=0; y<ModelY; y++){
             * for (int z=0; z<ModelZ; z++){
             * byte value = message.buffer.upkbyte();
             * ModeloLocal.setData(x,y,z,value);
             * }
             * }
             * }**/
            PvmUtil.unpackPartialModel(message.buffer, ModeloLocal);

            // 3) RECEBE AS FONTES E OS MATERIAIS
            //recebe fontes:
            tagAtual++;
            Source[] S = PvmUtil.receiveSources(jpvm, tagAtual);
            //confirma que recebeu as fontes:
            String printSource = "";
            for (int nf = 0; nf < S.length; nf++) {
                printSource = new String(printSource + "\n       Fonte " + nf + " no ponto [" + S[nf].Location[0] + "," + S[nf].Location[1] + "," + S[nf].Location[2] + "], com freq = " + S[nf].f[FreqIndex] + " e max = " + S[nf].MaxValue);
            }
            String mes = new String("Recebeu " + S.length + " fontes: " + printSource);
            tagAtual++;
            PvmUtil.sendMessageToParent(jpvm, parent, mes, tagAtual);

            //recebe materiais:
            tagAtual++;

            Material[] Mat = PvmUtil.receiveMaterials(jpvm, FreqIndex, tagAtual);

            //confirma que recebeu materiais:
            mes = new String("Recebeu " + Mat.length + " materiais com o primeiro sendo " + Mat[0].name());
            tagAtual++;
            PvmUtil.sendMessageToParent(jpvm, parent, mes, tagAtual);

            // 4) ALOCA A MATRIZ DE RESPOSTA E INICIALIZA
            final Field[] EH = new Field[3];
            double initValue = 0;
            try {
                for (int tam = 0; tam < 3; tam++) {
                    EH[tam] = new Field(ModelX, ModelY, ModelZ, "EH", initValue);
                }
            } catch (Exception e) {
                e.printStackTrace();
            }


            // 5) CALCULA O FD-TD
            tagAtual++;

            int tamCel = 3;
            final double[][][] BorderLeft = new double[tamCel][ModelY][ModelZ];
            final double[][][] BorderRight = new double[tamCel][ModelY][ModelZ];
            /*for (int i=0; i<tamCel; i++){
            for (int j=0; j<ModelY; j++){
            for (int k=0; k<ModelZ; k++) {
            BorderLeft[i][j][k] = 0; BorderRight[i][j][k]=0;}
            }
            }*/

            for (int n = 0; n < nMax; n++) {
                // ENVIA O N PARA A MASTER:
                // ------------------------
                jpvmBuffer buf = new jpvmBuffer();
                buf.pack(n);
                jpvm.pvm_send(buf, parent, 197 + n);

                // FAZ O CALCULO:
                // --------------

                //Nao implementado
                // ENVIA E RECEBE BORDAS: (13/12/2006)
                //------------------------------------
                Thread sendLeftBorderThread = null, sendRightBorderThread = null,
                        receiveLeftBorderThread = null, receiveRightBorderThread = null;


                if (Left.getPort() != 0) { //manda a borda da esquerda

                    sendLeftBorderThread = new Thread(new Runnable() {

                        public void run() {
                            try {
                                PvmUtil.sendBorder(jpvm, EH[0], 'l', Left, 555);
                            } catch (jpvmException e) {

                                PvmUtil.logError(myself, "Error sending left border", e);
                            }
                        }
                    });
                    sendLeftBorderThread.start();

                    // PvmUtil.sendBorder(jpvm, EH[0], 'l', Left, 555);
                }


                if (Right.getPort() != 0) {//recebe a da direita e manda da direita

                    receiveRightBorderThread = new Thread(new Runnable() {

                        public void run() {
                            try {
                                PvmUtil.receiveBorder(jpvm, BorderRight, Right, 555);

                            } catch (jpvmException e) {

                                PvmUtil.logError(myself, "Error receiving right border", e);
                            }
                        }
                    });
                    receiveRightBorderThread.start();

                    sendRightBorderThread = new Thread(new Runnable() {

                        public void run() {
                            try {
                                PvmUtil.sendBorder(jpvm, EH[0], 'r', Right, 666);
                            } catch (jpvmException e) {

                                PvmUtil.logError(myself, "Error sending right border", e);
                            }
                        }
                    });
                    sendRightBorderThread.start();
                }

                if (Left.getPort() != 0) {//recebe a da esquerda

                    receiveLeftBorderThread = new Thread(new Runnable() {

                        public void run() {
                            try {
                                PvmUtil.receiveBorder(jpvm, BorderLeft, Left, 666);
                            } catch (jpvmException e) {

                                PvmUtil.logError(myself, "Error receiving left border", e);
                            }
                        }
                    });
                    receiveLeftBorderThread.start();
                }

                if (sendLeftBorderThread != null) {
                    sendLeftBorderThread.join();
                }
                if (receiveRightBorderThread != null) {
                    receiveRightBorderThread.join();
                }
                if (sendRightBorderThread != null) {
                    sendRightBorderThread.join();
                }
                if (receiveLeftBorderThread != null) {
                    receiveLeftBorderThread.join();
                }

                /**
                 * 
                 * 1) Pre-FDTD para as Fontes:
                 * FONTES INCLUIDAS EM 2008:
                 */
                boolean setFourPoints=true;
                double vS = 0;
                for (int s = 0; s < S.length; s++) {
                    int[] lS = S[s].SourceLocation(ModelX, slaveID);
                    int xs = lS[0];
                    int ys = lS[1];
                    int zs = lS[2];
                    int code = ModeloLocal.getData(xs, ys, zs);
                    //ESCREVENDO NO DEBUG:
                    String messsage = new String("Numero de fontes:" + S.length + "\n **Fonte em " + xs + "," + ys + "," + zs + " com material = " + code);
                    PvmUtil.log(myself, messsage);

                    double freq = S[s].f[FreqIndex];
                    double Max = S[s].MaxValue;
                    double angle = (2 * Math.PI * freq * (n+0.5) * dt); //em radianos

                    //Mudado em 12/05/2010
                    //Referencia: "The Finite-Difference Time-Domain Method for Electromagnetics with MATLAB Simulations
                    //            Atef Elsherbeni and Veysel Demir, 2009, p‡g.74, 4.1.2 Hard Voltage Source
                    //HARD SOURCE: E(i,j,k,n+1) = -E(i,j,k,n)-2* V(t+1/2)/dz
                    // Como V = Vo*sin(w*t) e E = V/dz, da’:
                    //          SOURCE = -E(i,j,k,n) - 2*Eo*sin(w*t+1/2)*
                    vS = -EH[0].data(xs,ys,zs)-2*(Max * Math.sin(angle));
                    S[s].setSourcePoints(EH[0],xs,ys,zs,vS);
                    
                    if (setFourPoints)
                    {
                        if (isEx(xs,ys,zs)){
                         S[s].setSourcePoints(EH[0],xs,ys+2,zs,vS);
                          S[s].setSourcePoints(EH[0],xs,ys,zs+2,vS);
                           S[s].setSourcePoints(EH[0],xs,ys+2,zs+2,vS);
                        }
                        if (isEy(xs,ys,zs)){
                         S[s].setSourcePoints(EH[0],xs+2,ys,zs,vS);
                          S[s].setSourcePoints(EH[0],xs,ys,zs+2,vS);
                           S[s].setSourcePoints(EH[0],xs+2,ys,zs+2,vS);
                        }
                        if (isEz(xs,ys,zs)){
                         S[s].setSourcePoints(EH[0],xs+2,ys,zs,vS);
                          S[s].setSourcePoints(EH[0],xs,ys+2,zs,vS);
                           S[s].setSourcePoints(EH[0],xs+2,ys+2,zs,vS);
                        }
                    }
                    // NAO ƒ IGUAL A FAZER  EH[0].data(xs,ys,zs,vS); !!!
                    PvmUtil.log(myself, "Emax = Max e Setou valor = " + vS + " em " + xs + "," + ys + "," + zs + ".");
                    
                }



                /** 4) Faz o H (que nao tem CC por causa da posicao no cubo)
                 */
                for (int i = 0; i < ModelX; i++) {
                    for (int j = 0; j < ModelY; j++) {
                        for (int k = 0; k < ModelZ; k++) {
                            //fonte ja calculada:
                            boolean isSource = false;
                            for (int s = 0; s < S.length; s++) {
                                int[] lS = S[s].SourceLocation(ModelX, slaveID);
                                int xs = lS[0];
                                int ys = lS[1];
                                int zs = lS[2];
                                if (xs == i && ys == j & zs == k) {
                                    isSource = true;
                                }
                            }
                            if (isSource) {
                                continue;
                            }

                            //testes para sair:
                            if (isE(i, j, k)) {
                                continue; //calculando H

                            }
                            if (!isH(i, j, k)) {
                                continue; //vazios

                            }

                            //Mur's Absorbing Condition
                            //nao ha cc para campos magneticos
                            //faz o FD-TD:
                            int code = ModeloLocal.getData(i, j, k);
                            Material mat = null;
                            for (int mm = 0; mm < Mat.length; mm++) {
                                if (Mat[mm].code() == code) {
                                    mat = Mat[mm];
                                }
                            }
                            double mu = mat.mu(FreqIndex);
                            double siC = mat.siC(FreqIndex);
                            double a = (2 * mu - siC * dt) / (2 * mu + siC * dt);
                            double b = (dt / mu) / (1 + (siC * dt) / (2 * mu));
                            double vH = 0;
                            if (isHx(i, j, k)) {
                                vH = a * EH[0].data(i, j, k);
                                vH += b * ((EH[0].data(i, j, k + 1) - EH[0].data(i, j, k - 1)) / dz);
                                vH += b * (-(EH[0].data(i, j + 1, k) - EH[0].data(i, j - 1, k)) / dy);
                                EH[0].data(i, j, k, vH);
                            }
                            if (isHy(i, j, k)) {
                                vH = a * EH[0].data(i, j, k);
                                vH += b * ((EH[0].data(i + 1, j, k) - EH[0].data(i - 1, j, k)) / dx);
                                vH += b * (-(EH[0].data(i, j, k + 1) - EH[0].data(i, j, k - 1)) / dz);
                                EH[0].data(i, j, k, vH);
                            }
                            if (isHz(i, j, k)) {
                                vH = a * EH[0].data(i, j, k);
                                vH += b * ((EH[0].data(i, j + 1, k) - EH[0].data(i, j - 1, k)) / dy);
                                vH += b * (-(EH[0].data(i + 1, j, k) - EH[0].data(i - 1, j, k)) / dx);
                                EH[0].data(i, j, k, vH);
                            }


                        }
                    }
                }

                /**
                 * 2) Faz o E:
                 *      excluindo os limites minimos (i=0, j=0, k=0)
                 *     17/12/08 -  excluindo os limites maximos (i==TX-1, j==TY-1, k==TZ-1)
                 */
                for (int i = 0; i < ModelX; i++) {
                    for (int j = 0; j < ModelY; j++) {
                        for (int k = 0; k < ModelZ; k++) {

                            //fonte ja calculada:
                            boolean isSource = false;
                            for (int s = 0; s < S.length; s++) {
                                int[] lS = S[s].SourceLocation(ModelX, slaveID);
                                int xs = lS[0];
                                int ys = lS[1];
                                int zs = lS[2];
                                if (xs == i && ys == j & zs == k) {
                                    isSource = true;
                                }
                            }
                            if (isSource) {
                                continue;
                                //testes para sair:
                            }
                            if (isH(i, j, k)) {
                                continue; //calculando E

                            }
                            if (!isE(i, j, k)) {
                                continue; //vazios

                            }
                            if (limiteInf(i, 0) || limiteInf(j, 0) || limiteInf(k, 0)) {
                                continue; //(3) a seguir

                            }
                            if ((limiteSup(i, ModelX) && Right.getPort() == 0) || limiteSup(j, ModelY) || limiteSup(k, ModelZ)) {
                                continue;
                            }

                            //PEGA OS VALORES DO PONTO
                            int code = ModeloLocal.getData(i, j, k);
                            Material mat = null;
                            for (int mm = 0; mm < Mat.length; mm++) {
                                if (Mat[mm].code() == code) {
                                    mat = Mat[mm];
                                }
                            }
                            double ep = mat.ep(FreqIndex);
                            double si = mat.si(FreqIndex);
                            double mu = mat.mu(FreqIndex);
                            /**if (code==4){ //teste dos materiais do ponto
                            String message2 = new String("Ponto = "+i+","+j+","+k+" com material = "+code+" si ="+si+" ep="+ep+"  mu="+mu);
                            PvmUtil.log(myself, message2);
                            }
                             **/
                            //double a = (2 * -siC * dt) / (2 * mu + siC * dt);
                            //double b = (dt / mu) / (1 + (siC * dt) / (2 * mu));
                            double c = (2 * ep - si * dt) / (2 * ep + si * dt);
                            double d = (dt / ep) / (1 + (si * dt) / (2 * ep));
                            double vE = 0;
                            //Faz o FDTD:
                            if (isEx(i, j, k)) {
                                vE = c * EH[0].data(i, j, k);
                                vE += d * ((EH[0].data(i, j + 1, k) - EH[0].data(i, j - 1, k)) / dy);
                                vE += d * (-(EH[0].data(i, j, k + 1) - EH[0].data(i, j, k - 1)) / dz);
                                EH[0].data(i, j, k, vE);

                            }
                            if (isEy(i, j, k)) {
                                vE = c * EH[0].data(i, j, k);
                                vE += d * ((EH[0].data(i, j, k + 1) - EH[0].data(i, j, k - 1)) / dz);
                                vE += d * (-(EH[0].data(i + 1, j, k) - EH[0].data(i - 1, j, k)) / dx);
                                EH[0].data(i, j, k, vE);

                            }
                            if (isEz(i, j, k)) {
                                vE = c * EH[0].data(i, j, k);
                                vE += d * ((EH[0].data(i + 1, j, k) - EH[0].data(i - 1, j, k)) / dx);
                                vE += d * (-(EH[0].data(i, j + 1, k) - EH[0].data(i, j - 1, k)) / dy);
                                EH[0].data(i, j, k, vE);
                            }


                        }
                    }
                }

                /**
                 * Manda e recebe as bordas de novo, para calcular o E das bordas
                 **/
                if (Left.getPort() != 0) { //manda a borda da esquerda de novo

                    PvmUtil.sendBorder(jpvm, EH[0], 'l', Left, 5555);
                }
                if (Right.getPort() != 0) {//recebe a da direita e manda da direita

                    PvmUtil.receiveBorder(jpvm, BorderRight, Right, 5555);
                    PvmUtil.sendBorder(jpvm, EH[0], 'r', Right, 6666);
                }
                if (Left.getPort() != 0) {//recebe a da esquerda

                    PvmUtil.receiveBorder(jpvm, BorderLeft, Left, 6666);
                }

                /**
                 * 3) Faz os limites minimos (i==0)
                 */
                for (int i = 0; i < ModelX; i++) {
                    for (int j = 0; j < ModelY; j++) {
                        for (int k = 0; k < ModelZ; k++) {

                            if (!isEx(i, j, k) && !isEy(i, j, k) && !isEz(i, j, k)) {
                                continue;
                            }

                            if ((i == 0 && j == 0) || (i == 0 && k == 0) || (k == 0 && j == 0)) //frestas
                            {
                                continue;

                                //PEGA OS VALORES DO PONTO
                            }
                            int x = i;
                            int y = j;
                            int z = k;
                            int TamX = ModelX;
                            int TamY = ModelY;
                            int TamZ = ModelZ;
                            Field Campos = EH[0];
                            Field CamposAnterior = EH[1];
                            Field CamposAntAnterior = EH[2];
                            boolean SegundaOrdem;
                            if (CCAorder == 2) {
                                SegundaOrdem = true;
                            } else {
                                SegundaOrdem = false;
                            }
                            int code = ModeloLocal.getData(i, j, k);
                            Material mat = null;
                            for (int mm = 0; mm < Mat.length; mm++) {
                                if (Mat[mm].code() == code) {
                                    mat = Mat[mm];
                                }
                            }
                            double ep = mat.ep(FreqIndex);
                            double si = mat.si(FreqIndex);
                            double cc = mat.velocity(FreqIndex);
                            double c = (2 * ep - si * dt) / (2 * ep + si * dt);
                            double d = (dt / ep) / (1 + (si * dt) / (2 * ep));
                            double vE = 0;
                            initiateMurConstants(cc, dx, dy, dz, dt);

                            //Faz os maximos
                            if ((limiteSup(i, ModelX) && Right.getPort() == 0) || limiteSup(j, ModelY) || limiteSup(k, ModelZ)) {
                                //CCA




                                if (limiteSup(i, ModelX)) {
                                    if (isEy(x, y, z) || isEz(x, y, z)) {
                                        Mur1aOrdem(x, y, z, 0, (TamX - 1), Campos, CamposAnterior, CamposAntAnterior, cmaX, cmbX);
                                        if (SegundaOrdem) {
                                            Mur2aOrdem(x, y, z, 0, (TamX - 1), Campos, CamposAnterior, CamposAntAnterior, const2aOrdem, TamX, TamY, TamZ);
                                        }
                                    }
                                    continue;
                                }
                                if (limiteSup(j, ModelY)) {
                                    if (isEx(x, y, z) || isEz(x, y, z)) {
                                        Mur1aOrdem(x, y, z, 1, (TamY - 1), Campos, CamposAnterior, CamposAntAnterior, cmaY, cmbY);
                                        if (SegundaOrdem) {
                                            Mur2aOrdem(x, y, z, 1, (TamY - 1), Campos, CamposAnterior, CamposAntAnterior, const2aOrdem, TamX, TamY, TamZ);
                                        }
                                    }
                                    continue;
                                }
                                if (limiteSup(k, ModelZ)) {
                                    if (isEx(x, y, z) || isEy(x, y, z)) {
                                        Mur1aOrdem(x, y, z, 2, (TamZ - 1), Campos, CamposAnterior, CamposAntAnterior, cmaZ, cmbZ);
                                        if (SegundaOrdem) {
                                            Mur2aOrdem(x, y, z, 2, (TamZ - 1), Campos, CamposAnterior, CamposAntAnterior, const2aOrdem, TamX, TamY, TamZ);
                                        }
                                    }
                                    continue;
                                }

                                continue;
                            }

                            //Maximos se tiver vizinho:
                            if (limiteSup(i, ModelX)) {
                                //tem vizinho, IMPLEMENTAR FD-TD com as bordas
                                //Ex : Nunca tem Ex por causa da posicao no cubo
                                //Ey
                                if (isEy(i, j, k)) {
                                    vE = c * EH[0].data(i, j, k);
                                    vE += d * ((EH[0].data(i, j, k + 1) - EH[0].data(i, j, k - 1)) / dz);
                                    vE += d * (-(BorderRight[1][j][k] - EH[0].data(i - 1, j, k)) / dx);
                                    EH[0].data(i, j, k, vE);

                                }
                                //Ez
                                if (isEz(i, j, k)) {
                                    vE = c * EH[0].data(i, j, k);
                                    vE += d * ((BorderRight[1][j][k] - EH[0].data(i - 1, j, k)) / dx);
                                    vE += d * (-(EH[0].data(i, j + 1, k) - EH[0].data(i, j - 1, k)) / dy);
                                    EH[0].data(i, j, k, vE);
                                }
                                continue;
                            }


                            //Faz os minimos sem vizinho:
                            if ((limiteInf(i, 0) && Left.getPort() == 0) || limiteInf(j, 0) || limiteInf(k, 0)) {
                                //CCA
                                if (CCAtype == 'm') {
                                    if (limiteInf(i, 0) && Left.getPort() == 0) {
                                        if (isEy(x, y, z) || isEz(x, y, z)) {
                                            Mur1aOrdem(x, y, z, 0, 0, Campos, CamposAnterior, CamposAntAnterior, cmaX, cmbX);
                                            if (SegundaOrdem) {
                                                Mur2aOrdem(x, y, z, 0, 0, Campos, CamposAnterior, CamposAntAnterior, const2aOrdem, TamX, TamY, TamZ);

                                            }
                                            continue;
                                        }
                                    }
                                    if (limiteInf(j, 0)) {
                                        if (isEx(x, y, z) || isEz(x, y, z)) {
                                            Mur1aOrdem(x, y, z, 1, 0, Campos, CamposAnterior, CamposAntAnterior, cmaY, cmbY);
                                            if (SegundaOrdem) {
                                                Mur2aOrdem(x, y, z, 1, 0, Campos, CamposAnterior, CamposAntAnterior, const2aOrdem, TamX, TamY, TamZ);
                                            }
                                        }
                                        continue;
                                    }
                                    if (limiteInf(k, 0)) {
                                        if (isEx(x, y, z) || isEy(x, y, z)) {
                                            Mur1aOrdem(x, y, z, 2, 0, Campos, CamposAnterior, CamposAntAnterior, cmaZ, cmbZ);
                                            if (SegundaOrdem) {
                                                Mur2aOrdem(x, y, z, 2, 0, Campos, CamposAnterior, CamposAntAnterior, const2aOrdem, TamX, TamY, TamZ);
                                            }
                                        }
                                        continue;
                                    }
                                }
                                continue;
                            }

                            //IMPLEMENTAR FDTD com as bordas
                            //Ex: nunca tem por causa da posicao no cubo
                            //Ey:
                            if (limiteInf(i, 0)) {
                                if (isEy(i, j, k)) {
                                    /** SO COPIA A BORDA!!
                                     * vE  = c*EH[0].data(i,j,k);
                                     * vE += d*(  (EH[0].data(i,j,k+1) - EH[0].data(i,j,k-1) )/dz );
                                     * vE += d*(- (EH[0].data(i+1,j,k) - BorderLeft[j][k]    )/dx );
                                     **/
                                    vE = BorderLeft[2][j][k];
                                    EH[0].data(i, j, k, vE);
                                    continue;

                                }
                                //Ez:
                                if (isEz(i, j, k)) {
                                    /** SO COPIA A BORDA!!
                                     * vE  = c*EH[0].data(i,j,k);
                                     * vE += d*(  (EH[0].data(i+1,j,k) - BorderLeft[j][k]    )/dx );
                                     * vE += d*(- (EH[0].data(i,j+1,k) - EH[0].data(i,j-1,k) )/dy );
                                     **/
                                    vE = BorderLeft[2][j][k];
                                    EH[0].data(i, j, k, vE);
                                    continue;
                                }
                            }

                        }
                    }
                }

                for (int k = 0; k < ModelZ; k++) { //borda de X com Y
                    //PEGA OS VALORES DO PONTO

                    int i = 0;
                    int j = 0;
                    int x = i;
                    int y = j;
                    int z = k;
                    int TamX = ModelX;
                    int TamY = ModelY;
                    int TamZ = ModelZ;
                    Field Campos = EH[0];
                    Field CamposAnterior = EH[1];
                    Field CamposAntAnterior = EH[2];
                    boolean SegundaOrdem;
                    if (CCAorder == 2) {
                        SegundaOrdem = true;
                    } else {
                        SegundaOrdem = false;
                    }
                    int code = ModeloLocal.getData(i, j, k);
                    Material mat = null;
                    for (int mm = 0; mm < Mat.length; mm++) {
                        if (Mat[mm].code() == code) {
                            mat = Mat[mm];
                        }
                    }
                    double cc = mat.velocity(FreqIndex);

                    initiateMurConstants(cc, dx, dy, dz, dt);
                    if (!isE(i, j, k)) {
                        continue;
                    }
                    Mur1aOrdem(x, y, z, 0, 0, Campos, CamposAnterior, CamposAntAnterior, cmaX, cmbX);
                    if (SegundaOrdem) {
                        Mur2aOrdem(x, y, z, 0, 0, Campos, CamposAnterior, CamposAntAnterior, const2aOrdem, TamX, TamY, TamZ);

                    }
                }

                for (int j = 0; j < ModelY; j++) { //borda de X com Z
                    //PEGA OS VALORES DO PONTO

                    int i = 0;
                    int k = 0;
                    int x = i;
                    int y = j;
                    int z = k;
                    int TamX = ModelX;
                    int TamY = ModelY;
                    int TamZ = ModelZ;
                    Field Campos = EH[0];
                    Field CamposAnterior = EH[1];
                    Field CamposAntAnterior = EH[2];
                    boolean SegundaOrdem;
                    if (CCAorder == 2) {
                        SegundaOrdem = true;
                    } else {
                        SegundaOrdem = false;
                    }
                    int code = ModeloLocal.getData(i, j, k);
                    Material mat = null;
                    for (int mm = 0; mm < Mat.length; mm++) {
                        if (Mat[mm].code() == code) {
                            mat = Mat[mm];
                        }
                    }
                    double cc = mat.velocity(FreqIndex);

                    initiateMurConstants(cc, dx, dy, dz, dt);
                    if (!isE(i, j, k)) {
                        continue;
                    }
                    Mur1aOrdem(x, y, z, 2, 0, Campos, CamposAnterior, CamposAntAnterior, cmaZ, cmbZ);
                    if (SegundaOrdem) {
                        Mur2aOrdem(x, y, z, 2, 0, Campos, CamposAnterior, CamposAntAnterior, const2aOrdem, TamX, TamY, TamZ);
                    }
                }

                for (int i = 0; i < ModelX; i++) { //borda de Y com Z
                    //PEGA OS VALORES DO PONTO

                    int j = 0;
                    int k = 0;
                    int x = i;
                    int y = j;
                    int z = k;
                    int TamX = ModelX;
                    int TamY = ModelY;
                    int TamZ = ModelZ;
                    Field Campos = EH[0];
                    Field CamposAnterior = EH[1];
                    Field CamposAntAnterior = EH[2];
                    boolean SegundaOrdem;
                    if (CCAorder == 2) {
                        SegundaOrdem = true;
                    } else {
                        SegundaOrdem = false;
                    }
                    int code = ModeloLocal.getData(i, j, k);
                    Material mat = null;
                    for (int mm = 0; mm < Mat.length; mm++) {
                        if (Mat[mm].code() == code) {
                            mat = Mat[mm];
                        }
                    }
                    double cc = mat.velocity(FreqIndex);

                    initiateMurConstants(cc, dx, dy, dz, dt);
                    if (!isE(i, j, k)) {
                        continue;
                    }
                    Mur1aOrdem(x, y, z, 1, 0, Campos, CamposAnterior, CamposAntAnterior, cmaY, cmbY);
                    if (SegundaOrdem) {
                        Mur2aOrdem(x, y, z, 1, 0, Campos, CamposAnterior, CamposAntAnterior, const2aOrdem, TamX, TamY, TamZ);
                    }
                }

                // 5) Pos-FDTD para as Fontes onde tem metal:
                boolean foundSource = false;
                String axis = S[0].Axis;
                for (int f = 1; f < S.length; f++) {
                    if (!S[f].Axis.equalsIgnoreCase(axis)) {
                        throw new RuntimeException("Sources have different axis!!! Not impelemented!!!");
                    }
                }

                for (int i = 0; i < ModelX; i++) {
                    for (int j = 0; j < ModelY; j++) {
                        for (int k = 0; k < ModelZ; k++) {
                            if ((isEx(i, j, k) && axis.equalsIgnoreCase("x"))
                                    || (isEy(i, j, k) && axis.equalsIgnoreCase("y"))
                                    || (isEz(i, j, k) && axis.equalsIgnoreCase("z"))) {
                                int code = ModeloLocal.getData(i, j, k);
                                Material mat = null;
                                for (int mm = 0; mm < Mat.length; mm++) {
                                    if (Mat[mm].code() == code) {
                                        mat = Mat[mm];
                                    }
                                }
                                String name = mat.name().toLowerCase();
                                if (name.startsWith("source") || name.startsWith("copper")) {
                                    double valor = 0.0;
                                    EH[0].data(i, j, k, valor);
                                    foundSource = true;
                                    PvmUtil.log(myself, "Zerou E" + axis + " em " + i + "," + j + "," + k + " com material = " + name + ".");
                                    if (setFourPoints){
                                        if(isEx(i,j,k)){
                                            EH[0].data(i, j+2, k, valor);
                                            EH[0].data(i, j, k+2, valor);
                                            EH[0].data(i, j+2, k+2, valor);
                                        }
                                        if(isEy(i,j,k)){
                                            EH[0].data(i+2, j, k, valor);
                                            EH[0].data(i, j, k+2, valor);
                                            EH[0].data(i+2, j, k+2, valor);
                                        }
                                        if(isEz(i,j,k)){
                                            EH[0].data(i+2, j, k, valor);
                                            EH[0].data(i, j+2, k, valor);
                                            EH[0].data(i+2, j+2, k, valor);
                                        }
                                    }

                                }

                            }
                        }
                    }
                }
                if (!foundSource) {
                    PvmUtil.log(myself, "WARN: Didnt find any source material in the model!!!!!!!!");
                }

                /** TESTE PARA VALOR FIXO DE 1.7321 no EN
                boolean testa1 = false;
                if (testa1){
                for (int i = 0; i < ModelX; i++) {
                for (int j = 0; j < ModelY; j++) {
                for (int k = 0; k < ModelZ; k++) {
                double valor = 1.0;
                EH[0].data(i, j, k, valor);
                }
                }
                }
                }*/
                /** 6) Repassa as Matrizes
                 */
                Field.Refresh(0, ModelX, 0, ModelY, 0, ModelZ, EH);

                // ** teste com valor fixo:
                //EH[0].setAllData(myself.getPort()-parent.getPort()+n);

                // ENVIA AS RESPOSTAS PARA MASTER:
                // -------------------------------
                if (n % nSkip == 0) {
                    int tagResposta = 900;
                    mes = new String("Mandando parcial para master com tag =" + tagResposta + ".");
                    PvmUtil.sendMessageToParent(jpvm, parent, mes, (902));
                    // envia:
                    PvmUtil.sendPartialField(jpvm, parent, EH[0], tagResposta);
                    mes = new String("Mandou parcial para master com tag =" + tagResposta + ".");
                    PvmUtil.sendMessageToParent(jpvm, parent, mes, (904));
                }
            }


            // Exit from the parallel virtual machine
            jpvm.pvm_exit();
        } catch (Throwable jpe) {
            try {
                String logfile = ("ERROR:" + host + ":" + port + ".log");
                FileOutputStream out = new FileOutputStream(logfile);
                PrintStream print = new PrintStream(out);
                jpe.printStackTrace(print);
                /**
                 * String texto = new String("Error!!! -  exception"+jpe.toString());
                 * jpvmBuffer buf = new jpvmBuffer();
                 * buf.pack(texto);
                 * jpvm.pvm_send(buf, parent, tagAtual);
                 */
            } catch (Throwable e) {
                e.printStackTrace();
            }
            throw new RuntimeException(jpe);
        }

    }

    public static boolean isHx(int i, int j, int k) {
        if (par(i) & impar(j) & impar(k)) {
            return true;
        } else {
            return false;
        }
    }

    public static boolean isHy(int i, int j, int k) {
        if (impar(i) & par(j) & impar(k)) {
            return true;
        } else {
            return false;
        }
    }

    public static boolean isHz(int i, int j, int k) {
        if (impar(i) & impar(j) & par(k)) {
            return true;
        } else {
            return false;
        }
    }

    public static boolean isH(int i, int j, int k) {
        int teste = 0;
        if (impar(i)) {
            teste++;
        }
        if (impar(j)) {
            teste++;
        }
        if (impar(k)) {
            teste++;
        }
        if (teste == 2) {
            return true;
        }
        return false;

        // if (isHx(i,j,k) | isHy(i,j,k) | isHz(i,j,k)) return true;
        // else return false;
    }

    public static boolean isEx(int i, int j, int k) {
        if (impar(i) & par(j) & par(k)) {
            return true;
        } else {
            return false;
        }
    }

    public static boolean isEy(int i, int j, int k) {
        if (par(i) & impar(j) & par(k)) {
            return true;
        } else {
            return false;
        }
    }

    public static boolean isEz(int i, int j, int k) {
        if (par(i) & par(j) & impar(k)) {
            return true;
        } else {
            return false;
        }
    }

    public static boolean isE(int i, int j, int k) {
        int teste = 0;
        if (impar(i)) {
            teste++;
        }
        if (impar(j)) {
            teste++;
        }
        if (impar(k)) {
            teste++;
        }
        if (teste == 1) {
            return true;
        }
        return false;


        //if (isEx(i,j,k) | isEy(i,j,k) | isEz(i,j,k)) return true;
        //else return false;
    }

    public static boolean par(int i) {
        if ((i % 2) == 0) {
            return true;
        } else {
            return false;
        }
    }

    public static boolean impar(int i) {
        if ((i % 2) == 0) {
            return false;
        } else {
            return true;
        }
    }

    public static boolean limiteInf(int i, int limI) {
        if (i == limI) {
            return true;
        } else {
            return false;
        }
    }

    public static boolean limiteSup(int i, int limS) {
        if (i == limS - 1) {
            return true;
        } else {
            return false;
        }
    }

    static public void Mur1aOrdem(int x, int y, int z, int coordenada, int valor, Field Campos, Field CamposAnterior, Field CamposAntAnterior, double cA, double cB) {
        int pulo = 2;
        int puloX = 0;
        int puloY = 0;
        int puloZ = 0;

        if (coordenada == 0) {//x

            if (valor == 0) {
                puloX = pulo;
            } else {
                puloX = -pulo;
            }
        }
        if (coordenada == 1) {//y

            if (valor == 0) {
                puloY = pulo;
            } else {
                puloY = -pulo;
            }
        }
        if (coordenada == 2) {//z

            if (valor == 0) {
                puloZ = pulo;
            } else {
                puloZ = -pulo;
            }
        }

        double value = -CamposAntAnterior.data(x + puloX, y + puloY, z + puloZ) + cA * (Campos.data(x + puloX, y + puloY, z + puloZ) + CamposAntAnterior.data(x, y, z)) + cB * (CamposAnterior.data(x, y, z) + CamposAnterior.data(x + puloX, y + puloY, z + puloZ));
        Campos.data(x, y, z, value);
    }

    static public void Mur2aOrdem(int x, int y, int z, int coordenada, int valor, Field Campos, Field CamposAnterior, Field CamposAntAnterior, double[] const2aOrdem, int TamX, int TamY, int TamZ) {
        /* ESTA COM ERRO NOS FIELD QUE TEM Q FICAR IGUAL AO 1a ORDEM, mudando Campos[i][j][k] por Campos.data(i,j,k)
        int pulo = 2;
        int puloX=0; int puloY=0; int puloZ=0;
        
        double constXY = 0; double constYX = 0; double constZX = 0;
        double constXZ = 0; double constYZ = 0; double constZY = 0;
        
        if (coordenada==0){//x
        if (valor==0)
        if (isEy(x,y,z)){
        if (y!=1 & y!=TamY-2){
        puloX = pulo;
        puloY = pulo;
        constXY = const2aOrdem[0]; //cmcX
        }
        if (z!=0 & z!=TamZ-1){
        puloX = pulo;
        puloZ = pulo;
        constXZ = const2aOrdem[1]; //cmdX
        }
        } else if (isEz(x,y,z)){
        if(y!=0 & y!=TamY-1){
        puloX = pulo;
        puloY = pulo;
        constXY = const2aOrdem[0]; //cmcX
        }
        if(z!=1 & z!=TamZ-2){
        puloX = pulo;
        puloZ = pulo;
        constXZ = const2aOrdem[1]; //cmdX
        }
        }
        
        else
        if (isEy(x,y,z)){
        if (y!=1 & y!=TamY-2){
        puloX = -pulo;
        puloY = pulo;
        constXY = -const2aOrdem[0]; //cmcX
        }
        if (z!=0 & z!=TamZ-1){
        puloX = -pulo;
        puloZ = pulo;
        constXZ = -const2aOrdem[1]; //cmdX
        }
        } else if (isEz(x,y,z)){
        if(y!=0 & y!=TamY-1){
        puloX = -pulo;
        puloY = pulo;
        constXY = -const2aOrdem[0]; //cmcX
        }
        if(z!=1 & z!=TamZ-2){
        puloX = -pulo;
        puloZ = pulo;
        constXZ = -const2aOrdem[1]; //cmdX
        }
        }
        
        //Para X:
        Campos[x][y][z] += constXY*(CamposAnterior[x][y+puloY][z] - 2*CamposAnterior[x][y][z] + CamposAnterior[x][y-puloY][z] + CamposAnterior[x+puloX][y+puloY][z] - 2*CamposAnterior[x+puloX][y][z] + CamposAnterior[x+puloX][y-puloY][z]);
        
        Campos[x][y][z] += constXZ*(CamposAnterior[x][y][z+puloZ] - 2*CamposAnterior[x][y][z] + CamposAnterior[x][y][z-puloZ] + CamposAnterior[x+puloX][y][z+puloZ] - 2*CamposAnterior[x+puloX][y][z] + CamposAnterior[x+puloX][y][z-puloZ]);
        
        }
        
        if (coordenada==1){//y
        if (valor==0)
        if (isEx(x,y,z)){
        if (x!=1 & x!=TamX-2){
        puloY = pulo;
        puloX = pulo;
        constYX = const2aOrdem[2]; //cmcY
        }
        if (z!=0 & z!=TamZ-1){
        puloY = pulo;
        puloZ = pulo;
        constYZ = const2aOrdem[3]; //cmdY
        }
        } else if (isEz(x,y,z)){
        if(x!=0 & x!=TamX-1){
        puloY = pulo;
        puloX = pulo;
        constYX = const2aOrdem[2]; //cmcY
        }
        if(z!=1 & z!=TamZ-2){
        puloY = pulo;
        puloZ = pulo;
        constYZ = const2aOrdem[3]; //cmdZ
        }
        }
        
        else
        if (isEx(x,y,z)){
        if (x!=1 & x!=TamX-2){
        puloY = -pulo;
        puloX = pulo;
        constYX = -const2aOrdem[2]; //cmcY
        }
        if (z!=0 & z!=TamZ-1){
        puloY = -pulo;
        puloZ = pulo;
        constYZ = -const2aOrdem[3]; //cmdY
        }
        } else if (isEz(x,y,z)){
        if(x!=0 & x!=TamX-1){
        puloY = -pulo;
        puloX = pulo;
        constYX = -const2aOrdem[2]; //cmcY
        }
        if(z!=1 & z!=TamZ-2){
        puloY = -pulo;
        puloZ = pulo;
        constYZ = -const2aOrdem[3]; //cmdY
        }
        }
        //Para Y:
        Campos[x][y][z] += constYX*(CamposAnterior[x+puloX][y][z] - 2*CamposAnterior[x][y][z] + CamposAnterior[x-puloX][y][z] + CamposAnterior[x+puloX][y+puloY][z] - 2*CamposAnterior[x][y+puloY][z] + CamposAnterior[x-puloX][y+puloY][z]);
        
        Campos[x][y][z] += constYZ*(CamposAnterior[x][y][z+puloZ] - 2*CamposAnterior[x][y][z] + CamposAnterior[x][y][z-puloZ] + CamposAnterior[x][y+puloY][z+puloZ] - 2*CamposAnterior[x][y+puloY][z] + CamposAnterior[x][y+puloY][z-puloZ]);
        
        }
        
        if (coordenada==2){//z
        if (valor==0)
        if (isEx(x,y,z)){
        if (x!=1 & x!=TamX-2){
        puloZ = pulo;
        puloX = pulo;
        constZX = const2aOrdem[4]; //cmcZ
        }
        if (y!=0 & y!=TamY-1){
        puloZ = pulo;
        puloY = pulo;
        constZY = const2aOrdem[5]; //cmdZ
        }
        } else if (isEy(x,y,z)){
        if(x!=0 & x!=TamX-1){
        puloZ = pulo;
        puloX = pulo;
        constZX = const2aOrdem[4]; //cmcZ
        }
        if(y!=1 & y!=TamY-2){
        puloZ = pulo;
        puloY = pulo;
        constZY = const2aOrdem[5]; //cmdZ
        }
        }
        
        else
        if (isEx(x,y,z)){
        if (x!=1 & x!=TamX-2){
        puloZ = -pulo;
        puloX = pulo;
        constZX = -const2aOrdem[4]; //cmcZ
        }
        if (y!=0 & y!=TamY-1){
        puloZ = -pulo;
        puloY = pulo;
        constZY = -const2aOrdem[5]; //cmdZ
        }
        } else if (isEy(x,y,z)){
        if(x!=0 & x!=TamX-1){
        puloZ = -pulo;
        puloX = pulo;
        constZX = -const2aOrdem[4]; //cmcZ
        }
        if(y!=1 & y!=TamY-2){
        puloZ = -pulo;
        puloY = pulo;
        constZY = -const2aOrdem[5]; //cmdZ
        }
        }
        //Para Z:
        Campos[x][y][z] += constZX*(CamposAnterior[x+puloX][y][z] - 2*CamposAnterior[x][y][z] + CamposAnterior[x-puloX][y][z] + CamposAnterior[x+puloX][y][z+puloZ] - 2*CamposAnterior[x][y][z+puloZ] + CamposAnterior[x-puloX][y][z+puloZ]);
        
        Campos[x][y][z] += constZY*(CamposAnterior[x][y+puloY][z] - 2*CamposAnterior[x][y][z] + CamposAnterior[x][y-puloY][z] + CamposAnterior[x][y+puloY][z+puloZ] - 2*CamposAnterior[x][y][z+puloZ] + CamposAnterior[x][y-puloY][z+puloZ]);
        
        }*/
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

    public static void initiateMurConstants(double cc, double dx, double dy, double dz, double dt) {
        cmaX = (cc * dt - dx) / (cc * dt + dx);
        cmbX = (2 * dx) / (cc * dt + dx);
        cmcX = ((cc * dt) * (cc * dt) * dx) / (2 * dy * dy * (cc * dt + dx));
        cmdX = ((cc * dt) * (cc * dt) * dx) / (2 * dz * dz * (cc * dt + dx));
        cmaY = (cc * dt - dy) / (cc * dt + dy);
        cmbY = (2 * dy) / (cc * dt + dy);
        cmcY = ((cc * dt) * (cc * dt) * dy) / (2 * dx * dx * (cc * dt + dy));
        cmdY = ((cc * dt) * (cc * dt) * dy) / (2 * dz * dz * (cc * dt + dy));
        cmaZ = (cc * dt - dz) / (cc * dt + dz);
        cmbZ = (2 * dz) / (cc * dt + dz);
        cmcZ = ((cc * dt) * (cc * dt) * dz) / (2 * dx * dx * (cc * dt + dz));
        cmdZ = ((cc * dt) * (cc * dt) * dz) / (2 * dy * dy * (cc * dt + dz));
        const2aOrdem = new double[6];
        const2aOrdem[0] = cmcX;
        const2aOrdem[1] = cmdX;
        const2aOrdem[2] = cmcY;
        const2aOrdem[3] = cmdY;
        const2aOrdem[4] = cmcZ;
        const2aOrdem[5] = cmdZ;

    }
    /** FORA DE USO 
    public void FDTDParallelProcessLocal(Field[] C, Source[] S, Model M, int NMat, Material[] Mat, int FreqIndex, double f, double dt, int TX, int TY, int TZ, int TXi, int TXf, int TYi, int TYf, int TZi, int TZf, int n){
    //
    // SEQUENCIA DO FD-TD:
    // 1) Pre-FDTD para as Fontes
    // 2) Faz o E, incluindo os limites maximos (i==TX-1)
    // 3) Faz os limites minimos (i==0)
    // 4) Faz o H (que nao tem CC por causa da posicao no cubo)
    // 5) Pos-FDTD para as Fontes
    // 6) Repassa as Matrizes
    // 7) Grava os resultados parciais
    
    
    //
    // 1) Pre-FDTD para as Fontes:
    //
    //Nao implementado
    
    //
    // 2) Calculando para E e limites maximos:
    double dx = M.dx();
    double dy = M.dy();
    double dz = M.dz();
    for (int i = TXi ; i< TXf; i++){
    for (int j = TYi; j< TYf; j++){
    for (int k=TZi; k< TZf; k++){
    //System.out.println(" ** x="+i+"  y="+j+"  z="+k);
    if (isH(i,j,k)) continue; //calculando E
    if (!isE(i,j,k)) continue; //vazios
    
    int code = M.getData(i,j,k);
    Material mat = new Material();
    for (int mm=0; mm<NMat; mm++){
    if (Mat[mm].code() == code)
    mat = Mat[mm];
    }
    double ep = mat.ep(FreqIndex);
    double si = mat.si(FreqIndex);
    double cc = mat.velocity(FreqIndex);
    double c=(2*ep-si*dt)/(2*ep+si*dt);
    double d=(dt/ep)/(1+(si*dt)/(2*ep));
    double vE=0;
    
    //
    // Mur's Absorbing Condition
    //
    if (limiteInf(i,0) || limiteInf(j,0) || limiteInf(k,0)){
    // PASSO (2) A SEGUIR
    continue;
    }
    if (limiteSup(i,TX) || limiteSup(j,TY) || limiteSup(k,TZ)){
    if (limiteSup(i,TX)){
    vE = mur1stOrder(C, i, j, k, cc, -2, 0, 0, dx, dy, dz, dt);
    C[0].data(i,j,k,vE);
    }
    if (limiteSup(j,TY)){
    vE = mur1stOrder(C, i, j, k, cc, 0, -2, 0, dx, dy, dz, dt);
    C[0].data(i,j,k,vE);
    }
    if (limiteSup(k,TZ)){
    vE = mur1stOrder(C, i, j, k, cc, 0, 0, -2, dx, dy, dz, dt);
    C[0].data(i,j,k,vE);
    }
    continue;
    }
    
    //
    // FD-TD
    //
    
    if (isEx(i,j,k)){
    vE  = c*C[0].data(i,j,k);
    vE += d*(  (C[0].data(i,j+1,k) - C[0].data(i,j-1,k) )/dy );
    vE += d*(- (C[0].data(i,j,k+1) - C[0].data(i,j,k-1) )/dz );
    C[0].data(i,j,k,vE);
    
    }
    if (isEy(i,j,k)){
    vE  = c*C[0].data(i,j,k);
    vE += d*(  (C[0].data(i,j,k+1) - C[0].data(i,j,k-1) )/dz );
    vE += d*(- (C[0].data(i+1,j,k) - C[0].data(i+1,j,k) )/dx );
    C[0].data(i,j,k,vE);
    
    }
    if (isEz(i,j,k)){
    vE  = c*C[0].data(i,j,k);
    vE += d*(  (C[0].data(i+1,j,k) - C[0].data(i-1,j,k) )/dx );
    vE += d*(- (C[0].data(i,j+1,k) - C[0].data(i,j-1,k) )/dy );
    C[0].data(i,j,k,vE);
    
    }
    
    //
    // Source
    //
    for (int s=0; s<S.length; s++){
    int[] location = new int[3];
    location[0] = i;location[1] = j;location[2] = k;
    if (S[s].isSource(location)){
    double valorSource = S[s].calculateSource(n,f,dt);
    if (S[s].isHard())
    vE = valorSource;
    else
    vE += valorSource;
    C[0].data(i,j,k,vE);
    //System.out.println("** CalculateEHFrame::CalculateEH()::Fonte em E : ("+i+","+j+","+k+")");
    //C[0].print(i,j,k);
    }
    }
    
    //if (C[0].data(i,j,k)>1)  System.out.println("** CalculateEHFrame::CalculateEH()::Field = "+C[0].data(i,j,k)+" em ("+i+","+j+","+k+")!!");
    
    }
    }
    }
    
    
    //
    // 3) Calculando os limites minimos:
    //
    for (int i = TXi ; i< TXf; i++){
    for (int j = TYi; j< TYf; j++){
    for (int k=TZi; k< TZf; k++){
    if (isH(i,j,k))  continue; //so tem cc no E
    if (!isE(i,j,k))  continue; //vazios
    if (!limiteInf(i,0) && !limiteInf(j,0) && !limiteInf(k,0))
    continue; //significa que nao esta em x=0, y=0 ou z=0
    if (limiteSup(i,TX) || limiteSup(j,TY) || limiteSup(k,TZ))
    continue; //ja foi feito
    //
    // Mur's Absorbing Condition
    //
    Material mat = Mat[M.getData(i,j,k)];
    double cc = mat.velocity(FreqIndex);
    double vE=0;
    if (limiteInf(i,0)){
    vE = mur1stOrder(C, i, j, k, cc, 2, 0, 0, dx, dy, dz, dt);
    C[0].data(i,j,k,vE);
    }
    if (limiteInf(j,0)){
    vE = mur1stOrder(C, i, j, k, cc, 0, 2, 0, dx, dy, dz, dt);
    C[0].data(i,j,k,vE);
    }
    if (limiteInf(k,0)){
    vE = mur1stOrder(C, i, j, k, cc, 0, 0, 2, dx, dy, dz, dt);
    C[0].data(i,j,k,vE);
    }
    
    }
    }
    }
    
    //
    // 4) Calculando para H:
    //
    for (int i = TXi ; i< TXf; i++){
    for (int j = TYi; j< TYf; j++){
    for (int k=TZi; k< TZf; k++){
    if (isE(i,j,k)) continue; //calculando H
    if (!isH(i,j,k)) continue; //vazios
    Material mat = Mat[M.getData(i,j,k)];
    double mu = mat.mu(FreqIndex);
    double siC = mat.siC(FreqIndex);
    double a=(2*-siC*dt)/(2*mu+siC*dt);
    double b=(dt/mu)/(1+(siC*dt)/(2*mu));
    double vH=0;
    
    //
    // Mur's Absorbing Condition
    //
    //nao ha cc para campos magneticos
    
    
    //
    // Calculo normal do FD-TD
    //
    if (isHx(i,j,k)){
    vH  = a*C[0].data(i,j,k);
    vH += b*(  (C[0].data(i,j,k+1) - C[0].data(i,j,k-1) )/dz );
    vH += b*(- (C[0].data(i,j+1,k) - C[0].data(i,j-1,k) )/dy );
    C[0].data(i,j,k,vH);
    }
    if (isHy(i,j,k)){
    vH  = a*C[0].data(i,j,k);
    vH += b*(  (C[0].data(i+1,j,k) - C[0].data(i+1,j,k) )/dx );
    vH += b*(- (C[0].data(i,j,k+1) - C[0].data(i,j,k-1) )/dz );
    C[0].data(i,j,k,vH);
    }
    if (isHz(i,j,k)){
    vH  = a*C[0].data(i,j,k);
    vH += b*(  (C[0].data(i,j+1,k) - C[0].data(i,j-1,k) )/dy );
    vH += b*(- (C[0].data(i+1,j,k) - C[0].data(i-1,j,k) )/dx );
    C[0].data(i,j,k,vH);
    }
    
    //
    // Source
    //
    for (int s=0; s<S.length; s++){
    int[] location = new int[3];
    location[0] = i;location[1] = j;location[2] = k;
    if (S[s].isSource(location)){
    double valorSource = S[s].calculateSource(n,f,dt);
    if (S[s].isHard())
    vH = valorSource;
    else
    vH += valorSource;
    C[0].data(i,j,k,vH);
    //System.out.println("** CalculateEHFrame::CalculateEH()::Fonte em H : ("+i+","+j+","+k+")");
    //C[0].print(i,j,k);
    }
    }
    }
    }
    }
    
    //
    // 5) Pos-FDTD para metal:
    //
    for (int i = TXi ; i< TXf; i++){
    for (int j = TYi; j< TYf; j++){
    for (int k=TZi; k< TZf; k++){
    Material mat = Mat[M.getData(i,j,k)];
    if (mat.name(0).compareToIgnoreCase("coper")!=0)
    continue;
    double valor = 0;
    C[0].data(i,j,k,valor);
    }
    }
    }
    
    //
    // 6) Repassa as Matrizes:
    //
    Field.Refresh(TXi, TXf, TYi, TYf, TZi, TZf,C);
    
    //
    // 7) Grava os resultados parciais:
    //
    // if (n%skip==0){
    // C[0].SavePartial(TXi, TXf, TYi, TYf, TZi, TZf, PATH,SimulName,n,this);
    // }
    //
    }
     **/
}
