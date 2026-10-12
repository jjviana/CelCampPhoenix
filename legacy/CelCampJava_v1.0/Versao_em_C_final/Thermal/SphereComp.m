clear;

basedir=input('Results Dir (ex:"fatia10z") :   ');
%basedir = 'DataFilesCubeGrad10K/ThermalFatia20z'

n=input('Time Instants (ex: N=10) :   ');
%n=2000;

%pulo=input('Qual o espacamento ?  ');
pulo=200;

fazMovie = input('Deseja mostrar o filme ou nao (y, or n) ?   ');
%fazMovie='n';

deltaT = input('Qual o Delta T [s] ?  ');
%deltaT=0.05

%Dx = input('Qual o Delta X [m] ?');
%Dx = 0.0033
%Dx = 0.01;

%Dy = input('Qual o Delta Y [m]?');
%Dy = Dx

%loga=input('Logaritmic (1) or normal (2) ? ');
loga=2;

%triset=input('Temperature Rise (1) or Absolute Temperature (2) ? '); 
triset = 2;

%Ambient Temperature:
Ta = 90; 
%Initial Temperature:
Ti= 450;

%minF = input ('Minimo da animacao ? ');
minF = Ta;
maxF = Ti;

%maxmin=input('Set max and min (1) or not (2) ? ');
maxmin=1;
if maxmin==1
   %escolhe=input('Choose max and min (1) or not (2) ? ');
   escolhe=1;
end
if maxmin==1
   if (escolhe==1)
      %maximo=input('Digite o MAXIMO : ');
      maximo = Ti;
      %minimo=input('Digite o MINIMO : ');
      minimo = Ta;
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
      minmm=50000;
      maxmm=0;
      for xc=1:size(data2,2),
          for yc=1:size(data2,3),
              mm(xc,yc) = data2(tt,xc,yc) ;             
              if (mm(xc,yc) > Ta)                 
                  media = media + mm(xc,yc);
                  valmed= valmed+1;   
                  if mm(xc,yc)<=minmm
                      minmm=mm(xc,yc);
                  end                  
                  if mm(xc,yc)>=maxmm
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
      else
          mediaCopo(tt) = 0;
          mediaCopoF(tt) = ((9/5)*mediaCopo(tt))+32;
          minCopo(tt) = minmm;
          maxCopo(tt) = maxmm;
      end      
     if (fazMovie=='y')
         pcolor(mm');
         %caxis([minF maxF]);
         colorbar;
         texto = sprintf('Heat Propagation in t = %4.4f s', t*deltaT);
         title(texto);
         xlabel('Distance in X'); ylabel('Distance in Y');

         M(:,tt) = getframe(gcf);
    end

  end

end
chdir(curdir);

end

%if (fazMovie=='y')
%    movie(gcf, M)
%end

figure;
%CASO 1
%ho = 75; %[W/m2.K]
%k = 52; %[W/m.K]
%Bi = ho*ro/k;
%betai = 0.505; % betai * cotan(betai) = Bi... qual a formula inversa???
%C1 =  4*(sin(betai) - betai*cos(betai) ) / ( 2*betai - sin(2*betai) );
%alfa = 1.7e-5;
%i=1;
%ro = 0.06;%[m]
%for (iii=1:tt)
%    tmc(iii) = (iii-1)*deltaT*pulo;
%    tstar = alfa*tmc(iii)/(ro*ro);
%   if (tstar>0.2)
%        Tetac = C1*exp(-betai^2*tstar);
%        Tcomp(iii) = Ta + Tetac*(Ti -Ta);
%   else
%        Tcomp(iii) = Ti;
%    end
%    %Para a borda:
%    r = ro; %borda;
%    TetaExact = C1 * ro * exp(-betai^2 * alfa * tmc(iii) /(ro^2) ) * sin(betai*r/ro) / (r*betai);
%    TempExact(iii) = Ta + TetaExact*(Ti -Ta);
%    erroperc(iii) = 100*(Tcomp(iii)-maxCopo(iii))/Tcomp(iii);
%end

%CASO 2:
ho = 115;
k = 46;
ro=8000;
Cp = 420; %[J/kg.oC] --> a conversao ja' esta' incluida na formulacao
i=1;
R=0.05/2;
K=46;
Bi = ho*R/K;
C1 = 1.0186752; beta1=0.43035;
alfa = K/(ro*Cp);
for (iii=1:tt)
    tmc(iii) = (iii-1)*deltaT*pulo;
    Tcomp(iii) = Ta + (Ti -Ta)*exp(-3*ho*tmc(iii)/(ro*Cp*R));

    tstar = alfa*tmc(iii)/(R^2);
    if (tstar>0.2)
	TCenter(iii) = Ta + (Ti-Ta)*C1*exp(-(beta1*beta1)*tstar);
        tetaC = (TCenter(iii)-Ta)/(Ti-Ta);
        tetaS = tetaC*sin(beta1)/beta1;
        TBorder(iii) = Ta + tetaS*(Ti-Ta);
    else
	TCenter(iii) = Ti;
        TBorder(iii) = Ti;
    end

    Tlumped(iii) =  Ta + (Ti-Ta)*exp(-ho*tmc(iii)/(ro*Cp*(R*2/6)));

    erropercC(iii) = 100*(TCenter(iii)-maxCopo(iii))/TCenter(iii);
    erropercS(iii) = 100*(TBorder(iii)-minCopo(iii))/TBorder(iii);
    erropercL(iii) = 100*(Tlumped(iii)-mediaCopo(iii))/Tlumped(iii);
end

%figure;
erromaxC = max(abs(erropercC))
%plot(tmc, Tcomp, 'b-', tmc, TempExact, 'g-', tmc, maxCopo, 'r-', tmc, mediaCopo, 'k-', tmc, minCopo, 'k*');
%legend('Analytical Approx', 'Analytical Exact', 'Calculated - Max', 'Calculated - Av', 'Calculated - MIn');
%plot(tmc, Tcomp, 'b-', tmc, TCenter, 'b*', tmc, mediaCopo, 'r-', tmc, maxCopo, 'r*', tmc, minCopo, 'ro');
%legend('Analytical - Average', 'Analytical - Center', 'Calculated - Average',  'Calculated - Center', 'Calculated - Min');
%plot(tmc, TCenter, 'b-', tmc, maxCopo, 'r*'); legend('Analytical - Center', 'Calculated - Center');
%title('Temperature');
%xlabel('Time in Seconds'); ylabel('Temperature in oC');
%text(60,160,'Maximum Error [%] = '); text(60,140,num2str(erromaxC));

%figure;
erromaxL = max(abs(erropercL))
%plot(tmc, Tlumped, 'b-', tmc, maxCopo, 'r*'); legend('Analytical Lumped', 'Calculated Lumped');
%title('Temperature');
%xlabel('Time in Seconds'); ylabel('Temperature in oC');
text(60,160,'Maximum Error [%] = '); text(60,140,num2str(erromaxL));

%figure;
erromaxS = max(abs(erropercS))
%plot(tmc, TBorder, 'b-', tmc, minCopo, 'r*'); legend('Analytical - Surface', 'Calculated - Surface');
%title('Temperature');
%xlabel('Time in Seconds'); ylabel('Temperature in oC');
%text(60,160,'Maximum Error [%] = '); text(60,140,num2str(erromaxS));

%figure;
%plot(tmc, Tlumped, 'b-', tmc, mediaCopo, 'r-', tmc, TBorder, 'b*', tmc, minCopo, 'r*',tmc, TCenter, 'bo', tmc, maxCopo, 'ro');
%legend('Analytical Lumped', 'Calculated Lumped','Analytical - Surface', 'Calculated - Surface','Analytical - Center', 'Calculated - Center');
%axis([0 max(tmc) 100 450]);
%title('Temperature');
%xlabel('Time in Seconds'); ylabel('Temperature in oC');
%text(60,160,'Maximum Error [%] = '); text(60,140,num2str(erromaxL));

%figure;
plot(tmc, TBorder, 'b-*', tmc, minCopo, 'r-*',tmc, TCenter, 'b-', tmc, maxCopo, 'r-');
legend('Analytical - Surface', 'Calculated - Surface','Analytical - Center', 'Calculated - Center');
axis([0 max(tmc) 100 450]);
%title('Temperature');
xlabel('Time in Seconds'); ylabel('Temperature in oC');
text(60,160,'Maximum Error Center  [%] = '); text(60,140,num2str(erromaxC));
text(90,160,'Maximum Error Surface [%] = '); text(90,140,num2str(erromaxS));

