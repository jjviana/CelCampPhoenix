/*
 * LinearSource.java
 *
 * Created on 17 de Novembro de 2005, 16:05
 */

/**
 *
 * @author juliano
 */
public class LinearSource extends Source{
    
    
    String axis = "x"; //x, y or z axis
    String field = "E"; //E or H
    int init=0;
    int end=0;
    
    /** Creates a new instance of LinearSource */
    public LinearSource(String a, String f, int i, int e) {
        super();
        axis = a;        
        field = f;
        init = i;
        end = e;
    }
    
    public LinearSource(String a, String fe, int i, int e, String type, int[] location, double maxValue, double[] f, String unit, boolean hardsource) {
        super(type, location, maxValue, f, unit, hardsource);
        axis = a;
        field = fe;
        init = i;
        end = e;
    }
    
    public LinearSource(String a, String f, int i, int e, Source s){
        axis = a;
        field = f;
        init = i;
        end = e;
        this.setType(s.Type);
        this.setLocation(s.Location);
        this.setMaxValue(s.MaxValue);
        this.setF(s.f);
        this.setUnit(s.Unit);
        this.setHardSource(s.HardSource);
    }
    
    public boolean isSource(int[] l){
        int x = l[0]; int y=l[1]; int z=l[2];
        if (isE(x,y,z) && field.compareToIgnoreCase("H")==0)
            return false;
        if (isH(x,y,z) && field.compareToIgnoreCase("E")==0)
            return false;
        
        if ((axis.compareToIgnoreCase("x")==0) && (x>=init) && (x<=end) && (Location[1]==y) && (Location[2]==z))
            return true;
        else
            if ((axis.compareToIgnoreCase("y")==0) && (y>=init) && (y<=end) && (Location[0]==x) && (Location[2]==z))
                return true;
            else
                if ((axis.compareToIgnoreCase("z")==0) && (z>=init) && (z<=end) && (Location[0]==x) && (Location[1]==y))
                    return true;
                else
                    return false;
        }
    
    
     public boolean isHx(int i, int j, int k){
        if (par(i)&impar(j)&impar(k)) return true;
        else return false;
    }
    public boolean isHy(int i, int j, int k){
        if (impar(i)&par(j)&impar(k)) return true;
        else return false;
    }
    public boolean isHz(int i, int j, int k){
        if (impar(i)&impar(j)&par(k)) return true;
        else return false;
    }
    public boolean isH(int i, int j, int k){
        if (isHx(i,j,k) | isHy(i,j,k) | isHz(i,j,k)) return true;
        else return false;
    }
    
    public boolean isEx(int i, int j, int k){
        if (impar(i)&par(j)&par(k)) return true;
        else return false;
    }
    public boolean isEy(int i, int j, int k){
        if (par(i)&impar(j)&par(k)) return true;
        else return false;
    }
    public boolean isEz(int i, int j, int k){
        if (par(i)&par(j)&impar(k)) return true;
        else return false;
    }
    public boolean isE(int i, int j, int k){
        if (isEx(i,j,k) | isEy(i,j,k) | isEz(i,j,k)) return true;
        else return false;
    }
    
    public boolean par(int i){
        if ((i%2)==0) return true;
        else return false;
    }
    public boolean impar(int i){
        if ((i%2)==0) return false;
        else return true;
    }
   
}
