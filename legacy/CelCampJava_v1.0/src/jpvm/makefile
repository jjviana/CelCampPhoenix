JAVAC	= javac

ALL	= 	jpvmDataType.class		\
		jpvmDebug.class			\
		jpvmException.class		\
		jpvmBuffer.class		\
		jpvmTaskId.class		\
		jpvmMessage.class		\
		jpvmMessageQueue.class		\
		jpvmSendConnection.class	\
		jpvmRecvConnection.class	\
		jpvmConnectionSet.class		\
		jpvmRecvThread.class		\
		jpvmConnectionServer.class	\
		jpvmConfiguration.class		\
		jpvmTaskStatus.class		\
		jpvmEnvironment.class		\
		jpvmDaemonMessageTag.class	\
		jpvmDaemon.class		\
		jpvmConsole.class

all: $(ALL)

clean:
	rm -f *.class

jpvmDataType.class: jpvmDataType.java
	$(JAVAC) jpvmDataType.java

jpvmDebug.class: jpvmDebug.java
	$(JAVAC) jpvmDebug.java

jpvmException.class: jpvmException.java
	$(JAVAC) jpvmException.java

jpvmBuffer.class: jpvmBuffer.java
	$(JAVAC) jpvmBuffer.java

jpvmTaskId.class: jpvmTaskId.java
	$(JAVAC) jpvmTaskId.java

jpvmMessage.class: jpvmMessage.java
	$(JAVAC) jpvmMessage.java

jpvmMessageQueue.class: jpvmMessageQueue.java
	$(JAVAC) jpvmMessageQueue.java

jpvmSendConnection.class: jpvmSendConnection.java
	$(JAVAC) jpvmSendConnection.java

jpvmRecvConnection.class: jpvmRecvConnection.java
	$(JAVAC) jpvmRecvConnection.java

jpvmConnectionSet.class: jpvmConnectionSet.java
	$(JAVAC) jpvmConnectionSet.java

jpvmRecvThread.class: jpvmRecvThread.java
	$(JAVAC) jpvmRecvThread.java

jpvmConnectionServer.class: jpvmConnectionServer.java
	$(JAVAC) jpvmConnectionServer.java

jpvmConfiguration.class: jpvmConfiguration.java
	$(JAVAC) jpvmConfiguration.java

jpvmTaskStatus.class: jpvmTaskStatus.java
	$(JAVAC) jpvmTaskStatus.java

jpvmEnvironment.class: jpvmEnvironment.java
	$(JAVAC) jpvmEnvironment.java

jpvmDaemonMessageTag.class: jpvmDaemonMessageTag.java
	$(JAVAC) jpvmDaemonMessageTag.java

jpvmDaemon.class: jpvmDaemon.java
	$(JAVAC) jpvmDaemon.java

jpvmConsole.class: jpvmConsole.java
	$(JAVAC) jpvmConsole.java

#
# Experimenting with different buffer implementations
#
bufclean:
	/bin/rm -r -f	jpvmBuffer.java			\
			jpvmBuffer.class		\
			jpvmBuffer.java 		\
			jpvmBufferElement.class		\
			jpvmBufferElementContents.class

buf0:
	make bufclean
	cp jpvmBuffer-1-0.java jpvmBuffer.java
	javac jpvmBuffer.java

buf1:
	make bufclean
	cp jpvmBuffer-1-1.java jpvmBuffer.java
	javac jpvmBuffer.java
