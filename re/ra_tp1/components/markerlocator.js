

arcs_module(
    function (ARCS, POS) {
        var MarkerLocator;
        
        
        MarkerLocator = ARCS.Component.create(
            function () { 
                var square_pose = new POS.SquareFiducial();
                
                this.setFocalLength = function (focalLength) {
                    square_pose.setFocalLength(focalLength);
                };
                
                this.setModelSize = function (modelSize) {
                    square_pose.setModelSize(modelSize);
                };
                
                this.setIntrinsics = function (intrinsics) {
                    square_pose.setMatrix(intrinsics);
                };
                
                this.setImageSource = function (id) {
                    var imageSource = document.getElementById(id);
                    if (id === undefined) {
                        return;
                    }
                    
                    var imageSourceStyle = window.getComputedStyle(imageSource);
                    square_pose.setImageSize(parseInt(imageSourceStyle.width),parseInt( imageSourceStyle.height));
                    
                };
                
                this.locateMarkers = function (markers) {
                    var k, pose;
                    for (k=0; k < markers.length; k++) {      
                        corners = markers[k].corners;
                        markers[k].pose = square_pose.pose(corners);
                    }
              
                    this.emit("onLocatedMarkers",markers);
                };
            },
            ['locateMarkers','setFocalLength','setModelSize','setImageSource'],
            ['onLocatedMarkers']
        );


        return { MarkerLocator: MarkerLocator };
    },
    [ {name: "deps/pose/square_pose", exports: "POS"} ]
);