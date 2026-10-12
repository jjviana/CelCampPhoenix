disp(' ')
disp('***********************************************************')
disp('*                  VERSUSAN.M                             *')
disp('***********************************************************')
disp('*           This program was developed by                 *')
disp('*           Rodrigues, A.O. and Viana, J.J                *')
disp('*   Oriented by Ramirez. J. A. and Vasconcelos J. A.      *')
disp('* It can be used freely as long as the source is quoted.  *')
disp('*                     Feb/2002.                           *')
disp('***********************************************************')
disp(' ')
clear;

dirbase='resSusan';

%Ponto=input('Wich point (1-6) ?  ');
%while (Ponto<1  | Ponto>6)
%   Ponto=input('Wich point (1-6) ?  ');
%end   

for Ponto=1:6
   
Px=[13 73 73 73 101 153];
Py=[53 73 53 33 53 53];
cx1=Px(Ponto);
cy1=Py(Ponto);
cz1=3;

cx2=(cx1-1)/2;
cy2=(cy1-1)/2;
cz2=3;


message1=sprintf('Reading Susan Fields for Point %d...',Ponto);
disp(message1)
Fields2=ReadPointFields(dirbase,cx2,cy2,cz2);

message2=sprintf('E Fields for Point %d',Ponto);
figure;
subplot(2,2,1), plot(Fields2.Ex.data);
subplot(2,2,2), plot(Fields2.Ey.data);
subplot(2,2,3), plot(Fields2.Ez.data);
subplot(2,2,4), text(0.5,0.5,message2); axis off;

message3=sprintf('H Fields for Point %d',Ponto);
figure;
subplot(2,2,1), plot(Fields2.Hx.data);
subplot(2,2,2), plot(Fields2.Hy.data);
subplot(2,2,3), plot(Fields2.Hz.data);
subplot(2,2,4), text(0.5,0.5,message3); axis off;
end