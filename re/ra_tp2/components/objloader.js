arcs_module(
    function(ARCS, three, _objloader, _mtlloader, _objmtlloader) {
        var OBJLoader;

        
        OBJLoader = ARCS.Component.create(
            function() {
                var self = this;
                var innerObject; 
                
                var onLoadWrapper = function(obj) {
                    innerObject = obj;
                    console.log("[OBJLoader] object has %d components", obj.children.length); 
                    //console.log(obj);
                    self.emit("onLoad", obj);
                };

                var onLoadJSON = function(geom, mat) {
                    innerObject = new THREE.Mesh(geom, new THREE.MeshFaceMaterial(mat));
                    
                    self.emit("onLoad", innerObject);
                };
                
                var progress = function ( xhr ) { 
                    console.log( (xhr.loaded / xhr.total * 100) + '% loaded' ); 
                };
                
                var error = function ( xhr ) { 
                    console.log( 'An error happened' ); 
                };
                
                this.load = function(objURL, mtlURL) {
                    var loader;
                    // we may use a string tokenizer to determine file types 
                    // then all would be in the same loading slot.
                    
                    
                    console.log("loading objects", objURL, mtlURL);
                    if (mtlURL === undefined) {
                        //console.log("using loader");
                        loader = new THREE.OBJLoader();
                        loader.load(objURL, onLoadWrapper, progress, error);                        
                    } else {
                        //console.log("using mtl loader");
                        loader = new THREE.OBJMTLLoader();
                        loader.load(objURL, mtlURL, onLoadWrapper, progress, error);                        
                    }
                };
                
                this.loadJSON = function(jsonURL) {
                    var loader;
                    //console.log("loading objects", jsonURL);
                    loader = new THREE.JSONLoader();
                    loader.load(jsonURL, onLoadJSON); //, progress, error);                         
                    
                    
                };
                
                var MAX3 = function (a,b,c) {
                    if ( a >= b ) {
                         if ( a >= c) {
                             return a;
                         } else {
                             return c;
                         }
                    } else {
                         if (b >= c) {
                             return b;
                         } else {
                             return c;
                         }
                    }
                };
                
                this.unitize = function() {
                    if (innerObject === undefined) { return ; }
                    var box = new THREE.Box3(); 
                    box.setFromObject(innerObject);
                    var s = box.size();
                    var c = box.center();
                    var scale = 1 / MAX3(s.x, s.y, s.z);                    
                    innerObject.scale.x = innerObject.scale.y = innerObject.scale.z = scale;
                };
                
                this.resize = function(s) {
                    this.unitize();
                    if (innerObject === undefined) { return ; }
                    innerObject.scale.x *= s;
                    innerObject.scale.y *= s;
                    innerObject.scale.z *= s;
                };
                
            },
            ["load","unitize", "resize"],
            ["onLoad"]
        );
        
        return { OBJLoader: OBJLoader}; 
    },
    [ 'deps/three.js/index', 'deps/objloader/index', 'deps/mtlloader/index','deps/objmtlloader/index' ]
);