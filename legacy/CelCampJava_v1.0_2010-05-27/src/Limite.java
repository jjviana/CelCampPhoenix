/*
 * Limite.java
 *
 * Created on 7 de Março de 2006, 15:19
 */

/**
 *
 * @author juliano
 */
public class Limite {
    
    /** Creates a new instance of Limite */
    public Limite() {
    }
    
    static public boolean limiteInf(int i, int limI){
        if (i==limI)
            return true;
        else return false;
    }
    static public boolean limiteSup(int i, int limS){
        if (i==limS-1)
            return true;
        else return false;
    }
    
    
    
    
    static public boolean par(int i){
        if ((i%2)==0) return true;
        else return false;
    }
    static public boolean impar(int i){
        if ((i%2)==0) return false;
        else return true;
    }
    
}
