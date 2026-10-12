/*
 * Limite.js
 *
 * Created on 7 de Marco de 2006, 15:19   (Limite.java)
 * Ported to JavaScript in 2026 (CelCamp Phoenix).
 *
 * @author juliano
 */
export class Limite {

    static limiteInf(i, limI) {
        if (i === limI)
            return true;
        else return false;
    }
    static limiteSup(i, limS) {
        if (i === limS - 1)
            return true;
        else return false;
    }

    static par(i) {
        if ((i % 2) === 0) return true;
        else return false;
    }
    static impar(i) {
        if ((i % 2) === 0) return false;
        else return true;
    }
}
