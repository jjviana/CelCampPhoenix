MAQUINAS:
----------------
jpvm = 1.8G Head Hetero With Pinna = 
ec2-75-101-168-61.compute-1.amazonaws.com:/vol3

FINALIZADO: jpvm2 = 1.8G Head Homog No Pinna = ec2-174-129-129-51.compute-1.amazonaws.com:/vol2

FINALIZADO: jpvm = 1.8G Head Hetero With Pinna = ec2-174-129-145-119.compute-1.amazonaws.com/vol3

FINALIZADO: jpvm2 = 1.8G Head Homog With Pinna = ec2-174-129-129-51.compute-1.amazonaws.com:/vol2

> cd ec2tools/bin/

> source env.sh (carrega variaveis na Amazon)

> ./describe-virtual-machines  (lista as maquinas que existem)
  Name                  Uptime     DnsName     InstanceId     
  backup-server         none       none        none           
  ana-backup-server     none       none        none           
  jpvm                  none       none        none           
  jpvm2                 none       none        none   

> ./start-virtual-machine -n jpvm (starta a maquinha batizada jpvm demora um pouco)
   
> ssh -i ../keys/gsg-keypair.identity root@"IP"  (loga remotamente na maquina)
	ssh -i ../keys/gsg-keypair.identity root@ec2-174-129-121-178.compute-1.amazonaws.com

[root@ip-10-251-101-236 ~]# vncserver (permite o acesso via VNC Chicken)

>copia o d2008 para o volume 3:
rsync -r --progress --delete -t -z -e 'ssh -i /Users/Ana/AmazonWS/ssh-pkey' d2008 root@ec2-174-129-121-178.compute-1.amazonaws.com:/vol3

Chicken of the vnc > Connection > new Connection > Host: "IP"
	ec2-67-202-48-221.compute-1.amazonaws.com
	Display: 1
	Password: (senha removida)
	CONNECT

	[root@IP] cd /vol3cd /CelCampJava_v1.0
	[root@IP] cd dist/
	[root@IP] java -Xmx4096M -cp CelCampJava_v1.0.jar:../lib TelaInicial
		alt+F    alt+N  ModeloModel.3dm
		alt+C   alt+S  ModeloModel_E2_1.8GHz_0.125W
		Tinit = ModeloModel_SteadyT2008
		Start
	
	[root@IP] xterm & (cria novo shell)
        [root@IP] cd build/classes
   	[root@IP] java -cp . jpvm.jpvmDaemon
	
> rsync -r --progress -z -e 'ssh -i /Users/Ana/AmazonWS/ssh-pkey' root@ec2-75-101-168-61.compute-1.amazonaws.com:/vol3/resultsHeadHeteroWithPinna_OK/Simul* .  (copia os arquivos zipando...)

> rsync -r --progress -z -e 'ssh -i /Users/Ana/AmazonWS/ssh-pkey' root@ec2-72-44-62-80.compute-1.amazonaws.com:/vol2/CPqD_Head/resultsHomoNoPinna_ok/Simul* .  (copia os arquivos zipando...)


> rsync -r --progress -z -e 'ssh -i /Users/Ana/AmazonWS/ssh-pkey' d2008 root@ec2-67-202-8-174.compute-1.amazonaws.com:/vol3

> scp -i /Users/Ana/AmazonWS/ssh-pkey root@ec2-174-129-144-191.compute-1.amazonaws.com:/vol2/CPqD_HeadCelCampJava_v1.0/AAA_Simulacoes3G_2008/results/\*.zip . (copia os resultados para a maquina atual)

[root@ip-10-251-101-236 ~]# halt (para sair)
~. (volta para a tela original)


Uteis:
--------
> ./tools/bin/ec2-describe-images  (lista as imagens disponiveis, a minha e:)
    IMAGE   ami-3c2fcb55    fc8_64/image.manifest.xml       444330339246    available       private         x86_64  machine aki-b51cf9dc    ari-b31cf9da
>./tools/bin/ec2-describe-volumes (lista os volumes)

Usados 1 vez:
-------------------
> ./tools/bin/ec2-create-volume -s 10 -z us-east-1a (criou volume de 10G)
