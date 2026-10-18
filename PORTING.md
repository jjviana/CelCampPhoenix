# Porting notes: CelCampJava v1.0 → JavaScript

The port follows the **last known version** of CelCampJava: the backup of 27 May 2010, `CelCampJava_v1.0_backup_27052010_DIPOLO_VALIDADO`. The first port, in 2026, followed the April 2007 version. When the 2010 backup turned up, the port was moved to the 2010 behaviour. The 2007 behaviour is not kept as an option. Both originals are in [`legacy/`](legacy/README.md).

The goal was to keep the program recognisable from the inside, not only from the outside. Every Java class of the running program has a JavaScript file with the same name, and the same fields and methods. The master/slave conversation is message for message the 2010 one, with the same tags (11, 12, 14, 22, 33, 555/666, 3301, 3302, `197+n`, 900/902/904…). Comments and messages are kept, Portuguese included ("Fim da Simulacao!!").

This file lists what had to change, and the places where the 2010 behaviour was deliberately changed. Each of those places is marked `Phoenix:` in the code.

## What changed between 2007 and 2010

Ana changed these things herself between 2007 and 2010. All of them are in the port:

- **Sources** are given in the coordinates of the original cubes, with the field (`E`/`H`) and the axis they drive (`field="E" axis="z"`). `Source.SourceLocation()` turns them into the point of the expanded grid.
- **Hard voltage source** (12/05/2010, after Elsherbeni & Demir 2009, §4.1.2): `E(n+1) = −E(n) − 2·Max·sin(2πf(n+½)dt)`, set on the 4 parallel edges of the source cube before the H update.
- **Leapfrog order**: sources → H → E → Mur → zeroing of the wire. 2007 did E then H.
- **The dipole wire**: E along the source axis is zeroed on the 4 edges of every cube of a material named `source…` or `copper…`. This replaced the 2007 "conductor" loop.
- **The 2007 bugs of the EH slave**: the H coefficient `(2*-siC*dt)` became `(2*mu-siC*dt)`, materials are looked up by code, the master sends the frequency index, and the partial field goes out only every `nSkip` steps.
- **The EN files**: |E| at each cube centre is the average of the 4 edges parallel to each component (27/05/2010, "Teste 7"). No HN file is written any more (`EscreveH(..., writeH = false)`).
- **The .3dm file** carries the parameters of the calculations: `dt`, `N`, `reduzN` for EH; `dtt`, `NT`, `reduzNT`, `Tenv`, `Tblood`, `Ttissues`, `hc` for T.
- **Temperature** (October 2008):
  - The heat of the field comes from an E² file: `hem = σ·E²/2`, through **Calculate → SAR to Temperature**.
  - The metabolism is `density·hm` [W/m³]. In 2007 it was `hm` [W/kg].
  - Radiation, convection and evaporation are always on, and convection no longer depends on the emissivity.
  - The initial temperature (`Tinit`) is copied once per cube.
  - The files are `TN<n>` and `TMinAvMax.txt`.
- **`NPROC = 1`**: the parallel exchange did not survive the new step order (see below), so the master fixed it at one slave.

## Platform mapping

| Java (2010) | JavaScript (2026) |
|---|---|
| `jpvm.*` (Ferrari's JPVM over TCP) | `js/jpvm/`: same API (`pvm_spawn`, `pvm_send`, `pvm_recv(tid, tag)`, `jpvmBuffer.pack/upkint/upkstr…`, `jpvmTaskId`) over Web Workers and MessageChannels; every pair of tasks gets a direct channel, as JPVM had direct TCP connections |
| blocking `pvm_recv` | `await jpvm.pvm_recv(...)`; `main()` of the slaves and `CalculateXParallel()` of the masters are `async` |
| 4 threads exchanging borders in `FDTD_slave` | plain sends followed by awaited receives (`postMessage` never blocks) |
| `new Thread(...).start()` for the calculation | an async task; the UI stays responsive because the slaves are workers |
| `double[] data` (J. E. Moreira's `doubleArray3D`) | `Float64Array` (`Float32Array` for the three EH fields), same index `i*w0 + j*w1 + k` |
| `byte[]` model | `Uint8Array` |
| Java method overloading | one method that dispatches on its arguments (`Field.data(i,j,k)` reads, `data(i,j,k,v)` writes; `Model.setData`…) |
| `Field.data` (array) vs `Field.data(i,j,k)` (method) | JS cannot have both: the array is `Field.dataArray` |
| `PrintWriter` to `PATH/results/…` | `phoenix/ResultsDisk.js`: OPFS through a worker, same file names and text layout (`Double.toString` formatting is emulated by `JavaFormat.js`) |
| `LOG:`, `ERROR:` and `DEBUG:host:port.log` | virtual log files kept by `jpvmDaemon`, shown in **JPVM → Console** |
| JDOM `SAXBuilder` | `phoenix/MiniJDOM.js`: the five JDOM calls used |
| `JFileChooser` | `InputFileChooser`: bundled models, `results/`, or local files |
| `JOptionPane` (modal) | `swing/JFrame.js`: same names; the dialogs return Promises |

## Bugs of 2010 fixed in the port

Each fix keeps the shape of the original code. The comment next to it shows what was there before.

**Parallel EH calculation (`FDTD_slave`, `CalculateEHFrameParallel`)**

1. **Border exchange order.** In 2010 the borders were exchanged at the start of the step, before the H update. E on the shared plane therefore used the H of the previous step. The shared plane was also updated twice: once in the E loop, where it read past the end of the slice, and again in the "Maximos se tiver vizinho" branch. The right slave copied the plane before its neighbour had applied Mur and zeroed the wire. Now:
   - after H, the right slave sends its first planes to the left one;
   - the left slave owns the shared plane and computes it once, with `BorderRight[1]`;
   - after the zeroing of the wire, it sends the finished plane back.
2. **Partition.** `Xi = (tamModelo-1)*i` only worked for `NPROC = 1`. The cubes are now spread evenly, at least 2 per slave.
3. **Sources across slices.** `SourceLocation()` subtracted `ModelX*slaveID`, which ignores the overlap of the slices. For E/x and H/y, H/z it added 1 to the global x. Sources now use `globalLocation()` and the X offset sent by the master. The extra edges of a source next to the shared plane are driven in both slices: the right slave reads `E(n)` of the main edge from the plane its neighbour sent.

   With items 1–3, any NPROC gives **bit-for-bit** the result of `NPROC = 1`. `tests/physics.test.js` checks this for 1, 3 and 4 slaves, including sources on and next to the shared plane.
4. **N + 1 twice.** The loader added 1 to `N`, and the EH window added 1 again. `N` is now the last step (steps 0…N).
5. **Edges outside the model.** The zeroing of the wire also wrote at +2 cubes. Points outside the slice or the model are now skipped instead of throwing.
6. **Saved model.** `Simul<name>.3dm` was written without `field`/`axis`/`dt`/`N`, so the 2010 loader could not open it again. They are written now.

**Temperature (`FDTD_T_slave`, `CalculateTFrameParallel`)**

7. **Parallelisation.** It was still on the to-do list: the T slaves never exchanged borders. They now exchange the neighbouring planes: material codes once, temperatures every step.
8. **dtT stability limits.** The Wang/Bernardi checks changed `dtThour` after `const1` had been computed from it, so they had no effect. They also had the wrong units: `C·3600` turns C into J/(kg·°C), so the limits came out in seconds and were compared with dt in hours, 3600 times too lax.
   - They are now in hours and use the three deltas. The T window refuses to start when dtT is above the Wang limit of a material in the model, and says which. Bernardi's limit is only logged, as in 2010; it also counts surface convection and flags the steel cube at 0.89 s, which runs correctly at 1 s.
   - On the head every tissue allows dtT = 1 s. The smallest limit is CSF: 1.76 s at full resolution, 7 s after Redux.
   - Copper does not: about 2 ms on the head grid. Before this fix the wire of a dipole overflowed to NaN in **SAR to Temperature**, and with it the average of `TMinAvMax.txt`.
   - The antenna's wire (`copper…`/`source…`) is now left out of the thermal update: its cubes keep their initial temperature, as the air keeps Tenv. Its E² is written as 0 (it is a perfect conductor in the EH calculation).
   - A saved temperature step that contains a non-finite value now stops the run, naming the material and the cube.
9. **Model border.** A tissue cube on the model border threw `ArrayIndexOutOfBoundsException`. Such neighbours are now treated as air.
10. **σ of the SAR** was `mat.si(1)`, which fails on single-frequency models. Index 0 is used there.
11. **Temperature (T) menu.** It passed `reduzN`, the EH skip, as the T skip, and the last SAR file that had been read. It now passes `reduzNT` and no SAR. **SAR to Temperature** is the menu for that.
12. **SAR → T after an EH run.** It did nothing after an EH run in the same session, and that EH run had expanded the model in place. The port expands a copy of the model, so the menu always works.

**Main window and model**

13. **`Model.redux()`** kept DX/DY/DZ while halving the number of cubes. The deltas are now doubled. `dt` and the source cubes follow.
14. **`TMinAvMax.txt`** was closed only when `NMAX-1` was a multiple of the skip.

## Behaviour kept on purpose

- **The hard source.** Only the main edge is skipped by the E loop. The 3 other edges of the source cube are driven before H, then updated by the E loop like any point.
- **The wire.** Only materials whose name starts with `source` or `copper` are zeroed. The `Coper` of the test cubes does not match, so it stays a lossy dielectric (σ = 5.8·10⁷). All sources must have the same axis ("Sources have different axis!!! Not impelemented!!!").
- **CCA options.** `Mur2aOrdem()` is still commented out, so 2nd order behaves as 1st order. PML was never written. With PML the minimum faces are left alone, while the maximum faces still get Mur, because their branch has no `CCAtype` test.
- **Plane wave sources** keep their `plane`, but drive one point, like a puntual source.
- **No HN files.** `SimulXH.3df` is no longer written, because it would point to files that do not exist.
- **Temperature files.** `TN<n>`, `TMinAvMax.txt` and `Simul<name>.3dm` carry no run name, so each run overwrites the previous one, as in 2010. The EH and T runs write the same `Simul<name>.3dm`.
- **Radiation is always on.** The April 2007 steel cube validation ran with radiation off. The test reproduces it by giving the steel emissivity 0, and gets the same 0.46 % as before.
- **`TRise`** is computed by the T slave but never sent. The viewer shows T − T(n=0) instead.
- **`dt`** is limited to `1/(c·√(1/dx²+1/dy²+1/dz²))` with c = 3·10⁸, in the loader and in the EH window.
- **Message tags.** The `197 + n` tags collide with 900/902/904 when n is 703–707. This works only because both sides consume messages in the same order (FIFO per sender), so the tags were kept.

## Additions

They exist only in the web version and live in `js/phoenix/` and the **View** and **Tools** menus:

- **Run until steady state**, in the EH window (on by default). `N` becomes the maximum number of steps.
  - **Every step**, the slaves send the sum of |E|² over their cubes, weighted by σ/(2ρ) of the tissues (so it follows the SAR; unweighted in a model without tissue). The master compares the average of the last period (`1/(f·dt)` steps) with the period before, and shows the difference in the window.
  - **At the end of every period**, the slaves also compare the period averages cube by cube. The master answers each slave "go on" or "stop" (tags 99001/99002).
  - **Steady state** is reached when the per-step difference has stayed below the tolerance (1 % by default) for 2 full periods and the cube-by-cube difference is below it too. The slaves then stop.
  - **The E² file** comes only from a steady run: the slaves send `2·mean(|E|²)` of the last period, the E² of the peak. The master writes it to `results/<name>_E2_<f>Hz`, in the format read by **SAR to Temperature**. In 2010 that file was read, but nothing in CelCampJava wrote it.
  - **If `N` is reached first**, a warning gives the last difference and no E² file is written.
  - The viewer shows E² and SAR = σE²/(2ρ). The end dialog gives the peak SAR, without the air and the wire.
  - With the box unchecked the run has the fixed `N` of 2010 and writes no E².
  - **NPROC.** Fields and E² stay bit-identical for any NPROC. The per-step difference is a sum over the slaves, so it can differ in the last bits.
- **Tinit = the thermal steady state, always.** **SAR to Temperature** always starts from the steady state of the model without SAR, saved in `results/<model>_Tinit` (one file per model: the full head and its Redux have their own). A `.info` file records the grid, Tenv, Tblood, hc, the tolerance and the step.
  - When there is no such file, or it was made for other conditions or with a looser tolerance, Start first runs without SAR until the steady state, saves it, then runs the SAR from it. Later runs reuse it, also in later sessions.
  - **Steady** means: every `W` steps (600), the slaves send Σ|T − T(n−W)| and Σ|T − T(0)| over their tissue cubes (tags 99001/99002, like the EH). The run stops when the first is below the tolerance (0.01 % by default) of the second at 2 checks in a row. The maximum is its own field (36001 steps).
  - **Temperature (T)** does the same with **Run until steady state and save it as Tinit** (on by default). Unticked, it is the fixed-N run of 2010. The Tinit button still lets you choose another file.
  - On the Redux head, Tinit at 1 % takes 80 min of simulated time (78 s of calculation), but still drifts by up to 0.03 °C in the next 30 min, more than the rise caused by a 1 V dipole. At the default 0.01 % it takes 190 min (176 s) and the drift is 0.0003 °C.
- **SAR table at the end of a steady EH run** (`js/phoenix/SARStats.js`). It gives the figures of the thesis (Fig. 6.3, 6.4): 1 voxel max, 1 g max, 1 g brain max (Brain and Hypotalamus) and 1 voxel brain max.
  - **1 g** is the smallest cube, centred on a voxel, that holds 1 g of that tissue, with the SAR mass-averaged over it.
  - **Comparison:** with Gandhi, Lazzi & Furse 1996 (835 MHz/600 mW and 1900 MHz/125 mW, the frequency nearest to the run), with error = (value − Gandhi)/Gandhi, next to the thesis's own values. The reference values are those of the thesis figures.
  - **Values** are the ones calculated, not scaled.
  - **Antenna power:** for information, the end dialog also gives the power fed to the antenna, V·∮H·dl around the source cube averaged over the last period, and the power absorbed by the tissues. A 7 cm dipole in air at 1.8 GHz shows an input resistance of 84 Ω.
  - **Report file:** `results/<model>_SAR_<f>Hz.txt`.
- **Tools → Place Dipole Antenna**: writes a copper wire with a one-cube air gap and a hard E source in the gap. By default it is a half-wave dipole parallel to the longest side of the model, 1 cm from its surface. On the head that means vertical, beside the ear. A test checks the far-field pattern: E² broadside ≫ along the axis, and the 45° value about half of broadside.
- **Thesis 2003** button in **Place Dipole Antenna**: the antenna of the thesis (Rodrigues 2003, p. 59) and of MOMAG 2008. It is half-wave, along y, at 1.8 GHz, with the gap at cube (10, 121, 150) of John3Doe, 1.86 cm from the skin. On another grid (a Redux) it uses the same physical point.
- **Conduction between tissues** in the T window: *2010* (default, CelCampJava) or *2003*, the C program of the thesis (`Versao_em_C_final/Thermal/FDTDSimulator.cpp`, `ThermalPoint`).
  - **2003** follows the version of 25/03/2003 (`Versao_em_C/FDTDSimulator.cpp`, inside the Drive backup `CelCampJava_v1.0_ThermalOK_03042007.zip`), see `FDTD_T_slave.calculateGrads2003`. Its Tinit is saved apart, as `results/<model>_Tinit_2003`.
    - K∇²T only between cubes of the same tissue, one-sided at an interface.
    - Convection only from skin and hair (CF = 1 in the C program; neck skin, eye and muscle do not lose heat to the air), the materials with an emissivity in the `.3dm`. In 2010 every cube next to the air loses heat by convection, neck skin included.
    - ∇K·∇T only along x (the y and z terms are commented out): |K₊ − K|(T₊ − T)/Δx² + |K − K₋|(T₋ − T)/Δx², each half forced to carry heat from hot to cold, when both x neighbours are not air and K changes. So between tissues heat flows only along x, with the conductance |ΔK| instead of K.
  - **Thesis reproduced.** Full head, 1.8 GHz, **Thesis 2003** antenna, field scaled to the thesis peak SAR (1.947 W/kg, i.e. 4.43 V at the gap, 71.5 mW fed, 16.9 mW absorbed), 60 min, heating by the field (T − T without SAR) in °C:

    | Tissue | thesis (Table 6.8) | 2003 conduction | 2010 conduction |
    |---|---|---|---|
    | CSF | 0.041 | 0.041 | 0.021 |
    | Bone | 0.040 | 0.039 | 0.022 |
    | Muscle | 0.036 | 0.034 | 0.024 |
    | Skin + hair | 0.032 | 0.028 | 0.026 |
    | Skin | 0.028 | 0.025 | 0.024 |
    | Brain | 0.018 | 0.013 | 0.018 |
    | Fat | 0.005 | 0.006 | 0.004 |

    All of them level off before 30 min, as in the thesis. With the default antenna (**Beside the head**, 1 cm from the skin, 3.0 mW absorbed at the same peak SAR) the maximum is 0.0085 °C (2010) and 0.013 °C (2003). The difference from the thesis came mostly from where the antenna was, and the rest from the 2003 conduction.
  - **With the thesis's own data** (uploaded later: the E² of 08/07/2003, `TRModel_MODE2_1.8GHz_125mW`, peak SAR 1.947 W/kg in hair; and the steady state of 25/06/2003, `ModeloModel_SteadyT_ok`, on the same grid minus its last plane in x, y and z):
    - **Heating by that E² alone**, 60 min, 2003 conduction, in °C: CSF 0.049 (thesis 0.041), bone 0.047 (0.040), muscle 0.040 (0.036), hair 0.035 (0.032), skin 0.028 (0.028), brain 0.016 (0.018). 2010 conduction: 0.022–0.030 in all of them. The convection rule does not change these.
    - **The port's 2003 steady state** matches the thesis file in brain, CSF, skin, bone, muscle and the eye (min/mean/max within about 0.1 °C).
    - **The thesis file is not steady under these rules.** Started from it without SAR, fat warms everywhere (+0.23 °C median in 10 min), neck skin warms (up to +1.4 °C), and bone and CSF cool at their interfaces (down to −0.5 °C). So the program that made it (June 2003, with SkinII, Hair, Hypotalamus and Iris, not found) differed from the March 2003 code in fat, neck skin, hair and the tissue interfaces. Its T − Tinit cannot be reproduced exactly without that source.
  - **The 2010 conduction reproduces the 2008 Java exactly.** `Z_2008_SteadyT.zip` (uploaded later) holds a 2008 CelCampJava run: the June 2003 model (`SimulModeloModel`, 150×258×258), 9000 s of 1 s from 36.8 °C without SAR, result `TN9000` (22/10/2008). The port on the same model and protocol gives the same temperature in all 1,856,708 tissue cubes within 1.9·10⁻⁶ °C, the rounding of the float32 values in the 2008 file (only the copper cubes differ: NaN in 2008, frozen in the port).
  - **The thesis steady state is a third one.** The same zip compares the 2008 run with the thesis means (Table 6.5): there the whole eye is at about 35.2 °C. The 25/06/2003 file has it at 36.0–36.8 °C, and 2008 Java/2010 at 34.4–35.8 °C. So the thesis started from a later steady state, in which the eye lost heat (through the cornea: the March 2003 code has a separate cornea loss, commented out). Neither that file nor that code version was found.
  - **Not used:** the later copy, `Versao_em_C_final` (2006, kept in `legacy/`). Its ∇K·∇T reads (K − K₋)(T − T₋)/Δ² on the expanded grid. That pushes a cube away from a neighbour of lower K and grows about 5× per simulated minute whatever the time step (1 s or 0.1 s), so it cannot have produced the thesis results.
- **View → Results Folder** (`ResultsDisk`, `ResultsFrame`): browse, download and delete `results/`.
- **View → Field Viewer**: slices of the model, |E|, E², SAR, T and the T rise, a time slider, the TMinAvMax chart, and opening `.3df` files from `results/`. It replaces the MATLAB scripts.
- **JPVM → Console**: the old `jpvmConsole` `ps`, plus the slaves' log files.
- **Tools → Redux Model** exposes `Model.redux()`.
- **NPROC** can be chosen again, in both windows.
- **Sources panel** in the EH window: the cube, field, axis and amplitude of the sources can be edited.
- **2007 model files** still open. The missing parameters get defaults. A 2007 source, given on a point of the expanded grid, becomes the component its parity names (`21,21,20` → Hz in cube 10,10,10).
- **Speed and memory.**
  - The EH fields are `Float32Array`.
  - Only |E| at the cube centres goes to the master.
  - The two older time levels are copied only on the layers that Mur reads. 2010 copied the whole grid twice per step.

  The full head (82 million points) needs about 2.6 GB and runs at about 0.25 s per step with 3 workers. With a dipole beside the ear it reached steady state in 3233 steps (13.4 min).
- **Flow control.** A slave waits for an acknowledgement (tag 905) when the master is more than two partial fields behind. TCP gave JPVM this back-pressure for free; `postMessage` does not.

## Not ported

- `CalculateEHFrame.java`, the sequential EH frame replaced by the parallel one on 07/03/2006.
- `FDTDParallelProcessLocal` ("FORA DE USO").
- `LinearSource` and `DipoleSource` of 2007, deleted in 2010. A `linear` source in a model is reported as an error.
- `Fantasy3D_v1.0`, the separate 3D model viewer.
- `Versao_em_C_final`, the earlier C++/V version.
- The MATLAB scripts.
- The jpvm daemon/console internals (`jpvmDaemon.java` and friends): their role is played by `js/jpvm/jpvmDaemon.js`.
