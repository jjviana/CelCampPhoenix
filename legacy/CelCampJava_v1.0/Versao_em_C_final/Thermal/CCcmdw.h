//	CCcmdw.h:	Header for CCcmdw class
//=======================================================================

#ifndef CCCMDW_H
#define CCCMDW_H
using namespace std;
#include <v/vcmdwin.h>	// So we can use vCmdWindow
#include <v/vmenu.h>	// For the menu pane
#include <v/vutil.h>	// For V Utilities
#include <v/vcmdpane.h> // command pane
#include <v/vstatusp.h>	// For the status pane
#include <string>

#ifdef vDEBUG
#include <v/vdebug.h>
#endif

#include "CCcnv.h"	// CCCanvasPane
#include "CCdlg.h"	// CCDialog
#include "FDTDSimulator.h" //FDTDSimulator
#include "FileRecorder.h" //FileRecorder
//#include "vCalculateModalDialog.h"

class vCalculateModalDialog;
enum { titleCD = 80, TimeN};	 

//Start defines for the main window with 100
//@V@:BeginIDs
enum {
  m_FirstCmd = 100, // Dummy Command
  m_TestDialog,	// TestDialog menu
  m_Dialog,	// TestDialog menu
  btnTestTool,	// Tool Bar test
  lblTestStat,	// Status Bar test
  H_New,          // New Help 
  H_AddThermal,   // Thermal Boundaries Help
  H_Calculate,    // Calculate Help
  H_Open,          // Open Help
  H_Save,         // Save Help
  H_SaveAs,       // SaveAs Help
  H_CloseFile,    // CloseFile Help
  H_About,         // About CelCamp
  M_AddThermal,    // Thermal Boundaries
  M_Calculate,     // Calculate the Fields 
  M_ViewNet,      //View the Net Model
  M_ViewResults,   //View the Calculated Results
  M_ZoomIn,         //Zoom In the results or the Net in 2x
  M_ZoomOut,        //Zoom Out the results or the Net in 2x
  H_ViewNet,       //View Net Help
  H_ViewResults,  //View Results Help
  H_ZoomIn,          //Zoom In Help
  H_ZoomOUt,         //Zoom Out Help
  blkLast		// Last item
  };
//@V@:EndIDs

//@V@:BeginPulldownMenu MainMenu
static vMenu MainMenu[] =
  {
    {"&New Case", M_New, isSens, notChk, noKeyLbl, noKey, noSub},
    {"A&dd Thermal", M_AddThermal, isSens, notChk, noKeyLbl, noKey, noSub},
    {"Calcula&te", M_Calculate, isSens, notChk, noKeyLbl, noKey, noSub},    
    {"&Open Case", M_Open, isSens, notChk, noKeyLbl, noKey, noSub},
    {"&Save Case", M_Save, isSens, notChk, noKeyLbl, noKey, noSub},
    {"Save Case &as...", M_SaveAs, isSens, notChk, noKeyLbl, noKey, noSub},
    {"&Close Case", M_CloseFile, isSens, notChk, noKeyLbl, noKey, noSub},
    {"View &Net", M_ViewNet, isSens, notChk, noKeyLbl, noKey, noSub}, 
    {"View &Results", M_ViewResults, isSens, notChk, noKeyLbl, noKey, noSub}, 
    {"Zoom &In", M_ZoomIn, isSens, notChk, noKeyLbl, noKey, noSub}, 
    {"Zoom Ou&t", M_ZoomOut, isSens, notChk, noKeyLbl, noKey, noSub}, 
    {"-", M_Line, notSens, notChk, noKeyLbl, noKey, noSub},
    {"E&xit", M_Exit, isSens, notChk, noKeyLbl, noKey, noSub},
    {NULL}
  };
//@V@:EndPulldownMenu

//@V@:BeginPulldownMenu Help
static vMenu Help[] =
  {
    {"&New Case", H_New, isSens, notChk, noKeyLbl, noKey, noSub},
    {"A&dd Thermal", H_AddThermal, isSens, notChk, noKeyLbl, noKey, noSub},
    {"Calcula&te", H_Calculate, isSens, notChk, noKeyLbl, noKey, noSub},   
    {"&Open Case", H_Open, isSens, notChk, noKeyLbl, noKey, noSub},
    {"&Save Case", H_Save, isSens, notChk, noKeyLbl, noKey, noSub},
    {"Save Case &as...", H_SaveAs, isSens, notChk, noKeyLbl, noKey, noSub},
    {"&Close Case", H_CloseFile, isSens, notChk, noKeyLbl, noKey, noSub},
    {"View &Net", H_ViewNet, isSens, notChk, noKeyLbl, noKey, noSub},
    {"View &Results ", H_ViewResults, isSens, notChk, noKeyLbl, noKey, noSub},
    {"-", M_Line, notSens, notChk, noKeyLbl, noKey, noSub},
    {"Abou&t", H_About, isSens, notChk, noKeyLbl, noKey, noSub},
    {NULL}
  };
//@V@:EndPulldownMenu

//@V@:BeginMenu StandardMenu
static vMenu StandardMenu[] =
  {
    {"&Main Menu", M_File, isSens, notUsed, notUsed, noKey, &MainMenu[0]},
    {"&Help", M_File, isSens, notUsed, notUsed, noKey, &Help[0]},
    {NULL}
  };
//@V@:EndMenu

//@V@:BeginCmdPane ToolBar
static CommandObject ToolBar[] =
  {
    {C_Button,M_New,0,"New",NoList,CA_None,isSens,NoFrame,0,0},
    {C_Button,M_AddThermal,0,"AddThermal",NoList,CA_None,isSens,NoFrame,0,0},
    {C_Button,M_Calculate,0,"Calculate",NoList,CA_None,isSens,NoFrame,0,0},   
    {C_Button,M_Open,0,"Open",NoList,CA_None,isSens,NoFrame,0,0},
    {C_Button,M_Save,0,"Save",NoList,CA_None,isSens,NoFrame,0,0},
    {C_Button,M_CloseFile,0,"Close",NoList,CA_None,isSens,NoFrame,0,0},
    {C_Button,M_ViewNet,0,"View Net",NoList,CA_None,isSens,NoFrame,0,0},
    {C_Button,M_ViewResults,0,"View Results",NoList,CA_None,isSens,NoFrame,0,0},
    {C_Button,M_ZoomIn,0,"ZoomIn",NoList,CA_None,isSens,NoFrame,0,0},
    {C_Button,M_ZoomOut,0,"ZoomOut",NoList,CA_None,isSens,NoFrame,0,0},
    {C_EndOfList,0,0,0,0,CA_None,0,0,0}
  };
//@V@:EndCmdPane

//@V@:BeginStatPane StatBar
static vStatus StatBar[] =
  {
    {"CELCAMP", lblTestStat, CA_NoBorder, isSens, 0},
    {0,0,0,0,0}
  };
//@V@:EndStatPane


/**     
	CLASS CCCmdWindows   
**/

class CCCmdWindow : public vCmdWindow
{
  friend int AppMain(int, char**);	// allow AppMain access
  friend void* CalcFields(void *arg);
  friend void* Botoes(void *arg);  
  
 public:		//---------------------------------------- public
  CCCmdWindow(char*, int, int);
  virtual ~CCCmdWindow();
  virtual void WindowCommand(ItemVal id, ItemVal val, CmdType cType);
  virtual void KeyIn(vKey keysym, unsigned int shift);

  
 protected:	//--------------------------------------- protected       
  
  //Global Variables:    
  //-----------------
  //Case:
	string CaseName;
	FDTDSimulator* TheSim;
	FDTDSimulator::WorkingMode wmode;
	float DeltaT, dx, dy, dz;
	float f; int escolha;
	char interface;    
	char CaseCreated;
	char CaseCalculated;

	//Model:
	MaterialModel * MatMod;
	
	//Source:
	int xs, ys, zs;
	int naoFioInf;
	int N, reduzT;
	
	//Recording: 
	FileRecorder ** recF1, ** recF2, **recF3;
	FileRecorder ** recS1, ** recS2, **recS3;   
	FileRecorder ** recP;
	FileRecorder *recThermal, *recE;
	FileRecorder *recmat;
	FileRecorder *recmodel;
	FileRecorder *recSAR;
	FileRecorder *recFatia;       
	int gravaPontos, gravaFatia, gravaSAR, records;	 //0 = Yes, 1 = No     
	int gravaThermal, gravaThermalRise, gravaMat, gravaModel, gravaFat;	 //0 = Yes, 1 = No     
	int fatia, numfatias, coordenada, espacamento;
	int xp[50], yp[50], zp[50];    
	int numintpoints;  

	//New Thread for calculations 
	pthread_t pt1, pt2;		
	vModalDialog* CDDialog; // create dialog instance	
	int CancelButton;	

 public:
	inline pthread_t* RetPt1(){return &pt1;};
	inline pthread_t* RetPt2(){return &pt2;};
	inline void SetCancelButton(int cb){CancelButton = cb;};
	inline int RetCancelButton(){return CancelButton;};
	
      private:		//--------------------------------------- private
	
	// Standard elements
	vMenuPane* CCMenu;		// For the menu bar
	CCCanvasPane* CCCanvas;		// For the canvas
	vCommandPane* CCCmdPane;	// for the command pane
	vStatusPane* CCStatus;		// For the status bar

	// Dialogs associated with CmdWindow

	CCDialog* CCDlg;

	//Creates the Case object that will be used through all the program
	//	FCase* NewFCase;
      };
#endif

 
