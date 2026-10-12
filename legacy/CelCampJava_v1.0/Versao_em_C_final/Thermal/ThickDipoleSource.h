#ifndef THICKDIPOLESOURCE_H
#define THICKDIPOLESOURCE_H
using namespace std;
#include <math.h>
#include "MaterialModel.h"

class ThickDipoleSource:public Source
{
 protected:   
  //from dipole:
  float DX, DY, DZ; //DeltaZ
  float k;
  int rWL;
  static const float pi=3.14159265359;
  static const float mizero=1.25663706144e-6;
  static const float epzero=8.854e-12;
  static const float c=3e8;  
  float constante;

  //new:
  MaterialModel* MatMod;  
  
 public:
  
  //from dipole:
  int getXSource() {return XS;};
  int getYSource() {return YS;};
  int getZSource() {return ZS;};
  void setNL(int nl) {NL=nl;};
  int getNL() { return NL; } ;
  bool containsPRE(int x, int y, int z) 
    {
      return (false);
    };
  
  bool contains(int x, int y, int z) 
    {
      if (x==XS && y==YS && (z==ZS || z==ZS+2 ) ) //Ez
	return (true);
      else
	return (false);
    };
  
  bool containsPOS(int x, int y, int z) 
    {
      return (false);
    };
  
  float calculatePRE (float n, float dt, int x, int y, int z) 
    {
      return(0);
    };
  
  float calculate (float n, float dt, int x, int y, int z) 
    {
      //cout << "\nCalculating the Source with n = " << n-0.5;
      return (constante*DX*DY/dt)*(77* current * cos(2*pi*frequency*(n-0.5)*dt))/DZ; //Ez = V/DZ = R*Io/DZ
    };
  
  float calculatePOS (float n, float dt, int x, int y, int z)
    {
      return(0);
    };
  
  //new:
  ThickDipoleSource(MaterialModel* MMod, int xx, int yy, int zz, float currentS, float f, int reduzWL, int tHS):Source(xx, yy, zz, 0, currentS,f, tHS)
    {
      rWL=reduzWL;
      MatMod=MMod;
    };
  
  void initialize()
    {      
      DX = MatMod->getDeltaX();
      DY = MatMod->getDeltaY();
      DZ = MatMod->getDeltaZ();
      
      if (XS%2==0 && YS%2==0 && ZS%2==0)
	constante = epzero;
      else
	constante = mizero;
      
      NL=(int)(2*c/(rWL*frequency*DZ));
      if (NL%2==1)
	NL++;

      k=2*pi*frequency*sqrt(mizero*epzero);  
      
      //new:
      int cobre = 12;           
      grid<int> &matmesh=MatMod->getMesh(); 		  
      for (int zz=(ZS-NL/2); zz<=(ZS+NL/2+2); zz++) //ANTENNA
	if (zz!=ZS+1) //GAP
	  { 
	    matmesh.setData(XS,YS,zz,cobre);	  
	  }
    };
  
};

#endif
