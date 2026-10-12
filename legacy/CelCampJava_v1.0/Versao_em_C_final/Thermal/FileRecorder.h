#ifndef FILERECORDER_H
#define FILERECORDER_H
using namespace std;
#include <string>
#include "FDTDSimulator.h"
#include "MaterialModel.h"
#include <fstream>

class FileRecorder{
 private:
  char* dirname;
  string prefix;
  int count;
  int count1;
  fstream arqEx, arqEy, arqEz, arqHx, arqHy, arqHz;


 public:
  FileRecorder(string& p, char* dir){
    count=0;
    count1=0;
    prefix=p;
    dirname = dir;
  }
  void record(FDTDSimulator *Sim, float tempo, int slice, int coord);
  void recordAll(FDTDSimulator *Sim, float tempo);
  void recordFields(FDTDSimulator *Sim, int fatia, int coord);
  void recordPoint(FDTDSimulator *Sim, int Ntotal, int x, int y, int z, int reduzT,int modeT);
  void recordSAR(FDTDSimulator *Sim, int fatia, int coord, MaterialModel* mm);  
  void recordModel(int fatia, int coord, MaterialModel* mm);
  void recordMaterial(int fatia, int coord, MaterialModel* mm);
  void recordThermal(FDTDSimulator *Sim, int fatia, int coord, MaterialModel* mm, int i); 
  void recordThermalRise(FDTDSimulator *Sim, int fatia, int coord, MaterialModel* mm, int i);
  void recordData(int mode, int Prob, int fontType, int DiSi, int ler, int mater, int tHS, char* CName, float f, float DTfactor, float DeltaT, int N, int reduzT, int DiamC, int CentroCX, int CentroCY, int CentroCZ, int  tamX, int tamY, int tamZ,float  dx, float dy ,float  dz, int xs, int ys,int  zs, int gravaFatia, int gravaPontos, int gravaSAR, int gravaThermal);
  void recordCaseData(char * filename, char * CaseName, int mode, int Prob, int fontType, int DiSi, int ler, int mater, int tHS, char* CName, float f, float DTfactor, float DeltaT, int N, int reduzT, int DiamC, int CentroCX, int CentroCY, int CentroCZ, int  tamX, int tamY, int tamZ,float  dx, float dy ,float  dz, int xs, int ys,int  zs, int gravaFatia, int gravaPontos, int gravaSAR, int gravaThermal);
};

#endif
