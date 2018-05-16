arcs_module(
    function (ARCS) {
        var Animator;

        /**
         * @class Animator
         * @classdesc A component that request new frames for animation.
         * This component is useful when you want to create animations in the 
         * context of a web browser.
         */        
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
                
                /** 
                 * Starts requesting frames for animation. As soon as it is started, 
                 * the signal <b>onAnimationFrame</b> is periodically triggered.
                 * @slot
                 * @emits onAnimationFrame
                 * @function Animator#start
                 */
                this.start = function () {
                    paused = false;
                    tick();
                };
                
                /** 
                 * Stops requesting frames for animation.
                 * @slot
                 * @function Animator#stop
                 */                
                this.stop = function () {
                    paused = true;
                };
                
                /** 
                 * Signals that an animation frame is ready.
                 * @signal
                 * @function Animator#onAnimationFrame
                 */
            },
            ['start','stop'],
            'onAnimationFrame'
        );

        return {Animator: Animator};
    }
);