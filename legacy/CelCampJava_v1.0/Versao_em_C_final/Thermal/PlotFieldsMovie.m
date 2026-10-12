% Plots the movies of the electric and magnetic fields in time

display('Plot Fields Movie');
display(' ');
%display('Usando log10(x) e valores de escala pre definidos');
basedir=input('Diretorio base(default .):');
if isempty(basedir)
    basedir='.';
end
nfat=input('Numero da fatia:');
coord=input('Coordenada(x,y ou z):');
fatdir=sprintf('%s/fatia%d%s',basedir,nfat,coord);
N=input('Numero de instantes de tempo:');
rreduz=input('Reduction in time: ');
%rreduz=1;

pulo=input('What is the step between two instants ? ');

maxmin=input('Deseja setar valores maximos e minimos (sim = 1, nao = 2) ? ');
if (maxmin==1)
	maximoE=input('Digite o valor maximo de E :');
	minimoE=input('Digite o valor minimo de E :');

	maximoH=input('Digite o valor maximo de H :');
	minimoH=input('Digite o valor minimo de H :');
end

% Creates the figure and set properties
FIG=figure;


M=moviein(floor(N/rreduz),gcf);
HEx=subplot(2,3,1); 
HEy=subplot(2,3,2); 
HEz=subplot(2,3,3); 
HHx=subplot(2,3,4); 
HHy=subplot(2,3,5); 
HHz=subplot(2,3,6); 
fatia=1;
for i=0:pulo:((N-1)/rreduz),
    Fields=ReadSliceFields(fatdir,i,coord);

	if (maxmin==1)
		Fields.Ex.mincaxis=minimoE;
		Fields.Ex.maxcaxis=maximoE;
		Fields.Ey.mincaxis=minimoE;
		Fields.Ey.maxcaxis=maximoE;
		Fields.Ez.mincaxis=minimoE;
		Fields.Ez.maxcaxis=maximoE;
    
		Fields.Hx.mincaxis=minimoH;
		Fields.Hx.maxcaxis=maximoH;
		Fields.Hy.mincaxis=minimoH;
		Fields.Hy.maxcaxis=maximoH;
		Fields.Hz.mincaxis=minimoH;
		Fields.Hz.maxcaxis=maximoH;
	end

    PlotSliceFields(Fields,HEx,HEy,HEz,HHx,HHy,HHz,0,-20,i);
    figure(FIG);
        disp(sprintf('Time step= %d',i));
    M(:,fatia)=getframe(gcf);
    fatia=fatia+1;
end


