/*
 * Model.java
 *
 * Created on 14 de Setembro de 2005, 17:41
 */

/**
 *
 * @author juliano
 */
public class Model {

    private String Name;
    // private byte[][][] Data;
    private byte[] data;
    private int sizeData;
    protected int n0,  n1,  n2;
    protected int w0,  w1,  w2,  w3;
    private int GridSizeX;
    private int GridSizeY;
    private int GridSizeZ;
    private double DX,  DY,  DZ;

    public String name() {
        return Name;
    }

    public int x() {
        return GridSizeX;
    }

    public int y() {
        return GridSizeY;
    }

    public int z() {
        return GridSizeZ;
    }

    public double dx() {
        return DX;
    }

    public double dy() {
        return DY;
    }

    public double dz() {
        return DZ;
    }

    /** Creates a new instance of Model */
    public Model(String name, int n, int m, int l, double dx, double dy, double dz) {
        Name = name;
        sizeData = n * m;
        if (sizeData > Integer.MAX_VALUE) {
            throw new OutOfMemoryError();
        }
        sizeData = sizeData * l;
        if (sizeData > Integer.MAX_VALUE) {
            throw new OutOfMemoryError();
        }
        try {
            data = new byte[sizeData];
        } catch (Exception e) {
            e.printStackTrace();
        }
        n0 = n;
        n1 = m;
        n2 = l;
        w0 = m * l;
        w1 = l;
        w2 = 1;
        w3 = 0;

        GridSizeX = n;
        GridSizeY = m;
        GridSizeZ = l;

        if (dx > 0) {
            DX = dx;
        } else {
            System.out.println("*** Tamanho DX < 0!!! Assumindo = 1!!!");
            DX = 1.0f;
        }
        if (dy > 0) {
            DY = dy;
        } else {
            System.out.println("*** Tamanho DY < 0!!! Assumindo = 1!!!");
            DY = 1.0f;
        }
        if (dz > 0) {
            DZ = dz;
        } else {
            System.out.println("*** Tamanho DZ < 0!!! Assumindo = 1!!!");
            DZ = 1.0f;
        }

    }

    public void setData(int i, int j, int k, byte v) {
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

    public void setData(byte[] d, boolean inplace) {
        if (inplace) {
            data = d;
        } else {
            if (d.length == sizeData) {
                data = new byte[sizeData];
                for (int i = 0; i < sizeData; i++) {
                    data[i] = d[i];
                }
            } else {
                throw new RuntimeException(" ERRO NA ALOCACAO DOS DADOS NO FIELD!! TAMANHOS DIFERENTES!!");
            }
        }

    }

    public void setData(byte[][][] d) {
        if ((d.length * d[0].length * d[0][0].length) == sizeData) {
            data = new byte[sizeData];
            int count = 0;

            //CONFERIDO COM JU
            int tx = d.length;
            int ty = d[0].length;
            int tz = d[0][0].length;

            for (int i = 0; i < tx; i++) {
                for (int j = 0; j < ty; j++) {
                    for (int k = 0; k < tz; k++) {
                        data[count] = d[i][j][k];
                        count++;
                    }
                }
            }
        } else {
            throw new RuntimeException(" ERRO NA ALOCACAO DOS DADOS NO FIELD!! TAMANHOS DIFERENTES!!");
        }
    }

    public int getSizeData() {
        return this.sizeData;
    }

    public byte[] getData() {
        return data;
    }

    public byte getData(int i, int j, int k) {
        //return (getData(i,j,k));
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

    public void copy(Model m2) {
        /**this.Name = Name;
         * this.DX = DX;
         * this.DY = DY;
         * this.DZ = DZ;
         * this.GridSizeX = GridSizeX;
         * this.GridSizeY = GridSizeY;
         * this.GridSizeZ = GridSizeZ;
         *
         * data = new byte[GridSizeX][GridSizeY][GridSizeZ];
         * for (int i=0; i<GridSizeX; i++){
         * for (int j=0; j<GridSizeY; j++){
         * for (int k=0; k<GridSizeZ; k++){
         * getData(i,j,k) = getData(i,j,k);
         * }
         * }
         * }**/
        this.Name = m2.Name;
        this.sizeData = m2.sizeData;
        if (sizeData > Integer.MAX_VALUE) {
            throw new OutOfMemoryError();
        }
        try {
            this.data = new byte[sizeData];
        } catch (Exception e) {
            e.printStackTrace();
        }
        n0 = m2.n0;
        n1 = m2.n1;
        n2 = m2.n2;
        w0 = m2.w0;
        w1 = m2.w1;
        w2 = m2.w2;
        w3 = m2.w3;

        GridSizeX = m2.GridSizeX;
        GridSizeY = m2.GridSizeY;
        GridSizeZ = m2.GridSizeZ;

        DX = m2.DX;
        DY = m2.DY;
        DZ = m2.DZ;
        for (int k = 0; k < sizeData; k++) {
            this.data[k] = m2.data[k];

        }
    }

    public void redux() {
        int SX = this.GridSizeX;
        int SY = this.GridSizeY;
        int SZ = this.GridSizeZ;
        int newGridSizeX = ((this.GridSizeX - 1) / 2);
        int newGridSizeY = ((this.GridSizeY - 1) / 2);
        int newGridSizeZ = ((this.GridSizeZ - 1) / 2);

        byte[][][] tempData;
        tempData = new byte[newGridSizeX][newGridSizeY][newGridSizeZ];

        int ci = 0, cj = 0, ck = 0;
        try {
            for (int i = 1; i < SX - 1; i = i + 2) {
                for (int j = 1; j < SY - 1; j = j + 2) {
                    for (int k = 1; k < SZ - 1; k = k + 2) {
                        tempData[ci][cj][ck] = getData(i, j, k);
                        ck++;
                    }
                    ck = 0;
                    cj++;
                }
                ck = 0;
                cj = 0;
                ci++;
            }
            this.GridSizeX = newGridSizeX;
            this.GridSizeY = newGridSizeY;
            this.GridSizeZ = newGridSizeZ;

            int n = newGridSizeX;
            int m = newGridSizeY;
            int l = newGridSizeZ;
            sizeData = n * m;
            if (sizeData > Integer.MAX_VALUE) {
                throw new OutOfMemoryError();
            }
            sizeData = sizeData * l;
            if (sizeData > Integer.MAX_VALUE) {
                throw new OutOfMemoryError();
            }
            try {
                data = new byte[sizeData];
            } catch (Exception e) {
                e.printStackTrace();
            }
            n0 = n;
            n1 = m;
            n2 = l;
            w0 = m * l;
            w1 = l;
            w2 = 1;
            w3 = 0;

            setData(tempData);
        } catch (Exception e) {
            System.out.println("** Model::redux():: ERROR - ");
            e.printStackTrace();
        }
    }

    public void expand() {
        int SX = this.GridSizeX;
        int SY = this.GridSizeY;
        int SZ = this.GridSizeZ;
        this.GridSizeX = (this.GridSizeX * 2 + 1);
        this.GridSizeY = (this.GridSizeY * 2 + 1);
        this.GridSizeZ = (this.GridSizeZ * 2 + 1);

        byte[][][] tempData;
        tempData = new byte[GridSizeX][GridSizeY][GridSizeZ];

        try {
            for (int i = 0; i < SX; i++) {
                for (int j = 0; j < SY; j++) {
                    for (int k = 0; k < SZ; k++) {
                        // 27 pontos //
                        tempData[i * 2][j * 2][k * 2] = getData(i, j, k);//1

                        tempData[i * 2 + 1][j * 2][k * 2] = getData(i, j, k);//2

                        tempData[i * 2 + 2][j * 2][k * 2] = getData(i, j, k);//3

                        tempData[i * 2][j * 2 + 1][k * 2] = getData(i, j, k);//4

                        tempData[i * 2][j * 2 + 2][k * 2] = getData(i, j, k);//5

                        tempData[i * 2][j * 2][k * 2 + 1] = getData(i, j, k);//6

                        tempData[i * 2][j * 2][k * 2 + 2] = getData(i, j, k);//7

                        tempData[i * 2][j * 2 + 1][k * 2 + 1] = getData(i, j, k);//8

                        tempData[i * 2][j * 2 + 2][k * 2 + 1] = getData(i, j, k);//9

                        tempData[i * 2][j * 2 + 1][k * 2 + 2] = getData(i, j, k);//10

                        tempData[i * 2][j * 2 + 2][k * 2 + 2] = getData(i, j, k);//11

                        tempData[i * 2 + 1][j * 2][k * 2 + 1] = getData(i, j, k);//12

                        tempData[i * 2 + 2][j * 2][k * 2 + 1] = getData(i, j, k);//13

                        tempData[i * 2 + 1][j * 2][k * 2 + 2] = getData(i, j, k);//14

                        tempData[i * 2 + 2][j * 2][k * 2 + 2] = getData(i, j, k);//15

                        tempData[i * 2 + 1][j * 2 + 1][k * 2] = getData(i, j, k);//16

                        tempData[i * 2 + 2][j * 2 + 1][k * 2] = getData(i, j, k);//17

                        tempData[i * 2 + 1][j * 2 + 2][k * 2] = getData(i, j, k);//18

                        tempData[i * 2 + 2][j * 2 + 2][k * 2] = getData(i, j, k);//19

                        tempData[i * 2 + 1][j * 2 + 1][k * 2 + 1] = getData(i, j, k);//20

                        tempData[i * 2 + 2][j * 2 + 1][k * 2 + 1] = getData(i, j, k);//21

                        tempData[i * 2 + 1][j * 2 + 2][k * 2 + 1] = getData(i, j, k);//22

                        tempData[i * 2 + 1][j * 2 + 1][k * 2 + 2] = getData(i, j, k);//23

                        tempData[i * 2 + 2][j * 2 + 2][k * 2 + 1] = getData(i, j, k);//24

                        tempData[i * 2 + 2][j * 2 + 1][k * 2 + 2] = getData(i, j, k);//25

                        tempData[i * 2 + 1][j * 2 + 2][k * 2 + 2] = getData(i, j, k);//26

                        tempData[i * 2 + 2][j * 2 + 2][k * 2 + 2] = getData(i, j, k);//27

                    //System.out.println("*** Model::expand() nao esta implementado!!");
                    }
                }
            }
            int n = GridSizeX;
            int m = GridSizeY;
            int l = GridSizeZ;
            sizeData = n * m;
            if (sizeData > Integer.MAX_VALUE) {
                throw new OutOfMemoryError();
            }
            sizeData = sizeData * l;
            if (sizeData > Integer.MAX_VALUE) {
                throw new OutOfMemoryError();
            }
            try {
                data = new byte[sizeData];
            } catch (Exception e) {
                e.printStackTrace();
            }
            n0 = n;
            n1 = m;
            n2 = l;
            w0 = m * l;
            w1 = l;
            w2 = 1;
            w3 = 0;

            setData(tempData);
        } catch (Exception e) {
            System.out.println("** Model::expand():: ERROR - ");
            e.printStackTrace();
        }
    }

    public void printModel(boolean print) {
        if (print) {
            System.out.println(" MODELO : ");
            for (int i = 0; i < this.GridSizeX; i++) {
                for (int j = 0; j < this.GridSizeY; j++) {
                    for (int k = 0; k < this.GridSizeZ; k++) {
                        System.out.print(" " + getData(i, j, k));
                    }
                    System.out.println("");
                }
                System.out.println("");
            }
        }
    }

    public void printMaterial(boolean print) {
        
        if (print) {
            System.out.println("*** Model::printMaterial():: FOUND MATERIAL IN POINTS : ");
            for (int i = 0; i < this.GridSizeX; i++) {
                for (int j = 0; j < this.GridSizeY; j++) {
                    for (int k = 0; k < this.GridSizeZ; k++) {
                        if (getData(i, j, k) !=1) {
                            System.out.print("P [ " + i + "," + j + "," + k + "] = "+getData(i,j,k));
                            System.out.println("");
                        }
                        

                    }
                }
            }
        }
    }
    
    public void printOneMaterial(boolean print, int m) {
        
        if (print) {
            System.out.println("*** Model::printMaterial():: FOUND MATERIAL IN POINTS : ");
            for (int i = 0; i < this.GridSizeX; i++) {
                for (int j = 0; j < this.GridSizeY; j++) {
                    for (int k = 0; k < this.GridSizeZ; k++) {
                        if (getData(i, j, k) == m) {
                            System.out.print("P [ " + i + "," + j + "," + k + "] = "+getData(i,j,k));
                            System.out.println("");
                        }
                        

                    }
                }
            }
        }
    }
}
