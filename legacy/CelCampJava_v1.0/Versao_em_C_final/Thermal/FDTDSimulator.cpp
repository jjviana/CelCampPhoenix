#include "FDTDSimulator.h"
#include "math.h"
#include "WangFormulation.h"

//using namespace std;
#include <cassert>

FDTDSimulator::FDTDSimulator(MaterialModel *mm,float timestep, WorkingMode wmode, float freq, float tinicial, float tenv, char TFT, int NN)
{
  FieldN=NULL;  FieldNMinus=NULL;  FieldNPlus=NULL;
  ThermalN=NULL; ThermalNPlus=NULL; TRise=NULL;
  Ca=NULL; Cb=NULL; Da=NULL; Db=NULL;
  Tmedia = NULL; CubosMedia = NULL;
  TmaxSAR = NULL;
  TmaxSAR = new char[200];  
  SARvalues = NULL;  
  SARsum = NULL;
  STEADYcheck = 0;  NSteady = 0; LastE = 0; LastSAR = 0;
  SARsumOK = 0;

  m=mm;
  deltaT=timestep;
  mode=wmode;	
  f=freq;
  Tinit=tinicial;
  Tenv= tenv;//oC
  NoTBound=0; //number of Temperature Boundary Conditions
  TFormType = TFT;
  N=NN;
  AreaIrrad = 0;
  hCONVtotal = 0;

  Tmedia = new float[N];
  CubosMedia = new int[N];
  for (int i=0; i<N; i++)     { Tmedia[i]=0; CubosMedia[i]=0; }

  if((mode==MODE_2D_TE)||(mode==MODE_2D_TM) )
    OrdemCC=1;
  else
    OrdemCC=2;
  
  OrdemCC=1;
  if (OrdemCC==1)
    cout << "\nCONDICAO DE CONTORNO DE 1a ORDEM!!! Setado em FDTDSimulator.cpp\n";
  if (OrdemCC==2)    
    cout << "\nCONDICAO DE CONTORNO DE 2a ORDEM!!! Setado em FDTDSimulator.cpp\n";

  assert(m!=NULL);
  assert(timestep>0);	  
  ttee1=0;
  ttee2=0;
  
  Dx=m->getDeltaX();  Dy=m->getDeltaY();  Dz=m->getDeltaZ();  
    	
  // Constroi os grids
  grid<int> &materialmesh=m->getMesh();
  int width=materialmesh.getWidth();
  int length=materialmesh.getLength();
  int height=materialmesh.getHeight();
  FieldN=new grid<float>(length, width, height);
  FieldN->initializeGrid(0);
  FieldNPlus=new grid<float>(length,width, height);		
  FieldNPlus->initializeGrid(0);
  FieldNMinus=new grid<float>(length,width,height);		
  FieldNMinus->initializeGrid(0);
  ThermalN=new grid<float>(length,width,height);		
  ThermalN->initializeGrid(0);  
  ThermalNPlus=new grid<float>(length,width,height);
  ThermalNPlus->initializeGrid(0);
  TRise=new grid<float>(length,width,height);		
  TRise->initializeGrid(0);

  SARvalues = new grid<float>(length,width,height);
  SARvalues->initializeGrid(0);
  SARsum = new grid<float>(length,width,height);
  SARsum->initializeGrid(0);

  //Constroi as constantes de Calculo Ca, Cb, Da, Db e descobre
  //   se tem materiais ferromagneticos
  int matNum = m->getMatCount();
  Ca = new float[matNum];
  Cb = new float[matNum];
  Da = new float[matNum];
  Db = new float[matNum];
  Ferromag=0;
  for (int mat=0; mat<matNum; mat++)
    {
      Material M=m->getMaterial(mat);
      Ca[mat]=(1 - (M.si*deltaT)/(2*M.ep)) / (1 + (M.si*deltaT)/(2*M.ep));
      Cb[mat]=(deltaT / M.ep) / (1 + (M.si*deltaT)/(2*M.ep));
      Da[mat]=(1 - (M.ro*deltaT)/(2*M.mi)) / (1 + (M.ro*deltaT)/(2*M.mi));
      Db[mat]=(deltaT / M.mi) / (1 + (M.ro*deltaT)/(2*M.mi));
      if (M.mi!=Material::mi0 || M.ro!=0)
	{
	  if (M.mi!=1.25664e-06)
	    cout << "\nMi (devia ser 1.25664e-06) = " << M.mi;
	  if  (M.ro!=0)
	    cout << "\nRo (devia ser 0)= " << M.ro;
	  Ferromag=1;
	} 
    }				
}

void FDTDSimulator::step(int n, int naoFioInf, char interface) 
{  
  float Dt=deltaT;
  float c=3e8;
  float sig0=0;
  float ep0=8.854e-12;
  float mi0=1.257e-6;
  float ro=0;
  float PI=3.141593;
  float tempo=n*Dt;

  float C1X = (c*Dt-Dx)/(c*Dt+Dx);				//constante para CC de 1a e 2a ordem
  float C2X = (2*Dx)/(c*Dt+Dx);					//constante para CC de 1a e 2a ordem
  float C3X = (Dx*(c*Dt)*(c*Dt)) / (2*(c*Dt+Dx)*Dy*Dy);         //constante para CC de 2a ordem	
  float C4X = (Dx*(c*Dt)*(c*Dt)) / (2*(c*Dt+Dx)*Dz*Dz);         //constante para CC de 2a ordem	
  
  float C1Y = (c*Dt-Dy)/(c*Dt+Dy);				//constante para CC de 1a e 2a ordem
  float C2Y = (2*Dy)/(c*Dt+Dy);					//constante para CC de 1a e 2a ordem
  float C3Y = (Dy*(c*Dt)*(c*Dt)) / (2*(c*Dt+Dy)*Dx*Dx);	        //constante para CC de 2a ordem
  float C4Y = (Dy*(c*Dt)*(c*Dt)) / (2*(c*Dt+Dy)*Dz*Dz);         //constante para CC de 2a ordem	
  
  float C1Z = (c*Dt-Dz)/(c*Dt+Dz);                              //constante para CC de 2a ordem
  float C2Z = (2*Dz)/(c*Dt+Dz);                                 //constante para CC de 2a ordem	
  float C3Z = (Dz*(c*Dt)*(c*Dt)) / (2*(c*Dt+Dz)*Dx*Dx);         //constante para CC de 2a ordem	
  float C4Z = (Dz*(c*Dt)*(c*Dt)) / (2*(c*Dt+Dz)*Dy*Dy);         //constante para CC de 2a ordem	
  
  int testeHz=0;  int testeEx=0;  int testeEy=0;
  
  grid<int> &materialmesh=m->getMesh();	  
  int Xmax=materialmesh.getLength();//x
  int Ymax=materialmesh.getWidth();//y
  int Zmax=materialmesh.getHeight();//z 	
  float DX=m->getDeltaX();  float DY=m->getDeltaY();  float DZ=m->getDeltaZ();		    

  // Substitui as matrizes
  grid<float> *temp;  
  temp=FieldNMinus;
  FieldNMinus=FieldN;
  FieldN=FieldNPlus;
  FieldNPlus = temp;
	
  //Pega os valores das matrizes
  float ***FN=FieldN->getDataPointer();
  float ***FNP=FieldNPlus->getDataPointer();
  float ***FNM=FieldNMinus->getDataPointer();
  float ***SV = SARvalues->getDataPointer();
  float ***Ss = SARsum->getDataPointer();

  //Variables for the boundary conditions
  float prim, segX, segY, segZ;

  //Checa se atingiu estabilidade:
  //==============================
  float period = 1/f;  int Nper = (int)(period/Dt);   float error = 0.05; 
  if (n!=0 && n%Nper==0 && STEADYcheck==0)
    {      
      int i,j,k;
      if (Xmax%2==1) i=(Xmax-1)/2; else i=Xmax/2;
      if (Ymax%2==1) j=(Ymax-1)/2; else j=Ymax/2;
      if (Zmax%2==1) k=(Zmax-1)/2; else k=Zmax/2;
      float E, S; 
      E = FNP[i][j][k];  S = SV[i][j][k];           
      if ( E>=(1-error)*LastE && E<=(1+error)*LastE && S>=(1-error)*LastSAR && S<=(1+error)*LastSAR )	
	{ STEADYcheck = 1;	  NSteady = n;	  LastE = E; LastSAR = S;	}
      else
	{ LastE = E; LastSAR = S;}	      
    }	  
  if (STEADYcheck==1)
    {
      cout << "\n In FDTDSimulator.cpp: ESTABILIDADE DENTRO DE " << error*100 << "% em N = " << NSteady;
      if ( n>=NSteady && n<(NSteady+Nper) )
	for (int i=0; i<Xmax; i++)
	  for (int j=0; j<Ymax; j++)
	    for (int k=0; k<Zmax; k++)
	      {
		Ss[i][j][k] += SV[i][j][k];
	      }
      if (n==NSteady+Nper)
	SARsumOK = 1;
    }

  //Calcula os PRE-FDTD parametros para a Fonte:
  //============================================
  for (int i=0; i<Xmax; i++)
    for (int j=0; j<Ymax; j++)
      for (int k=0; k<Zmax; k++)
	{
	  //Testa se neste ponto tem fonte:			
	  list<Source*>::iterator it;
	  for (it=SL.begin(); it!=SL.end(); it++)
	    {
	      Source *s=*it;	     
	      if (s->containsPRE(i,j,k))
		{		  
		  float cst0;
		  if (i%2==0 && j%2==0 && k%2==0) //Ez
		    cst0=ep0;
		  else
		    if (i%2==1 && j%2==1 && k%2==1) //Hz
		      cst0=mi0;
		    else
		      {
			cout << "\nNao implementada pre-fonte em outros pontos diferentes de Ez e Hz";
			cst0=deltaT;
		      }
		  
		  float val2= (deltaT/(cst0))*s->calculatePRE(n,deltaT,i,j,k) / (DX*DY);
		  FN[i][j][k] = val2;		  
		  FNP[i][j][k] = val2;		 
		}       
	    }
	}
  
  //Calcula os campos H:
  //====================
  for (int i=0; i<Xmax; i++)
    for (int j=0; j<Ymax; j++)
      for (int k=0; k<Zmax; k++)
	{

	  //Testa se neste ponto tem fonte pre-setada:		
	  list<Source*>::iterator it;
	  bool foundSource=0;
	  for (it=SL.begin(); it!=SL.end(); it++)
	    {
	      Source *s=*it;	     
	      if (s->containsPRE(i,j,k)) 	                          		
		foundSource=1;	      
	    }
	  if (foundSource==1)
	    continue;

	  //TESTA OS NULOS:
	  if ( (i%2==0 && j%2==0 && k%2==1) || (i%2==1 && j%2==1 && k%2==0) )
	    continue;

	  // TESTA 2D TE e TM
	  if((mode==MODE_2D_TE && k%2==0)||(mode==MODE_2D_TM && k%2==1))
	    continue;
	  
	  //CC PARA Z=0 JA IMPLEMENTADAS ABAIXO:
	  if (k==0)
	    continue;					
	  
	  //FD-TD
	  //Acha o material no ponto
	  grid<int> &mesh=m->getMesh();	  
	  int p=mesh.getData(i,j,k);	  
	  int pIplus, pJplus, pKplus;
	  int pIminus, pJminus, pKminus;	  
	
	  if (i<Xmax-1)	    pIplus=mesh.getData(i+1,j,k);
	  else	            pIplus=p;
	  if (i>0)	    pIminus=mesh.getData(i-1,j,k);	 
	  else	            pIminus=p;
	  
	  if (j<Ymax-1)	    pJplus=mesh.getData(i,j+1,k);
	  else	            pJplus=p;
	  if (j>0)	    pJminus=mesh.getData(i,j-1,k);	 
	  else	            pJminus=p;
	  
	  if (k<Zmax-1)	    pKplus=mesh.getData(i,j,k+1);
	  else	            pKplus=p;
	  if (k>0)	    pKminus=mesh.getData(i,j,k-1);	 
	  else	            pKminus=p;	  	    	   	    
	  	  	  
	  int x=i; int y=j; int z=k;
	  //Testa para Hx 
	  if (i%2==0 && j%2==1 && k%2==0)
	    {
	      //C.C. Hx, z=Zmax						
	      if (k==Zmax-1)
		{					
		  prim = -FNM[x][y][Zmax-3] + C1Z * (FNP[x][y][Zmax-3]+FNM[x][y][Zmax-1]) + C2Z * (FN[x][y][Zmax-1]+FN[x][y][Zmax-3]);
		  segX=0; segY=0;
		  if (x>=2 && x<=Xmax-3)
		    segX = C4Z * (FN[x+2][y][Zmax-1] - 2*FN[x][y][Zmax-1] + FN[x-2][y][Zmax-1] + FN[x+2][y][Zmax-3] - 2*FN[x][y][Zmax-3] + FN[x-2][y][Zmax-3]); 
		  if (y>=2 && y<=Ymax-3)
		    segY = C3Z * (FN[x][y+2][Zmax-1] - 2*FN[x][y][Zmax-1] + FN[x][y-2][Zmax-1] + FN[x][y+2][Zmax-3] - 2*FN[x][y][Zmax-3] + FN[x][y-2][Zmax-3]); 
		  if (OrdemCC==2)
		    FNP[i][j][k]=prim+segX+segY;
		  else
		    FNP[i][j][k]=prim;
		}
	      else
		{		  
		  if (Ferromag==0)
		    {
		      float value=Da[p]* FN[i][j][k] +Db[p]*( (FN[i][j][k+1]-FN[i][j][k-1])/DZ - (FN[i][j+1][k]-FN[i][j-1][k])/DY );
		      FNP[i][j][k]=value;		
		      for (it=SL.begin(); it!=SL.end(); it++)
			{
			  Source *s=*it;	     			  
			}
		    }
		  else
		    cout << "\nIN HX: Ferromag = " << Ferromag << " -> There is no implementation of Hx for Ferromagnetic Materials!!";		  
		}
	    }
	  
	  //Testa para Hy 
	  else if (i%2==1 && j%2==0 && k%2==0)
	    {
	      //C.C. Hy, z=Zmax						
	      if (k==Zmax-1)
		{		  
		  prim = -FNM[x][y][Zmax-3] + C1Z * (FNP[x][y][Zmax-3]+FNM[x][y][Zmax-1]) + C2Z * (FN[x][y][Zmax-1]+FN[x][y][Zmax-3]);
		  segX=0; segY=0;
		  if (x>=2 && x<=Xmax-3)
		    {
		      segX = C4Z* (FN[x+2][y][Zmax-1]);
		      segX+= C4Z* (- 2*FN[x][y][Zmax-1]);
		      segX+= C4Z* (+ FN[x-2][y][Zmax-1]);
		      segX+= C4Z* (+ FN[x+2][y][Zmax-3]);
		      segX+= C4Z* (- 2*FN[x][y][Zmax-3]);
		      segX+= C4Z* (+ FN[x-2][y][Zmax-3]); 
		    }
		  if (y>=2 && y<=Ymax-3)
		    segY = C3Z * (FN[x][y+2][Zmax-1] - 2*FN[x][y][Zmax-1] + FN[x][y-2][Zmax-1] + FN[x][y+2][Zmax-3] - 2*FN[x][y][Zmax-3] + FN[x][y-2][Zmax-3]); 
		  
		  if (OrdemCC==2)
		    FNP[i][j][k]=prim+segX+segY;
		  else
		    FNP[i][j][k]=prim;
		  
		}
	      else
		 if (Ferromag==0)
		   FNP[i][j][k]=Da[p]*FN[i][j][k] + Db[p]*( (FN[i+1][j][k]-FN[i-1][j][k])/DX - (FN[i][j][k+1]-FN[i][j][k-1])/DZ );			    
		 else
		   cout << "\nIN HY: Ferromag = " << Ferromag << " -> There is no implementation of Hy for Ferromagnetic Materials!!";
	    }
	  
	  
	  //Testa para Hz 
	  else if (i%2==1 && j%2==1 && k%2==1 )
	    {	
	      //Nao tem C.C.	      	      
	      
	      //Teste de material ferromagnetico e da condicao de interface:
	      if (Ferromag==0 ||( p == pIplus && p == pIminus && p == pJplus && p==pJminus && p == pKplus && p == pKminus))
		FNP[i][j][k]=Da[p]*FN[i][j][k] + Db[p]*(-(FN[i+1][j][k]-FN[i-1][j][k])/DX + (FN[i][j+1][k]-FN[i][j-1][k])/DY );		 		
	      else
		{		  
		  cout << "IN HZ: Ferromag = " << Ferromag << " -> Calculating for Ferromagnetic materials!!";
		  float deltaT, NewDa, NewDb, romedio, ro[7], mimedio, mi[7];		
		  deltaT=Dt;
		  romedio=0; mimedio=0;
		  
		  int Xindice[7]={0, +1, -1,  0,  0,  0,  0};		 		  		 
		  int Yindice[7]={0,  0,  0, +1, -1,  0,  0};
		  int Zindice[7]={0,  0,  0,  0,  0, +1, -1};
		  
		  //With the actual materials, this is useless, because
		  //  all the materials have the same ro and mi...
		  if (mode!=MODE_2D_TE)
		    {
		      for (int conta=0; conta<7; conta++)
			{
			  ro[conta]=m->getMaterial(i+Xindice[conta],j+Yindice[conta],k+Zindice[conta]).ro;
			  mi[conta]=m->getMaterial(i+Xindice[conta],j+Yindice[conta],k+Zindice[conta]).mi;
			  romedio+=ro[conta];
			  mimedio+=mi[conta];
			}
		      romedio=romedio/7;
		      mimedio=mimedio/7;
		    }
		  else 
		    {		     
		      romedio=(m->getMaterial(i+1,j,k).ro + m->getMaterial(i-1,j,k).ro)/2;
		      mimedio=(m->getMaterial(i+1,j,k).mi + m->getMaterial(i-1,j,k).mi)/2;
		    }
		  
		  NewDa=(1 - (romedio*deltaT)/(2*mimedio)) / (1 + (romedio*deltaT)/(2*mimedio));
		  NewDb=(deltaT / mimedio) / (1 + (romedio*deltaT)/(2*mimedio));
		  
		  FNP[i][j][k]=NewDa*FN[i][j][k] + NewDb*(-(FN[i+1][j][k]-FN[i-1][j][k])/DX + (FN[i][j+1][k]-FN[i][j-1][k])/DY );	
		}	    	      
	    }
	  
	  //Testa se neste ponto tem fonte:			
	  //bool foundSource=false;
	  //list<Source*>::iterator it;
	  for (it=SL.begin(); it!=SL.end(); it++)
	    {
	      Source *s=*it;	     
	      // Testa se tem fonte & se este ponto eh um ponto de H
	      if (s->contains(i,j,k) && ( (i%2==0 && j%2==1 && k%2==0) || (i%2==1 && j%2==0 && k%2==0) || (i%2==1 && j%2==1 && k%2==1) ) )
		{		  
		  float val2= (deltaT/(mi0))*s->calculate(n,deltaT,i,j,k) / (DX*DY);
		  if (s->getTypeHS()==0) 
		    {
		      //Hard Source
		      FNP[i][j][k] = val2;
		    }
		  else if (s->getTypeHS()==1)				      				    
		    {
		      //Soft Source - transparent to fields
		      FNP[i][j][k] += val2;
		    }
		  else
		    cout << "\nIN H: This value (" << s->getTypeHS() << ")of Source is not allowed...";
		  
		  foundSource=true;
		  break;
		}
	    }
	  if (foundSource)
	    continue;
	  
	  
	}
  
  for (int i=0; i<Xmax; i++)
    for (int j=0; j<Ymax; j++)
      for (int k=0; k<Zmax; k++)
	{
	  
	  int x = i;	  int y = j;	  int z = k;
	  
	  //Testa para Hx em Z=0 
	  if (i%2==0 && j%2==1 && k==0)
	    {
	      
	      prim = -FNM[x][y][2] + C1Z * (FNP[x][y][2]+FNM[x][y][0]) + C2Z * (FN[x][y][0]+FN[x][y][2]);
	      segX=0; segY=0;
	      if (x>=2 && x<=Xmax-3)
		segX = C4Z * (FN[x+2][y][0] - 2*FN[x][y][0] + FN[x-2][y][0] + FN[x+2][y][2] - 2*FN[x][y][2] + FN[x-2][y][2]); 
	      if (y>=2 && y<=Ymax-3)
		segY = C3Z * (FN[x][y+2][0] - 2*FN[x][y][0] + FN[x][y-2][0] + FN[x][y+2][2] - 2*FN[x][y][2] + FN[x][y-2][2]); 	      
	      if (OrdemCC==2)
		FNP[i][j][k]=prim+segX+segY;
	      else
		FNP[i][j][k]=prim;	      
	      continue;
	    }
	  
	  //Testa para Hy em Z=0 
	  if (i%2==1 && j%2==0 && k==0)
	    {
	      
	      prim = -FNM[x][y][2] + C1Z * (FNP[x][y][2]+FNM[x][y][0]) + C2Z * (FN[x][y][0]+FN[x][y][2]);
	      segX=0; segY=0;
	      if (x>=2 && x<=Xmax-3)
		segX = C4Z * (FN[x+2][y][0] - 2*FN[x][y][0] + FN[x-2][y][0] + FN[x+2][y][2] - 2*FN[x][y][2] + FN[x-2][y][2]); 
	      if (y>=2 && y<=Ymax-3)
		segY = C3Z * (FN[x][y+2][0] - 2*FN[x][y][0] + FN[x][y-2][0] + FN[x][y+2][2] - 2*FN[x][y][2] + FN[x][y-2][2]);
	      
	      if (OrdemCC==2)
		FNP[i][j][k]=prim+segX+segY;
	      else
		FNP[i][j][k]=prim;
	      continue;
	    }						
	}		
  tempo=tempo+0.5*deltaT;
  
  //Calcula os campos E:
  //====================	
  for (int i=1; i<Xmax; i++)
    for (int j=1; j<Ymax; j++)
      for (int k=0; k<Zmax; k++)
	{	  
	  //Testa se neste ponto tem fonte pre-setada:			 
	  list<Source*>::iterator it;
	  bool foundSource=0;
	  for (it=SL.begin(); it!=SL.end(); it++)
	    {
	      Source *s=*it;	     
	      if (s->containsPRE(i,j,k)) 	                          		
		foundSource=1;	      
	    }
	  if (foundSource==1)
	    continue;
	  
	  //PARA CONVERTER DO TAKAI PARA O MEU:
	  int x = i;	int y = j; int z = k;
	  
	  //TESTA OS NULOS:
	  if ( (i%2==0 && j%2==0 && k%2==1) || (i%2==1 && j%2==1 && k%2==0) )
	    continue;
	  
	  // TESTA 2D ou 3D
	  if((mode==MODE_2D_TE && k%2==0)||(mode==MODE_2D_TM && k%2==1))
	    continue;
	  
	  //Nao tem condicao de contorno em Z para nenhum E!
	  
	  //FD-TD
	  //Acha o material no ponto
	  grid<int> &mesh=m->getMesh();
	  int p=mesh.getData(i,j,k);  
	  int matNum = m->getMatCount();
	  if(p<0 || p>matNum) 
	    {
	      cerr << "Valor invalido encontrado na malha em "<<i<<","<<j<<","<<k<<":"<<p<<".Terminando...\n";
	      exit(-1);
	    }
	 	  
	  //INTERFACE CONDITIONS:
	  int pIplus, pJplus, pKplus;
	  int pIminus, pJminus, pKminus;
	  
	  if (i<Xmax-1)	    pIplus=mesh.getData(i+1,j,k);
	  else	            pIplus=p;
	  if (i>0)	    pIminus=mesh.getData(i-1,j,k);	 
	  else	            pIminus=p;
	  
	  if (j<Ymax-1)	    pJplus=mesh.getData(i,j+1,k);
	  else	            pJplus=p;
	  if (j>0)	    pJminus=mesh.getData(i,j-1,k);	 
	  else	            pJminus=p;
	  
	  if (k<Zmax-1)	    pKplus=mesh.getData(i,j,k+1);
	  else	            pKplus=p;
	  if (k>0)	    pKminus=mesh.getData(i,j,k-1);	 
	  else	            pKminus=p;	  	    
	  
	 
	  float deltaT, NewCa, NewCb, simedio, si[7], epmedio, ep[7];		
	  deltaT=Dt;	  simedio=0;           epmedio=0;
	  
	  int Xindice[7]={0, +1, -1,  0,  0,  0,  0};
	  if (i==0) Xindice[2]=0;	  if (i==Xmax-1) Xindice[1]=0;

	  int Yindice[7]={0,  0,  0, +1, -1,  0,  0};
	  if (j==0) Yindice[4]=0;	  if (j==Ymax-1) Yindice[3]=0;
	  
	  int Zindice[7]={0,  0,  0,  0,  0, +1, -1};	  	 
	  if (k==0) Zindice[6]=0;	  if (k==Zmax-1) Zindice[5]=0;
	  
	  if (mode!=MODE_2D_TE)
	    {
	      for (int conta=0; conta<7; conta++)
		{
		  si[conta]=m->getMaterial(i+Xindice[conta],j+Yindice[conta],k+Zindice[conta]).si;
		  ep[conta]=m->getMaterial(i+Xindice[conta],j+Yindice[conta],k+Zindice[conta]).ep;
		  simedio+=si[conta];
		  epmedio+=ep[conta];
		}
	      simedio=simedio/7;
	      epmedio=epmedio/7;
	    }
	  else
	    {
	      int soma=0, subtrai=0;
	      if (i>0 && i<Xmax-1){ soma=1; subtrai=1;};	      
		
	      simedio=(m->getMaterial(i+soma,j,k).si + m->getMaterial(i-subtrai,j,k).si);
	      epmedio=(m->getMaterial(i+soma,j,k).ep + m->getMaterial(i-subtrai,j,k).ep);
	    }

	  NewCa=(1 - (simedio*deltaT)/(2*epmedio)) / (1 + (simedio*deltaT)/(2*epmedio));
	  NewCb=(deltaT / epmedio) / (1 + (simedio*deltaT)/(2*epmedio));	    	
	  		  	 
	  //STARTS THE CALCULATION OF THE FIELDS
	  //====================================

	  //CC Ez, x=Xmax
	  if (i==Xmax-1 && j%2==0 && k%2==0)
	    {	      
	      prim=-FNM[Xmax-3][y][k] + C1X * (FNP[Xmax-3][y][k]+FNM[Xmax-1][y][k]) + C2X * (FN[Xmax-3][y][k]+FN[Xmax-1][y][k]);
	      segY=0; segZ=0;
	      if (y>=2 && y<=Ymax-3)			
		segY=C3X * (FN[Xmax-3][y+2][k] - 2*FN[Xmax-3][y][k] + FN[Xmax-3][y-2][k] + FN[Xmax-1][y+2][k] - 2*FN[Xmax-1][y][k] + FN[Xmax-1][y-2][k]);
	      if (z>=2 && z<=Zmax-3 && mode==MODE_3D)			
		segZ=C4X * (FN[Xmax-3][y][k+2] - 2*FN[Xmax-3][y][k] + FN[Xmax-3][y][k-2] + FN[Xmax-1][y][k+2] - 2*FN[Xmax-1][y][k] + FN[Xmax-1][y][k-2]);
	      if (OrdemCC==2)
		FNP[Xmax-1][y][k]=prim+segY+segZ;
	      else
		FNP[Xmax-1][y][k]=prim;
	      
	    }
	  
	  // C.C. Ez, y=Ymax
	  else if (y==Ymax-1 && x%2==0 && k%2==0)
	    {
	      
	      segX=0; segZ=0;
	      prim=-FNM[x][Ymax-3][k] + C1Y * (FNP[x][Ymax-3][k] + FNM[x][Ymax-1][k]) + C2Y * (FN[x][Ymax-3][k]+FN[x][Ymax-1][k]);
	      if (x>=2 && x<=Xmax-3)
		segX= + C3Y * (FN[x+2][Ymax-3][k] - 2*FN[x][Ymax-3][k] + FN[x-2][Ymax-3][k] + FN[x+2][Ymax-1][k] - 2*FN[x][Ymax-1][k] + FN[x-2][Ymax-1][k]); 
	      if (z>=2 && z<=Zmax-3 && mode==MODE_3D)
		segZ= + C4Y * (FN[x][Ymax-3][k+2] - 2*FN[x][Ymax-3][k] + FN[x][Ymax-3][k-2] + FN[x][Ymax-1][k+2] - 2*FN[x][Ymax-1][k] + FN[x][Ymax-1][k-2]); 
	      if (OrdemCC==2)
		FNP[x][Ymax-1][k]= prim + segX + segZ;
	      else
		FNP[x][Ymax-1][k]= prim;
	      
	    }
	  	  
	  //C.C. Ex, y=Ymax
	  else if (i%2==1 && j==Ymax-1 && k%2==1)
	    {
	      
	      prim=-FNM[x][Ymax-3][k] + C1Y * (FNP[x][Ymax-3][k] + FNM[x][Ymax-1][k]) + C2Y * (FN[x][Ymax-3][k]+FN[x][Ymax-1][k]);
	      segX=0; segZ=0;
	      if (x>=2 && x<=Xmax-3)
		segX= + C3Y * (FN[x+2][Ymax-3][k] - 2*FN[x][Ymax-3][k] + FN[x-2][Ymax-3][k] + FN[x+2][Ymax-1][k] - 2*FN[x][Ymax-1][k] + FN[x-2][Ymax-1][k]); 
	      if (z>=2 && z<=Zmax-3 && mode==MODE_3D)
		segZ= + C4Y * (FN[x][Ymax-3][k+2] - 2*FN[x][Ymax-3][k] + FN[x][Ymax-3][k-2] + FN[x][Ymax-1][k+2] - 2*FN[x][Ymax-1][k] + FN[x][Ymax-1][k-2]); 
	      if (OrdemCC==2)
		FNP[x][Ymax-1][k]= prim + segX + segZ;
	      else
		FNP[x][Ymax-1][k]= prim;
	      
	      
	    }
	  	
	  //C.C. Ey, x=Xmax
	  else if (i==Xmax-1 && j%2==1 && k%2==1)
	    {
	      
	      prim=-FNM[Xmax-3][y][k] + C1X * (FNP[Xmax-3][y][k]+FNM[Xmax-1][y][k]) + C2X * (FN[Xmax-3][y][k]+FN[Xmax-1][y][k]);
	      segY=0; segZ=0;
	      if (y>=2 && y<=Ymax-3)			
		segY=C3X * (FN[Xmax-3][y+2][k] - 2*FN[Xmax-3][y][k] + FN[Xmax-3][y-2][k] + FN[Xmax-1][y+2][k] - 2*FN[Xmax-1][y][k] + FN[Xmax-1][y-2][k]);
	      if (z>=2 && z<=Zmax-3 && mode==MODE_3D)			
		segZ=C4X * (FN[Xmax-3][y][k+2] - 2*FN[Xmax-3][y][k] + FN[Xmax-3][y][k-2] + FN[Xmax-1][y][k+2] - 2*FN[Xmax-1][y][k] + FN[Xmax-1][y][k-2]);
	      if (OrdemCC==2)
		FNP[Xmax-1][y][k]=prim+segY+segZ;
	      else
		FNP[Xmax-1][y][k]=prim;
	      
	    }
	
	  //Testa para Ex
	  else if (i%2==1 && j%2==0 && k%2==1)
	    {
	      if ((k>1 && k<Zmax-2)||(naoFioInf))
		{ 	
		  
		  if (interface='n' || (p == pIplus && p == pIminus && p == pJplus && p==pJminus && p == pKplus && p == pKminus))		    
		    FNP[i][j][k]=Ca[p]*FN[i][j][k] + Cb[p]*( (FNP[i][j+1][k]-FNP[i][j-1][k])/DY - (FNP[i][j][k+1]-FNP[i][j][k-1])/DZ );	 		     		  
		  else //interface conditions		  
		    FNP[i][j][k]=NewCa*FN[i][j][k] + NewCb*( (FNP[i][j+1][k]-FNP[i][j-1][k])/DY - (FNP[i][j][k+1]-FNP[i][j][k-1])/DZ );		
		}	      	      
	    }
	  
	  //Testa para Ey
	  else if (i%2==0 && j%2==1 && k%2==1)
	    {
	      if ((k>1 && k<Zmax-2 )||(naoFioInf))
		{			     		  		  
		  if (interface='n' ||(p == pIplus && p == pIminus && p == pJplus && p==pJminus && p == pKplus && p == pKminus))
		    FNP[i][j][k]=Ca[p]*FN[i][j][k] + Cb[p]*( (FNP[i][j][k+1]-FNP[i][j][k-1])/DZ - (FNP[i+1][j][k]-FNP[i-1][j][k])/DX );
		  else  //interface conditions
		    FNP[i][j][k]=NewCa*FN[i][j][k] + NewCb*( (FNP[i][j][k+1]-FNP[i][j][k-1])/DZ - (FNP[i+1][j][k]-FNP[i-1][j][k])/DX );
		}	      
	    }
	  
	  //Testa para  Ez
	  else if (i%2==0 && j%2==0 && k%2==0)
	    {
	      if (interface='n' || (p == pIplus && p == pIminus && p == pJplus && p==pJminus && p == pKplus && p == pKminus))
		FNP[i][j][k]=Ca[p]*FN[i][j][k] + Cb[p]*( (FNP[i+1][j][k]-FNP[i-1][j][k])/DX - (FNP[i][j+1][k]-FNP[i][j-1][k])/DY );
	      else  //interface conditions
	      	FNP[i][j][k]=NewCa*FN[i][j][k] + NewCb*( (FNP[i+1][j][k]-FNP[i-1][j][k])/DX - (FNP[i][j+1][k]-FNP[i][j-1][k])/DY );
	    }

	  //Testa se neste ponto tem fonte:
	  //bool foundSource=false;
	  //list<Source*>::iterator it;
	  for (it=SL.begin(); it!=SL.end(); it++)
	    { 
	      Source *s=*it;	     	          
	      // Testa se tem fonte & se este ponto eh um ponto de E
	      if (s->contains(i,j,k) && ( (i%2==1 && j%2==0 && k%2==1) || (i%2==0 && j%2==1 && k%2==1) || (i%2==0 && j%2==0 && k%2==0) ) )
		{
		  //SOURCE = (deltaT/(ep0))*(Io * cos(2*PI*f*(n+0.5)*deltaT) ) / (DX*DY);
		  float val2 = (deltaT/(ep0))*s->calculate(n+0.5, deltaT,i,j,k) / (DX*DY);
		  //cout << "\nFonte em E[" << i << "][" << j << "][" << k << "] = " << val2;
		  if (s->getTypeHS()==0)
		    // Hard Source:
		    FNP[i][j][k]=val2;
		  else 
		    if (s->getTypeHS()==1)
		      // SOFT source:
		      FNP[i][j][k] += val2;
		    else
		      cout << "\nIN E: This value (" << s->getTypeHS() << ")of Source is not allowed...";   		  
		  foundSource=true;
		  break;
		}
	    }			
	  
	  if (foundSource) continue;
	  
	}
  for (int i=Xmax-1; i>=0; i--)
    for (int j=Ymax-1; j>=0; j--)
      for (int k=Zmax-1; k>=0; k--)
	{		
	  //PASSANDO DO TAKAI PARA O MEU:
	  int x = i;	 int y = j;	int z = k;
	  
	  // C.C. Ez, x=0
	  if (x==0  && y%2==0 && z%2==0)
	    {	      
	      prim=-FNM[2][y][k] + C1X * (FNP[2][y][k]+FNM[0][y][k]) + C2X * (FN[0][y][k]+FN[2][y][k]); 
	      segY=0; segZ=0;
	      if (y>=2 && y<=Ymax-3)					
		segY= C3X * (FN[0][y+2][k]-2*FN[0][y][k]+FN[0][y-2][k]+FN[2][y+2][k]-2*FN[2][y][k]+FN[2][y-2][k]); 
	      if (z>=2 && z<=Zmax-3 && mode==MODE_3D)					
		segZ= C4X * (FN[0][y][k+2]-2*FN[0][y][k]+FN[0][y][k-2]+FN[2][y][k+2]-2*FN[2][y][k]+FN[2][y][k-2]); 
	      
	      if (OrdemCC==2)
		FNP[0][y][k] = prim + segY + segZ;
	      else
		FNP[0][y][k] = prim;
	      
	      continue;
	    }
	  
	  // C.C. Ez, y=0
	  if (x%2==0 && y==0 && z%2==0)
	    {
	      
	      prim =-FNM[x][2][k] + C1Y * (FNP[x][2][k]+FNM[x][0][k]) + C2Y * (FN[x][0][k]+FN[x][2][k]);
	      segX=0; segZ=0;
	      if (x>=2 && x<=Xmax-3)
		segX = C3Y * (FN[x+2][0][k]-2*FN[x][0][k]+FN[x-2][0][k]+FN[x+2][2][k]-2*FN[x][2][k]+FN[x-2][2][k]);
	      if (z>=2 && z<=Zmax-3 && mode==MODE_3D)
		segZ = C4Y * (FN[x][0][k+2]-2*FN[x][0][k]+FN[x][0][k-2]+FN[x][2][k+2]-2*FN[x][2][k]+FN[x][2][k-2]);
	      
	      if (OrdemCC==2)
		FNP[x][0][k]= prim + segX + segZ;
	      else
		FNP[x][0][k] = prim;
	      
	      continue;
	    }	
	  
				
	  // C.C. Ex, y=0
	  if (x%2==1 && y==0 && z%2==1)
	    {
	      prim =-FNM[x][2][k] + C1Y * (FNP[x][2][k]+FNM[x][0][k]) + C2Y * (FN[x][0][k]+FN[x][2][k]);
	      segX=0; segZ=0;
	      if (x>=2 && x<=Xmax-3)
		segX = C3Y * (FN[x+2][0][k]-2*FN[x][0][k]+FN[x-2][0][k]+FN[x+2][2][k]-2*FN[x][2][k]+FN[x-2][2][k]);
	      if (z>=2 && z<=Zmax-3 && mode==MODE_3D)
		segZ = C4Y * (FN[x][0][k+2]-2*FN[x][0][k]+FN[x][0][k-2]+FN[x][2][k+2]-2*FN[x][2][k]+FN[x][2][k-2]);
	      
	      if (OrdemCC==2)
		FNP[x][0][k]= prim + segX + segZ;
	      else
		FNP[x][0][k]=prim;
	      
	      continue;
	    }	
	  
				
	  // C.C. Ey, x=0
	  if (x==0  && y%2==1 && z%2==1)
	    {
	      prim=-FNM[2][y][k] + C1X * (FNP[2][y][k]+FNM[0][y][k]) + C2X * (FN[0][y][k]+FN[2][y][k]); 
	      segY=0; segZ=0;
	      if (y>=2 && y<=Ymax-3)					
		segY= C3X * (FN[0][y+2][k]-2*FN[0][y][k]+FN[0][y-2][k]+FN[2][y+2][k]-2*FN[2][y][k]+FN[2][y-2][k]); 
	      if (z>=2 && z<=Zmax-3 && mode==MODE_3D)					
		segZ= C4X * (FN[0][y][k+2]-2*FN[0][y][k]+FN[0][y][k-2]+FN[2][y][k+2]-2*FN[2][y][k]+FN[2][y][k-2]); 
	      
	      if (OrdemCC==2)
		FNP[0][y][k] = prim + segY + segZ;
	      else
		FNP[0][y][k] = prim;
	      
	      continue;
	    }	  //end of Ey loop

	} //end if (x,y,z) loop
  
  //POST FDTD CONDITIONS FOR SOURCES:
  //=================================
  for (int i=Xmax-1; i>=0; i--)
    for (int j=Ymax-1; j>=0; j--)
      for (int k=Zmax-1; k>=0; k--)
	{	  
	  list<Source*>::iterator it;
	  for (it=SL.begin(); it!=SL.end(); it++)
	    {
	      Source *s=*it;	      
	      if (s->containsPOS(i,j,k))
		{	
		  float val2= (deltaT/(mi0))*s->calculatePOS(n,deltaT,i,j,k) / (DX*DY); //=0 PEC CONDITIONS						  		  
		  FNP[i][j][k]= val2;
		  FN[i][j][k]=val2;
		}		  		  		
	    }
	  	 
	  if (0)
	    if (i<=1+(Xmax-1)/2 && i%2==1 && j==1+(Ymax-1)/2 && k==1+(Zmax-1)/2 && FNP[i][j][k]!=0)	    
	      cout << "\n\nCAMPO Hz EM [" << i << "][" << j << "][" << k << "] = " <<  FNP[i][j][k];	 			
	    
	}

  AreaIrrad = 0; hCONVtotal = 0;
  //cout << "\nChamando StepThermal para n = " << n;
  this->stepThermal(n);  
  //cout << "\n\n AREA IRRAD = " << AreaIrrad << " hCONVtotal de n=1 = " << hCONVtotal;       
  
}		

void FDTDSimulator::stepThermal(int n)
{      
  grid<int> &materialmesh=m->getMesh();	
  int Xmax=materialmesh.getLength(); //x
  int Ymax=materialmesh.getWidth(); //y
  int Zmax=materialmesh.getHeight(); //z	
  float DX=m->getDeltaX();
  float DY=m->getDeltaY();
  float DZ=m->getDeltaZ();	  
  
  // Substitui as matrizes
  //    TN(n) e TNPlus(n+1)
  grid<float> *temp;
  temp = ThermalN;
  ThermalN = ThermalNPlus;
  ThermalNPlus = temp;
	
  //Pega os valores das matrizes
  float ***Tminus=ThermalN->getDataPointer(); //Tanterior
  float ***Tplus=ThermalNPlus->getDataPointer(); //Tatual
  float ***Trise=TRise->getDataPointer(); //Thermal Rise

  //============================================ 
  float Ttime = n*deltaT;
  cout <<"\n\n *********************** N = " << n << "  --->  t = " << Ttime << "[s]";

  maxSAR = 0;
  PmaxSARX= 0; PmaxSARY= 0; PmaxSARZ= 0;  
  strcpy(TmaxSAR, " ");
  totSAR = 0;
  
  for (int i=0; i<Xmax; i++)
    for (int j=0; j<Ymax; j++)
      for (int k=0; k<Zmax; k++)
	{
	  if (n==0)
	    { 
	      Tminus[i][j][k]=ThermalInit(i,j,k);	      
	      Tplus[i][j][k]=ThermalInit(i,j,k);	    
	      Trise[i][j][k]=0;
	    }
	  else	          	    
	    {	     	      
	      Tplus[i][j][k]=ThermalPoint(i,j,k, Tminus, Trise, n); 	      
	    }
	}

  if (maxSAR!=0) 
    {   
      cout << "\nMaxSAR [" << PmaxSARX << "][" << PmaxSARY << "][" << PmaxSARZ << "] = " << maxSAR << " = " << TmaxSAR;
      cout << "\nTotalSAR = " << totSAR;
    }
  
    
}

float FDTDSimulator::ThermalInit(int i,int j,int k) 
{
  Material &mat=m->getMaterial(i,j,k);     
  if (mat.name=="Air")
    return(Tenv);  
  else
    return(Tinit);    
}

float FDTDSimulator::ThermalPoint(int xx, int yy, int zz, float ***Tminus, float ***Trise, int n)
{     
  //Get Model Data:
  int SizeX, SizeY, SizeZ;
  SizeX = getLength();
  SizeY = getWidth();
  SizeZ = getHeight();
  
  //Sets the Boundaries of the domain:
  if (xx<2 || xx>SizeX-3 || yy<2 || yy>SizeY-3 || zz<2 || zz>SizeZ-3)
    return (Tenv);  

  //It is only calculated for the whole Yee cube. For that, we use:
  int x, y, z;  
  
  if (xx%2!=0 || yy%2!=0 || zz%2!=0) //if it is not an (even,even,even) point
    {      
      if (xx%2!=0)	x=xx-1;  else x=xx; 
      if (yy%2!=0) 	y=yy-1;  else y=yy;
      if (zz%2!=0) 	z=zz-1;  else z=zz;           
      
      float ***TP = ThermalNPlus->getDataPointer(); //T_atual
      float ***SV = SARvalues->getDataPointer(); //SAR atual      
      SARvalues->setData(xx,yy,zz,SV[x][y][z]);
      return(TP[x][y][z]);
    }  
  else    
    { 
      x=xx;  y=yy;    z=zz;    
      
      //Gets the Material in the point and surroundings:
      float ***FNP=FieldNPlus->getDataPointer();  //Campo atual
      Material &mat=m->getMaterial(x,y,z);
      Material &matPlusX = m->getMaterial(x+2,y,z);
      Material &matPlusY = m->getMaterial(x,y+2,z);
      Material &matPlusZ = m->getMaterial(x,y,z+2);
      Material &matMinusX = m->getMaterial(x-2,y,z);
      Material &matMinusY = m->getMaterial(x,y-2,z);
      Material &matMinusZ = m->getMaterial(x,y,z-2);
      
      if (mat.name=="Air" || mat.name=="Coper")     return (Tenv);  //25oC
      if (mat.name=="Blood")   return (Tinit); //36.8oC  

      double T, SAR; 
      T=0; SAR=0;
      
      //FORMULATION TYPE: Gandhi = 'g' or Wang = 'w';      
      if (TFormType == 'g')
	{
	  //Calculates the thermal difusion equation from:
	  // Gandhi, O.P, "Temperature Rise for the Human Head for Cellular Telephones and for Peak 
	  // SARs Prescribed in Safety Guidelines", IEEE Trans. on Microwave Theory and Techniques,
	  // vol.49, no.9, 2001.
	  // 
	  //   C(m).mp(m).dT/dt = V. [ grad (K.grad (T)) + hm(m) + hEM(m) + bf.Cb(Tb-T) ] - hRAD - hCONV - hE
	  //      V = volume of the cell = dx * dy * dz
	  //      hm = metabolism
	  //      hEM = density.SAR
	  //      hRAD  = emiss . sbc . AeffRAD = 0.98 * 5.67e-8 * Area irradiando
	  //      hCONV = hc . AeffCONV . (Tpoint - Tenv) = 2.7 * Area irradiando * (T - Tenv)
	  //      hE = kevap . An . (Pwpoint - Pwenv)
	  //                  
	  
	  float C, mp, K, hm, V, SAR, hEM, b, Cb, Tb, hRAD, hCONV, hE, Emiss, sbc, AeffRAD, AeffCONV, Hc, Tpoint, T, kevap, An, PwPoint, PwEnv;
	  int IrradSides;
	  //Material constants: 
	  Tpoint = Tminus[x][y][z]; //Point Temperature
	  C=mat.Cm; //Specific Heat [W hr / (oC kg)]
	  K=mat.k; //Heat Conductivity [W/(m oC)]           
	  hm=mat.hm*mat.density; //Metabolism [W/m3] = hm[W/kg] * density [kg/m3]

	  V=(Dx*Dy*Dz); //Volume of the total cube [m3]	
	  mp=V*mat.density; //Mass [kg]  	  	 	  
	  //if (mat.name=="Air") cout << "\nCALCULANDO NO AR!";

	  //Para o cilindro no caso de 1 celula:
	  /*
	    V=1.3333*3.14159*(Dx/2)*(Dx/2)*(Dx/2); //Volume of the total cube [m3]	
	    mp=V*mat.density; //Mass [kg]
	  */
	  
	  //Heat loss to blood:
	  b=mat.bf; //Blood Flow [kg / m3 hr]
	  Cb = 1.06; //Blood Specific Heat [W hr / (oCkg)]
	  Tb = 36.8; //Blood Temperature [oC]	  	  
	 
	  //SAR input power only calculated in Ez
	  //SAR = sigma * |E|^2 / (2 * ro)  where  sigma = electric resistivity and ro = density
	  SAR = (mat.si*(pow(FNP[x][y][z],2)+pow(FNP[x+1][y][z+1],2)+pow(FNP[x][y+1][z+1],2))/(2*mat.density)); //Specific Absorption Rate    	  
	  totSAR+=SAR;
	  SARvalues->setData(x,y,z,SAR);
	  if (SAR > maxSAR)
	    { maxSAR = SAR; setPmaxSARX(x); setPmaxSARY(y); setPmaxSARZ(z);  strcpy(TmaxSAR, mat.name.c_str());  }	  
	      	  
	  //Para Calculo de hEM, temos, segundo:
	  // Riu, P.J., "Heating of Tissue by Near-Field Exposure to a Dipole: A Model Analysis"             
	  // IEEE Transactions on Biomedical Engineering, vol.46, no.8, August 1999
	  hEM = mat.density * SAR; 	  	  
	  //if (hEM!=0) { cout << "\nhEM[" << x << "][" << y << "][" << z << "] = " << hEM ;}

	  //RADIATIVE, CONVECTIVE and EVAPORATIVE heat losses from the periferal cells per unit volume:
	  if (matPlusX.name == "Air" || matPlusY.name == "Air" || matPlusZ.name == "Air"|| matMinusX.name == "Air" || matMinusY.name == "Air" || matMinusZ.name == "Air" )
	    {	     
	      IrradSides=0;
	      if (matPlusX.name=="Air") IrradSides++;  if (matMinusX.name=="Air") IrradSides++;
	      if (matPlusY.name=="Air") IrradSides++;  if (matMinusY.name=="Air") IrradSides++;
	      if (mode==MODE_3D) { if (matPlusZ.name=="Air") IrradSides++;  if (matMinusZ.name=="Air") IrradSides++;}	    	        	     

	      //RADIATIVE:
	      //---------
	      // "Skin" = 0.98; "Aluminium" = value between 0.039 and 0.057; "Brick" = 0.93; "ERL" = value between 0.95 and 0.963
	      // "Coper" = 0.023; else emiss = 0;
	      Emiss = mat.emiss;	      
	      sbc = 5.67e-8; //[W/m2.K4] = Stefan-Boltzman constant	 
	      if (mode!=MODE_3D)
		AeffRAD = (Dx) * (Dy);  //one point cube
	      else
		{
		  AeffRAD=(Dx)*(Dx);
		  if ((Dx!=Dy) || (Dx!=Dz) || (Dy!=Dz))	{  cout << "\nIn the RADIATIVE LOSS calculation, the deltas are considered equal!";}
		}
	      hRAD = IrradSides * Emiss * sbc * AeffRAD*(pow((Tpoint + 273.15),4) - pow((Tenv + 273.15),4));	    	      
	      //hRAD = 0;
	      //if (hRAD!=0) {  cout << "\nhRAD[" << x << "][" << y << "][" << z << "] = " << hRAD ;}

	      //CONVECTIVE:
	      //-----------	      
	      Hc = m->getHenv();
	      /*if (mode!=MODE_3D)
		AeffCONV = (Dx)*(Dy); //one point cube
		else
		{
		AeffCONV = (Dx)*(Dx);
		if ((Dx!=Dy) || (Dx!=Dz) || (Dy!=Dz))
		{  cout << "\nIn the CONVECTIVE LOSS calculation, the deltas are considered equal!";}
		}	  	      
		hCONV = IrradSides * Hc * AeffCONV * (Tpoint - Tenv);		      	      
		if (hCONV!=0) 
		{ 		  
		hCONVtotal +=hCONV;		  
		AreaIrrad += IrradSides*AeffCONV;		  		  
		}
	      */
	      float IrradXM=0, IrradYM=0, IrradZM=0, IrradXP=0, IrradYP=0, IrradZP=0;
	      if (matPlusX.name=="Air") IrradXP=1;  if (matMinusX.name=="Air") IrradXM=1;
	      if (matPlusY.name=="Air") IrradYP=1;  if (matMinusY.name=="Air") IrradYM=1;
	      if (mode==MODE_3D) { if (matPlusZ.name=="Air") IrradZP=1;  if (matMinusZ.name=="Air") IrradZM=1;}	    
	      float aa, Bi, ss;
	      aa = K/(mat.density*C*3600);
	      Bi = (Hc*Dx)/K;
	      ss = (aa*deltaT)/(Dx*Dx);
	      hCONV = 0;	      	      

	      if (IrradXM!=0 && IrradXP!=0) 
		{  AeffCONV = (Dy*Dz);    hCONV += 2 * Hc * AeffCONV * (Tminus[x][y][z] - Tenv); }
	      else
		{
		  if (IrradXP!=0)  
		    {  AeffCONV = (Dy*Dz);    hCONV += Hc * AeffCONV * (Tminus[x-2][y][z] - Tenv); }
		  if (IrradXM!=0)  
		    {  AeffCONV = (Dy*Dz);    hCONV += Hc * AeffCONV * (Tminus[x+2][y][z] - Tenv); }
		}

	      if (IrradYP!=0 && IrradYM!=0)
		{  AeffCONV = (Dx*Dz);    hCONV += 2 * Hc * AeffCONV * (Tminus[x][y][z] - Tenv); }
	      else
		{
		  if (IrradYP!=0)  
		    { AeffCONV = (Dx*Dz);    hCONV += Hc * AeffCONV * (Tminus[x][y-2][z] - Tenv); }
		  if (IrradYM!=0)  
		    {  AeffCONV = (Dx*Dz);    hCONV += Hc * AeffCONV * (Tminus[x][y+2][z] - Tenv); }
		}

	      if (IrradZP!=0 && IrradZM!=0)  
		{  AeffCONV = (Dx*Dy);   hCONV +=  2 * Hc * AeffCONV * (Tminus[x][y][z] - Tenv);	}
	      else
		{
		  if (IrradZP!=0)  
		    { AeffCONV = (Dx*Dy);   hCONV += Hc * AeffCONV * (Tminus[x][y][z-2] - Tenv);   }
		  if (IrradZM!=0)  
		    { AeffCONV = (Dx*Dy);   hCONV += Hc * AeffCONV * (Tminus[x][y][z+2] - Tenv);   }
		}	     	      	      	      	      	     

	      //EVAPORATIVE:
	      //------------
	      if (mat.name=="Skin")
		{
		  kevap = 0.35; //[w/(m2.mmHg)]		 	
		  An = Dx * Dx; // ---------------------------------> Assumindo Dx =Dy = Dz = D
		  if ((Dx!=Dy) || (Dx!=Dz) || (Dy!=Dz))
		    {  cout << "\nIn the EVAPORATIVE LOSS calculation, the deltas are considered equal!";}
		  PwPoint = 1.92 * Tpoint - 2.53; //vapour pressure of water at Skin [mmHg]
		  if (Tenv=25)
		    PwEnv = 23.8; //vapour pressure of water in Air [mmHg] for 25[oC]
		  else
		    PwEnv = 6.5743*exp(0.05*Tenv); // better fit of data;
		  hE = IrradSides * kevap * An * ( PwPoint - PwEnv );
		}
	      else
		hE = 0;
	      //if (hE!=0) {  cout << "\nhE[" << x << "][" << y << "][" << z << "] = " << hE ;}
	    }
	  else {   hRAD = 0;    hCONV = 0;	   hE=0; }            
	  
	  // IN THE FD-TD:
	  // "gradients" = grad(k.grad(T))
	  //             = K(i,j,k)*[(T(i+1,j,k,n)-2*T(i,j,k,n)+T(i-1,j,k,n))/(DeltaX*DeltaX) + (T(i,j+1,k,n)-2*T(i,j,k,n)+T(i,j-1,k,n))/(DeltaY*DeltaY) + 
	  //               (T(i,j,k+1,n)-2*T(i,j,k,n)+T(i,j,k-1,n))/(DeltaZ*DeltaZ)] + [(k(i+1/2,j,k,n)+k(i-1/2,j,k,n))/DeltaX + (k(i,j+1/2,k,n)+k(i,j-1/2,k,n))/DeltaY +
	  //               (k(i+1/2,j,k,n)+k(i-1/2,j,k,n))/DeltaZ] * [(T(i+1/2,j,k,n)-T(i-1/2,j,k,n))/DeltaX + (T(i,j+1/2,k,n)-T(i,j-1/2,k,n))/DeltaY + 
	  //               (T(i,j,k+1/2,n)-T(i,j,k-1/2,n))/DeltaZ]
	  // H1 = -hRAD - hCONV - hE
	  // H2 = V * (hm + hEM)
	  // T(i,j,k,n+1) = T(i,j,k,n) + [DeltaT / C.mp]* [ V. "gradients" + V.bf.Cb(Tb - T(i,j,k,n)) + H1 + H2 ];      	  	  	    	 
	  
	  float gradA, gradAx, gradAy, gradAz;
	  float gradB, gradBkx, gradBky, gradBkz, gradBtx, gradBty, gradBtz;
	  float gradients, H1, H2, Tbefore;     
	  gradA=0; gradAx = 0; gradAy = 0; gradAz = 0;
	  gradB = 0; gradBkx= 0; gradBky=0;  gradBkz=0;  gradBtx=0;  gradBty=0;  gradBtz=0;	 	  
	  
	  //IN SIDES THAT DO NOT TOUCH AIR:   AINDA DECAI MUITO RAPIDO!! = BERNARDI
	  //-------------------------------	  	  	 	  	  
	  gradAx = 0; gradAy = 0; gradAz = 0;
	  if (matPlusX.name == mat.name && matMinusX.name == mat.name)
	    {
	      gradAx = ( Tminus[x+2][y][z] - 2*Tminus[x][y][z] + Tminus[x-2][y][z] )/(Dx*Dx); 	     
	    }
	  else
	    { 
	      if (matPlusX.name == mat.name)	        gradAx = ( Tminus[x+2][y][z] - Tminus[x][y][z])/(Dx*Dx);
	      if (matMinusX.name == mat.name)		gradAx = -( Tminus[x][y][z] - Tminus[x-2][y][z])/(Dx*Dx);	     
	    }
	  
	  if (matPlusY.name == mat.name && matMinusY.name == mat.name)	 
	    {
	      gradAy = (Tminus[x][y+2][z] - 2*Tminus[x][y][z] + Tminus[x][y-2][z])/(Dy*Dy);
	    }
	  else
	    { 
	      if (matPlusY.name == mat.name)		gradAy = ( Tminus[x][y+2][z] - Tminus[x][y][z])/(Dy*Dy);
	      if (matMinusY.name == mat.name)		gradAy = -( Tminus[x][y][z] - Tminus[x][y-2][z])/(Dy*Dy);	      
	    }	 
	  
	  if (matPlusZ.name == mat.name && matMinusZ.name == mat.name && mode==MODE_3D)
	    {
	      gradAz = (Tminus[x][y][z+2] - 2*Tminus[x][y][z] + Tminus[x][y][z-2])/(Dz*Dz);
	    }
	  else
	    { 
	      if (matPlusZ.name == mat.name)		gradAz = ( Tminus[x][y][z+2] - Tminus[x][y][z])/(Dz*Dz);
	      if (matMinusZ.name == mat.name)		gradAz = -( Tminus[x][y][z] - Tminus[x][y][z-2])/(Dz*Dz);	      
	    }	  	  
	  gradA = K * (gradAx + gradAy + gradAz);	  	  	  	  	  	  	  	 	  
	  
	  //GRAD B:
	  //-------	  
	  float  kPlusX, kMinusX, kPlusY, kMinusY, kPlusZ, kMinusZ;           
	  if (m->getMaterial(x+1,y,z).name!="Air" && m->getMaterial(x-1,y,z).name!="Air")  
	    { 
	      kPlusX = m->getMaterial(x+1,y,z).k;  
	      kMinusX = m->getMaterial(x-1,y,z).k; 
	      gradBkx = (kPlusX-kMinusX)/Dx; 
	      gradBtx = (Tminus[x+1][y][z] - Tminus[x-1][y][z])/Dx;	 
	    }	 
	  if (m->getMaterial(x,y+1,z).name!="Air" && m->getMaterial(x,y-1,z).name!="Air")  
	    { 
	      kPlusY = m->getMaterial(x,y+1,z).k;  
	      kMinusY = m->getMaterial(x,y-1,z).k;
	      gradBky = (kPlusY-kMinusY)/Dy;
	      gradBty = (Tminus[x][y+1][z] - Tminus[x][y-1][z])/Dy;	
	    }       
	  if (mode==MODE_3D && m->getMaterial(x,y,z+1).name!="Air" && m->getMaterial(x,y,z-1).name!="Air") 
	    {  
	      kPlusZ = m->getMaterial(x,y,z+1).k; 
	      kMinusZ = m->getMaterial(x,y,z-1).k;
	      gradBkz = (kPlusZ-kMinusZ)/Dz ;
	      gradBtz = (Tminus[x][y][z+1] - Tminus[x][y][z-1])/Dz;	    
	    }	           		  	 	  	  	    
	  
	  gradB = gradBkx*gradBtx + gradBky*gradBty + gradBkz*gradBtz;	  	 	 	  	  	 

	  gradients = gradA + gradB; 	  	 	  	  	      
	  H1 = -hRAD - hCONV - hE;     
	  H2 = hm + hEM;     	            
	  Tbefore = Tminus[x][y][z];
	  float deltaTH = deltaT/(3600); //DeltaT must enter in hours	  
	  //COMPLETA:
	  T = Tbefore + (deltaTH / (C*mp) ) * ( V*gradients +  V*H2 + V*b*Cb*(Tb - Tbefore) + H1  );            
	 
	  //ANALITICAL SOLUTION FOR THE WIRE: WORKING FINE!	  
	  // FOR THE WIRE;
	  /*
	    float TtimeW, TFanalyW, TanalyW, ErroW, ErroPercW;
	    TtimeW = (n*deltaT)/(60*60);
	    TFanalyW = 100+300*exp(-170.69*TtimeW);    //in Farenheit
	    TanalyW = 0.555555556*(TFanalyW-32);	      
	    if (xx==(SizeX-1)/2 && yy==(SizeY-1)/2 && zz==(SizeZ-1)/2)
	    {	
	    ErroW = TanalyW - T;
	    ErroPercW = 100*ErroW/TanalyW;
	    cout << "\n\n TCenter[" << x << "][" << y << "][" << z << "] = " << T << "[oC]";
	    cout << "\n Tanaly WIRE = " << TanalyW << "    ERRO = " << ErroW << "[oC] = " << ErroPercW << "[%]" ;	      
	    }
	  */
	  
	  //ANALITICAL SOLUTION FOR THE FIRST SPHERE:
	  /*
	    float Ttime, tstar, ho, ro, kons, Bi, betai, C1, alfa, Ti, To, Tetac, TetaExact, Tanaly, TanalyEx;
	    ho = 115; ro = 0.025; kons = 46; Bi = ho*ro/kons;
	    betai = 0.505; 
	    C1 =  4*(sin(betai) - betai*cos(betai) ) / ( 2*betai - sin(2*betai) );
	    alfa = 1.7e-5; Ti = 200; To = 20; 
	    float TetacCenter, TanalyCenter;                         
	    Ttime = (n*deltaT);
	    tstar = alfa*Ttime/(pow(ro,2));
	    if (tstar>0.2) 
	    { 	     
	    TetacCenter = C1*exp(-betai*betai*tstar); //center
	    TanalyCenter = To + TetacCenter*(Ti-To);  //center
	    Tetac = TetacCenter * 0.1065;   //surface
	    Tanaly = To * Tetac*(Ti-To);              //surface
	    }
	    else 
	    {
	    TanalyCenter = Ti;
	    Tanaly = Ti;
	    }     
	    float erro, erroperc;
	    erro =  TanalyCenter - T;
	    erroperc = 100*erro/TanalyCenter;
	  */
	  
	  float Ttime;
	  Ttime = n*deltaT; 

	  //ANALITICAL SOLUTION FOR THE SECOND SPHERE:	  
	  /*
	    float Cp,  ho, ro, D, kons, Ti, To, TanalyMedia, TanalyCenter;	    	  	      	 	    	  	    
	    ho = 115; kons = 46; ro=8000; Cp = 420; To = 90;	    
	    D=0.05;	    Ti = 450; To=Tenv;	  	
	    
	    
	    float tao, erroM, erropercM;
	    tao = (ro*Cp*D)/(ho*6);
	    TanalyMedia = To + (Ti -To)*exp(-Ttime/tao);	 		     
	    erroM =  TanalyMedia - (Tmedia[n-1]/(CubosMedia[n-1]));
	    erropercM = 100*erroM/TanalyMedia;	
	    
	    float erroC, erropercC, erroL, erropercL;	
	    float raio, Bi, C1, beta1, tstar, alfa, Tlumped;
	    int tpulo =1;
	    Bi = ho*(D/2)/K;	    C1 = 1.0186752; beta1=0.43035;
	    alfa = K/(ro*Cp);	    raio = D/2;
	    tstar = alfa*Ttime/(raio*raio); 	    
	    if (tstar>0.2)	    
	    {  TanalyCenter = To + (Ti-To)*C1*exp(-beta1*beta1*tstar); }
	    else	  
	    {  TanalyCenter = Ti;	  }
	    
	    Tlumped = To + (Ti-To) *exp(-ho*Ttime/(ro*Cp*D/6));
	    erroC =  TanalyCenter - T;
	    erropercC = 100*erroC/TanalyCenter;
	  */	 
	  
	  float TmaxW = (2*mat.density*C*3600*Dx*Dx)/(12*K + b*Dx*Dx);
	  float TmaxB =  1/( 8*K/(C*3600*mat.density*Dx*Dx) + 8*Hc/(C*3600*mat.density*Dx) + b/(C*3600*mat.density));
	  if (deltaT > TmaxW || deltaT > TmaxB)
	  {
	    cout << "\n\n   DELTA T (" << deltaT << " HIGHER THAN THE MAXIMUM ALLOWED!!! ";
	    cout << "\n     Delta Wang = " << TmaxW << "      Delta Bernardi = " << TmaxB << "\n\n";
	  } 
	  
	  if (0)
	    if (matPlusX.name == "Air" || matPlusY.name == "Air" || matPlusZ.name == "Air"|| matMinusX.name == "Air" || matMinusY.name == "Air" || matMinusZ.name == "Air" )
	    if (SAR!=0 && xx<=(SizeX-1)/2 && yy<=(SizeY-1)/2 && zz<=(SizeZ-1)/2)
	    {
	      cout << "\n\n PONTO [" << xx << "][" << yy << "][" << zz << "]";
	      cout << "\n    CONTRIBUICAO ELETROMAG (hEM) = " << hEM << "[W] --> " << deltaTH/(C*mp)* V *hEM << "[oC]";		     	      
	      cout << "\n    SAR = " << SAR; 
	    }
	  
	  if (0)
	  //if (T!=Tenv && (xx==(SizeX-1)/2 || xx==(SizeX-1)/2-18) && yy==(SizeY-1)/2 && zz==(SizeZ-1)/2)   
	  //if (T!=Tenv && xx<=(SizeX-1)/2 && yy==(SizeY-1)/2 && zz==(SizeZ-1)/2)  	  
	    { 	     	      
	      //cout << "\n\n T[" << xx << "][" << yy << "][" << zz << "] = Tbefore + (deltaT / (C*mp) ) * [ V * { gradients + hm + hEM + b*Cb*(Tb - Tbefore)} - hRAD - hCONV - hE) ]";	     	      
	      //cout << "\n "<< T <<" = " << Tbefore << " + " << deltaTH/(C*mp) << " * [ " << V << " * {" << gradients << " + " <<  hm << " + " << hEM << " +  " << b*Cb << " * ( " << Tb << " - " << Tbefore << " )} - " <<  hRAD << " - " << hCONV << " - " << hE << " ) ]";	  	  	     	      
	      //cout << "\n "<< T <<" = " << Tbefore << " + " << (deltaT / (C*mp) ) * V* gradients << " + " <<(deltaT / (C*mp) ) * V*hm << " + " << deltaTH/(C*mp)* V *hEM << " + " << (deltaT / (C*mp) ) *V * b*Cb*(Tb - Tbefore) << " - " << (deltaT / (C*mp) )* hRAD << " - " << (deltaT / (C*mp) )* hCONV << " - " << (deltaT / (C*mp) )* hE;
	      cout << "\n\n PONTO [" << xx << "][" << yy << "][" << zz << "]";
	      cout << "\n    CONTRIBUICAO ELETROMAG (hEM) = " << hEM << "[W] --> " << deltaTH/(C*mp)* V *hEM << "[oC]";		     	      
	      cout << "\n    SAR = " << SAR;
	    
	      //cout << "\n\n **********  TCenter[" << x << "][" << y << "][" << z << "] = " << T << "[oC]";
	      //cout << "\n  TanalyticCenter = " << TanalyCenter << "[oC]" << "      --------->    ERRO CENTER = " << erroC << " oC  = " << erropercC << " %";
	      //cout << "\n   TC = To(" << To<< ") + (Ti-To)(" << Ti-To << ") * C1("<<C1<<") * exp (-beta1^2 (" <<beta1*beta1<< ") * tstar(" << tstar <<")) = "<<TanalyCenter;
	      //erroC =  TanalyCenter - T;
	      //erropercC = 100*erroC/TanalyCenter;	      	      	      	      	          
	      //cout << "\n    H1 = - hRAD (" << hRAD << ") - hCONV (" << hCONV << ") - hEvap (" << hE << ") = " << H1; 	  	   
	      //cout << "\n    H2 =  hm (" << hm << ") + hEM (" << hEM << ")  = " << H2;	     		  
	      //cout << "\n\n POINT x = " << x << "  y = " << y << "  z = " << z; 
	      //cout << "\n T[" << x << "][" << y << "][" << z << "] =  " << T; 
	      //cout << "\n    Area Efetiva Conv = " << AeffCONV << "   Area Efetiva Rad = " << AeffRAD;
	      //cout << "\n    Tenv = " << Tenv << "    IrradSides = " << IrradSides; 	      	 
	      //cout << "\n " << Tanaly << " = " << "(" << 0.555 << ")*[ { " << 100 << "+" << 300 << "* exp( " << -170.69 << "*" << Ttime << " ) }" <<  -32 << "]";	      
	      
	      if (0)
		//if (gradB!=0)
		{
		  cout << "\n  gradB = gradBkx*gradBtx + gradBky*gradBty + gradBkz*gradBtz";	
		  cout << "\n  " << gradB << " = " <<  gradBkx << " * " << gradBtx << " + " << gradBky << " * " << gradBty << " + " <<  gradBkz << " * " << gradBtz;
		  cout << "\n  gradBtx = (Tn[x+1][y][z] - Tn[x-1][y][z])/DeltaX  para x = " << x << ", y = " << y << " e z = " << z;	  
		  cout << "\n  " << gradBtx << " = (" << Tminus[x+1][y][z] << " - " << Tminus[x-1][y][z] << ")/" << Dx;
		}	      	 
	    }      
	  //END OF PRINTING
	  
	  return (T);
	  
	}//FINISH GANDHI
  
      
      else if (TFormType == 'w')
	{ 	   		
	  //Copiar de WangFormulation.h!!	  
	  return(0);           
	  
	}//FINISH WANG      
      
      else
	{
	  cout << "\nThermal Formulation = (" << TFormType << ") not implemented!!!";
	  return (0);
	}
    }
        
} //Finish ThermalPoint(...)


float FDTDSimulator::GetThermalPoint(int i,int j,int k) 
{
  float ***value=ThermalNPlus->getDataPointer(); 
  return (value[i][j][k]);
}

float FDTDSimulator::GetThermalRisePoint(int i,int j,int k) 
{
  float ***value=TRise->getDataPointer(); 
  return (value[i][j][k]);
}

float FDTDSimulator::GetSARvalues(int i,int j,int k) 
{
  float ***value=SARvalues->getDataPointer();
  return (value[i][j][k]);
}
