% Reads the electric and magnetic fields of a slice of fields.

function [Fields]=ReadSliceFields(basedir,slicenum,orient)
curdir=pwd;
chdir(basedir);
arqex=fopen(sprintf('ex%d.txt',slicenum),'r');
arqey=fopen(sprintf('ey%d.txt',slicenum),'r');
arqez=fopen(sprintf('ez%d.txt',slicenum),'r');
arqhx=fopen(sprintf('hx%d.txt',slicenum),'r');
arqhy=fopen(sprintf('hy%d.txt',slicenum),'r');
arqhz=fopen(sprintf('hz%d.txt',slicenum),'r');

Fields.Ex=ReadSliceFile(arqex,orient);
Fields.Ey=ReadSliceFile(arqey,orient);
Fields.Ez=ReadSliceFile(arqez,orient);
Fields.Hx=ReadSliceFile(arqhx,orient);
Fields.Hy=ReadSliceFile(arqhy,orient);
Fields.Hz=ReadSliceFile(arqhz,orient);

fclose(arqex);
fclose(arqey);
fclose(arqez);
fclose(arqhx);
fclose(arqhy);
fclose(arqhz);
chdir(curdir);

function [Field]=ReadSliceFile(f,orient)

line=fgets(f);
Field.SizeX=str2num(line);
line=fgets(f);
Field.SizeY=str2num(line);
line=fgets(f);
Field.SizeZ=str2num(line);
if orient=='z'
    lim1=Field.SizeX;
    lim2=Field.SizeY;
end
if orient=='y'
    lim1=Field.SizeX;
    lim2=Field.SizeZ;
end
if orient=='x'
    lim1=Field.SizeY;
    lim2=Field.SizeZ;
end
if feof(f)
    Field.data=zeros(lim1,lim2);
else    
    for i=1:lim1
        for j=1:lim2
            line=fgets(f);    
            Field.data(i,j)=str2num(line);
        end
    end
end
