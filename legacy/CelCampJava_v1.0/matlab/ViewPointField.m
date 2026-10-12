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

dirbase=input('Digite o diretorio base(default .):');
if isempty(dirbase)
   dirbase='.';
end
cx=input('Coordenada X do ponto: ');
cy=input('Coordenada Y do ponto: ');
cz=input('Coordenada Z do ponto: ');
disp('Reading fields...');
Fields=ReadPointFields(dirbase,cx,cy,cz);
disp('Ploting values...');
FIGH=figure;
subplot(2,2,1); axis off;
title('Magnetic Fields for point ');
ponto=sprintf('X= %d Y= %d Z= %d',Fields.xP,Fields.yP,Fields.zP);
text(0.1,0.9,ponto);
HHx.sub=subplot(2,2,2);
HHy.sub=subplot(2,2,3);
HHz.sub=subplot(2,2,4);
HHx.fig=FIGH;
HHy.fig=FIGH;
HHz.fig=FIGH;

FIGE=figure;
subplot(2,2,1); axis off;
title('Electric Fields for point ');
ponto=sprintf('X= %d Y= %d Z= %d',Fields.xP,Fields.yP,Fields.zP);
text(0.1,0.9,ponto);
HEx.sub=subplot(2,2,2);
HEy.sub=subplot(2,2,3);
HEz.sub=subplot(2,2,4);
HEx.fig=FIGE;
HEy.fig=FIGE;
HEz.fig=FIGE;

PlotPointFields(Fields,HEx,HEy,HEz,HHx,HHy,HHz,'r');
