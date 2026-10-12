/*
 * PlaneWaveSource.java
 *
 * Created on 28 de Março de 2006, 15:04
 */

/**
 *
 * @author Ana de Oliveira Rodrigues
 * @ NAO FOI TESTADA!!!!
 */
public class PlaneWaveSource extends Source{
    
    char axis;
    
    /** Creates a new instance of PlaneWaveSource */
    public PlaneWaveSource() {
        axis = 'x';
    }
    
    public PlaneWaveSource(String type, int[] location, double maxValue, double[] f, String unit, boolean hardsource, char MainAxis) {
        super(type, location, maxValue, f, unit, hardsource);
        axis = MainAxis;
        System.out.println("*** ATENCAO!!! ESTA CLASSE NAO FOI TESTADA!!!!");   
    }
    
     public boolean isSource(int[] l){
        int x = l[0]; int y=l[1]; int z=l[2];
        if ((axis=='x')&&(Location[0]==x))
            return true;
        if ((axis=='y')&&(Location[1]==y))
            return true;
        if ((axis=='z')&&(Location[2]==z))
            return true;
        return false;
    }
}
