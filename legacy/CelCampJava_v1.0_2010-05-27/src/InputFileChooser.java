/*
 * InputFileChooser.java
 *
 * Created on August 26, 2004, 3:25 PM
 */

/**
 *
 * @author  juliano
 */

import java.io.*;
import java.awt.*;
import java.awt.event.*;
import javax.swing.*;
import javax.swing.filechooser.*;

public class InputFileChooser extends javax.swing.JPanel implements ActionListener {
    
    private JFileChooser fc;
    public File InputFile;    
    
    /** Creates a new instance of InputFileChooser */
    public InputFileChooser(String CurrentDir) {
        
         //Create a file chooser
        fc = new JFileChooser(CurrentDir); 
        int retval = fc.showOpenDialog(InputFileChooser.this);
        if (retval == JFileChooser.APPROVE_OPTION) {
            InputFile = fc.getSelectedFile();
            //This is where a real application would open the file.
            //System.out.println("Arquivo Escolhido = " + InputFile.getName() + "\n");
        }
        else {
            //System.out.println("Cancelado!\n");
        }
          
        
    }
    
    public void actionPerformed(ActionEvent e) {
    }
    
}
