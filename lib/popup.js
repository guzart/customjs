(function($) {

    var popup = {
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
            key: 'popup-',
            setHost: function(host) {
                this.key += host;
            },
            get: function(key) {
                if( this.data === undefined ) {
                    this.data = JSON.parse(localStorage.getItem(this.key) || "{}");
                }
                return key ? this.data[key] : this.data;
            },
            set: function(arg1, arg2) {
                // arg1 is a key
                if( typeof arg1 === 'string' ) {
                    this.data[arg1] = arg2;
                }
                // arg1 is data
                else {
                    this.data = arg1;
                }

                var str = JSON.stringify(this.data || {});
                localStorage.setItem(this.key, str);
            },
            remove: function(key) {
                if( key ) {
                    delete this.data[key];
                    if( $.isEmptyObject(this.data) ) {
                        this.remove();
                    }
                    else {
                        var str = JSON.stringify(this.data || {});
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

                popup.storage.setHost(response.host);

                var hosts = popup.storage.get('hosts') || [];
                hosts.push(response.host);
                hosts.reverse();
                hosts.forEach(function(host) {
                    var option = '<option>' + host + '</option>';
                    popup.el.hostSelect.append(option);
                });                
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
                popup.applyData(popup.storage.get('draft'));
            }
        },
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
            source = draft.source.replace(popup.editor.defaultValue, '');

        if( (source || !popup.data.source) && source !== popup.data.source ) {
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
    }, 1000);

    /**
     * Save script
     */
    popup.el.popupForm.on('submit', popup.save);


    /**
     * Remove draft
     */

    popup.el.draftRemoveLink.on('click', popup.removeDraft);
    

})(jQuery);
