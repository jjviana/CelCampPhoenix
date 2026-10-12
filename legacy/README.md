# legacy/ — CelCampJava v1.0 (April 2007)

The original program this repository ports to the web, as it was left on 20 April 2007
(`CelCampJava_v1.0_comTinit_20042007.zip`). It is kept for reference and for sentimental reasons;
the web version lives in the root of the repository.

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

## What was changed or left out

- **Passwords removed**: `src/Readme.txt` had two machine passwords in the instructions for running on two computers;
  they were replaced by `(senha removida)`.
- **Not included** (build output, binaries or third-party code): `build/` and `dist/` (compiled classes, the program's jar,
  slave log files), `lib/` and `Fantasy3D_v1.0/lib/` (JDOM), `Fantasy3D_v1.0/build/`, `celcamp.tar.gz` (a deployment bundle),
  the `.o` files and the `CC` executable of the C++ version, the NetBeans profiler snapshots (`nbproject/private/`),
  and editor backup files (`*~`).
- `John3Doe_v1_0.dat` and `John3Doe_original.dat` are gzipped.

## Building it today (if you want to try)

It is a plain Java 5 Swing program. With a JDK and JDOM 1.0 on the classpath:

```sh
cd src
javac -cp jdom.jar *.java jpvm/*.java
java jpvm.jpvmDaemon &          # one per machine
java -Xmx700M -cp jdom.jar:. TelaInicial
```
