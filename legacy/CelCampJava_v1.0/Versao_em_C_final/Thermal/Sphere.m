clear;
%Calculates the temperature in a sphere;
n = input('Quantos Instantes de tempo ?')
%n= 5000; %[1]

deltaT = 0.1; %[s]
ho = 75; %[W/m2.K]
ro = 0.06; %[m]
k = 52; %[W/m.K]
Bi = ho*ro/k;
betai = 0.505; % betai * cotan(betai) = Bi... qual a formula inversa???
C1 =  4*(sin(betai) - betai*cos(betai) ) / ( 2*betai - sin(2*betai) );
alfa = 1.7e-5;
Ti = 200; %[oC]
To = 20; %[oC]

r = ro; %borda;
i=1;
for (nn=0: 1:n)
    tempo(i) = nn*deltaT;
    tstar = alfa*tempo(i)/(ro^2);
    if tstar>0.2
        Tetac = C1*exp(-betai^2*tstar);
        Temp(i) = To + Tetac*(Ti -To);
    else
        Temp(i) = Ti;
    end
    TetaExact = C1 * ro * exp(-betai^2 * alfa * tempo(i)/(ro^2) ) * sin(betai*r/ro) / (r*betai);
    TempExact(i) = To + TetaExact*(Ti -To);    
    i=i+1;    
end

figure;
plot(tempo, Temp, tempo, TempExact); xlabel('Time (s)'); ylabel('Temperature (oC)'); legend('Approx', 'Exact'); 