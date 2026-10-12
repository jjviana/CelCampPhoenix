/*
 * DipoleSource.java
 *
 * Created on 28 de Março de 2006, 15:08
 */

/**
 *
 * @author juliano
 */
public class DipoleSource extends Source{
    
    int size; //defines the size in number of cubes
    int[] center;
    char axis;
    
    /** Creates a new instance of DipoleSource */
    public DipoleSource() {
    }
    
    public DipoleSource(String type, int[] location, double maxValue, double[] f, String unit, boolean hardsource, int Size, char Axis) {
        super(type, location, maxValue, f, unit, hardsource);
        size = Size;
        center = location;
        axis = Axis;
    }
    
    public boolean isSource(int[] l){
        int x = l[0]; int y=l[1]; int z=l[2];
        if ((Location[0]==x)&&(Location[1]==y)&&(Location[2]==z))
            return true;
        else return false;
    }
    
     public double posFDTD(int[] l, double valueAtual){
        int x = l[0]; int y=l[1]; int z=l[2];
        
        int centro=0;
        if (axis=='x') centro = center[0];
        if (axis=='y') centro = center[1];
        if (axis=='z') centro = center[2];
        
        int limiteInf = centro - size/2; 
        int limiteSup = centro + size/2;
        
        if (axis =='x' && x<=limiteSup && x>=limiteInf && y==center[1] && z==center[2])
            return 0;
        if (axis =='y' && y<=limiteSup && y>=limiteInf && x==center[0] && z==center[2])
            return 0;
        if (axis =='z' && z<=limiteSup && z>=limiteInf && x==center[0] && y==center[1])
            return 0;
                
         return valueAtual;
    }
    
}
