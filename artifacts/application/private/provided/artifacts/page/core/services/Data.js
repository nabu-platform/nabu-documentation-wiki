Vue.service("data", {
	services: ["swagger"],
	methods: {
		// TODO: we want to add other sources of operations
		// like functions, page-builder-managed services (which perform CRUD and contain state)
		getOperations: function() {
			return this.getSwaggerOperations();	
		},
		getDataOperations: function(name) {
			return this.getSwaggerDataOperations(name);
		},
		execute: function(operationId, parameters) {
			// TODO: differentiate between services, functions...
			return this.$services.swagger.execute(operationId, parameters);	
		},
		getSwaggerOperations: function(accept) {
			var result = [];
			var operations = this.$services.swagger.operations;
			Object.keys(operations).map(function(operationId) {
				if (accept(operations[operationId])) {
					result.push(operations[operationId]);
				}
			});
			result.sort(function(a, b) {
				return a.id.localeCompare(b.id);
			});
			return result;
		},
		getSwaggerDataOperations: function(name) {
			var self = this;
			return this.getSwaggerOperations(function(operation) {
				// must be a get
				var isAllowed = operation.method.toLowerCase() == "get"
					// and contain the name fragment (if any)
					&& (!name || operation.id.toLowerCase().indexOf(name.toLowerCase()) >= 0)
					// must have _a_ response
					&& operation.responses["200"];
				// we also need at least _a_ complex array in the results
				if (isAllowed && operation.responses["200"] != null && operation.responses["200"].schema != null) {
					var schema = operation.responses["200"].schema;
					var definition = self.$services.swagger.definition(schema["$ref"]);
					isAllowed = false;
					if (definition.properties) {
						Object.keys(definition.properties).map(function(field) {
							if (definition.properties[field].type == "array") {
								isAllowed = true;
							}
						});
					}
				}
				return isAllowed;
			});
		},
		getDefinition: function(operationId) {
			var properties = {};
			var operation = this.$services.swagger.operations[operationId];
			if (operation && operation.responses["200"]) {
				var definition = this.$services.swagger.resolve(operation.responses["200"].schema);
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
			/*else if (this.cell.state.array) {
				var available = this.$services.page.getAvailableParameters(this.page, this.cell);
				var variable = this.cell.state.array.substring(0, this.cell.state.array.indexOf("."));
				var rest = this.cell.state.array.substring(this.cell.state.array.indexOf(".") + 1);
				if (available[variable]) {
					var childDefinition = this.$services.page.getChildDefinition(available[variable], rest);
					if (childDefinition) {
						nabu.utils.objects.merge(properties, childDefinition.items.properties);
					}
				}
			}*/
			return properties;
		},
		getInputParameters: function(operationId) {
			var result = {
				properties: {}
			};
			var self = this;
			var operation = this.$services.swagger.operations[operationId];
			if (operation && operation.parameters) {
				var blacklist = ["limit", "offset", "orderBy", "connectionId"];
				var parameters = operation.parameters.filter(function(x) {
					return blacklist.indexOf(x.name) < 0;
				}).map(function(x) {
					result.properties[x.name] = self.$services.swagger.resolve(x);
				})
			}
			return result;
		}
	}
});