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
    protected String Field;
    protected String Axis;
    protected int[] Location;
    protected double MaxValue;
    protected double[] f;
    protected String Unit;
    protected boolean HardSource = true;

    /** Creates a new instance of Source */
    public Source() {
        setType("Default");
        setField("E");
        setAxis("z");

        int[] l = new int[3];
        l[0] = 0;
        l[1] = 0;
        l[2] = 0;
        setLocation(l);
        setMaxValue(1.0d);
        f = new double[1];
        f[0] = 1.8e9;
        setF(f);
        setUnit("?/?");
    }

    public Source(String type, String field, String axis, int[] location, double maxValue, double[] f, String unit, boolean hardsource) {
        setType(type);
        setField(field);
        setAxis(axis);
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

    public String getField() {
        return Field;
    }

    public void setField(String F) {
        this.Field = F;
    }

    public String getAxis() {
        return Axis;
    }

    public void setAxis(String A) {
        this.Axis = A;
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

    public boolean isHard() {
        return HardSource;
    }

    public void setHardSource(boolean hs) {
        HardSource = hs;
    }

    public int[] SourceLocation(int ModelX, int slaveID) {
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
    
    public void setSourcePoints(Field F, int x, int y, int z, double v){
        if (this.isHard())
            F.data(x,y,z,v);
        else
            F.data(x,y,z,v+F.data(x,y,z));
            
    }
}

