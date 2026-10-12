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

dirbase1=input('Digite o diretorio do conjunto de dados normal(default .):');
if isempty(dirbase1)
   dirbase1='.';
end
dirbase2=input('Digite o diretorio do conjunto de dados com reflexao(default .):');
if isempty(dirbase2)
   dirbase2='.';
end
cx=input('Coordenada X do ponto: ');
cy=input('Coordenada Y do ponto: ');
cz=input('Coordenada Z do ponto: ');
disp('Reading fields...');
Fields1=ReadPointFields(dirbase1,cx,cy,cz);
Fields2=ReadPointFields(dirbase2,cx,cy,cz);
disp('Ploting values...');
FIGH=figure; 
subplot(2,2,1); axis off;
title('Magnetic Fields for point ');
ponto=sprintf('X= %d Y= %d Z= %d',cx,cy,cz);
text(0.1,0.9,ponto);
text(0.1,0.7,'Red = With BC');
text(0.1,0.6,'Blue= Without BC in X=Xmax');
HHx.sub=subplot(2,2,2); hold on;
HHy.sub=subplot(2,2,3); hold on;
HHz.sub=subplot(2,2,4); hold on;
HHx.fig=FIGH;
HHy.fig=FIGH;
HHz.fig=FIGH;

FIGE=figure; 
subplot(2,2,1); axis off;
title('Electric Fields for point ');
ponto=sprintf('X= %d Y= %d Z= %d',cx,cy,cz);
text(0.1,0.9,ponto);
text(0.1,0.7,'Red = With BC');
text(0.1,0.6,'Blue= Without BC in X=Xmax');
HEx.sub=subplot(2,2,2); hold on;
HEy.sub=subplot(2,2,3); hold on;
HEz.sub=subplot(2,2,4); hold on;
HEx.fig=FIGE;
HEy.fig=FIGE;
HEz.fig=FIGE;


PlotPointFields(Fields1,HEx,HEy,HEz,HHx,HHy,HHz,'r');
PlotPointFields(Fields2,HEx,HEy,HEz,HHx,HHy,HHz,'b');
