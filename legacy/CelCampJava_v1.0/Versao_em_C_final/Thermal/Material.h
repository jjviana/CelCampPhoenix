#ifndef MATERIAL_H
#define MATERIAL_H

using namespace std;
#include <string>
/**
   Esta classe armazena as propriedades de um material nao-ferromagnetico
**/

class Material {
	
	public:
		static const float ep0=8.854e-12;
		static const float mi0=1.25663706e-6; // Permeabilidade magnâtica do vﬂcuo (H/m)	
		string name;
		int MatInd; //Index;
		float ep; // Permissividade elâtrica (F/m)
		float si; // Condutividade elâtrica (S/m)
		float ro; // Resistividade magnâtica equivalente (Ohm/m)
		float mi; //Permeabilidade magnetica
		float density; // Kg/m3
		float Cm; //Specific Heat [W hr/(oC kg)] 
		float k;  //Heat conductivity [W/(m oC)]
		float bf; //blood flow rate [kg/m3 hr]
		float hm; //basal metabolic rate [W/kg]
		float emiss; //emissivity of the tissue [1]
		float hc; //convective heat transfer coefficient [w/m2.oC]
		Material(string n="",float epson=ep0,float sigma=0,float romag=0,float dens=0,float mimag=mi0, float CmCm=0.28, float kk=0.0263, float bfbf=0, float hmhm=0, float em=0, int MI=0) {
			name=n;
			ep=epson;
			si=sigma;
			ro=romag;
			density=dens;
			mi=mimag;
			Cm=CmCm;
			k=kk;
			bf=bfbf;
			hm=hmhm;
			emiss = em;
			//hc = hchc;
			MatInd = MI;
		}

		inline string getName() {	return name;	}
		inline float getEP() {		return 	ep;	}
		inline float getSI() {		return si;	}
		inline float getRO() {		return ro;	}
		inline float getDensity() {	return density;	}
		inline float getCm() {          return Cm;      }
		inline float getk() {           return k;       }
		inline float getbf() {          return bf;      }
		inline float gethm() {          return hm;      }
		inline float getemiss() {       return emiss;   }
		inline float gethc() {          return hc;      }
};	
#endif
