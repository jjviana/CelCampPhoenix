ssx=50; ssy=76; ssz=76;

%Py=[28 36 26 36 46 26 26 26 26 26 26 26 26 26 26 26];
%Px=[28 36 36 26 46 26 28 30 32 34 36 38 40 42 44 46];   
%Pz=[76 76 76 76 76 76 76 76 76 76 76 76 76 76 76 76];
Pz= [ssx ssx     ssx     ssx     ssx    ssx       ssx      ssx      ssx       ssx      ssx      ssx      ssx       ssx      ssx      ssx       ssx       ssx       ssx      ssx      ssx      ssx       ssx      ssx      ssx      ssx      ssx       ssx      ssx       ssx      ssx      ssx       ssx      ssx     ];
Px= [ssy ssy+2 ssy+4 ssy+6 ssy+8 ssy+10 ssy+12 ssy+14 ssy+16 ssy+18 ssy+20 ssy+22 ssy+24 ssy+26 ssy+28 ssy+30 ssy+32 ssy+34 ssy+36 ssy+38 ssy+40 ssy+42 ssy+44 ssy+46 ssy+48 ssy+50 ssy+52 ssy+54 ssy+56  ssy+58 ssy+60 ssy+62 ssy+64 ssy+66];     
Py= [ssz ssz+2 ssz+4 ssz+6 ssz+8 ssz+10 ssz+12 ssz+14 ssz+16 ssz+18 ssz+20 ssz+22 ssz+24 ssz+26 ssz+28 ssz+30 ssz+32 ssz+34 ssz+36 ssz+38 ssz+40 ssz+42 ssz+44 ssz+46 ssy+48 ssy+50 ssy+52 ssy+54 ssy+56  ssy+58 ssy+60 ssy+62 ssy+64 ssy+66]; 

xS=ssx;
yS=ssy;
d = 0.008333/2;

%POINTS:
figure;
for (cont=1:size(Px,2))
   if cont==1
      message=sprintf('P0',cont-1);  
      text((Px(cont)-ssy)*d,(Py(cont)-ssy)*d,'x');
      text((Px(cont)-ssy)*d,(Py(cont)-ssy+2)*d,message);
      indice=-1;
   else
      message=sprintf('P%d',cont-1);  
      text((Px(cont)-ssy)*d,(Py(cont)-ssy)*d,'x');
      text((Px(cont)-ssy-1)*d,(Py(cont)-ssy+2)*d,message);
   end   
end

axis([0 (max(Px)-ssy+4)*d 0 (max(Px)-ssy+4)*d]);
zoom on
xlabel('Distance in Y [m]');
ylabel('Distance in Z [m]');

%title('Pontos no Dominio');

%DOMAIN:
figure;
message=sprintf('P0',cont-1);  
text((Px(cont)-ssy)*d,(Py(cont)-ssy)*d,'x');
text((Px(cont)-ssy)*d,(Py(cont)-ssy+2)*d,message);
indice=-1;
axis([0 150*d 0 150*d]);
xlabel('Domain Size in Y [m]');
ylabel('Domain Size in Z [m]');
