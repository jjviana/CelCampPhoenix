%============================================================================
disp(' ')
disp('***********************************************************')
disp('*     This program was developed by Rodrigues, A.O.       *')
disp('*   Oriented by Ramirez. J. A. and Vasconcelos J. A.      *')
disp('* It can be used freely as long as the source is quoted.  *')
disp('*                     Jun/2001.                           *')
disp('***********************************************************')
disp(' ')
clear; tic

fatia=input('Numero da fatia:');
coordenada=input('Coordenada de corte(x,y ou z):');

cd(sprintf('fatia%d%s',fatia,coordenada));

logar=input('Logaritmo (1) ou Módulo (2) ? ');
preset=input('Deseja valores pre-definidos (1) ou nao (2)? ');


N=input ('Quantos arquivos serão lidos? ');

reduzN=input('Qual a reducao ? ');

arq=strcat('SAR0.txt');
s=fopen(arq, 'r');
frewind(s);  
line = fgets(s);  TamX = str2num(line);
line = fgets(s);  TamY = str2num(line);
TX=(TamX+1)/2; TY=(TamY+1)/2;
fclose(s);

SAR=zeros(TX,TY);

%Incializando o filme:
%---------------------
figure;
pcolor(rot90(rot90(SAR)));            shading flat;
axis([1 TX 1 TY]);  
colorbar;    axis image;      axis off;
title(['SAR at time step = 0']);
M=moviein(N,gcf);
M(:,1)=getframe(gcf);       

%COMECA A PLOTAR:
%================
n=1;
countDATA=0;
for (in=1:reduzN:N-1)
   in
	arq=sprintf('SAR%d.txt',in);
	s=fopen(arq, 'r');
	frewind(s);  
   line = fgets(s); %joga fora o tamX
   line = fgets(s); %joga fora o tamY
   sari=1; sarj=1;
   indice=0;
   for (i=1:TX),
      for (j=1:TY),         
         line=fgets(s);
         SAR(sari,sarj)=str2num(line);      
         if logar==1
            if (SAR(sari,sarj)~=0),  SAR(sari,sarj)=log10(abs(SAR(sari,sarj))); 
            else SAR(sari,sarj)=-20;    
            end                
         end
         line=fgets(s);
         Material(sari,sarj)=str2num(line)+1;
         sarj=sarj+1;
      end %termina o loop em y
      sarj=1; 
      sari=sari+1;      
   end %termina o loop em x
   sari=1;
   timestep=int2str(n);
   n=n+1;
   if logar==1
     setting=-20;
     SAR(:,TY+1)=setting;  SAR(TX+1,:)=setting;
   else
     SAR(:,TY+1)=0; SAR(TX+1,:)=0;
   end
        
   pcolor(rot90(SAR));           shading flat; 
   if (preset==1)    
      if (logar==1),   caxis([-9, 4]);   end
      if (logar==2),   caxis([-1, 1]);   end
   end
   axis([1 TX 1 TY]);
   colorbar;    axis image;      axis off;
   if (logar==1)
      title(['LOG SAR t = ', timestep]);
   else
      title(['MOD SAR t = ', timestep]); 
   end   
   
   M(:,n+1)=getframe(gcf);                                            
   fclose(s);
end         %termina o loop dos arquivos

figure;
pcolor(rot90(Material)); shading flat;

cd ..
toc
%movie(gcf,M,0,10);
%============================================================================
disp(' ')
disp('***************************************************************')
disp('*           Thank you for using this program.                 *')
disp('*                Last Update: 17/07/2001                      *')
disp('*                anaterrra@estrelar.net                       *')
disp('***************************************************************')
disp(' ')
%============================================================================
