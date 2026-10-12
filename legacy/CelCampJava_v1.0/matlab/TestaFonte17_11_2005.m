clear;
fid = fopen('PointN1.txt');
frewind(fid);
n=str2num(fgetl(fid));
dt=str2num(fgetl(fid));
time = 0:n-1;
time = time*dt;
for (i=1:n)
    data=fgetl(fid);
    d(i) = str2num(data);
end
fclose(fid);
plot(time,d);
xlabel('time (s)');
ylabel('Field (A/m)');
title('Source Field in Time');
