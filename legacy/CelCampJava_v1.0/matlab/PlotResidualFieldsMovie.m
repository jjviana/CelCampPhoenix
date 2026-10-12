% Plots the movies of the electric and magnetic fields in time

display('Plot Residual Fields Movie');
display(' ');
basedir1=input('Diretorio base do conjunto de dados sem reflexao(default .):');
if isempty(basedir1)
    basedir1='.';
end
basedir2=input('Diretorio base do conjunto de dados com reflexao(default .):');
if isempty(basedir2)
    basedir2='.';
end
nfat=input('Numero da fatia:');
coord=input('Coordenada(x,y ou z):');
fatdir1=sprintf('%s/fatia%d%s',basedir1,nfat,coord);
fatdir2=sprintf('%s/fatia%d%s',basedir2,nfat,coord);
N=input('Numero de instantes de tempo:');
% Creates the figure and set properties
FIG=figure;
M=moviein(N,gcf);
HEx=subplot(2,4,2); 
HEy=subplot(2,4,3); 
HEz=subplot(2,4,4); 
HHx=subplot(2,4,6); 
HHy=subplot(2,4,7); 
HHz=subplot(2,4,8); 
for i=0:N
    
    Fields1=ReadSliceFields(fatdir1,i);
    Fields2=ReadSliceFields(fatdir2,i);
    Fields1.Ex.data=Fields2.Ex.data-Fields1.Ex.data;
    Fields1.Ey.data=Fields2.Ey.data-Fields1.Ey.data;
    Fields1.Ez.data=Fields2.Ez.data-Fields1.Ez.data;
    Fields1.Hx.data=Fields2.Hx.data-Fields1.Hx.data;
    Fields1.Hy.data=Fields2.Hy.data-Fields1.Hy.data;
    Fields1.Hz.data=Fields2.Hz.data-Fields1.Hz.data;
    
    PlotSliceFields(Fields1,HEx,HEy,HEz,HHx,HHy,HHz,0,-20,inf,inf);
    figure(FIG);
   % title(['Slice cut at ',coord,'=',int2str(nfat),'. Time step =',int2str(i)]);
    disp(sprintf('Time step= %d',i));
    M(i+1)=getframe(gcf);
end

