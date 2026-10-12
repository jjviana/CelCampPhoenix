//	CCcnv.h:	Header for CCCanvasPane class
//=======================================================================

#ifndef CCCNV_H
#define CCCNV_H
#include <v/vcanvas.h>
#include "FDTDSimulator.h"

class CCCanvasPane : public vCanvasPane
{
 private:		//--------------------------------------- private
  FDTDSimulator * Case;
  int Mode;
  char * message;
  char ** MultiMessage;
  int lines;
  float minEx, maxEx, minEy, maxEy, minEz, maxEz, minHx, maxHx, minHy, maxHy,  minHz, maxHz; 

  int resizeX;
  int resizeY;

 public:		//---------------------------------------- public
  CCCanvasPane();
  virtual ~CCCanvasPane();
  
  // Scrolling
  virtual void HPage(int shown, int top);
  virtual void VPage(int shown, int top);
  
  virtual void HScroll(int step);
  virtual void VScroll(int step);
  
  // Events
  virtual void MouseDown(int x, int y, int button);
  virtual void MouseUp(int x, int y, int button);
  virtual void MouseMove(int x, int y, int button);
  
  virtual void Redraw(int x, int y, int width, int height);  
  virtual void Resize(int newW, int newH);
  void RedrawCont(int i);  
  void SetMessage(char * text);
  void SetMultiMessage(char ** text, int lines);

  inline void SetCase(FDTDSimulator * FC) {Case=FC;};
  inline FDTDSimulator* RetCase() {return Case;};
  inline void SetMode(int i) {Mode = i;};
  
  //Conection with Resize:
  //  inline void SetResizeX(int i) {resizeX = i;};
  //  inline void SetResizeY(int j) {resizeY = j;};
  void SetBasicResize();
  void ZoomIn(int factor);
  void ZoomOut(int factor);
  
  //Calculated the maximum and minimum fields
  void SetMaxMin2D();

  //Sets Modes TM or TE
  //inline int RetModeT(){return ModeT;};
  //inline void SetModeT(int i){ModeT=i;};
    
 protected:	//--------------------------------------- protected
  

};
#endif
