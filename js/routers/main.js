/*
 * Revel Systems Online Ordering Application
 *
 *  Copyright (C) 2014 by Revel Systems
 *
 * This file is part of Revel Systems Online Ordering open source application.
 *
 * Revel Systems Online Ordering open source application is free software: you
 * can redistribute it and/or modify it under the terms of the GNU General
 * Public License as published by the Free Software Foundation, either
 * version 3 of the License, or (at your option) any later version.
 *
 * Revel Systems Online Ordering open source application is distributed in the
 * hope that it will be useful, but WITHOUT ANY WARRANTY; without even the
 * implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Revel Systems Online Ordering Application.
 * If not, see <http://www.gnu.org/licenses/>.
 */

define(["backbone", "factory"], function(Backbone) {
    'use strict';

    // flag for maintenance mode
    var isMaintenance;

    App.Routers.MainRouter = Backbone.Router.extend({
        LOC_DINING_OPTION_NAME: '',
        initialize: function() {
            var self = this;

            // create lockedRoutes array if it hasn't been created
            if(!Array.isArray(this.lockedRoutes)) {
                this.lockedRoutes = [];
            }

            this.initLocDiningOptionName();
            this.setTabTitle();

            // extend Backbone.history.loadUrl method to add validation of route handler availability
            // loadUrl() is responsible to call a handler for current route
            // link to raw: https://github.com/jashkenas/backbone/blob/master/backbone.js#L1575
            Backbone.history.loadUrl = function(fragment) {
                fragment = this.getFragment(fragment);  // used Backbone.History.prototype.getFragment() method
                // check if current route is locked and replace it on 'index' when it is true
                if(self.lockedRoutes.indexOf(fragment) > -1) {
                    fragment = 'index';
                }
                if (App.Settings.promo_message) {
                    if (/^(index.*)?$/i.test(fragment)) {
                        self.trigger('showPromoMessage');
                    } else {
                        self.trigger('hidePromoMessage');
                    }
                }
                return Backbone.History.prototype.loadUrl.call(this, fragment);
            }

            // override Backbone.history.start listen to 'initialized' event
            var start = Backbone.history.start;
            Backbone.history.start = function(opts) {
                if(!self.initialized)
                    return self.on('initialized', startHistory);

                return startHistory();

                function startHistory() {
                    return start.call(Backbone.history, opts);
                }
            };

            // listen to hash changes
            this.listenTo(this, 'route', function(route, params) {
                var settings = App.Data.settings;

                if(settings.get('isMaintenance'))
                    if (location.hash.slice(1) !== 'maintenance') {
                        location.reload();
                    }

                var needGoogleMaps = false,
                    cur_hash = location.hash.slice(1);

                if (this.hashForGoogleMaps)
                    this.hashForGoogleMaps.some( function(hash) {
                        if (cur_hash == hash) {
                            needGoogleMaps = true;
                            return true;
                        }
                    });

                if (needGoogleMaps)
                    settings.load_geoloc();

                // update session history state-object
                this.updateState(true);
            });

            this.once('started', function() {
                self.started = true;
            });

            // start listen to state changes
            this.once('initialized', this.runStateTracking.bind(this));

            // remember state of application data (begin)
            App.Data.stateAppData = {};
            for (var i in App.Data) {
                App.Data.stateAppData[i] = true;
            }
            // remember state of application data (end)

            this.listenTo(App.Data.myorder, 'paymentResponse paymentFailed', function() {
                App.Data.establishments && App.Data.establishments.removeSavedEstablishment();
            }, this);

            // set handler for window.unload event
            window.onunload = this.beforeUnloadApp.bind(this);
        },
        setTabTitle: function() {
            var title = _loc.TAB_TITLE_ONLINE_ORDERING;
            if (App.Settings['business_name']) {
                title = App.Settings['business_name'] + ' ' + title;
            }
            pageTitle(title);
        },
        navigate: function() {
            this.started && arguments[0] != location.hash.slice(1) && App.Data.mainModel.trigger('loadStarted');
            if(App.Data.settings.get('isMaintenance') && arguments[0] != 'maintenance')
                arguments[0] = 'maintenance';
            return Backbone.Router.prototype.navigate.apply(this, arguments); // TODO: can be useful {replace: true} 3rd argument
        },
        change_page: function(cb) {
            App.Data.mainModel.trigger('loadCompleted');
            !this.started && this.trigger('started');
        },
        maintenance : function() {
            if (!App.Data.settings.get('isMaintenance')) {
                this.navigate('index', true);
                return;
            } else {
                isMaintenance = true;
            }
        },
        initLocDiningOptionName: function() {
            this.LOC_DINING_OPTION_NAME = _.clone(_loc.DINING_OPTION_NAME);

            // remove Delivery option if it is necessary
            if (!App.Data.myorder.total.get('delivery').get('enable'))
                delete this.LOC_DINING_OPTION_NAME.DINING_OPTION_DELIVERY;

            if(App.Settings.editable_dining_options && App.Settings.editable_dining_options[0]) {
                if (this.LOC_DINING_OPTION_NAME['DINING_OPTION_DRIVETHROUGH']) {
                    this.LOC_DINING_OPTION_NAME.DINING_OPTION_DRIVETHROUGH = _.escape(App.Settings.editable_dining_options[1]);
                }
                if (this.LOC_DINING_OPTION_NAME['DINING_OPTION_OTHER']) {
                    this.LOC_DINING_OPTION_NAME.DINING_OPTION_OTHER = _.escape(App.Settings.editable_dining_options[2]);
                }
            }

            for (var dining_option in DINING_OPTION) {
                if (!App.Settings.dining_options || App.Settings.dining_options.indexOf(DINING_OPTION[dining_option]) == -1) {
                    delete this.LOC_DINING_OPTION_NAME[dining_option];
                }
            }
        },
        prepare: function(page, callback, dependencies) {
            if(isMaintenance && page != 'maintenance' &&  page != 'establishments') return;

            var settings = App.Data.settings,
                skin = settings.get('skin'),
                settings_skin = settings.get('settings_skin'),
                skinPath = settings.get('skinPath'),
                basePath = settings.get('basePath'),
                scripts = page && Array.isArray(settings_skin.routing[page].js) ? settings_skin.routing[page].js : [],
                templates = page && Array.isArray(settings_skin.routing[page].templates) ? settings_skin.routing[page].templates : [],
                views = page && Array.isArray(settings_skin.routing[page].views) ? settings_skin.routing[page].views : [],
                css = page && Array.isArray(settings_skin.routing[page].css) ? settings_skin.routing[page].css : [],
                cssCore = page && Array.isArray(settings_skin.routing[page].cssCore) ? settings_skin.routing[page].cssCore : [],
                templatesCore = page && Array.isArray(settings_skin.routing[page].templatesCore) ? settings_skin.routing[page].templatesCore : [],
                models = page && Array.isArray(settings_skin.routing[page].model) ? settings_skin.routing[page].model : [],
                core = page && Array.isArray(settings_skin.routing[page].core) ? settings_skin.routing[page].core : [],
                color_schemes = Array.isArray(settings_skin.color_schemes) ? settings_skin.color_schemes : [],
                system_settings = App.Data.settings.get('settings_system'),
                js = core,
                i, j;

            // contain list of skin css specified
            if(!Array.isArray(this.skinCSS)) {
                this.skinCSS = [];
            }

            callback = typeof callback == 'function' ? callback.bind(this) : new Function;

            dependencies = Array.isArray(dependencies) ? dependencies : [];

            color_schemes.length > 0 && !this.prepare.initialized && initTheme.call(this);

            var countCSS = css.length + cssCore.length;
            if (countCSS) {
                var loadModelCSS = {
                    count: countCSS,
                    dfd: $.Deferred()
                };
            }

            var countTemplates = templates.length + templatesCore.length;
            if (countTemplates) {
                var loadModelTemplate = {
                    count: countTemplates,
                    dfd: $.Deferred()
                };
            }

            for(i = 0, j = scripts.length; i < j; i++)
                js.push(skin + "/js/" + scripts[i]);

            for (i = 0, j = templates.length; i < j; i++)
                loadTemplate2(skin, templates[i], false, loadModelTemplate);

            for(i = 0, j = views.length; i < j; i++)
                js.push(skin + "/views/" + views[i]);

            for (i = 0, j = css.length; i < j; i++)
                this.skinCSS.push(loadCSS(skinPath + '/css/' + css[i], loadModelCSS));

            for(i = 0, j = models.length; i < j; i++)
                js.push(skin + "/models/" + models[i]);

            for(i = 0, j = cssCore.length; i < j; i++)
                this.skinCSS.push(loadCSS(basePath + '/css/' + cssCore[i], loadModelCSS));

            for (i = 0, j = templatesCore.length; i < j; i++)
                loadTemplate2(null, templatesCore[i], true, loadModelTemplate); // sync load template

            require(js, function() {
                // init Views (#18015)
                var ViewModule = require('factory');
                Array.prototype.forEach.call(arguments, function(module) {
                    if(module instanceof ViewModule) {
                        module.initViews();
                    }
                });

                if (loadModelTemplate && loadModelTemplate.dfd) dependencies.push(loadModelTemplate.dfd);
                if (loadModelCSS && loadModelCSS.dfd) dependencies.push(loadModelCSS.dfd);

                // now App.Data.loadModules doesn't use in app nowhere
                /*
                if (App.Data.loadModules) {
                    dependencies.push(App.Data.loadModules);
                }
                */

                $.when.apply($, dependencies).then(function() {
                    callback();
                });
            });

            function initTheme() {
                var color_scheme = typeof system_settings.color_scheme == 'string' ? system_settings.color_scheme.toLowerCase().replace(/\s/g, '_') : null;
                if(color_schemes.indexOf(color_scheme) > -1) {
                    css.push('themes/' + color_scheme + '/colors');
                } else {
                    App.Data.log.pushJSError('"' + system_settings.color_scheme + '" color scheme is not available', 'js/router/main.js', '151');
                    css.push('themes/default/colors');
                }
                this.prepare.initialized = true;
            }
        },
        pay: function() {
            App.Data.myorder.submit_order_and_pay(App.Data.myorder.checkout.get('payment_type'), undefined, true);
        },
        loadData: function() {
            var load = $.Deferred();

            this.prepare('pay', function() {
                App.Data.loadFromLocalStorage = true;
                App.Data.card = new App.Models.Card({RevelAPI: App.Data.RevelAPI});
                App.Data.card.loadCard();
                if(!App.Data.giftcard) {
                    App.Data.giftcard = new App.Models.GiftCard();
                }
                App.Data.giftcard.loadCard();
                App.Data.stanfordCard && App.Data.stanfordCard.restoreCard();
                this.loadCustomer();
                App.Data.myorder.loadOrders();
                App.Data.establishments && App.Data.establishments.removeSavedEstablishment();
                App.Data.loadFromLocalStorage = false;
                load.resolve();
            });

            return load;
        },
        /**
         * Init App.Data.customer and restore its state from a storage
         */
        loadCustomer: function() {
            App.Data.customer = new App.Models.Customer({RevelAPI: App.Data.RevelAPI});
            App.Data.customer.loadCustomer();
            App.Data.customer.loadAddresses();
        },
        /**
         * Handler of a payment response.
         * Check payment state and redirect to #pay if payment exists
         *
         * @param {function} cb Function callback.
         */
        initPaymentResponseHandler: function(cb) {
            var myorder = App.Data.myorder,
                savedDefaultPaymentState = PaymentProcessor.loadDefaultState(); // must be called forever to clear saved state in storage

            // Bug #25585
            // Restore payment data if it has been lost.
            // extend will take effect only if payment data is stored in the storage and is not presented in get parameters
            // (it happens when user loses connection after return from payment processor, and the app reloads when the connection is restored)
            App.Data.get_parameters = _.extend({}, parse_get_params(), PaymentProcessor.getPaymentData());

            this.listenTo(myorder, 'paymentResponse', function() {
                var is_gift, card = App.Data.card,
                    customer = App.Data.customer,
                    stanfordCard = App.Data.stanfordCard;

                App.Data.settings.usaepayBack = true;

                var status = myorder.paymentResponse.status.toLowerCase();
                switch (status) {
                    case 'ok':
                        PaymentProcessor.completeTransaction();        // complete payment transaction
                        is_gift = myorder.change_only_gift_dining_option();
                        myorder.clearData();
                        card && card.clearData();                      // removal of information about credit card
                        if (!is_gift) {
                            myorder.checkout.revert_dining_option();   //restore dinin_option from selected_dining_option
                        }
                        customer && customer.resetShippingServices();  // clear shipping service selected
                        stanfordCard && stanfordCard.clearData();      // clear Stanford card data
                        break;
                    case 'error':
                        card && card.clearData(); // removal of information about credit card
                        break;
                }

                // call cb
                typeof cb == 'function' && cb(myorder.paymentResponse.capturePhase);
            }, this);

            // Check if app is loaded after payment on external payment page (paypal, usaepay and others).
            // If true change init hash on #pay replacing history entry to immediately handle payment response.
            // If `pay` GET-parameter doesn't exist and `savedDefaultPaymentState` exists change hash on #pay creating new history entry.
            if(App.Data.get_parameters.pay || App.Data.get_parameters[MONERIS_PARAMS.PAY]) {
                // Bug #25585
                if (App.Data.get_parameters.pay == 'true' || App.Data.get_parameters[MONERIS_PARAMS.PAY] == 'true') { // check for real get params, not the extended ones.
                    // We got payment data from payment processor.
                    // Need to save payment data - it will be restored if something goes wrong with transaction processing.
                    PaymentProcessor.setPaymentData();
                }
                window.location.replace('#pay');
            } else if(savedDefaultPaymentState) {
                App.Data.get_parameters.pay = savedDefaultPaymentState;
                window.location.assign('#pay');
            }
        },
        /**
        * Load the page with stores list.
        */
        loadViewEstablishments: function() {
            var ests = App.Data.establishments,
                modelForView = ests.getModelForView(),// get a model for the stores list view
                settings = App.Data.settings,
                cssCore = settings.get('settings_skin').routing.establishments.cssCore;

            if (modelForView.get('isMobileVersion')) {
                cssCore.indexOf('establishments_mobile') && cssCore.push('establishments_mobile');
                (!App.skin) && settings.set('skin', App.Skins.WEBORDER_MOBILE);
            } else {
                (!App.skin) && settings.set('skin', App.Skins.WEBORDER);
            }

            App.Routers.MainRouter.prototype.prepare('establishments', function() {
                var locale = App.Data.locale;
                locale.dfd_load.done(function() {
                    var view = App.Views.GeneratorView.create('CoreEstablishments', {
                        mod: 'Main',
                        className: 'establishments_view',
                        collection: ests,
                        model: modelForView
                    }, 'ContentEstablishmentsCore');
                    Backbone.$('body').append(view.el);
                    Backbone.$(window).trigger('hideSpinner');
                });
            });
        },
        /**
        * Get a stores list.
        */
        getEstablishments: function() {
            var self = this;
            var ests = App.Data.establishments;
            ests.getEstablishments('once').then(function() { // get establishments from backend
                if (ests.length > 1 || (ests.length == 1 &&
                    ests.models[0].get("id") != App.Data.settings.get("establishment"))) {
                    self.getEstablishmentsCallback();
                }
            });
        },
        /**
        * Remove establishment data in case if establishment ID will change.
        */
        resetEstablishmentData: function() {
            this.prepare.initialized = false;
            delete App.Data.router;
            for (var i in App.Data) {
                if (App.Data.stateAppData[i] === undefined) {
                    delete App.Data[i];
                }
            }

            var history = Backbone.history;

            history.stop(); // stop tracking browser history changes

            // reset isMaintenance
            isMaintenance = false;
            App.Data.settings.set('isMaintenance', isMaintenance);

            typeof history.stopStateTracking == 'function' && history.stopStateTracking(); // stop tracking state changes
            this.stopListening(); // stop listening all handlers
            this.removeHTMLandCSS(); // remove css and templates from DOM tree
        },
        removeHTMLandCSS: function() {
            Backbone.$('script[type="text/template"]').remove();
            Array.isArray(this.skinCSS) && this.skinCSS.forEach(function(el) {
                el.remove();
            });
        },
        /**
         * Push data changes to browser history entry.
         * Tracking state data is stored in `stateData` property of history entry's data object.
         * @param {boolean} replaceState - If true, replace the current state, otherwise push a new state.
         * @param {string} [url] - Page url.
         */
        updateState: function(replaceState, url) {
            if(typeof this.updateState.counter == 'undefined') {
                this.updateState.counter = 0;
            }

            var title = App.Data.settings.get("settings_skin").name_app;
            url = url || location.href;

            if(replaceState) {
                window.history.replaceState({stateData: this.getState()}, title, url);
            } else {
                window.history.pushState({stateData: this.getState()}, title, url);
            }
        },
        /**
         * Create and return session history state-object.
         * @return {Object}
         */
        getState: function() {
            return {establishment: App.Data.settings.get('establishment')};
        },
        /*
         * Restore state data from session history entry.
         * Tracking state data is stored in `stateData` property of session history entry's data object.
         * @param {Object} event - PopStateEvent.
         * @return {Object} event.state.stateData object
         */
        restoreState: function(event) {
            var data = event.state instanceof Object ? event.state.stateData : undefined,
                ests = App.Data.establishments;

            // hide establishments view & alert message
            ests && ests.trigger('hideEstsView');
            App.Data.errors.trigger('hideAlertMessage');

            if(data && ests) {
                ests.trigger('changeEstablishment', data.establishment, true); // 3rd parameter is flag of restoring
            }
            return data;
        },
        /**
         * Start tracking of application state changes
         */
        runStateTracking: function() {
            if(!(typeof window.addEventListener == 'function') || !(typeof window.history == 'object') || !(typeof window.history.pushState == 'function')) {
                return;
            }
            var cb = this.restoreState.bind(this),
                ests = App.Data.establishments;
            window.addEventListener('popstate', cb, false);
            Backbone.history.stopStateTracking = window.removeEventListener.bind(window, 'popstate', cb, false);
            if(ests) {
                // Listen to establishment changes to track in session history.
                this.listenTo(ests, 'changeEstablishment', function(id, isRestoring) {
                    if(isRestoring) {
                        return;
                    }
                    // need clear hash when user changes establishment
                    this.updateState(false, location.href.replace(/#.*/, ''));
                }, this);
            }
            return true;
        },
        navigateDirectory: function() {
            if(App.Data.dirMode) {
                var navigateToDirectoryConfirmed = function () {
                    var prefix = App.Data.is_stanford_mode ? ".stanford" : "",
                        directoryState = getData('directory.state' + prefix),
                        directoryHash = '';

                    if (directoryState instanceof Object && directoryState.hash) {
                        directoryHash = directoryState.hash;
                    }

                    return window.location.href = getData('directoryReferrer').referrer + directoryHash;
                };
                if (App.Data.establishments.getModelForView().get('needShowAlert')) { // cart is not empty
                    // use '_DESKTOP' i18n strings because we don't have 'Go to directory' link in weborder_mobile
                    App.Data.errors.alert(MSG.ESTABLISHMENTS_ALERT_MESSAGE_DESKTOP, false, false, { // confirmation popup
                        isConfirm: true,
                        confirm: {
                            ok: MSG.ESTABLISHMENTS_ALERT_PROCEED_BUTTON_DESKTOP,
                            cancel: MSG.ESTABLISHMENTS_ALERT_BACK_BUTTON_DESKTOP,
                            btnsSwap: true
                        },
                        callback: function(result) {
                            if (result) navigateToDirectoryConfirmed();
                        }
                    });
                }
                else {
                    // there is no need to show confirmation popup
                    navigateToDirectoryConfirmed();
                }
            }
        },
        /**
        * User notification.
        */
        alertMessage: function() {
            var errors = App.Data.errors;
            App.Routers.MainRouter.prototype.prepare('errors', function() {
                var view = App.Views.GeneratorView.create('CoreErrors', {
                    mod: 'Main',
                    model: errors
                }, 'ContentErrorsCore'); // generation of view
                Backbone.$('body').append(view.el);
                errors.trigger('showAlertMessage'); // user notification
            });
        },
        /**
         * This method is invoked before app close
         */
        beforeUnloadApp: function() {
            // any code may be written here
        },
        /**
         * Returns unique id of app defined as '<hostname>.<skin>.<establishment>'
         */
        getUID: function() {
            var settings = App.Data.settings.toJSON();
            return [settings.hostname, settings.skin, settings.establishment].join('.');
        },
        loadGoogleMaps: function() {
            var dfd = Backbone.$.Deferred();
            require(['async!https://maps.google.com/maps/api/js?v=3&sensor=false&libraries=places!callback'], function() {
                dfd.resolve();
                new google.maps.InfoWindow({ content: "Test" }); //force this to load infowindow.js
            }, function (err) {
                App.Data.errors.alert(MSG.ERROR_CAN_NOT_LOAD_THE_GOOGLE_MAPS_SERVICE, true); // user notification
            });
            return dfd;
        }
    });

    App.Routers.MobileRouter = App.Routers.MainRouter.extend({
        change_page: function() {
            App.Routers.MainRouter.prototype.change_page.apply(this, arguments);
            if (cssua.ua.revelsystemswebview && cssua.ua.ios) {
                $("body")[0].scrollIntoView(); //workaround for #18586, #18130
            }
            if (App.Data.map && location.hash.slice(1) == 'map') { // #19928 to resize the Google Maps
                App.Data.map.trigger("change_page");
            }
        },
        profile: function(step, header, footer) {
            step = step <= 2 && step >= 0 ? Math.ceil(step) : 0;

            var RevelAPI = App.Data.RevelAPI,
                next = this.navigate.bind(this, 'profile/' + (step + 1), true),
                prev = this.navigate.bind(this, 'profile/' + (step - 1), true),
                save = RevelAPI.trigger.bind(RevelAPI, 'onProfileSaved'),
                views;

            views = [{
                footer: {
                    next: RevelAPI.processPersonalInfo.bind(RevelAPI, function() {
                        if(RevelAPI.get('profileExists')) {
                            RevelAPI.getProfile(next);
                        } else {
                            next();
                        }
                    }),
                    prev: null,
                    save: null},
                content: {mod: 'ProfilePersonal', cacheId: 'ProfilePersonal', rewardsCard: App.Data.myorder.rewardsCard}
            }, {
                footer: {next: RevelAPI.processPaymentInfo.bind(RevelAPI, next, creditCardValidationAlert), prev: prev, save: null},
                content: {mod: 'ProfilePayment', cacheId: 'ProfilePayment'}
            }, {
                footer: {
                    next: null,
                    prev: function() {
                        if(RevelAPI.get('profileExists')) {
                            RevelAPI.getProfile(prev);
                        } else {
                            prev();
                        }
                    },
                    save: RevelAPI.saveProfile.bind(RevelAPI, save)
                },
                content: {mod: 'ProfileSecurity', cacheId: 'ProfileSecurity'}
            }];

            this.prepare('profile', function() {
                var view = views[step];

                App.Data.header.set('page_title', 'Profile');
                App.Data.footer.set(view.footer);
                App.Data.mainModel.set({
                    header: header,
                    footer: footer,
                    content: _.extend({modelName: 'Revel', className: 'revel-profile', model: RevelAPI}, view.content)
                });

                this.change_page();
            });

            function creditCardValidationAlert(result) {
                App.Data.errors.alert(result.errorMsg); // user notification
            }
        },
        loyalty: function(header, footer) {
            this.prepare('loyalty', function() {
                var RevelAPI = App.Data.RevelAPI;

                App.Data.header.set('page_title', 'Loyalty');
                App.Data.mainModel.set({
                    header: header,
                    footer: footer,
                    content: {
                        modelName: 'Revel',
                        className: 'revel-loyalty',
                        model: RevelAPI,
                        mod: 'Loyalty',
                        cache_id: 'Loyalty'
                    }
                });

                this.change_page();
            });
        },
        initRevelAPI: function() {
            App.Data.RevelAPI = new App.Models.RevelAPI();

            // temporary App.Data.RevelAPI functionality is disabled
            return;

            var RevelAPI = App.Data.RevelAPI,
                mainModel = App.Data.mainModel,
                checkout = App.Data.myorder.checkout,
                rewardsCard = App.Data.myorder.rewardsCard,
                profileCustomer = RevelAPI.get('customer'),
                profileCancelCallback,
                profileSaveCallback;

            if(!RevelAPI.isAvailable()) {
                return;
            }

            this.once('started', function() {
                // If rewardsCard is not set yet need set its value from profile.
                // Reward card may be set by this moment after checkout restoring from localStorage.
                !rewardsCard.get('number') && updateReward();
                RevelAPI.run(); // controls of Welcome screen
            });

            this.listenTo(RevelAPI, 'onWelcomeShow', function() {
                mainModel.trigger('showRevelPopup', {
                    modelName: 'Revel',
                    mod: 'Welcome',
                    model: RevelAPI,
                    cacheId: 'RevelWelcomeView'
                });
            }, this);

            this.listenTo(RevelAPI, 'onWelcomeReviewed', function() {
                mainModel.trigger('hideRevelPopup', RevelAPI);
                RevelAPI.set('firstTime', false);
            }, this);


            this.listenTo(RevelAPI, 'onAuthenticate', function() {
                mainModel.trigger('showRevelPopup', {
                    modelName: 'Revel',
                    mod: 'Authentication',
                    model: RevelAPI,
                    cacheId: 'Authentication'
                });
            }, this);

            this.listenTo(RevelAPI, 'onProfileCreate', function() {
                mainModel.trigger('showRevelPopup', {
                    modelName: 'Revel',
                    mod: 'ProfileNotification',
                    model: RevelAPI,
                    cacheId: 'ProfileNotification'
                });
            }, this);

            this.listenTo(RevelAPI, 'onCreditCardNotificationShow', function() {
                mainModel.trigger('showRevelPopup', {
                    modelName: 'Revel',
                    mod: 'CreditCard',
                    model: RevelAPI,
                    cacheId: 'RevelCreditCard'
                });
            }, this);

            this.listenTo(RevelAPI, 'onProfileShow', function() {
                profileCancelCallback = this.navigate.bind(this, Backbone.history.fragment, true);
                this.navigate('profile', true);
                mainModel.trigger('hideRevelPopup', RevelAPI);
            }, this);

            this.listenTo(RevelAPI, 'onProfileCancel', function() {
                typeof profileCancelCallback == 'function' && profileCancelCallback();
                profileCancelCallback = undefined;
                profileSaveCallback = undefined;
                RevelAPI.unset('forceCreditCard');
                mainModel.trigger('hideRevelPopup', RevelAPI);
            }, this);

            this.listenTo(RevelAPI, 'onAuthenticationCancel', function() {
                RevelAPI.unset('forceCreditCard');
                mainModel.trigger('hideRevelPopup', RevelAPI);
            }, this);

            this.listenTo(RevelAPI, 'onProfileSaved', function() {
                typeof profileSaveCallback == 'function' && profileSaveCallback();
                profileCancelCallback = undefined;
                profileSaveCallback = undefined;
                RevelAPI.unset('forceCreditCard');
            }, this);

            this.listenTo(this, 'navigateToLoyalty', function() {
                profileSaveCallback = this.navigate.bind(this, 'loyalty', true);
                RevelAPI.checkProfile(profileSaveCallback);
            }, this);

            this.listenTo(this, 'navigateToProfile', function() {
                profileSaveCallback = this.navigate.bind(this, Backbone.history.fragment, true);
                RevelAPI.checkProfile(RevelAPI.trigger.bind(RevelAPI, 'onProfileShow'));
            }, this);

            App.Data.header && this.listenTo(App.Data.header, 'onProfileCancel', function() {
                RevelAPI.trigger('onProfileCancel');
            });

            this.listenTo(RevelAPI, 'onAuthenticated', function() {
                mainModel.trigger('hideRevelPopup', RevelAPI);
            });

            // bind phone changes in profile with reward card in checkout
            checkout.listenTo(profileCustomer, 'change:phone', function() {
                !rewardsCard.get('number') && RevelAPI.get('profileExists') && updateReward();
            });

            // if user saves profile reward card should be overriden excepting use case when profile is updated during payment with credit card
            this.listenTo(RevelAPI, 'startListeningToCustomer', checkout.listenTo.bind(checkout, RevelAPI, 'onProfileSaved', updateReward));
            this.listenTo(RevelAPI, 'stopListeningToCustomer', checkout.stopListening.bind(checkout, RevelAPI));
            RevelAPI.trigger('startListeningToCustomer');

            this.listenTo(RevelAPI, 'onUseSavedCreditCard', function() {
                var self = this,
                    success = RevelAPI.saveProfile.bind(RevelAPI, RevelAPI.trigger.bind(RevelAPI, 'onPayWithSavedCreditCard')),
                    fail = function() {
                        self.navigate('profile/1', true);
                        RevelAPI.processPaymentInfo(null, function(result) {
                            App.Data.errors.alert(result.errorMsg); // user notification
                        });
                    };

                profileSaveCallback = RevelAPI.trigger.bind(RevelAPI, 'onPayWithSavedCreditCard');
                profileCancelCallback = this.navigate.bind(this, Backbone.history.fragment, true);
                mainModel.trigger('hideRevelPopup', RevelAPI);

                RevelAPI.set('forceCreditCard', true);
                RevelAPI.set('useAsDefaultCard', true); // need for case when profile doesn't exist
                RevelAPI.checkProfile(RevelAPI.getProfile.bind(RevelAPI, function() {
                    RevelAPI.set('useAsDefaultCard', true); // need for case when profile exists and credit card is invalid
                    RevelAPI.processPaymentInfo(success, fail);
                }));
            }, this);

            this.listenTo(RevelAPI, 'onPayWithSavedCreditCard', function() {
                RevelAPI.set('useAsDefaultCardSession', true);
                RevelAPI.unset('forceCreditCard');
            }, this);

            this.listenTo(RevelAPI, 'onPayWithCustomCreditCard', function() {
                RevelAPI.set('useAsDefaultCardSession', false);
                mainModel.trigger('hideRevelPopup', RevelAPI);
            }, this);

            function updateReward() {
                var phone = profileCustomer.get('phone'),
                    onlyDigits = phone && phone.match(/\d+/); // parse only digits (number may be +19491112233)
                Array.isArray(onlyDigits) && onlyDigits[0] && rewardsCard.set('number', onlyDigits[0]);
            }
        }
    });

    /**
     * App.Routers.RevelOrderingRouter class
     * Extend App.Routers.MobileRouter
     * Implement functionality of order placing for all payment processors supported by Revel.
     *
     * This is parent router for Weborder, Weborder Mobile, Retail apps.
     */
    App.Routers.RevelOrderingRouter = App.Routers.MobileRouter.extend({
        triggerInitializedEvent: function() {
            var myorder = App.Data.myorder;

            // Restore App.Data.myorder.paymentResponse if exists in session storage.
            myorder.restorePaymentResponse(this.getUID());

            // init payment response handler,
            // set navigation to #confirm as callback parameter
            this.initPaymentResponseHandler(this.onPayHandler.bind(this));

            // If a payment transaction is in process need to save any changes of cart to a session storage.
            // If user clears the cart the payment transaction record should be removed.
            // Bug #21653
            this.listenTo(myorder, 'remove change add', function() {
                if(!PaymentProcessor.isTransactionInProcess()) {
                    return;
                }
                if(!myorder.get_only_product_quantity()) {
                    PaymentProcessor.completeTransaction();
                } else {
                    myorder.saveOrders();
                }
            });

            // If payment transaction is in process need restore models at first.
            if(PaymentProcessor.isTransactionInProcess()) {
                this.loadData().then(fireInitializedEvent.bind(this));
            } else {
                fireInitializedEvent.call(this);
            }

            function fireInitializedEvent() {
                // emit 'initialized' event
                this.trigger('initialized');
                this.initialized = true;
            }
        },
        onPayHandler: function(capturePhase) {
            this.navigate('confirm',  {
                trigger: true,
                replace: capturePhase
            });
        },
        /**
         * Implement removing of payment transaction record in a session storage
         * when user changes establishment.
         */
        resetEstablishmentData: function() {
            PaymentProcessor.completeTransaction();
            return App.Routers.MobileRouter.prototype.resetEstablishmentData.apply(this, arguments);
        },
        /**
         * Save paymentResponse before app close.
         *
         * Use case:
         * 1) User has made payment via Credit Card (usaepay) and #confirm screen displays now.
         * 2) Click on 'Back' button in browser toolbar (history.back()).
         * 3) Now #checkout screen displays and app has reinitialized because CC payment uses redirection on 3rd party site.
         * 4) Click on 'Forward' button in browser toolbar (history.forward())
         * 5) Now #confirm screen displays and app has reinitialized again. App.Data.myorder.paymentResponse is null after app init.
         *    Need restore it from sessionStorage to correctly display payment information.
         *    To be able to do it need save App.Data.myorder.paymentResponse in sessionStorage before app unloading.
         */
        beforeUnloadApp: function() {
            App.Data.myorder.savePaymentResponse(this.getUID());
            App.Routers.MobileRouter.prototype.beforeUnloadApp.apply(this, arguments);
        }
    });


    /**
     * Router Module class
     */
    function RouterModule() {
        this.args = arguments;
    }

    RouterModule.prototype.initRouter = function() {
        Array.prototype.forEach.call(this.args, function(cb) {
            typeof cb == 'function' && cb();
        });
    };

    return RouterModule;
});
