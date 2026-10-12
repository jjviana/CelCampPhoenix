% Plots the movies of the electric and magnetic fields in time

clear;

%display('Plot Fields Movie');
%display(' ');
%display('Usando log10(x) e valores de escala pre definidos');

%basedir=input('Diretorio base(default .) : ');
basedir='DataFilesValida2D-1lay'
if isempty(basedir)
    basedir='.';
end

%mostra=input('Deseja plotar todos os campos (1) ou nao (2) ? ');
mostra = 2;

%nfat=input('Numero da fatia :');
nfat=41;

%coord=input('Coordenada(x,y ou z):');
coord='z';

fatdir=sprintf('%s/fatia%d%s',basedir,nfat,coord);
N=input('Numero de instantes de tempo : ');
rreduz=input('Reduction in time : ');
%rreduz=1;

pulo=input('What is the step between two instants ? ');
%pulo=1;

%maxmin=input('Deseja setar valores maximos e minimos (sim = 1, nao = 2) ? ');
maxmin=2;

if (maxmin==1)
	maximoE=input('Digite o valor maximo de E :');
	minimoE=input('Digite o valor minimo de E :');

	maximoH=input('Digite o valor maximo de H :');
	minimoH=input('Digite o valor minimo de H :');
end

% Creates the figure and set properties
if (mostra==1)
 FIG=figure;
 M=moviein(floor(N/rreduz),gcf);
 HEx=subplot(2,3,1);
 HEy=subplot(2,3,2);
 HEz=subplot(2,3,3);
 HHx=subplot(2,3,4);
 HHy=subplot(2,3,5);
 HHz=subplot(2,3,6);
end

dx = 1.5e-2;
p=11:1:31;
dist=(p-21)*dx;

fatia=1
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

    if (mostra==1)
      PlotSliceFields(Fields,HEx,HEy,HEz,HHx,HHy,HHz,0,-20,i);
      figure(FIG);
         disp(sprintf('Time step= %d',i));
      M(:,fatia)=getframe(gcf);
    end

    for (i=1:size(p,2))
      mizero=8.85e-12; current=0.3; deltaT=1.4e-11;
      modulo = mizero/(deltaT*current);
      ValidaExX(fatia,i)=modulo*Fields.Ex.data(p(i),20);
      ValidaExY(fatia,i)=modulo*Fields.Ex.data(20,p(i));

      ValidaEyX(fatia,i)=modulo*Fields.Ey.data(p(i),20);
      ValidaEyY(fatia,i)=modulo*Fields.Ey.data(20,p(i));
      ValidaHz(fatia,i)=modulo*Fields.Hz.data(p(i),20);
    end

    fatia=fatia+1
end

for  (i=1:size(p,2))
 modValidaExX(i)=max(abs(ValidaExX(size(ValidaExX,1)/2:size(ValidaExX,1),i)));
 modValidaExY(i)=max(abs(ValidaExY(size(ValidaExY,1)/2:size(ValidaExY,1),i)));

 modValidaEyX(i)=max(abs(ValidaEyX(size(ValidaEyX,1)/2:size(ValidaEyX,1),i)));
 modValidaEyY(i)=max(abs(ValidaEyY(size(ValidaEyY,1)/2:size(ValidaEyY,1),i)));

 modValidaHz(i)=max(abs(ValidaHz(size(ValidaHz,1)/2:size(ValidaHz,1),i)));
end

%figure;
%plot(dist,modValidaExX,'ro-'); legend('modEx - eixo X');  axis tight;
figure;
plot(dist,modValidaExY,'rx-'); legend('modEx - eixo Y');  axis tight;
figure;
plot(dist, modValidaEyX,'bo-'); legend('modEy - eixo X'); axis tight;
figure;
plot(dist, modValidaEyY,'bx-'); legend('modEy - eixo Y'); axis tight;
%legend('P1', 'P2','P3','P4', 'P5','P6','P7', 'P8','P9','P10','P11', 'P12','P13','P14', 'P15','P16','P17', 'P18','P19','P20','P21');
%figure;
%plot(dist, modValidaHz, 'x-'); legend('modHz');
%figure;
%plot(dist,ValidaEx,'+-',dist,ValidaEy,'o-', dist, ValidaHz, 'x-'); legend('Ex','Ey','Hz');
%figure;
%plot(dist, ValidaHz, 'x-'); legend('Hz');

