arcs_module(function(ARCS) {
    var LiveSource, VideoSource;
    LiveSource = ARCS.Component.create(
        function () {
            var context, canvas, video, imageData;
            var defaultWidth = 320;
            var defaultHeight = 240;
            var self = this;
            
            var handleMediaStream = function(stream) {
                if (window.webkitURL) {
                    video.src = window.webkitURL.createObjectURL(stream);
                } else if (video.mozSrcObject !== undefined) {
                    video.mozSrcObject = stream;
                } else {
                    video.src = stream;
                }                
                video.videoWidth=defaultWidth;                
                video.videoHeight=defaultHeight;
                self.emit("onReady");
            };
            
            var errorMediaStream = function(error) {
                console.error("Cannot initialize video component:", error.code);
            };
            
            var setUserMedia = function() {
                if (navigator.mediaDevices !== undefined) {
                    navigator.mediaDevices.getUserMedia({video:true})
                        .then(handleMediaStream)
                        .catch(errorMediaStream);
                } else {                    
                    var getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
                    if (getUserMedia !== undefined) {
                        getUserMedia({video:true}, handleMediaStream,
                            errorMediaStream
                        );
                    }
                }
            };
            
            this.grabFrame = function () {
                if ( context === undefined || canvas === undefined || video === undefined)
                    return;
                if (video.readyState === video.HAVE_ENOUGH_DATA) {
                    context.drawImage(video, 0, 0, canvas.width, canvas.height);
                    imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                    this.emit("onImage",imageData);
                }
            };
            
            this.setSize = function(x,y) {
                
            };
            
            this.setWidgets = function (videoId, canvasId) {
                video = document.getElementById(videoId);
                canvas = document.getElementById(canvasId);
                
                if (video === undefined || canvas === undefined) {
                    return;
                }
                context = canvas.getContext("2d");
                var canvasStyle= window.getComputedStyle(canvas);
                canvas.width=parseInt(canvasStyle.width);
                canvas.height=parseInt(canvasStyle.height);
                setUserMedia();
            };
        },
        ['grabFrame','setWidgets'],
        ['onReady','onImage']
    );
    
    
    VideoSource = ARCS.Component.create(
        function() {
            var context, canvas, video, imageData;    
            var defaultWidth=320;
            var defaultHeight=240;
            var self=this;
            
            this.setWidgets = function (videoId, canvasId) {
                video = document.getElementById(videoId);
                canvas = document.getElementById(canvasId);
                
                if (video === undefined || canvas === undefined) {
                    return;
                }
                context = canvas.getContext("2d");
                var canvasStyle= window.getComputedStyle(canvas);
                canvas.width=parseInt(canvasStyle.width);
                canvas.height=parseInt(canvasStyle.height);

                if (video.paused || video.ended) {
                    video.addEventListener('play', function() {
                        self.emit("onReady");
                    });
                } else {
                    self.emit("onReady");
                }
                
                
            };
            
            this.grabFrame = function () {
                if ( context === undefined || canvas === undefined || video === undefined)
                    return;
                if (video.paused || video.ended) {
                    return;
                }
                
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                this.emit("onImage",imageData);
            };
            
        
        },
        ['grabFrame', 'setWidgets'],
        ['onReady', 'onImage']        
    );
    
    
    return {LiveSource: LiveSource, VideoSource: VideoSource};
});