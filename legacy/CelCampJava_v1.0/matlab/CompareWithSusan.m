%============================================================================
disp(' ')
disp('***********************************************************')
disp('*     This program was developed by Rodrigues, A.O.       *')
disp('*   Oriented by Ramirez. J. A. and Vasconcelos J. A.      *')
disp('*   (with a little help of Viana, J.J :) )                *')
disp('* It can be used freely as long as the source is quoted.  *')
disp('*                     Feb/2002.                           *')
disp('***********************************************************')
disp(' ')
clear;

%dirbase1=input('Digite o diretorio do primeiro conjunto de dados (default .):');
%if isempty(dirbase1)
%   dirbase1='.';
%end
dirbase1='hag2d2o'

%dirbase2=input('Digite o diretorio do conjunto de dados susan(default .):');
%if isempty(dirbase2)
%   dirbase2='.';
%end
dirbase2='susan'

disp('Primeiro conjunto de pontos:');
cx1=input('Coordenada X do ponto: ');
cy1=input('Coordenada Y do ponto: ');
%cz1=input('Coordenada Z do ponto: ');
cz1=3;

%disp('Conjunto de pontos Susan:');
%cx2=input('Coordenada X do ponto: ');
%cy2=input('Coordenada Y do ponto: ');
%cz2=input('Coordenada Z do ponto: ');
cx2=(cx1-1)/2;
cy2=(cy1-1)/2;
cz2=2;

disp('Reading fields...');

Fields1=ReadPointFields(dirbase1,cx1,cy1,cz1);
Fields2=ReadPointFields(dirbase2,cx2,cy2,cz2);

corHz=max(Fields2.Hz)/max(Fields1.Hz)
corEx=max(Fields2.Ex)/max(Fields1.Ex)
corEy=max(Fields2.Ey)/max(Fields1.Ey)

%Calcula o erro
Erro.Hx=Fields1.Hx-Fields2.Hx;
Erro.Hy=Fields1.Hy-Fields2.Hy;
Erro.Hz=Fields1.Hz-Fields2.Hz;

Erro.Ex=Fields1.Ex-Fields2.Ex;
Erro.Ey=Fields1.Ey-Fields2.Ey;
Erro.Ez=Fields1.Ez-Fields2.Ez;

ErroX=100*max(Erro.Ex)/max(Fields2.Ex)
ErroY=100*max(Erro.Ey)/max(Fields2.Ey)
ErroZ=100*max(Erro.Hz)/max(Fields2.Hz)

maximoX=300*5e-12;

disp('Ploting values...');
FIGHa1=figure; 
HHx.sub=subplot(1,1,1); hold on; axis([0 maximoX -0.2, 0.2]);
HHx.fig=FIGHa1;

FIGHa2=figure; 
HHy.sub=subplot(1,1,1); hold on; axis([0 maximoX -0.2, 0.2]);
HHy.fig=FIGHa2;

FIGHb1=figure; 
HHz.sub=subplot(1,1,1); hold on; axis([0 maximoX -0.2, 0.2]);
HHz.fig=FIGHb1;

FIGEa1=figure; 
HEx.sub=subplot(1,1,1); hold on; axis([0 maximoX -80, 80]);
HEx.fig=FIGEa1;

FIGEa2=figure; 
HEy.sub=subplot(1,1,1); hold on; axis([0 maximoX -80, 80]);
HEy.fig=FIGEa2;

FIGEb1=figure; 
HEz.sub=subplot(1,1,1); hold on; axis([0 maximoX -80, 80]);
HEz.fig=FIGEb1;

PlotPointFields(Fields1,HEx,HEy,HEz,HHx,HHy,HHz,'r');
PlotPointFields(Fields2,HEx,HEy,HEz,HHx,HHy,HHz,'b');

for t=1:300
      tt(t)=t*5e-12;
end   
FIGEb2=figure; subplot(1,1,1); hold on; axis([0 maximoX -80, 80]);
titulo=sprintf('Error E (%d,%d,%d)',cx1,cy1,cz1);
title(titulo);
plot(tt, Erro.Ex,'r', tt, Erro.Ey,'b', tt, Erro.Ez,'g')
legend('Ex','Ey','Ez');
xlabel('time(s)');      ylabel('Erro (V/m)');
figure(FIGEa1); subplot(1,1,1); legend('Calculated','Hagness');
figure(FIGEa2); subplot(1,1,1); legend('Calculated','Hagness');
figure(FIGEb1); subplot(1,1,1); legend('Calculated','Hagness');

FIGHb2=figure; subplot(1,1,1); hold on; axis([0 maximoX -0.2, 0.2]);
titulo=sprintf('Error H (%d,%d,%d)',cx1,cy1,cz1);
title(titulo);
plot(tt, Erro.Hx,'r', tt, Erro.Hy,'b', tt, Erro.Hz,'g')
legend('Hx','Hy','Hz');
xlabel('time(s)');      ylabel('Erro (A/m)');
figure(FIGHa1); subplot(1,1,1); legend('Calculated','Hagness');
figure(FIGHa2); subplot(1,1,1); legend('Calculated','Hagness');
figure(FIGHb1); subplot(1,1,1); legend('Calculated','Hagness');

disp('Gravando Figuras...');
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