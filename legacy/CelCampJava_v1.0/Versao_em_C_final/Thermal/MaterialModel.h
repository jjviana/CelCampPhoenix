#ifndef MATERIALMODEL_H
#define MATERIALMODEL_H
using namespace std;
#include <list>
#include <fstream>
#include <stdio.h>
#include "Material.h" 

/*
  Esta classe representa o grid contendo o modelo fçsico do meio
  onde a simulaáÉo â realizada.
*/

class MaterialModel {


   protected:
	/**
   	   Grid contendo os çndices de material para cada ponto do
	   modelo fçsico
	**/

        grid<int> *mesh;
	int sizeX, sizeY, sizeZ;

	/***
           Lista de materiais conhecidos por este modelo
	**/
	Material *materials;
   
        /**
  	   Nîmero de materiais conhecidos por este modelo
        **/
	int matcount;

	/**
	   Propriedades do modelo material
	**/
	float deltaX,deltaY,deltaZ; 		

	/**
	   Propriedades do meio
	**/
	float Henv;

     public:

	/**
	  Constri um MaterialModel com as dimenses x,y e z e reconhecendo os
	  materiais indicados na lista
	**/

	MaterialModel(int x,int y,int z, float DX, float DY, float DZ, Material * mat,int matc, float Henvironment) 
	  {	    
	    mesh=new grid<int>(x,y,z);
	    sizeX = x;	    sizeY = y;	    sizeZ = z;
	    mesh->initializeGrid(0);
	    materials=mat;	
	    matcount=matc;
	    Henv = Henvironment;
	    
	    deltaX=DX;	    deltaY=DY;	    deltaZ=DZ;
	  }
	~MaterialModel() 
	  { delete mesh;	}

	inline Material& getMaterial(int x,int y,int z) 
	  { return getMaterial(mesh->getData(x,y,z));	}

	inline Material& getMaterial(int index) 
	  {
	    if(index>=matcount || index<0) {
	      cerr<<"Material invﬂlido requisitado em MaterialModel::material : "<< index;
	      index=0;
	    }
	    return materials[index];
	  }

	inline  void  setDeltaX(float val) { deltaX=val; }
	inline	float getDeltaX()          { return deltaX; }
	inline	void  setDeltaY(float val) { deltaY=val; }
	inline	float getDeltaY()          { return deltaY; }
	inline	void  setDeltaZ(float val) { deltaZ=val; }
	inline	float getDeltaZ()          { return deltaZ; }
	inline	void  setMatCount(int val) {matcount = val;}
	inline	int   getMatCount()        { return matcount; }
	inline	void  setHenv(float val)   { Henv = val;} 
	inline	float getHenv()            { return Henv; }

	grid<int>& getMesh() { return *mesh; };

	void RecordModel(string filename)
	  {
	    fstream arq;
	    char name[100], nameBasico[100];
	    char eol='\n';
	    sprintf(nameBasico, "%sModel", filename.c_str());
	    sprintf(name,"%s.dat", nameBasico);
	    arq.open(name, ios::out|ios::in);	    
	    for (int k=0; k<sizeZ; k++)
	      {
		for (int j=0; j<sizeY; j++)
		  {
		    for (int i=0; i<sizeX; i++)		      		      
		      {	
			int valor = (1+getMaterial(i,j,k).MatInd);
			if (valor <1 || valor >matcount){ cout << "\nUnknown Material = " << valor;  valor=1; }
			arq << valor << "  ";			
		      }
		    arq << eol;
		  }
	      }
	    arq.close();
	    
	    sprintf(name,"%s.3dm", nameBasico);
	    arq.open(name, ios::out|ios::in);
	    arq << "<?xml version=\"1.0\" encoding=\"ISO-8859-1\"?>" << eol << eol << eol;
	    arq << "<!-- Created by juliano on October 18, 2001, 2:15 PM -->" << eol << eol;	    	    
	    arq << "<MaterialModel name=\"" << nameBasico << "\" dimention=\"" << sizeX << "," << sizeY << "," <<  sizeZ << "\" deltas=\"" << deltaX << "," << deltaY << "," << deltaZ << "\">" << eol;
	    arq << "      <materials>" << eol;
	    for (int i=1; i<=matcount; i++)
	      {
		string Mname = getMaterial(i-1).name;
		string tf;
		if (i==1) tf = "false";
		else      tf = "true";
		string color;
		switch (i)
		  {
		  case 1:   color = "0,0,0"; break;      //black
		  case 2:   color = "255,255,255"; break;//white
		  case 3:   color = "0,0,160"; break;    //navy
		  case 4:   color = "255,255,0"; break;  //yellow
		  case 5:   color = "255,204,153"; break;//beige
		  case 6:   color = "255,100,100"; break;//light red
		  case 7:   color = "255,255,204"; break;//light yellow
		  case 8:   color = "102,51,0"; break;   //brown
		  case 9:   color = "0,0,255"; break;    //blue
		  case 10:  color = "153,153,153"; break;//gray
		  case 11:  color = "153,255,204"; break;//light green
		  case 12:  color = "255,204,204"; break;//pink
		  case 13:  color = "255,204,0"; break;  //orange
		  case 14:  color = "255,0,0"; break;    //red
		  case 15:  color = "255,102,0"; break;  //light brown
		  case 16:  color = "255,255,255"; break;//white
		  case 17:  color = "200,200,200"; break;//light gray
		  case 18:  color = "51,51,51"; break;   //dark gray
		  case 19:  color = "30,51,30"; break;   //dark green
		  default:  color = "255,255,255"; break;//white
		  }				   
		arq << "    <material code=\"" << i << "\" color=\"" << color << "\" name=\"" << Mname << "\" transparency=\"0\" visible=\"" << tf << "\"></material>" << eol;
	      }	           	    
	    arq << "      </materials>" << eol;
	    arq << "<datafile name=\"" << nameBasico << ".dat\" id=\"0001\"></datafile>" << eol;
	    arq << eol;
	    arq << "</MaterialModel>" << eol << eol;	    
	    arq.close();
	  }	  
	
	
};


#endif
		
