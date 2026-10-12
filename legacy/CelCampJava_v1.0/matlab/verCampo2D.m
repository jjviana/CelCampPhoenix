clear;
Nmax=20;
x=20; y=30; z=100;
logar = true; % true ou false

for n=1:1:Nmax,
    n
    arq=sprintf('results/EHN%d.txt',n);
    s1=fopen(arq, 'r');
    frewind(s1);

    for i=1:x,
        line = fgetl(s1);
        Linha = str2num(line);
        l=1;
        for j=1:y;
            for k=1:z;
                C(n,i,j,k) = Linha(1,l);
                l = l+1;
            end
        end

    end

    for i=1:x,
        for j=1:y,
            valor = C(n,i,j,10);
            if (valor==0),
                E(i,j) = 0;
            else
                if (logar==1),
                    E(i,j) = log(abs(valor));
                else
                    E(i,j) = valor;
                end
            end
        end
    end
    figure;
    xx=1; yy=1;
    for i=1:x,
        for j=1:y,
            if (rem(i,2)==0 && rem(j,2)==1),
                Ex(xx,yy) = E(i,j);
                yy=yy+1;
            end
        end
        if (rem(i,2)==1)
            xx=xx+1; yy=1;
        end

    end
    pcolor(Ex);
end

       
