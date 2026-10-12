#ifndef VCALCULATEMODALDIALOG_H
#define VCALCULATEMODALDIALOG_H
using namespace std;
#include <v/vnotice.h>	// for vNoticeDialog
#include <v/vdialog.h>  // for vDialog
#include <v/v_defs.h>    // for vCommandObjects
#include <v/vcmdpane.h>  // for CommandPane
#include <v/vkeys.h>	// to map keys
#include <v/vfilesel.h> // for file select
#include <v/vcanvas.h>  // for canvas panels
#include <v/vcpdc.h>    // for drawing canvas
#include <v/vcolor.h>   // for vColors for drawings
#include "CCcmdw.h"
#include <pthread.h>
enum{ButBegin=101, ButEnd};

class CCCmdWindow;

class vCalculateModalDialog:public vModalDialog
{ 
 private:
  CCCmdWindow* W;  

 public:
  vCalculateModalDialog(CCCmdWindow* parent, char* title=" "):vModalDialog((vBaseWindow*)parent, title)
    {
      W = parent;
    }
  vCalculateModalDialog(vApp* parent, char* title=" "):vModalDialog(parent, title){}; 

  void DialogCommand(ItemVal id, ItemVal val, CmdType ctype)
    {             
      // Call the parent for default processing
      vModalDialog::DialogCommand(id,val,ctype);
      
      if (id == M_Yes || id == M_No) // These close, too.
	CloseDialog();
      
      if (id == ButBegin)
	{	  	  
	  W->SetCancelButton(0);
	  	  
	  //  New Thread with CALCFIELDS.H 	  	 	  
	  int cid1 = pthread_create(W->RetPt1(), NULL, &CalcFields, (void * )W);
	  if (cid1)
	    cout << "\n\n Thread Creation for CalcFields FAILED!!! \n";

	  int cid2 = pthread_create(W->RetPt2(), NULL, &Botoes, (void *)W);
	  if (cid2)
	    cout << "\n\n Thread Creation for Botoes FAILED!!! \n";	  	    
	}
      
      if (id == ButEnd)
	{               	  	    
	  W->SetCancelButton(1);
	  CloseDialog();	 
	  
	}
    }
};

#endif
