arcs_module(
    function (ARCS) {
        var Animator;

        Animator = ARCS.Component.create( 
            function() {
                var paused = false;
                var self=this;
                
                var tick = function () {
                    if (paused === false) {
                        requestAnimationFrame(tick);
                        self.emit("onAnimationFrame");
                    }
                }
                
                this.start = function () {
                    paused = false;
                    tick();
                };
                
                this.stop = function () {
                    paused = true;
                };
            },
            ['start','stop'],
            'onAnimationFrame'
        );

        return {Animator: Animator};
    }
);