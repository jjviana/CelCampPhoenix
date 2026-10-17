/*
 * CalculateEHFrameParallel.java
 *
 * Created on 7 de Março de 2006, 14:57
 */

/**
 *
 * @author  Ana de Oliveira Rodrigues
 * @version 0.8 - 07/03/2006
 */
import java.lang.Math.*;
import java.io.*;
import javax.swing.*;
import java.text.*;
import jpvm.*;
import java.util.Date;

public class CalculateEHFrameParallel extends javax.swing.JFrame {

    boolean errorJPVM = false;
    int gridSizeX = 0;
    int gridSizeY = 0;
    int gridSizeZ = 0;
    double dx = 0, dy = 0, dz = 0;
    String SimulName = new String("Default");
    int Nmax = 0;
    int Nmin = 0;
    int reduzN = 0;
    //int NmaxT = 0;
    double dt = 0.0d;
    //double dtT = 0.0d;
    double f = 0.0d;
    double[] Freq = null;
    Source[] S = null;
    Model M = null;
    Material[] Mat = null;
    int NMat = 0;
    char CCAtype = 'm';
    int CCAorder = 1;
    String PATH = "";
    /**
     * Paralelizacao
     */
    static int NPROC = 1; //3

    //int num_data;
    /** Define a frequencia a ser usada. Comeca invalido.
     **/
    int FIndex;
    javax.swing.JRadioButton[] fbuttons = null;
    int skip = 1;
    Thread tcalc = null;
    boolean stopThread = false;
    boolean EHCalculated = false;

    /** Creates new form CalculateEHFrameParallel */
    public CalculateEHFrameParallel() {
        initComponents();
    }

    public CalculateEHFrameParallel(int GridSizeX, int GridSizeY, int GridSizeZ, String SName, Source[] s, Model m, Material[] mat, int Nmat, String path, double dT, int N, int ReduzN) {
        gridSizeX = GridSizeX;
        gridSizeY = GridSizeY;
        gridSizeZ = GridSizeZ;
        SimulName = SName;
        PATH = path;
        initComponents();

        setSource(s);
        setModel(m, Nmat);
        setMaterials(mat);
        setJPVM();
        dt = dT;
        DTField.setText("" + dt);
        Nmax = N;
        NField.setText("" + N);
        reduzN = ReduzN;
        SkipText.setText("" + reduzN);
    }

    public void setF(double[] freq) {
        Freq = freq;
        //System.out.println("** CalculateEHFrame::setF::Freq.length = "+Freq.length);
        fbuttons = new javax.swing.JRadioButton[Freq.length];
        for (int i = 0; i < Freq.length; i++) {
            fbuttons[i] = new javax.swing.JRadioButton();
            fbuttons[i].setText(" " + Freq[i] + "Hz");
            FreqButtonGroup.add(fbuttons[i]);
            FreqPanel.add(fbuttons[i]);
            if (i == Freq.length - 1) {
                f = Freq[i];
                fbuttons[i].setSelected(true);
            } else {
                fbuttons[i].setSelected(false);
            }
        }
        pack();

    }

    public void setSource(Source[] s) {
        S = s;
    }

    public void setModel(Model m, int nm) {
        M = m;
        NMat = nm;
        dx = m.dx();
        dy = m.dy();
        dz = m.dz();
        double c = 3e8;
        double InvertDeltas = 1 / (dx * dx) + 1 / (dy * dy) + 1 / (dz * dz);
        double MinDT = 1 / (2 * c * Math.sqrt(InvertDeltas));
        DecimalFormat DF = new DecimalFormat("0.000E00");
        DecimalFormatSymbols FS = DF.getDecimalFormatSymbols();
        char dsep = '.';
        FS.setDecimalSeparator(dsep);
        DF.setDecimalFormatSymbols(FS);
        String DeltaTstring = DTField.getText();
        dt = Double.valueOf(DeltaTstring).doubleValue();
        if (dt > MinDT) {
            DTField.setText("" + DF.format(MinDT));
            dt = MinDT;
            System.out.println("** CalculateEHFrameParallel::setModel():: Dt alterado para " + dt);
        }

    }

    public void setMaterials(Material[] mat) {
        Mat = mat;
    }

    public void setJPVM() {
        /** PARALELIZACAO **/
        int SIZEX = M.x();
        int SIZEY = M.y();
        int SIZEZ = M.z();
        int SIZE = SIZEX; //so paraleliza em 1D, no eixo X

    //System.out.println("*** CalculateEHFrame::setJPVM()::Paralelizando no eixo X em " + NPROC + " diferentes processos!!");
    //num_data = SIZE / NPROC;

    }

    public void setMaxMin(int min, int max) {
        minimo.setText("" + min);
        pBar.setMinimum(min);
        maximo.setText("" + max);
        pBar.setMaximum(max);
        this.Nmin = min;
        this.Nmax = max;
    }

    public void setBar(int i) {
        pBar.setValue(i);
    }

    public int barValue() {
        return pBar.getValue();
    }

    public void TestDT() {
        String DeltaTstring = DTField.getText();
        dt = Double.valueOf(DeltaTstring).doubleValue();
        double c = 3e8;
        double InvertDeltas = 1 / (dx * dx) + 1 / (dy * dy) + 1 / (dz * dz);
        double MinDT = 1 / (c * Math.sqrt(InvertDeltas));
        if (dt > MinDT) {
            dt = MinDT;
            JOptionPane.showMessageDialog(this, "Delta T menor do que o minimo! Alterado para " + dt + "s !", "ERRO NO Delta T", JOptionPane.ERROR_MESSAGE);
            System.out.println("Delta T menor do que o minimo! Alterado para " + dt + "s !");

        } else {
            System.out.println("** CalculateEHFramePrallel::TestDT():: Delta T = " + dt);
        }
    }

    /** This method is called from within the constructor to
     * initialize the form.
     * WARNING: Do NOT modify this code. The content of this method is
     * always regenerated by the Form Editor.
     */
    // <editor-fold defaultstate="collapsed" desc="Generated Code">//GEN-BEGIN:initComponents
    private void initComponents() {
        java.awt.GridBagConstraints gridBagConstraints;

        FreqButtonGroup = new javax.swing.ButtonGroup();
        CCAButtonGroup = new javax.swing.ButtonGroup();
        pBar = new javax.swing.JProgressBar();
        DataPanel = new javax.swing.JPanel();
        jLabel1 = new javax.swing.JLabel();
        jPanel1 = new javax.swing.JPanel();
        jLabel5 = new javax.swing.JLabel();
        NField = new javax.swing.JTextField();
        jLabel3 = new javax.swing.JLabel();
        DTField = new javax.swing.JTextField();
        jLabel4 = new javax.swing.JLabel();
        FreqPanel = new javax.swing.JPanel();
        jLabel2 = new javax.swing.JLabel();
        SavePanel = new javax.swing.JPanel();
        jLabel6 = new javax.swing.JLabel();
        SkipText = new javax.swing.JTextField();
        jLabel7 = new javax.swing.JLabel();
        jLabel9 = new javax.swing.JLabel();
        NProcSpinner = new javax.swing.JSpinner();
        jPanel3 = new javax.swing.JPanel();
        jLabel8 = new javax.swing.JLabel();
        Mur1RadioButton = new javax.swing.JRadioButton();
        Mur2RadioButton = new javax.swing.JRadioButton();
        PMLRadioButton = new javax.swing.JRadioButton();
        ProgressPanel = new javax.swing.JPanel();
        minimo = new javax.swing.JLabel();
        maximo = new javax.swing.JLabel();
        jPanel2 = new javax.swing.JPanel();
        StartButton = new javax.swing.JButton();
        CancelButton = new javax.swing.JButton();

        pBar.addMouseMotionListener(new java.awt.event.MouseMotionAdapter() {
            public void mouseMoved(java.awt.event.MouseEvent evt) {
                pBarMouseMoved(evt);
            }
        });

        setDefaultCloseOperation(javax.swing.WindowConstants.EXIT_ON_CLOSE);
        getContentPane().setLayout(new java.awt.GridBagLayout());

        DataPanel.setLayout(new java.awt.GridBagLayout());

        jLabel1.setFont(new java.awt.Font("Dialog", 1, 18));
        jLabel1.setText("EH Simulation Parameters (Parallel):");
        gridBagConstraints = new java.awt.GridBagConstraints();
        gridBagConstraints.gridwidth = java.awt.GridBagConstraints.REMAINDER;
        DataPanel.add(jLabel1, gridBagConstraints);

        jPanel1.setLayout(new java.awt.GridBagLayout());

        jLabel5.setText("N = ");
        jPanel1.add(jLabel5, new java.awt.GridBagConstraints());

        NField.setText("0");
        NField.setPreferredSize(new java.awt.Dimension(70, 19));
        NField.addActionListener(new java.awt.event.ActionListener() {
            public void actionPerformed(java.awt.event.ActionEvent evt) {
                NFieldActionPerformed(evt);
            }
        });
        gridBagConstraints = new java.awt.GridBagConstraints();
        gridBagConstraints.insets = new java.awt.Insets(0, 0, 0, 10);
        jPanel1.add(NField, gridBagConstraints);

        jLabel3.setText("DeltaT = ");
        jPanel1.add(jLabel3, new java.awt.GridBagConstraints());

        DTField.setText("0");
        DTField.setPreferredSize(new java.awt.Dimension(100, 19));
        DTField.addActionListener(new java.awt.event.ActionListener() {
            public void actionPerformed(java.awt.event.ActionEvent evt) {
                DTFieldActionPerformed(evt);
            }
        });
        jPanel1.add(DTField, new java.awt.GridBagConstraints());

        jLabel4.setText("s");
        gridBagConstraints = new java.awt.GridBagConstraints();
        gridBagConstraints.gridwidth = java.awt.GridBagConstraints.REMAINDER;
        jPanel1.add(jLabel4, gridBagConstraints);

        gridBagConstraints = new java.awt.GridBagConstraints();
        gridBagConstraints.gridwidth = java.awt.GridBagConstraints.REMAINDER;
        DataPanel.add(jPanel1, gridBagConstraints);

        FreqPanel.setLayout(new java.awt.GridBagLayout());

        jLabel2.setText("Frequency :  ");
        FreqPanel.add(jLabel2, new java.awt.GridBagConstraints());

        gridBagConstraints = new java.awt.GridBagConstraints();
        gridBagConstraints.gridwidth = java.awt.GridBagConstraints.REMAINDER;
        DataPanel.add(FreqPanel, gridBagConstraints);

        SavePanel.setLayout(new java.awt.GridBagLayout());

        jLabel6.setText("Save each ");
        SavePanel.add(jLabel6, new java.awt.GridBagConstraints());

        SkipText.setText("0");
        SkipText.setPreferredSize(new java.awt.Dimension(50, 19));
        SavePanel.add(SkipText, new java.awt.GridBagConstraints());

        jLabel7.setText(" timesteps");
        gridBagConstraints = new java.awt.GridBagConstraints();
        gridBagConstraints.gridwidth = java.awt.GridBagConstraints.REMAINDER;
        SavePanel.add(jLabel7, gridBagConstraints);

        jLabel9.setText("NPROC =");
        SavePanel.add(jLabel9, new java.awt.GridBagConstraints());

        NProcSpinner.setEnabled(false);
        NProcSpinner.setMinimumSize(new java.awt.Dimension(40, 20));
        NProcSpinner.setPreferredSize(new java.awt.Dimension(50, 20));
        NProcSpinner.setValue(1);
        SavePanel.add(NProcSpinner, new java.awt.GridBagConstraints());

        gridBagConstraints = new java.awt.GridBagConstraints();
        gridBagConstraints.gridwidth = java.awt.GridBagConstraints.REMAINDER;
        DataPanel.add(SavePanel, gridBagConstraints);

        jPanel3.setLayout(new java.awt.GridBagLayout());

        jLabel8.setText("CCA: ");
        jPanel3.add(jLabel8, new java.awt.GridBagConstraints());

        CCAButtonGroup.add(Mur1RadioButton);
        Mur1RadioButton.setSelected(true);
        Mur1RadioButton.setText("Mur 1st Order");
        jPanel3.add(Mur1RadioButton, new java.awt.GridBagConstraints());

        CCAButtonGroup.add(Mur2RadioButton);
        Mur2RadioButton.setText("Mur 2nd Order");
        Mur2RadioButton.setEnabled(false);
        jPanel3.add(Mur2RadioButton, new java.awt.GridBagConstraints());

        CCAButtonGroup.add(PMLRadioButton);
        PMLRadioButton.setText("PML");
        PMLRadioButton.setEnabled(false);
        PMLRadioButton.addActionListener(new java.awt.event.ActionListener() {
            public void actionPerformed(java.awt.event.ActionEvent evt) {
                PMLRadioButtonActionPerformed(evt);
            }
        });
        jPanel3.add(PMLRadioButton, new java.awt.GridBagConstraints());

        gridBagConstraints = new java.awt.GridBagConstraints();
        gridBagConstraints.gridwidth = java.awt.GridBagConstraints.REMAINDER;
        gridBagConstraints.insets = new java.awt.Insets(10, 0, 10, 0);
        DataPanel.add(jPanel3, gridBagConstraints);

        ProgressPanel.setLayout(new java.awt.GridBagLayout());

        minimo.setText("1");
        gridBagConstraints = new java.awt.GridBagConstraints();
        gridBagConstraints.insets = new java.awt.Insets(0, 10, 0, 10);
        ProgressPanel.add(minimo, gridBagConstraints);

        maximo.setText("<  >");
        gridBagConstraints = new java.awt.GridBagConstraints();
        gridBagConstraints.insets = new java.awt.Insets(0, 10, 0, 10);
        ProgressPanel.add(maximo, gridBagConstraints);

        StartButton.setText("Start");
        StartButton.addActionListener(new java.awt.event.ActionListener() {
            public void actionPerformed(java.awt.event.ActionEvent evt) {
                StartButtonActionPerformed(evt);
            }
        });
        jPanel2.add(StartButton);

        CancelButton.setText("Cancel");
        CancelButton.setEnabled(false);
        CancelButton.addActionListener(new java.awt.event.ActionListener() {
            public void actionPerformed(java.awt.event.ActionEvent evt) {
                CancelButtonActionPerformed(evt);
            }
        });
        jPanel2.add(CancelButton);

        ProgressPanel.add(jPanel2, new java.awt.GridBagConstraints());

        DataPanel.add(ProgressPanel, new java.awt.GridBagConstraints());

        gridBagConstraints = new java.awt.GridBagConstraints();
        gridBagConstraints.gridwidth = java.awt.GridBagConstraints.REMAINDER;
        getContentPane().add(DataPanel, gridBagConstraints);

        pack();
    }// </editor-fold>//GEN-END:initComponents

    private void PMLRadioButtonActionPerformed(java.awt.event.ActionEvent evt) {//GEN-FIRST:event_PMLRadioButtonActionPerformed
        // TODO add your handling code here:
    }//GEN-LAST:event_PMLRadioButtonActionPerformed

    private void pBarMouseMoved(java.awt.event.MouseEvent evt) {//GEN-FIRST:event_pBarMouseMoved
        int n = pBar.getValue();
        pBar.setToolTipText("n=" + n);
    }//GEN-LAST:event_pBarMouseMoved

    private void StartButtonActionPerformed(java.awt.event.ActionEvent evt) {//GEN-FIRST:event_StartButtonActionPerformed
        StartButton.setEnabled(false);
        CancelButton.setEnabled(true);
        stopThread = false;
        String Nstring = NField.getText();
        Nmax = Integer.valueOf(Nstring).intValue() + 1;
        skip = Integer.valueOf(SkipText.getText()).intValue();
        //System.out.println("*** CalculateEHFrame::StartButtonActionPerformed():: Gravando a cada "+skip);
        //System.out.println("*** CalculateEHFrame::StartButtonActionPerformed():: Delta T = "+dt);
        setMaxMin(0, Nmax);
        TestDT();
        for (int b = 0; b < Freq.length; b++) {
            if (fbuttons[b].isSelected()) {
                f = Freq[b];
                FIndex = b;
            //System.out.println("** CalculateEHFrame::StartButton::F = "+f);
            }
        }

        String CCA = new String("Not Selected!");
        if (Mur1RadioButton.isSelected()) {
            CCAtype = 'm';
            CCAorder = 1;
            CCA = new String("1st order Mur Boundary Condition");
        } else if (Mur2RadioButton.isSelected()) {
            CCAtype = 'm';
            CCAorder = 2;
            CCA = new String("2nd order Mur Boundary Condition");
        } else if (PMLRadioButton.isSelected()) {
            CCAtype = 'p';
            CCAorder = 1;
            CCA = new String("PML Boundary Condition");
        }
        System.out.println("*** CCA = " + CCA);

        System.out.println("*** Calculando os campos eletrico (E) e magnetico (H) por " + Nmax + " instantes de tempo com DeltaT=" + dt + "s ...");
        tcalc = new Thread(new Runnable() {

            public void run() {
                CalculateEHParallel();
            }
        });
        tcalc.start();

    }//GEN-LAST:event_StartButtonActionPerformed

    private void CancelButtonActionPerformed(java.awt.event.ActionEvent evt) {//GEN-FIRST:event_CancelButtonActionPerformed
        if (tcalc != null) {
            String message = new String("Deseja cancelar este processo?\n Todas as informacoes serao PERDIDAS!");
            int answer = JOptionPane.showConfirmDialog(this, message, "Cancel Calculation", JOptionPane.YES_NO_OPTION);
            System.out.println("** CancelButton()::Resposta = " + answer);
            if (answer == 0) { //yes

                stopThread = true;
                StartButton.setEnabled(true);
                CancelButton.setEnabled(false);
            }
        }

    }//GEN-LAST:event_CancelButtonActionPerformed

private void DTFieldActionPerformed(java.awt.event.ActionEvent evt) {//GEN-FIRST:event_DTFieldActionPerformed
// TODO add your handling code here:
}//GEN-LAST:event_DTFieldActionPerformed

private void NFieldActionPerformed(java.awt.event.ActionEvent evt) {//GEN-FIRST:event_NFieldActionPerformed
// TODO add your handling code here:
}//GEN-LAST:event_NFieldActionPerformed

    /**
     * @param args the command line arguments
     */
    public static void main(String args[]) {
        java.awt.EventQueue.invokeLater(new Runnable() {

            public void run() {
                new CalculateEHFrameParallel().setVisible(true);
            }
        });
    }

    public void CalculateEHParallel() {
        
        int tagAtual = 12344;
        Date comecou = new Date();
        int TX = gridSizeX;
        int TY = gridSizeY;
        int TZ = gridSizeZ;
        //int tamanhoOriginal = (TX-1)/2;
        //int numData = (tamanhoOriginal/NPROC)*2+1;
        //if(tamanhoOriginal%NPROC!=0 || numData%2!=1){
        //    System.out.println("*** PARALELIZACAO NO X NAO E' POSSIVEL POR CAUSA DO TAMANHO DO MODELO!");
        //    System.out.println("*** TX = "+TX+"  NPROC = "+NPROC);
        //    System.exit(0);
        //}

        try {
            // Enroll in the parallel virtual machine...
            jpvmEnvironment jpvm = new jpvmEnvironment();

            jpvmTaskId mytid = jpvm.pvm_mytid();
            jpvmTaskId tids[] = new jpvmTaskId[NPROC];

            int TaskOk = jpvm.pvm_spawn("FDTD_slave", NPROC, tids);
            if (TaskOk != NPROC) {
                System.out.println(" *** ERRO NO SPAWN!!! Numero de Processos Iniciados (" + TaskOk + ") < NPROC (" + NPROC + ")");
                System.exit(0);
            } else {
                //System.out.println("*** CalculateEHFrame::CalculateEHParallel():: TaskOk =  "+TaskOk);
            }
            //Recebe e testa se JPVM esta ok
            tagAtual++;
            PvmUtil.printMessageFromSlaves(jpvm, tids, tagAtual, false);
            //System.out.println("*** CalculateEHFrame::setJPVM():: COMMUNICATION OK!");

            /**
             * PROCESSO DA PARALELIZACAO:
             * Inicializacao:
             * --------------
             * for (i=0; i<NPROC; i++){
             *  ok 1) MANDA OS DADOS INICIAIS PARA OS SLAVES
             *  ok 2) MANDA O PEDACO ESPECIFICO DO MODELO PARA SLAVES
             *  ok 3) MANDA AS FONTES E OS MATERIAIS PARA SLAVES
             * }
             *
             * Calculo:
             * --------
             * for (n=0; n<max; n++){
             *     for (i=0; i<NPROC; i++){
             *    ok 4) RECEBE O N DOS SLAVES E ATUALIZA BARRA
             *    ok 5) RECEBE AS RESPOSTAS DE CADA SLAVE
             *    ok 6) JUNTA OS DADOS EM UM UNICO PONTEIRO
             *    ok 7) GRAVA RESPOSTA EM DISCO
             *      }
             * }
             **/
            int ModelX = M.x();
            int ModelY = M.y();
            int ModelZ = M.z();
            System.out.println(" ** Tamanho modelo = (" + ModelX + "," + ModelY + "," + ModelZ + ").");

            //int tamModelo = (int)(ModelX/NPROC);
            //System.out.println(" ** Tamanho modelos locais paralelos = ("+tamModelo+","+ModelY+","+ModelZ+").");
            //if (tamModelo%2!=1)
            //    System.out.println(" *** ERRO!! TamModelo nao gera cubos inteiros!!");

            // 1) MANDA OS DADOS INICIAIS PARA OS SLAVES
            jpvmBuffer buf = new jpvmBuffer();
            //System.out.println(" ** Mandou o Nmax = "+max);

            for (int i = 0; i < NPROC; i++) {
                buf = new jpvmBuffer();
                buf.pack(i);
                buf.pack(NPROC);
                buf.pack(Nmax);
                buf.pack(skip);
                jpvm.pvm_send(buf, tids[i], 11);
            }
            //confirma o recebimento:
            tagAtual++;
            PvmUtil.printMessageFromSlaves(jpvm, tids, tagAtual, false);

            //manda os vizinhos:
            PvmUtil.sendTaskIDNeighbors(jpvm, tids, 12);
            //confirma o recebimento:
            PvmUtil.printMessageFromSlaves(jpvm, tids, 14, false);


            //Manda quem sao os vizinhos:
            // 2) MANDA O PEDACO ESPECIFICO DO MODELO PARA SLAVES

            //manda o tamanho e os deltas:
            for (int i = 0; i < NPROC; i++) {
                buf = new jpvmBuffer();
                int tamModelo = (int) (ModelX / NPROC);
                if (NPROC * tamModelo != ModelX && i == NPROC - 1) {
                    tamModelo = ModelX - (NPROC - 1 * tamModelo);
                }
                System.out.println(" ** MASTER: tamanho dos modelos parciais = " + tamModelo);
                buf.pack(tamModelo);
                buf.pack(ModelY);
                buf.pack(ModelZ);
                buf.pack(dx);
                buf.pack(dy);
                buf.pack(dz);
                buf.pack(dt);
                buf.pack(FIndex);
                buf.pack(CCAtype);
                buf.pack(CCAorder);
                jpvm.pvm_send(buf, tids[i], 22);
            }
            //confirma o recebimento do tamanho e dos deltas:
            tagAtual++;
            PvmUtil.printMessageFromSlaves(jpvm, tids, tagAtual, false);

            //manda o modelo:
            for (int i = 0; i < NPROC; i++) {
                if (stopThread) {
                    return;
                }
                buf = new jpvmBuffer();
                int tamModelo = (int) (ModelX / NPROC);
                if (NPROC * tamModelo != ModelX && i == NPROC - 1) {
                    tamModelo = ModelX - (NPROC - 1 * tamModelo);
                }
                System.out.println(" ** MASTER: tamanho dos modelos parciais = " + tamModelo);
                int Xi = (tamModelo - 1) * i;
                int Xf = Xi + (tamModelo - 1);
                int tagModel = 33;
                System.out.println(" ** Mandando Modelo com X = " + Xi + " ate " + Xf + ", Y = " + 0 + " ate " + (ModelY - 1) + ", Z = " + 0 + " ate " + (ModelZ - 1));
                PvmUtil.sendPartialModel(jpvm, tids[i], buf, Xi, Xf, ModelY, ModelZ, M, tagModel);
            /**for (int x=Xi; x<=Xf; x++){
            for (int y=0; y<ModelY; y++){
            for (int z=0; z<ModelZ; z++){
            buf.pack(M.getData(x,y,z));
            }
            }
            }
            jpvm.pvm_send(buf, tids[i], 33);
            
             * */
            }
            //confirma o recebimento do modelo:
            tagAtual++;
            PvmUtil.printMessageFromSlaves(jpvm, tids, tagAtual, false);

            // 3) MANDA AS FONTES E OS MATERIAIS PARA SLAVES
            //manda as fontes
            tagAtual++;
            PvmUtil.sendSources(jpvm, tids, S, tagAtual);
            //confirma o recebimento das fontes
            tagAtual++;
            PvmUtil.printMessageFromSlaves(jpvm, tids, tagAtual, true);

            //manda os materiais
            tagAtual++;
            PvmUtil.sendMaterials(jpvm, tids, Mat, FIndex, tagAtual);
            //confirma o recebimento dos materiais
            tagAtual++;
            PvmUtil.printMessageFromSlaves(jpvm, tids, tagAtual, false);


            tagAtual++;
            double vI = 0.0;
            Field FieldAtual = new Field(ModelX, ModelY, ModelZ, "EH", vI);
            for (int cont = 0; cont < Nmax; cont++) {
                System.out.println("** CalculateEHFrameParallel::CalculateEHParallel():: N = " + cont);
                int n = 0;
                //System.out.println(" ** Tamanho do Field Atual = ("+ModelX+","+ModelY+","+ModelZ+").");

                for (int i = 0; i < NPROC; i++) {
                    if (stopThread) {
                        return;
                    // 4) RECEBE O N DOS SLAVES E ATUALIZA BARRA
                    }
                    try {
                        int tagN = 197 + cont;
                        jpvmMessage message = jpvm.pvm_recv(tids[i], tagN);
                        n = message.buffer.upkint();
                    //System.out.println(" Recebeu do slave "+tids[i].getPort()+": n = "+n+" com tag = "+tagN);
                    } catch (jpvmException e) {
                        e.printStackTrace();
                    }

                    //5) RECEBE OS ARQUIVOS DE CADA SLAVE
                    //confirma o envio dos arquivos:
                    if (n % skip == 0) {
                        int tagResposta = 900;

                        //System.out.println("Esperando arquivo com Tag = "+tagResposta+" de "+tids[i].getPort());
                        PvmUtil.printMessageFromSlave(jpvm, tids[i], (902), false);

                        //recebe o arquivo:
                        //PvmUtil.printMessageFromSlave(jpvm, tids[i], (tagAtual+2), true);
                        Field Partial = PvmUtil.receivePartialField(jpvm, tids[i], tagResposta);
                        PvmUtil.printMessageFromSlave(jpvm, tids[i], (904), false);

                        //6) JUNTA OS DADOS EM UM UNICO PONTEIRO
                        int tamModelo = (int) (ModelX / NPROC);
                        if (NPROC * tamModelo != ModelX && i == NPROC - 1) {
                            tamModelo = ModelX - (NPROC - 1 * tamModelo);
                        }
                        int Xi = (tamModelo - 1) * i;
                        int Xf = Xi + (tamModelo);
                        //System.out.println(" ** Juntando de X = "+Xi+" ate "+(Xf-1)+", Y = "+0+" ate "+(ModelY-1)+", Z = "+0+" ate "+(ModelZ-1));
                        FieldAtual.setValuesData(Partial, Xi, Xf, 0, ModelY, 0, ModelZ);
                    /**for (int x=0; x<FieldAtual.SizeX(); x++)
                    for (int y=0; y<FieldAtual.SizeY(); y++)
                    for (int z=0; z<FieldAtual.SizeZ(); z++)
                    if (FieldAtual.data(x,y,z)!=0)
                    System.out.println("** CalculaeEHFramePrallel::CalculateEHParallel:: Field diferente de zero em: "+x+","+y+","+z+" = "+FieldAtual.data(x,y,z));
                     **/
                    //System.out.println("   ** Master recebeu e colocou o parcial dentro do field atual!!! Linha 533 do CalculateEHFrameParallel::CalculateEHParallel!!");
                    }
                }
                if (barValue() < (n + 1)) {
                    setBar(n + 1);
                //7) GRAVA RESPOSTA EM DISCO DEPOIS DE RECEBER DE TODOS OS SLAVES
                }
                if (n % skip == 0) {
                    FieldAtual.Save(PATH, SimulName, n, this);
                    System.out.println("** CalculateEHFrameParallel::CalculateEHParallel():: GRAVANDO ARQUIVO " + PATH + "/results/EN" + n + ".");

                }

            }

            //System.out.println("*** CalculateEHFrame::CalculateEHJPVM():: COMMUNICATION OK!");
            jpvm.pvm_exit();

        } catch (jpvmException jpe) {
            String texto = new String("*** CalculateEHFrameParallel::CalculateEHParallel()::Error - jpvm exception = " + jpe.toString());
            JOptionPane.showMessageDialog(this, texto, "Error", JOptionPane.ERROR_MESSAGE);
            System.out.println(texto);
            errorJPVM = true;
            jpe.printStackTrace();
        }

        if (!errorJPVM) {
            Date terminou = new Date();
            long tempoTotal = (terminou.getTime() - comecou.getTime());
            long tempoS = (tempoTotal / 1000);
            int tempoM = 0;
            while (tempoS >= 60) {
                tempoM++;
                tempoS = tempoS - 60;
            }
            System.out.println("*** Tempo de simulacao = " + (tempoTotal / 1000.0) + "s = " + tempoM + "min e " + tempoS + "s.");
            String texto = new String("Fim da Simulacao!! Tempo = " + (tempoTotal / 1000.0) + "s.");
            JOptionPane.showMessageDialog(this, texto, "End of Simulation", JOptionPane.INFORMATION_MESSAGE);
            EHCalculated = true;
        }
        this.setVisible(false);

    }

    public void SavePoint(String PATH, String SimulName, int n, double[] values, int pnumber) {
        String nomeArqPoint = new String("" + PATH + "/results/Point" + "N" + pnumber);
        System.out.println("** Field::Save:: Gravando arquivo = " + nomeArqPoint);
        try {
            FileWriter outputFileWriterP = new FileWriter(nomeArqPoint);
            PrintWriter outputWriterP = new PrintWriter(outputFileWriterP);
            outputWriterP.print("" + n + "\n");
            outputWriterP.print("" + dt + "\n");
            for (int i = 0; i < n; i++) {
                outputWriterP.print(values[i] + "\n");
            }
            outputFileWriterP.close();
        } catch (IOException e) {
            System.out.println("** Field::SavePoint::IOException:");
            e.printStackTrace();
        }

    }

    public double mur1stOrder(Field[] C, int i, int j, int k, double cc, int a, int b, int c) {
        double d = 0;
        if (a != 0) {
            d = dx;
        }
        if (b != 0) {
            d = dy;
        }
        if (c != 0) {
            d = dz;
        }
        double c1 = (cc * dt - d) / (cc * dt + d);
        double c2 = (2 * d / (cc * dt + d));
        double value = -C[2].data(i + a, j + b, k + c);
        value += c1 * (C[0].data(i + a, j + b, k + c) + C[2].data(i, j, k));
        value += c2 * (C[1].data(i + a, j + b, k + c) + C[1].data(i, j, k));
        return value;
    }

    public void save3dmDat3df(String nome, String PATH) {
        save3dm(nome, PATH);
        saveDat(nome, PATH);
        save3df(nome, PATH);
    }

    public void save3dm(String N3dm, String PATH) {
        try {
            int SX = (M.x() - 1) / 2;
            int SY = (M.y() - 1) / 2;
            int SZ = (M.z() - 1) / 2;
            String nome3dm = new String(PATH + "/results/Simul" + N3dm + ".3dm");
            FileWriter outputFileWriter = new FileWriter(nome3dm);
            PrintWriter outputWriter = new PrintWriter(outputFileWriter);
            outputWriter.println("<?xml version=\"1.0\" encoding=\"ISO-8859-1\"?>");
            outputWriter.println("<!-- Created by Ana Rodrigues on September 28, 2005, 16:44 PM -->");
            outputWriter.print("<MaterialModel name=\"" + SimulName + "\" dimention=\"" + SX + "," + SY + "," + SZ + "\" deltas=\"" + this.dx + "," + this.dy + "," + this.dz + "\"");
            outputWriter.println(" frequency=\"" + f + "\">");
            outputWriter.println("<sources>");
            for (int s = 0; s < S.length; s++) {
                outputWriter.println("<source type=\"" + S[s].getType() + "\" location=\"" + S[s].getLocation()[0] + "," + S[s].getLocation()[1] + "," + S[s].getLocation()[2] + "\" maxValue=\"" + S[s].getMaxValue() + "\" unit=\"" + S[s].getUnit() + "\"  hard=\"" + S[s].isHard() + "\"></source>");
            }
            outputWriter.println("</sources>");
            outputWriter.println("<materials>");
            for (int m = 0; m < NMat; m++) {
                Material M = this.Mat[m];
                outputWriter.print("<material code=\"" + M.code() + "\" color=\"" + M.color().getRed() + "," + M.color().getGreen() + "," + M.color().getBlue() + "\"");
                outputWriter.print(" name=\"" + M.name(0) + "\" transparency=\"" + M.transp() + "\" visible=\"" + M.visible() + "\"");
                outputWriter.print(" muR=\"" + M.muR(0) + "\" epR=\"" + M.epR(0) + "\" si=\"" + M.si(0) + "\" siC=\"" + M.siC(0) + "\" density=\"" + M.density() + "\"");
                outputWriter.print(" C=\"" + M.C() + "\" k=\"" + M.K() + "\" bf=\"" + M.Bf() + "\" hm=\"" + M.Hm() + "\"  e=\"" + M.Emissivity() + "\" kevap=\"" + M.Kevap() + "\"  >");
                outputWriter.println("</material>");
            }
            outputWriter.println("</materials>");

            String nameDat = new String(N3dm + ".dat");
            outputWriter.println("<datafile name=\"" + "Simul" + nameDat + "\" id=\"0001\"></datafile>");
            outputWriter.println("</MaterialModel>");

            outputFileWriter.close();
            outputWriter.close();



        } catch (IOException e) {

            System.out.println("** Field::save3dm()::IOException:");
            e.printStackTrace();

        }


    }

    public void save3df(String N3df, String PATH) {
        try {
            int SX = (M.x() - 1) / 2;
            int SY = (M.y() - 1) / 2;
            int SZ = (M.z() - 1) / 2;
            String name3df = new String(PATH + "/results/Simul" + N3df + "E.3df");
            FileWriter outputFileWriter = new FileWriter(name3df);
            PrintWriter outputWriter = new PrintWriter(outputFileWriter);
            outputWriter.println("<?xml version=\"1.0\" encoding=\"ISO-8859-1\"?>");
            outputWriter.print("<FieldModel name=\"" + SimulName + "\" dimention=\"" + SX + "," + SY + "," + SZ + "\" deltas=\"" + M.dx() + "," + M.dy() + "," + M.dz());
            outputWriter.println("\" timesteps=\"" + (this.Nmax - 1) + "\" units=\"(E [V/m])\">");
            outputWriter.println("<data prefix=\"EN\" initialSufixCount=\"0\" sufixIncrement=\"" + this.skip + "\"></data>");
            String name3dm = new String(N3df + ".3dm");
            outputWriter.println("<MaterialModel location =\"" + "Simul" + name3dm + "\"></MaterialModel>");
            outputWriter.println("</FieldModel>");
            outputFileWriter.close();
            outputWriter.close();
        } catch (IOException e) {

            System.out.println("** Field::save3df()::IOException:");
            e.printStackTrace();

        }

        try {
            int SX = (M.x() - 1) / 2;
            int SY = (M.y() - 1) / 2;
            int SZ = (M.z() - 1) / 2;
            String name3df = new String(PATH + "/results/Simul" + N3df + "H.3df");
            FileWriter output;
            FileWriter outputFileWriter = new FileWriter(name3df);
            PrintWriter outputWriter = new PrintWriter(outputFileWriter);
            outputWriter.println("<?xml version=\"1.0\" encoding=\"ISO-8859-1\"?>");
            outputWriter.println("<FieldModel name=\"" + SimulName + "\" dimention=\"" + SX + "," + SY + "," + SZ + "\" deltas=\"" + M.dx() + "," + M.dy() + "," + M.dz() + "\" timesteps=\"" + this.Nmax + "\" units=\"(H [A/m])\">");
            outputWriter.println("<data prefix=\"HN\" initialSufixCount=\"0\" sufixIncrement=\"" + skip + "\"></data>");
            String name3dm = new String(N3df + ".3dm");
            outputWriter.println("<MaterialModel location =\"" + "Simul" + name3dm + "\"></MaterialModel>");
            outputWriter.println("</FieldModel>");
            outputFileWriter.close();
            outputWriter.close();
        } catch (IOException e) {

            System.out.println("** Field::save3df()::IOException:");
            e.printStackTrace();

        }
    }

    public void saveDat(String NArq, String PATH) {
        try {
            int SX = (M.x() - 1) / 2;
            int SY = (M.y() - 1) / 2;
            int SZ = (M.z() - 1) / 2;
            
            String nomeArq = new String(PATH + "/results/Simul" + NArq + ".dat");
            FileWriter outputFileWriter = new FileWriter(nomeArq);
            PrintWriter outputWriter = new PrintWriter(outputFileWriter);
            //System.out.println("** CalculateEHFrameParallel::saveDat():: X = "+SX+"  Y = "+SY+"  Z = "+SZ);
            for (int i = 1; i < M.x(); i += 2) {
                for (int j = 1; j < M.y(); j += 2) {
                    for (int k = 1; k < M.z(); k += 2) {
                        outputWriter.print(M.getData(i, j, k) + " ");
                    }
                }
                outputWriter.println("");

            }

            outputFileWriter.close();
            outputWriter.close();

        } catch (IOException e) {

            System.out.println("** Field::saveDat()::IOException:");
            e.printStackTrace();

        }
    }
    // Variables declaration - do not modify//GEN-BEGIN:variables
    private javax.swing.ButtonGroup CCAButtonGroup;
    private javax.swing.JButton CancelButton;
    private javax.swing.JTextField DTField;
    private javax.swing.JPanel DataPanel;
    private javax.swing.ButtonGroup FreqButtonGroup;
    private javax.swing.JPanel FreqPanel;
    private javax.swing.JRadioButton Mur1RadioButton;
    private javax.swing.JRadioButton Mur2RadioButton;
    private javax.swing.JTextField NField;
    private javax.swing.JSpinner NProcSpinner;
    private javax.swing.JRadioButton PMLRadioButton;
    private javax.swing.JPanel ProgressPanel;
    private javax.swing.JPanel SavePanel;
    private javax.swing.JTextField SkipText;
    private javax.swing.JButton StartButton;
    private javax.swing.JLabel jLabel1;
    private javax.swing.JLabel jLabel2;
    private javax.swing.JLabel jLabel3;
    private javax.swing.JLabel jLabel4;
    private javax.swing.JLabel jLabel5;
    private javax.swing.JLabel jLabel6;
    private javax.swing.JLabel jLabel7;
    private javax.swing.JLabel jLabel8;
    private javax.swing.JLabel jLabel9;
    private javax.swing.JPanel jPanel1;
    private javax.swing.JPanel jPanel2;
    private javax.swing.JPanel jPanel3;
    private javax.swing.JLabel maximo;
    private javax.swing.JLabel minimo;
    private javax.swing.JProgressBar pBar;
    // End of variables declaration//GEN-END:variables
}
