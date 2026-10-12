% Plots the movies of the electric and magnetic fields in time

display('Plot Fields Movie');
display(' ');
%display('Usando log10(x) e valores de escala pre definidos');
%basedir=input('Diretorio base(default .):');
%if isempty(basedir)
%    basedir='.';
%end
basedir='.';

%nfat=input('Numero da fatia:');
nfat=26;

coord=input('Coordenada(x,y ou z):');

fatdir=sprintf('%s/fatia%d%s',basedir,nfat,coord);

%N=input('Numero de instantes de tempo:');
N=200;

%rreduz=input('Reduction in time: ');
rreduz=1;

%pulo=input('What is the step between two instants ? ');
pulo=1;

%maxmin=input('Deseja setar valores maximos e minimos (sim = 1, nao = 2) ? ');
maxmin=1;

if (maxmin==1)
   minimoE=-500; maximoE=-minimoE;
end

% Creates the figure and set properties
figure;
M=moviein(floor(N/rreduz),gcf);
fatia=1;
for i=0:pulo:((N-1)/rreduz),
   	i
    Fields=ReadEzField(fatdir,i,coord);
    
    if (maxmin==1)
       Fields.Ez.mincaxis=minimoE;
       Fields.Ez.maxcaxis=maximoE;      
   end
   
   
   %PlotSliceFields(Fields,HEx,HEy,HEz,HHx,HHy,HHz,0,-20);
   %figure(FIG);
   %title(['Slice cut at ',coord,'=',int2str(nfat),'. Time step =',int2str(i)]);
   %disp(sprintf('Time step= %d',i));
   
   step=int2str(i*rreduz);   
   sX=Fields.Ez.SizeX;
   sY=Fields.Ez.SizeY;
   
   xS=26/2;      yS=26/2;
   Dx=8.33e-3;   Dy=8.33e-3;
   
   %for (cox=1:sX)
   %   for (coy=1:sY)
   %      alfa=atan( ((coy-yS)*Dy) / ((cox-xS)*Dx) );
   %      Hfiestimado(cox,coy)= (-sin(alfa)*Fields.Hx.data(cox,coy) + cos(alfa)*Fields.Hy.data(cox,coy));
   %      Eroestimado(cox,coy)= (+cos(alfa)*Fields.Ex.data(cox,coy) + sin(alfa)*Fields.Ey.data(cox,coy));
   %   end
   %end
   
   message2=sprintf('Ez (N=%d)',step);
   
   pcolor(Fields.Ez.data');      shading flat;   if maxmin==1, caxis([minimoE maximoE]); end;   colorbar;      
   title(message2);
   
   M(:,fatia)=getframe(gcf);
   	fatia=fatia+1;
end


