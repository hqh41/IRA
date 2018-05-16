exports.defineTags = function(dictionary) {
	dictionary.defineTag('signal', {
		onTagged: function(doclet, tag) {
			doclet.signal = true;
        },
        mustNotHaveValue : true,
        mustNotHaveDescription: true
	});
	dictionary.defineTag('slot', {
		onTagged: function(doclet, tag) {
			doclet.slot = true;
		},
        mustNotHaveValue : true,
        mustNotHaveDescription: true
	});
    dictionary.defineTag('emits', {
        onTagged: function(doclet, tag) {
            doclet.emits = doclet.emits || [];
            doclet.emits.push(tag.value);
        },
        mustHaveValue: true
    });
};


exports.handlers = {
    processingComplete : function(e) {
        var doclets = e.doclets;
        var i;
        for (i =0; i <doclets.length; i++) {
            if (doclets[i].kind === 'function') {
                doclets[i].signal = doclets[i].signal || false;
                doclets[i].slot = doclets[i].slot || false;
            }
        }
        
    }
};