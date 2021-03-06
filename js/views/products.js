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

define(["backbone", "factory", "generator", "list"], function(Backbone) {
    'use strict';

    App.Views.CoreProductView = {};

    App.Views.CoreProductView.CoreProductListItemView = App.Views.ItemView.extend({
        name: 'product',
        mod: 'list_item',
        initialize: function() {
            App.Views.ItemView.prototype.initialize.apply(this, arguments);
            this.listenTo(this.model, 'change:active', this.show_hide);
            this.show_hide();
        },
        render: function() {
            var model = this.model.toJSON();
            model.hide_images = App.Data.settings.get('settings_system').hide_images;
            model.currency_symbol = App.Data.settings.get('settings_system').currency_symbol;
            model.price = round_monetary_currency(model.price);
            model.price_length = model.price.length + model.currency_symbol.length;
            model.show_product_description = !App.Data.settings.get('settings_system').hide_products_description;
            model.uom = App.Data.settings.get("settings_system").scales.default_weighing_unit;
            model.isDefaultImage = model.image == App.Data.settings.get_img_default();
            this.$el.html(this.template(model));
            this.afterRender.call(this, model.sort);
            return this;
        },
        events: {
            "click": "showModifiers"
        },
        showModifiers: function(e) {
            e.preventDefault();
            var id_category = this.model.get('id_category'),
                id = this.model.get('id');
            App.Data.router.navigate("modifiers/" + id_category + "/" + id, true);
        },
        show_hide: function() {
            if (!this.model.get('active')) {
                this.$el.addClass('hide');
            } else {
                this.$el.removeClass('hide');
            }
        }
    });

    App.Views.CoreProductView.CoreProductListView = App.Views.ListView.extend({
        name: 'product',
        mod: 'list',
        initialize: function() {
            App.Views.ListView.prototype.initialize.apply(this, arguments);
            this.listenTo(this.collection, 'add', this.addItem, this);
        },
        render: function() {
            var self = this;
            App.Views.ListView.prototype.render.apply(this, arguments);
            this.collection.each( function(item) {
                self.addItem(item);
            });
            if (!this.collection.length) {
                var view = App.Views.GeneratorView.create('Product', {
                    el: $('<li class="product list-none"></li>'),
                    mod: 'ListNone'
                });
                this.$('.products').append(view.el);
                this.subViews.push(view);
            }
            return this;
        },
        addItem: function(model) {
            if (model.get("attribute_type") == 2) { // to hide child products
                return;
            }
            var settings = App.Data.settings.get('settings_system'),
                noImg = settings.hide_images,
                noDesc = settings.hide_products_description,
                view;
            view = App.Views.GeneratorView.create('Product', {
                el: $('<li class="product"></li>'),
                mod: 'ListItem',
                model: model
            }, 'product_' + model.cid);
            noDesc && view.$el.addClass('short');
            noImg && view.$el.addClass('no-image');
            App.Views.ListView.prototype.addItem.call(this, view, this.$('.products'), model.escape('sort'));
            this.subViews.push(view);
            $(window).resize();
        }
    });

    App.Views.CoreProductView.CoreProductModifiersView = App.Views.FactoryView.extend({
        name: 'product',
        mod: 'modifiers',
        initialize: function() {
            this.product = this.model.get_product();
            this.extendBindingSources({_product: this.product});
            this.modifiers = this.model.get_modifiers();
            this.giftCardPriceRegStr = '^\\d{0,3}(\\.\\d{0,2})?$';
            App.Views.FactoryView.prototype.initialize.apply(this, arguments);
            this.listenTo(this.model, 'change:initial_price', this.update_price, this);
        },
        bindings: {
            '.size_chart_wrapper': 'toggle: _product_size_chart',
            'a.size_chart': 'attr:{href: _product_size_chart}'
        },
        events: {
            'change .gift_card_number': 'gift_change',
            'change .gift_card_price': 'gift_price_change'
        },
        render: function() {
            var model = this.product.toJSON(),
                settings = App.Data.settings;

            model.hide_images = settings.get('settings_system').hide_images;
            model.currency_symbol = settings.get('settings_system').currency_symbol;
            model.price = round_monetary_currency(this.model.get('initial_price'));
            model.price_length = model.price.length;
            model.not_size = this.modifiers && this.modifiers.getSizeModel() === undefined;
            model.uom = App.Data.settings.get("settings_system").scales.default_weighing_unit;
            model.images = Array.isArray(model.images) ? model.images : [];

            if (App.skin == App.Skins.RETAIL && model.images[0] == settings.get_img_default()) {
                model.images[0] = settings.get_img_default(2); //to load noneMatrix.png
            }

            this.gift_price = model.is_gift && model.not_size;

            this.$el.html(this.template(model));

            if (model.is_gift) {
                inputTypeMask(this.$('.gift_card_number'), /^(\d|-){0,255}$/, '', 'numeric');
            }
            if (this.gift_price) {
                inputTypeMask(this.$('.gift_card_price'), new RegExp(this.giftCardPriceRegStr), '', 'float');
            }

            if (App.skin == App.Skins.RETAIL)
                this.$('.img').attr('data-default-index', 2);
            this.loadImage(this.$('.img'));

            return this;
        },
        loadImage: function($el) {
            loadSpinner($el);
        },
        gift_change: function(e) {
            this.product.set('gift_card_number', e.currentTarget.value);
        },
        gift_price_change: function(e) {
            var newPrice = e.currentTarget.value,
                formatPrice = parseFloat(newPrice),
                pattern = new RegExp(this.giftCardPriceRegStr.replace(/(.*)0(.*)0(.*)/, '$11$22$3').replace(/[\(\)\?]/g, ''));

            if(!isNaN(formatPrice)) {
                this.model.set('initial_price', formatPrice);
                this.product.set('price', formatPrice);
            }

            // If input field value does not match "XX.XX" need format it.
            // Also need restore previos (or 0.00 if it was unset) value if new value is '.'.
            if(!pattern.test(newPrice)) {
                e.currentTarget.value = round_monetary_currency(this.model.get('initial_price'));
            }
        },
        update_price: function() {
            var dt = this.$('dt'),
                initial_price = round_monetary_currency(this.model.get('initial_price'));

            if (dt.length) {
                dt.prop('className', dt.prop('className').replace(/(\s+)?s\d+(?=\s|$)/, ''));
                dt.addClass('s' + initial_price.length);
            }

            if (this.gift_price) {
                this.$('.price').val(initial_price);
            } else {
                this.$('.price').text(initial_price);
            }
        }
    });

    App.Views.CoreProductView.CoreProductListNoneView = App.Views.ItemView.extend({
        name: 'product',
        mod: 'list_none'
    });

    return new (require('factory'))(function() {
        App.Views.ProductView = {};
        App.Views.ProductView.ProductListItemView = App.Views.CoreProductView.CoreProductListItemView;
        App.Views.ProductView.ProductListView = App.Views.CoreProductView.CoreProductListView;
        App.Views.ProductView.ProductModifiersView = App.Views.CoreProductView.CoreProductModifiersView;
        App.Views.ProductView.ProductListNoneView = App.Views.CoreProductView.CoreProductListNoneView;
    });
});