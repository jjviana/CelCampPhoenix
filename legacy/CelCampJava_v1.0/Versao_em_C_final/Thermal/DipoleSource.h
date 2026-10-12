#ifndef DIPOLESOURCE_H
#define DIPOLESOURCE_H
using namespace std;
#include <math.h>

class DipoleSource:public Source
{
 protected:  
  float DZ; //DeltaZ
  float k;
  int rWL;
  static const float pi=3.14159265359;
  static const float mizero=1.25663706144e-6;
  static const float epzero=8.854e-12;
  static const float c=3e8;

  
 public:
  DipoleSource(int xx, int yy, int zz, float currentS, float f, int reduzWL, int tHS):Source(xx, yy, zz, 0, currentS,f, tHS)
    {
      rWL=reduzWL;      
      //cout << "\nDo DipoleSource: Fonte em (" << XS << "," << YS << "," << ZS << ")."; 
    };

  int getXSource() {return XS;};
  int getYSource() {return YS;};
  int getZSource() {return ZS;};

  void initialize(float dz)
    {
      DZ = dz;
      NL=(int)(2*c/(rWL*frequency*DZ));
      //cout << "\nc=" <<	c << " frequency=" << frequency;
      k=2*pi*frequency*sqrt(mizero*epzero);  
      cout << "\n\nNumero de PONTOS da FONTE =" << NL << "\nNumero de CUBOS da fonte = " << NL/2 << "\n\n"; 
    };

  void setNL(int nl) {NL=nl;};
  int getNL() { return NL; } ;

 
  bool containsPRE(int x, int y, int z)
    {
      if (x==XS && y==YS && (z==ZS || z==ZS+2 ) ) //Ez
	{
	  return (true);
	}
      else
	return (false);
    };
  
  bool contains(int x, int y, int z)    
    { 
      return(false); 
    };
  
  bool containsPOS(int x, int y, int z)
    {
      if (x==XS && y==YS && z%2==0 && z>=(ZS+2-NL/2) && z<=(ZS+NL/2) ) //Ez
	{	
	  return (true);
	}
      else
	return (false);
    };
  
  float calculatePRE (float n, float dt, int x, int y, int z)
    {
      if (containsPRE(x,y,z))
	{
	  float value=(current * sin(2*pi*frequency*n*dt)/2);
	  //cout << "\nPRE: Colocando valores no dipolo (" << x <<  "," << y << "," << z << ")=" << value;	  
	  return(value);	   
	}
      else
	return(0);
    };
  
  float calculate (float n, float dt, int x, int y, int z)
    {
      return (0);
    }; 
  
  float calculatePOS (float n, float dt, int x, int y, int z)
    {
      if (containsPOS(x,y,z))	
	{
	  float value=0;
	  //cout << "\nPOS: Colocando valores no dipolo (" << x <<  "," << y << "," << z << ")=" << value ;
	  return(value);
	}
      else
	return(0);
    };
};



#endif
