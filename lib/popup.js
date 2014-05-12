(function($) {

    var popup = {
        key: 'popup',
        el: {
            popupForm: $('#popup-form'),
            hostSelect: $('#host'),
            hostGoToLink: $('#goto-host'),
            enableCheck: $('#enable'),
            shareBtn: $('#share'),
            includeOpenPopboxLink: $('#open-popbox'),
            includePopbox: $('#include-popbox'),
            includeSelect: $('#include'),
            includeTextarea: $('#extra-scripts'),
            includeMask: $('#screen-mask'),
            sourceEditor: $('#ace-editor'),
            saveBtn: $('#save'),
            draftRemoveLink: $('#draft-remove')
        },
        title: {
            host: {
                select: "List of websites modified by Your custom js",
                goTo:  "Jump to the selected host"
            },
            share: "Share Your script with other people",
            save: "Save and apply this script",
            include: {
                textarea: 'Uncomment address of script below or type your own (one per line)',
                mask: 'Click to close textarea popup'
            },
            draft: "This is a draft, click to remove it"
        },
        applyTitles: function() {
            this.el.hostSelect.attr('title', this.title.host.select);
            this.el.hostGoToLink.attr('title', this.title.host.goTo);

            this.el.includeTextarea.attr('title', this.title.include.textarea);
            this.el.includeMask.attr('title', this.title.include.mask);

            this.el.shareBtn.attr('title', this.title.share);
            this.el.saveBtn.attr('title', this.title.save);
            this.el.shareBtn.attr('title', this.title.share);
            this.el.draftRemoveLink.attr('title', this.title.draft);
        },
        include: {            
            predefined: [
                {
                    name: 'jQuery 1.11.0',
                    path: '/jquery/1.11.0/jquery.min.js'
                },
                {
                    name: 'jQuery 2.1.0',
                    path: '/jquery/2.1.0/jquery.min.js'
                }
            ],
            extra: [
                '//cdnjs.cloudflare.com/ajax/libs/underscore.js/1.5.2/underscore-min.js'
            ]
        },
        editor: {
            instance: null,
            defaultValue: "// Here You can type your custom JavaScript...",
            value: '',
            init: function() {
                var editor = this.instance = ace.edit(popup.el.sourceEditor[0]);
                editor.setTheme("ace/theme/tomorrow");
                editor.getSession().setMode("ace/mode/javascript");
                editor.setHighlightActiveLine(false);
                editor.getSession().on('change', this.onChange);
            },
            apply: function(source) {
                var editor = this.instance;
                editor.setValue(source);
                editor.gotoLine(1);
            }
        },
        storage: {
            data: {},   
            MODE: {
                private: 1,
                global: 2,
            },            
            setMode: function(mode) {
                if( mode === this.MODE.private ) {
                    this.key = popup.key + "-" + popup.host;
                    this.mode = this.MODE.private;
                }

                if( mode === this.MODE.global ) {
                    this.key = popup.key;
                    this.mode = this.MODE.global;
                }                
            },
            _getData: function(key) {
                if( this.mode == this.MODE.private ) {
                    if( key ) {
                        return this.data.private[key];
                    }
                    else {
                        return this.data.private;
                    }
                }
                if( this.mode == this.MODE.global ) {
                    if( key ) {
                        return this.data.global[key];
                    }
                    else {
                        return this.data.global;
                    }                    
                }
            },
            _setData: function(data, key) {
                if( this.mode == this.MODE.private ) {
                    if( key ) {
                        this.data.private[key] = data;
                    }
                    else {
                        this.data.private = data;
                    }
                }
                if( this.mode == this.MODE.global ) {
                    if( key ) {
                        this.data.global[key] = data;
                    }
                    else {
                        this.data.global = data;
                    }
                }
            },
            get: function(key) {                
                if( this._getData() === undefined ) {
                    this._setData(JSON.parse(localStorage.getItem(this.key) || "{}"));
                }
                return this._getData(key);
            },
            set: function(arg1, arg2) {
                // arg1 is a key
                if( typeof arg1 === 'string' ) {
                    this._setData(arg2, arg1);
                }
                // arg1 is data
                else {
                    this._setData(arg1);
                }

                var str = JSON.stringify(this._getData() || {});
                localStorage.setItem(this.key, str);
            },
            remove: function(key) {
                if( key ) {
                    var data = this._getData();
                    delete data[key];
                    if( $.isEmptyObject(data) ) {
                        this.remove();
                    }
                    else {
                        var str = JSON.stringify(this._getData());
                        localStorage.setItem(this.key, str);
                    }
                }
                else {
                    localStorage.removeItem(this.key);
                }
            }
        },
        apiclb: {
            onSelectedTab: function(tab) {
                var handlers = popup.apiclb;

                popup.tabId = tab.id;

                chrome.tabs.sendRequest(popup.tabId, {method: "getHost", reload: false}, handlers.onGetHost);
                chrome.tabs.sendRequest(popup.tabId, {method: "getCustomJS", reload: false}, handlers.onGetScript);
            },
            onGetHost: function(response) {
                if( !response || typeof response.host !== 'string' ) {
                    popup.error();
                    return;
                }

                popup.host = response.host;

                popup.storage.setMode(popup.storage.MODE.global);
                var hosts = popup.storage.get('hosts') || [];

                if( hosts.indexOf(response.host) === -1 ) {
                    hosts.push(response.host);
                }

                hosts.forEach(function(host) {
                    var option = $('<option>' + host + '</option>');
                    if( host === response.host ) {
                        option.attr('selected', 'selected');
                    }
                    popup.el.hostSelect.append(option);
                });

                popup.storage.set('hosts', hosts);
            },
            onGetScript: function(response) {
                var data = response.customjs || {},
                    conf = response.customjs.config || {}; 

                // Backward compatibility (version 1)
                if( data.src ) {
                    data.source = decodeURI(data.src);
                }

                if( data.source ) {
                    // source is encoded as base64
                    if( data.source.indexOf('data:text/javascript;base64,') === 0 ) {
                        data.source = data.source.replace('data:text/javascript;base64,', '');
                        popup.data.source = atob(data.source);
                    }
                    else {
                        popup.data.source = data.source;
                    }
                }

                popup.data.config.enable = conf.enable ? true : false;

                if( conf.include ) {
                    popup.data.config.include = conf.include;
                }

                if( conf.extra ) {
                    popup.data.config.extra = conf.extra;
                }
                
                // Apply draft if exist 
                popup.storage.setMode(popup.storage.MODE.private);
                popup.applyData(popup.storage.get('draft'));
            }
        },
        host: undefined,
        data: {
            config: {
                enable: false,
                include: '',
                extra: ''
            },
            source: ''
        },
        applyData: function(draft) {
            var data = draft || this.data;

            if( draft ) {
                this.el.draftRemoveLink.removeClass('is-hidden');
            }

            // Default value for 'extra include'
            if( !data.config.extra ) {
                data.config.extra = '# ' + popup.title.include.textarea + "\n";
                popup.include.extra.forEach(function(url) {
                    data.config.extra += '# ' + url + "\n";
                });
            }

            // Default value for source
            if( !data.source ) {
                data.source = popup.editor.defaultValue;
            }
            // Source copy is current, isn't necessary to highlight save button
            else {
                popup.el.saveBtn.removeClass('pure-button-primary');
            }

            // Set 'predefined include' value
            if( data.config.include ) {
                popup.include.predefined.forEach(function(lib) {
                    if( lib.path === data.config.include ) {
                        popup.el.includeSelect.val(lib.path);
                    }
                });
            }

            // Set enable checkbox
            popup.el.enableCheck.prop('checked', data.config.enable);

            // Fill 'extra include' textarea
            popup.el.includeTextarea.val(data.config.extra);

            // Apply source into editor
            popup.editor.apply(data.source);
        },
        getCurrentData: function() {
            return {
                config: {
                    enable: popup.el.enableCheck.prop('checked'),
                    include: popup.el.includeSelect.val(),
                    extra: popup.el.includeTextarea.val()
                },
                source: popup.editor.instance.getValue()
            };
        },
        removeDraft: function() {
            popup.storage.setMode(popup.storage.MODE.private);
            popup.storage.remove('draft', null);

            popup.applyData();
            popup.el.draftRemoveLink.addClass('is-hidden');
        },
        save: function(e) {            
            var data = popup.getCurrentData();

            e.preventDefault();

            data.config.extra = data.config.extra.replace("\n", ';');
            data.source = 'data:text/javascript;base64,' + btoa(data.source);

            chrome.tabs.sendRequest(popup.tabId, {method: "setCustomJS", customjs: data, reload: true});
            
            popup.removeDraft();
            window.close();

            return false;
        },
        error: function() {
            alert('err');
        }
    };

    window.popup = popup;

    /**
     * Add titles to elements
     */

    popup.applyTitles();


    /**
     * Fill predefined libs to include
     */

    popup.include.predefined.forEach(function(lib) {
        var option = '<option value="' + lib.path + '">' + lib.name + '</option>';
        popup.el.includeSelect.append(option);
    });


    /**
     * Inicialize Ace Editor 
     */

    popup.editor.init();


    /**
     * Connect front end (load info about current site)
     */

    chrome.tabs.getSelected(null, popup.apiclb.onSelectedTab);


    /**
     * 'Include extra scripts' control
     */

    popup.el.includeOpenPopboxLink.on('click', function() {
        popup.el.includePopbox.removeClass('is-hidden');
    });

    popup.el.includeMask.on('click', function() {
        popup.el.includePopbox.addClass('is-hidden');
    });


    /**
     * Auto save draft
     */

    setInterval(function() {
        var draft = popup.getCurrentData(),
            source = draft.source;        
        if( (source || !popup.data.source) && source !== popup.data.source ) {
            popup.storage.setMode(popup.storage.MODE.private);
            popup.storage.set('draft', draft);
            // Highlight save button
            popup.el.saveBtn.addClass('pure-button-primary')
            // Auto switch 'enable checkbox' on source edit
            popup.el.enableCheck.prop('checked', true);
        }
        else {
            // No changes or no source - remove save button highlight
            popup.el.saveBtn.removeClass('pure-button-primary')
        }
    }, 2000);

    /**
     * Save script
     */
    popup.el.popupForm.on('submit', popup.save);


    /**
     * Remove draft
     */

    popup.el.draftRemoveLink.on('click', popup.removeDraft);
    

})(jQuery);
