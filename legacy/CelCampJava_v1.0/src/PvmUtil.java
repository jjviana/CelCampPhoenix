/*
 * PvmUtil.java
 *
 * Created on 12 de Maio de 2006, 16:04
 */

/**
 *
 * @author Ana de Oliveira Rodrigues
 */

import java.io.FileOutputStream;
import java.io.PrintStream;
import jpvm.*;
import java.awt.Color;


public class PvmUtil {
    
    
    //static int tag = 999;
    
    /** Creates a new instance of PvmUtil */
    public PvmUtil() {
    }
    
    public static void packColor(jpvmBuffer buf, Color c)throws jpvmException{
        buf.pack(c.getRed());
        buf.pack(c.getGreen());
        buf.pack(c.getBlue());
    }
    public static Color unpackColor(jpvmBuffer buf) throws jpvmException{
        int red = buf.upkint();
        int green = buf.upkint();
        int blue = buf.upkint();
        Color Cor = new Color(red, green, blue);
        return Cor;
    }
    
    public static void packPhysicalProp(jpvmBuffer buf, Material mat) throws jpvmException {
        buf.pack(mat.name());
        buf.pack(mat.code());
        buf.pack(mat.density());
        buf.pack(mat.nfreq());
        for (int ff=0; ff<mat.nfreq(); ff++)
            buf.pack(mat.freq(ff));
    }
    public static void packVisualProp(jpvmBuffer buf, Material mat) throws jpvmException {
        packColor(buf, mat.color());
        buf.pack(mat.transp());
        int visi;
        if (mat.visible()) visi=0;
        else visi=1;
        buf.pack(visi);
    }
    public static void packEHProp(jpvmBuffer buf, Material mat) throws jpvmException {
        for (int ff=0; ff<mat.nfreq(); ff++){
            buf.pack(mat.mu(ff));
            buf.pack(mat.ep(ff));
            buf.pack(mat.si(ff));
            buf.pack(mat.siC(ff));
        }
        
    }
    public static void packTProp(jpvmBuffer buf, Material mat) throws jpvmException {
        buf.pack(mat.C());
        buf.pack(mat.K());
        buf.pack(mat.Bf());
        buf.pack(mat.Hm());
        buf.pack(mat.Kevap());
        buf.pack(mat.Emissivity());
        
    }
    
    public static void sendMaterials(jpvmEnvironment jpvmE, jpvmTaskId[] tids, Material[] Mat, int FreqIndex, int ThisTag) throws jpvmException{
        jpvmBuffer buf = new jpvmBuffer();
        int NMat = Mat.length;
        buf.pack(FreqIndex);
        buf.pack(NMat);
        for (int m=0; m<NMat; m++){
            //System.out.println("   ** Master empacotando Material "+Mat[m].name());
            Material mat = Mat[m];
            
            packPhysicalProp(buf, mat);
            
            packVisualProp(buf, mat);
            packEHProp(buf, mat);
            packTProp(buf, mat);
            
        }
        for (int i=0;i<tids.length; i++) {
            jpvmE.pvm_send(buf, tids[i], ThisTag);
        }
    }
    public static Material[] receiveMaterials(jpvmEnvironment jpvmE, int FreqIndex, int ThisTag) throws jpvmException {
        jpvmMessage message = jpvmE.pvm_recv(ThisTag);
        jpvmBuffer buf = message.buffer;
        FreqIndex = buf.upkint();
        int NMat = buf.upkint();
        Material[] Mat = new Material[NMat];
        
        for (int m=0; m<NMat; m++){
            String[] name = new String[1];
            name[0] = buf.upkstr();
            int code =  buf.upkint();
            double dens = buf.upkdouble();
            int nfreq = buf.upkint();
            double[] f = new double[nfreq];
            for (int ff=0; ff<nfreq; ff++) f[ff] = buf.upkdouble();
            
            Color cor = unpackColor(buf);
            double trans = buf.upkdouble();
            int visi = buf.upkint();
            boolean visible;
            if (visi == 0) visible = false;
            else visible = true;
            double[] mu = new double[nfreq];  double[] ep = new double[nfreq];
            double[] si = new double[nfreq];  double[] siC = new double[nfreq];
            for (int ff=0; ff<nfreq; ff++){
                mu[ff] = buf.upkdouble();
                ep[ff] = buf.upkdouble();
                si[ff] = buf.upkdouble();
                siC[ff] = buf.upkdouble();
            }
            
            double C, K, Bf, Hm, Kevap, Evap;
            C = buf.upkdouble();
            K = buf.upkdouble();
            Bf = buf.upkdouble();
            Hm = buf.upkdouble();
            Kevap = buf.upkdouble();
            Evap = buf.upkdouble();
            
            Mat[m] = new Material(name, code, dens, nfreq, f, cor, trans, visible, mu, ep, si, siC, C, K, Bf, Hm, Kevap, Evap);
            //Mat[m] = new Material();
        }
        
        return Mat;
    }
    
    
    public static void sendSource(jpvmEnvironment jpvmE, jpvmTaskId[] tids, Source S, int ThisTag){
        try{
            String Type = S.getType();
            int[] Location = S.getLocation();
            double MaxValue = S.getMaxValue();
            double[] f = S.getF();
            String Unit = S.getUnit();
            boolean HardSource = S.isHard();
            int Hard;
            if (HardSource) Hard = 1;
            else            Hard = 0;
            
            jpvmBuffer buf = new jpvmBuffer();
            buf.pack(Type);
            buf.pack(Location.length);
            buf.pack(Location, Location.length, 1);
            buf.pack(MaxValue);
            buf.pack(f.length);
            buf.pack(f, f.length, 1);
            buf.pack(Unit);
            buf.pack(Hard);
            
            for (int i=0;i<tids.length; i++) {
                jpvmE.pvm_send(buf, tids[i], ThisTag);
            }
        } catch(jpvmException e){
            e.printStackTrace();
        }
    }
    public static void sendSources(jpvmEnvironment jpvmE, jpvmTaskId[] tids, Source[] S, int ThisTag) throws jpvmException{
        jpvmBuffer buf = new jpvmBuffer();
        int NumberSources = S.length;
        buf.pack(NumberSources);
        
        for (int s=0; s<NumberSources; s++){
            String Type = S[s].getType();
            int[] Location = S[s].getLocation();
            double MaxValue = S[s].getMaxValue();
            double[] f = S[s].getF();
            String Unit = S[s].getUnit();
            boolean HardSource = S[s].isHard();
            int Hard;
            if (HardSource) Hard = 1;
            else            Hard = 0;
            
            buf.pack(Type);
            buf.pack(Location.length);
            buf.pack(Location, Location.length, 1);
            buf.pack(MaxValue);
            buf.pack(f.length);
            buf.pack(f, f.length, 1);
            buf.pack(Unit);
            buf.pack(Hard);
        }
        for (int i=0;i<tids.length; i++) {
            jpvmE.pvm_send(buf, tids[i], ThisTag);
        }
    }
    public static Source receiveSource(jpvmEnvironment jpvmE, int ThisTag) throws jpvmException {
        jpvmMessage message = jpvmE.pvm_recv(ThisTag);
        jpvmBuffer buf = message.buffer;
        String Type = buf.upkstr();
        int sizeLocation = buf.upkint();
        int[] Location = new int[sizeLocation];
        buf.unpack(Location, 3, 1);
        double MaxValue = buf.upkdouble();
        int sizeF = buf.upkint();
        double[] f = new double[sizeF];
        buf.unpack(f,sizeF,1);
        String Unit = buf.upkstr();
        int Hard = buf.upkint();
        boolean HardSource;
        if (Hard==1)
            HardSource = true;
        else
            HardSource = false;
        Source S = new Source(Type, Location, MaxValue, f, Unit, HardSource);
        return S;
    }
    public static Source[] receiveSources(jpvmEnvironment jpvmE, int ThisTag) throws jpvmException {
        jpvmMessage message = jpvmE.pvm_recv(ThisTag);
        jpvmBuffer buf = message.buffer;
        int NumberSources = buf.upkint();
        Source[] S = new Source[NumberSources];
        
        for (int s=0; s<NumberSources; s++){
            String Type = buf.upkstr();
            int sizeLocation = buf.upkint();
            int[] Location = new int[sizeLocation];
            buf.unpack(Location, 3, 1);
            double MaxValue = buf.upkdouble();
            int sizeF = buf.upkint();
            double[] f = new double[sizeF];
            buf.unpack(f,sizeF,1);
            String Unit = buf.upkstr();
            int Hard = buf.upkint();
            boolean HardSource;
            if (Hard==1)
                HardSource = true;
            else
                HardSource = false;
            S[s] = new Source(Type, Location, MaxValue, f, Unit, HardSource);
        }
        return S;
    }
    
    public static void sendPartialModel(jpvmEnvironment jpvmE, jpvmTaskId tid, jpvmBuffer buf, int Xi, int Xf, int ModelY, int ModelZ, Model M, int tagModel) throws jpvmException{
        int sx = Xf-Xi+1;
        int sy = ModelY;
        int sz = ModelZ;
        int size = sx*sy*sz;
        byte[] partial = new byte[size];
        int count = 0;
        for (int x=Xi; x<=Xf; x++){
            for (int y=0; y<ModelY; y++){
                for (int z=0; z<ModelZ; z++){
                    partial[count] = M.getData(x,y,z);
                    count++;
                }
            }
        }
        buf.pack(partial, size, 1);
        jpvmE.pvm_send(buf, tid, tagModel);
        
        /** ISSO NAO FUNCIONA NESTE CASO!!! em 19/4/2007
        int sizeData = M.getSizeData();
        
        buf.pack(M.getData(),sizeData,1);
        jpvmE.pvm_send(buf, tid, tagModel);
        **/
    }
    
    public static void sendPartialTinit(jpvmEnvironment jpvmE, jpvmTaskId tid, jpvmBuffer buf, int Xi, int Xf, int ModelY, int ModelZ, Field Tinit, int tagModel) throws jpvmException{
        int sx = Xf-Xi+1;
        int sy = ModelY;
        int sz = ModelZ;
        int size = sx*sy*sz;
        double[] partial = new double[size];
        int count = 0;
        for (int x=Xi; x<=Xf; x++){
            for (int y=0; y<ModelY; y++){
                for (int z=0; z<ModelZ; z++){
                    partial[count] = Tinit.data(x,y,z);
                    count++;
                }
            }
        }
        buf.pack(partial, size, 1);
        jpvmE.pvm_send(buf, tid, tagModel);
    }
    
    
    
    public static void unpackPartialModel(jpvmBuffer buf, Model M) throws jpvmException{
        /**
         * for (int x=0; x<ModelX; x++){
                for (int y=0; y<ModelY; y++){
                    for (int z=0; z<ModelZ; z++){
                        byte value = message.buffer.upkbyte();
                        ModeloLocal.setData(x,y,z,value);
                    }
                }
            }
         **/
        
        int sizeData = M.getSizeData();
        byte [] model = new byte[sizeData];
        buf.unpack(model,sizeData,1);
        M.setData(model,true);        
    }
    
     public static void unpackPartialTinit(jpvmBuffer buf, Field Tinit) throws jpvmException{
        int sizeData = Tinit.getSizeData();
        double [] t = new double[sizeData];
        buf.unpack(t,sizeData,1);
        Tinit.setData(t,true);        
    }
    
    
    public static void sendMessageToParent(jpvmEnvironment jpvmE, jpvmTaskId parent, String message, int ThisTag) throws jpvmException {
        jpvmBuffer buf = new jpvmBuffer();
        buf.pack(message);
        jpvmE.pvm_send(buf, parent, ThisTag);
    }
    public static void printMessageFromSlaves(jpvmEnvironment jpvm, jpvmTaskId[] tids, int ThisTag, boolean print) throws jpvmException {
        //System.out.println(" Entrou no printMessageFromSlaves()!");
        int NPROC = tids.length;
        for(int i=0;i<NPROC; i++) {
            //System.out.println(" Recebendo do Slave: Host = "+tids[i].getHost()+", Port = "+tids[i].getPort());
            jpvmMessage message = jpvm.pvm_recv(tids[i], ThisTag);
            String str = message.buffer.upkstr();
            if (print)
                System.out.println("   *** Slave : Host = "+tids[i].getHost()+", Port = "+tids[i].getPort()+" -> "+str);
        }
    }
    public static void printMessageFromSlave(jpvmEnvironment jpvm, jpvmTaskId tid, int ThisTag, boolean print) throws jpvmException {
        jpvmMessage message = jpvm.pvm_recv(tid, ThisTag);
        String str = message.buffer.upkstr();
        if (print)
            System.out.println("   *** Slave : Host = "+tid.getHost()+", Port = "+tid.getPort()+" -> "+str);
        
    }
    
    public static void sendPartialField(jpvmEnvironment jpvmE, jpvmTaskId parent, Field F, int ThisTag) throws jpvmException {
        
        int tx = F.tx; int ty = F.ty;  int tz = F.tz;
        String Type = F.Type;
        
        jpvmBuffer buf = new jpvmBuffer();
        buf.pack(tx);
        buf.pack(ty);
        buf.pack(tz);
        buf.pack(Type);
        buf.pack(F.getData(),tx*ty*tz,1);
        /*
        for (int i=0; i<tx; i++)
            for (int j=0; j<ty; j++)
                for (int k=0; k<tz; k++)
                    buf.pack(F.data(i,j,k));
         
         */
        jpvmE.pvm_send(buf, parent, ThisTag);
        
    }
    
    public static Field receivePartialField(jpvmEnvironment jpvmE, jpvmTaskId c, int ThisTag) throws jpvmException {
        //System.out.println("       ** Entrou em receivePartialField para receber de host="+c.getHost()+", port="+c.getPort()+" a tag = "+ThisTag);
        jpvmMessage message = jpvmE.pvm_recv(c, ThisTag);
        //System.out.println("       ** Recebeu a mensagem de host="+c.getHost()+", port="+c.getPort()+" com tag = "+ThisTag);
        
        jpvmBuffer buf = message.buffer;
        int tx = buf.upkint();
        int ty = buf.upkint();
        int tz = buf.upkint();
        String Type = buf.upkstr();
        
        Field F = new Field(tx, ty, tz, Type);
        int size=tx*ty*tz;
        double[] data=new double[size];
        buf.unpack(data,size,1);
        F.setData(data,true);
        /**
         * for (int i=0; i<tx; i++)
         * for (int j=0; j<ty; j++)
         * for (int k=0; k<tz; k++){
         * F.data(i,j,k,buf.upkdouble());
         * }
         **/
        //System.out.println(" Mater recebeu tx="+tx+", ty="+ty+", tz="+tz+", Type="+Type);
        
        return(F);
    }
    
    
    public static void sendTaskIDNeighbors(jpvmEnvironment jpvm, jpvmTaskId[] tids, int tag) throws jpvmException{
        
        int NPROC = tids.length;
        jpvmTaskId nulo = new jpvmTaskId("0",0);
        
        for (int i=0;i<NPROC; i++) {
            jpvmTaskId Left, Right;
            if (i==0) Left = nulo;
            else      Left = tids[i-1];
            if (i==NPROC-1) Right = nulo;
            else            Right = tids[i+1];
            //System.out.println("  ** Mandando os vizinhos Left = "+Left.getPort()+" e Right = "+Right.getPort()+" para "+tids[i].getPort()+"...");
            
            jpvmBuffer buf = new jpvmBuffer();
            buf.pack(Left); //empacote a TaskId do vizinho da esquerda
            buf.pack(Right); //empacote a TaskId do vizinho da direita
            jpvm.pvm_send(buf,tids[i],tag);//manda a TaskId para o recebedor
        }
        
    }
    
    
    public static void sendBorder(jpvmEnvironment jpvm, Field f, char lr, jpvmTaskId tid, int tag) throws jpvmException{
        jpvmBuffer buf = new jpvmBuffer();
        int teste = 2;
        int tx = f.tx; int ty = f.ty; int tz = f.tz;
        buf.pack(tx);
        buf.pack(ty);
        buf.pack(tz);
        buf.pack(lr);
        
        int i1, i2;
        if (lr=='l') //lado esquerdo
        {i1 = 0;   i2=3;} else //lado direito
        {i1=tx-3;  i2=tx;}
        
        int tamX = 3;
        int tamY = ty;
        int tamZ = tz;
        int tamTempData = tamX*tamY*tamZ;
        double[] tempData = new double[tamTempData];
        int count = 0;
        for (int i=i1; i<i2; i++){
            for (int j=0; j<ty; j++)
                for (int k=0; k<tz; k++){
                    tempData[count] = f.data(i,j,k);
                    count++;
                }
        }
        
        buf.pack(tempData, tamTempData, 1);
        jpvm.pvm_send(buf,tid,tag);//manda a TaskId para o recebedor
        
    }
    
    public static void receiveBorder(jpvmEnvironment jpvm, double[][][] border, jpvmTaskId tid, int tag) throws jpvmException{
        jpvmMessage message = jpvm.pvm_recv(tid, tag);
        int tx = message.buffer.upkint();
        int ty = message.buffer.upkint();
        int tz = message.buffer.upkint();
        char lr = message.buffer.upkchar();
        int tamTempData = 3*ty*tz;
        double [] tempData = new double[tamTempData];
        message.buffer.unpack(tempData, tamTempData, 1);
        int count = 0;
        for (int i=0; i<3; i++){
            for (int j=0; j<ty; j++){
                for (int k=0; k<tz; k++){
                    border[i][j][k] = tempData[count];
                    count++;
                }
            }
        }
        
    }
    
    /** esta funcao foi desenvolvida mas nao sei mais para que...
     * public void sendCase(int num_data, double dt, int max, int NPROC, int i, jpvmTaskId[] tids, double [][][] init, int TX, int TY, int TZ, jpvmEnvironment jpvm){
     * try {
     *
     * int SIZE = TX;
     * jpvmTaskId nula = new jpvmTaskId();
     * jpvmBuffer buf = new jpvmBuffer();
     * //buf.pack("Mandando os dados iniciais de "+mytid);
     * jpvmTaskId TaskLeft, TaskRight;
     * if (i==0)          TaskLeft = nula;   else    TaskLeft = tids[i-1];
     * if (i==(NPROC-1))  TaskRight = nula;  else    TaskRight = tids[i+1];
     * //System.out.println("** TaskLeft = "+TaskLeft);
     * buf.pack(TaskLeft);
     * //System.out.println("** TaskRight = "+TaskRight);
     * buf.pack(TaskRight);
     * buf.pack(max);
     * double deltax2 = (dt/Math.pow(1.0/(double)SIZE,2.0));
     * buf.pack(deltax2);
     * buf.pack(i);
     * buf.pack(NPROC);
     * buf.pack(num_data);
     * for (int x=0; x<num_data; x++)
     * for (int y=0; y<TY; y++)
     * buf.pack(init[x][y],TZ,1);
     *
     * //FALTA PEGAR ISTO NO SLAVE!!!
     * jpvm.pvm_send(buf,tids[i],333);
     *
     * } catch (jpvmException jpe) {
     * System.out.println("Error - jpvm exception");
     * System.out.println(jpe.toString());
     * }
     * }
     **/
    
    
    public static void logError( jpvmTaskId myself,String message,Throwable e) {
        try {
               String logfile=("ERROR:"+myself.getHost()+":"+myself.getPort()+".log");
                FileOutputStream out=new FileOutputStream(logfile);
                PrintStream print=new PrintStream(out);
                print.println(message);
                if (e!=null)
                    e.printStackTrace(print);
        }
        catch(Exception e2) {
            throw new RuntimeException(e2);
        }
                
    }
    
    public static void packBoolean(jpvmBuffer buf, boolean b) throws jpvmException{
        int valor = 0;
        if (b) valor = 1;
        else   valor = 0;
        buf.pack(valor);
    }
    
    public static boolean unpackBoolean(jpvmBuffer buf) throws jpvmException{
        boolean b = false;
        int valor = buf.upkint();
        if (valor ==0) b = false;
        else           b = true;
        return b;
    }
}
