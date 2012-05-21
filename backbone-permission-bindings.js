(function(_, Backbone) {
    var permissionSplitter = /^(\S+)\s*(.*)$/;

    _.extend(Backbone.View.prototype, {
        bindModel: function(permissions, model) {

            // TOOO: first way?
            // Permissions can be defined three different ways. It can be
            // defined on the view as an object or function under the key
            // 'permissions', or as an object passed to bindModel.
            permissions = permissions || getValue(this, 'permissions');

            // Skip if no permissions can be found or if the view has no permission model.
            var permissionsModel = model ? model : this.permissionModel;
            if (!permissions || !permissionsModel)
                return;

            // Create the private permissions map if it doesn't exist.
            this._permissions = this._permissions || {};

            // Clear any previous permissions for view.
            this.unbindModel();

            _.each(permissions, function(attribute, permission) {
                if (!_.isArray(attribute))
                    attribute = [attribute, [null, null]];

                if (!_.isArray(attribute[1]))
                    attribute[1] = [attribute[1], null];

                // A permission can be bound to multiple attributes since it is uni-directional
                // if (this._permissions[permission])
                    // throw new Error("'" + permission + "' is already bound to '" + attribute[0] + "'.");

                // Split permissions just like Backbone.View.events where the first half
                // is the property you want to bind to and the remainder is the selector
                // for the element in the view that property is for.
                var match = permission.match(permissionSplitter),
                    property = match[1],
                    selector = match[2],
                    // Find element in view for permission. If there is no selector
                    // use the view's el.
                    el = (selector) ? this.$(selector) : this.$el,
                    // Finder binder definition for permission by property. If it can't be found
                    // default to property 'attr'.
                    binder = Backbone.View.Binders[property] || Backbone.View.Binders['__attr__'],
                    // Fetch accessors from binder. The context of the binder is the view
                    // and binder should return an object that has 'set' and or 'get' keys.
                    // 'set' must be a function and has one argument. `get` can either be
                    // a function or a list [events, function] .The context of both set and
                    // get is the views's $el.
                    accessors = binder.call(this, permissionsModel, attribute[0], property);

                if (!accessors)
                    return;

                if (!accessors.set)
                    return;

                // Event key for model attribute changes.
                var setTrigger = 'change:' + attribute[0];

                // Default to identity transformer if not provided for attribute.
                var setTransformer = attribute[1][0] || identityTransformer;

                // Create set callback so that we can reference the functions
                // when it's time to unbind. 'set' for permission to the model events...
                var set = _.bind(function(model, value, options) {

                    // Set the property value for the binder's element.
                    accessors.set.call(el, setTransformer.call(this, value));
                }, this);

                if (accessors.set) {
                    permissionsModel.on(setTrigger, set);
                    // TODO: Is this neccessary?
                    // Trigger the initial set callback manually so that the view is up
                    // to date with the model bound to it.
                    // set(permissionsModel, permissionsModel.get(attribute[0]));
                }

                // Save a reference to permission so that we can unbind it later.
                this._permissions[permission] = {
                    setTrigger: setTrigger,
                    set: set
                };
            }, this);

            return this;
        },
        unbindModel: function() {
            // Skip if view has been bound or doesn't have a model.
            var permissionsModel = model ? model : this.permissionModel;
            if (!this._permissions || !permissionsModel)
                return;

            _.each(this._permissions, function(permission) {
                if (permission.set)
                    permissionsModel.off(permission.setTrigger, permission.set);

                delete this._permissions[permission];
            }, this);

            return this;
        }
    });

    Backbone.View.Binders = {
        'value': function(model, attribute, property) {
            return {
                set: function(value) {
                    this.val(value);
                }
            };
        },
        'text': function(model, attribute, property) {
            return {
                set: function(value) {
                    this.text(value);
                }
            };
        },
        'html': function(model, attribute, property) {
            return {
                set: function(value) {
                    this.html(value);
                }
            };
        },
        'class': function(model, attribute, property) {
            return {
                set: function(value) {
                    if (this._previousClass)
                        this.removeClass(this._previousClass);

                    this.addClass(value);
                    this._previousClass = value;
                }
            };
        },
        'checked': function(model, attribute, property) {
            return {
                set: function(value) {
                    this.prop('checked', !!value);
                }
            };
        },
        '__attr__': function(model, attribute, property) {
            return {
                set: function(value) {
                    this.attr(property, value);
                }
            };
        }
    };

    var identityTransformer = function(value) {
        return value;
    };

    // Helper function from Backbone to get a value from a Backbone
    // object as a property or as a function.
    var getValue = function(object, prop) {
        if ((object && object[prop]))
            return _.isFunction(object[prop]) ? object[prop]() : object[prop];
    };
})(window._, window.Backbone);

