#ifndef GRID_H
#define GRID_H

using namespace std;
#include<iostream.h>
/**
   Esta classe representa um grid generico de tres dimensoes.
**/

template <class T> class grid {

	private:
	   int length,width,height; // x,y and z directions
	   T ***data;
	public:
		grid(int x,int y,int z) {
			 if(x<1) {
				cerr << "Valor invßlido fornecido para lenght: "<< x<<". Valor truncado para 1";
				x=1;
			 }
			 if(y<1) {
				cerr << "Valor invßlido fornecido para width: "<< y<<". Valor truncado para 1";
				y=1;
			 } 
	 		 if(z<1) {
				cerr << "Valor invßlido fornecido para height: "<< z<<". Valor truncado para 1";
				z=1;
			 }
			
			 length=x;width=y;height=z;
			 data=new T**[x];
			 
			 for(int i=0;i<x;i++)
				data[i]=new T*[y];
			 for(int i=0;i<x;i++)
			   for(int j=0;j<y;j++)
				data[i][j]=new T[z];
		};
		~grid() {
			for(int i=0;i<length;i++)
				for(int j=0;j<width;j++)
					delete[] data[i][j];
			for(int i=0;i<length;i++)
					delete[] data[i];
			delete[] data;
		
		};
		inline T& getData(int x,int y,int z) {
			return data[x][y][z];
		};
		inline T*** getDataPointer() {return data;};
		inline void setData(int x, int y,int z,T value) {data[x][y][z]=value;};

		inline int getLength() { return length; };
		inline int getWidth() { return width; };
		inline int getHeight() { return height; };
		void initializeGrid(T value) {
			for (int i=0; i<length; i++)
			 for (int j=0; j<width; j++)
			  for (int k=0; k<height; k++)
				data[i][j][k] = value;
		};

		//PROBLEMAS!!!
		inline void CopyGrid(grid<T> &original) { 
			for (int i=0; i<length; i++)
				for (int j=0; j<width; j++)
					for (int k=0; k<height; k++)
						data[i][j][k] = original.getData(i,j,k);
		};
			

	
};
			
#endif
