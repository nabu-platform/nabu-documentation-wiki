if (!nabu) { var nabu = {} }
if (!nabu.page) { nabu.page = {} }
if (!nabu.page.views) { nabu.page.views = {} }
if (!nabu.page.mixins) { nabu.page.mixins = {} }

// on created, we want to inject the state of the page into this component so we can access all the data
Vue.mixin({
	props: {
		localState: {
			type: Object,
			required: false
		},
		pageInstanceId: {
			type: Number,
			required: false
		}
	},
	data: function() {
		return {
			state: {},
			runtimeId: null
		}
	},
	// not ideal, can it be replaced everywhere liwith $services.page.getBindingValue() ?
	beforeMount: function() {
		var self = this;
		// map any local state

		if (this.localState) {
			Object.keys(this.localState).map(function(key) {
				Vue.set(self.state, key, self.localState[key]);
			});
		}
		if (this.page) {
			var pageInstance = self.$services.page.getPageInstance(self.page, self);
			// when creating the actual page, we do not have an instance yet!
			// nor is it important...
			if (pageInstance) {
				Object.keys(pageInstance.variables).map(function(key) {
					if (typeof(self.state[key]) == "undefined") {
						Vue.set(self.state, key, pageInstance.variables[key]);
					}
				})
				var page = this.$services.page.getPageParameterValues(this.page, pageInstance);
				if (Object.keys(page).length) {
					Vue.set(self.state, "page", page);
				}
			}
			var application = {};
			if (this.$services.page.title) {
				application.title = this.$services.page.title;
			}
			this.$services.page.properties.map(function(x) {
				if (x) {
					application[x.key] = x.value;
				}
			});
			Vue.set(self.state, "application", application);
		}
	},
	computed: {
		$self: function() {
			return this;
		}	
	},
	methods: {
		// recalculate events on the page instance (if applicable)
		$updateEvents: function() {
			if (this.page) {
				var pageInstance = this.$services.page.getPageInstance(this.page, this);
				if (pageInstance) {
					pageInstance.resetEvents();
				}
			}
		},
		$value: function(path, literal) {
			if (!literal) {
				literal = application && application.configuration && 
					(application.configuration.interpretValues == null || application.configuration.interpretValues == false);
			}
			var result = null;
			if (this.page) {
				var pageInstance = this.$services.page.getPageInstance(this.page, this);
				result = this.$services.page.getBindingValue(pageInstance, path);
			}
			else {
				if (path.indexOf("application.") == 0) {
					var property = this.$services.page.properties.filter(function(x) {
						return x.key == path.substring("application.".length);
					})[0];
					result = property ? property.value : null;
				}
			}
			return literal ? result : this.$services.page.parseValue(result);
		}
	}
})

// methods in cell instances:
// - configure: start configuration for the cell content
// - getEvents: return event definitions
// - getLocalState: return the state definition for this level (e.g. because of for loop or variable scoping)
nabu.page.views.Page = Vue.component("n-page", {
	template: "#nabu-page",
	props: {
		page: {
			type: Object,
			required: true
		},
		parameters: {
			type: Object,
			required: false,
			default: function() { return {} }
		},
		embedded: {
			type: Boolean,
			required: false
		},
		editable: {
			type: Boolean,
			required: false
		},
		masked: {
			typed: Boolean,
			required: false
		},
		stopRerender: {
			type: Boolean,
			required: false,
			default: false
		}
	},
	activate: function(done) {
		// the page has a path, set it in the body so we can do additional stuff
		// in the beginning we set this in the ready hook, however if you have a slow loading page it would only get set after the slow thingy ended
		// however in the mean time your (presumably synchronous) skeletons have already loaded and perhaps even showing a nice loading icon but on the "old" background styling
		if (this.page.content.path)	{
			document.body.setAttribute("page", this.page.name);
			document.body.setAttribute("category", this.page.content.category);
			document.body.setAttribute("page-type", this.page.content.pageType ? this.page.content.pageType : "page");
		}
		
		var self = this;
		var finalize = function() {
			if (self.page.content.title) {
				self.oldTitle = document.title;
				document.title = self.$services.page.translate(self.$services.page.interpret(self.page.content.title, self));
			}
			if (self.page.content.branding) {
				// don't copy it by reference, it will be updated...
				self.oldBranding = nabu.utils.objects.deepClone(self.$services.page.currentBranding);
				self.$services.page.updateBranding(self.page.content.branding);
			}
			if (self.page.content.autoRefresh) {
				self.autoRefreshTimeout = setTimeout(function() {
					if (!self.edit && !self.$services.page.wantEdit) {
						var target = nabu.utils.router.self(self.$el);
						//window.history.go(0);
						self.$services.router.route(self.$services.page.alias(self.page), self.parameters, target);
					}
				}, parseInt(self.page.content.autoRefresh));
			}
			self.initializeDefaultParameters();
			if (self.page.content.initialEvents) {
				self.page.content.initialEvents.forEach(function(x) {
					self.fireInitialEvent(x);
				});
			}
			if (self.page.content.parameters) {
				self.page.content.parameters.forEach(function(parameter) {
					if (parameter.name != null && parameter.defaults && parameter.defaults.length) {
						parameter.defaults.forEach(function(defaultValue) {
							if (defaultValue.query && defaultValue.value) {
								var currentValue = self.$services.page.getValue(self.variables[parameter.name], defaultValue.query);
								if (currentValue == null) {
									if (self.variables[parameter.name] == null) {
										Vue.set(self.variables, parameter.name, {});
									}
									var result = self.$services.page.parseValue(self.$services.page.translate(self.$services.page.interpret(defaultValue.value, self)));               
									self.$services.page.setValue(self.variables[parameter.name], defaultValue.query, result);
								}
							}
						});
					}	
				});
			}
			
			// once all the state is done, calculate the computed
			if (self.page.content.computed) {
				self.page.content.computed.forEach(function(x) {
					if (x.name && x.script) {
						var result = self.calculateVariable(x.script);
						if (result != null) {
							self.$services.page.setValue(self.variables, x.name, result);
						}
					}	
				});
			}
			
			// set up watchers for reset events
			if (self.page.content.parameters) {
				self.page.content.parameters.map(function(parameter) {
					if (parameter.resetListeners) {
						parameter.resetListeners.forEach(function(listener) {
							if (listener && listener.to) {
								var to = listener.to;
								if (to.indexOf("page.") == 0) {
									to = to.substring("page.".length);
								}
								if (to.indexOf(".") >= 0) {
									console.error("Field level resets not supported yet");
								}
								else {
									self.subscribe(to, function() {
										self.initializeDefaultParameters(true, [parameter.name], true);
										if (nabu.page.event.getName(parameter, "updatedEvent")) {
											self.emit(
												nabu.page.event.getName(parameter, "updatedEvent"),
												nabu.page.event.getInstance(parameter, "updatedEvent", self.page, self)
											);
										}
									});
								}
								/*
								// this bit is unstable, the watcher is triggered 3 times on a singular update it seems
								self.$watch("variables." + to, function(value) {
									console.log("watcher triggered for variables.", to, value);
									if (listener.field) {
										console.error("Field level resets not supported yet");
									}
									else {
										self.initializeDefaultParameters(true, [parameter.name]);
										if (nabu.page.event.getName(parameter, "updatedEvent")) {
											self.emit(
												nabu.page.event.getName(parameter, "updatedEvent"),
												nabu.page.event.getInstance(parameter, "updatedEvent", self.page, self)
											);
										}
									}
								});
								*/
							}
						})
					}
				});
			}
			
			done();
		};
		if (this.page.content.states.length) {
			var sendStateEvent = function(state) {
				if (nabu.page.event.getName(state, "updateEvent")) {
					self.emit(
						nabu.page.event.getName(state, "updateEvent"),
						nabu.page.event.getInstance(state, "updateEvent", self.page, self)
					);
				}
			}
			// inherit the state from the application
			this.page.content.states.filter(function(state) { return !!state.name && state.inherited }).forEach(function(state) {
				// clone it so they don't have the same references! otherwise the array merges might be weird (splice and merge on same array...)
				Vue.set(self.variables, state.name, nabu.utils.objects.clone(self.$services.page.variables[state.applicationName]));
				// you want to send out the event if _anyone_ updates it, not just you
				self.$watch("$services.page.variables." + state.applicationName, function(newValue) {
					// update local variable as well, otherwise changes won't be seen
					if (self.variables[state.name]) {
						self.$services.page.mergeObject(self.variables[state.name], newValue); // self.$services.page.variables[state.applicationName]
					}
					// first set?
					else {
						Vue.set(self.variables, state.name, newValue);
					}
					sendStateEvent(state);
				}, {deep:false});
			});
			var promises = this.page.content.states.filter(function(state) { 
				// it must have a name and not be inherited
				return !!state.name && !state.inherited
					&& (!state.condition || self.$services.page.isCondition(state.condition, self.variables, self));
			}).map(function(state) {
				var parameters = {};
				Object.keys(state.bindings).map(function(key) {
					//parameters[key] = self.get(state.bindings[key]);
					if (state.bindings[key] != null) {
						parameters[key] = self.$services.page.getBindingValue(self, state.bindings[key]);
					}
				});
				try {
					// can throw hard errors
					return self.$services.swagger.execute(state.operation, parameters).then(function(result) {
						if (result != null) {
							self.initialStateLoaded.push(state.name);
						}
						Vue.set(self.variables, state.name, result ? result : null);
						self.updatedVariable(state.name);
					});
				}
				catch (exception) {
					console.error("Could not execute", state.operation, exception);
					var promise = self.$services.q.defer();
					promise.reject(exception);
					return promise;
				}
			});
			var inSelf = this.page.content.errorInSelf;
			var routeError = function(error, counter) {
				if (!counter) {
					counter = 1;
				}
				if (!self.$el && counter < 5 && inSelf) {
					Vue.nextTick(function() {
						routeError(error, counter + 1);
					});
				}
				else {
					console.log("error is", error);
					var route = "error";
					
					// if we have an array, check all responses
					// if at least one response indicates an offline server, we are going with the offline story!
					if (error instanceof Array) {
						error.forEach(function(x) {
							if (x.status == 503 || x.status == 502) {
								route = "offline";
							}
						})
					}
					else if (error.status == 503 || error.status == 502) {
						route = "offline";
					}
					
					// if we have not opted for offline behavior, check if we have custom error routing
					if (route == "error" && error.forEach) {
						error.forEach(function(x) {
							// sometimes x is null?
							if (x && x.code && self.page.content.stateErrors) {
								self.page.content.stateErrors.forEach(function(y) {
									if (y.code == x.code) {
										route = y.route;
									}
								});
							}
						});
					}
					
					console.log("error route is", route);
					
					// masked route so we can reload
					self.$services.router.route(route, {
						code: "page-load-failed",
						message: "%{error:The page you requested could not be loaded, please <a href='javascript:void(0)' @click='$window.location.reload()'>try again</a>}"
					}, inSelf && self.$el ? nabu.utils.router.self(self.$el) : null, true);
				}
			};
			this.$services.q.all(promises).then(finalize, function(error) {
				done();
				// if we are in edit mode, we can be expected to fix this
				if (self.edit || self.$services.page.wantEdit) {
					finalize();
				}
				else {
					routeError(error, 0);
				}
			});
		}
		else {
			finalize();
		}
	},
	beforeDestroy: function() {
		this.stopEdit();
		if (this.autoRefreshTimeout) {
			clearTimeout(this.autoRefreshTimeout);
			this.autoRefreshTimeout = null;
		}
		if (this.oldTitle) {
			document.title = this.oldTitle;
		}
		if (this.oldBranding) {
			this.$services.page.updateBranding(this.oldBranding);
		}
		this.timers.forEach(function(x) {
			clearTimeout(x);
		});
		if (this.oldBodyClasses.length) {
			document.body.classList.remove.apply(document.body.classList, this.oldBodyClasses.splice(0));
		}
	},
	ready: function() {
		this.$services.page.rendering--;
		this.rendered = true;
		this.postRender.splice(0).forEach(function(x) { x() });
	},
	created: function() {
		this.$services.page.rendering++;
		this.$services.page.setPageInstance(this.page, this);
		var self = this;
		// it could be possible that you use a parameter here (with default) in your initial state
		this.initializeDefaultParameters(true);
		if (this.editable) {
			this.edit = true;
		}
		
		if (!this.embedded) {
			// initialize plugins
			this.plugins.forEach(function(plugin) {
				var component = Vue.component(plugin.component);
				new component({propsData: {
					page: self.page,
					edit: self.edit,
					instance: self
				}});
			});
		}
	},
	beforeMount: function() {
		this.$services.page.setPageInstance(this.page, this);
		// keep a stringified copy of the last parameters so we can diff
		// no longer needed? @2021-06-10: it seems this was only for the initial rerender
		// which has long since been deprecated
		//this.lastParameters = JSON.stringify(this.parameters);
	},
	destroyed: function() {
		this.$services.page.destroyPageInstance(this.page, this);
	},
	computed: {
		events: function() {
			return this.getEvents();
		},
		availableParameters: function() {
			return this.$services.page.getAvailableParameters(this.page, null, true);
			// there are all the events
			//var available = nabu.utils.objects.clone(this.getEvents());
			// and the page
			//available.page = this.$services.page.getPageParameters(this.page);
			//return available;
		},
		// we inject this into the tpl only to make it reactive
		// the ultimate goal is to switch classes on the body
		bodyClasses: function () {
			if (this.page.content.bodyStyles && this.page.content.bodyStyles.length) {
				var self = this;
				return this.$services.page.getDynamicClasses(this.page.content.bodyStyles, self.variables, this);
			}
			else {
				return [];
			}
		},
		classes: function() {
			var classes = [];
			if (this.edit) {
				classes.push("edit");
			}
			if (this.page.content.class) {
				classes.push(this.page.content.class);
			}
			if (this.page.content.styles && this.page.content.styles.length) {
				var self = this;
				var dynamics = this.$services.page.getDynamicClasses(this.page.content.styles, self.variables, this);
				nabu.utils.arrays.merge(classes, dynamics);
			}
			if (this.page.content.pageType) {
				classes.push("page-type-" + this.page.content.pageType);
			}
			else {
				classes.push("page-type-page");
			}
			classes.push("page-" + this.page.name);
			return classes;
		},
		plugins: function() {
			return nabu.page.providers("page-plugin").filter(function(x) { return x.target == "page" });
		}
	},
	data: function() {
		return {
			autoRefreshTimeout: null,
			refs: {},
			edit: false,
			// contains all the component instances
			// the key is their id
			components: {},
			// contains (amongst other things) the event instances
			variables: {},
			//lastParameters: null,
			configuring: false,
			// per cell
			closed: {},
			// centralized storage that exists for the lifetime of the page
			storage: {},
			// subscriptions to events
			subscriptions: {},
			autoMapFrom: null,
			
			// a lot of components load events at the beginning on startup in a computed property
			// however, depending on the mount order, new events come in after those components are started
			// to be able to recompute those events, this should be reactive
			cachedEvents: null,
			// a timer for content saving, we want to batch content updates to prevent a lot of calls
			// the form sets value by value using standard interfaces, it doesn't know that the content is being pushed to the backend
			// we want to keep it that way, which is why it is unaware of the batch
			saveContentTimer: null,
			// the actual contents to save
			saveContents: [],
			savePageTimer: null,
			// the selected item in the side menu
			selectedItem: null,
			viewComponents: false,
			closing: false,
			saved: null,
			// any timers that might exist and need to be destroyed
			timers: [],
			// actions to run post render (if any)
			postRender: [],
			// whether or not we are ready to go
			rendered: false,
			oldBodyClasses: [],
			initialStateLoaded: []
		}
	},
	methods: {
		addNotification: function() {
			if (!this.page.content.notifications) {
				Vue.set(this.page.content, "notifications", []);
			}	
			this.page.content.notifications.push({
				name: null,
				duration: null,
				// the event you will trigger on
				on: null,
				condition: null,
				title: null,
				message: null,
				severity: null,
				closeable: null,
				icon: null,
				actions: [],
				chainEvent: {
					name: "enrich"
				}
			});
		},
		moveTriggerUp: function(action) {
			var index = this.page.content.actions.indexOf(action);
			if (index > 0) {
				this.page.content.actions.splice(index, 1);
				this.page.content.actions.splice(index - 1, 0, action);
			}
		},
		moveTriggerDown: function(action) {
			var index = this.page.content.actions.indexOf(action);
			// not the last one
			if (index < this.page.content.actions.length - 1) {
				this.page.content.actions.splice(index, 1);
				this.page.content.actions.splice(index + 1, 0, action);
			}
		},
		moveInternalUp: function(parameter) {
			var index = this.page.content.parameters.indexOf(parameter);
			if (index > 0) {
				this.page.content.parameters.splice(index, 1);
				this.page.content.parameters.splice(index - 1, 0, parameter);
			}
		},
		moveInternalDown: function(parameter) {
			var index = this.page.content.parameters.indexOf(parameter);
			// not the last one
			if (index < this.page.content.parameters.length - 1) {
				this.page.content.parameters.splice(index, 1);
				this.page.content.parameters.splice(index + 1, 0, parameter);
			}
		},
		getOperationArrays: function(operation) {
			if (operation) {
				var op = this.$services.swagger.operations[operation];
				if (op && op.responses["200"] != null && op.responses["200"].schema != null) {
					var schema = op.responses["200"].schema;
					if (schema["$ref"]) {
						var definition = this.$services.swagger.resolve(schema["$ref"]);
						return this.$services.page.getArrays(definition);
					}
				}
			}
			return [];
		},
		moveActionTop: function(action) {
			var index = this.page.content.actions.indexOf(action);	
			if (index > 0) {
				this.page.content.actions.splice(index, 1);
				this.page.content.actions.unshift(action);
			}
		},
		moveActionBottom: function(action) {
			var index = this.page.content.actions.indexOf(action);	
			if (index >= 0) {
				this.page.content.actions.splice(index, 1);
				this.page.content.actions.push(action);
			}
		},
		moveAction: function(action, amount) {
			var index = this.page.content.actions.indexOf(action);	
			if (index >= 0) {
				var targetIndex = index + amount;
				if (targetIndex >= 0 && targetIndex <= this.page.content.actions.length - 1) {
					var targetItem = this.page.content.actions[targetIndex];
					this.page.content.actions.splice(targetIndex, 1, this.page.content.actions[index]);
					this.page.content.actions.splice(index, 1, targetItem);
				}
			}
		},
		route: function(alias, parameters, anchor, mask) {
			var self = this;
			var doIt = function() {
				self.$services.router.route(alias, parameters, anchor, mask);
			};
			if (this.rendered) {
				return doIt();
			}
			else {
				this.postRender.push(doIt);
			}
		},
		fireInitialEvent: function(x) {
			var self = this;
			if (nabu.page.event.getName(x, "definition") && (!x.condition || self.$services.page.isCondition(x.condition, self.$services.page.getPageState(self), self))) {           
				try {
					self.emit(
						nabu.page.event.getName(x, "definition"),
						nabu.page.event.getInstance(x, "definition", self.page, self)
					);
				}
				catch (exception) {
					console.error("Could not fire initial event", exception);
				}
			}
			if (x.timeout) {
				var timer = setTimeout(function() {
					// remove this timer
					var index = self.timers.indexOf(timer);
					if (index >= 0) {
						self.timers.splice(index, 1);
					}
					self.fireInitialEvent(x);
				}, parseInt(x.timeout));
				self.timers.push(timer);
			}
		},
		initializeDefaultParameters: function(isInitial, names, force) {
			var self = this;
			if (this.page.content.parameters) {
				this.page.content.parameters.map(function(x) {
					if (x.name != null && (!names || names.indexOf(x.name) >= 0)) {
						// it is entirely possible that someone already set the state for this variable, for example through an initial state with the same name
						// this "trick" is applied when you want to load initial state _and_ you want to modify it through listeners etc
						// we then make two variables with the same name
						// however, if the initial state in this case does not exist, you do want your default to kick in
						// but not if the state already exists
						// if we force it however (e.g. through reset), we do want to recompute every time
						if (self.initialStateLoaded.indexOf(x.name) < 0 || force) {
							// if it is not passed in as input, we set the default value
							if (self.parameters[x.name] == null) {
								// check if we have a content setting
								var value = self.$services.page.getContent(x.global ? null : self.page.name, x.name);
								if (value == null) {
									if (x.complexDefault) {
										value = self.calculateVariable(x.defaultScript);
									}
									else {
										value = self.$services.page.interpret(x.default, self);
									}
								}
								else {
									value = value.content;
								}
								// inherit from global state (especially interesting for mails/pdfs...)
								// basically you inject state in a global parameters application.state and it will be auto-bound
								if (value == null && application.state && application.state[x.name] != null) {
									value = application.state[x.name];
								}
								if (value != null || isInitial) {
									Vue.set(self.variables, x.name, value == null ? null : value);
								}
							}
							// but you can override the default with an input parameter (only during created, not activate)
							else if (isInitial) {
								Vue.set(self.variables, x.name, self.parameters[x.name]);
							}
						}
					}
				});
			}
		},
		selectItem: function(item) {
			Vue.set(this, 'selectedItem', item);	
		},
		stopEdit: function() {
			if (this.edit && !this.closing) {
				this.closing = true;
				//var right = document.querySelector("#n-sidebar-right-instance");
				var right = document.querySelector(".n-sidebar.right");
				if (right && right.__vue__ && right.__vue__.close) {
					right.__vue__.close();
				}
				else if (right && right.$$close) {
					right.$$close();
				}
				//var left = document.querySelector("#n-sidebar-left-instance");
				var left = document.querySelector(".n-sidebar.left");
				if (left && left.__vue__ && left.__vue__.close) {
					left.__vue__.close();
				}
				else if (left && left.$$close) {
					left.$$close();
				}
				/*if (this.$refs.sidemenu) {
					this.$refs.sidemenu.close();
				}*/
				if (this.$services.page.editing) {
					this.$services.page.editing.edit = false;
					this.$services.page.editing = null;
				}
				this.closing = false;
				this.edit = false;
			}
		},
		goIntoEdit: function() {
			if (!this.edit) {
				if (this.$services.page.editing) {
					if (this.$services.page.editing.edit) {
						this.$services.page.editing.stopEdit();
					}
					this.$services.page.editing = null;
				}
				this.edit = true;
				this.$services.page.editing = this;
				// automatically pop up the new components window
				this.viewComponents = true;
			}	
		},
		addInitialEvent: function() {
			if (!this.page.content.initialEvents) {
				Vue.set(this.page.content, "initialEvents", []);
			}
			this.page.content.initialEvents.push({condition:null, definition: {}});
		},
		listFields: function(type, value) {
			// added try/catch in case the type is unknown
			try {
				var type = this.$services.swagger.resolve(type);
				return this.$services.page.getSimpleKeysFor(type).filter(function(x) { return !value || (x && x.toLowerCase().indexOf(value.toLowerCase()) >= 0) });
			}
			catch (exception) {
				console.warn("Could not list fields for", type, exception);
				return [];
			}
		},
		validateStateName: function(name) {
			var blacklisted = ["page", "application", "record", "state", "localState"];
			var messages = [];
			if (name && blacklisted.indexOf(name) >= 0) {
				messages.push({
					type: "error",
					title: "%{This name is not allowed}"
				});
			}
			return messages;
		},
		isGet: function(operationId) {
			var operation = this.$services.swagger.operations[operationId];
			return operation && operation.method && operation.method.toLowerCase() == "get";
		},
		getParameterTypes: function(value) {
			var types = ['string', 'boolean', 'number', 'integer'];
			nabu.utils.arrays.merge(types, Object.keys(this.$services.swagger.swagger.definitions));
			if (value) {
				types = types.filter(function(x) { return x.toLowerCase().indexOf(value.toLowerCase()) >= 0 });
			}
			return types;
		},
		store: function(key, value) {
			if (typeof(value) == "object") {
				if (!this.storage[key]) {
					Vue.set(this.storage, key, {});
				}
				Object.keys(value).map(function(name) {
					Vue.set(this.storage[key], name, value[name]);
				})
			}
			else {
				Vue.set(this.storage, key, value);
			}
		},
		retrieve: function(key) {
			return this.storage[key];
		},
		automap: function(action) {
			var source = this.availableParameters[this.autoMapFrom];
			var self = this;
			var keys = self.$services.page.getSimpleKeysFor(source);
			this.getOperationParameters(action.operation, true).map(function(key) {
				// only automap those that are not filled in
				if (!action.bindings[key]) {
					var keyToCheck = key.indexOf(".") < 0 ? key : key.substring(key.indexOf(".") + 1);
					//if (!!source.properties[keyToCheck]) {
					var matching = keys.filter(function(x) { return x == keyToCheck || (x.length > keyToCheck.length + 1 && x.substring(x.length - (keyToCheck.length + 1)) == "." + keyToCheck) });
					if (matching.length > 0) {
						Vue.set(action.bindings, key, self.autoMapFrom + "." + matching[0]);
					}
				}
			});
		},
		pasteRow: function() {
			this.page.content.rows.push(this.$services.page.renumber(this.page, this.$services.page.copiedRow));
			this.$services.page.copiedRow = null;
		},
		filterRoutes: function(value) {
			var routes = this.$services.router.list().filter(function(x) {
				return x.alias && (!value || x.alias.toLowerCase().indexOf(value.toLowerCase()) >= 0);
			});
			routes.sort(function(a, b) {
				return a.alias.localeCompare(b.alias);
			});
			return routes.map(function(x) { return x.alias });
		},
		getStateOperations: function(value) {
			return this.$services.page.getStateOperations(value);
		},
		setStateOperation: function(state, operation) {
			state.operation = operation;
			var bindings = {};
			if (operation) {
				this.$services.swagger.operations[operation].parameters.map(function(parameter) {
					bindings[parameter.name] = null;
				});
			}
			Vue.set(state, "bindings", bindings);
		},
		addState: function() {
			this.page.content.states.push({
				name: null,
				operation: null,
				bindings: {},
				condition: null
			})	
		},
		addApplicationState: function() {
			this.page.content.states.push({
				inherited: true,
				name: null,
				// the name of the state at the application level
				applicationName: null
			});
		},
		dragMenu: function(event) {
			this.$services.page.setDragData(event, "page-menu", this.page.name);
		},
		// apparently you can't (in chrome at least) access the data during drag
		// this is to prevent inspecting data that is accidently dragged over your website
		// we _can_ however access the list of data types that is available
		dragOver: function(event) {
			if (this.$services.page.hasDragData(event, "page-menu")) {
				event.preventDefault();
			}
			else if (this.$services.page.hasDragData(event, "component-alias")) {
				event.preventDefault();
			}
			else if (this.$services.page.hasDragData(event, "template-content")) {
				event.preventDefault();
			}
			else if (this.$services.page.hasDragData(event, "operation")) {
				event.preventDefault();
			}
		},
		dropMenu: function(event) {
			var self = this;
			if (this.$services.page.getDragData(event, "page-menu")) {
				var rect = this.$el.getBoundingClientRect();
				Vue.set(this.page.content, "menuX", event.clientX - rect.left);
				Vue.set(this.page.content, "menuY", event.clientY - rect.top);
				event.preventDefault();
				event.stopPropagation();
			}
			if (this.$services.page.getDragData(event, "component-alias")) {
				var row = this.addRow(this.page.content);
				var cell = this.addCell(row);
				cell.alias = this.$services.page.getDragData(event, "component-alias");
				event.preventDefault();
				event.stopPropagation();
			}
			if (this.$services.page.getDragData(event, "template-content")) {
				var content = JSON.parse(this.$services.page.getDragData(event, "template-content"));
				// row drop from templates
				if (content.type == "page-row") {
					if (!self.page.content.rows) {
						Vue.set(self.page.content, "rows", []);
					}
					if (content.content instanceof Array) {
						content.content.forEach(function(row) {
							self.page.content.rows.push(self.$services.page.renumber(self.page, self.$services.page.normalizeRow(row)));
						});
					}
					else {
						self.page.content.rows.push(self.$services.page.renumber(self.page, self.$services.page.normalizeRow(content.content)));
					}
				}
				else {
					if (content.rows instanceof Array) {
						var rows = content.rows.map(function(x) {
							return self.$services.page.renumber(self.page, x);	
						});
						nabu.utils.arrays.merge(this.page.content.rows, rows);
					}
					if (content.actions instanceof Array) {
						nabu.utils.arrays.merge(this.page.content.actions, content.actions);
					}
				}
				event.preventDefault();
				event.stopPropagation();
			}
			if (this.$services.page.getDragData(event, "operation")) {
				this.initializeOperation(function() {
					return self.addRow(self.page.content);
				}, function(row) {
					return self.addCell(row);
				});
				event.preventDefault();
				event.stopPropagation();
			}
		},
		initializeOperation: function(rowGenerator, cellGenerator) {
			var self = this;
			var content = this.$services.page.getDragData(event, "operation");
			if (content) {
				if (this.$services.swagger.operations[content]) {
					this.initializeOperationInternal(rowGenerator, cellGenerator, content);
				}
				// if we can't find the operation, reload the swagger and try again
				// if it's still not there, we fail
				else {
					this.$services.page.reloadSwagger().then(function() {
						if (self.$services.swagger.operations[content]) {
							self.initializeOperationInternal(rowGenerator, cellGenerator, content);
						}
						else {
							console.error("Can not find operation", content);
						}
					});
				}
			}
		},
		initializeOperationInternal: function(rowGenerator, cellGenerator, content) {
			console.log("initializing operation", content);
			var self = this;
			var acceptedRoutes = this.$services.router.router.list().filter(function(route) {
				return route.accept && route.accept("operation", content);
			});
			// if we have multiple routes, only choose correctly annotated routes that we can ask the user which he wants
			if (acceptedRoutes.length > 1) {
				acceptedRoutes = acceptedRoutes.filter(function(x) {
					return x.icon && x.name;	
				});
			}
			var runRoute = function(route) {
				var row = rowGenerator();
				var cell = cellGenerator(row);
				if (route.initialize) {
					cell.$$initialize = function(instance) {
						route.initialize("operation", content, instance, cell, row, self);
					}
				}
				cell.alias = route.alias;
				event.preventDefault();
				event.stopPropagation();
			};
			// if there is only one, execute it immediately
			if (acceptedRoutes.length == 1) {
				runRoute(acceptedRoutes[0]);
			}
			// if we have multiple, show a popup
			else if (acceptedRoutes.length > 1) {
				this.$prompt("page-components-selector", {components: acceptedRoutes}).then(function(chosen) {
					if (chosen) {
						runRoute(chosen);
					}	
				});
			}
		},
		save: function(event) {
			if (this.edit) {
				var self = this;
				this.$services.page.update(this.page).then(function() {
					self.saved = new Date();
				});
				event.preventDefault();
				event.stopPropagation();
			}
		},
		getOperationParameters: function(operation, explode) {
			// could be an invalid operation?
			if (!this.$services.swagger.operations[operation]) {
				 return [];
			}
			var parameters = this.$services.swagger.operations[operation].parameters;
			if (explode) {
				return this.$services.page.getSwaggerParametersAsKeys(this.$services.swagger.operations[operation]);
			}
			else {
				return parameters ? parameters.map(function(x) { return x.name }) : [];
			}
		},
		addEventReset: function(action) {
			if (action.eventResets == null) {
				Vue.set(action, "eventResets", []);
			}
			action.eventResets.push('');
		},
		getOperations: function(value) {
			var options = Object.keys(this.$services.swagger.operations);
			if (value) {
				options = options.filter(function(x) {
					return x.toLowerCase().indexOf(value.toLowerCase()) >= 0;
				})
			}
			return options;
		},
		getAvailableEvents: function(event) {
			var available = this.getEvents();
			var result = Object.keys(available);
			result = result.filter(function(x) {
				return x != null && typeof(x) == "string";
			});
			if (event) {
				result = result.filter(function(x) {
					return x.toLowerCase().indexOf(event.toLowerCase()) >= 0;
				});
			}
			result.sort();
			return result;
		},
		addAnalysis: function() {
			if (!this.page.content.analysis) {
				Vue.set(this.page.content, "analysis", []);
			}	
			this.page.content.analysis.push({
				name: null,
				on: null,
				condition: null
			});
		},
		addAction: function() {
			this.page.content.actions.push({
				name: null,
				on: null,
				confirmation: null,
				operation: null,
				route: null,
				event: null,
				anchor: null,
				bindings: {},
				expandBindings: true
			});
		},
		removeQuery: function(index) {
			this.page.content.query.splice(index, 1);	
		},
		ref: function(reference) {
			return this.refs[reference];
		},
		// destroy a component from the page
		destroyComponent: function(component, cell) {
			if (this.components[cell.id] != null) {
				if (this.components[cell.id] instanceof Array) {
					var index = this.components[cell.id].indexOf(component);
					if (index >= 0) {
						this.components[cell.id].splice(index, 1);
					}
					if (this.components[cell.id].length == 0) {
						Vue.delete(this.components, cell.id, null);
					}
					// make singular again
					else if (this.components[cell.id].length == 1) {
						this.components[cell.id] = this.components[cell.id][0];
					}
				}
				else if (this.components[cell.id] == component) {
					Vue.delete(this.components, cell.id, null);
				}
			}
		},
		// in the beginning we only kept track of one component per cell id
		// there can not be multiple, it is not entirely clear how this should work for now
		// repeats are turned off in edit mode so shouldn't trigger multiple components, but page-arbitrary can
		// upside: we can offer a solution for configuration of arbitrary, downside: the state etc is still not ok (probably...?)
		getComponentForCell: function(cellId) {
			var result = this.components[cellId];
			if (result instanceof Array) {
				return result[0];
			}
			return result;
		},
		mounted: function(cell, row, state, component) {
			var self = this;
			
			if (component.$mounted) {
				self.$services.page.rendering--;
			}
			else {
				component.$on("hook:mounted", function() {
					self.$services.page.rendering--;
				});
			}

			
			// run the initializer function (if any) with the component instance
			if (cell.$$initialize) {
				cell.$$initialize(component);
				cell.$$initialize = null;
			}
			
			if (cell.ref) {
				this.refs[cell.ref] = component;
			}
			
			component.$on("hook:beforeDestroy", function() {
				// clear subscriptions
				if (component.$pageSubscriptions != null) {
					component.$pageSubscriptions.forEach(function(sub) {
						sub();
					});
				}
				if (cell.ref) {
					self.refs[cell.ref] = null;
				}
				// currently all this does is update the components, which is better done here
				//self.$services.page.destroy(component);
				self.destroyComponent(component, cell);
			});
			
			// reset event cache
			this.cachedEvents = null;
			// if it already exists, we have multiple components for the same cell id, this is possible in for example a "for each" scenario
			// or when dealing with arbitrary content that the parent does not have full knowledge about and might register itself
			if (this.components[cell.id] != null) {
				// if not an array yet, we make it an array
				if (!(this.components[cell.id] instanceof Array)) {
					this.components[cell.id] = [this.components[cell.id]];
				}
				this.components[cell.id].push(component);
			}
			else {
				this.components[cell.id] = component;
			}
			
			// we subscribe to a very specific event that will reset all the registered events
			// this is because it is cached...
			component.$on("updatedEvents", function() {
				self.resetEvents();
			});
			
			// we want to inject all the data into the component so it can be used easily
			var data = {};
			// shallow copy of the variables that exist
			var self = this;
			Object.keys(this.variables).map(function(key) {
				data[key] = self.variables[key];
			});
			
			// actually, the state is not in the parents as rows and cells are not components
			// state is sent in
			/*
			// now we want to walk the parent nodes of the component until we reach the page
			// and check if they have any local state that should be added
			// parents can override page-level properties but because we loop from closest parent to furthest parent, they can not override each others keys
			// as the most specific parent is supposed to win
			var parentKeys = [];
			var parent = component.$parent;
			while (parent) {
				if (parent == this) {
					break;
				}
				if (parent.data) {
					Object.keys(parent.data).map(function(key) {
						if (parentKeys.indexOf(key) < 0) {
							data[key] = parent.data[key];
							parentKeys.push(key);
						}
					})
				}
				parent = parent.$parent;
			}
			*/
			
			if (state) {
				Object.keys(state).map(function(key) {
					data[key] = state[key];
				})
			}
			
			// we want to inject all the necessary data into the cell so it can be referenced by components
//			Vue.set(component, "state", data);
		
			// make sure we have a watchable variable for each event
			if (component.getEvents) {
				var self = this;
				var eventResult = component.getEvents();
				if (eventResult) {
					var subscribeToEvent = function(name) {
						if (!self.variables[name]) {
							Vue.set(self.variables, name, null);
						}
						component.$on(name, function(value) {
							self.emit(name, value);
						});
					}
					if (typeof(eventResult) == "string") {
						subscribeToEvent(eventResult);
					}
					else if (eventResult instanceof Array) {
						// TODO: add array support
					}
					else {
						Object.keys(eventResult).map(subscribeToEvent);
					}
				}
			}
			
			// if we have old-timey event registration, use it to pick up page events
			if (component.$options.events) {
				if (component.$pageSubscriptions == null) {	
					component.$pageSubscriptions = [];
				}
				var self = this;
				Object.keys(component.$options.events).forEach(function(name) {
					component.$pageSubscriptions.push(self.subscribe(name, component.$options.events[name].bind(component)));
				});
			}
		},
		hasConfigureListener: function(rows) {
			if (!rows) {
				rows = this.page.content.rows;
			}
			if (rows) {
				for (var i = 0; i < rows.length; i++) {
					if (rows[i].on == "$configure") {
						return true;
					}
					if (rows[i].cells) {
						for (var j = 0; j < rows[i].cells.length; j++) {
							var cell = rows[i].cells[j];
							if (cell.on == "$configure") {
								return true;
							}
							if (cell.rows) {
								var has = this.hasConfigureListener(cell.rows);
								if (has) {
									return true;
								}
							}
						}
					}
				}
			}
			return false;
		},
		addCell: function(target) {
			if (!target.cells) {
				Vue.set(target, "cells", []);
			}
			var cell = {
				id: this.page.content.counter++,
				rows: [],
				// the alias of the route we want to render here (if any)
				alias: null,
				// the route may have input parameters (path + query), these are the relevant bindings
				// the binding variable contains keys for each path/query parameter in the route
				bindings: {},
				name: null,
				// state that is maintained by the cell owner (the route alias)
				// for example it might offer additional configuration
				state: {},
				// the rendering target (e.g. sidebar, prompt,...)
				target: 'page',
				// it can depend on an event of taking place
				on: null,
				// a class for this cell
				class: null,
				// a custom id for this cell
				customId: null,
				// flex width
				width: 1,
				height: null,
				instances: {},
				condition: null,
				devices: [],
				clickEvent: null
			};
			target.cells.push(cell);
			return cell;
		},
		addRow: function(target, skipInject) {
			if (!target.rows) {
				Vue.set(target, "rows", []);
			}
			var row = {
				id: this.page.content.counter++,
				cells: [],
				class: null,
				// a custom id for this row
				customId: null,
				// you can map an instance of an array to a row
				// for instance if you have an array of "contracts", you could map it to the variable "contract"
				// the key is the local name, the value is the name of the object in the page
				instances: {},
				condition: null,
				direction: null,
				align: null,
				on: null,
				collapsed: false,
				name: null
			};
			if (!skipInject) {
				target.rows.push(row);
			}
			return row;
		},
		addPageParameter: function() {
			if (!this.page.content.parameters) {
				Vue.set(this.page.content, "parameters", []);
			}
			this.page.content.parameters.push({
				name: null,
				type: 'string',
				format: null,
				default: null,
				global: false,
				// we can listen to events and take a value from them to update the current value
				// e.g. we could update a search parameter if you select something
				listeners: []
			});
		},
		removeRow: function(row) { 
			this.page.content.rows.splice(this.page.content.rows(indexOf(row), 1))
		},
		resetEvents: function() {
			this.cachedEvents = null;
		},
		getDraggables: function() {
			var result = {};
			var self = this;
			Object.keys(this.components).map(function(cellId) {
				var component = self.components[cellId];
				var handle = function(component) {
					// pages will _not_ send their events by default to other pages (only through global events)
					// so this we skip the page components in this listing
					if (component && component.getDraggables && !self.$services.page.isPage(component)) {
						var cellDraggables = component.getDraggables();
						if (cellDraggables) {
							Object.keys(cellDraggables).forEach(function(key) {
								result[key] = cellDraggables[key];
							});
						}
					}
				}
				if (component instanceof Array) {
					component.forEach(handle);
				}
				else {
					handle(component);
				}
			});
			return result;
		},
		getEvents: function() {
			// non-watched cache property
			// we have too many problems with update loops that are triggered by this method
			// and in general the result should only change if we route new content
			if (!this.cachedEvents) {
				var events = {
					"$configure": {properties:{}},
					"$clear": {properties:{}}
				};
				
				var self = this;
				this.cachedEvents = events;
				
				// check which events are picked up globally
				if (this.page.content.globalEventSubscriptions) {
					var globalEventDefinitions = this.$services.page.getGlobalEvents();
					this.page.content.globalEventSubscriptions.map(function(sub) {
						events[sub.localName == null ? sub.globalName : sub.localName] = globalEventDefinitions[sub.globalName] ? globalEventDefinitions[sub.globalName] : {properties:{}};	
					});
				}
				
				// your page actions can trigger success events
				if (this.page.content.actions) {
					this.page.content.actions.filter(function(x) { return x.event != null && x.operation != null }).map(function(action) {
						if (self.$services.swagger.operations[action.operation] == null) {
							console.error("Could not find operation for action", action.operation, action.name, action.event);
						}
						else {
							var response = self.$services.swagger.operations[action.operation].responses["200"];
							var schema = null;
							if (response && response.schema) {
								schema = self.$services.swagger.resolve(response.schema);
							}
							// we only want the array in it
							if (action.singlify) {
								var theParts = action.singlify.split(".");
								for (var i = 0; i < theParts.length; i++) {
									schema = schema.properties[theParts[i]];
								}
								if (schema.items) {
									schema = schema.items;
								}
							}
							events[action.event] = schema ? schema : {};
						}
					});
					this.page.content.actions.filter(function(x) { return x.errorEvent != null && x.operation != null }).map(function(action) {
						events[action.errorEvent] = self.$services.swagger.resolve("#/definitions/StructuredErrorResponse");
					});
					this.page.content.actions.filter(function(action) {
						return nabu.page.event.getName(action, "chainEvent") != null;
					}).forEach(function(action) {
						var type = nabu.page.event.getType(action, "chainEvent");
						if (type.properties && Object.keys(type.properties).length == 0 && action.on) {
							type = action.on;
						}
						events[nabu.page.event.getName(action, "chainEvent")] = type;
					});
					this.page.content.actions.filter(function(action) {
						return nabu.page.event.getName(action, "timeoutEvent") != null;
					}).forEach(function(action) {
						var type = nabu.page.event.getType(action, "timeoutEvent");
						if (type.properties && Object.keys(type.properties).length == 0 && action.on) {
							type = action.on;
						}
						events[nabu.page.event.getName(action, "timeoutEvent")] = type;
					});
					this.page.content.actions.filter(function(action) {
						return nabu.page.event.getName(action, "downloadFailedEvent") != null;
					}).forEach(function(action) {
						var type = nabu.page.event.getType(action, "downloadFailedEvent");
						if (type.properties && Object.keys(type.properties).length == 0 && action.on) {
							type = action.on;
						}
						events[nabu.page.event.getName(action, "downloadFailedEvent")] = type;
					});
					this.page.content.actions.filter(function(action) {
						return action.function && action.functionOutputEvent;
					}).forEach(function(action) {
						events[action.functionOutputEvent] = self.$services.page.getFunctionOutputFull(action.function);
					});
				}
				
				// add the cell events
				this.page.content.rows.map(function(row) {
					self.getCellEvents(row, events);
				});
				
				Object.keys(this.components).map(function(cellId) {
					var component = self.components[cellId];
					var handle = function(component) {
						// pages will _not_ send their events by default to other pages (only through global events)
						// so this we skip the page components in this listing
						if (component && component.getEvents && !self.$services.page.isPage(component)) {
							var cellEvents = component.getEvents();
							if (cellEvents) {
								// if you have no particular content, you can just send the name of the event
								if (typeof(cellEvents) == "string") {
									events[cellEvents] = {};
								}
								else if (cellEvents instanceof Array) {
									// TODO: support arrays of strings and/or objects?
								}
								else {
									Object.keys(cellEvents).map(function(key) {
										events[key] = cellEvents[key];
									});
								}
							}
						}
					}
					if (component instanceof Array) {
						component.forEach(handle);
					}
					else {
						handle(component);
					}
				});
				Object.keys(events).map(function(name) {
					// because events can reference one another in circular fashion, we allow for event references
					// this means if the value is a string rather than an array of fields, we assume it is the name of another event and we should use those parameters
					if (typeof(events[name]) == "string") {
						if (events[events[name]]) {
							events[name] = events[events[name]];
						}
						else {
							console.warn("Can not find event: " + events[events[name]]);
							events[name] = {};
						}
					}
				});
				
				if (this.page.content.initialEvents) {
					this.page.content.initialEvents.forEach(function(event) {
						var name = nabu.page.event.getName(event, "definition");
						if (name) {
							events[name] = nabu.page.event.getType(event, "definition");
						}
					});
				}
				
				if (this.page.content.states) {
					this.page.content.states.forEach(function(state) {
						var name = nabu.page.event.getName(state, "updateEvent");
						if (name) {
							events[name] = nabu.page.event.getType(state, "updateEvent");
						}
					});
				}
				if (this.page.content.parameters) {
					this.page.content.parameters.forEach(function(parameter) {
						var name = nabu.page.event.getName(parameter, "updatedEvent");
						if (name) {
							events[name] = nabu.page.event.getType(parameter, "updatedEvent");
						}
					});
				}
			}
			return this.cachedEvents;
		},
		getCellEvents: function(cellContainer, events) {
			var self = this;
			if (cellContainer.cells) {
				cellContainer.cells.map(function(cell) {
					if (nabu.page.event.getName(cell, "clickEvent")) {
						events[nabu.page.event.getName(cell, "clickEvent")] = nabu.page.event.getType(cell, "clickEvent");
					}
					// <DEPRECATED>
					if (cell.clickEvent && typeof(cell.clickEvent) == "string") {
						events[cell.clickEvent] = {
							properties: {
								value: {
									type: "string"
								}
							}
						};
					}
					// </DEPRECATED>
					if (cell.rows) {
						cell.rows.map(function(row) {
							self.getCellEvents(row, events);
						});
					}
				});
			}
		},
		subscribe: function(event, handler) {
			if (!this.subscriptions[event]) {
				this.subscriptions[event] = [];
			}
			this.subscriptions[event].push(handler);
			var self = this;
			return function() {
				self.subscriptions[event].splice(self.subscriptions[event].indexOf(handler), 1);
			};
		},
		reset: function(name) {
			Vue.delete(this.variables, name);
		},
		calculateVariable: function(script) {
			try {
				return this.$services.page.eval(script, this.variables, this);
			}
			catch (exception) {
				console.warn("Could not execute script", script, exception);
				return null;
			}
		},
		// not sure anymore why this is necessary?
		// the clue seems to be that if a single field is update in a computed property, the entire property is emitted again as an event
		// the same can probably be done with chained events so it is not entirely clear if this is relevant?
		// perhaps it is for page forms or something? enable again if relevant
		// also check out 850: we seem to emit once a single binding is updated, but multiple bindings might be impacted? only one emit is necessary
		updatedVariable: function(name) {
			if (this.page.content.computed) {
				var self = this;
				this.page.content.computed.forEach(function(x) {
					if (x.refreshOn && x.refreshOn.indexOf(name) >= 0 && x.script) {
						self.$emit(name, calculateVariable(x.script));
					}
/*						var recalculate = false;
						// in theory there could be multiple, in really we currently only allow the one you defined explicitly
						var keys = Object.keys(x.bindings);
						// this ia short hack to do that, in the future we might want to do other stuff, the recalculate will need some work then
						keys = [x.name];
						for (var i = 0; i < keys.length; i++) {
							var binding = x.bindings[keys[i]];
							// if we have a dependency to it, reload it!!
							if (binding && typeof(binding) == "string") {
								if (binding == name || binding.indexOf(name + ".") == 0) {
									recalculate = true;
								}
							}
							else if (binding && binding.bindings) {
								var subKeys = Object.keys(binding.bindings);
								for (var j = 0; j < subKeys.length; j++) {
									var subBinding = binding.bindings[subKeys[j]];
									if (subBinding && (subBinding == name || subBinding.indexOf(name + ".") == 0)) {
										recalculate = true;
									}
								}
							}
							if (recalculate) {
								var value = self.$services.page.getBindingValue(self, binding, self);
								self.emit(x.name, value);
								break;
							}
						}*/
				});
			}
		},
		addComputed: function() {
			if (!this.page.content.computed) {
				Vue.set(this.page.content, "computed", []);
			}	
			this.page.content.computed.push({
				name: null,
				refreshOn: [],
				// bindings are deprecated?
				bindings: {},
				script: null
			});
		},
		isBinaryDownload: function(operationId) {
			var operation = this.$services.swagger.operations[operationId];
			return operation && operation.method == "get" && operation.produces && operation.produces.length && operation.produces[0] == "application/octet-stream";
		},
		emit: function(name, value, reset) {
			this.$services.page.report("emit", this.page.content.name, null, name, value);
			var self = this;

			// used to be a regular assign and that seemed to work as well?
			Vue.set(this.variables, name, value);
			this.updatedVariable(name);
			
			// check parameters that may listen to the given value
			// we don't want to trigger listeners if we are resetting an event, you must _explicitly_ choose to set a value to null if necessary
			if (this.page.content.parameters && !reset) {
				this.page.content.parameters.map(function(parameter) {
					// we want to ignore "partial" listeners (like if you added one and forgot to fill it in)
					parameter.listeners.filter(function(listener) { return listener.to != null || listener.split != null }).map(function(listener) {
						// backwards compatibility
						var parts = listener.to ? listener.to.split(".") : listener.split(".");
						// we are setting the variable we are interested in
						if (parts[0] == name) {
							var interested = value == null ? null : self.$services.page.getValue(value, listener.to ? listener.to.substring(parts[0].length + 1) : listener.substring(parts[0].length + 1));     
							if (listener.field) {
								self.$services.page.setValue(self.variables, parameter.name + "." + listener.field, interested);
							}
							else {
								if (interested == null) {
									Vue.delete(self.variables, parameter.name);
								}
								else {
									Vue.set(self.variables, parameter.name, interested);
								}
							}
						}
					})
				});
			}
			
			var promises = [];
			
			if (!reset) {
				if (this.page.content.analysis) {
					this.page.content.analysis.filter(function(x) { return x.on == name }).map(function(analysis) {
						if (analysis.condition && !self.$services.page.isCondition(analysis.condition, value, self)) {
							return;
						}
						var pageInstance = self.$services.page.getPageInstance(self.page, self);
						var content = nabu.page.event.getInstance(analysis, "chainEvent", self.page, self);
						self.$services.analysis.push({
							pageName: self.page.content.name,
							pageCategory: self.page.content.category,
							category: "trigger",
							type: "page-analysis",
							event: nabu.page.event.getName(analysis, "chainEvent"),
							// more consistent with the eventing backend
							content: content,
							// DEPRECATED: needed for backwards compatibility
							data: content
						});
					})
				}
				if (this.page.content.notifications) {
					this.page.content.notifications.filter(function(x) { return x.on == name }).map(function(notification) {
						if (notification.condition && !self.$services.page.isCondition(notification.condition, value, self)) {
							return;
						}
						var pageInstance = self.$services.page.getPageInstance(self.page, self);
						// we take a copy to enrich it (if necessary)
						var notificationContent = value ? nabu.utils.objects.clone(value) : {}; 
						var content = nabu.page.event.getInstance(notification, "chainEvent", self.page, self);
						if (content) {
							Object.keys(content).forEach(function(key) {
								notificationContent[key] = content[key];	
							});
						}
						// we clone the notification so we can enrich it with the data
						var result = nabu.utils.objects.clone(notification);
						// interpret the results
						Object.keys(result).forEach(function(key) {
							result[key] = self.$services.page.interpret(self.$services.page.translate(result[key]), self, notificationContent);
						});
						result.data = notificationContent;
						self.$services.notifier.push(result);
					})
				}
				// check all the actions to see if we need to run something
				this.page.content.actions.map(function(action) {
					
					if (action.on == name) {
						// if we have a condition, run it
						if (action.condition && !self.$services.page.isCondition(action.condition, value, self)) {
							return;
						}
						
						var promise = self.$services.q.defer();
						
						var runFunction = function() {
							if (action.isSlow) {
								self.$wait({promise: promise});
							}
							var func = self.$services.page.getRunnableFunction(action.function);
							if (!func) {
								throw "Could not find function: " + action.function; 
							}
							var input = {};
							if (action.bindings) {
								var pageInstance = self;
								Object.keys(action.bindings).forEach(function(key) {
									if (action.bindings[key]) {
										var value = self.$services.page.getBindingValue(pageInstance, action.bindings[key], self);
										self.$services.page.setValue(input, key, value);
									}
								});
							}
							var result = self.$services.page.runFunction(func, input, self, promise);
							if (action.functionOutputEvent) {
								var def = self.$services.page.getFunctionDefinition(action.function);
								if (def.async) {
									promise.then(function(asyncResult) {
										self.emit(action.functionOutputEvent, asyncResult ? asyncResult : {});
									});
								}
								else {
									self.emit(action.functionOutputEvent, result ? result : {});
								}
							}
							return result;
						}
						
						var runScript = function() {
							if (action.script) {
								var script = action.script;
								// if we don't wrap it in a function, it might only execute the first line
								// when dealing with formatting or conditions that might be wanted
								// however, in this location we want to execute a full script, we are not assigning or conditioning
								if (script.trim().indexOf("function") != 0) {
									script = "function(){ " + script + "}";
								}
								self.$services.page.eval(script, self.variables, self);
							}
						}
						
						promises.push(promise);
						var parameters = {};
						Object.keys(action.bindings).map(function(key) {
							self.$services.page.setValue(parameters, key, self.$services.page.getBindingValue(self, action.bindings[key]));
						});
						
						var eventReset = function() {
							// if we are emitting a "null" value for the current event, we don't want to trigger the reset listeners!
							if (action.eventResets != null && value != null) {
								action.eventResets.forEach(function(event) {
									self.emit(event, null, true);
								});
							}
						};
						
						var date = new Date();
						var stop = function(error) {
							if (action.name) {
								self.$services.analysis.push({
									pageName: self.page.content.name,
									pageCategory: self.page.content.category,
									category: "trigger",
									type: "page-trigger",
									event: action.name
								});
							}
							// DEPRECATED
							if (self.$services.analysis && self.$services.analysis.emit && action.name) {
								self.$services.analysis.emit("trigger-" + self.page.name, action.name, 
									{time: new Date().getTime() - date.getTime(), error: error}, true);
							}
						};
						
						if (nabu.page.event.getName(action, "chainEvent")) {
							promise.then(function() {
								var pageInstance = self.$services.page.getPageInstance(self.page, self);
								var content = nabu.page.event.getInstance(action, "chainEvent", self.page, self);
								if (Object.keys(content).length == 0) {
									content = value;
								}
								var doIt = function() {
									pageInstance.emit(
										nabu.page.event.getName(action, "chainEvent"),
										content
									);
								}
								if (action.chainTimeout) {
									setTimeout(doIt, parseInt(action.chainTimeout));
								}
								else {
									doIt();
								}
							});
						}
						promise.then(function() { stop() }, function(error) { stop(error) });
						
						var wait = !action.timeout || !nabu.page.event.getName(action, "timeoutEvent") ? null : function() {
							var content = nabu.page.event.getInstance(action, "timeoutEvent", self.page, self);
							if (Object.keys(content).length == 0) {
								content = value;
							}
							self.emit(
								nabu.page.event.getName(action, "timeoutEvent"),
								content
							);
						}
						
						var emitDownloadFailed = function() {
							if (nabu.page.event.getName(action, "downloadFailedEvent")) {
								self.emit(
									nabu.page.event.getName(action, "downloadFailedEvent"),
									nabu.page.event.getInstance(action, "downloadFailedEvent", self.page, self)
								);
							}
						}
						
						if (action.confirmation) {
							self.$confirm({message:self.$services.page.translate(self.$services.page.interpret(action.confirmation, self))}).then(function() {
								if (wait) {
									self.$services.q.wait(promise, parseInt(action.timeout), wait);
								}
								var element = null;
								var async = false;
								// already get the element, it can be triggered with or without a route
								if (action.scroll) {
									var element = document.querySelector(action.scroll);
									if (!element) {
										element = document.getElementById(action.scroll);
									}
								}
								if (action.url) {
									var url = self.$services.page.interpret(action.url, self);
									if (action.anchor == "$blank") {
										window.open(url);
									}
									else {
										window.location = url;
									}
								}
								else if (action.route) {
									var routePromise = null;
									eventReset();
									if (action.anchor == "$blank") {
										window.open(self.$services.router.template(action.route, parameters));
									}
									else if (action.anchor == "$window") {
										window.location = self.$services.router.template(action.route, parameters);
									}
									else {
										routePromise = self.route(action.route, parameters, action.anchor ? action.anchor : null, action.anchor ? true : false);
									}
									if (element) {
										if (routePromise && routePromise.then) {
											routePromise.then(function() {
												element.scrollIntoView();
											});
										}
										else {
											element.scrollIntoView();
										}
									}
								}
								else if (action.scroll) {
									eventReset();
									if (element) {
										element.scrollIntoView();
									}
								}
								else if (action.operation && self.isGet(action.operation) && action.anchor == "$blank") {
									window.open(self.$services.swagger.parameters(action.operation, parameters).url, "_blank");
								}
								else if (action.operation) {
									if (action.isSlow) {
										self.$wait({promise: promise});
									}
									var operation = self.$services.swagger.operations[action.operation];
									// currently we hardcode an exception for this service
									// in the future we should use swagger extensions to mark the id & secret fields for downloads with temporary authentication
									// that way we can support it for more services
									if (operation.operationId == "nabu.cms.attachment.rest.internal.get") {
										this.$services.attachment.download(parameters.nodeId, parameters.attachmentId);
										eventReset();
									}
									else if (operation.method == "get" && operation.produces && operation.produces.length && operation.produces[0] == "application/octet-stream") {   
										if (action.anchor != "$window") {
											self.$services.page.download(self.$services.swagger.parameters(action.operation, parameters).url, emitDownloadFailed);
										}
										else {
											window.location = self.$services.swagger.parameters(action.operation, parameters).url;
										}
										eventReset();
									}
									else {
										async = true;
										self.$services.swagger.execute(action.operation, parameters).then(function(result) {
											if (action.singlify) {
												var arr = self.$services.page.getValue(result, action.singlify);
												result = arr && arr.length > 0 ? arr[0] : null;
											}
											if (action.event) {
												// we get null from a 204
												self.emit(action.event, result == null ? {} : result);
											}
											eventReset();
											promise.resolve(result);
										}, function(error) {
											if (action.errorEvent) {
												self.emit(action.errorEvent, error);
											}
											promise.reject(error);
										});
									}
								}
								else if (action.function) {
									runFunction();
								}
								else {
									eventReset();
								}
								runScript();
								if (!async) {
									promise.resolve();
								}
							}, function() {
								promise.reject();
							})
						}
						else {
							if (wait) {
								self.$services.q.wait(promise, parseInt(action.timeout), wait);
							}
							var async = false;
							if (action.url) {
								var url = self.$services.page.interpret(action.url, self);
								if (action.anchor) {
									window.open(url);
								}
								else {
									window.location = url;
								}
							}
							else if (action.scroll) {
								eventReset();
								var element = document.querySelector(action.scroll);
								if (!element) {
									element = document.getElementById(action.scroll);
								}
								if (element) {
									element.scrollIntoView();
								}
							}
							else if (action.route) {
								eventReset();
								if (action.anchor == "$blank") {
									window.open(self.$services.router.template(action.route, parameters));
								}
								else if (action.anchor == "$window") {
									window.location = self.$services.router.template(action.route, parameters);
								}
								else {
									self.route(action.route, parameters, action.anchor ? action.anchor : null, action.anchor ? true : false);
								}
							}
							else if (action.operation && self.isGet(action.operation) && action.anchor == "$blank") {
								window.open(self.$services.swagger.parameters(action.operation, parameters).url, "_blank");
							}
							else if (action.operation) {
								if (action.isSlow) {
									self.$wait({promise: promise});
								}
								var operation = self.$services.swagger.operations[action.operation];
								if (operation.operationId == "nabu.cms.attachment.rest.internal.get") {
									this.$services.attachment.download(parameters.nodeId, parameters.attachmentId);
									eventReset();
								}
								else if (operation.method == "get" && operation.produces && operation.produces.length && operation.produces[0] == "application/octet-stream") {
									if (action.anchor != "$window") {
										self.$services.page.download(self.$services.swagger.parameters(action.operation, parameters).url, emitDownloadFailed);
									}
									else {
										window.location = self.$services.swagger.parameters(action.operation, parameters).url;
									}
									eventReset();
								}
								else {
									async = true;
									self.$services.swagger.execute(action.operation, parameters).then(function(result) {
										if (action.singlify) {
											var arr = self.$services.page.getValue(result, action.singlify);
											result = arr && arr.length > 0 ? arr[0] : null;
										}
										if (action.event) {
											// we get null from a 204
											self.emit(action.event, result == null ? {} : result);
										}
										eventReset();
										promise.resolve(result);
									}, function(error) {
										if (action.errorEvent) {
											self.emit(action.errorEvent, error);
										}
										promise.reject(error);
									});
								}
							}
							else if (action.function) {
								runFunction();
							}
							else {
								eventReset();
							}
							runScript();
							if (!async) {
								promise.resolve();
							}
						}
					}
				});
			}
			
			if (this.subscriptions[name]) {
				this.subscriptions[name].map(function(handler) {
					var result = handler(value);
					if (result && result.then) {
						promises.push(result);
					}
				});
			}
			
			// check states that have to be refreshed
			if (this.page.content.states.length && !reset) {
				var sendStateEvent = function(state) {
					if (nabu.page.event.getName(state, "updateEvent")) {
						self.emit(
							nabu.page.event.getName(state, "updateEvent"),
							nabu.page.event.getInstance(state, "updateEvent", self.page, self)
						);
					}
				}
				nabu.utils.arrays.merge(promises, this.page.content.states.filter(function(x) { 
					return x.refreshOn != null && x.refreshOn.indexOf(name) >= 0
						&& (!x.condition || self.$services.page.isCondition(x.condition, self.variables, self));
				}).map(function(state) {
					if (state.inherited) {
						return self.$services.page.reloadState(state.applicationName).then(function(result) {
							//Vue.set(self.variables, state.name, result ? result : null);
							sendStateEvent(state);
						});
					}
					else {
						var parameters = {};
						Object.keys(state.bindings).map(function(key) {
							parameters[key] = self.$services.page.getBindingValue(self, state.bindings[key]);
						});
						try {
							// can throw hard errors
							return self.$services.swagger.execute(state.operation, parameters).then(function(result) {
								if (self.variables[state.name] != null) {
									if (self.variables[state.name] instanceof Array) {
										self.variables[state.name].splice(0);
										if (result instanceof Array) {
											nabu.utils.arrays.merge(self.variables[state.name], result);
										}
										else if (result) {
											self.variables[state.name].push(result);
										}
									}
									// can be resetting to null
									else if (!result) {
										Vue.set(self.variables, state.name, null);
									}
									else {
										var resultKeys = Object.keys(result);
										Object.keys(self.variables[state.name]).forEach(function(key) {
											if (resultKeys.indexOf(key) < 0) {
												self.variables[state.name][key] = null;
											}
										});
										// make sure we use vue.set to trigger other reactivity
										resultKeys.forEach(function(key) {
											Vue.set(self.variables[state.name], key, result[key]);
										});
										// TODO: do a proper recursive merge to maintain reactivity with deeply nested
										
										//nabu.utils.objects.merge(self.variables[state.name], result);
									}
								}
								else {
									Vue.set(self.variables, state.name, result ? result : null);
								}
								sendStateEvent(state);
							});
						}
						catch (exception) {
							console.error("Could not execute", state.operation, exception);
							var promise = self.$services.q.defer();
							promise.reject(exception);
							return promise;
						}
					}
				}));
			}
			
			// remove all the closed stuff for this event, we may want to reopen something
			Object.keys(this.closed).map(function(key) {
				if (self.closed[key] == name) {
					Vue.set(self.closed, key, null);
				}
			});
			return this.$services.q.all(promises).then(function() {
				if (self.page.content.globalEvents && !reset) {
					var globalEvent = self.page.content.globalEvents.filter(function(x) {
						return x.localName == name;
					})[0];
					if (globalEvent) {
						self.$services.page.emit(globalEvent.globalName ? globalEvent.globalName : name, value, reset);
					}
				}
			});
		},
		addGlobalEvent: function() {
			if (!this.page.content.globalEvents) {
				Vue.set(this.page.content, "globalEvents", []);
			}
			this.page.content.globalEvents.push({localName: null, globalName: null});
		},
		addGlobalEventSubscription: function() {
			if (!this.page.content.globalEventSubscriptions) {
				Vue.set(this.page.content, "globalEventSubscriptions", []);
			}
			this.page.content.globalEventSubscriptions.push({localName: null, globalName: null});
		},
		get: function(name) {
			// probably not filled in the value yet
			if (!name) {
				return null;
			}
			if (name == "page") {
				return this.variables;
			}
			else if (name == "page.$this") {
				return this;
			}
			else if (name == "parent") {
				var parentInstance = this.page.content.pageParent ? this.$services.page.getPageInstanceByName(this.page.content.pageParent) : null;
				return parentInstance ? parentInstance.variables : null;
			}
			else if (name == "application.title") {
				return this.$services.page.title;
			}
			else if (name.indexOf("application.") == 0) {
				var name = name.substring("application.".length);
				var value = this.$services.page.properties.filter(function(x) {
					return x.key == name;
				})[0];
				if (value == null) {
					value = this.$services.page.environmentProperties.filter(function(x) {
						return x.key == name;
					})[0];
				}
				return value ? value.value : null;
			}
			else if (name.indexOf("parent.") == 0) {
				// TODO: to be verified that this work in a stable way
				// the problem we have is: you want to persist state at for example the skeleton level
				// however, some pages might be nested in other pages (especially page components)
				// they don't need to / want to know the depth at which they are rendered (and this may differ)
				// so instead of going up 1 level, we want to check all levels until we find a match
				// the potential problems can arise if there is a recursive loop possibly in this structure
				var name = name.substring("parent.".length);
				var parentInstance = this.page.content.pageParent ? this.$services.page.getPageInstanceByName(this.page.content.pageParent) : null;
				var result = parentInstance ? parentInstance.get("page." + name) : null;
				if (result == null) {
					var parentInstance = this.$services.page.getParentPageInstance(parentInstance ? parentInstance.page : this.page, parentInstance ? parentInstance : this);
					if (parentInstance) {
						result = parentInstance.get("parent." + name);
					}
				}
				return result;
			}
			else if (name.indexOf("page.") == 0) {
				var name = name.substring("page.".length);
				var dot = name.indexOf(".");
				var localName = dot >= 0 ? name.substring(0, dot) : name;
				var relativeName = dot >= 0 ? name.substring(dot + 1) : null;
				var applicationProperty = this.$services.page.properties.filter(function(property) {
					return property.key == localName;
				})[0];
				var pageParameter = this.page.content.parameters ? this.page.content.parameters.filter(function(parameter) {
					return parameter.name == localName;
				})[0] : null;
				var stateParameter = this.page.content.states ? this.page.content.states.filter(function(state) { return state.name == localName })[0] : null;
				
				var result = null;
				if (applicationProperty) {
					result = applicationProperty.value;
				}
				else if (pageParameter != null) {
					result = this.variables[pageParameter.name];
				}
				else if (stateParameter != null) {
					result = this.variables[stateParameter.name];
				}
				else {
					result = this.parameters[name];
				}
				if (result != null && relativeName != null) {
					var parts = relativeName.split(".");
					for (var i = 0; i < parts.length; i++) {
						result = result[parts[i]];
						if (result == null) {
							break;
						}
					}
				}
				return result;
			}
			// we want an entire variable
			else if (name.indexOf(".") < 0) {
				return this.variables[name];
			}
			// we still want an entire variable
			else if (name.indexOf(".$all") >= 0) {
				return this.variables[name.substring(0, name.indexOf(".$all"))];
			}
			// note: currently this is slightly out of sync with "page." logic
			// the problem is if you simply do get("queryParameter"), it won't work
			// because query paramters are not available in variables
			// solution 1: copy all page parameters to variables (this is likely the best option though it may break reactivity of query parameters?)
			// solution 2: add resolving here to also check the page parameters.
			// workaround: use "page.queryParameter" syntax to resolve (currently used until decision is made) for example by page form components
			// note that set() also suffers from the same problem it seems!
			else {
				var parts = name.split(".");
				if (this.variables[parts[0]]) {
					var value = this.variables[parts[0]];
					for (var i = 1; i < parts.length; i++) {
						if (value) {
							if (value instanceof Array) {
								value = value.map(function(x) { return x[parts[i]] });
							}
							else {
								value = value[parts[i]];
							}
						}
					}
					return value;
				}
				else {
					var result = null;
					// check if there is a provider for it
					nabu.page.providers("page-bindings").map(function(provider) {
						var provided = provider();
						if (Object.keys(provided.definition).indexOf(parts[0]) >= 0) {
							result = provided.resolve(name.substring(name.indexOf(".") + 1));
						}
					});
					return result;
				}
			}
		},
		saveTranslatedContent: function(content) {
			if (this.saveContentTimer) {
				clearTimeout(this.saveContentTimer);
				this.saveContentTimer = null;
			}
			this.saveContents.push(content);
			var self = this;
			this.saveContentTimer = setTimeout(function() {
				var contents = self.saveContents.splice(0);
				var save = function() {
					self.$services.swagger.execute("nabu.web.page.core.rest.configuration.updateContent", {
						body: {
							contents: contents
						}
					}).then(function(response) {
						// do nothing
					}, function(error) {
						self.$confirm({
							message: "Your content could not be saved, do you want to try again?"
						}).then(save)
					});
				};
				save();
			}, 300);
		},
		savePage: function() {
			if (this.savePageTimer) {
				clearTimeout(this.savePageTimer);
				this.savePageTimer = null;
			}
			var self = this;
			this.savePageTimer = setTimeout(function() {
				self.$services.page.update(self.page);
			}, 300);
		},
		isDevelopment: function() {
			return ${environment("development")};	
		},
		hasLanguageSet: function() {
			// the current value can be automatically deduced from the browser settings instead of an active choice by the user
			// the cookieValue is only present if the user has actively chosen a language so check that to allow "unsetting" of the value for json manipulation
			return this.$services.language.current && this.$services.language.cookieValue;
		},
		// the idea was to force the user to select a language if none is selected
		// this however may not be possible if the site does not actually support multiple languages (the language service is always injected if you have CMS)
		triggerConfiguration: function() {
			// if you trigger the $configure event, it is usually for page parameter editing
			// if you don't have a selected language, the result will be stored in the JSON itself
			// this is OK (and intended) for development to have default content but not OK in for example qlty where:
			// a) you might be in a cluster (and only save the json on one server) 
			// b) changes are overwritten on the next deployment
			// so if there is no language service alltogether, we have no option but to store it in the json
			// otherwise you can only "not" have a language if you are in development mode
			if (this.isDevelopment() || !this.$services.language || this.$services.language.current) {
				this.emit("$configure", {});
			}
			else {
				this.$confirm({
					message: "You must select a language"
				});
			}
		},
		set: function(name, value) {
			var target = null;
			var parts = null;
			var updateUrl = false;
			// update something in the page parameters
			if (name.indexOf && name.indexOf("page.") == 0) {
				if (!this.masked) {
					updateUrl = true;
				}
				var pageParameter = this.page.content.parameters ? this.page.content.parameters.filter(function(parameter) {
					return parameter.name == name.substring("page.".length).split(".")[0];
				})[0] : null;
				if (pageParameter) {
					target = this.variables;
					// also set it as the default value if in edit mode or light edit mode
					// we no longer support this?
					if (false && (this.edit || (this.$services.page.canEdit() && this.$services.page.wantEdit))) {
						// if we have no language service, update the default value
						// alternatively if we have explicitly not selected a language and we are in development mode, we want to set the default as well
						// if however we are not in development mode, these are also sent to the backend and saved in the default language (that must be configured)
						if (!this.$services.language || (!this.hasLanguageSet() && ${environment("development")})) {
							pageParameter.default = value;
							// if we are in light edit mode, save the page automatically because there is no save button
							if (!this.edit && this.$services.page.canEdit() && this.$services.page.wantEdit) {
								this.savePage();
							}
						}
						// we have a language selected, save the value for that language
						else {
							this.saveTranslatedContent({
								page: pageParameter.global ? null : this.page.name,
								key: pageParameter.name,
								content: value
							});
						}
					}
				}
				else if (this.$services.page.isPublicPageParameter(this.page, name.substring("page.".length))) {
					// check if it is explicitly a query or path parameter, if not, we still put it in the variables!!
					// otherwise we might accidently update the parameters object which is passed along to all children
					target = this.parameters;
				}
				else {
					target = this.variables;
				}
				parts = name.substring("page.".length).split(".");
			}
			else if (name.split) {
				parts = name.split(".");
				target = this.variables;
			}
			// TODO: if single input, single output => can automatically bypass transformer?
			// or set a reverse transformer?
			// for now, transformers are only for going forward, not syncing data back, use events + reload if needed atm
			if (parts && target) {
				for (var i = 0; i < parts.length - 1; i++) {
					if (!target[parts[i]]) {
						Vue.set(target, parts[i], {});
					}
					target = target[parts[i]];
				}
				Vue.set(target, parts[parts.length - 1], value);
				if (updateUrl) {
					var route = this.$services.router.get(this.$services.page.alias(this.page));
					if (route.url != null) {
						this.$services.router.router.updateUrl(
							route.alias,
							route.url,
							this.parameters,
							route.query)
					}
				}
				var self = this;
				// if we have a page variable update, check if we have any subscribers
				if (name.indexOf && name.indexOf("page.") == 0) {
					// we want to alert anyone listening to a parent as well that something has changed
					while (name != null) {
						if (this.subscriptions[name]) {
							var valueToEmit = self.get(name);
							console.log("subscriber", name, valueToEmit);
							this.subscriptions[name].forEach(function(handler) {
								handler(valueToEmit);
							});
						}
						var index = name.lastIndexOf(".");
						if (index < 0) {
							name = null;
							break;
						}
						else {
							name = name.substring(0, index);
						}
					}
				}
			}
			else {
				console.log("Could not set", name, value);
			}
		},
		pageContentTag: function() {
			if (!this.page.content.pageType || this.page.content.pageType == "page") {
				return null;
			}
			var self = this;
			var provider = nabu.page.providers("page-type").filter(function(x) {
				return x.name == self.page.content.pageType;
			})[0];
			return provider ? provider.pageContentTag : null;
		},
		pageTag: function() {
			// the default
			if (!this.page.content.pageType || this.page.content.pageType == "page") {
				return "div";
			}
			var self = this;
			var provider = nabu.page.providers("page-type").filter(function(x) {
				return x.name == self.page.content.pageType;
			})[0];
			// special override for editing purposes
			if (this.edit && provider && provider.pageTagEdit) {
				return provider.pageTagEdit;
			}
			return provider && provider.pageTag ? provider.pageTag : "div";
		},
		getPageTypes: function(value) {
			var items = ['page'];
			nabu.utils.arrays.merge(items, nabu.page.providers("page-type").map(function(x) { return x.name }));
			if (value) {
				items = items.filter(function(x) { return x.toLowerCase().indexOf(value.toLowerCase()) >= 0 });
			}
			return items;
		}
	},
	watch: {
		/*parameters: function(newValue) {
			var oldValue = JSON.parse(this.lastParameters);
			var changedValues = [];
			// find all the fields that have changed
			Object.keys(newValue).map(function(name) {
				if (oldValue[name] != newValue[name]) {
					changedValues.push("page." + name);
				}
			});
			this.lastParameters = JSON.stringify(newValue);
			//this.rerender(changedValues);
		},*/
		'page.content.globalEvents': {
			deep: true,
			handler: function(newValue) {
				var self = this;
				if (newValue) {
					newValue.forEach(function(globalEvent) {
						globalEvent.properties = self.getEvents()[globalEvent.localName];
					});
				}
			}
		},
		bodyClasses: function (newVal) {
			var self = this;
			// the context is important here, it has to be the classList object itself
			// otherwise you get an exception like "illegal invocation"
			document.body.classList.remove.apply(document.body.classList, self.oldBodyClasses.splice(0));
			document.body.classList.add.apply(document.body.classList, newVal);
			nabu.utils.arrays.merge(self.oldBodyClasses, newVal);
		}
	}
});

nabu.page.views.PageRows = Vue.component("n-page-rows", {
	template: "#page-rows",
	props: {
		page: {
			type: Object,
			required: true
		},
		rows: {
			type: Array,
			required: true
		},
		edit: {
			type: Boolean,
			required: false
		},
		parameters: {
			type: Object,
			required: false
		},
		events: {
			type: Object,
			required: true
		},
		// pass in state that is built up in rows/cells above (e.g. repeats)
		localState: {
			type: Object,
			required: false
		},
		root: {
			type: Boolean,
			required: false,
			default: false
		},
		stopRerender: {
			type: Boolean,
			required: false,
			default: false
		},
		depth: {
			type: Number,
			default: 0
		}
	},
	data: function() {
		return {
			configuring: null
		}
	},
	created: function() {
		var self = this;
		this.$on("close", function() {
			self.$parent.$emit("close");
		});
	},
	methods: {
		suggesPageRowClasses: function(value) {
			return this.$services.page.classes("page-row", value).filter(function(x) {
				return ["empty", "hover-top", "hover-bottom", "hover-left", "hover-right", "hovering"].indexOf(x) < 0;
			});
		},
		drop: function(event, row) {
			var self = this;
			var data = this.$services.page.getDragData(event, "component-alias");
			var rowTarget = document.getElementById(this.page.name + '_' + row.id);
			var rect = rowTarget.getBoundingClientRect();
			var below = Math.abs(event.clientY - rect.top) >= rect.height - (rect.height / 6);
			var above = Math.abs(event.clientY - rect.top) <= rect.height / 6;
			var left = Math.abs(event.clientX - rect.left) <= rect.width / 6;
			var right = Math.abs(event.clientX - rect.left) >= rect.width - (rect.width / 6);
			if (data) {
				// if we inserted at bottom, get the parent, insert behind it
				if (below) {
					var parent = this.$services.page.getTarget(this.page.content, row.id, true);
					var index = parent.rows.indexOf(row);
					row = this.addRow(parent, true);
					parent.rows.splice(index + 1, 0, row);
				}
				// position above it
				else if (above) {
					var parent = this.$services.page.getTarget(this.page.content, row.id, true);
					var index = parent.rows.indexOf(row);
					row = this.addRow(parent, true);
					parent.rows.splice(index, 0, row);
				}
				var cell = this.addCell(row);
				cell.alias = data;
				event.preventDefault();
				event.stopPropagation();
			}
			else {
				data = this.$services.page.getDragData(event, "template-content");
				if (data) {
					var structure = JSON.parse(data);
					if (structure.type == "page-row") {
						structure = structure.content;
					}
					if (structure.rows) {
						var rows = structure.rows.map(function(x) { return self.$services.page.renumber(self.page, x) });
						var parent = this.$services.page.getTarget(this.page.content, row.id, true);
						var index = parent.rows.indexOf(row);
						if (below) {
							rows.unshift(0);
							rows.unshift(index + 1);
							parent.rows.splice.apply(null, rows);
							//parent.rows.splice(index + 1, 0, structure);
						}
						else if (above) {
							rows.unshift(0);
							rows.unshift(index);
							parent.rows.splice.apply(null, rows);
							//parent.rows.splice(index, 0, structure);
						}
						else {
							var cell = this.addCell(row);
							nabu.utils.arrays.merge(cell.rows, rows);
							//cell.rows.push(structure);
						}
					}
					else if (structure.cells) {
						var cells = structure.cells.map(function(x) { return self.$services.page.renumber(self.page, x) });
						var parent = this.$services.page.getTarget(this.page.content, row.id, true);
						var index = parent.rows.indexOf(row);
						if (below) {
							// there is nothing underneath, let's add a row
							if (index >= parent.rows.length - 1) {
								row = self.addRow(parent);
							}
							else {
								row = self.addRow(parent, true);
								parent.rows.splice(index + 1, 0, row);
							}
						}
						else if (above) {
							if (index == 0) {
								row = self.addRow(parent, true);
								parent.rows.unshift(row);
							}
							else {
								row = self.addRow(parent, true);
								parent.rows.splice(index, 0, row);
							}
						}
						nabu.utils.arrays.merge(row.cells, cells);
						if (!row.name) {
							row.name = structure.name;
						}
					}
					if (structure.actions) {
						nabu.utils.arrays.merge(this.page.content.actions, structure.actions);
					}
					event.preventDefault();
					event.stopPropagation();
				}
			}
		},
		dragOver: function($event, row) {
			var data = this.$services.page.hasDragData($event, "component-alias");
			if (!data) {
				data = this.$services.page.hasDragData($event, "template-content");
			}
			// TODO: in the future also drop page-cell and page-row from the side menu?
			if (data) {
				var self = this;
				var rowTarget = document.getElementById(self.page.name + '_' + row.id);
				this.$services.page.pushDragItem(rowTarget);
				var rect = rowTarget.getBoundingClientRect();
				rowTarget.classList.remove("hovering", "hover-top", "hover-bottom", "hover-left", "hover-right");
				// bottom 15%, highlight bottom
				if (Math.abs(event.clientY - rect.top) >= rect.height - (rect.height / 6)) {
					rowTarget.classList.add("hover-bottom");
				}
				// top 15%, highlight top
				else if (Math.abs(event.clientY - rect.top) <= rect.height / 6) {
					rowTarget.classList.add("hover-top");
				}
				// not yet sure what this would entail
				/*
				// left 15%
				else if (Math.abs(event.clientX - rect.left) <= rect.width / 6) {
					rowTarget.classList.add("hover-left");
				}
				// right 15%
				else if (Math.abs(event.clientX - rect.left) >= rect.width - (rect.width / 6)) {
					rowTarget.classList.add("hover-right");
				}
				*/
				else {
					rowTarget.classList.add("hovering");
				}
				$event.preventDefault();
				$event.stopPropagation();
			}
		},
		dragExit: function($event, row) {
			var self = this;
			var rowTarget = document.getElementById(self.page.name + '_' + row.id);
			if (rowTarget) {
				rowTarget.classList.remove("hovering");
			}
			$event.preventDefault();
			$event.stopPropagation();
		},
		hasConfigure: function(cell) {
			var self = this;
			var pageInstance = self.$services.page.getPageInstance(self.page, self);
			var cellInstance = pageInstance.getComponentForCell(cell.id);
			return cellInstance && cellInstance.configure;
		},
		setRowConfiguring: function(id) {
			this.configuring = id;	
		},
		getRendererProperties: function(container) {
			return container.rendererProperties != null ? container.rendererProperties : {};	
		},
		getRendererPropertyKeys: function(container) {
			if (!container.renderer) {
				return {};
			}
			if (!container.rendererProperties) {
				Vue.set(container, "rendererProperties", {});
			}
			var renderer = nabu.page.providers("page-renderer").filter(function(x) { return x.name == container.renderer })[0];
			if (renderer == null) {
				return {};
			}
			return renderer.properties ? renderer.properties : [];
		},
		// type is cell or row (currently)
		getRenderers: function(type) {
			return nabu.page.providers("page-renderer").filter(function(x) { return x.type == null || x.type == type || (x.type instanceof Array && x.type.indexOf(type) >= 0) });
		},
		rowsTag: function() {
			if (this.depth > 0 || !this.page.content.pageType || this.page.content.pageType == "page") {
				return "div";	
			}
			var self = this;
			var provider = nabu.page.providers("page-type").filter(function(x) {
				return x.name == self.page.content.pageType;
			})[0];
			// special override for editing purposes
			if (this.edit && provider && provider.pageContentTagEdit) {
				return provider.pageContentTagEdit;
			}
			return provider && provider.pageContentTag ? provider.pageContentTag : "div";
		},
		rowTagFor: function(row) {
			var renderer = row.renderer == null ? null : nabu.page.providers("page-renderer").filter(function(x) { return x.name == row.renderer })[0];
			if (this.edit || renderer == null) {
				if (!this.page.content.pageType || this.page.content.pageType == "page") {
					return "div";	
				}
				var self = this;
				var provider = nabu.page.providers("page-type").filter(function(x) {
					return x.name == self.page.content.pageType;
				})[0];
				// if it is a function, we can do more stuff
				if (provider && provider.rowTag instanceof Function) {
					return provider.rowTag(row, this.depth, this.edit);
				}
				// special override for editing purposes
				else if (this.edit && provider && provider.rowTagEdit) {
					return provider.rowTagEdit;
				}
				return provider && provider.rowTag ? provider.rowTag : "div";
			}
			else {
				return renderer.component;
			}
		},
		cellTagFor: function(row, cell) {
			var renderer = cell.renderer == null ? null : nabu.page.providers("page-renderer").filter(function(x) { return x.name == cell.renderer })[0];
			if (this.edit || renderer == null) {
				if (!this.page.content.pageType || this.page.content.pageType == "page") {
					return "div";	
				}
				var self = this;
				var provider = nabu.page.providers("page-type").filter(function(x) {
					return x.name == self.page.content.pageType;
				})[0];
				// if it is a function, we can do more stuff
				if (provider && provider.cellTag instanceof Function) {
					return provider.cellTag(row, cell, this.depth, this.edit);
				}
				// special override for editing purposes
				else if (this.edit && provider && provider.cellTagEdit) {
					return provider.cellTagEdit;
				}
				return provider && provider.cellTag ? provider.cellTag : "div";
			}
			else {
				return renderer.component;
			}
		},
		getInstance: function() {
			return this.$services.page.instances[this.name];	
		},
		getState: function(row, cell) {
			var self = this;
			var localState = this.getLocalState(row, cell);
			var pageInstance = self.$services.page.getPageInstance(self.page, self);
			Object.keys(pageInstance.variables).map(function(key) {
				if (typeof(localState[key]) == "undefined") {
					localState[key] = pageInstance.variables[key];
				}
			});
			var page = this.$services.page.getPageParameterValues(this.page, pageInstance);
			if (Object.keys(page).length) {
				localState.page = page;
			}
			return localState;
		},
		getLocalState: function(row, cell) {
			var state = {};
			// inherit state from above
			if (this.localState) {
				var self = this;
				Object.keys(this.localState).map(function(key) {
					state[key] = self.localState[key];
				});
			}
			// add local state of row
			if (row && row.data) {
				Object.keys(row.data).map(function(key) {
					state[key] = row.data[key];
				})
			}
			// add local state of cell
			if (cell && cell.data) {
				Object.keys(cell.data).map(function(key) {
					state[key] = cell.data[key];
				})
			}
			return state;
		},
		// can't be a computed cause we depend on the $parent to resolve some variables
		// and that's not reactive...
		getCalculatedRows: function() {
			// if we are in edit mode, we don't actually calculate rows
			if (this.edit) {
				return this.rows;
			}
			else {
				return this.mapCalculated(this.rows);
			}
		},
		mapCalculated: function(list) {
			var self = this;
			var result = [];
			var pageInstance = self.$services.page.getPageInstance(self.page, self);
			if (!pageInstance) {
				return result;
			}
			list.map(function(entry) {
				// no local state, just push it
				if (!entry.instances || !Object.keys(entry.instances).length) {
					result.push(entry);
				}
				else {
					var key = Object.keys(entry.instances)[0];
					// it is possible that you have not yet filled in a field here
					if (entry.instances[key]) {
						var parts = entry.instances[key].split(".");
						var parent = self.$parent;
						var value = null;
						var found = false;
						while (parent) {
							if (parent.data && parent.data[parts[0]]) {
								found = true;
								value = parent.data;
								parts.map(function(single) {
									if (value) {
										value = value[single];
									}
								});
								break;
							}
							parent = parent.$parent;
						}
						if (!found) {
							value = pageInstance.get(entry.instances[key]);
						}
						if (value instanceof Array) {
							var counter = 0;
							value.map(function(single) {
								var newEntry = {};
								Object.keys(entry).map(function(key) {
									newEntry[key] = entry[key];
								});
								newEntry.data = {};
								newEntry.data[key] = single;
								newEntry.id += "-" + counter++;
								result.push(newEntry);
							})
						}
					}
				}
			});
			return result;
		},
		getCalculatedCells: function(row) {
			if (this.edit) {
				return row.cells;
			}
			else {
				return this.mapCalculated(row.cells);
			}
		},
		getSideBarStyles: function(cell) {
			var styles = [];
			if (cell.width != null) {
				if (typeof(cell.width) == "number" || (cell.width.match && cell.width.match(/^[0-9.]+$/))) {
					styles.push({'flex-grow': cell.width});
				}
				else {
					styles.push({'min-width': cell.width});
				}
			}
			return styles;
		},
		getStyles: function(cell) {
			var width = typeof(cell.width) == "undefined" ? 1 : cell.width;
			var styles = [];
			if (width != null) {
				if (typeof(width) == "number" || (width.match && width.match(/^[0-9.]+$/))) {
					styles.push({'flex-grow': width});
				}
				else {
					styles.push({'min-width': width});
				}
			}
			if (cell.height) {
				styles.push({'height': cell.height});
			}
			if (false && (this.edit || this.$services.page.wantEdit) && cell.name) {
				styles.push({"border": "solid 2px " + this.getNameColor(cell.name), "border-style": "none solid solid solid"})
			}
			return styles;
		},
		hasPageRoute: function(cell) {
			if (cell.alias) {
				var route = this.$services.router.get(cell.alias);
				if (route && route.isPage) {
					return true;
				}
			}
			return false;
		},
		up: function(row) {
			var index = this.rows.indexOf(row);
			if (index > 0) {
				var replacement = this.rows[index - 1];
				this.rows.splice(index - 1, 1, row);
				this.rows.splice(index, 1, replacement);
			}
		},
		down: function(row) {
			var index = this.rows.indexOf(row);
			if (index < this.rows.length - 1) {
				var replacement = this.rows[index + 1];
				this.rows.splice(index + 1, 1, row);
				this.rows.splice(index, 1, replacement);
			}
		},
		cellDown: function(row, cell) {
			var index = this.rows.indexOf(row);
			if (index < this.rows.length - 1) {
				var target = this.rows[index + 1];
				row.cells.splice(row.cells.indexOf(cell));
				target.cells.push(cell);
			}
		},
		cellUp: function(row, cell) {
			var index = this.rows.indexOf(row);
			if (index > 0) {
				var target = this.rows[index - 1];
				row.cells.splice(row.cells.indexOf(cell));
				target.cells.push(cell);
			}
		},
		left: function(row, cell) {
			var index = row.cells.indexOf(cell);
			if (index > 0) {
				var replacement = row.cells[index - 1];
				row.cells.splice(index - 1, 1, cell);
				row.cells.splice(index, 1, replacement);
			}
		},
		right: function(row, cell) {
			var index = row.cells.indexOf(cell);
			if (index < row.cells.length - 1) {
				var replacement = row.cells[index + 1];
				row.cells.splice(index + 1, 1, cell);
				row.cells.splice(index, 1, replacement);
			}
		},
		filterRoutes: function(value) {
			var routes = this.$services.router.list().filter(function(x) {
				return x.alias && (!value || x.alias.toLowerCase().indexOf(value.toLowerCase()) >= 0);
			});
			routes.sort(function(a, b) {
				return a.alias.localeCompare(b.alias);
			});
			return routes.map(function(x) { return x.alias });
		},
		getRouteParameters: function(cell) {
			var route = this.$services.router.get(cell.alias);
			return route ? this.$services.page.getRouteParameters(route) : {};
		},
		getAvailableParameters: function(cell) {
			return this.$services.page.getAvailableParameters(this.page, cell, true);
		},
		getAvailableEvents: function(event) {
			var available = this.$services.page.getPageInstance(this.page, this).getEvents();
			var result = Object.keys(available);
			if (event) {
				result = result.filter(function(x) {
					return x.toLowerCase().indexOf(event.toLowerCase()) >= 0;
				});
			}
			result.sort();
			return result;
		},
		canConfigure: function(cell) {
			var pageInstance = this.$services.page.getPageInstance(this.page, this);
			var component = pageInstance.getComponentForCell(cell.id);
			return component && component.configure;
		},
		canConfigureInline: function(cell) {
			var pageInstance = this.$services.page.getPageInstance(this.page, this);
			var component = pageInstance.getComponentForCell(cell.id);
			return component && component.configurator;
		},
		getCellConfigurator: function(cell) {
			var pageInstance = this.$services.page.getPageInstance(this.page, this);
			var component = pageInstance.getComponentForCell(cell.id);
			return component && component.configurator();
		},
		getCellConfiguratorInput: function(cell) {
			var pageInstance = this.$services.page.getPageInstance(this.page, this);
			var cellInstance = pageInstance.getComponentForCell(cell.id);
			var result = {};
			if (cellInstance.$options.props) {
				Object.keys(cellInstance.$options.props).forEach(function(prop) {
					result[prop] = cellInstance[prop];
				});
			}
			return result;
		},
		configure: function(cell) {
			if (this.canConfigure(cell)) {
				var self = this;
				var pageInstance = self.$services.page.getPageInstance(self.page, self);
				var cellInstance = pageInstance.getComponentForCell(cell.id);
				cellInstance.configure();
			}
		},
		close: function(cell) {
			var self = this;
			var pageInstance = self.$services.page.getPageInstance(self.page, self);
			if (cell.on || cell.closeable) {
				Vue.set(pageInstance.closed, cell.id, cell.on ? cell.on : "$any");
			}
			else {
				this.$parent.$emit("close");
			}
		},
		shouldRenderRow: function(row) {
			if (this.edit) {
				return true;
			}
			// if we have width limitations, check those first
			if (row.devices) {
				if (!this.isDevice(row.devices)) {
					return false;
				}
			}
			if (!!row.condition) {
				if (!this.$services.page.isCondition(row.condition, this.getState(row), this)) {
					return false;
				}
			}
			var self = this;
			var pageInstance = self.$services.page.getPageInstance(self.page, self);
			if (row.on) {
				if (!pageInstance.get(row.on)) {
					return false;
				}
			}
			return true;
		},
		isDevice: function(devices) {
			var actual = this.$services.resizer.width;
			for (var i = 0; i < devices.length; i++) {
				if (devices[i].operator && devices[i].name) {
					var operator = devices[i].operator;
					var width = 0;
					if (devices[i].name.match(/[0-9]+/)) {
						width = parseInt(devices[i].name);
					}
					else {
						var device = this.$services.page.devices.filter(function(x) { return x.name == devices[i].name })[0];
						if (device && device.width) {
							width = parseInt(device.width);
						}
					}
					// infinitely big, so matches any query requesting larger
					if (width == 0) {
						if (operator != ">" && operator != ">=") {
							return false;
						}
					}
					else if (operator == "<" && actual >= width) {
						return false;
					}
					else if (operator == "<=" && actual > width) {
						return false;
					}
					else if (operator == ">" && actual <= width) {
						return false;
					}
					else if (operator == ">=" && actual < width) {
						return false;
					}
					else if (operator == "==" && actual != width) {
						return false;
					}
				}
			}
			return true;
		},
		cellId: function(cell) {
			var cellId = 'page_' + this.pageInstanceId + '_cell_' + cell.id;
			if (cell.on && cell.optimizeVueKey) {
				var self = this;
				var pageInstance = self.$services.page.getPageInstance(self.page, self);
				var on = pageInstance.get(cell.on);
				if (on) {
					cellId += JSON.stringify(on);
				}
			}
			return cellId;
		},
		cellClasses: function(cell) {
			if (cell.styles) {
				var self = this;
				var pageInstance = self.$services.page.getPageInstance(self.page, self);
				// if we use state here, it does not get modified as we send out new events
				// so let's watch the variables instead
				//return this.$services.page.getDynamicClasses(cell.styles, this.state, this);
				return this.$services.page.getDynamicClasses(cell.styles, pageInstance.variables, this);
			}
			return [];
		},
		rowClasses: function(row) {
			if (row.styles) {
				var self = this;
				var pageInstance = self.$services.page.getPageInstance(self.page, self);
				// if we use state here, it does not get modified as we send out new events
				// so let's watch the variables instead
				//return this.$services.page.getDynamicClasses(row.styles, this.state, this);
				return this.$services.page.getDynamicClasses(row.styles, pageInstance.variables, this);
			}
			return [];
		},
		hasCellClickEvent: function(cell) {
			if (!cell.clickEvent) {
				return false;
			}
			else if (typeof(cell.clickEvent) == "string") {
				return true;
			}
			else {
				return nabu.page.event.getName(cell, "clickEvent");
			}
		},
		shouldRenderCell: function(row, cell) {
			if (this.edit) {
				/*if (row.collapsed) {
					return false;
				}*/
				return true;
			}
			else if (!cell.alias && !cell.rows.length && !cell.customId) {
				return false;
			}
			// if we have width limitations, check those first
			if (cell.devices) {
				if (!this.isDevice(cell.devices)) {
					return false;
				}
			}
			
			if (cell.condition) {
				if (!this.$services.page.isCondition(cell.condition, this.getState(row, cell), this)) {
					return false;
				}
			}
			var self = this;
			var pageInstance = self.$services.page.getPageInstance(self.page, self);
			// if we depend on an event and it hasn't happened yet, don't render
			// not sure if it will rerender if we close it?
			if (cell.on) {
				// if we explicitly closed it, leave it closed until it is reset
				if (pageInstance.closed[cell.id]) {
					return false;
				}
				else if (!pageInstance.get(cell.on)) {
					return false;
				}
			}
			else if (cell.closeable && pageInstance.closed[cell.id]) {
				return false;
			}
			var providers = [];
			nabu.page.providers("page-enumerate").map(function(x) {
				providers.push(x.name);
			});
			var consensus =  Object.keys(cell.bindings).reduce(function(consensus, name) {
				// fixed values are always ok
				if (cell.bindings[name] && cell.bindings[name].indexOf && cell.bindings[name].indexOf("fixed") == 0) {
					return consensus;
				}
				else if (cell.bindings[name] && cell.bindings[name].label && cell.bindings[name].label == "fixed") {
					return consensus;
				}
				// always allow enumerated values
				else if (cell.bindings[name] && cell.bindings[name].split && providers.indexOf(cell.bindings[name].split(".")[0]) >= 0) {
					return consensus;
				}
				// if we have a bound value and it does not originate from the (ever present) page, it must come from an event
				// check that the event has occurred
				// use the cell.on to define this?
				// sometimes need to always show an empty table or whatever
				// may need to allow an array in cell.on?
				/*if (cell.bindings[name] && cell.bindings[name].indexOf("page.") != 0) {
					var parts = cell.bindings[name].split(".");
					// if the event does not exist yet, stop
					if (!pageInstance.variables[parts[0]]) {
						return false;
					}
				}*/
				return consensus;
			}, true);
			return consensus;
		},
		// changedValues is an array of field names that have changed, e.g. "page.test" or "select.$all" etc
		shouldRerenderCell: function(cell, changedValues) {
			if (!changedValues || !changedValues.length) {
				return false;
			}
			return Object.keys(cell.bindings).reduce(function(consensus, name) {
				return consensus || changedValues.indexOf(cell.bindings[name]) >= 0;
			}, false);
		},
		getCreatedComponent: function(row, cell) {
			return this.createdComponent.bind(this, row, cell);
		},
		createdComponent: function(row, cell, result) {
			this.$services.page.rendering++;
		},
		mounted: function(cell, row, state, component) {
			var self = this;
			var pageInstance = self.$services.page.getPageInstance(self.page, self);
			// especially at startup it can not always be found?
			if (!pageInstance) {
				var current = this;
				// the parent is either the page or a page cell (which is in a row, which might be in the page)
				// either way, we just go up and check if there is a mounted
				// if that is the mounted function of the page, great, if that is the mounted function of another row, it will in turn go up
				while (current.$parent) {
					current = current.$parent;	
					if (current.mounted) {
						current.mounted(cell, row, state, component);
						break;
					}
				}
			}
			else {
				pageInstance.mounted(cell, row, state, component);
			}
			component.$on("close", function() {
				self.close(cell);
			});
		},
		getMountedFor: function(cell, row) {
			return this.mounted.bind(this, cell, row, this.getLocalState(row, cell));
		},
	/*	renderAll: function(changedValues) {
			var self = this;
			var mount = function(cell) {
				self.$services.router.route(cell.alias, self.getParameters(cell), self.page.name + "_" + cell.id, true).then(function(component) {
					self.$services.page.instances[self.page.name].mounted(cell, component);
				})
			}
			for (var i = 0; i < this.rows.length; i++) {
				if (this.rows[i].cells) {
					for (var j = 0; j < this.rows[i].cells.length; j++) {
						var cell = this.rows[i].cells[j];
						if (this.shouldRenderCell(cell)) {
							// if it is not the first render, check that we need to rerender it
							if (!self.$services.page.instances[self.page.name].components[cell.id] || this.shouldRerenderCell(cell, changedValues)) {
								mount(cell);
							}
						}
						// if we past in changed values, we are doing a rerender it, trigger all child rows as well
						if (changedValues && changedValues.length) {
							this.$refs[this.page.name + '_' + cell.id + '_rows'].renderAll(changedValues);
						}
					}
				}
			}
		},
		render: function(id) {
			// TODO
		},*/
		getCell: function(id) {
			for (var i = 0; i < this.rows.length; i++) {
				if (this.rows[i].cells) {
					for (var j = 0; j < this.rows[i].cells.length; j++) {
						if (this.rows[i].cells[j].id == id) {
							return this.rows[i].cells[j];
						}
					}
				}
			}
			return null;
		},
		getRowEditStyle: function(row) {
			return 'background-color:' + this.getNameColor(row.name) + '; color: #fff';	
		},
		getCellEditStyle: function(cell) {
			return 'background-color:' + this.getNameColor(cell.name) + '; color: #fff';	
		},
		getNameColor: function(name) {
			var saturation = 80;
			var lightness = 40;
			var hash = 0;
			for (var i = 0; i < name.length; i++) {
				hash = name.charCodeAt(i) + ((hash << 5) - hash);
			}
			var hue = hash % 360;
			return 'hsl('+ hue +', '+ saturation +'%, '+ lightness +'%)';
		},
		getParameters: function(row, cell) {
			var self = this;
			var pageInstance = self.$services.page.getPageInstance(self.page, self);
			var result = {
				page: this.page,
				parameters: this.parameters,
				cell: cell,
				edit: this.edit,
				//state: pageInstance.variables,
				// if we are in edit mode, the local state does not matter
				// and if we add it, we retrigger a redraw everytime we change something
				localState: this.edit ? null : this.getLocalState(row, cell),
				pageInstanceId: this.pageInstanceId,
				stopRerender: this.edit
			};
			// if we have a trigger event, add it explicitly to trigger a redraw if needed
			if (cell.on) {
				result[cell.on] = pageInstance.variables[cell.on];
			}
			Object.keys(cell.bindings).map(function(key) {
				if (cell.bindings[key]) {
					var value = self.$services.page.getBindingValue(pageInstance, cell.bindings[key]);
					// only set the value if it actually has some value
					// otherwise we might accidently trigger a redraw with no actual new value
					// if we remove a value that was there before, it will still redraw as the parameters will have fewer keys
					// and adding something "should" trigger redraw anyway
					if (typeof(value) != "undefined" && value != null) {
						result[key] = value;
					}
				}
			});
			return result;
		},
		addDevice: function(cell) {
			if (!cell.devices) {
				Vue.set(cell, "devices", []);
			}
			cell.devices.push({name: null, operator: '>'});
		},
		suggestDevices: function(value) {
			var devices = this.$services.page.devices.map(function(x) { return x.name }); 
			if (value && value.match(/[0-9]+/)) { 
				devices.unshift(value) 
			}
			return devices;
		},
		resetEvents: function() {
			var pageInstance = this.$services.page.getPageInstance(this.page, this);
			pageInstance.resetEvents();	
		},
		clickOnCell: function(cell) {
			if (nabu.page.event.getName(cell, "clickEvent") && !this.edit) {
				var pageInstance = this.$services.page.getPageInstance(this.page, this);
				pageInstance.emit(
					nabu.page.event.getName(cell, "clickEvent"),
					nabu.page.event.getInstance(cell, "clickEvent", this.page, this)
				);
			}
		},
		addCell: function(target) {
			var self = this;
			var cell = {
				id: this.page.content.counter++,
				rows: [],
				// the alias of the route we want to render here (if any)
				alias: null,
				// the route may have input parameters (path + query), these are the relevant bindings
				// the binding variable contains keys for each path/query parameter in the route
				bindings: {},
				name: null,
				// state that is maintained by the cell owner (the route alias)
				// for example it might offer additional configuration
				state: {},
				// the rendering target (e.g. sidebar, prompt,...)
				target: 'page',
				// it can depend on an event of taking place
				on: null,
				// a class for this cell
				class: null,
				// a custom id for this cell
				customId: null,
				// flex width
				width: 1,
				height: null,
				instances: {},
				condition: null,
				devices: [],
				clickEvent: null
			};
			if (!target.cells) {
				Vue.set(target, "cells", []);
			}
			target.cells.push(cell);
			return cell;
		},
		addInstance: function(target) {
			if (!target.instances) {
				Vue.set(target, "instances", {});
			}
			Vue.set(target.instances, "unnamed", null);
		},
		removeInstance: function(target, name) {
			// currently just reset the instances thing, we currently only allow one
			Vue.set(target, "instances", {});	
		},
		renameInstance: function(target, oldName, newName) {
			Vue.set(target.instances, newName, target.instances[oldName]);
			Vue.delete(target.instances, oldName);
		},
		addRow: function(target, skipInject) {
			if (!target.rows) {
				Vue.set(target, "rows", []);
			}
			var row = {
				id: this.page.content.counter++,
				cells: [],
				class: null,
				// a custom id for this row
				customId: null,
				// you can map an instance of an array to a row
				// for instance if you have an array of "contracts", you could map it to the variable "contract"
				// the key is the local name, the value is the name of the object in the page
				instances: {},
				condition: null,
				direction: null,
				align: null,
				on: null,
				collapsed: false,
				name: null
			};
			if (!skipInject) {
				target.rows.push(row);
			}
			return row;
		},
		removeCell: function(cells, cell) {
			var self = this;
			this.$confirm({
				message: "Are you sure you want to remove this cell?"
			}).then(function() {
				self.$services.page.closeRight();
				cells.splice(cells.indexOf(cell), 1);
			});
		},
		removeRow: function(cell, row) { 
			cell.rows.splice(cell.rows(indexOf(row), 1));
		},
		setContent: function(cell) {
			var self = this;
			this.$prompt(function() {
				return new nabu.page.views.PageAddCell({propsData: {
					page: self.page
				}});
			}).then(function(content) {
				nabu.utils.objects.merge(cell, content);
			});
		},
		rowStyles: function(row) {
			var styles = [];
			if (row.direction == "horizontal") {
				styles.push({"flex-direction": "row"})
			}
			else if (row.direction == "vertical") {
				styles.push({"flex-direction": "column"})
			}
			if (!!row.align) {
				styles.push({"align-items": row.align});
			}
			if (!!row.justify) {
				styles.push({"justify-content": row.justify});
			}
			if (false && (this.edit || this.$services.page.wantEdit) && row.name) {
				styles.push({"border": "solid 2px " + this.getNameColor(row.name), "border-style": "none solid solid solid"})
			}
			return styles;
		},
		rowButtonStyle: function(row) {
			var styles = [];
			if (row.direction == "vertical") {
				styles.push({"display": "inline-block"})
			}
			return styles;
		},
		copyCell: function(cell) {
			nabu.utils.objects.copy({
				type: "page-cell",
				content: cell
			});
		},
		copyRow: function(row) {
			nabu.utils.objects.copy({
				type: "page-row",
				content: row
			});
		},
		pasteCell: function(row) {
			row.cells.push(this.$services.page.renumber(this.page, this.$services.page.copiedCell));
			this.$services.page.copiedCell = null;
		},
		pasteRow: function(cell) {
			cell.rows.push(this.$services.page.renumber(this.page, this.$services.page.copiedRow));
			this.$services.page.copiedRow = null;
		},
		goto: function(event, row, cell) {
			if (this.edit) {
				this.$emit("select", cell ? cell : row);
				var doDefault = true;
				// if we have a cell target with a configuration, show that, otherwise, we do the generic configuration
				if (cell != null) {
					if (this.canConfigureInline(cell)) {
						this.configuring = cell.id;
					}
					else {
						var self = this;
						var pageInstance = self.$services.page.getPageInstance(self.page, self);
						var cellInstance = pageInstance.getComponentForCell(cell.id);
						if (cellInstance && cellInstance.configure) {
							cellInstance.configure();
							doDefault = false;
						}
					}
				}
				if (doDefault) {
					this.configuring = cell ? cell.id : row.id;
				}
				event.stopPropagation();
			}
		},
		mouseOut: function(event, row, cell) {
			var self = this;
			if (self.edit) {
				var rowTarget = document.getElementById(self.page.name + '_' + row.id);
				if (rowTarget) {
					rowTarget.classList.remove("hovering");
				}
				if (cell) {
					var cellTarget = document.getElementById(self.page.name + '_' + row.id + '_' + cell.id);
					if (cellTarget) {
						cellTarget.classList.remove("hovering");
					}
				}
			}
		},
		mouseOver: function(event, row, cell) {
			if (this.edit) {
				var rowTarget = document.getElementById(this.page.name + '_' + row.id);
				if (rowTarget) {
					rowTarget.classList.add("hovering");
				}
				if (cell) {
					var cellTarget = document.getElementById(this.page.name + '_' + row.id + '_' + cell.id);
					if (cellTarget) {
						cellTarget.classList.add("hovering");
					}
					if (!event.shiftKey) {
						event.stopPropagation();
					}
				}
			}
		},
		menuHover: function($event) {
			if (this.edit) {
				var self = this;
				if ($event.target.$unhover) {
					clearTimeout($event.target.$unhover);
					$event.target.$unhover = null;
				}
				$event.target.classList.add("menu-hovering");
			}
		},
		menuUnhover: function($event) {
			if (this.edit) {
				var self = this;
				$event.target.$unhover = setTimeout(function() {
					$event.target.classList.remove("menu-hovering");
					$event.target.$unhover = null;
				}, 500);
			}
		}
	}
});

Vue.component("n-prompt", {
	template: "#n-prompt",
	props: {
		autoclose: {
			type: Boolean,
			required: false
		}
	}
});

Vue.component("n-absolute", {
	template: "#n-absolute",
	props: {
		top: {
			required: false
		},
		bottom: {
			required: false
		},
		left: {
			required: false
		},
		right: {
			required: false
		},
		fixed: {
			required: false
		},
		autoclose: {
			type: Boolean,
			required: false
		}
	},
	data: function() {
		return {
			relativeX: 0,
			relativeY: 0
		}	
	},
	ready: function() {
		// we need the bounding box of the first relative parent
		var relative = this.$el.offsetParent;
		if (relative) {
			var rect = relative.getBoundingClientRect();
			this.relativeX = rect.left;
			this.relativeY = rect.top;
		}
	},
	methods: {
		// if we do this as a computed, it will update everytime we move the mouse
		getStyles: function() {
			var styles = [];
			if (this.top != null) {
				styles.push({"top": this.top });
			}
			if (this.bottom != null) {
				styles.push({"bottom": this.bottom });
			}
			if (this.left != null) {
				styles.push({"left": this.left });
			}
			if (this.right != null) {
				styles.push({"right": this.right });
			}
			// if no specific styling, position it at mouse
			if (!styles.length) {
				// these are not reactive, use mouseX and mouseY if you want reactive coordinates
				var x = this.$services.page.mouseXPassive - this.relativeX;
				var y = this.$services.page.mouseYPassive - this.relativeY;
				styles.push({"left": + x + "px" });
				styles.push({"top": + y + "px"});
				//styles.push({"left": + JSON.parse(JSON.stringify(this.$services.page.mouseX)) + "px" });
				//styles.push({"top": + JSON.parse(JSON.stringify(this.$services.page.mouseY)) + "px"});
			}
			// can also use fixed positioning
			if (this.fixed) {
				styles.push({"position": "fixed"});
			}
			else {
				styles.push({"position": "absolute"});
			}
			return styles;
		}
	}
});

Vue.component("page-sidemenu", {
	template: "#page-sidemenu",
	props: {
		page: {
			type: Object,
			required: true
		},
		rows: {
			type: Array,
			required: true
		},
		selected: {
			type: Object,
			required: false
		}
	},
	data: function() {
		return {
			opened: []
		}	
	},
	methods: {
		up: function(row) {
			var index = this.rows.indexOf(row);
			if (index > 0) {
				var replacement = this.rows[index - 1];
				this.rows.splice(index - 1, 1, row);
				this.rows.splice(index, 1, replacement);
			}
		},
		down: function(row) {
			var index = this.rows.indexOf(row);
			if (index < this.rows.length - 1) {
				var replacement = this.rows[index + 1];
				this.rows.splice(index + 1, 1, row);
				this.rows.splice(index, 1, replacement);
			}
		},
		cellDown: function(row, cell) {
			var index = this.rows.indexOf(row);
			if (index < this.rows.length - 1) {
				var target = this.rows[index + 1];
				row.cells.splice(row.cells.indexOf(cell));
				target.cells.push(cell);
			}
		},
		cellUp: function(row, cell) {
			var index = this.rows.indexOf(row);
			if (index > 0) {
				var target = this.rows[index - 1];
				row.cells.splice(row.cells.indexOf(cell));
				target.cells.push(cell);
			}
		},
		left: function(row, cell) {
			var index = row.cells.indexOf(cell);
			if (index > 0) {
				var replacement = row.cells[index - 1];
				row.cells.splice(index - 1, 1, cell);
				row.cells.splice(index, 1, replacement);
			}
		},
		right: function(row, cell) {
			var index = row.cells.indexOf(cell);
			if (index < row.cells.length - 1) {
				var replacement = row.cells[index + 1];
				row.cells.splice(index + 1, 1, cell);
				row.cells.splice(index, 1, replacement);
			}
		},
		mouseOut: function(event, row, cell) {
			var self = this;
			var rowTarget = document.getElementById(self.page.name + '_' + row.id);
			if (rowTarget) {
				rowTarget.classList.remove("hovering");
			}
			if (cell) {
				var cellTarget = document.getElementById(self.page.name + '_' + row.id + '_' + cell.id);
				if (cellTarget) {
					cellTarget.classList.remove("hovering");
				}
			}
		},
		mouseOver: function(event, row, cell) {
			var rowTarget = document.getElementById(this.page.name + '_' + row.id);
			if (rowTarget) {
				rowTarget.classList.add("hovering");
			}
			if (cell) {
				var cellTarget = document.getElementById(this.page.name + '_' + row.id + '_' + cell.id);
				if (cellTarget) {
					cellTarget.classList.add("hovering");
				}
				if (!event.shiftKey) {
					event.stopPropagation();
				}
			}
		},
		showHtml: function(row, cell) {
			var target = document.getElementById(this.page.name + '_' + row.id);
			if (cell) {
				target = document.getElementById(this.page.name + '_' + row.id + '_' + cell.id);
			}
			if (target != null) {
				var html = target.innerHTML;
				this.$services.page.showContent(html);
			}
		},
		scrollIntoView: function(row, cell) {
			var target = this.page.name + '_' + row.id;
			if (cell) {
				target += "_" + cell.id;
			}
			document.getElementById(target).scrollIntoView();
		},
		hasConfigure: function(cell) {
			var self = this;
			var pageInstance = self.$services.page.getPageInstance(self.page, self);
			var cellInstance = pageInstance.getComponentForCell(cell.id);
			return cellInstance && cellInstance.configure;
		},
		configure: function(cell) {
			var self = this;
			var pageInstance = self.$services.page.getPageInstance(self.page, self);
			var cellInstance = pageInstance.getComponentForCell(cell.id);
			cellInstance.configure();
		},
		toggleRow: function(row) {
			var index = this.opened.indexOf(row.id);
			if (index < 0) {
				this.opened.push(row.id);
			}
			else {
				this.opened.splice(index, 1);
			}
		},
		selectRow: function(row) {
			var wasSelected = this.selected == row;
			this.$emit("select", row);
			var index = this.opened.indexOf(row.id);
			if (index < 0) {
				this.configureRow(row);
				this.opened.push(row.id);
			}	
			else if (wasSelected) {
				this.opened.splice(index, 1);
			}
			else {
				this.configureRow(row);
			}
		},
		configureRow: function(row) {
			var target = document.getElementById(this.page.name + "_" + row.id);
			var parent = target.parentNode;
			while (parent != null && (!parent.__vue__ || !parent.__vue__.setRowConfiguring)) {
				parent = parent.parentNode;
			}
			if (parent) {
				parent.__vue__.setRowConfiguring(row.id);
			}
			//target.parentNode.__vue__.configuring = row.id;
		},
		selectCell: function(row, cell) {
			var wasSelected = this.selected == cell;
			this.$emit("select", cell);
			this.configureCell(row, cell);
		},
		configureCell: function(row, cell) {
			var target = document.getElementById(this.page.name + "_" + row.id + "_" + cell.id);
			if (target != null) {
				//target.parentNode.parentNode.__vue__.configuring = cell.id;
				var parent = target.parentNode;
				while (parent != null && (!parent.__vue__ || !parent.__vue__.setRowConfiguring)) {
					parent = parent.parentNode;
				}
				if (parent) {
					parent.__vue__.setRowConfiguring(cell.id);
				}
			}
		},
		addRow: function(target) {
			if (!target.rows) {
				Vue.set(target, "rows", []);
			}
			target.rows.push({
				id: this.page.content.counter++,
				cells: [],
				class: null,
				// a custom id for this row
				customId: null,
				// you can map an instance of an array to a row
				// for instance if you have an array of "contracts", you could map it to the variable "contract"
				// the key is the local name, the value is the name of the object in the page
				instances: {},
				condition: null,
				direction: null,
				align: null,
				on: null,
				collapsed: false,
				name: null
			});
		},
		removeCell: function(cells, cell) {
			this.$confirm({
				message: "Are you sure you want to remove this cell?"
			}).then(function() {
				cells.splice(cells.indexOf(cell), 1);
			});
		},
		removeRow: function(cell, row) { 
			self.$services.page.closeRight();
			cell.rows.splice(cell.rows(indexOf(row), 1));
		},
		addCell: function(target) {
			if (!target.cells) {
				Vue.set(target, "cells", []);
			}
			var cell = {
				id: this.page.content.counter++,
				rows: [],
				// the alias of the route we want to render here (if any)
				alias: null,
				// the route may have input parameters (path + query), these are the relevant bindings
				// the binding variable contains keys for each path/query parameter in the route
				bindings: {},
				name: null,
				// state that is maintained by the cell owner (the route alias)
				// for example it might offer additional configuration
				state: {},
				// the rendering target (e.g. sidebar, prompt,...)
				target: 'page',
				// it can depend on an event of taking place
				on: null,
				// a class for this cell
				class: null,
				// a custom id for this cell
				customId: null,
				// flex width
				width: 1,
				height: null,
				instances: {},
				condition: null,
				devices: [],
				clickEvent: null
			};
			target.cells.push(cell);
			return cell;
		},
		copyCell: function(cell) {
			nabu.utils.objects.copy({
				type: "page-cell",
				content: cell
			});
		},
		copyRow: function(row) {
			nabu.utils.objects.copy({
				type: "page-row",
				content: row
			});
		},
		pasteCell: function(row) {
			row.cells.push(this.$services.page.renumber(this.page, this.$services.page.copiedCell));
			this.$services.page.copiedCell = null;
		},
		pasteRow: function(cell) {
			cell.rows.push(this.$services.page.renumber(this.page, this.$services.page.copiedRow));
			this.$services.page.copiedRow = null;
		},
		dragCell: function(event, row, cell) {
			this.$services.page.setDragData(event, "page-cell", cell.id);
			if (event.ctrlKey) {
				this.$services.page.setDragData(event, "drag-action", "copy");
			}
		},
		dragRow: function(event, row) {
			this.$services.page.setDragData(event, "page-row", row.id);
			if (event.ctrlKey) {
				this.$services.page.setDragData(event, "drag-action", "copy");
			}
		},
		acceptDragRow: function(event, row) {
			if (this.$services.page.hasDragData(event, "page-cell")) {
				event.preventDefault();
			}
			else if (this.$services.page.hasDragData(event, "page-row")) {
				this.$services.page.pushDragItem(event.target);
				var rect = event.target.getBoundingClientRect();
				if (Math.abs(event.clientY - rect.top) >= rect.height / 2) {
					event.target.classList.remove("hover-top");
					event.target.classList.add("hover-bottom");
				}
				else {
					event.target.classList.remove("hover-bottom");
					event.target.classList.add("hover-top");
				}
				event.preventDefault();
			}
		},
		acceptDragCell: function(event, row, cell) {
			if (this.$services.page.hasDragData(event, "page-row")) {
				event.preventDefault();
			}
			else if (this.$services.page.hasDragData(event, "page-cell")) {
				this.$services.page.pushDragItem(event.target);
				var rect = event.target.getBoundingClientRect();
				if (Math.abs(event.clientY - rect.top) >= rect.height / 2) {
					event.target.classList.remove("hover-top");
					event.target.classList.add("hover-bottom");
				}
				else {
					event.target.classList.remove("hover-bottom");
					event.target.classList.add("hover-top");
				}
				event.preventDefault();
			}
		},
		dropRow: function(event, row) {
			var cellId = this.$services.page.getDragData(event, "page-cell");
			var rowId = this.$services.page.getDragData(event, "page-row");
			if (cellId) {
				var content = this.$services.page.getTarget(this.page.content, cellId);
				var action = this.$services.page.getDragData(event, "drag-action");
				if (!row.cells) {
					Vue.set(row, "cells", []);
				}
				if (action == "copy") {
					content = JSON.parse(JSON.stringify(content));
					this.$services.page.renumber(this.page, content);
				}
				else {
					var parent = this.$services.page.getTarget(this.page.content, content.id, true);
					// do nothing, we don't want to add it to ourselves again
					if (parent == row) {
						return null;
					}
					var index = parent.cells.indexOf(content);
					if (index >= 0) {
						parent.cells.splice(index, 1);
						// if we emptied out the cells, remove it
						if (parent.cells.length == 0) {
							var grandParent = this.$services.page.getTarget(this.page.content, parent.id, true);
							index = grandParent.rows.indexOf(parent);
							grandParent.rows.splice(index, 1);
						}
					}
				}
				row.cells.push(content);
			}
			if (rowId && row.id != rowId) {
				var content = this.$services.page.getTarget(this.page.content, rowId);
				var action = this.$services.page.getDragData(event, "drag-action");
				var parent = this.$services.page.getTarget(this.page.content, row.id, true);
				
				if (action == "copy") {
					content = JSON.parse(JSON.stringify(content));
					this.$services.page.renumber(this.page, content);
				}
				else {
					this.$services.page.closeRight();
					var og = this.$services.page.getTarget(this.page.content, content.id, true);
					var index = og.rows.indexOf(content);
					if (index >= 0) {
						og.rows.splice(index, 1);
						// if the og is not the page and the rows are empty and it has no other content, remove it
						if (og.rows.length == 0 && og.id && !og.alias) {
							var grandParent = this.$services.page.getTarget(this.page.content, og.id, true);
							index = grandParent.cells.indexOf(og);
							grandParent.cells.splice(index, 1);
						}
					}
				}
				var rect = event.target.getBoundingClientRect();
				
				var index = parent.rows.indexOf(row);
				// position below it
				if (Math.abs(event.clientY - rect.top) >= rect.height / 2) {
					parent.rows.splice(index + 1, 0, content);
				}
				else {
					parent.rows.splice(index, 0, content);
				}
			}
		},
		dropCell: function(event, row, cell) {
			var cellId = this.$services.page.getDragData(event, "page-cell");
			var rowId = this.$services.page.getDragData(event, "page-row");
			// if you drop a cell on a cell, you want to position it before or after it
			if (cellId && cell.id != cellId) {
				var content = this.$services.page.getTarget(this.page.content, cellId);
				var action = this.$services.page.getDragData(event, "drag-action");
				var parent = this.$services.page.getTarget(this.page.content, cell.id, true);
				
				if (action == "copy") {
					content = JSON.parse(JSON.stringify(content));
					this.$services.page.renumber(this.page, content);
				}
				else {
					this.$services.page.closeRight();
					var og = this.$services.page.getTarget(this.page.content, content.id, true);
					var index = og.cells.indexOf(content);
					if (index >= 0) {
						og.cells.splice(index, 1);
						if (og.cells.length == 0) {
							var grandParent = this.$services.page.getTarget(this.page.content, og.id, true);
							index = grandParent.rows.indexOf(og);
							grandParent.rows.splice(index, 1);
						}
					}
				}
				
				var rect = event.target.getBoundingClientRect();
				var index = parent.cells.indexOf(cell);
				// position below it
				if (Math.abs(event.clientY - rect.top) >= rect.height / 2) {
					parent.cells.splice(index + 1, 0, content);
				}
				else {
					parent.cells.splice(index, 0, content);
				}
			}
			if (rowId && row.id != rowId) {
				var content = this.$services.page.getTarget(this.page.content, rowId);
				var action = this.$services.page.getDragData(event, "drag-action");
				if (action == "copy") {
					content = JSON.parse(JSON.stringify(content));
					this.$services.page.renumber(this.page, content);
				}
				else {
					var parent = this.$services.page.getTarget(this.page.content, content.id, true);
					var index = parent.rows.indexOf(content);
					if (index >= 0) {
						parent.rows.splice(index, 1);
						// if the parent is not the page and the rows are empty and it has no other content, remove it
						if (parent.rows.length == 0 && parent.id && !parent.alias) {
							var grandParent = this.$services.page.getTarget(this.page.content, parent.id, true);
							index = grandParent.cells.indexOf(parent);
							grandParent.cells.splice(index, 1);
						}
					}
				}
				var rect = event.target.getBoundingClientRect();
				if (!cell.rows) {
					Vue.set(cell, "rows", []);
				}
				cell.rows.push(content);
			}
		}
	},
	watch: {
		selected: function(newValue) {
			if (this.rows.indexOf(newValue) >= 0) {
				var index = this.opened.indexOf(newValue.id);
				if (index < 0) {
					this.opened.push(newValue.id);
				}
				this.$emit("open");
			}
			else {
				var self = this;
				this.rows.forEach(function(row) {
					if (row.cells && row.cells.indexOf(newValue) >= 0) {
						var index = self.opened.indexOf(row.id);
						if (index < 0) {
							self.opened.push(row.id);
						}
						self.$emit("open");
					}
				});
			}
		}
	}
});

document.addEventListener("keydown", function(event) {
	if (event.key == "s" && (event.ctrlKey || event.metaKey) && application.services.page.editing) {
		application.services.page.editing.save(event);
	}
	else if (event.key == "d" && (event.ctrlKey || event.metaKey) && application.services.page.editing) {
		application.services.page.editing.viewComponents = true;
		event.preventDefault();
		event.stopPropagation();
	}
	else if (event.key == "e" && (event.ctrlKey || event.metaKey) && application.services.page.editing) {
		application.services.page.editing.stopEdit();
		event.preventDefault();
		event.stopPropagation();
	}
}, true);

document.addEventListener("dragend", function() {
	application.services.page.clearAllDrag();	
});


