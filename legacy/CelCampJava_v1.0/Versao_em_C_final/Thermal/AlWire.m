clear;

basedir=input('Results Dir (ex:"fatia10z") : ');
%basedir = 'DataFilesAlWire2K/ThermalFatia20z';

%n=input('Time Instants (ex: N=10) : ');
n=20000;

%pulo=input('Qual o espacamento ? ');
pulo=2000;

%fazMovie = input('Deseja mostrar o filme ou nao (y, or n) ? ');
fazMovie='n';

%deltaT = input('Qual o Delta T [s] ?');
deltaT=3e-9

%Dx = input('Qual o Delta X [m] ?');
Dx = 81.28e-6

%Dy = input('Qual o Delta Y [m]?');
Dy = Dx

%loga=input('Logaritmic (1) or normal (2) ? ');
loga=2;

%triset=input('Temperature Rise (1) or Absolute Temperature (2) ? '); 
triset = 2;

%maxmin=input('Set max and min (1) or not (2) ? ');
maxmin=1;
if maxmin==1
   %escolhe=input('Choose max and min (1) or not (2) ? ');
   escolhe=1;
end
if maxmin==1
   if (escolhe==1)
      %maximo=input('Digite o MAXIMO : ');
      maximo = 250;
      %minimo=input('Digite o MINIMO : ');
      minimo = 38;
   else
      if (loga==1)
         if (triset==1)
            maximo=4;
            minimo=-4;
         else
            maximo=2.5;
            minimo=1.5;
         end
         
      else
         if (triset==1)
            maximo=1;
            minimo=0;
         else   
            maximo=120;
            minimo=36;
         end
      end
   end   
end

if (fazMovie=='y')
    figure;
    SizeMovie = (n+1)/pulo;
    M = moviein(SizeMovie);
end

tt=0;
for (t=0:pulo:n-1)
    tt = tt+1
    filename=sprintf('Thermal%d.txt',t);
    
    curdir=pwd;
    chdir(basedir);
    f=fopen(filename,'r');

if (f==-1)
   disp('It was not possible to open the file!');
else
   xx=1; yy=1;
   line=fgets(f);
   SizeX=str2num(line);
   line=fgets(f);
   SizeY=str2num(line);
   if feof(f)
      data=zeros(SizeX,SizeY);
   else    	
      for i=0:SizeX-1,       
         for j=0:SizeY-1,                      
            line=fgets(f);                            
            data(xx,yy)=str2num(line);
            yy=yy+1;
         end
         xx=xx+1;
         yy=1;
      end
      fclose(f);
            
      xx=1;      yy=1;
      for i=0:2:SizeX-1,            
         for j=0:2:SizeY-1,      
            if (loga==1),
               if (data(i+1,j+1)==0)
                  if (triset==2)
                     data2(tt, xx,yy)=log10(abs(1e-12));
                  else
                     data2(tt, xx,yy)=0;
                  end
                  
               else
                  if (triset==2)
                     data2(tt, xx,yy)=log10(abs(data(i+1,j+1)));
                  else
                     valor=data(i+1,j+1)-36.799999237060546875;
                     if valor==0
                        data2(tt, xx,yy)=0;
                     else	                        
                        data2(tt,xx,yy)=log10(abs(valor));
                     end
                     
                  end
                  
               end               
            else               
               data2(tt,xx,yy)=data(i+1,j+1);               
            end
            yy=yy+1;
         end
         xx=xx+1;
         yy=1;           
      end
      %figure;

      media = 0;
      valmed=0;
      minmm=250;
      maxmm=0;
      for xc=1:size(data2,2),
          for yc=1:size(data2,3),
              mm(xc,yc) = data2(tt,xc,yc) ;
              if (mm(xc,yc) > 38)
                  mm(xc,yc);
                  media = media + mm(xc,yc);
                  valmed= valmed+1;
                  if mm(xc,yc)<minmm
                      minmm=mm(xc,yc);
                  end
                  if mm(xc,yc)>maxmm
                      maxmm=mm(xc,yc);
                  end
              end
          end
      end

      if valmed~=0,
          mediaCopo(tt) = media/valmed;
          mediaCopoF(tt) = ((9/5)*mediaCopo(tt))+32;
          minCopo(tt) = minmm;
          maxCopo(tt) = maxmm;
      end
     if (fazMovie=='y')
         pcolor(mm');     texto = sprintf('Heat Propagation in t = %4.4f s', t*deltaT);     title(texto);
         xlabel('Distance in X [cube = 4cm]'); ylabel('Distance in Y [cube = 4cm]'); colorbar;
        M(:,tt) = getframe(gcf);
    end

  end

end
chdir(curdir);

end

if (fazMovie=='y')
    movie(gcf, M)
end

hstill = 2; hforced=12;
ro=169; c=0.208; k=121;
Delta =  2.66667e-3; %in ft
Tinf =100; Ti=400;

coefstill = -8*hstill/(ro*c*Delta)
coefforced = -8*hforced/(ro*c*Delta)

figure;
for (iii=1:size(mediaCopo,2))
    tmc(iii) = (iii-1)*deltaT*pulo;
    TFcomp(iii) = Tinf + (Ti-Tinf)*exp(coefstill*tmc(iii)/(60*60));
    Tcomp(iii) = (5/9) *(TFcomp(iii)-32);
    erroperc(iii) = 100*(Tcomp(iii)-mediaCopo(iii))/Tcomp(iii);
end

erromax = max(erroperc);
%title('Temperature Calculated by the Program in oC');
plot(tmc, Tcomp, 'b', tmc, mediaCopo,'r', tmc, minCopo,'g', tmc, maxCopo, 'r*');
legend('Analytical', 'Calc - Media', 'Calc - Min', 'Calc - Max');
%plot(tmc, Tcomp, 'b+', tmc, mediaCopo,'r');
%legend('Analytical', 'Media');

xlabel('Time in Seconds'); ylabel('Temperature in oC');
%text(60,160,'Maximum  Error in %'); text(60,140,num2str(erromax));

%cont=1;
%for (t=0:0.0001:0.03)
%     TF(cont) = 100+300*exp(-170.69*t);
%     T(cont) = (5/9) *(TF(cont)-32);
%     vart(cont)=t*60*60;
%      cont=cont+1;
%  end
%figure;
%plot(vart, T); title('Temperature in Celcius');xlabel('Time in Seconds'); ylabel('Temperature in oC');
%figure;
%plot(vart, TF); title('Temperature in Farenheit');xlabel('Time in Seconds'); ylabel('Temperature in F');