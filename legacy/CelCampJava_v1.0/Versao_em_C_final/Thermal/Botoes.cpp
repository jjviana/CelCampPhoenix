#include "Botoes.h"
#include "CCcmdw.h"

void * Botoes(void * arg)
{
  CCCmdWindow * w = (CCCmdWindow *)arg;  

  pthread_join(w->pt1, NULL);

  w->SetValue(M_Save, 1, Sensitive);	
  w->SetValue(M_CloseFile, 1, Sensitive);
  w->SetValue(M_AddThermal, 1, Sensitive);
  w->SetValue(M_Calculate, 1, Sensitive);

  w->CDDialog->CloseDialog();

  return NULL;
}
