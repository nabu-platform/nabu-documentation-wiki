var vi = function(element) {
	if (typeof(element) == "string") {
		element = document.querySelector(element);
	}
	while (element && !element.__vue__) {
		element = element.parentNode;
	}
	return element ? element.__vue__ : null;
}

Vue.config.optionMergeStrategies.activate = function (toVal, fromVal) {
	var result = [];
	if (fromVal instanceof Array) {
		nabu.utils.arrays.merge(result, fromVal);
	}
	else if (fromVal) {
		result.push(fromVal);
	}
	if (toVal instanceof Array) {
		nabu.utils.arrays.merge(result, toVal);
	}
	else if (toVal) {
		result.push(toVal);
	}
	return result;
}

Vue.config.optionMergeStrategies.activated = Vue.config.optionMergeStrategies.activate;
Vue.config.optionMergeStrategies.clear = Vue.config.optionMergeStrategies.activate;
Vue.config.optionMergeStrategies.services = Vue.config.optionMergeStrategies.activate;
Vue.config.optionMergeStrategies.asyncWatch = Vue.config.optionMergeStrategies.watch;
Vue.config.optionMergeStrategies.asyncComputed = Vue.config.optionMergeStrategies.computed;

Vue.mixin({
	// the activate() routine is done by the time we are mounted
	// start computed and watchers that depend on that now
	activated: function() {
		if (this.$options.asyncComputed) {
			var computed = this.$options.asyncComputed instanceof Array ? this.$options.asyncComputed : [this.$options.asyncComputed]; 		
			for (var i = 0; i < computed.length; i++) {
				Vue.util.initComputed(this, computed[i]);
			}
		}
		if (this.$options.asyncWatch) {
			Vue.util.initWatch(this, this.$options.asyncWatch);
		}
	},
	/*
	uncomment for debugging
	updated: function() {
		console.log("updated", this.$options.template);	
	},
	*/
	methods: {
		// re-add the $appendTo, the router depends on it
		$appendTo: function(element) {
			element.appendChild(this.$el);
		},
		$dispatch: function(event) {
			var args = [];
			for (var i = 1; i < arguments.length; i++) {
				args.push(arguments[i]);
			}
			var call = function(context) {
				if (context && context.$options && context.$options.events) {
					var names = Object.keys(context.$options.events);
					for (var i = 0; i < names.length; i++) {
						if (event == names[i]) {
							var result = context.$options.events[names[i]].apply(context, args);
							// if the method returns "true", we need to keep going deeper
							if (result !== true) {
								return true;
							}
							break;
						}
					}
					if (context.$parent) {
						call(context.$parent);
					}
				}
				return false;
			}
			call(this);
		},
		$remove: function() {
			if (this.$el && this.$el.parentNode) {
				this.$el.parentNode.removeChild(this.$el);
			}
		},
		$redirect: function(url) {
			window.location = url;
		}
	},
	// re-add the ready lifecycle state
	mounted: function() {
		if (this.$options.ready) {
			var self = this;
			this.$nextTick(function () {
				if (self.$options.ready instanceof Array) {
					for (var i = 0; i < self.$options.ready.length; i++) {
						self.$options.ready[i].call(self);
					}
				}
				else {
					self.$options.ready.call(self);
				}
			});
		}
	},
	// $children and $refs are no longer reactive
	// need a way in the parent to know when a child has been added (e.g. for label calculation in forms)
	ready: function() {
		if (this.$parent) {
			this.$parent.$emit("$vue.child.added", this);
		}
	},
	computed: {
		$window: function() { return window },
		$document: function() { return document },
		$self: function() { return this }
	}
});

Vue.views = {};
Vue.services = {};
Vue.view = function(name, component) {
	if (component) {
		// assume template id matches
		if (component.template == null) {
			component.template = "#" + name;
		}
		Vue.views[name] = {
			original: component,
			component: Vue.extend(component)
		};
		
	}
	return Vue.views[name].component;
};
Vue.service = function(name, component, parameters) {
	if (component) {
		Vue.services[name] = nabu.services.VueService(Vue.extend(component, parameters));
	}
	return Vue.services[name];
};

window.addEventListener("load", function () {
	application.bootstrap(function($services) {
		Object.keys(Vue.views).map(function(name) {
			var component = Vue.views[name].original;
			var route = { 
				alias: name,
				category: component.category,
				description: component.description,
				name: component.name,
				icon: component.icon,
				accept: component.accept,
				// we call it "init" because "initialize" is already taken in vue...
				initialize: component.init,
				enter: function(properties) {
					var component = Vue.view(name);
					return new component({propsData: properties});
				},
				query: []
			};
			if (component.url) {
				route.url = component.url;
			}
			if (component.props) {
				Object.keys(component.props).map(function(key) {
					// if it does not exist in the url, assume query parameter
					if (!route.url || route.url.indexOf("{" + key + "}") < 0) {
						route.query.push(key);
					}
				});
			}
			$services.router.register(route);
		});
		return $services.$register(Vue.services);
	});
});

Vue.component("n-view", {
	template: "<div v-route-render='{alias: alias, parameters: $attrs, mounted: register }'></div>",
	props: {
		alias: {
			type: String,
			required: true
		}
	},
	methods: {
		register: function(component) {
			if (this.$listeners) {
				var self = this;
				Object.keys(this.$listeners).forEach(function(event) {
					component.$on(event, self.$listeners[event]);
				})
			}
		}
	}
});
