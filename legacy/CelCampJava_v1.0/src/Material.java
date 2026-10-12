/*
 * Material.java
 *
 * Created on 13 de Setembro de 2005, 17:40
 */

/**
 *
 * @author juliano
 */
import java.awt.Color;

public class Material {
    
    /** 
     * Static Properties
     */
    static double mu0 = 4*Math.PI*1e-7; //vacum mu 
    static double ep0 = 8.854e-12; //vacum ep
    static double Tb = 36.8; //blood temperature inside the tissue [oC]
    static public double mu0() {        return mu0;    }
    static public double ep0() {        return ep0;    }
    static public double Tb() {        return Tb;    }
    static public double cc() { return (1/(Math.sqrt(mu0*ep0)));}
    /** 
     * Physical Properties 
    **/
    private String[] name;
    private int nlang=2;
    private int code;
    private double density; //density [kg/m3]
    
    /** 
     * Visual Properties 
    **/
    private Color color;
    private double transp;
    private boolean visible;
    
    /** 
     * Electromagnetic Properties 
    **/
    private int nfreq;
    private double[] freq; //frequency [Hz]
    private double[] mu; //mu = magnetic permeability [H/m]
    private double[] ep; //epsilon = electric permissivity [F/m]
    private double[] si; //sigma = conductivity
    private double[] siC; //sigma complex = for PML Boundary Conditions
    private double[] v; // velocity = 1/(Math.sqrt(mu*ep))
        
    /** 
     * Thermal Properties 
    **/
    private double C; //specific heat [W.h/(oC.kg)]
    private double K; //thermal condutivity [W/(oC.m)]
    private double Bf; //blood flow in the tissue [kg/(m3.h)]
    private double Hm; //metabolic heat generation [W/m3]
    private double Kevap; //evaporation constant [W/(m2.mmHg)]
    private double E; //proportional emissivity constant [-]
    
    //private double hem; //electromagnetic heat generation [W/m3]
    //private double hrad; //radiation heat loss[W]
    //private double hevap; //evaporation heat loss[W]
    //private double hconv; //convection heat loss[W]
    
    /** 
     * Public Get functions
    **/
    public String[] getName(){return name;}
    public String name(){return name[0];}
    public String name(int i){ return name[i];}
    public double density(){return density;}
    public int code(){return code;}
    public Color color(){return color;}
    public double transp(){return transp;}
    public boolean visible(){return visible;}
    public int nfreq(){return nfreq;}
    public double freq(int i){return freq[i];}
    public double mu(int i){ return mu[i];}
    public double ep(int i){ return ep[i];}
    public double si(int i){ return si[i];}
    public double siC(int i){ return siC[i];}
    public double velocity(int i){ return v[i];}
    public double muR(int i){return (double)(mu[i]/mu0);}
    public double epR(int i){return (double)(ep[i]/ep0);}
    public double C() {        return C;    }
    public double K() {        return K;    }
    public double Bf() {        return Bf;    }
    public double Hm() {        return Hm;    }
    public double Kevap(){      return Kevap; }
    public double Emissivity(){          return E;}
        
    /** 
     * Public Set Methods
    **/
    public void setC(double c) {        this.C = c;    }
    public void setK(double k) {        this.K = k;    }
    public void setBf(double bf) {        this.Bf = bf;    }
    public void setHm(double hm) {        this.Hm = hm;    }
    public void setKevap(double Kevap) {        this.Kevap = Kevap;    }
    public void setEmissivity(double E) {        this.E = E;    }
    
 
    public void SetPhysicalParam(String[] n, int c, double d){
    name = n;
    code = c;
    density = d;        
    }
    
    public void SetVisualParam(Color cl, double t, boolean v){
    color = cl;
        transp = t;
        visible = v;
            
    }
        
    public void SetEMParam(int nf, double [] f, double[] m, double[] e, double[] s, double[] sC) {
        nfreq = nf;
        freq = f;
        mu = new double[nfreq];
        ep = new double[nfreq];
        for (int i=0; i<nfreq; i++){
            mu[i] = m[i];
            ep[i] = e[i];
       }
        si = s;
        siC = sC;
        nfreq = mu.length;
        v = new double[nfreq];
        for (int i=0; i<nfreq; i++)
            v[i] = 1/(Math.sqrt(mu[i]*ep[i]));
    }
    public void SetEMParamRelat(int nf, double[] f, double[] mR, double[] eR, double[] s, double [] sC) {
        nfreq = nf;
        freq = f;
        mu = new double[nfreq];
        ep = new double[nfreq];
        for (int i=0; i<nfreq; i++){
            mu[i] = mR[i]*mu0;
            ep[i] = eR[i]*ep0;
        }
        si = s;
        siC = sC;
        v = new double[nfreq];
        for (int i=0; i<nfreq; i++)
        {
            //System.out.println("*** Material.java::SetEMParamRelat:: M0 = "+mu0+"  EP0 = "+ep0);
            //System.out.println("*** Material.java::SetEMParamRelat:: Do vacuo = "+1/(Math.sqrt(mu0*ep0)));
            if (si[i]==0.0)
                v[i] = 1/(Math.sqrt(mu[i]*ep[i]));
            else{
                double w = 2*Math.PI*freq[i];
                double beta=1;
                if (si[i]>10) // bons condutores
                    beta = Math.sqrt(Math.PI*freq[i]*mu[i]*si[i]);
                else //dieletricos com perdas
                {    
                    double tgTeta = si[i]/(w*ep[i]);
                    beta = w*Math.sqrt(mu[i]*ep[i]/2)*Math.sqrt(Math.sqrt(1+tgTeta*tgTeta)-1);
                }
                v[i] = w/beta;
            }
            //System.out.println("*** Material.java::SetEMParamRelat:: Material "+this.name[0]+" : velocidade = "+ v[i]);
        }
    }

    public void SetTParam(double C, double K, double BF, double HM, double KEVAP, double E){
        this.C = C; this.K=K; this.Bf = BF; this.Hm = HM;  this.Kevap=KEVAP; this.E=E;
    }
    
    
    /** Creates a new instance of Material */
    public Material() {
        nlang = 1;
        name = new String[nlang];
        name[0]="Air";
        code = (int)1;
        density = 0.0016;
        
        nfreq = 1;
        freq = new double[nfreq];
        mu = new double[nfreq];
        ep = new double[nfreq];
        si = new double[nfreq];
        siC = new double[nfreq];
        for (int i = 0; i<nfreq; i++){
            freq[i] = 1.8e9; mu[i] = mu0; ep[i]=ep0; si[i]=0; siC[i]=0;
        }   
        SetPhysicalParam(name,  code, density);
        SetVisualParam(java.awt.Color.BLACK, 0.0f, true); 
        SetEMParam(nfreq, freq, mu, ep, si, siC);
        SetTParam(0.28, 0.0263, 0.0, 0.0, 0.0, 0.0);
    }
    
    public Material(String[] n) {
        nlang = 1;
        name = n;
        code = (int)1;
        density = 0.0016;
        
        nfreq = 1;
        freq = new double[nfreq];
        mu = new double[nfreq];
        ep = new double[nfreq];
        si = new double[nfreq];
        siC = new double[nfreq];
        for (int i = 0; i<nfreq; i++){
            freq[i] = 1.8e9; mu[i] = mu0; ep[i]=ep0; si[i]=0; siC[i]=0;
        }   
        SetPhysicalParam(name,  code, density);
        SetVisualParam(java.awt.Color.BLACK, 0.0f, true); 
        SetEMParam(nfreq, freq, mu, ep, si, siC);
        SetTParam(0.28, 0.0263, 0.0, 0.0, 0.0, 0.0);
    }
    
    public Material(String[] n, int cod, double d, int nf, double[] f, Color cl, double t, boolean v, double[] m, double[] e, double[] s, double[] sC, double C, double K, double BF, double HM, double KEVAP, double E) {
        SetPhysicalParam(n, cod, d);
        SetVisualParam(cl, t, v);
        SetEMParam(nf, f, m, e, s, sC);
        SetTParam(C,K,BF,HM,KEVAP,E);
        
    }
    
    public Material(Material m){
        String[] n = m.name;
        int cod = m.code;
        double d = m.density;
        int nf = m.nfreq;
        double[] f = m.freq;
        Color cl = m.color;
        double t = m.transp;
        boolean v = m.visible();
        double[] mu = m.mu;
        double[] e = m.ep;
        double[] s = m.si;
        double[] sC = m.siC;
        double C = m.C;
        double K = m.K;
        double BF = m.Bf;
        double HM = m.Hm;
        double KEVAP = m.Kevap;
        double E = m.E;
        SetPhysicalParam(n, cod, d);
        SetVisualParam(cl, t, v);
        SetEMParam(nf, f, mu, e, s, sC);
        SetTParam(C,K,BF,HM,KEVAP,E);
        
    }

    
    public void print(boolean p){
        if(p){
        System.out.print("** Material = "+this.name[0]+", Codigo ="+this.code);
        System.out.print(",  Density = "+this.density+", Freq =");
        for (int ff=0; ff<this.nfreq; ff++)
            System.out.print(""+this.freq[ff]+"Hz ");
        System.out.println("");
        
        System.out.print("   mu ="); 
        for (int ff=0; ff<this.nfreq; ff++)
            System.out.print(""+this.mu[ff]+" ");
        System.out.print("  ep ="); 
        for (int ff=0; ff<this.nfreq; ff++)
            System.out.print(""+this.ep[ff]+" ");
        System.out.print("  si ="); 
        for (int ff=0; ff<this.nfreq; ff++)
            System.out.print(""+this.si[ff]+" ");
        System.out.println("");
        System.out.print("   C="+this.C+" K="+this.K+" bf="+this.Bf);
        System.out.println("  hm="+this.Hm+" Kevap="+this.Kevap+" E="+this.E);
       }
    
    }
    
    
    public boolean isConductor(){
        for (int i=0; i<this.nfreq; i++)
            if (this.si[i] >= 100)
                return true;
        return false;        
    }
    
    public boolean isAir(){
        if (this.ep[0]==ep0 && this.mu[0]==mu0 && si[0]==0 && (this.name[0].compareToIgnoreCase("air")==0||this.name[0].compareToIgnoreCase("ar")==0))
            return true;
        else
            return false;
    }
}
