%============================================================================
disp(' ')
disp(' ')
disp('***********************************************************')
disp('*     This program was developed by Rodrigues, A.O.       *')
disp('*   Oriented by Ramirez. J. A. and Vasconcelos J. A.      *')
disp('* It can be used freely as long as the source is quoted.  *')
disp('*                     Jun/2001.                           *')
disp('***********************************************************')
disp(' ')

%============================================================================
%                         ENTRY OF DATA FROM FD-TD:
%============================================================================

%THE DATA FILE MUST HAVE THE FOLLOWING FORMAT
%	[INT tc] = NUMBER OF CALCULATIONS
%  [FLOAT dt] = delta T
%  [INT x ] = POSITION X OF THE FONT
%  [INT y ] = POSITION Y OF THE FONT
%  [FLOAT Hx(1)]  
%  [FLOAT Hy(1)]  
%  [FLOAT Ez(1)]  
%  [FLOAT Hx(2)]
%  [FLOAT Hy(2)]  
%  [FLOAT Ez(2)]
%  [FLOAT Hx(3)]
%  [FLOAT Hy(3)]
%  [FLOAT Ez(3)]
%   ... repeats until Ez(tc}
clear;

%Constants:
%----------
c=3e8; epsonZero=8.854e-12; miZero=1.257e-6; niZero=sqrt(miZero/epsonZero);
Dx=1.11e-3; Dy=1.86e-3; PI=3.154159265;

%Values of the source:
%---------------------
Im=0.3;%Current
Area=2.0313E-6;		%Area para calcular J = I/A
I0=Im*Area;

resp='y';
while resp~='n',
   %disp(' ')
   %ff=input('The frequency is 900MHz(1) or 1.8GHz(2)?');
   ff=2;
   if ff==1
      f=900e6;
   elseif ff==2
      f=1800e6;
   else
      f=900e6;
   end
   w=2*PI*f;%Angular Frequency
   beta=w/c;%beta
   
   %arq=input('What is the name of the Data File? ', 's');
   for p=1:10,
      arq=strcat('ResultsP',num2str(p),'.txt');
      disp(' ')
      disp('Calculating the Fields...')
      s=fopen(arq, 'r');
      frewind(s);  
      indice=-3;
      while 1      
         line = fgetl(s);     
         if ~isstr(line), break, end      
         %disp(line)
         if (indice==-3)
            tc=str2num(line); %finds the number of calculations
            indice=indice+1;
         elseif (indice==-2)
            deltaT=str2num(line); %finds the deltaT
            indice=indice+1;
         elseif (indice==-1)
            x=str2num(line); %finds the x coordinate of the point
            indice=indice+1;
         elseif (indice==0)
            y=str2num(line); %finds the y coordinate of the point
            indice=indice+1;
         else
            a(indice)=str2num(line);
            indice=indice+1;
         end
      end
      fclose(s);
      ii=size(a,2)/3;
      ii=size(a,2)/ii;
      k=1;
      for i=1:ii:size(a,2),
         AHx(k)=a(i);
         k=k+1;
      end
      k=1;
      for i=2:ii:size(a,2),
         AHy(k)=a(i);
         k=k+1;  
      end
      k=1;
      for i=3:ii:size(a,2),
         AEz(k)=a(i);
         k=k+1;
      end	
      
      %============================================================================
      %                              ANALITICAL SOLUTION:
      %============================================================================
      %Values of the desired point:
      %----------------------------
      if x==0
         x=Dx;	
      end
      if y==0
         y=Dy;
      end
      r=sqrt(x*x+y*y);
      
      %Calculation of each Hx, Hy and Ez Fields:
      %-----------------------------------------
      for TimeStep=1:1:tc
         t=(TimeStep-1)*deltaT; %picoseconds
         tt(TimeStep)=t;
         %ORIGINAL: Hx(TimeStep)= I0/(2*pi*r) * ( cos(w*t-beta*r) * ( -sin(atan(y/x) ) ) );
         %ORIGINAL: Hy(TimeStep)= I0/(2*pi*r) * ( cos(w*t-beta*r) * (  cos(atan(y/x) ) ) );
         %ORIGINAL: Ez(TimeStep)= -niZero * I0/(2*pi*r) * cos(w*t-beta*r); 
         %Errado: Hx(TimeStep)= -I0/(2*pi*r) * ( sin(w*t-beta*r) * ( -sin(atan(y/x) ) ) );
         %Errado: Hy(TimeStep)= -I0/(2*pi*r) * ( sin(w*t-beta*r) * ( cos(atan(y/x) ) ) );
         %Errado: Ez(TimeStep)= niZero * I0/(2*pi*r) * cos(w*t-beta*r); 
         %Certo: Hx(TimeStep)= real( -j*I0*(beta/4)*besselh(1, 2, beta*r) * (-sin(atan(y/x))) * exp(-j*w*t) );
         %Certo: Hy(TimeStep)= real( -j*I0*(beta/4)*besselh(1, 2, beta*r) * (+cos(atan(y/x))) * exp(-j*w*t) );
         modH= real(-j*I0*(beta/4)*besselh(1, 2, beta*r)*exp(-j*w*t));
         Ang=atan(y/x);
         Hx(TimeStep)= modH * (-sin(Ang));
         Hy(TimeStep)= modH * (+cos(Ang));
         Ez(TimeStep) = -real(-I0*(beta^2/(4*w*epsonZero))*besselh(0, 2, beta*r)*exp(-j*w*t) );      
      end
      
      %============================================================================
      %                            SHOWS THE RESULTS
      %============================================================================
      %Normalizes the values:
      %----------------------
      if (max(AHx)~=0 & max(AHy)~=0 & max(AEz)~=0)
         NHx=max(Hx)/(max(AHx));
         NHy=max(Hy)/(max(AHy));
         NEz=max(Ez)/(max(AEz));
         %   AHx=NHx*AHx;
         %   AHy=NHy*AHy;
         %   AEz=NEz*AEz;
      else
         disp('AHx, AHy ou AEz é zero...');
         NHx=999;
         NHy=999;
         NEz=999;
      end
          
      figure;
      %Plot a figure of Hx:
      %--------------------
      subplot(2,2,1);
      plot(tt,Hx,'b',tt,AHx,'m'); 
      title('Values of Hx in time'); 
      xlabel('time(s)'); ylabel('Hx(A/m)');
      
      %figure;
      %Plot a figure of Hy:
      %--------------------
      subplot(2,2,2);
      plot(tt,Hy,'b', tt, AHy, 'm');
      title('Values of Hy in time');
      xlabel('time(s)'); ylabel('Hy(A/m)');
      
      %figure;
      %Plot a figure of Ez:
      %--------------------
      subplot(2,2,3);
      plot(tt,Ez,'b', tt,AEz, 'm');
      title('Values of Ez in time');
      xlabel('time(s)'); ylabel('Ez(V/m)');
      
      %Plot the legend for The values:
      subplot(2,2,4);
      axis off;
      ponto=strcat('P', num2str(p));
      text(0.1,0.9,ponto);
      text(0.3,0.9,'Relation:');
      text(0.2,0.8,'NHx=');
      text(0.4,0.8,num2str(NHx));
      text(0.2,0.7,'NHy=');
      text(0.4,0.7,num2str(NHy));
      text(0.2,0.6,'NEz=');
      text(0.4,0.6,num2str(NEz));
      text(0.1,0.5,'Values on the point:');
      text(0.2,0.4,'x=');
      text(0.3,0.4,num2str(x));
      text(0.6,0.4,'y=');
      text(0.7,0.4,num2str(y));
      text(0.1,0.3,'LINES:');
      text(0.2,0.2,'blue = Analitical Solution');
      text(0.2,0.1,'magenta = FDT-TD');	
      
      %figure;
      %Plot a figure of Hx FD-TD:
      %--------------------------
      %subplot(2,2,1);
      %plot(tt,AHx,'m'); 
      %title('Values of Hx in time'); 
      %xlabel('time(s)'); ylabel('Hx(A/m)');
      
      %Plot a figure of Hy FD-TD:
      %--------------------------
      %subplot(2,2,2);
      %plot(tt,AHy,'m');
      %title('Values of Hy in time');
      %xlabel('time(s)'); ylabel('Hy(A/m)');
      
      %Plot a figure of Ez FD-TD:
      %--------------------------
      %subplot(2,2,3);
      %plot(tt,AEz,'m');
      %title('Values of Ez in time');
      %xlabel('time(s)'); ylabel('Ez(A/m)');
      
      %Plot the legend for The values:
      %--------------------------
      %subplot(2,2,4);
      %axis off;
      %text(0.1,0.7,'Values on the point:');
      %text(0.2,0.6,'x=');
      %text(0.3,0.6,num2str(x));
      %text(0.6,0.6,'y=');
      %text(0.7,0.6,num2str(y));
      %text(0.1,0.3,'LINES:');
      %text(0.2,0.1,'magenta = FDT-TD');
      
      %figure;
      %Plot a figure of Hx Analitic:
      %-----------------------------
      %subplot(2,2,1);
      %plot(tt,Hx,'b'); 
      %title('Values of Hx in time'); 
      %xlabel('time(s)'); ylabel('Hx(A/m)');
      
      %Plot a figure of Hy Analitic:
      %-----------------------------
      %subplot(2,2,2);
      %plot(tt,Hy,'b');
      %title('Values of Hy in time');
      %xlabel('time(s)'); ylabel('Hy(A/m)');
      
      %Plot a figure of Ez Analitic:
      %-----------------------------
      %subplot(2,2,3);
      %plot(tt,Ez,'b');
      %title('Values of Ez in time');
      %xlabel('time(s)'); ylabel('Ez(A/m)');
      
      %Plot the legend for The values:
      %subplot(2,2,4);
      %axis off;
      %text(0.1,0.7,'Values on the point:');
      %text(0.2,0.6,'x=');
      %text(0.3,0.6,num2str(x));
      %text(0.6,0.6,'y=');
      %text(0.7,0.6,num2str(y));
      %text(0.1,0.3,'LINES:');
      %text(0.2,0.1,'blue = Analitical Solution');
      
      %disp(' ')
      %resp=input('Would you like to run the program again? (y/n)?  ','s');
      resp='n';
      
   end; %finalizes the points
end; %finalizes the while resp!="n"
%============================================================================
disp(' ')
disp(' ')
disp('***************************************************************')
disp('*           Thank you for using this program.                 *')
disp('*                Last Update: 17/07/2001                      *')
disp('*                anaterrra@estrelar.net                       *')
disp('***************************************************************')
disp(' ')
disp(' ')
%============================================================================
