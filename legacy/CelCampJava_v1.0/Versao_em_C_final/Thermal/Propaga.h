//ADDING THE INTERFACE CONDITIONS:
//===============================
//The "MaterialModel *m" of the FDTDSimulator
//  is used to gather information on the material properties.
//
//Therefore if we create a new pointer, called "CellMat", it 
//  could be used as above, where i, j and k are the location 
//  of the cell:
//     Material CellMat = m->getMaterial(i,j,k)
//
//This returns a Material object, which properties are:
//  CellMat.ep - electric permeability [F/m]
//  CellMat.si - electric condutivity [S/m]
//  CellMat.ro - magnetic resistivity [ohm/m]
//  CellMat.mi - magnetic permeability
//  CellMat.density - density [kg/m3]
//
//The original formulas for Ca, Cb, Da and Db are:
//  Ca=(1 - (si*deltaT)/(2*ep)) / (1 + (si*deltaT)/(2*ep));
//  Cb=(deltaT / ep) / (1 + (si*deltaT)/(2*ep));
//  Da=(1 - (ro*deltaT)/(2*mi)) / (1 + (ro*deltaT)/(2*mi));
//  Db=(deltaT / mi) / (1 + (ro*deltaT)/(2*mi));
//
//The modified formulas are:
//  Ca=(1 - ( ((si1+si2)/2) * deltaT ) / ( 2 * ((ep1+ep2)/2) ) ) / (1 + ( ((si1+si2)/2) * deltaT ) / ( 2 * ((ep1+ep2)/2) ));
//  Cb=(deltaT / ((ep1+ep2)/2) ) / (1 + ( ((si1+si2)/2) * deltaT ) / ( 2 *((ep1+ep2)/2) ));
//  Da=(1 - ( ((ro1+ro2)/2) * deltaT ) / ( 2 * ((mi1+mi2)/2) ) ) / (1 + ( ((ro1+ro2)/2) * deltaT ) / ( 2 * ((mi1+mi2)/2) ));
//  Db=(deltaT / ((mi1+mi2)/2) ) / (1 + ( ((ro1+ro2)/2) * deltaT ) / ( 2 *((mi1+mi2)/2) ));
//  where the "1" and "2" indications represents the media involved.
//
//To represent this situation, each of this coefficients will be calculated for the 
//  directions involved, i.e., there will be two Ca, Cb, Da and Db for each direction
//  of propagation.

//Writing Code:

//Dentro do primeiro ciclo de i,j,k - Campo H
//  "materialmesh" ja contem a malha
//  "p" contem o material no ponto  = mesh.getData(i,j,k)
//  "pIplus", "pJplus" e "pKplus" contem o material nos pontos adjacentes em cada direcao + 1
//  "pIminus", "pJminus" e "pKminus" contem o material nos pontos adjacentes em cada direcao - 1
//  
