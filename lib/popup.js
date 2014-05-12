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
            resetBtn: $('#reset'),
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
            data: {
                private: {},
                global: {}
            },   
            MODE: {
                private: 1,
                global: 2,
            },            
            setMode: function(mode) {
                if( mode === this.MODE.private ) {
                    this.key = popup.key + "-" + popup.protocol + "//" + popup.host;
                    this.mode = this.MODE.private;
                }

                if( mode === this.MODE.global ) {
                    this.key = popup.key;
                    this.mode = this.MODE.global;
                }                
            },
            load: function() {
                this.setMode(this.MODE.private);
                this._setData(JSON.parse(localStorage.getItem(this.key) || "{}"));
                
                this.setMode(this.MODE.global);                
                this._setData(JSON.parse(localStorage.getItem(this.key) || "{}"));
            },
            _getData: function(key) {
                var storage = popup.storage;
                if( storage.mode == storage.MODE.private ) {
                    if( key ) {
                        return storage.data.private[key];
                    }
                    else {
                        return storage.data.private;
                    }
                }
                if( storage.mode == storage.MODE.global ) {
                    if( key ) {
                        return storage.data.global[key];
                    }
                    else {
                        return storage.data.global;
                    }                    
                }
            },
            _setData: function(data, key) {
                var storage = popup.storage;
                if( storage.mode == storage.MODE.private ) {
                    if( key ) {
                        storage.data.private[key] = data;
                    }
                    else {
                        storage.data.private = data;
                    }
                }
                if( storage.mode == storage.MODE.global ) {
                    if( key ) {
                        storage.data.global[key] = data;
                    }
                    else {
                        storage.data.global = data;
                    }
                }
            },
            get: function(key) {                
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
                    this._setData({});
                }
            }
        },
        apiclb: {
            onSelectedTab: function(tab) {
                popup.tabId = tab.id;
                chrome.tabs.sendRequest(popup.tabId, {method: "getData", reload: false}, popup.apiclb.onGetData);
            },
            onGetData: function(response) {
                if( !response || typeof response.host !== 'string' ) {
                    popup.error();
                    return;
                }                

                /** 
                 * Create 'hosts select'
                 */

                popup.host = response.host;
                popup.protocol = response.protocol;    

                // Load storage (global, local) IMPORTANT: Must be called first of all storage operations                
                popup.storage.load();
                
                // Set storage to store data accessible from all hosts
                popup.storage.setMode(popup.storage.MODE.global);

                var hosts = popup.storage.get('hosts') || [],
                    url = popup.protocol + "//" + response.host;

                // Add current host to list
                if( hosts.indexOf(url) === -1 ) {
                    hosts.push(url);
                }

                // Fill 'hosts select'
                hosts.forEach(function(host) {
                    var option = $('<option>' + host + '</option>');
                    if( host === url ) {
                        option.attr('selected', 'selected');
                    }
                    popup.el.hostSelect.append(option);
                });

                // Store host (current included in array) if is customjs defined
                if( response.customjs ) {
                    popup.storage.set('hosts', hosts);
                }

                /**
                 * Set-up data (script, enable, include, extra)
                 */

                // Backward compatibility (version <1 and 1)
                if( response.customjs && response.customjs.src ) {
                    response.customjs.source = decodeURI(response.customjs.src); // Old format ...
                    delete response.customjs.src;
                }

                // Merge host's data to defaults
                popup.data = $.extend(popup.data, response.customjs);

                // ... source is now encoded as base64
                if( popup.data.source.indexOf('data:text/javascript;base64,') === 0 ) {
                    popup.data.source = popup.data.source.replace('data:text/javascript;base64,', '');
                    popup.data.source = atob(popup.data.source);
                }
                
                // Set storage to store data accessible ONLY from current host
                popup.storage.setMode(popup.storage.MODE.private);

                // Save local copy of live data
                if( response.customjs ) {
                    popup.storage.set('data', popup.data);
                }

                // Apply data (draft if exist)
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
        applyData: function(data, notDraft) {
            
            if( data && !notDraft ) {
                this.el.draftRemoveLink.removeClass('is-hidden');
            }

            data = data || this.data;

            // Default value for 'extra include'
            if( !data.config.extra ) {
                data.config.extra = '# ' + popup.title.include.textarea + "\n";
                popup.include.extra.forEach(function(url) {
                    data.config.extra += '# ' + url + "\n";
                });
            }
            // Readable format for 'extra include'
            else {                
                data.config.extra = data.config.extra.replace(';', "\n");
            }

            // Default value for source
            if( !data.source ) {
                data.source = popup.editor.defaultValue;
            }            

            // Set 'predefined include' value
            popup.el.includeSelect.val(data.config.include);

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
            popup.storage.remove('draft');

            popup.applyData();
            popup.el.draftRemoveLink.addClass('is-hidden');
        },
        save: function(e) {
            e.preventDefault();

            // Is allowed to save?
            if( popup.el.saveBtn.hasClass('pure-button-disabled') ) {
                return false;
            }

            var data = popup.getCurrentData();            

            // Transform source for correct apply
            data.config.extra = data.config.extra.replace("\n", ';');
            data.source = 'data:text/javascript;base64,' + btoa(data.source);

            // Send new data to apply
            chrome.tabs.sendRequest(popup.tabId, {method: "setData", customjs: data, reload: true});
            
            // Save local copy of data
            popup.storage.setMode(popup.storage.MODE.private);
            popup.storage.set('data', popup.data);

            // Clear draft
            popup.removeDraft();

            // Close popup
            window.close();

            return false;
        },
        reset: function(e) {
            e.preventDefault();
            
            if( confirm('Do you really want all away?') ) {
                popup.storage.setMode(popup.storage.MODE.private);
                popup.storage.remove();

                chrome.tabs.sendRequest(popup.tabId, {method: "removeData", reload: false});
                popup.applyData({
                    config: {
                        enable: false,
                        include: '',
                        extra: ''
                    },
                    source: ''
                });

                popup.removeDraft();
            }

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
     * Change host by select
     */

     popup.el.hostSelect.on('change', function(e) {
        var host = $(this).val();
        if( host !== popup.protocol + '//' + popup.host ) {
            popup.el.hostGoToLink.removeClass('is-hidden');
            popup.el.saveBtn.addClass('pure-button-disabled');
        }
        else {
            popup.el.hostGoToLink.addClass('is-hidden');
            popup.el.saveBtn.removeClass('pure-button-disabled');
        }
        
        var hostData = JSON.parse(localStorage.getItem(popup.key + '-' + host), true);        
        popup.applyData(hostData.data, true);
     });


    /**
     * Click to goTo host link
     */
    popup.el.hostGoToLink.on('click', function() {
        var link = popup.el.hostSelect.val();
        chrome.tabs.sendRequest(popup.tabId, {method: "goTo", link: link, reload: false});
        window.close();
    });


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
            
            // Auto switch 'enable checkbox' on source edit
            if( !popup.el.enableCheck.hasClass('not-auto-change') ) {
                popup.el.enableCheck.prop('checked', true);
            }
        }
    }, 2000);

    /**
     * Protect 'enable checkbox' if was manually modified
     */
    popup.el.enableCheck.on('click', function() {
        $(this).addClass('not-auto-change');
    });

    /**
     * Save script
     */

    popup.el.popupForm.on('submit', popup.save);

    /**
     * Reset script
     */

    popup.el.resetBtn.on('click', popup.reset);


    /**
     * Remove draft
     */

    popup.el.draftRemoveLink.on('click', popup.removeDraft);
    

})(jQuery);
