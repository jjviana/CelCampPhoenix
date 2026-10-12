figure;
filminho=avifile('CampoEH.avi');
for (cont=1:size(M,2))   
    movie(gcf, M(:,cont));
    quadro=getframe(gcf);
    filminho=addframe(filminho, quadro);
end
filminho=close(filminho);