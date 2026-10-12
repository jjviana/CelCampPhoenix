#ifndef PLANEWAVESOURCE_H
#define PLANEWAVESOURCE_H
using namespace std;
#include <math.h>

class PlaneWaveSource:public Source{
 protected:
  char coordenate;
  static const float pi=3.14159265359;

 public:
  PlaneWaveSource(int xx, int yy, int zz, float currentS, float f, int tHS, int coord):Source(xx, yy, zz, 1, currentS,f, tHS)
    {
      coordenate=coord;
    };
  
  bool contains(int x, int y, int z)
    {     
      //Only in Hz and Ez
      if (coordenate=='x')  
	{
	  //cout << "\n Entrou no PlaneWaveSource coordenate=='x', com XS = "<< XS;
	  if (XS%2==1)	    
	    return (x==XS  && y%2==1 && z%2==1);
	  else 
	    return (x==XS && y%2==0 && z%2==0);
	}

      if (coordenate=='y')  
	{
	  if (YS%2==1) return (x%2==1 && y==YS  && z%2==1);
	  else return (x%2==0 && y==YS  && z%2==0);
	}
      
      if (coordenate=='z')
	{
	  if (ZS%2==1) return (x%2==1 && y%2==1 && z==ZS );	  
	  else return (x%2==0 && y%2==0 && z==ZS );
	}
	
    };

  float calculate (float n, float dt, int x, int y, int z) 
    {    
      return (current*cos(2*pi*frequency*n*dt));		
    };
};

#endif
