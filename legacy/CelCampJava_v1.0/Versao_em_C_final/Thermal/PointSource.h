#ifndef POINTSOURCE_H
#define POINTSOURCE_H
using namespace std;
#include <math.h>

class PointSource:public Source{
 protected:
  
  static const float pi=3.14159265359;

 public:
  PointSource(int xx, int yy, int zz, float currentS, float f, int tHS):Source(xx, yy, zz, 1, currentS,f, tHS){};
  
  bool contains(int x, int y, int z){
	//cout << "contains da derivada... " ;
	return (x==XS && y==YS && z==ZS);};

  float calculate (float n, float dt, int x, int y, int z) {
    //cout << "Calculate in Point Source";
    return (current*sin(2*pi*frequency*n*dt));
	//cout << "calculates da derivada...";
	//return 500;
	};
};

#endif
