// ARCS.js : 27/6/2014 16:00
// handling dependencies


//"use strict";


/** 
 * Main source: describes all the methods needed by the ARCS engine
 * @file
 */

/**
 * Defines all elements needed for Augmented Reality Component System
 * @namespace
 */
var ARCS =  ARCS || {};



/******************************************************************************
 * Helper functions to determine environment
 * ***************************************************************************/


/**
 * @return {boolean} true if ARCS is run in a node.js environment
 */
ARCS.isInNode = function () {
    return (typeof require === 'function' && require.resolve);
};


/**
 * @return {boolean} true if ARCS is run with require.js
 */
ARCS.isInRequire = function () {
    return (typeof define === 'function' && define.amd);
};


/******************************************************************************
 * Component implementation
 * ***************************************************************************/


/** 
 * Defines main traits of components in a namespace regrouping important methods
 * 
 * @namespace 
 */
ARCS.Component = {
    /** Error message */
    SourceIsNotComponent : {message : "Source is not a component"},
    /** Error message */
    UndefinedSignal : {message : "Signal is not defined"},
    /** Error message */
    UndefinedSlot : {message : "Slot is not defined"},
    /**
     * External constructor: give component traits to any constructor.
     * 
     * Component traits are the following: 
     * <ul>
     * <li>Slot functions listed in an array;</li>
     * <li>A signal list described in an array;</li>
     * <li>A method returning the slot list;</li>
     * <li>A method returnung the signal list;</li>
     * <li>An emit method, to trigger signals by their names;</li>
     * <li>A slot method to cast an internal method to a slot;</li>
     * <li>A signal mehtod to register a possible signal.</li>
     * </ul>
     * @param name {string} Class name to transform to a component
     * @param sltList {string[]} names of functions designated as slots, may be empty.
     * @param sgnList {string[]} names of functions designated as signals, may be empty.
     */
    create : function (name, sltList, sgnList) {
        if (name.prototype === undefined) {
            console.error("Cannot create such a component");
            return 0;
        }

        name.prototype.slots = [];
        name.prototype.signals = {};
        name.slotList = function () {
            return name.prototype.slots;
        };
        name.prototype.slotList = function () {
            return name.prototype.slots;
        };
        name.prototype.signalList = function () {
            var res = [], i;
            for (i in name.prototype.signals) {
                res.push(i);
            }
            return res;
        };
        name.signalList = function () {
            return name.prototype.signalList();
        };
        name.prototype.emit = function (signal) {
            var slt, func, obj;
            var args = Array.prototype.slice.call(arguments,1);
            for (slt in this.signals[signal]) {
                func = this.signals[signal][slt].func;
                obj = this.signals[signal][slt].obj;
                func.apply(obj, args);
            }
        };
        name.slot = function (slot, func) {
            var i;
            if (slot instanceof Array) {
                for (i = 0; i < slot.length; i++) {
                    name.prototype.slots.push(slot[i]);
                }
            } else {
                name.prototype.slots.push(slot);
                if (func !== undefined) {
                    name.prototype[slot] = func;
                }
            }
        };
        name.signal = function (signal) {
            var i;
            if (signal instanceof Array) {
                for (i = 0; i < signal.length; i++) {
                    name.prototype.signals[signal[i]] = 1;
                }
            } else {
                name.prototype.signals[signal] = 1;
            }
        };

        // code for returning component, and or completing its definition
        if (sltList !== undefined) {
            name.slot(sltList);
        }

        if (sgnList !== undefined) {
            name.signal(sgnList);
        }
        return name;
    },
    /** 
     * Checks if the given prototype has traits of a component
     * @param name {string} name of the prototype
     */
    check : function (name) {
        if (name.prototype === undefined) {
            return false;
        }
        if (name.prototype.signals === undefined ||
                name.prototype.slots === undefined) {
            return false;
        }
        return true;
    },
    /**
     * Connects two different components by using their signal and slots
     * @param source {object} component sending data
     * @param signal {string} name of the signal to connect
     * @param destination {object} component receiving data
     * @param slt {string} name of the slot to connect
     */
    connect : function (source, signal, destination, slt) {
        var orig, p;
        // here we can perform various checks.
        if (source.signals === undefined) {
            throw ARCS.Component.SourceIsNotComponent;
        }
        if (source.signals[signal] === undefined) {
            throw ARCS.Component.UndefinedSignal;
        }
        if (destination[slt] === undefined) {
            throw ARCS.Component.UndefinedSlot;
        }
        // we must also check if the signals dispose of their own implementation
        if (!source.hasOwnProperty('signals')) {
            // otherwise, we should clone it so that each component dispose of its 
            // own signal copy.
            orig = source.signals;
            source.signals = {};
            for (p in orig) {
                source.signals[p] = [];
            }
        }
        source.signals[signal].push({obj: destination, func: destination[slt]});
    },
    /**
     * Diconnects a signal/slot connection between two components
     * @param source {object} component sending data
     * @param signal {string} name of the signal to connect
     * @param destination {object} component receiving data
     * @param slt {string} name of the slot to connect
     */
    disconnect : function (source, signal, destination, slt) {
        var i;
        for (i = 0; i < source.signals[signal].length; i++) {
            if (source.signals[signal][i].obj === destination) {
                if (source.signals[signal][i].func === destination[slt]) {
                    source.signals[signal].splice(i, 1);
                    i--;
                }
            }
        }
    },
    /**
     * Invokes a specific slot of a given component
     * @param destination {object} component upon which invocation is performed
     * @param slt {string} name of the slot to invoke
     * @param value {mixed} value to input
     */
    invoke : function (destination, slt, value) {
        if (destination[slt] === undefined) {
            throw ARCS.Component.UndefinedSlot;            
        }
        
        
        var func = destination[slt];
        func.apply(destination, value);
    },
    /** 
     * Specific hook that can be called when initializing a component
     * @param component {object} prototype of the component
     * @param obj {object} the actual object
     */
    config : function (component, obj) {
        if (typeof component.config === 'function') {
            component.config(obj);
        }
    }
};

/**
 * @class ARCS.Context
 * @classdesc Class representing a context containing libraries and components
 * used by different parts of the framework.
 * @param ctx {object} an object representing data for the context.
 */
ARCS.Context = function( ctx ) { 
    var components = {};
    var constants = {};
    var factories = {};
    var libraries = [];
    var depLibPromises=[];
    var self = this;
    var loadLibraries;
    var loadDataFile;
    var promiseLibrary;
    var instanciateComponents;
    
    
    factories.StateMachine = ARCS.Statemachine;

    
    if (ctx !== undefined) {
        libraries = ctx.libraries;
    
        for (p in ctx.components) {
            if (ctx.components.hasOwnProperty(p)) {
                components[p] = ctx.components[p];
            }
        }
        
        if (ctx.constants !== undefined) {
            for (p in ctx.constants) {
                if (ctx.constants.hasOwnProperty(p)) {
                    constants[p] = ctx.constants[p];
                }                
            }            
        }
        
    }

    
    loadDataFile = function(fileName) {
        var dataPromise ;
                
        if (ARCS.isInNode()) {
            return new Promise(function (resolve, reject) {
                var dep = require(fileName);
                if (dep !== undefined) {
                    resolve(dep);
                } else {
                    reject("[ARCS] File not found");
                }
            });
        } else {
            return new Promise(function(resolve, reject) {
                var client = new XMLHttpRequest();
                client.open('GET',fileName,true);
                client.overrideMimeType("application/json");
                client.send();
                
                client.onload = function() {
                    if (this.status >= 200 && this.status < 300) {
                        resolve(JSON.parse(this.responseText));
                    } else {
                        reject(this.statusText);
                    }                
                };
                client.onerror = function() {
                    reject(this.statusText);
                };
            });
        }
    };
    
    this.addLibraryPromise = function(p) {
        depLibPromises.push(p);
    };
            
    promiseLibrary = function(libName) {
        return new Promise(function(resolve, reject) {
            if (libName.substr(-3) === '.js') {
                reject(libName);
            }            
            
            if (ARCS.isInNode()) {
                if (require("./" + libraries[i] + ".js") === undefined) {
                    reject(libName);
                } else {
                    resolve();
                }                
            } else {
                require([libName], 
                        function() {
                            resolve(); 
                        }, 
                        function(err) { 
                            reject(libName,err); 
                            
                        }
                );
            }            
        });        
    };
    
    loadLibraries = function () {
        var i;
        // we will use different instances of require either the one of node 
        // or the one from require.js
        ARCS.Context.currentContext = self;
        
        var res=[];
        for(i=0; i < libraries.length; i++) {
            res.push(promiseLibrary(libraries[i]));
        }
        return Promise.all(res);        
    };
    
    instanciateComponents = function() {
        var p, promises=[];
        
        for (p in components) {
           if (components.hasOwnProperty(p)) {
                if (factories[components[p].type] === undefined) {
                    console.error("[ARCS] Factory " + components[p].type + " not found.");
                    console.error("[ARCS] Context dump follows: ", libraries, components, constants);
                    return ;
                }                    
                factory = factories[components[p].type];
                try {
                if (components[p].value !== undefined || components[p].url !== undefined || components[p].ref !== undefined) {                
                    if (components[p].value !== undefined) {
                        components[p].instance = new factory(components[p].value);
                    }
                    if (components[p].url !== undefined) {
                        promises.push(
                            loadDataFile(components[p].url).then(function(obj) { 
                                components[p].instance = new factory(obj);
                            })
                        );
                    }
                    if (components[p].ref !== undefined) {
                        if (constants[components[p].ref] !== undefined) {
                                components[p].instance = new factory(constants[components[p].ref]);
                        }                        
                    }
                } else {
                    components[p].instance = new factory();
                }
                } catch(e) { console.error("[ARCS] Component of type ", p, " not instanciated.", e);}
            }
        }        
        return Promise.all(promises);
    };
    
    /**
     * loads a given library and, if necessary, launches a call back function
     * when the library is loaded.
     * @param libName {string} name of the library to load
     * @param cbFunction {function} callback function to call when library is loaded
     */
    this.loadLibrary = function (libName, cbFunction) {
        var libUrl = libName, libActualName = libName;
        
        ARCS.Context.currentContext = self;
        if (typeof libName !== "string") {
            libActualName = libName.name;
            libUrl = libName.url;
        }
                
        libraries.push(libActualName);
        promiseLibrary(libUrl).then( function() {
            if (cbFunction !== undefined) {
                cbFunction();
            }
        });
    };
    
    /**
     * @return the component list stored inside context
     */    
    this.getComponentList = function () {
        var list = Object.keys(components);
        var i;
            
        for (i = 0; i < list.length; i++) {
            if ( ! components.hasOwnProperty(list[i])) {
                list.splice(i--,1);
            }
        }
        return list;
    };

    this.getConstant = function(cName) {
        /*if (!constants.hasOwnProperty(cName)) {
            return undefined;
        }*/        
        return constants[cName];
    };
    
    
    // to determine if really needed
    this.getComponentType = function(cName) {
        /*if (!components.hasOwnProperty(cName))
            return undefined;*/
        if (components[cName] === undefined) return undefined;
        return components[cName].type;        
    };
    
    // to determine if really needed
    this.getComponentValue = function(cName) {
        /*if (!components.hasOwnProperty(cName))
            return undefined;*/
        if (components[cName] === undefined) return undefined;
        return components[cName].value;
    };
    
    // to determine if really needed
    this.getComponent = function (cName) {
        /*if (!components.hasOwnProperty(cName))
            return undefined;*/
        if (components[cName] === undefined) return undefined;
        return components[cName].instance;
    };


    // to determine if really needed
    this.getComponentName = function (cmp) {
        var i, keys;
        keys = components.getComponentList();
           
        for(i = 0; i < keys.length; i++) {
            if (components[keys[i]].instance === cmp) {
                return keys[i];
            }
        }
        
        return undefined;
    };

    
    this.setFactory = function(key, factory ) {
        factories[key] = factory;
    };
    
    this.toJSON = function () {
        var res = {}, p;
        
        for (p in components) {
            if (components.hasOwnProperty(p)) {
                res[p] = { type: components[p].type, value: components[p].value };
            }
        }
        return res;
    };
    
    
    // functions used with editor
    this.setComponentValue = function (cName, cValue) {
        components[cName].value = cValue; // to modifiy       
    };
        
    this.addComponent = function (cName, cType, cValue) {
        var component;
        components[cName] = {};
        components[cName].type = cType;
        components[cName].value = cValue;
        
        var factory = factories[cType];
        if (factory !== undefined) {
            component = new factory(cValue);
        }
        components[cName].instance = component;        
    };

    this.removeComponent = function (cName) {
        delete components[cName];
    };
    
    
        // see if it is needed
    this.getFactory = function (fName) {
        return factories[fName];
    };

    // see if it is needed 
    this.getFactoryList = function() {
        return Object.keys(factories);
    };

    // this should return a promise  !
    this.instanciate = function () {
        return loadLibraries().then(function() { return Promise.all(depLibPromises); })
                              .then(instanciateComponents)
                              .catch(function(msg) { console.log("[ARCS] Trouble instanciating context" + msg); });
        
    };
    
    
    var chainPrototype = function (obj, proto) {
        // this stunt seems better than using 
        // Object.setPrototypeOf or using [object].__proto__
        // due to javascript engine optimizations
        var newObj = Object.create(proto);
        var p ;
        
        for (p in obj) {
            if (obj.hasOwnProperty(p)) {
                newObj[p] = obj[p];
            }
        }
        return newObj;           
    };
    
    this.chain = function (cmp,cst,fct) {
        // cmp and cst are the children context elements
        // we need to chain contexts properly. 
        return [ chainPrototype(cmp, components), 
                 chainPrototype(cst, constants),
                 chainPrototype(fct, factories)
               ];
    };
            
    
    this.setParent = function (ctx) {
        // chaining factories is also important if contexts are repeating 
        // the same things
        if (ctx === undefined) return;
        var v = ctx.chain(components, constants, factories);
        components = v[0];
        constants = v[1];
        factories = v[2];
    };
    
};


/** pseudo-singleton to current context being used */
ARCS.Context.currentContext = null;




/******************************************************************************
 * Invocation implementation
 * ***************************************************************************/
/**
 * Defines an invocation
 * @param destination {object} component on which to perform invocation
 * @param slot {string} name of the slot 
 * @param value {mixed} value passed to the invoked slot
 * @constructor
 */
ARCS.Invocation = function (destination, slot, value) {
    this.getDestination = function () {
        return destination;
    };
    
    this.getSlot = function () {
        return slot;
    };
    
    this.getValue = function () {
        return value;
    };
    
    this.invoke = function () {
        var func = destination[slot];
        if (func === undefined) {
                console.error("Undefined slot %s of component %s", slot, destination);
                return;
        } 
        func.apply(destination, value);
    };
};
/**
 * Helper function that casts an invocation from a description 
 * @param obj {object} a raw description of the invocation
 * @param context {object} the context in which this invocation takes place.
 * @return an invocation
 */
ARCS.Invocation.cast = function (obj, context) {    
    if (obj.value !== undefined) {
        var component = context.getComponent(obj.destination);
        if (component === undefined) {
            console.error("[ARCS] Destination ",obj.destination, " is undefined");            
        } 
        
        return new ARCS.Invocation(component, obj.slot, obj.value);
    } 
    
    // this one looks odd, seems there is a failure in the logic.
    if (obj.ref !== undefined) {
        return new ARCS.Invocation(context.getComponent(obj.destination), obj.slot, context.getConstant(obj.ref));        
    }    
};

/*ARCS.Invocation.revert = function(obj, context) {
    return {
        destination: context
        
    };
    
};*/


ARCS.Invocation.PRE_CONNECTION = 0;
ARCS.Invocation.POST_CONNECTION = 1;
ARCS.Invocation.CLEAN_UP = 2;
/******************************************************************************
 * Connection implementation
 * ***************************************************************************/
/** 
 * Defines a connection between two components
 * @param source {object} component at the source
 * @param signal {string} name of the signal emitting data
 * @param destination {object} component at the destination 
 * @param slot {string} name of the signal receiving data
 * @class
 */
ARCS.Connection = function (source, signal, destination, slot) {
    /**
     * Connects two components as described in this object
     * @function ARCS.Connection#connect
     */
    this.connect = function () {
        try {
            ARCS.Component.connect(source, signal, destination, slot);
        } catch(e) { console.log(e, source, signal, destination, slot); }
    };
    /**
     * Disconnects a signal/slot connection between the two components
     * described in this object.
     */
    this.disconnect = function () {
        ARCS.Component.disconnect(source, signal, destination, slot);
    };
    
    this.getSource = function() {
        return source; 
    };
    
    this.getDestination = function () {
        return destination;
    };
    
    this.getSlot = function ()  {
        return slot;
    };
    
    this.getSignal = function () {
        return signal;
    };   
};
/**
 * Helper function that casts a connection from a description 
 * @param obj {object} a raw description of the connection
 * @param context {object} the context in which this connection takes place.
 * @return a connection
 */
ARCS.Connection.cast = function (obj, context) {
    return new ARCS.Connection(context.getComponent(obj.source)/*[obj.source].instance*/, obj.signal,
                                context.getComponent(obj.destination)/*[obj.destination].instance*/, obj.slot);
};

/******************************************************************************
 * Sheet implementation
 * ***************************************************************************/
/**
 * Constructs a sheet
 * @param context {object} a context object
 * @class
 * @classdesc A Sheet is an operationnal configuration in an application. It 
 * contains many things: multiple sets of {@link ARCS.Invocation} 
 * performed at different times
 * and a set of {@link ARCS.Connection}. Sheets have two high level operations:
 * activation and deactivation. 
 */
ARCS.Sheet = function (ctx /*context*/) {
    var context = new ARCS.Context();
    var preconnections = [], postconnections = [], cleanups = [], connections = [],
        invokePreconnections, invokePostconnections, invokeCleanups, 
        connect, disconnect, getComponentName,
        preCount = 0, postCount = 0, cleanCount = 0, connCount = 0;
        
    invokePreconnections = function () {
        var i;
        for (i = 0; i < preconnections.length; i++) {
            preconnections[i].invoke();
        }
    };
    invokePostconnections = function () {
        var i;
        for (i = 0; i < postconnections.length; i++) {
            postconnections[i].invoke();
        }
    };
    invokeCleanups = function () {
        var i;
        for (i = 0; i < cleanups.length; i++) {
            cleanups[i].invoke();
        }
    };
    connect = function () {
        var i;
        for (i = 0; i < connections.length; i++) {
            connections[i].connect();
        }
    };
    disconnect = function () {
        var i;
        for (i = 0; i < connections.length; i++) {
            connections[i].disconnect();
        }
    };
    
    this.setContext = function (ctx) {
        context = ctx;
    };
    /**
     * Activates this sheet. Pre-connection invocations are peformed, then 
     * connections are established and post-connection invocations are finally 
     * performed.
     */
    this.activate = function () {
        context.instanciate().then(function() {        
            invokePreconnections();
            connect();
            invokePostconnections();
        });
    };
    /**
     * Deactivates this sheet. Connections are removed and then cleanup invocations
     * are performed.
     */
    this.deactivate = function () {
        disconnect();
        invokeCleanups();
    };
    
    this.addPreConnection = function (obj) {
        var pre = ARCS.Invocation.cast(obj, context);
        pre.id = preCount++;
        preconnections.push(pre);
        return pre.id;
    };
    
    this.addPostConnection = function (obj) {
        var post = ARCS.Invocation.cast(obj, context);
        post.id = postCount++;
        postconnections.push(post);
        return post.id;
    };


    this.addCleanup = function (obj) {
        var cleanup = ARCS.Invocation.cast(obj, context);
        cleanup.id = cleanCount++;
        cleanups.push(cleanup);
        return cleanup.id;
    };
    
    this.addConnection = function (obj) {
        var connection = ARCS.Connection.cast(obj, context);
        connection.id = connCount++;
        connections.push(connection);
        return connection.id;
    };

    
    var removeItem = function(id, tab) {
        var i = tab.length;
        
        while ( i-- && tab[i].id !== id );
        
        if (i >= 0) {
            tab.splice(i,1);
        } else {
            console.warn("Could not remove data with id", id);
        }
    };
    
    this.removePreConnection = function (id) {
        removeItem(id, preconnections);
    };
    
    this.removePostConnection = function (id) {
        removeItem(id, postconnections);
    };
    
    this.removeCleanup = function (id) {
        removeItem(id, cleanups);
    };
    
    var changeItem = function(id, value, tab) {
        var i = tab.length;        
        while ( i-- && tab[i].id !== id );
        if (i >= 0) {
            tab[i].value = value;
        }
    };
    
    this.changePreConnection = function (id, value) {
        changeItem(id, value, preconnections);
    };
    
    this.changePostConnection = function (id, value) {
        changeItem(id, value, postconnections);
    };
    
    this.changeCleanup = function (id, value) {
        changeItem(id, value, cleanups);
    };
    
    this.removeConnection = function (id) {
        removeItem(id, connections);
    };
    
    
    var swapItems = function (id1, id2, tab) {
        var item;
        
        var i = tab.length, j = tab.length;
        
        while( i-- && tab[i].id !== id1 ) ;
        while( j-- && tab[j].id !== id2 ) ;

        if (i >= 0 && j >= 0) {
            item = tab[i];
            tab[i] = tab[j];
            tab[j] = item;
            tab[i].id = id1;
            tab[j].id = id2;
        }
    };
    
    this.swapConnections = function (id1, id2) {
        swapItems(id1, id2, connections);
    };
    
    this.swapCleanups = function (id1, id2) {
        swapItems(id1, id2, cleanups);
    };
    
    this.swapPreConnections = function (id1, id2) {
        swapItems(id1, id2, preconnections);
    };
    
    this.swapPostConnections = function (id1, id2) {
        swapItems(id1, id2, postconnections);
    };

    
    var cacheConnectionsInvocations = function(object) {
        var i = 0, castInvocation = ARCS.Invocation.cast, castConnection = ARCS.Connection.cast;
        for (i = 0; i < object.preconnections.length; i++) {
            preconnections.push(castInvocation(object.preconnections[i], context));            
        }
        for (i = 0; i < object.postconnections.length; i++) {
            postconnections.push(castInvocation(object.postconnections[i], context));
        }
        for (i = 0; i < object.cleanups.length; i++) {
            cleanups.push(castInvocation(object.cleanups[i], context));
        }
        for (i = 0; i < object.connections.length; i++) {
            connections.push(castConnection(object.connections[i], context));
        }        
    };
    
    /**
     * Imports a structure object describing the content of a sheet.
     * @param object {object} structured object describing sheet's content.
     */
    this.import = function (object) {
        if (object.hasOwnProperty("context")) {
            context = new ARCS.Context(object.context);
            context.setParent(ctx);
        }
        
        // the caching system below should wait for the context to be proper initialized
        // todo: there may be a flow here if the instanciation is too long.
        context.instanciate().then( function() {
            cacheConnectionsInvocations(object);
        });
    };
    
    var revertInvocation = function (obj) { 
        return {
            destination: context.getComponentName(obj.getDestination()),
            slot: obj.getSlot(),
            value: obj.getValue()
         };
    };
    
    var revertConnection = function (obj) {
        return {
            source: context.getComponentName(obj.getSource()),
            signal: obj.getSignal(),
            destination: context.getComponentName(obj.getDestination()),
            slot: obj.getSlot()
        }; 
    };
    
    this.toJSON = function () {
        var preconns = [];
        var postconns = [];
        var conns = [];
        var cleans = [];
        
        var i;        
        for (i = 0; i < connections.length; i++) {
            conns.push(revertConnection(connections[i]))
        }
        for (i = 0; i < preconnections.length; i++) {
            preconns.push(revertInvocation(preconnections[i]))
        }
        for (i = 0; i < postconnections.length; i++) {
            postconns.push(revertInvocation(postconnections[i]))
        }
        for (i = 0; i < cleanups.length; i++) {
            cleans.push(revertInvocation(cleanups[i]))
        }
                
        return  {
            preconnections : preconns,
            postconnections : postconns,
            connections: conns,
            cleanups: cleans           
        };
    };
    
    //console.log("setting parent");
    context.setParent(ctx);
};

/****************************************************************************
 * PEG.js grammar used to generate Parser
 ****************************************************************************
start
  = expr

expr = 
 left:primary right:( rexpr )+ {
   return [ left ].concat(right);
 }
 / primary

rexpr = 
 AND right:primary {
   return { and : right };
 } /
 OR right:primary {
   return { or : right} ;
 }
 
primary
  = id:id { return id; }
  / "(" expr:expr ")" { return [ expr ]; }

id "id" 
  = token:$TOKEN { return  token.trim() ; } 

// tokens 
TOKEN = WS [_a-zA-Z][_a-zA-Z0-9]*  WS 
OPENPAREN = WS "(" WS
CLOSEPAREN = WS ")" WS
AND = WS "&" WS
OR = WS "|" WS
WS = [ \r\n\t]*

******************************************************************************/


ARCS.EventLogicParser = (function() {
  /*
   * Generated by PEG.js 0.8.0.
   *
   * http://pegjs.majda.cz/
   */

  function peg$subclass(child, parent) {
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor();
  }

  function SyntaxError(message, expected, found, offset, line, column) {
    this.message  = message;
    this.expected = expected;
    this.found    = found;
    this.offset   = offset;
    this.line     = line;
    this.column   = column;

    this.name     = "SyntaxError";
  }

  peg$subclass(SyntaxError, Error);

  function parse(input) {
    var options = arguments.length > 1 ? arguments[1] : {},

        peg$FAILED = {},

        peg$startRuleFunctions = { start: peg$parsestart },
        peg$startRuleFunction  = peg$parsestart,

        peg$c0 = peg$FAILED,
        peg$c1 = [],
        peg$c2 = function(left, right) {
           return [ left ].concat(right);
         },
        peg$c3 = function(right) {
           return { and : right };
         },
        peg$c4 = function(right) {
           return { or : right} ;
         },
        peg$c5 = function(id) { return id; },
        peg$c6 = "(",
        peg$c7 = { type: "literal", value: "(", description: "\"(\"" },
        peg$c8 = ")",
        peg$c9 = { type: "literal", value: ")", description: "\")\"" },
        peg$c10 = function(expr) { return [ expr ]; },
        peg$c11 = { type: "other", description: "id" },
        peg$c12 = function(token) { return  token.trim() ; },
        peg$c13 = /^[_a-zA-Z]/,
        peg$c14 = { type: "class", value: "[_a-zA-Z]", description: "[_a-zA-Z]" },
        peg$c15 = /^[_a-zA-Z0-9]/,
        peg$c16 = { type: "class", value: "[_a-zA-Z0-9]", description: "[_a-zA-Z0-9]" },
        peg$c17 = "&",
        peg$c18 = { type: "literal", value: "&", description: "\"&\"" },
        peg$c19 = "|",
        peg$c20 = { type: "literal", value: "|", description: "\"|\"" },
        peg$c21 = /^[ \r\n\t]/,
        peg$c22 = { type: "class", value: "[ \\r\\n\\t]", description: "[ \\r\\n\\t]" },

        peg$currPos          = 0,
        peg$reportedPos      = 0,
        peg$cachedPos        = 0,
        peg$cachedPosDetails = { line: 1, column: 1, seenCR: false },
        peg$maxFailPos       = 0,
        peg$maxFailExpected  = [],
        peg$silentFails      = 0,

        peg$result;

    if ("startRule" in options) {
      if (!(options.startRule in peg$startRuleFunctions)) {
        throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
      }

      peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
    }

    function text() {
      return input.substring(peg$reportedPos, peg$currPos);
    }

    function offset() {
      return peg$reportedPos;
    }

    function line() {
      return peg$computePosDetails(peg$reportedPos).line;
    }

    function column() {
      return peg$computePosDetails(peg$reportedPos).column;
    }

    function expected(description) {
      throw peg$buildException(
        null,
        [{ type: "other", description: description }],
        peg$reportedPos
      );
    }

    function error(message) {
      throw peg$buildException(message, null, peg$reportedPos);
    }

    function peg$computePosDetails(pos) {
      function advance(details, startPos, endPos) {
        var p, ch;

        for (p = startPos; p < endPos; p++) {
          ch = input.charAt(p);
          if (ch === "\n") {
            if (!details.seenCR) { details.line++; }
            details.column = 1;
            details.seenCR = false;
          } else if (ch === "\r" || ch === "\u2028" || ch === "\u2029") {
            details.line++;
            details.column = 1;
            details.seenCR = true;
          } else {
            details.column++;
            details.seenCR = false;
          }
        }
      }

      if (peg$cachedPos !== pos) {
        if (peg$cachedPos > pos) {
          peg$cachedPos = 0;
          peg$cachedPosDetails = { line: 1, column: 1, seenCR: false };
        }
        advance(peg$cachedPosDetails, peg$cachedPos, pos);
        peg$cachedPos = pos;
      }

      return peg$cachedPosDetails;
    }

    function peg$fail(expected) {
      if (peg$currPos < peg$maxFailPos) { return; }

      if (peg$currPos > peg$maxFailPos) {
        peg$maxFailPos = peg$currPos;
        peg$maxFailExpected = [];
      }

      peg$maxFailExpected.push(expected);
    }

    function peg$buildException(message, expected, pos) {
      function cleanupExpected(expected) {
        var i = 1;

        expected.sort(function(a, b) {
          if (a.description < b.description) {
            return -1;
          } else if (a.description > b.description) {
            return 1;
          } else {
            return 0;
          }
        });

        while (i < expected.length) {
          if (expected[i - 1] === expected[i]) {
            expected.splice(i, 1);
          } else {
            i++;
          }
        }
      }

      function buildMessage(expected, found) {
        function stringEscape(s) {
          function hex(ch) { return ch.charCodeAt(0).toString(16).toUpperCase(); }

          return s
            .replace(/\\/g,   '\\\\')
            .replace(/"/g,    '\\"')
            .replace(/\x08/g, '\\b')
            .replace(/\t/g,   '\\t')
            .replace(/\n/g,   '\\n')
            .replace(/\f/g,   '\\f')
            .replace(/\r/g,   '\\r')
            .replace(/[\x00-\x07\x0B\x0E\x0F]/g, function(ch) { return '\\x0' + hex(ch); })
            .replace(/[\x10-\x1F\x80-\xFF]/g,    function(ch) { return '\\x'  + hex(ch); })
            .replace(/[\u0180-\u0FFF]/g,         function(ch) { return '\\u0' + hex(ch); })
            .replace(/[\u1080-\uFFFF]/g,         function(ch) { return '\\u'  + hex(ch); });
        }

        var expectedDescs = new Array(expected.length),
            expectedDesc, foundDesc, i;

        for (i = 0; i < expected.length; i++) {
          expectedDescs[i] = expected[i].description;
        }

        expectedDesc = expected.length > 1
          ? expectedDescs.slice(0, -1).join(", ")
              + " or "
              + expectedDescs[expected.length - 1]
          : expectedDescs[0];

        foundDesc = found ? "\"" + stringEscape(found) + "\"" : "end of input";

        return "Expected " + expectedDesc + " but " + foundDesc + " found.";
      }

      var posDetails = peg$computePosDetails(pos),
          found      = pos < input.length ? input.charAt(pos) : null;

      if (expected !== null) {
        cleanupExpected(expected);
      }

      return new SyntaxError(
        message !== null ? message : buildMessage(expected, found),
        expected,
        found,
        pos,
        posDetails.line,
        posDetails.column
      );
    }

    function peg$parsestart() {
      var s0;

      s0 = peg$parseexpr();

      return s0;
    }

    function peg$parseexpr() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      s1 = peg$parseprimary();
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$parserexpr();
        if (s3 !== peg$FAILED) {
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            s3 = peg$parserexpr();
          }
        } else {
          s2 = peg$c0;
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c2(s1, s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$parseprimary();
      }

      return s0;
    }

    function peg$parserexpr() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parseAND();
      if (s1 !== peg$FAILED) {
        s2 = peg$parseprimary();
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c3(s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parseOR();
        if (s1 !== peg$FAILED) {
          s2 = peg$parseprimary();
          if (s2 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c4(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      }

      return s0;
    }

    function peg$parseprimary() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      s1 = peg$parseid();
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c5(s1);
      }
      s0 = s1;
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 40) {
          s1 = peg$c6;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c7); }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parseexpr();
          if (s2 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 41) {
              s3 = peg$c8;
              peg$currPos++;
            } else {
              s3 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c9); }
            }
            if (s3 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c10(s2);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      }

      return s0;
    }

    function peg$parseid() {
      var s0, s1, s2;

      peg$silentFails++;
      s0 = peg$currPos;
      s1 = peg$currPos;
      s2 = peg$parseTOKEN();
      if (s2 !== peg$FAILED) {
        s2 = input.substring(s1, peg$currPos);
      }
      s1 = s2;
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c12(s1);
      }
      s0 = s1;
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c11); }
      }

      return s0;
    }

    function peg$parseTOKEN() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      s1 = peg$parseWS();
      if (s1 !== peg$FAILED) {
        if (peg$c13.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c14); }
        }
        if (s2 !== peg$FAILED) {
          s3 = [];
          if (peg$c15.test(input.charAt(peg$currPos))) {
            s4 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c16); }
          }
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            if (peg$c15.test(input.charAt(peg$currPos))) {
              s4 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c16); }
            }
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parseWS();
            if (s4 !== peg$FAILED) {
              s1 = [s1, s2, s3, s4];
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parseOPENPAREN() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      s1 = peg$parseWS();
      if (s1 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 40) {
          s2 = peg$c6;
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c7); }
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parseWS();
          if (s3 !== peg$FAILED) {
            s1 = [s1, s2, s3];
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parseCLOSEPAREN() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      s1 = peg$parseWS();
      if (s1 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 41) {
          s2 = peg$c8;
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c9); }
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parseWS();
          if (s3 !== peg$FAILED) {
            s1 = [s1, s2, s3];
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parseAND() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      s1 = peg$parseWS();
      if (s1 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 38) {
          s2 = peg$c17;
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c18); }
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parseWS();
          if (s3 !== peg$FAILED) {
            s1 = [s1, s2, s3];
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parseOR() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      s1 = peg$parseWS();
      if (s1 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 124) {
          s2 = peg$c19;
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c20); }
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parseWS();
          if (s3 !== peg$FAILED) {
            s1 = [s1, s2, s3];
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parseWS() {
      var s0, s1;

      s0 = [];
      if (peg$c21.test(input.charAt(peg$currPos))) {
        s1 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c22); }
      }
      while (s1 !== peg$FAILED) {
        s0.push(s1);
        if (peg$c21.test(input.charAt(peg$currPos))) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c22); }
        }
      }

      return s0;
    }

    peg$result = peg$startRuleFunction();

    if (peg$result !== peg$FAILED && peg$currPos === input.length) {
      return peg$result;
    } else {
      if (peg$result !== peg$FAILED && peg$currPos < input.length) {
        peg$fail({ type: "end", description: "end of input" });
      }

      throw peg$buildException(null, peg$maxFailExpected, peg$maxFailPos);
    }
  }

  return {
    SyntaxError: SyntaxError,
    parse:       parse
  };
})();

/*
 * The purpose of this class is to build a transition system in order to fully
 * ascertain some "event" logic
 */

ARCS.TransitionSystem = function(a, b, c) {
    this.initial = "" ;
    this.final = "";
    
    var transitions = {};
    
    if ( a !== undefined) {
        if ( (b === undefined || c === undefined)) {
            this.initial = "a$";
            this.final = "z$";
            transitions[this.initial] = {};
            transitions[this.initial][a] = this.final;
        } else {        
            this.initial = a;
            this.final = c;
            transitions[this.initial] = {};
            transitions[this.initial][b] = this.final;
        }
    }
    
    this.visitTransitions = function( closure ) {
        var p,t;
        
        for (p in transitions) {
            if (transitions.hasOwnProperty(p)) {
                for (t in transitions[p]) {
                    if (transitions[p].hasOwnProperty(t)) {
                        closure(p,t,transitions[p][t]);
                    }
                }
            }
        }
    }
    
    this.clone = function(pf) {
        // checked
        var prefix = pf || "";
        var res = new ARCS.TransitionSystem();
        
        res.initial = prefix + this.initial;
        res.final = prefix + this.final;
        
        this.visitTransitions( function(s, t, e) {
            res.addTransition(prefix + s, t, prefix + e);
        });
        
        return res;
    };
    
    this.fuse = function(ts, i, f) {
        // checked
        var res = ts.clone();

        this.visitTransitions( function(s, t, e) {
            res.addTransition(s, t, e);
        });

        if (i === undefined) {
            res.initial = this.initial;
        } else {
            res.initial = i;
        }
        if (f === undefined) {
            res.final = this.final;
        } else {
            res.final = f;
        }
        return res;
    };
    
    this.hasState = function(s) {
        if (this.initial === s || this.final === s || transitions.hasOwnProperty(s)) {
            return true; 
        }        
  
        try { 
            this.visitTransitions( function (s1, t, e) {
                if ( e === s) throw '!';
            });
        } catch ( e ) {
            if (e === '!')
                return true;
        }
 
        return false;
    };
    
    
    this.renameState = function (currentName, newName) {
        if (this.hasState(newName)) {
            // this is bad !
            console.error("This transition system is corrupt !");
        }
        
        if (this.initial === currentName) {
            this.initial = newName;
        }
        
        if (this.final === currentName) {
            this.final = newName;
        }
        
        if (transitions.hasOwnProperty(currentName)) {
            transitions[newName] = transitions[currentName];
            delete transitions[currentName];
        }
        
        this.visitTransitions( function (s, t, e) {
            if ( e === currentName ) {
                transitions[s][t] = newName;
            }
        });
        
        
    };
    
    this.dump = function () {
        console.log('@ = ' + this.initial + ', + = ' + this.final);
        this.visitTransitions( function(s, t, e) {
            console.log('  ' + s + '\t---\t'+ t +'\t-->\t' + e);
        });
        
    };
    
    this.getStates = function() {
        // check
        var states = [];
        
        // then we start looking for states
        this.visitTransitions(function (s, t, e) {
            if (states.indexOf(s) < 0) {
                states.push(s);
            }
            if (states.indexOf(e) < 0) {
                states.push(e);
            }
        });
        return states;
    }
    
    this.addTransition = function( start, token, end) {
        if ( ! transitions.hasOwnProperty(start)) {
            transitions[start] = {};
        }
        transitions[start][token] = end;
    };
    
    
    // let's make a AND operation
    this.and = function(ts) {
        //check
        // letters will create disambiguation
        var i;
        
        // first, let's create two identical trees
        var leftTS1 = this.clone('i');
        var leftTS2 = this.clone('j');
        var rightTS;

        // then, we fuse the trees together.
        var res = leftTS1.fuse(leftTS2, leftTS1.initial, leftTS2.final);
        var tmpFuse;
        
        var states = this.getStates();
        
        for( i = 0; i < states.length; i++) {
            rightTS = ts.clone('k'+i);
            rightTS.renameState(rightTS.initial, 'i'+ states[i]);
            rightTS.renameState(rightTS.final, 'j'+ states[i]);
            tmpFuse = res.fuse(rightTS);
            res = tmpFuse;
        }
        return res;
    };
    
    // let's make a OR operation
    this.or = function(ts) {
        // checked
        var leftTS = this.clone('s');
        var rightTS = ts.clone('t');
        
        rightTS.renameState(rightTS.initial, leftTS.initial);
        rightTS.renameState(rightTS.final, leftTS.final);
        return leftTS.fuse(rightTS);
    };
};


// tree is the one obtained by parsing expressions    
ARCS.TransitionSystem.build = function( tree, d) {
    var depth = d || 1;
    var counter = 1;
    var i;
    
    var res;
    var tmpTS;
    var rightTS;
    
    if (typeof tree === "string") {
        return new ARCS.TransitionSystem(tree).clone('w0d' + depth);
    }

    // TODO: depth is not handled in subexpression prefixes. 
    // This may results in name clashes for intermediate transformations (or not)
    res = ARCS.TransitionSystem.build(tree[0], depth + 1);
    
    for (i=1; i < tree.length; i++) {
        if (tree[i].hasOwnProperty('and')) {
            rightTS = ARCS.TransitionSystem.build(tree[i]['and'], depth + 1).clone('w' + counter++); 
            tmpTS = res.and(rightTS);
        } else {
            if (tree[i].hasOwnProperty('or')) {
                rightTS = ARCS.TransitionSystem.build(tree[i]['or'], depth + 1).clone('w' + counter++);
                tmpTS = res.or(rightTS);
            } else {
                console.warn('[ARCS] Illegal tree');
            }
        }
        res = tmpTS;        
    }    
    
    return res;
};
/******************************************************************************
 * Statemachine implementation
 * ***************************************************************************/
/**
 * Describes a statemachine
 * @param obj {object} an object describing a state machine. If obj is empty then the statemachine is empty
 * @class
 */
ARCS.Statemachine = new ARCS.Component.create(function (obj) {
    // dynamic construction: properties are initial state that have properties 
    // that are tokens and value that are the final state
    var initial = "", final = "", transitions = {}, currentState = "", self= this;
    

    var addToken = function(t) {        
        if ( self.slots.indexOf(t) < 0 ) {
            self.slots.push(t);
            self[t] = function( s ) {
                return function() {
                    self.setToken(s);
                };
            } (t);
        }
    };
    
    /**
     * Sets the initial state of the statemachine
     * @param string {string} name of the initial state
     */
    this.setInitialState = function (string) {
        initial = string;
        currentState = initial;
    };
    /**
     * Sets the final state of the statemachine
     * @param string {string} name of the final state
     */
    this.setFinalState = function (string) { final = string; };
    /**
     * Adds a transition to the state machine
     * @param start {string} name of the state at the beginning of the transition
     * @param token {string} name of the token triggering the transition
     * @param end {string} name of the state reached at the end of the transition
     */
    this.addTransition = function (start, token, end) {
        var re = /([A-Za-z_]\w*)/g;
        var t, tsd, ts, tsc;
        try {
            var tsd = ARCS.EventLogicParser.parse(token);
            if (typeof tsd === "string") {
                if (transitions[start] === undefined) {
                    transitions[start] = {};
                }
                transitions[start][tsd] = end;
                addToken(tsd);
            } else {
                // we will start to build here a transition system corresponding to 
                // the "token" object.
                
                // first we look for tokens
                while( (t = re.exec(token)) !== null) {
                    addToken(t[0]);
                }
                
                // then we build the transition system.
                ts = ARCS.TransitionSystem.build(tsd);
                
                tsc = ts.clone(start + '_' + end + '_');
                
                tsc.renameState(tsc.initial, start);
                tsc.renameState(tsc.final, end);
                
                // then, let's fuse the transition systems !
                tsc.visitTransitions( function ( s, t, e) {
                    if (transitions[s] === undefined) {
                        transitions[s] = {};
                    }
                    transitions[s][t] = e;
                });                
            }
            
        } catch (e) {  }
    };
    /**
     * Gives a token to the statemachine. According to its list of transitions
     * and the current state, it may trigger a transition
     * @param token {string} name of the token
     */
    this.setToken = function (token) {
        if (transitions[currentState] !== undefined) {
            if (transitions[currentState][token] !== undefined) {
                currentState = transitions[currentState][token];
                this.emit('requestSheet', currentState);
                if (currentState === final) {
                    this.emit('requestTermination');
                }
            }
        }
    };
    /**
     * Sets transitions from a list of transitions
     * @param obj {object[]} list of transitions
     */
    this.setTransitions = function (obj) {
        // this function is no longuer a simple affectation
        // transitions = obj;         
        var p, t, i;
        for (p in obj) {
            if (obj.hasOwnProperty(p)) {
                for (t in obj[p]) {
                    if (obj[p].hasOwnProperty(t)) {
                        this.addTransition(p, t, obj[p][t]);
                    }
                }
            }            
        }
        
        
        // we will temporay dump properties in order to understand how the statemachine is built
        /*
        for (p in transitions) {
            if (transitions.hasOwnProperty(p)) {
                for (t in transitions[p]) {
                    if (transitions[p].hasOwnProperty(t)) {
                        console.log("\t" + p + "\t----\t" + t + "\t--->\t" + transitions[p][t]);
                    }                    
                }
            }
        }*/
    };
    /**
     * Initialize and starts the statemachine, setting its current state to 
     * the initial state (by default, it is the departure of the first transition
     */
    this.start = function () {
        currentState = initial;
        this.emit('requestSheet', currentState);
    };
    

    // INIT CODE
    if (obj !== undefined) {
        initial = obj.initial;
        final = obj.final;
        //transitions = obj.transitions;
        this.setTransitions(obj.transitions);
        currentState = "";
    }

},
['setToken'],
['requestSheet', 'requestTermination']
);
                                       

/******************************************************************************
 * Application implementation
 * ***************************************************************************/

/**
 * Creates an application runnable by the ARCS engine.
 * @class ARCS.Application
 * @classdesc The application is the master class of the ARCS engine. 
 * It is initialized using a structured object (possibly described in JSON, 
 * see {@link ARCS.Application#import}) 
 * to load all external scripts describing components, instanciate
 * all components and then start the application
 */
ARCS.Application = function () {
    var context = new ARCS.Context(),
        sheets = {},
        controller = {},
        dependencies = [],
        self = this,
        currentSheet = "",
        preProcess;
        

    /** 
     * Exports an object representing an application
     */    
    this.export = function() {
        var i;
        var description = { 
            context: context, 
            controller: context.getComponentName(controller), 
            sheets: sheets            
        } ;
        
        // first problem: when loaded by the editor, libraries are not the good ones
        //description.context.libraries = libraries;        
        return description;
    };
    
    this.getContext = function () {
        return context;
    };
        
    this.getSheetList = function() {
        return Object.keys(sheets);
    };
        
    this.getSheet = function (sName) {
        return sheets[sName];
    };
            
    this.addSheet = function (sName, sheet) {
        sheets[sName] = sheet;
        sheet.setContext(context);
    };

    
    this.removeSheet = function (sName) {
        delete sheets[sName];
    };
        
    preProcess = function () {
        // first, we should instanciate components
        var i, temp, sheetList; 

        temp = context.getComponent(controller); //[controller].instance;
        controller = temp;
        // then we should work on sheets
        sheetList = Object.keys(sheets);
        for (i = 0; i < sheetList.length; i++) {
            temp = new ARCS.Sheet(context);
            temp.import(sheets[sheetList[i]], context);
            sheets[sheetList[i]] = temp;
        }

        ARCS.Component.connect(controller, "requestSheet", self, "setSheet");
        ARCS.Component.connect(controller, "requestTermination", self, "finish");
        controller.start();
    };
    
    
    this.setController = function (ctrlName) {
        controller = context.getComponent(ctrlName); //[ctrlName].instance;
    };
    
    /**
     * Sets the current sheet of the application. This method is in fact designed
     * as a slot and may be triggered by a statemachine. If a sheet is already the
     * current one, then it is deactivated before activating this new sheet.
     * This method may warn that it is trying to activate a hollow sheet. It is 
     * not inherently an error by itself but it may indicate a problem in your
     * application.
     * @param sheetName {string} name of the sheet to set as a current sheet.
     */
    this.setSheet = function (sheetname) {
        if (sheets.hasOwnProperty(sheetname)) {
            if (currentSheet) {
                sheets[currentSheet].deactivate();
            }
        
            currentSheet = sheetname;
            sheets[currentSheet].activate();
        } else {
            console.warn('[ARCS] Tried to activate hollow sheet named: ' + sheetname);
        }
    };
    /**
     * This is the end my friend. This triggers the end of the application
     */
    this.finish = function () {
        if (currentSheet) {
            sheets[currentSheet].deactivate();
        }
    };
    
    
    
    /**
     * Imports a structured object describing the application. The structured object
     * may be described itself in a JSON format.
     * @param object {object} structured object describing an application.
     *   
     * @example
     * // JSON format of an application description
     * {
     *      context : {
     *              libraries : [ "library1", "library2"],
     *              components : [
     *                      // this could be also properties from context
     *                      name1: { type: "type", value: "value if needed" }
     *              ],
     *              constants : [
     *                      // the same observation applies here
     *                      name1: { representation : {JSON/objectRepresentation ? } }
     *              ]
     *      },
     *      controller : controllerId,
     *      sheets : {
     *              sheetId : {     
     *                      preconnections : [
     *                              { 
     *                                      destination: "id", 
     *                                      slot : "slot name",
     *                                      value : JSON/objectRepresentation ?
     *                              }, {...}, {...}
     *                      ],
     *                      postconnections : [
     *                              { 
     *                                      destination: "id", 
     *                                      slot : "slot name",
     *                                      value : JSON/objectRepresentation ?
     *                              }, {...}, {...}
     *                      ],
     *                      connections : [
     *                              {
     *                                      source: "id",
     *                                      destination: "id",
     *                                      slot: "slot name",
     *                                      signal: "signal name"
     *                              }, {...}, {...}
     *                      ],
     *                      cleanups : [
     *                              { 
     *                                      destination: "id", 
     *                                      slot : "slot name",
     *                                      value : JSON/objectRepresentation ?
     *                              }, {...}, {...}
     *                      ]
     *              },
     *              { ... }
     *      }
     * }
     * 
     */
    this.import = function (object) {
        context = new ARCS.Context(object.context/*.components*/);
        sheets = object.sheets;
        controller = object.controller;
        if (controller === undefined) {
            console.error("[ARCS] Undefined controller. Cannot start application.");
        }
    };

    /**
     * Registers a factory using a key. If a factory was previously existing using 
     * the same key, then it is overridden.
     * @param key {string} name of the factory
     * @param factory {object} component factory to register.
     */
    this.setFactory = function (key, factory) {
        factories[key] = factory;
    };

    this.setDependency = function (key) {
        dependencies[key] = {};
    };

    /**
     * Starts the application
     */
    this.start = function () {
        console.log("[ARCS] Starting application");
        context.instanciate().then(preProcess);
    };
};

ARCS.Application.setDependency = function (app, key) {
    app.setDependency(key);
};



ARCS.Component.create(ARCS.Application);
ARCS.Application.slot("setSheet");
ARCS.Application.slot("finish");


/**
 * definition of the main module function: 
 * it takes an anonymous function as a parameter
 * the anonymous function has one parameter: the object encompassing 
 * ARCS definitions (in order to able to use ARCS.Component.create, ...)
 * @param moduleDefinition {function} main function of the module. 
 * It should return a list of components
 * @param deps {mixed[]} dependencies
 */

// reimplementation using native promises
arcs_module = function(moduleDefinition, deps) {
    var storeComponents, i;
    
    if (typeof module !== 'undefined') {
        if (module.parent.exports) {
            ARCS = module.exports; 
        }
    }
    
    if (deps === undefined) { deps = []; }
    
    storeComponents = function (deps) {
        var mdef, p;
        // we should insert ARCS at the beginning of deps !
        deps.unshift(ARCS);
        
        mdef = (typeof moduleDefinition === 'function') ?
                moduleDefinition.apply(this, deps) : moduleDefinition;

        if (mdef === undefined) {
            throw new Error("[ARCS] Your module is undefined. Did you forget to export components?\nCode of module follows:\n"+moduleDefinition);
        }

        for (p in mdef) {
            if (mdef.hasOwnProperty(p) && ARCS.Context.currentContext != null) {
                ARCS.Context.currentContext.setFactory(p,mdef[p]); //.setFactory(ARCS.Application.currentApplication, p, mdef[p]);
            }
        }
    };
    // until now, it is the very same code.
    
    // here we create a promise to solve dependency
    // reject has the dependency name, while resolve has the object
    var depResolve = function(dep) {
        return new Promise(function(resolve, reject) {  
            var d,shimConfig;
            if (ARCS.isInNode()) {
                d = require(dep);
                if (d === undefined) {
                    reject(dep);
                } else {
                    resolve(d);
                }
            } else {
                // this one a little bit trickier since we have to shim.
                if (dep.name !== undefined) {
                    shimConfig = { shim: {} };
                    shimConfig.shim[dep.name] = { exports: dep.exports };
                    if (dep.deps !== undefined) {
                        shimConfig.shim[dep.name].deps = dep.deps;
                    }
                    require.config(shimConfig);
                    dep = dep.name;
                }
                // shim performed
                require([dep], 
                        function(d) { resolve(d); },
                        function(err) { console.log("[ARCS] Trouble with module ", dep); reject(dep, err); }
                );
            }
        });            
    };
        
    var depResolves = [];
    for (i=0; i<deps.length; i++) {
        depResolves[i] = depResolve(deps[i]);
    }
    
 
    
        ARCS.Context.currentContext.addLibraryPromise(
            Promise.all(depResolves).then(storeComponents,
            function(reason) { console.error("[ARCS] Failed to load dependency " + reason ); })
        
        );
    
}

// ARCS is then defined as a node.js module
if (!ARCS.isInNode()) {
    var exports = {};
}

exports.Component = ARCS.Component;
exports.Connection = ARCS.Connection;
exports.Invocation = ARCS.Invocation;
exports.Statemachine = ARCS.Statemachine;
exports.Sheet = ARCS.Sheet;
exports.Application = ARCS.Application;
exports.EventLogicParser = ARCS.EventLogicParser;
exports.TransitionSystem = ARCS.TransitionSystem;
exports.isInNode = ARCS.isInNode;
exports.isInRequire = ARCS.isInRequire;

// hack for require.js
// ARCS is then defined as a require.js module.
if (ARCS.isInRequire()) {
    //console.log("module ARCS in require.js");
    define(exports);
}
