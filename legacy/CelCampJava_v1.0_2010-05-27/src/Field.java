/*
 * Field.java
 *
 * Created on 22 de Setembro de 2005, 16:46
 */

/**
 *
 * @author juliano
 */
import java.text.*;
import java.io.*;

public class Field {

    public String Type = new String("Default");
    public int tx,  ty,  tz;
    double InitialValue = 0.0d;
    //* A partir do doubleArray3D de J.E. Moreira, 2000
    //double[][][] data = null;
    double[] data = null;
    int sizeData = 0;
    protected int n0,  n1,  n2;
    protected int w0,  w1,  w2,  w3;
    //** Para gravar **/
    FileWriter outputT = null;
    FileWriter outputFileWriterT = null;
    PrintWriter outputWriterT = null;

    /** Creates a new instance of Field */
    public Field() {
        InitiateField();
    }

    public Field(int x, int y, int z) {
        InitiateField(x, y, z);
    }

    public Field(int x, int y, int z, String t) {
           this(x,y,z,t,true); 
   }
    public Field(int x, int y, int z, String t,boolean initialize) {
        if(initialize)
         InitiateField(x, y, z, t);
        else
            InitiateSizes(x,y,z,t,0.0);
    }

    public Field(int x, int y, int z, String t, double InitValue) {
        InitiateField(x, y, z, t, InitValue);
    }

    public Field(Field F) {
        this.Type = F.Type;
        this.tx = F.tx;
        this.ty = F.ty;
        this.tz = F.tz;
        InitiateField(tx, ty, tz, Type, 0.0);
        setData(F.getData());
    }

    //public double[][][] getData(){return data;}
    public double[] getData() {
        return data;
    }

    public int getSizeData() {
        return this.sizeData;
    }

    public void setData(double[] d) {
        setData(d, false);
    }

    public void setData(double[] d, boolean inplace) {
        if (inplace) {
            data = d;
        } else {
            if (d.length == sizeData) {
                data = new double[sizeData];
                for (int i = 0; i < sizeData; i++) {
                    data[i] = d[i];
                }
            } else {
                throw new RuntimeException(" ERRO NA ALOCACAO DOS DADOS NO FIELD!! TAMANHOS DIFERENTES!!");
            }
        }

    }

    public void setValuesData(Field F, int xi, int xf, int yi, int yf, int zi, int zf) {
        int ii = 0, jj = 0, kk = 0;
        for (int i = xi; i < xf; i++) {
            for (int j = yi; j < yf; j++) {
                for (int k = zi; k < zf; k++) {
                    data(i, j, k, F.data(ii, jj, kk));
                    kk++;
                }
                jj++;
                kk = 0;
            }
            ii++;
            jj = 0;
            kk = 0;
        }
    }

    public int SizeX() {
        return tx;
    }

    public int SizeY() {
        return ty;
    }

    public int SizeZ() {
        return tz;
    }

    public String type() {
        return Type;
    }

    public void data(int i, int j, int k, double v) {
        //* A partir do doubleArray3D de J.E. Moreira, 2000
        //data[i][j][k]=v;
        if (i < 0) {
            throw new ArrayIndexOutOfBoundsException();
        }
        if (i >= n0) {
            throw new ArrayIndexOutOfBoundsException();
        }
        if (j < 0) {
            throw new ArrayIndexOutOfBoundsException();
        }
        if (j >= n1) {
            throw new ArrayIndexOutOfBoundsException();
        }
        if (k < 0) {
            throw new ArrayIndexOutOfBoundsException();
        }
        if (k >= n2) {
            throw new ArrayIndexOutOfBoundsException();
        }
        data[i * w0 + j * w1 + k * w2 + w3] = v;
    }

    public void setAllData(double v) {
        for (int x = 0; x < tx; x++) {
            for (int y = 0; y < ty; y++) {
                for (int z = 0; z < tz; z++) {
                    data(x, y, z, v);
                }
            }
        }

    }

    public double data(int i, int j, int k) {
        //* A partir do doubleArray3D de J.E. Moreira, 2000
        //return data[i][j][k];
        if (i < 0) {
            throw new ArrayIndexOutOfBoundsException();
        }
        if (i >= n0) {
            throw new ArrayIndexOutOfBoundsException();
        }
        if (j < 0) {
            throw new ArrayIndexOutOfBoundsException();
        }
        if (j >= n1) {
            throw new ArrayIndexOutOfBoundsException();
        }
        if (k < 0) {
            throw new ArrayIndexOutOfBoundsException();
        }
        if (k >= n2) {
            throw new ArrayIndexOutOfBoundsException();
        }
        return data[i * w0 + j * w1 + k * w2 + w3];
    }

    public void InitiateField() {
        int x = 1;
        int y = 1;
        int z = 1;
        InitiateField(x, y, z);
    }

    public void InitiateField(int x, int y, int z) {
        Type = new String("Default");
        InitiateField(x, y, z, Type);
    }

    public void InitiateField(int x, int y, int z, String t) {
        InitialValue = 0.0d;
        InitiateField(x, y, z, t, InitialValue);
    }
    
    public void InitiateSizes(int n, int m, int l, String t, double v){
        sizeData = n * m;
        if (sizeData > Integer.MAX_VALUE) {
            throw new OutOfMemoryError();
        }
        sizeData = sizeData * l;
        if (sizeData > Integer.MAX_VALUE) {
            throw new OutOfMemoryError();
        }
        n0 = n;
        n1 = m;
        n2 = l;
        w0 = m * l;
        w1 = l;
        w2 = 1;
        w3 = 0;
        Type = t;

        InitialValue = v;

        tx = n;
        ty = m;
        tz = l;
    }

    public void InitiateField(int n, int m, int l, String t, double v) {
        InitiateSizes(n,m,l,t,v);
        
        try {
            data = new double[sizeData];
        } catch (Exception e) {
            e.printStackTrace();
        }
        
        if (v != 0.0) {
            for (int i = 0; i < sizeData; i++) {
                data[i] = v;
            }
        }
    }

    public void print(int i, int j, int k) {
        DecimalFormat DF = new DecimalFormat("0.0E00");
        DecimalFormatSymbols FS = DF.getDecimalFormatSymbols();
        char dsep = '.';
        FS.setDecimalSeparator(dsep);
        DF.setDecimalFormatSymbols(FS);

        System.out.println("** Field::Print():: Ponto(" + i + "," + j + "," + k + ") = " + DF.format(data(i, j, k)));
    }

    public void Save(String PATH, String SimulName, int n, CalculateEHFrame EHF) {
        if (n == 0) {
            String Name = new String(SimulName);
            EHF.save3dm(Name, PATH);
            EHF.saveDat(Name, PATH);
            EHF.save3df(Name, PATH);
        }
        EscreveArquivo2D(PATH, n);
    }

    public void SaveT(String PATH, String SimulName, int n, CalculateTFrameParallel T) {
        if (n == 0) {
            String Name = new String(SimulName);
            T.save3dmT(Name, PATH);
            T.saveDatT(Name, PATH);
            T.save3dT(Name, PATH);
        }
        EscreveArquivo2DT(PATH, n);
    }

    public void SaveMinAvMaxT(String PATH, String SimulName, int n, CalculateTFrameParallel T, int NMAX, double Tenv) {
        EscreveMinAvMaxT(PATH, n, NMAX, Tenv);
    }

    public void Save(String PATH, String SimulName, int n, CalculateEHFrameParallel EHF) {
        if (n == 0) {
            String Name = new String(SimulName);
            EHF.save3dm(Name, PATH);
            EHF.saveDat(Name, PATH);
            EHF.save3df(Name, PATH);
        }
        EscreveArquivo2D(PATH, n);
    }

    public void EscreveArquivo2D(String PATH, int n) {
        EscreveE(PATH, n);
        EscreveH(PATH, n, false);
    }

    public void EscreveArquivo2DT(String PATH, int n) {
        EscreveT(PATH, n);
    }

    public void EscreveE(String PATH, int n) {

        String nomeArqE = new String("" + PATH + "/results/E" + "N" + n);
        //System.out.println("** Field::Save:: Gravando arquivo = "+nomeArqE);
        try {

            FileWriter outputFileWriterE = new FileWriter(nomeArqE);
            PrintWriter outputWriterE = new PrintWriter(outputFileWriterE);
            int SX = tx;
            int SY = ty;
            int SZ = tz;
            //1o ponto : 1,1,1 =
            for (int i = 1; i < SX; i += 2) {
                for (int j = 1; j < SY; j += 2) {
                    for (int k = 1; k < SZ; k += 2) {
                        double Ex, Ey, Ez, valueE;

                        //Teste 7: 27 de Maio de 2010
                        // Fazendo a media dos pontos
                        // Referencia: Atef Elsherbeni - FDTD with Matlab
                        //             pagina 126 Fig.4.13a
                        boolean Eaverage = true;
                        if (Eaverage){
                            double e1=0, e2=0, e3=0, e4=0;
                            e1 = data(i, j - 1, k - 1);//1,0,0
                             e2 = data(i, j + 1, k - 1);//1,0,0
                              e3 = data(i, j - 1, k + 1);//1,0,0
                               e4 = data(i, j + 1, k + 1);//1,0,0
                            Ex = (e1+e2+e3+e4)/4; //1,0,0

                            e1 = data(i - 1, j, k - 1); //0,1,0
                            e2 = data(i - 1, j, k + 1); //0,1,0
                            e3 = data(i + 1, j, k - 1); //0,1,0
                            e4 = data(i + 1, j, k + 1); //0,1,0
                                  Ey = (e1+e2+e3+e4)/4; //0,1,0

                             e1 = data(i - 1, j - 1, k); //0,0,1;
                             e2 = data(i - 1, j + 1, k); //0,0,1;
                             e3 = data(i + 1, j - 1, k); //0,0,1;
                             e4 = data(i + 1, j + 1, k); //0,0,1;

                                  Ez = (e1+e2+e3+e4)/4; //0,0,1

                        }
                            else
                            {
                                  Ex = data(i, j - 1, k - 1); //1,0,0
                                  Ey = data(i - 1, j, k - 1); //0,1,0
                                  Ez = data(i - 1, j - 1, k); //0,0,1
                            }

                      valueE = Math.sqrt(Ex * Ex + Ey * Ey + Ez * Ez);
                        //valueE = Ex;
                        outputWriterE.print(valueE + " ");
                    //System.out.println(""+valueE);
                    }
                }
                outputWriterE.print("\n");
            }
            outputFileWriterE.close();
            outputWriterE.close();
        } catch (IOException e) {

            System.out.println("** Field::EscreveArquivo2D::IOException:");
            e.printStackTrace();

        }
    }

    public void EscreveH(String PATH, int n, boolean writeH) {
        if (writeH){
            try {
            String nomeArqH = new String("" + PATH + "/results/H" + "N" + n);
            //System.out.println("** Field::Save:: Gravando arquivo = "+nomeArqH);
            FileWriter outputH;
            FileWriter outputFileWriterH = new FileWriter(nomeArqH);
            PrintWriter outputWriterH = new PrintWriter(outputFileWriterH);
            int SX = tx;
            int SY = ty;
            int SZ = tz;
            for (int i = 1; i < SX; i += 2) {
                for (int j = 1; j < SY; j += 2) {
                    for (int k = 1; k < SZ; k += 2) {
                        double Hx, Hy, Hz, valueH;
                        Hx = data(i - 1, j, k); //0,1,1
                        Hy = data(i, j - 1, k); //1,0,1
                        Hz = data(i, j, k - 1); //1,1,0
                        valueH = Math.sqrt(Hx * Hx + Hy * Hy + Hz * Hz);
                        outputWriterH.print(valueH + " ");
                    }
                }
                outputWriterH.print("\n");
            }

            outputFileWriterH.close();
            outputWriterH.close();
        } catch (IOException e) {

            System.out.println("** Field::EscreveArquivo2D::IOException:");
            e.printStackTrace();

        }
        }
    }

    public void EscreveT(String PATH, int n) {
        try {
            String nomeArqT = new String("" + PATH + "/results/T" + "N" + n);
            System.out.println("** Field::Save:: Gravando arquivo = " + nomeArqT);

            outputFileWriterT = new FileWriter(nomeArqT);
            outputWriterT = new PrintWriter(outputFileWriterT);
            int SX = tx;
            int SY = ty;
            int SZ = tz;
            int xi = 0, yi = 0, zi = 0;
            int xf = SX, yf = SY, zf = SZ;
            int step = 1;
            for (int i = xi; i < xf; i += step) {
                for (int j = yi; j < yf; j += step) {
                    for (int k = zi; k < zf; k += step) {
                        double valueT;
                        valueT = data(i, j, k);
                        outputWriterT.print(valueT + " ");
                    }
                }
                outputWriterT.print("\n");
            }

            outputFileWriterT.close();
            outputWriterT.close();
        } catch (IOException e) {

            System.out.println("** Field::EscreveArquivo2DT::IOException:");
            e.printStackTrace();

        }

    }

    public void EscreveMinAvMaxT(String PATH, int n, int NMAX, double Tenv) {
        try {
            if (n == 0) {
                String nomeArqT = new String("" + PATH + "/results/TMinAvMax.txt");
                System.out.println("** Field::Save:: Gravando arquivo = " + nomeArqT);
                outputFileWriterT = new FileWriter(nomeArqT);
                outputWriterT = new PrintWriter(outputFileWriterT);
                outputWriterT.print(NMAX + "\n");
            }

            int SX = tx;
            int SY = ty;
            int SZ = tz;
            int xi = 0, yi = 0, zi = 0;
            int xf = SX, yf = SY, zf = SZ;
            int step = 1;

            double valueMax = 0;
            double valueAvg = 0;
            int ncubes = 0;
            double valueMin = 1e100;
            for (int i = xi; i < xf; i += step) {
                for (int j = yi; j < yf; j += step) {
                    for (int k = zi; k < zf; k += step) {
                        double valueT = data(i, j, k);
                        if (valueT != Tenv) {
                            if (valueT > valueMax) {
                                valueMax = valueT;
                            }
                            if (valueT < valueMin) {
                                valueMin = valueT;
                            }
                            valueAvg += valueT;
                            ncubes++;
                        }
                    }
                }
            }
            outputWriterT.print(valueMin + " ");
            valueAvg = valueAvg / ncubes;
            outputWriterT.print(valueAvg + " ");
            outputWriterT.print(valueMax + " ");
            outputWriterT.print("\n");

            if (n == NMAX - 1) {
                outputFileWriterT.close();
                outputWriterT.close();
            }
        } catch (IOException e) {

            System.out.println("** Field::EscreveArquivo2DT::IOException:");
            e.printStackTrace();

        }

    }

    static public void Refresh(Field[] A) {
        /**
         * for (int i=0; i< A[0].tx; i++){
         * for (int j=0; j<A[0].ty; j++){
         * for (int k=0; k<A[0].tz; k++){
         * A[2].data(i,j,k,A[1].data(i,j,k));
         * A[1].data(i,j,k,A[0].data(i,j,k));
         * }
         * }
         * }
         **/
        A[2].setData(A[1].getData(), true);
        A[1].setData(A[0].getData(), true);
    }

    static public void Refresh(int txi, int txf, int tyi, int tyf, int tzi, int tzf, Field[] A) {
        for (int i = txi; i < txf; i++) {
            for (int j = tyi; j < tyf; j++) {
                for (int k = tzi; k < tzf; k++) {
                    A[2].data(i, j, k, A[1].data(i, j, k));
                    A[1].data(i, j, k, A[0].data(i, j, k));
                }
            }
        }
    }

    static public void RefreshT(int txi, int txf, int tyi, int tyf, int tzi, int tzf, Field[] A) {
        for (int i = txi; i < txf; i++) {
            for (int j = tyi; j < tyf; j++) {
                for (int k = tzi; k < tzf; k++) {
                    A[1].data(i, j, k, A[0].data(i, j, k));
                }
            }
        }

    }

    static public boolean isHx(int i, int j, int k) {
        if (Limite.par(i) & Limite.impar(j) & Limite.impar(k)) {
            return true;
        } else {
            return false;
        }
    }

    static public boolean isHy(int i, int j, int k) {
        if (Limite.impar(i) & Limite.par(j) & Limite.impar(k)) {
            return true;
        } else {
            return false;
        }
    }

    static public boolean isHz(int i, int j, int k) {
        if (Limite.impar(i) & Limite.impar(j) & Limite.par(k)) {
            return true;
        } else {
            return false;
        }
    }

    static public boolean isH(int i, int j, int k) {
        if (isHx(i, j, k) | isHy(i, j, k) | isHz(i, j, k)) {
            return true;
        } else {
            return false;
        }
    }

    static public boolean isEx(int i, int j, int k) {
        if (Limite.impar(i) & Limite.par(j) & Limite.par(k)) {
            return true;
        } else {
            return false;
        }
    }

    static public boolean isEy(int i, int j, int k) {
        if (Limite.par(i) & Limite.impar(j) & Limite.par(k)) {
            return true;
        } else {
            return false;
        }
    }

    static public boolean isEz(int i, int j, int k) {
        if (Limite.par(i) & Limite.par(j) & Limite.impar(k)) {
            return true;
        } else {
            return false;
        }
    }

    static public boolean isE(int i, int j, int k) {
        if (isEx(i, j, k) | isEy(i, j, k) | isEz(i, j, k)) {
            return true;
        } else {
            return false;
        }
    }

    static public void alocateField(Field[] F, int x, int y, int z, String name) {
        F = new Field[3];
        try {
            for (int tam = 0; tam < F.length; tam++) {
                F[tam] = new Field(x, y, z, name,true);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

    }
}
