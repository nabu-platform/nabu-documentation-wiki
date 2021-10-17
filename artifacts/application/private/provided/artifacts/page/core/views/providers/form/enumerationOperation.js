// allow complex formatting (e.g. multiple fields etc)
// can also allow complex extraction, though unlikely necessary

Vue.component("page-form-input-enumeration-operation-configure", {
	template: "<n-form-section class='enumeration'>"
			+ "		<n-form-combo v-model='field.enumerationOperation'"
			+ "			label='Enumeration Operation'"
			+ "			:filter='getEnumerationServices'/>"
			+ "		<n-form-switch v-model='field.enumerationOperationLabelComplex' label='Complex Enumeration Label'/>"
			+ "		<n-form-combo v-if='field.enumerationOperation && !field.enumerationOperationLabelComplex' v-model='field.enumerationOperationLabel' label='Enumeration Label'"
			+ "			:filter='function() { return getEnumerationFields(field.enumerationOperation) }'/>"
			+ "		<n-form-combo v-if='field.enumerationOperation' v-model='field.enumerationOperationValue' label='Enumeration Value'"
			+ "			:filter='function() { return getEnumerationFields(field.enumerationOperation) }'/>"
			+ "		<n-form-combo v-if='field.enumerationOperation' v-model='field.enumerationOperationQuery' label='Enumeration Query'"
			+ "			:filter='function() { return getEnumerationParameters(field.enumerationOperation) }'/>"
			+ "		<n-form-combo v-if='field.enumerationOperation && field.enumerationOperationValue' :filter='function() { return getEnumerationParameters(field.enumerationOperation) }' v-model='field.enumerationOperationResolve' label='Resolve Field'/>"
			+ "		<page-fields-edit :allow-multiple='false' fields-name='enumerationFields' v-if='field.enumerationOperation && field.enumerationOperationLabelComplex' :cell='{state:field}' :page='page' :keys='getEnumerationFields(field.enumerationOperation)' :allow-editable='false'/>"
			+ "		<n-form-text v-model='field.emptyValue' label='Empty Value Text'/>"
			+ " 	<n-form-switch v-model='field.showRadioView' label='Show radio visualisation'/>"
			+ " 	<n-form-switch v-model='field.selectFirstIfEmpty' label='Select the first value if none has been selected yet'/>"
			+ "		<n-form-text v-if='field.showRadioView' v-model='field.mustChoose' label='Must choose' allow-typing='true' />"
			+ "	<n-form-text v-model='field.info' label='Info Content'/>"
			+ "	<n-form-text v-model='field.before' label='Before Content'/>"
			+ "	<n-form-text v-model='field.beforeIcon' label='Before Icon' v-if='field.before'/>"
			+ "	<n-form-text v-model='field.after' label='After Content'/>"
			+ "	<n-form-text v-model='field.afterIcon' label='After Icon' v-if='field.after'/>"
			+ "	<n-form-text v-model='field.suffix' label='Suffix' v-if='!field.suffixIcon'/>"
			+ "	<n-form-text v-model='field.suffixIcon' label='Suffix Icon' v-if='!field.suffix'/>"
			+ "		<n-page-mapper v-if='field.enumerationOperation && hasMappableEnumerationParameters(field)'"
			+ "			v-model='field.enumerationOperationBinding'"
			+ "			:from='availableParameters'"
			+ "			:to='getMappableEnumerationParameters(field)'/>"
			+ "		<n-form-combo v-if='field.enumerationOperation' :filter='function() { return getEnumerationFields(field.enumerationOperation) }' v-model='field.enumerationCachingKey' label='Enumeration Caching Key'/>"    
			+ "		<n-page-mapper v-model='field.bindings' :from='availableParameters' :to='[\"validator\"]'/>"
			+ "</n-form-section>",
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
		possibleFields: {
			type: Array,
			required: false,
			default: function() { return [] }
		}
	},
	created: function() {
		if (!this.field.enumerationProvider) {
			Vue.set(this.field, "enumerationProvider", null);
		}
		this.normalize(this.field);
	},
	computed: {
		availableParameters: function() {
			var result = this.$services.page.getAvailableParameters(this.page, this.cell, true);
			if (this.possibleFields.length > 0) {
				result["record"] = {properties:{}};
				this.possibleFields.forEach(function(x) {
					result.record.properties[x] = {type:"string"};	
				});
			}
			return result;
		}
	},
	methods: {
		enumerationFilter: function(value) {
			var providers = nabu.page.providers("page-enumerate").map(function(x) { return x.name });
			if (value) {
				providers = providers.filter(function(x) { return x.toLowerCase().indeOf(value.toLowerCase()) >= 0 });
			}
			providers.sort();
			return providers;
		},
		normalize: function(field) {
			if (!field.enumerationOperation) {
				Vue.set(field, "enumerationOperation", null);
			}
			if (!field.enumerationOperationLabel) {
				Vue.set(field, "enumerationOperationLabel", null);
			}
			if (!field.enumerationOperationValue) {
				Vue.set(field, "enumerationOperationValue", null);
			}
			if (!field.enumerationOperationQuery) {
				Vue.set(field, "enumerationOperationQuery", null);
			}
			if (!field.enumerationOperationBinding) {
				Vue.set(field, "enumerationOperationBinding", {});
			}
		},
		// copy/pasted from the table getOperations
		getEnumerationServices: function(name) {
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
		getEnumerationFields: function(operationId) {
			var fields = [];
			if (this.$services.swagger.operations[operationId]) {
				var resolved = this.$services.swagger.resolve(this.$services.swagger.operations[operationId].responses["200"]);
				Object.keys(resolved.schema.properties).map(function(property) {
					if (resolved.schema.properties[property].type == "array") {
						nabu.utils.arrays.merge(fields, Object.keys(resolved.schema.properties[property].items.properties));
					}
				});
			}
			return fields;
		},
		getEnumerationParameters: function(operationId) {
			var parameters = this.$services.swagger.operations[operationId].parameters;
			return parameters ? parameters.map(function(x) { return x.name }) : [];
		},
		getMappableEnumerationParameters: function(field) {
			var result = {
				properties: {}
			};
			if (this.$services.swagger.operations[field.enumerationOperation]) {
				Object.keys(this.$services.page.getInputBindings(this.$services.swagger.operations[field.enumerationOperation])).map(function(key) {
					if (key != field.enumerationOperationQuery) {
						result.properties[key] = {
							type: "string"
						}
					}
				});
			}
			return result;
		},
		hasMappableEnumerationParameters: function(field) {
			var amount = Object.keys(this.getMappableEnumerationParameters(field).properties).length;
			return amount > 0;
		}
	}
});

Vue.component("page-form-input-enumeration-operation", {
	template: "<div>"
			+ "<n-form-radio v-if='field.showRadioView'"
			+ "		:items='resolvedItems'"
			+ "		ref='form'"
			+ "		:edit='!readOnly'"
			+ "		:placeholder='placeholder'"
			+ "		@input=\"function(newValue) { $emit('input', newValue) }\""
			+ "		:label='label ? $services.page.interpret(label, $self) : null'"
			+ "		:value='value'"
			+ "		:description='field.description ? $services.page.translate(field.description) : null'"
			+ "		:description-type='field.descriptionType'"
			+ "		:description-icon='field.descriptionIcon'"
			+ "		:schema='schema'"
			+ "		v-bubble:label"
			+ "		:required='field.required'"
			+ "		:must-choose='field.mustChoose ? $services.page.interpret(field.mustChoose, $self) : null'"
			+ "		:formatter='enumerationFormatter'"
			+ "		:extracter='enumerationExtracter'"
			+ "		:disabled='disabled'/>"
			+ "<n-form-combo v-else ref='form' :filter='enumerationFilter' :formatter='enumerationFormatter' :extracter='enumerationExtracter' :resolver='enumerationResolver'"
			+ "		:edit='!readOnly'"
			+ "		:placeholder='placeholder'"
			+ "		@input=\"function(newValue) { $emit('input', newValue) }\""
			+ "		v-bubble:label"
			+ "		:timeout='600'"
			+ "		v-bubble:blur"
			+ "		:label='label'"
			+ "		:value='value'"
			+ "		:empty-value='field.emptyValue ? $services.page.translate($services.page.interpret(field.emptyValue)) : null'"
			+ "		:info='field.info ? $services.page.translate(field.info) : null'"
			+ "		:before='field.before ? $services.page.translate(field.before) : null'"
			+ "		:after='field.after ? $services.page.translate(field.after) : null'"
			+ "		:suffix='field.suffixIcon ? $services.page.getIconHtml(field.suffixIcon) : field.suffix'"
			+ "		:validator='getValidator()'"
			+ "		:description='field.description ? $services.page.translate(field.description) : null'"
			+ "		:description-type='field.descriptionType'"
			+ "		:description-icon='field.descriptionIcon'"
			+ "		:schema='schema'"
			+ "		:disabled='disabled'/></div>",
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
		},
		readOnly: {
			type: Boolean,
			required: false
		},
		placeholder: {
			type: String,
			required: false
		},
		parentValue: {
			type: Object,
			required: false
		}
	},
	data: function() {
		return {
			provider: null,
			resolvedItems: []
		}
	},
	created: function() {
		if (this.field.showRadioView) {
			var self = this;
			this.enumerationFilterAny(null, false).then(function(x) {
				nabu.utils.arrays.merge(self.resolvedItems, x);
			});
		}
	},
	methods: {
		// enumerationOperation: null,
		// enumerationFormatter
		// enumerationOperationLabel: null,
		// enumerationOperationValue: null,
		// enumerationOperationQuery: null,
		// enumerationOperationBinding: {}
		enumerationFilter: function(value) {
			return this.enumerationFilterAny(value, false);
		},
		// if we set the "asResolve", we are actually resolving the existing value, so for example if you have an ID already
		// and you want to resolve it to the full object so you can get the correct label to show, it will be called with the resolve id
		// the query is used to find _new_ values
		enumerationFilterAny: function(value, asResolve) {
			if (!this.field.enumerationOperation) {
				return [];
			}
			var parameters = {
				limit: 20
			};
			if (!asResolve && this.field.enumerationOperationQuery) {
				parameters[this.field.enumerationOperationQuery] = value;
			}
			else if (asResolve && this.field.enumerationOperationResolve) {
				parameters[this.field.enumerationOperationResolve] = value;
			}
			var self = this;
			// map any additional bindings
			if (this.field.enumerationOperationBinding) {
				var pageInstance = self.$services.page.getPageInstance(self.page, self);
				Object.keys(this.field.enumerationOperationBinding).map(function(key) {
					// if the binding is not set, we don't want to overwrite any parameters that are already there (e.g. the resolve field)
					if (self.field.enumerationOperationBinding[key] != null) {
						var target = parameters;
						var parts = key.split(".");
						for (var i = 0; i < parts.length - 1; i++) {
							if (!target[parts[i]]) {
								target[parts[i]] = {};
							}
							target = target[parts[i]];
						}
						if (self.field.enumerationOperationBinding[key].indexOf("record.") == 0) {
							target[parts[parts.length - 1]] = self.$services.page.getValue(self.parentValue, self.field.enumerationOperationBinding[key].substring("record.".length));
						}
						else {
							target[parts[parts.length - 1]] = self.$services.page.getBindingValue(pageInstance, self.field.enumerationOperationBinding[key], self);
						}
					}
				});
			}
			return this.$services.swagger.execute(this.field.enumerationOperation, parameters, function(response) {
				var result = null;
				if (response) {
					Object.keys(response).map(function(key) {
						if (response[key] instanceof Array) {
							result = response[key];
							if (self.field.selectFirstIfEmpty && self.value == null && result && result.length > 0) {
								self.$emit("input", self.enumerationExtracter(result[0]));
							}
						}
					});
				}
				return result ? result : [];
			});
		},
		enumerationResolver: function(value) {
			if (this.field.enumerationOperationResolve && this.field.enumerationOperationValue) {
				return this.enumerationFilterAny(value, true);
			}
			return value;
		},
		enumerationFormatter: function(value) {
			if (value == null) {
				return null;
			}
			// we want complex labels
			else if (this.field.enumerationOperationLabelComplex) {
				var pageInstance = this.$services.page.getPageInstance(this.page, this);
				var storageId = "enumerate." + this.field.enumerationOperation + "." + value[this.field.enumerationOperationValue];
				if (this.field.enumerationCachingKey) {
					storageId += "." + value[this.field.enumerationCachingKey];
				}
				storageId = storageId.replace(/\./g, "_");
				
				if (pageInstance.retrieve(storageId) != null) {
					return pageInstance.retrieve(storageId);
				}
				
				var self = this;
				pageInstance.store(storageId, "");
				
				setTimeout(function() {
					var parameters = nabu.utils.objects.deepClone({
						page: self.page,
						cell: {state: self.field},
						edit: false,
						data: value,
						label: false,
						fieldsName: "enumerationFields"
					});
					var onUpdate = function() {
						var content = component.$el.innerHTML.replace(/<[^>]+>/g, "");
						if (pageInstance.retrieve(storageId) != content) {
							pageInstance.store(storageId, content);
						}
					};
					var component = new nabu.page.views.PageFields({ propsData: parameters, updated: onUpdate, ready: onUpdate });
					component.$mount();
				}, 1);
				//pageInstance.store(storageId, component.$el.innerHTML.replace(/<[^>]+>/g, ""));
				return pageInstance.retrieve(storageId);
			}
			else if (this.field.enumerationFormatter) {
				return this.field.enumerationFormatter(value);
			}
			else if (this.field.enumerationOperationLabel) {
				return value[this.field.enumerationOperationLabel];
			}
			else {
				return value;
			}
		},
		enumerationExtracter: function(value) {
			if (value == null) {
				return null;
			}
			else if (this.field.enumerationOperationValue) {
				return value[this.field.enumerationOperationValue];
			}
			else {
				return value;
			}
		},
		validate: function(soft) {
			return this.$refs.form.validate(soft);
		},
		getValidator: function() {
			if (this.field.bindings && this.field.bindings.validator) {
				var pageInstance = this.$services.page.getPageInstance(this.page, this);
				return this.$services.page.getBindingValue(pageInstance, this.field.bindings.validator, this);
			}
		}
	}
});

