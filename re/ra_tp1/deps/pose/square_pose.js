var POS = POS || {};

POS.SquareFiducial = function(modelSize, focalLength, width, height){
  this.modelSize = modelSize || 70;
  this.focalLength = focalLength || 600;
  this.u0 = width/2.0;
  this.v0 = height/2.0;
  this.au = this.focalLength;
  this.av = this.focalLength;

  this.setModelSize = function (modelSize) {
    this.modelSize = modelSize;  
  };

  this.setFocalLength = function (focal) {
    this.focalLength = focal;
    this.au = focal;
    this.av = focal;      
  };
  
  this.setMatrix = function (mat) {
    this.au = mat[0];
    this.av = mat[4];
    this.u0 = mat[2];
    this.v0 = mat[5];
  };
  
  this.setImageSize = function (width, height) {
    this.u0 = width/2;
    this.v0 = height/2;
  };
  
};


POS.SquareFiducial.prototype.pose = function(imagePoints){
  var u0 = this.u0;
  var v0 = this.v0;
  var au = this.au;
  var av = this.av;

  var ua = imagePoints[0].x ;
  var va = imagePoints[0].y ;
  var ub = imagePoints[1].x ;
  var vb = imagePoints[1].y ;
  var uc = imagePoints[2].x ;
  var vc = imagePoints[2].y ;
  var ud = imagePoints[3].x ;
  var vd = imagePoints[3].y ;
   
  var detm = uc*vd - vc*ud + ud*vb - ub*vd + ub*vc - uc*vb;
  var ZA = 1;
  var ZB = (ua * (vc - vd) + va * (ud - uc) + (uc*vd - ud*vc))/detm ;
  var ZC = (ua * (vb - vd) + va * (ud - ub) - (ud*vb - ub*vd))/detm ;
  var ZD = (ua * (vb - vc) + va * (uc - ub) + (ub*vc - uc*vb))/detm ;
  var r1 = ZC/ZA ;
  var r2 = ZD/ZB ;
    
  var tmp11 = (r1*(ua - u0)-(uc -u0))/au ;
  var tmp12 = (r1*(va - v0)-(vc -v0))/av ;
  var tmp21 = (r2*(ud - u0)-(ub -u0))/au ;
  var tmp22 = (r2*(vd - v0)-(vb -v0))/av ;
    
  var ZpA = -this.modelSize / Math.sqrt((r1-1)*(r1-1) + tmp11*tmp11 + tmp12*tmp12) ;
  var ZpB = -this.modelSize / Math.sqrt((r2-1)*(r2-1) + tmp21*tmp21 + tmp22*tmp22) ;
  var ZpC = r1 * ZpA;
  var ZpD = r2 * ZpB;

  var XA = ZpA/au *(ua-u0);
  var XB = ZpB/au *(ub-u0);
  var XC = ZpC/au *(uc-u0);
  var XD = ZpD/au *(ud-u0);
  
  var YA = ZpA/av *(va-v0);
  var YB = ZpB/av *(vb-v0);
  var YC = ZpC/av *(vc-v0);
  var YD = ZpD/av *(vd-v0);
  
  var position = [];
  position[0] = -(XA + XB + XC + XD)/4.0;
  position[1] = (YA + YB + YC + YD)/4.0;
  position[2] = (ZpA + ZpB + ZpC + ZpD)/4.0;
   
  var AC = [ - XC + XA, YC - YA, ZpC - ZpA ];
  var DB = [ - XB + XD, YB - YD, ZpB - ZpD ];
  
  var AB = [ XB - XA, YB - YA, ZpB - ZpA ];
  var DA = [ XA - XD, YA - YD, ZpA - ZpD ];
  
  
  var sV = this.sumVectors(AC,DB);
  var dV = this.diffVectors(DB,AC);
  
  var r1Star = this.scalVector(sV, 1.0/this.normVector(sV));
  var r2Star = this.scalVector(dV, 1.0/this.normVector(dV));
  var r3Star = this.crossProduct(r1Star,r2Star);
  
  var rotation = [ [ r1Star[0], r2Star[0], r3Star[0] ],
		   [ r1Star[1], r2Star[1], r3Star[1] ],
		   [ r1Star[2], r2Star[2], r3Star[2] ]];
  //console.log(rotation);
  return new POS.SimplePose(position, rotation);
};

POS.SquareFiducial.prototype.sumVectors = function(a,b) {
  return [ a[0]+b[0], a[1]+b[1], a[2]+b[2] ];  
};

POS.SquareFiducial.prototype.diffVectors = function (a,b) {
  return [ a[0]-b[0], a[1]-b[1], a[2]-b[2] ];  
};

POS.SquareFiducial.prototype.scalVector = function(a,s) {
  return [ a[0]*s, a[1]*s, a[2]*s ];  
};

POS.SquareFiducial.prototype.normVector = function (a) {
  return Math.sqrt(a[0]*a[0]+a[1]*a[1]+a[2]*a[2]); 
};

POS.SquareFiducial.prototype.crossProduct = function(a,b) {
    return [ a[1]*b[2] - a[2]*b[1],
	     a[2]*b[0] - a[0]*b[2],
	     a[0]*b[1] - a[1]*b[0]    
	    ];  
};


POS.SimplePose = function(pos, rot) {
    this.position = pos;
    this.rotation = rot;
};