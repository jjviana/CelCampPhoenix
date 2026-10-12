disp(' ')
disp('***********************************************************')
disp('*                 COMPARADIPOLE.M                         *')
disp('***********************************************************')
disp('*     This program was developed by Rodrigues, A.O.       *')
disp('*   Oriented by Ramirez. J. A. and Vasconcelos J. A.      *')
disp('*   (with a little help of Viana, J.J :) )                *')
disp('* It can be used freely as long as the source is quoted.  *')
disp('*                     Feb/2002.                           *')
disp('***********************************************************')
disp(' ')

clear;

%===================== INITIAL DATA ==========================================

dirbase=input('Diretorio dos resultados: ');
%dirbase='resCC';

ssx=50; ssy=76; ssz=76;
%s1=2; s2=10; s3=20; s4=30; s5=40; s6=50;
%Px=[ssx ssx ssx ssx ssx ssx ssx ssx+s1 ssx+s2 ssx+s3 ssx+s1 ssx+s2 ssx+s3 ssx+s4 ssx+s5 ssx+s6];
%Py=[ssy ssy ssy ssy ssy+s1 ssy+s2 ssy+s3 ssy ssy ssy ssy+s1 ssy+s2 ssy+s3 ssy+s4 ssy+s5 ssy+s6];   
%Pz=[ssz ssz+s1 ssz+s2 ssz+s3 ssz ssz ssz ssz ssz ssz ssz+s1 ssz+s2 ssz+s3 ssz+s4 ssz+s5 ssz+s6];
%s0=0; s1=2; s2=4; s3=6; s4=8; s5=10;
%s6=20; s7=26; s8=30; s9=36; s10=40; s11=46;
%Px=[ssx+s0 ssx+s1 ssx+s2 ssx+s3 ssx+s4 ssx+s5 ssx+s6 ssx+s7 ssx+s8 ssx+s9 ssx+s10 ssx+s11 ssx+s0 ssx+s0 ssx+s0 ssx+s0 ssx+s0 ssx+s0 ssx+s0 ssx+s0 ssx+s0 ssx+s0 ssx+s0 ssx+s0];
%Py=[ssy+s0 ssy+s1 ssy+s2 ssy+s3 ssy+s4 ssy+s5 ssy+s6 ssy+s7 ssy+s8 ssy+s9 ssy+s10 ssy+s11 ssy+s0 ssy+s1 ssy+s2 ssy+s3 ssy+s4 ssy+s5 ssy+s6 ssy+s7 ssy+s8 ssy+s9 ssy+s10 ssy+s11];   
%Pz=[ssz+s0 ssz+s1 ssz+s2 ssz+s3 ssz+s4 ssz+s5 ssz+s6 ssz+s7 ssz+s8 ssz+s9 ssz+s10 ssz+s11 ssz+s0 ssz+s1 ssz+s2 ssz+s3 ssz+s4 ssz+s5 ssz+s6 ssz+s7 ssz+s8 ssz+s9 ssz+s10 ssz+s11];
Px= [ssx ssx     ssx     ssx     ssx    ssx       ssx      ssx      ssx       ssx      ssx      ssx      ssx       ssx      ssx      ssx       ssx       ssx       ssx      ssx      ssx      ssx       ssx      ssx      ssx      ssx      ssx       ssx      ssx       ssx      ssx      ssx       ssx      ssx     ];
Py= [ssy ssy+2 ssy+4 ssy+6 ssy+8 ssy+10 ssy+12 ssy+14 ssy+16 ssy+18 ssy+20 ssy+22 ssy+24 ssy+26 ssy+28 ssy+30 ssy+32 ssy+34 ssy+36 ssy+38 ssy+40 ssy+42 ssy+44 ssy+46 ssy+48 ssy+50 ssy+52 ssy+54 ssy+56  ssy+58 ssy+60 ssy+62 ssy+64 ssy+66];     
Pz= [ssz ssz+2 ssz+4 ssz+6 ssz+8 ssz+10 ssz+12 ssz+14 ssz+16 ssz+18 ssz+20 ssz+22 ssz+24 ssz+26 ssz+28 ssz+30 ssz+32 ssz+34 ssz+36 ssz+38 ssz+40 ssz+42 ssz+44 ssz+46 ssy+48 ssy+50 ssy+52 ssy+54 ssy+56  ssy+58 ssy+60 ssy+62 ssy+64 ssy+66]; 
    
%maxmin=input('Deseja setar maximos e minimos (sim=1, nao=2) ? ');
maxmin=2;

gravacao=input('Deseja gravar as figuras dos resultados (sim=1, nao=2) ? ');
%gravacao=1;
if gravacao==1    mkdir('figres'); end

if gravacao==1
   plotar = 1;
else
   plotar=input('Deseja plotar as figuras dos resultados (sim=1, nao=2) ? ');
   %plotar=1;
end


%inicial=input('A partir de qual ponto ? ' );
%if (inicial<0 | inicial >size(Px,2))
%   inicial=1;
%end
inicial=1;

%final=input('Ate qual ponto ? ');
%if (final>size(Px,2) | final <inicial),
%   final=size(Px,2);
%end
final=size(Px,2);
%final = 20;

%dipsize=input('Digite o tamanho do dipolo (2=meia onda, 4=quarto de onda, etc..) : ');
dipsize=2;

%choice=input('Digite o valor que multiplica o delta : ');
choice=1; 

%reduzIo = input('Digite a reducao na corrente da Antena (I = Io / reducao) : ');
reduzIo=1;

% SOLUCOES OBTIDAS EM:
% 1a. REFERENCIA:
%    "Static and Dynamic Electricity", Third Edition, William R. Smythe,
%     McGraw-Hill Book Company, 1968, USA.
%    Chapter XII, section 12.01 - Spherical Electromagnetic Waves, Dipole and Quadrupole Radiation
%    REPRESENTACAO:
%                  +q                 -2q               +q
%                   o---------o---------o               (Figure 1.07)
%                          dz                  dz
%   PROBLEMA: 
%   Nao e' a solucao para a antena... e' para cargas soltas no espaco.
%
% 2a. REFERENCIA:
%    "Antennas and Propagation", Balanis, C.A.
%    Chapter 7.2 - Near-Fields of Dipole, pages 285-290
%    REPRESENTACAO:
%                        i(t) <-            -> i(t)
%                   --------- + ---------               (Figure 7.1)
%                -l/2                o                +l/2
%   PROBLEMA: 
%   As equacoes sao apresentadas apenas para o angulo fi=pi/2, ou seja, o plano y-z

for (Ponto=inicial:final)
   Ponto
   ppp(Ponto)=Ponto;
   %===================== READS ==============================================
   
   cx=Px(Ponto);   cy=Py(Ponto);   cz=Pz(Ponto);         
   Fields=ReadPointFields(dirbase,cx,cy,cz);
   
   %===================== FIELDS CALCULATED ==================================
   HxA=Fields.Hx.data;      HyA=Fields.Hy.data;      HzA=Fields.Hz.data;
   ExA=Fields.Ex.data;      EyA=Fields.Ey.data;      EzA=Fields.Ez.data;
      
   %===================== CALCULATES ANALYTICAL =============================      
   epzero=8.854e-12;   mizero=1.25663706144e-6;   c=3e8;
   deltaT=Fields.deltaT;    N=Fields.NumCalc;   
   Io=Fields.Im / reduzIo;  
   deltaX=Fields.Dx;   deltaY=Fields.Dy; deltaZ=Fields.Dz;       
   deltaX=choice*deltaX;   deltaY=choice*deltaY;   deltaZ=choice*deltaZ ;  
   Xsource=Fields.xS;   Ysource=Fields.yS;   Zsource=Fields.zS ;  
   freq=Fields.freq;   omega=2*3.14159265358979*freq;     reduzN=Fields.TimeReduction;
   
   %Antenna goes from -l/2 to +l/2; total size = l  
   lambida=c/freq;
   l=lambida/dipsize;    %Total Dipole Size    
   beta=omega/(3e8);  
   k=beta;
   ni=sqrt(mizero/epzero);       
   period=1/freq;
    x=(cx-Xsource)*deltaX/2;       y=(cy-Ysource)*deltaY/2;       z=(cz-Zsource)*deltaZ/2;                    
    r = sqrt( x^2 + y^2 + z^2);      R1=sqrt( x^2 + y^2 + (z-l/2)^2);      R2=sqrt( x^2 + y^2 + (z+l/2)^2);       

   for (conta=1:N)
      t(conta)=(conta)*deltaT*reduzN;          
      
      %HX (0,1,0):
     if (y==0)     Hfi=0; HxSimp=0;
     else         
         Hfi = - Io/(4*pi*j*y) * ( exp(-j*k*R1) + exp(-j*k*R2) - 2* cos(k*l/2) * exp(j*k*r) );  
     end;    
     defasa= 1;
      Hx(conta) = real ( exp(j*omega*t(conta) ) * Hfi *exp(-j*defasa));      
      HxSimp(conta) = (0.5)*Io/(4*pi*y) * ( 2 - 2* cos(k*l/2) ) * sin(k*r-omega*t(conta)+defasa);  

    if (conta>=N/2)
      tanalytic = ( asin( HxA(conta) * 4*pi*y / ( (0.5*Io * (2-2*cos(k*l/2)) ) ) ) + k*r - defasa) / omega; 
      tcalc = t(conta) ;
      tt = abs( tcalc - tanalytic);          
      ErrPhaseHx(Ponto, conta) = (tt/period) * 360;
      while (ErrPhaseHx(Ponto,conta) >= 90)
           ErrPhaseHx(Ponto,conta) = ErrPhaseHx(Ponto,conta) -90;
       end
   end
   
      
      %HY (1,0,0):
     Hy(conta) = 0;
     HySimp(conta)=0;
     ErrPhaseHy(Ponto, conta) =0;
       
      %HZ (1,1,1):
      Hz(conta)=0;
      HzSimp(conta)=0;
      ErrPhaseHz(Ponto, conta) =0;
      
      %EX (1,0,1):      
      Ex(conta)= 0;
      ExSimp(conta)=0;
      ErrPhaseEx(Ponto, conta) = 0;
       
      %EY (0,1,1):
      %TAVA FALTANDO UM "Z" MULTIPLICANDO O COSSENO NESTA FORMULA!!!
      Ero = j*ni*Io/(4*pi*y) * ( (z-l/2) * exp(-j*k*R1)/R1 + (z+l/2) * exp(-j*k*R2)/R2 - 2 * z * cos(k*l/2) * exp(j*k*r)/r);
      Eyvector = - Ero;
      defasa = -2;
      Ey(conta)= -real ( exp(j*omega*t(conta)) * Eyvector * exp(-j*defasa));                
      EySimp(conta) = + (0.25) * ni*Io*z/(2*pi*y*r) * (2-2*cos(k*l/2)) * sin(k*r - omega*t(conta) + defasa);
      
      if (conta>=N/2)
      tanalytic = (  asin( EyA(conta) * 4 * pi * y * r * (2-2*cos(k*l/2)) / (0.25*ni*Io*z) )  - k*r + defasa )/omega;
      tcalc = t(conta) ;
      tt = abs( tcalc - tanalytic);          
      ErrPhaseEy(Ponto,conta) = (tt/period) * 360;
       while (ErrPhaseEy(Ponto,conta) >= 90)
           ErrPhaseEy(Ponto,conta) = ErrPhaseEy(Ponto,conta) -90;
       end
   end
   
      %EZ (0,0,0):    
      Ezvector= -j * (ni * Io / (4*pi)) * ( exp(-j*k*R1) / R1 + exp(-j*k*R2) / R2 - 2 * cos(k*l/2) * exp(-j*k*r) / r);             
      defasa = -2;
      Ez(conta) = real ( exp(j*omega*t(conta)) * Ezvector * exp(-j*defasa) );      
      EzSimp(conta) = - (0.5) * ni * Io/(4*pi) * (2-2*cos(k*l/2))/r * sin(k*r - omega*t(conta) +defasa);
      
   if (conta>=N/2)
      tanalytic = (asin(EzA(conta) / ( - (0.5) * ni * Io/(4*pi) * (2-2*cos(k*l/2))/r ) )+ k*r - defasa) / omega;
       tcalc = t(conta);
       tt = abs( tcalc - tanalytic);
       ErrPhaseEz(Ponto, conta) = (tt/period) * 360;
       while (ErrPhaseEz(Ponto,conta) >= 90)
           ErrPhaseEz(Ponto,conta) = ErrPhaseEz(Ponto,conta) -90;
       end
   end
   
   end
   
    
   %===================== PLOTS =============================================
   val1=0.5; val2=50;
   maxH=val1; minH=-val1; 
   maxE=val2; minE=-val2;    
   
   HxA=Fields.Hx.data;      HyA=Fields.Hy.data;      HzA=Fields.Hz.data;
   ExA=Fields.Ex.data;      EyA=Fields.Ey.data;      EzA=Fields.Ez.data;
   
   message1=sprintf('HFields - Point %d (%0.0f,%0.3f,%0.3f)[m]',Ponto-1, (cx-Xsource)*deltaX/2, (cy-Ysource)*deltaY/2, (cz-Zsource)*deltaZ/2);
   message2=sprintf('EFields - Point %d (%0.0f,%0.3f,%0.3f)[m]',Ponto-1, (cx-Xsource)*deltaX/2, (cy-Ysource)*deltaY/2, (cz-Zsource)*deltaZ/2);

if(plotar==1)    
   figure;   
   subplot(5,2,1); text(0,0.3,message1); text(0,0.1,'(- = formula, +=FDTD)');axis off;
   %subplot(5,2,3); plot(t,HxA, 'r+-', t, Hx, 'b-', t, HxSimp, 'g-'); ylabel('Hx [A/m]'); if (maxmin==1) axis([0 max(t) minH maxH]); else axis tight; end
   %subplot(5,2,5); plot(t,HyA, 'r+-', t, Hy, 'b-', t, HySimp, 'g-'); ylabel('Hy [A/m]');if (maxmin==1) axis([0 max(t) minH maxH]);else axis tight; end      
   %subplot(5,2,7); plot(t,HzA, 'r+-', t, Hz, 'b-', t, HzSimp, 'g-'); xlabel('time [s]'); ylabel('Hz [A/m]');if (maxmin==1) axis([0 max(t) minH maxH]);else axis tight;end      
   subplot(5,2,3); plot(t,HxA, 'r+', t, Hx, 'b-');  ylabel('Hx [A/m]'); if (maxmin==1) axis([0 max(t) minH maxH]); else axis tight; end
   subplot(5,2,5); plot(t,HyA, 'r+', t, Hy, 'b-'); ylabel('Hy [A/m]');if (maxmin==1) axis([0 max(t) minH maxH]);else axis tight; end      
   subplot(5,2,7); plot(t,HzA, 'r+', t, Hz, 'b-'); xlabel('time [s]'); ylabel('Hz [A/m]');if (maxmin==1) axis([0 max(t) minH maxH]);else axis tight;end      
   
   subplot(5,2,2); text(0,0.3,message2); text(0,0.1,'(- = formula, +=FDTD)');axis off;
   %subplot(5,2,4); plot(t,ExA, 'r+-', t, Ex, 'b-', t, ExSimp, 'g-'); ylabel('Ex [V/m]'); if (maxmin==1) axis([0 max(t) minE maxE]);else axis tight;end
   %subplot(5,2,6); plot(t,EyA, 'r+-', t, Ey, 'b-', t, EySimp, 'g-'); ylabel('Ey [V/m]');if (maxmin==1) axis([0 max(t) minE maxE]);else axis tight;end   
   %subplot(5,2,8); plot(t,EzA, 'r+-', t, Ez, 'b-', t, EzSimp, 'g-'); xlabel('time [s]'); ylabel('Ez [V/m]');if (maxmin==1) axis([0 max(t) minE maxE]);else axis tight;end   
   subplot(5,2,4); plot(t,ExA, 'r+', t, Ex, 'b-'); ylabel('Ex [V/m]'); if (maxmin==1) axis([0 max(t) minE maxE]);else axis tight;end
   subplot(5,2,6); plot(t,EyA, 'r+', t, Ey, 'b-'); ylabel('Ey [V/m]');if (maxmin==1) axis([0 max(t) minE maxE]);else axis tight;end   
   subplot(5,2,8); plot(t,EzA, 'r+', t, Ez, 'b-'); xlabel('time [s]'); ylabel('Ez [V/m]');if (maxmin==1) axis([0 max(t) minE maxE]);else axis tight;end 
   
   if gravacao==1,
      chdir('figres');
      nome=sprintf('DipP%d.eps',Ponto-1);
      print('-depsc',nome);
      chdir('..');
      close;
   end
end

propHX(Ponto) = 100* ( max( Hx(N/2+1:N) ) - max( HxA(N/2+1:N)) ) / max(Hx(N/2+1:N)); 
propHY(Ponto) = 100* ( max( Hy(N/2+1:N) ) - max( HyA(N/2+1:N)) ) / max(Hy(N/2+1:N)); 
propHZ(Ponto) = 100* ( max( Hz(N/2+1:N) ) - max( HzA(N/2+1:N)) ) / max(Hz(N/2+1:N)); 
propEX(Ponto)= 100* ( max( Ex(N/2+1:N) ) - max( ExA(N/2+1:N)) ) / max(Ex(N/2+1:N)); 
propEY(Ponto)= 100* ( max( Ey(N/2+1:N) ) - max( EyA(N/2+1:N)) ) / max(Ey(N/2+1:N)); 
propEZ(Ponto)= 100* ( max( Ez(N/2+1:N) ) - max( EzA(N/2+1:N)) ) / max(Ez(N/2+1:N)); 
%propHX(Ponto)=100*(max(max(HxA))-max(max(Hx)))/max(max(HxA)); 
%propHY(Ponto)=100*(max(max(HyA))-max(max(Hy)))/max(max(HyA)); 
%propHZ(Ponto)=100*(max(max(HzA))-max(max(Hz)))/max(max(HzA)); 
%propEX(Ponto)=100*(max(max(ExA))-max(max(Ex)))/max(max(ExA)); 
%propEY(Ponto)=100*(max(max(EyA))-max(max(Ey)))/max(max(EyA)); 
%propEZ(Ponto)=100*(max(max(EzA))-max(max(Ez)))/max(max(EzA)); 

propgeral=sprintf('Proporcoes: Hx = %0.1f, Hy =%0.1f, Hz = %0.1f, Ex=%0.1f, Ey=%0.1f, Ez=%0.1f', propHX(Ponto), propHY(Ponto), propHZ(Ponto), propEX(Ponto), propEY(Ponto), propEZ(Ponto));
disp(propgeral);
   
%EPEx(Ponto) = min(min(ErrPhaseEx(Ponto,N/2+1:N)));
EPEy(Ponto)  = min(min(ErrPhaseEy(Ponto,N/2+1:N)));
EPEz(Ponto)  = min(min(ErrPhaseEz(Ponto,N/2+1:N)));
EPHx(Ponto)  = min(min(ErrPhaseHx(Ponto,N/2+1:N)));
%EPHy(Ponto)  = min(min(ErrPhaseHy(inicial,N/2+1:N)));
%EPHz(Ponto)  = min(min(ErrPhaseHz(inicial,N/2+1:N)));

end 

figure;
ppp=1:size(propHX,2);
plot(ppp, propHX, 'r+', ppp, propHY, 'g-', ppp, propHZ, 'b.', ppp, propEX, 'ro', ppp, propEY, 'g*', ppp, propEZ,'bx-');
legend('HX', 'HY', 'HZ', 'EX', 'EY', 'EZ');
axis([inicial final -100 100]);
xlabel('Points');
ylabel('Maximum Value Error in %');

%figure; plot(t, ErrPhaseEx(:,:), t, ErrPhaseEy(:,:), t, ErrPhaseEz(:,:), t, ErrPhaseHx(:,:), t, ErrPhaseHy(:,:), t, ErrPhaseHz(:,:) );
%legend ('ErrPhase Ex', 'ErrPhase Ey', 'ErrPhase Ez', 'ErrPhase Hx', 'ErrPhase Hy', 'ErrPhase Hz'); axis tight;
%figure; plot(t, ErrPhaseEy(inicial,:), '+-', t, ErrPhaseEz(inicial,:), '+-', t, ErrPhaseHx(inicial,:) ,'+-');
%legend ('ErrPhase Ey', 'ErrPhase Ez', 'ErrPhase Hx'); axis tight;

ErroFase=1; %Plotar o Erro de Fase: 0=nao, 1=sim.
if (ErroFase==1)
PP=1:final;
figure; plot(PP, EPEy, '+-', PP, EPEz, '+-', PP, EPHx ,'+-');
maxEP=max(EPEy);
if (maxEP < max(EPEz)) maxEP = max(EPEz); end
if (maxEP < max(EPHx)) maxEP = max(EPHx); end
legend ('ErrPhase Ey', 'ErrPhase Ez', 'ErrPhase Hx'); axis([inicial final 0 maxEP]);
xlabel('Point');
ylabel('Phase Error in Degrees');
end