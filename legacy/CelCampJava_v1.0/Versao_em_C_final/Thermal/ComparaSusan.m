disp(' ')
disp('***********************************************************')
disp('*                 COMPARASUSAN.M                          *')
disp('***********************************************************')
disp('*     This program was developed by Rodrigues, A.O.       *')
disp('*   Oriented by Ramirez. J. A. and Vasconcelos J. A.      *')
disp('*   (with a little help of Viana, J.J :) )                *')
disp('* It can be used freely as long as the source is quoted.  *')
disp('*                     Feb/2002.                           *')
disp('***********************************************************')
disp(' ')
clear;

type=input('Fonte original (o) ou Cosseinoidal (c) ? ');

%dirbase1=input('Digite o diretorio do primeiro conjunto de dados (default .):');
%if isempty(dirbase1)
%   dirbase1='.';
%end
dirbase1='resCC';

%dirbase2=input('Digite o diretorio do conjunto de dados susan(default .):');
%if isempty(dirbase2)
%   dirbase2='.';
%end
dirbase2='resSusan';

%disp('Primeiro conjunto de pontos:');
%cx1=input('Coordenada X do ponto: ');
%cy1=input('Coordenada Y do ponto: ');
%cz1=input('Coordenada Z do ponto: ');
Ponto=input('Wich point (1-6) ?  ');
while (Ponto<1  | Ponto>6)
   Ponto=input('Wich point (1-6) ?  ');
end   

if (Ponto==3)
   disp('Ponto 3 = FONTE');
   cx1=151;
   cy1=103;
   cz1=3;
   disp('Fonte no C++ em (151, 51, 3)');   
   cx2=75;
   cy2=51;
   cz2=3;
   disp('Fonte no Matlab em (45, 51, 3)');
else
   Px=[13 73 73 73 101 153];
   Py=[53 73 53 33 53 53];

	cx1=Px(Ponto);
	cy1	=Py(Ponto);
   cz1	=3;
   
   %disp('Conjunto de pontos Susan:');   
   %cx2=input('Coordenada X do ponto: ');
	%cy2=input('Coordenada Y do ponto: ');
	%cz2=input('Coordenada Z do ponto: ');
	cx2=(cx1-1)/2;
	cy2=(cy1-1)/2;
   cz2=3;
end


disp('Reading field 1...');
Fields1=ReadPointFields(dirbase1,cx1,cy1,cz1);

disp('Reading field 2...');
Fields2=ReadPointFields(dirbase2,cx2,cy2,cz2);

corHz=max(Fields2.Hz.data)/max(Fields1.Hz.data)
corEx=max(Fields2.Ex.data)/max(Fields1.Ex.data)
corEy=max(Fields2.Ey.data)/max(Fields1.Ey.data)

%Calcula o erro
Erro.Hx.data=Fields1.Hx.data-Fields2.Hx.data;
Erro.Hy.data=Fields1.Hy.data-Fields2.Hy.data;
Erro.Hz.data=Fields1.Hz.data-Fields2.Hz.data;

Erro.Ex.data=Fields1.Ex.data-Fields2.Ex.data;
Erro.Ey.data=Fields1.Ey.data-Fields2.Ey.data;
Erro.Ez.data=Fields1.Ez.data-Fields2.Ez.data;

ErroX=100*max(Erro.Ex.data)/max(Fields2.Ex.data)
ErroY=100*max(Erro.Ey.data)/max(Fields2.Ey.data)
ErroZ=100*max(Erro.Hz.data)/max(Fields2.Hz.data)

ErroMedioEx=0; ErroMedioEy=0; ErroMedioHz=0;
for (iii=1:size(Erro.Ex.data,1))
   for (jjj=1:size(Erro.Ex.data,2))
      ErroMedioEx=ErroMedioEx+Erro.Ex.data(iii,jjj);
   end
end
ErromMedioEx=ErroMedioEx/(size(Erro.Ex.data,2))

for (iii=1:size(Erro.Ey.data,1))
   for (jjj=1:size(Erro.Ey.data,2))
      ErroMedioEy=ErroMedioEy+Erro.Ey.data(iii,jjj);
   end
end
ErromMedioEy=ErroMedioEy/(size(Erro.Ey.data,2))

for (iii=1:size(Erro.Hz.data,1))
   for (jjj=1:size(Erro.Hz.data,2))
      ErroMedioHz=ErroMedioHz+Erro.Hz.data(iii,jjj);
   end
end
ErromMedioHz=ErroMedioHz/(size(Erro.Hz.data,2))

maximoX=Fields1.NumCalc*Fields1.deltaT*Fields1.TimeReduction;

if type=='o'
   minH=-1; maxH=1;
	minE=-800; maxE=800;
elseif type=='c'
   minH=-1.2; maxH=1.2;
   minE=-1000; maxE=1000;
else
   	disp('Este tipo de fonte nao existe...');
end


disp('Ploting values...');
FIGHa1=figure; 
HHx.sub=subplot(1,1,1); hold on; axis([0 maximoX minH maxH]);
HHx.fig=FIGHa1;

FIGHa2=figure; 
HHy.sub=subplot(1,1,1); hold on; axis([0 maximoX minH maxH]);
HHy.fig=FIGHa2;

FIGHb1=figure; 
HHz.sub=subplot(1,1,1); hold on; axis([0 maximoX minH maxH]);
HHz.fig=FIGHb1;

FIGEa1=figure; 
HEx.sub=subplot(1,1,1); hold on; axis([0 maximoX minE maxE]);
HEx.fig=FIGEa1;

FIGEa2=figure; 
HEy.sub=subplot(1,1,1); hold on; axis([0 maximoX minE maxE]);
HEy.fig=FIGEa2;

FIGEb1=figure; 
HEz.sub=subplot(1,1,1); hold on; axis([0 maximoX minE maxE]);
HEz.fig=FIGEb1;

PlotPointFields(Fields1,HEx,HEy,HEz,HHx,HHy,HHz,'r');
PlotPointFields(Fields2,HEx,HEy,HEz,HHx,HHy,HHz,'b');

for t=1:Fields1.NumCalc
   tt(t)=t*Fields1.deltaT*Fields1.TimeReduction;
end   
FIGEb2=figure; subplot(1,1,1); hold on; axis([0 maximoX minE maxE]);
titulo=sprintf('Error E (%d,%d,%d)',cx1,cy1,cz1);
title(titulo);
plot(tt, Erro.Ex.data,'r', tt, Erro.Ey.data,'b', tt, Erro.Ez.data,'g')
legend('Ex','Ey','Ez');
xlabel('time(s)');      ylabel('Erro (V/m)');
figure(FIGEa1); subplot(1,1,1); legend('Calculated','Hagness');
figure(FIGEa2); subplot(1,1,1); legend('Calculated','Hagness');
figure(FIGEb1); subplot(1,1,1); legend('Calculated','Hagness');

FIGHb2=figure; subplot(1,1,1); hold on; axis([0 maximoX minH maxH]);
titulo=sprintf('Error H (%d,%d,%d)',cx1,cy1,cz1);
title(titulo);
plot(tt, Erro.Hx.data,'r', tt, Erro.Hy.data,'b', tt, Erro.Hz.data,'g')
legend('Hx','Hy','Hz');
xlabel('time(s)');      ylabel('Erro (A/m)');
figure(FIGHa1); subplot(1,1,1); legend('Calculated','Hagness');
figure(FIGHa2); subplot(1,1,1); legend('Calculated','Hagness');
figure(FIGHb1); subplot(1,1,1); legend('Calculated','Hagness');

%respRec=input('Record Figures ? ');
respRec='n';

if respRec=='y'
   
disp('Gravando Figuras...');
if (isdir('resultados')==0)
   mkdir resultados;
end  
chdir('resultados');
nome=sprintf('%d_%dHx.eps',cx1, cy1);
figure(FIGHa1); print('-depsc',nome);
nome=sprintf('%d_%dHy.eps',cx1, cy1);
figure(FIGHa2); print('-depsc',nome);

nome=sprintf('%d_%dHz.eps',cx1, cy1);
figure(FIGHb1); print('-depsc',nome);
nome=sprintf('%d_%dHErro.eps',cx1, cy1);
figure(FIGHb2); print('-depsc',nome);

nome=sprintf('%d_%dEx.eps',cx1, cy1);
figure(FIGEa1); print('-depsc',nome);
nome=sprintf('%d_%dEy.eps',cx1, cy1);
figure(FIGEa2); print('-depsc',nome);

nome=sprintf('%d_%dEz.eps',cx1, cy1);
figure(FIGEb1); print('-depsc',nome);
nome=sprintf('%d_%dEErro.eps',cx1, cy1);
figure(FIGEb2); print('-depsc',nome);

chdir('..');
close all;

end

