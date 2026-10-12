/*
  //TO BE COPIED IN FDTDSimulator.cpp:
  //==================================

//Calculates the thermal difusion equation from:
// Wang, J. "FDTD Computation of Temperature Rise in the Human Head for Portable Phones",
// IEEE Trans. on Microwave Theory and Techniques, vol.47, no.8, 1999
//
//   den(m).C(m).dT/dt = k.grad(T) + den(m).SAR - b.(T-Tb)
//
//   T|n+1 = T|n +  [ deltaT * SAR / Cp ] - [ deltaT * b * ( T|n - Tb ) ] / [ den * Cp ] +
//           [ deltaT * k / ( den*Cp ) ] * [ (T|n,i+1 - 2*T|n,i + T|n,i-1) / Dx^2 +  (T|n,j+1 - 2*T|n,j + T|n,j-1) / Dy^2 + (T|n,k+1 - 2*T|n,k + T|n,k-1) / Dz^2 ]
//

//Tissue Parameters:
double Cp, b,  k;      	  	     	 
int mattype;
if (mat.name=="Air") mattype=0 ;      
else 
if (mat.name=="Bone") mattype=1 ;
else 
if (mat.name=="ERL") mattype=2 ; 
else   
if (mat.name=="Brain") mattype=3 ;
else 
if (mat.name=="Skin") mattype=4 ;
else  
if (mat.name=="Muscle") mattype=5 ;
else
if (mat.name=="Fat") mattype=6 ;
else
if (mat.name=="Sclera") mattype=7 ;
else		      
if (mat.name=="Anterior Chamber") mattype=8 ;
else 
if (mat.name=="Cristalin") mattype=9 ;
else
if (mat.name=="Vitreous Body") mattype=10 ;
else
if (mat.name=="Cornea") mattype=11 ;
else			      
if (mat.name=="Coper") mattype=12 ;
else
if (mat.name=="Blood") mattype=13 ;
else
if (mat.name=="Brick") mattype=14;
else
if (mat.name=="Insulator") mattype=15;
else				      
if (mat.name=="Aluminium") mattype=16;
else
cout << "\n\n PROBLEMS!! Unidentified Material!!";      

//UNITS:
// Cp[J/(kg.oC)]; b[J/(s.m3.oC); k[J/(s.m.oC)]
switch (mattype)
{
 case 0: //AIR	      
   Cp=0;	      b=0;	      k=0;	      break;
 case 1: //BONE	      
   Cp=1300;	      b=1401;	      k=0.3;	      break;
 case 2: //ERL
   Cp=3500;	      b=37822;	      k=0.60;	      break;
 case 3: //BRAIN
   Cp=3500; 	      b=37822;	      k=0.57;	      break;
 case 4: //SKIN
   Cp=3500;	      b=8652;	      k=0.50;	      break;
 case 5: //MUSCLE
   Cp=3500;	      b=3488;	      k=0.60;	      break;
 case 6: //FAT
   Cp=2300;	      b=816;	      k=0.22;	      break;
 case 7: //SCLERA
   Cp=3900;	      b=0;	      k=0.5;	      break;
 case 8: //ANTERIOR CHAMBER
   Cp=3900;	      b=0;	      k=0.5;	      break;	      
 case 9: //CRISTALIN
   Cp=3900;	      b=0;	      k=0.5;	      break;
 case 10: //VITREOUS BODY
   Cp=3900;	      b=0;	      k=0.5;	      break;
 case 11: //CORNEA
   Cp=3900;	      b=0;	      k=0.5;	      break;
 case 12: //COPER
   Cp=0;	      b=0;	      k=400;	      break;
 case 13: //BLOOD
   Cp=0;	      b=0;	      k=0;	      break;	      
 case 14: //BRICK	    
   Cp=0.3;	      b=0;	      k=1;            break;
 case 15: //INSULATOR
   Cp=0;	      b=0;	      k=0;            break; 
 case 16: //Aluminium
   Cp=870.27;  b=0;            k=209.28;       break;
   
 default: //AIR
   Cp=0;	      b=0;	      k=0;	      break;
}

// if (Cp!=0) cout << "\nCp depois do switch em [" << x << "][" << y << "][" << z << "] = " << Cp;

//General Parameters:
double V, Tair,  Tb, alfa, beta, teta, tetax, tetay, tetaz;	 
V=Dx*Dy*Dz; //[m3]

//Tair=27; //Air Temperature [oC] = Environment Temperature
Tair=Tenv;
float h = 10; //[W/m2.oC]

Tb=36.8; //Blood Temperature [oC]      	  	 	  
	  
//SAR precisa ser dada em termos de metro cubico, por isto e' dividida pelo Volume da celula:
if (mat.density == 0 )  
{	    SAR=0; 	    alfa = 0; 	    beta = 0; 	    teta=0;	  }
else  
{	   
  if (mat.name!="Air" && x%2==0 && y%2==0 && z%2==0) //in Ez
    SAR=(1/V)*(mat.si*sqrt(pow(FNP[x][y][z],2)+pow(FNP[x+1][y][z+1],2)+pow(FNP[x][y+1][z+1],2))/(2*mat.density));                    	    	    
  else
    SAR=0;
  if (Cp == 0) { alfa = 0; beta = 0; teta=0; }
  else         	      
    {
      //cout << "\nEntrou em Cp!=0...";
      alfa = deltaT * SAR / Cp;
      beta = - ( deltaT * ( b * ( Tn[x][y][z] - Tb ) ) ) / ( mat.density * Cp );
      if (matPlusX.name=="Insulator" || matMinusX.name=="Insulator")  tetax = 0;
      else                             		  tetax= (Tn[x+2][y][z] - 2*Tn[x][y][z] + Tn[x-2][y][z]) / pow(Dx,2);
      if (matPlusY.name=="Insulator" || matMinusY.name=="Insulator")  tetay = 0;
      else		                                  tetay = (Tn[x][y+2][z] - 2*Tn[x][y][z] + Tn[x][y-2][z]) / pow(Dy,2);
      if (matPlusZ.name=="Insulator" || matMinusZ.name=="Insulator")  tetaz = 0;
      else                                              tetaz = (Tn[x][y][z+2] - 2*Tn[x][y][z] + Tn[x][y][z-2]) / pow(Dz,2);
      
      teta = (deltaT * k / ( mat.density*Cp )) * (tetax + tetay + tetaz );			       		
      //cout << "\nTemp var at [" << x << "][" << y << "][" << z << "] : X = " << tetax << " + Y = " << tetay << " + Z = " << tetaz << " = " << tetax+tetay+tetaz;
    }
}

if (NoTBound!=0)
{	   		
  for (int bi=0; bi<NoTBound; bi++)	    				  
    {
      int compara;
      if (TBcoord[bi] =='x')	 compara = x;
      if (TBcoord[bi] =='y')	 compara = y;
      if (TBcoord[bi] =='z')	 compara = z;
      
      if (compara==TBpoint[bi] && mat.name!="Air")
	{		    
	  //cout << "\nBoundary = " << TBvalue[bi] << " in [" << x << "][" << y << "][" << z << "].";
	  T=TBvalue[bi];
	  TR[x][y][z]=0;			
	  break;
	}
      if (matPlusX.density!=0 && matMinusX.density!=0 && matPlusY.density!=0 && matMinusY.density!=0 && matPlusZ.density!=0 && matMinusZ.density!=0)
	{
	  T = Tn[x][y][z] + alfa + beta + teta;  //Absolute temperature in the point
	  TR[x][y][z] = Tn[x][y][z] + alfa + beta + teta - 36.8000000000000000000; //Rise in the temperature 		   
	}
      else //Boundary conditions
	{
	  float TxP=0, TxM=0, TyP=0, TyM=0, TzP=0, TzM=0;
	  int NumMedia=0;
	  if (matPlusX.density==0)		      {TxP = (k * Tn[x-1][y][z] + Tenv * h * Dx)/(k + h * Dx); NumMedia++;}
	  if (matMinusX.density==0)		      {TxM = (k * Tn[x+1][y][z] + Tenv * h * Dx)/(k + h * Dx); NumMedia++;}
	  if (matPlusY.density==0)		      {TyP = (k * Tn[x][y-1][z] + Tenv * h * Dy)/(k + h * Dy); NumMedia++;}
	  if (matMinusY.density==0)		      {TyM = (k * Tn[x][y+1][z] + Tenv * h * Dy)/(k + h * Dy); NumMedia++;}
	  if (matPlusZ.density==0)		      {TzP = (k * Tn[x][y][z-1] + Tenv * h * Dz)/(k + h * Dz); NumMedia++;}
	  if (matMinusZ.density==0)		      {TzM = (k * Tn[x][y][z+1] + Tenv * h * Dz)/(k + h * Dz); NumMedia++;}
	  
	  T = TxP+TxM+TyP+TyM+TzP+TzM/NumMedia;
	  TR[x][y][z] = Tn[x][y][z] + alfa + beta + teta - 36.8000000000000000000; //Rise in the temperature 	
	}
    }
}
else
{
  T=Tn[x][y][z] + alfa + beta + teta;  //Absolute temperature in the point
  TR[x][y][z] = Tn[x][y][z] + alfa + beta + teta - 36.8000000000000000000; //Rise in the temperature
}

//PRINTING
if (x<=50 && y==50 && z==50)
{ 
  cout << "\n\nTEMPERATURA EM [" << x << "][" << y << "][" << z << "]  =  Tn[x][y][z] + deltaT*SAR/Cp + Blood&Metab + Conduction"; 	  
  cout << "\nT anterior = " << Tn[x][y][z];
  cout << "\n(DeltaT/Cp)*(1/V)*SAR = " << (deltaT/Cp) * (1/V) * SAR << " = (" << deltaT << " / " << Cp << ") * ( " << 1/V << ") * (" <<  mat.si << " * sqrt (pow( " << FNP[x][y][z] << " ,2 ) + pow( " << FNP[x+1][y][z+1] << " ,2 ) + pow( " << FNP[x][y+1][z+1] << ",2 ) ) / ( 2 * " << mat.density << ")) ";  
  //cout << "\nBlood&Met =  - ( deltaT * ( b * ( Tn[x][y][z] - Tb )  ) ) / ( mat.density * Cp ) = "<< beta <<" = - (" <<  deltaT << " * (" <<  b << " * (" <<  Tn[x][y][z] << " - " <<  Tb<< " ) ) ) / ( " << mat.density  << " * " <<  Cp << " )";
  cout << "\nConduction = (deltaT * k / ( mat.density*Cp )) * {[(T|x+2-2T+T|x-2)/Dx] + [(T|y+2-2T+T|y-2)/Dy] + [(T|z+2-2T+T|z-2)/Dz]}";  
  cout << "\n       " << teta << " = " << (deltaT * k / ( mat.density*Cp )) << " * {[( "<< Tn[x+2][y][z] << " - " << 2*Tn[x][y][z] << " + " << Tn[x-2][y][z] << ")/Dx^2 ] + [(" << Tn[x][y+2][z] << " - " << 2*Tn[x][y][z] << " + " << Tn[x][y-2][z] << ")/Dy^2 ] + [(" << Tn[x][y][z+2] << " - " <<  2*Tn[x][y][z] << " + " <<  Tn[x][y][z-2] << ")/Dz^2]} ";	
  cout << "\nTemp = EM [" << x << "][" << y << "][" << z << "]  = " << T << " = " << Tn[x][y][z] << " + " << alfa << " + " << beta << " + " << teta;
  //cout << "\nAUMENTO NA TEMPERATURA [em oC] EM [" << x << "][" << y << "][" << z << "] = " << TR[x][y][z];
  //cout << "\nTemp = EM [" << x << "][" << y << "][" << z << "]  = " << T;
  
} //FINISH PRINTING

return((float)T);     


*/
