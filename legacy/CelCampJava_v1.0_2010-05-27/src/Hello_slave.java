/*
 * Hello_slave.java
 *
 * Created on 6 de Março de 2006, 14:03
 */

/**
 *
 * @author juliano
 */

import jpvm.*;
import java.io.*;

public class Hello_slave {
    
    
    public static void main(String args[]) {
        try {
		// Enroll in the parallel virtual machine...
		jpvmEnvironment jpvm = new jpvmEnvironment();

		// Get my parent's task id...
		jpvmTaskId parent = jpvm.pvm_parent();
	
		// Send a message to my parent...
		jpvmBuffer buf = new jpvmBuffer();
		buf.pack("Hello from jpvm task, id: "+
			jpvm.pvm_mytid().toString());
		jpvm.pvm_send(buf,parent,12345);

		// Exit from the parallel virtual machine
		jpvm.pvm_exit();
	    } 
	    catch (jpvmException jpe) {
		System.out.println("Error - jpvm exception");
	    }
    }
    
}
