/*
 * Field.js
 *
 * Created on 22 de Setembro de 2005, 16:46   (Field.java)
 * Ported to JavaScript in 2026 (CelCamp Phoenix).
 *
 * @author juliano
 *
 * A 3D scalar field stored in a flat Float64Array ("A partir do
 * doubleArray3D de J.E. Moreira, 2000"). For the EH calculation the field
 * lives on the expanded Yee grid, where the parity of (i,j,k) tells which
 * component (Ex, Ey, Ez, Hx, Hy, Hz) is stored at each point.
 *
 * Java had both a field called `data` and methods `data(i,j,k)`; in
 * JavaScript the array is kept in `this.dataArray`.
 */
import { Limite } from './Limite.js';
import { doubleToString } from './JavaFormat.js';
import { ResultsDisk } from './phoenix/ResultsDisk.js';

function outOfBounds() {
    throw new RangeError("ArrayIndexOutOfBoundsException");
}

export class Field {

    /** Java overloads: (), (x,y,z), (x,y,z,t), (x,y,z,t,InitValue), (Field F) */
    constructor(...args) {
        this.Type = "Default";
        this.tx = 0; this.ty = 0; this.tz = 0;
        this.InitialValue = 0.0;
        this.dataArray = null;
        this.sizeData = 0;
        this.n0 = 0; this.n1 = 0; this.n2 = 0;
        this.w0 = 0; this.w1 = 0; this.w2 = 0; this.w3 = 0;

        if (args.length === 0) {
            this.InitiateField();
        } else if (args.length === 1 && args[0] instanceof Field) {
            const F = args[0];
            this.Type = F.Type;
            this.tx = F.tx;
            this.ty = F.ty;
            this.tz = F.tz;
            this.InitiateField(this.tx, this.ty, this.tz, this.Type, 0.0);
            this.setData(F.getData());
        } else {
            this.InitiateField(...args);
        }
    }

    getSizeData() {
        return this.sizeData;
    }

    getData() { return this.dataArray; }

    setData(d, inplace) {
        if (inplace)
            this.dataArray = d;
        else {
            if (d.length === this.sizeData) {
                this.dataArray = new Float64Array(d);
            } else
                throw new Error(" ERRO NA ALOCACAO DOS DADOS NO FIELD!! TAMANHOS DIFERENTES!!");
        }
    }

    /**
     * Copies field F into the box [xi,xf) x [yi,yf) x [zi,zf).
     * (Same semantics as the 2007 triple loop, done one z-row at a time.)
     */
    setValuesData(F, xi, xf, yi, yf, zi, zf) {
        const src = F.dataArray, dst = this.dataArray;
        const len = zf - zi;
        let ii = 0;
        for (let i = xi; i < xf; i++) {
            let jj = 0;
            for (let j = yi; j < yf; j++) {
                const s = ii * F.w0 + jj * F.w1;
                dst.set(src.subarray(s, s + len), i * this.w0 + j * this.w1 + zi);
                jj++;
            }
            ii++;
        }
    }

    SizeX() { return this.tx; }
    SizeY() { return this.ty; }
    SizeZ() { return this.tz; }
    type() { return this.Type; }

    /** data(i,j,k) reads a value, data(i,j,k,v) writes it. */
    data(i, j, k, v) {
        if (i < 0) outOfBounds();
        if (i >= this.n0) outOfBounds();
        if (j < 0) outOfBounds();
        if (j >= this.n1) outOfBounds();
        if (k < 0) outOfBounds();
        if (k >= this.n2) outOfBounds();
        if (arguments.length === 4)
            this.dataArray[i * this.w0 + j * this.w1 + k * this.w2 + this.w3] = v;
        else
            return this.dataArray[i * this.w0 + j * this.w1 + k * this.w2 + this.w3];
    }

    setAllData(v) {
        this.dataArray.fill(v);
    }

    /** Phoenix: `ArrayType` (default Float64Array) lets the EH slaves keep their fields in Float32Array. */
    InitiateField(n, m, l, t, v, ArrayType) {
        if (n === undefined) { n = 1; m = 1; l = 1; }
        if (t === undefined) t = "Default";
        if (v === undefined) v = 0.0;
        this.tx = n; this.ty = m; this.tz = l;
        this.sizeData = n * m;
        if (this.sizeData > 2147483647) throw new Error("OutOfMemoryError");
        this.sizeData = this.sizeData * l;
        if (this.sizeData > 2147483647) throw new Error("OutOfMemoryError");
        this.dataArray = new (ArrayType || Float64Array)(this.sizeData);
        this.n0 = n; this.n1 = m; this.n2 = l;
        this.w0 = m * l; this.w1 = l; this.w2 = 1; this.w3 = 0; this.Type = t;

        this.InitialValue = v;

        if (v !== 0) this.dataArray.fill(this.InitialValue);
    }

    print(i, j, k) {
        console.log("** Field::Print():: Ponto(" + i + "," + j + "," + k + ") = " + this.data(i, j, k).toExponential(1));
    }

    /* ------------------------------------------------------------------ *
     *  Saving.  In 2007 these wrote text files to PATH/results/ on disk.  *
     *  Now they go to the browser's private file system (see             *
     *  phoenix/ResultsDisk.js), in exactly the same text format.         *
     *  They also return the computed values so the Phoenix viewer can    *
     *  show them without reading the files back.                         *
     * ------------------------------------------------------------------ */

    Save(PATH, SimulName, n, EHF) {
        if (n === 0) {
            const Name = SimulName;
            EHF.save3dm(Name, PATH);
            EHF.saveDat(Name, PATH);
            EHF.save3df(Name, PATH);
        }
        return this.EscreveArquivo2D(PATH, n);
    }
    SaveT(PATH, SimulName, n, T) {
        if (n === 0) {
            const Name = SimulName;
            T.save3dmT(Name, PATH);
            T.saveDatT(Name, PATH);
            T.save3dT(Name, PATH);
        }
        return this.EscreveArquivo2DT(PATH, n);
    }
    SaveMinAvMaxT(PATH, SimulName, n, T, NMAX, Tenv) {
        return this.EscreveMinAvMaxT(PATH, n, NMAX, Tenv, T ? T.skip : 1);
    }
    EscreveArquivo2D(PATH, n) {
        const E = this.EscreveE(PATH, n);
        this.EscreveH(PATH, n, false);
        return { E: E };
    }
    EscreveArquivo2DT(PATH, n) {
        return this.EscreveT(PATH, n);
    }

    /**
     * |E| at the centre of every cube (i,j,k all odd of the expanded grid).
     * "Teste 7: 27 de Maio de 2010 - Fazendo a media dos pontos.
     *  Referencia: Atef Elsherbeni - FDTD with Matlab, pagina 126 Fig.4.13a":
     * every component is the average of the 4 edges of the cube parallel to it.
     *
     * Phoenix: split out of EscreveE() so the slaves can send only these
     * values (one per cube) to the master instead of the whole grid.
     */
    EAtCubeCentres() {
        const SX = this.tx, SY = this.ty, SZ = this.tz;
        const d = this.dataArray, w0 = this.w0, w1 = this.w1;
        const cx = (SX - 1) >> 1, cy = (SY - 1) >> 1, cz = (SZ - 1) >> 1;
        const F = new Field(cx, cy, cz, "|E|");
        const values = F.dataArray;
        let count = 0;
        for (let i = 1; i < SX; i += 2) {
            for (let j = 1; j < SY; j += 2) {
                for (let k = 1; k < SZ; k += 2) {
                    const p = i * w0 + j * w1 + k;
                    const Ex = (d[p - w1 - 1] + d[p + w1 - 1] + d[p - w1 + 1] + d[p + w1 + 1]) / 4; //1,0,0
                    const Ey = (d[p - w0 - 1] + d[p - w0 + 1] + d[p + w0 - 1] + d[p + w0 + 1]) / 4; //0,1,0
                    const Ez = (d[p - w0 - w1] + d[p - w0 + w1] + d[p + w0 - w1] + d[p + w0 + w1]) / 4; //0,0,1
                    values[count++] = Math.sqrt(Ex * Ex + Ey * Ey + Ez * Ez);
                }
            }
        }
        return F;
    }

    /** Writes results/EN<n>: one line per x, the cubes of that plane (y outer, z fastest). */
    EscreveE(PATH, n) {
        const nomeArqE = "" + PATH + "/results/E" + "N" + n;
        // Phoenix: the master already holds |E| per cube (see EAtCubeCentres)
        const F = this.Type === "|E|" ? this : this.EAtCubeCentres();
        ResultsDisk.writeMatrix(nomeArqE, F.dataArray, F.tx, F.ty * F.tz);
        return F.dataArray;
    }

    /**
     * |H| at the centre of every cube, from one face of each component
     * (2010).  CalculateEHParallel never asked for it (writeH = false).
     */
    EscreveH(PATH, n, writeH) {
        if (!writeH) return null;
        const nomeArqH = "" + PATH + "/results/H" + "N" + n;
        const SX = this.tx, SY = this.ty, SZ = this.tz;
        const d = this.dataArray, w0 = this.w0, w1 = this.w1;
        const cx = (SX - 1) >> 1, cy = (SY - 1) >> 1, cz = (SZ - 1) >> 1;
        const values = new Float64Array(cx * cy * cz);
        let count = 0;
        for (let i = 1; i < SX; i += 2) {
            for (let j = 1; j < SY; j += 2) {
                for (let k = 1; k < SZ; k += 2) {
                    const p = i * w0 + j * w1 + k;
                    const Hx = d[p - w0]; //0,1,1
                    const Hy = d[p - w1]; //1,0,1
                    const Hz = d[p - 1];  //1,1,0
                    values[count++] = Math.sqrt(Hx * Hx + Hy * Hy + Hz * Hz);
                }
            }
        }
        ResultsDisk.writeMatrix(nomeArqH, values, cx, cy * cz);
        return values;
    }
    EscreveT(PATH, n) {
        const nomeArqT = "" + PATH + "/results/T" + "N" + n;
        console.log("** Field::Save:: Gravando arquivo = " + nomeArqT);
        const values = new Float64Array(this.dataArray);
        ResultsDisk.writeMatrix(nomeArqT, values, this.tx, this.ty * this.tz);
        return values;
    }
    EscreveMinAvMaxT(PATH, n, NMAX, Tenv, skip) {
        const nomeArqT = "" + PATH + "/results/TMinAvMax.txt";
        if (n === 0) {
            console.log("** Field::Save:: Gravando arquivo = " + nomeArqT);
            ResultsDisk.open(nomeArqT);
            ResultsDisk.append(nomeArqT, NMAX + "\n");
        }
        const d = this.dataArray;
        let valueMax = 0;
        let valueAvg = 0;
        let ncubes = 0;
        let valueMin = 1e100;
        for (let p = 0; p < d.length; p++) {
            const valueT = d[p];
            if (valueT !== Tenv) {
                if (valueT > valueMax)
                    valueMax = valueT;
                if (valueT < valueMin)
                    valueMin = valueT;
                valueAvg += valueT;
                ncubes++;
            }
        }
        valueAvg = valueAvg / ncubes;
        ResultsDisk.append(nomeArqT, doubleToString(valueMin) + " " + doubleToString(valueAvg) + " " + doubleToString(valueMax) + " \n");
        if (n >= NMAX - (skip || 1)) // Phoenix: 2010 closed only when n==NMAX-1
            ResultsDisk.close(nomeArqT);
        return { min: valueMin, avg: valueAvg, max: valueMax };
    }
    static Refresh(...args) {
        if (args.length === 1) {
            // 2007 swapped references, which aliased A[0] and A[1]; copy instead.
            const A = args[0];
            A[2].dataArray.set(A[1].dataArray);
            A[1].dataArray.set(A[0].dataArray);
            return;
        }
        const [txi, txf, tyi, tyf, tzi, tzf, A] = args;
        if (txi === 0 && tyi === 0 && tzi === 0 && txf === A[0].tx && tyf === A[0].ty && tzf === A[0].tz) {
            A[2].dataArray.set(A[1].dataArray);
            A[1].dataArray.set(A[0].dataArray);
            return;
        }
        for (let i = txi; i < txf; i++)
            for (let j = tyi; j < tyf; j++)
                for (let k = tzi; k < tzf; k++) {
                    A[2].data(i, j, k, A[1].data(i, j, k));
                    A[1].data(i, j, k, A[0].data(i, j, k));
                }
    }

    static RefreshT(txi, txf, tyi, tyf, tzi, tzf, A) {
        if (txi === 0 && tyi === 0 && tzi === 0 && txf === A[0].tx && tyf === A[0].ty && tzf === A[0].tz) {
            A[1].dataArray.set(A[0].dataArray);
            return;
        }
        for (let i = txi; i < txf; i++)
            for (let j = tyi; j < tyf; j++)
                for (let k = tzi; k < tzf; k++)
                    A[1].data(i, j, k, A[0].data(i, j, k));
    }

    static isHx(i, j, k) { return Limite.par(i) && Limite.impar(j) && Limite.impar(k); }
    static isHy(i, j, k) { return Limite.impar(i) && Limite.par(j) && Limite.impar(k); }
    static isHz(i, j, k) { return Limite.impar(i) && Limite.impar(j) && Limite.par(k); }
    static isH(i, j, k) { return Field.isHx(i, j, k) || Field.isHy(i, j, k) || Field.isHz(i, j, k); }

    static isEx(i, j, k) { return Limite.impar(i) && Limite.par(j) && Limite.par(k); }
    static isEy(i, j, k) { return Limite.par(i) && Limite.impar(j) && Limite.par(k); }
    static isEz(i, j, k) { return Limite.par(i) && Limite.par(j) && Limite.impar(k); }
    static isE(i, j, k) { return Field.isEx(i, j, k) || Field.isEy(i, j, k) || Field.isEz(i, j, k); }

    printAll() {
        let s = "\n\n **** Imprimindo o campo: com tamanho x=" + this.tx + ", y=" + this.ty + ", z=" + this.tz + ".\n";
        for (let i = 0; i < this.tx; i++) {
            for (let j = 0; j < this.ty; j++) {
                let line = "";
                for (let k = 0; k < this.tz; k++) line += this.data(i, j, k) + " ";
                s += line + "\n";
            }
            s += "\n";
        }
        console.log(s);
    }
}
