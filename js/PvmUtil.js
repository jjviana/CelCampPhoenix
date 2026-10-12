/*
 * PvmUtil.js
 *
 * Created on 12 de Maio de 2006, 16:04   (PvmUtil.java)
 * Ported to JavaScript in 2026 (CelCamp Phoenix).
 *
 * @author Ana de Oliveira Rodrigues
 *
 * Helpers to pack/unpack the objects of the program into jpvm buffers.
 * The functions that receive messages are async (pvm_recv returns a Promise).
 */
import { jpvmBuffer } from './jpvm/jpvmBuffer.js';
import { jpvmTaskId } from './jpvm/jpvmTaskId.js';
import { jpvmEnvironment } from './jpvm/jpvmEnvironment.js';
import { Material, Color } from './Material.js';
import { Source } from './Source.js';
import { PuntualSource } from './PuntualSource.js';
import { LinearSource } from './LinearSource.js';
import { DipoleSource } from './DipoleSource.js';
import { PlaneWaveSource } from './PlaneWaveSource.js';
import { Field } from './Field.js';

export class PvmUtil {

    static packColor(buf, c) {
        buf.pack(c.getRed());
        buf.pack(c.getGreen());
        buf.pack(c.getBlue());
    }
    static unpackColor(buf) {
        const red = buf.upkint();
        const green = buf.upkint();
        const blue = buf.upkint();
        return new Color(red, green, blue);
    }

    static packPhysicalProp(buf, mat) {
        buf.pack(mat.name());
        buf.pack(mat.code());
        buf.pack(mat.density());
        buf.pack(mat.nfreq());
        for (let ff = 0; ff < mat.nfreq(); ff++)
            buf.pack(mat.freq(ff));
    }
    static packVisualProp(buf, mat) {
        PvmUtil.packColor(buf, mat.color());
        buf.pack(mat.transp());
        let visi;
        if (mat.visible()) visi = 0;
        else visi = 1;
        buf.pack(visi);
    }
    static packEHProp(buf, mat) {
        for (let ff = 0; ff < mat.nfreq(); ff++) {
            buf.pack(mat.mu(ff));
            buf.pack(mat.ep(ff));
            buf.pack(mat.si(ff));
            buf.pack(mat.siC(ff));
        }
    }
    static packTProp(buf, mat) {
        buf.pack(mat.C());
        buf.pack(mat.K());
        buf.pack(mat.Bf());
        buf.pack(mat.Hm());
        buf.pack(mat.Kevap());
        buf.pack(mat.Emissivity());
    }

    static sendMaterials(jpvmE, tids, Mat, FreqIndex, ThisTag) {
        const buf = new jpvmBuffer();
        const NMat = Mat.length;
        buf.pack(FreqIndex);
        buf.pack(NMat);
        for (let m = 0; m < NMat; m++) {
            const mat = Mat[m];
            PvmUtil.packPhysicalProp(buf, mat);
            PvmUtil.packVisualProp(buf, mat);
            PvmUtil.packEHProp(buf, mat);
            PvmUtil.packTProp(buf, mat);
        }
        for (let i = 0; i < tids.length; i++) {
            jpvmE.pvm_send(buf, tids[i], ThisTag);
        }
    }

    /**
     * Receives the materials.
     * Phoenix note: Java passes ints by value, so the FreqIndex unpacked here
     * never reached the slaves (they always used index 1 = 1.8 GHz, and
     * crashed on single-frequency models).  It is now returned as
     * `Mat.FreqIndex`.
     */
    static async receiveMaterials(jpvmE, FreqIndex, ThisTag) {
        const message = await jpvmE.pvm_recv(ThisTag);
        const buf = message.buffer;
        FreqIndex = buf.upkint();
        const NMat = buf.upkint();
        const Mat = new Array(NMat);
        for (let m = 0; m < NMat; m++) {
            const name = [buf.upkstr()];
            const code = buf.upkint();
            const dens = buf.upkdouble();
            const nfreq = buf.upkint();
            const f = new Array(nfreq);
            for (let ff = 0; ff < nfreq; ff++) f[ff] = buf.upkdouble();
            const cor = PvmUtil.unpackColor(buf);
            const trans = buf.upkdouble();
            const visi = buf.upkint();
            let visible;
            if (visi === 0) visible = false;
            else visible = true;
            const mu = new Array(nfreq), ep = new Array(nfreq);
            const si = new Array(nfreq), siC = new Array(nfreq);
            for (let ff = 0; ff < nfreq; ff++) {
                mu[ff] = buf.upkdouble();
                ep[ff] = buf.upkdouble();
                si[ff] = buf.upkdouble();
                siC[ff] = buf.upkdouble();
            }
            const C = buf.upkdouble();
            const K = buf.upkdouble();
            const Bf = buf.upkdouble();
            const Hm = buf.upkdouble();
            const Kevap = buf.upkdouble();
            const Evap = buf.upkdouble();
            Mat[m] = new Material(name, code, dens, nfreq, f, cor, trans, visible, mu, ep, si, siC, C, K, Bf, Hm, Kevap, Evap);
        }
        Mat.FreqIndex = FreqIndex;
        return Mat;
    }

    static _packSource(buf, S) {
        const Type = S.getType();
        const Location = S.getLocation();
        const MaxValue = S.getMaxValue();
        const f = S.getF();
        const Unit = S.getUnit();
        const HardSource = S.isHard();
        let Hard;
        if (HardSource) Hard = 1;
        else Hard = 0;
        buf.pack(Type);
        buf.pack(Location.length);
        buf.pack(Location, Location.length, 1);
        buf.pack(MaxValue);
        buf.pack(f.length);
        buf.pack(f, f.length, 1);
        buf.pack(Unit);
        buf.pack(Hard);
        // Phoenix: the 2007 version sent only the base Source fields, so a
        // "linear" source arrived at the slaves as a single point.
        buf.pack(JSON.stringify(S.extraParams()));
    }

    static _unpackSource(buf) {
        const Type = buf.upkstr();
        const sizeLocation = buf.upkint();
        const Location = new Array(sizeLocation);
        buf.unpack(Location, 3, 1);
        const MaxValue = buf.upkdouble();
        const sizeF = buf.upkint();
        const f = new Array(sizeF);
        buf.unpack(f, sizeF, 1);
        const Unit = buf.upkstr();
        const Hard = buf.upkint();
        let HardSource;
        if (Hard === 1)
            HardSource = true;
        else
            HardSource = false;
        const extra = JSON.parse(buf.upkstr());
        const t = Type.toLowerCase();
        if (t === "linear")
            return new LinearSource(extra.axis, extra.field, extra.init, extra.end, Type, Location, MaxValue, f, Unit, HardSource);
        if (t === "dipole")
            return new DipoleSource(Type, Location, MaxValue, f, Unit, HardSource, extra.size, extra.axis);
        if (t === "planewave")
            return new PlaneWaveSource(Type, Location, MaxValue, f, Unit, HardSource, extra.axis);
        if (t === "puntual")
            return new PuntualSource(Type, Location, MaxValue, f, Unit, HardSource);
        return new Source(Type, Location, MaxValue, f, Unit, HardSource);
    }

    static sendSource(jpvmE, tids, S, ThisTag) {
        const buf = new jpvmBuffer();
        PvmUtil._packSource(buf, S);
        for (let i = 0; i < tids.length; i++) {
            jpvmE.pvm_send(buf, tids[i], ThisTag);
        }
    }

    static sendSources(jpvmE, tids, S, ThisTag) {
        const buf = new jpvmBuffer();
        const NumberSources = S.length;
        buf.pack(NumberSources);
        for (let s = 0; s < NumberSources; s++) {
            PvmUtil._packSource(buf, S[s]);
        }
        for (let i = 0; i < tids.length; i++) {
            jpvmE.pvm_send(buf, tids[i], ThisTag);
        }
    }

    static async receiveSource(jpvmE, ThisTag) {
        const message = await jpvmE.pvm_recv(ThisTag);
        return PvmUtil._unpackSource(message.buffer);
    }

    static async receiveSources(jpvmE, ThisTag) {
        const message = await jpvmE.pvm_recv(ThisTag);
        const buf = message.buffer;
        const NumberSources = buf.upkint();
        const S = new Array(NumberSources);
        for (let s = 0; s < NumberSources; s++) {
            S[s] = PvmUtil._unpackSource(buf);
        }
        return S;
    }

    static sendPartialModel(jpvmE, tid, buf, Xi, Xf, ModelY, ModelZ, M, tagModel) {
        // the model is stored x-major, so planes Xi..Xf are one contiguous block
        const start = Xi * M.w0;
        const end = (Xf + 1) * M.w0;
        buf.pack(M.getData().subarray(start, end), end - start, 1);
        jpvmE.pvm_send(buf, tid, tagModel);
    }

    static sendPartialTinit(jpvmE, tid, buf, Xi, Xf, ModelY, ModelZ, Tinit, tagModel) {
        const start = Xi * Tinit.w0;
        const end = (Xf + 1) * Tinit.w0;
        buf.pack(Tinit.getData().subarray(start, end), end - start, 1);
        jpvmE.pvm_send(buf, tid, tagModel);
    }

    static unpackPartialModel(buf, M) {
        const sizeData = M.getSizeData();
        const model = new Uint8Array(sizeData);
        buf.unpack(model, sizeData, 1);
        M.setData(model, true);
    }

    static unpackPartialTinit(buf, Tinit) {
        const sizeData = Tinit.getSizeData();
        const t = new Float64Array(sizeData);
        buf.unpack(t, sizeData, 1);
        Tinit.setData(t, true);
    }

    static sendMessageToParent(jpvmE, parent, message, ThisTag) {
        const buf = new jpvmBuffer();
        buf.pack(message);
        jpvmE.pvm_send(buf, parent, ThisTag);
    }

    static async printMessageFromSlaves(jpvm, tids, ThisTag, print) {
        const NPROC = tids.length;
        for (let i = 0; i < NPROC; i++) {
            const message = await jpvm.pvm_recv(tids[i], ThisTag);
            const str = message.buffer.upkstr();
            if (print)
                PvmUtil.console("   *** Slave : Host = " + tids[i].getHost() + ", Port = " + tids[i].getPort() + " -> " + str);
        }
    }

    static async printMessageFromSlave(jpvm, tid, ThisTag, print) {
        const message = await jpvm.pvm_recv(tid, ThisTag);
        const str = message.buffer.upkstr();
        if (print)
            PvmUtil.console("   *** Slave : Host = " + tid.getHost() + ", Port = " + tid.getPort() + " -> " + str);
    }

    static sendPartialField(jpvmE, parent, F, ThisTag) {
        const tx = F.tx, ty = F.ty, tz = F.tz;
        const Type = F.Type;
        const buf = new jpvmBuffer();
        buf.pack(tx);
        buf.pack(ty);
        buf.pack(tz);
        buf.pack(Type);
        buf.pack(F.getData(), tx * ty * tz, 1);
        jpvmE.pvm_send(buf, parent, ThisTag);
    }

    static async receivePartialField(jpvmE, c, ThisTag) {
        const message = await jpvmE.pvm_recv(c, ThisTag);
        const buf = message.buffer;
        const tx = buf.upkint();
        const ty = buf.upkint();
        const tz = buf.upkint();
        const Type = buf.upkstr();
        const F = new Field(1, 1, 1, Type);
        F.InitiateField(tx, ty, tz, Type, 0);
        F.setData(buf.upkarray(), true); // Phoenix: no extra copy
        return F;
    }

    static sendTaskIDNeighbors(jpvm, tids, tag) {
        const NPROC = tids.length;
        const nulo = new jpvmTaskId("0", 0);
        for (let i = 0; i < NPROC; i++) {
            let Left, Right;
            if (i === 0) Left = nulo;
            else Left = tids[i - 1];
            if (i === NPROC - 1) Right = nulo;
            else Right = tids[i + 1];
            const buf = new jpvmBuffer();
            buf.pack(Left);  //empacote a TaskId do vizinho da esquerda
            buf.pack(Right); //empacote a TaskId do vizinho da direita
            jpvm.pvm_send(buf, tids[i], tag); //manda a TaskId para o recebedor
        }
    }

    /** Sends the 3 planes of the left ('l') or right ('r') side of a field. */
    static sendBorder(jpvm, f, lr, tid, tag) {
        const buf = new jpvmBuffer();
        const tx = f.tx, ty = f.ty, tz = f.tz;
        buf.pack(tx);
        buf.pack(ty);
        buf.pack(tz);
        buf.pack(lr);
        let i1;
        if (lr === 'l') //lado esquerdo
            i1 = 0;
        else //lado direito
            i1 = tx - 3;
        const plane = ty * tz;
        buf.pack(f.getData().subarray(i1 * plane, (i1 + 3) * plane), 3 * plane, 1);
        jpvm.pvm_send(buf, tid, tag);
    }

    /**
     * Receives 3 planes. Java filled a double[3][ty][tz]; here `border` is a
     * flat array of 3*ty*tz values: border[(plane*ty + j)*tz + k].
     */
    static async receiveBorder(jpvm, border, tid, tag) {
        const message = await jpvm.pvm_recv(tid, tag);
        const tx = message.buffer.upkint();
        const ty = message.buffer.upkint();
        const tz = message.buffer.upkint();
        const lr = message.buffer.upkchar();
        const tamTempData = 3 * ty * tz;
        message.buffer.unpack(border, tamTempData, 1);
    }

    /**
     * Phoenix: writes to one of the task's log files. Like the 2007 code
     * (`new FileOutputStream(logfile)`), each call overwrites the file.
     */
    static logError(myself, message, e) {
        const logfile = ("ERROR:" + myself.getHost() + ":" + myself.getPort() + ".log");
        let text = message + "\n";
        if (e != null) text += (e.stack || String(e)) + "\n";
        const env = jpvmEnvironment._workerEnv;
        if (env) env.log(logfile, text, false);
        else console.log(logfile + ": " + text);
    }

    /** Phoenix: the slaves' `PrintStream print` to "LOG:host:port.log". */
    static openLog(jpvm, logfile) {
        jpvm.log(logfile, "", false);
        return { println: (s) => jpvm.log(logfile, s + "\n", true) };
    }

    /** Where printMessageFromSlaves(..., true) writes (System.out in 2007). */
    static console(s) {
        if (PvmUtil.out) PvmUtil.out(s); else console.log(s);
    }

    static packBoolean(buf, b) {
        let valor = 0;
        if (b) valor = 1;
        else valor = 0;
        buf.pack(valor);
    }
    static unpackBoolean(buf) {
        let b = false;
        const valor = buf.upkint();
        if (valor === 0) b = false;
        else b = true;
        return b;
    }
}
PvmUtil.out = null;
