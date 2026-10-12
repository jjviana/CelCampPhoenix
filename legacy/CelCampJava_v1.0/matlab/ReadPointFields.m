
% This function reads the electric and magnetic fields for
% a point and returns them in the following order: Ex,Ey,Ez,Hx,Hy,Hz
function [Fields]=ReadPointFields(dirbase,cx,cy,cz)
current=pwd;
chdir(dirbase);
%Constants:
%----------
% Abre os arquivos correspondentes
arq1=sprintf('Hx%d_%d_%d.txt',cx,cy,cz);   
arq2=sprintf('Hy%d_%d_%d.txt',cx,cy,cz);   
arq3=sprintf('Hz%d_%d_%d.txt',cx,cy,cz);   
arq4=sprintf('Ex%d_%d_%d.txt',cx,cy,cz);   
arq5=sprintf('Ey%d_%d_%d.txt',cx,cy,cz);   
arq6=sprintf('Ez%d_%d_%d.txt',cx,cy,cz);
s1=fopen(arq1, 'r');      s2=fopen(arq2, 'r');      s3=fopen(arq3, 'r');
s4=fopen(arq4, 'r');      s5=fopen(arq5, 'r');      s6=fopen(arq6, 'r');
frewind(s1);  frewind(s3);  frewind(s5);  
frewind(s2);  frewind(s4);  frewind(s6);     
line = fgetl(s1);     
Fields.xS = str2num(line); %finds the source location center in X
line = fgetl(s1);     
Fields.yS = str2num(line); %finds the source location center in Y
line = fgetl(s1);     
Fields.zS = str2num(line); %finds the source location center in Z
line = fgetl(s1);     
Fields.SourceSize = str2num(line); %finds the source size
line = fgetl(s1);     
Fields.Dx = str2num(line); %finds the Delta X
line = fgetl(s1);     
Fields.Dy = str2num(line); %finds the Delta Y
line = fgetl(s1);     
Fields.Dz = str2num(line); %finds the Delta Z
line = fgetl(s1);     
Fields.freq = str2num(line); %finds the frequency
line = fgetl(s1);     
Fields.NumCalc=str2num(line); %finds the number of calculations
line = fgetl(s1);     
Fields.deltaT=str2num(line); %finds the deltaT
line = fgetl(s1);     
Fields.xP=str2num(line); %finds the x coordinate of the point
line = fgetl(s1);     
Fields.yP=str2num(line); %finds the y coordinate of the point
line = fgetl(s1);     
Fields.zP=str2num(line); %finds the z coordinate of the point
line = fgetl(s1);     
Fields.TimeReduction=str2num(line); %finds the reduction in time
line = fgetl(s1);     
Fields.Im=str2num(line); %finds the value of the Current 

for (i=1:15) 
   jogafora=fgetl(s2);         jogafora=fgetl(s3);
   jogafora=fgetl(s4);         jogafora=fgetl(s5);
   jogafora=fgetl(s6);
end

for (calc=1:Fields.NumCalc)   
   line=fgetl(s1);
   HXfdtd(calc)=str2num(line);
end
fclose(s1);      

for (calc=1:Fields.NumCalc)   
   line=fgetl(s2);
   HYfdtd(calc)=str2num(line);
end
fclose(s2);      

for (calc=1:Fields.NumCalc)   
   line=fgetl(s3);
   HZfdtd(calc)=str2num(line);
end
fclose(s3);      

for (calc=1:Fields.NumCalc)   
   line=fgetl(s4);
   EXfdtd(calc)=str2num(line);
end
fclose(s4);      

for (calc=1:Fields.NumCalc)   
   line=fgetl(s5);
   EYfdtd(calc)=str2num(line);
end
fclose(s5);      

for (calc=1:Fields.NumCalc)   
   line=fgetl(s6);
   EZfdtd(calc)=str2num(line);
end
fclose(s6);      
Fields.Ex=EXfdtd;
Fields.Ey=EYfdtd;
Fields.Ez=EZfdtd;
Fields.Hx=HXfdtd;
Fields.Hy=HYfdtd;
Fields.Hz=HZfdtd;
chdir(current);
