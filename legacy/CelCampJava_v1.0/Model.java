/*
 * Model.java
 *
 * Created on October 31, 2002, 11:53 AM
 */

package com.logicstyle.logicview.model;

/**
 * This interface represents any kind of model
 * @author  juliano
 */
public interface Model {
    
    /**
     * Returns the model's name
     *@return The model's name (cannot be null)
     */
    
    public String getName();
    
    /**
     * Return a human readable description of the model
     *@ return a model deescription (can be null)
     */
    
    public String getDescription();
    
}
