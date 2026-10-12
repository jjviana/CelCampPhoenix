#ifndef CLASSERROR_H
#define CLASSERROR_H
using namespace std;
#include <iostream>
#include <string>

//Basic Exception Class

class ClassError {
 private:
  string ErrorType;
 public:
  inline ClassError(string Type){ErrorType=Type;};
  inline string out() {return ErrorType;};
}; 


//Exception Class for class Field Case
class FCaseError : public ClassError {
 public:
  inline FCaseError(string Type):ClassError(Type){};
  
  //This class contains only the constructor because there 
  //is no need to treat each Error diferently in the present
  //version of the program. 
  //Neverthless, this implementation was chosen to allow 
  //a simple interpretation of functions based on the errors 
  //they throw.
  //An function that throws "FCaseError" means that a new
  //Case was not created.
  
};

//Exception Class for class Field
class FError : public ClassError{
 public:
  inline FError(string Type) : ClassError(Type){};
  
  //This class contains only the constructor because there 
  //is no need to treat each Error diferently in the present
  //version of the program. 
  //Neverthless, this implementation was chosen to allow 
  //a simple interpretation of functions based on the errors 
  //they throw.
  //An function that throws "FError" means that an error
  //occured in the main course of the program.
  
};


//Exception Class for class Formulation
class FormError : public ClassError {
 public:
  inline FormError(string Type) : ClassError(Type){};
  
  //This class contains only the constructor because there 
  //is no need to treat each Error diferently in the present
  //version of the program. 
  //Neverthless, this implementation was chosen to allow 
  //a simple interpretation of functions based on the errors 
  //they throw.
  //An function that throws "FormError" means that an error
  //occured during the implementation of a formulation to
  //calculate the fields.
  
};

//Exception Class for class Net
class NetError : public ClassError {
 public:
  inline NetError(string Type) : ClassError(Type){};
  
  //This class contains only the constructor because there 
  //is no need to treat each Error diferently in the present
  //version of the program. 
  //Neverthless, this implementation was chosen to allow 
  //a simple interpretation of functions based on the errors 
  //they throw.
  //An function that throws "NetError" usually means that an 
  //error occured during allocation of memory for the Net, or
  //that the file from wich the Net was being created was not
  //in the proper format.
  
};



#endif
