if (!nabu) { var nabu = {} }
if (!nabu.page) { nabu.page = {} }
if (!nabu.page.views) { nabu.page.views = {} }

Vue.component("custom-validator-edit", {
	template: "#custom-validator-edit",
	props: {
		page: {
			type: Object,
			required: true
		},
		cell: {
			type: Object,
			required: true
		}
	},
	computed: {
		availableParameters: function() {
			return this.$services.page.getAvailableParameters(this.page, this.cell, true);
		}
	},
	methods: {
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
		getOperations: function(value) {
			var options = Object.keys(this.$services.swagger.operations);
			if (value) {
				options = options.filter(function(x) {
					return x.toLowerCase().indexOf(value.toLowerCase()) >= 0;
				})
			}
			return options;
		},
		addValidation: function () {
			if (!this.cell.state.validations) {
				Vue.set(this.cell.state, "validations", []);
			}
			this.cell.state.validations.push({
				label: null,
				code: "error",
				condition: null,
				message: null,
				bindings: {}
			});
		},
		deleteValidation: function (validation) {
			this.cell.state.validations.splice(this.cell.state.validations.indexOf(validation),1);
		}
	}
});

Vue.view("custom-validator", {
	props: {
		page: {
			type: Object,
			required: true
		},
		parameters: {
			type: Object,
			required: false
		},
		cell: {
			type: Object,
			required: true
		},
		edit: {
			type: Boolean,
			required: true
		},
		data: {
			required: false
		},
		shouldStyle: {
			type: Boolean,
			required: false,
			default: true
		},
		label: {
			type: Boolean,
			required: false,
			default: null
		},
		localState: {
			type: Object,
			required: false
		},
		fieldsName: {
			type: String,
			required: false,
			default: "fields"
		}
	},
	data: function() {
		return {
			configuring: false,
			messages: [],
			subscriptions: []
		}
	},
	created: function() {
		var self = this;
		var pageInstance = self.$services.page.getPageInstance(self.page, self);
		if (this.cell.state.validations) {
			this.cell.state.validations.forEach(function(validation) {
				if (validation.resetListeners) {
					validation.resetListeners.forEach(function(x) {
						console.log("subscribing to ", x);
						self.subscriptions.push(pageInstance.subscribe(x.to, function() {
							self.messages.splice(0);
						}));
					});	
				}
			});
		}
	},
	beforeDestroy: function() {
		this.subscriptions.map(function(x) {
			x();
		});
	},
	methods: {
		getEvents: function() {
			var self = this;
			var events = {};
			if (this.cell.state.validations) {
				this.cell.state.validations.forEach(function(validation) {
					if (validation.operationId && validation.operationSuccessEvent) {
						var response = self.$services.swagger.operations[validation.operationId].responses["200"];
						var schema = null;
						if (response && response.schema) {
							schema = self.$services.swagger.resolve(response.schema);
						}
						events[validation.operationSuccessEvent] = schema ? schema : {};
					}
				});
			}
			return events;
		},
		configurator: function() {
			return "custom-validator-edit";
		},
		validate: function(soft) {
			Vue.set(this, "messages", []);
			nabu.utils.schema.addAsyncValidation(this.messages);
			
			if (this.cell.state.validations) {
				var self = this;
				var pageInstance = self.$services.page.getPageInstance(self.page, self);
				var pageState = this.$services.page.getPageState(pageInstance);
				
				this.cell.state.validations.forEach(function (validation) {
					// if we want to call an operation, we want an async validation
					if (validation.operationId != null) {
						var promise = self.$services.q.defer();
						// link the promise to the messages
						self.messages.defer(promise);
						var parameters = {};
						Object.keys(validation.bindings).map(function(key) {
							self.$services.page.setValue(parameters, key, self.$services.page.getBindingValue(pageInstance, validation.bindings[key], self));
						});
						self.$services.swagger.execute(validation.operationId, parameters).then(function(x) {
							var validations = [];
							if (x) {
								// emit it
								if (validation.operationSuccessEvent) {
									pageInstance.emit(validation.operationSuccessEvent, x);
								}
								Object.keys(x).forEach(function(key) {
									// if we have an array, check if we have validations, we need at least a severity!
									if (x[key] instanceof Array && x[key].length > 0 && validations.length == 0) {
										// if we have a severity, we assume these are validation messages
										if (x[key][0].severity) {
											nabu.utils.arrays.merge(validations, x[key]);
										}
									}
								});
							}
							// if we have a condition, evaluate that, including the state from the call
							if (validation.condition) {
								// we set this as "response"
								pageState.response = x;
								if (self.$services.page.isCondition(validation.condition, pageState, self)) {
									validations.push({
										severity: "error",
										code: validation.code ? validation.code : "custom",
										title: validation.message ? self.$services.page.translate(validation.message) : "%{An error has occured}",
										priority: 1,
										variables: {
										},
										context: []
									});
								}
							}
							if (validation.codes) {
								var translatedCodes = validation.codes.map(function(x) {
									return {
										code: x.code,
										title: self.$services.page.translate(x.title)
									}
								});
								nabu.utils.vue.form.rewriteCodes(validations, translatedCodes);
							}
							promise.resolve(validations);
						}, promise);
					}
					// synchronous validation
					else if (validation.condition) {
						if (self.$services.page.isCondition(validation.condition, pageState, self)) {
							self.messages.push({
								severity: "error",
								code: validation.code ? validation.code : "custom",
								title: validation.message ? self.$services.page.translate(validation.message) : "%{An error has occured}",
								priority: 1,
								variables: {
								},
								context: []
							});
						}
					}
				});
			}
			
			return this.messages;
		}		
	}
});