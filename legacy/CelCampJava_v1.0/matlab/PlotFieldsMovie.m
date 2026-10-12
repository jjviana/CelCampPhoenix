% Plots the movies of the electric and magnetic fields in time

display('Plot Fields Movie');
display(' ');
display('Usando log10(x) e valores de escala pre definidos');
basedir=input('Diretorio base(default .):');
if isempty(basedir)
    basedir='.';
end
nfat=input('Numero da fatia:');
coord=input('Coordenada(x,y ou z):');
fatdir=sprintf('%s/fatia%d%s',basedir,nfat,coord);
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
    
    Fields=ReadSliceFields(fatdir,i);
    PlotSliceFields(Fields,HEx,HEy,HEz,HHx,HHy,HHz,1,-20,-5,10);
    figure(FIG);
   % title(['Slice cut at ',coord,'=',int2str(nfat),'. Time step =',int2str(i)]);
    disp(sprintf('Time step= %d',i));
    M(i+1)=getframe;
end

