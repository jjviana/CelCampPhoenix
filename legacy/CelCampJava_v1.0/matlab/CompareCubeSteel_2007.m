%============================================================================
disp(' ')
disp('***********************************************************')
disp('*     This program was developed by Rodrigues, A.O.       *')
disp('* It can be used freely as long as the source is quoted.  *')
disp('*                     April/2007.                         *')
disp('***********************************************************')
disp(' ')
clear;

clear;
close all;

arquivo='/home/juliano/AAA_AnaPermanente/CelCampJava_v1.0/results/TMinAvMax.txt';
s1=fopen(arquivo, 'r');
frewind(s1);
line = fgetl(s1); %pega o Nmax
Nmax = str2num(line)-1;
line = fgetl(s1); %pega o Skip
skip = str2num(line);

dt = 1;% 1s


Tenv = 90; %oC
Tinit = 450; %oC

%n=1;
%Min(n) = Tinit;
%Avg(n) = Tinit;
%Max(n) = Tinit;
%AnalyticSurface(n)   = Tinit;
%AnalyticLumped(n)   = Tinit;
%AnalyticCenter(n)  = Tinit;
%t(n) = 0;
   
for n=1:(Nmax-1)/skip,
    n
    line = fgetl(s1);
    line2 = str2num(line);
    Min(n) = line2(1);
    Avg(n) = line2(2);
    Max(n) = line2(3);
    t(n) = n;
        
    time=(n-1)*dt*skip;
    lacochambre = 1;
    AnalyticSurface(n)   = Tenv+355.51*exp(-0.004056*time); %equivalente ao minimo
    AnalyticLumped(n)   = Tenv+360*exp(-0.0041*time); %equivalente ao medio
    AnalyticCenter(n)  = Tenv+366.72*exp(-0.004056*time); %equivalente ao maximo
end

fclose(s1);

ErrorMax = max(max(abs(100*(AnalyticCenter-Max)./AnalyticCenter)));
ErrorAvg = max(max(abs(100*(AnalyticLumped-Avg)./AnalyticLumped)));
ErrorMin = max(max(abs(100*(AnalyticSurface-Min)./AnalyticSurface)));

%step = 10;
%AnalyticSurface = AnalyticSurface(1:step:size(AnalyticSurface,2));
%AnalyticCenter = AnalyticCenter(1:step:size(AnalyticCenter,2));
%AnalyticLumped = AnalyticLumped(1:step:size(AnalyticLumped,2));
%Min = Min(1:step:size(Min,2));
%Max = Max(1:step:size(Max,2));
%Avg = Avg(1:step:size(Avg,2));
%t = t(1:step:size(t,2));

figure; hold on;
plot(t,AnalyticSurface,'b',t, AnalyticLumped,'r', t, AnalyticCenter, 'k',t,Min,'b+-',t,Avg,'r+-',t,Max,'k+-'); 
textoErro = sprintf('Erro na superficie = %0.2f%% \n Erro Medio = %0.2f%% \n Erro no Centro = %0.2f%%',ErrorMin, ErrorAvg, ErrorMax); 
lugarx = 10;
lugary = 390;
text(lugarx,lugary,textoErro);
axis tight;
xlabel('Time [s]'); ylabel('Temperature [oC]');
legend('Analytic Surface','Analytic Lumped','Analytic Center','Calculated Minimun','Calculated Average','Calculated Maximum');
title('Cooling of sphere');

cd '/home/juliano/AAA_AnaPermanente/CelCampJava_v1.0/matlab';

