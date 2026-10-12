# CelCamp Phoenix

**Copacabana v1.0 / CelCampJava (2004–2007), reborn in the browser.**

CelCampJava computed the electromagnetic field of a mobile phone next to a human head (FD‑TD, Yee grid, Mur absorbing boundaries) and the temperature of the head's tissues (bioheat equation, Gandhi 2001). It ran in parallel on a Java Parallel Virtual Machine (JPVM): one `jpvmDaemon` per computer, one JVM per slave.

This is a port to JavaScript that keeps the internal structure of the original. The classes, their methods and the master/slave protocol, with its message tags, are the same. Only the platform changed:

| 2007 | 2026 |
|---|---|
| Swing `JFrame`s | windows in a Metal/Ocean-looking web page |
| JPVM slaves (one JVM each, TCP between them) | Web Workers, MessageChannels between them |
| `java jpvm.jpvmDaemon` + `jpvmConsole` in shells | a daemon object in the page (**JPVM → Console**) |
| results written to `CelCampJava_v1.0/results/` | written to `results/` in the browser's private file system (OPFS), same text formats |
| MATLAB scripts to look at the results | **Tools → Field Viewer** |

## Running it

Web Workers and OPFS need the page to be served over HTTP:

```sh
npm start            # = node serve.mjs, no dependencies
# open http://localhost:8080/
```

Any static server works (`npx http-server`, GitHub Pages, …).

Then, as in 2006: **File → New**, pick a model, and use **Calculate → Eletromagnetic Fields (EH)** or **Calculate → Temperature (T)**.

### Bundled models (`models/`)

| Model | |
|---|---|
| `John3Doe_v1_0` | The head: 151 × 259 × 259 cubes (1.86 × 1.11 × 1.11 mm), 19 tissues. The `.dat` is gzipped (20 MB → 176 KB) and unzipped in the browser. |
| `Cube_5_21_21_21` | 5 × 5 × 5 steel cubes: the April/2007 validation of the temperature calculation. Comes with two `Tinit` files. |
| `Cube_21_21_21`, `Air_21_21_21`, `Air_SmallHead` | the small test cases of the time |

Models from disk work too: choose the `.3dm` and its `.dat` (or `.dat.gz`) together.

### What it can do on a laptop

Measured headless in this container's Chromium (4 cores, 3 workers):

- **Temperature of John3Doe** (10 million cubes): about 0.35 s per time step. A 10,001-step run (2 h 47 min of simulated time) takes about an hour. The 2007 Readme measured 7.4 s per step, 20.5 h in total, on a machine at Amazon.
- **EH of John3Doe**: the expanded Yee grid of the full head has 82 million points (~2.5 GB), too much for a browser tab. **Tools → Redux Model** halves the resolution (75 × 129 × 129 cubes, 10 M points, ~320 MB); 240 steps then take about 35 s. The source of the 2007 file sits in a corner of the box, so move it next to the head in the **Sources** panel of the EH window.

## Tests

```sh
npm test             # node --test: the slaves run in worker threads through the same jpvm layer
```

- **Model reading:** the `.3dm` + `.dat` files, the gzipped head, and `expand()` / `redux()`.
- **April/2007 validation:** the steel cube cooling from 450 °C in air at 90 °C (hc = 115 W/m²K) against the lumped analytical solution of `CompareCubeSteel_2007.m`. The maximum error is 0.46 %; the 2007 run reported 1.47 %.
- **Parallel = serial:** 1, 3 and 4 slaves give the same temperatures and the same E/H fields. 4 slaves tests the uneven slices.
- **EH stability:** a 400-step EH run with Mur boundaries stays bounded.

## Layout

```
index.html, css/metal.css      the page and the Metal/Ocean look
js/TelaInicial.js              main window, menus, model reading      (TelaInicial.java)
js/SimulData.js                "Simulation Data" window                (SimulData.java)
js/CalculateEHFrameParallel.js EH window + master                      (CalculateEHFrameParallel.java)
js/CalculateTFrameParallel.js  T window + master                       (CalculateTFrameParallel.java)
js/FDTD_slave.js               EH slave                                (FDTD_slave.java)
js/FDTD_T_slave.js             T slave                                 (FDTD_T_slave.java)
js/Model.js Material.js Field.js Source.js PuntualSource.js LinearSource.js
   DipoleSource.js PlaneWaveSource.js Limite.js PvmUtil.js Hello_slave.js
   HelpFrame.js InputFileChooser.js                                    (same names in Java)
js/jpvm/                       jpvmEnvironment, jpvmBuffer, jpvmTaskId, jpvmDaemon … on Web Workers
js/swing/                      the bits of javax.swing the frames use
js/phoenix/                    new: results disk (OPFS), viewer, results window, jpvm console
models/                        the models of CelCampJava_v1.0
help/                          the 2006 help screenshots (baseTextos/)
```

[PORTING.md](PORTING.md) lists every place where the port deliberately behaves differently from the 2007 code, and why.

## Credits

CelCampJava / Copacabana v1.0 and the John3Doe head model: Ana de Oliveira Rodrigues, with Juliano Viana (2004–2007).
JPVM: Adam Ferrari, University of Virginia (1998).
Web port: 2026.
