clear;
basedir=input('Results Dir (ex:"fatia10z") : ');

n=input('Time Instants (ex: N=10) : ');

pulo=input('Qual o espacamento ? ');
%pulo = 10;

loga=input('Logaritmic (1) or normal (2) ? ');
%loga=2;

plotar = input('Deseja plotar (1) ou nao (2) ? ');
%plotar = 2;

if (plotar==1)
  SizeMovie = (n+1)/pulo;
  M = moviein(SizeMovie);
end

tt=0;
fatia = 0;
if (loga==1)
 maximo = 0;
 minimo = -20;
else
 maximo = 0.02;
 minimo = 0;
end

deltaT = 1e-2;  %em picosecundos

for (t=0:pulo:n-1)
    tt = tt+1
    Ttime(tt) = t*deltaT*1e-9;
    filename=sprintf('SAR%d.txt',fatia);
    fatia = fatia+1;
    curdir=pwd;
    chdir(basedir);
    f=fopen(filename,'r');

    if (f==-1)
       disp('It was not possible to open the file!');
    else
       xx=1; yy=1;
       line=fgets(f);
       SizeX=1+(str2num(line)-1)/2;
       line=fgets(f);
       SizeY=1+(str2num(line)-1)/2;
       line=fgets(f);
       totSAR(tt)=str2num(line);
       if feof(f)
          data=zeros(SizeX,SizeY);
       else
         for i=0:SizeX-1,
           for j=0:SizeY-1,
             line=fgets(f);
             data(xx,yy)=str2num(line);

             if (loga==1)
                if (data(xx,yy)==0)
                   data2(xx,yy)=-100;
                else
                   data2(xx,yy)=log10(abs(data(xx,yy)));
                end
             else
                data2(xx,yy)=data(xx,yy);
             end

             yy=yy+1;
           end
           xx=xx+1;
           yy=1;
         end
      fclose(f);

      if (plotar==1)
         pcolor(data2');
         caxis([minimo maximo]);
         texto = sprintf('SAR Propagation in t = %4.6f picoseconds', t*deltaT);
         title(texto);
         xlabel('Distance in X');
         ylabel('Distance in Y');
         colorbar;
         M(:,tt) = getframe(gcf);
      end

  end
end
chdir(curdir);
end

figure;
plot(Ttime, totSAR);
xlabel('Time [s]');
ylabel('Total SAR [W/kg]');
