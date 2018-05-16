arcs_module(
    function(ARCS, SURF, POS, SVD) {
        var DiceDetector, DiceFace, recoverImageData;
        
        
        /**
         * Dice face description
         * @typedef {Object} DiceFaceDescription
         * @property {number[]} center - coordinates of the face center.
         * @property {number[]} xaxis  - coordinates of the x direction for the image.
         * @property {number[]} yaxis  - coordinates of the y direction for the image.
         * @property {number} width - width of the image in unit length.
         * @property {number} height - height of the image in unit length.
         * @property {string} imageId - ID of the HTML element containing the image
         */
        
        /**
         * @typedef {Object} Point2D
         * @property {number} x - first coordinate
         * @property {number} y - second coordinate
         */
        
        /**
         * @typedef {Object} ImageData
         * @property {number} width - width of the image 
         * @property {number} height - height of the image 
         * @property {number[]} data - values of the pixels of the image stored in lines
         */
        
        /** 
         * @class DiceDetector
         * @classdescr Component that detects a textured die and evaluates its pose
         * @param initData {DiceDectectorInitData} structured data to initialize DiceDetector 
         */                                      
        DiceDetector = ARCS.Component.create(
            function(initData) {
                var focalLength; 
                var diceFaces = [];
                var marker = {};
                var i, currentId;
                var temporaryCanvas, DiceFace, poseEstimator, debugCanvas;
                
                currentId = 0;
                if (initData.faces === undefined) { 
                    console.error("Description for dice faces is not well formed.");
                }
                if (initData.faces.length < 6) {
                    console.error("A dice must have 6 faces.");
                    return;
                }
                
                if (initData.debugCanvas !== undefined) {
                    debugCanvas = document.getElementById(initData.debugCanvas);
                }
                
                temporaryCanvas = document.getElementById(initData.canvas);
                poseEstimator = new POS.Posit(600);
                
/* *****************************************************************************
 * Declaration of inner class DiceFace
 *****************************************************************************/
               /**
                * @class DiceFace
                * @classdesc Structure that defines the face of a die.
                * Each face has a given position and orientation in space 
                * as well as its own texture (image).
                * @param descr {DiceFaceDescription} a structured object describing each dice face.
                *  
                */        
                var DiceFace = function(descr) {
                    var center, xaxis, yaxis, realWidth, realHeight ;

                    /**
                     * Stores the id of the HTML element embedding an image
                     * @member {string} DiceFace#imageId
                     * @public
                     */
                    this.imageId = descr.imageId;
                    /**
                     * 3d coordinates of the center of the face 
                     * @member {number[]} DiceFace#center
                     * @private
                     */
                    center = descr.center; 
                    /**
                     * 3d coordinates of the x axis of the face image
                     * @member {number[]} DiceFace#xaxis
                     * @private
                     */                                       
                    xaxis = descr.xaxis;
                    /**
                     * 3d coordinates of the y axis of the face image
                     * @member {number[]} DiceFace#yaxis
                     * @private
                     */                                       
                    yaxis = descr.yaxis;
                    
                    /**
                     * real width of the image in unit length
                     * @member {number} DiceFace#realWidth
                     * @private
                     */
                    realWidth = descr.width;
                    /**
                     * real height of the image in unit length
                     * @member {number} DiceFace#realHeight
                     * @private
                     */
                    realHeight = descr.height;
                    
                    /**
                     * @return {ImageData} An image data object
                     * @function DiceFace#recoverImageData 
                     * @private
                     */
                    var recoverImageData = function(imageId) {
                        var canvas = temporaryCanvas; 
                        var image = document.getElementById(imageId);
                        if ( ! (canvas && image) ) {
                            console.error('Cannot extract image data',canvas, image);
                            return ;
                        }
                        var style = window.getComputedStyle(image);
                        canvas.width = image.width; //parseInt(style.width);
                        canvas.height = image.height; //parseInt(style.height);
                        
                        var context = canvas.getContext("2d");
                        context.drawImage(image, 0,0);
                        return context.getImageData(0,0,canvas.width,canvas.height);
                    };
                    
                    
                    /**
                     * Displays the image stored for the current face
                     * @function DiceFace#debugImage
                     */                    
                    this.debugImage = function() {
                        // TODO #4
                        // By manipulating the object temporaryCanvas, 
                        // which is an instance of an HTML canvas element
                        // draw, the current image, then the detected points.
                        // The documentation of global object SURF, contains 
                        // hints about drawIPoints().
                        // See also documentation of the HTML5 canvas API.
			var ctx = temporaryCanvas.getContext("2d");
			ctx.putImageData(this.imageData,0,0);
			SURF.drawIPoints(ctx,this.keyPoints);
                                        
                    };


                    /**
                     * Raw data contained by the image of the face. 
                     * @member {ImageData} DiceFace#imageData 
                     */
                    
                    /**
                     * Key points corresponding to the image of the face.
                     * @member {IPoint[]} DiceFace#keyPoints
                     */

                    // TODO #1
                    // put some code here to load image and detect keyPoints
                    // you should use recoverImageData to store data in member
                    // imageData.
                    //
                    // Then, store keypoints and descriptors associated to the image in
                    // variable keyPoints. Documentation of global SURF object 
                    // will give hints about using surfDetDes(...)
                    
                    this.imageData = recoverImageData(this.imageId);
		    this.keyPoints = SURF.surfDetDes(SURF.grayImage(this.imageData));
                    

                    /**
                    * @param x {number} x coordinate of point in the image plane of a face
                    * @param y {number} y coordinate of point in the image plane of a face
                    * @return an array of three components: the coordinates of the corresponding 3D point in the die coordinate system.
                    * 
                    */
                    this.get3DCounterpart = function(x,y) {
                        // TODO #7 
                        // compute the 3D coordinates of a feature that is in the image
                        // coordinate system. You will make use of: center, xAxis, yAxis,
                        // realWidth, realHeight and the size of the reference image stored
                        // in imageData.
			
                        var origin = [ center[0]-realWidth/2*xaxis[0],
				       center[1]-realHeight/2*yaxis[1],
				       center[2]];
			
			var ratioHeight = realHeight/this.imageData.height;
			var ratioWidth = realWidth/this.imageData.width;
			return [origin[0]+x*ratioWidth*xaxis[0],
			        origin[1]+y*ratioHeight*yaxis[1],
			        origin[2]];
                    };
                    
                };
                
/* *****************************************************************************
 * End of inner class DiceFace declaration
 *****************************************************************************/
                                
                
                
                                
                for (i = 0 ; i < 6; i++ ) {
                    diceFaces[i] = new DiceFace(initData.faces[i]);
                }
                temporaryCanvas.getContext("2d").clearRect(0,0,temporaryCanvas.width, temporaryCanvas.height);
                
                /**
                 * Launches the detection of the die 
                 * @function DiceDetector#detect
                 * @param image {ImageData}
                 * @slot
                 */                
                this.detect = function(image) {
                    var keyPoints = [];
                    var globalMatches = [];
                    
                    var points2D = [];
                    var points3D = [];
                    
                    var i, j;
                    var matches = [];
                    var pose, grayImage;

                    // TODO #2 
                    // Then, store keypoints and descriptors associated to the image in
                    // variable keyPoints. Documentation of global SURF object 
                    // will give hints about using surfDetDes(...)
		    grayImage = SURF.grayImage(image);
		    keyPoints = SURF.surfDetDes(grayImage);

                    
                    for (i =0; i< 6; i++) {
                        if (keyPoints.length > 0) {                            
                            // TODO #3: find matches between acquired image (img) and die faces.
                            // See documentation of global object SURF. 
                            // It will give hints about using getMatches(...)
			    matches = SURF.getMatches(keyPoints,diceFaces[i].keyPoints);

                            
                            // if there are enough matches ...                            
                            if (matches.length >= 6) {
                                console.log("Found matches with image ", diceFaces[i].imageId);                                
                                for (j=0; j < matches.length; j++) {
                                    // TODO #5
                                    // insert, at the back of the point2D array,
                                    // points matched from the acquired image and, at the back
                                    // of the point3D array, points matched from the die face
                                    // converted in 3D using DieFace.get3DCounterpart(...)
                                    // See also documentation of object of type Array in javascript
                                    points2D.push(matches[j][0]);
				    points3D.push(diceFaces[i].get3DCounterpart(matches[j][1].x,matches[j][1].y));
				    
                                }

                                diceFaces[i].debugImage();
                            }
                        }
                    }
                    
                    
                    if( points2D.length >= 4) {
                        // TODO #6
                        // draw keypoints from array point2D onto the acquired image
                        // (img). You will use drawIPoint(...) defined in global object SURF
			var ctx = debugCanvas.getContext("2d");
			SURF.drawIPoints(ctx,points2D);
                        

                        // TODO #8
                        // use object poseEstimator to compute pose
                        // the result will give the position of the object 
                        // with respect to the camera. You can have a look at 
                        // objecttransform.js to see how it is used.
                        // the result you will obtain must be shaped into 
                        // a structure that is compliant to the one used 
                        // by ARUCO. See documentation of type Marker and
                        // documentation of class Posit.
			pose = poseEstimator.pose(points2D,points3D);
                        pose.rotation = pose.bestRotation;
			pose.translation = pose.bestTranslation;
			marker.id = currentId;
			marker.pose = {position: pose.bestTranslation, rotation: pose.bestRotation};
                        this.emit("sendPose",[marker]);
                    }

                    
                };
                
                this.setFocal = function( focalLength) {
                    poseEstimator.setFocalLength(focalLength);
                };
                
               this.setId = function(id) {
                    currentId = id;    
                };
                
                /**
                 * sends the computed pose of the die
                 * @param pose {Marker} pose coded as a marker
                 */
                
            },
            ['detect','setFocal','setId'],
            ['sendPose','sendImage']

            
            
        );
        
        return { DiceDetector : DiceDetector };
    },
    [ 
        {name:"deps/surf/surf", exports:"SURF"},
        {name:"deps/pose/posit_gen",exports:"POS"},
        {name:"deps/pose/svd",exports:"SVD"}
    ]    
);
