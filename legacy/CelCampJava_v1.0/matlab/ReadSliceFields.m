% Reads the electric and magnetic fields of a slice of fields.

function [Fields]=ReadSliceFields(basedir,slicenum)
curdir=pwd;
chdir(basedir);
arqex=fopen(sprintf('ex%d.txt',slicenum),'r');
arqey=fopen(sprintf('ey%d.txt',slicenum),'r');
arqez=fopen(sprintf('ez%d.txt',slicenum),'r');
arqhx=fopen(sprintf('hx%d.txt',slicenum),'r');
arqhy=fopen(sprintf('hy%d.txt',slicenum),'r');
arqhz=fopen(sprintf('hz%d.txt',slicenum),'r');

Fields.Ex=ReadSliceFile(arqex);
Fields.Ey=ReadSliceFile(arqey);
Fields.Ez=ReadSliceFile(arqez);
Fields.Hx=ReadSliceFile(arqhx);
Fields.Hy=ReadSliceFile(arqhy);
Fields.Hz=ReadSliceFile(arqhz);
fclose(arqex);
fclose(arqey);
fclose(arqez);
fclose(arqhx);
fclose(arqhy);
fclose(arqhz);
chdir(curdir);

function [Field]=ReadSliceFile(f)

line=fgets(f);
Field.SizeX=str2num(line);
line=fgets(f);
Field.SizeY=str2num(line);
line=fgets(f);
Field.SizeZ=str2num(line);
if feof(f)
    Field.data=zeros(Field.SizeX,Field.SizeY);
else
    for i=1:Field.SizeX
        for j=1:Field.SizeY
            line=fgets(f);
            Field.data(i,j)=str2num(line);
        end
    end
end
