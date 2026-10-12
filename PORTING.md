# Porting notes: CelCampJava v1.0 → JavaScript

The goal was to keep the program recognisable from the inside, not only from the outside. Every Java class of the running program has a JavaScript file with the same name, and the same fields and methods. The master/slave conversation is message for message the 2007 one, with the same tags (11, 12, 14, 22, 33, 34, 4444, `197+n`, 900/902/904…). Comments and messages are kept, Portuguese included ("Fim da Simulacao!!").

This file lists what had to change, and the few places where the 2007 behaviour was deliberately changed. Each of those places is marked `Phoenix:` in the code.

## Platform mapping

| Java (2007) | JavaScript (2026) |
|---|---|
| `jpvm.*` (Ferrari's JPVM over TCP) | `js/jpvm/`: same API (`pvm_spawn`, `pvm_send`, `pvm_recv(tid, tag)`, `jpvmBuffer.pack/upkint/upkstr…`, `jpvmTaskId`) over Web Workers and MessageChannels; every pair of tasks gets a direct channel, as JPVM had direct TCP connections |
| blocking `pvm_recv` | `await jpvm.pvm_recv(...)`; `main()` of the slaves and `CalculateXParallel()` of the masters are `async` |
| 4 threads exchanging borders in `FDTD_slave` | plain sends followed by awaited receives (`postMessage` never blocks) |
| `new Thread(...).start()` for the calculation | an async task; the UI stays responsive because the slaves are workers |
| `double[] data` (J. E. Moreira's `doubleArray3D`) | `Float64Array`, same index `i*w0 + j*w1 + k` |
| `byte[]` model | `Uint8Array` |
| Java method overloading | one method that dispatches on its arguments (`Field.data(i,j,k)` reads, `data(i,j,k,v)` writes; `Model.setData`…) |
| `Field.data` (array) vs `Field.data(i,j,k)` (method) | JS cannot have both: the array is `Field.dataArray` |
| `PrintWriter` to `PATH/results/…` | `phoenix/ResultsDisk.js`: OPFS through a worker, same file names and text layout (`Double.toString` formatting is emulated by `JavaFormat.js`) |
| `LOG:host:port.log`, `ERROR:host:port.log` | virtual log files kept by `jpvmDaemon`, shown in **JPVM → Console** |
| JDOM `SAXBuilder` | `phoenix/MiniJDOM.js`: the five JDOM calls used |
| `JFileChooser` | `InputFileChooser`: bundled models, `results/`, or local files |
| `JOptionPane` (modal) | `swing/JFrame.js`: same names; the dialogs return Promises |
| `System.exit(0)` when the X partition was impossible | an error dialog |

## Bugs of 2007 fixed in the port

Each fix keeps the shape of the original code. The comment next to it shows what was there before.

**EH calculation (`FDTD_slave`)**

1. **H coefficient.** `a=(2*-siC*dt)/(2*mu+siC*dt)` evaluates to 0 for `siC=0`, so H lost its previous value at every step. It is now `(2*mu-siC*dt)/(2*mu+siC*dt)`, which is 1 for lossless media.
2. **Material lookup by index.** The H loop and the conductor loop used `Mat[code]`, an index, where the material code was meant. `Mat[16]` is code 17, so for example Hypotalamus was zeroed as if it were copper, and copper itself was not. All lookups now go by code, as the E loop already did.
3. **Frequency.** The slave fixed `FreqIndex = 1` (1.8 GHz) and ignored the frequency chosen in the window. It also crashed on single-frequency models such as the cubes. Java passes ints by value, so the index unpacked in `receiveMaterials` never got out of the method. The index chosen in the window is now used.
4. **Source position across slices.** Sources were placed at global X `i + ModelX*slaveID`, but the slices overlap by one plane, so only slave 0 put them in the right place. The master now sends each slave its X offset.
5. **Mur boundary at internal seams.** On the edges where a slice border meets a y/z boundary, the x‑Mur condition was applied at internal planes. It is now applied only at the real model border.
6. **Order of operations at the left border.** The copy of the neighbour's border plane came after Mur points that read it, which then used the previous step's value. The copy now happens first. Since items 4–6, the result no longer depends on NPROC; `tests/physics.test.js` checks this for 1, 3 and 4 slaves.
7. **Sources on a shared plane** were skipped in the right-border branch (`continue` before the source loop). They are now applied there too.

**EH output (`Field`)**

8. **E and H files swapped.** `EscreveE` averaged the two face points around each cube centre, which by `Field.isHx/Hy/Hz` hold H. `EscreveH` averaged the four edge points, which hold E. The formulas are swapped, so `EN<n>` files contain |E| and `HN<n>` files contain |H|.

**Temperature calculation (`FDTD_T_slave`)**

9. **Parallelisation.** "implementar paralelizacao da temperatura" was still on the 2007 to‑do list: the T slaves never exchanged borders, so only `NPROC = 1` worked. They now exchange the neighbouring planes: material codes once, temperatures every step, through `PvmUtil.sendBorder`/`receiveBorder` like the EH slaves.
10. **dtT stability limits.** The Wang/Bernardi checks changed `dtThour` after `const1` had already been computed from it, so they had no effect. They now apply. With dtT ≤ 1 s, which the window enforces, the head never reaches them.
11. **Tinit.** At `n == 0` the 2007 code called `T[0].setData(Tinit.getData())` once per tissue cube, copying the whole array 10 million times on the head. It now copies each value once, which gives the same result.
12. **Model border.** A tissue cube on the model border made the 2007 code throw `ArrayIndexOutOfBoundsException`. Such neighbours are now treated as air.

**Main window and model**

13. **Repeated EH runs.** `Calculate → EH` expanded the model in place, so a second EH run, or a T run after an EH run, used an already expanded model. A copy is expanded now.
14. **`Model.redux()`** kept DX/DY/DZ while halving the number of cubes. The deltas are now doubled.
15. **Linear sources** reached the slaves as point sources, because `PvmUtil.sendSources` packed only the base `Source` fields. Their axis, field and extent now travel too.

## Behaviour kept on purpose

- **CCA options.** The radios are "Mur 1st Order", "Mur 2nd Order" and "PML". `Mur2aOrdem()` was commented out in 2007, so 2nd order behaves as 1st order. PML was never written: the boundary stays at 0, a perfect conductor. Both are explained in tooltips.
- **Convection.** It is multiplied by a factor derived from the emissivity `e`. In the head model only skin and hair (`e = 0.98`) lose heat to the air by convection; `NeckSkin` has `e = 0`. That is the 2007 model of the head and was kept.
- **SAR → T.** The menu item stays disabled, and the SAR term of the bioheat equation is still 0, as in 2007.
- **Message tags.** The `197 + n` tags collide with 900/902/904 when n is 703–707. This works only because both sides consume messages in the same order (FIFO per sender). That is still true, so the tags were kept.
- **End of a run.** The frames hide themselves at the end, after "Fim da Simulacao!!". The port then opens the Field Viewer.

## Additions

They exist only in the web version and live in `js/phoenix/` and the **Tools** menu:

- **Results folder** (`ResultsDisk`, `ResultsFrame`): browse, download and delete `results/`.
- **Field Viewer**: model, |E|, |H| and T slices, a time slider, the TMinAvMax chart, and opening `.3df` files from `results/`. It replaces the MATLAB scripts.
- **JPVM → Console**: the old `jpvmConsole` `ps`, plus the slaves' log files.
- **Tools → Redux Model** exposes `Model.redux()`, so the EH calculation of the head fits in a tab.
- **NPROC.** The spinner of the windows works; it was cosmetic in 2007, where `static NPROC` decided. Any NPROC is accepted: the slices are as even as possible, and identical to 2007 when NPROC divides the model.
- **Sources panel** in the EH window: the location and amplitude of the sources can be edited, in expanded-grid coordinates.
- **Flow control.** A slave waits for an acknowledgement (tag 905) when the master is more than two partial fields behind. TCP gave JPVM this back-pressure for free; `postMessage` does not. The partial EH field is also sent only every `skip` steps, as the T slaves already did since 10/4/2007.

## Not ported

- `CalculateEHFrame.java`, the sequential EH frame replaced by the parallel one on 07/03/2006.
- `FDTDParallelProcess` / `FDTDParallelProcessLocal` ("FORA DE USO").
- `Fantasy3D_v1.0`, the separate 3D model viewer.
- `Versao_em_C_final`, the earlier C++/V version.
- The MATLAB scripts.
- The jpvm daemon/console internals (`jpvmDaemon.java` and friends): their role is played by `js/jpvm/jpvmDaemon.js`.

The original program is kept in [`legacy/`](legacy/README.md), with the machine passwords of its `Readme.txt` removed.
