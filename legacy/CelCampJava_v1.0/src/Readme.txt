README CelCampJava_v1.0
Atualizado 22/02/2007
Autor: Ana de Oliveira Rodrigues

Estado Atual:
-------------
- nao grava em disco binario
   
- calculando o aumento de temperatura sem SAR (29/3/07) para o LOR
            k - implementei o CalculateTFrameParallel (29/3/07)
            k - criei o FDTD_T_slave.java (29/3/07)
            k - grava os resultados em disco (30/3/07)
            k - a paralelizacao esta' funcionando (30/3/07)
            k - implementar no calculo de T 
                k - calor gerado pelo metabolismo interno (2/4/07)
                k - calor trocado com o sangue (2/4/07)
                k - variacao do calor por conducao para outros tecidos (4/4/07)
                k - calor gerado pela SAR=0 (2/4/07)
                k - calor perdido por radiacao (2/4/07)
                k - calor perdido por conveccao (2/4/07)
                k - calor perdido por evaporacao (2/4/07)
            k - Expand() foi colocado dentro do calculo de EH (4/4/07)
            k - Calculo da T com esfera de metal no ambiente erro maximo = 1,47% (9/4/07)
                k - esfera de steel, hc=115[W/(m2.oC)], Tenv = 450oC, Ttissues=90oC 
                k - modelo de um unico cubo de metal (Cube_21_21_21.3dm)
                k - modelo com 5 cubos fazendo 1 cubo de metal (Cube_5_21_21_21.3dm)
                k - arquivo para comparar os dois (CompareCubeSteel_2007.m)
                k - gradB nao PRECISA SER FEITO, ja' que o material e' igual dentro dos cubos
            k - aumentei o tanto de memoria que o slave pode alocar na jpvmDaemon.java: args[3]="-Xmx512M";
            k - aumentei o tanto de memoria que o master pode alocar: projeto->propriedades->executar->opcoes da vm-> -Xmx512M
	    k - cornea estava perdendo calor por conveccao (9/04/2007)
            k - so' mandar a resposta para master a cada "skip", evitando comunicacao desnecessaria (10/4/2007)
        
	    - Situacao 0 (controle)  : Tenv = 25oC, hc = 2.7[W/(m2.oC)], Tblood = 36.8oC, Ttissues = 36.8oC
            	k - rodando em duas maquinas, kurosawa e casa: tempo de simul aprox. 25h
		k - dar boot na maquina de casa e abrir quatro shells (s1, s2, s3, s4)
		s1> cd AAA_AnaPermanente/CelCampJava_v1.0
		s1> copiar o programa: rsync -e ssh -r . juliano@10.0.0.6:CelCampJava_v1.0 (senha removida)
		s1> entrar no diretorio: cd build/classes/
		s1> executar o pvmDaemon local: java -cp . jpvm/jpvmDaemon
		s2> fazer ssh 10.0.0.6 (senha removida)
		s2> entrar no diretorio: cd CelCampJava_v1.0/build/classes/
		s2> executar o pvmDaemon remoto: java -cp . jpvm/jpvmDaemon
		s3> entrar no diretorio: cd AAA_AnaPermanente/CelCampJava_v1.0/build/classes/
		s2> executar o pvmConsole: java -cp . jpvm/jpvmConsole
		s3> adicionar o host: add host: casa    port: xxxx (pegar no s2)
		s4> cd AAA_AnaPermanente/CelCampJava_v1.0/build/classes
		s4> executa o programa: java -Xmx700M -cp ../../lib/:. TelaInicial
			File -> New -> JohnDoe_v1.0.3dm (espera abrir a tela de SimulData)
			Calculate -> T -> Start
            k - rodando em 1 maquina na Amazon.com
		k - tar czvf celcamp.tar.gz build  lib John3Doe_* (para criar um pacote com o programa para enviar para a maquina remota)
		k - scp celcamp.tar.gz juliano@10.0.0.4: (manda para o Juliano mandar para a Amazon)
                k - tempo total de simulacao para 10.000 instantes de temp = 1.234min = 20,56h (7,4s cada iteracao)
	    - implementar leitura de arquivo inicial de T nos tecidos

            - Situacao 1 (ambiente)  : Tenv = 25oC, hc = 2.7[W/(m2.oC)], Tblood = 37.8oC, Ttissues = leitura
            - Situacao 2 (exercicio) : Tenv = 40oC, hc = 2.7[W/(m2.oC)], Tblood = 36.8oC, Ttissues = leitura
            - Situacao 3 (amb+exerc) : Tenv = 40oC, hc = 2.7[W/(m2.oC)], Tblood = 37.8oC, Ttissues = leitura
            
	    
            - implementar paralelizacao da temperatura
            

ok - otimizacoes no tempo:
   ok - criei isConductor() em Material (02/04/07)
   ok - mudei o sendBorder() para mandar o vetor direto (02/04/07)
    -- 1 computador:                                             | speed up
    tempo simul. (NPROC = 3)               =  5min e 24s = 324s  |  REFERENCIA 
    tempo simul. (NPROC = 3)               =  1min e 04s =  64s  |  -71,4% (NOVA REFERENCIA) 

ok - descobrimos onde estavam os gargalos (profiler) (01/04/07)
    - Juliano fez uma mudanca no jeito de mandar e receber o parcial, que eu burrei total (31/03/07)
    -- 1 computador:                                             | speed up
    tempo simul. (NPROC = 3)               = 14min e 51s = 891s  |  REFERENCIA
    tempo simul. (NPROC = 3)               =  5min e 24s = 324s  |  -64% (NOVA REFERENCIA) 
    tempo simul. com profiler              = 52min e 23s = 3144s |  (so' para saber)
            
ok - testando o efeito da paralelizacao:
  -- 1 computador:                                             | speed up
  tempo simul. (NPROC = 3)               = 14min e 51s = 891s  |  REFERENCIA
  tempo simul. (NPROC = 1)               = 10min e 08s = 608s  |  -31.8%
  tempo simul. (NPROC = 7)               = 25min e 59s = 1559s |  +75.0%
  
ok - adicionou "-server" no jpvmDaemon.java (na linha 678), o que otimiza a pre-compilacao do codigo (28/02/07).
     tempo simul. (-server, gravando)    = 14min e 51s = 891s  |  -9.2% (NOVA REF)

ok - testando o tempo de gravacao:
   - simulacao em 28/02/2006 - N=61 (aprox.1T), Dominio: 21x21x21, f=1.8GHz 
  -- 1 computador:                                             | speed up
  tempo simul. (gravando a cada dt)      = 16min e 14s = 975s  |  REFERENCIA    
  tempo simul. (sem gravar)              = 16min e 03s = 963s  |  -1.23%

ok - mudar a alocacao do double[][][] data para um doubleArray3D segundo J.E.Moreira
   - simulacao em 28/02/2006 - N=61 (aprox.1T), Dominio: 21x21x21, f=1.8GHz 
  -- 1 computador:                                             | speed up
  tempo simul. (de 22/02/2006)           = 16min e 21s = 981s  |    -
  tempo simul. (com double[] data)       = 16min e 14s = 975s  |  -0.6%  (NOVA REF)

ok - simulacao em 22/02/2006 - N=61 (aprox.1T), Dominio: 21x21x21, f=1.8GHz 
  -- 1 computador:                                                   | speed up
  tempo simul. (kurosawa)                = 16min e 21s = 981s  |    -
  -- 2 proc:                                                   |
  tempo simul. (kurosawa e casa)         = 14min e 48s = 888s  |  -9.5%
  tempo simul. (kurosawa e apple)        = 16min e 01s = 961s  |  -2.0%
  -- 3 proc:                                                   |
  tempo simul. (kurosawa, casa e apple)  = 13min e 51s = 831s  |  -15.3%
  
  casa = amd duron, 1.3GHz, 512MB de RAM
  apple = powerbook g4, 1.3GHz, 1.5GB de RAM
  kurosawa = celeron, 1.5GHz, 768MB de RAM 

ok - SLAVE TEM CCA!(22/02/2007)
ok - SLAVE RECEBE E ENVIA BORDAS!(13/12/2006)
ok - SLAVE FAZ O CALCULO DO FDTD! 
ok - O FDTD LEVA AS FONTES EM CONSIDERACAO!(13/12/2006) 
ok - AS FONTES ESTAO APENAS NO PEDACO CERTO! (13/12/2006)
ok - MASTER MANDA OS MATERIAIS! (18/05/2006)
ok - SLAVE RECEBE OS MATERIAIS! (18/05/2006)
ok - MASTER JUNTA OS DADOS EM UM UNICO! (18/05/2006)
ok - AO GRAVAR O ARQUIVO O VALOR DO E E' CALCULADO POR MEDIA! (18/05/2006)
ok - MASTER RECEBE RESPOSTA PARCIAL DOS SLAVES! (18/05/2006)
ok - SLAVE MANDA RESPOSTA PARCIAL! (18/05/2006)
ok - MASTER GRAVA A RESPOSTA EM DISCO! (16/05/2006)
ok - MASTER MANDA AS FONTES PARA SLAVES! (16/05/2006)

Como rodar:
-----------
1) abra um shell (S1)
2) inicialize o JPVM Daemon (agora localmente, evita copiar os .class)
   S1 > cd AAA_AnaPermanente/CelCampJava_v1.0/build/classes
   S1 > java -cp . jpvm.jpvmDaemon
        jpvm daemon: Kurosawa, port #32871
3) abra outro shell (S2)
4) inicialize o JPVM Console (em cada maquina, o diretorio deve ser o mesmo)
   S2 > cd AAA_AnaPermanente/CelCampJava_v1.0/build/classes
   S2 > java jpvm/jpvmConsole
        jpvm>
5) adicione as maquinas remotas (opcional)
        jpvm> add
                Host name   :
                Port number :
6) rode o programa no NetBeans, ou direto na linha de comando (java -Xmx512M TelaInicial)
7) abra e rode o caso de teste:
   * Copacabana v1.0 -> File -> New -> Air_21_21_21.3dm
   * JPVM -> Test (aguarda se a JPVM esta' funcionando ok)
   * Calculate -> Eletromagnetic Fields (EH)
   * Start
8) os resultados sao gravados em /home/juliano/AAA_AnaPermanente/CelCampJava_v1.0/results/EN...

