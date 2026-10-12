using namespace std;
#include <string>        // for string type
#include <time.h>        // to get the time from the system
#include <fstream>       // to treat files
#include <stdio.h>
#include <sys/stat.h>
#include <sys/types.h>

#include "FDTDSimulator.h"
#include "MaterialModel.h"
#include "Material.h"
#include "grid.h"
#include "Source.h"
#include "PointSource.h"
#include "DipoleSource.h"
#include "PlaneWaveSource.h"
#include "HagnessSource.h"
#include "ClassError.h"
#include "FileRecorder.h"

main(){ 

  //FILE HEAD:
  //==========
  cout << "\n********************************************************";
  cout << "\n*            THERMAL CALCULATIONS                      *";
  cout << "\n*            Rodrigues, A.O.                           *";  
  cout << "\n*            ana@logicstyle.com                        *";  
  cout << "\n*            2002                                      *";
  cout << "\n********************************************************";
  
  //3D DOMAIN:
  //==========
  cout << "\nBuilding the 3D Domain...";   
   
  cout << "\nDefining the properties...";
 
  //Grid Parameters
  float dx, dy, dz, DeltaT;
  dx=16.6666e-3/2; 	 dy=16.6666e-3/2;   dz=16.6666e-3/2; DeltaT=22.777e-12/2; 	    
  int tamX, tamY, tamZ;
  tamX=101;  tamY=31;  tamZ=51;
  if (tamX%2==0) tamX++;
  if (tamY%2==0) tamY++;
  if (tamZ%2==0) tamZ++;
  cout << "\nDomain Size: X="<< tamX << "  Y=" << tamY << "  Z=" << tamZ;  
 
  //Cube of Brain:
  //   this size of cube 6 x 6 x 6 was chosen because in the
  //   grid defined (dx=dy=dz=16.66e-3m), it defines 1g of tissue
  //   which is used in SAR calculations
  int SizeCubeX, SizeCubeY, SizeCubeZ; 
  int SizeC=12;
  SizeCubeX=SizeC;  SizeCubeY=SizeC;  SizeCubeZ=SizeC; 
  int CenterCubeX, CenterCubeY, CenterCubeZ;
  CenterCubeX=tamX/2;  CenterCubeY=tamY/2;  CenterCubeZ=tamZ/2;

  //Source Data:
  int SourceX, SourceY, SourceZ;
  SourceX=(int)(- 2 - SizeC/2 + tamX/2);  SourceY=(int)(tamY/2);  SourceZ=(int)(tamZ/2);
  if (SourceX%2==1) SourceX++;
  if (SourceY%2==1) SourceY++;
  if (SourceZ%2==1) SourceZ++;
  cout << "\nSource located at: X=" << SourceX << "  Y=" << SourceY << "  Z=" << SourceZ; 
  
  //Material Definitions:
  float ep0=Material::ep0;
  int materAir, materBrain;  
  materAir=0;  materBrain=3;
  int sizeMatModel=14; 
  int freq, escolha;
  float f;  freq =  1;	      
  switch (freq){
  case 0:     f=900e6;  escolha=1;      break;
  case 1:     f=1800e6; escolha=2;      break;
  case 2:     f=5000e6; escolha=2;      break;
  default:    f=900e6;  escolha=1;      break;
  }
  Material  *material=new Material[sizeMatModel];
  material[0].name="Air";   material[0].density=0;  material[0].ep=ep0;  material[0].si=0;
  material[1].name="Bone";  material[1].density=1810;  material[1].ep=ep0*(escolha==1?21:16.4);  material[1].si=(escolha==1?0.32:0.45);
  material[2].name="ERL";  material[2].density=1010;  material[2].ep=ep0*(escolha==1?78.1:77.3);  material[2].si=(escolha==1?2.12:2.55);
  material[3].name="Brain";  material[3].density=1040;  material[3].ep=ep0*(escolha==1?41:43.22);  material[3].si=(escolha==1?0.86:1.29);
  material[4].name="Skin";     material[4].density=1100;  material[4].ep=ep0*(escolha==1?40.71:37.21);  material[4].si=(escolha==1?0.65:1.25);
  material[5].name="Muscle";  material[5].density=1040;  material[5].ep=ep0*(escolha==1?55:49.41);  material[5].si=(escolha==1?0.94:1.64);  
  material[6].name="Fat";  material[6].density=920;  material[6].ep=ep0*(escolha==1?11.3:9.38);  material[6].si=(escolha==1?0.11:0.26);  
  material[7].name="Sclera";  material[7].density=1020;  material[7].ep=ep0*(escolha==1?54.9:52.56);  material[7].si=(escolha==1?1.17:1.73);
  material[8].name="Anterior Chamber";  material[8].density=1010;  material[8].ep=ep0*(escolha==1?67.9:67.15);   material[8].si=(escolha==1?1.68:2.14);
  material[9].name="Cristalin";   material[9].density=1100;   material[9].ep=ep0*(escolha==1?51.3:42.02);   material[9].si=(escolha==1?0.89:1.15);
  material[10].name="Vitreous Body";   material[10].density=1030;   material[10].ep=ep0*(escolha==1?67.9:73.9);   material[10].si=(escolha==1?1.68:2.21);
  material[11].name="Cornea";   material[11].density=1170;  material[11].ep=ep0*(escolha==1?52.1:73.9);  material[11].si=(escolha==1?1.22:2.21);
  material[12].name="Coper";  material[12].density=8960;   material[12].ep=ep0;   material[12].si=1e7;
  material[13].name="Blood";  material[12].density=1000;   material[12].ep=ep0;   material[12].si=1e7;

  //Thermal Parameters:
  material[0].Cm=0.28 ;  material[0].k=0.0263 ; material[0].bf=0 ;     material[0].hm=0;
  material[1].Cm=0.4 ;   material[1].k=0.36 ;   material[1].bf=55.8 ;  material[1].hm=0.15;
  material[2].Cm=1.056 ; material[2].k=0.57 ;   material[2].bf=0 ;     material[2].hm=0;
  material[3].Cm=1.02 ;  material[3].k=0.528 ;  material[3].bf=32760 ; material[3].hm=9.7;
  material[4].Cm=1.05 ;  material[4].k=0.334 ;  material[4].bf=33600 ; material[4].hm=1.07;
  material[5].Cm=1.014 ; material[5].k=0.5 ;    material[5].bf=1296 ;  material[5].hm=0.67;
  material[6].Cm=0.663 ; material[6].k=0.217 ;  material[6].bf=324 ;   material[6].hm=0.15;
  material[7].Cm=1.167 ; material[7].k=0.5 ;    material[7].bf=0 ;     material[7].hm=0.34;
  material[8].Cm=1.110 ; material[8].k=0.58 ;   material[8].bf=0 ;     material[8].hm=0.34;
  material[9].Cm=0.833 ; material[9].k=0.40 ;   material[9].bf=0 ;     material[9].hm=0;
  material[10].Cm=1.1606 ; material[10].k=0.603 ;  material[10].bf=0 ; material[10].hm=0 ;
  material[11].Cm=1.1606 ; material[11].k=0.58 ;   material[11].bf=0 ; material[11].hm=0 ;
  material[12].Cm=0.28 ;   material[12].k=0.0263 ; material[12].bf=0 ; material[12].hm=0.34 ;
  material[13].Cm=1.06 ;   material[13].k=0.51 ;   material[13].bf=0 ; material[13].hm=0 ;

  //TEMPERATURE INITIAL OF THE TISSUES:
  float Tinit=36.8;

  cout << "\nConstructing the mesh...";
  MaterialModel MatMod(tamX, tamY, tamZ, dx, dy, dz, material, sizeMatModel);
  grid<int> &matmesh=MatMod.getMesh();
        
  cout << "\nPutting materials inside the mesh...";
  for (int k=0; k<tamZ; k++)
    for(int j=0;j<tamY;j++) 	      
      for(int i=0;i<tamX;i++) 
	{			  	 
	  if (i>=(CenterCubeX-SizeCubeX/2) && i<=(CenterCubeX+SizeCubeX/2))
	    if(j>=(CenterCubeY-SizeCubeY/2) && j<=(CenterCubeY+SizeCubeY/2))
	      if(k>=(CenterCubeZ-SizeCubeZ/2) && k<=(CenterCubeZ+SizeCubeZ/2))
		{
		  matmesh.setData(i,j,k,materBrain); //Brain
		  //matmesh.setData(i,j,k,0); //air
		}
	      else
		{
		  matmesh.setData(i,j,k,materAir); //Air	    	  	   
		  //matmesh.setData(i,j,k,0); //Air
		}
	
	}

  //Creates the Main Object to Calculate:
  //-------------------------------------
  cout << "\nCreating the Main Object to Calculate...";
  FDTDSimulator* TheSim;
  FDTDSimulator::WorkingMode wmode;
  wmode=FDTDSimulator::MODE_3D;  
  TheSim = new FDTDSimulator(&MatMod, DeltaT,wmode, f, Tinit);

  cout << "\nSetting the source...";  
  int xs, ys, zs;
  xs = SourceX;	   ys = SourceY;	     zs = SourceZ;
  if (xs%2==1) xs++;    	  if (ys%2==1) ys++;  		  if (zs%2==1) zs++;   
  cout << "\nMODE 3D : Fonte localizada sobre Ez = ("<< xs <<"=par, " << ys << "=par, " << zs << "=par).";	  
  float current;
  cout << "\nEnter the Current Value = ";
  cin >> current;
  //current=0.3;
  
  //Includes
  int naoFioInf, fontType, Htype, ReductionDipole, tHS;
  //Fio Infinito (1), Fonte Puntual (2) , Dipolo (3), Hagness Original(4), Hagness Step (5), 
  //  Hagness Cossinoidal (6) or Plane Wave (7)
  fontType=3;
  char *tipo;
  switch (fontType)
    {
    case 1: tipo="Infinite line"; break;
    case 2: tipo="Puntual"      ; break;
    case 3: tipo="Dipole"       ; break;
    case 4: tipo="Hagness Orig" ; break; 
    case 5: tipo="Hagness Step" ; break;
    case 6: tipo="Hagness Cos"  ; break; 
    case 7: tipo="Plane Wave"   ; break; 
    }
  cout << "\nSource Type (" << fontType << ") = " << tipo;
  //Hard (0) or Soft (1) Source
  tHS = 1;
  if (tHS==0) tipo="Hard";
  else        tipo="Soft";
  cout << "\nType Hard or Soft (" << tHS << ") = " << tipo;
  
  if (fontType==1)
    {
      //Fonte em todos as fatias:
      PointSource **PS;		 
      PS = new PointSource*[tamZ];		  
      for (int i=1; i<tamZ-1; i++)  {
	if (i%2==0) PS[i] = new PointSource(xs, ys,i, current, f, tHS);	//Entra com a fonte em E	  
	else PS[i] = new PointSource(xs, ys, i, 0, f, tHS);	//Entra com a fonte em H
	TheSim->addSource(PS[i]);
      }
      naoFioInf=0;
    }	      
  else if (fontType==2)
    {
      //Fonte puntual:
      PointSource *PS=new PointSource(xs, ys, zs, current, f, tHS);  TheSim->addSource(PS);   
      naoFioInf=1;
    }	      
  else if (fontType==3)
    {
      //Dipolo:
      //TAMANHO DO DIPOLO:
      int DiSi=1;
      if (DiSi==0){	ReductionDipole=1; cout <<"\n1 Wavelenght Dipole!!";   }
      if (DiSi==1){	ReductionDipole=2; cout << "\n1/2 Wavelenght Dipole!!"; }
      if (DiSi==2){	ReductionDipole=4; cout << "\n1/4 Wavelenght Dipole!!"; }
      if (DiSi==3){	ReductionDipole=8; cout << "\n1/8 Wavelenght Dipole!!"; }
      
      cout << "\nSource in Ex, Ey and Ez!! Zero for Hx, Hy and Hz in the cube!!";	
      
      DipoleSource *DS=new DipoleSource(xs, ys, zs, current, f, ReductionDipole, tHS);
      DS->initialize(dz);
      if (DS->getNL() >= tamZ)
	cout << "\nDominio menor do que o tamanho do dipolo!! Nao ha fonte!!";
      else
	{
	  TheSim->addSource(DS);
	  // cout << "\nAdicionou uma fonte de dipolo (dentro do ComandWin)";
	}
      naoFioInf=1;
    }
  else if(fontType==4 || fontType==5 || fontType==6)
    {
      //HAGNESS SOURCE: Original (1), Step (2) or Cossenoidal (3)
      if (fontType==4) Htype=1;
      if (fontType==5) Htype=2;
      if (fontType==6) Htype=3;
      
      HagnessSource *hs=new HagnessSource(xs,ys,zs,f,DeltaT,dx,dy,Htype, tHS);
      TheSim->addSource(hs);
      naoFioInf=1;
    }	      
  else if (fontType==7 || fontType==8 || fontType==9 ) //Plane Wave in x, y or z directions
    {
      char c;
      if (fontType==7)   c='x';
      if (fontType==8)   c='y';
      if (fontType==9)   c='z';		 
      PlaneWaveSource * PWS = new PlaneWaveSource(xs, ys, zs, current, f, tHS, c);	//Entra com a fonte em Hz
      TheSim->addSource(PWS);		
      cout << "\nThe Source is a Plane Wave Source in the " << c << " direction...";
      naoFioInf=1;
    }	  	      
 
  cout << "\nTime Instants and Reduction in Time...";
  int N, reduzT;   
  cout << "\nTIME INSTANTS = ";
  cin >> N;
  //N = 300;
  reduzT = 1;
  cout << "\nN = " << N << "     reduzT = " << reduzT;

  cout << "\nCreating the files do record results...";
  char interface;  
  interface='y';    
  int gravaFatia;
  gravaFatia='n';
  int fatia=SourceZ;
  int coordenada=3;
  char dirname[64];
  string filename="HEAT";
  FileRecorder recThermal(filename);
  FileRecorder recmat(filename);
  FileRecorder recmodel(filename);
  FileRecorder recSar(filename);
  FileRecorder recFatia(filename);

  sprintf(dirname, "fatia%d%c", fatia, 'z');
  mkdir(dirname,00777);
  recmat.recordMaterial(fatia,coordenada,MatMod);
  recmodel.recordModel(fatia,coordenada,MatMod);
  
  cout << "\n\nInitiates the Calculation:";
  float t=0;	      	      
  for (int i=0; i<N; i++)
    {      
      cout << "\nTime step = " << i;
      try
	{
	  TheSim->step(i, naoFioInf, interface);
	}
      catch(ClassError E1)
	{
	  cout << "ERROR!!";
	}
	    
      
      t+=DeltaT;            
     

      if (i%reduzT==0)
	{	  	  	 
	  //RECORD THE TEMPERATURE RISE in the source:	
	  //cout << "\nRecording Temperature Rise...";
	  recThermal.recordThermal(TheSim, fatia, coordenada, MatMod, i);
	  recSar.recordSAR(TheSim, fatia, coordenada, MatMod);
	  recFatia.recordFields(TheSim, fatia, 3);
	}
      
    }		   
  cout << "\n**********";
  cout << "\n*  END   *";
  cout << "\n**********\n\n";
}
