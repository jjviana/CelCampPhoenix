/*
 * Model.js
 *
 * Created on 14 de Setembro de 2005, 17:41   (Model.java)
 * Ported to JavaScript in 2026 (CelCamp Phoenix).
 *
 * @author juliano
 *
 * The material model: one byte (material code) per cube, stored in a flat
 * array exactly like the "doubleArray3D de J.E. Moreira" layout of the Java
 * version:  index = i*w0 + j*w1 + k*w2 + w3   (k varies fastest).
 */

function outOfBounds() {
    throw new RangeError("ArrayIndexOutOfBoundsException");
}

export class Model {

    /** Creates a new instance of Model */
    constructor(name, n, m, l, dx, dy, dz) {
        this.Name = "Default";
        this.data = null;           // Uint8Array (Java: byte[])
        this.sizeData = 0;
        this.n0 = 0; this.n1 = 0; this.n2 = 0;
        this.w0 = 0; this.w1 = 0; this.w2 = 0; this.w3 = 0;
        this.GridSizeX = 0; this.GridSizeY = 0; this.GridSizeZ = 0;
        this.DX = 1; this.DY = 1; this.DZ = 1;
        if (arguments.length === 0) return; // used by copy()

        this.Name = name;
        this.sizeData = n * m;
        if (this.sizeData > 2147483647) throw new Error("OutOfMemoryError");
        this.sizeData = this.sizeData * l;
        if (this.sizeData > 2147483647) throw new Error("OutOfMemoryError");
        this.data = new Uint8Array(this.sizeData);
        this.n0 = n; this.n1 = m; this.n2 = l;
        this.w0 = m * l; this.w1 = l; this.w2 = 1; this.w3 = 0;

        this.GridSizeX = n; this.GridSizeY = m; this.GridSizeZ = l;

        if (dx > 0) {
            this.DX = dx;
        } else {
            console.log("*** Tamanho DX < 0!!! Assumindo = 1!!!");
            this.DX = 1.0;
        }
        if (dy > 0) {
            this.DY = dy;
        } else {
            console.log("*** Tamanho DY < 0!!! Assumindo = 1!!!");
            this.DY = 1.0;
        }
        if (dz > 0) {
            this.DZ = dz;
        } else {
            console.log("*** Tamanho DZ < 0!!! Assumindo = 1!!!");
            this.DZ = 1.0;
        }
    }

    name() { return this.Name; }
    x() { return this.GridSizeX; }
    y() { return this.GridSizeY; }
    z() { return this.GridSizeZ; }
    dx() { return this.DX; }
    dy() { return this.DY; }
    dz() { return this.DZ; }

    /**
     * Java had three overloads:
     *   setData(int i, int j, int k, byte v)
     *   setData(byte[] d, boolean inplace)
     *   setData(byte[][][] d)       (not needed: we never build 3D arrays)
     */
    setData(a, b, c, v) {
        if (arguments.length === 4) {
            const i = a, j = b, k = c;
            if (i < 0) outOfBounds();
            if (i >= this.n0) outOfBounds();
            if (j < 0) outOfBounds();
            if (j >= this.n1) outOfBounds();
            if (k < 0) outOfBounds();
            if (k >= this.n2) outOfBounds();
            this.data[i * this.w0 + j * this.w1 + k * this.w2 + this.w3] = v;
            return;
        }
        const d = a, inplace = b;
        if (inplace)
            this.data = d;
        else {
            if (d.length === this.sizeData) {
                this.data = new Uint8Array(d);
            } else
                throw new Error(" ERRO NA ALOCACAO DOS DADOS NO FIELD!! TAMANHOS DIFERENTES!!");
        }
    }

    getSizeData() {
        return this.sizeData;
    }

    /** getData() returns the array, getData(i,j,k) returns one code. */
    getData(i, j, k) {
        if (arguments.length === 0) return this.data;
        if (i < 0) outOfBounds();
        if (i >= this.n0) outOfBounds();
        if (j < 0) outOfBounds();
        if (j >= this.n1) outOfBounds();
        if (k < 0) outOfBounds();
        if (k >= this.n2) outOfBounds();
        return this.data[i * this.w0 + j * this.w1 + k * this.w2 + this.w3];
    }

    copy(m2) {
        this.Name = m2.Name;
        this.sizeData = m2.sizeData;
        this.data = new Uint8Array(this.sizeData);
        this.n0 = m2.n0; this.n1 = m2.n1; this.n2 = m2.n2;
        this.w0 = m2.w0; this.w1 = m2.w1; this.w2 = m2.w2; this.w3 = m2.w3;

        this.GridSizeX = m2.GridSizeX; this.GridSizeY = m2.GridSizeY; this.GridSizeZ = m2.GridSizeZ;

        this.DX = m2.DX;
        this.DY = m2.DY;
        this.DZ = m2.DZ;
        this.data.set(m2.data);
    }

    /** Allocates a fresh flat array for the given size (helper for redux/expand). */
    _alloc(n, m, l) {
        this.sizeData = n * m * l;
        this.data = new Uint8Array(this.sizeData);
        this.n0 = n; this.n1 = m; this.n2 = l;
        this.w0 = m * l; this.w1 = l; this.w2 = 1; this.w3 = 0;
    }

    /**
     * Halves the model, keeping the centre of every second cube.
     *
     * Phoenix note: the 2007 version kept DX/DY/DZ unchanged, which made the
     * reduced model physically half the size. The cubes are now twice as big,
     * so the deltas are doubled here.
     */
    redux() {
        const SX = this.GridSizeX;
        const SY = this.GridSizeY;
        const SZ = this.GridSizeZ;
        const newGridSizeX = Math.floor((this.GridSizeX - 1) / 2);
        const newGridSizeY = Math.floor((this.GridSizeY - 1) / 2);
        const newGridSizeZ = Math.floor((this.GridSizeZ - 1) / 2);

        const old = this.data, ow0 = this.w0, ow1 = this.w1;
        const tempData = new Uint8Array(newGridSizeX * newGridSizeY * newGridSizeZ);
        let ci = 0, cj = 0, ck = 0;
        for (let i = 1; i < SX - 1; i = i + 2) {
            for (let j = 1; j < SY - 1; j = j + 2) {
                for (let k = 1; k < SZ - 1; k = k + 2) {
                    tempData[(ci * newGridSizeY + cj) * newGridSizeZ + ck] = old[i * ow0 + j * ow1 + k];
                    ck++;
                }
                ck = 0; cj++;
            }
            ck = 0; cj = 0; ci++;
        }
        this.GridSizeX = newGridSizeX;
        this.GridSizeY = newGridSizeY;
        this.GridSizeZ = newGridSizeZ;
        this._alloc(newGridSizeX, newGridSizeY, newGridSizeZ);
        this.data = tempData;
        this.DX *= 2; this.DY *= 2; this.DZ *= 2;
    }

    /**
     * Expands the model to the "Yee grid" used by the EH calculation: every
     * cube becomes 3x3x3 points (shared with its neighbours), so a model of
     * n x m x l cubes becomes (2n+1) x (2m+1) x (2l+1) points.
     * The 27 assignments are kept exactly as in the 2007 code (later cubes
     * overwrite the shared faces of earlier ones).
     */
    expand() {
        const SX = this.GridSizeX;
        const SY = this.GridSizeY;
        const SZ = this.GridSizeZ;
        this.GridSizeX = (this.GridSizeX * 2 + 1);
        this.GridSizeY = (this.GridSizeY * 2 + 1);
        this.GridSizeZ = (this.GridSizeZ * 2 + 1);

        const old = this.data, ow0 = this.w0, ow1 = this.w1;
        const TY = this.GridSizeY, TZ = this.GridSizeZ;
        const tempData = new Uint8Array(this.GridSizeX * TY * TZ);
        const t = (i, j, k, v) => { tempData[(i * TY + j) * TZ + k] = v; };

        for (let i = 0; i < SX; i++) {
            for (let j = 0; j < SY; j++) {
                for (let k = 0; k < SZ; k++) {
                    const v = old[i * ow0 + j * ow1 + k];
                    // 27 pontos //
                    t(i*2  , j*2  , k*2  , v);//1

                    t(i*2+1, j*2  , k*2  , v);//2
                    t(i*2+2, j*2  , k*2  , v);//3

                    t(i*2  , j*2+1, k*2  , v);//4
                    t(i*2  , j*2+2, k*2  , v);//5

                    t(i*2  , j*2  , k*2+1, v);//6
                    t(i*2  , j*2  , k*2+2, v);//7

                    t(i*2  , j*2+1, k*2+1, v);//8
                    t(i*2  , j*2+2, k*2+1, v);//9
                    t(i*2  , j*2+1, k*2+2, v);//10
                    t(i*2  , j*2+2, k*2+2, v);//11

                    t(i*2+1, j*2  , k*2+1, v);//12
                    t(i*2+2, j*2  , k*2+1, v);//13
                    t(i*2+1, j*2  , k*2+2, v);//14
                    t(i*2+2, j*2  , k*2+2, v);//15

                    t(i*2+1, j*2+1, k*2  , v);//16
                    t(i*2+2, j*2+1, k*2  , v);//17
                    t(i*2+1, j*2+2, k*2  , v);//18
                    t(i*2+2, j*2+2, k*2  , v);//19

                    t(i*2+1, j*2+1, k*2+1, v);//20
                    t(i*2+2, j*2+1, k*2+1, v);//21
                    t(i*2+1, j*2+2, k*2+1, v);//22
                    t(i*2+1, j*2+1, k*2+2, v);//23
                    t(i*2+2, j*2+2, k*2+1, v);//24
                    t(i*2+2, j*2+1, k*2+2, v);//25
                    t(i*2+1, j*2+2, k*2+2, v);//26
                    t(i*2+2, j*2+2, k*2+2, v);//27
                }
            }
        }
        this._alloc(this.GridSizeX, this.GridSizeY, this.GridSizeZ);
        this.data = tempData;
    }

    printModel(print) {
        if (print) {
            let out = " MODELO : \n";
            for (let i = 0; i < this.GridSizeX; i++) {
                for (let j = 0; j < this.GridSizeY; j++) {
                    let line = "";
                    for (let k = 0; k < this.GridSizeZ; k++) line += " " + this.getData(i, j, k);
                    out += line + "\n";
                }
                out += "\n";
            }
            console.log(out);
        }
    }
}
