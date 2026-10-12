
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
 maxxaxis=Fields.NumCalc*Fields.TimeReduction*Fields.deltaT;

     
%H:
%Plot the results:
%-----------------
PlotField(HHx.fig,HHx.sub,'Values of Hx in time','time(s)','Hx(A/m)',cor,tt,Fields.Hx);
PlotField(HHy.fig,HHy.sub,'Values of Hy in time','time(s)','Hy(A/m)',cor,tt,Fields.Hy);
PlotField(HHz.fig,HHz.sub,'Values of Hz in time','time(s)','Hz(A/m)',cor,tt,Fields.Hz);
%E:
%Plot the results:
%-----------------
PlotField(HEx.fig,HEx.sub,'Values of Ex in time','time(s)','Ex(V/m)',cor,tt,Fields.Ex);
PlotField(HEy.fig,HEy.sub,'Values of Ey in time','time(s)','Ey(V/m)',cor,tt,Fields.Ey);
PlotField(HEz.fig,HEz.sub,'Values of Ez in time','time(s)','Ez(V/m)',cor,tt,Fields.Ez);

function PlotField(Hfig,Hsub,tit,xl,yl,cor,xdata,Field)
figure(Hfig);
subplot(Hsub);
plot(xdata,Field.data,cor);
if isfield(Field,'miny')
    axis([0 max(xdata) Field.miny Field.maxy]);
end
title(tit);
xlabel(xl);
ylabel(yl);

