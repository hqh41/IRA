arcs_module(
    function (ARCS, CV, AR) {
        var ARUCODetector;
        
        /**
         * @class ARUCODetector
         * @classdesc Component that detects ARUCO markers in images
         */        
        ARUCODetector = ARCS.Component.create(
            function() {
                var detector ;

                /*1 Instanciate here the detector */
                detector = new AR.Detector(); 
                /**
                 * Detects ARUCO markers in the given image.
                 * If markers are detected, this slot triggers the signal "onMarkers".
                 * @param image {obj} the image in which markers should be detected
                 * @emits ARUCODetector#onMarker
                 * @function ARUCODetector#detect
                 */
                this.detect = function (image) {                    
                    /*1 recover markers from image 
                     *  then send they will be sent through onMarkers event
                     */
                    var markers= []; 
                    markers = detector.detect(image);
                    this.emit("onMarkers",markers);
                };
                
                /**
                 * Signal that is emitted when markers are detected in an image.
                 * @function ARUCODetector#onMarkers
                 * @param markers {array} Array of detected markers.
                 * @access signal
                 */
                
            },
            'detect',
            ['onMarkers']
        );
        
        return {ARUCODetector: ARUCODetector};
    },
    [
        {name:"deps/cv/index", exports:"CV"},
        {name:"deps/aruco/index",exports:"AR"}
    ]
);
