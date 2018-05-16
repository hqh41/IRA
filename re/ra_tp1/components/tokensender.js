arcs_module(function(ARCS) {
    var TokenSender;

    TokenSender = ARCS.Component.create(
        function( arr ) {
            var i;
            var self = this;
            for (i=0; i< arr.length; i++) {
                 if (typeof arr[i] === "string") {
                     this.slots.push(arr[i]);
                     //TokenSender.prototype.slots.push(arr[i]);
                     this[arr[i]] = function( s ) {
                         return function() {
                            console.log("[TokenSender] emitting %s", s);
                            this.emit("sendToken",s);
                         };
                     } (arr[i]);
                 }
            }
        }, 
        [],
        ['sendToken']
    );

    return { TokenSender : TokenSender };
});