class vCalculateModalDialog::public vModalDialog
{
  void CalculateModal::DialogCommand(ItemVal id, ItemVal val, CmdType ctype)
    {
      //  Desabilita os outros comandos		
      SetValue(M_Open, 0, Sensitive);
      SetValue(M_New, 0, Sensitive);
      SetValue(M_CloseFile, 0, Sensitive);
      SetValue(M_AddThermal, 0, Sensitive);
      
      // Habilita Parar o Calculo
      SetValue(M_Calculate, 0, Sensitive);
      SetValue(M_StopCalculate, 1, Sensitive);
      
      /*  New Thread with CALCFIELDS.H  */		
      calcID = pthread_create(&pt1, NULL, &CalcFields, (void * )this);
      if (calcID)
	cout << "\n\n Thread Creation for CalcFields FAILED!!! \n";
      
      int calcID2 = pthread_create(&pt2, NULL, &Botoes, (void *)this);
      if (calcID2)
	cout << "\n\n Thread Creation for Botoes FAILED!!! \n";

      // Call the parent for default processing
      vModalDialog::DialogCommand(id,val,ctype);
      if (id == M_Yes || id == M_No) // These close, too.
	CloseDialog();
    }
}
