nabu.services.VueService(Vue.extend({
	data: function() {
		return {
			resolved: {},
			resolvers: {}
		}
	},
	created: function() {
		var self = this;
		this.resolver = nabu.utils.misc.BatchResolver(
			// resolver
			function(ids) { return self.$services.swagger.execute("nabu.cms.core.manage.node.rest.node.resolve", {ids:ids}) },
			// cacher
			function(key, value) { if (value) self.merge(key, value); return self.resolved[key] },
			// generator
			function(key) { Vue.set(self.resolved, key, {}); return self.resolved[key]; },
			// mapper
			function(result) { return result.id }
		);
	},
	methods: {
		// the ids is the input field we can use to input the ids to be searched
		// the id is the field in the returned values that can be used to extract the id again
		getResolver: function(operation, ids, id, operationProperties) {
			var additional = operationProperties ? JSON.stringify(operationProperties) : "";
			if (!this.resolvers[operation + "." + ids + additional]) {
				var self = this;
				Vue.set(this.resolved, operation + "." + ids + additional, {});
				var resolved = this.resolved[operation + "." + ids + additional];
				this.resolvers[operation + "." + ids + additional] = nabu.utils.misc.BatchResolver(
					// resolver
					function(idList) {
						var properties = {};
						if (operationProperties) {
							nabu.utils.objects.merge(properties, operationProperties);
						}
						properties[ids] = idList;
						return self.$services.swagger.execute(operation, properties);
					},
					// cacher
					function(key, value) { if (value) self.merge(resolved, key, value); return resolved[key] },
					// generator
					function(key) { Vue.set(resolved, key, {}); return resolved[key]; },
					// mapper
					function(result) { return result[id] }
				);
			}
			return this.resolvers[operation + "." + ids + additional];
		},
		resolve: function(operation, ids, id, value, operationProperties) {
			var additional = operationProperties ? JSON.stringify(operationProperties) : "";
			// without this, it goes into an infinite resolving loop
			// only if we use the merge() function, if we simply set the full value it doesn't
			if (this.resolved[operation + "." + ids + additional] && this.resolved[operation + "." + ids + additional][value]) {
				return this.resolved[operation + "." + ids + additional][value];
			}
			return this.getResolver(operation, ids, id, operationProperties)(value);
		},
		merge: function(resolved, key, value) {
			var self = this;
			if (!resolved[key]) {
				Vue.set(resolved, key, {});
			}
			Object.keys(value).map(function(childKey) {
				Vue.set(resolved[key], childKey, value[childKey]);	
			});
		}
	}
}), { name: "nabu.page.services.PageResolver" });