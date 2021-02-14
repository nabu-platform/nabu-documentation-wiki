Vue.component("page-form-list-input-predefined-configure", {
	template: "#page-form-list-input-predefined-configure",
	props: {
		cell: {
			type: Object,
			required: true
		},
		page: {
			type: Object,
			required: true
		},
		// the fragment this image is in
		field: {
			type: Object,
			required: true
		},
		schema: {
			type: Object,
			required: false
		}
	},
	computed: {
		operation: function() {
			return this.field.fieldProviderOperation ? this.$services.swagger.operations[this.field.fieldProviderOperation] : null;
		},
		// copy paste from data.js
		definition: function() {
			var properties = {};
			if (this.operation && this.operation.responses["200"]) {
				var definition = this.$services.swagger.resolve(this.operation.responses["200"].schema);
				//var definition = this.$services.swagger.definition(schema["$ref"]);
				if (definition.properties) {
					var self = this;
					Object.keys(definition.properties).map(function(field) {
						if (definition.properties[field].type == "array") {
							var items = definition.properties[field].items;
							if (items.properties) {
								nabu.utils.objects.merge(properties, items.properties);
							}
						}
					});
				}
			}
			return properties;
		},
		availableFields: function() {
			return this.$services.page.getSimpleKeysFor({properties:this.definition});
		},
		availableResultFields: function() {
			var schema = this.schema;
			if (schema.items) {
				schema = schema.items;
			}
			return Object.keys(schema.properties);
		}
	},
	created: function() {
		if (!this.field.fieldOperationBinding) {
			Vue.set(this.field, "fieldOperationBinding", {});
		}
	},
	methods: {
		// copy pasted from table getOperations
		listOperations: function(name) {
			var self = this;
			return this.$services.page.getOperations(function(operation) {
				// must be a get
				var isAllowed = operation.method.toLowerCase() == "get"
					// and contain the name fragment (if any)
					&& (!name || operation.id.toLowerCase().indexOf(name.toLowerCase()) >= 0)
					// must have _a_ response
					&& operation.responses["200"];
				// we also need at least _a_ complex array in the results
				if (isAllowed) {
					var schema = operation.responses["200"] ? operation.responses["200"].schema : null;
					if (schema) {
						var definition = self.$services.swagger.definition(schema["$ref"]);
						// now we need a child in the definition that is a record array
						// TODO: we currently don't actually check for a complex array, just any array, could be an array of strings...
						isAllowed = false;
						if (definition.properties) {
							Object.keys(definition.properties).map(function(field) {
								if (definition.properties[field].type == "array") {
									isAllowed = true;
								}
							});
						}
					}
				}
				return isAllowed;
			}).map(function(x) {
				 return x.id;
			});	
		},
		// copy paste from enumerationOperation
		getMappableParameters: function(field) {
			var result = {
				properties: {}
			};
			Object.keys(this.$services.page.getInputBindings(this.$services.swagger.operations[field.fieldProviderOperation])).map(function(key) {
				result.properties[key] = {
					type: "string"
				}
			});
			return result;
		},
		hasMappableParameters: function(field) {
			var amount = Object.keys(this.getMappableParameters(field).properties).length;
			return amount > 0;
		}
	}
});

Vue.component("page-form-list-input-predefined", {
	template: "#page-form-list-input-predefined",
	props: {
		cell: {
			type: Object,
			required: true
		},
		page: {
			type: Object,
			required: true
		},
		field: {
			type: Object,
			required: true
		},
		value: {
			required: true
		},
		label: {
			type: String,
			required: false
		},
		timeout: {
			required: false
		},
		disabled: {
			type: Boolean,
			required: false
		},
		schema: {
			type: Object,
			required: false
		}
	},
	data: function() {
		return {
			fields: []
		}
	},
	created: function () {
		var self = this;
		if (this.field.fieldProviderOperation) {
			var parameters = {};
			// map any additional bindings
			if (this.field.fieldOperationBinding) {
				var self = this;
				var pageInstance = self.$services.page.getPageInstance(self.page, self);
				Object.keys(this.field.fieldOperationBinding).map(function(key) {
					var target = parameters;
					var parts = key.split(".");
					for (var i = 0; i < parts.length - 1; i++) {
						if (!target[parts[i]]) {
							target[parts[i]] = {};
						}
						target = target[parts[i]];
					}
					target[parts[parts.length - 1]] = self.$services.page.getBindingValue(pageInstance, self.field.fieldOperationBinding[key], self);
				});
			}
			this.$services.swagger.execute(this.field.fieldProviderOperation, parameters).then(function(list) {
				if (list) {
					Object.keys(list).map(function(key) {
						if (list[key] instanceof Array) {
							nabu.utils.arrays.merge(self.fields, list[key].map(function(x) {
								var type = self.field.typeField ? x[self.field.typeField] : null;
								var name = self.field.nameField ? x[self.field.nameField] : null;
								var nameCounter = 1;
								var label = self.field.labelField ? x[self.field.labelField] : null;
								var value = null;
								if (self.field.valueField) {
									value = x[self.field.valueField];
								}
								else if (self.value && self.value[self.field.name]) {
									var keyField = self.field.resultKeyField;
									if (keyField == null) {
										keyField = "key";
									}
									var current = self.value[self.field.name].filter(function(y) {
										return y[keyField] == name;
									})[0];
									if (current) {
										var valueField = self.field.resultValueField;
										if (valueField == null) {
											valueField = "value";
										}
										value = current[valueField];
									}
								}
								var optional = self.field.optionalField ? x[self.field.optionalField] : true;
								var result = {
									type: type == null ? "string" : type,
									name: name == null ? "unnamed" + nameCounter++ : name,
									label: label == null ? (name == null ? "Unnamed" : name) : label,
									value: value,
									optional: optional
								}
								if (value != null) {
									self.value[result.name] = value;
								}
								// can map additional stuff like required, pattern,...
								Object.keys(list[key]).map(function(additional) {
									if (additional != self.field.typeField && additional != self.field.nameField && additional != self.field.labelField&& additional != self.field.valueField) {
										result[additional] = list[key][additional];
									}
								});
								return result;
							}));
							self.fields.forEach(function(field) {
								self.updateField(field, field.value);
							})
						}
					});
				}
			});
		}
	},
	methods: {
		validate: function(soft) {
			return this.$refs.form.validate(soft);
		},
		updateField: function(field, newValue) {
			if (this.value[this.field.name] == null) {
				Vue.set(this.value, this.field.name, []);
			}
			var key = this.field.resultKeyField;
			if (key == null) {
				key = "key";
			}
			var value = this.field.resultValueField;
			if (value == null) {
				value = "value";
			}
			var existing = this.value[this.field.name].filter(function(x) { return x[key] == field.name })[0];
			if (existing == null) {
				var entry = {};
				entry[key] = field.name;
				entry[value] = newValue;
				this.value[this.field.name].push(entry);
			}
			else {
				existing[value] = newValue;
			}
		}
	}
});

