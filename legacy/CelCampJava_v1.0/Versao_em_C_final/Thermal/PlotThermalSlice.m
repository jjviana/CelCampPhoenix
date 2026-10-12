clear;
basedir=input('Results Dir (ex:"fatia10z") : ');
n=input('Time Instants (ex: N=10) : ');
pulo=input('Qual o espacamento ? ');
%deltaT = input('Qual o Delta T ?');
deltaT=0.1
%Dx = input('Qual o Delta X ?');
Dx = 0.01
%Dy = input('Qual o Delta Y ?');
Dy = 0.01

%loga=input('Logaritmic (1) or normal (2) ? ');
loga=2;

%triset=input('Temperature Rise (1) or Absolute Temperature (2) ? '); 
triset = 2;

%maxmin=input('Set max and min (1) or not (2) ? ');
maxmin=1;
if maxmin==1
   %escolhe=input('Choose max and min (1) or not (2) ? ');
   escolhe=1;
end
if maxmin==1
   if (escolhe==1)
      maximo=input('Digite o MAXIMO : ');
      %maximo = 40;
      minimo=input('Digite o MINIMO : ');
      %minimo = 0;
   else
      if (loga==1)
         if (triset==1)
            maximo=4;
            minimo=-4;
         else
            maximo=2.5;
            minimo=1.5;
         end
         
      else
         if (triset==1)
            maximo=1;
            minimo=0;
         else   
            maximo=120;
            minimo=36;
         end
      end
   end   
end

SizeMovie = (n+1)/pulo;
M = moviein(SizeMovie);
tt=0;
for (t=0:pulo:n-1)
    tt = tt+1
    filename=sprintf('Thermal%d.txt',t);
    
curdir=pwd;
chdir(basedir);
f=fopen(filename,'r');

if (f==-1)
   disp('It was not possible to open the file!');
else
   xx=1; yy=1;
   line=fgets(f);
   SizeX=str2num(line);
   line=fgets(f);
   SizeY=str2num(line);
   if feof(f)
      data=zeros(SizeX,SizeY);      
   else    	
      for i=0:SizeX-1,       
         for j=0:SizeY-1,                      
            line=fgets(f);                            
            data(xx,yy)=str2num(line);
            yy=yy+1;
         end
         xx=xx+1;
         yy=1;
      end
      fclose(f);
            
      xx=1;      yy=1;
      for i=0:2:SizeX-1,            
         for j=0:2:SizeY-1,      
            if (loga==1),
               if (data(i+1,j+1)==0)
                  if (triset==2)
                     data2(tt, xx,yy)=log10(abs(1e-12));
                  else
                     data2(tt, xx,yy)=0;
                  end
                  
               else
                  if (triset==2)
                     data2(tt, xx,yy)=log10(abs(data(i+1,j+1)));
                  else
                     valor=data(i+1,j+1)-36.799999237060546875;
                     if valor==0
                        data2(tt, xx,yy)=0;
                     else	                        
                        data2(tt,xx,yy)=log10(abs(valor));
                     end
                     
                  end
                  
               end               
            else               
               data2(tt,xx,yy)=data(i+1,j+1);               
            end
            yy=yy+1;
         end
         xx=xx+1;
         yy=1;           
      end
      %figure;
     
      media = 0;
      valmed=0;
      for xc=1:size(data2,2),
          for yc=1:size(data2,3),
              mm(xc,yc) = data2(tt,xc,yc) ;             
              if (mm(xc,yc)~=25)
                  media = media + mm(xc,yc);
                  valmed= valmed+1;   
              end
          end
      end
      
      if valmed~=0,
          mediaCopo(tt) = media/valmed;
      end
      
      pcolor(mm');
      if maxmin==1, caxis([minimo maximo]); end;
      texto = sprintf('Heat Propagation in t = %4.4f s', t*deltaT);
      title(texto); 
      xlabel('Distance in X [cm]'); 
      ylabel('Distance in Y [cm]');
      %axis([1, size(data2,1),1,  size(data2,2)]);
      colorbar;                                    
      M(:,tt) = getframe(gcf);     

  end
   
end
chdir(curdir);

end     

movie(gcf, M)
figure;
plot(mediaCopo);