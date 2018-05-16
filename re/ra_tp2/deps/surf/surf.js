/**
 * Statut implémentation : 
 * IPoint (ok), Surf (ok), surflib (à faire), fasthessian (à faire)
 */ 
'use strict';

/**
 * @class SURF
 * @classdescr Global object that declares all functions and structures for the port
 * of OpenSurf in Javascript
 */
var SURF = {};


SURF.OCTAVES = 5;
SURF.INTERVALS = 4;
SURF.THRESH = 0.0004;
SURF.INIT_SAMPLE = 2;
SURF.FLT_MAX = 1e37; // look for this



// one of the most important function of surflib
/**
 * Detects SURF features and extract their corresponding descriptors in a given
 * image. Detection should be performed on gray images only. If it is not the case
 * then use {@link SURF.grayImage|grayImage()} 
 * @param image {ImageData} image into which to start the detection.
 * @param octaves {number} number of octaves on which to perform detection (default:5)
 * @param intervals {number} number of intervals on which to perform detection (default:4)
 * @param initSample {number} number of samples when initializing the algorithm (default: 2)
 * @param threshold {number} threshold to consider feature as a good feature (default: 0.0004) 
 * @return a list of points with their descriptors 
 * 
 */
SURF.surfDetDes= function(image, octaves, intervals, initSample, threshold ) {//valid
  SURF.OCTAVES = octaves || 5;
  SURF.INTERVALS = intervals || 4;
  SURF.THRESH = threshold || 0.0004;
  SURF.INIT_SAMPLE = initSample || 2;

  var img = SURF.Integral(image);
  
  var fh = new SURF.FastHessian(img);
  var iPoints= fh.getIPoints();
  var des = new SURF.Surf(img,iPoints);
  des.getDescriptors(false);
  return iPoints;
};

SURF.round = function(x) {//valid
    return (x+0.5)|0;
};

SURF.min = function(a,b) {//valid
    return (a<b)?a:b;
};

SURF.max = function(a,b) {//valid
    return (a>b)?a:b;
};

// 

SURF.drawIPoint = function(context, point, tailSize) {
  var s, o;
  var r1, c1, r2, c2, lap;
  tailSize = tailSize || 0;
  
  s = (2.5 * point.scale);
  o = point.orientation;
  lap = point.laplacian;
  r1 = SURF.round(point.y);
  c1 = SURF.round(point.x);

  // Green line indicates orientation
  if (o) { // Green line indicates orientation
    c2 = SURF.round(s * Math.cos(o)) + c1;
    r2 = SURF.round(s * Math.sin(o)) + r1;
    context.strokeStyle = "#0f0";
    context.beginPath();
    context.moveTo(c1,r1);
    context.lineTo(c2,r2);
    context.closePath();
    context.stroke();
  } else  {// Green dot if using upright version
    context.strokeStyle = "#0f0";
    context.fillStyle="#0f0";
    context.beginPath();
    context.arc(c1,r1,1,0, 2*Math.PI, false);
    context.stroke();
  }
    //cvCircle(img, cvPoint(c1,r1), 1, cvScalar(0, 255, 0),-1);

  if (lap >= 0) { // Blue circles indicate light blobs on dark backgrounds
    context.strokeStyle = "#00f";
    context.fillStyle="#00f";
    context.beginPath();
    context.arc(c1,r1,s,0, 2*Math.PI, false);
    context.stroke();
  } else { // Red circles indicate light blobs on dark backgrounds
    context.strokeStyle = "#f00";
    context.fillStyle="#f00";
    context.beginPath();
    context.arc(c1,r1,s,0, 2*Math.PI, false);
    context.stroke();
  }

  // Draw motion from ipoint dx and dy
  if (tailSize) {
    context.strokeStyle = "#fff";
    context.beginPath();
    context.moveTo(c1,r1);
    context.lineTo(c1+point.dx*tailSize,r1+point.dy*tailSize);
    context.closePath();
    context.stroke();
  }
};

/**
 * for debugging purpose, this function displays detected features on a canvas
 * @param context {object} canvas on which the image is drawn 
 * @param points {array} list of detected points 
 * @param tailSize {number} size of features when drawn on the image.
 */
SURF.drawIPoints = function(context,points,tailSize) {
    var i;
    tailSize = tailSize || 0;
    for (i=0; i < points.length; i++) {
	SURF.drawIPoint(context, points[i], tailSize);
    }  
};


/**
 * Transforms a color image into a gray image.
 * @param image {ImageData} color image to convert
 * @return an image encoded in gray levels
 */
SURF.grayImage = function(image) {//valid
    var gray = {};
    var i, d, gd, d4, ld4;
    gray.width =  image.width;
    gray.height = image.height;
    
    gray.data= [];
    d = image.data;
    gd = gray.data;
    // now we should transform actual image in gray image. 
    for (i = 0; i < d.length ; i+=4) {
      d4 = i/4;
      ld4 = 0.299*d[i] + 0.587*d[i+1] + 0.114*d[i+2];
      //var ld4 = 0.2126*d[i] + 0.7152*d[i+1] + 0.0722*d[i+2];
      gd[d4]=ld4 / 255.0;
    }
    return gray;
};


SURF.BoxIntegral = function( image, row, col, rows, cols) {//valid
    var data = image.data;
    var step = image.width; 
    var A=0.0, B=0.0, C=0.0, D=0.0;
    // using step instead of image.width reduces time spent in detection by -20%
    var r1 = SURF.min(row, image.height) -1;
    var c1 = SURF.min(col, step) -1;
    var r2 = SURF.min(row + rows, image.height) -1;
    var c2 = SURF.min(col + cols, step) -1;
        
    if (r1 >= 0 && c1 >= 0)  { A = data[r1 * step + c1]; }
    if (r1 >= 0 && c2 >= 0)  { B = data[r1 * step + c2]; }
    if (r2 >= 0 && c1 >= 0)  { C = data[r2 * step + c1]; }
    if (r2 >= 0 && c2 >= 0)  { D = data[r2 * step + c2]; }
        
    return SURF.max(0.0, A- B -C + D);
};


SURF.Integral = function(source) {//valid
  var height = source.height;
  var width = source.width;
  
  
  // convert the image to single channel 32f
  //IplImage *img = getGray(source);
  //--> Voir cv.js dans aruco.js qui prend en charge ce genre de choses.
  
  
  // créer image avec la bonne profondeur.
  //IplImage *int_img = cvCreateImage(cvGetSize(img), IPL_DEPTH_32F, 1);
  var int_img = {};
  
  int_img.width=width;
  int_img.height = height;
  int_img.data = [];
  
  
  // set up variables for data access
  var step = width ; //--> JYD   more simple like this* 4 ; //img->widthStep/sizeof(float);
  var data   = source.data;
  var tdata = int_img.data;  
  //float *i_data = (float *) int_img->imageData;  

  // first row only
  var rs = 0.0;
  var i,j;
  for(j=0; j<width; j++) {
    rs += data[j]; 
    tdata[j] = rs;
  }

  // remaining cells are sum above and to the left
  for(i=1; i<height; ++i) {
    rs = 0.0;
    for(j=0; j<width; ++j) {
      rs += data[i*step+j]; 
      tdata[i*step+j] = rs + tdata[(i-1)*step+j];
    }
  }

  // return the integral image
  return int_img;
};


SURF.hessianInvert = function( M ) {
  var a,b,c,d,e,f;
  a = M[0][0];
  b = M[1][1];
  c = M[2][2];
  
  d = M[0][1];
  e = M[0][2];
  f = M[1][2];
  
  var t1,t2,t3,t4;
  t1 = b*c-f*f;
  t2 = c*d-e*f;
  t3 = d*f-b*e;
  t4 = d*e-a*f;
  
  var det = a*t1 + d*t2 + e*t3;
  
  return [
    [ t1/det, t2/det, 		t3/det		],
    [ t2/det, (a*c-e*e)/det, 	t4/det		],
    [ t3/det, t4/det,		(a*b-d*d)/det	]
  ];
  
};



SURF.gaussian = function( x, y, sig) {
   return (1.0/(2.0*Math.PI*sig*sig)) * Math.exp( -(x*x+y*y)/(2.0*sig*sig));  
};


///////////////////////////////////////////////////////////////////////////////
// responselayer object
/////////////////////////////////////////////////////////////////////////////// 


SURF.ResponseLayer = function(width, height, step, filter) {
    this.width = width|0;
    this.height = height|0;
    this.step = step;
    this.filter = filter;

    this.responses = [];
    this.laplacian = [];

    this.getLaplacian = function(row, col, src) {
      if (src === undefined) {
        return this.laplacian[row * width + col];
      } 
	  var scale = this.width / src.width;
	  return this.laplacian[scale* (row* width + col)];	
      
    };
    
    this.getResponse = function(row, col, src) {
      if (src === undefined) {
	  return this.responses[row * width + col];	
      } 
	  var scale = this.width / src.width;
	  return this.responses[scale * (row * width + col)];
      
    };   
};

///////////////////////////////////////////////////////////////////////////////
// interest point objects
/////////////////////////////////////////////////////////////////////////////// 


/**
 * discover potential matches given to sets of descriptors
 * @param points1 {array} first array of descriptors
 * @param points2 {array} second array of descriptors
 * @return an array of matches, that is to say pairs of matching points
 */
SURF.getMatches = function(points1, points2) {
    var matches= [];

    var dist, d1, d2;
    var match;
    var i,j;

    for(i = 0; i < points1.length; i++) {
	d1 = d2 = SURF.FLT_MAX;

	for(j = 0; j < points2.length; j++) {
	  dist = points1[i].distanceFrom(points2[j]);

	  if(dist<d1) // if this feature matches better than current best
	  {
		d2 = d1;
		d1 = dist;
		match = points2[j];
	  }
	  else if(dist<d2) // this feature matches better than second best
	  {
		d2 = dist;
	  }
	}

	// If match has a d1:d2 ratio < 0.65 ipoints are a match
	if(d1/d2 < 0.65)
	{
	  // Store the change in position
	  points1[i].dx = match.x - points1[i].x;
	  points1[i].dy = match.y - points1[i].y;
	  matches[matches.length] = [ points1[i], match ];
	}
    }
    return matches;
};


SURF.IPoint = function() {
    this.x = 0.0;
    this.y = 0.0; 

    //! Detected scale
    this.scale=0.0;
    //! Orientation measured anti-clockwise from +ve x-axis
    this.orientation=0.0;

    //! Sign of laplacian for fast matching purposes
    this.laplacian=0;

    //! Vector of descriptor components
    this.descriptor = [];

    //! Placeholds for point motion (can be used for frame to frame motion analysis)
    this.dx = 0.0;
    this.dy = 0.0;

    //! Used to store cluster index
    this.clusterIndex = 0;

    this.distanceFrom = function(rhs) {
      var sum=0;
      var i;
      for(i=0; i < 64; ++i) {
            sum += (this.descriptor[i] - rhs.descriptor[i])*(this.descriptor[i] - rhs.descriptor[i]);
      }
      return Math.sqrt(sum);
    };  
};


///////////////////////////////////////////////////////////////////////////////
// fasthessian object
/////////////////////////////////////////////////////////////////////////////// 

SURF.FastHessian = function(img) {
    var image;
    var width = 0;
    var height= 0;
    var iPoints = [];
    var responseMap = [];
    var filter_map = [[0,1,2,3], [1,3,4,5], [3,5,6,7], [5,7,8,9], [7,9,10,11]];

    
    if (img !== undefined) {
        image = img;
        width = img.width;
        height = img.height;
    }
  
    this.setImage = function(img) {
        image = img;
        width = img.width;
        height = img.height;
    };
    
    
    
    var isExtremum = function(r,c,t,m,b) {
        // bounds check
        var layerBorder = (t.filter + 1) / (2 * t.step);
        if (r <= layerBorder || r >= t.height - layerBorder || c <= layerBorder || c >= t.width - layerBorder) {
            return 0;
        }

        // check the candidate point in the middle layer is above thresh
        var candidate = m.getResponse(r, c, t);
        if (candidate < SURF.THRESH) {
            return 0;
        }

        var rr, cc;
        for (rr = -1; rr <=1; ++rr) {
            for (cc = -1; cc <=1; ++cc) {
            // if any response in 3x3x3 is greater candidate not maximum
                if (
                    t.getResponse(r+rr, c+cc) >= candidate ||
                    ((rr !== 0 || cc !== 0) && m.getResponse(r+rr, c+cc, t) >= candidate) ||
                    b.getResponse(r+rr, c+cc, t) >= candidate
                ) {
                    return 0;
                }
            }
        }
        return 1;
    };
    
    
    var hessian3D= function(r, c, t, m, b) {//valid
        var v, dxx, dyy, dss, dxy, dxs, dys;

        v = 2*m.getResponse(r, c, t);
        dxx = m.getResponse(r, c + 1, t) + m.getResponse(r, c - 1, t) - v;
        dyy = m.getResponse(r + 1, c, t) + m.getResponse(r - 1, c, t) - v;
        dss = t.getResponse(r, c) + b.getResponse(r, c, t) - v;
        dxy = ( m.getResponse(r + 1, c + 1, t) - m.getResponse(r + 1, c - 1, t) -
            m.getResponse(r - 1, c + 1, t) + m.getResponse(r - 1, c - 1, t) ) / 4.0;
        dxs = ( t.getResponse(r, c + 1) - t.getResponse(r, c - 1) -
            b.getResponse(r, c + 1, t) + b.getResponse(r, c - 1, t) ) / 4.0;
        dys = ( t.getResponse(r + 1, c) - t.getResponse(r - 1, c) -
            b.getResponse(r + 1, c, t) + b.getResponse(r - 1, c, t) ) / 4.0;

        return [[dxx, dxy, dxs], [dxy, dyy, dys], [dxs, dys, dss]];  	  
    };

    var deriv3D = function(r, c, t, m, b) {//valid
        var dx = (m.getResponse(r, c + 1, t) - m.getResponse(r, c - 1, t)) / 2.0;
        var dy = (m.getResponse(r + 1, c, t) - m.getResponse(r - 1, c, t)) / 2.0;
        var ds = (t.getResponse(r, c) - b.getResponse(r, c, t)) / 2.0;
	
        return [dx, dy, ds];
    };
    
    
    
    
    
    var interpolateExtremum = function(r,c,t,m,b) {
        // get the step distance between filters
        // check the middle filter is mid way between top and bottom
        var filterStep = (m.filter - b.filter);

        // Get the offsets to the actual location of the extremum
        var dD = deriv3D( r, c, t, m, b );
        var H = hessian3D( r, c, t, m, b );
        var H_inv = SURF.hessianInvert(H);
        var dD0 = dD[0], dD1 = dD[1], dD2=dD[2];
        var xc = - H_inv[0][0]*dD0 - H_inv[0][1]*dD1 - H_inv[0][2]*dD2;
        var xr = - H_inv[1][0]*dD0 - H_inv[1][1]*dD1 - H_inv[1][2]*dD2;
        var xi = - H_inv[2][0]*dD0 - H_inv[2][1]*dD1 - H_inv[2][2]*dD2;
                
        // If point is sufficiently close to the actual extremum
        if( Math.abs( xi ) < 0.5  &&  Math.abs( xr ) < 0.5  &&  Math.abs( xc ) < 0.5 ) {
            var ipt= new SURF.IPoint();
            ipt.x = (c + xc) * t.step;
            ipt.y = (r + xr) * t.step;
            ipt.scale = (0.1333) * (m.filter + xi * filterStep);
            ipt.laplacian = m.getLaplacian(r,c,t) ;
            iPoints.push(ipt);
        }
    };

    var  buildResponseLayer= function(rl) { //valid
        var responses = rl.responses;         // response storage
        var laplacian = rl.laplacian; // laplacian sign storage
        var step = rl.step;                      // step size for this filter
        var b = ((rl.filter - 1) / 2)|0;             // border for this filter
        var l = (rl.filter / 3)|0;                   // lobe for this filter (filter size / 3)
        var w = rl.filter;                       // filter size
        var inverse_area = 1/(w*w);           // normalisation factor
        var Dxx, Dyy, Dxy;

        var r, c, index=0;

        var l2 = 2 * l - 1;
        var l1_2 = (l/2)|0;

        var ar, ac;
        for(ar = 0; ar < rl.height; ++ar) {
            for(ac = 0; ac < rl.width; ++ac, index++) {
                // get the image coordinates
                r = ar * step;
                c = ac * step;

		
                // Compute response components
                Dxx = SURF.BoxIntegral(image, r - l + 1, c - b, l2, w)
                    - SURF.BoxIntegral(image, r - l + 1, c - l1_2, l2, l)*3;
                Dyy = SURF.BoxIntegral(image, r - b, c - l + 1, w, l2)
                    - SURF.BoxIntegral(image, r - l1_2, c - l + 1, l, l2)*3;
                Dxy = + SURF.BoxIntegral(image, r - l, c + 1, l, l)
                    + SURF.BoxIntegral(image, r + 1, c - l, l, l)
                    - SURF.BoxIntegral(image, r - l, c - l, l, l)
                    - SURF.BoxIntegral(image, r + 1, c + 1, l, l);

                // Normalise the filter responses with respect to their size
                Dxx *= inverse_area;
                Dyy *= inverse_area;
                Dxy *= inverse_area;
                //console.log(Dxx);
                // Get the determinant of hessian response & laplacian sign
                responses[index] = (Dxx * Dyy - 0.81 * Dxy * Dxy);
                laplacian[index] = (Dxx + Dyy >= 0 ? 1 : 0);
            }
        }
    };

    
    
    
    var buildResponseMap = function()//valid
    {
        // Calculate responses for the first 4 octaves:
        // Oct1: 9,  15, 21, 27
        // Oct2: 15, 27, 39, 51
        // Oct3: 27, 51, 75, 99
        // Oct4: 51, 99, 147,195
        // Oct5: 99, 195,291,387

        responseMap = [];

        // Get image attributes
        var w = (width / SURF.INIT_SAMPLE)|0;
        var h = (height / SURF.INIT_SAMPLE)|0;
        var s = (SURF.INIT_SAMPLE);

        // Calculate approximated determinant of hessian values
        if (SURF.OCTAVES >= 1) {
            responseMap.push(new SURF.ResponseLayer(w,   h,   s,   9));
            responseMap.push(new SURF.ResponseLayer(w,   h,   s,   15));
            responseMap.push(new SURF.ResponseLayer(w,   h,   s,   21));
            responseMap.push(new SURF.ResponseLayer(w,   h,   s,   27));
        }

        if (SURF.OCTAVES >= 2) {
            responseMap.push(new SURF.ResponseLayer(w/2, h/2, s*2, 39));
            responseMap.push(new SURF.ResponseLayer(w/2, h/2, s*2, 51));
        }

        if (SURF.OCTAVES >= 3) {
            responseMap.push(new SURF.ResponseLayer(w/4, h/4, s*4, 75));
            responseMap.push(new SURF.ResponseLayer(w/4, h/4, s*4, 99));
        }

        if (SURF.OCTAVES >= 4) {
            responseMap.push(new SURF.ResponseLayer(w/8, h/8, s*8, 147));
            responseMap.push(new SURF.ResponseLayer(w/8, h/8, s*8, 195));
        }

        if (SURF.OCTAVES >= 5) {
            responseMap.push(new SURF.ResponseLayer(w/16, h/16, s*16, 291));
            responseMap.push(new SURF.ResponseLayer(w/16, h/16, s*16, 387));
        }

        // Extract responses from the image
        var i; 
        for (i = 0; i < responseMap.length; ++i) {
            buildResponseLayer(responseMap[i]);
        }
    };


    
    this.getIPoints = function() {// valid

        iPoints = [];

        // Build the response map
        buildResponseMap();
        // Get the response layers
        var b, m, t, o, r, c, i ;
        for (o = 0; o < SURF.OCTAVES; ++o) {
            for (i = 0; i <= 1; ++i) {
                b = responseMap[filter_map[o][i]];
                m = responseMap[filter_map[o][i+1]];
                t = responseMap[filter_map[o][i+2]];

                // loop over middle response layer at density of the most
                // sparse layer (always top), to find maxima across scale and space
                for (r = 0; r < t.height; ++r) {
                    for (c = 0; c < t.width; ++c) {
                        if (isExtremum(r, c, t, m, b)) {
                            interpolateExtremum(r, c, t, m, b);
                        }
                    }
                }
            }
        }
        return iPoints;
      
    };
          
    
};




///////////////////////////////////////////////////////////////////////////////
// Partie correspondant à surf.cpp
///////////////////////////////////////////////////////////////////////////////

SURF.PI = Math.PI;

SURF.gauss25 = [
  [0.02546481,	0.02350698,	0.01849125,	0.01239505,	0.00708017,	0.00344629,	0.00142946],
  [0.02350698,	0.02169968,	0.01706957,	0.01144208,	0.00653582,	0.00318132,	0.00131956],
  [0.01849125,	0.01706957,	0.01342740,	0.00900066,	0.00514126,	0.00250252,	0.00103800],
  [0.01239505,	0.01144208,	0.00900066,	0.00603332,	0.00344629,	0.00167749,	0.00069579],
  [0.00708017,	0.00653582,	0.00514126,	0.00344629,	0.00196855,	0.00095820,	0.00039744],
  [0.00344629,	0.00318132,	0.00250252,	0.00167749,	0.00095820,	0.00046640,	0.00019346],
  [0.00142946,	0.00131956,	0.00103800,	0.00069579,	0.00039744,	0.00019346,	0.00008024]
 ];
  

 
 
///////////////////////////////////////////////////////////////////////////////
// surf descriptor object
/////////////////////////////////////////////////////////////////////////////// 
 
SURF.Surf = function(image, points) {
  this.image = image ;
  this.points = points;
  
  this.haarX = function (row, col, s) { // valid
   var mid = (s/2)|0;
   return SURF.BoxIntegral(image, row - mid, col, s, mid) 
	    - SURF.BoxIntegral(image, row - mid, col - mid, s, mid);
  };
  
  this.haarY = function(row, col, s) { // valid
    var mid = (s/2)|0;    
    return SURF.BoxIntegral(image, row, col-mid, mid, s)
	-SURF.BoxIntegral(image, row-mid, col-mid, mid, s); // bizarrerie mult * -1 !
  };

  
  
  
  this.getDescriptors = function(upright) {
      var i;
      if ( this.points.length <= 0 ) { return; }
      
      var ptlength = this.points.length;
      
      if (upright === true) {
        for (i= 0; i < ptlength; i++) {
            this.getDescriptor(i, true);
        }
      } else {
        for (i=0; i < ptlength; i++) {
            this.getOrientation(i);
            this.getDescriptor(i, false);
        }
      }
  };
  
  this.getOrientation = function(index) {
      var point = this.points[index];
      var gauss = 0.0;
      var scale = point.scale;
      var s = SURF.round(scale);
      var r = SURF.round(point.y);
      var c = SURF.round(point.x);
      var resX = [];
      var resY = [];
      var Ang = [];
      var s4 = 4*s;
      
      var id = [ 6, 5, 4, 3, 2, 1, 0, 1, 2, 3, 4, 5, 6];
      var idx = 0, i, j;
      for (i = -6; i <= 6; i++) {
            var cis = c+i*s;
            for (j= -6; j <= 6; j++) {
                if (i*i + j*j < 36) {
                    gauss = SURF.gauss25[id[i+6]][id[j+6]];
                    resX[idx] = gauss * this.haarX(r+j*s, cis, s4);
                    resY[idx] = gauss * this.haarY(r+j*s, cis, s4);
                    Ang[idx] = Math.atan2(resY[idx],resX[idx]);
                    ++idx;
                }
            }
      }

      
        // calculate the dominant direction
      var sumX=0, sumY=0;
      var max=0, orientation = 0;
      var ang1=0, ang2=0, ang;

      // loop slides pi/3 window around feature point
      var pi2 = 2*Math.PI;
      var pi1_3 = Math.PI/3.0;
      var k;
      
      for(ang1 = 0; ang1 < pi2;  ang1+=0.15) {
 	  //--> JY la ligne ci dessous est bizarre
	  ang2 = ( ang1+pi1_3 > pi2 ? ang1-5.0*pi1_3 : ang1+pi1_3);
	  sumX = sumY = 0;
	  for(k = 0; k < Ang.length; ++k) {
	    // get angle from the x-axis of the sample point
	    ang = Ang[k];

	    // determine whether the point is within the window
	    if (ang1 < ang2 && ang1 < ang && ang < ang2) {
		  sumX+=resX[k];
		  sumY+=resY[k];
	    } else if (ang2 < ang1 &&
		((ang > 0 && ang < ang2) || (ang > ang1 && ang < pi2) ))
	    {
		sumX+=resX[k];
		sumY+=resY[k];
	    }
	  }

	  // if the vector produced from this window is longer than all
	  // previous vectors then this forms the new dominant direction
	  if (sumX*sumX + sumY*sumY > max) {
	    // store largest orientation
	    max = sumX*sumX + sumY*sumY;
	    orientation = Math.atan2(sumY,sumX);
	  }
      }

      // assign orientation of the dominant response vector
      point.orientation = orientation;
  };
  

  this.getDescriptor = function (index,bUpright) {
      var i, k,l , ix, x, y, scale;
      var sample_x, sample_y, count=0;
      var j = 0, jx = 0, xs = 0, ys = 0;
      var desc, dx, dy, mdx, mdy, co, si;
      var gauss_s1 = 0, gauss_s2 = 0.;
      var rx = 0, ry = 0, rrx = 0, rry = 0, len = 0.;
      var cx = -0.5, cy = 0;
      var ksco, kssi ;//Subregion centers for the 4x4 gaussian weighting

      
      //Ipoint *ipt = &ipts[index];
      var point = this.points[index];
      scale = point.scale;
      var scale2 = 2*SURF.round(scale);
      
      x = SURF.round(point.x);
      y = SURF.round(point.y);
      desc = point.descriptor;

      if (bUpright) {
	co = 1;
	si = 0;
      } else {
	co = Math.cos(point.orientation);
	si = Math.sin(point.orientation);
      }

      i = -8;

      //Calculate descriptor for this interest point
      while(i < 12) {
	j = -8;
	i = i-4;

	cx += 1.;
	cy = -0.5;
	ix = i + 5;

	while(j < 12) {
	  dx=dy=mdx=mdy=0.;
	  cy += 1.;

	  j = j - 4;

	  jx = j + 5;

	  xs = SURF.round(x + ix*scale*co - jx*scale*si);
	  ys = SURF.round(y + ix*scale*si + jx*scale*co);

	  for (k = i; k < i + 9; ++k) {
		ksco = k*scale*co;
		kssi = k*scale*si;
		for (l = j; l < j + 9; ++l) {
		  //Get coords of sample point on the rotated axis
		  sample_x = SURF.round(x + ksco - l*scale*si);
		  sample_y = SURF.round(y + kssi + l*scale*co);

		  //Get the gaussian weighted x and y responses
		  gauss_s1 = SURF.gaussian(xs-sample_x,ys-sample_y,2.5*scale);
		  rx = this.haarX(sample_y, sample_x, scale2);
		  ry = this.haarY(sample_y, sample_x, scale2);

		  //Get the gaussian weighted x and y responses on rotated axis
		  rrx = gauss_s1*(-rx*si + ry*co);
		  rry = gauss_s1*(rx*co + ry*si);

		  dx += rrx;
		  dy += rry;
		  mdx += Math.abs(rrx);
		  mdy += Math.abs(rry);

		}
	  }

	  //Add the values to the descriptor vector
	  gauss_s2 = SURF.gaussian(cx-2.0,cy-2.0,1.5);

	  desc[count++] = dx*gauss_s2;
	  desc[count++] = dy*gauss_s2;
	  desc[count++] = mdx*gauss_s2;
	  desc[count++] = mdy*gauss_s2;

	  len += (dx*dx + dy*dy + mdx*mdx + mdy*mdy) * gauss_s2*gauss_s2;

	  j += 9;
	}
	i += 9;
      }

      //Convert to Unit Vector
      len = Math.sqrt(len);
      for(i = 0; i < 64; ++i) {
        desc[i] /= len;
      }
      
      // may be needed
      this.points[index].descriptor = desc;
    };

  
  
  
  
};
 

