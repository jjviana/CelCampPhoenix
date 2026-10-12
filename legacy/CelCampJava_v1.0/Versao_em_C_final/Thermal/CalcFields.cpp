#include "CalcFields.h"
#include "CCcmdw.h"

void * CalcFields(void * arg)
{

  CCCmdWindow * w = (CCCmdWindow *)arg;

  //Initiates the Calculation
  //-------------------------
  //The Day, Month and Year will be recieved from the system.
  time_t TodaySec;
  TodaySec=time(NULL);

  float t=0;
  for (int i=0; i<w->N; i++)
    {
  
      //CHECK OF THE "CANCEL BUTTON"
      if (w->CancelButton == 1)
	break;

      //CHECK OF THE STEADY CALCULATIONS
      if (w->TheSim->getSARsumOK()==1)
	{ 
	  cout << "\n\n SAR STEADY STATE CALCULATED!";
	  break;
	}

      //CHECK STEADY STATE
      if (w->TheSim->getSTEADYcheck() == 1)
	cout << "\nSTEADY STATE REACHED!!\n";

      //Atualiza a janela de dialogo com o N:
      int pulot = 1;
      char *texto;
      texto = new char[200];      
      sprintf(texto," N = %d", i);     
      w->CDDialog->SetString(TimeN, texto);
      w->CDDialog->DialogDisplayed();
      delete texto;                 

      w->TheSim->step(i, w->naoFioInf, w->interface);

      t+=w->DeltaT;
      if (i%w->reduzT==0)
	{
	  //GRAVA UM CORTE:
	  if (w->gravaFatia==1)
	    for(int f=0;f<w->numfatias;f++) {
	      //cout << "\nGRAVANDO O CORTE.";
	      w->recF1[f]->recordFields(w->TheSim,w->xs+f*w->espacamento, 1); //x
	      w->recF2[f]->recordFields(w->TheSim,w->ys+f*w->espacamento, 2); //y
	      w->recF3[f]->recordFields(w->TheSim,w->zs+f*w->espacamento, 3); //z
	    }
	  //else
	  //  cout << "\nNAO esta GRAVANDO O CORTE...";

	  //GRAVA 10 PONTOS PARA COMPARAR COM ANALITICA:
	  if (w->gravaPontos=1)
	    {
	      //cout << "\n****** NAO esta' GRAVANDO PONTOS. *****"
	      for(int i=0;i<w->numintpoints;i++)
		w->recP[i]->recordPoint(w->TheSim,((int)w->N/w->reduzT),w->xp[i],w->yp[i],w->zp[i],w->reduzT,w->wmode);
	    }
	  //else
	  //  cout << "\nNAO esta' GRAVANDO PONTOS...";

	  //GRAVA A SAR:
	  if (w->gravaSAR==1){
	    for(int f=0;f<w->numfatias;f++) 
	      {	
		w->recS1[f]->recordSAR(w->TheSim, w->xs, 1, w->MatMod);
		w->recS2[f]->recordSAR(w->TheSim, w->ys, 2, w->MatMod);	
		w->recS3[f]->recordSAR(w->TheSim, w->zs, 3, w->MatMod);
	      }
	     
	      }
	  else
	    cout << "\nNAO esta GRAVANDO SAR...";

	    
	  //GRAVA A TEMPERATURA:
	  if (w->gravaThermal==1)
	    {
	      //cout << "\nGRAVANDO THERMAL.";
	      w->recThermal->recordThermal(w->TheSim,w->zs, 3, w->MatMod, i);
	    }
	  if (w->gravaThermalRise==1)
	    {
	      //cout << "\nGRAVANDO THERMAL RISE."
	      w->recThermal->recordThermalRise(w->TheSim,w->zs, 3, w->MatMod, i);
	    }       	 

	}//ends the Recording

    }//ends the Time Steping

  if (w->CancelButton==0)
    {
      
      time_t LastSec;
      LastSec=time(NULL);
      
      double dia, hora, minuto, segundo;
      dia=0; hora=0; minuto=0;
      segundo=difftime(LastSec,TodaySec);
      while (segundo>=60)
	{
	  minuto++;
	  if (minuto==60)
	    {
	      hora++;
	      if (hora==24)
		{
		  dia++;
		  hora=0;
		}
	  minuto=0;
	    }
	  segundo=segundo-60;
	}
      
      cout << "\n********************************************************************************************";
      cout << "\nTIME ELAPSED: " << dia << " days, " << hora << " hours, " << minuto << " minutes and " << segundo << " seconds";
      cout << "\n********************************************************************************************\n\n\n";
      
      char ** textend;
      textend= new char*[2];
      textend[0]=new char[700];
      textend[1]=new char[700];
      
      w->CaseCalculated='y';
      sprintf(textend[0],"CASE CALCULATED!");
      sprintf(textend[1],"Time Elapsed: %.0f days, %.0f h %.0f ' %.0f ''.", dia, hora, minuto, segundo);
      w->CCCanvas->SetMultiMessage(textend, 2);
      w->CCCanvas->Redraw(0,0,0,0);
    }
  else
    {
      char** text;
      text = new char*[1];
      text[0]= new char[700];
      sprintf(text[0],"CALCULATION INTERRUPTED!"); 
      w->CCCanvas->SetMultiMessage(text, 1); 
      w->CCCanvas->Redraw(0,0,0,0);
    }

  return NULL;
}
