#include "FileRecorder.h"
#include <fstream>
#include <stdio.h>
#include <unistd.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <fcntl.h>


void FileRecorder::record(FDTDSimulator *Sim, float tempo, int slice, int coord){
  fstream arq;
  char name[100];
  char eol='\n';
  sprintf(name,"%s%d.txt",prefix.c_str(),count);
  arq.open(name, ios::out|ios::in);
  arq << tempo << eol;
  grid<float> &Mesh = Sim->getCurrentFieldMesh();
  
  if (coord==1) //em X
  {
	  //Cabecalho:	  
	  arq << Mesh.getHeight() << eol;
	  arq << Mesh.getWidth() << eol;  	  
	  arq << Mesh.getLength() << eol;
	  //Dados:
	  for (int i=0; i<Mesh.getHeight(); i++)   
	  {
		  for (int j=0; j<Mesh.getWidth(); j++)		  	    
			  arq << Mesh.getData(slice,j,i) << eol;	  
	  }
  }

  if (coord==2) //em Y
  {
	  //Cabecalho:
	  arq << Mesh.getLength() << eol;	  
	  arq << Mesh.getHeight() << eol;
	  arq << Mesh.getWidth() << eol;  
	  //Dados:
	  for (int i=0; i<Mesh.getLength(); i++)   
	  {
		  for (int j=0; j<Mesh.getHeight(); j++)		  	    
			  arq << Mesh.getData(i,slice,j) << eol;	  
	  }
  }

  if (coord==3) //em Z
  {
	  //Cabecalho:
	  arq << Mesh.getLength() << eol;
	  arq << Mesh.getWidth() << eol;  
	  arq << Mesh.getHeight() << eol;
	  //Dados:
	  for (int i=0; i<Mesh.getLength(); i++)   
	  {
		  for (int j=0; j<Mesh.getWidth(); j++)		  	    
			  arq << Mesh.getData(i,j,slice) << eol;	  
	  }
  }


  //Fecha o arquivo:
  arq.close();
  count++;

}

void FileRecorder::recordFields(FDTDSimulator *Sim, int fatia, int coord){

  grid<float> &Mesh = Sim->getCurrentFieldMesh();
  
  //Cria os arquivos:
  fstream arqHx, arqHy, arqHz, arqEx, arqEy, arqEz;
  char name[100];
  char eol='\n';
  char dir[64], cc;
  //Dados:
  int initX, initY, initZ, finalX, finalY, finalZ;
  initX=0;  initY=0;   initZ=0;
  finalX=Mesh.getLength();  finalY=Mesh.getWidth();  finalZ=Mesh.getHeight();
  if (coord==1) {initX=fatia; finalX=fatia+1; cc='x';}
  if (coord==2) {initY=fatia; finalY=fatia+1; cc='y';}
  if (coord==3) {initZ=fatia; finalZ=fatia+1; cc='z';}
  sprintf(dir, "%s/fatia%d%c", dirname, fatia, cc);

  //Abre os arquivos:
  sprintf(name,"%s/hx%d.txt", dir, count);
  arqHx.open(name, ios::out|ios::in);
  sprintf(name,"%s/hy%d.txt",dir,count);
  arqHy.open(name, ios::out|ios::in);
  sprintf(name,"%s/hz%d.txt",dir,count);
  arqHz.open(name, ios::out|ios::in); 
  sprintf(name,"%s/ex%d.txt",dir,count);
  arqEx.open(name, ios::out|ios::in);
  sprintf(name,"%s/ey%d.txt",dir,count);
  arqEy.open(name, ios::out|ios::in);
  sprintf(name,"%s/ez%d.txt",dir,count);
  arqEz.open(name, ios::out|ios::in);
  
  //Copia o instante de tempo:
  //arqHx << tempo << eol;
  //arqHy << tempo << eol;
  //arqHz << tempo << eol;
  //arqEx << tempo << eol;
  //arqEy << tempo << eol;
  //arqEz << tempo << eol;
  //Cabecalho:	       	  
  arqHx << 1+Mesh.getLength()/2 << eol << Mesh.getWidth()/2 << eol << 1+Mesh.getHeight()/2 << eol;
  arqHy << Mesh.getLength()/2 << eol << 1+Mesh.getWidth()/2 << eol << 1+Mesh.getHeight()/2 << eol;
  arqHz << Mesh.getLength()/2 << eol << Mesh.getWidth()/2 << eol << Mesh.getHeight()/2 << eol;
  arqEx << Mesh.getLength()/2 << eol << 1+Mesh.getWidth()/2 << eol << Mesh.getHeight()/2 << eol;
  arqEy << 1+Mesh.getLength()/2 << eol << Mesh.getWidth()/2 << eol << Mesh.getHeight()/2 << eol;
  arqEz << 1+Mesh.getLength()/2 << eol << 1+Mesh.getWidth()/2 << eol << 1+Mesh.getHeight()/2 << eol;

  //GRAVA OS DADOS:
  for (int i=initX; i<finalX; i++)   
  	  for (int j=initY; j<finalY; j++)		  	    
		  for (int k=initZ; k<finalZ; k++)
		  {
			//Nulos:
			if ((i%2==0 && j%2==0 && k%2==1)||(i%2==1 && j%2==1 && k%2==0))
			    continue;
			
			if (i%2==0 && j%2==1 && k%2==0)
			    arqHx << Mesh.getData(i,j,k) << eol;	  
                  
			if (i%2==1 && j%2==0 && k%2==0)
			    arqHy << Mesh.getData(i,j,k) << eol;	  
                  
			if (i%2==1 && j%2==1 && k%2==1)
			    arqHz << Mesh.getData(i,j,k) << eol;	  
                  
			if (i%2==1 && j%2==0 && k%2==1)
			    arqEx << Mesh.getData(i,j,k) << eol;	  
                  
			if (i%2==0 && j%2==1 && k%2==1)
			    arqEy << Mesh.getData(i,j,k) << eol;	  
                  
			if (i%2==0 && j%2==0 && k%2==0)
			    arqEz << Mesh.getData(i,j,k) << eol;	  
                  
		}
  //Fecha os arquivos:
  arqHx.close(); arqHy.close(); arqHz.close();
  arqEx.close(); arqEy.close(); arqEz.close();
  count++;

}

void FileRecorder::recordAll(FDTDSimulator *Sim, float tempo)
{
  fstream arq;
  char name[100];
  char eol='\n';
  sprintf(name,"%s/%sALL.txt",dirname, prefix.c_str());
  arq.open(name, ios::out|ios::in);
  arq << tempo << eol;
  grid<float> &Mesh = Sim->getCurrentFieldMesh();
  
  //Cabecalho:	       	  
  arq << Mesh.getLength() << eol;
  arq << Mesh.getWidth() << eol; 
  arq << Mesh.getHeight() << eol;
  
  //Dados:
  for (int i=0; i<Mesh.getLength(); i++)
    for (int j=0; j<Mesh.getWidth(); j++)		  	    
      for (int k=0; k<Mesh.getHeight(); k++)
	arq << Mesh.getData(i,j,k) << eol;	  
  
  //Fecha o arquivo:
  arq.close();  
}

void FileRecorder::recordPoint(FDTDSimulator *Sim, int Ntotal, int x, int y, int z, int reduzT,int modeT){  	
  if(modeT==FDTDSimulator::MODE_2D_TM || modeT==FDTDSimulator::MODE_3D)
    {
      //Coloca o ponto sobre Ez (par, par, par):
      if (x%2==1) x++;	if (y%2==1) y++;	if (z%2==1) z++;
    }
  else 
    {
      //Coloca o ponto sobre Hz (impar, impar, impar):
      if (x%2==0) x++;	if (y%2==0) y++;	if (z%2==0) z++;
    }
  
  char name[100];
  char eol='\n';  
  char subdir[255];
  sprintf(subdir, "%s/Points", dirname);
  mkdir(subdir, 0777);

  grid<float> &Mesh = Sim->getCurrentFieldMesh();
  list<Source*> &S = Sim->getSources();
  
  if (count1==0)
    {
      sprintf(name,"%s/Hx%s.txt", subdir, prefix.c_str());
      arqHx.open(name, ios::out|ios::in);
      sprintf(name,"%s/Hy%s.txt", subdir, prefix.c_str());
      arqHy.open(name, ios::out|ios::in);
      sprintf(name,"%s/Hz%s.txt", subdir, prefix.c_str());
      arqHz.open(name, ios::out|ios::in);
      sprintf(name,"%s/Ex%s.txt", subdir, prefix.c_str());
      arqEx.open(name, ios::out|ios::in);
      sprintf(name,"%s/Ey%s.txt", subdir, prefix.c_str());
      arqEy.open(name, ios::out|ios::in);
      sprintf(name,"%s/Ez%s.txt", subdir, prefix.c_str());  
      arqEz.open(name, ios::out|ios::in);
      
      //Cabecalho:
      list<Source*>::iterator it = S.begin();		
      Source* source = *it;
      arqEx << source->getXSource() << eol << source->getYSource() << eol << source->getZSource() << eol << source->getSourceSize() << eol;
      arqEx << Sim->getDX() << eol << Sim->getDY() << eol << Sim->getDZ() << eol;
      arqEx << source->getFreq() << eol << Ntotal << eol;
      arqEx << Sim->getTimeStep() << eol << x << eol << y << eol << z << eol << reduzT << eol << source->getIm() << eol;	

      arqEy << source->getXSource() << eol << source->getYSource() << eol << source->getZSource() << eol << source->getSourceSize() << eol;
      arqEy << Sim->getDX() << eol << Sim->getDY() << eol << Sim->getDZ() << eol << source->getFreq() << eol;
      arqEy << Ntotal << eol << Sim->getTimeStep() << eol << x << eol << y << eol << z << eol << reduzT << eol << source->getIm() << eol;

      arqEz << source->getXSource() << eol << source->getYSource() << eol << source->getZSource() << eol << source->getSourceSize() << eol;
      arqEz << Sim->getDX() << eol << Sim->getDY() << eol << Sim->getDZ() << eol << source->getFreq() << eol;
      arqEz << Ntotal << eol << Sim->getTimeStep() << eol << x << eol << y << eol << z << eol << reduzT << eol << source->getIm() << eol;

      arqHx << source->getXSource() << eol << source->getYSource() << eol << source->getZSource() << eol << source->getSourceSize() << eol;
      arqHx << Sim->getDX() << eol << Sim->getDY() << eol << Sim->getDZ() << eol << source->getFreq() << eol;
      arqHx << Ntotal << eol << Sim->getTimeStep() << eol << x << eol << y << eol << z << eol << reduzT << eol << source->getIm() << eol;

      arqHy << source->getXSource() << eol << source->getYSource() << eol << source->getZSource() << eol << source->getSourceSize() << eol;
      arqHy << Sim->getDX() << eol << Sim->getDY() << eol << Sim->getDZ() << eol << source->getFreq() << eol;
      arqHy << Ntotal << eol << Sim->getTimeStep() << eol << x << eol << y << eol << z << eol << reduzT << eol << source->getIm() << eol;

      arqHz << source->getXSource() << eol << source->getYSource() << eol << source->getZSource() << eol << source->getSourceSize() << eol;
      arqHz << Sim->getDX() << eol << Sim->getDY() << eol << Sim->getDZ() << eol << source->getFreq() << eol;
      arqHz << Ntotal << eol << Sim->getTimeStep() << eol << x << eol << y << eol << z << eol << reduzT << eol << source->getIm() << eol;

    }

  //Dados:
  if(modeT==FDTDSimulator::MODE_2D_TM || modeT==FDTDSimulator::MODE_3D )
    {
      float value;
      //cout << "\nDe FILE RECORDER.cpp: FAZENDO A MEDIA!!";
      value =  ( Mesh.getData(x , y+1 , z)     + Mesh.getData(x , y-1 , z) )/2;
      arqHx << value << eol;	  
      
      value =  ( Mesh.getData(x+1 , y , z)     + Mesh.getData(x-1 , y , z) )/2;
      arqHy << value << eol;	
      
      value = ( Mesh.getData(x+1 , y+1 , z+1) + Mesh.getData(x+1 , y+1 , z-1) + Mesh.getData(x+1 , y-1 , z+1) + Mesh.getData(x+1 , y-1 , z-1) + Mesh.getData(x-1 , y+1 , z+1) + Mesh.getData(x-1 , y+1 , z-1) +  Mesh.getData(x-1 , y-1 , z+1) +  Mesh.getData(x-1 , y-1 , z-1)  ) /8;
      arqHz << value << eol;	
      
      value =  ( Mesh.getData(x+1 , y , z+1)   + Mesh.getData(x+1 , y , z-1) + Mesh.getData(x-1 , y , z+1)+ + Mesh.getData(x-1 , y , z-1) )/4;
      arqEx << value << eol;	
      
      value = ( Mesh.getData(x , y+1 , z+1)   + Mesh.getData(x , y+1 , z-1) + Mesh.getData(x , y-1 , z+1)   + Mesh.getData(x , y-1 , z-1) )/4;
      arqEy << value << eol;	

      arqEz << Mesh.getData(x, y, z) << eol;	
    }
  else 
    {
      arqHx << Mesh.getData(x+1, y , z+1) << eol;	  
      arqHy << Mesh.getData(x , y+1 , z+1) << eol;	
      arqHz << Mesh.getData(x , y , z) << eol;	
      arqEx << Mesh.getData(x, y+1 , z) << eol;	
      arqEy << Mesh.getData(x+1 , y , z) << eol;	
      arqEz << Mesh.getData(x+1, y+1, z+1) << eol;
    }	  
  //cout << "\nEntrou em RecordPoints com count1=" << count1; 	
  //Fecha o arquivo:
  if (count1==Ntotal-1)
    {
      arqHx.close();	arqHy.close();	arqHz.close();
      arqEx.close();	arqEy.close();	arqEz.close();
    }
  
  count1++;
}

void FileRecorder::recordSAR(FDTDSimulator *Sim, int fatia, int coord, MaterialModel* mm)
{  
  fstream arq;
  char name[100];
  char eol='\n';
  char dir[64], cc;
  if (coord==1){cc='x';}
  if (coord==2){cc='y';}
  if (coord==3){cc='z';}
  
  sprintf(dir, "%s/fatia%d%c", dirname, fatia, cc);
  sprintf(name,"%s/SAR%d.txt",dir, count);
  arq.open(name, ios::out|ios::in);
  
  grid<float> &Mesh = Sim->getCurrentFieldMesh();
  int tx = Mesh.getLength();
  int ty = Mesh.getWidth();
  int tz = Mesh.getHeight();
  if (fatia%2==1) fatia++;
  
  grid<int> & Mat = mm->getMesh();
  
  //Cabecalho:	       	  
  if (coord==1)
  {
	  arq << ty << eol; 
	  arq << tz << eol;
	  arq << Sim->GettotSAR() << eol;
	  for (int j=0; j<ty; j+=2)   
		  for (int k=0; k<tz; k+=2)		  	    
		  {
			  arq << Sim->GetSARvalues(fatia,j,k) << eol;	
			  //arq << Mat.getData(fatia,j,k) << eol;		  
		  }
  }
  if (coord==2)
  {
	  arq << tx << eol;
	  arq << tz << eol; 
	  arq << Sim->GettotSAR() << eol;
 	  for (int i=0; i<tx; i+=2)   
		  for (int k=0; k<tz; k+=2)		  	    
		  {
			  arq << Sim->GetSARvalues(i,fatia,k) << eol;	
			  //arq << Mat.getData(i,fatia,k) << eol;		  
		  }

 }
  if (coord==3)
  {
	  arq << tx << eol;
	  arq << ty << eol;  
	  arq << Sim->GettotSAR() << eol;
	  for (int i=0; i<tx; i+=2)   
		  for (int j=0; j<ty; j+=2)	
		  {
			  arq << Sim->GetSARvalues(i,j,fatia) << eol;
			  //arq << Mat.getData(i,j,fatia) << eol;
		  }

  }
  
  //Fecha o arquivo:
  arq.close();
  count++;  

}


void FileRecorder::recordMaterial(int fatia, int coord, MaterialModel* mm)
{
  fstream arq;
  char name[100];
  char eol='\n';
  char dir[64], cc;
  if (coord==1){cc='x';}
  if (coord==2){cc='y';}
  if (coord==3){cc='z';}
  
  sprintf(name,"%s/Material%c.txt", dirname, cc );
  arq.open(name, ios::out|ios::in);
  if(!arq.is_open()) {
    cerr << "Nao foi possivel abrir arquivo "<<name<<" para gravar o Material !\n";
    return;
  }
  
  grid<int> &Mesh = mm->getMesh();
  int tx = Mesh.getLength();
  int ty = Mesh.getWidth();
  int tz = Mesh.getHeight();  
  
  grid<int> & Mat = mm->getMesh();
  
  //Cabecalho:	       	  
  if (coord==1)
  {
	  arq << ty << eol; 
	  arq << tz << eol;
	  for (int j=0; j<ty; j+=2)   
		  for (int k=0; k<tz; k+=2)		  	    
		  {			  
			  arq << Mat.getData(fatia,j,k) << eol;
		  }

  }
  if (coord==2)
  {
	  arq << tx << eol;
	  arq << tz << eol;
 	  for (int i=0; i<tx; i+=2)   
		  for (int k=0; k<tz; k+=2)		  	    
		  {			 
			  arq << Mat.getData(i,fatia,k) << eol;
		  }

 }
  if (coord==3)
  {
	  arq << tx << eol;
	  arq << ty << eol; 
	  for (int i=0; i<tx; i+=2)   
		  for (int j=0; j<ty; j+=2)	
		  {			
			  arq << Mat.getData(i,j,fatia) << eol;
		  }

  }
  
  //Fecha o arquivo:
  arq.close();

}

void FileRecorder::recordModel(int fat, int coord, MaterialModel* mm)
{
  //cout << "\nEM FILERECORDER::RECORDMODEL, fatia = " << fat;
  fstream arq;
  char name[100];
  char eol='\n';
  char dir[64], cc;
  if (coord==1){cc='x';}
  if (coord==2){cc='y';}
  if (coord==3){cc='z';}
    
  sprintf(name,"%s/Model%c.txt", dirname,cc);
  arq.open(name, ios::out|ios::in);
  if(!arq.is_open()) {
    cout << "Nao foi possivel abrir arquivo "<<name<<" para gravar o Modelo!\n";
    return;
  }
  
  grid<int> &Mesh = mm->getMesh();
  int tx = Mesh.getLength();
  int ty = Mesh.getWidth();
  int tz = Mesh.getHeight();  
  
  grid<int> & Mat = mm->getMesh();
  
  //Cabecalho:	       	  
  if (coord==1)
    {
      arq << ty << eol;   arq << tz << eol;
      for (int j=0; j<ty; j++)   
	for (int k=0; k<tz; k++)		  	    
	  {			  
	    arq << Mat.getData(fat,j,k) << eol;
	    //if (Mat.getData(fat,j,k)!=0)
	    //  cout << "\nMaterial = " << Mat.getData(fat,j,k) << " in P[" << fat << "][" << j << "][" << k << "]."; 	    
	  }      
    }
  if (coord==2)
    {
      arq << tx << eol; arq << tz << eol;
      for (int i=0; i<tx; i++)   
	for (int k=0; k<tz; k++)		  	    
	  {			 
	    arq << Mat.getData(i,fat,k) << eol;
	    //if (Mat.getData(i,fat,k)!=0)
	    //  cout << "\nMaterial = " << Mat.getData(i, fat,k) << " in P[" << i << "][" << fat << "][" << k << "]."; 
	  }      
 }
  if (coord==3)
    {
      arq << tx << eol;	  arq << ty << eol; 
      for (int i=0; i<tx; i++)   
	for (int j=0; j<ty; j++)	
	  {			
	    arq << Mat.getData(i,j,fat) << eol;
	    // if (Mat.getData(i,j,fat)!=0)
	    //  cout << "\nMaterial = " << Mat.getData(i,j,fat) << " in P[" << i << "][" << j << "][" << fat << "]."; 
	  }     
    }
  
  //Fecha o arquivo:
  arq.close();
  
}

void FileRecorder::recordThermal(FDTDSimulator *Sim, int fatia, int coord, MaterialModel* mm, int i)
{
  fstream arq;
  char name[100];
  char eol='\n';
  char dir[64], cc;
  if (coord==1){cc='x';}
  if (coord==2){cc='y';}
  if (coord==3){cc='z';}
  
  sprintf(dir, "%s/ThermalFatia%d%c", dirname, fatia, cc);
  sprintf(name,"%s/Thermal%d.txt", dir, i);
  arq.open(name, ios::out|ios::in);

  grid<float> &Mesh = Sim->getCurrentFieldMesh();
  int tx = Mesh.getLength();
  int ty = Mesh.getWidth();
  int tz = Mesh.getHeight();
  if (fatia%2==1) fatia++;
  
  grid<int> & Mat = mm->getMesh();
  
  //Cabecalho:	       	  
  if (coord==1)
  {
	  arq << ty << eol; 	          arq << tz << eol;	 
	  for (int j=0; j<ty; j++)   
		  for (int k=0; k<tz; k++)		  	    
		  {
		    char mystring[255];
		    sprintf(mystring, "%.30f",Sim->GetThermalPoint(fatia,j,k));
		    arq << mystring << eol;			 		   
		  }
  }
  if (coord==2)
  {
	  arq << tx << eol;	  arq << tz << eol;	  
 	  for (int i=0; i<tx; i++)   
		  for (int k=0; k<tz; k++)		  	    
		  {
		    char mystring[255];
		    sprintf(mystring, "%.30f",Sim->GetThermalPoint(i,fatia,k));
		    arq << mystring << eol;			 		    
		  }

 }
  if (coord==3)
  {
	  arq << tx << eol;	  arq << ty << eol;	  
	  for (int i=0; i<tx; i++)   
		  for (int j=0; j<ty; j++)	
		  {
		    char mystring[255];
		    sprintf(mystring, "%.30f",Sim->GetThermalPoint(i,j,fatia));
		    arq << mystring << eol;		    			 
		  }
  }
  
  //Fecha o arquivo:
  arq.close();  
  count++;  
}

void FileRecorder::recordThermalRise(FDTDSimulator *Sim, int fatia, int coord, MaterialModel* mm, int i)
{
  fstream arqRISE;
  char name[100];
  char eol='\n';
  char dir[64], cc;
  if (coord==1){cc='x';}
  if (coord==2){cc='y';}
  if (coord==3){cc='z';}
  
  sprintf(dir, "%s/ThermalFatia%d%c", dirname, fatia, cc);
  sprintf(name,"%s/ThermalRise%d.txt", dir, i);
  arqRISE.open(name, ios::out|ios::in);

  grid<float> &Mesh = Sim->getCurrentFieldMesh();
  int tx = Mesh.getLength();
  int ty = Mesh.getWidth();
  int tz = Mesh.getHeight();
  if (fatia%2==1) fatia++;
  
  grid<int> & Mat = mm->getMesh();
  
  //Cabecalho:	       	  
  if (coord==1)
  {	  
	  arqRISE << ty << eol; 	  arqRISE << tz << eol;
	  for (int j=0; j<ty; j++)   
		  for (int k=0; k<tz; k++)		  	    
		  {		   	    
		    arqRISE << Sim->GetThermalRisePoint(fatia,j,k) << eol;
		  }

  }
  if (coord==2)
  {       
	  arqRISE << tx << eol;	  arqRISE << tz << eol;
 	  for (int i=0; i<tx; i++)   
		  for (int k=0; k<tz; k++)		  	    
		  {		    		    
		    arqRISE << Sim->GetThermalRisePoint(i,fatia,k) << eol;
		  }

 }
  if (coord==3)
  {	 
	  arqRISE << tx << eol;	  arqRISE << ty << eol; 
	  for (int i=0; i<tx; i++)   
		  for (int j=0; j<ty; j++)	
		  {		    
		    arqRISE << Sim->GetThermalRisePoint(i,j,fatia) << eol;			 
		  }

  }
  
  //Fecha o arquivo:  
  arqRISE.close();
  count++;  
}



void FileRecorder::recordData(int mode, int Prob, int fontType, int DiSi, int ler, int mater, int tHS, char* CName, float f, float DTfactor, float DeltaT, int N, int reduzT, int DiamC, int CentroCX, int CentroCY, int CentroCZ, int  tamX, int tamY, int tamZ,float  dx, float dy ,float  dz, int xs, int ys,int  zs, int gravaFatia, int gravaPontos, int gravaSAR, int gravaThermal)
{ 
  char modename[10];
  switch(mode)
    {
    case 1: sprintf(modename, "3D"); break; 
    case 2: sprintf(modename, "2D TE"); break; 
    case 3: sprintf(modename, "2D TM"); break; 
    default : sprintf(modename, "Unknown"); break;
    }
  
  char probname[10];
  switch(Prob)
    {
    case 1: sprintf(probname, "Mur"); break; 
    case 2: sprintf(probname, "Normal"); break; 
    case 3: sprintf(probname, "Susan"); break;
    case 4: sprintf(probname, "Mur/2"); break; 
    default : sprintf(probname, "Unknown"); break;
    }
  
  char tipofonte[50];	   
  switch(fontType)
    {
    case 1: sprintf(tipofonte, "Infinite line"); break;
    case 2: sprintf(tipofonte, "Punctual Source"); break;	
    case 3: sprintf(tipofonte, "Dipole"); break;	
    case 4: sprintf(tipofonte, "Hagness Original"); break;
    case 5: sprintf(tipofonte, "Hagness Step"); break;	
    case 6: sprintf(tipofonte, "Hagness Cos") ; break;	
    case 7: sprintf(tipofonte, "Plane Wave in X"); break;
    case 8: sprintf(tipofonte, "Plane Wave in Y"); break;
    case 9: sprintf(tipofonte, "Plane Wave in Z"); break;
    case 10: sprintf(tipofonte, "Thick Dipole"); break;
    default : sprintf(tipofonte, "Unknown"); break;
    }
  char tamanhodipolo[50];	   
  switch(DiSi)
    {
    case 0: sprintf(tamanhodipolo, "1 Wavelenght"); break;
    case 1: sprintf(tamanhodipolo, "1/2 Wavelenght"); break;
    case 2: sprintf(tamanhodipolo, "1/4 Wavelenght"); break;
    case 3: sprintf(tamanhodipolo, "1/8 Wavelenght"); break;
    default : sprintf(tamanhodipolo, "Unknown"); break;
    }			      	      
  
  char modelname[50];
  switch(ler)
    {
    case 1: sprintf(modelname, "Read Model"); break;	
    case 2: sprintf(modelname, "Free Air"); break;
    case 3: sprintf(modelname, "Cylinder"); break;
    case 4: sprintf(modelname, "Slab"); break;	
    case 5: sprintf(modelname, "Cube"); break;
    default : sprintf(modelname, "Unknown"); break;
    }
  
  char materialname[50];
  switch(mater)
    {
    case 0: sprintf(materialname, "Air"); break;
    case 1: sprintf(materialname, "Bone"); break;
    case 2: sprintf(materialname, "ERL"); break;
    case 3: sprintf(materialname, "Brain"); break;
    case 4: sprintf(materialname, "Skin"); break;
    case 5: sprintf(materialname, "Muscle"); break;
    case 6: sprintf(materialname, "Fat"); break;
    case 7: sprintf(materialname, "Sclera"); break;
    case 8: sprintf(materialname, "Anterior Chamber"); break;
    case 9: sprintf(materialname, "Cristalin"); break;
    case 10: sprintf(materialname, "Vitreous Body"); break;
    case 11: sprintf(materialname, "Cornea"); break;
    case 12: sprintf(materialname, "Coper"); break;
    case 13: sprintf(materialname, "Blood"); break;
    default : sprintf(materialname, "Unknown"); break;
    }
  
  char hORs[20];
  if (tHS==0) sprintf(hORs, "Hard");
  else sprintf(hORs, "Soft");
  fstream arq;
  char dataname[200];
  char eol='\n';
    
  sprintf(dataname, "%s/DATA%s.txt", dirname, CName);
  arq.open(dataname, ios::out|ios::in);
  
  arq << "GENERAL_DATA" << eol;
  arq << "Mode= " <<  modename << eol << "Freq = " << eol << f << eol << "DeltasType = "  << eol << probname << eol;
  arq << "ReduzDT original = " << eol << DTfactor <<  eol << "DeltaT = " << eol  << DeltaT << eol;
	      
  arq << "N = " << eol << N << eol << "ReduzN to record = "  << eol << reduzT << eol;  
  arq << "MODEL DATA: " << eol;
  arq << "Type = "  << eol << modelname << eol ;	     
  if (ler==3 || ler==4 || ler==5)
    {
      arq << "DiamC = "  << DiamC  << eol;
      arq << "CenterCX=" << CentroCX << eol << "CenterCY=" << CentroCY << eol << "CenterCZ=" << CentroCZ << eol;	      	     
      arq << "Material = " << materialname << eol;
    }
  arq << "SizeX = "  << eol << tamX   << eol << "SizeY = "<< eol << tamY << eol << "SizeZ = "<< eol << tamZ << eol;
  arq << "Dx = "     << eol << dx     << eol << "Dy = "  << eol << dy   << eol << "Dz = "  << eol << dz   << eol;
  
  arq << eol << "SOURCE: " << eol <<  "XS = " << eol << xs << eol << "YS = "<< eol << ys << eol << "ZS = " << eol << zs << eol;
  arq << "FontType = " << eol << tipofonte;
  if (fontType==3)	arq << "  " << tamanhodipolo;	      	       
  arq << eol << "Hard or Soft = "<< eol << hORs << eol;
  
  arq << eol << "RECORDING: " << eol;
  char simnao[3];
  if (gravaFatia==1) sprintf(simnao,"yes"); else sprintf(simnao,"no");
  arq << "Record Slices = " << eol<< simnao << eol;
  if (gravaPontos==1) sprintf(simnao,"yes"); else sprintf(simnao,"no");
  arq << "Record Points = "<< eol << simnao << eol;
  if (gravaSAR==1) sprintf(simnao,"yes"); else sprintf(simnao,"no");
  arq << "Record SAR = " << eol<< simnao << eol;	  
  if (gravaThermal==1) sprintf(simnao,"yes"); else sprintf(simnao,"no");
  arq << "Record Temperature Rise = " << eol << simnao << eol;
  
  arq.close();
  
}

void FileRecorder::recordCaseData(char* filename, char * casename, int mode, int Prob, int fontType, int DiSi, int ler, int mater, int tHS, char* CName, float f, float DTfactor, float DeltaT, int N, int reduzT, int DiamC, int CentroCX, int CentroCY, int CentroCZ, int  tamX, int tamY, int tamZ,float  dx, float dy ,float  dz, int xs, int ys,int  zs, int gravaFatia, int gravaPontos, int gravaSAR, int gravaThermal)
{ 
  fstream arq;   
  char dataname[200];
  char eol='\n';
  sprintf(dataname, "%s/Case%s.txt", dirname, CName);
  arq.open(dataname, ios::out|ios::in);
  
  arq << "#Case_Name" << eol << casename << eol;
  arq << "#Mode"     << eol << mode     << eol;
  arq << "#Freq"    << eol << f        << eol;
  arq << "#DeltasType" << eol << Prob  << eol;
  arq << "#ReduzDT original" << eol << DTfactor <<  eol;
  arq << "#DeltaT" << eol  << DeltaT << eol;	      
  arq << "#N" << eol << N << eol;
  arq << "#ReduzN"  << eol << reduzT << eol;  
  arq << "#Type"  << eol << ler << eol ;	     
  if (ler==3 || ler==4 || ler==5)
    {
      arq << "#DiamC" << eol << DiamC  << eol;
      arq << "#CenterCX" << eol << CentroCX << eol;
      arq << "#CenterCY" << eol << CentroCY << eol;
      arq << "#CenterCZ" << eol << CentroCZ << eol;	      	     
      arq << "#Material" << eol << mater << eol;
    }
  arq << "#SizeX" << eol << tamX << eol;
  arq << "#SizeY" << eol << tamY << eol;
  arq << "#SizeZ" << eol << tamZ << eol;
  arq << "#DX"    << eol << dx   << eol;
  arq << "#DY"    << eol << dy   << eol;
  arq << "#DZ"    << eol << dz   << eol;
  
  arq << "#XS" << eol << xs << eol;
  arq << "#YS" << eol << ys << eol;
  arq << "#ZS" << eol << zs << eol;
  arq << "#SourceType" << eol << fontType << eol;
  if (fontType==3)	
    arq << "#DipoleSize" << eol << DiSi;	      	       
  arq << "#Hard_Soft"<< eol << tHS << eol;
      
  arq << "#RecSlices" << eol<< gravaFatia << eol;
  arq << "#RecPoints"<< eol << gravaPontos << eol;
  arq << "#RecSAR" << eol<< gravaSAR << eol;	  
  arq << "#RecTempRise" << eol << gravaThermal << eol;
  
  arq.close();
  
}
