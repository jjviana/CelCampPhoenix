figure;
for (iii=1:size(mediaCopo,2))
    tmc(iii) = iii*deltaT*pulo;
end
plot(tmc, mediaCopo);
