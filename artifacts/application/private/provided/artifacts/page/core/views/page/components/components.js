Vue.view("page-components-selector", {
	props: {
		// the list of routes that we want to choose from
		components: {
			type: Array,
			required: true
		}
	}
});

Vue.component("page-components-overview", {
	template: "#page-components-overview",
	computed: {
		// should all structures have a row at the root?
		structures: function() {
			return nabu.page.providers("page-structure");
		},
		components: function() {
			// only keep the routes with a visual icon and a name
			return this.$services.router.router.routes.filter(function(x) {
				return x.icon && x.name;
			});
		},
		componentCategories: function() {
			var groups = [];
			this.components.forEach(function(x) {
				if (x.category && groups.indexOf(x.category) < 0) {
					groups.push(x.category);
				}
				else if (x.category == null && groups.indexOf("Miscellaneous") < 0) {
					groups.push("Miscellaneous");
				}
			});
			groups.sort(function(a, b) {
				return a.toLowerCase().localeCompare(b.toLowerCase());
			});
			return groups;
		},
		templateCategories: function() {
			var groups = [];
			this.$services.page.templates.forEach(function(x) {
				if (x.category && groups.indexOf(x.category) < 0) {
					groups.push(x.category);
				}
				else if (x.category == null && groups.indexOf("Miscellaneous") < 0) {
					groups.push("Miscellaneous");
				}
			});
			groups.sort(function(a, b) {
				return a.toLowerCase().localeCompare(b.toLowerCase());
			});
			return groups;
		}
	},
	data: function() {
		return {
			selected: 'components'
		}
	},
	methods: {
		getOperationIds: function() {
			return Object.keys(this.$services.swagger.operations)
				.filter(function(x) {
					return x.indexOf("nabu.cms.dynamic.") < 0
						&& x.indexOf("nabu.web.page.") < 0
						&& x.indexOf("nabu.page.") < 0
						&& x != "nabu.passwordProtect";
				})
		},
		getOperationCategories: function() {
			var self = this;
			var tags = [];
			this.getOperationIds().forEach(function(operationId) {
				var operation = self.$services.swagger.operations[operationId];
				if (operation && operation.tags) {
					operation.tags.forEach(function(tag) {
						if (tags.indexOf(tag) < 0) {
							tags.push(tag);
						}	
					});
				}
			});
			tags.sort();
			return tags;
		},
		getOperationCategory: function(category) {
			var self = this;
			var operations = [];
			this.getOperationIds().forEach(function(operationId) {
				var operation = self.$services.swagger.operations[operationId];
				if (operation && operation.tags && operation.tags.indexOf(category) >= 0) {
					operations.push(operation);
				}
			});
			return operations;
		},
		dragOperation: function(event, operation) {
			this.$services.page.setDragData(event, "operation", operation.id);
		},
		prettyPrintOperation: function(id) {
			return this.$services.page.prettify(id.replace(/.*\.([^.]+)\.([^.]+)$/, "$2"));
		},
		operationFolder: function(id) {
			return id.replace(/(.*)\.[^.]+$/, "$1");
		},
		getTemplateCategory: function(category) {
			return this.$services.page.templates.filter(function(x) {
				return x.category == category || (category == "Miscellaneous" && x.category == null);
			});
		},
		getComponentCategory: function(category) {
			return this.components.filter(function(x) {
				return x.category == category || (category == "Miscellaneous" && x.category == null);
			});
		},
		dragComponent: function(event, component) {
			this.$services.page.setDragData(event, "component-alias", component.alias);
			if (component.form) {
				this.$services.page.setDragData(event, "form-name", component.form);
			}
		},
		dragTemplate: function(event, template) {
			// the content is already stringified at this point
			this.$services.page.setDragData(event, "template-content", template.content);
		},
		prettyPrint: function(name) {
			name = name.replace(/([A-Z]+)/, " $1");
			return name.substring(0, 1).toUpperCase() + name.substring(1);
		}
	}
});