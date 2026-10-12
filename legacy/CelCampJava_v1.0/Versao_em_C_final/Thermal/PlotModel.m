clear;
basedir=input('Qual o diretorio (ex:DataFilesTest) ? ');
curdir=pwd;
chdir(basedir);

delta=input('Qual o Delta no espaco? ')
%delta=812.8e-6/2;

%Para X:
figure;
f=fopen(sprintf('Modelx.txt'),'r');
if (f==-1)
    disp('It was not possible to open "Modelx.txt" file!');
else   
    line=fgets(f);   SizeX=str2num(line);
    line=fgets(f);   SizeY=str2num(line);
    if feof(f)      data=zeros(SizeX,SizeY);         
    else    	
        for i=1:SizeX,
            for j=1:SizeY, 
                line=fgets(f);    
                data(i,j)=str2num(line);
            end  
        end 
    end
    fclose(f); pcolor(data');
    colorbar;
    %title('Model in X=XS');
    %colormap(pink);
    a = sprintf('Cubes in Y (1 cube = %.5f m)',delta/2);    xlabel(a);
    a= sprintf('Cubes in Z(1 cube = %.5f m)',delta/2);    ylabel(a);
end

clear data;
%Para Y:
figure;
f=fopen(sprintf('Modely.txt'),'r');
if (f==-1)
    disp('It was not possible to open "Modely.txt" file!');
else
    line=fgets(f);   SizeX=str2num(line);
    line=fgets(f);   SizeY=str2num(line);
    if feof(f)      data=zeros(SizeX,SizeY);
    else
        for i=1:SizeX,
            for j=1:SizeY,
                line=fgets(f);
                data(i,j)=str2num(line);
            end
        end
     end
     fclose(f); pcolor(data');
     colorbar;
     %title('Model in Y=YS');
     %colormap(pink);
      a = sprintf('Cubes in X (1 cube = %.5f m)',delta/2);    xlabel(a);
      a= sprintf('Cubes in Z(1 cube = %.5f m)',delta/2);    ylabel(a);

end
clear data;
%Para Z:
figure;
f=fopen(sprintf('Modelz.txt'),'r');
if (f==-1)
    disp('It was not possible to open "Modelz.txt" file!');
else
    line=fgets(f);   SizeX=str2num(line);
    line=fgets(f);   SizeY=str2num(line);
    if feof(f)      data=zeros(SizeX,SizeY);
    else
        for i=1:SizeX,
            for j=1:SizeY,
                line=fgets(f);
                data(i,j)=str2num(line);
            end
        end
    end
    fclose(f); pcolor(data');
    colorbar;
    %title('Model in Z=ZS');
    %colormap(pink);
    a = sprintf('Cubes in X (1 cube = %.5f m)',delta/2);    xlabel(a);
    a= sprintf('Cubes in Y(1 cube = %.5f m)',delta/2);    ylabel(a);
end

chdir(curdir);