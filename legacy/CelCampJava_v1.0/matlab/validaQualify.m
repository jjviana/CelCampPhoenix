%============================================================================
disp(' ')
disp('***********************************************************')
disp('*     This program was developed by Rodrigues, A.O.       *')
disp('*   Oriented by Ramirez. J. A. and Vasconcelos J. A.      *')
disp('* It can be used freely as long as the source is quoted.  *')
disp('*                     Jun/2001.                           *')
disp('***********************************************************')
disp(' ')
clear;

%Constants:
%----------
c=3e8; epsonZero=8.854e-12; miZero=1.257e-6; niZero=sqrt(miZero/epsonZero);
PI=pi;
corrige=input('Digite a correcao: ');
resp='y';
while resp~='n',
   %coord=input('Qual a coordenada desejada (Hx=1, Hy=2, Hz=3, Ex=4, Ey=5, Ez=6) ? ');
   %if (coord<1 | coord>6) coord=1; end
   cx=input('Coordenada X do ponto: ');
   cy=input('Coordenada Y do ponto: ');
   cz=input('Coordenada Z do ponto: ');
   %DO BERENGER
   arq1=sprintf('Hx%d_%d_%d.txt',cx,cy,cz);   
   arq2=sprintf('Hy%d_%d_%d.txt',cx,cy,cz);   
   arq3=sprintf('Hz%d_%d_%d.txt',cx,cy,cz);   
   arq4=sprintf('Ex%d_%d_%d.txt',cx,cy,cz);   
   arq5=sprintf('Ey%d_%d_%d.txt',cx,cy,cz);   
   arq6=sprintf('Ez%d_%d_%d.txt',cx,cy,cz);
   disp(' ')
   disp('Calculating the Fields...')
   s1=fopen(arq1, 'r');      s2=fopen(arq2, 'r');      s3=fopen(arq3, 'r');
   s4=fopen(arq4, 'r');      s5=fopen(arq5, 'r');      s6=fopen(arq6, 'r');
   frewind(s1);  frewind(s3);  frewind(s5);  
   frewind(s2);  frewind(s4);  frewind(s6);  
   
   line = fgetl(s1);     
   xS = str2num(line); %finds the source location center in X
   line = fgetl(s1);     
   yS = str2num(line); %finds the source location center in Y
   line = fgetl(s1);     
   zS = str2num(line); %finds the source location center in Z
   line = fgetl(s1);     
   L = str2num(line); %finds the source size
   line = fgetl(s1);     
   Dx = str2num(line); %finds the Delta X
   line = fgetl(s1);     
   Dy = str2num(line); %finds the Delta Y
   line = fgetl(s1);     
   Dz = str2num(line); %finds the Delta Z
   line = fgetl(s1);     
   f = str2num(line); %finds the frequency
   line = fgetl(s1);     
   tc=str2num(line); %finds the number of calculations
   line = fgetl(s1);     
   deltaT=str2num(line); %finds the deltaT
   line = fgetl(s1);     
   xP=str2num(line); %finds the x coordinate of the point
   line = fgetl(s1);     
   yP=str2num(line); %finds the y coordinate of the point
   line = fgetl(s1);     
   zP=str2num(line); %finds the z coordinate of the point
   line = fgetl(s1);     
   reduz=str2num(line); %finds the reduction in time
   line = fgetl(s1);     
   Im=str2num(line); %finds the value of the Current 
   
   for (i=1:15) 
      jogafora=fgetl(s2);         jogafora=fgetl(s3);
      jogafora=fgetl(s4);         jogafora=fgetl(s5);
      jogafora=fgetl(s6);
   end
   
   for (calc=1:tc)   
      line=fgetl(s1);
      HXfdtd(calc)=str2num(line);
   end
   fclose(s1);      
   
   for (calc=1:tc)   
      line=fgetl(s2);
      HYfdtd(calc)=str2num(line);
   end
   fclose(s2);      
   
   for (calc=1:tc)   
      line=fgetl(s3);
      HZfdtd(calc)=str2num(line);
   end
   fclose(s3);      
   
   for (calc=1:tc)   
      line=fgetl(s4);
      EXfdtd(calc)=str2num(line);
   end
   fclose(s4);      
   
   for (calc=1:tc)   
      line=fgetl(s5);
      EYfdtd(calc)=str2num(line);
   end
   fclose(s5);      
   
   for (calc=1:tc)   
      line=fgetl(s6);
      EZfdtd(calc)=str2num(line);
   end
   fclose(s6);      
   
   %============================================================================      
   %                              ANALITICAL SOLUTION:
   %============================================================================
   %Values of the source:
   %---------------------
   Volume=Dx*Dy*Dz;		%Volume para calcular J = I/V
   w=2*PI*f;%Angular Frequency
   beta=w*(sqrt(miZero*epsonZero));%beta = k
   sizeS = L*Dz;
      
   %Values of the desired point:
   %----------------------------
   x=(xP-xS)*Dx;      y=(yP-yS)*Dy;      z=(zP-zS)*Dz;
   x1=x+Dx; y1=y+Dy; z1=z+Dz;
   sizeL=L*Dz;
   r=sqrt(x*x + y*y + z*z); 
   r1=sqrt(x*x + y*y + (z-sizeL/2)*(z-sizeL/2));
   r2=sqrt(x*x + y*y + (z+sizeL/2)*(z+sizeL/2));   
   rEx=r; rEy=r; rEz=r; rHx=r; rHy=r; rHz=r;
   r1Ex=r1; r1Ey=r1; r1Ez=r1; r1Hx=r1; r1Hy=r1; r1Hz=r1;
   r2Ex=r2; r2Ey=r2; r2Ez=r2; r2Hx=r2; r2Hy=r2; r2Hz=r2;
   %rEx=sqrt(x1*x1 + y*y + z1*z1);
   %rEy=sqrt(x*x + y1*y1 + z1*z1);
   %rEz=sqrt(x*x + y*y + z*z); 
   %rHx=sqrt(x*x + y1*y1 + z*z);
   %rHy=sqrt(x1*x1 + y*y + z*z);
   %rHz=sqrt(x1*x1 + y1*y1 + z1*z1);
   %r1Ex=sqrt(x1*x1 + y*y + (z1-sizeL/2)*(z1-sizeL/2));
   %r2Ex=sqrt(x1*x1 + y*y + (z1+sizeL/2)*(z1+sizeL/2));   
   %r1Ey=sqrt(x*x + y1*y1 + (z1-sizeL/2)*(z1-sizeL/2));
   %r2Ey=sqrt(x*x + y1*y1 + (z1+sizeL/2)*(z1+sizeL/2));   
   %r1Ez=sqrt(x*x + y*y + (z-sizeL/2)*(z-sizeL/2));
   %r2Ez=sqrt(x*x + y*y + (z+sizeL/2)*(z+sizeL/2));      
   %r1Hx=sqrt(x*x + y1*y1 + (z-sizeL/2)*(z-sizeL/2));
   %r2Hx=sqrt(x*x + y1*y1 + (z+sizeL/2)*(z+sizeL/2));   
   %r1Hy=sqrt(x1*x1 + y*y + (z-sizeL/2)*(z-sizeL/2));
   %r2Hy=sqrt(x1*x1 + y*y + (z+sizeL/2)*(z+sizeL/2));   
   %r1Hz=sqrt(x1*x1 + y1*y1 + (z1-sizeL/2)*(z1-sizeL/2));
   %r2Hz=sqrt(x1*x1 + y1*y1 + (z1+sizeL/2)*(z1+sizeL/2));   
   
   I0=Im;
   
   %Calculation of Analitical Field:
   %--------------------------------
   indice=0;
   mod=j*(niZero*I0/(4*PI));
   alfa=atan(y/x);   teta=acos(z/r);
   alfaEx=atan(y/x);   tetaEx=acos(z/r);
   alfaEy=atan(y/x);   tetaEy=acos(z/r);
   alfaEz=atan(y/x);   tetaEz=acos(z/r);
   alfaHx=atan(y/x);   tetaHx=acos(z/r);
   alfaHy=atan(y/x);   tetaHy=acos(z/r);
   alfaHz=atan(y/x);   tetaHz=acos(z/r);

   %alfaEx=atan(y/x1);   tetaEx=acos(z1/rEx);
   %alfaEy=atan(y1/x);   tetaEy=acos(z1/rEy);
   %alfaEz=atan(y/x);   tetaEz=acos(z/rEz);
   %alfaHx=atan(y1/x);   tetaHx=acos(z/rHx);
   %alfaHy=atan(y/x1);   tetaHy=acos(z/rHy);
   %alfaHz=atan(y1/x1);   tetaHz=acos(z1/rHz);


   for TimeStep=1:(1*reduz):(tc*reduz)
      t=(TimeStep-1)*deltaT; %picoseconds                     
      indice=indice+1;
      tt(indice)=t;
            
      %VALIDACAO DO DIPOLO (BALANIS):
      %==============================
      %H(indice)= -I0/(4*PI*j*y) * ( exp(-j*beta*r1) + exp(-j*beta*r2)- 2*cos(beta*sizeL/2)*exp(-j*beta*r)) ;
      %EA=( (mod/y) * ( (z-sizeL/2)*exp(-j*beta*r1)/r1 + (z+sizeL/2)*exp(-j*beta*r2)/r2 - 2*z*cos(beta*sizeL/2)*exp(-j*beta*r)/r ) ) ;
      %EB=( (-mod)  * ( exp(-j*beta*r1)/r1 + exp(-j*beta*r2)/r2 - 2*cos(beta*sizeL/2)*exp(-j*beta*r)/r ) );
      %HXb(indice)= real( H(indice) * (-sin(alfa)) * exp(-j*w*t) );
      %HYb(indice)= real( H(indice) * (+cos(alfa)) * exp(-j*w*t));
      %HZb(indice)= 0;     
      %EXb(indice)= real(( sin(teta)*cos(alfa)*EA + cos(teta)*cos(alfa)*EB ) * exp(-j*w*t));
      %EYb(indice)= real(( sin(teta)*sin(alfa)*EA + cos(teta)*sin(alfa)*EB ) * exp(-j*w*t));
      %EYc(indice)= real( EA * exp(-j*w*t) );
      %EZb(indice)= real(( cos(teta)*EA - sin(teta)*EB ) * exp(-j*w*t));
      %EZc(indice)= real( EB * exp(-j*w*t) );
      
      HXanalitic(indice)= corrige*real( (-I0/(4*PI*j*y1) * ( exp(-j*beta*r1Hx) + exp(-j*beta*r2Hx)- 2*cos(beta*sizeL/2)*exp(-j*beta*rHx))) * (-sin(alfaHx)) * exp(-j*w*t) );
      HYanalitic(indice)= corrige*real( (-I0/(4*PI*j*y)  * ( exp(-j*beta*r1Hy) + exp(-j*beta*r2Hy)- 2*cos(beta*sizeL/2)*exp(-j*beta*rHy))) * (+cos(alfaHy)) * exp(-j*w*t) );
      HZanalitic(indice)= 0;     
      EXanalitic(indice)= corrige*real( ( sin(tetaEx)*cos(alfaEx)*( (mod/y) * ( (z1-sizeL/2)*exp(-j*beta*r1Ex)/r1Ex + (z1+sizeL/2)*exp(-j*beta*r2Ex)/r2Ex - 2*z1*cos(beta*sizeL/2)*exp(-j*beta*rEx)/rEx ) ) + cos(tetaEx)*cos(alfaEx)*( (-mod)  * ( exp(-j*beta*r1Ex)/r1Ex + exp(-j*beta*r2Ex)/r2Ex - 2*cos(beta*sizeL/2)*exp(-j*beta*rEx)/rEx ) ) ) * exp(-j*w*t));
      EYanalitic(indice)= corrige*real( ( (mod/y1) * ( (z1-sizeL/2)*exp(-j*beta*r1Ey)/r1Ey + (z1+sizeL/2)*exp(-j*beta*r2Ey)/r2Ey - 2*z*cos(beta*sizeL/2)*exp(-j*beta*rEy)/rEy ) ) * exp(-j*w*t) );
      EZanalitic(indice)= real( ( (-mod)  * ( exp(-j*beta*r1Ez)/r1Ez + exp(-j*beta*r2Ez)/r2Ez - 2*cos(beta*sizeL/2)*exp(-j*beta*rEz)/rEz ) ) * exp(-j*w*t) );

      %VALIDACAO DO HAYT:
      %==================
      Eteta=(I0*niZero/(2*PI*r))*(cos((PI/2)*cos(teta))/(sin(teta)));
      Hfi=(I0/(2*PI*r))*(cos((PI/2)*cos(teta))/(sin(teta)));
      HXhayt(indice)= corrige*real(exp(+j*w*t) * Hfi * (-sin(alfa)) );
      HYhayt(indice)= corrige*real(exp(+j*w*t) * Hfi * ( cos(alfa)) );
      HZhayt(indice)= 0;
      EXhayt(indice)= corrige*real(exp(+j*w*t) * Eteta * (cos(teta)*cos(alfa)) );
      EYhayt(indice)= corrige*real(exp(+j*w*t) * Eteta * (cos(teta)*sin(alfa)) );
      EZhayt(indice)= real(exp(+j*w*t) * Eteta * (-sin(teta)) );

      
   end 
   %============================================================================
   %                            SHOWS THE RESULTS
   %============================================================================
   %Normalizes the values:
   %----------------------
   %NormaX=max(max(HXfdtd))/max(max(HXanalitic));
   %HXfdtd=HXfdtd/NormaX;
   %NormaY=max(max(HYfdtd))/max(max(HYanalitic));
   %HYfdtd=HYfdtd/NormaY;
   %Norma=max(max(HZfdtd))/max(max(HZanalitic));
   %HZfdtd=HZfdtd/Norma;
   
   %H:
   figure;
   %Plot the results:
   %-----------------
   subplot(2,2,1);
   %plot(tt,HXfdtd,'r',tt,HXanalitic,'b', tt, HXhayt, 'g');
   plot(tt,HXfdtd,'r',tt,HXanalitic,'b');
   title('Values of Hx in time');
   xlabel('time(s)');      ylabel('Hx(A/m)');
   
   subplot(2,2,2);
   %plot(tt,HYfdtd,'r',tt,HYanalitic,'b', tt, HYhayt, 'g');
   plot(tt,HYfdtd,'r',tt,HYanalitic,'b');
   title('Values of Hy in time');
   xlabel('time(s)');      ylabel('Hy(A/m)');
   
   subplot(2,2,3);
   %plot(tt,HZfdtd,'r',tt,HZanalitic,'b', tt, HZhayt, 'g');
   plot(tt,HZfdtd,'r',tt,HZanalitic,'b');
   title('Values of Hz in time');
   xlabel('time(s)');      ylabel('Hz(A/m)');
   
   subplot(2,2,4);      axis off;
   ponto=sprintf('X= %d Y= %d Z= %d',cx,cy,cz');      text(0.1,0.9,ponto);
   %text(0.1,0.7,'NX:');
   %text(0.3,0.7,num2str(NormaX));
   %text(0.1,0.6,'NY:');
   %text(0.3,0.6,num2str(NormaY));
   text(0.1,0.5,'Values on the point:');
   text(0.2,0.4,'x=');      text(0.3,0.4,num2str(x));
   text(0.6,0.4,'y=');      text(0.7,0.4,num2str(y));
   text(0.1,0.3,'LINES:');
   text(0.2,0.2,'blue = Analitical Solution');      text(0.2,0.1,'red = FDT-TD');	
   
   %E:
   figure;
   %Plot the results:
   %-----------------
   subplot(2,2,1);
   %plot(tt,EXfdtd,'r',tt,EXanalitic,'b', tt, EXhayt, 'g');
   plot(tt,EXfdtd,'r',tt,EXanalitic,'b');
   title('Values of Ex in time');
   xlabel('time(s)');      ylabel('Ex(V/m)');
   
   subplot(2,2,2);
   %plot(tt,EYfdtd,'r',tt,EYanalitic,'b', tt, EYhayt, 'g');
   plot(tt,EYfdtd,'r',tt,EYanalitic,'b');
   title('Values of Ey in time');
   xlabel('time(s)');      ylabel('Ey(V/m)');
   
   subplot(2,2,3);
   %plot(tt,EZfdtd,'r',tt,EZanalitic,'b', tt, EZhayt, 'g');
   plot(tt,EZfdtd,'r',tt,EZanalitic,'b');
   title('Values of Ez in time');
   xlabel('time(s)');      ylabel('Ez(V/m)');
   
   subplot(2,2,4);      axis off;
   ponto=sprintf('X= %d Y= %d Z= %d',cx,cy,cz');
   text(0.1,0.9,ponto);
   text(0.1,0.5,'Values on the point:');
   text(0.2,0.4,'x=');      text(0.3,0.4,num2str(x));
   text(0.6,0.4,'y=');      text(0.7,0.4,num2str(y));
   text(0.1,0.3,'LINES:');
   text(0.2,0.2,'blue = Analitical Solution');      text(0.2,0.1,'red = FDT-TD');	            
   
   %ERRO EM H:
   %==========
   %figure;
   err1h=abs(max(HXanalitic)-max(HXfdtd));
   err2h=abs(max(HYanalitic)-max(HYfdtd));
   err3h=abs(max(HZanalitic)-max(HZfdtd));
   if ((err1h >= err2h)&(err1h >= err2h)) errHmax=err1h; end
   if ((err2h >= err1h)&(err2h >= err3h)) errHmax=err2h; end
   if ((err3h >= err1h)&(err3h >= err2h)) errHmax=err3h; end
   for (ee=1:size(HXanalitic,2))
      ErroHX(ee)=100*abs(( abs(HXanalitic(ee)) - abs(HXfdtd(ee)) ) / ( abs(HXanalitic(ee))) );
   end
   %subplot(2,2,1);   
   %plot(tt,ErroHX,'r');
   %title('Erro em Hx no tempo');
   %xlabel('tempo(s)');      ylabel('Erro(%)');
   for (ee=1:size(HYanalitic,2))
      ErroHY(ee)=100*abs(( abs(HYanalitic(ee)) - abs(HYfdtd(ee)) ) / ( abs(HYanalitic(ee))) );
   end
   %subplot(2,2,2);   
   %plot(tt,ErroHY,'r');
   %title('Erro em Hy no tempo');
   %xlabel('tempo(s)');      ylabel('Erro(%)');
   ErroHZ=abs(abs(HZanalitic)-abs(HZfdtd));   
   %subplot(2,2,3);   
   %plot(tt,ErroHZ,'r');
   %title('Erro em Hz no tempo');
   %xlabel('tempo(s)');      ylabel('Erro(%)');
   %subplot(2,2,4);      axis off;
   %ponto=sprintf('X= %d Y= %d Z= %d',cx,cy,cz');
   %text(0.1,0.9,ponto);
   %text(0.1,0.5,'Values on the point:');
   %text(0.2,0.4,'x=');      text(0.3,0.4,num2str(x));
   %text(0.6,0.4,'y=');      text(0.7,0.4,num2str(y));
   %text(0.1,0.3,'ERRO MAXIMO:');
   %text(0.2,0.2,num2str(errHmax));
   
   %ERRO EM E:
   %==========
   %figure;
   err1e=abs(max(EXanalitic)-max(EXfdtd));
   err2e=abs(max(EYanalitic)-max(EYfdtd));
   err3e=abs(max(EZanalitic)-max(EZfdtd));
   if ((err1e >= err2e)&(err1e >= err2e)) errEmax=err1e; end
   if ((err2e >= err1e)&(err2e >= err3e)) errEmax=err2e; end
   if ((err3e >= err1e)&(err3e >= err2e)) errEmax=err3e; end   
   for (ee=1:size(EXanalitic,2))
      ErroEX(ee)=100*abs(( abs(EXanalitic(ee)) - abs(EXfdtd(ee)) ) / ( abs(EXanalitic(ee))) );
   end
	%subplot(2,2,1);   
   %plot(tt,ErroEX,'r');
   %title('Erro em Ex no tempo');
   %xlabel('tempo(s)');      ylabel('Erro(%)');
   for (ee=1:size(EYanalitic,2))
      ErroEY(ee)=100*abs(( abs(EYanalitic(ee)) - abs(EYfdtd(ee)) ) / ( abs(EYanalitic(ee))) );
   end
	%subplot(2,2,2);   
   %plot(tt,ErroEY,'r');
   %title('Erro em Ey no tempo');
   %xlabel('tempo(s)');      ylabel('Erro(%)');
	for (ee=1:size(EZanalitic,2))
      ErroEZ(ee)=100*abs(( abs(EZanalitic(ee)) - abs(EZfdtd(ee)) ) / ( abs(EZanalitic(ee))) );
   end
	%subplot(2,2,3);   
   %plot(tt,ErroEZ,'r');
   %title('Erro em Ez no tempo');
   %xlabel('tempo(s)');      ylabel('Erro(%)');
   %subplot(2,2,4);      axis off;
   %ponto=sprintf('X= %d Y= %d Z= %d',cx,cy,cz');
   %text(0.1,0.9,ponto);
   %text(0.1,0.5,'Values on the point:');
   %text(0.2,0.4,'x=');      text(0.3,0.4,num2str(x));
   %text(0.6,0.4,'y=');      text(0.7,0.4,num2str(y));
   %text(0.1,0.3,'ERRO MAXIMO:');
   %text(0.2,0.2,num2str(errEmax));
   
   %Calculo dos modulos de E e H:
   %=============================
   for (ee=1:size(HXanalitic,2))
      %modHanalitic(ee)=sqrt(HXanalitic(ee)*HXanalitic(ee)+HYanalitic(ee)*HYanalitic(ee)+HZanalitic(ee)*HZanalitic(ee));
      %modHfdtd(ee)=sqrt(HXfdtd(ee)*HXfdtd(ee)+HYfdtd(ee)*HYfdtd(ee)+HZfdtd(ee)*HZfdtd(ee));
      %modHhayt(ee)=sqrt(HXhayt(ee)*HXhayt(ee)+HYhayt(ee)*HYhayt(ee)+HZhayt(ee)*HZhayt(ee));
      %modEanalitic(ee)=sqrt(EXanalitic(ee)*EXanalitic(ee)+EYanalitic(ee)*EYanalitic(ee)+EZanalitic(ee)*EZanalitic(ee));
      %modEfdtd(ee)=sqrt(EXfdtd(ee)*EXfdtd(ee)+EYfdtd(ee)*EYfdtd(ee)+EZfdtd(ee)*EZfdtd(ee));
      %modEhayt(ee)=sqrt(EXhayt(ee)*EXhayt(ee)+EYhayt(ee)*EYhayt(ee)+EZhayt(ee)*EZhayt(ee));
      modHanalitic(ee)=sqrt(HXanalitic(ee)*HXanalitic(ee)+HYanalitic(ee)*HYanalitic(ee));
      modHfdtd(ee)=sqrt(HXfdtd(ee)*HXfdtd(ee)+HYfdtd(ee)*HYfdtd(ee));
      modHhayt(ee)=sqrt(HXhayt(ee)*HXhayt(ee)+HYhayt(ee)*HYhayt(ee));
      modEanalitic(ee)=sqrt(EYanalitic(ee)*EYanalitic(ee)+EZanalitic(ee)*EZanalitic(ee));
      modEfdtd(ee)=sqrt(EYfdtd(ee)*EYfdtd(ee)+EZfdtd(ee)*EZfdtd(ee));
      modEhayt(ee)=sqrt(EYhayt(ee)*EYhayt(ee)+EZhayt(ee)*EZhayt(ee));

   end
   
   figure;
   %plot(tt, modHanalitic, 'b', tt, modHfdtd, 'r', tt, modHhayt, 'g');
   %title('Modulo de H para analitico (azul), FDTD (vermelho) e Hayt (verde)');
   plot(tt, modHanalitic, 'b', tt, modHfdtd, 'r');
   title('Modulo de H para analitico (azul) e FDTD (vermelho)');

   figure;
   %plot(tt, modEanalitic, 'b', tt, modEfdtd, 'r', tt, modEhayt, 'g');   
   %title('Modulo de E para analitico (azul), FDTD (vermelho) e Hayt (verde)');
   plot(tt, modEanalitic, 'b', tt, modEfdtd, 'r');   
   title('Modulo de E para analitico (azul) e FDTD (vermelho)');

   
%disp(' ')
%resp=input('Would you like to run the program again? (y/n)?  ','s');
resp='n';
end; %finalizes the while resp!="n"
%============================================================================
disp(' ')
disp('***************************************************************')
disp('*           Thank you for using this program.                 *')
disp('*                Last Update: 17/07/2001                      *')
disp('*                anaterrra@estrelar.net                       *')
disp('***************************************************************')
disp(' ')
%============================================================================

