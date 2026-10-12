/*
 * SimulData.java
 *
 * Created on 15 de Setembro de 2005, 11:14
 */

/**
 *
 * @author  juliano
 */

import java.text.*;
import javax.swing.table.*;
import javax.swing.JTable;

public class SimulData extends javax.swing.JFrame {
    
    javax.swing.JLabel[] MLabel = null;
    int Language = 0;
    
    public void setLanguage(int i){Language=i;};
    public int getLanguage(){return Language;};
    public String wichLanguage(){
        String l = "no language";
        switch(Language){
            case 0: l = "English";
            case 1: l = "Portuguese";
            default: l = "English";
        }
        return(l);
    }
    public void printLanguage(){
        String l = "no language";
        switch(Language){
            case 0: l = "English";
            case 1: l = "Portuguese";
            default: l = "English";
        }
        System.out.println("*** Language = "+l);
    }
    
    /** Creates new form SimulData */
    public SimulData() {
        initComponents();
    }
    
    public SimulData(String name, int sx, int sy, int sz, double dx, double dy, double dz) {
        initComponents();
        NumberFormat formatter = new DecimalFormat("0");
        SimulNameLabel.setText(name);
        SizeXLabel.setText(""+formatter.format(sx));
        SizeYLabel.setText(""+formatter.format(sy));
        SizeZLabel.setText(""+formatter.format(sz));
        formatter = new DecimalFormat("0E0");
        DXLabel.setText(""+formatter.format(dx));
        DYLabel.setText(""+formatter.format(dy));
        DZLabel.setText(""+formatter.format(dz));
    }
    
    public SimulData(String name, int sx, int sy, int sz, double dx, double dy, double dz, Material [] M, int nm) {
        initComponents();
        NumberFormat formatter = new DecimalFormat("0");
        SimulNameLabel.setText(name);
        SizeXLabel.setText(""+formatter.format(sx));
        SizeYLabel.setText(""+formatter.format(sy));
        SizeZLabel.setText(""+formatter.format(sz));
        formatter = new DecimalFormat("0E0");
        DXLabel.setText(""+formatter.format(dx));
        DYLabel.setText(""+formatter.format(dy));
        DZLabel.setText(""+formatter.format(dz));
        String fvalor="Frequency = ";
        for (int f=0; f<M[0].nfreq(); f++){
            fvalor = new String(fvalor+M[0].freq(f)+"Hz");
            if (f<M[0].nfreq()-1)
                fvalor= new String(fvalor+", ");
        }
        FreqLabel.setText(fvalor);
        
        MLabel = new javax.swing.JLabel[M.length];
        //System.out.println("Numero de Materiais = "+nm);
        int row, col;
        col = 14;
        row = nm+1;
        String [] ColumnNames = new String[]{"Material","Code","Density","Freq" +
                "","RGB","muR","epR","sigma","sigmaC","C","k","bf","hm","emissivity","kevap"};
                MaterialTable.setModel(new javax.swing.table.DefaultTableModel(ColumnNames, row));
                int coluna=0;
                MaterialTable.setValueAt("Material",0,coluna);coluna++;
                MaterialTable.setValueAt("Code",0,coluna);coluna++;
                MaterialTable.setValueAt("Density",0,coluna);coluna++;
                MaterialTable.setValueAt("RGB",0,coluna);coluna++;
                MaterialTable.setValueAt("muR",0,coluna);coluna++;
                MaterialTable.setValueAt("epR",0,coluna);coluna++;
                MaterialTable.setValueAt("sigma",0,coluna);coluna++;
                MaterialTable.setValueAt("sigmaC",0,coluna);coluna++;
                MaterialTable.setValueAt("C",0,coluna);coluna++;
                MaterialTable.setValueAt("k",0,coluna);coluna++;
                MaterialTable.setValueAt("bf",0,coluna);coluna++;
                MaterialTable.setValueAt("hm",0,coluna);coluna++;
                MaterialTable.setValueAt("e",0,coluna);coluna++;
                MaterialTable.setValueAt("kvap",0,coluna);coluna++;
                
                TableColumn column = null;
                for (int i = 0; i < coluna; i++) {
                    column = MaterialTable.getColumnModel().getColumn(i);
                    switch(i){
                        case 0: column.setPreferredWidth(90); break; //name
                        case 1: column.setPreferredWidth(30); break;//code
                        case 3: column.setPreferredWidth(70); break;//rgb
                        case 4: column.setPreferredWidth(60); break;//muR
                        case 5: column.setPreferredWidth(80); break;//epR
                        case 6: column.setPreferredWidth(80); break;//sigma
                        case 7: column.setPreferredWidth(60); break;//sigmaC
                        case 10: column.setPreferredWidth(70); break;//bf
                        default: column.setPreferredWidth(40); //name
                    }
                }
                
                
                for (int m=0; m<row-1; m++){
                    //System.out.println("** SimulData::material ="+m+" nome = "+M[m].name(Language));
                    int cc = 0;
                    int nfreq = M[m].nfreq();
                    DecimalFormat DF = new DecimalFormat("00.00");
                    DecimalFormatSymbols FS = DF.getDecimalFormatSymbols();
                    char dsep = '.';
                    FS.setDecimalSeparator(dsep);
                    DF.setDecimalFormatSymbols(FS);
                    
                    MaterialTable.setValueAt(M[m].name(Language),m+1,cc);cc++;
                    MaterialTable.setValueAt(M[m].code(),m+1,cc);cc++;
                    String valor="";      valor= new String(""+M[m].density());
                    MaterialTable.setValueAt(valor,m+1,cc); cc++;
                    valor="";             java.awt.Color c = M[m].color();
                    String cor = ("|"+c.getRed()+","+c.getGreen()+","+c.getBlue()+"|");
                    MaterialTable.setValueAt(cor,m+1,cc);cc++;
                    for (int f=0; f<nfreq; f++)
                        valor = new String(valor+" | "+M[m].muR(f));
                    MaterialTable.setValueAt(valor,m+1,cc); cc++;
                    valor="";
                    for (int f=0; f<nfreq; f++)  valor = new String(valor+" | "+DF.format(M[m].epR(f)));
                    MaterialTable.setValueAt(valor,m+1,cc); cc++;
                    valor="";
                    for (int f=0; f<nfreq; f++)  valor = new String(valor+" | "+M[m].si(f));
                    MaterialTable.setValueAt(valor,m+1,cc);cc++;
                    valor="";
                    for (int f=0; f<nfreq; f++)  valor = new String(valor+" | "+M[m].siC(f));
                    MaterialTable.setValueAt(valor,m+1,cc);cc++;
                    MaterialTable.setValueAt(M[m].C(),m+1,cc);cc++;
                    MaterialTable.setValueAt(M[m].K(),m+1,cc);cc++;
                    
                    DF = new DecimalFormat("00000");
                    FS = DF.getDecimalFormatSymbols();
                    FS.setDecimalSeparator(dsep);
                    DF.setDecimalFormatSymbols(FS);
                    MaterialTable.setValueAt(DF.format(M[m].Bf()),m+1,cc);cc++;
                    
                    MaterialTable.setValueAt(M[m].Hm(),m+1,cc);cc++;
                    MaterialTable.setValueAt(M[m].Emissivity(),m+1,cc);cc++;
                    MaterialTable.setValueAt(M[m].Kevap(),m+1,cc);cc++;
                    
                    
                }
                //  MaterialTable.setTableHeader(new JTableHeader());
                pack();
    }
    
    /** This method is called from within the constructor to
     * initialize the form.
     * WARNING: Do NOT modify this code. The content of this method is
     * always regenerated by the Form Editor.
     */
    private void initComponents() {//GEN-BEGIN:initComponents
        java.awt.GridBagConstraints gridBagConstraints;

        jPanel1 = new javax.swing.JPanel();
        NamePanel = new javax.swing.JPanel();
        jLabel1 = new javax.swing.JLabel();
        SimulNameLabel = new javax.swing.JLabel();
        SizePanel = new javax.swing.JPanel();
        jLabel6 = new javax.swing.JLabel();
        SizeXLabel = new javax.swing.JLabel();
        jLabel7 = new javax.swing.JLabel();
        SizeYLabel = new javax.swing.JLabel();
        jLabel8 = new javax.swing.JLabel();
        SizeZLabel = new javax.swing.JLabel();
        DeltaPanel = new javax.swing.JPanel();
        jLabel2 = new javax.swing.JLabel();
        DXLabel = new javax.swing.JLabel();
        jLabel3 = new javax.swing.JLabel();
        DYLabel = new javax.swing.JLabel();
        jLabel4 = new javax.swing.JLabel();
        DZLabel = new javax.swing.JLabel();
        jLabel5 = new javax.swing.JLabel();
        FreqLabel = new javax.swing.JLabel();
        MaterialsPanel = new javax.swing.JPanel();
        MaterialTable = new javax.swing.JTable();

        getContentPane().setLayout(new java.awt.GridBagLayout());

        setTitle("Simulation Data");
        setFocusable(false);
        setLocationByPlatform(true);
        jPanel1.setLayout(new java.awt.GridBagLayout());

        jPanel1.setPreferredSize(new java.awt.Dimension(300, 150));
        NamePanel.setBorder(new javax.swing.border.EtchedBorder());
        jLabel1.setFont(new java.awt.Font("King Richard", 0, 24));
        jLabel1.setText("Simulation = ");
        NamePanel.add(jLabel1);

        SimulNameLabel.setText("DEFAULT");
        NamePanel.add(SimulNameLabel);

        gridBagConstraints = new java.awt.GridBagConstraints();
        gridBagConstraints.gridwidth = java.awt.GridBagConstraints.REMAINDER;
        jPanel1.add(NamePanel, gridBagConstraints);

        jLabel6.setText("SizeX =");
        SizePanel.add(jLabel6);

        SizeXLabel.setText("0");
        SizePanel.add(SizeXLabel);

        jLabel7.setText("    SizeY =");
        SizePanel.add(jLabel7);

        SizeYLabel.setText("0");
        SizePanel.add(SizeYLabel);

        jLabel8.setText("    SizeZ =");
        SizePanel.add(jLabel8);

        SizeZLabel.setText("0");
        SizePanel.add(SizeZLabel);

        gridBagConstraints = new java.awt.GridBagConstraints();
        gridBagConstraints.gridwidth = java.awt.GridBagConstraints.REMAINDER;
        jPanel1.add(SizePanel, gridBagConstraints);

        jLabel2.setText("DX = ");
        DeltaPanel.add(jLabel2);

        DXLabel.setText("0.0");
        DeltaPanel.add(DXLabel);

        jLabel3.setText("m    DY =");
        DeltaPanel.add(jLabel3);

        DYLabel.setText("0.0");
        DeltaPanel.add(DYLabel);

        jLabel4.setText("m    DZ =");
        DeltaPanel.add(jLabel4);

        DZLabel.setText("0.0");
        DeltaPanel.add(DZLabel);

        jLabel5.setText("m");
        DeltaPanel.add(jLabel5);

        gridBagConstraints = new java.awt.GridBagConstraints();
        gridBagConstraints.gridwidth = java.awt.GridBagConstraints.REMAINDER;
        jPanel1.add(DeltaPanel, gridBagConstraints);

        FreqLabel.setText("Frequency = 0Hz");
        jPanel1.add(FreqLabel, new java.awt.GridBagConstraints());

        gridBagConstraints = new java.awt.GridBagConstraints();
        gridBagConstraints.gridwidth = java.awt.GridBagConstraints.REMAINDER;
        getContentPane().add(jPanel1, gridBagConstraints);

        MaterialsPanel.setPreferredSize(new java.awt.Dimension(900, 400));
        MaterialTable.setFont(new java.awt.Font("Arial", 0, 10));
        MaterialTable.setModel(new javax.swing.table.DefaultTableModel(
            new Object [][] {
                {null, null, null, null, null, null},
                {null, null, null, null, null, null},
                {null, null, null, null, null, null},
                {null, null, null, null, null, null},
                {null, null, null, null, null, null},
                {null, null, null, null, null, null},
                {null, null, null, null, null, null},
                {null, null, null, null, null, null},
                {null, null, null, null, null, null},
                {null, null, null, null, null, null},
                {null, null, null, null, null, null},
                {null, null, null, null, null, null},
                {null, null, null, null, null, null},
                {null, null, null, null, null, null},
                {null, null, null, null, null, null},
                {null, null, null, null, null, null},
                {null, null, null, null, null, null}
            },
            new String [] {
                "Title 1", "Title 2", "Title 3", "Title 4", "Title 5", "Title 6"
            }
        ) {
            boolean[] canEdit = new boolean [] {
                false, false, false, false, false, false
            };

            public boolean isCellEditable(int rowIndex, int columnIndex) {
                return canEdit [columnIndex];
            }
        });
        MaterialTable.setEnabled(false);
        MaterialTable.setFocusTraversalPolicyProvider(true);
        MaterialTable.setMaximumSize(new java.awt.Dimension(30000000, 500));
        MaterialTable.setMinimumSize(new java.awt.Dimension(300, 500));
        MaterialTable.setShowVerticalLines(false);
        MaterialTable.setTableHeader(null);
        MaterialsPanel.add(MaterialTable);

        getContentPane().add(MaterialsPanel, new java.awt.GridBagConstraints());

        pack();
    }//GEN-END:initComponents
    
    /**
     * @param args the command line arguments
     */
    public static void main(String args[]) {
        java.awt.EventQueue.invokeLater(new Runnable() {
            public void run() {
                new SimulData().setVisible(true);
            }
        });
    }
    
    // Variables declaration - do not modify//GEN-BEGIN:variables
    private javax.swing.JLabel DXLabel;
    private javax.swing.JLabel DYLabel;
    private javax.swing.JLabel DZLabel;
    private javax.swing.JPanel DeltaPanel;
    private javax.swing.JLabel FreqLabel;
    private javax.swing.JTable MaterialTable;
    private javax.swing.JPanel MaterialsPanel;
    private javax.swing.JPanel NamePanel;
    private javax.swing.JLabel SimulNameLabel;
    private javax.swing.JPanel SizePanel;
    private javax.swing.JLabel SizeXLabel;
    private javax.swing.JLabel SizeYLabel;
    private javax.swing.JLabel SizeZLabel;
    private javax.swing.JLabel jLabel1;
    private javax.swing.JLabel jLabel2;
    private javax.swing.JLabel jLabel3;
    private javax.swing.JLabel jLabel4;
    private javax.swing.JLabel jLabel5;
    private javax.swing.JLabel jLabel6;
    private javax.swing.JLabel jLabel7;
    private javax.swing.JLabel jLabel8;
    private javax.swing.JPanel jPanel1;
    // End of variables declaration//GEN-END:variables
    
}
