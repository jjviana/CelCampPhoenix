%Schaum's Solved Problems Series
%1000 Solved Problems in HEAT TRANSFER
%Donald R. Pitts, Leighton E. Sisson
%McGraw-Hill, Inc. 1991
%Chapter 3 - Nonsteady Conduction: Problem 3.19 and Problem 3.20
%      Compare the temperature responses of a 0.016-in.-diam. aluminium wire
%      initially at 400oF when the wire is suddenly exposed to:
%      a) forced air at 100oF (hbarra = 12 Btu/h.ft2.oF)
%      b) still air at 100oF (hbarra = 2 Btu/h.ft2.oF)

%SOLUTION:
%   From table B-1 for aluminium at Tavg = 250oF:
%       k = 121 Btu/h.ft.oF    c = 0.208 Btu/lbm.oF     ro = 169 lbm/ft3
%   We have:
%       Bi(still) = hbarra(still)*(D/4) / k = 2*(0.004/12) / 121 = 0.55e-5
%       Bi(forced) = 12/2 * (0.55e-5) = 3.3e-5
%   Therefore, lumped analysis can be used in either case. 
%   Applying (V/As = D/4) in the governing equation below:
%       (T-Tinf) / (Ti - Tinf) = exp [ - t * (hbarra * As) / (ro . c . V) ]  
%   we have:
%     (T-Tinf) / (Ti - Tinf) = exp [ - (4*hbarra / (ro c D) ) * t ]
%   or 
%     T = Tinf + (Ti-Tinf) * exp [ (-4*hbarra / (ro c D)) * t ]
%     Tstill = 100 + 300 * exp(-1024.1 t)    ----- t expressed in hours
%     Tforced = 100 + 300 * exp(-170.69 t)   --- t expressed in hours 
cont=1;
DT = 0.1/(60*60);
N = 1000;

for (t=0:DT:N*DT)    
    %a) Forced Air:         
     TFforced(cont) = 100+300*exp(-1024.1*t);
     Tforced(cont) = (5/9) *(TFforced(cont)-32);
     %b) Still Air:
     TFstill(cont) = 100+300*exp(-170.69*t);
     Tstill(cont) = (5/9) *(TFstill(cont)-32);
     
      vart(cont)=t*60*60;          
      cont=cont+1;
  end
figure;
plot(vart, Tstill, vart, Tforced); title('Temperature in Celcius');xlabel('Time in Seconds'); ylabel('Temperature in oC');legend('Still Air', 'Forced Air');
figure;
plot(vart/(60*60), TFstill, vart/(60*60), TFforced); title('Temperature in Farenheit');xlabel('Time in Hours'); ylabel('Temperature in F');legend('Still Air', 'Forced Air');