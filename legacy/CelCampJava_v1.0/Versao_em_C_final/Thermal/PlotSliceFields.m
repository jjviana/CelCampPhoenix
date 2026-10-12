% Plots the fields of a slice as a pcolor using 
% a fixed or variable scale and normal or log ploting

function PlotSliceFields(Fields,HEx,HEy,HEz,HHx,HHy,HHz,islog,minlog, i)

% Assumes a figure to be currently active
nome=sprintf('Ex at N=%d',i);
PlotField(HEx,nome,islog,minlog,Fields.Ex);
nome=sprintf('Ey at N=%d',i);
PlotField(HEy,nome,islog,minlog,Fields.Ey);
nome=sprintf('Ez at N=%d',i);
PlotField(HEz,nome,islog,minlog,Fields.Ez);

nome=sprintf('Hx at N=%d',i);
PlotField(HHx,nome,islog,minlog,Fields.Hx);
nome=sprintf('Hy at N=%d',i);
PlotField(HHy,nome,islog,minlog,Fields.Hy);
nome=sprintf('Hz at N=%d',i);
PlotField(HHz,nome,islog,minlog,Fields.Hz);

function PlotField(H,tit,islog,minlog,Field)
subplot(H);
% Adiciona uma linha e uma coluna para o pcolor
Field.data=[Field.data ; zeros(1,size(Field.data,2))];
Field.data=[Field.data zeros(size(Field.data,1),1)];


if islog==0
    pcolor(Field.data'); 
else
    for i=1:Field.SizeX+1
        for j=1:Field.SizeY+1
            if Field.data(i,j)==0
                logdata(i,j)=minlog;
            else
                logdata(i,j)=log10(abs(Field.data(i,j)));
            end
        end
    end
    pcolor(logdata');
end
shading flat;
if isfield(Field,'mincaxis')
    caxis([Field.mincaxis Field.maxcaxis]);
end
axis([1 Field.SizeX 1 Field.SizeY]);
colorbar; axis image; axis off;

title(tit);
