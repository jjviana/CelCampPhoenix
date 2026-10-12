//	CCdlg.h:	Header for CCDialog class
//=======================================================================

#ifndef CCDIALOG_H
#define CCDIALOG_H
#include <v/vdialog.h>

    class CCCmdWindow;

    class CCDialog : public vDialog
      {
      public:		//---------------------------------------- public
	CCDialog(vBaseWindow* bw, char* title = "CELCAMP");
	virtual ~CCDialog();		// Destructor
	virtual void DialogCommand(ItemVal,ItemVal,CmdType); // action selected
	void AddDefaultCmds();		// to add the defined commands

      protected:	//--------------------------------------- protected

      private:		//--------------------------------------- private

	CCCmdWindow* _myCmdWin;
      };
#endif
