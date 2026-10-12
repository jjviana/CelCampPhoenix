disp(' ')
disp('***********************************************************')
disp('*                 VERMOVIEDIPOLE.M                         *')
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
dipsize=2;

%N=input ('Quantos instantes de tempo (N) ? ');   
instante=input('Qual instante no tempo ? ');

coord=input('Qual a coordenada do corte (x, y, ou z) ? ');
sizeX=51; sizeY=51; sizeZ=151;
Xsource=26; Ysource=26; Zsource=76;

maxmin=input('Deseja setar valores maximos e minimos (sim=1, nao=2) ? ');
%maxmin=1;

sizeX=(sizeX-1)/2; sizeY=(sizeY-1)/2; sizeZ=(sizeZ-1)/2;
Xsource=Xsource/2; Ysource=Ysource/2; Zsource=Zsource/2;
deltaX=8.33e-3;
deltaY=8.33e-3;
deltaZ=8.33e-3;
dt=2.277e-11/2;

freq=1.8e9; 
omega=2*3.14159265358979*freq;  
epzero=8.854e-12;   mizero=1.25663706144e-6;
l=(3e8/freq)/dipsize;     
k=omega/(3e8); ni=sqrt(mizero/epzero);       
Io=0.3;


minX=1; maxX=sizeX;
minY=1; maxY=sizeY;
minZ=1; maxZ=sizeZ;
if (coord=='x')
   minX=Xsource; maxX=Xsource;
elseif (coord=='y')
   minY=Ysource; maxY=Ysource;
elseif (coord=='z')
   minZ=Zsource; maxZ=Zsource;
end

calcula=1;
figure;
%===================== CALCULATES ANALYTICAL =============================     
for (conta=instante:instante)
   conta
   t(conta)=(conta-1)*dt;
   for xx=minX:maxX
      for yy=minY:maxY
         calcula=calcula+1

         for zz=minZ:maxZ                  
                                    
            cx=(xx-1);             cy=(yy-1);            cz=(zz-1);                            
            if (coord=='x')
               aa=yy; bb=zz;
            elseif (coord=='y')
               aa=xx; bb=zz;
            elseif (coord=='z')
               aa=xx; bb=yy;
            end
            
            %HX (0,1,0):    
            %Plano xyz:	
            r=sqrt(((cx-Xsource)*deltaX/2)^2+((cy-Ysource+1)*deltaY/2)^2+((cz-Zsource)*deltaZ/2)^2);
            R1=sqrt(((cx-Xsource)*deltaX/2)^2+((cy-Ysource+1)*deltaY/2)^2+((cz-Zsource)*deltaZ/2 - l/2)^2);
            R2=sqrt(((cx-Xsource)*deltaX/2)^2+((cy-Ysource+1)*deltaY/2)^2+((cz-Zsource)*deltaZ/2 + l/2)^2);    
            
            x=(cx-Xsource)*deltaX/2; y=(cy-Ysource+1)*deltaY/2; z=(cz-Zsource)*deltaZ/2;
            
            if (x~=0 & y~=0)       alfa=atan(y/x);   
            else
               if (x==0 & y==0) 
                  alfa=0; 
               elseif (y==0 & x>0)
                  alfa=0; 
               elseif (y==0 & x<0)
                  alfa=pi;
               else
                  alfa=atan(y/x);
               end         
            end
            if (alfa~=pi)         corrige1=-sin(alfa);
            else                  corrige1=0;      end
            if (alfa~=pi/2 | alfa~=3*pi/2)         corrige2=cos(alfa);
            else                  corrige2=0;      end  
            
            if (y~=0)
               Hfi=(-Io/(4*pi*j*y)) * ( exp(-j*k*R1) + exp(-j*k*R2) - 2*cos(k*l/2)*exp(-j*k*r) );
            else
               Hfi=0;
            end
            
            Hx(aa,bb)=real(exp(j*omega*t(conta)) * Hfi * (corrige1) );         
            
            %HY (1,0,0):
            
            %Plano Completo:
            r=sqrt(((cx-Xsource+1)*deltaX/2)^2+((cy-Ysource)*deltaY/2)^2+((cz-Zsource)*deltaZ/2)^2);
            R1=sqrt(((cx-Xsource+1)*deltaX/2)^2+((cy-Ysource)*deltaY/2)^2+((cz-Zsource)*deltaZ/2 - l/2)^2);
            R2=sqrt(((cx-Xsource+1)*deltaX/2)^2+((cy-Ysource)*deltaY/2)^2+((cz-Zsource)*deltaZ/2 + l/2)^2);            
            
            x=(cx-Xsource+1)*deltaX/2; y=(cy-Ysource)*deltaY/2; z=(cz-Zsource)*deltaZ/2;
            if (x~=0 & y~=0)       alfa=atan(y/x);   
            else
               if (x==0 & y==0) 
                  alfa=0; 
               elseif (y==0 & x>0)
                  alfa=0; 
               elseif (y==0 & x<0)
                  alfa=pi;
               else
                  alfa=atan(y/x);
               end         
            end
            if (alfa~=pi)         corrige1=-sin(alfa);
            else                  corrige1=0;      end
            if (alfa~=pi/2 | alfa~=3*pi/2)         corrige2=cos(alfa);
            else                  corrige2=0;      end      
            if (y~=0)
               Hfi=(-Io/(4*pi*j*y)) * ( exp(-j*k*R1) + exp(-j*k*R2) - 2*cos(k*l/2)*exp(-j*k*r) );      
            else
               Hfi=0;
            end
            Hfireal(aa,bb)=real(exp(j*omega*t(conta)) * Hfi );
            Hy(aa,bb)=real(exp(j*omega*t(conta)) * Hfi * (corrige2) );
                        
            %HZ (1,1,1):
            Hz(aa,bb)=0;
            
            %EX (1,0,1):      
            %Plano Completo:
            r=sqrt(((cx-Xsource+1)*deltaX/2)^2+((cy-Ysource)*deltaY/2)^2+((cz-Zsource+1)*deltaZ/2)^2);
            R1=sqrt(((cx-Xsource+1)*deltaX/2)^2+((cy-Ysource)*deltaY/2)^2+((cz-Zsource+1)*deltaZ/2 - l/2)^2);
            R2=sqrt(((cx-Xsource+1)*deltaX/2)^2+((cy-Ysource)*deltaY/2)^2+((cz-Zsource+1)*deltaZ/2 + l/2)^2);  
                       
            x=(cx-Xsource+1)*deltaX/2; y=(cy-Ysource)*deltaY/2; z=(cz-Zsource+1)*deltaZ/2;
            if (x~=0 & y~=0)       alfa=atan(y/x);   
            else
               if (x==0 & y==0) 
                  alfa=0; 
               elseif (y==0 & x>0)
                  alfa=0; 
               elseif (y==0 & x<0)
                  alfa=pi;
               else
                  alfa=atan(y/x);
               end         
            end
            if (alfa~=pi)         corrige1=sin(alfa);
            else                  corrige1=0;      end
            if (alfa~=pi/2 | alfa~=3*pi/2)         corrige2=cos(alfa);
            else                  corrige2=0;      end  
            if (x~=0 & R1~=0 & R2~=0 & r~=0)
               Ero= (j*ni*Io/(4*pi*x))* ( (z-l/2)*exp(-j*k*R1)/R1 + (z+l/2)*exp(-j*k*R2)/R2 - 2*z*cos(k*l/2)*exp(-j*k*r)/r );            
            else
               Ero=0;
            end            
            Ex(aa,bb)= real(exp(j*omega*t(conta)) * Ero *  (corrige2));    
                                    
            %EY (0,1,1):
            
            %Plano Completo:
            r=sqrt(((cx-Xsource)*deltaX/2)^2+((cy-Ysource+1)*deltaY/2)^2+((cz-Zsource+1)*deltaZ/2)^2);
            R1=sqrt(((cx-Xsource)*deltaX/2)^2+((cy-Ysource+1)*deltaY/2)^2+((cz-Zsource+1)*deltaZ/2 - l/2)^2);
            R2=sqrt(((cx-Xsource)*deltaX/2)^2+((cy-Ysource+1)*deltaY/2)^2+((cz-Zsource+1)*deltaZ/2 + l/2)^2);  
            
            x=(cx-Xsource)*deltaX/2; y=(cy-Ysource+1)*deltaY/2; z=(cz-Zsource+1)*deltaZ/2;
            if (x~=0 & y~=0)       alfa=atan(y/x);   
            else
               if (x==0 & y==0) 
                  alfa=0; 
               elseif (y==0 & x>0)
                  alfa=0; 
               elseif (y==0 & x<0)
                  alfa=pi;
               else
                  alfa=atan(y/x);
               end         
            end
            if (alfa~=pi)         corrige1=sin(alfa);
            else                  corrige1=0;      end
            if (alfa~=pi/2 | alfa~=3*pi/2)         corrige2=cos(alfa);
            else                  corrige2=0;      end  
            
            %Campo Completo:
            if (y~=0 & R1~=0 & R2~=0 & r~=0)               
               Ero= (j*ni*Io/(4*pi*y))* ( (z-l/2)*exp(-j*k*R1)/R1 + (z+l/2)*exp(-j*k*R2)/R2 - 2*z*cos(k*l/2)*exp(-j*k*r)/r );            
            else
               Ero=0;
            end
            Eroreal(aa,bb)=real(exp(j*omega*t(conta)) * Ero);
            Ey(aa,bb)=real(exp(j*omega*t(conta)) * Ero * (corrige1) );
                        
            %EZ (0,0,0):
            
            %Plano Completo:
            r=sqrt(((cx-Xsource)*deltaX/2)^2+((cy-Ysource)*deltaY/2)^2+((cz-Zsource)*deltaZ/2)^2);
            R1=sqrt(((cx-Xsource)*deltaX/2)^2+((cy-Ysource)*deltaY/2)^2+((cz-Zsource)*deltaZ/2 - l/2)^2);
            R2=sqrt(((cx-Xsource)*deltaX/2)^2+((cy-Ysource)*deltaY/2)^2+((cz-Zsource)*deltaZ/2 + l/2)^2);  
            
            x=(cx-Xsource)*deltaX/2; y=(cy-Ysource)*deltaY/2; z=(cz-Zsource)*deltaZ/2;
            
            modulo=ni*Io/(4*pi);
            if (R1~=0 & R2~=0 & r~=0)   
               Ezz= (-j*modulo)* ( exp(-j*k*R1)/R1 + exp(-j*k*R2)/R2 - 2*cos(k*l/2)*exp(-j*k*r)/r ); 
            else
               Ezz=0;
            end
       
            Ez(aa,bb)=real(exp(j*omega*t(conta)) * Ezz );                 
            
         end   %fim do loop em x
      end      %fim do loop em y
   end         %fim do loop em z
   
   %===================== PLOTS =============================================  
   message1=sprintf('Hx, Hy, Hz and Hfi (N=%d)',conta);
   message2=sprintf('Ex, Ey, Ez and Ero (N=%d)',conta);
     
   minimoH=-10;  maximoH=-minimoH;
	minimoE=-500; maximoE=-minimoE;
      
   subplot(5,2,1); text(0,0.3,message1); axis off;
   subplot(5,2,3); pcolor(Hx'); shading flat; if maxmin==1, caxis([minimoH maximoH]); end;   	     colorbar;  
   subplot(5,2,5); pcolor(Hy'); shading flat;  if maxmin==1, caxis([minimoH maximoH]); end; 	    colorbar;
   subplot(5,2,7); pcolor(Hz');shading flat;  if maxmin==1, caxis([minimoH maximoH]); end;  	    colorbar;
   subplot(5,2,9); pcolor(Hfireal');shading flat;  if maxmin==1, caxis([minimoH maximoH]); end;  colorbar;
   
   subplot(5,2,2); text(0,0.3,message2); axis off;
   subplot(5,2,4); pcolor(Ex');shading flat; if maxmin==1, caxis([minimoE maximoE]); end; colorbar;
   subplot(5,2,6); pcolor(Ey');shading flat; if maxmin==1, caxis([minimoE maximoE]); end; colorbar;
   subplot(5,2,8); pcolor(Ez');shading flat; if maxmin==1, caxis([minimoE maximoE]); end; colorbar;
   subplot(5,2,10); pcolor(Eroreal');shading flat; if maxmin==1, caxis([minimoE maximoE]); end; colorbar;
   
end %fim do loop em t