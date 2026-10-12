%============================================================================
disp(' ')
disp('***********************************************************')
disp('*     This program was developed by Rodrigues, A.O.       *')
disp('*   Oriented by Ramirez. J. A. and Vasconcelos J. A.      *')
disp('* It can be used freely as long as the source is quoted.  *')
disp('*                     Jun/2001.                           *')
disp('***********************************************************')
disp(' ')
%============================================================================
%                         ENTRY OF DATA FROM FD-TD:
%============================================================================
%THE DATA FILE MUST HAVE THE FOLLOWING FORMAT
%	[INT tc] = NUMBER OF CALCULATIONS
%  [FLOAT dt] = delta T
%  [INT x ] = POSITION X OF THE FONT
%  [INT y ] = POSITION Y OF THE FONT
%  [FLOAT Hx(1)]  %  [FLOAT Hy(1)]  %  [FLOAT Ez(1)]  
%  [FLOAT Hx(2)]  %  [FLOAT Hy(2)]  %  [FLOAT Ez(2)]
%  [FLOAT Hx(3)]  %  [FLOAT Hy(3)]  %  [FLOAT Ez(3)]
%   ... repeats until Ez(tc}
%============================================================================

clear; tic
modo=input('Deseja a SAR(1) ou campos EH (2) ? ');

area=(1.11*1.86)*1e-2;

if modo==1
	arq=strcat('SARnovo.txt');
end
if modo==2
	arq=strcat('EHnovo.txt');
end

logar=input('Logaritmo (1) ou Módulo (2) ? ');

disp('Calculating the Fields...')

s=fopen(arq, 'r');
frewind(s);  

line = fgets(s);  N = str2num(line);
line = fgets(s);  TamX = str2num(line);
line = fgets(s);  TamY = str2num(line);
TX=(TamX+1)/2; TY=(TamY+1)/2;

c1=zeros(TX-1,TY); c2=zeros(TX,TY-1);  c3=zeros(TX-1,TY-1);

%Incializando o filme:
%---------------------
figure;
subplot(2,2,1),pcolor(c1');            shading flat;
axis([1 TX-1 1 TY]);  
colorbar;    axis image;      axis off;
title(['C1 at time step = 0']);

subplot(2,2,2),pcolor(c2');            shading flat;
axis([1 TX 1 TY-1]);  
colorbar;     axis image;     axis off;
title(['C2 at time step = 0']);

subplot(2,2,3),pcolor(c3');            shading flat;
axis([1 TX-1 1 TY-1]);  
colorbar;    axis image;      axis off;
title(['C3 at time step = 0']);         

M=moviein(N,gcf);
M(:,1)=getframe(gcf);       

%COMECA A PLOTAR:
%================
frewind(s); 

line = fgets(s);
line = fgets(s);
line = fgets(s);
n=0; 
c1i=1; c1j=1; c2i=1; c2j=1; c3i=1; c3j=1;
indice=0;
for (n=1:N),
   n
   for (i=1:TamX),
      for (j=1:TamY),         
         line=fgets(s);
         if (rem(j,2)==1 & rem(i,2)==0),     
            %c1
            if ~isstr(line), break, end 
            c1(c1i,c1j)=str2num(line);      
            if logar==1
               if (c1(c1i,c1j)~=0),  c1(c1i,c1j)=log(abs(c1(c1i,c1j))); 
               else c1(c1i,c1j)=-20;               end                
            end
            c1j=c1j+1;
         end
         
         if (rem(j,2)==0 & rem(i,2)==1),
            %c2
            if ~isstr(line), break, end 
            c2(c2i,c2j)=str2num(line);      
            if logar==1
               if (c2(c2i,c2j)~=0),  c2(c2i,c2j)=log(abs(c2(c2i,c2j)));
               else c2(c2i,c2j)=-20;               end
            end
            c2j=c2j+1;
         end
         
         if (rem(j,2)==1 & rem(i,2)==1),
            %c3
            if ~isstr(line), break, end 
            c3(c3i,c3j)=str2num(line);      
            if logar==1
               if (c3(c3i,c3j)~=0),  c3(c3i,c3j)=log(abs(c3(c3i,c3j)));
               else c3(c3i,c3j)=-20;               end                
            end
            c3j=c3j+1;
         end
      end %termina o loop em x
      c1j=1; c2j=1; c3j=1;
      if (rem(i,2)==0)
         c1i=c1i+1;
      else
         c2i=c2i+1; c3i=c3i+1;
      end      
      
   end %termina o loop em y
   c1i=1; c2i=1; c3i=1;
   timestep=int2str(n);
   c1(:,TY+1)=0;  c2(:,TY)=0;    c3(:,TY+1)=0;
   c1(TX,:)=0;    c2(TX+1,:)=0;  c3(TX+1,:)=0;
      
   subplot(2,2,1),pcolor(c1');           shading flat; 
   axis([1 TX-1 1 TY]);  
   if (logar==1),   caxis([-20, 1]);   end
   if (logar==2),   caxis([-1, 1]);   end
   
   colorbar;    axis image;      axis off;
   if (logar==1)
      title(['C1 (Log - calc) at time step = ', timestep]);
   else
      title(['C1 (Mod - calc) at time step = ', timestep]); 
   end
   
   subplot(2,2,2),pcolor(c2');            shading flat;
   if (logar==1),   caxis([-20, 1]);   end
   if (logar==2),   caxis([-1, 1]);   end
   axis([1 TX 1 TY-1]);  
   colorbar;     axis image;     axis off;
   if (logar==1)
      title(['C2 (Log - calc) at time step = ', timestep]);
   else
      title(['C2 (Mod - calc) at time step = ', timestep]); 
   end
   
   subplot(2,2,3),pcolor(c3');            shading flat;
   if (logar==1),   caxis([-20, 9]);   end
   if (logar==2),   caxis([-1000, 1000]);   end
   axis([1 TX 1 TY]);  
   colorbar;    axis image;      axis off;
   if (logar==1)
      title(['c3 (Log - calc) at time step = ', timestep]);
   else
      title(['c3 (Mod - calc) at time step = ', timestep]); 
   end
   
   M(:,n+1)=getframe(gcf);                                            
   
end         %termina o loop no tempo


fclose(s);
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
