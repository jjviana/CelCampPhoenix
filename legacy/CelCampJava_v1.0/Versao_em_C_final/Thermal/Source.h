#ifndef SOURCE_H
#define SOURCE_H

using namespace std;
/*
   Esta classe representa uma fonte eletromagntica.
   Esta  uma classe abstrata, na prﬂtica sero utilizadas
   classes derivadas.
*/


class Source {
   protected:
	/*
	  Valores de corrente e frequencia da fonte.
	*/
	float current;
	float frequency;
	int XS, YS, ZS; //posicao do centro da fonte
	int NL; //numero de cubos da fonte
        int typeHS; //tells if the source is Hard (0) or Soft (1). Soft sources are "transparent" to fields.

   public:
	Source(int xx, int yy, int zz, int size, float currentS, float f, int tHS) {
		current = currentS;
		frequency = f;
		XS=xx; YS=yy; ZS=zz;
		//cout << "\nDo Source.h: Fonte em (" << XS << "," << YS << "," << ZS << ")."; 
		NL=size;
		typeHS=tHS;
	}
	/*
 	  Retorna verdadeiro se um determinado ponto
	  de coorenadas x,y e z pertence  esta fonte.
	*/
	virtual bool contains(int x,int y,int z)=0;
	inline virtual bool containsPRE(int x, int y, int z){return (false);};
	inline virtual bool containsPOS(int x, int y, int z){return (false);};

	/*
	 Calcula o valor da fonte neste ponto.
	 Deve ser chamado se e somente se contains(x,y,z)==true
	**/
	virtual float calculate(float n, float dt, int x, int y, int z)=0;
	inline virtual float calculatePRE(float n, float dt, int x, int y, int z){return (0);};
	inline virtual float calculatePOS(float n, float dt, int x, int y, int z){return (0);};
	
	/*
	 Funcoes para retornar valores privados.	
	*/	
	int getXSource() {return XS;};
	int getYSource() {return YS;};
	int getZSource() {return ZS;};
	int getSourceSize() {return NL;};
	float getFreq() {return frequency;};
	float getIm() {return current;};
	float getTypeHS() {return typeHS;};

};
#endif
