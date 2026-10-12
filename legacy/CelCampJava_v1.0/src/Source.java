/*
 * Source.java
 *
 * Created on 27 de Setembro de 2005, 14:46
 */

/**
 *
 * @author juliano
 */
public class Source {
    
    protected String Type;
    protected int[] Location;
    protected double MaxValue;
    protected double[] f;
    protected String Unit;
    protected boolean HardSource = true;
    
    /** Creates a new instance of Source */
    
    public Source() {
        setType("Default");
        int[] l = new int[3]; l[0] = 0; l[1] = 0; l[2] = 0; 
        setLocation(l);
        setMaxValue(1.0d);
        double [] f = new double[1]; f[0]=1.8e9;
        setF(f);
        setUnit("?/?");
    }
    public Source(String type, int[] location, double maxValue, double[] f, String unit, boolean hardsource) {
        setType(type);
        setLocation(location);
        setMaxValue(maxValue);
        setF(f);
        setUnit(unit);
        setHardSource(hardsource);
    }

    public String getType() {
        return Type;
    }
    public void setType(String Type) {
        this.Type = Type;
    }
    public int[] getLocation() {
        return Location;
    }
    public void setLocation(int[] Location) {
        this.Location = Location;
    }
    public double getMaxValue() {
        return MaxValue;
    }
    public void setMaxValue(double MaxValue) {
        this.MaxValue = MaxValue;
    }
    public double[] getF() {
        return f;
    }
    public void setF(double[] f) {
        this.f = f;
    }
    public String getUnit() {
        return Unit;
    }
    public void setUnit(String Unit) {
        this.Unit = Unit;
    }
    public boolean isHard(){
        return HardSource;
    }
    public void setHardSource(boolean hs){
        HardSource = hs;
    }

    public String StringLocation(){
        return("("+Location[0]+","+Location[1]+","+Location[2]+")");
    }
    public void print(){
        System.out.println("** Source::Fonte do tipo "+Type+" localizada em "+StringLocation()+" com MaxValue="+MaxValue+Unit+".");
    }
    
    public boolean isSource(int[] l){
        int x = l[0]; int y=l[1]; int z=l[2];
        if ((Location[0]==x)&&(Location[1]==y)&&(Location[2]==z))
            return true;
        else return false;
    }
    
    public double calculateSource(int n, double f, double dt){
        double angle = (2*Math.PI*f*n*dt); //em radianos
        return(MaxValue*Math.sin(angle));
    }

    public double posFDTD(int[] l){
        return 0;
    }
    
}

