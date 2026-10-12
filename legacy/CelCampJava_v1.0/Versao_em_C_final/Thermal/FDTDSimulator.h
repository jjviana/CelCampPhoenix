#ifndef FDTDSIMULATOR_H
#define FDTDSIMULATOR_H
using namespace std;
#include <list>
#include "grid.h"
#include "MaterialModel.h"
#include "Source.h" 
#include <string>

/**
   Esta classe implementa um simulador de 
   propagacao de campos eletromagneticos de acordo com o
   metodo FDTD.
**/

class FDTDSimulator {
  
 public:
  enum WorkingMode {MODE_3D,MODE_2D_TE,MODE_2D_TM};
  int OrdemCC;
  int ttee1, ttee2; //variaveis de teste para impressao
  int Ferromag;
 protected:
  /**
     A simulaáÉo deve possuir uma ou mais fontes.
  **/
  
  list<Source*> SL;
  
  /**
     A simulaáÉo possui um înico "grid" de pontos que contâm a 
     informaáÉo sobre materiais.
  **/
  
  MaterialModel *m;
  
  /**
     A simulaáÉo contâm dois grids de pontos que contâm a informaáÉo sobre
     os valores de campo eletromagnâtico em cada ponto do domçnio: um grid
     armazena os valores calculados no instante de tempo anterior (calculados
     no instaqnte t-1) e outro armazena os valores que estÉo sendo calculados 
     no instante de tempo atual.
     
  **/
  grid<float> *FieldN,   *FieldNPlus,   *FieldNMinus;		
  grid<float> *ThermalN, *ThermalNPlus, *TRise;
  
  /**
     Intervalo de tempo entre cada passo da simulaáÉo(delta t)
  **/
  float deltaT, Dx, Dy, Dz; //Steps in space and time
  float f; //frequency
  float Tinit; //Initial tissue temperature for the thermal calculations
  float Tenv;  //Initial environment temperature for the thermal calculations
  int N; //number of iteractions
  float *Tmedia; //Temperatura media do tecido
  int *CubosMedia; //number of cubes to calculate the media;

  // APAGAR ESTAS VARIAVEIS DEPOIS...
  float AreaIrrad; //area irradiada
  float hCONVtotal; //potencia irradiada total

  /**
     Constantes para o calculo do FD-TD
  **/
  float *Ca, *Cb, *Da, *Db;
  
  /**
     Modo de funcionamento:
     0= 3D
     1= 2D TE
     2= 2D TM
  **/
  WorkingMode mode;
  
  /**
     Temperature Boundary Conditions
  **/
  int NoTBound; //number of boundaries. max = 6
  int TBpoint[6];//boundaries coordinate value
  char TBcoord[6]; //boundaries coordinate
  float TBvalue[6]; //temperature value

  /**
     Temperature Calculation Type: 'g' = Gandhi, 'w' = Wang;
  **/
  char TFormType;

  /**
     SAR calculations
  **/  
  float maxSAR;
  int PmaxSARX, PmaxSARY, PmaxSARZ; //location of max
  char* TmaxSAR; //tissue of max
  grid<float> *SARvalues;
  grid<float> *SARsum;
  float totSAR;
  int SARsumOK;

  /**
     Stability check
  **/
  int STEADYcheck;
  int NSteady;
  float LastE;
  float LastSAR;     

 public:
  
  void setPmaxSARX(int xx){ PmaxSARX = xx;}
  void setPmaxSARY(int yy){ PmaxSARY = yy;}
  void setPmaxSARZ(int zz){ PmaxSARZ = zz;}
  float GettotSAR(){ return totSAR;}
  int getSTEADYcheck(){return STEADYcheck;}
  int getSARsumOK(){return SARsumOK;}
  /*
    Constri uma simulaáÉo baseada no modelo material ,passo de tempo e modo de funcionamento fornecidos
  **/
  
  FDTDSimulator(MaterialModel *mm,float timestep, WorkingMode wmode, float f, float Tinit, float Tenv, char TFT, int NN);

  ~FDTDSimulator() 
    {
      if (FieldN!=NULL) delete FieldN;
      if (FieldNPlus!=NULL) delete FieldNPlus;
      if (FieldNMinus!=NULL) delete FieldNMinus;
      if (ThermalN!=NULL) delete ThermalN;
      if (ThermalNPlus!=NULL) delete ThermalNPlus;
      if (TRise!=NULL) delete TRise;
      if (Ca!=NULL) delete Ca;
      if (Cb!=NULL) delete Cb;
      if (Da!=NULL) delete Da;
      if (Db!=NULL) delete Db; 	       
      if (Tmedia!=NULL) delete Tmedia;
      if (CubosMedia!=NULL) delete CubosMedia;
      if (TmaxSAR!=NULL) delete TmaxSAR;
      if (SARvalues!=NULL) delete SARvalues;
    }
  
  inline float getTimeStep() { return deltaT; };
  inline float getDX() {return m->getDeltaX();};
  inline float getDY() {return m->getDeltaY();};
  inline float getDZ() {return m->getDeltaZ();};
  inline int getLength() {return m->getMesh().getLength();}; //x
  inline int getWidth() {return m->getMesh().getWidth();}; //y
  inline int getHeight() {return m->getMesh().getHeight();}; //z
  inline MaterialModel* getMaterialModel() {return m;};
  inline list<Source*>& getSources() {return SL;};
  
  
  /**
     Retorna a malha contendo os valores calculados para o instante atual.
     So e valido apos uma chamada a step();
  **/
  grid<float>& getCurrentFieldMesh() { return *FieldN; };
  
  /**
     Adiciona fontes ao modelo
  **/
  inline void addSource(Source * s)
    {
      SL.push_back(s);
    }
  
  /**
     Calcula uma interacao no tempo do mâtodo fd-td.
  **/
  void step(int n, int naoFioInf, char interface);   
  
  /**
     Calcula o aumento de temperatura via SAR
  **/
  void stepThermal(int n);
  float ThermalPoint(int x, int y, int z, float ***Tn, float ***TR, int ti);
  float GetThermalPoint(int i,int j,int k);
  float GetThermalRisePoint(int i, int j, int k);
  float ThermalInit(int i, int j, int k);
  float GetSARvalues(int i, int j, int k);

  void SetTSurfaceBoundary(int a, char coor, float tb)
    {
      NoTBound++;
      cout << "\nNumber of Thermal Boundaries = " << NoTBound;
      if (NoTBound>=6)
	cout << "\nProblems!!! Value Ignored!! TBoundary max = 6!!";
      else
	{
	  int indice = NoTBound-1;
	  TBpoint[indice]=a; 
	  TBcoord[indice]=coor;
	  TBvalue[indice]=tb;
	  cout << "\nBOUNDARY SET AT FDTDSimulator.h : " << coor << " = " << a << ", value = " << tb;
	}
    }
  
};

#endif
