disp(' ')
disp('***********************************************************')
disp('*                 COMPARAPLANEWAVE.M                       *')
disp('***********************************************************')
disp('*     This program was developed by Rodrigues, A.O.       *')
disp('*   Oriented by Ramirez. J. A. and Vasconcelos J. A.      *')
disp('*   (with a little help of Viana, J.J :) )                *')
disp('* It can be used freely as long as the source is quoted.  *')
disp('*                     Feb/2002.                           *')
disp('***********************************************************')
disp(' ')

clear;

%===================== READS ==============================================
material=input('Qual o material (1=ar, 2=fat) ?  ');
%escolha=input('Compara diretorios (1) ou diretorio simples (2) ? ' 
escolha=2;
if (escolha==1)	
   if material==1
      dirbase1='resCC - ar - sem interface';
      dirbase2='resCC - ar - com interface';
   end
   if material==2
      dirbase1='resCC - fat - si';
      dirbase2='resCC - fat - ci';
   end
else
   %dirbase1=input('Digite o diretorio dos resultados (default= .): ');
   %if isempty(dirbase1)
   %   dirbase1='.';
   %end
   if material==1
      dirbase1='resCC - ar';
   end
   if material==2
      dirbase1='resCC - fat';
   end   
end

Px=[151 153 155 157 159 161 163 165 167 169 171 173 175 177 179 201 203 205 207 209 211 213 215 217 219];
Py=[51  51  51  51  51  51  51  51  51  51  51  51  51  51  51  51  51  51  51  51  51  51  51  51  51];   

%reduzN=input('Qual a reducao no tempo ? ');
reduzN=1;

inicial=input('A partir de qual ponto ? ' );
if (inicial<0 | inicial >size(Px,2))
   inicial=1;
end

final=input('Ate qual ponto ? ');
if (final>size(Px,2) | final <inicial),
   final=size(Px,2);
end

Xslab = input('Qual o valor em x do inicio do slab ?  ');

for (Ponto=inicial:final)
   cx1=Px(Ponto);
   cy1	=Py(Ponto);
   cz1	=3;
   
   Fields1=ReadPointFields(dirbase1,cx1,cy1,cz1);
   if escolha==1,
      Fields2=ReadPointFields(dirbase2,cx1,cy1,cz1);
   end   
   
   %===================== CALCULATES ANALYTICAL =============================      
   
   deltaT=Fields1.deltaT;
   deltaX=Fields1.Dx;
   deltaY=Fields1.Dy;
   current=Fields1.Im;
   N=Fields1.NumCalc;
   Xsource=Fields1.xS;
   freq=Fields1.freq;
   omega=2*3.14159265358979*freq;
   epzero=8.854e-12;
   mizero=1.25663706144e-6;
      
   %AIR PROPERTIES:
   er(1)=1; sigma(1)=0;
   alfa(1)= omega * sqrt(mizero*er(1)*epzero) * sqrt( 0.5 * (sqrt( 1 + (sigma(1)/(omega*er(1)*epzero))^2 ) -1 ) );
   beta(1)= omega * sqrt(mizero*er(1)*epzero) * sqrt( 0.5 * (sqrt( 1 + (sigma(1)/(omega*er(1)*epzero))^2 ) +1 ) );
      
   if (material==1),
      er(2)=er(1);
      sigma(2)=sigma(1);
      alfa(2)=alfa(1);
      beta(2)=beta(1);
   end 
   if (material==2),
      %FAT PROPERTIES:
      er(2)=9.38; sigma(2)=0.28;
      alfa(2)=omega * sqrt(mizero*er(2)*epzero) * sqrt( 0.5 * (sqrt( 1 + (sigma(2)/(omega*er(2)*epzero))^2 ) -1 ) );
      beta(2)=omega * sqrt(mizero*er(2)*epzero) * sqrt( 0.5 * (sqrt( 1 + (sigma(2)/(omega*er(2)*epzero))^2 ) +1 ) );
   end
   
   ni1=sqrt( (j*omega*mizero)/(sigma(1) + j*omega*er(1)*epzero) );
   ni2=sqrt( (j*omega*mizero)/(sigma(2) + j*omega*er(2)*epzero) );  
   
   refl=(ni2-ni1)/(ni2+ni1);
   trans=2*ni2/(ni2+ni1);
      
   Ezero=ni1*(deltaT/mizero)*current/(deltaX*deltaY);
   Xa=(cx1-Xsource)*deltaX/2;
   XbH=(Xslab-Xsource)*deltaX/2;
   XbE=(Xslab-Xsource)*deltaX/2;
   XcH=(cx1-Xslab+1)*deltaX/2;
   XcE=(cx1-Xslab+2)*deltaX/2;

   for (conta=1:N)
      tempo(conta)=(conta-1)*deltaT*reduzN;          
      if (cx1<201)
         Hzi(conta)   = real(         Ezero/ni1 * exp(-alfa(1)*Xa - j*beta(1)*Xa + j*omega*tempo(conta)) );
         Hzr(conta)   = real( -refl * Ezero/ni1 * exp(+alfa(1)*Xa + j*beta(1)*Xa + j*omega*tempo(conta)) );
         Hz(conta)    = real( Ezero/ni1 * exp(-alfa(1)*Xa - j*beta(1)*Xa) * (1 - refl * exp(2*alfa(1)*Xa + j*2*beta(1)*Xa) ) * exp(+j*omega*tempo(conta)) );  
         
         Eyi(conta)   = real(         Ezero * exp(-alfa(1)*Xa - j*beta(1)*Xa + j*omega*tempo(conta)) );
         Eyr(conta)   = real(  refl * Ezero * exp(+alfa(1)*Xa + j*beta(1)*Xa + j*omega*tempo(conta)) );
         Ey(conta)    = real( Ezero     * exp(-alfa(1)*Xa - j*beta(1)*Xa) * (1 + refl * exp(2*alfa(1)*Xa + j*2*beta(1)*Xa) ) * exp(+j*omega*tempo(conta)) );
      else
         %formula do Balanis
         Hz(conta)    = real( trans * Ezero/ni2 * exp( -alfa(1)*XbH - alfa(2)*XcH - j*beta(1)*XbH - j*beta(2)*XcH + j*omega*tempo(conta)) );
         
         %Hincidente - Hrefletido:
         %Hz2(conta)    = real( ( Ezero/ni1 * exp(-alfa(1)*Xa - j*beta(1)*Xa ) - refl * Ezero/ni1 * exp(+alfa(1)*Xa + j*beta(1)*Xa ) ) * exp(j*omega*tempo(conta)) );
         
         Ey(conta)    = real( trans * Ezero     * exp( -alfa(1)*XbE - alfa(2)*XcE - j*beta(1)*XbE - j*beta(2)*XcE + j*omega*tempo(conta)) );         
      end
   end
   
   %===================== PLOTS =============================================
   if (escolha==1)
      message=sprintf('Hz and Ey Fields for Point %d',Ponto-1);
      figure;
      subplot(3,1,1); text(0.3,0.3,message); text(0.3,0.1,'(Azul = analitica, Verm=FDTD sem int, Green=FDTD com int)');axis off;
      subplot(3,1,2); plot(tempo,Fields1.Hz.data, 'r', tempo,Fields2.Hz.data, 'g', tempo, Hz, 'b');axis([0 max(tempo) -1.4*Ezero/ni1 1.4*Ezero/ni1]);
      subplot(3,1,3); plot(tempo,Fields1.Ey.data, 'r', tempo,Fields2.Ey.data, 'g', tempo, Ey, 'b');axis([0 max(tempo) -1.4*Ezero 1.4*Ezero]);
   else
      message=sprintf('Hz and Ey Fields for Point %d',Ponto-1);
      figure;
      if (cx1<201),
         subplot(3,1,1); text(0.3,0.3,message); text(0.3,0.1,'(Azul = Incid, Green = Total, Yellow= Refl, Verm=FDTD)');axis off;
         subplot(3,1,2); plot(tempo,Fields1.Hz.data, 'r', tempo, Hzi, 'b', tempo, Hz, 'g', tempo, Hzr, 'y');axis([0 max(tempo) -1.4*Ezero/ni1 1.4*Ezero/ni1]);
         subplot(3,1,3); plot(tempo,Fields1.Ey.data, 'r', tempo, Eyi, 'b', tempo, Ey, 'g');axis([0 max(tempo) -1.4*Ezero 1.4*Ezero]);
      else         
         %subplot(3,1,1); text(0.3,0.3,message); text(0.3,0.1,'(Azul = formula, Verde=inc-refl, Verm=FDTD)');axis off;
         %subplot(3,1,2); plot(tempo,Fields1.Hz.data, 'r', tempo, Hz1, 'b', tempo, Hz2, 'g');axis([0 max(tempo) -1.4*Ezero/ni1 1.4*Ezero/ni1]);

         subplot(3,1,1); text(0.3,0.3,message); text(0.3,0.1,'(Azul = formula, Verm=FDTD)');axis off;
         subplot(3,1,2); plot(tempo,Fields1.Hz.data, 'r', tempo, Hz, 'b'); axis([0 max(tempo) -1.4*Ezero/ni1 1.4*Ezero/ni1]);
         
         subplot(3,1,3); plot(tempo,Fields1.Ey.data, 'r', tempo, Ey, 'b');axis([0 max(tempo) -1.4*Ezero 1.4*Ezero]);
      end
   end
end
