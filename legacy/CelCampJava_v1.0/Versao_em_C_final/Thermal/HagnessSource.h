// Este arquivo implementa a fonte
// utilizado em [Hagness,2000].

#ifndef HAGNESSSOURCE_H
#define HAGNESSSOURCE_H

using namespace std;
#include "PointSource.h"

class HagnessSource:public PointSource {
  
 protected:
  float tau,fi,dt;
  float dx,dy;
  static const float mi0=1.257e-6;
  int type; //Original = 1 ; Step = 2 ; Cossenoidal = 3
  float StepMax;
 public:
  
  HagnessSource(int x,int y,int z,float frequency,float deltaT,float deltaX,float deltaY, int Htype, int tHS):PointSource(x,y,z,0,frequency, tHS) {
    tau=160e-12/deltaT;
    fi=3*tau;
    dt=deltaT;
    dx=deltaX;
    dy=deltaY;
    type=Htype;
    if (type==2)
      {
	cout << "\nQual o valor maximo do degrau ?";
	cin >> StepMax;
      }
  }
  
  float calculate (float n, float dt, int x, int y, int z) {
    
    float sourcevalue;
    if (type==1)
      {   
	//cout << "\nYou have chosen the ORIGINAL Source.";
	if (n<(7*tau))
	  {	   
	    float val=sin(2*pi*frequency*((n+1)-fi)*dt)*exp( -pow( ( ((n+1)-fi) / tau) , 2 )  );
	    //cout << "\n N = " << n << " Val = " << val;
	    val=val*mi0*dx*dy/dt;
	 
	    return val;
	  }
	else return 0;
      }
    else 
      if (type==2)
	{ 
	  //cout << "\nYou have chosen the STEP Source.";
	  if (n>9 && n<21)
	    {	     
	      return StepMax;
	    }
	  else return 0;
	}
      else	 
	if (type==3)
	  {	  
	    //cout << "\nYou have chosen the COSSENOIDAL Source.";
	    sourcevalue= sin(2*pi*frequency*(n+1)*dt);	    
	    sourcevalue= sourcevalue * mi0*dx*dy/dt;
	    return sourcevalue;
	    
	  }
	else
	  return 0;
    
  }
};
#endif

