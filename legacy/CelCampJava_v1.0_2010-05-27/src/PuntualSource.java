/*
 * PuntualSource.java
 *
 * Created on 17 de Novembro de 2005, 16:22
 */

/**
 *
 * @author juliano
 */
public class PuntualSource extends Source{
    
    /** Creates a new instance of PuntualSource */
    public PuntualSource() {
        super();
    }
    
    public PuntualSource(String type, String field, String axis, int[] location, double maxValue, double[] f, String unit, boolean hardsource) {
        super(type, field, axis, location, maxValue, f, unit, hardsource);
        
    }
    
    public PuntualSource(PuntualSource s){
        this.setType(s.Type);
         this.setField(s.Field);
        this.setAxis(s.Axis);
        this.setLocation(s.Location);
        this.setMaxValue(s.MaxValue);
        this.setF(s.f);
        this.setUnit(s.Unit);
        this.setHardSource(s.HardSource);
    }
    
    public PuntualSource(Source s){
        this.setType(s.Type);
         this.setField(s.Field);
        this.setAxis(s.Axis);
        this.setLocation(s.Location);
        this.setMaxValue(s.MaxValue);
        this.setF(s.f);
        this.setUnit(s.Unit);
        this.setHardSource(s.HardSource);
    }
    
    
}
