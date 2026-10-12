% Plots the fields of a slice as a pcolor using 
% a fixed or variable scale and normal or log ploting

function PlotSliceFields(Fields,HEx,HEy,HEz,HHx,HHy,HHz,islog,minlog,mincaxis,maxcaxis)

% Assumes a figure to be currently active

PlotField(HEx,'Ex',islog,minlog,mincaxis,maxcaxis,Fields.Ex);
PlotField(HEy,'Ey',islog,minlog,mincaxis,maxcaxis,Fields.Ey);
PlotField(HEz,'Ez',islog,minlog,mincaxis,maxcaxis,Fields.Ez);
PlotField(HHx,'Hx',islog,minlog,mincaxis,maxcaxis,Fields.Hx);
PlotField(HHy,'Hy',islog,minlog,mincaxis,maxcaxis,Fields.Hy);
PlotField(HHz,'Hz',islog,minlog,mincaxis,maxcaxis,Fields.Hz);

function PlotField(H,tit,islog,minlog,mincaxis,maxcaxis,Field)
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
if ~isinf(mincaxis)
    caxis([mincaxis maxcaxis]);
end
axis([1 Field.SizeX 1 Field.SizeY]);
colorbar; axis image; axis off;

title(tit);
