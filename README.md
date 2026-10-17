# CelCamp Phoenix

**Copacabana v1.0 / CelCampJava (2004–2010), reborn in the browser.**

CelCampJava computed the electromagnetic field of a mobile phone next to a human head (FD‑TD, Yee grid, Mur absorbing boundaries) and the temperature of the head's tissues (bioheat equation, Gandhi 2001). It ran in parallel on a Java Parallel Virtual Machine (JPVM): one `jpvmDaemon` per computer, one JVM per slave.

This is a port to JavaScript of the last known version, the backup of 27 May 2010 ("DIPOLO_VALIDADO"), that keeps the internal structure of the original. The classes, their methods and the master/slave protocol, with its message tags, are the same. Only the platform changed:

| 2010 | 2026 |
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

Any static server works (`npx http-server`, …). Every push to `main` is published to GitHub Pages by
`.github/workflows/pages.yml`.

Then, as in 2006: **File → New**, pick a model, and use the **Calculate** menu. A typical run of 2010:

1. **File → New → John3Doe_v1_0** (the head).
2. **Tools → Place Dipole Antenna → Place**: a half-wave copper dipole at 1.8 GHz beside the ear (new in the port; in 2010 the dipole was drawn into the model files).
3. **Calculate → Eletromagnetic Fields (EH) → Start**, with **Record E²** on: |E| every `reduzN` steps, and at the end the E² of the last period (`results/<name>_E2_<f>Hz`) and the SAR.
4. **Calculate → SAR to Temperature**: choose that E² file; the bioheat equation now includes the heat of the field (σE²/2).
5. **Tools → Field Viewer**: |E|, E², SAR, T and the temperature rise.

### Bundled models (`models/`)

| Model | |
|---|---|
| `John3Doe_v1_0` | The head: 151 × 259 × 259 cubes (1.86 × 1.11 × 1.11 mm), 19 tissues. The `.dat` is gzipped (20 MB → 176 KB) and unzipped in the browser. |
| `Cube_5_21_21_21` | 5 × 5 × 5 steel cubes: the April/2007 validation of the temperature calculation. Comes with two `Tinit` files. |
| `Cube_21_21_21`, `Air_21_21_21`, `Air_SmallHead` | the small test cases of the time |

The 2010 archive had no models; these come from the 2007 one, converted to the 2010 format (`dt`, `N`, `reduzN`, `dtt`, `NT`, `reduzNT`, `Tenv`, `Tblood`, `Ttissues`, `hc`, and sources with `field`/`axis` in cube coordinates). Models from disk work too, 2007 ones included: choose the `.3dm` and its `.dat` (or `.dat.gz`) together.

### What it can do on a laptop

Measured in this container (4 cores, 3 workers):

- **EH of the whole head** (82 million points, about 2.3 GB): ~0.2 s per step after ~10 s of setup; 2000 steps (about 9 periods at 1.8 GHz) took 7.4 min. With a 1 V dipole beside the ear the peak SAR was 1.8 W/kg, in the skin.
- **Temperature of John3Doe** (10 million cubes): about 0.11 s per time step: 30 min of simulated time (1801 steps) took 3.3 min. In that run the dipole's field warmed the head by at most 0.008 °C, in the muscle next to the antenna. The 2007 Readme measured 7.4 s per step on a machine at Amazon.
- **Tools → Redux Model** halves the resolution (8 times fewer points) when memory is short.

## Tests

```sh
npm test             # node --test: the slaves run in worker threads through the same jpvm layer
```

- **Model reading:** the 2010 `.3dm` attributes and sources, 2007 files with their old sources, the gzipped head, `expand()` / `redux()`.
- **April/2007 validation, with the 2010 thermal code:** the steel cube cooling from 450 °C in air at 90 °C (hc = 115 W/m²K) against the lumped analytical solution of `CompareCubeSteel_2007.m`. The maximum error is 0.46 %; the 2007 run reported 1.47 %.
- **Parallel = serial, bit for bit:** 1, 3 and 4 slaves give the same temperatures, the same |E| and the same E², also with sources on and next to the plane shared by two slaves.
- **Dipole:** the far-field pattern of a half-wave dipole (E² broadside ≫ along the axis, the 45° value about half of broadside).
- **SAR → T:** the E² of an EH run heats the tissues, and only heats them.
- **EH stability:** a 600-step EH run with Mur boundaries stays bounded.

## Layout

```
index.html, css/metal.css      the page and the Metal/Ocean look
js/TelaInicial.js              main window, menus, model reading      (TelaInicial.java)
js/SimulData.js                "Simulation Data" window                (SimulData.java)
js/CalculateEHFrameParallel.js EH window + master                      (CalculateEHFrameParallel.java)
js/CalculateTFrameParallel.js  T window + master                       (CalculateTFrameParallel.java)
js/FDTD_slave.js               EH slave                                (FDTD_slave.java)
js/FDTD_T_slave.js             T slave                                 (FDTD_T_slave.java)
js/Model.js Material.js Field.js Source.js PuntualSource.js PlaneWaveSource.js
   Limite.js PvmUtil.js Hello_slave.js
   HelpFrame.js InputFileChooser.js                                    (same names in Java)
js/jpvm/                       jpvmEnvironment, jpvmBuffer, jpvmTaskId, jpvmDaemon … on Web Workers
js/swing/                      the bits of javax.swing the frames use
js/phoenix/                    new: results disk (OPFS), viewer, results window, jpvm console, dipole tool
models/                        the models of CelCampJava_v1.0
help/                          the 2006 help screenshots (baseTextos/)
legacy/                        the original CelCampJava v1.0 source (April 2007 and May 2010)
```

[PORTING.md](PORTING.md) lists what changed between 2007 and 2010, and every place where the port deliberately behaves differently from the 2010 code, and why.

## Credits

CelCampJava / Copacabana v1.0 and the John3Doe head model: Ana de Oliveira Rodrigues, with Juliano Viana (2004–2010).
JPVM: Adam Ferrari, University of Virginia (1998).
Web port: 2026.
