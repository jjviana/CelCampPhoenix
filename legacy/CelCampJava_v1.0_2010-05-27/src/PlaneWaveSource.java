/*
 * PuntualSource.java
 *
 * Created on 17 de Novembro de 2005, 16:22
 */

/**
 *
 * @author juliano
 */
public class PlaneWaveSource extends Source{
    
    private String Plane;
    public void setPlane(String plane){
            this.Plane = plane;
    }
    public String getPlane(){
            return this.Plane;
    }
    
    /** Creates a new instance of PuntualSource */
    public PlaneWaveSource() {
        super();
    }
    
    public PlaneWaveSource(String type, String field, String axis, String plane, int[] location, double maxValue, double[] f, String unit, boolean hardsource) {
        super(type, field, axis, location, maxValue, f, unit, hardsource);
        Plane = plane;
    }
    
    public PlaneWaveSource(PlaneWaveSource s){
        this.setType(s.Type);
        this.setField(s.Field);
        this.setAxis(s.Axis);
        this.setPlane(s.Plane);
        this.setLocation(s.Location);
        this.setMaxValue(s.MaxValue);
        this.setF(s.f);
        this.setUnit(s.Unit);
        this.setHardSource(s.HardSource);
    }
    
    public PlaneWaveSource(Source s){
        this.setType(s.Type);
         this.setField(s.Field);
        this.setAxis(s.Axis);
        this.setPlane("z"); //default
        this.setLocation(s.Location);
        this.setMaxValue(s.MaxValue);
        this.setF(s.f);
        this.setUnit(s.Unit);
        this.setHardSource(s.HardSource);
    }
    
    @Override public int[] SourceLocation(int ModelX, int slaveID) {
        int[] locationS = this.Location;
        int xs = locationS[0] * 2;
        int ys = locationS[1] * 2;
        int zs = locationS[2] * 2;
        int thisX = xs - ModelX * slaveID;
        if (thisX > 0 && thisX < ModelX) { //esta nesta fatia
            String field = this.Field;
            String axis = this.Axis;
            if (field.compareToIgnoreCase("E") == 0) {
                if (axis.compareToIgnoreCase("x") == 0) {
                    thisX = xs + 1;
                }
                if (axis.compareToIgnoreCase("y") == 0) {
                    ys = ys + 1;
                }
                if (axis.compareToIgnoreCase("z") == 0) {
                    zs = zs + 1;
                }
            }
            if (field.compareToIgnoreCase("H") == 0) {
                if (axis.compareToIgnoreCase("x") == 0) {
                    ys = ys + 1;
                    zs = zs + 1;
                }
                if (axis.compareToIgnoreCase("y") == 0) {
                    thisX = xs + 1;
                    zs = zs + 1;
                }
                if (axis.compareToIgnoreCase("z") == 0) {
                    thisX = xs + 1;
                    ys = ys + 1;
                }
            }
        }
        int[] SL = new int[3];
        SL[0] = thisX;
        SL[1] = ys;
        SL[2] = zs;
        return SL;

    }

    @Override public void setSourcePoints(Field F, int x, int y, int z, double v){
        double valueSoft= F.data(x,y,z); //all PlaneWave Sources are soft!!!     
        
        int margem = 5;
        
        if (this.Plane.compareToIgnoreCase("x")==0)
            for (int j=1+margem; j<F.ty-1-margem; j++)
                for (int k=1+margem; k<F.tz-1-margem; k++) {
                    if (par(j)==par(y)&&par(k)==par(z))
                        F.data(x,j,k,v+valueSoft);
                }
        if (this.Plane.compareToIgnoreCase("y")==0)
            for (int i=1+margem; i<F.tx-1-margem; i++)
                for (int k=1+margem; k<F.tz-1-margem; k++) { 
                    if (par(i)==par(x)&&par(k)==par(z))
                        F.data(i,y,k,v+valueSoft);
                }
        if (this.Plane.compareToIgnoreCase("z")==0)
            for (int i=1+margem; i<F.tx-1-margem; i++)
                for (int j=1+margem; j<F.ty-1-margem; j++) {  
                    if (par(i)==par(x)&&par(j)==par(y))
                        F.data(i,j,z,v+valueSoft);
                }
        
            
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
    
}
