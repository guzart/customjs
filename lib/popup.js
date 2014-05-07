// /jquery/1.11.0/jquery.min.js
// /jquery/2.1.0/jquery.min.js

chrome.tabs.getSelected(null, function(tab) {	    
	var cjs = $('#cutomjs'),
		tsc = $('textarea[name="editor"]', cjs);

    var errorHandler = function() {
        cjs.css({
          "min-width": "120px",
          "min-height": "20px",
          "width": "350px",
          "height": "80px"
        });
        cjs.removeClass('pure-g').html('<em><strong>It seems that this page cannot be modified with custom js...</strong><br><br> TIP: Try refresh page</em>');
    };

    var getConfig = function() {
        return {
            enable: $('input[name="enable"]').is(':checked'),
            include: $('select[name="include"]').val()
        };
    };
	
    var defaultContent = "/**\r\n Type Your custom JS code ... \r\n tip: you can include and use jQuery \r\n note: do not use // for comments \r\n**/\r\n\r\n";    

    /**
     * Show current domain
     */
    chrome.tabs.sendRequest(tab.id, {method: "getHost", reload: false}, function(response) {         
        console.log(response);
        try {
            $('input[name="domain"]', cjs).val(response.host);
        }
        catch(e) {        
            errorHandler();
        }
    });

	/**
	 * Fill by local script
	 */
	chrome.tabs.sendRequest(tab.id, {method: "getCustomJS", reload: false}, function(response) {                 
        var src;
        if( response.customjs ) {            
            src = response.customjs.src ? decodeURI(response.customjs.src) : defaultContent;
            
            if( response.customjs.config ) {
                var config = response.customjs.config;
                if( config.enable ) {
                    $('input[name="enable"]').attr('checked', 'checked');
                }
                if( config.include ) {
                    $('select[name="include"]', cjs).val(response.customjs.config.include);
                }
            }            
        }

        tsc.val(src || defaultContent);
	});

    /**
     * Enable on textarea change
     */    
    tsc.on('change keyup paste', function() {
        $('input[name="enable"]', cjs).attr('checked', 'checked');
    })

	/**
	 * Save local script
	 */
	$('input[name="save"]', cjs).on('click', function() {        
		var src = encodeURI(tsc.val()),
            customjs = {
                src: src,
                config: getConfig()
            };
		chrome.tabs.sendRequest(tab.id, {method: "setCustomJS", customjs: customjs, reload: true});	
        window.close();	
	})
	
	/**
	 * Remove local script
	 */
	$('input[name="reset"]', cjs).on('click', function() {
		tsc.val(decodeURI(defaultContent));
		chrome.tabs.sendRequest(tab.id, {method: "removeCustomJS", reload: true});
        window.close();
	});


    /**
     * Init editor
     */
    var editor = ace.edit("ace-editor");
    editor.setTheme("ace/theme/tomorrow");
    editor.getSession().setMode("ace/mode/javascript");
    editor.setHighlightActiveLine(false);
    editor.setUseWrapMode(false);

});