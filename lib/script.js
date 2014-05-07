var customjs = localStorage['customjs'];
if( customjs ) {
    try {
        customjs = JSON.parse(customjs);
    }
    catch(e) { // Old version
        customjs = {
            src: customjs,
            config: {
                enable: true,
                include: ''
            }
        };
        localStorage['customjs'] = JSON.stringify(customjs);
    }
    
    if( customjs.config.enable ) {
        if( customjs.config.include ) {
            var jquery = document.createElement('script');
            jquery.src = 'https://ajax.googleapis.com/ajax/libs' + customjs.config.include;     
            document.head.appendChild(jquery);    
        }
        if( customjs.src ) {
            var cusomscript = document.createElement('script');        
            cusomscript.src = 'data:text/javascript,' + decodeURI(customjs.src); 
            setTimeout(function() {
                document.body.appendChild(cusomscript);
            }, 250);
        }
    }
}


chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {    
	switch(request.method) {
        case 'getHost':
            sendResponse({host: location.host});
            break;
		case 'setCustomJS':
			localStorage['customjs'] = JSON.stringify(request.customjs);
		case 'getCustomJS':         
            var customjs = JSON.parse(localStorage['customjs'] || '{}');         
			sendResponse({customjs: customjs});
			break;
		case 'removeCustomJS':
			delete localStorage['customjs'];
			break;
		default:
			sendResponse({src: '', config: {}});
	}
	if( request.reload ) {
		window.location.reload();
	}
});