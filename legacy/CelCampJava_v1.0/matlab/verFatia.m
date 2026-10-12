%============================================================================
disp(' ')
disp('***********************************************************')
disp('*     This program was developed by Rodrigues, A.O.       *')
disp('*   Oriented by Ramirez. J. A. and Vasconcelos J. A.      *')
disp('* It can be used freely as long as the source is quoted.  *')
disp('*                     Jun/2001.                           *')
disp('***********************************************************')
disp(' ')

clear; 

narq=input('Qual o numero do arquivo ?');
arq=sprintf('%d.txt', narq);

s=fopen(arq, 'r');
frewind(s);  
line = fgets(s); 
line = fgets(s); 
line = fgets(s); 
line = fgets(s); 
line = fgets(s); 
line = fgets(s); 
line = fgets(s); 

TX=256;
TY=256;

for (i=1:TX),
   line=fgetl(s);
   a=str2num(line);
   for (j=1:TY),         
      FATIA(i,j)=a(j);      
   end
end

figure;
pcolor(rot90(rot90(FATIA))); shading flat;

%============================================================================
disp(' ')
disp('***************************************************************')
disp('*           Thank you for using this program.                 *')
disp('*                Last Update: 17/07/2001                      *')
disp('*                anaterrra@estrelar.net                       *')
disp('***************************************************************')
disp(' ')
%============================================================================

