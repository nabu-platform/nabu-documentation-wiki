// a lot of this is copy paste from the enumeration operation
Vue.component("page-format-resolver", {
	props: {
		page: {
			type: Object,
			required: true
		},
		cell: {
			type: Object,
			required: true
		},
		fragment: {
			type: Object,
			required: true
		}
	},
	created: function() {
		if (!this.fragment.resolveOperationBinding) {
			Vue.set(this.fragment, "resolveOperationBinding", {});
		}
	},
	template: "<n-form-section class='enumeration'>"
		+ "		<n-form-combo v-model='fragment.resolveOperation'"
		+ "			label='Resolve Operation'"
		+ "			:filter='getEnumerationServices'/>"
		+ "		<n-form-switch v-model='fragment.resolveOperationLabelComplex' label='Complex Enumeration Label'/>"
		+ "		<n-form-combo v-if='fragment.resolveOperation && !fragment.resolveOperationLabelComplex' v-model='fragment.resolveOperationLabel' label='Result Label Field'"
		+ "			:filter='function() { return getEnumerationFields(fragment.resolveOperation) }'/>"
		+ "		<n-form-combo v-if='fragment.resolveOperation' v-model='fragment.resolveOperationId' label='Result Id Field'"
		+ "			:filter='function() { return getEnumerationFields(fragment.resolveOperation) }'/>"
		+ "		<n-form-combo v-if='fragment.resolveOperation' v-model='fragment.resolveOperationIds' label='Input Ids Field'"
		+ "			:filter='function() { return getEnumerationParameters(fragment.resolveOperation) }'/>"
		+ "		<page-fields-edit :allow-multiple='false' v-if='fragment.resolveOperation && fragment.resolveOperationLabelComplex' fields-name='resolveFields' :cell='{state:fragment}' :page='page' :keys='getEnumerationFields(fragment.resolveOperation)' :allow-editable='false'/>"
		+ "		<n-page-mapper v-if='fragment.resolveOperation && hasMappableEnumerationParameters(fragment)'"
		+ "			v-model='fragment.resolveOperationBinding'"
		+ "			:from='$services.page.getAvailableParameters(page, cell)'"
		+ "			:to='getMappableEnumerationParameters(fragment)'/>"
		+ "</n-form-section>",
	methods: {
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
			Object.keys(this.$services.page.getInputBindings(this.$services.swagger.operations[field.resolveOperation])).map(function(key) {
				if (key != field.resolveOperationIds) {
					result.properties[key] = {
						type: "string"
					}
				}
			});
			return result;
		},
		hasMappableEnumerationParameters: function(field) {
			var amount = Object.keys(this.getMappableEnumerationParameters(field).properties).length;
			return amount > 0;
		}
	}
});