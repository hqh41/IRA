arcs_module(
    function (ARCS) {
        var WindowEvent;

        WindowEvent = ARCS.Component.create( 
            function () {
                var self= this;
                                
                window.onresize = function() { 
                    self.emit("onResize",window.innerWidth, window.innerHeight);
                };
            },
            [],
            ["onResize"]
        );
        
        return { WindowEvent: WindowEvent};
    }
);