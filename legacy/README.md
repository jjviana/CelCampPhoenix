# legacy/ — the original CelCampJava v1.0

The original program this repository ports to the web, in two snapshots. They are kept for reference and for sentimental reasons; the web version lives in the root of the repository.

| Folder | Snapshot |
|---|---|
| [`CelCampJava_v1.0/`](CelCampJava_v1.0/) | **20 April 2007** (`CelCampJava_v1.0_comTinit_20042007.zip`): the whole project folder, with the MATLAB scripts, the C++ version, Fantasy3D, models and results. The first port (2026) was made from it. |
| [`CelCampJava_v1.0_2010-05-27/`](CelCampJava_v1.0_2010-05-27/) | **27 May 2010** (`CelCampJava_v1.0_backup_27052010_DIPOLO_VALIDADO.zip`): the NetBeans project only (sources, help pages, build files). It is the **last known version**, and the web version now follows it. See [`../PORTING.md`](../PORTING.md) for what changed between the two. |

## CelCampJava_v1.0/ (2007)

| Folder / file | What it is |
|---|---|
| `src/` | the Java sources (NetBeans 5.5 project): `TelaInicial`, `CalculateEHFrameParallel`, `FDTD_slave`, `FDTD_T_slave`, … and the `jpvm/` package (Adam Ferrari's JPVM, with the 2007 changes listed in `MudancasNaJPV.txt`) |
| `src/Readme.txt` | the lab notebook of the project: state, to-do list, timings, how to run it on several machines |
| `matlab/` | the MATLAB scripts used to look at the results (`PlotSliceFields.m`, `CompareCubeSteel_2007.m`, …) |
| `Versao_em_C_final/` | the earlier C++ version (V GUI toolkit), with its own MATLAB scripts |
| `Fantasy3D_v1.0/` | the model editor of the group (paper in `AAC_Modelo_Vinicius/CIL18-0131.pdf`). Its source is not in the archive; `dist/Fantasy3D_v1.0.jar` is the only copy of the program |
| `*.3dm`, `*.dat`, `ModelosAntigos/` | material models; `John3Doe_*.dat.gz` are the head models, gzipped (20 MB each uncompressed) |
| `results/` | results written by a 2007 run of the temperature calculation |
| `baseTextos/`, `figs/` | help pages with screenshots, figures |
| `nbproject/`, `build.xml`, `manifest.mf` | the NetBeans / Ant project |

## CelCampJava_v1.0_2010-05-27/ (2010)

| Folder / file | What it is |
|---|---|
| `src/` | the Java sources of 2010: sources with field and axis, the hard voltage source, the copper dipole wire, the SAR input of the temperature calculation, and the `jpvm/` package |
| `src/ReadmeLOCAL.txt` | the lab notebook, as last updated on 22/02/2007 |
| `src/ReadmeAMAZON.txt`, `ReadmeAMAZON_old.txt` | how the program was run on Amazon EC2 in 2008–2009 (instances long gone) |
| `src/simulacoes.ods` | timings of February 2007 for 1, 3 and 7 slaves |
| `baseTextos/` | help pages with screenshots |
| `nbproject/`, `build.xml`, `build-before-profiler.xml`, `manifest.mf` | the NetBeans / Ant project (NetBeans 6) |
| `celcampLogo.tiff` | the logo |

The 2010 archive has no models and no results. The bundled models of the web version (`../models/`) come from the 2007 snapshot, converted to the 2010 `.3dm` format.

## What was changed or left out

- **Passwords removed.** `CelCampJava_v1.0/src/Readme.txt` had two machine passwords in the instructions for running on two computers. The 2010 `ReadmeAMAZON*.txt` files had the password of the remote desktop of the Amazon machines. They were replaced by `(senha removida)`. The archives contained no keys.
- **Not included** (build output, binaries or third-party code):
  - `build/` and `dist/`: compiled classes, the program's jar, slave log files;
  - `lib/` and `Fantasy3D_v1.0/lib/` (JDOM), and `Fantasy3D_v1.0/build/`;
  - `celcamp.tar.gz`, a deployment bundle;
  - the `.o` files and the `CC` executable of the C++ version;
  - the NetBeans profiler snapshots (`nbproject/private/`, `*.nps`);
  - macOS metadata (`.DS_Store`, `__MACOSX/`) and editor backup files (`*~`).
- `John3Doe_v1_0.dat` and `John3Doe_original.dat` (2007) are gzipped.

## Building it today (if you want to try)

It is a plain Java 5 Swing program. With a JDK and JDOM 1.0 on the classpath:

```sh
cd CelCampJava_v1.0_2010-05-27/src     # or CelCampJava_v1.0/src
javac -cp jdom.jar *.java jpvm/*.java
java jpvm.jpvmDaemon &          # one per machine
java -Xmx700M -cp jdom.jar:. TelaInicial
```
