> cd AmazonWS
> source env.sh (carrega variaveis na Amazon)
> ./tools/bin/ec2-describe-instances (lista as maquinas que estao rodando)
> ./tools/bin/ec2-run-instances ami-3c2fcb55 -z us-east-1a --instance-type=m1.large -k gsg-keypair (Estartando a maquina)
    RESERVATION     r-d29847bb      444330339246    default
INSTANCE        i-b7da75de      ami-3c2fcb55                    pending gsg-keypair     0               m1.large        2008-10-14T21:05:04+0000       us-east-1a       aki-b51cf9dc    ari-b31cf9da

> ./tools/bin/ec2-describe-instances (ve se esta funcionando...)
    (enquanto estiver pending, nao esta funcionando ainda)
    i-a04dfec9 -> INSTANCE que muda...
   ec2-67-202-48-221.compute-1.amazonaws.com -> IP que muda...

> ./tools/bin/ec2-attach-volume vol-4e1efb27 -i "INSTANCE" -d /dev/sdh
	./tools/bin/ec2-attach-volume vol-4e1efb27 -i i-a04dfec9 -d /dev/sdh
	./tools/bin/ec2-attach-volume vol-1eb75377 -i i-a04dfec9 -d /dev/sdi
	./tools/bin/ec2-describe-volumes (ve se attachou)

> ssh -i ssh-pkey root@"IP"  (loga remotamente na maquina)
	ssh -i ssh-pkey root@ec2-67-202-48-221.compute-1.amazonaws.com

> yes

[root@ip-10-251-101-236 ~]# mkdir /vol (cria o volume permanente)
[root@ip-10-251-101-236 ~]# mkdir /vol2 (cria o volume permanente 2)

[root@ip-10-251-101-236 ~]# mount /dev/sdh /vol (monta o volume permanente)
[root@ip-10-251-101-236 ~]# mount /dev/sdi /vol2 (monta o volume permanente)

[root@ip-10-251-101-236 ~]# vncserver (permite o acesso via VNC Chicken)

shell 2 > rsync -e 'ssh -i /Users/Ana/AmazonWS/ssh-pkey' -r -v CelCampJava_v1.0 root@IP:/vol (copia os arquivos para a maquina remota)
	rsync -e 'ssh -i /Users/Ana/AmazonWS/ssh-pkey' -r -v CelCampJava_v1.0 root@ec2-67-202-48-221.compute-1.amazonaws.com:/vol
	rsync -e 'ssh -i /Users/Ana/AmazonWS/ssh-pkey' -r -v d2008 root@ec2-67-202-48-221.compute-1.amazonaws.com:/vol

Chicken of the vnc > Connection > new Connection > Host: "IP"
	ec2-67-202-48-221.compute-1.amazonaws.com
	Display: 1
	Password: (senha removida)
	CONNECT

	[root@IP] cd /vol/CelCampJava_v1.0
	[root@IP] cd dist/
	[root@IP] java -Xmx2048M -cp CelCampJava_v1.0.jar:../lib TelaInicial
		alt+F    alt+N  ModeloModel.3dm
		alt+C   alt+S  ModeloModel_E2_1.8GHz_0.125W
		Tinit = ModeloModel_SteadyT2008
		Start
	
	[root@IP] xterm & (cria novo shell)
                   [root@IP] cd build/classes
   	[root@IP] java -cp . jpvm.jpvmDaemon
	
> rsync -r --progress -z -e 'ssh -i /Users/Ana/AmazonWS/ssh-pkey' root@ec2-67-202-48-221.compute-1.amazonaws.com:/vol/CelCampJava_1.0/CPqD/results_Dipolo .  (copia os arquivos zipando...)

> scp -i /Users/Ana/AmazonWS/ssh-pkey root@ec2-67-202-48-221.compute-1.amazonaws.com:/vol/CelCampJava_v1.0/AAA_Simulacoes3G_2008/results/\*.zip . (copia os resultados para a maquina atual)

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
