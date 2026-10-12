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
	%maximoE=input('Digite o valor maximo de E :');
	%minimoE=input('Digite o valor minimo de E :');
   minimoE=-500; maximoE=-minimoE;
   
   	%maximoH=input('Digite o valor maximo de H :');
   %minimoH=input('Digite o valor minimo de H :');
   minimoH=-10; maximoH=-minimoH;
   
end

% Creates the figure and set properties
figure;
M=moviein(floor(N/rreduz),gcf);
fatia=1;
for i=0:pulo:((N-1)/rreduz),
   	i
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
   
   
   %PlotSliceFields(Fields,HEx,HEy,HEz,HHx,HHy,HHz,0,-20);
   %figure(FIG);
   %title(['Slice cut at ',coord,'=',int2str(nfat),'. Time step =',int2str(i)]);
   %disp(sprintf('Time step= %d',i));
   
   step=int2str(i*rreduz);   
   sX=Fields.Hz.SizeX;
   sY=Fields.Hz.SizeY;
   
   xS=26/2;      yS=26/2;
   Dx=8.33e-3;   Dy=8.33e-3;
   
   %for (cox=1:sX)
   %   for (coy=1:sY)
   %      alfa=atan( ((coy-yS)*Dy) / ((cox-xS)*Dx) );
   %      Hfiestimado(cox,coy)= (-sin(alfa)*Fields.Hx.data(cox,coy) + cos(alfa)*Fields.Hy.data(cox,coy));
   %      Eroestimado(cox,coy)= (+cos(alfa)*Fields.Ex.data(cox,coy) + sin(alfa)*Fields.Ey.data(cox,coy));
   %   end
   %end
   
   message1=sprintf('Hx, Hy and Hz (N=%d)',step);
   message2=sprintf('Ex, Ey and Ez (N=%d)',step);
   
   numA=4;
   numB=2;
   subplot(numA,numB,1); text(0,0.3,message1); axis off;
   subplot(numA,numB,3),pcolor(Fields.Hx.data');   shading flat;	   if maxmin==1, caxis([minimoH maximoH]); end;     colorbar;      	      
   subplot(numA,numB,5),pcolor(Fields.Hy.data');   shading flat;	   if maxmin==1, caxis([minimoH maximoH]); end;     colorbar;     	      
   subplot(numA,numB,7),pcolor(Fields.Hz.data');   shading flat;	   if maxmin==1, caxis([minimoH maximoH]); end;     colorbar;     
   %subplot(numA,numB,9),pcolor(Hfiestimado);      shading flat;	   if maxmin==1, caxis([minimoH maximoH]); end;     colorbar;   
   
   subplot(numA,numB,2); text(0,0.3,message2); axis off;
   subplot(numA,numB,4),pcolor(Fields.Ex.data');      shading flat;   if maxmin==1, caxis([minimoE maximoE]); end;   colorbar;          
   subplot(numA,numB,6),pcolor(Fields.Ey.data');      shading flat;   if maxmin==1, caxis([minimoE maximoE]); end;   colorbar;        
   subplot(numA,numB,8),pcolor(Fields.Ez.data');      shading flat;   if maxmin==1, caxis([minimoE maximoE]); end;   colorbar;      
   %subplot(numA,numB,10),pcolor(Eroestimado);         shading flat;   if maxmin==1, caxis([minimoE maximoE]); end;   colorbar;      
   
   M(:,fatia)=getframe(gcf);
   	fatia=fatia+1;
end


