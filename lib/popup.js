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
            revisionCounterText: $('#revision-counter'),
            revisionDeleteLink: $('#delete-revision'),
            revisionPrevBtn: $('#prev-revision'),
            revisionNextBtn: $('#next-revision')
        },
        title: {
            host: {
                select: "List of websites modified by Your custom js",
                goTo:  "Jump to the selected host"
            },
            share: "Share Your script with other people",
            save: "Save and apply this revision",
            revision: {
                remove: "Delete revision %s permanently",
                prev: "Switch to previous revision",
                next: "Switch to next revision",
                create: "Switch to next revision"
            },
            include: {
                textarea: 'Uncomment address of script below or type your own (one per line)',
                mask: 'Click to close textarea popup'
            }
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
            }
        },
        apiclb: {
            onSelectedTab: function(tab) {
                var handlers = popup.apiclb;
                chrome.tabs.sendRequest(tab.id, {method: "getHost", reload: false}, handlers.onGetHost);
                chrome.tabs.sendRequest(tab.id, {method: "getCustomJS", reload: false}, handlers.onGetScript);
            },
            onGetHost: function(response) {
                if( typeof response.host !== 'string' ) {
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
                var _config = response.customjs.config || {},
                    live = {
                        config: {
                            enable: _config.enable || false,
                            include: _config.include || '',
                            extra: (_config.extra || '').replace(';', "\n")
                        },
                        source: decodeURI(response.customjs.src || '')
                    };
                
                // source is encoded as base64
                if( live.source.indexOf('data:text/javascript;base64,') === 0 ) {
                    live.source.replace('data:text/javascript;base64,');
                    live.source = atob(source);
                }
                
                popup.revisions.load(live);
            }
        },
        revisions: {
            active: -1,
            load: function(live) {
                this.data = popup.storage.get('revisions') || [];

                // Create revision from draft
                // var draft = popup.storage.get('draft');
                // if( draft ) {
                //     this.create(draft);
                //     return;
                // }

                // Backward compatibility width version 1
                if( this.data.length === 0 ) {
                    this.create(live);
                }
                else {
                    // Apply last revision
                    this.active = (this.data.length - 1);
                    this.apply();
                }                
            },
            save: function() {
                popup.storage.set('revisions', this.data);
            },
            apply: function() {
                var revision = this.data[this.active];
                popup.el.enableCheck.prop('checked', revision.config.enable);

                if( !revision.config.extra ) {
                    revision.config.extra = '# ' + popup.title.include.textarea + "\n";
                    popup.include.extra.forEach(function(url) {
                        revision.config.extra += '# ' + url + "\n";
                    });
                }

                if( !revision.source ) {
                    revision.source = popup.editor.defaultValue;
                }

                if( revision.config.include ) {
                    popup.include.predefined.forEach(function(lib) {
                        if( lib.path === revision.config.include ) {
                            popup.el.includeSelect.val(lib.path);
                        }
                    });
                }

                popup.el.includeTextarea.val(revision.extra);
                
                var editor = popup.editor.instance;
                editor.setValue(revision.source);
                editor.gotoLine(1);
            },
            getCurrentState: function() {
                return {
                    config: {
                        enable: popup.el.enableCheck.prop('checked'),
                        include: popup.el.includeSelect.val(),
                        extra: popup.el.includeTextarea.val()
                    },
                    source: popup.editor.instance.getValue()
                };
            },
            create: function(revision, type) {
                if( !revision ) {
                    revision = this.getCurrentState();
                }
                
                this.data.push(revision);
                this.active++;
                this.apply();
                this.updateCounter(type);
            },
            next: function() {

            },
            prev: function() {

            },
            updateCounter: function(type) {
                var text = (this.active + 1) + ' of ' + this.data.length + (type ? '(' + type + ')' : '');
                popup.el.revisionCounterText.text(text);
            }
        },
        error: function() {
            alert('err');
        }
    };

    window.popup = popup;

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

    // setInterval(function() {
    //     var draft = popup.revisions.getCurrentState();
    //     if( draft.source !== popup.editor.defaultValue ) {
    //         popup.storage.set('draft', draft);
    //     }
    // }, 2500);


    /**
     * Revisions control
     */

    //popup.el.

})(jQuery);
