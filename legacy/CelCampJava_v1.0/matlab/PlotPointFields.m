
% This function plots the Electric and Magnetic fields as line graphs

function PlotPointFields(Fields,HEx,HEy,HEz,HHx,HHy,HHz,cor)
%Constants:
%----------
c=3e8; epsonZero=8.854e-12; miZero=1.257e-6; niZero=sqrt(miZero/epsonZero);
PI=pi;
indice=0;
for TimeStep=1:(1*Fields.TimeReduction):(Fields.NumCalc*Fields.TimeReduction)
      t=(TimeStep-1)*Fields.deltaT; %picoseconds                     
      indice=indice+1;
      tt(indice)=t;
      end

%H:
%FIGH=figure;
%Plot the results:
%-----------------
figure(HHx.fig);
subplot(HHx.sub);
%plot(tt,HXfdtd,'r',tt,HXanalitic,'b', tt, HXhayt, 'g');
plot(tt,Fields.Hx,cor);
title('Values of Hx in time');
xlabel('time(s)');      ylabel('Hx(A/m)');

figure(HHy.fig);
subplot(HHy.sub);
%plot(tt,HYfdtd,'r',tt,HYanalitic,'b', tt, HYhayt, 'g');
plot(tt,Fields.Hy,cor)
title('Values of Hy in time');
xlabel('time(s)');      ylabel('Hy(A/m)');

figure(HHz.fig);
subplot(HHz.sub);
%plot(tt,HZfdtd,'r',tt,HZanalitic,'b', tt, HZhayt, 'g');
plot(tt,Fields.Hz,cor);
title('Values of Hz in time');
xlabel('time(s)');      ylabel('Hz(A/m)');

%subplot(2,2,4);      axis off;
%ponto=sprintf('X= %d Y= %d Z= %d',Fields.xP,Fields.yP,Fields.zP);      text(0.1,0.9,ponto);
%text(0.1,0.7,'NX:');
%text(0.3,0.7,num2str(NormaX));
%text(0.1,0.6,'NY:');
%text(0.3,0.6,num2str(NormaY));
%text(0.1,0.5,'Values on the point:');
%text(0.2,0.4,'x=');      text(0.3,0.4,num2str(x));
%text(0.6,0.4,'y=');      text(0.7,0.4,num2str(y));
%text(0.1,0.3,'LINES:');
%text(0.2,0.2,'blue = Analitical Solution');      text(0.2,0.1,'red = FDT-TD');	

%E:
%FIGE=figure;
%Plot the results:
%-----------------
figure(HEx.fig);
subplot(HEx.sub);
%plot(tt,EXfdtd,'r',tt,EXanalitic,'b', tt, EXhayt, 'g');
plot(tt,Fields.Ex,cor);
title('Values of Ex in time');
xlabel('time(s)');      ylabel('Ex(V/m)');

figure(HEy.fig);
subplot(HEy.sub);
%plot(tt,EYfdtd,'r',tt,EYanalitic,'b', tt, EYhayt, 'g');
plot(tt,Fields.Ey,cor);
title('Values of Ey in time');
xlabel('time(s)');      ylabel('Ey(V/m)');

figure(HEz.fig);
subplot(HEz.sub);
%plot(tt,EZfdtd,'r',tt,EZanalitic,'b', tt, EZhayt, 'g');
plot(tt,Fields.Ez,cor);
title('Values of Ez in time');
xlabel('time(s)');      ylabel('Ez(V/m)');

%subplot(2,2,4);      axis off;
%ponto=sprintf('X= %d Y= %d Z= %d',Fields.xP,Fields.yP,Fields.zP);
%text(0.1,0.9,ponto);
%text(0.1,0.5,'Values on the point:');
%text(0.2,0.4,'x=');      text(0.3,0.4,num2str(x));
%text(0.6,0.4,'y=');      text(0.7,0.4,num2str(y));
%text(0.1,0.3,'LINES:');
%text(0.2,0.2,'blue = Analitical Solution');      text(0.2,0.1,'red = FDT-TD');	            

