if (!nabu) { var nabu = {}; }
if (!nabu.utils) { nabu.utils = {}; }
if (!nabu.utils.vue) { nabu.utils.vue = {}; }

// Parameters are:
// - target: a element, a vue component or the id of an element (required)
// - content: the component to add, this can be string (set as innerhtml), a vue component that is mounted or a simple element
// - prepare: a handler that receives the element where the content will be added
// - ready: a function called when it was successfully added
// - append: if set to true, it doesn't clear the content
nabu.utils.vue.render = function(parameters) {
	var anchor = typeof(parameters.target) === "object" ? parameters.target : document.getElementById(parameters.target);
	if (!anchor && parameters.target == "body") {
		anchor = document.body;
	}
	if (!anchor) {
		throw "Target not found: " + parameters.target + " in: " + document.body.innerHTML;
	}
	var element = anchor.$el ? anchor.$el : anchor;
	if (!parameters.append) {
		var destroy = function(element) {
			for (var i = 0; i < element.childNodes.length; i++) {
				// first recursively destroy any vms that might exist
				if (element.childNodes[i].nodeType == 1) {
					destroy(element.childNodes[i]);
				}
			}
			// then destroy the vm itself (if there is one)
			if (element.__vue__ && element.__vue__.$destroy) {
				element.__vue__.$destroy();
			}
		}
		destroy(element);
	}
	var component = parameters.content;
	// if we have a return value, we need to add it to the anchor
	if (component) {
		if (component instanceof Function) {
			component = component(element);
		}
		// if you return a string, we assume it is a template id
		if (typeof component == "string" && component.substring(0, 1) == "#") {
			var extended = Vue.extend({
				template: component
			});
			component = new extended({ data: parameters });
		}
		// a function to complete the appending of the component to the anchor
		var complete = function(resolvedContent) {
			// call the activated hook before we start mounting
			if (component.$options.activated) {
				var activated = component.$options.activated instanceof Array ? component.$options.activated : [component.$options.activated];
				for (var i = 0; i < activated.length; i++) {
					activated[i].call(component);
				}
			}
			if (component.$mount) {
				if (!component.$parent) {
					var possible = element;
					while (possible && !possible.__vue__) {
						possible = possible.parentNode;
					}
					if (possible && possible.__vue__) {
						component.$parent = possible.__vue__;
						component.$root = component.$parent.$root ? component.$parent.$root : component.$parent;
					}
				}
			}
			// unless we explicitly want to append content, wipe the current content
			if (!parameters.append) {
				if (anchor.clear) {
					anchor.clear();
				}
				else if (element) {
					nabu.utils.elements.clear(element);
				}
			}
			var mounted = null;
			if (!component.$el) {
				mounted = component.$mount();
			}
			else {
				component.$remove();
				mounted = component;
			}

			if (resolvedContent) {
				component = resolvedContent;
			}
			if (parameters.prepare) {
				parameters.prepare(element, component);
			}
			// it's a vue component
			if (component.$appendTo) {
				component.$appendTo(element);
			}
			else if (typeof(component) === "string") {
				element.innerHTML += component;
			}
			// we assume it's a html element
			else {
				element.appendChild(component);
			}
			if (component.$options && component.$options.template) {
				if (component.$options.template.substring(0, 1) == "#") {
					var id = component.$options.template.substring(1);
					element.setAttribute("template", id);
					var template = document.getElementById(id);
					for (var i = 0; i < template.attributes.length; i++) {
						if (template.attributes[i].name != "id" && template.attributes[i].value != "x/templates") {
							element.setAttribute(template.attributes[i].name, template.attributes[i].value);
						}
					}
				}
			}
			if (parameters.ready) {
				parameters.ready(component);
			}
		};
		// it's a vue component
		if (component.$mount) {
			if (parameters.activate) {
				parameters.activate(component);
			}
			// if we have an activate method, call it, it can perform asynchronous actions
			if (component && component.$options && (component.$options.activate || component.$options.initialize)) {
				// if we are going to do asynchronous stuff, have the option for a loader
				if (parameters.loader) {
					parameters.loader(element);
				}
				var promises = [];
				var process = function(method, promises) {
					var promise = new nabu.utils.promise();
					promises.push(promise);
					var done = function(result) {
						promise.resolve(result);
					};
					method.call(component, done);
				}
				if (component.$options.initialize instanceof Array) {
					for (var i = 0; i < component.$options.initialize.length; i++) {
						process(component.$options.initialize[i], promises);
					}
				}
				else if (component.$options.initialize) {
					process(component.$options.initialize, promises);
				}
				// we wait for all initialization to be done before the activate kicks in
				new nabu.utils.promises(promises).then(function() {
					promises = [];
					if (component.$options.activate instanceof Array) {
						for (var i = 0; i < component.$options.activate.length; i++) {
							process(component.$options.activate[i], promises);
						}
					}
					else if (component.$options.activate) {
						process(component.$options.activate, promises);
					}
					new nabu.utils.promises(promises).then(function(x) {
						complete();
					});
				});
			}
			else {
				complete();
			}
		}
		// for HTML components we simply stop
		else {
			// it's a promise
			if (component.success) {
				component.success(function(result) {
					complete(result.responseText);
				});
			}
			else {
				complete();
			}
		}
	}
	return component;
}
Vue.mixin({
	computed: {
		$render: function() { return nabu.utils.vue.render }
	}
});