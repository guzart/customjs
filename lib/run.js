(function() {
    function injectScript(src, where) {
        var elm = document.createElement('script');
        elm.src = src;
        document[where || 'head'].appendChild(elm);
    }

    var customjs = localStorage['customjs'];
    if( customjs ) {
        try {
            customjs = JSON.parse(customjs);
        }
        catch(e) {
            // Backward compatibility (version >1)
            customjs = {
                source: customjs,
                config: {
                    enable: true,
                    include: '',
                    extra: ''
                }
            };
            localStorage['customjs'] = JSON.stringify(customjs);
        }

        if( customjs.config.enable ) {

            // Predefined include
            if( customjs.config.include ) {
                injectScript('https://ajax.googleapis.com/ajax/libs' + customjs.config.include);
            }

            // Extra include
            var extra = (customjs.config.extra || '').split(';');
            extra.forEach(function(line) {
                if( line.substr(0, 1) !== '#' ) {
                    injectScript(line);
                }
            });

            // Script
            if( customjs.source || customjs.src ) {
                setTimeout(function() {
                    // Backward compatibility (version 1)
                    if( customjs.src ) {
                        customjs.source = 'data:text/javascript,' + customjs.src;
                    }

                    injectScript(customjs.source, 'body');
                }, 250);
            }

        }
    }
})();
